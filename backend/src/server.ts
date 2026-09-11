import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { PrismaClient, Prisma } from '@prisma/client';
import argon2 from 'argon2';
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, readFile, unlink, rename } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { canTransition, priceOrder } from './domain.js';

const db = new PrismaClient();
const app = express();

const hash = (v: string) => createHash('sha256').update(v).digest('hex');
const isAllowedOrigin = (reqOrigin?: string) => {
  if (!reqOrigin) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(reqOrigin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(reqOrigin)) return true;
  if (process.env.FRONTEND_ORIGIN && reqOrigin === process.env.FRONTEND_ORIGIN) return true;
  return false;
};

app.use(helmet());
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (isAllowedOrigin(requestOrigin)) {
        callback(null, requestOrigin || true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 60000, limit: 120 }));

app.use((req, res, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers.origin &&
    !isAllowedOrigin(req.headers.origin)
  ) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }
  next();
});

type AuthReq = Request & {
  auth?: {
    id: string;
    kitchenId: string;
    role: string;
  };
};

const auth = async (req: AuthReq, res: Response, next: NextFunction) => {
  const token = req.headers.cookie
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith('kitchen_session='))
    ?.split('=')[1];

  if (!token) {
    res.status(401).json({ error: 'Sign in required' });
    return;
  }

  const session = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.active) {
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  req.auth = session.user;
  next();
};

const admin = (req: AuthReq, res: Response, next: NextFunction) => {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(req.auth!.role)) {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
};

const kinds = [
  'sections',
  'categories',
  'items',
  'variants',
  'addon-groups',
  'addons',
  'hero',
  'banners',
  'about',
  'contact',
  'footer',
  'seo',
  'testimonials',
  'coupons',
  'media',
] as const;

const record = z
  .object({
    name: z.string().min(1).max(160),
    description: z.string().max(10000).optional(),
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
    image: z
      .string()
      .max(2000)
      .refine(
        (v) => !v || v.startsWith('/media/') || v === '/food-hero.jpg' || /^https:\/\//.test(v),
        'Use an uploaded image or HTTPS URL'
      )
      .optional(),
    categoryId: z.string().uuid().optional(),
    sectionId: z.string().uuid().optional(),
    itemId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
    price: z.number().min(0).max(100000).optional(),
    veg: z.boolean().optional(),
    bestseller: z.boolean().optional(),
    prepTime: z.number().int().min(0).max(240).optional(),
    cta: z.string().max(100).optional(),
    link: z
      .string()
      .max(2000)
      .refine((v) => v.startsWith('/') || v.startsWith('https://'), 'Use a relative or HTTPS link')
      .optional(),
    startDate: z.string().datetime().nullable().optional(),
    endDate: z.string().datetime().nullable().optional(),
    code: z.string().max(40).optional(),
    rating: z.number().min(1).max(5).optional(),
  })
  .strict();

function kindOf(v: string) {
  return z.enum(kinds).parse(v);
}

const serialize = (r: {
  id: string;
  data: any;
  name: string;
  active: boolean;
  sortOrder: number;
}) => ({
  ...(r.data as object),
  id: r.id,
  name: r.name,
  active: r.active,
  sortOrder: r.sortOrder,
});

async function validateRelations(kitchenId: string, kind: string, data: z.infer<typeof record>) {
  if (kind === 'items' && (data.price === undefined || !data.categoryId)) {
    throw Error('Item requires price and category');
  }
  if (kind === 'categories' && !data.sectionId) {
    throw Error('Category requires section');
  }

  for (const [field, parentKind] of [
    ['categoryId', 'categories'],
    ['sectionId', 'sections'],
    ['itemId', 'items'],
    ['groupId', 'addon-groups'],
  ] as const) {
    const id = data[field];
    if (
      id &&
      !(await db.entity.findFirst({
        where: { id, kitchenId, kind: parentKind, deletedAt: null },
      }))
    ) {
      throw Error('Invalid or cross-kitchen parent');
    }
  }
}

// Health check
app.get('/api/health', async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ status: 'ok' });
});

// Auth Routes
app.post('/api/auth/login', rateLimit({ windowMs: 900000, limit: 10 }), async (req, res) => {
  const body = z
    .object({
      email: z.string().email(),
      password: z.string().min(1).max(200),
    })
    .parse(req.body);

  const user = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user || !user.active || !(await argon2.verify(user.passwordHash, body.password))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = randomBytes(32).toString('hex');
  await db.session.create({
    data: {
      tokenHash: hash(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + 8 * 3600000),
    },
  });

  res
    .cookie('kitchen_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 3600000,
      path: '/',
    })
    .json({ id: user.id, role: user.role });
});

