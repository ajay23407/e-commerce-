import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';
const catImages = {
  women:       'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=700&q=80&auto=format&fit=crop',
  men:         'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80&auto=format&fit=crop',
  accessories: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80&auto=format&fit=crop',
  footwear:    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80&auto=format&fit=crop',
  bags:        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80&auto=format&fit=crop',
};

// ── Hero slides — replace image URLs with your actual CDN images ──────────────
const SLIDES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
    eyebrow: 'Summer Collection 2025',
    title: ['Dress in', 'Timeless', 'Elegance'],
    titleItalic: 1, // index of italic line
    sub: 'Curated luxury fashion for the discerning individual. Every piece tells a story of craftsmanship, culture, and conscious design.',
    cta: { label: 'Shop the Collection', to: '/shop' },
    ctaSecondary: { label: 'New Arrivals', to: '/shop?new_arrival=true' },
    accent: '#C9A84C',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&q=80',
    eyebrow: 'Women\'s Edit',
    title: ['Effortless', 'Luxury,', 'Every Day'],
    titleItalic: 1,
    sub: 'Silhouettes that move with you. From silk midi dresses to structured blazers — the seasons most-wanted pieces.',
    cta:{ label: "Shop Women', to: '/shop?category=women" },
    ctaSecondary: { label: 'View Lookbook', to: '/shop' },
    accent: '#C9A84C',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1600&q=80',
    eyebrow: "Men's Collection",
    title: ['Refined', 'Modern', 'Sophistication'],
    titleItalic: 2,
    sub: 'Impeccable tailoring meets contemporary design. Elevate your wardrobe with pieces that command presence.',
    cta: { label: 'Shop Men', to: '/shop?category=men' },
    ctaSecondary: { label: 'New In', to: '/shop?new_arrival=true' },
    accent: '#C9A84C',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&q=80',
    eyebrow: 'Limited Time Offer',
    title: ['Summer Sale', 'Up to', '40% Off'],
    titleItalic: 2,
    sub: 'Shop our curated summer edit before it\'s gone. Certified authentic luxury brands at exceptional prices.',
    cta: { label: 'Shop the Sale', to: '/shop' },
    ctaSecondary: { label: 'View All Deals', to: '/shop?featured=true' },
    accent: '#C9A84C',
  },
];

