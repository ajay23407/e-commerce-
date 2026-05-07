import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

const STATUS_STYLES = {
  pending:          'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:        'bg-blue-50 text-blue-700 border-blue-200',
  processing:       'bg-purple-50 text-purple-700 border-purple-200',
  shipped:          'bg-indigo-50 text-indigo-700 border-indigo-200',
  out_for_delivery: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  delivered:        'bg-green-50 text-green-700 border-green-200',
  cancelled:        'bg-red-50 text-red-600 border-red-200',
  refunded:         'bg-gray-50 text-gray-600 border-gray-200',
};

const STATUS_ICONS = {
  pending:'🕐', confirmed:'✅', processing:'⚙️', shipped:'🚚',
  out_for_delivery:'🏃', delivered:'🎉', cancelled:'❌', refunded:'↩️',
};

export default function OrdersPage() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selOrder, setSelOrder] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [searchParams] = useSearchParams();
  const successOrder = searchParams.get('success');

  useEffect(() => {
    document.title = 'My Orders — LUXE';
    fetchOrders();
    if (successOrder) toast.success(`Order #${successOrder} placed successfully! 🎉`);
  }, [successOrder]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders?limit=20');
      setOrders(res.data.orders);
    } catch { toast.error('Failed to load orders.'); }
    finally { setLoading(false); }
  };

  const loadOrder = async (id) => {
    try {
      const res = await api.get(`/orders/${id}`);
      setSelOrder(res.data.order);
    } catch { toast.error('Failed to load order details.'); }
  };

  const handleCancel = async () => {
    if (!selOrder) return;
    setCancelling(true);
    try {
      await api.post(`/orders/${selOrder.id}/cancel`, { reason: cancelReason });
      toast.success('Order cancelled successfully.');
      setShowCancel(false);
      setCancelReason('');
      await loadOrder(selOrder.id);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel order.');
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="spinner spinner-lg spinner-gold" />
    </div>
  );

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-12">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <Link to="/" className="hover:text-luxury-black">Home</Link>
          <span>/</span>
          <span className="text-luxury-black">My Orders</span>
        </nav>
        <h1 className="font-serif text-4xl">My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-5">📦</div>
          <h2 className="font-serif text-2xl mb-2">No orders yet</h2>
          <p className="text-gray-400 text-sm mb-8">Start shopping to see your orders here.</p>
          <Link to="/shop" className="btn btn-primary btn-lg">Browse Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 items-start">
          {/* Orders list */}
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id}
                onClick={() => loadOrder(order.id)}
                className={`border-2 p-5 cursor-pointer transition-all hover:shadow-md ${selOrder?.id === order.id ? 'border-luxury-black' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-sm">#{order.order_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 border text-xs font-medium rounded-full ${STATUS_STYLES[order.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {STATUS_ICONS[order.status]} {order.status.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    <span className={`px-3 py-1 border text-xs font-medium rounded-full ${order.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {order.payment_status === 'paid' ? '💰 Paid' : '⏳ ' + order.payment_status}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                  {(order.items || []).slice(0, 4).map((item, i) => (
                    <div key={i} className="w-12 h-14 bg-gray-100 flex-shrink-0 overflow-hidden">
                      {item.image
                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-lg opacity-20">🛍️</div>
                      }
                    </div>
                  ))}
                  {(order.items?.length || 0) > 4 && (
                    <div className="w-12 h-14 bg-gray-100 flex-shrink-0 flex items-center justify-center text-xs text-gray-400 font-medium">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''} · {order.payment_method?.toUpperCase()}</p>
                  <p className="font-semibold text-base">{fmt(order.total)}</p>
                </div>

                {order.tracking_number && (
                  <p className="text-xs text-blue-600 mt-2">Tracking: {order.tracking_number}</p>
                )}
              </div>
            ))}
          </div>

          {/* Order detail panel */}
          {selOrder ? (
            <div className="border border-gray-200 p-6 lg:sticky lg:top-24 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl">#{selOrder.order_number}</h2>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 border text-xs font-medium rounded-full ${STATUS_STYLES[selOrder.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {STATUS_ICONS[selOrder.status]} {selOrder.status.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              </div>

              {/* Order Timeline */}
              {selOrder.timeline?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold tracking-[2px] uppercase text-gray-400 mb-3">Order Timeline</p>
                  <div className="relative pl-4">
                    {selOrder.timeline.map((t, i) => (
                      <div key={t.id} className="relative pb-4 last:pb-0">
                        <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-gold -translate-x-1/2" />
                        {i < selOrder.timeline.length - 1 && <div className="absolute left-0 top-3 bottom-0 w-px bg-gray-200" />}
                        <div className="pl-4">
                          <p className="text-xs font-medium capitalize">{t.status.replace(/_/g,' ')}</p>
                          <p className="text-xs text-gray-400">{t.message}</p>
                          <p className="text-[10px] text-gray-300 mt-0.5">{new Date(t.created_at).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-[10px] font-semibold tracking-[2px] uppercase text-gray-400 mb-3">Items</p>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {(selOrder.items || []).map((item, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="w-12 h-14 bg-gray-100 flex-shrink-0 overflow-hidden">
                        {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-20">🛍️</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">Qty {item.qty} × {fmt(item.price)}</p>
                      </div>
                      <p className="text-sm font-medium">{fmt(item.qty * item.price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price breakdown */}
              <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(selOrder.subtotal)}</span></div>
                {selOrder.coupon_discount > 0 && <div className="flex justify-between text-green-600"><span>Coupon ({selOrder.coupon_code})</span><span>−{fmt(selOrder.coupon_discount)}</span></div>}
                <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{selOrder.shipping_charge > 0 ? fmt(selOrder.shipping_charge) : 'FREE'}</span></div>
                <div className="flex justify-between text-gray-500"><span>Tax</span><span>{fmt(selOrder.tax)}</span></div>
                <div className="flex justify-between font-semibold text-base pt-1 border-t border-gray-200 mt-1"><span>Total</span><span>{fmt(selOrder.total)}</span></div>
              </div>

              {/* Shipping address */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-semibold tracking-[2px] uppercase text-gray-400 mb-2">Shipping Address</p>
                {selOrder.shipping_address && (
                  <div className="text-sm text-gray-600 leading-relaxed">
                    <p className="font-medium text-luxury-black">{selOrder.shipping_address.name}</p>
                    <p>{selOrder.shipping_address.line1}{selOrder.shipping_address.line2 ? ', ' + selOrder.shipping_address.line2 : ''}</p>
                    <p>{selOrder.shipping_address.city}, {selOrder.shipping_address.state} — {selOrder.shipping_address.pincode}</p>
                    <p>{selOrder.shipping_address.phone}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {['pending','confirmed'].includes(selOrder.status) && (
                <div>
                  {showCancel ? (
                    <div className="space-y-3 border-t border-gray-100 pt-4">
                      <p className="text-sm font-medium text-red-600">Cancel Order?</p>
                      <textarea rows={2} className="form-input resize-none text-sm" placeholder="Reason for cancellation (optional)"
                        value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={handleCancel} disabled={cancelling} className="btn btn-danger btn-sm flex-1 justify-center">
                          {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                        </button>
                        <button onClick={() => setShowCancel(false)} className="btn btn-ghost btn-sm flex-1">Back</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowCancel(true)} className="btn btn-ghost btn-sm w-full border-red-200 text-red-500 hover:bg-red-50 mt-4">
                      Cancel Order
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="border border-dashed border-gray-200 p-12 text-center lg:sticky lg:top-24">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-sm text-gray-400">Select an order to view details</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
