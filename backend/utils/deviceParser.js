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

module.exports = { getDeviceDetails };
