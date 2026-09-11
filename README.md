# Madhurawada Home Kitchen

Customer storefront, admin preview and Express/PostgreSQL backend MVP source.

**Status:** frontend builds and typechecks; backend compiles and focused domain tests pass. The supplied remote PostgreSQL endpoint was not reachable. No remote tables were created or data inserted. The frontend preview falls back to clearly labelled sample data. Sample admin changes are session-only. This is not yet the complete production-ready platform requested; see the implementation matrix in `docs/architecture.md`.

## Run the frontend

Use the package manager pinned in `package.json`; the workspace uses pnpm. Install with the lockfile and run `pnpm dev`. The source uses React + TypeScript + Vite/Vinext. Hosted build uses `pnpm build`.

## Run the backend on a machine that can reach PostgreSQL

```bash
cd backend
npm ci
cp .env.example .env
# Set DATABASE_URL privately, with a dedicated schema and least-privilege account.
# Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 16 characters.
npm run db:generate
npm run db:migrate
npm run seed
npm run build
npm start
```

Inspect the existing database and permissions before migrating. The provided migration has no DROP statements. Prisma uses the schema selected in DATABASE_URL. Never use `migrate reset` or overwrite an existing kitchen; seeding deliberately refuses an existing slug. The normalized target SQL is a design document, not the current application's migration.

Set frontend server environment `BACKEND_ORIGIN=http://localhost:4000` for local development, backend `FRONTEND_ORIGIN` to the actual frontend origin, and `NODE_ENV=production` for Secure cookies on HTTPS deployments. Public browser code never needs DATABASE_URL. Proxy settings and cookie behaviour need integration verification before live use. Default ordering is disabled.

## Tests

```bash
cd backend
npm test
```

Two tests verify monetary arithmetic/quantity bounds and terminal order-state restrictions. Database/auth/CRUD/upload/checkout integration tests remain blocked by database access. No browser end-to-end test was performed.

## Review documents

- `docs/business-feasibility.md`: evidence limits, test-first verdict, validation and risks.
- `docs/financial-model.md`: 18 scenario/volume combinations with cost lines.
- `docs/financial-model.py`: reproducible assumptions/calculations.
- `docs/architecture.md`: implementation status, API, security and roadmap.
- `docs/normalized-target.sql`: proposed fully normalized schema.

## Attribution

Biryani photo: Dheerajk88, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Chicken_Hyderabadi_Biryani.JPG), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Displayed cropped; source photograph preserved. Food images and prices are illustrative, not verified kitchen product photography or local market pricing.
