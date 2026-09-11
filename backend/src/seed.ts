import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const db = new PrismaClient();

const password = process.env.ADMIN_PASSWORD || 'adminpassword123';
const slug = process.env.KITCHEN_SLUG || 'madhurawada';

async function main() {
  console.log(`Starting seed for kitchen: ${slug}...`);
  const seed = JSON.parse(await readFile(new URL('../../shared/seed.json', import.meta.url), 'utf8'));

  // Check if kitchen exists
  let k = await db.kitchen.findUnique({ where: { slug } });
  if (!k) {
    k = await db.kitchen.create({
      data: {
        slug,
        name: seed.kitchen.name,
        settings: seed.kitchen,
      },
    });
    console.log(`Created Kitchen record: ${k.name} (${k.id})`);
  } else {
    console.log(`Kitchen already exists: ${k.name} (${k.id}), updating settings...`);
    await db.kitchen.update({
      where: { id: k.id },
      data: { name: seed.kitchen.name, settings: seed.kitchen },
    });

    // Clear old entities to wipe outdated strings
    console.log(`Clearing old entity records for kitchen: ${k.id}...`);
    await db.entity.deleteMany({ where: { kitchenId: k.id } });
  }

  // Map IDs
  const ids: Record<string, string> = {};
  for (const [kind, rows] of Object.entries(seed)) {
    if (kind === 'kitchen') continue;
    for (const r of rows as Record<string, unknown>[]) {
      ids[String(r.id)] = randomUUID();
    }
  }

  // Create entities
  for (const [kind, rows] of Object.entries(seed)) {
    if (kind === 'kitchen') continue;
    console.log(`Seeding ${kind}...`);
    for (const raw of rows as Record<string, unknown>[]) {
      const data = { ...raw };
      delete data.id;
      for (const f of ['categoryId', 'sectionId', 'itemId', 'groupId']) {
        if (data[f]) data[f] = ids[String(data[f])];
      }

      await db.entity.create({
        data: {
          id: ids[String(raw.id)],
          kitchenId: k.id,
          kind,
          name: String(raw.name),
          active: raw.active !== false,
          sortOrder: Number(raw.sortOrder) || 0,
          data: data as any,
        },
      });
    }
  }

  // Create admin user if not existing
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@madhurawada.com').toLowerCase();
  const existingUser = await db.user.findUnique({ where: { email: adminEmail } });

  if (!existingUser) {
    const passwordHash = await argon2.hash(password);
    await db.user.create({
      data: {
        kitchenId: k.id,
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log(`Created admin user: ${adminEmail}`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  console.log('Successfully re-seeded database with clean Madhurawada data!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
