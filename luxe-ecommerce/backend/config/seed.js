// const { pool } = require('./db');
// const bcrypt = require('bcryptjs');
// require('dotenv').config();

// const seed = async () => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     // ── ADMIN USER ─────────────────────────────────────────────
//     const hashedPassword = await bcrypt.hash('Admin@123', 12);
//     await client.query(`
//       INSERT INTO users (name, email, password, role, is_verified)
//       VALUES ($1, $2, $3, $4, $5)
//       ON CONFLICT (email) DO NOTHING
//     `, ['Admin User', 'admin@luxe.com', hashedPassword, 'admin', true]);

//     // Demo customer
//     const custPass = await bcrypt.hash('Customer@123', 12);
//     await client.query(`
//       INSERT INTO users (name, email, password, role, is_verified)
//       VALUES ($1, $2, $3, $4, $5)
//       ON CONFLICT (email) DO NOTHING
//     `, ['Priya Sharma', 'customer@luxe.com', custPass, 'customer', true]);

//     // ── CATEGORIES ─────────────────────────────────────────────
//     const categories = [
//       ['Women', 'women', 'Premium women\'s fashion', 1],
//       ['Men', 'men', 'Refined men\'s clothing', 2],
//       ['Accessories', 'accessories', 'Luxury accessories', 3],
//       ['Footwear', 'footwear', 'Premium footwear', 4],
//       ['Jewellery', 'jewellery', 'Fine jewellery collection', 5],
//     ];

//     for (const [name, slug, desc, sort] of categories) {
//       await client.query(`
//         INSERT INTO categories (name, slug, description, sort_order)
//         VALUES ($1,$2,$3,$4) ON CONFLICT (slug) DO NOTHING
//       `, [name, slug, desc, sort]);
//     }

//     // ── BRANDS ─────────────────────────────────────────────────
//     const brands = [
//       ['Zara Studio', 'zara-studio'],
//       ['H&M Premium', 'hm-premium'],
//       ['Coach', 'coach'],
//       ['Adidas Premium', 'adidas-premium'],
//       ['Levi\'s', 'levis'],
//       ['Tanishq', 'tanishq'],
//     ];
//     for (const [name, slug] of brands) {
//       await client.query(`
//         INSERT INTO brands (name, slug) VALUES ($1,$2) ON CONFLICT (slug) DO NOTHING
//       `, [name, slug]);
//     }

//     // ── COUPONS ────────────────────────────────────────────────
//     const coupons = [
//       ['LUXE20', 'Flat 20% off on all orders', 'percentage', 20, 999, 2000, 100, '2025-12-31'],
//       ['WELCOME10', '10% off for new users', 'percentage', 10, 0, 500, 500, '2025-12-31'],
//       ['FLAT500', 'Flat ₹500 off on orders above ₹3000', 'fixed', 500, 3000, 500, 200, '2025-12-31'],
//       ['FREESHIP', 'Free shipping on all orders', 'free_shipping', 0, 0, null, 1000, '2025-12-31'],
//       ['SUMMER30', 'Summer sale — 30% off', 'percentage', 30, 1499, 3000, 50, '2025-09-30'],
//     ];
//     for (const [code, desc, type, val, min, max, limit, until] of coupons) {
//       await client.query(`
//         INSERT INTO coupons (code, description, type, value, min_order_amount, max_discount, usage_limit, valid_until)
//         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (code) DO NOTHING
//       `, [code, desc, type, val, min, max, limit, until]);
//     }

//     // ── PRODUCTS ───────────────────────────────────────────────
//     const catResult = await client.query('SELECT id, slug FROM categories');
//     const cats = {};
//     catResult.rows.forEach(r => cats[r.slug] = r.id);

//     const brandResult = await client.query('SELECT id, slug FROM brands');
//     const brnds = {};
//     brandResult.rows.forEach(r => brnds[r.slug] = r.id);