app.post('/api/auth/logout', auth, async (req, res) => {
  const token = req.headers.cookie
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith('kitchen_session='))
    ?.split('=')[1];

  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hash(token) } });
  }
  res.clearCookie('kitchen_session', { path: '/' }).json({ ok: true });
});

app.get('/api/auth/me', auth, (req: AuthReq, res) => res.json(req.auth));

// Public Storefront Data Route
app.get('/api/public/:slug', async (req, res) => {
  const k = await db.kitchen.findUnique({ where: { slug: String(req.params.slug) } });
  if (!k) {
    res.status(404).json({ error: 'Kitchen not found' });
    return;
  }

  const rows = await db.entity.findMany({
    where: {
      kitchenId: k.id,
      deletedAt: null,
      active: true,
      kind: { notIn: ['media', 'coupons'] },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const content: Record<string, unknown> = {
    kitchen: { ...(k.settings as object), name: k.name },
  };

  for (const kind of kinds) {
    content[kind] = rows
      .filter((r) => {
        if (r.kind !== kind) return false;
        const d = r.data as Record<string, unknown>;
        return (
          (!d.startDate || new Date(String(d.startDate)) <= new Date()) &&
          (!d.endDate || new Date(String(d.endDate)) >= new Date())
        );
      })
      .map(serialize);
  }

  res.json(content);
});

// Admin Kitchen Settings Routes
app.get('/api/admin/settings', auth, (req: AuthReq, res) => {
  void db.kitchen
    .findUniqueOrThrow({ where: { id: req.auth!.kitchenId } })
    .then((k) => res.json({ ...(k.settings as object), name: k.name }));
});

app.put('/api/admin/settings', auth, admin, async (req: AuthReq, res) => {
  const data = z
    .object({
      name: z.string().min(1).max(120),
      tagline: z.string().max(200),
      description: z.string().max(2000),
      address: z.string().max(500),
      radius: z.number().min(0).max(5),
      hours: z.string().max(200),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      acceptingOrders: z.boolean(),
    })
    .strict()
    .parse(req.body);

  res.json(
    await db.$transaction(async (tx) => {
      const k = await tx.kitchen.update({
        where: { id: req.auth!.kitchenId },
        data: { name: data.name, settings: data },
      });
      await tx.auditLog.create({
        data: {
          kitchenId: k.id,
          actorId: req.auth!.id,
          action: 'UPDATE_SETTINGS',
          entityId: k.id,
        },
      });
      return data;
    })
  );
});

// Admin CMS Content CRUD Routes
app.get('/api/admin/content/:kind', auth, async (req: AuthReq, res) => {
  const kind = kindOf(String(req.params.kind));
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const where = {
    kitchenId: req.auth!.kitchenId,
    kind,
    deletedAt: null,
    name: { contains: String(req.query.search || ''), mode: 'insensitive' as const },
    ...(req.query.active !== undefined ? { active: req.query.active === 'true' } : {}),
  };

  const [rows, total] = await Promise.all([
    db.entity.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: req.query.sort === 'name' ? { name: 'asc' } : { sortOrder: 'asc' },
    }),
    db.entity.count({ where }),
  ]);

  res.json({ data: rows.map(serialize), total, page, limit });
});

app.post('/api/admin/content/:kind', auth, admin, async (req: AuthReq, res) => {
  const kind = kindOf(String(req.params.kind));
  const data = record.parse(req.body);
  await validateRelations(req.auth!.kitchenId, kind, data);

  const row = await db.$transaction(async (tx) => {
    const r = await tx.entity.create({
      data: {
        kitchenId: req.auth!.kitchenId,
        kind,
        name: data.name,
        data,
        active: data.active,
        sortOrder: data.sortOrder,
      },
    });
    await tx.auditLog.create({
      data: {
        kitchenId: req.auth!.kitchenId,
        actorId: req.auth!.id,
        action: 'CREATE_' + kind,
        entityId: r.id,
      },
    });
    return r;
  });

  res.status(201).json(serialize(row));
});

app.put('/api/admin/content/:kind/:id', auth, admin, async (req: AuthReq, res) => {
  const kind = kindOf(String(req.params.kind));
  const data = record.parse(req.body);
  await validateRelations(req.auth!.kitchenId, kind, data);

  const row = await db.$transaction(async (tx) => {
    const existing = await tx.entity.findFirstOrThrow({
      where: { id: String(req.params.id), kitchenId: req.auth!.kitchenId, kind, deletedAt: null },
    });
    const r = await tx.entity.update({
      where: { id: existing.id },
      data: { name: data.name, data, active: data.active, sortOrder: data.sortOrder },
    });
    await tx.auditLog.create({
      data: {
        kitchenId: req.auth!.kitchenId,
        actorId: req.auth!.id,
        action: 'UPDATE_' + kind,
        entityId: r.id,
      },
    });
    return r;
  });

  res.json(serialize(row));
});

app.delete('/api/admin/content/:kind/:id', auth, admin, async (req: AuthReq, res) => {
  const kind = kindOf(String(req.params.kind));
  await db.$transaction(async (tx) => {
    const row = await tx.entity.findFirstOrThrow({
      where: { id: String(req.params.id), kind, kitchenId: req.auth!.kitchenId, deletedAt: null },
    });
    const refs = await tx.entity.findMany({
      where: { kitchenId: req.auth!.kitchenId, deletedAt: null },
    });

    if (
      refs.some((r) =>
        ['sectionId', 'categoryId', 'itemId', 'groupId'].some(
          (f) => (r.data as Record<string, unknown>)[f] === row.id
        )
      )
    ) {
      throw Error('Remove child records first');
    }

    await tx.entity.update({
      where: { id: row.id },
      data: { deletedAt: new Date(), active: false },
    });
    await tx.auditLog.create({
      data: {
        kitchenId: req.auth!.kitchenId,
        actorId: req.auth!.id,
        action: 'DELETE_' + kind,
        entityId: row.id,
      },
    });
  });

  res.json({ ok: true });
});

// Public Customer Order Placement Route
const orderInput = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  address: z.string().min(10).max(500),
  note: z.string().max(500).optional(),
  scheduledDate: z.string().max(100).optional(),
  scheduledSlot: z.string().max(100).optional(),
  idempotencyKey: z.string().uuid(),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1)
    .max(30),
});

