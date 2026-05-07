const { query } = require('../config/db');
const { AppError } = require('../middleware/error');

// ════════════════════════════════════════════════
// REVIEWS
// ════════════════════════════════════════════════

exports.createReview = async (req, res, next) => {
  const { product_id, rating, title, body, order_id } = req.body;
  if (!product_id || !rating) return next(new AppError('Product and rating are required.', 400));
  if (rating < 1 || rating > 5) return next(new AppError('Rating must be between 1 and 5.', 400));

  // Check product exists
  const prod = await query('SELECT id FROM products WHERE id=$1 AND is_active=true', [product_id]);
  if (!prod.rows.length) return next(new AppError('Product not found.', 404));

  // Check if user purchased the product (verified review)
  let is_verified = false;
  if (order_id) {
    const orderCheck = await query(
      `SELECT id FROM orders WHERE id=$1 AND user_id=$2 AND payment_status='paid'`,
      [order_id, req.user.id]
    );
    is_verified = orderCheck.rows.length > 0;
  }

  const result = await query(`
    INSERT INTO reviews (product_id, user_id, order_id, rating, title, body, is_verified)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (product_id, user_id) DO UPDATE SET
      rating=$4, title=$5, body=$6, is_verified=$7
    RETURNING *
  `, [product_id, req.user.id, order_id || null, rating, title, body, is_verified]);

  // Update product avg rating
  await query(`
    UPDATE products SET
      avg_rating = (SELECT ROUND(AVG(rating)::numeric,2) FROM reviews WHERE product_id=$1 AND is_approved=true),
      review_count = (SELECT COUNT(*) FROM reviews WHERE product_id=$1 AND is_approved=true)
    WHERE id=$1
  `, [product_id]);

  res.status(201).json({ success: true, review: result.rows[0] });
};

