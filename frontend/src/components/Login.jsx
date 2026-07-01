import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User, Terminal, ShieldAlert } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [logs, setLogs] = useState([]);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const logEndRef = useRef(null);

  // Helper to add logs with a timestamp
  const addLog = (text, type = 'info') => {
    const time = new Date().toISOString().substring(11, 23); // HH:mm:ss.SSS
    setLogs(prev => [...prev, { time, text, type }]);
  };

  // Auto-scroll logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Initial terminal boot sequence
  useEffect(() => {
    let isMounted = true;
    const bootSequence = async () => {
      if (!isMounted) return;
      addLog('SYSTEM INITIALIZATION STARTED...', 'info');
      await new Promise(r => setTimeout(r, 400));
      if (!isMounted) return;
      addLog('LOADING ENCRYPTION MODULES [OK]', 'success');
      await new Promise(r => setTimeout(r, 300));
      if (!isMounted) return;
      addLog('ESTABLISHING SECURE CONNECTION [OK]', 'success');
      await new Promise(r => setTimeout(r, 300));
      if (!isMounted) return;
      addLog('AWAITING USER CREDENTIALS...', 'warning');
    };
    bootSequence();
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoggingIn) return;
    
    setError('');
    setIsLoggingIn(true);
    
    addLog(`AUTHENTICATION REQUEST: USER [${username}]`, 'info');
    
    // Simulate some realistic terminal delay for the cool effect
    await new Promise(r => setTimeout(r, 600));
    addLog('VERIFYING CREDENTIALS WITH SERVER...', 'warning');
    
    await new Promise(r => setTimeout(r, 600));

    const result = await login(username, password);
    
    if (result.success) {
      addLog('ACCESS GRANTED: WELCOME ADMIN', 'success');
      addLog('REDIRECTING TO SECURE DASHBOARD...', 'info');
      await new Promise(r => setTimeout(r, 800));
      navigate('/');
    } else {
      const errMsg = result.error || 'Login failed';
      addLog(`ACCESS DENIED: ${errMsg.toUpperCase()}`, 'error');
      setError(errMsg);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="red-auth-container">
      <div className="red-auth-wrapper">
        
        {/* LEFT SIDE: LOGIN FORM */}
        <div className="red-auth-form-panel">
          <div className="red-auth-header">
            <h2 className="red-auth-title">
              <ShieldAlert size={32} color="#ef4444" />
              SYSTEM LOGIN
            </h2>
            <div className="red-auth-subtitle">Restricted Access Area</div>
          </div>

          {error && (
            <div className="red-auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="red-auth-form">
            <div className="red-input-group">
              <label className="red-input-label">Username</label>
              <div className="red-input-wrapper">
                <div className="red-input-icon">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  className="red-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoggingIn}
                  required
                />
              </div>
            </div>

            <div className="red-input-group">
              <label className="red-input-label">Password</label>
              <div className="red-input-wrapper">
                <div className="red-input-icon">
                  <KeyRound size={18} />
                </div>
                <input
                  type="password"
                  className="red-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="red-btn-submit"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'AUTHENTICATING...' : 'AUTHORIZE ACCESS'}
            </button>
          </form>

          <p className="red-auth-footer">
            Don't have an account?{' '}
            <Link to="/register" className="red-auth-link">
              Request Access
            </Link>
          </p>
        </div>

        {/* RIGHT SIDE: TERMINAL LOG */}
        <div className="red-terminal-panel">
          <div className="red-terminal-header">
            <div className="red-terminal-dot"></div>
            <span className="red-terminal-title">SECURITY_LOG_v2.1.4</span>
            <Terminal size={16} color="#ef4444" style={{ marginLeft: 'auto' }} />
          </div>
          
          <div className="red-terminal-content">
            {logs.map((log, index) => (
              <div key={index} className="log-line">
                <span className="log-time">[{log.time}]</span>
                <span className={`log-text ${log.type}`}>
                  {log.text}
                </span>
              </div>
            ))}
            <div ref={logEndRef} style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
              <span className="log-time">[{new Date().toISOString().substring(11, 23)}]</span>
              <span className="log-text info" style={{ opacity: 0.7 }}>AWAITING_INPUT</span>
              <span className="log-cursor"></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
