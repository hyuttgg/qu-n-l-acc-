import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { Compass, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { ReCaptcha } from '../components/ReCaptcha';
import type { ReCaptchaRef } from '../components/ReCaptcha';
import { TreasureMapAnimation } from '../components/TreasureMapAnimation';

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
  const recaptchaRef = useRef<ReCaptchaRef>(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'discord_ip_limit') {
      setError('Địa chỉ IP của bạn đã đăng ký quá số lượng tài khoản Discord cho phép (Tối đa 3).');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error') === 'oauth_failed') {
      setError('Đăng nhập bằng mạng xã hội thất bại. Vui lòng thử lại.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  const handleDiscordLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${apiUrl}/api/auth/discord`;
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
            <TreasureMapAnimation />
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

          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800/80"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-semibold">
              <span className="bg-slate-950/80 px-3 text-slate-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="py-3.5 rounded-xl font-extrabold text-xs text-white bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-black/40 hover:shadow-black/60 active:scale-[0.99] uppercase"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={handleDiscordLogin}
              className="py-3.5 rounded-xl font-extrabold text-xs text-white bg-[#5865F2] hover:bg-[#4752C4] border border-[#5865F2]/40 hover:border-[#4752C4] transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-black/40 hover:shadow-black/60 active:scale-[0.99] uppercase"
            >
              <svg className="w-5 h-5 flex-shrink-0 fill-current" viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.43-5c.89-.66,1.75-1.36,2.57-2.1a75.12,75.12,0,0,0,72.7,0c.82.74,1.68,1.44,2.57,2.1a68.43,68.43,0,0,1-10.43,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129,54.65,123.52,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
              </svg>
              <span>Discord</span>
            </button>
          </div>

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