// ── Hero Slideshow Component ───────────────────────────────────────────────────
function HeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev]       = useState(null);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState('next'); // 'next' | 'prev'
  const [paused, setPaused]   = useState(false);

  const goTo = useCallback((idx, dir = 'next') => {
    if (animating) return;
    setDirection(dir);
    setPrev(current);
    setAnimating(true);
    setCurrent(idx);
    setTimeout(() => {
      setPrev(null);
      setAnimating(false);
    }, 800);
  }, [animating, current]);

  const next = useCallback(() => goTo((current + 1) % SLIDES.length, 'next'), [goTo, current]);
  const prev_ = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length, 'prev'), [goTo, current]);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next, paused]);

  const slide = SLIDES[current];

  return (
    <section
      className="relative overflow-hidden"
      style={{ height: 'calc(100vh - 112px)', minHeight: 560 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Background images ── */}
      {SLIDES.map((s, i) => {
        const isActive = i === current;
        const isPrev   = i === prev;
        return (
          <div
            key={s.id}
            className="absolute inset-0 transition-none"
            style={{
              zIndex: isActive ? 2 : isPrev ? 1 : 0,
              opacity: isActive || isPrev ? 1 : 0,
            }}
          >
            <img
              src={s.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                transform: isActive
                  ? animating ? (direction === 'next' ? 'scale(1.06)' : 'scale(1.06)') : 'scale(1)'
                  : 'scale(1.06)',
                transition: isActive
                  ? 'transform 5s ease-out, opacity 0.8s ease'
                  : 'opacity 0.8s ease',
                opacity: isActive ? 1 : isPrev ? 0 : 0,
              }}
            />
            {/* Dark overlay — gradient from left */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(105deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.15) 100%)',
              }}
            />
          </div>
        );
      })}

      {/* ── Content ── */}
      <div className="relative z-10 h-full flex flex-col justify-center px-8 lg:px-20 max-w-screen-xl mx-auto">
        <div
          key={current}
          style={{ animation: 'heroFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-6">
            <span className="w-8 h-px bg-gold" />
            <span
              className="text-[10px] font-semibold tracking-[4px] uppercase"
              style={{ color: '#C9A84C' }}
            >
              {slide.eyebrow}
            </span>
          </div>

          {/* Title */}
          <h1
            className="font-serif leading-[1.05] mb-6 text-white"
            style={{ fontSize: 'clamp(2.8rem, 6vw, 5.5rem)' }}
          >
            {slide.title.map((line, li) => (
              <span key={li} className="block">
                {li === slide.titleItalic
                  ? <em className="italic" style={{ color: '#C9A84C' }}>{line}</em>
                  : line}
              </span>
            ))}
          </h1>

          {/* Subtitle */}
          <p className="text-white/60 text-base leading-relaxed max-w-md mb-10">
            {slide.sub}
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-4 flex-wrap">
            <Link to={slide.cta.to} className="btn btn-primary btn-lg">
              {slide.cta.label}
            </Link>
            <Link to={slide.ctaSecondary.to} className="btn btn-outline btn-lg" style={{ borderColor: 'rgba(255,255,255,0.35)', color: '#fff' }}>
              {slide.ctaSecondary.label}
            </Link>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="flex gap-10 mt-14 pt-10 border-t border-white/10">
          {[['12K+','Happy Clients'],['500+','Curated Pieces'],['4.9★','Average Rating']].map(([n, l]) => (
            <div key={l}>
              <p className="font-serif text-3xl text-white">{n}</p>
              <p className="text-[10px] text-white/40 tracking-[1.5px] uppercase mt-1">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Slide counter / dots ── */}
      <div className="absolute bottom-8 left-8 lg:left-20 z-10 flex items-center gap-3">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > current ? 'next' : 'prev')}
            className="relative overflow-hidden h-0.5 transition-all duration-500 focus:outline-none"
            style={{
              width: i === current ? 40 : 16,
              background: i === current ? '#C9A84C' : 'rgba(255,255,255,0.25)',
            }}
            aria-label={`Go to slide ${i + 1}`}
          >
            {i === current && (
              <span
                className="absolute inset-0 bg-white/30"
                style={{
                  animation: paused ? 'none' : 'slideProgress 5s linear forwards',
                }}
              />
            )}
          </button>
        ))}
        <span className="text-white/30 text-xs font-mono ml-2">
          {String(current + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </span>
      </div>

      {/* ── Prev / Next arrows ── */}
      <button
        onClick={prev_}
        className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-10 w-11 h-11 border border-white/20 flex items-center justify-center text-white hover:border-gold hover:text-gold transition-colors duration-300 focus:outline-none"
        aria-label="Previous slide"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <button
        onClick={next}
        className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-10 w-11 h-11 border border-white/20 flex items-center justify-center text-white hover:border-gold hover:text-gold transition-colors duration-300 focus:outline-none"
        aria-label="Next slide"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M9 5l7 7-7 7"/>
        </svg>
      </button>

      {/* ── Thumbnail strip (right side, desktop only) ── */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 hidden xl:flex flex-col gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i, i > current ? 'next' : 'prev')}
            className="relative overflow-hidden focus:outline-none transition-all duration-300"
            style={{
              width: 56,
              height: 70,
              opacity: i === current ? 1 : 0.45,
              outline: i === current ? '2px solid #C9A84C' : '2px solid transparent',
              outlineOffset: 2,
            }}
            aria-label={`Go to slide ${i + 1}`}
          >
            <img src={s.image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30" />
          </button>
        ))}
      </div>

      {/* ── Sale badge ── */}
      <div className="absolute bottom-8 right-20 lg:right-36 z-10 hidden lg:block">
        <span
          className="text-luxury-black text-[10px] font-bold tracking-[2px] uppercase px-5 py-2.5"
          style={{ background: '#C9A84C' }}
        >
          Up to 40% Off — Summer Sale
        </span>
      </div>

      {/* Keyframes injected inline */}
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideProgress {
          from { transform: scaleX(0); transform-origin: left; }
          to   { transform: scaleX(1); transform-origin: left; }
        }
      `}</style>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [featured, setFeatured]     = useState([]);
  const [newArrivals, setNew]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'LUXE — Premium Fashion Store';
    Promise.all([
      api.get('/products?featured=true&limit=8'),
      api.get('/products?new_arrival=true&limit=4'),
      api.get('/categories'),
    ]).then(([f, n, c]) => {
      setFeatured(f.data.products);
      setNew(n.data.products);
      setCategories(c.data.categories.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  

  const marqueeItems = ['New Arrivals','Summer Edit 2025','Free Returns','Sustainable Fashion','Members Only','Premium Brands'];

  return (
    <div>
      {/* ── HERO SLIDESHOW ── */}
      <HeroSlideshow />

      {/* ── MARQUEE ── */}
      <div className="bg-luxury-black py-3 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((t, i) => (
            <span key={i} className="inline-flex items-center text-[10px] font-medium tracking-[3px] uppercase text-white/60 px-8">
              {t}
              <span className="ml-8 w-1 h-1 rounded-full bg-gold flex-shrink-0" />
            </span>
          ))}
        </div>
      </div>

      {/* ── TRUST STRIP ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-gray-200">
        {[
          ['🚚','Free Shipping','On orders above ₹2,999'],
          ['↩️','Easy Returns','30-day hassle-free'],
          ['🔒','Secure Payment','100% safe transactions'],
          ['💎','Authentic','Certified luxury brands'],
        ].map(([icon, title, sub]) => (
          <div key={title} className="flex items-center gap-4 px-6 py-5 border-r border-gray-200 last:border-r-0">
            <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">{icon}</div>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── CATEGORIES ── */}
     <section className="py-20 max-w-screen-xl mx-auto px-6">
  <div className="flex items-end justify-between mb-10">
    <div>
      <p className="section-eyebrow">Browse by</p>
      <h2 className="font-serif text-4xl">Shop by Category</h2>
    </div>
    <Link to="/shop" className="text-[11px] tracking-[2px] uppercase text-gray-400 border-b border-gray-300 pb-0.5 hover:text-luxury-black hover:border-luxury-black transition-colors">
      View All
    </Link>
  </div>

  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3" style={{ gridTemplateRows: '280px 280px' }}>
    {categories.map((cat, i) => (
      <div key={cat.id}
        onClick={() => navigate(`/shop?category=${cat.slug}`)}
        className={`relative overflow-hidden cursor-pointer group bg-gray-900
          ${i === 0 ? 'row-span-2' : ''}`}
      >
        {/* Real image */}
        <img
          src={catImages[cat.slug] || 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=700&q=80&auto=format&fit=crop'}
          alt={cat.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-75 group-hover:brightness-50"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        {/* Label */}
        <div className="absolute bottom-6 left-6">
          <h3 className={`font-serif text-white mb-1 ${i === 0 ? 'text-3xl' : 'text-xl'}`}>{cat.name}</h3>
          <p className="text-[11px] text-white/50">{cat.product_count} Items</p>
        </div>
        {/* Arrow */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-sm">→</span>
        </div>
      </div>
    ))}
  </div>
</section>

      {/* ── FEATURED PRODUCTS ── */}
      <section className="pb-20 max-w-screen-xl mx-auto px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="section-eyebrow">Hand-picked</p>
            <h2 className="font-serif text-4xl">Featured Products</h2>
          </div>
          <Link to="/shop?featured=true" className="text-[11px] tracking-[2px] uppercase text-gray-400 border-b border-gray-300 pb-0.5 hover:text-luxury-black hover:border-luxury-black transition-colors">
            See All
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="spinner spinner-lg spinner-gold" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featured.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* ── PROMO BANNER ── */}
      <section className="bg-luxury-black py-0 overflow-hidden">
  <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 min-h-[560px]">

    {/* Left: Editorial image with floating accent */}
    <div className="relative overflow-hidden min-h-[360px] lg:min-h-0">
      <img
        src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=900&q=80&auto=format&fit=crop"
        alt="Summer Sale"
        className="absolute inset-0 w-full h-full object-cover brightness-75 saturate-90"
      />
      {/* Gold badge */}
      <div className="absolute top-7 left-7 w-[88px] h-[88px] rounded-full bg-gold flex flex-col items-center justify-center text-luxury-black z-10">
        <span className="font-serif text-2xl font-light leading-none">40%</span>
        <span className="text-[10px] tracking-[2px] uppercase font-medium">Off</span>
      </div>
      {/* Floating accent image */}
      <div className="absolute bottom-8 right-0 w-[150px] h-[190px] border-4 border-luxury-black shadow-2xl z-10 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=80&auto=format&fit=crop"
          alt="Summer fashion"
          className="w-full h-full object-cover"
        />
      </div>
    </div>

    {/* Right: Copy */}
    <div className="flex flex-col justify-center px-10 lg:px-16 py-16">
      <p className="text-[10px] font-medium tracking-[4px] uppercase text-gold mb-4">Limited Time Offer</p>
      <h2 className="font-serif text-5xl text-white leading-tight mb-6">
        Summer<br />
        <em className="text-gold">Edit '26</em>
      </h2>
      <p className="text-white/50 text-base leading-relaxed mb-8 max-w-sm">
        Our most coveted summer pieces, curated for those who dress with intention. Limited stock. Unlimited elegance.
      </p>
      <Link to="/shop" className="btn btn-gold btn-lg self-start">Shop the Sale →</Link>

      {/* Stats bar */}
      <div className="flex gap-10 mt-12 pt-8 border-t border-white/10">
        <div>
          <p className="font-serif text-2xl text-white font-light">200+</p>
          <p className="text-[10px] tracking-[2px] uppercase text-white/30 mt-1">Styles</p>
        </div>
        <div>
          <p className="font-serif text-2xl text-white font-light">3 Days</p>
          <p className="text-[10px] tracking-[2px] uppercase text-white/30 mt-1">Left</p>
        </div>
        <div>
          <p className="font-serif text-2xl text-white font-light">Free</p>
          <p className="text-[10px] tracking-[2px] uppercase text-white/30 mt-1">Shipping</p>
        </div>
      </div>
    </div>

  </div>
</section>

      {/* ── NEW ARRIVALS ── */}
      {!loading && newArrivals.length > 0 && (
        <section className="py-20 max-w-screen-xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="section-eyebrow">Just In</p>
              <h2 className="font-serif text-4xl">New Arrivals</h2>
            </div>
            <Link to="/shop?new_arrival=true" className="text-[11px] tracking-[2px] uppercase text-gray-400 border-b border-gray-300 pb-0.5 hover:text-luxury-black hover:border-luxury-black transition-colors">
              See All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {newArrivals.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
      <section className="bg-luxury-black py-20">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[10px] font-medium tracking-[4px] uppercase text-gold mb-3">What Clients Say</p>
            <h2 className="font-serif text-4xl text-white">Loved by Thousands</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name:'Priya Ramesh', loc:'Mumbai', stars:5, text:'Absolutely stunning quality. The silk dress fits perfectly and I\'ve received so many compliments. LUXE is now my go-to store!', initials:'PR' },
              { name:'Arjun Kumar',  loc:'Delhi',  stars:5, text:'Delivery was super fast and packaging was beautiful. This is luxury shopping done right. I order every month now.', initials:'AK' },
              { name:'Sneha Nair',   loc:'Bangalore', stars:5, text:'The return process was seamless and customer service was exceptional. Rare to find this level of service in fashion.', initials:'SN' },
            ].map(t => (
              <div key={t.name}
                className="border border-white/10 p-8 hover:border-gold/50 transition-colors duration-300 group">
                <div className="flex gap-0.5 mb-5">
                  {[...Array(t.stars)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="font-serif text-base italic text-white/75 leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center text-luxury-black text-sm font-semibold flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-white/40">{t.loc}, India</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}