exports.getProductReviews = async (req, res) => {
  const { product_id } = req.params;
  const { page = 1, limit = 10, sort = 'created_at' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = await query(
    'SELECT COUNT(*) FROM reviews WHERE product_id=$1 AND is_approved=true', [product_id]
  );

  const result = await query(`
    SELECT r.*, u.name as user_name, u.avatar as user_avatar
    FROM reviews r JOIN users u ON r.user_id=u.id
    WHERE r.product_id=$1 AND r.is_approved=true
    ORDER BY r.${sort === 'helpful' ? 'helpful' : 'created_at'} DESC
    LIMIT $2 OFFSET $3
  `, [product_id, parseInt(limit), offset]);

  res.json({
    success: true,
    total: parseInt(total.rows[0].count),
    reviews: result.rows
  });
};

exports.deleteReview = async (req, res, next) => {
  const { id } = req.params;
  const result = await query(
    'DELETE FROM reviews WHERE id=$1 AND (user_id=$2 OR $3=\'admin\') RETURNING product_id',
    [id, req.user.id, req.user.role]
  );
  if (!result.rows.length) return next(new AppError('Review not found.', 404));

  // Re-calculate avg
  await query(`
    UPDATE products SET
      avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM reviews WHERE product_id=$1 AND is_approved=true),0),
      review_count = (SELECT COUNT(*) FROM reviews WHERE product_id=$1 AND is_approved=true)
    WHERE id=$1
  `, [result.rows[0].product_id]);

  res.json({ success: true, message: 'Review deleted.' });
};

exports.markReviewHelpful = async (req, res, next) => {
  const { id } = req.params;
  const result = await query(
    'UPDATE reviews SET helpful=helpful+1 WHERE id=$1 RETURNING id, helpful', [id]
  );
  if (!result.rows.length) return next(new AppError('Review not found.', 404));
  res.json({ success: true, helpful: result.rows[0].helpful });
};

// ════════════════════════════════════════════════
// CART
// ════════════════════════════════════════════════

exports.getCart = async (req, res) => {
  const result = await query('SELECT * FROM carts WHERE user_id=$1', [req.user.id]);
  if (!result.rows.length) {
    await query('INSERT INTO carts (user_id, items) VALUES ($1,$2)', [req.user.id, JSON.stringify([])]);
    return res.json({ success: true, cart: { items: [], total: 0 } });
  }

  const items = result.rows[0].items || [];

  // Enrich cart items with current product data
  const enriched = [];
  for (const item of items) {
    const prod = await query(`
      SELECT id, name, slug, price, compare_price, images, stock, is_active
      FROM products WHERE id=$1
    `, [item.product_id]);
    if (prod.rows.length && prod.rows[0].is_active) {
      enriched.push({ ...item, product: prod.rows[0] });
    }
  }

  const total = enriched.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  res.json({ success: true, cart: { items: enriched, total } });
};

exports.addToCart = async (req, res, next) => {
  const { product_id, qty = 1, variant } = req.body;
  if (!product_id) return next(new AppError('Product ID is required.', 400));

  const prod = await query('SELECT id, stock FROM products WHERE id=$1 AND is_active=true', [product_id]);
  if (!prod.rows.length) return next(new AppError('Product not found.', 404));
  if (prod.rows[0].stock < qty) return next(new AppError('Insufficient stock.', 400));

  const cartRes = await query('SELECT * FROM carts WHERE user_id=$1', [req.user.id]);
  let items = cartRes.rows[0]?.items || [];

  const existingIdx = items.findIndex(
    i => i.product_id === product_id && JSON.stringify(i.variant) === JSON.stringify(variant || null)
  );

  if (existingIdx >= 0) {
    items[existingIdx].qty = Math.min(items[existingIdx].qty + qty, 10);
  } else {
    items.push({ product_id, qty: Math.min(qty, 10), variant: variant || null });
  }

  await query(`
    INSERT INTO carts (user_id, items, updated_at) VALUES ($1,$2,NOW())
    ON CONFLICT (user_id) DO UPDATE SET items=$2, updated_at=NOW()
  `, [req.user.id, JSON.stringify(items)]);

  res.json({ success: true, message: 'Added to cart.', item_count: items.length });
};

exports.updateCartItem = async (req, res, next) => {
  const { product_id, qty, variant } = req.body;
  if (!product_id || !qty) return next(new AppError('Product ID and quantity are required.', 400));

  const cartRes = await query('SELECT * FROM carts WHERE user_id=$1', [req.user.id]);
  let items = cartRes.rows[0]?.items || [];

  const idx = items.findIndex(
    i => i.product_id === product_id && JSON.stringify(i.variant) === JSON.stringify(variant || null)
  );

  if (idx < 0) return next(new AppError('Item not in cart.', 404));

  if (qty <= 0) {
    items.splice(idx, 1);
  } else {
    items[idx].qty = Math.min(qty, 10);
  }

  await query('UPDATE carts SET items=$1, updated_at=NOW() WHERE user_id=$2',
    [JSON.stringify(items), req.user.id]);

  res.json({ success: true, message: 'Cart updated.', item_count: items.length });
};

exports.removeFromCart = async (req, res, next) => {
  const { product_id } = req.params;
  const cartRes = await query('SELECT * FROM carts WHERE user_id=$1', [req.user.id]);
  let items = (cartRes.rows[0]?.items || []).filter(i => i.product_id !== product_id);

  await query('UPDATE carts SET items=$1, updated_at=NOW() WHERE user_id=$2',
    [JSON.stringify(items), req.user.id]);

  res.json({ success: true, message: 'Item removed from cart.', item_count: items.length });
};

exports.clearCart = async (req, res) => {
  await query('UPDATE carts SET items=$1, updated_at=NOW() WHERE user_id=$2',
    [JSON.stringify([]), req.user.id]);
  res.json({ success: true, message: 'Cart cleared.' });
};

// ════════════════════════════════════════════════
// COUPON
// ════════════════════════════════════════════════

exports.validateCoupon = async (req, res, next) => {
  const { code, cart_total } = req.body;
  if (!code) return next(new AppError('Coupon code is required.', 400));

  const result = await query(`
    SELECT * FROM coupons WHERE code=$1 AND is_active=true
      AND (valid_until IS NULL OR valid_until > NOW())
      AND (usage_limit IS NULL OR used_count < usage_limit)
  `, [code.toUpperCase()]);

  if (!result.rows.length) return next(new AppError('Invalid or expired coupon.', 400));
  const coupon = result.rows[0];

  if (cart_total && cart_total < parseFloat(coupon.min_order_amount))
    return next(new AppError(`Minimum order amount for this coupon is ₹${coupon.min_order_amount}.`, 400));

  // Check user usage
  const usageRes = await query(
    `SELECT COUNT(*) FROM orders WHERE user_id=$1 AND coupon_code=$2 AND payment_status='paid'`,
    [req.user.id, code.toUpperCase()]
  );
  if (parseInt(usageRes.rows[0].count) >= (coupon.user_limit || 1))
    return next(new AppError('You have already used this coupon.', 400));

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (cart_total * coupon.value) / 100;
    if (coupon.max_discount) discount = Math.min(discount, parseFloat(coupon.max_discount));
  } else if (coupon.type === 'fixed') {
    discount = parseFloat(coupon.value);
  }

  res.json({
    success: true,
    coupon: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      discount: Math.round(discount * 100) / 100,
      free_shipping: coupon.type === 'free_shipping'
    }
  });
};