//     const products = [
//       {
//         name: 'Floral Silk Midi Dress',
//         slug: 'floral-silk-midi-dress',
//         description: 'Crafted from the finest silk, this midi dress features an elegant floral print that transitions seamlessly from day to evening. The relaxed fit and mid-length silhouette make it a wardrobe essential.',
//         short_desc: 'Premium silk midi dress with floral print. Perfect for all occasions.',
//         category: 'women', brand: 'zara-studio',
//         price: 4299, compare_price: 5999, cost_price: 1800,
//         stock: 45, sku: 'ZS-DRESS-001',
//         tags: ['dress', 'silk', 'floral', 'women', 'new'],
//         is_featured: true, is_new_arrival: true,
//         images: JSON.stringify([
//           { url: '/uploads/products/dress1.jpg', alt: 'Floral Silk Dress', is_primary: true },
//           { url: '/uploads/products/dress1-2.jpg', alt: 'Dress back view', is_primary: false }
//         ])
//       },
//       {
//         name: 'Tailored Linen Blazer',
//         slug: 'tailored-linen-blazer',
//         description: 'A modern take on the classic blazer, crafted in breathable linen. Features a slim cut, notch lapels and functional button pockets. Versatile enough for the office and beyond.',
//         short_desc: 'Breathable linen blazer in a modern slim cut.',
//         category: 'men', brand: 'hm-premium',
//         price: 5999, compare_price: 7999, cost_price: 2200,
//         stock: 30, sku: 'HM-BLZR-001',
//         tags: ['blazer', 'linen', 'men', 'formal', 'sale'],
//         is_featured: true, is_new_arrival: false,
//         images: JSON.stringify([{ url: '/uploads/products/blazer1.jpg', alt: 'Linen Blazer', is_primary: true }])
//       },
//       {
//         name: 'Structured Leather Tote',
//         slug: 'structured-leather-tote',
//         description: 'Hand-stitched full-grain leather tote bag with a structured silhouette. Features an inner zip pocket, two open pockets, and magnetic snap closure. The perfect everyday luxury bag.',
//         short_desc: 'Hand-stitched full-grain leather tote. Timeless luxury.',
//         category: 'accessories', brand: 'coach',
//         price: 8499, compare_price: null, cost_price: 3200,
//         stock: 15, sku: 'CC-TOTE-001',
//         tags: ['bag', 'leather', 'tote', 'luxury', 'limited'],
//         is_featured: true, is_new_arrival: true,
//         images: JSON.stringify([{ url: '/uploads/products/tote1.jpg', alt: 'Leather Tote', is_primary: true }])
//       },
//       {
//         name: 'Clean White Leather Sneakers',
//         slug: 'clean-white-leather-sneakers',
//         description: 'Minimalist leather sneakers with a clean all-white silhouette. Premium full-grain leather upper, cushioned insole, and durable rubber outsole. The definition of effortless cool.',
//         short_desc: 'Minimalist premium leather sneakers in clean white.',
//         category: 'footwear', brand: 'adidas-premium',
//         price: 6799, compare_price: null, cost_price: 2800,
//         stock: 60, sku: 'AP-SNK-001',
//         tags: ['sneakers', 'shoes', 'leather', 'white', 'new'],
//         is_featured: true, is_new_arrival: true,
//         images: JSON.stringify([{ url: '/uploads/products/sneakers1.jpg', alt: 'White Leather Sneakers', is_primary: true }])
//       },
//       {
//         name: 'Delicate Gold Chain Necklace',
//         slug: 'delicate-gold-chain-necklace',
//         description: '18K gold-plated delicate chain necklace with a modern minimalist design. Adjustable length, hypoallergenic, and tarnish-resistant. Pairs beautifully with any outfit.',
//         short_desc: '18K gold-plated minimalist chain necklace.',
//         category: 'jewellery', brand: 'tanishq',
//         price: 2199, compare_price: null, cost_price: 900,
//         stock: 80, sku: 'TQ-NKLC-001',
//         tags: ['necklace', 'gold', 'jewellery', 'minimalist'],
//         is_featured: false, is_new_arrival: true,
//         images: JSON.stringify([{ url: '/uploads/products/necklace1.jpg', alt: 'Gold Chain Necklace', is_primary: true }])
//       },
//       {
//         name: 'Classic Wool Overcoat',
//         slug: 'classic-wool-overcoat',
//         description: 'A wardrobe investment piece — premium merino wool overcoat with a double-breasted front, wide lapels, and a relaxed fit. Fully lined, notch pockets with flap.',
//         short_desc: 'Premium merino wool overcoat. A timeless investment.',
//         category: 'women', brand: 'hm-premium',
//         price: 9100, compare_price: 13000, cost_price: 4000,
//         stock: 20, sku: 'HM-COAT-001',
//         tags: ['coat', 'wool', 'women', 'winter', 'sale'],
//         is_featured: true, is_new_arrival: false,
//         images: JSON.stringify([{ url: '/uploads/products/coat1.jpg', alt: 'Wool Overcoat', is_primary: true }])
//       },
//       {
//         name: 'Vintage Wash Denim Jacket',
//         slug: 'vintage-wash-denim-jacket',
//         description: 'Classic denim jacket with a vintage wash finish. Features chest patch pockets, adjustable side tabs, and a lived-in feel that gets better with every wear.',
//         short_desc: 'Classic denim jacket with authentic vintage wash.',
//         category: 'men', brand: 'levis',
//         price: 4599, compare_price: null, cost_price: 1800,
//         stock: 35, sku: 'LV-DNJKT-001',
//         tags: ['jacket', 'denim', 'men', 'casual', 'limited'],
//         is_featured: false, is_new_arrival: false,
//         images: JSON.stringify([{ url: '/uploads/products/denim1.jpg', alt: 'Denim Jacket', is_primary: true }])
//       },
//       {
//         name: 'Signature Fragrance Gift Set',
//         slug: 'signature-fragrance-gift-set',
//         description: 'A curated gift set featuring three 30ml eau de parfum bottles. Notes of bergamot, rose, and sandalwood. Beautifully packaged in a signature matte black box.',
//         short_desc: 'Curated fragrance gift set with three premium scents.',
//         category: 'accessories', brand: 'zara-studio',
//         price: 3499, compare_price: null, cost_price: 1400,
//         stock: 25, sku: 'ZS-FRGST-001',
//         tags: ['fragrance', 'perfume', 'gift', 'new'],
//         is_featured: false, is_new_arrival: true,
//         images: JSON.stringify([{ url: '/uploads/products/fragrance1.jpg', alt: 'Fragrance Gift Set', is_primary: true }])
//       },
//     ];

