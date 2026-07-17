import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, TrendingUp, PieChart, Laptop, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import litmusLogo from '../assets/litmus-logo.png';

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
              'linear-gradient(to bottom, rgba(10,10,10,0.25) 0%, rgba(10,10,10,0.45) 100%), ' +
              'radial-gradient(circle at 20% 20%, rgba(193,18,31,0.18), transparent 45%)',
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
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12 text-left z-10">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            {/* Logo + Company Name - White bg */}
            <div className="bg-white px-8 py-6 flex items-center gap-4">
              <img
                src={litmusLogo}
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = 'none';
                  if (el.nextSibling) (el.nextSibling as HTMLElement).style.display = 'flex';
                }}
                className="h-16 w-16 object-contain flex-shrink-0"
                alt="Litmus Logo"
              />
              <div style={{ display: 'none' }} className="w-14 h-14 rounded-full bg-litmus-red flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                L
              </div>
              <div>
                <h1 className="text-xl font-black text-litmus-black leading-none tracking-tight">
                  LITMUS TECH SOLUTIONS
                </h1>
                <p className="text-litmus-red text-[11px] font-bold tracking-widest uppercase mt-1">
                  Technology for You
                </p>
                <p className="text-gray-400 text-[10px] mt-0.5 leading-snug">
                  Design • Printing • Branding • ICT Solutions
                </p>
              </div>
            </div>

            {/* Dark body with contact info */}
            <div className="bg-black/60 backdrop-blur-md px-8 py-5 space-y-3">
              <h3 className="text-litmus-red text-[10px] font-bold uppercase tracking-wider">
                Contact Information
              </h3>
              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex items-start gap-2.5">
                  <span className="shrink-0 text-sm">📍</span>
                  <span>P.o Box 33058-30100 Eldoret-Kenya</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="shrink-0 text-sm">📞</span>
                  <span>+254 723 005 182</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="shrink-0 text-sm">📧</span>
                  <a href="mailto:info@litmussolutions.co.ke" className="hover:underline hover:text-white transition">
                    info@litmussolutions.co.ke
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="shrink-0 text-sm">🌐</span>
                  <a href="http://www.litmussolutions.co.ke" target="_blank" rel="noreferrer" className="hover:underline hover:text-white transition">
                    www.litmussolutions.co.ke
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12 py-12 bg-white">
        <div className="w-full max-w-sm">

          {/* Logo for right panel */}
          <div className="mb-8 flex items-center gap-3">
            <img
              src={litmusLogo}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              className="h-12 w-12 object-contain"
              alt="Litmus Logo"
            />
            <div>
              <div className="text-lg font-black text-litmus-black leading-tight">LITMUS TECH SOLUTIONS</div>
              <div className="text-[10px] text-litmus-red font-bold tracking-widest uppercase">Technology for You</div>
            </div>
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
