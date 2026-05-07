const { pool } = require('./db');
require('dotenv').config();

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // EXTENSIONS
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // ── USERS ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name         VARCHAR(100) NOT NULL,
        email        VARCHAR(150) UNIQUE NOT NULL,
        password     VARCHAR(255),
        role         VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer','admin','superadmin')),
        avatar       VARCHAR(500),
        phone        VARCHAR(20),
        is_verified  BOOLEAN DEFAULT false,
        is_active    BOOLEAN DEFAULT true,
        google_id    VARCHAR(200),
        reset_token  VARCHAR(500),
        reset_expires TIMESTAMPTZ,
        verify_token VARCHAR(500),
        last_login   TIMESTAMPTZ,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── ADDRESSES ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
        name         VARCHAR(100) NOT NULL,
        phone        VARCHAR(20) NOT NULL,
        line1        VARCHAR(255) NOT NULL,
        line2        VARCHAR(255),
        city         VARCHAR(100) NOT NULL,
        state        VARCHAR(100) NOT NULL,
        pincode      VARCHAR(10) NOT NULL,
        country      VARCHAR(50) DEFAULT 'India',
        is_default   BOOLEAN DEFAULT false,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── CATEGORIES ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name         VARCHAR(100) UNIQUE NOT NULL,
        slug         VARCHAR(120) UNIQUE NOT NULL,
        description  TEXT,
        image        VARCHAR(500),
        parent_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
        sort_order   INT DEFAULT 0,
        is_active    BOOLEAN DEFAULT true,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── BRANDS ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name         VARCHAR(100) UNIQUE NOT NULL,
        slug         VARCHAR(120) UNIQUE NOT NULL,
        logo         VARCHAR(500),
        is_active    BOOLEAN DEFAULT true,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── PRODUCTS ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name            VARCHAR(255) NOT NULL,
        slug            VARCHAR(280) UNIQUE NOT NULL,
        description     TEXT,
        short_desc      VARCHAR(500),
        category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
        brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
        price           NUMERIC(10,2) NOT NULL,
        compare_price   NUMERIC(10,2),
        cost_price      NUMERIC(10,2),
        sku             VARCHAR(100) UNIQUE,
        stock           INT DEFAULT 0,
        low_stock_alert INT DEFAULT 5,
        weight          NUMERIC(8,2),
        images          JSONB DEFAULT '[]',
        tags            TEXT[],
        is_active       BOOLEAN DEFAULT true,
        is_featured     BOOLEAN DEFAULT false,
        is_new_arrival  BOOLEAN DEFAULT false,
        avg_rating      NUMERIC(3,2) DEFAULT 0,
        review_count    INT DEFAULT 0,
        sold_count      INT DEFAULT 0,
        meta_title      VARCHAR(255),
        meta_desc       VARCHAR(500),
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── PRODUCT VARIANTS ───────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id   UUID REFERENCES products(id) ON DELETE CASCADE,
        size         VARCHAR(20),
        color        VARCHAR(50),
        color_hex    VARCHAR(10),
        stock        INT DEFAULT 0,
        price_adj    NUMERIC(8,2) DEFAULT 0,
        sku          VARCHAR(100),
        created_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── WISHLISTS ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS wishlists (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      )
    `);

    // ── COUPONS ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code             VARCHAR(30) UNIQUE NOT NULL,
        description      VARCHAR(255),
        type             VARCHAR(20) DEFAULT 'percentage' CHECK (type IN ('percentage','fixed','free_shipping')),
        value            NUMERIC(10,2) NOT NULL,
        min_order_amount NUMERIC(10,2) DEFAULT 0,
        max_discount     NUMERIC(10,2),
        usage_limit      INT,
        used_count       INT DEFAULT 0,
        user_limit       INT DEFAULT 1,
        valid_from       TIMESTAMPTZ DEFAULT NOW(),
        valid_until      TIMESTAMPTZ,
        is_active        BOOLEAN DEFAULT true,
        created_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── ORDERS ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_number      VARCHAR(30) UNIQUE NOT NULL,
        user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
        status            VARCHAR(30) DEFAULT 'pending'
                          CHECK (status IN ('pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','refunded')),
        payment_status    VARCHAR(20) DEFAULT 'pending'
                          CHECK (payment_status IN ('pending','paid','failed','refunded')),
        payment_method    VARCHAR(30),
        razorpay_order_id VARCHAR(200),
        razorpay_payment_id VARCHAR(200),
        razorpay_signature VARCHAR(500),
        items             JSONB NOT NULL DEFAULT '[]',
        subtotal          NUMERIC(10,2) NOT NULL,
        discount          NUMERIC(10,2) DEFAULT 0,
        shipping_charge   NUMERIC(10,2) DEFAULT 0,
        tax               NUMERIC(10,2) DEFAULT 0,
        total             NUMERIC(10,2) NOT NULL,
        coupon_code       VARCHAR(30),
        coupon_discount   NUMERIC(10,2) DEFAULT 0,
        shipping_address  JSONB NOT NULL,
        notes             TEXT,
        tracking_number   VARCHAR(100),
        tracking_url      VARCHAR(500),
        shipped_at        TIMESTAMPTZ,
        delivered_at      TIMESTAMPTZ,
        cancelled_at      TIMESTAMPTZ,
        cancel_reason     TEXT,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── ORDER TIMELINE ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_timeline (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
        status     VARCHAR(50) NOT NULL,
        message    TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── REVIEWS ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
        user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
        order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
        rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title       VARCHAR(200),
        body        TEXT,
        images      JSONB DEFAULT '[]',
        is_verified BOOLEAN DEFAULT false,
        is_approved BOOLEAN DEFAULT true,
        helpful     INT DEFAULT 0,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(product_id, user_id)
      )
    `);

    // ── CART (server-side persistence) ─────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        items      JSONB DEFAULT '[]',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── NOTIFICATIONS ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
        type       VARCHAR(50),
        title      VARCHAR(200),
        message    TEXT,
        link       VARCHAR(300),
        is_read    BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── INDEXES ───────────────────────────────────────────────
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_active=true`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(to_tsvector('english', name || ' ' || COALESCE(description,'')))`);

    await client.query('COMMIT');
    console.log('✅ All tables created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating tables:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  createTables().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { createTables };
