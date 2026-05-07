import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Footer() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.includes('@')) { toast.error('Please enter a valid email.'); return; }
    setLoading(true);
    setTimeout(() => {
      toast.success('Subscribed! Check your inbox 🎁');
      setEmail(''); setLoading(false);
    }, 800);
  };

  const cols = [
    { title: 'Company',       links: [['About Us','/about'],['Careers','/careers'],['Press','/press'],['Sustainability','/sustainability'],['Blog','/blog']] },
    { title: 'Customer Care', links: [['Help Centre','/help'],['Returns','/returns'],['Shipping Info','/shipping'],['Size Guide','/size-guide'],['Track Order','/track']] },
    { title: 'Legal',         links: [['Privacy Policy','/privacy'],['Terms of Service','/terms'],['Cookie Policy','/cookies'],['Accessibility','/accessibility']] },
  ];

  return (
    <footer className="bg-luxury-black text-white/60">
      {/* Newsletter */}
      <div className="border-b border-white/10 py-16">
        <div className="max-w-screen-xl mx-auto px-6 text-center">
          <p className="text-[10px] font-medium tracking-[4px] uppercase text-gold mb-3">Stay in the loop</p>
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-3">Get Exclusive Access</h2>
          <p className="text-white/50 text-sm mb-8 max-w-md mx-auto leading-relaxed">
            Early access to new arrivals, members-only sales, and style inspiration. No spam, ever.
          </p>
          <form onSubmit={handleSubscribe} className="flex max-w-md mx-auto border border-white/15">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-transparent border-none outline-none px-5 py-3.5 text-sm text-white placeholder-white/30"
            />
            <button type="submit" disabled={loading}
              className="px-6 py-3.5 bg-gold text-luxury-black text-[11px] font-semibold tracking-[2px] uppercase hover:bg-gold-dark hover:text-white transition-colors disabled:opacity-60 flex-shrink-0">
              {loading ? '...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>

      {/* Main grid */}
      <div className="max-w-screen-xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Link to="/" className="font-serif text-2xl tracking-[6px] text-white block mb-4">
              LUX<span className="text-gold">E</span>
            </Link>
            <p className="text-sm leading-relaxed text-white/50 mb-6 max-w-xs">
              A curated destination for premium fashion, accessories, and lifestyle. Crafted for those who appreciate true quality.
            </p>
            <div className="flex gap-3">
              {[
  { icon: 'X', label: 'Twitter', url: '' },
  { icon: '◻', label: 'Instagram', url: '' },
  { icon: 'f', label: 'Facebook', url: '' },
  { icon: '▶', label: 'YouTube', url: '' },
].map((s) => (
  s.url ? (
    <a
      key={s.label}
      href={s.url}
      target="_blank"
      rel="noreferrer"
      title={s.label}
      className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-sm text-white/60 hover:border-gold hover:text-gold transition-all duration-200"
    >
      {s.icon}
    </a>
  ) : (
    <button
      key={s.label}
      type="button"
      title={s.label}
      className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-sm text-white/60 hover:border-gold hover:text-gold transition-all duration-200 cursor-default"
    >
      {s.icon}
    </button>
  )
))}
            </div>
          </div>

          {/* Link columns */}
          {cols.map(col => (
            <div key={col.title}>
              <h4 className="text-[10px] font-semibold tracking-[2.5px] uppercase text-white mb-5">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to}
                      className="text-sm text-white/50 hover:text-gold transition-colors duration-200">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">© 2025 LUXE. All rights reserved. Made in India 🇮🇳</p>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {['VISA','MC','UPI','GPAY','PAYTM','AMEX'].map(p => (
              <span key={p} className="px-3 py-1 border border-white/10 text-[10px] tracking-wider text-white/35 rounded-sm">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
