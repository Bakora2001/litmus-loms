import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, TrendingUp, PieChart, Laptop, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Background slide images ────────────────────────────────────────────────
// To use your own images:
//   1. Drop them into /frontend/public/  (e.g. slide1.jpg, slide2.jpg, …)
//   2. Add their paths to the array below.
const SLIDES = [
  { src: '/slide1.jpg', caption: 'Powering Your Business' },
  { src: '/slide2.jpg', caption: 'Cyber Services & Security' },
  { src: '/slide3.jpg', caption: 'Premium Laptop Store' },
];

// ─── Slide caption overlay cards ────────────────────────────────────────────
const FEATURE_CARDS = [
  { icon: ShieldCheck, title: 'Smart Management',   sub: 'Manage your business smarter'  },
  { icon: TrendingUp,  title: 'Better Performance', sub: 'Track, analyze and grow'        },
  { icon: PieChart,    title: 'More Profit',        sub: 'Increase efficiency and profit' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  // Form state
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember,     setRemember]     = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  // Slideshow state
  const [current,  setCurrent]  = useState(0);
  const [fading,   setFading]   = useState(false);

  // Auto-advance every 5 s
  useEffect(() => {
    const id = setInterval(() => goTo((current + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, [current]);

  function goTo(index: number) {
    if (index === current) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(index);
      setFading(false);
    }, 400);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (err?.message === 'Network Error'
          ? 'Cannot reach the server. Make sure the backend is running.'
          : 'Unable to sign in. Please check your details and try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-white">

      {/* ── Left hero / slideshow panel ── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden">

        {/* Slide images */}
        {SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
            style={{
              backgroundImage: `url(${slide.src})`,
              opacity: i === current ? (fading ? 0 : 1) : 0,
              transitionProperty: 'opacity',
            }}
          />
        ))}

        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.72) 100%), ' +
              'radial-gradient(circle at 20% 20%, rgba(193,18,31,0.28), transparent 45%)',
          }}
        />

        {/* Slide navigation dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="transition-all duration-300 rounded-full"
              style={{
                width:  i === current ? 24 : 8,
                height: 8,
                background: i === current ? '#C1121F' : 'rgba(255,255,255,0.4)',
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Prev / Next arrows */}
        <button
          onClick={() => goTo((current - 1 + SLIDES.length) % SLIDES.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition"
          aria-label="Previous slide"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => goTo((current + 1) % SLIDES.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition"
          aria-label="Next slide"
        >
          <ChevronRight size={18} />
        </button>

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12 text-center z-10">
          {/* Logo */}
          <svg width="80" height="80" viewBox="0 0 64 64" fill="none" className="mb-4">
            <rect width="64" height="64" rx="16" fill="rgba(26,26,26,0.7)" stroke="#C1121F" strokeWidth="1.5" />
            <path d="M20 14h8v26h16v8H20z" fill="#C1121F" />
            <path d="M44 14a14 14 0 1 1 -14 14" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
          </svg>

          <h1 className="text-3xl font-extrabold text-white drop-shadow">
            <span className="text-red-400">Litmus</span> Solutions
          </h1>
          <p className="text-gray-300 text-sm mt-1 mb-2">Cyber Services &amp; Laptop Store</p>

          {/* Slide caption */}
          <div
            className="mt-1 mb-8 text-white/70 text-xs font-medium tracking-widest uppercase transition-opacity duration-500"
            style={{ opacity: fading ? 0 : 1 }}
          >
            — {SLIDES[current].caption} —
          </div>

          {/* Feature cards */}
          <div className="w-full max-w-md space-y-3 text-left">
            {FEATURE_CARDS.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur-sm"
              >
                <div className="w-9 h-9 rounded-lg bg-red-600/80 flex items-center justify-center shrink-0">
                  <item.icon size={17} className="text-white" />
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{item.title}</div>
                  <div className="text-gray-300 text-xs">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick-access chips */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-6">
            {[
              { icon: Laptop,      label: 'Laptops',      sub: '120+ models'   },
              { icon: ShieldCheck, label: 'Accessories',  sub: 'Genuine parts' },
              { icon: TrendingUp,  label: 'Cyber Desk',   sub: 'Fast service'  },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-white/8 border border-white/10 p-4 flex flex-col items-center gap-2 backdrop-blur-sm"
              >
                <item.icon size={20} className="text-red-400" />
                <div className="text-white text-xs font-semibold">{item.label}</div>
                <div className="text-gray-400 text-[10px]">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12 py-12 bg-white">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="16" fill="#1a1a1a" stroke="#C1121F" strokeWidth="1.5" />
              <path d="M20 14h8v26h16v8H20z" fill="#C1121F" />
              <path d="M44 14a14 14 0 1 1 -14 14" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
            </svg>
            <span className="text-xl font-extrabold text-gray-900">
              <span className="text-red-600">Litmus</span> Solutions
            </span>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            Welcome Back! <span>👋</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1 mb-8">Sign in to continue to your account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5 flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="label-sm">Email Address</label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="input-field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label-sm">Password</label>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500/30"
                />
                Remember me
              </label>
              <a href="#" className="text-red-600 font-medium hover:underline">
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Divider */}
            <div className="relative py-1 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <span className="relative bg-white px-3 text-xs text-gray-400">or continue with</span>
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="btn-secondary flex items-center justify-center gap-2 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.85z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.85C6.71 7.3 9.14 5.38 12 5.38z"/></svg>
                Google
              </button>
              <button type="button" className="btn-secondary flex items-center justify-center gap-2 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24"><rect width="10" height="10" x="2" y="2" fill="#F35325"/><rect width="10" height="10" x="12" y="2" fill="#81BC06"/><rect width="10" height="10" x="2" y="12" fill="#05A6F0"/><rect width="10" height="10" x="12" y="12" fill="#FFBA08"/></svg>
                Microsoft
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 pt-2">
              Don't have an account?{' '}
              <a href="#" className="text-red-600 font-semibold hover:underline">
                Contact Admin
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
