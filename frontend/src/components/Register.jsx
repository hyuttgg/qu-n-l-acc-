import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User, Terminal, ShieldAlert } from 'lucide-react';
import './Login.css'; // Re-use the cool terminal styles

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [logs, setLogs] = useState([]);
  
  const { register, login } = useAuth();
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

  // Initial terminal boot sequence for register
  useEffect(() => {
    let isMounted = true;
    const bootSequence = async () => {
      if (!isMounted) return;
      addLog('SYSTEM REGISTRATION INITIATED...', 'info');
      await new Promise(r => setTimeout(r, 400));
      if (!isMounted) return;
      addLog('GENERATING NEW AGENT KEY-PAIR [OK]', 'success');
      await new Promise(r => setTimeout(r, 300));
      if (!isMounted) return;
      addLog('AWAITING REGISTRATION DATA...', 'warning');
    };
    bootSequence();
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegistering) return;
    
    setError('');
    
    if (password !== confirmPassword) {
      addLog('VALIDATION ERROR: PASSWORDS DO NOT MATCH', 'error');
      setError('Passwords do not match');
      return;
    }

    setIsRegistering(true);
    
    addLog(`CREATING AGENT ID: [${username}]`, 'info');
    await new Promise(r => setTimeout(r, 500));
    addLog('STRENGTHENING ENCRYPTION HASHES...', 'warning');
    await new Promise(r => setTimeout(r, 500));
    addLog('TRANSMITTING TO CENTRAL REPOSITORY...', 'info');
    await new Promise(r => setTimeout(r, 600));

    const regResult = await register(username, password);
    
    if (regResult.success) {
      addLog('ACCOUNT SUCCESSFULLY CREATED!', 'success');
      addLog('INITIATING AUTOMATIC AUTHORIZATION...', 'warning');
      await new Promise(r => setTimeout(r, 600));
      
      const loginResult = await login(username, password);
      if (loginResult.success) {
        addLog('AUTHORIZATION GRANTED: WELCOME ADMIN', 'success');
        addLog('REDIRECTING TO SECURE DASHBOARD...', 'info');
        await new Promise(r => setTimeout(r, 800));
        navigate('/');
      } else {
        addLog('AUTO-LOGIN FAILED: AWAITING MANUAL AUTHORIZATION', 'error');
        await new Promise(r => setTimeout(r, 800));
        navigate('/login');
      }
    } else {
      const errMsg = regResult.error || 'Registration failed';
      addLog(`CREATION REJECTED: ${errMsg.toUpperCase()}`, 'error');
      setError(errMsg);
      setIsRegistering(false);
    }
  };

  return (
    <div className="red-auth-container">
      <div className="red-auth-wrapper">
        
        {/* LEFT SIDE: REGISTRATION FORM */}
        <div className="red-auth-form-panel">
          <div className="red-auth-header">
            <h2 className="red-auth-title">
              <ShieldAlert size={32} color="#ef4444" />
              SYSTEM REGISTER
            </h2>
            <div className="red-auth-subtitle">New Agent Enrollment</div>
          </div>

          {error && (
            <div className="red-auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="red-auth-form">
            <div className="red-input-group">
              <label className="red-input-label">Choose Username</label>
              <div className="red-input-wrapper">
                <div className="red-input-icon">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  className="red-input"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isRegistering}
                  required
                />
              </div>
            </div>

            <div className="red-input-group">
              <label className="red-input-label">Set Password</label>
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
                  disabled={isRegistering}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="red-input-group">
              <label className="red-input-label">Confirm Password</label>
              <div className="red-input-wrapper">
                <div className="red-input-icon">
                  <KeyRound size={18} />
                </div>
                <input
                  type="password"
                  className="red-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isRegistering}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="red-btn-submit"
              disabled={isRegistering}
            >
              {isRegistering ? 'CREATING AGENT...' : 'REGISTER ACCESS'}
            </button>
          </form>

          <p className="red-auth-footer">
            Already authorized?{' '}
            <Link to="/login" className="red-auth-link">
              Sign In
            </Link>
          </p>
        </div>

        {/* RIGHT SIDE: TERMINAL LOG */}
        <div className="red-terminal-panel">
          <div className="red-terminal-header">
            <div className="red-terminal-dot"></div>
            <span className="red-terminal-title">ENROLLMENT_LOG_v2.1.4</span>
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

export default Register;
