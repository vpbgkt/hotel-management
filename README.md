# Hotel Manager — Standalone Hotel Booking Platform

A full-stack hotel reservation system for independent hotels. Features a direct booking website, admin dashboard, daily + hourly bookings, Razorpay payments, and lightweight deployment.

---

## 🚀 Quick Start (One Command)

### Prerequisites

- **Node.js 20+** — [Download](https://nodejs.org/)
- **Docker & Docker Compose** — [Download](https://www.docker.com/products/docker-desktop/)

### Option A: Local Development (Recommended for first time)

```bash
# Clone the repo
git clone <repo-url>
cd hotel-management

# Run setup — installs deps, starts DB, seeds sample data
chmod +x setup.sh
./setup.sh

# Start both servers
npm run dev
```

That's it! Open:
- **Web App:** http://localhost:3000
- **GraphQL Playground:** http://localhost:4000/graphql
- **API Docs (Swagger):** http://localhost:4000/api/docs

### Option B: Docker (Everything in Containers)

```bash
chmod +x setup.sh
./setup.sh --docker
```

This builds and starts all services (PostgreSQL, API, Web, Mailpit).

### Login Credentials

| Role | Email | Password | URL |
|------|-------|----------|-----|
| **Admin** | `admin@hotel.local` | `password123` | http://localhost:3000/admin |
| **Guest** | `guest@example.com` | `password123` | http://localhost:3000/dashboard |

---

## 📁 Project Structure

```
hotel-management/
├── apps/
│   ├── api/                    # NestJS GraphQL API (Port 4000)
│   │   ├── prisma/             # Database schema + seed data
│   │   └── src/modules/        # 15 feature modules
│   │       ├── auth/           #   JWT, OTP, Google OAuth
│   │       ├── booking/        #   Booking engine + invoice PDF
│   │       ├── hotel/          #   Hotel CRUD + search
│   │       ├── room/           #   Room types + inventory
│   │       ├── payment/        #   Razorpay + demo gateway
│   │       ├── admin/          #   Hotel admin dashboard API
│   │       ├── analytics/      #   Revenue + occupancy stats
│   │       ├── review/         #   Guest reviews + ratings
│   │       ├── notification/   #   Email + push notifications
│   │       ├── pricing/        #   Smart pricing engine
│   │       ├── blog/           #   Blog posts CRUD
│   │       └── ...             #   redis, queue, upload, user, export
│   │
│   └── web/                    # Next.js 15 Frontend (Port 3000)
│       └── src/
│           ├── app/            # Pages (App Router)
│           │   ├── (public)/   #   Guest-facing pages
│           │   ├── admin/      #   Hotel admin dashboard
│           │   ├── auth/       #   Login, register
│           │   ├── booking/    #   Booking flow
│           │   └── dashboard/  #   Guest dashboard
│           ├── components/     # React components
│           └── lib/            # GraphQL client, auth, utils
│
├── packages/                   # Shared monorepo packages
│   ├── types/                  #   TypeScript types + Zod schemas
│   ├── utils/                  #   Currency, date, string utilities
│   ├── config/                 #   Platform constants (GST, limits)
│   └── ui/                     #   Shared React components
│
├── tests/load/                 # k6 load tests
├── e2e/                        # Playwright E2E tests
├── nginx/                      # Reverse proxy config (production)
├── docker-compose.yml          # Dev environment
├── setup.sh                    # ⭐ One-command setup script
└── turbo.json                  # Turborepo build config
```

---

## 🛠 Manual Setup (Step by Step)

If you prefer setting things up manually instead of using `setup.sh`:

```bash
# 1. Start PostgreSQL
docker compose up postgres -d

# 2. Install dependencies
npm install

# 3. Create environment files (skip if they already exist)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4. Generate Prisma client + push schema + seed data
cd apps/api
npx prisma generate
npx prisma db push
npx prisma db seed
cd ../..

# 5. Start servers (in separate terminals)
npm run dev:api   # Terminal 1 → http://localhost:4000
npm run dev:web   # Terminal 2 → http://localhost:3000
```

---

## 🐳 Docker Commands

```bash
# Start everything
docker compose up -d --build

# Push schema + seed (first time only)
docker compose exec api sh -c "cd apps/api && npx prisma db push"
docker compose exec api sh -c "cd apps/api && npx prisma db seed"

# View logs
docker compose logs -f api     # API logs
docker compose logs -f web     # Web logs

# Stop everything
docker compose down

# Reset database
docker compose down -v          # Removes volumes too
docker compose up -d --build
# Then re-run prisma push + seed
```

---

## 🔗 API Access

| URL | Type | Description |
|-----|------|-------------|
| http://localhost:4000/graphql | GraphQL | Main API + interactive playground |
| http://localhost:4000/api/docs | Swagger | REST endpoint docs |
| http://localhost:4000/health | REST | Health check |
| http://localhost:8025 | Web UI | Mailpit — view sent emails |

### HTTP Headers

```
Authorization: Bearer <jwt-token>     # Authenticated requests
x-hotel-id: <hotel-uuid>             # Hotel context
```

---

## ⚙️ Environment Variables

### API (`apps/api/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | JWT signing secret |
| `JWT_REFRESH_SECRET` | ✅ | — | Refresh token secret |
| `PORT` | | `4000` | API port |
| `REDIS_ENABLED` | | `false` | Enable Redis cache |
| `RAZORPAY_KEY_ID` | | — | Razorpay API key (payments) |
| `SMTP_HOST` | | — | Email server host |
| `SENTRY_DSN` | | — | Error tracking |

### Web (`apps/web/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | `http://localhost:4000/graphql` | GraphQL endpoint (browser) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `http://localhost:3000` | Frontend URL |
| `API_URL` | | same as above | GraphQL endpoint (SSR) |

> All required variables have working defaults in the `.env` files created by `setup.sh`.

---

## 🧪 Running Tests

```bash
# Unit tests
cd apps/api && npm test

# E2E tests
npx playwright test

# Load tests
k6 run tests/load/k6-booking-flow.js
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS v4, Apollo Client |
| Backend | NestJS, GraphQL (code-first), Prisma 6 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 (optional — in-memory fallback) |
| Auth | JWT + Refresh Tokens |
| Payments | Razorpay + Demo Gateway |
| Monorepo | Turborepo + npm workspaces |

---

## Useful Commands

```bash
# Development
npm run dev                            # Start both API + Web
npm run dev:api                        # Start API only (port 4000)
npm run dev:web                        # Start Web only (port 3000)

# Database
cd apps/api
npx prisma studio                      # Visual DB editor (port 5555)
npx prisma db seed                     # Re-seed sample data
npx prisma db push --force-reset       # Reset database schema

# Docker
docker compose up postgres -d          # Start just the database
docker compose up -d --build           # Start everything
docker compose down                    # Stop all
docker compose down -v                 # Stop + delete data
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm install` fails | Delete `node_modules` and `package-lock.json`, run `npm install` again |
| Database connection refused | Make sure PostgreSQL is running: `docker compose up postgres -d` |
| Port 4000 already in use | `lsof -i :4000` to find process, `kill <PID>` |
| Port 3000 already in use | `lsof -i :3000` to find process, `kill <PID>` |
| Prisma schema errors | Run `npx prisma generate` in `apps/api/` |
| Web shows "Network error" | Make sure API is running on port 4000 |
| Docker build fails | Run `docker compose down` then `docker compose up -d --build` |

---

## License

Private — All rights reserved.
