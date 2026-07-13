import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { Compass, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { ReCaptcha } from '../components/ReCaptcha';
import type { ReCaptchaRef } from '../components/ReCaptcha';

export const LoginPage: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCaptchaRef>(null);

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

  return (
    <div className="deepsea-bg min-h-screen relative flex items-center justify-center p-4">
      {/* Wave background */}
      <div className="wave-container">
        <div className="wave wave1"></div>
        <div className="wave wave2"></div>
        <div className="wave wave3"></div>
      </div>

      <div className="glass-panel neon-border w-full max-w-4xl flex flex-col md:flex-row overflow-hidden relative z-10">
        {/* Left Side: Theme Graphic */}
        <div className="flex-1 bg-gradient-to-br from-ocean-deep to-ocean-abyss p-8 flex flex-col justify-between border-r border-slate-800">
          <div className="flex items-center gap-2">
            <Compass className="w-8 h-8 text-gold animate-spin-slow" style={{ animationDuration: '25s' }} />
            <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-gold to-white bg-clip-text text-transparent glow-text-gold">
              OCEANFORGE
            </span>
          </div>

          <div className="space-y-4 my-8 md:my-0">
            <h2 className="text-3xl font-black text-white leading-tight">
              REGAIN CONTROL OF THE <span className="text-gold glow-text-gold">SEAS</span>
            </h2>
            <p className="text-slate-400 text-sm">
              Log in to access your dashboard. Track live inventory drops, farm rates, and manage session heartbeats for your bot fleet.
            </p>
          </div>

          <div className="text-slate-500 text-xs">
            &copy; {new Date().getFullYear()} OceanForge. Designed for game automation.
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-8 bg-slate-950/80">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white">Welcome Back</h3>
            <p className="text-slate-400 text-sm mt-1">Enter your credentials to set sail</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-ocean-deep/60 border border-slate-800 focus:border-ocean-cyan focus:ring-1 focus:ring-ocean-cyan rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider">Password</label>
                <a href="#" className="text-xs text-ocean-cyan hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-ocean-deep/60 border border-slate-800 focus:border-ocean-cyan focus:ring-1 focus:ring-ocean-cyan rounded-xl py-3 pl-10 pr-10 text-white text-sm outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 bg-ocean-deep/60 border-slate-850 text-ocean-cyan rounded focus:ring-0 focus:ring-offset-0"
              />
              <label htmlFor="remember" className="ml-2 text-xs text-slate-400 select-none">Remember this device</label>
            </div>

            {captchaRequired && (
              <ReCaptcha
                siteKey={(import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim()}
                onChange={setCaptchaToken}
                ref={recaptchaRef}
              />
            )}

            <button
              type="submit"
              disabled={loading || (captchaRequired && !captchaToken)}
              className={`w-full py-4 rounded-xl font-extrabold text-sm text-ocean-abyss bg-gradient-to-r from-gold via-gold-light to-gold shadow-gold-glow hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2 ${
                ((captchaRequired && !captchaToken) || loading) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-ocean-abyss border-t-transparent rounded-full animate-spin" />
              ) : (
                'LOG IN'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-gold font-bold hover:underline">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
