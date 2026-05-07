import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands]         = useState([]);
  const [total, setTotal]           = useState(0);
  const [pages, setPages]           = useState(1);
  const [loading, setLoading]       = useState(true);
  const [filterOpen, setFilterOpen] = useState(false); // default closed on mobile
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile filter drawer

  const page     = parseInt(searchParams.get('page') || 1);
  const sort     = searchParams.get('sort')         || 'created_at';
  const order    = searchParams.get('order')        || 'desc';
  const category = searchParams.get('category')     || '';
  const brand    = searchParams.get('brand')        || '';
  const search   = searchParams.get('search')       || '';
  const minPrice = searchParams.get('min_price')    || '';
  const maxPrice = searchParams.get('max_price')    || '';
  const featured = searchParams.get('featured')     || '';
  const newArr   = searchParams.get('new_arrival')  || '';
  const inStock  = searchParams.get('in_stock')     || '';

  const setParam = (key, val) => {
    const p = new URLSearchParams(searchParams);
    val ? p.set(key, val) : p.delete(key);
    p.set('page', 1);
    setSearchParams(p);
    setDrawerOpen(false); // close mobile drawer after filter selection
  };

  const clearAll = () => { setSearchParams({}); setDrawerOpen(false); };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, sort, order, limit: 12 });
      if (category) q.set('category', category);
      if (brand)    q.set('brand',    brand);
      if (search)   q.set('search',   search);
      if (minPrice) q.set('min_price', minPrice);
      if (maxPrice) q.set('max_price', maxPrice);
      if (featured) q.set('featured', featured);
      if (newArr)   q.set('new_arrival', newArr);
      if (inStock)  q.set('in_stock', inStock);
      const res = await api.get(`/products?${q}`);
      setProducts(res.data.products);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {} finally { setLoading(false); }
  }, [page, sort, order, category, brand, search, minPrice, maxPrice, featured, newArr, inStock]);

  useEffect(() => {
    fetchProducts();
    api.get('/categories').then(r => setCategories(r.data.categories)).catch(() => {});
    api.get('/brands').then(r => setBrands(r.data.brands)).catch(() => {});
  }, [fetchProducts]);

  useEffect(() => {
    document.title = `Shop${search ? ` — "${search}"` : ''} — LUXE`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, search]);

  // Open desktop filters by default on large screens
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setFilterOpen(mq.matches);
    const handler = (e) => setFilterOpen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const hasFilters = category || brand || search || minPrice || maxPrice || featured || newArr || inStock;

  const activeFilterCount = [category, brand, minPrice || maxPrice, featured, newArr, inStock, search]
    .filter(Boolean).length;

  const priceRanges = [
    ['Under ₹1,000',    '',     '1000'],
    ['₹1,000–₹3,000',  '1000', '3000'],
    ['₹3,000–₹6,000',  '3000', '6000'],
    ['₹6,000–₹10,000', '6000', '10000'],
    ['Above ₹10,000',  '10000', ''],
  ];

  // ── Reusable filter chip ────────────────────────────────────
  const FilterChip = ({ label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`mr-1.5 mb-1.5 px-3 py-1.5 text-xs border transition-all duration-150 rounded-sm
        ${active
          ? 'border-luxury-black bg-luxury-black text-white'
          : 'border-gray-200 text-gray-600 hover:border-gray-400 hover:text-luxury-black bg-white'
        }`}
    >
      {label}
    </button>
  );

  const SectionTitle = ({ children }) => (
    <h4 className="text-[10px] font-semibold tracking-[2px] uppercase text-gray-400 mb-2.5">
      {children}
    </h4>
  );

  // ── Filter panel (shared by sidebar + drawer) ───────────────
  const FilterPanel = () => (
    <div className="space-y-5">
      {/* Active filters banner */}
      {hasFilters && (
        <div className="bg-amber-50 border border-amber-100 px-3 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-amber-700 font-medium">
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
          </span>
          <button onClick={clearAll} className="text-[11px] text-red-500 hover:text-red-700 underline font-medium">
            Clear all
          </button>
        </div>
      )}

      {/* Categories */}
      <div className="border-b border-gray-100 pb-4">
        <SectionTitle>Categories</SectionTitle>
        <div className="flex flex-wrap">
          <FilterChip label="All" active={!category} onClick={() => setParam('category', '')} />
          {categories.map(c => (
            <FilterChip key={c.id} label={c.name} active={category === c.slug}
              onClick={() => setParam('category', category === c.slug ? '' : c.slug)} />
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="border-b border-gray-100 pb-4">
        <SectionTitle>Price Range</SectionTitle>
        <div className="flex flex-wrap">
          {priceRanges.map(([label, min, max]) => (
            <FilterChip key={label} label={label}
              active={minPrice === min && maxPrice === max}
              onClick={() => { setParam('min_price', min); setParam('max_price', max); }}
            />
          ))}
        </div>
      </div>

      {/* Brands */}
      <div className="border-b border-gray-100 pb-4">
        <SectionTitle>Brands</SectionTitle>
        <div className="flex flex-wrap">
          {brands.slice(0, 10).map(b => (
            <FilterChip key={b.id} label={b.name} active={brand === b.slug}
              onClick={() => setParam('brand', brand === b.slug ? '' : b.slug)} />
          ))}
        </div>
      </div>

      {/* Collections */}
      <div>
        <SectionTitle>Collections</SectionTitle>
        <div className="flex flex-wrap">
          <FilterChip label="New Arrivals" active={newArr === 'true'}
            onClick={() => setParam('new_arrival', newArr === 'true' ? '' : 'true')} />
          <FilterChip label="Featured" active={featured === 'true'}
            onClick={() => setParam('featured', featured === 'true' ? '' : 'true')} />
          <FilterChip label="In Stock" active={inStock === 'true'}
            onClick={() => setParam('in_stock', inStock === 'true' ? '' : 'true')} />
        </div>
      </div>
    </div>
  );

  // ── Sort options ────────────────────────────────────────────
  const sortOptions = [
    ['Featured',         'is_featured:desc'],
    ['Newest',           'created_at:desc'],
    ['Price: Low–High',  'price:asc'],
    ['Price: High–Low',  'price:desc'],
    ['Top Rated',        'avg_rating:desc'],
    ['Best Selling',     'sold_count:desc'],
  ];

  // ── Pagination helper ───────────────────────────────────────
  const pageNumbers = () => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 4)  return [1, 2, 3, 4, 5, '...', pages];
    if (page >= pages - 3) return [1, '...', pages-4, pages-3, pages-2, pages-1, pages];
    return [1, '...', page-1, page, page+1, '...', pages];
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

      {/* ── PAGE HEADER ── */}
      <div className="mb-5 sm:mb-7">
        <h1 className="font-serif text-2xl sm:text-3xl">
          {search    ? `Results for "${search}"`
           : category ? category.charAt(0).toUpperCase() + category.slice(1)
           : 'All Products'}
        </h1>
        {!loading && (
          <p className="text-sm text-gray-400 mt-1">{total.toLocaleString()} products</p>
        )}
      </div>

      {/* ── TOOLBAR — filters toggle + sort ── */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-200 mb-6">

        {/* Left: filter toggle */}
        <div className="flex items-center gap-2">
          {/* Mobile: opens drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden btn btn-ghost btn-sm flex items-center gap-2 relative"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M3 6h18M7 12h10M11 18h2"/>
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gold text-luxury-black text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Desktop: toggles sidebar */}
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="hidden lg:flex btn btn-ghost btn-sm items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M3 6h18M7 12h10M11 18h2"/>
            </svg>
            {filterOpen ? 'Hide Filters' : 'Show Filters'}
          </button>

          {/* Active filter chips — visible on tablet+ */}
          {hasFilters && (
            <div className="hidden sm:flex items-center gap-2 overflow-x-auto">
              {category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-luxury-black text-white text-xs rounded-full flex-shrink-0">
                  {category}
                  <button onClick={() => setParam('category', '')} className="ml-0.5 hover:text-gold">✕</button>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-luxury-black text-white text-xs rounded-full flex-shrink-0">
                  {minPrice ? `₹${parseInt(minPrice).toLocaleString('en-IN')}` : '₹0'}–{maxPrice ? `₹${parseInt(maxPrice).toLocaleString('en-IN')}` : '∞'}
                  <button onClick={() => { setParam('min_price',''); setParam('max_price',''); }} className="ml-0.5 hover:text-gold">✕</button>
                </span>
              )}
              {newArr === 'true' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-luxury-black text-white text-xs rounded-full flex-shrink-0">
                  New Arrivals <button onClick={() => setParam('new_arrival','')} className="hover:text-gold">✕</button>
                </span>
              )}
              <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-600 underline flex-shrink-0">Clear all</button>
            </div>
          )}
        </div>

        {/* Right: sort */}
        <select
          className="form-select text-xs py-2 w-auto max-w-[160px] sm:max-w-none flex-shrink-0"
          value={`${sort}:${order}`}
          onChange={e => {
            const [s, o] = e.target.value.split(':');
            setParam('sort', s);
            setParam('order', o);
          }}
        >
          {sortOptions.map(([l, v]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* ── MOBILE FILTER DRAWER ── */}
      <>
        {/* Backdrop */}
        <div
          onClick={() => setDrawerOpen(false)}
          className={`lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300
            ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        />
        {/* Drawer panel */}
        <div className={`lg:hidden fixed inset-y-0 left-0 w-[85vw] max-w-sm bg-white z-50 flex flex-col shadow-2xl
          transition-transform duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>

          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="font-serif text-lg">Filters</h2>
            <button onClick={() => setDrawerOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-luxury-black transition-colors">
              ✕
            </button>
          </div>

          {/* Scrollable filter content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <FilterPanel />
          </div>

          {/* Drawer footer */}
          <div className="border-t border-gray-200 px-5 py-4 flex gap-3 flex-shrink-0 bg-white">
            <button onClick={clearAll} className="btn btn-ghost flex-1 justify-center text-xs">
              Clear All
            </button>
            <button onClick={() => setDrawerOpen(false)} className="btn btn-primary flex-1 justify-center text-xs">
              View {total} Products
            </button>
          </div>
        </div>
      </>

      {/* ── MAIN LAYOUT: sidebar + grid ── */}
      <div className="flex gap-8 items-start">

        {/* Desktop Sidebar */}
        {filterOpen && (
          <aside className="hidden lg:block w-52 xl:w-56 flex-shrink-0 sticky top-24">
            <FilterPanel />
          </aside>
        )}

        {/* ── PRODUCT GRID ── */}
        <div className="flex-1 min-w-0">

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-24 sm:py-32">
              <div className="spinner spinner-lg spinner-gold" />
            </div>
          )}

          {/* Empty */}
          {!loading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl sm:text-3xl mb-4">🔍</div>
              <h3 className="font-serif text-lg sm:text-xl mb-2">No products found</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-xs">
                {hasFilters ? 'Try adjusting or clearing your filters.' : 'No products available right now.'}
              </p>
              {hasFilters && (
                <button onClick={clearAll} className="btn btn-primary btn-sm">Clear All Filters</button>
              )}
            </div>
          )}

          {/* Grid */}
          {!loading && products.length > 0 && (
            <>
              {/* Responsive grid:
                  mobile (< sm): 2 cols
                  tablet sm–md:  2 cols
                  tablet lg:     3 cols (sidebar open) or 3 cols
                  desktop xl:    3 cols (sidebar open) or 4 cols
              */}
              <div className={`grid gap-3 sm:gap-4 lg:gap-5
                grid-cols-2
                ${filterOpen
                  ? 'md:grid-cols-3 xl:grid-cols-3'
                  : 'md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                {products.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {/* ── PAGINATION ── */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-1 sm:gap-2 mt-10 sm:mt-12 flex-wrap">
                  {/* Prev */}
                  <button
                    disabled={page <= 1}
                    onClick={() => setParam('page', page - 1)}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border border-gray-200 hover:border-luxury-black hover:bg-luxury-black hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  >←</button>

                  {/* Page numbers */}
                  {pageNumbers().map((p, i) =>
                    p === '...'
                      ? <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
                      : <button
                          key={p}
                          onClick={() => setParam('page', p)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border text-xs sm:text-sm transition-all
                            ${page === p
                              ? 'border-luxury-black bg-luxury-black text-white'
                              : 'border-gray-200 hover:border-gray-400 text-gray-600'
                            }`}
                        >{p}</button>
                  )}

                  {/* Next */}
                  <button
                    disabled={page >= pages}
                    onClick={() => setParam('page', page + 1)}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border border-gray-200 hover:border-luxury-black hover:bg-luxury-black hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  >→</button>
                </div>
              )}

              {/* Mobile page info */}
              <p className="text-center text-xs text-gray-400 mt-4 sm:hidden">
                Page {page} of {pages}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}