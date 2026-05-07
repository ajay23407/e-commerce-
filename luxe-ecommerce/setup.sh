#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# LUXE Ecommerce — Automated Setup Script
# Run: bash setup.sh
# ─────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
BOLD='\033[1m'

print_header() {
  echo ""
  echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}${BOLD}  LUXE Ecommerce Setup${NC}"
  echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

step() { echo -e "\n${GREEN}${BOLD}▶ $1${NC}"; }
info() { echo -e "  ${YELLOW}→ $1${NC}"; }
success() { echo -e "  ${GREEN}✓ $1${NC}"; }
error() { echo -e "  ${RED}✗ $1${NC}"; }

print_header

# ── CHECK PREREQUISITES ──────────────────────────────────────────
step "Checking prerequisites..."

check_command() {
  if command -v $1 &>/dev/null; then
    success "$1 found ($(command -v $1))"
    return 0
  else
    error "$1 NOT found. Please install it first."
    return 1
  fi
}

PREREQS_OK=true
check_command node   || PREREQS_OK=false
check_command npm    || PREREQS_OK=false
check_command psql   || PREREQS_OK=false

if [ "$PREREQS_OK" = false ]; then
  echo ""
  echo -e "${RED}Please install missing prerequisites and run this script again.${NC}"
  echo ""
  echo "  • Node.js:    https://nodejs.org (v18+ recommended)"
  echo "  • PostgreSQL: https://www.postgresql.org/download"
  echo ""
  exit 1
fi

NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 16 ]; then
  error "Node.js v16+ required. You have $(node --version). Please upgrade."
  exit 1
fi
success "Node.js version OK ($(node --version))"

# ── INSTALL BACKEND DEPENDENCIES ─────────────────────────────────
step "Installing backend dependencies..."
if npm install --silent 2>/dev/null; then
  success "Backend packages installed"
else
  info "Retrying with legacy peer deps..."
  npm install --legacy-peer-deps --silent 2>/dev/null && success "Backend packages installed" || {
    error "npm install failed. Check your internet connection."
    exit 1
  }
fi

# ── INSTALL FRONTEND DEPENDENCIES ────────────────────────────────
step "Installing frontend dependencies..."
cd frontend
if npm install --silent 2>/dev/null; then
  success "Frontend packages installed"
else
  info "Retrying with legacy peer deps..."
  npm install --legacy-peer-deps --silent 2>/dev/null && success "Frontend packages installed" || {
    error "Frontend npm install failed."
    exit 1
  }
fi
cd ..

# ── CONFIGURE ENVIRONMENT ────────────────────────────────────────
step "Configuring environment..."

if [ ! -f .env ]; then
  cp .env.example .env
  info "Created .env from .env.example"
  
  # Try to auto-detect PostgreSQL settings
  PG_USER="${USER:-postgres}"
  echo ""
  echo -e "${YELLOW}${BOLD}  Please enter your PostgreSQL credentials:${NC}"
  echo ""

  read -p "  Database host [localhost]: " DB_HOST
  DB_HOST=${DB_HOST:-localhost}

  read -p "  Database port [5432]: " DB_PORT
  DB_PORT=${DB_PORT:-5432}

  read -p "  Database name [luxe_ecommerce]: " DB_NAME
  DB_NAME=${DB_NAME:-luxe_ecommerce}

  read -p "  Database user [$PG_USER]: " DB_USER
  DB_USER=${DB_USER:-$PG_USER}

  read -s -p "  Database password: " DB_PASS
  echo ""

  # Update .env
  sed -i.bak "s|DB_HOST=localhost|DB_HOST=$DB_HOST|" .env
  sed -i.bak "s|DB_PORT=5432|DB_PORT=$DB_PORT|" .env
  sed -i.bak "s|DB_NAME=luxe_ecommerce|DB_NAME=$DB_NAME|" .env
  sed -i.bak "s|DB_USER=postgres|DB_USER=$DB_USER|" .env
  sed -i.bak "s|DB_PASSWORD=your_postgres_password|DB_PASSWORD=$DB_PASS|" .env
  rm -f .env.bak

  # Generate random JWT secret
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  sed -i.bak "s|JWT_SECRET=your_super_secret_jwt_key_change_this_in_production|JWT_SECRET=$JWT_SECRET|" .env
  rm -f .env.bak

  success "Environment configured"
else
  info ".env already exists — skipping configuration"
  # Load values for DB creation
  source .env 2>/dev/null || true
  DB_HOST=${DB_HOST:-localhost}
  DB_PORT=${DB_PORT:-5432}
  DB_NAME=${DB_NAME:-luxe_ecommerce}
  DB_USER=${DB_USER:-postgres}
  DB_PASS=${DB_PASSWORD:-""}
fi

# ── CREATE DATABASE ──────────────────────────────────────────────
step "Setting up PostgreSQL database..."

export PGPASSWORD="$DB_PASS"
export PGPASSWORD="${DB_PASS:-$DB_PASSWORD}"

# Create DB if it doesn't exist
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  info "Database '$DB_NAME' already exists"
else
  if createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null; then
    success "Database '$DB_NAME' created"
  else
    error "Could not create database. Please create it manually:"
    echo "    createdb $DB_NAME"
    echo "  Then run: npm run setup:db && npm run seed"
    echo ""
  fi
fi

# ── RUN MIGRATIONS ───────────────────────────────────────────────
step "Running database migrations..."
if node backend/config/setupDb.js; then
  success "All tables created"
else
  error "Migration failed. Check your database connection in .env"
  exit 1
fi

# ── SEED DATA ────────────────────────────────────────────────────
step "Seeding sample data..."
if node backend/config/seed.js; then
  success "Sample data seeded"
else
  error "Seeding failed (this is non-critical, you can retry with: npm run seed)"
fi

# ── DONE ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  ✓ LUXE Setup Complete!${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BOLD}Start the app:${NC}"
echo -e "    ${BLUE}npm run dev:full${NC}   ← runs both backend + frontend"
echo ""
echo -e "  ${BOLD}URLs:${NC}"
echo -e "    Frontend  →  ${BLUE}http://localhost:3000${NC}"
echo -e "    Backend   →  ${BLUE}http://localhost:5000${NC}"
echo -e "    Admin     →  ${BLUE}http://localhost:3000/admin${NC}"
echo ""
echo -e "  ${BOLD}Demo Accounts:${NC}"
echo -e "    Admin:    admin@luxe.com / Admin@123"
echo -e "    Customer: customer@luxe.com / Customer@123"
echo ""
echo -e "  ${BOLD}Demo Coupons:${NC}  LUXE20 · WELCOME10 · FLAT500 · FREESHIP"
echo ""
echo -e "  ${YELLOW}${BOLD}  Don't forget to add your Razorpay keys in .env!${NC}"
echo -e "    RAZORPAY_KEY_ID=rzp_test_..."
echo -e "    RAZORPAY_KEY_SECRET=..."
echo ""