exports.getAllCoupons = async (req, res) => {
  const result = await query('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json({ success: true, coupons: result.rows });
};

exports.createCoupon = async (req, res, next) => {
  const { code, description, type, value, min_order_amount, max_discount, usage_limit, user_limit, valid_until } = req.body;
  if (!code || !type || value === undefined)
    return next(new AppError('Code, type and value are required.', 400));

  const result = await query(`
    INSERT INTO coupons (code, description, type, value, min_order_amount, max_discount, usage_limit, user_limit, valid_until)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
  `, [code.toUpperCase(), description, type, value, min_order_amount || 0, max_discount || null, usage_limit || null, user_limit || 1, valid_until || null]);

  res.status(201).json({ success: true, coupon: result.rows[0] });
};

exports.updateCoupon = async (req, res, next) => {
  const { id } = req.params;
  const { is_active, valid_until, usage_limit } = req.body;
  const result = await query(`
    UPDATE coupons SET is_active=COALESCE($1,is_active), valid_until=COALESCE($2,valid_until), usage_limit=COALESCE($3,usage_limit)
    WHERE id=$4 RETURNING *
  `, [is_active, valid_until, usage_limit, id]);
  if (!result.rows.length) return next(new AppError('Coupon not found.', 404));
  res.json({ success: true, coupon: result.rows[0] });
};

exports.deleteCoupon = async (req, res, next) => {
  const { id } = req.params;
  const result = await query('DELETE FROM coupons WHERE id=$1 RETURNING id', [id]);
  if (!result.rows.length) return next(new AppError('Coupon not found.', 404));
  res.json({ success: true, message: 'Coupon deleted.' });
};

// ════════════════════════════════════════════════
// WISHLIST
// ════════════════════════════════════════════════

exports.getWishlist = async (req, res) => {
  const result = await query(`
    SELECT w.id, w.created_at,
      p.id as product_id, p.name, p.slug, p.price, p.compare_price,
      p.images, p.avg_rating, p.stock, p.is_new_arrival
    FROM wishlists w
    JOIN products p ON w.product_id = p.id
    WHERE w.user_id=$1 AND p.is_active=true
    ORDER BY w.created_at DESC
  `, [req.user.id]);
  res.json({ success: true, wishlist: result.rows });
};

exports.toggleWishlist = async (req, res, next) => {
  const { product_id } = req.body;
  if (!product_id) return next(new AppError('Product ID is required.', 400));

  const existing = await query(
    'SELECT id FROM wishlists WHERE user_id=$1 AND product_id=$2', [req.user.id, product_id]
  );

  if (existing.rows.length) {
    await query('DELETE FROM wishlists WHERE user_id=$1 AND product_id=$2', [req.user.id, product_id]);
    return res.json({ success: true, action: 'removed', message: 'Removed from wishlist.' });
  }

  await query('INSERT INTO wishlists (user_id, product_id) VALUES ($1,$2)', [req.user.id, product_id]);
  res.json({ success: true, action: 'added', message: 'Added to wishlist.' });
};

exports.moveWishlistToCart = async (req, res, next) => {
  const { product_id } = req.body;

  const prod = await query('SELECT id, stock FROM products WHERE id=$1 AND is_active=true', [product_id]);
  if (!prod.rows.length) return next(new AppError('Product not found.', 404));
  if (prod.rows[0].stock < 1) return next(new AppError('Product is out of stock.', 400));

  // Add to cart
  const cartRes = await query('SELECT * FROM carts WHERE user_id=$1', [req.user.id]);
  let items = cartRes.rows[0]?.items || [];
  const idx = items.findIndex(i => i.product_id === product_id);
  if (idx >= 0) items[idx].qty = Math.min(items[idx].qty + 1, 10);
  else items.push({ product_id, qty: 1, variant: null });

  await query('UPDATE carts SET items=$1, updated_at=NOW() WHERE user_id=$2',
    [JSON.stringify(items), req.user.id]);

  // Remove from wishlist
  await query('DELETE FROM wishlists WHERE user_id=$1 AND product_id=$2', [req.user.id, product_id]);

  res.json({ success: true, message: 'Moved to cart.' });
};

// ════════════════════════════════════════════════
// ADDRESSES
// ════════════════════════════════════════════════

exports.getAddresses = async (req, res) => {
  const result = await query(
    'SELECT * FROM addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at DESC',
    [req.user.id]
  );
  res.json({ success: true, addresses: result.rows });
};

exports.addAddress = async (req, res, next) => {
  const { name, phone, line1, line2, city, state, pincode, country, is_default } = req.body;
  if (!name || !phone || !line1 || !city || !state || !pincode)
    return next(new AppError('All required address fields must be provided.', 400));

  if (is_default) {
    await query('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user.id]);
  }

  // Check if it's the first address — make it default
  const count = await query('SELECT COUNT(*) FROM addresses WHERE user_id=$1', [req.user.id]);
  const makeDefault = is_default || parseInt(count.rows[0].count) === 0;

  const result = await query(`
    INSERT INTO addresses (user_id, name, phone, line1, line2, city, state, pincode, country, is_default)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
  `, [req.user.id, name, phone, line1, line2 || null, city, state, pincode, country || 'India', makeDefault]);

  res.status(201).json({ success: true, address: result.rows[0] });
};

exports.updateAddress = async (req, res, next) => {
  const { id } = req.params;
  const { name, phone, line1, line2, city, state, pincode, country, is_default } = req.body;

  const existing = await query('SELECT * FROM addresses WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (!existing.rows.length) return next(new AppError('Address not found.', 404));

  if (is_default) {
    await query('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user.id]);
  }

  const a = existing.rows[0];
  const result = await query(`
    UPDATE addresses SET
      name=$1, phone=$2, line1=$3, line2=$4,
      city=$5, state=$6, pincode=$7, country=$8, is_default=$9
    WHERE id=$10 RETURNING *
  `, [name||a.name, phone||a.phone, line1||a.line1, line2||a.line2,
      city||a.city, state||a.state, pincode||a.pincode, country||a.country,
      is_default ?? a.is_default, id]);

  res.json({ success: true, address: result.rows[0] });
};

exports.deleteAddress = async (req, res, next) => {
  const { id } = req.params;
  const result = await query(
    'DELETE FROM addresses WHERE id=$1 AND user_id=$2 RETURNING id', [id, req.user.id]
  );
  if (!result.rows.length) return next(new AppError('Address not found.', 404));
  res.json({ success: true, message: 'Address deleted.' });
};

exports.setDefaultAddress = async (req, res, next) => {
  const { id } = req.params;
  await query('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user.id]);
  const result = await query(
    'UPDATE addresses SET is_default=true WHERE id=$1 AND user_id=$2 RETURNING *', [id, req.user.id]
  );
  if (!result.rows.length) return next(new AppError('Address not found.', 404));
  res.json({ success: true, address: result.rows[0] });
};

// ════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════

exports.getNotifications = async (req, res) => {
  const result = await query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',
    [req.user.id]
  );
  const unread = result.rows.filter(n => !n.is_read).length;
  res.json({ success: true, notifications: result.rows, unread });
};

exports.markNotificationsRead = async (req, res) => {
  await query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.id]);
  res.json({ success: true, message: 'All notifications marked as read.' });
};

// ════════════════════════════════════════════════
// ADMIN — USERS
// ════════════════════════════════════════════════

exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  let idx = 1;

  if (role) { conditions.push(`role=$${idx++}`); params.push(role); }
  if (search) {
    conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const total = await query(`SELECT COUNT(*) FROM users ${where}`, params);

  const result = await query(`
    SELECT id, name, email, role, phone, is_verified, is_active, last_login, created_at,
      (SELECT COUNT(*) FROM orders WHERE user_id=users.id) as order_count
    FROM users ${where}
    ORDER BY created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `, [...params, parseInt(limit), offset]);

  res.json({
    success: true,
    total: parseInt(total.rows[0].count),
    pages: Math.ceil(parseInt(total.rows[0].count) / parseInt(limit)),
    users: result.rows
  });
};

exports.updateUserStatus = async (req, res, next) => {
  const { id } = req.params;
  const { is_active, role } = req.body;
  const result = await query(`
    UPDATE users SET
      is_active=COALESCE($1,is_active),
      role=COALESCE($2,role),
      updated_at=NOW()
    WHERE id=$3 RETURNING id, name, email, role, is_active
  `, [is_active, role, id]);
  if (!result.rows.length) return next(new AppError('User not found.', 404));
  res.json({ success: true, user: result.rows[0] });
};
