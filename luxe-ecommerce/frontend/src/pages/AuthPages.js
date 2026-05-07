import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-luxury-black p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#C9A84C 0,#C9A84C 1px,transparent 0,transparent 50%)', backgroundSize: '24px 24px' }} />
        <Link to="/" className="font-serif text-4xl tracking-[8px] text-white mb-12">
          LUX<span className="text-gold">E</span>
        </Link>
        <blockquote className="font-serif text-xl italic text-white/60 text-center leading-relaxed max-w-xs mb-4">
          "Style is a way to say who you are without having to speak."
        </blockquote>
        <cite className="text-[10px] tracking-[3px] uppercase text-gold">— Rachel Zoe</cite>

        <div className="flex gap-10 mt-20 pt-10 border-t border-white/10 w-full justify-center">
          {[['10K+','Customers'],['500+','Products'],['4.9★','Rating']].map(([n, l]) => (
            <div key={l} className="text-center">
              <p className="font-serif text-2xl text-gold">{n}</p>
              <p className="text-[10px] tracking-[1.5px] uppercase text-white/40 mt-1">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col items-center justify-center min-h-screen bg-luxury-cream px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden font-serif text-2xl tracking-[6px] text-luxury-black block text-center mb-10">
            LUX<span className="text-gold">E</span>
          </Link>
          <h1 className="font-serif text-3xl mb-2">{title}</h1>
          <p className="text-gray-400 text-sm mb-8">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user) navigate(from, { replace: true });
    if (new URLSearchParams(location.search).get('expired'))
      toast.error('Session expired. Please log in again.');
  }, [user, navigate, from, location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      navigate(res.user.role === 'admin' ? '/admin' : from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your LUXE account to continue">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="form-label">Email Address</label>
          <input type="email" className="form-input" placeholder="you@example.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="form-label mb-0">Password</label>
            <Link to="/forgot-password" className="text-xs text-gold-dark hover:text-gold transition-colors">Forgot password?</Link>
          </div>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} className="form-input pr-12" placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-sm">
              {showPwd ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Demo hint */}
        <div className="bg-blue-50 border border-blue-100 p-3.5 text-xs text-blue-700 leading-relaxed">
          <strong>Demo accounts:</strong><br />
          Customer: customer@luxe.com / Customer@123<br />
          Admin: admin@luxe.com / Admin@123
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg justify-center mt-2">
          {loading
            ? <><div className="spinner spinner-sm spinner-white" /> Signing in...</>
            : 'Sign In →'
          }
        </button>

        <p className="text-center text-sm text-gray-400 pt-2">
          Don't have an account?{' '}
          <Link to="/register" className="text-luxury-black font-medium hover:text-gold transition-colors">Create one →</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);

  const getStrength = (p) => {
    if (!p) return { label: '', color: 'bg-gray-200', w: '0%' };
    if (p.length < 6)  return { label: 'Weak',   color: 'bg-red-400',   w: '25%' };
    if (p.length < 10) return { label: 'Fair',   color: 'bg-amber-400', w: '50%' };
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label: 'Good', color: 'bg-blue-400', w: '75%' };
    return { label: 'Strong', color: 'bg-green-500', w: '100%' };
  };

  const strength = getStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('Please fill all required fields.'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Create account" subtitle="Join LUXE and discover premium fashion">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Full Name *</label>
          <input type="text" className="form-input" placeholder="Priya Sharma"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Email Address *</label>
          <input type="email" className="form-input" placeholder="you@example.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Phone <span className="normal-case tracking-normal text-gray-400">(optional)</span></label>
          <input type="tel" className="form-input" placeholder="+91 98765 43210"
            value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Password *</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} className="form-input pr-12" placeholder="Min. 8 characters"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
              {showPwd ? '🙈' : '👁️'}
            </button>
          </div>
          {form.password && (
            <div className="mt-2">
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${strength.color} rounded-full transition-all duration-500`} style={{ width: strength.w }} />
              </div>
              <p className="text-[11px] mt-1" style={{ color: strength.color.includes('red') ? '#f87171' : strength.color.includes('amber') ? '#fbbf24' : strength.color.includes('blue') ? '#60a5fa' : '#4ade80' }}>
                {strength.label} password
              </p>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-100 p-3.5 text-xs text-amber-700">
          🎁 Use code <strong>WELCOME10</strong> on your first order for 10% off!
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg justify-center">
          {loading
            ? <><div className="spinner spinner-sm spinner-white" /> Creating Account...</>
            : 'Create Account →'
          }
        </button>

        <p className="text-center text-xs text-gray-400">
          By signing up you agree to our{' '}
          <Link to="/terms" className="text-luxury-black hover:text-gold transition-colors">Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-luxury-black hover:text-gold transition-colors">Privacy Policy</Link>
        </p>

        <p className="text-center text-sm text-gray-400 pt-1">
          Already have an account?{' '}
          <Link to="/login" className="text-luxury-black font-medium hover:text-gold transition-colors">Sign in →</Link>
        </p>
      </form>
    </AuthShell>
  );
}
