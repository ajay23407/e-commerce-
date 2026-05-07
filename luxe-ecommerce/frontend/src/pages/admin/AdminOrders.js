import React, { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${parseFloat(n||0).toLocaleString('en-IN')}`;

const STATUSES = ['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','refunded'];
const STATUS_COLORS = {
  pending:'bg-amber-50 text-amber-700 border-amber-200', confirmed:'bg-blue-50 text-blue-700 border-blue-200',
  processing:'bg-purple-50 text-purple-700 border-purple-200', shipped:'bg-indigo-50 text-indigo-700 border-indigo-200',
  out_for_delivery:'bg-cyan-50 text-cyan-700 border-cyan-200', delivered:'bg-green-50 text-green-700 border-green-200',
  cancelled:'bg-red-50 text-red-600 border-red-200', refunded:'bg-gray-50 text-gray-600 border-gray-200',
};

export default function AdminOrders() {
  const [orders, setOrders]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selOrder, setSelOrder]         = useState(null);
  const [updatingStatus, setUpdating]   = useState(false);
  const [statusForm, setStatusForm]     = useState({ status:'', tracking_number:'', tracking_url:'', message:'' });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, limit:15 });
      if (search) q.set('search', search);
      if (statusFilter) q.set('status', statusFilter);
      const r = await api.get(`/admin/orders?${q}`);
      setOrders(r.data.orders);
      setTotal(r.data.total);
    } catch {} finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const loadOrder = async (id) => {
    const r = await api.get(`/orders/${id}`);
    setSelOrder(r.data.order);
    setStatusForm({ status: r.data.order.status, tracking_number: r.data.order.tracking_number || '', tracking_url: r.data.order.tracking_url || '', message:'' });
  };

  const handleUpdateStatus = async () => {
    if (!selOrder || !statusForm.status) return;
    setUpdating(true);
    try {
      await api.put(`/admin/orders/${selOrder.id}/status`, statusForm);
      toast.success('Order status updated!');
      loadOrder(selOrder.id);
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update.'); }
    finally { setUpdating(false); }
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Orders Table */}
      <div className="flex-1 min-w-0">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="form-input pl-9 py-2 text-sm" placeholder="Search order #, email, name..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-select py-2 text-sm w-auto" value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
          </select>
        </div>

        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><div className="spinner spinner-gold mx-auto" /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No orders found</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} onClick={() => loadOrder(o.id)} className={`cursor-pointer ${selOrder?.id === o.id ? 'bg-amber-50' : ''}`}>
                  <td><span className="font-mono text-xs font-semibold">#{o.order_number}</span></td>
                  <td>
                    <p className="text-sm font-medium">{o.customer_name || '—'}</p>
                    <p className="text-xs text-gray-400">{o.customer_email || '—'}</p>
                  </td>
                  <td className="text-xs text-gray-500 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="text-sm">{o.items?.length || 0}</td>
                  <td className="font-medium text-sm">{fmt(o.total)}</td>
                  <td>
                    <span className={`text-[10px] px-2 py-1 border rounded-full font-medium ${STATUS_COLORS[o.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {o.status.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                    </span>
                  </td>
                  <td>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${o.payment_status==='paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {o.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">{total} total orders</p>
            <div className="flex gap-1">
              <button disabled={page<=1} onClick={() => setPage(p=>p-1)} className="w-8 h-8 border border-gray-200 text-sm flex items-center justify-center hover:border-luxury-black disabled:opacity-30">←</button>
              <span className="w-8 h-8 flex items-center justify-center text-xs">{page}</span>
              <button disabled={orders.length < 15} onClick={() => setPage(p=>p+1)} className="w-8 h-8 border border-gray-200 text-sm flex items-center justify-center hover:border-luxury-black disabled:opacity-30">→</button>
            </div>
          </div>
        </div>
      </div>

      {/* Order detail panel */}
      {selOrder && (
        <div className="w-80 flex-shrink-0 bg-white border border-gray-200 p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-100px)] sticky top-0">
          <div>
            <h3 className="font-serif text-lg mb-0.5">#{selOrder.order_number}</h3>
            <p className="text-xs text-gray-400">{new Date(selOrder.created_at).toLocaleString('en-IN')}</p>
          </div>

          {/* Update Status */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-[10px] font-semibold tracking-[2px] uppercase text-gray-400">Update Status</p>
            <select className="form-select text-sm py-2" value={statusForm.status} onChange={e => setStatusForm({...statusForm, status: e.target.value})}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
            </select>
            <input className="form-input text-sm py-2" placeholder="Tracking number" value={statusForm.tracking_number} onChange={e => setStatusForm({...statusForm, tracking_number: e.target.value})} />
            <input className="form-input text-sm py-2" placeholder="Tracking URL" value={statusForm.tracking_url} onChange={e => setStatusForm({...statusForm, tracking_url: e.target.value})} />
            <textarea rows={2} className="form-input text-sm py-2 resize-none" placeholder="Status message (sent to customer)" value={statusForm.message} onChange={e => setStatusForm({...statusForm, message: e.target.value})} />
            <button onClick={handleUpdateStatus} disabled={updatingStatus} className="btn btn-primary btn-full justify-center text-xs py-2.5">
              {updatingStatus ? <><div className="spinner spinner-sm spinner-white" /> Updating...</> : 'Update Status'}
            </button>
          </div>

          {/* Items */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] font-semibold tracking-[2px] uppercase text-gray-400 mb-3">Items</p>
            <div className="space-y-2">
              {(selOrder.items||[]).map((item,i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-8 h-10 bg-gray-100 flex-shrink-0 text-center flex items-center justify-center text-xs opacity-30">🛍</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-400">{item.qty} × {fmt(item.price)}</p>
                  </div>
                  <p className="text-xs font-medium">{fmt(item.qty*item.price)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 pt-4 space-y-1 text-xs text-gray-500">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(selOrder.subtotal)}</span></div>
            {selOrder.coupon_discount>0 && <div className="flex justify-between text-green-600"><span>Coupon</span><span>−{fmt(selOrder.coupon_discount)}</span></div>}
            <div className="flex justify-between"><span>Shipping</span><span>{selOrder.shipping_charge>0?fmt(selOrder.shipping_charge):'FREE'}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{fmt(selOrder.tax)}</span></div>
            <div className="flex justify-between font-semibold text-sm text-luxury-black pt-1 border-t border-gray-200 mt-1"><span>Total</span><span>{fmt(selOrder.total)}</span></div>
          </div>

          {/* Shipping address */}
          {selOrder.shipping_address && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-[10px] font-semibold tracking-[2px] uppercase text-gray-400 mb-2">Ship To</p>
              <p className="text-xs font-medium">{selOrder.shipping_address.name}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{selOrder.shipping_address.line1}, {selOrder.shipping_address.city}, {selOrder.shipping_address.state} — {selOrder.shipping_address.pincode}</p>
              <p className="text-xs text-gray-400">{selOrder.shipping_address.phone}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