//     for (const p of products) {
//       await client.query(`
//         INSERT INTO products
//           (name, slug, description, short_desc, category_id, brand_id,
//            price, compare_price, cost_price, stock, sku, tags,
//            is_featured, is_new_arrival, images)
//         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
//         ON CONFLICT (slug) DO NOTHING
//       `, [
//         p.name, p.slug, p.description, p.short_desc,
//         cats[p.category], brnds[p.brand],
//         p.price, p.compare_price || null, p.cost_price,
//         p.stock, p.sku, p.tags,
//         p.is_featured, p.is_new_arrival, p.images
//       ]);
//     }

//     // ── PRODUCT VARIANTS ───────────────────────────────────────
//     const dressId = (await client.query(`SELECT id FROM products WHERE slug='floral-silk-midi-dress'`)).rows[0]?.id;
//     if (dressId) {
//       const variants = [
//         ['XS', 'Blush Pink', '#F5C6CB', 12],
//         ['S',  'Blush Pink', '#F5C6CB', 15],
//         ['M',  'Blush Pink', '#F5C6CB', 10],
//         ['L',  'Blush Pink', '#F5C6CB', 8],
//         ['S',  'Sage Green', '#C7E0C7', 10],
//         ['M',  'Sage Green', '#C7E0C7', 8],
//         ['S',  'Sky Blue',   '#C7D5F0', 12],
//       ];
//       for (const [size, color, hex, stock] of variants) {
//         await client.query(`
//           INSERT INTO product_variants (product_id, size, color, color_hex, stock)
//           VALUES ($1,$2,$3,$4,$5)
//         `, [dressId, size, color, hex, stock]);
//       }
//     }

//     // ── SAMPLE REVIEWS ─────────────────────────────────────────
//     const userResult = await client.query(`SELECT id FROM users WHERE email='customer@luxe.com'`);
//     const custId = userResult.rows[0]?.id;
//     const prodResult = await client.query(`SELECT id FROM products LIMIT 3`);

//     if (custId) {
//       const reviews = [
//         { rating: 5, title: 'Absolutely gorgeous!', body: 'The quality is incredible. The silk feels luxurious and the fit is perfect. I\'ve received so many compliments!' },
//         { rating: 4, title: 'Great quality, fast delivery', body: 'Really impressed with the material. Delivery was super fast and packaging was beautiful.' },
//         { rating: 5, title: 'Worth every rupee', body: 'This is exactly what luxury shopping should feel like. The craftsmanship is impeccable.' },
//       ];
//       for (let i = 0; i < reviews.length && i < prodResult.rows.length; i++) {
//         const r = reviews[i];
//         await client.query(`
//           INSERT INTO reviews (product_id, user_id, rating, title, body, is_verified)
//           VALUES ($1,$2,$3,$4,$5,true) ON CONFLICT (product_id, user_id) DO NOTHING
//         `, [prodResult.rows[i].id, custId, r.rating, r.title, r.body]);
//       }
//     }

//     await client.query('COMMIT');
//     console.log('✅ Database seeded successfully!');
//     console.log('👤 Admin: admin@luxe.com / Admin@123');
//     console.log('👤 Customer: customer@luxe.com / Customer@123');
//     console.log('🎫 Coupons: LUXE20, WELCOME10, FLAT500, FREESHIP, SUMMER30');
//   } catch (err) {
//     await client.query('ROLLBACK');
//     console.error('❌ Seeding failed:', err);
//     throw err;
//   } finally {
//     client.release();
//     await pool.end();
//   }
// };

// seed().catch(() => process.exit(1));
