const { query } = require('../config/db');
const { AppError } = require('../middleware/error');

// ── GET ALL PRODUCTS ──────────────────────────────────────────
exports.getProducts = async (req, res) => {
  const {
    page = 1, limit = 12, sort = 'created_at',
    order = 'desc', category, brand, min_price,
    max_price, search, featured, new_arrival, in_stock, tags
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ['p.is_active = true'];
  const params = [];
  let idx = 1;

  if (category) {
    conditions.push(`c.slug = $${idx++}`);
    params.push(category);
  }
  if (brand) {
    conditions.push(`b.slug = $${idx++}`);
    params.push(brand);
  }
  if (min_price) {
    conditions.push(`p.price >= $${idx++}`);
    params.push(parseFloat(min_price));
  }
  if (max_price) {
    conditions.push(`p.price <= $${idx++}`);
    params.push(parseFloat(max_price));
  }
  if (featured === 'true') conditions.push('p.is_featured = true');
  if (new_arrival === 'true') conditions.push('p.is_new_arrival = true');
  if (in_stock === 'true') conditions.push('p.stock > 0');
  if (tags) {
    conditions.push(`p.tags && $${idx++}`);
    params.push(tags.split(','));
  }
  if (search) {
    conditions.push(`(
      to_tsvector('english', p.name || ' ' || COALESCE(p.description,'')) @@ plainto_tsquery('english', $${idx})
      OR p.name ILIKE $${idx + 1}
    )`);
    params.push(search, `%${search}%`);
    idx += 2;
  }

  const allowedSorts = ['created_at', 'price', 'avg_rating', 'sold_count', 'name'];
  const sortCol = allowedSorts.includes(sort) ? `p.${sort}` : 'p.created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await query(`
    SELECT COUNT(*) FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    ${where}
  `, params);

  const total = parseInt(countResult.rows[0].count);

  const result = await query(`
    SELECT p.*,
      c.name as category_name, c.slug as category_slug,
      b.name as brand_name, b.slug as brand_slug,
      CASE WHEN p.compare_price > p.price
        THEN ROUND(((p.compare_price - p.price) / p.compare_price * 100)::numeric, 0)
        ELSE 0
      END as discount_percent
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    ${where}
    ORDER BY ${sortCol} ${sortOrder}
    LIMIT $${idx} OFFSET $${idx + 1}
  `, [...params, parseInt(limit), offset]);

  res.json({
    success: true,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    products: result.rows
  });
};

// ── GET SINGLE PRODUCT ────────────────────────────────────────
exports.getProduct = async (req, res, next) => {
  const { slug } = req.params;

  const result = await query(`
    SELECT p.*,
      c.name as category_name, c.slug as category_slug,
      b.name as brand_name, b.slug as brand_slug,
      CASE WHEN p.compare_price > p.price
        THEN ROUND(((p.compare_price - p.price) / p.compare_price * 100)::numeric, 0)
        ELSE 0
      END as discount_percent
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.slug = $1 AND p.is_active = true
  `, [slug]);

  if (!result.rows.length) return next(new AppError('Product not found.', 404));

  const product = result.rows[0];

  // Get variants
  const variants = await query(
    'SELECT * FROM product_variants WHERE product_id=$1 ORDER BY size, color',
    [product.id]
  );

  // Get reviews (latest 10)
  const reviews = await query(`
    SELECT r.*, u.name as user_name, u.avatar as user_avatar
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id=$1 AND r.is_approved=true
    ORDER BY r.created_at DESC LIMIT 10
  `, [product.id]);

  // Rating distribution
  const ratingDist = await query(`
    SELECT rating, COUNT(*) as count
    FROM reviews WHERE product_id=$1 AND is_approved=true
    GROUP BY rating ORDER BY rating DESC
  `, [product.id]);

  // Related products
  const related = await query(`
    SELECT p.id, p.name, p.slug, p.price, p.compare_price, p.images, p.avg_rating, p.is_new_arrival
    FROM products p
    WHERE p.category_id=$1 AND p.id != $2 AND p.is_active=true
    ORDER BY p.sold_count DESC LIMIT 4
  `, [product.category_id, product.id]);

  res.json({
    success: true,
    product: {
      ...product,
      variants: variants.rows,
      reviews: reviews.rows,
      rating_distribution: ratingDist.rows,
      related: related.rows
    }
  });
};

// ── CREATE PRODUCT (Admin) ────────────────────────────────────
exports.createProduct = async (req, res, next) => {
  const {
    name, description, short_desc, category_id, brand_id,
    price, compare_price, cost_price, stock, sku,
    tags, is_featured, is_new_arrival, images,
    meta_title, meta_desc, weight, low_stock_alert
  } = req.body;

  if (!name || !price) return next(new AppError('Name and price are required.', 400));

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    + '-' + Date.now().toString(36);

  const result = await query(`
    INSERT INTO products
      (name, slug, description, short_desc, category_id, brand_id,
       price, compare_price, cost_price, stock, sku, tags,
       is_featured, is_new_arrival, images, meta_title, meta_desc, weight, low_stock_alert)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *
  `, [
    name, slug, description, short_desc, category_id, brand_id,
    price, compare_price || null, cost_price || null,
    stock || 0, sku || null,
    tags || [], is_featured || false, is_new_arrival || false,
    JSON.stringify(images || []), meta_title, meta_desc,
    weight || null, low_stock_alert || 5
  ]);

  res.status(201).json({ success: true, product: result.rows[0] });
};

// ── UPDATE PRODUCT (Admin) ────────────────────────────────────
exports.updateProduct = async (req, res, next) => {
  const { id } = req.params;
  const existing = await query('SELECT * FROM products WHERE id=$1', [id]);
  if (!existing.rows.length) return next(new AppError('Product not found.', 404));

  const p = existing.rows[0];
  const {
    name = p.name, description = p.description, short_desc = p.short_desc,
    category_id = p.category_id, brand_id = p.brand_id,
    price = p.price, compare_price = p.compare_price, cost_price = p.cost_price,
    stock = p.stock, sku = p.sku, tags = p.tags,
    is_featured = p.is_featured, is_new_arrival = p.is_new_arrival,
    is_active = p.is_active, images = p.images,
    meta_title = p.meta_title, meta_desc = p.meta_desc
  } = req.body;

  const result = await query(`
    UPDATE products SET
      name=$1, description=$2, short_desc=$3, category_id=$4, brand_id=$5,
      price=$6, compare_price=$7, cost_price=$8, stock=$9, sku=$10, tags=$11,
      is_featured=$12, is_new_arrival=$13, is_active=$14, images=$15,
      meta_title=$16, meta_desc=$17, updated_at=NOW()
    WHERE id=$18 RETURNING *
  `, [
    name, description, short_desc, category_id, brand_id,
    price, compare_price, cost_price, stock, sku, tags,
    is_featured, is_new_arrival, is_active, JSON.stringify(images),
    meta_title, meta_desc, id
  ]);

  res.json({ success: true, product: result.rows[0] });
};

// ── DELETE PRODUCT (Admin) ────────────────────────────────────
exports.deleteProduct = async (req, res, next) => {
  const { id } = req.params;
  const result = await query('UPDATE products SET is_active=false WHERE id=$1 RETURNING id', [id]);
  if (!result.rows.length) return next(new AppError('Product not found.', 404));
  res.json({ success: true, message: 'Product removed.' });
};

// ── GET CATEGORIES ────────────────────────────────────────────
exports.getCategories = async (req, res) => {
  const result = await query(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.is_active=true
    WHERE c.is_active=true
    GROUP BY c.id
    ORDER BY c.sort_order, c.name
  `);
  res.json({ success: true, categories: result.rows });
};

// ── GET BRANDS ────────────────────────────────────────────────
exports.getBrands = async (req, res) => {
  const result = await query(`
    SELECT b.*, COUNT(p.id) as product_count
    FROM brands b
    LEFT JOIN products p ON p.brand_id = b.id AND p.is_active=true
    WHERE b.is_active=true
    GROUP BY b.id ORDER BY b.name
  `);
  res.json({ success: true, brands: result.rows });
};

// ── SEARCH SUGGESTIONS ────────────────────────────────────────
exports.searchSuggestions = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ success: true, suggestions: [] });

  const result = await query(`
    SELECT name, slug FROM products
    WHERE name ILIKE $1 AND is_active=true
    LIMIT 6
  `, [`%${q}%`]);
  res.json({ success: true, suggestions: result.rows });
};
