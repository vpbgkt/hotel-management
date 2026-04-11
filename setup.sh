#!/usr/bin/env bash
# ==============================================
# Hotel Manager — One-Command Setup Script
# ==============================================
# Usage:
#   chmod +x setup.sh && ./setup.sh          # Local development
#   chmod +x setup.sh && ./setup.sh --docker  # Docker (all services)
#
# This script sets up everything you need to run the project.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() { echo -e "\n${BLUE}▶ $1${NC}"; }
print_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_err()  { echo -e "${RED}✗ $1${NC}"; }

MODE="local"
if [[ "$1" == "--docker" ]]; then
  MODE="docker"
fi

echo ""
echo "========================================"
echo "  Hotel Manager — Setup"
echo "  Mode: $MODE"
echo "========================================"
echo ""

# ------------------------------------------
# 1. Check prerequisites
# ------------------------------------------
print_step "Checking prerequisites..."

if ! command -v node &> /dev/null; then
  print_err "Node.js is not installed. Install Node.js 20+ from https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  print_err "Node.js 20+ required. You have $(node -v)"
  exit 1
fi
print_ok "Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
  print_err "npm is not installed"
  exit 1
fi
print_ok "npm $(npm -v)"

if ! command -v docker &> /dev/null; then
  print_err "Docker is not installed. Install from https://www.docker.com/"
  exit 1
fi
print_ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
  print_err "Docker Compose is not installed"
  exit 1
fi
print_ok "Docker Compose available"

# ------------------------------------------
# 2. Create .env files if missing
# ------------------------------------------
print_step "Setting up environment files..."

if [ ! -f ".env" ]; then
  cat > .env << 'ENVEOF'
# Docker Compose optional overrides (safe defaults in docker-compose.yml)
# HOTEL_ID=
# APP_NAME=My Hotel
ENVEOF
  print_ok "Created .env (root)"
else
  print_ok ".env already exists"
fi

if [ ! -f "apps/api/.env" ]; then
  cat > apps/api/.env << 'ENVEOF'
DATABASE_URL="postgresql://hotel:hotel_secret@localhost:5432/hotel?schema=public"
REDIS_ENABLED="false"
HOTEL_ID=""
APP_NAME="My Hotel"
APP_URL="http://localhost:3000"
JWT_SECRET="dev_jwt_secret_change_in_production"
JWT_REFRESH_SECRET="dev_jwt_refresh_secret_change_in_production"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
PORT=4000
CORS_ORIGINS="http://localhost:3000"
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_FROM="My Hotel <noreply@localhost>"
ENVEOF
  print_ok "Created apps/api/.env"
else
  print_ok "apps/api/.env already exists"
fi

if [ ! -f "apps/web/.env.local" ]; then
  cat > apps/web/.env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
NEXT_PUBLIC_SITE_URL=http://localhost:3000
API_URL=http://localhost:4000/graphql
NEXT_PUBLIC_ENABLE_HOURLY_BOOKING=true
NEXT_PUBLIC_ENABLE_REVIEWS=true
ENVEOF
  print_ok "Created apps/web/.env.local"
else
  print_ok "apps/web/.env.local already exists"
fi

# ------------------------------------------
# Docker Mode
# ------------------------------------------
if [[ "$MODE" == "docker" ]]; then
  print_step "Starting all Docker services..."
  docker compose up -d --build

  print_step "Waiting for PostgreSQL to be ready..."
  until docker compose exec -T postgres pg_isready -U hotel > /dev/null 2>&1; do
    sleep 1
  done
  print_ok "PostgreSQL is ready"

  print_step "Running database migrations..."
  docker compose exec -T api sh -c "cd apps/api && npx prisma generate && npx prisma db push"
  print_ok "Database schema pushed"

  print_step "Seeding database with sample data..."
  docker compose exec -T api sh -c "cd apps/api && npx prisma db seed"
  print_ok "Database seeded"

  echo ""
  echo "========================================"
  echo -e "  ${GREEN}Setup complete!${NC}"
  echo "========================================"
  echo ""
  echo "  Web App:        http://localhost:3000"
  echo "  GraphQL API:    http://localhost:4000/graphql"
  echo "  Swagger Docs:   http://localhost:4000/api/docs"
  echo "  Mailpit (mail): http://localhost:8025"
  echo ""
  echo "  Admin Login:    admin@hotel.local / password123"
  echo "  Guest Login:    guest@example.com / password123"
  echo ""
  echo "  Commands:"
  echo "    docker compose logs -f api    # API logs"
  echo "    docker compose logs -f web    # Web logs"
  echo "    docker compose down           # Stop all"
  echo "========================================"
  exit 0
fi

# ------------------------------------------
# Local Mode
# ------------------------------------------
print_step "Starting PostgreSQL via Docker..."
docker compose up postgres -d

print_step "Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U hotel > /dev/null 2>&1; do
  sleep 1
done
print_ok "PostgreSQL is ready"

print_step "Installing npm dependencies..."
npm install
print_ok "Dependencies installed"

print_step "Generating Prisma client..."
cd apps/api
npx prisma generate
print_ok "Prisma client generated"

print_step "Pushing database schema..."
npx prisma db push
print_ok "Database schema pushed"

print_step "Seeding database with sample data..."
npx prisma db seed
print_ok "Database seeded"

cd ../..

echo ""
echo "========================================"
echo -e "  ${GREEN}Setup complete!${NC}"
echo "========================================"
echo ""
echo "  Now start the servers (use 2 terminal tabs):"
echo ""
echo "    Terminal 1:  npm run dev:api"
echo "    Terminal 2:  npm run dev:web"
echo ""
echo "  Or start both at once:"
echo ""
echo "    npm run dev"
echo ""
echo "  URLs:"
echo "    Web App:        http://localhost:3000"
echo "    GraphQL API:    http://localhost:4000/graphql"
echo "    Swagger Docs:   http://localhost:4000/api/docs"
echo ""
echo "  Login:"
echo "    Admin:  admin@hotel.local / password123"
echo "    Guest:  guest@example.com / password123"
echo "========================================"
