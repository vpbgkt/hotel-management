# Bluestay Standalone Hotel System — Full Plan

> **Decision**: Separate repo, fully independent (no Bluestay branding), fork & diverge,
> lite backend (low VPS requirement), full feature parity, own DB per hotel.

---

## Table of Contents

1. [Current State — What Exists](#1-current-state--what-exists)
2. [Bugs & Issues to Fix FIRST (in this repo)](#2-bugs--issues-to-fix-first-in-this-repo)
3. [Standalone Architecture Recommendation](#3-standalone-architecture-recommendation)
4. [What to Strip / What to Keep](#4-what-to-strip--what-to-keep)
5. [New Features Needed for Standalone](#5-new-features-needed-for-standalone)
6. [Implementation Roadmap (Prioritized)](#6-implementation-roadmap-prioritized)
7. [Repo Structure Recommendation](#7-repo-structure-recommendation)
8. [Database Changes for Standalone](#8-database-changes-for-standalone)
9. [Deployment & VPS Recommendations](#9-deployment--vps-recommendations)

---

## 1. Current State — What Exists

### 1.1 Marketplace Model (OYO-like) — ~93% done

| Feature | Status | Notes |
|---------|--------|-------|
| Hotel registration & onboarding | ✅ Done | 4-step wizard, `onboardHotel` mutation |
| Room types, pricing, amenities | ✅ Done | Full CRUD, image galleries |
| Availability calendar | ✅ Done | `RoomInventory` per date, visual calendar |
| Search by city | ✅ Done | City filter, `/hotels/city/[city]` page |
| Search by price | ✅ Done | Price range filter |
| Search by availability (date-aware) | ⚠️ Partial | Per-room check exists, but hotel listing can't filter by check-in/out dates |
| Search by ratings | ✅ Done | Star rating filter |
| Secure payment (Razorpay) | ✅ Done | Full flow with signature verification, UPI/Cards/Net Banking/Wallets |
| GST/tax handling | ✅ Done | 18% GST, CGST/SGST in PDF invoices |
| Booking management dashboard | ✅ Done | `/admin/bookings` with status workflow |
| Commission (10-25%) | ✅ Done | Per-hotel configurable, auto-calculated, settlement workflow |
| Featured listings | ✅ Done | `isFeatured` flag, platform admin toggle |
| Dynamic/smart pricing | ✅ Done | Demand analysis, occupancy forecast, price suggestions |
| Real-time availability | ✅ Done | Redis-cached, distributed locks prevent double-booking |
| Automated PDF invoices | ✅ Done | PDFKit with hotel branding + tax breakdown |
| Cancellation & refund | ✅ Done | Cancel mutation, partial refund, auto-cancel after 30 min |
| Customer support/ticketing | ❌ Missing | No system exists |

### 1.2 White-Label Website + Shared Backend — ~97% done

| Feature | Status | Notes |
|---------|--------|-------|
| Custom domain support | ✅ Done | `HotelDomain` model, DNS-based middleware routing |
| Custom branding (logo, colors, fonts) | ✅ Done | `themeConfig` JSON, admin template selector |
| 4 website templates | ✅ Done | STARTER, MODERN_MINIMAL, LUXURY_RESORT, HERITAGE_BOUTIQUE |
| Room/booking/pricing management | ✅ Done | Full admin dashboard (17 nav items) |
| Shared inventory with marketplace | ✅ Done | Single DB, `BookingSource` tracks origin |
| Subscription plans | ✅ Done | FREE/STARTER/PROFESSIONAL/ENTERPRISE |
| Direct booking (0% commission) | ✅ Done | DIRECT source skips commission |

### 1.3 Standalone Hotel Management — ~80% done

| Feature | Status | Notes |
|---------|--------|-------|
| Room management | ✅ Done | Full CRUD |
| Booking management | ✅ Done | Daily + hourly, walk-in support |
| Billing & invoicing | ✅ Done | PDF invoices, payment tracking |
| No marketplace listing toggle | ⚠️ Partial | `isActive` can hide hotel, but no explicit standalone mode |
| Full data control | ✅ Done | API keys with granular permissions, export module |
| Self-hosting option | ⚠️ Partial | Export module generates starter kits, but no deployment docs |
| Staff management | ❌ Missing | `HOTEL_STAFF` role exists but no CRUD UI |
| API access for external apps | ✅ Done | `ApiKey` model with scoped permissions |

### 1.4 Shared Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| Auth (email + phone OTP + Google) | ✅ Done | JWT + refresh tokens, role-based guards |
| Reviews & ratings | ✅ Done | Verified reviews, moderation, hotel reply |
| Analytics | ✅ Done | Revenue, occupancy, booking, guest analytics |
| Blog / CMS | ✅ Done | Full lifecycle CRUD |
| SEO metadata | ✅ Done | Per-page SEO, JSON-LD, sitemap |
| Notifications (email, push, in-app) | ✅ Done | Nodemailer, Web Push, bell inbox |
| SMS/WhatsApp | ⚠️ Partial | Service exists, not wired into OTP flow |
| File uploads (local + S3) | ✅ Done | Two storage backends |
| Audit logging | ✅ Done | Schema + interceptor, but no admin viewer UI |
| Background jobs (BullMQ) | ✅ Done | Email, auto-cancel, reminders |

---

## 2. Bugs & Issues to Fix FIRST (in this repo)

> **Fix these before forking.** They affect both repos.

### 🔴 P0 — Critical (fix immediately)

#### 2.1 Booking mutations have NO auth guards
- **File**: `apps/api/src/modules/booking/booking.resolver.ts`
- **Problem**: Auth guards are commented out with the note _"Auth guards will be added when auth module is created"_ — but the auth module IS fully created.
- **Risk**: Anyone can create/cancel/modify bookings without authentication.
- **Fix**: Uncomment `@UseGuards(GqlAuthGuard)` on all booking mutations. Add `RolesGuard` where appropriate (e.g., `updateBookingStatus` should require HOTEL_ADMIN/HOTEL_STAFF).

### 🟠 P1 — High (fix before fork)

#### 2.2 SMS not wired into OTP flow
- **File**: `apps/api/src/modules/auth/auth.service.ts` (around line 186)
- **Problem**: `requestOTP` generates OTP + stores in Redis but only `console.log`s it instead of calling `SmsService`.
- **Fix**: Inject `SmsService` into `AuthService`, call `smsService.sendOTP()` when `MSG91_AUTH_KEY` env var is set, keep console.log as fallback for dev.

#### 2.3 Hotel price sorting is a no-op
- **File**: `apps/api/src/modules/hotel/hotel.service.ts`
- **Problem**: `HotelSortBy.PRICE` maps to `{ name: order }` with comment "Fallback, actual sorting done in app" — but no in-app sorting happens either.
- **Fix**: Compute `startingPrice` (min `basePriceDaily` across active room types) and sort by that, or add a `startingPrice` denormalized field to Hotel.

### 🟡 P2 — Medium (nice to fix before fork)

#### 2.4 Date-aware hotel search missing on marketplace
- **Where**: `apps/api/src/modules/hotel/hotel.service.ts`, hotel listing frontend
- **Problem**: Marketplace listing can't filter hotels by check-in/check-out dates.
- **Fix**: Add `availableFrom`/`availableTo` filter params to `hotels` query that cross-references `RoomInventory`.

#### 2.6 Audit log viewer missing
- **Where**: Admin dashboard
- **Problem**: `AuditLog` records are created by interceptor but there's no UI to browse them.
- **Fix**: Add `/admin/audit-log` and `/platform-admin/audit-log` pages.

---

## 3. Standalone Architecture Recommendation

### Why Fork NestJS (not rewrite)

You said you want **lite backend + low VPS cost**. Here's the breakdown:

| Approach | Pros | Cons |
|----------|------|------|
| **Fork NestJS, strip marketplace** | 80% code reuse, proven, works now | NestJS has some overhead (~80-120MB RAM) |
| **Rewrite to Next.js API routes** | Single process, simpler deploy | Massive rewrite, lose GraphQL schema, lose Prisma middleware |
| **Rewrite to Express/Fastify** | Lighter than NestJS (~40-60MB) | Still a full rewrite, minimal RAM savings |

### **Recommendation: Fork NestJS but make it lean**

The heavy parts of the current stack aren't NestJS itself — they're **Redis** and **BullMQ**. Here's how to make it VPS-friendly:

| Component | Current | Standalone |
|-----------|---------|------------|
| **NestJS API** | Required | Keep (strip marketplace modules) |
| **PostgreSQL** | Required | Keep (own DB per hotel) |
| **Redis** | Required | **Make optional** → fallback to in-memory `Map` cache |
| **BullMQ** | Required | **Replace with** simple `setTimeout` / `node-cron` |
| **Nginx** | Reverse proxy | Optional (can use NestJS directly or Caddy) |
| **S3/R2** | Upload storage | Keep local storage as default, S3 optional |

**Result**: A standalone hotel runs on **NestJS + PostgreSQL only** (~200-300MB RAM total).
This runs fine on a **₹300-500/month VPS** (1 vCPU, 1GB RAM).

### Alternative for ultra-lite: SQLite option (future)

For hotels that want the absolute cheapest hosting, you could later offer a SQLite mode (Prisma supports it). That eliminates the PostgreSQL process entirely — the whole app runs as a single Node.js process. But this is a future optimization, not needed for launch.

---

## 4. What to Strip / What to Keep

### ❌ Remove from standalone repo

| Module/Feature | Why remove |
|----------------|------------|
| `modules/commission/` | No marketplace = no commissions |
| `app/(aggregator)/` | No marketplace listing pages |
| `app/platform-admin/` | No platform admin (hotel IS the platform) |
| `app/onboard/` | No onboarding wizard (hotel sets up directly) |
| `HotelDomain` model | Single hotel = single domain, no multi-domain routing |
| `BookingSource` enum | All bookings are DIRECT (remove BLUESTAY, keep WALK_IN) |
| `Commission` model + settlement | Not needed |
| `Subscription` model | No SaaS billing |
| `isFeatured` / featured listings | Not needed |
| Multi-tenant middleware | Single-tenant, no domain resolution needed |
| `TenantProvider` / tenant context | Single hotel, config loaded at startup |
| Template registry (multiple) | Keep one or let hotel choose during setup, but strip runtime lazy-loading |
| `commissionRate/commissionType` on Hotel | Not needed |
| Platform admin resolver + service | Not needed |
| Aggregator API queries (`hotels`, `searchHotels`, `popularCities`, `featuredHotels`) | Not needed |

### ✅ Keep in standalone repo

| Module/Feature | Why keep |
|----------------|----------|
| `modules/hotel/` | Hotel settings & branding (single hotel) |
| `modules/room/` | Full room management |
| `modules/booking/` | Core booking engine |
| `modules/payment/` | Payment processing (Razorpay) |
| `modules/auth/` | Authentication & authorization |
| `modules/review/` | Guest reviews |
| `modules/analytics/` | Business analytics |
| `modules/pricing/` | Smart pricing |
| `modules/blog/` | Hotel blog / content marketing |
| `modules/notification/` | Email + push + in-app notifications |
| `modules/upload/` | Image uploads |
| `modules/export/` | Data export |
| `modules/admin/` | Admin dashboard (hotel admin parts only) |
| `modules/user/` | User management |
| `modules/queue/` | Background jobs (simplified) |
| `modules/redis/` | Cache layer (make optional) |
| `modules/prisma/` | Database ORM |
| `modules/api-key/` | API access for external integrations |

### 🔄 Modify for standalone

| Feature | Change needed |
|---------|---------------|
| **Auth roles** | Remove `PLATFORM_ADMIN`, keep `HOTEL_ADMIN`, `HOTEL_STAFF`, `GUEST` |
| **Booking** | Remove commission calculation, source always DIRECT or WALK_IN |
| **Admin dashboard** | Remove commission pages, add staff management |
| **Hotel model** | Simplify — remove `isFeatured`, `commissionRate`, etc. |
| **Redis service** | Add in-memory fallback (no-op when Redis unavailable) |
| **Queue service** | Replace BullMQ with `setTimeout`/`node-cron` |
| **Setup wizard** | New first-run setup (hotel details, admin account, payment config) |
| **Config** | Single `.env` file, no multi-tenant config needed |

---

## 5. New Features Needed for Standalone

### 5.1 Staff Management (HIGH PRIORITY)
- **What**: CRUD for hotel staff accounts
- **UI**: `/admin/staff` page — invite by email, assign role (HOTEL_ADMIN / HOTEL_STAFF), deactivate
- **API**: `createStaffMember`, `updateStaffMember`, `deactivateStaffMember`, `listStaff` mutations/queries
- **Permissions matrix**: What staff can do vs admin (e.g., staff can manage bookings but not change pricing)

### 5.2 First-Run Setup Wizard
- **What**: When the app starts with empty DB, show a setup wizard
- **Flow**: Hotel details → Admin account → Payment gateway config → First room type → Done
- **Replaces**: The onboarding page (which is marketplace-oriented)

### 5.3 In-Memory Cache Fallback
- **What**: `RedisService` should gracefully degrade to in-memory `Map` when `REDIS_URL` is not set
- **Why**: Eliminates Redis dependency for small hotels
- **Caveat**: No distributed locking without Redis — use DB-level advisory locks for booking concurrency

### 5.4 Simple Job Scheduler (replace BullMQ)
- **What**: Lightweight job runner using `node-cron` for recurring jobs and `setTimeout` for one-off delayed tasks
- **Jobs to support**: Auto-cancel unpaid bookings (30 min), email sending, booking reminders
- **Why**: Eliminates Redis dependency for job queue

### 5.5 Simplified Deployment Script
- **What**: `docker-compose.yml` with just 2 services (app + postgres), plus a bare-metal install script
- **Outputs**: Working hotel website on a single VPS with auto-SSL via Caddy or certbot

### 5.6 Backup & Restore
- **What**: Admin can trigger database backup (pg_dump to local zip) and restore
- **Why**: Standalone hotels need data sovereignty — they should be able to export/import everything

---

## 6. Implementation Roadmap (Prioritized)

### Phase 0: Fix bugs in current repo (before fork)
> Do this in the existing hotel-booking repo so both repos benefit.

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 0.1 | Enable auth guards on booking resolver | 🔴 P0 | Small |
| 0.2 | Wire SmsService into OTP flow | 🟠 P1 | Small |
| 0.3 | Fix hotel price sorting | 🟠 P1 | Small |
| 0.4 | ~~Add Stripe frontend to payment form~~ (removed — Razorpay only for Indian clients) | — | — |

### Phase 1: Fork & Strip (create standalone repo)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 1.1 | Fork repo, rename project, remove Bluestay branding | High | Small |
| 1.2 | Delete marketplace modules (commission, platform-admin, aggregator pages, onboard) | High | Small |
| 1.3 | Simplify Prisma schema (remove Commission, Subscription, HotelDomain, etc.) | High | Medium |
| 1.4 | Remove multi-tenant middleware, simplify to single-hotel mode | High | Medium |
| 1.5 | Update admin dashboard — remove commission/platform pages | High | Small |
| 1.6 | Update auth — remove PLATFORM_ADMIN role references | High | Small |
| 1.7 | Remove booking commission logic | High | Small |
| 1.8 | Simplify docker-compose to 2 services (app + postgres) | High | Small |

### Phase 2: Make it Lite (reduce VPS requirements)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 2.1 | Add in-memory cache fallback in RedisService | High | Medium |
| 2.2 | Replace BullMQ with node-cron + setTimeout scheduler | High | Medium |
| 2.3 | Add DB-level advisory locks for booking concurrency (when no Redis) | High | Medium |
| 2.4 | Make Redis fully optional in docker-compose | High | Small |
| 2.5 | Test full flow without Redis | High | Medium |

### Phase 3: Standalone Features

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 3.1 | Staff management — API (create, update, list, deactivate staff) | High | Medium |
| 3.2 | Staff management — UI (`/admin/staff` page) | High | Medium |
| 3.3 | First-run setup wizard (replace onboarding page) | High | Medium |
| 3.4 | Backup & restore — API endpoint + admin UI | Medium | Medium |
| 3.5 | Simplified deployment docs + script | Medium | Medium |
| 3.6 | Audit log viewer in admin dashboard | Low | Small |

### Phase 4: Polish & Ship

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 4.1 | Update all email templates (remove Bluestay references) | Medium | Small |
| 4.2 | Configurable hotel name in all templates/notifications | Medium | Small |
| 4.3 | Landing page for the standalone product (marketing site) | Medium | Medium |
| 4.4 | License / pricing page for standalone product | Low | Small |
| 4.5 | Auto-SSL setup (Caddy reverse proxy or certbot script) | Medium | Small |
| 4.6 | Documentation site (setup, configuration, API docs) | Medium | Large |

---

## 7. Repo Structure Recommendation

```
hotel-manager/                    # New repo name (not "bluestay")
├── docker-compose.yml            # App + PostgreSQL only
├── docker-compose.full.yml       # App + PostgreSQL + Redis (optional)
├── Caddyfile                     # Caddy reverse proxy with auto-SSL
├── .env.example                  # Single env file
├── package.json
├── turbo.json
│
├── apps/
│   ├── api/                      # NestJS backend (stripped)
│   │   ├── prisma/
│   │   │   └── schema.prisma     # Simplified schema (no Commission, etc.)
│   │   └── src/
│   │       └── modules/
│   │           ├── hotel/        # Single hotel config
│   │           ├── room/         # Room management
│   │           ├── booking/      # Booking engine
│   │           ├── payment/      # Razorpay (Indian payments)
│   │           ├── auth/         # Auth (3 roles only)
│   │           ├── user/         # Users + staff management ← NEW
│   │           ├── review/       # Reviews
│   │           ├── analytics/    # Analytics
│   │           ├── pricing/      # Smart pricing
│   │           ├── blog/         # Blog
│   │           ├── notification/ # Notifications
│   │           ├── upload/       # File uploads
│   │           ├── export/       # Data export + backup ← ENHANCED
│   │           ├── admin/        # Admin dashboard (hotel admin only)
│   │           ├── api-key/      # External API access
│   │           ├── scheduler/    # node-cron jobs ← REPLACES queue/
│   │           ├── cache/        # In-memory or Redis ← REPLACES redis/
│   │           └── prisma/       # DB service
│   │
│   └── web/                      # Next.js frontend (stripped)
│       └── src/
│           ├── app/
│           │   ├── admin/        # Hotel admin dashboard
│           │   ├── auth/         # Login/register
│           │   ├── booking/      # Booking flow
│           │   ├── dashboard/    # Guest dashboard
│           │   ├── blog/         # Blog
│           │   ├── hotel/        # Hotel public pages (now root pages)
│           │   ├── setup/        # First-run wizard ← NEW
│           │   └── sections/     # Homepage sections
│           ├── components/
│           └── lib/
│
├── packages/                     # Shared packages (forked)
│   ├── config/
│   ├── types/
│   ├── ui/
│   └── utils/
│
└── docs/                         # Setup & configuration docs ← NEW
    ├── installation.md
    ├── configuration.md
    ├── deployment.md
    └── api-reference.md
```

---

## 8. Database Changes for Standalone

### Models to REMOVE

```
- HotelDomain        # Single domain, no multi-domain routing
- Commission          # No marketplace commissions
- Subscription        # No SaaS billing
```

### Models to SIMPLIFY

```prisma
model Hotel {
  # REMOVE these fields:
  - commissionRate
  - commissionType
  - razorpayAccountId   # Move to env vars (single hotel)
  - isFeatured          # Not needed
  - template            # Keep but simplify

  # ADD these fields:
  + setupCompleted  Boolean @default(false)  # First-run wizard tracking
}
```

### Enums to SIMPLIFY

```prisma
enum BookingSource {
  DIRECT     # Online booking via website
  WALK_IN    # Walk-in added by staff
  # REMOVE: BLUESTAY
}

enum UserRole {
  GUEST
  HOTEL_ADMIN
  HOTEL_STAFF
  # REMOVE: PLATFORM_ADMIN
}

# REMOVE entirely:
- SettlementStatus
- SubscriptionPlan
- SubscriptionStatus
- SSLStatus
```

### Models to ADD/ENHANCE

```prisma
# Staff permissions (granular access control)
model StaffPermission {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  canManageBookings   Boolean @default(true)
  canManageRooms      Boolean @default(false)
  canManagePricing    Boolean @default(false)
  canManageReviews    Boolean @default(true)
  canManageContent    Boolean @default(false)
  canViewAnalytics    Boolean @default(false)
  canManageStaff      Boolean @default(false)  # Only HOTEL_ADMIN

  @@unique([userId])
}

# Database backup log
model BackupLog {
  id          String   @id @default(uuid())
  filename    String
  sizeBytes   Int
  triggeredBy String   # userId
  status      String   # "completed", "failed"
  createdAt   DateTime @default(now())
}
```

---

## 9. Deployment & VPS Recommendations

### Minimum VPS for Standalone (without Redis)

| Resource | Requirement |
|----------|-------------|
| **CPU** | 1 vCPU |
| **RAM** | 1 GB |
| **Storage** | 20 GB SSD |
| **Cost** | ~₹300-500/month (DigitalOcean, Hetzner, Hostinger) |
| **OS** | Ubuntu 22.04+ |

### Stack on VPS

```
┌──────────────────────────────────┐
│  Caddy (reverse proxy + auto-SSL)│
├──────────────────────────────────┤
│  Node.js (NestJS API)            │  ~ 80-120 MB RAM
│  Node.js (Next.js Web)           │  ~ 100-150 MB RAM
├──────────────────────────────────┤
│  PostgreSQL                      │  ~ 50-100 MB RAM
└──────────────────────────────────┘
Total: ~250-400 MB RAM (fits in 1 GB)
```

### With Redis (optional, for high-traffic hotels)

| Resource | Requirement |
|----------|-------------|
| **RAM** | 2 GB |
| **Cost** | ~₹500-800/month |
| **Benefit** | Distributed locking, caching, BullMQ job queue |

### Deployment Options

| Method | Complexity | Best for |
|--------|-----------|----------|
| **Docker Compose** | Low | Most hotels (recommended) |
| **Bare metal + systemd** | Medium | Hotels with existing servers |
| **Railway / Render** | Very low | Hotels wanting managed PaaS |
| **Self-managed K8s** | High | Hotel chains (future) |

---

## Summary — What to Do in What Order

```
STEP 1  →  Fix P0/P1 bugs in this repo (1-2 days)
            ├── Enable booking auth guards
            ├── Wire SMS into OTP
            └── Fix price sorting

STEP 2  →  Fork repo, strip marketplace (2-3 days)
            ├── Delete modules: commission, platform-admin, aggregator
            ├── Simplify schema
            ├── Remove multi-tenant middleware
            └── Update admin dashboard

STEP 3  →  Make it lite (3-5 days)
            ├── In-memory cache fallback
            ├── Replace BullMQ with node-cron
            ├── DB advisory locks
            └── Test full flow without Redis

STEP 4  →  Build standalone features (5-7 days)
            ├── Staff management (API + UI)
            ├── First-run setup wizard
            ├── Backup & restore
            └── Deployment scripts + docs

STEP 5  →  Polish & ship
            ├── Remove all Bluestay branding
            ├── Documentation
            └── Marketing site
```
