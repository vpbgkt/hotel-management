# Hotel Manager API Dockerfile
# Multi-stage build for NestJS

# ============================================
# BASE
# ============================================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ============================================
# DEPENDENCIES
# ============================================
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

RUN npm ci --only=production

# ============================================
# DEVELOPMENT
# ============================================
FROM base AS development
ENV NODE_ENV=development

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

RUN npm ci

COPY . .

# Generate Prisma client
RUN cd apps/api && npx prisma generate

EXPOSE 4000
CMD ["npm", "run", "dev:api"]

# ============================================
# BUILDER
# ============================================
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

RUN npm ci

COPY . .

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build the application
RUN npm run build -w apps/api

# ============================================
# PRODUCTION
# ============================================
FROM base AS production
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nestjs

EXPOSE 4000
ENV PORT=4000

CMD ["node", "apps/api/dist/main.js"]
