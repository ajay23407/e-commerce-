const Razorpay = require('razorpay');
const crypto   = require('crypto');
const { query, getClient } = require('../config/db');
const { AppError }         = require('../middleware/error');
const {
  sendOrderConfirmationEmail, sendOrderStatusEmail, sendShippingEmail
} = require('../utils/email');

// Lazy Razorpay init — only fails at runtime if keys missing
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    throw new AppError('Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env', 500);
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
};

const generateOrderNumber = () =>
  'LUXE' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();

// ── VALIDATE CART & COMPUTE TOTALS ─────────────────────────────
const computeOrderTotals = async (items, couponCode, userId) => {
  let subtotal = 0;
  const enrichedItems = [];

  for (const item of items) {
    const res = await query('SELECT * FROM products WHERE id=$1 AND is_active=true', [item.product_id]);
    const product = res.rows[0];
    if (!product) throw new AppError(`Product not found: ${item.product_id}`, 400);
    if (product.stock < item.qty) throw new AppError(`Insufficient stock for: ${product.name}`, 400);
    const price = parseFloat(product.price);
    subtotal += price * item.qty;
    enrichedItems.push({
      product_id: product.id, name: product.name, slug: product.slug,
      image: (product.images[0] || {}).url || null,
      price, qty: item.qty, variant: item.variant || null, sku: product.sku
    });
  }

  let couponDiscount = 0, coupon = null;
  if (couponCode) {
    const cRes = await query(`
      SELECT * FROM coupons WHERE code=$1 AND is_active=true
        AND (valid_until IS NULL OR valid_until > NOW())
        AND (usage_limit IS NULL OR used_count < usage_limit)
    `, [couponCode.toUpperCase()]);
    coupon = cRes.rows[0];
    if (!coupon) throw new AppError('Invalid or expired coupon code.', 400);
    if (subtotal < parseFloat(coupon.min_order_amount))
      throw new AppError(`Minimum order amount for this coupon is ₹${coupon.min_order_amount}.`, 400);

    const usageRes = await query(
      `SELECT COUNT(*) FROM orders WHERE user_id=$1 AND coupon_code=$2 AND payment_status='paid'`,
      [userId, couponCode.toUpperCase()]
    );
    if (parseInt(usageRes.rows[0].count) >= (coupon.user_limit || 1))
      throw new AppError('You have already used this coupon.', 400);

    if (coupon.type === 'percentage') {
      couponDiscount = (subtotal * parseFloat(coupon.value)) / 100;
      if (coupon.max_discount) couponDiscount = Math.min(couponDiscount, parseFloat(coupon.max_discount));
    } else if (coupon.type === 'fixed') {
      couponDiscount = parseFloat(coupon.value);
    }
  }

  const shippingCharge = (coupon?.type === 'free_shipping' || subtotal >= 2999) ? 0 : 99;
  const taxableAmount  = subtotal - couponDiscount;
  const tax            = Math.round(taxableAmount * 0.18 * 100) / 100;
  const total          = Math.max(0, taxableAmount + shippingCharge + tax);

  return { enrichedItems, subtotal, couponDiscount, shippingCharge, tax, total, coupon };
};

// ── CREATE RAZORPAY ORDER ───────────────────────────────────────
exports.createRazorpayOrder = async (req, res, next) => {
  const { items, coupon_code, shipping_address } = req.body;
  if (!items?.length)      return next(new AppError('Cart is empty.', 400));
  if (!shipping_address)   return next(new AppError('Shipping address is required.', 400));

  const { total, subtotal, couponDiscount, shippingCharge, tax, coupon, enrichedItems } =
    await computeOrderTotals(items, coupon_code, req.user.id);

  const amountPaise    = Math.round(total * 100);
  const razorpay       = getRazorpay();
  const razorpayOrder  = await razorpay.orders.create({
    amount: amountPaise, currency: 'INR',
    receipt: generateOrderNumber(),
    notes: { user_id: req.user.id, user_email: req.user.email }
  });

  res.json({
    success: true,
    razorpay_order_id: razorpayOrder.id,
    amount: amountPaise, currency: 'INR',
    key_id: process.env.RAZORPAY_KEY_ID,
    order_summary: {
      subtotal, coupon_discount: couponDiscount,
      shipping: shippingCharge, tax, total, items: enrichedItems,
      coupon: coupon ? { code: coupon.code, type: coupon.type } : null
    },
    prefill: { name: req.user.name, email: req.user.email, contact: req.user.phone || '' }
  });
};

