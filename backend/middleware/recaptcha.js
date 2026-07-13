const { getAttempts } = require('../utils/loginAttemptTracker');

const verifyCaptchaToken = async (token, ip) => {
  const secretKey = (process.env.RECAPTCHA_SECRET_KEY || '').trim();
  if (!secretKey) {
    console.warn("RECAPTCHA_SECRET_KEY is not defined in environment. Skipping verification.");
    return true;
  }
  
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification request error:', error);
    return false;
  }
};

const verifyCaptcha = async (req, res, next) => {
  const isRegister = req.originalUrl.includes('/register');
  const isLogin = req.originalUrl.includes('/login');
  
  const token = req.body.captcha;
  
  if (isRegister) {
    if (!token) {
      return res.status(403).json({ success: false, message: 'reCAPTCHA verification token is missing' });
    }
    const isValid = await verifyCaptchaToken(token, req.ip);
    if (!isValid) {
      return res.status(403).json({ success: false, message: 'reCAPTCHA verification failed' });
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
          message: 'reCAPTCHA verification required due to multiple failed login attempts',
          captchaRequired: true 
        });
      }
      const isValid = await verifyCaptchaToken(token, req.ip);
      if (!isValid) {
        return res.status(403).json({ 
          success: false, 
          message: 'reCAPTCHA verification failed',
          captchaRequired: true 
        });
      }
    }
    return next();
  }
  
  next();
};

module.exports = { verifyCaptcha };
