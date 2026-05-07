import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

export default function WishlistPage() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    document.title = 'Wishlist — LUXE';
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    setLoading(true);
    try { const r = await api.get('/wishlist'); setItems(r.data.wishlist); }
    catch { toast.error('Failed to load wishlist.'); }
    finally { setLoading(false); }
  };

  const removeItem = async (productId) => {
    try {
      await api.post('/wishlist', { product_id: productId });
      setItems(prev => prev.filter(i => i.product_id !== productId));
      toast.success('Removed from wishlist.');
    } catch {}
  };

  const moveToCart = async (item) => {
    try {
      await api.post('/wishlist/move-to-cart', { product_id: item.product_id });
      setItems(prev => prev.filter(i => i.product_id !== item.product_id));
      toast.success('Moved to cart!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to move to cart.'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="spinner spinner-lg spinner-gold" /></div>;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-12">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <Link to="/" className="hover:text-luxury-black">Home</Link><span>/</span>
          <span className="text-luxury-black">Wishlist</span>
        </nav>
        <h1 className="font-serif text-4xl">Wishlist <span className="text-gray-300 text-2xl font-sans font-normal">({items.length})</span></h1>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-5">♡</div>
          <h2 className="font-serif text-2xl mb-2">Your wishlist is empty</h2>
          <p className="text-gray-400 text-sm mb-8">Save items you love for later.</p>
          <Link to="/shop" className="btn btn-primary btn-lg">Browse Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map(item => {
            const img = item.images?.[0]?.url;
            const discount = item.compare_price && item.compare_price > item.price
              ? Math.round(((item.compare_price - item.price) / item.compare_price) * 100) : 0;
            return (
              <div key={item.product_id} className="group relative">
                <div className="relative overflow-hidden bg-gray-100 aspect-[3/4] mb-3">
                  {img
                    ? <img src={img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    : <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">🛍️</div>
                  }
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    {item.is_new_arrival && <span className="badge badge-new">New</span>}
                    {discount > 0 && <span className="badge badge-sale">−{discount}%</span>}
                    {item.stock === 0 && <span className="badge bg-gray-400 text-white">Sold Out</span>}
                  </div>
                  <button onClick={() => removeItem(item.product_id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-red-400 hover:text-red-600 shadow-sm transition-colors">
                    ✕
                  </button>
                  {item.stock > 0 && (
                    <div className="absolute bottom-0 inset-x-0 translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button onClick={() => moveToCart(item)} className="w-full bg-luxury-black text-white py-3 text-[11px] font-medium tracking-[2px] uppercase hover:bg-gold-dark transition-colors">
                        Move to Cart →
                      </button>
                    </div>
                  )}
                </div>
                <Link to={`/product/${item.slug}`}>
                  <p className="text-sm font-medium leading-snug mb-1 hover:text-gold-dark transition-colors line-clamp-2">{item.name}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{fmt(item.price)}</span>
                    {item.compare_price && <span className="text-xs text-gray-400 line-through">{fmt(item.compare_price)}</span>}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
