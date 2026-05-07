import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../utils/api';
import CartSidebar from './CartSidebar';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { totalItems, setCartOpen } = useCart();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [scrolled, setScrolled]     = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery]           = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [userMenu, setUserMenu]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef(null);
  const userRef   = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    setMobileOpen(false); setSearchOpen(false); setUserMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try { const r = await api.get(`/products/search?q=${query}`); setSuggestions(r.data.suggestions || []); } catch {}
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const fn = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) { setSearchOpen(false); setSuggestions([]); }
      if (userRef.current   && !userRef.current.contains(e.target))   setUserMenu(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false); setQuery(''); setSuggestions([]);
  };

  const navLinks = [
    { label: 'New Arrivals', to: '/shop?new_arrival=true' },
    { label: 'Women',        to: '/shop?category=women'   },
    { label: 'Men',          to: '/shop?category=men'     },
    { label: 'Accessories',  to: '/shop?category=accessories' },
    { label: 'Sale',         to: '/shop?sort=compare_price&order=desc' },
  ];

  return (
    <>
      <div className="bg-luxury-black text-gold text-center py-2.5 text-[10px] font-medium tracking-[3px] uppercase">
        ✦ Free shipping over ₹2,999 &nbsp;·&nbsp; Code <strong className="text-gold-light">LUXE20</strong> — 20% off ✦
      </div>

      <nav className={`sticky top-0 z-50 border-b border-gray-100 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-luxury-cream'}`}>
        <div className="max-w-screen-xl mx-auto px-6 h-[68px] flex items-center justify-between gap-6">

          <Link to="/" className="font-serif text-[26px] tracking-[6px] text-luxury-black flex-shrink-0">
            LUX<span className="text-gold">E</span>
          </Link>

          <ul className="hidden lg:flex items-center gap-9 list-none flex-1 justify-center">
            {navLinks.map(l => (
              <li key={l.label}>
                <Link to={l.to} className="text-[11px] font-medium tracking-[1.5px] uppercase text-gray-500 hover:text-luxury-black transition-colors duration-200 relative group">
                  {l.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold group-hover:w-full transition-all duration-300" />
                </Link>
              </li>
            ))}
            {isAdmin && (
              <li>
                <Link to="/admin" className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold hover:text-gold-dark transition-colors">Admin ⚡</Link>
              </li>
            )}
          </ul>

          <div className="flex items-center gap-0.5">
            {/* Search */}
            <div ref={searchRef} className="relative">
              <button onClick={() => setSearchOpen(!searchOpen)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </button>
              {searchOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-80 bg-white border border-gray-200 shadow-luxury z-50 p-4">
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                      placeholder="Search products..." className="form-input flex-1 py-2 text-sm" />
                    <button type="submit" className="btn btn-primary px-4 py-2 text-xs">Go</button>
                  </form>
                  {suggestions.length > 0 && (
                    <ul className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                      {suggestions.map(s => (
                        <li key={s.slug}>
                          <button onClick={() => { navigate(`/product/${s.slug}`); setSearchOpen(false); setQuery(''); }}
                            className="w-full text-left px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2 rounded">
                            <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            {s.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Wishlist */}
            <Link to="/wishlist" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </Link>

            {/* User */}
            <div ref={userRef} className="relative">
              <button onClick={() => user ? setUserMenu(!userMenu) : navigate('/login')}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              {userMenu && user && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-52 bg-white border border-gray-200 shadow-luxury z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  {[['My Profile','/account'],['My Orders','/orders'],['Wishlist','/wishlist'],
                    ...(isAdmin ? [['Admin Panel ⚡','/admin']] : [])
                  ].map(([label, to]) => (
                    <Link key={to} to={to} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">{label}</Link>
                  ))}
                  <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100">
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Cart */}
            <button onClick={() => setCartOpen(true)} className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              {totalItems > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-gold text-luxury-black text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>

            {/* Hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors ml-1 text-lg">
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 px-6 pb-6">
            <nav className="space-y-0 pt-3">
              {navLinks.map(l => (
                <Link key={l.label} to={l.to} className="block py-3 border-b border-gray-50 text-[11px] font-medium tracking-[2px] uppercase text-gray-600 hover:text-luxury-black">
                  {l.label}
                </Link>
              ))}
            </nav>
            {!user ? (
              <div className="flex gap-3 mt-5">
                <Link to="/login"    className="btn btn-outline btn-sm flex-1 justify-center">Sign In</Link>
                <Link to="/register" className="btn btn-primary btn-sm flex-1 justify-center">Register</Link>
              </div>
            ) : (
              <button onClick={logout} className="btn btn-ghost btn-sm w-full mt-5">Sign Out</button>
            )}
          </div>
        )}
      </nav>

      <CartSidebar />
    </>
  );
}