// ── VERIFY & PLACE ORDER ────────────────────────────────────────
exports.verifyAndPlaceOrder = async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature,
          items, coupon_code, shipping_address, notes } = req.body;

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSig !== razorpay_signature)
    return next(new AppError('Payment verification failed. Please contact support.', 400));

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { total, subtotal, couponDiscount, shippingCharge, tax, coupon, enrichedItems } =
      await computeOrderTotals(items, coupon_code, req.user.id);
    const orderNumber = generateOrderNumber();

    const orderRes = await client.query(`
      INSERT INTO orders (order_number,user_id,status,payment_status,payment_method,
        razorpay_order_id,razorpay_payment_id,razorpay_signature,
        items,subtotal,discount,coupon_code,coupon_discount,
        shipping_charge,tax,total,shipping_address,notes)
      VALUES ($1,$2,'confirmed','paid','razorpay',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [orderNumber,req.user.id,razorpay_order_id,razorpay_payment_id,razorpay_signature,
        JSON.stringify(enrichedItems),subtotal,0,coupon_code?.toUpperCase()||null,couponDiscount,
        shippingCharge,tax,total,JSON.stringify(shipping_address),notes||null]);
    const order = orderRes.rows[0];

    for (const item of enrichedItems) {
      await client.query(
        'UPDATE products SET stock=stock-$1, sold_count=sold_count+$1 WHERE id=$2',
        [item.qty, item.product_id]
      );
    }
    if (coupon)
      await client.query('UPDATE coupons SET used_count=used_count+1 WHERE code=$1', [coupon.code]);

    await client.query(
      `INSERT INTO order_timeline (order_id,status,message,created_by) VALUES ($1,'confirmed','Order confirmed and payment received.',$2)`,
      [order.id, req.user.id]
    );
    await client.query('UPDATE carts SET items=$1, updated_at=NOW() WHERE user_id=$2',
      [JSON.stringify([]), req.user.id]);
    await client.query(
      `INSERT INTO notifications (user_id,type,title,message,link) VALUES ($1,'order','Order Confirmed!',$2,$3)`,
      [req.user.id, `Your order #${orderNumber} has been placed.`, `/orders/${order.id}`]
    );

    await client.query('COMMIT');
    sendOrderConfirmationEmail(req.user, { ...order, items: enrichedItems }).catch(console.error);
    res.status(201).json({ success: true, message: 'Order placed successfully!', order });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
};

