export const getBackendUrl = (): string => {
  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const rawEnv = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim();

  if (!isLocalHost) {
    if (rawEnv && !rawEnv.includes('localhost') && !rawEnv.includes('127.0.0.1')) {
      return rawEnv.replace(/\/+$/, '');
    }
    return 'https://quan-ly-acc-viet-nam.onrender.com';
  }

  return (rawEnv || 'http://localhost:5001').replace(/\/+$/, '');
};

const getBaseUrl = () => `${getBackendUrl()}/api`;

export const getHeaders = (endpoint?: string) => {
  const token = localStorage.getItem('token');
  const adminPasscode = sessionStorage.getItem('admin_passcode');
  const isAdminEndpoint = endpoint && endpoint.startsWith('/admin');

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isAdminEndpoint && adminPasscode ? { 'x-admin-passcode': adminPasscode } : {}),
  };
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    // Token expired or invalid — clear token safely
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = { success: false, message: `Lỗi máy chủ (HTTP ${res.status})` };
  }

  if (!res.ok && data && !data.message) {
    data.message = `Lỗi yêu cầu (HTTP ${res.status})`;
  }

  return data;
};

// In-memory SWR Cache & In-flight Request Deduplication
interface CacheEntry {
  data: any;
  timestamp: number;
}

const apiCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();
const CACHE_TTL_MS = 6000; // 6 seconds fast-cache for smooth tab switching

export const clearApiCache = (pattern?: string) => {
  if (!pattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
};

export const api = {
  get: async (endpoint: string, customHeaders?: any, bypassCache = false) => {
    const cacheKey = `${endpoint}:${Boolean(customHeaders)}`;
    const now = Date.now();

    if (!bypassCache && apiCache.has(cacheKey)) {
      const entry = apiCache.get(cacheKey)!;
      if (now - entry.timestamp < CACHE_TTL_MS) {
        return entry.data;
      }
      apiCache.delete(cacheKey);
    }

    if (!bypassCache && inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)!;
    }

    const requestPromise = (async () => {
      try {
        const res = await fetch(`${getBaseUrl()}${endpoint}`, {
          method: 'GET',
          headers: { ...getHeaders(endpoint), ...customHeaders },
        });
        const data = await handleResponse(res);
        if (data && data.success !== false) {
          apiCache.set(cacheKey, { data, timestamp: Date.now() });
        }
        return data;
      } catch (err: any) {
        return { success: false, message: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.' };
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  },

  post: async (endpoint: string, body: any, customHeaders?: any) => {
    clearApiCache();
    try {
      const res = await fetch(`${getBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: { ...getHeaders(endpoint), ...customHeaders },
        body: JSON.stringify(body),
      });
      return await handleResponse(res);
    } catch (err: any) {
      return { success: false, message: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.' };
    }
  },

  delete: async (endpoint: string, customHeaders?: any) => {
    clearApiCache();
    try {
      const res = await fetch(`${getBaseUrl()}${endpoint}`, {
        method: 'DELETE',
        headers: { ...getHeaders(endpoint), ...customHeaders },
      });
      return await handleResponse(res);
    } catch (err: any) {
      return { success: false, message: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.' };
    }
  },

  put: async (endpoint: string, body: any, customHeaders?: any) => {
    clearApiCache();
    try {
      const res = await fetch(`${getBaseUrl()}${endpoint}`, {
        method: 'PUT',
        headers: { ...getHeaders(endpoint), ...customHeaders },
        body: JSON.stringify(body),
      });
      return await handleResponse(res);
    } catch (err: any) {
      return { success: false, message: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.' };
    }
  },
};
