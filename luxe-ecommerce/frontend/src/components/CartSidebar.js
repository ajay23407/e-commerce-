import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

export default function CartSidebar() {
  const { cart, cartOpen, setCartOpen, updateQty, removeFromCart, loading } = useCart();
  const navigate = useNavigate();

  const subtotal  = cart.items?.reduce((s, i) => s + (i.product?.price || 0) * i.qty, 0) || 0;
  const shipping  = subtotal >= 2999 ? 0 : (subtotal > 0 ? 99 : 0);
  const total     = subtotal + shipping;
  const itemCount = cart.items?.reduce((s, i) => s + i.qty, 0) || 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setCartOpen(false)}
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${cartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Sidebar */}
      <aside className={`fixed top-0 right-0 h-full w-[420px] max-w-full bg-white z-50 flex flex-col shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-serif text-xl">
            Your Cart
            {itemCount > 0 && <span className="font-sans text-sm font-normal text-gray-400 ml-2">({itemCount} items)</span>}
          </h2>
          <button onClick={() => setCartOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-luxury-black">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Free shipping progress */}
        {subtotal > 0 && subtotal < 2999 && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
            <p className="text-xs text-amber-700 mb-1.5">
              Add <strong>{fmt(2999 - subtotal)}</strong> more for free shipping!
            </p>
            <div className="h-1 bg-amber-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((subtotal / 2999) * 100, 100)}%` }} />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="spinner spinner-gold" />
            </div>
          )}

          {!loading && cart.items?.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">🛍️</div>
              <h3 className="font-serif text-lg mb-2">Your cart is empty</h3>
              <p className="text-sm text-gray-400 mb-6">Explore our curated collection</p>
              <Link to="/shop" onClick={() => setCartOpen(false)} className="btn btn-primary">Browse Products</Link>
            </div>
          )}

          <div className="space-y-5">
            {cart.items?.map((item) => {
              const key = `${item.product_id}-${JSON.stringify(item.variant)}`;
              const img = item.product?.images?.[0]?.url;
              const price = item.product?.price || 0;
              return (
                <div key={key} className="flex gap-4">
                  {/* Image */}
                  <div className="w-20 h-24 bg-gray-100 flex-shrink-0 overflow-hidden">
                    {img
                      ? <img src={img} alt={item.product?.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🛍️</div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 tracking-wider uppercase mb-0.5">{item.product?.brand_name || 'LUXE'}</p>
                    <p className="text-sm font-medium leading-snug mb-1 truncate">{item.product?.name}</p>
                    {item.variant && (
                      <p className="text-xs text-gray-400 mb-2">
                        {[item.variant.size && `Size: ${item.variant.size}`, item.variant.color].filter(Boolean).join(' · ')}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      {/* Qty control */}
                      <div className="flex items-center border border-gray-200 h-7">
                        <button onClick={() => updateQty(item.product_id, item.qty - 1, item.variant)}
                          className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm">−</button>
                        <span className="w-7 text-center text-xs font-medium">{item.qty}</span>
                        <button onClick={() => updateQty(item.product_id, item.qty + 1, item.variant)}
                          className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm">+</button>
                      </div>

                      <div className="flex items-center gap-3">
                        <button onClick={() => removeFromCart(item.product_id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors underline">Remove</button>
                        <span className="text-sm font-medium">{fmt(price * item.qty)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        {cart.items?.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-5 space-y-3 bg-gray-50/50">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Shipping</span>
              <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>{shipping === 0 ? 'FREE' : fmt(shipping)}</span>
            </div>
            <div className="flex justify-between font-medium text-base pt-2 border-t border-gray-200">
              <span>Total</span><span>{fmt(total)}</span>
            </div>

            <button onClick={() => { setCartOpen(false); navigate('/checkout'); }}
              className="btn btn-primary btn-full justify-center text-sm mt-2 py-3.5">
              Checkout →
            </button>
            <button onClick={() => setCartOpen(false)} className="btn btn-ghost btn-full justify-center text-xs">
              Continue Shopping
            </button>
            <p className="text-center text-[10px] text-gray-400 tracking-wide">🔒 Secure checkout · GST included · Free returns</p>
          </div>
        )}
      </aside>
    </>
  );
}
