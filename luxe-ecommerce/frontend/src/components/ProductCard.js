import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${parseFloat(n).toLocaleString('en-IN')}`;

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [addingCart, setAddingCart] = useState(false);
  const [hovered, setHovered]       = useState(false);

  const primary   = product.images?.[0]?.url;
  const secondary = product.images?.[1]?.url;
  const discount  = product.compare_price && product.compare_price > product.price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0;

  const stars = Math.round(parseFloat(product.avg_rating) || 0);

  const handleCart = async (e) => {
    e.preventDefault();
    setAddingCart(true);
    await addToCart(product.id, 1);
    setAddingCart(false);
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!user) { toast.error('Please log in to save items.'); return; }
    try {
      const res = await api.post('/wishlist', { product_id: product.id });
      setWishlisted(res.data.action === 'added');
      toast.success(res.data.message);
    } catch {}
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative"
    >
      <Link to={`/product/${product.slug}`} className="block">
        {/* Image container */}
        <div className="relative overflow-hidden bg-gray-100 aspect-[3/4] mb-3">
          {primary ? (
            <img
              src={hovered && secondary ? secondary : primary}
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">🛍️</div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.is_new_arrival && <span className="badge badge-new">New</span>}
            {discount > 0 && <span className="badge badge-sale">−{discount}%</span>}
            {product.stock > 0 && product.stock <= 5 && <span className="badge badge-limited">Only {product.stock} left</span>}
            {product.stock === 0 && <span className="badge bg-gray-400 text-white">Sold Out</span>}
          </div>

          {/* Wishlist button */}
          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm transition-all duration-300
              ${hovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
              ${wishlisted ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
          >
            <svg className="w-4 h-4" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          {/* Quick add */}
          {product.stock > 0 && (
            <div className={`absolute bottom-0 inset-x-0 transition-all duration-300 ${hovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
              <button
                onClick={handleCart}
                disabled={addingCart}
                className="w-full bg-luxury-black text-white py-3 text-[11px] font-medium tracking-[2px] uppercase hover:bg-gold-dark transition-colors flex items-center justify-center gap-2"
              >
                {addingCart
                  ? <div className="spinner spinner-sm spinner-white" />
                  : <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                      Add to Cart
                    </>
                }
              </button>
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="px-0.5">
          {product.brand_name && (
            <p className="text-[10px] font-medium text-gray-400 tracking-[1.5px] uppercase mb-1">{product.brand_name}</p>
          )}
          <h3 className="text-sm font-medium text-luxury-black leading-snug mb-1.5 line-clamp-2">{product.name}</h3>

          {/* Rating */}
          {product.review_count > 0 && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="flex">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className={`w-3 h-3 ${i <= stars ? 'text-gold' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>
              <span className="text-[11px] text-gray-400">({product.review_count})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-base font-medium">{fmt(product.price)}</span>
            {product.compare_price && <span className="text-sm text-gray-400 line-through">{fmt(product.compare_price)}</span>}
            {discount > 0 && <span className="text-xs text-red-500 font-medium">Save {discount}%</span>}
          </div>
        </div>
      </Link>
    </div>
  );
}
