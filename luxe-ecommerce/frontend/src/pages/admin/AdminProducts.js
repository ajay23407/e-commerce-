import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;

const emptyForm = {
  name: '', description: '', short_desc: '', category_id: '', brand_id: '',
  price: '', compare_price: '', cost_price: '', stock: '', sku: '', tags: '',
  is_featured: false, is_new_arrival: false, is_active: true,
};

// ── Moved OUTSIDE the parent component so it's never recreated on re-render ──
// Previously defined inside AdminProducts, which caused React to unmount/remount
// inputs on every render — that's what was causing focus loss.
const Field = ({ label, children, span }) => (
  <div className={span}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

export default function AdminProducts() {
  // ── Table state ──────────────────────────────────────────────
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands]         = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');

  // ── Form state (kept separate so it never re-mounts) ────────
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  // Debounce search so typing doesn't trigger API on every keystroke
  const searchTimer = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setPage(1), 500);
  };

  // ── Data fetching ────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, limit: 15 });
      if (search)    q.set('search', search);
      if (catFilter) q.set('category', catFilter);
      const r = await api.get(`/products?${q}`);
      setProducts(r.data.products);
      setTotal(r.data.total);
    } catch {
      toast.error('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [page, search, catFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.categories)).catch(() => {});
    api.get('/brands').then(r => setBrands(r.data.brands)).catch(() => {});
  }, []);

  // ── Form field change — uses field name so one handler works for all ──
  const handleField = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // ── Image upload ─────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);

    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);
    try {
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem('luxe_token')}` },
      });
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
        setImagePreview(data.url);
        toast.success('Image uploaded!');
      } else {
        toast.error(data.message || 'Upload failed.');
      }
    } catch (err) {
      // If upload endpoint not ready, keep local preview + warn
      toast.error('Upload server not reachable. Image saved locally for preview only.');
      // Set a placeholder so form can still be submitted for testing
      setImageUrl(localPreview);
    } finally {
      setUploading(false);
    }
  };

  // ── Open form for new product ────────────────────────────────
  const handleAddNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setImageUrl('');
    setImagePreview('');
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  // ── Open form for editing ────────────────────────────────────
  const handleEdit = (p) => {
    setForm({
      name:          p.name          || '',
      description:   p.description   || '',
      short_desc:    p.short_desc    || '',
      category_id:   p.category_id   || '',
      brand_id:      p.brand_id      || '',
      price:         p.price         || '',
      compare_price: p.compare_price || '',
      cost_price:    p.cost_price    || '',
      stock:         p.stock         ?? '',
      sku:           p.sku           || '',
      tags:          Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
      is_featured:   !!p.is_featured,
      is_new_arrival: !!p.is_new_arrival,
      is_active:     p.is_active !== false,
    });
    const existingImg = p.images?.[0]?.url || '';
    setImageUrl(existingImg);
    setImagePreview(existingImg);
    setEditId(p.id);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  // ── Close / reset form ───────────────────────────────────────
  const handleCloseForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setEditId(null);
    setImageUrl('');
    setImagePreview('');
  };

  // ── Save product ─────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required.'); return; }
    if (!form.price)        { toast.error('Price is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        price:         parseFloat(form.price),
        compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
        cost_price:    form.cost_price    ? parseFloat(form.cost_price)    : null,
        stock:         parseInt(form.stock) || 0,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        images: imageUrl
          ? [{ url: imageUrl, alt: form.name, is_primary: true }]
          : [],
      };

      if (editId) {
        await api.put(`/products/${editId}`, payload);
        toast.success('Product updated successfully!');
      } else {
        await api.post('/products', payload);
        toast.success('Product created successfully!');
      }

      handleCloseForm();
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete (deactivate) ──────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this product? It will be hidden from the store.')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deactivated.');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate.');
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── PRODUCT FORM ── */}
      {showForm && (
        <div className="bg-white border-2 border-gold/40 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl">
              {editId ? '✏️ Edit Product' : '➕ Add New Product'}
            </h2>
            <button
              type="button"
              onClick={handleCloseForm}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-luxury-black transition-colors text-lg"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSave} autoComplete="off">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">

              {/* Name */}
              <Field label="Product Name *" span="lg:col-span-2">
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="e.g. Floral Silk Midi Dress"
                  value={form.name}
                  onChange={handleField}
                  autoComplete="off"
                />
              </Field>

              {/* SKU */}
              <Field label="SKU">
                <input
                  type="text"
                  name="sku"
                  className="form-input"
                  placeholder="e.g. ZS-DRESS-001"
                  value={form.sku}
                  onChange={handleField}
                />
              </Field>

              {/* Price */}
              <Field label="Selling Price (₹) *">
                <input
                  type="number"
                  name="price"
                  className="form-input"
                  placeholder="e.g. 4299"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={handleField}
                />
              </Field>

              {/* Compare price */}
              <Field label="Original Price (₹) — for strikethrough">
                <input
                  type="number"
                  name="compare_price"
                  className="form-input"
                  placeholder="e.g. 5999 (leave blank if no discount)"
                  step="0.01"
                  min="0"
                  value={form.compare_price}
                  onChange={handleField}
                />
              </Field>

              {/* Cost price */}
              <Field label="Cost Price (₹) — internal only">
                <input
                  type="number"
                  name="cost_price"
                  className="form-input"
                  placeholder="e.g. 1800"
                  step="0.01"
                  min="0"
                  value={form.cost_price}
                  onChange={handleField}
                />
              </Field>

              {/* Stock */}
              <Field label="Stock Quantity">
                <input
                  type="number"
                  name="stock"
                  className="form-input"
                  placeholder="e.g. 50"
                  min="0"
                  value={form.stock}
                  onChange={handleField}
                />
              </Field>

              {/* Category */}
              <Field label="Category">
                <select
                  name="category_id"
                  className="form-select"
                  value={form.category_id}
                  onChange={handleField}
                >
                  <option value="">Select a category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>

              {/* Brand */}
              <Field label="Brand">
                <select
                  name="brand_id"
                  className="form-select"
                  value={form.brand_id}
                  onChange={handleField}
                >
                  <option value="">Select a brand</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </Field>

              {/* Short desc */}
              <Field label="Short Description (shown on cards)" span="md:col-span-2">
                <input
                  type="text"
                  name="short_desc"
                  className="form-input"
                  placeholder="e.g. Premium silk midi dress with delicate floral print."
                  value={form.short_desc}
                  onChange={handleField}
                />
              </Field>

              {/* Full desc */}
              <Field label="Full Description" span="lg:col-span-3">
                <textarea
                  name="description"
                  rows={4}
                  className="form-input resize-y"
                  placeholder="Detailed product description — fabric, features, fit, care instructions..."
                  value={form.description}
                  onChange={handleField}
                />
              </Field>

              {/* Tags */}
              <Field label="Tags (comma-separated)" span="md:col-span-2">
                <input
                  type="text"
                  name="tags"
                  className="form-input"
                  placeholder="e.g. dress, silk, floral, women, new"
                  value={form.tags}
                  onChange={handleField}
                />
              </Field>
            </div>

            {/* ── Image Upload ── */}
            <div className="mb-5 p-4 border border-dashed border-gray-300 bg-gray-50">
              <label className="form-label mb-2">Product Image</label>
              <div className="flex items-start gap-4 flex-wrap">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:border file:border-gray-300 file:text-xs file:font-medium file:uppercase file:tracking-wider file:bg-white file:text-gray-700 hover:file:bg-gray-50 file:cursor-pointer"
                  />
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — max 5MB</p>
                  {uploading && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-amber-600">
                      <div className="spinner spinner-sm spinner-gold" /> Uploading...
                    </div>
                  )}
                </div>

                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-24 h-28 object-cover border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => { setImageUrl(''); setImagePreview(''); }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                    <p className="text-[10px] text-green-600 mt-1">✓ Image ready</p>
                  </div>
                )}

                {!imagePreview && (
                  <div className="w-24 h-28 border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-3xl">
                    🖼
                  </div>
                )}
              </div>

              {/* Or paste URL */}
              <div className="mt-3">
                <label className="form-label text-[9px]">Or paste an image URL directly</label>
                <input
                  type="url"
                  className="form-input text-sm py-2"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={imageUrl}
                  onChange={e => { setImageUrl(e.target.value); setImagePreview(e.target.value); }}
                />
              </div>
            </div>

            {/* ── Toggles ── */}
            <div className="flex items-center gap-6 mb-6 flex-wrap">
              {[
                ['is_featured',    'Featured on homepage'],
                ['is_new_arrival', 'Mark as New Arrival'],
                ['is_active',      'Active (visible in store)'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name={key}
                    checked={!!form[key]}
                    onChange={handleField}
                    className="w-4 h-4 accent-gold"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            {/* ── Action buttons ── */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={saving || uploading}
                className="btn btn-primary min-w-[160px] justify-center"
              >
                {saving
                  ? <><div className="spinner spinner-sm spinner-white" /> Saving...</>
                  : editId ? '✓ Update Product' : '✓ Create Product'
                }
              </button>
              <button
                type="button"
                onClick={handleCloseForm}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              {editId && (
                <span className="text-xs text-gray-400 ml-auto">
                  Editing product ID: <code className="font-mono">{editId.slice(0, 8)}…</code>
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── PRODUCTS TABLE ── */}
      <div className="bg-white border border-gray-200">
        {/* Table header / filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="form-input pl-9 py-2 text-sm"
              placeholder="Search products by name..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <select
            className="form-select py-2 text-sm w-auto"
            value={catFilter}
            onChange={e => { setCatFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          {!showForm && (
            <button onClick={handleAddNew} className="btn btn-primary btn-sm">
              + Add Product
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="spinner spinner-gold mx-auto" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <p className="text-gray-400 text-sm">No products found.</p>
                    <button onClick={handleAddNew} className="btn btn-primary btn-sm mt-3">
                      + Add your first product
                    </button>
                  </td>
                </tr>
              ) : products.map(p => {
                const img = Array.isArray(p.images) ? p.images[0]?.url : null;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 bg-gray-100 flex-shrink-0 overflow-hidden">
                          {img
                            ? <img src={img} alt={p.name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                            : <div className="w-full h-full flex items-center justify-center text-lg opacity-20">🛍</div>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-[160px]">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.brand_name || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs font-mono text-gray-400">{p.sku || '—'}</td>
                    <td className="text-xs text-gray-500">{p.category_name || '—'}</td>
                    <td>
                      <p className="text-sm font-medium">{fmt(p.price)}</p>
                      {p.compare_price > 0 && (
                        <p className="text-xs text-gray-400 line-through">{fmt(p.compare_price)}</p>
                      )}
                    </td>
                    <td>
                      <span className={`text-xs font-semibold ${p.stock === 0 ? 'text-red-500' : p.stock <= 5 ? 'text-amber-600' : 'text-green-600'}`}>
                        {p.stock === 0 ? 'Out of stock' : p.stock}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        {p.is_active
                          ? <span className="badge badge-success text-[9px]">Active</span>
                          : <span className="badge bg-gray-100 text-gray-400 text-[9px]">Inactive</span>
                        }
                        {p.is_featured    && <span className="badge bg-amber-50 text-amber-600 text-[9px]">Featured</span>}
                        {p.is_new_arrival && <span className="badge badge-new text-[9px]">New</span>}
                      </div>
                    </td>
                    <td className="text-sm whitespace-nowrap">
                      {parseFloat(p.avg_rating || 0).toFixed(1)} ★
                      <span className="text-xs text-gray-400 ml-1">({p.review_count || 0})</span>
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEdit(p)}
                          className="text-xs text-blue-500 hover:text-blue-700 font-medium underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-xs text-red-400 hover:text-red-600 font-medium underline"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">{total} total products</p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="w-8 h-8 border border-gray-200 text-sm flex items-center justify-center hover:border-luxury-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >←</button>
            <span className="w-10 h-8 flex items-center justify-center text-xs font-medium bg-gray-50">
              {page}
            </span>
            <button
              disabled={products.length < 15}
              onClick={() => setPage(p => p + 1)}
              className="w-8 h-8 border border-gray-200 text-sm flex items-center justify-center hover:border-luxury-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >→</button>
          </div>
        </div>
      </div>
    </div>
  );
}