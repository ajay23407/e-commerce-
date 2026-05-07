import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to:'/admin',           label:'Dashboard', icon:'📊' },
  { to:'/admin/products',  label:'Products',  icon:'🛍️' },
  { to:'/admin/orders',    label:'Orders',    icon:'📦' },
  { to:'/admin/users',     label:'Users',     icon:'👥' },
  { to:'/admin/coupons',   label:'Coupons',   icon:'🎫' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-luxury-black text-white flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
          {!collapsed && (
            <Link to="/" className="font-serif text-xl tracking-[4px]">LUX<span className="text-gold">E</span></Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="w-8 h-8 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors ml-auto">
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-all ${active ? 'bg-gold text-luxury-black font-semibold' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                title={collapsed ? item.label : ''}>
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className={`border-t border-white/10 p-4 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? (
            <div>
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-white/40 truncate">{user?.role}</p>
              <div className="flex gap-2 mt-3">
                <Link to="/" className="text-xs text-white/50 hover:text-white underline">← Site</Link>
                <button onClick={logout} className="text-xs text-red-400 hover:text-red-300 underline ml-auto">Logout</button>
              </div>
            </div>
          ) : (
            <button onClick={logout} className="text-white/50 hover:text-red-400 text-lg" title="Logout">↩</button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="font-serif text-lg">{navItems.find(n => n.to === location.pathname)?.label || 'Admin'}</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Logged in as <strong className="text-luxury-black">{user?.name}</strong></span>
            <Link to="/shop" target="_blank" className="btn btn-ghost btn-sm text-xs">View Store ↗</Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
