import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User } from 'lucide-react';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const regResult = await register(username, password);
    if (regResult.success) {
      // Auto login after register
      const loginResult = await login(username, password);
      if (loginResult.success) {
        navigate('/');
      } else {
        navigate('/login');
      }
    } else {
      setError(regResult.error || 'Registration failed');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2 className="auth-title">Create Account</h2>
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-group">
            <label className="auth-label">Username</label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <User size={18} />
              </div>
              <input
                type="text"
                className="auth-input"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="auth-group">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <KeyRound size={18} />
              </div>
              <input
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>
          <div className="auth-group">
            <label className="auth-label">Confirm Password</label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <KeyRound size={18} />
              </div>
              <input
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="auth-btn"
          >
            Sign Up
          </button>
        </form>
        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
