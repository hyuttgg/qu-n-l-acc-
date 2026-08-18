import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { Compass, Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck, Zap, Server } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { ReCaptcha } from '../components/ReCaptcha';
import type { ReCaptchaRef } from '../components/ReCaptcha';
import { TreasureMapAnimation } from '../components/TreasureMapAnimation';
import DecryptedText from '../components/DecryptedText';

export const LoginPage: React.FC = () => {
  const { login, user } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState<boolean>(false);
  const recaptchaRef = useRef<ReCaptchaRef>(null);

  // Mouse spotlight tracker
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const apiUrl = (import.meta.env.VITE_API_URL || 'https://quan-ly-acc-viet-nam.onrender.com').trim().replace(/\/+$/, '');
    fetch(`${apiUrl}/api/health`).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'discord_ip_limit') {
      setError('Địa chỉ IP của bạn đã đăng ký quá số lượng tài khoản Discord cho phép (Tối đa 3).');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error') === 'oauth_failed') {
      const reason = params.get('reason');
      const cleanReason = (reason && reason !== '{}' && reason !== '[object Object]') ? decodeURIComponent(reason) : '';
      setError(cleanReason ? `Đăng nhập thất bại: ${cleanReason}` : 'Đăng nhập bằng mạng xã hội thất bại. Vui lòng thử lại.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setSocialLoading(true);
    const backendUrl = (import.meta.env.VITE_API_URL || 'https://quan-ly-acc-viet-nam.onrender.com').trim().replace(/\/+$/, '');
    try {
      // Warm up backend before redirecting to ensure instant OAuth code exchange
      await fetch(`${backendUrl}/api/health`, { method: 'GET', cache: 'no-store' }).catch(() => {});
    } finally {
      window.location.href = `${backendUrl}/api/auth/google`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (captchaRequired && !captchaToken) {
      return setError('Please complete the reCAPTCHA');
    }

    setLoading(true);
    const res = await login(email, password, captchaToken || undefined);
    setLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message || 'Invalid email or password');
      if (res.captchaRequired) {
        setCaptchaRequired(true);
      }
      recaptchaRef.current?.reset();
    }
  };

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="liquid-ambient-bg min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
    >
      {/* Dynamic Cursor Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0 opacity-40"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 242, 254, 0.15), rgba(212, 175, 55, 0.08) 40%, transparent 80%)`,
        }}
      />

      {/* Floating Ocean Wave Background */}
      <div className="wave-container opacity-40">
        <div className="wave wave1" />
        <div className="wave wave2" />
        <div className="wave wave3" />
      </div>

      {/* Floating Orbs */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          x: [0, 15, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-12 left-12 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          y: [0, 25, 0],
          x: [0, -20, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-12 right-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"
      />

      {/* Main Glass Card */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="liquid-glass w-full max-w-4xl flex flex-col md:flex-row overflow-hidden relative z-10 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/10"
      >
        {/* Left Side: Animated Theme Graphic */}
        <div className="flex-1 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-blue-950/50 p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 relative overflow-hidden">
          {/* Subtle Ambient Background Mesh */}
          <div className="absolute inset-0 bg-[radial-gradient(#00f2fe_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

          <motion.div variants={itemVariants} className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Compass className="w-9 h-9 text-cyan-400 animate-spin-slow" style={{ animationDuration: '25s' }} />
                <div className="absolute inset-0 bg-cyan-400/30 rounded-full blur-md animate-pulse" />
              </div>
              <span className="text-xl font-black tracking-widest text-gradient-cyan">
                OCEANFORGE
              </span>
            </div>

            <span className="liquid-pill text-cyan-300 border-cyan-500/30 bg-cyan-950/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              v3.6 Live
            </span>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-4 my-8 md:my-0 relative z-10">
            <h2 className="text-3xl font-black text-white leading-tight">
              REGAIN CONTROL OF THE{' '}
              <span className="text-gradient-gold glow-gold">SEAS</span>
            </h2>

            <p className="text-slate-400 text-sm leading-relaxed">
              Log in to your command center. Monitor live account farming, manage session tokens, and track real-time fleet analytics.
            </p>

            {/* Treasure Map Animation */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="mt-2"
            >
              <TreasureMapAnimation />
            </motion.div>

            {/* Live Stats Floating Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 text-center backdrop-blur-md">
                <div className="flex items-center justify-center gap-1 text-cyan-400 mb-0.5">
                  <Server className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">1,480</span>
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Active Fleet</div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 text-center backdrop-blur-md">
                <div className="flex items-center justify-center gap-1 text-emerald-400 mb-0.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">99.9%</span>
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Uptime</div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 text-center backdrop-blur-md">
                <div className="flex items-center justify-center gap-1 text-amber-400 mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">Encrypted</span>
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">SSL 256-bit</div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="text-slate-500 text-xs font-medium relative z-10 flex items-center justify-between">
            <span>&copy; {new Date().getFullYear()} OceanForge OS.</span>
            <span className="text-slate-400/60 font-mono text-[10px]">BUILD 2026.08</span>
          </motion.div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-8 md:p-10 bg-slate-950/60 backdrop-blur-2xl flex flex-col justify-center">
          <motion.div variants={itemVariants} className="mb-6">
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <DecryptedText text="Welcome Back" speed={40} maxIterations={8} animateOn="view" />
            </h3>
            <p className="text-slate-400 text-sm mt-1">Enter your credentials to set sail</p>
          </motion.div>

          {/* Animated Error Alert */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5 backdrop-blur-md shadow-lg shadow-rose-950/20"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div variants={itemVariants}>
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Email Address</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 group-focus-within:text-cyan-400 transition-colors pointer-events-none">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="king@grandline.com"
                  className="w-full liquid-input !pl-11 focus:ring-cyan-500/30 transition-all duration-200"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider">Password</label>
                <a href="#" className="text-xs text-cyan-400 hover:text-cyan-300 transition font-semibold hover:underline">Forgot password?</a>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 group-focus-within:text-cyan-400 transition-colors pointer-events-none">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full liquid-input !pl-11 !pr-11 focus:ring-cyan-500/30 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white transition cursor-pointer"
                >
                  <motion.div whileTap={{ scale: 0.85 }}>
                    {showPassword ? <EyeOff className="w-5 h-5 text-cyan-400" /> : <Eye className="w-5 h-5" />}
                  </motion.div>
                </button>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center justify-between pt-1">
              <label htmlFor="remember" className="flex items-center gap-2.5 text-xs text-slate-400 select-none cursor-pointer group">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 bg-slate-900 border-slate-700 text-cyan-400 rounded focus:ring-0 cursor-pointer accent-cyan-500"
                />
                <span className="group-hover:text-slate-300 transition">Remember this device</span>
              </label>
            </motion.div>

            {captchaRequired && (
              <motion.div variants={itemVariants}>
                <ReCaptcha
                  siteKey={(import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim()}
                  onChange={setCaptchaToken}
                  ref={recaptchaRef}
                />
              </motion.div>
            )}

            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.015, boxShadow: '0 12px 35px rgba(212,175,55,0.4)' }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 liquid-btn-gold text-slate-950 font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>LOGGING IN...</span>
                </div>
              ) : (
                'LOG IN TO DASHBOARD'
              )}
            </motion.button>
          </form>

          {/* Social Logins */}
          <motion.div variants={itemVariants} className="mt-6">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10" />
              <span className="flex-shrink mx-4 text-xs font-bold text-slate-500 uppercase tracking-widest">or continue with</span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            <div className="mt-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                disabled={socialLoading || loading}
                onClick={handleGoogleLogin}
                className="w-full py-3 px-4 rounded-xl liquid-btn-glass flex items-center justify-center gap-2.5 text-xs font-bold transition cursor-pointer disabled:opacity-60"
              >
                {socialLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.2-.7-.4-1.5-.4-2.3z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                  </svg>
                )}
                <span>{socialLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </motion.button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-cyan-400 font-bold hover:underline transition">
              Register here
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

