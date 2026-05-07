# LUXE — Full-Stack Ecommerce Platform

A production-ready luxury fashion ecommerce platform built with Node.js, Express, PostgreSQL, and React with Tailwind CSS.

## 🚀 Tech Stack

**Backend:** Node.js + Express + PostgreSQL  
**Frontend:** React 18 + Tailwind CSS  
**Payment:** Razorpay (UPI, Cards, Net Banking, Wallets)  
**Email:** Nodemailer (Gmail SMTP)  
**Auth:** JWT + HTTP-only cookies  

## ✨ Features

- 🔐 Full authentication (register, login, forgot/reset password, email verify)
- 🛍️ Product catalog with variants, filters, search, pagination
- 🛒 Persistent server-side cart with real-time updates
- 💳 Razorpay payment integration + COD
- 📦 Order management with timeline tracking
- ❤️ Wishlist with move-to-cart
- 🎫 Coupon system (%, fixed, free shipping)
- ⭐ Product reviews with verified purchase badge
- 📍 Multiple saved addresses
- 📧 Email notifications (order confirm, shipped, status updates)
- ⚡ Admin dashboard with analytics, charts, CRUD
- 👥 User management with role control
- 📱 Fully responsive Tailwind CSS UI

## 🛠️ Setup

### 1. Install dependencies
\`\`\`bash
npm install
cd frontend && npm install && cd ..
\`\`\`

### 2. Configure environment
\`\`\`bash
cp .env.example .env
# Edit .env with your DB credentials, Razorpay keys, and email settings
\`\`\`

### 3. Setup database
\`\`\`bash
# Create PostgreSQL database
createdb luxe_ecommerce

# Run migrations
npm run setup:db

# Seed with sample data
npm run seed
\`\`\`

### 4. Run development servers
\`\`\`bash
# Backend only (port 5000)
npm run dev

# Frontend only (port 3000)
npm run client

# Both together
npm run dev:full
\`\`\`

## 👤 Demo Accounts (after seeding)
| Role     | Email                    | Password       |
|----------|--------------------------|----------------|
| Admin    | admin@luxe.com           | Admin@123      |
| Customer | customer@luxe.com        | Customer@123   |

## 🎫 Demo Coupons
| Code       | Discount                     |
|------------|------------------------------|
| LUXE20     | 20% off (max ₹2,000)         |
| WELCOME10  | 10% off for new users         |
| FLAT500    | ₹500 off on orders > ₹3,000  |
| FREESHIP   | Free shipping on any order    |
| SUMMER30   | 30% off (max ₹3,000)         |

## 💳 Razorpay Test Cards
- Card: 4111 1111 1111 1111 | CVV: 123 | Expiry: Any future date
- UPI: success@razorpay (test mode)

## 📁 Project Structure
\`\`\`
luxe-ecommerce/
├── backend/
│   ├── config/        # DB connection, setup, seed
│   ├── controllers/   # auth, products, orders, misc
│   ├── middleware/    # auth, error handling
│   ├── routes/        # all API routes
│   └── utils/         # email templates
├── frontend/
│   └── src/
│       ├── components/ # Navbar, Footer, CartSidebar, ProductCard
│       ├── context/    # AuthContext, CartContext
│       ├── pages/      # All pages + admin panel
│       └── utils/      # Axios API client
└── .env.example
\`\`\`

## 🌐 API Endpoints
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `GET  /api/products` — List products (with filters)
- `GET  /api/products/:slug` — Product detail
- `POST /api/orders/razorpay` — Create Razorpay order
- `POST /api/orders/verify-payment` — Verify & place order
- `POST /api/orders/cod` — Cash on delivery order
- `GET  /api/admin/dashboard` — Admin stats & charts

## 🚀 Production Deployment
1. Set `NODE_ENV=production` in `.env`
2. Build frontend: `cd frontend && npm run build`
3. The Express server will serve the React build automatically
4. Deploy to: Render, Railway, DigitalOcean App Platform, or any Node host
