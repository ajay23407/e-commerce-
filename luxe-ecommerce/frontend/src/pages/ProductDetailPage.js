import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selImg, setSelImg]     = useState(0);
  const [selSize, setSelSize]   = useState(null);
  const [selColor, setSelColor] = useState(null);
  const [qty, setQty]           = useState(1);
  const [adding, setAdding]     = useState(false);
  const [wishlisted, setWish]   = useState(false);
  const [tab, setTab]           = useState('description');
  const [revForm, setRevForm]   = useState({ rating: 5, title: '', body: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${slug}`).then(r => { setProduct(r.data.product); document.title = `${r.data.product.name} — LUXE`; }).catch(() => toast.error('Product not found.')).finally(() => setLoading(false));
    window.scrollTo({ top: 0 });
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="spinner spinner-lg spinner-gold" /></div>;
  if (!product) return <div className="flex flex-col items-center justify-center min-h-[60vh] text-center"><h2 className="font-serif text-2xl mb-4">Product not found</h2><Link to="/shop" className="btn btn-primary">Back to Shop</Link></div>;

  const discount = product.compare_price && product.compare_price > product.price ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0;
  const sizes  = [...new Set(product.variants?.map(v => v.size).filter(Boolean))];
  const colors = [...new Map(product.variants?.map(v => [v.color, v])).values()].filter(v => v.color);
  const stars  = (r) => { const n = Math.round(parseFloat(r) || 0); return [1,2,3,4,5].map(i => <svg key={i} className={`w-4 h-4 ${i <= n ? 'text-gold' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>); };

  const handleAddCart = async () => {
    setAdding(true);
    const variant = (selSize || selColor) ? { size: selSize, color: selColor } : null;
    await addToCart(product.id, qty, variant);
    setAdding(false);
  };

  const handleWishlist = async () => {
    if (!user) { toast.error('Please log in first.'); return; }
    try { const r = await api.post('/wishlist', { product_id: product.id }); setWish(r.data.action === 'added'); toast.success(r.data.message); } catch {}
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!user) { toast.error('Please log in to review.'); return; }
    setSubmitting(true);
    try { await api.post('/reviews', { product_id: product.id, ...revForm }); toast.success('Review submitted!'); setRevForm({ rating: 5, title: '', body: '' }); const r = await api.get(`/products/${slug}`); setProduct(r.data.product); } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); } finally { setSubmitting(false); }
  };

  const imgs = product.images || [];

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-8">
        <Link to="/" className="hover:text-luxury-black">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-luxury-black">Shop</Link>
        {product.category_name && <><span>/</span><Link to={`/shop?category=${product.category_slug}`} className="hover:text-luxury-black">{product.category_name}</Link></>}
        <span>/</span>
        <span className="text-luxury-black truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square bg-gray-100 overflow-hidden">
            {imgs[selImg]?.url
              ? <img src={imgs[selImg].url} alt={product.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">🛍️</div>
            }
          </div>
          {imgs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {imgs.map((img, i) => (
                <button key={i} onClick={() => setSelImg(i)}
                  className={`w-20 h-20 flex-shrink-0 border-2 transition-colors overflow-hidden ${selImg === i ? 'border-luxury-black' : 'border-gray-200 hover:border-gray-400'}`}>
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              {product.brand_name && <p className="text-xs font-medium tracking-[2px] uppercase text-gray-400 mb-1">{product.brand_name}</p>}
              <h1 className="font-serif text-3xl leading-tight">{product.name}</h1>
            </div>
            <button onClick={handleWishlist} className={`w-10 h-10 flex-shrink-0 rounded-full border flex items-center justify-center transition-all ${wishlisted ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400'}`}>
              <svg className="w-4 h-4" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          </div>

          {product.review_count > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">{stars(product.avg_rating)}</div>
              <span className="text-sm text-gray-400">{product.avg_rating} · {product.review_count} reviews</span>
            </div>
          )}

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-medium">{fmt(product.price)}</span>
            {product.compare_price && <span className="text-lg text-gray-400 line-through">{fmt(product.compare_price)}</span>}
            {discount > 0 && <span className="badge badge-sale text-sm px-3 py-1">{discount}% OFF</span>}
          </div>

          {product.short_desc && <p className="text-sm text-gray-500 leading-relaxed mb-6 border-t border-gray-100 pt-6">{product.short_desc}</p>}

          {/* Sizes */}
          {sizes.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="form-label mb-0">Size</label>
                <button className="text-xs text-gold-dark underline">Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map(s => (
                  <button key={s} onClick={() => setSelSize(selSize === s ? null : s)}
                    className={`w-12 h-12 border text-sm font-medium transition-all ${selSize === s ? 'border-luxury-black bg-luxury-black text-white' : 'border-gray-200 hover:border-gray-400'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Colors */}
          {colors.length > 0 && (
            <div className="mb-6">
              <label className="form-label">Color {selColor && <span className="normal-case tracking-normal text-luxury-black font-medium">— {selColor}</span>}</label>
              <div className="flex flex-wrap gap-2">
                {colors.map(v => (
                  <button key={v.color} onClick={() => setSelColor(selColor === v.color ? null : v.color)}
                    title={v.color}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${selColor === v.color ? 'border-luxury-black scale-110' : 'border-gray-200 hover:scale-105'}`}
                    style={{ background: v.color_hex || '#ccc' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Qty + Add to cart */}
          <div className="flex gap-3 mb-6">
            <div className="flex items-center border border-gray-200 h-12">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 text-lg">−</button>
              <span className="w-10 text-center text-sm font-medium">{qty}</span>
              <button onClick={() => setQty(Math.min(10, qty + 1))} className="w-10 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 text-lg">+</button>
            </div>
            <button onClick={handleAddCart} disabled={adding || product.stock === 0}
              className="btn btn-primary flex-1 justify-center h-12 text-sm">
              {adding ? <><div className="spinner spinner-sm spinner-white" /> Adding...</>
               : product.stock === 0 ? 'Out of Stock'
               : 'Add to Cart'}
            </button>
          </div>

          {product.stock > 0 && product.stock <= 10 && (
            <p className="text-xs text-amber-600 mb-4">⚡ Only {product.stock} left in stock!</p>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 py-5 border-t border-gray-100">
            {[['🚚','Free Shipping','Orders above ₹2,999'],['↩️','Free Returns','Within 30 days'],['🔒','Secure Payment','100% protected']].map(([icon,t,s]) => (
              <div key={t} className="text-center">
                <div className="text-lg mb-1">{icon}</div>
                <p className="text-xs font-medium">{t}</p>
                <p className="text-[10px] text-gray-400">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-gray-200 mb-12">
        <div className="flex gap-0 border-b border-gray-200">
          {['description','reviews','shipping'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-8 py-4 text-xs font-medium tracking-[2px] uppercase border-b-2 transition-colors ${tab === t ? 'border-luxury-black text-luxury-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t}{t === 'reviews' && product.review_count > 0 ? ` (${product.review_count})` : ''}
            </button>
          ))}
        </div>

        <div className="py-10 max-w-3xl">
          {tab === 'description' && (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{product.description || 'No description available.'}</p>
              {product.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {product.tags.map(tag => <span key={tag} className="px-3 py-1 bg-gray-100 text-xs text-gray-600">{tag}</span>)}
                </div>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div className="space-y-8">
              {/* Rating summary */}
              {product.review_count > 0 && (
                <div className="flex items-center gap-8 pb-8 border-b border-gray-100">
                  <div className="text-center">
                    <p className="font-serif text-5xl">{product.avg_rating}</p>
                    <div className="flex justify-center my-1">{stars(product.avg_rating)}</div>
                    <p className="text-xs text-gray-400">{product.review_count} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {(product.rating_distribution || []).map(r => (
                      <div key={r.rating} className="flex items-center gap-3 text-xs">
                        <span className="w-4 text-right text-gray-500">{r.rating}★</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gold rounded-full" style={{ width: `${(r.count / product.review_count) * 100}%` }} />
                        </div>
                        <span className="w-4 text-gray-400">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review list */}
              {product.reviews?.map(r => (
                <div key={r.id} className="border-b border-gray-50 pb-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex gap-0.5 mb-1">{stars(r.rating)}</div>
                      <p className="font-medium text-sm">{r.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{r.user_name}</p>
                      <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                      {r.is_verified && <span className="badge badge-success mt-1">Verified Purchase</span>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{r.body}</p>
                </div>
              ))}

              {(!product.reviews || product.reviews.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-lg mb-1">No reviews yet</p>
                  <p className="text-sm">Be the first to review this product!</p>
                </div>
              )}

              {/* Write review */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="font-serif text-xl mb-6">Write a Review</h3>
                {!user ? (
                  <p className="text-sm text-gray-500">Please <Link to="/login" className="text-gold-dark underline">sign in</Link> to write a review.</p>
                ) : (
                  <form onSubmit={handleReview} className="space-y-4 max-w-lg">
                    <div>
                      <label className="form-label">Rating</label>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} type="button" onClick={() => setRevForm({...revForm, rating: n})}
                            className={`text-2xl transition-colors ${n <= revForm.rating ? 'text-gold' : 'text-gray-200'}`}>★</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Title</label>
                      <input type="text" className="form-input" placeholder="Summary of your review"
                        value={revForm.title} onChange={e => setRevForm({...revForm, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="form-label">Review</label>
                      <textarea rows={4} className="form-input resize-none" placeholder="Share your experience..."
                        value={revForm.body} onChange={e => setRevForm({...revForm, body: e.target.value})} />
                    </div>
                    <button type="submit" disabled={submitting} className="btn btn-primary">
                      {submitting ? <><div className="spinner spinner-sm spinner-white" /> Submitting...</> : 'Submit Review'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {tab === 'shipping' && (
            <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
              <p><strong className="text-luxury-black">Free Standard Shipping</strong> on orders above ₹2,999 — delivered in 3–5 business days.</p>
              <p><strong className="text-luxury-black">Express Shipping</strong> available at checkout — delivered in 1–2 business days (₹299).</p>
              <p><strong className="text-luxury-black">Free Returns</strong> within 30 days of delivery. Items must be unused and in original packaging.</p>
              <p><strong className="text-luxury-black">COD Available</strong> on orders below ₹10,000 at select pincodes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {product.related?.length > 0 && (
        <div>
          <div className="mb-8">
            <p className="section-eyebrow">You Might Also Like</p>
            <h2 className="font-serif text-3xl">Related Products</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {product.related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
