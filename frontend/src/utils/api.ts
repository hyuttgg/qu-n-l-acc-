const rawApiUrl = (import.meta.env.VITE_API_URL || 'https://quan-ly-acc-viet-nam.onrender.com').trim().replace(/\/+$/, '');
const BASE_URL = `${rawApiUrl}/api`;

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

export const api = {
  get: async (endpoint: string, customHeaders?: any) => {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: { ...getHeaders(endpoint), ...customHeaders },
      });
      return await handleResponse(res);
    } catch (err: any) {
      return { success: false, message: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.' };
    }
  },

  post: async (endpoint: string, body: any, customHeaders?: any) => {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
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
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: { ...getHeaders(endpoint), ...customHeaders },
      });
      return await handleResponse(res);
    } catch (err: any) {
      return { success: false, message: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.' };
    }
  },

  put: async (endpoint: string, body: any, customHeaders?: any) => {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
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

