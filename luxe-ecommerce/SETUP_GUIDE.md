# 🛠️ LUXE Setup Guide — Step by Step

This guide covers setup for **Windows**, **macOS**, and **Linux**.

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18+ | https://nodejs.org |
| PostgreSQL | v13+ | https://www.postgresql.org/download |
| npm | v8+ | Comes with Node.js |

---

## ⚡ Quick Setup (Mac/Linux)

```bash
bash setup.sh
npm run dev:full
```

Open → http://localhost:3000

---

## ⚡ Quick Setup (Windows)

1. Double-click **`setup.bat`**
2. Edit `.env` when Notepad opens (database credentials)
3. Open two terminals:
   - Terminal 1: `npm run dev`
   - Terminal 2: `cd frontend && npm start`

Open → http://localhost:3000

---

## 📋 Manual Setup (All Platforms)

### Step 1 — Install Dependencies

```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

> **If you get errors**, try: `npm install --legacy-peer-deps`

---

### Step 2 — Create `.env` File

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=luxe_ecommerce
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE

# JWT (use any long random string)
JWT_SECRET=some_very_long_random_string_here_change_this

# Razorpay (get from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_here

# Email (Gmail — see Email Setup below)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# Frontend URL
CLIENT_URL=http://localhost:3000
```

---

### Step 3 — Create PostgreSQL Database

#### Windows (pgAdmin or cmd):
```cmd
psql -U postgres -c "CREATE DATABASE luxe_ecommerce;"
```

#### macOS / Linux:
```bash
createdb luxe_ecommerce
# OR
psql -U postgres -c "CREATE DATABASE luxe_ecommerce;"
```

---

### Step 4 — Run Database Migrations

```bash
npm run setup:db
```

Expected output:
```
✅ PostgreSQL connected: 2025-...
✅ All tables created successfully
```

---

### Step 5 — Seed Sample Data

```bash
npm run seed
```

Expected output:
```
✅ Database seeded successfully!
👤 Admin: admin@luxe.com / Admin@123
👤 Customer: customer@luxe.com / Customer@123
🎫 Coupons: LUXE20, WELCOME10, FLAT500, FREESHIP, SUMMER30
```

---

### Step 6 — Start Development Servers

**Option A — Both together (recommended):**
```bash
npm run dev:full
```

**Option B — Separately:**
```bash
# Terminal 1 (Backend — port 5000)
npm run dev

# Terminal 2 (Frontend — port 3000)
cd frontend && npm start
```

---

## 🌐 Access the App

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Customer Store |
| http://localhost:3000/admin | Admin Panel |
| http://localhost:5000/health | API Health Check |
| http://localhost:5000/api/products | Products API |

---

## 👤 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@luxe.com | Admin@123 |
| Customer | customer@luxe.com | Customer@123 |

---

## 🎫 Demo Coupons

| Code | Discount | Min Order |
|------|----------|-----------|
| LUXE20 | 20% off (max ₹2,000) | Any |
| WELCOME10 | 10% off | Any |
| FLAT500 | ₹500 off | ₹3,000 |
| FREESHIP | Free shipping | Any |
| SUMMER30 | 30% off (max ₹3,000) | ₹1,499 |

---

## 💳 Razorpay Setup

1. Create account at https://dashboard.razorpay.com
2. Go to **Settings → API Keys**
3. Generate test keys
4. Add to `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   ```

**Test payment credentials:**
- Card: `4111 1111 1111 1111` | CVV: `123` | Expiry: Any future date
- UPI: `success@razorpay`
- Net Banking: Select any bank → use test credentials shown

> **Note:** Without Razorpay keys, only **COD (Cash on Delivery)** will work.

---

## 📧 Email Setup (Gmail)

1. Enable 2-factor authentication on your Gmail
2. Go to → Google Account → Security → App Passwords
3. Create an App Password for "Mail"
4. Use that 16-character password in `.env` as `EMAIL_PASS`

```env
EMAIL_USER=yourname@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx   ← App Password (no spaces)
```

> **Note:** Without email setup, the app still works fully — emails just won't send.

---

## 🔧 Common Errors & Fixes

### ❌ `npm install` fails with `EACCES`
```bash
sudo npm install
# OR use npx
```

### ❌ `PostgreSQL connection failed`
- Make sure PostgreSQL is **running**
- Check credentials in `.env` match your PostgreSQL setup
- Windows: Open **pgAdmin** and verify the server is running
- Mac: `brew services start postgresql`
- Linux: `sudo service postgresql start`

### ❌ `role "postgres" does not exist`
```bash
# Mac (Homebrew install)
psql -U $(whoami) -c "CREATE DATABASE luxe_ecommerce;"
# Update DB_USER in .env to your system username
```

