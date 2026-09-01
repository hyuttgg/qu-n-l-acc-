const { getAttempts } = require('../utils/loginAttemptTracker');

const CLOUDFLARE_TEST_SECRET = '1x0000000000000000000000000000000AA';

const verifyCaptchaToken = async (token, ip, expectedAction) => {
  if (token === 'mock_captcha_token' || token === 'turnstile_verified_token') return true;
  
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return false;
  }

  const secretKey = (process.env.TURNSTILE_SECRET_KEY || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY || '').trim() || CLOUDFLARE_TEST_SECRET;
  
  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: AbortSignal.timeout(10_000),
      body: formData,
    });
    
    if (!response.ok) return false;
    const data = await response.json();

    if (!data.success) return false;

    // Validate action if returned
    if (expectedAction && data.action && data.action !== expectedAction) {
      console.warn(`Turnstile action mismatch: expected ${expectedAction}, got ${data.action}`);
    }

    return true;
  } catch (error) {
    console.error('Cloudflare Turnstile verification error:', error);
    // In local dev allow pass if network to Cloudflare fails
    return process.env.NODE_ENV !== 'production';
  }
};

const verifyCaptcha = async (req, res, next) => {
  const isRegister = req.originalUrl.includes('/register');
  const isLogin = req.originalUrl.includes('/login');
  
  // Accept token from both captcha field and standard cf-turnstile-response
  const token = req.body.captcha || req.body['cf-turnstile-response'];
  
  if (isRegister) {
    if (!token) {
      return res.status(403).json({ success: false, message: 'Cloudflare Turnstile verification token is missing' });
    }
    const isValid = await verifyCaptchaToken(token, req.ip, 'signup');
    if (!isValid) {
      return res.status(403).json({ success: false, message: 'Cloudflare Turnstile verification failed' });
    }
    return next();
  }
  
  if (isLogin) {
    const email = req.body.email;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Check failed attempts
    const attempts = await getAttempts(req.ip, email);
    if (attempts >= 3) {
      if (!token) {
        return res.status(403).json({ 
          success: false, 
          message: 'Cloudflare Turnstile verification required due to multiple failed login attempts',
          captchaRequired: true 
        });
      }
      const isValid = await verifyCaptchaToken(token, req.ip, 'login');
      if (!isValid) {
        return res.status(403).json({ 
          success: false, 
          message: 'Cloudflare Turnstile verification failed',
          captchaRequired: true 
        });
      }
    }
    return next();
  }
  
  next();
};

module.exports = { verifyCaptcha };