// ── COD ORDER ───────────────────────────────────────────────────
exports.placeCODOrder = async (req, res, next) => {
  const { items, coupon_code, shipping_address, notes } = req.body;
  if (!items?.length) return next(new AppError('Cart is empty.', 400));

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { total, subtotal, couponDiscount, shippingCharge, tax, coupon, enrichedItems } =
      await computeOrderTotals(items, coupon_code, req.user.id);

    if (total > 10000) return next(new AppError('COD not available for orders above ₹10,000.', 400));
    const orderNumber = generateOrderNumber();

    const orderRes = await client.query(`
      INSERT INTO orders (order_number,user_id,status,payment_status,payment_method,
        items,subtotal,coupon_code,coupon_discount,shipping_charge,tax,total,shipping_address,notes)
      VALUES ($1,$2,'pending','pending','cod',$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [orderNumber,req.user.id,JSON.stringify(enrichedItems),subtotal,
        coupon_code?.toUpperCase()||null,couponDiscount,shippingCharge,tax,total,
        JSON.stringify(shipping_address),notes||null]);
    const order = orderRes.rows[0];

    for (const item of enrichedItems)
      await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2',[item.qty,item.product_id]);
    if (coupon)
      await client.query('UPDATE coupons SET used_count=used_count+1 WHERE code=$1',[coupon.code]);

    await client.query(
      `INSERT INTO order_timeline (order_id,status,message) VALUES ($1,'pending','COD order placed. Awaiting confirmation.')`,
      [order.id]
    );
    await client.query('UPDATE carts SET items=$1, updated_at=NOW() WHERE user_id=$2',
      [JSON.stringify([]), req.user.id]);

    await client.query('COMMIT');
    sendOrderConfirmationEmail(req.user, { ...order, items: enrichedItems }).catch(console.error);
    res.status(201).json({ success: true, message: 'COD order placed!', order });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
};

// ── MY ORDERS ───────────────────────────────────────────────────
exports.getMyOrders = async (req, res) => {
  const { page=1, limit=10, status } = req.query;
  const offset = (parseInt(page)-1) * parseInt(limit);
  const conditions = ['user_id=$1'];
  const params = [req.user.id];
  if (status) { conditions.push(`status=$2`); params.push(status); }

  const total = await query(`SELECT COUNT(*) FROM orders WHERE ${conditions.join(' AND ')}`, params);
  const result = await query(`
    SELECT * FROM orders WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}
  `, [...params, parseInt(limit), offset]);

  res.json({
    success: true,
    total: parseInt(total.rows[0].count),
    page: parseInt(page),
    pages: Math.ceil(parseInt(total.rows[0].count)/parseInt(limit)),
    orders: result.rows
  });
};

// ── SINGLE ORDER ────────────────────────────────────────────────
exports.getOrder = async (req, res, next) => {
  const { id } = req.params;
  const result = await query(
    `SELECT * FROM orders WHERE id=$1 AND (user_id=$2 OR $3='admin')`,
    [id, req.user.id, req.user.role]
  );
  if (!result.rows.length) return next(new AppError('Order not found.', 404));
  const timeline = await query(
    'SELECT * FROM order_timeline WHERE order_id=$1 ORDER BY created_at ASC', [id]
  );
  res.json({ success: true, order: { ...result.rows[0], timeline: timeline.rows } });
};

// ── CANCEL ORDER ────────────────────────────────────────────────
exports.cancelOrder = async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;
  const result = await query('SELECT * FROM orders WHERE id=$1 AND user_id=$2',[id, req.user.id]);
  if (!result.rows.length) return next(new AppError('Order not found.', 404));
  const order = result.rows[0];
  if (!['pending','confirmed'].includes(order.status))
    return next(new AppError('This order cannot be cancelled.', 400));

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE orders SET status='cancelled', cancel_reason=$1, cancelled_at=NOW(), updated_at=NOW() WHERE id=$2`,
      [reason || 'Cancelled by customer', id]
    );
    for (const item of order.items)
      await client.query('UPDATE products SET stock=stock+$1 WHERE id=$2',[item.qty, item.product_id]);
    await client.query(
      `INSERT INTO order_timeline (order_id,status,message,created_by) VALUES ($1,'cancelled',$2,$3)`,
      [id, reason || 'Cancelled by customer', req.user.id]
    );
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order cancelled successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
};