app.post('/api/public/:slug/orders', rateLimit({ windowMs: 60000, limit: 10 }), async (req, res) => {
  const input = orderInput.parse(req.body);
  const k = await db.kitchen.findUniqueOrThrow({ where: { slug: String(req.params.slug) } });

  if (!(k.settings as Record<string, unknown>).acceptingOrders) {
    res.status(409).json({ error: 'Kitchen is not accepting orders' });
    return;
  }

  const existing = await db.order.findUnique({
    where: {
      kitchenId_idempotencyKey: {
        kitchenId: k.id,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });

  if (existing) {
    res.json({
      id: existing.id,
      status: existing.status,
      total: existing.total,
      message: 'This order request was already received',
    });
    return;
  }

  const tracking = randomBytes(24).toString('hex');
  const order = await db.$transaction(
    async (tx) => {
      const items = [];
      for (const line of input.items) {
        const row = await tx.entity.findFirstOrThrow({
          where: { id: line.id, kitchenId: k.id, kind: 'items', active: true, deletedAt: null },
        });
        const d = row.data as Record<string, unknown>;
        const category = await tx.entity.findFirstOrThrow({
          where: { id: String(d.categoryId), kitchenId: k.id, kind: 'categories', active: true, deletedAt: null },
        });
        await tx.entity.findFirstOrThrow({
          where: { id: String((category.data as Record<string, unknown>).sectionId), kitchenId: k.id, kind: 'sections', active: true, deletedAt: null },
        });

        const unitPrice = Math.round(Number(d.price) * 100);
        items.push({
          itemId: row.id,
          name: row.name,
          quantity: line.quantity,
          unitPrice,
          total: unitPrice * line.quantity,
        });
      }

      const subtotal = priceOrder(items.map((i) => ({ price: i.unitPrice, quantity: i.quantity })));
      const customer = await tx.customer.upsert({
        where: { kitchenId_phone: { kitchenId: k.id, phone: input.phone } },
        create: { kitchenId: k.id, name: input.name, phone: input.phone },
        update: { name: input.name },
      });

      const scheduledHeader = input.scheduledDate && input.scheduledSlot
        ? `[SCHEDULED: ${input.scheduledDate} · ${input.scheduledSlot}]`
        : null;
      const combinedNote = [scheduledHeader, input.note].filter(Boolean).join(' - ');

      return tx.order.create({
        data: {
          kitchenId: k.id,
          customerId: customer.id,
          idempotencyKey: input.idempotencyKey,
          trackingHash: hash(tracking),
          subtotal,
          total: subtotal,
          address: input.address,
          note: combinedNote || null,
          items: { create: items },
          history: { create: { status: 'PENDING' } },
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  res.status(201).json({
    id: order.id,
    status: order.status,
    total: order.total,
    note: order.note,
    trackingToken: tracking,
    message: 'Order request received. Delivery and final acceptance require kitchen confirmation.',
  });
});

// Order Tracking Route
app.get('/api/public/:slug/orders/:id', async (req, res) => {
  const token = z.string().min(40).parse(req.headers['x-order-token']);
  const order = await db.order.findFirst({
    where: {
      id: req.params.id,
      trackingHash: hash(token),
      kitchen: { slug: String(req.params.slug) },
    },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      note: true,
      address: true,
      items: true,
      history: true,
    },
  });

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  res.json(order);
});

// Customer Auth / Registration Route
app.post('/api/public/:slug/customer/auth', async (req, res) => {
  const body = z
    .object({
      name: z.string().min(2).max(100),
      phone: z.string().regex(/^[6-9]\d{9}$/),
    })
    .parse(req.body);

  const k = await db.kitchen.findUniqueOrThrow({ where: { slug: String(req.params.slug) } });

  const customer = await db.customer.upsert({
    where: { kitchenId_phone: { kitchenId: k.id, phone: body.phone } },
    create: { kitchenId: k.id, name: body.name, phone: body.phone },
    update: { name: body.name },
  });

  const customerCode = `CUST-${customer.id.substring(0, 8).toUpperCase()}`;

  res.json({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    customerCode,
    createdAt: customer.createdAt,
  });
});

// Customer Real-time Orders & Profile Route by Phone / Customer ID
app.get('/api/public/:slug/customer/orders', async (req, res) => {
  const phone = String(req.query.phone || '');
  const customerId = String(req.query.customerId || '');
  const k = await db.kitchen.findUniqueOrThrow({ where: { slug: String(req.params.slug) } });

  if (!phone && !customerId) {
    res.status(400).json({ error: 'Provide customer phone or customerId' });
    return;
  }

  const customer = await db.customer.findFirst({
    where: {
      kitchenId: k.id,
      OR: [
        ...(phone ? [{ phone }] : []),
        ...(customerId ? [{ id: customerId }] : []),
      ],
    },
  });

  if (!customer) {
    res.json({ customer: null, orders: [] });
    return;
  }

  const orders = await db.order.findMany({
    where: { kitchenId: k.id, customerId: customer.id },
    include: { items: true, history: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const customerCode = `CUST-${customer.id.substring(0, 8).toUpperCase()}`;

  res.json({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      customerCode,
    },
    orders,
  });
});

// Visitor Event Tracking & Survey Analytics Routes
const visitorSessionStore = new Map<string, {
  sessionId: string;
  device: string;
  firstSeen: string;
  lastSeen: string;
  durationSeconds: number;
  latestAction: string;
  cardClicks: string[];
  categoriesViewed: string[];
  cartActions: string[];
  events: Array<{ time: string; type: string; target: string; details?: any }>;
}>();

app.post('/api/public/:slug/track', async (req, res) => {
  try {
    const { sessionId, eventType, target, details, device, durationSeconds } = req.body;
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    const k = await db.kitchen.findUnique({ where: { slug: String(req.params.slug) } });
    if (!k) {
      res.status(404).json({ error: 'Kitchen not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    let sess = visitorSessionStore.get(sessionId);
    if (!sess) {
      sess = {
        sessionId,
        device: device || 'Desktop',
        firstSeen: nowIso,
        lastSeen: nowIso,
        durationSeconds: durationSeconds || 0,
        latestAction: `${eventType || 'PAGE_VIEW'}: ${target || ''}`.trim(),
        cardClicks: [],
        categoriesViewed: [],
        cartActions: [],
        events: [],
      };
      visitorSessionStore.set(sessionId, sess);
    }

    sess.lastSeen = nowIso;
    if (typeof durationSeconds === 'number' && durationSeconds > sess.durationSeconds) {
      sess.durationSeconds = durationSeconds;
    }
    if (device) sess.device = device;
    if (eventType) {
      sess.latestAction = `${eventType}: ${target || ''}`.trim();
      sess.events.unshift({
        time: nowIso,
        type: eventType,
        target: target || '',
        details,
      });
      if (sess.events.length > 50) sess.events.pop();

      if (eventType === 'CARD_CLICK' || eventType === 'MODAL_ZOOM') {
        if (target && !sess.cardClicks.includes(target)) {
          sess.cardClicks.push(target);
        }
      } else if (eventType === 'CATEGORY_CLICK' || eventType === 'CATEGORY_VIEW') {
        if (target && !sess.categoriesViewed.includes(target)) {
          sess.categoriesViewed.push(target);
        }
      } else if (eventType === 'ADD_TO_CART') {
        if (target && !sess.cartActions.includes(target)) {
          sess.cartActions.push(target);
        }
      }
    }

    // Persist session to Database Entity
    const existingEntity = await db.entity.findFirst({
      where: { kitchenId: k.id, kind: 'visitor_session', name: sessionId },
    });

    if (existingEntity) {
      await db.entity.update({
        where: { id: existingEntity.id },
        data: {
          data: sess as any,
          updatedAt: new Date(),
        },
      });
    } else {
      await db.entity.create({
        data: {
          kitchenId: k.id,
          kind: 'visitor_session',
          name: sessionId,
          data: sess as any,
          active: true,
          sortOrder: 0,
        },
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Tracking error:', err);
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// Customer Waiting / Service Interest Impression & Waitlist Route
app.post('/api/public/:slug/interest', rateLimit({ windowMs: 60000, limit: 15 }), async (req, res) => {
  try {
    const k = await db.kitchen.findUnique({ where: { slug: String(req.params.slug) } });
    if (!k) {
      res.status(404).json({ error: 'Kitchen not found' });
      return;
    }

    const { name, phone, mealPreference, preferredArea, note, sessionId } = req.body;
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      res.status(400).json({ error: 'Valid 10-digit mobile phone number is required' });
      return;
    }

    const recordData = {
      name: (name || 'Valued Resident').trim(),
      phone: cleanPhone,
      mealPreference: mealPreference || 'Authentic Andhra Meals',
      preferredArea: preferredArea || 'Madhurawada',
      note: note || '',
      sessionId: sessionId || '',
      createdAt: new Date().toISOString(),
    };

    await db.entity.create({
      data: {
        kitchenId: k.id,
        kind: 'service_interest',
        name: `${recordData.name} (${cleanPhone})`,
        data: recordData as any,
        active: true,
        sortOrder: 0,
      },
    });

    res.status(201).json({
      success: true,
      message: "Thank you! You're on our priority VIP list! We will notify you on WhatsApp the moment live kitchen service begins in Madhurawada.",
    });
  } catch (err: any) {
    console.error('Service interest error:', err);
    res.status(500).json({ error: 'Failed to record service interest' });
  }
});

app.get('/api/admin/analytics', auth, async (req: AuthReq, res) => {
  try {
    const entities = await db.entity.findMany({
      where: { kitchenId: req.auth!.kitchenId, kind: 'visitor_session' },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    const interestEntities = await db.entity.findMany({
      where: { kitchenId: req.auth!.kitchenId, kind: 'service_interest' },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const interests = interestEntities.map((e) => ({ id: e.id, ...(e.data as any) }));
    const sessions = entities.map((e) => e.data as any);
    const totalSessions = sessions.length;
    const now = Date.now();
    const activeRecent = sessions.filter((s) => now - new Date(s.lastSeen).getTime() < 30 * 60 * 1000).length;

    const cardCounts: Record<string, number> = {};
    let totalCardClicks = 0;
    let totalCartActions = 0;
    let totalWhatsAppClicks = 0;
    let totalDuration = 0;

    for (const s of sessions) {
      totalDuration += s.durationSeconds || 0;
      for (const card of s.cardClicks || []) {
        cardCounts[card] = (cardCounts[card] || 0) + 1;
        totalCardClicks++;
      }
      totalCartActions += (s.cartActions || []).length;
      const waCount = (s.events || []).filter((ev: any) => ev.type === 'WHATSAPP_CLICK').length;
      totalWhatsAppClicks += waCount;
    }

    const avgDurationSeconds = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

    const topCards = Object.entries(cardCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    res.json({
      metrics: {
        totalSessions,
        activeRecent,
        totalCardClicks,
        totalCartActions,
        totalWhatsAppClicks,
        avgDurationSeconds,
        totalInterests: interests.length,
      },
      topCards,
      sessions,
      interests,
    });
  } catch (err: any) {
    console.error('Failed to get analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin Order Management & Status Routes
app.get('/api/admin/orders', auth, async (req: AuthReq, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  res.json(
    await db.order.findMany({
      where: {
        kitchenId: req.auth!.kitchenId,
        ...(req.query.status ? { status: String(req.query.status) } : {}),
      },
      include: { customer: true, items: true, history: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: (page - 1) * 50,
    })
  );
});

app.patch('/api/admin/orders/:id/status', auth, async (req: AuthReq, res) => {
  const { status } = z.object({ status: z.string() }).parse(req.body);

  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.findFirstOrThrow({
      where: { id: String(req.params.id), kitchenId: req.auth!.kitchenId },
    });

    if (!canTransition(o.status, status)) {
      throw Error('Invalid status transition');
    }

    const changed = await tx.order.updateMany({
      where: { id: o.id, status: o.status },
      data: { status },
    });

    if (changed.count !== 1) {
      throw Error('Order changed; refresh and retry');
    }

    await tx.orderStatusHistory.create({
      data: { orderId: o.id, status, actorId: req.auth!.id },
    });

    await tx.auditLog.create({
      data: { kitchenId: req.auth!.kitchenId, actorId: req.auth!.id, action: 'ORDER_' + status, entityId: o.id },
    });

    return { id: o.id, status };
  });

  res.json(order);
});

app.get('/api/admin/customers', auth, admin, async (req: AuthReq, res) =>
  res.json(
    await db.customer.findMany({
      where: { kitchenId: req.auth!.kitchenId },
      include: { _count: { select: { orders: true } } },
      take: 100,
      orderBy: { createdAt: 'desc' },
    })
  )
);

app.get('/api/admin/audit', auth, admin, async (req: AuthReq, res) =>
  res.json(
    await db.auditLog.findMany({
      where: { kitchenId: req.auth!.kitchenId },
      take: 100,
      orderBy: { createdAt: 'desc' },
    })
  )
);

// Cloudinary & Local Media Upload Route
const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
await mkdir(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

app.use(
  '/media',
  express.static(uploadDir, {
    dotfiles: 'deny',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
);

app.post('/api/admin/media', auth, admin, upload.single('image'), async (req: AuthReq, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Upload a JPG, PNG or WebP under 5 MB' });
    return;
  }

  const bytes = await readFile(req.file.path);
  const valid =
    (req.file.mimetype === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) ||
    (req.file.mimetype === 'image/png' &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (req.file.mimetype === 'image/webp' &&
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP');

  if (!valid) {
    await unlink(req.file.path);
    res.status(400).json({ error: 'Image signature mismatch' });
    return;
  }

  let url = '';
  try {
    const { uploadToCloudinary } = await import('./cloudinary.js');
    url = await uploadToCloudinary(req.file.path);
    await unlink(req.file.path);
  } catch (cloudErr) {
    const extension = ({
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    } as Record<string, string>)[req.file.mimetype];
    await rename(req.file.path, req.file.path + extension);
    url = '/media/' + req.file.filename + extension;
  }

  await db.entity.create({
    data: {
      kitchenId: req.auth!.kitchenId,
      kind: 'media',
      name: req.file.originalname,
      data: { url, mimeType: req.file.mimetype, size: req.file.size },
    },
  });

  res.status(201).json({ url });
});

// Error Handling Middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten() });
    return;
  }

  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as any).code === 'string' &&
    (err as any).code.startsWith('P')
  ) {
    const code = (err as any).code;
    res.status(code === 'P2025' ? 404 : 409).json({
      error:
        code === 'P2002'
          ? 'Duplicate request or record'
          : code === 'P2025'
          ? 'Record not found'
          : 'Database operation could not complete',
    });
    return;
  }

  console.error(JSON.stringify({ level: 'error', type: err instanceof Error ? err.name : 'unknown' }));
  res.status(400).json({ error: 'Request could not complete. Check input and record relationships.' });
});

app.listen(Number(process.env.PORT) || 4000, () => console.log('Kitchen API listening on port 4000'));
