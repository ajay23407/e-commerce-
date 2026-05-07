import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../../utils/api';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

const STATUS_COLORS = {
  pending:'bg-amber-100 text-amber-700', confirmed:'bg-blue-100 text-blue-700',
  processing:'bg-purple-100 text-purple-700', shipped:'bg-indigo-100 text-indigo-700',
  delivered:'bg-green-100 text-green-700', cancelled:'bg-red-100 text-red-600',
};

export default function AdminDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Admin Dashboard — LUXE';
    api.get('/admin/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner spinner-lg spinner-gold" /></div>;
  if (!data)   return <div className="text-center py-16 text-gray-400">Failed to load dashboard.</div>;

  const { stats, recent_orders, top_products, sales_by_day } = data;

  const statCards = [
    { label:'Total Revenue',   value: fmt(stats.revenue?.total || 0), sub:`${fmt(stats.revenue?.today || 0)} today`, icon:'💰', color:'bg-green-50 border-green-200 text-green-700' },
    { label:'Total Orders',    value: stats.orders?.total || 0,        sub:`${stats.orders?.pending || 0} pending`,   icon:'📦', color:'bg-blue-50 border-blue-200 text-blue-700' },
    { label:'Customers',       value: stats.users?.total || 0,         sub:`${stats.users?.today || 0} today`,        icon:'👥', color:'bg-purple-50 border-purple-200 text-purple-700' },
    { label:'Active Products', value: stats.products?.total || 0,      sub:`${stats.products?.low_stock || 0} low stock`, icon:'🛍️', color:'bg-amber-50 border-amber-200 text-amber-700' },
  ];

  const chartData = (sales_by_day || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }),
    revenue: parseFloat(d.revenue),
    orders: parseInt(d.orders),
  }));

  return (
    <div className="space-y-6 max-w-screen-xl">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(c => (
          <div key={c.label} className={`border-2 p-5 rounded-sm ${c.color}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium tracking-wider uppercase opacity-70">{c.label}</p>
                <p className="text-2xl font-bold mt-1">{c.value}</p>
              </div>
              <span className="text-2xl">{c.icon}</span>
            </div>
            <p className="text-xs opacity-60">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 p-5">
          <h3 className="font-medium text-sm mb-4">Revenue (Last 30 Days)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize:11 }} tickLine={false} />
                <YAxis tick={{ fontSize:11 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [fmt(v), 'Revenue']} labelStyle={{ fontSize:12 }} />
                <Line type="monotone" dataKey="revenue" stroke="#C9A84C" strokeWidth={2} dot={false} activeDot={{ r:4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No sales data yet</div>}
        </div>

        <div className="bg-white border border-gray-200 p-5">
          <h3 className="font-medium text-sm mb-4">Orders (Last 30 Days)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize:11 }} tickLine={false} />
                <YAxis tick={{ fontSize:11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={v => [v, 'Orders']} labelStyle={{ fontSize:12 }} />
                <Bar dataKey="orders" fill="#0A0A0A" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No order data yet</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="bg-white border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs text-gold-dark underline hover:text-gold">View all →</Link>
          </div>
          <div className="space-y-3">
            {recent_orders?.map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium">#{o.order_number}</p>
                  <p className="text-xs text-gray-400">{o.customer_name} · {new Date(o.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{fmt(o.total)}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                    {o.status.replace(/_/g,' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm">Top Products</h3>
            <Link to="/admin/products" className="text-xs text-gold-dark underline hover:text-gold">View all →</Link>
          </div>
          <div className="space-y-3">
            {top_products?.map((p, i) => (
              <div key={p.slug} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.sold_count} sold · {fmt(p.price)}</p>
                </div>
                <div className="flex items-center gap-0.5">
                  <svg className="w-3 h-3 text-gold" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  <span className="text-xs text-gray-500">{parseFloat(p.avg_rating || 0).toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
