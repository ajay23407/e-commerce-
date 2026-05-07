const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:0; font-family: 'Helvetica Neue', Arial, sans-serif; background:#f5f4f1; color:#0a0a0a; }
    .wrapper { max-width:600px; margin:0 auto; background:#fff; }
    .header { background:#0a0a0a; padding:32px 40px; text-align:center; }
    .logo { color:#C9A84C; font-size:28px; letter-spacing:6px; font-weight:300; }
    .logo span { color:#fff; }
    .body { padding:40px; }
    .footer { background:#f5f4f1; padding:24px 40px; text-align:center; font-size:12px; color:#9a9890; }
    .btn { display:inline-block; background:#0a0a0a; color:#fff; padding:14px 32px; text-decoration:none; font-size:13px; letter-spacing:2px; text-transform:uppercase; margin:24px 0; }
    .divider { border:none; border-top:1px solid #e8e7e3; margin:24px 0; }
    h2 { font-size:24px; font-weight:400; margin-bottom:16px; }
    p { font-size:15px; line-height:1.7; color:#4a4844; margin:0 0 16px; }
    .highlight { background:#f5f4f1; padding:20px 24px; border-left:3px solid #C9A84C; margin:20px 0; }
    .order-table { width:100%; border-collapse:collapse; }
    .order-table th { text-align:left; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#9a9890; padding:8px 0; border-bottom:1px solid #e8e7e3; }
    .order-table td { padding:12px 0; border-bottom:1px solid #f5f4f1; font-size:14px; }
    .status-badge { display:inline-block; padding:6px 14px; border-radius:20px; font-size:12px; font-weight:500; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">LUX<span>E</span></div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© 2025 LUXE. All rights reserved.</p>
      <p>LUXE Fashion, Mumbai, Maharashtra, India</p>
      <p><a href="#" style="color:#C9A84C;">Unsubscribe</a> · <a href="#" style="color:#C9A84C;">Privacy Policy</a></p>
    </div>
  </div>
</body>
</html>`;

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'LUXE <noreply@luxe.com>',
      to, subject, html,
    });
    console.log('✉️ Email sent:', info.messageId);
    return true;
  } catch (err) {
    console.error('❌ Email error:', err.message);
    return false;
  }
};

// ── TEMPLATES ──────────────────────────────────────────────────
const sendWelcomeEmail = (user) => sendEmail({
  to: user.email,
  subject: 'Welcome to LUXE — Your journey begins.',
  html: baseTemplate(`
    <h2>Welcome, ${user.name}! ✨</h2>
    <p>Thank you for joining LUXE. You now have access to our curated collection of premium fashion, exclusive deals, and member-only sales.</p>
    <div class="highlight">
      <strong>Your welcome gift:</strong><br>
      Use code <strong>WELCOME10</strong> for 10% off your first order.
    </div>
    <a href="${process.env.CLIENT_URL}/shop" class="btn">Start Shopping</a>
    <p style="font-size:13px;color:#9a9890;">If you did not create an account, please ignore this email.</p>
  `)
});

const sendVerifyEmail = (user, token) => sendEmail({
  to: user.email,
  subject: 'LUXE — Verify your email address',
  html: baseTemplate(`
    <h2>Verify your email</h2>
    <p>Hi ${user.name}, please verify your email address by clicking the button below. This link expires in 24 hours.</p>
    <a href="${process.env.CLIENT_URL}/verify-email/${token}" class="btn">Verify Email →</a>
    <p style="font-size:13px;color:#9a9890;">If you did not sign up for LUXE, ignore this email.</p>
  `)
});

const sendPasswordResetEmail = (user, token) => sendEmail({
  to: user.email,
  subject: 'LUXE — Password Reset Request',
  html: baseTemplate(`
    <h2>Reset your password</h2>
    <p>Hi ${user.name}, we received a request to reset your password. Click below to set a new password. This link expires in 1 hour.</p>
    <a href="${process.env.CLIENT_URL}/reset-password/${token}" class="btn">Reset Password →</a>
    <p style="font-size:13px;color:#9a9890;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
  `)
});

const sendOrderConfirmationEmail = (user, order) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.qty} × ₹${item.price.toLocaleString('en-IN')}</td>
      <td style="text-align:right">₹${(item.qty * item.price).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  return sendEmail({
    to: user.email,
    subject: `LUXE — Order Confirmed #${order.order_number}`,
    html: baseTemplate(`
      <h2>Order Confirmed! 🎉</h2>
      <p>Hi ${user.name}, thank you for your order. We'll notify you once it ships.</p>
      <div class="highlight">
        <strong>Order #${order.order_number}</strong><br>
        <span style="color:#9a9890;font-size:13px;">Placed on ${new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
      </div>
      <table class="order-table">
        <thead><tr><th>Product</th><th>Qty × Price</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="text-align:right;margin-top:16px;">
        ${order.discount > 0 ? `<p style="margin:4px 0;color:#9a9890;">Discount: −₹${order.discount.toLocaleString('en-IN')}</p>` : ''}
        ${order.coupon_discount > 0 ? `<p style="margin:4px 0;color:#9a9890;">Coupon: −₹${order.coupon_discount.toLocaleString('en-IN')}</p>` : ''}
        <p style="font-size:18px;font-weight:500;margin:8px 0;">Total: ₹${order.total.toLocaleString('en-IN')}</p>
      </div>
      <hr class="divider">
      <p><strong>Shipping to:</strong><br>${order.shipping_address.name}, ${order.shipping_address.line1}, ${order.shipping_address.city}, ${order.shipping_address.state} — ${order.shipping_address.pincode}</p>
      <a href="${process.env.CLIENT_URL}/orders/${order.id}" class="btn">Track Your Order →</a>
    `)
  });
};

const sendShippingEmail = (user, order) => sendEmail({
  to: user.email,
  subject: `LUXE — Your Order #${order.order_number} is on its way!`,
  html: baseTemplate(`
    <h2>Your order has shipped! 🚚</h2>
    <p>Hi ${user.name}, great news! Your order <strong>#${order.order_number}</strong> has been dispatched and is on its way to you.</p>
    ${order.tracking_number ? `
      <div class="highlight">
        <strong>Tracking Number:</strong> ${order.tracking_number}<br>
        ${order.tracking_url ? `<a href="${order.tracking_url}" style="color:#C9A84C;">Track your package →</a>` : ''}
      </div>
    ` : ''}
    <a href="${process.env.CLIENT_URL}/orders/${order.id}" class="btn">View Order Details →</a>
  `)
});

const sendOrderStatusEmail = (user, order) => sendEmail({
  to: user.email,
  subject: `LUXE — Order #${order.order_number} Update`,
  html: baseTemplate(`
    <h2>Order Status Updated</h2>
    <p>Hi ${user.name}, your order <strong>#${order.order_number}</strong> status has been updated.</p>
    <div class="highlight">
      New Status: <strong style="text-transform:capitalize">${order.status.replace('_', ' ')}</strong>
    </div>
    <a href="${process.env.CLIENT_URL}/orders/${order.id}" class="btn">View Order →</a>
  `)
});

module.exports = {
  sendEmail, sendWelcomeEmail, sendVerifyEmail,
  sendPasswordResetEmail, sendOrderConfirmationEmail,
  sendShippingEmail, sendOrderStatusEmail
};
