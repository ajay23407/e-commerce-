import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${parseFloat(n||0).toLocaleString('en-IN')}`;

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = { code:'', description:'', type:'percentage', value:'', min_order_amount:'', max_discount:'', usage_limit:'', user_limit:1, valid_until:'' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try { const r = await api.get('/coupons'); setCoupons(r.data.coupons); }
    catch {} finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code || !form.type) { toast.error('Code and type are required.'); return; }
    setSaving(true);
    try {
      await api.post('/coupons', form);
      toast.success('Coupon created!');
      setShowForm(false); setForm(emptyForm); fetchCoupons();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id, isActive) => {
    try { await api.put(`/coupons/${id}`, { is_active: !isActive }); toast.success('Coupon updated.'); fetchCoupons(); }
    catch { toast.error('Failed.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try { await api.delete(`/coupons/${id}`); toast.success('Coupon deleted.'); fetchCoupons(); }
    catch { toast.error('Failed.'); }
  };

  const F = ({ label, children, className='' }) => (
    <div className={className}><label className="form-label">{label}</label>{children}</div>
  );

  return (
    <div className="space-y-5">
      {showForm && (
        <div className="bg-white border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-xl">Create Coupon</h2>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); }} className="text-gray-400 hover:text-luxury-black text-xl">✕</button>
          </div>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <F label="Coupon Code *"><input type="text" className="form-input uppercase" placeholder="SUMMER30" value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} /></F>
              <F label="Type *">
                <select className="form-select" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>
              </F>
              <F label="Value"><input type="number" className="form-input" placeholder={form.type==='percentage'?'e.g. 20':'e.g. 500'} value={form.value} onChange={e=>setForm({...form,value:e.target.value})} /></F>
              <F label="Min Order (₹)"><input type="number" className="form-input" placeholder="0" value={form.min_order_amount} onChange={e=>setForm({...form,min_order_amount:e.target.value})} /></F>
              <F label="Max Discount (₹)"><input type="number" className="form-input" placeholder="No limit" value={form.max_discount} onChange={e=>setForm({...form,max_discount:e.target.value})} /></F>
              <F label="Total Usage Limit"><input type="number" className="form-input" placeholder="No limit" value={form.usage_limit} onChange={e=>setForm({...form,usage_limit:e.target.value})} /></F>
              <F label="Per User Limit"><input type="number" className="form-input" value={form.user_limit} onChange={e=>setForm({...form,user_limit:e.target.value})} /></F>
              <F label="Valid Until"><input type="date" className="form-input" value={form.valid_until} onChange={e=>setForm({...form,valid_until:e.target.value})} /></F>
              <div className="lg:col-span-2"><F label="Description"><input type="text" className="form-input" placeholder="Flat 20% off on all orders" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></F></div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? <><div className="spinner spinner-sm spinner-white" /> Creating...</> : 'Create Coupon'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <p className="text-sm font-medium">{coupons.length} coupons</p>
          {!showForm && <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">+ Create Coupon</button>}
        </div>

        <table className="data-table">
          <thead>
            <tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Usage</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12"><div className="spinner spinner-gold mx-auto" /></td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No coupons yet</td></tr>
            ) : coupons.map(c => (
              <tr key={c.id}>
                <td>
                  <p className="font-mono font-bold text-sm text-gold">{c.code}</p>
                  {c.description && <p className="text-xs text-gray-400 max-w-[160px] truncate">{c.description}</p>}
                </td>
                <td className="text-xs capitalize text-gray-500">{c.type.replace('_',' ')}</td>
                <td className="text-sm font-medium">{c.type === 'percentage' ? `${c.value}%` : c.type === 'free_shipping' ? 'Free Ship' : fmt(c.value)}</td>
                <td className="text-xs text-gray-500">{c.min_order_amount > 0 ? fmt(c.min_order_amount) : '—'}</td>
                <td className="text-xs text-gray-500">{c.used_count} / {c.usage_limit || '∞'}</td>
                <td className="text-xs text-gray-400 whitespace-nowrap">{c.valid_until ? new Date(c.valid_until).toLocaleDateString('en-IN') : 'No expiry'}</td>
                <td>
                  <span className={`badge text-[9px] ${c.is_active ? 'badge-success' : 'bg-gray-100 text-gray-400'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggle(c.id, c.is_active)} className={`text-xs underline ${c.is_active ? 'text-amber-500 hover:text-amber-700' : 'text-green-500 hover:text-green-700'}`}>
                      {c.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400 hover:text-red-600 underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
