import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

const STEPS = ['Address', 'Review & Pay'];

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]           = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [selAddr, setSelAddr]     = useState(null);
  const [newAddr, setNewAddr]     = useState(false);
  const [addrForm, setAddrForm]   = useState({ name: user?.name || '', phone: user?.phone || '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' });
  const [coupon, setCoupon]       = useState('');
  const [couponData, setCouponData] = useState(null);
  const [validating, setValidating] = useState(false);
  const [payMethod, setPayMethod] = useState('razorpay');
  const [placing, setPlacing]     = useState(false);
  const [notes, setNotes]         = useState('');

  useEffect(() => {
  document.title = 'Checkout — LUXE';

  if (!cart.items?.length) {
    navigate('/shop');
    return;
  }

  api.get('/addresses')
    .then((r) => {
      setAddresses(r.data.addresses);

      const def =
        r.data.addresses.find((a) => a.is_default) ||
        r.data.addresses[0];

      if (def) setSelAddr(def);
      else setNewAddr(true);
    })
    .catch(() => setNewAddr(true));

}, [cart.items?.length, navigate]);

  const subtotal = cart.items?.reduce((s, i) => s + (i.product?.price || 0) * i.qty, 0) || 0;
  const couponDiscount = couponData?.discount || 0;
  const shipping = (couponData?.free_shipping || subtotal >= 2999) ? 0 : (subtotal > 0 ? 99 : 0);
  const taxable  = Math.max(0, subtotal - couponDiscount);
  const tax      = Math.round(taxable * 0.18 * 100) / 100;
  const total    = taxable + shipping + tax;

  const validateCoupon = async () => {
    if (!coupon.trim()) return;
    setValidating(true);
    try {
      const res = await api.post('/coupons/validate', { code: coupon, cart_total: subtotal });
      setCouponData(res.data.coupon);
      toast.success(`Coupon applied! You save ${fmt(res.data.coupon.discount)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon.');
      setCouponData(null);
    } finally { setValidating(false); }
  };

  const getShippingAddress = () => {
    if (!newAddr && selAddr) return selAddr;
    return addrForm;
  };

  const validateAddress = () => {
    const a = getShippingAddress();
    return a.name && a.phone && a.line1 && a.city && a.state && a.pincode;
  };

  const loadRazorpay = () => new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handlePlaceOrder = async () => {
    if (!validateAddress()) { toast.error('Please fill in all address fields.'); return; }
    setPlacing(true);
    try {
      const items = cart.items.map(i => ({ product_id: i.product_id, qty: i.qty, variant: i.variant }));
      const shipping_address = getShippingAddress();

      if (payMethod === 'cod') {
        const res = await api.post('/orders/cod', { items, coupon_code: couponData?.code, shipping_address, notes });
        toast.success('Order placed successfully!');
        await clearCart();
        navigate(`/orders?success=${res.data.order.order_number}`);
        return;
      }

      // Razorpay
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error('Payment gateway failed to load. Please try again.'); return; }

      const orderRes = await api.post('/orders/razorpay', { items, coupon_code: couponData?.code, shipping_address });
      const { razorpay_order_id, amount, key_id, prefill } = orderRes.data;

      const rzp = new window.Razorpay({
        key: key_id,
        amount, currency: 'INR',
        order_id: razorpay_order_id,
        name: 'LUXE',
        description: 'Premium Fashion Purchase',
        prefill,
        theme: { color: '#C9A84C' },
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/orders/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              items, coupon_code: couponData?.code, shipping_address, notes
            });
            toast.success('Payment successful! Order placed 🎉');
            await clearCart();
            navigate(`/orders?success=${verifyRes.data.order.order_number}`);
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed.');
          }
        },
        modal: { ondismiss: () => { setPlacing(false); toast.error('Payment cancelled.'); } }
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order.');
      setPlacing(false);
    }
  };

  const indiaStates = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh','Andaman & Nicobar','Lakshadweep','Dadra & Nagar Haveli'];

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-12">
      <div className="mb-10">
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6">
          <Link to="/" className="hover:text-luxury-black">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-luxury-black">Shop</Link>
          <span>/</span>
          <span className="text-luxury-black">Checkout</span>
        </nav>
        <h1 className="font-serif text-4xl">Checkout</h1>
        {/* Step indicator */}
        <div className="flex items-center gap-0 mt-6">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${i <= step ? 'text-luxury-black' : 'text-gray-300'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-luxury-black text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="text-sm font-medium">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 mx-4 transition-colors ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
        {/* Left */}
        <div>
          {/* STEP 0 — ADDRESS */}
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="font-serif text-2xl">Shipping Address</h2>

              {/* Saved addresses */}
              {addresses.length > 0 && !newAddr && (
                <div className="space-y-3">
                  {addresses.map(a => (
                    <div key={a.id} onClick={() => setSelAddr(a)}
                      className={`p-4 border-2 cursor-pointer transition-all ${selAddr?.id === a.id ? 'border-luxury-black' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{a.name} · <span className="text-gray-400">{a.phone}</span></p>
                          <p className="text-sm text-gray-500 mt-0.5">{a.line1}{a.line2 ? ', ' + a.line2 : ''}, {a.city}, {a.state} — {a.pincode}</p>
                          {a.is_default && <span className="badge badge-info mt-1">Default</span>}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${selAddr?.id === a.id ? 'border-luxury-black' : 'border-gray-300'}`}>
                          {selAddr?.id === a.id && <div className="w-2.5 h-2.5 rounded-full bg-luxury-black" />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setNewAddr(true)} className="btn btn-ghost btn-sm">+ Add New Address</button>
                </div>
              )}

              {/* New address form */}
              {(newAddr || addresses.length === 0) && (
                <div>
                  {addresses.length > 0 && (
                    <button onClick={() => setNewAddr(false)} className="btn btn-ghost btn-sm mb-4">← Use Saved Address</button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[['Full Name *','name','text'],['Phone *','phone','tel']].map(([l,k,t]) => (
                      <div key={k}>
                        <label className="form-label">{l}</label>
                        <input type={t} className="form-input" value={addrForm[k]} onChange={e => setAddrForm({...addrForm, [k]: e.target.value})} />
                      </div>
                    ))}
                    <div className="md:col-span-2">
                      <label className="form-label">Address Line 1 *</label>
                      <input type="text" className="form-input" placeholder="Building, street, area" value={addrForm.line1} onChange={e => setAddrForm({...addrForm, line1: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label">Address Line 2</label>
                      <input type="text" className="form-input" placeholder="Landmark (optional)" value={addrForm.line2} onChange={e => setAddrForm({...addrForm, line2: e.target.value})} />
                    </div>
                    {[['City *','city'],['Pincode *','pincode']].map(([l,k]) => (
                      <div key={k}>
                        <label className="form-label">{l}</label>
                        <input type="text" className="form-input" value={addrForm[k]} onChange={e => setAddrForm({...addrForm, [k]: e.target.value})} />
                      </div>
                    ))}
                    <div>
                      <label className="form-label">State *</label>
                      <select className="form-select" value={addrForm.state} onChange={e => setAddrForm({...addrForm, state: e.target.value})}>
                        <option value="">Select state</option>
                        {indiaStates.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => { if (!validateAddress()) { toast.error('Please fill all required fields.'); return; } setStep(1); }} className="btn btn-primary btn-lg">
                Continue to Payment →
              </button>
            </div>
          )}

          {/* STEP 1 — REVIEW & PAY */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">Review & Pay</h2>
                <button onClick={() => setStep(0)} className="text-sm text-gray-400 underline hover:text-luxury-black">Edit Address</button>
              </div>

              {/* Shipping address summary */}
              <div className="p-4 bg-gray-50 border border-gray-100">
                <p className="text-[10px] font-semibold tracking-[2px] uppercase text-gray-400 mb-2">Shipping To</p>
                <p className="text-sm font-medium">{getShippingAddress().name}</p>
                <p className="text-sm text-gray-500">{getShippingAddress().line1}, {getShippingAddress().city}, {getShippingAddress().state} — {getShippingAddress().pincode}</p>
                <p className="text-sm text-gray-500">{getShippingAddress().phone}</p>
              </div>

              {/* Payment method */}
              <div>
                <h3 className="font-medium text-sm tracking-wide mb-3">Payment Method</h3>
                <div className="space-y-2">
                  {[
                    { id: 'razorpay', label: 'Pay Online', sub: 'UPI, Cards, Net Banking, Wallets', icon: '💳' },
                    { id: 'cod',      label: 'Cash on Delivery', sub: 'Pay when your order arrives (available for orders ≤ ₹10,000)', icon: '💵' },
                  ].map(m => (
                    <div key={m.id} onClick={() => setPayMethod(m.id)}
                      className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-all ${payMethod === m.id ? 'border-luxury-black' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${payMethod === m.id ? 'border-luxury-black' : 'border-gray-300'}`}>
                        {payMethod === m.id && <div className="w-2.5 h-2.5 rounded-full bg-luxury-black" />}
                      </div>
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{m.label}</p>
                        <p className="text-xs text-gray-400">{m.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order notes */}
              <div>
                <label className="form-label">Order Notes (optional)</label>
                <textarea rows={2} className="form-input resize-none text-sm" placeholder="Any special instructions for delivery..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <button onClick={handlePlaceOrder} disabled={placing} className="btn btn-primary btn-lg btn-full justify-center">
                {placing
                  ? <><div className="spinner spinner-sm spinner-white" /> Processing...</>
                  : payMethod === 'cod' ? `Place Order — ${fmt(total)}` : `Pay ${fmt(total)} →`
                }
              </button>
              <p className="text-center text-xs text-gray-400">🔒 Your payment is secured with 256-bit SSL encryption</p>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:sticky lg:top-24 space-y-4">
          <div className="border border-gray-200 p-6">
            <h3 className="font-serif text-xl mb-5">Order Summary</h3>

            {/* Items */}
            <div className="space-y-4 mb-5 max-h-72 overflow-y-auto pr-1">
              {cart.items?.map(item => {
                const img = item.product?.images?.[0]?.url;
                return (
                  <div key={item.product_id} className="flex gap-3">
                    <div className="w-14 h-16 bg-gray-100 flex-shrink-0 overflow-hidden">
                      {img ? <img src={img} alt={item.product?.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl opacity-20">🛍️</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug truncate">{item.product?.name}</p>
                      {item.variant && <p className="text-xs text-gray-400">{[item.variant.size, item.variant.color].filter(Boolean).join(' · ')}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">Qty: {item.qty}</p>
                    </div>
                    <span className="text-sm font-medium flex-shrink-0">{fmt((item.product?.price || 0) * item.qty)}</span>
                  </div>
                );
              })}
            </div>

            {/* Coupon */}
            <div className="border-t border-gray-100 pt-4 mb-4">
              <div className="flex gap-2">
                <input type="text" className="form-input flex-1 py-2 text-sm uppercase" placeholder="COUPON CODE"
                  value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())}
                  disabled={!!couponData} />
                {couponData
                  ? <button onClick={() => { setCouponData(null); setCoupon(''); }} className="btn btn-danger btn-sm px-3">✕</button>
                  : <button onClick={validateCoupon} disabled={validating || !coupon} className="btn btn-outline btn-sm px-4">
                      {validating ? '...' : 'Apply'}
                    </button>
                }
              </div>
              {couponData && (
                <p className="text-xs text-green-600 mt-2">✓ {couponData.description} — Saving {fmt(couponData.discount)}</p>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              {couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({couponData?.code})</span><span>−{fmt(couponDiscount)}</span></div>}
              <div className="flex justify-between text-gray-500"><span>Shipping</span><span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>{shipping === 0 ? 'FREE' : fmt(shipping)}</span></div>
              <div className="flex justify-between text-gray-500"><span>GST (18%)</span><span>{fmt(tax)}</span></div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-200 mt-2">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-2">
            {[['🔒','Secure Payment'],['↩️','Free Returns'],['🚚','Fast Delivery'],['💎','Authentic Brands']].map(([i,l]) => (
              <div key={l} className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-100">
                <span className="text-base">{i}</span>
                <span className="text-xs text-gray-600">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
