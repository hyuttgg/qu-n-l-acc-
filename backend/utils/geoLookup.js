const axios = require('axios');
const IpCache = require('../models/IpCache');

// In-memory cache fallback for when MongoDB is offline
global.ipCacheFallback = global.ipCacheFallback || new Map();

// Mock list of Vietnam cities/IPs for local loopback connections
const VIETNAM_MOCK_LOCATIONS = [
  { ip: '1.52.0.1', country: 'Vietnam', countryCode: 'VN', region: 'Ho Chi Minh', city: 'Ho Chi Minh City', latitude: 10.823, longitude: 106.629, isp: 'VNPT' },
  { ip: '113.160.224.1', country: 'Vietnam', countryCode: 'VN', region: 'Ha Noi', city: 'Hanoi', latitude: 21.0278, longitude: 105.8342, isp: 'Viettel' },
  { ip: '113.160.100.1', country: 'Vietnam', countryCode: 'VN', region: 'Da Nang', city: 'Da Nang', latitude: 16.0544, longitude: 108.2022, isp: 'FPT Telecom' },
  { ip: '113.161.4.1', country: 'Vietnam', countryCode: 'VN', region: 'Hai Phong', city: 'Haiphong', latitude: 20.8449, longitude: 106.6881, isp: 'VNPT' },
  { ip: '113.161.64.1', country: 'Vietnam', countryCode: 'VN', region: 'Can Tho', city: 'Can Tho', latitude: 10.0452, longitude: 105.7469, isp: 'Viettel' },
  { ip: '113.161.128.1', country: 'Vietnam', countryCode: 'VN', region: 'Khanh Hoa', city: 'Nha Trang', latitude: 12.2464, longitude: 109.1947, isp: 'FPT Telecom' },
];

let mockLocationIndex = 0;

/**
 * Checks if an IP is a local loopback or private network address
 */
function isLocalIp(ip) {
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip === 'Unknown'
  );
}

/**
 * Resolves geolocation for a given IP address
 */
async function lookupIp(ipAddress) {
  let ip = ipAddress ? ipAddress.trim() : 'Unknown';

  // Handle loopback/local IPs by rotating through mock Vietnamese coordinates
  if (isLocalIp(ip)) {
    const mockLoc = VIETNAM_MOCK_LOCATIONS[mockLocationIndex];
    mockLocationIndex = (mockLocationIndex + 1) % VIETNAM_MOCK_LOCATIONS.length;
    return mockLoc;
  }

  // Handle IPv4 mapped IPv6 addresses (e.g. ::ffff:1.2.3.4)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // 1. Try Cache Lookup (MongoDB or In-Memory)
  try {
    if (global.dbConnected) {
      const cached = await IpCache.findOne({ ip });
      if (cached) {
        return cached;
      }
    } else {
      const cached = global.ipCacheFallback.get(ip);
      if (cached) {
        return cached;
      }
    }
  } catch (err) {
    console.error('IP cache lookup error:', err.message);
  }

  // 2. Fetch from ipwho.is API
  try {
    console.log(`Geolocating external IP: ${ip} via ipwho.is`);
    const response = await axios.get(`https://ipwho.is/${ip}`, { timeout: 5000 });
    const data = response.data;

    if (data && data.success) {
      const geoResult = {
        ip: ip,
        country: data.country || 'Vietnam',
        countryCode: data.country_code || 'VN',
        region: data.region || 'Ho Chi Minh',
        city: data.city || 'Ho Chi Minh City',
        latitude: parseFloat(data.latitude) || 10.823,
        longitude: parseFloat(data.longitude) || 106.629,
        isp: data.connection?.isp || 'Unknown ISP',
      };

      // Save to cache asynchronously
      if (global.dbConnected) {
        IpCache.create(geoResult).catch(err => console.error('Error saving IP cache to Mongo:', err.message));
      } else {
        global.ipCacheFallback.set(ip, geoResult);
      }

      return geoResult;
    }
  } catch (err) {
    console.error(`Failed to geolocate IP ${ip} via API:`, err.message);
  }

  // 3. Fallback coordinates (Ho Chi Minh City default) if API fails
  return {
    ip: ip,
    country: 'Vietnam',
    countryCode: 'VN',
    region: 'Ho Chi Minh',
    city: 'Ho Chi Minh City',
    latitude: 10.823,
    longitude: 106.629,
    isp: 'Unknown ISP (Fallback)',
  };
}

module.exports = { lookupIp };
