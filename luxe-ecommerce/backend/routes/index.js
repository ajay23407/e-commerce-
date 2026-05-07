const express = require('express');
const router = express.Router();
const { protect, restrictTo, optionalAuth } = require('../middleware/auth');

const auth   = require('../controllers/authController');
const prod   = require('../controllers/productController');
const order  = require('../controllers/orderController');
const misc   = require('../controllers/miscController');

// ── AUTH ──────────────────────────────────────────────────────
router.post('/auth/register',          auth.register);
router.post('/auth/login',             auth.login);
router.post('/auth/logout',            auth.logout);
router.get ('/auth/me',                protect, auth.getMe);
router.put ('/auth/profile',           protect, auth.updateProfile);
router.put ('/auth/change-password',   protect, auth.changePassword);
router.post('/auth/forgot-password',   auth.forgotPassword);
router.post('/auth/reset-password/:token', auth.resetPassword);
router.get ('/auth/verify-email/:token',   auth.verifyEmail);

// ── PRODUCTS ──────────────────────────────────────────────────
router.get ('/products',              optionalAuth, prod.getProducts);
router.get ('/products/search',       prod.searchSuggestions);
router.get ('/products/:slug',        optionalAuth, prod.getProduct);
router.post('/products',              protect, restrictTo('admin','superadmin'), prod.createProduct);
router.put ('/products/:id',          protect, restrictTo('admin','superadmin'), prod.updateProduct);
router.delete('/products/:id',        protect, restrictTo('admin','superadmin'), prod.deleteProduct);

// ── CATEGORIES & BRANDS ───────────────────────────────────────
router.get('/categories', prod.getCategories);
router.get('/brands',     prod.getBrands);

// ── CART ──────────────────────────────────────────────────────
router.get   ('/cart',             protect, misc.getCart);
router.post  ('/cart',             protect, misc.addToCart);
router.put   ('/cart',             protect, misc.updateCartItem);
router.delete('/cart/:product_id', protect, misc.removeFromCart);
router.delete('/cart',             protect, misc.clearCart);

// ── WISHLIST ──────────────────────────────────────────────────
router.get ('/wishlist',               protect, misc.getWishlist);
router.post('/wishlist',               protect, misc.toggleWishlist);
router.post('/wishlist/move-to-cart',  protect, misc.moveWishlistToCart);

// ── ADDRESSES ─────────────────────────────────────────────────
router.get   ('/addresses',              protect, misc.getAddresses);
router.post  ('/addresses',              protect, misc.addAddress);
router.put   ('/addresses/:id',          protect, misc.updateAddress);
router.delete('/addresses/:id',          protect, misc.deleteAddress);
router.patch ('/addresses/:id/default',  protect, misc.setDefaultAddress);

// ── COUPONS ───────────────────────────────────────────────────
router.post('/coupons/validate',  protect, misc.validateCoupon);
router.get ('/coupons',           protect, restrictTo('admin','superadmin'), misc.getAllCoupons);
router.post('/coupons',           protect, restrictTo('admin','superadmin'), misc.createCoupon);
router.put ('/coupons/:id',       protect, restrictTo('admin','superadmin'), misc.updateCoupon);
router.delete('/coupons/:id',     protect, restrictTo('admin','superadmin'), misc.deleteCoupon);

// ── REVIEWS ───────────────────────────────────────────────────
router.post  ('/reviews',              protect, misc.createReview);
router.get   ('/reviews/:product_id',  misc.getProductReviews);
router.delete('/reviews/:id',          protect, misc.deleteReview);
router.patch ('/reviews/:id/helpful',  misc.markReviewHelpful);

// ── ORDERS ────────────────────────────────────────────────────
router.post('/orders/razorpay',         protect, order.createRazorpayOrder);
router.post('/orders/verify-payment',   protect, order.verifyAndPlaceOrder);
router.post('/orders/cod',              protect, order.placeCODOrder);
router.get ('/orders',                  protect, order.getMyOrders);
router.get ('/orders/:id',              protect, order.getOrder);
router.post('/orders/:id/cancel',       protect, order.cancelOrder);

// ── ADMIN ─────────────────────────────────────────────────────
const admin = restrictTo('admin','superadmin');
router.get('/admin/dashboard',          protect, admin, order.getDashboardStats);
router.get('/admin/orders',             protect, admin, order.getAllOrders);
router.put('/admin/orders/:id/status',  protect, admin, order.updateOrderStatus);
router.get('/admin/users',              protect, admin, misc.getAllUsers);
router.put('/admin/users/:id',          protect, admin, misc.updateUserStatus);

// ── NOTIFICATIONS ─────────────────────────────────────────────
router.get  ('/notifications',       protect, misc.getNotifications);
router.patch('/notifications/read',  protect, misc.markNotificationsRead);

module.exports = router;
