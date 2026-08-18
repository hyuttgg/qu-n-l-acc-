const nodemailer = require('nodemailer');
const { securityLogger } = require('../middleware/logging');

// Create the transporter using Gmail service
// (will rely on EMAIL_USER and EMAIL_PASS environment variables)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Extracts OS and Browser details from a user-agent string.
 */
const getDeviceDetails = (userAgentString) => {
  if (!userAgentString) return { os: 'Unknown OS', browser: 'Unknown Browser' };

  let os = 'Unknown OS';
  if (userAgentString.includes('Windows')) os = 'Windows';
  else if (userAgentString.includes('Macintosh')) os = 'macOS';
  else if (userAgentString.includes('iPhone') || userAgentString.includes('iPad')) os = 'iOS';
  else if (userAgentString.includes('Android')) os = 'Android';
  else if (userAgentString.includes('Linux')) os = 'Linux';

  let browser = 'Unknown Browser';
  if (userAgentString.includes('Firefox') || userAgentString.includes('FxiOS')) browser = 'Firefox';
  else if (userAgentString.includes('Edg')) browser = 'Edge';
  else if (userAgentString.includes('Chrome') && !userAgentString.includes('Chromium')) browser = 'Chrome';
  else if (userAgentString.includes('Safari')) browser = 'Safari';
  else if (userAgentString.includes('MSIE') || userAgentString.includes('Trident')) browser = 'Internet Explorer';

  return { os, browser };
};

/**
 * Sends an email notification to the user upon a successful Google login.
 */
const sendLoginNotification = async (email, username, req) => {
  // Gracefully skip if email credentials are not set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS ||
    process.env.EMAIL_USER === 'your_gmail@gmail.com' ||
    process.env.EMAIL_PASS === 'your_gmail_app_password') {
    securityLogger.warn('Email notification skipped: EMAIL_USER or EMAIL_PASS not configured in .env');
    return;
  }

  try {
    const userAgent = req.headers['user-agent'] || '';
    const { os, browser } = getDeviceDetails(userAgent);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown';

    const mailOptions = {
      from: `"OceanForge Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '[OceanForge] Thông báo đăng nhập thành công',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #1a73e8; text-align: center; margin-bottom: 20px;">Đăng nhập thành công</h2>
          <p>Xin chào <strong>${username}</strong>,</p>
          <p>Hệ thống ghi nhận một lượt đăng nhập mới vào tài khoản của bạn thông qua Google.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #eeeeee;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #5f6368; width: 35%;"><strong>Thời gian:</strong></td>
                <td style="padding: 6px 0; color: #202124;">${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (Giờ Việt Nam)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #5f6368;"><strong>Địa chỉ IP:</strong></td>
                <td style="padding: 6px 0; color: #202124;"><code>${ip}</code></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #5f6368;"><strong>Hệ điều hành:</strong></td>
                <td style="padding: 6px 0; color: #202124;">${os}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #5f6368;"><strong>Trình duyệt:</strong></td>
                <td style="padding: 6px 0; color: #202124;">${browser}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #d93025; font-weight: bold; margin-top: 20px;">Nếu đây không phải là bạn, vui lòng kiểm tra và thay đổi cấu hình bảo mật tài khoản Google của bạn ngay lập tức.</p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #9aa0a6; text-align: center; line-height: 1.4;">
            Đây là email tự động từ hệ thống OceanForge, vui lòng không phản hồi email này. 

            hãy khai phá vùng biển mới 
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    securityLogger.info('Login notification email sent successfully', { email, username });
  } catch (error) {
    securityLogger.error('Failed to send login notification email', { error: error.message, email });
    throw error;
  }
};

module.exports = { sendLoginNotification };
