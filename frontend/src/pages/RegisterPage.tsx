import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { Compass, User, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    const res = await register(username, email, password);
    setLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message || 'Registration failed');
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
              JOIN THE <span className="text-gold glow-text-gold">FLEET</span> CREW
            </h2>
            <p className="text-slate-400 text-sm">
              Create an account to deploy your API webhook. Manage infinite Roblox bots, trace drops, compile level charts, and share live data statistics with others.
            </p>
          </div>

          <div className="text-slate-500 text-xs">
            &copy; {new Date().getFullYear()} OceanForge. Designed for game automation.
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-8 bg-slate-950/80">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white">Create Account</h3>
            <p className="text-slate-400 text-sm mt-1">Get started tracking your characters</p>
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="pirate_king"
                  className="w-full bg-ocean-deep/60 border border-slate-800 focus:border-ocean-cyan focus:ring-1 focus:ring-ocean-cyan rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition"
                />
              </div>
            </div>

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
                  placeholder="king@grandline.com"
                  className="w-full bg-ocean-deep/60 border border-slate-800 focus:border-ocean-cyan focus:ring-1 focus:ring-ocean-cyan rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Password</label>
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
                  className="w-full bg-ocean-deep/60 border border-slate-800 focus:border-ocean-cyan focus:ring-1 focus:ring-ocean-cyan rounded-xl py-2.5 pl-10 pr-10 text-white text-sm outline-none transition"
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

            <div>
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-ocean-deep/60 border border-slate-800 focus:border-ocean-cyan focus:ring-1 focus:ring-ocean-cyan rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-extrabold text-sm text-ocean-abyss bg-gradient-to-r from-gold via-gold-light to-gold shadow-gold-glow hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-ocean-abyss border-t-transparent rounded-full animate-spin" />
              ) : (
                'REGISTER'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-gold font-bold hover:underline">
              Log in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