### ❌ `createdb: command not found` (Windows)
```cmd
"C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres luxe_ecommerce
```

### ❌ `Razorpay keys not configured`
- This only affects online payments
- COD orders still work without Razorpay keys
- Add keys to `.env` when ready

### ❌ Port 3000 or 5000 already in use
```bash
# Kill process on port 3000
kill $(lsof -ti:3000)   # Mac/Linux
# Windows: netstat -ano | findstr :3000 → taskkill /PID <PID> /F
```

### ❌ Frontend shows blank page
```bash
cd frontend
npm install
npm start
```

### ❌ `Module not found: can't resolve`
```bash
cd frontend
rm -rf node_modules
npm install --legacy-peer-deps
```

---

## 🚀 Production Deployment

### Option 1 — Railway (Easiest)
1. Push to GitHub
2. Connect Railway → Deploy from GitHub
3. Add environment variables in Railway dashboard
4. Add PostgreSQL plugin

### Option 2 — Render
1. Push to GitHub
2. Create Web Service → connect repo
3. Build command: `npm install && cd frontend && npm install && npm run build && cd ..`
4. Start command: `NODE_ENV=production node backend/server.js`
5. Add PostgreSQL database

### Option 3 — VPS (DigitalOcean / AWS)
```bash
# Build frontend for production
cd frontend && npm run build && cd ..

# Set NODE_ENV and start
NODE_ENV=production node backend/server.js

# Or use PM2 for process management
npm install -g pm2
pm2 start backend/server.js --name luxe
pm2 save && pm2 startup
```

---

## 📁 Project Structure

```
luxe-ecommerce/
├── backend/
│   ├── config/
│   │   ├── db.js          ← PostgreSQL connection pool
│   │   ├── setupDb.js     ← Creates all 11 tables
│   │   └── seed.js        ← Sample data
│   ├── controllers/
│   │   ├── authController.js    ← Register, Login, Reset Password
│   │   ├── productController.js ← CRUD + Search + Filters
│   │   ├── orderController.js   ← Razorpay + COD + Status
│   │   └── miscController.js    ← Cart, Wishlist, Reviews, Coupons
│   ├── middleware/
│   │   ├── auth.js        ← JWT protect, role guard
│   │   └── error.js       ← Global error handler
│   ├── routes/
│   │   └── index.js       ← All 40+ API routes
│   ├── utils/
│   │   └── email.js       ← 6 HTML email templates
│   └── server.js          ← Express app entry point
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Navbar.js       ← Sticky nav, search, cart
│       │   ├── Footer.js       ← Newsletter, links
│       │   ├── CartSidebar.js  ← Slide-in cart panel
│       │   └── ProductCard.js  ← Card with hover actions
│       ├── context/
│       │   ├── AuthContext.js  ← Global auth state
│       │   └── CartContext.js  ← Global cart state
│       ├── pages/
│       │   ├── HomePage.js          ← Hero, categories, products
│       │   ├── ShopPage.js          ← Filter + pagination
│       │   ├── ProductDetailPage.js ← Images, variants, reviews
│       │   ├── CheckoutPage.js      ← Razorpay + COD
│       │   ├── OrdersPage.js        ← Order history + tracking
│       │   ├── AccountPage.js       ← Profile + addresses
│       │   ├── WishlistPage.js      ← Saved items
│       │   ├── AuthPages.js         ← Login + Register
│       │   └── admin/
│       │       ├── AdminLayout.js   ← Sidebar layout
│       │       ├── AdminDashboard.js← Charts + stats
│       │       ├── AdminProducts.js ← Product CRUD
│       │       ├── AdminOrders.js   ← Order management
│       │       ├── AdminUsers.js    ← User management
│       │       └── AdminCoupons.js  ← Coupon management
│       ├── utils/
│       │   └── api.js         ← Axios with auth interceptors
│       ├── App.js             ← Routes + providers
│       └── index.css          ← Tailwind + custom classes
│
├── .env.example     ← Environment template
├── package.json     ← Backend deps
├── setup.sh         ← Mac/Linux setup script
├── setup.bat        ← Windows setup script
└── README.md        ← Quick reference
```

---

## 💡 Freelancing Tips

This project is worth **₹25,000–₹75,000+** as a freelance deliverable. When presenting to clients:

1. **Customize the brand** — Change "LUXE" to client's brand name
2. **Add real product images** — Replace emoji placeholders with actual photos
3. **Configure domain** — Point Razorpay webhook to production URL
4. **Enable HTTPS** — Required for production Razorpay
5. **Set up backups** — PostgreSQL automated backups

### What to charge:
- Basic setup + deployment: ₹15,000–₹25,000
- With customization: ₹30,000–₹50,000
- With ongoing support: +₹5,000/month
