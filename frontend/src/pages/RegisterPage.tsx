import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { Compass, User, Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck, Zap, Server } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { ReCaptcha } from '../components/ReCaptcha';
import type { ReCaptchaRef } from '../components/ReCaptcha';
import { TreasureMapAnimation } from '../components/TreasureMapAnimation';
import DecryptedText from '../components/DecryptedText';

export const RegisterPage: React.FC = () => {
  const { register } = useApp();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCaptchaRef>(null);

  // Password criteria checkers
  const isLongEnough = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const isPasswordValid = isLongEnough && hasUpper && hasNum;

  // Mouse spotlight tracker
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLongEnough) {
      return setError('Mật khẩu phải có ít nhất 8 ký tự');
    }

    if (!hasUpper) {
      return setError('Mật khẩu phải chứa ít nhất 1 chữ cái in hoa (A-Z)');
    }

    if (!hasNum) {
      return setError('Mật khẩu phải chứa ít nhất 1 chữ số (0-9)');
    }

    if (password !== confirmPassword) {
      return setError('Mật khẩu xác nhận không khớp');
    }

    if (!captchaToken) {
      return setError('Vui lòng xác thực Cloudflare Turnstile Captcha');
    }

    setLoading(true);
    const res = await register(username, email, password, captchaToken);
    setLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message || 'Đăng ký không thành công');
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
        staggerChildren: 0.07,
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

      {/* Wave Background */}
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
        className="absolute top-12 left-12 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          y: [0, 25, 0],
          x: [0, -20, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-12 right-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"
      />

      {/* Main Glass Card */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="liquid-glass w-full max-w-4xl flex flex-col md:flex-row overflow-hidden relative z-10 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/10"
      >
        {/* Left Side: Theme Graphic */}
        <div className="flex-1 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-blue-950/50 p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#00f2fe_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

          <motion.div variants={itemVariants} className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Compass className="w-9 h-9 text-amber-400 animate-spin-slow" style={{ animationDuration: '25s' }} />
                <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-md animate-pulse" />
              </div>
              <span className="text-xl font-black tracking-widest text-gradient-gold glow-gold">
                OCEANFORGE
              </span>
            </div>

            <span className="liquid-pill text-amber-300 border-amber-500/30 bg-amber-950/40">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Join Crew
            </span>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-4 my-8 md:my-0 relative z-10">
            <h2 className="text-3xl font-black text-white leading-tight">
              JOIN THE <span className="text-gradient-gold glow-gold">FLEET</span> CREW
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Create an account to deploy your API webhook. Manage infinite Roblox bots, trace drops, compile level charts, and share live data.
            </p>

            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="mt-2"
            >
              <TreasureMapAnimation />
            </motion.div>

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
                  <span className="text-xs font-bold">Instant</span>
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Setup</div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 text-center backdrop-blur-md">
                <div className="flex items-center justify-center gap-1 text-amber-400 mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">Secure</span>
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">API Webhook</div>
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
          <motion.div variants={itemVariants} className="mb-5">
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <DecryptedText text="Create Account" speed={40} maxIterations={8} animateOn="view" />
            </h3>
            <p className="text-slate-400 text-sm mt-1">Get started tracking your characters</p>
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="mb-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5 backdrop-blur-md shadow-lg shadow-rose-950/20"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <motion.div variants={itemVariants}>
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-1.5">Username</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 group-focus-within:text-cyan-400 transition-colors pointer-events-none">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="pirate_king"
                  className="w-full liquid-input !pl-11 focus:ring-cyan-500/30 transition-all duration-200"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-1.5">Email Address</label>
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
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-1.5">Password</label>
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

              {password.length > 0 && (
                <div className="mt-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col gap-1.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Yêu cầu bảo mật:</span>
                    <span className={`text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded ${isPasswordValid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                      {isPasswordValid ? '✓ ĐỦ TIÊU CHUẨN' : 'CHƯA ĐỦ ĐIỀU KIỆN'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    <div className={`flex items-center gap-1 text-[10.5px] font-medium transition-colors ${isLongEnough ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span>{isLongEnough ? '✓' : '○'}</span>
                      <span>8+ ký tự</span>
                    </div>
                    <div className={`flex items-center gap-1 text-[10.5px] font-medium transition-colors ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span>{hasUpper ? '✓' : '○'}</span>
                      <span>Chữ hoa (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1 text-[10.5px] font-medium transition-colors ${hasNum ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span>{hasNum ? '✓' : '○'}</span>
                      <span>Chữ số (0-9)</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-1.5">Confirm Password</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 group-focus-within:text-cyan-400 transition-colors pointer-events-none">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full liquid-input !pl-11 focus:ring-cyan-500/30 transition-all duration-200"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <ReCaptcha
                siteKey={(import.meta.env.VITE_TURNSTILE_SITE_KEY || import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim()}
                action="signup"
                onChange={setCaptchaToken}
                ref={recaptchaRef}
              />
            </motion.div>

            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.015, boxShadow: '0 12px 35px rgba(212,175,55,0.4)' }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={loading || !captchaToken || !isPasswordValid || password !== confirmPassword}
              className={`w-full py-3.5 liquid-btn-gold text-slate-950 font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer ${
                (!captchaToken || loading || !isPasswordValid || password !== confirmPassword) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>CREATING ACCOUNT...</span>
                </div>
              ) : (
                'REGISTER CREW ACCOUNT'
              )}
            </motion.button>
          </form>

          <motion.div variants={itemVariants} className="mt-5 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 font-bold hover:underline transition">
              Log in here
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