// ── ADMIN: UPDATE STATUS ────────────────────────────────────────
exports.updateOrderStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status, tracking_number, tracking_url, message } = req.body;
  const validStatuses = ['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','refunded'];
  if (!validStatuses.includes(status)) return next(new AppError('Invalid status.', 400));

  const orderRes = await query('SELECT * FROM orders WHERE id=$1', [id]);
  if (!orderRes.rows.length) return next(new AppError('Order not found.', 404));

  const shipped_at   = status === 'shipped'   ? new Date() : orderRes.rows[0].shipped_at;
  const delivered_at = status === 'delivered' ? new Date() : orderRes.rows[0].delivered_at;

  await query(`
    UPDATE orders SET status=$1, tracking_number=COALESCE($2,tracking_number),
      tracking_url=COALESCE($3,tracking_url), shipped_at=$4, delivered_at=$5, updated_at=NOW()
    WHERE id=$6
  `, [status, tracking_number||null, tracking_url||null, shipped_at||null, delivered_at||null, id]);

  await query(
    `INSERT INTO order_timeline (order_id,status,message,created_by) VALUES ($1,$2,$3,$4)`,
    [id, status, message || `Order status updated to ${status}.`, req.user.id]
  );

  const order = (await query('SELECT * FROM orders WHERE id=$1',[id])).rows[0];
  const user  = (await query('SELECT * FROM users WHERE id=$1',[order.user_id])).rows[0];
  if (user) {
    if (status === 'shipped') sendShippingEmail(user, order).catch(console.error);
    else sendOrderStatusEmail(user, order).catch(console.error);
  }
  res.json({ success: true, message: 'Order status updated.', order });
};

// ── ADMIN: ALL ORDERS ───────────────────────────────────────────
exports.getAllOrders = async (req, res) => {
  const { page=1, limit=20, status, payment_status, search } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  const conditions = [];
  const params = [];
  let idx = 1;
  if (status)         { conditions.push(`o.status=$${idx++}`);         params.push(status); }
  if (payment_status) { conditions.push(`o.payment_status=$${idx++}`); params.push(payment_status); }
  if (search) {
    conditions.push(`(o.order_number ILIKE $${idx} OR u.email ILIKE $${idx} OR u.name ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const total  = await query(`SELECT COUNT(*) FROM orders o LEFT JOIN users u ON o.user_id=u.id ${where}`, params);
  const result = await query(`
    SELECT o.*, u.name as customer_name, u.email as customer_email
    FROM orders o LEFT JOIN users u ON o.user_id=u.id
    ${where} ORDER BY o.created_at DESC LIMIT $${idx} OFFSET $${idx+1}
  `, [...params, parseInt(limit), offset]);

  res.json({
    success: true,
    total: parseInt(total.rows[0].count),
    pages: Math.ceil(parseInt(total.rows[0].count)/parseInt(limit)),
    orders: result.rows
  });
};

// ── ADMIN: DASHBOARD ────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  const [revenue, orders, users, products, recentOrders, topProducts, salesByDay] = await Promise.all([
    query(`SELECT COALESCE(SUM(total),0) as total, COALESCE(SUM(CASE WHEN DATE(created_at)=CURRENT_DATE THEN total ELSE 0 END),0) as today FROM orders WHERE payment_status='paid'`),
    query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='pending' THEN 1 END) as pending, COUNT(CASE WHEN status='delivered' THEN 1 END) as delivered, COUNT(CASE WHEN DATE(created_at)=CURRENT_DATE THEN 1 END) as today FROM orders`),
    query(`SELECT COUNT(*) as total, COUNT(CASE WHEN DATE(created_at)=CURRENT_DATE THEN 1 END) as today FROM users WHERE role='customer'`),
    query(`SELECT COUNT(*) as total, COUNT(CASE WHEN stock <= low_stock_alert THEN 1 END) as low_stock FROM products WHERE is_active=true`),
    query(`SELECT o.*, u.name as customer_name FROM orders o LEFT JOIN users u ON o.user_id=u.id ORDER BY o.created_at DESC LIMIT 5`),
    query(`SELECT p.name, p.slug, p.sold_count, p.avg_rating, p.price FROM products p WHERE p.is_active=true ORDER BY p.sold_count DESC LIMIT 5`),
    query(`SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue FROM orders WHERE payment_status='paid' AND created_at > NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date`)
  ]);

  res.json({
    success: true,
    stats: {
      revenue: revenue.rows[0],
      orders:  orders.rows[0],
      users:   users.rows[0],
      products: products.rows[0],
    },
    recent_orders: recentOrders.rows,
    top_products:  topProducts.rows,
    sales_by_day:  salesByDay.rows
  });
};
