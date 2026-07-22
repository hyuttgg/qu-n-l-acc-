const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim().replace(/\/+$/, '');
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

export const api = {
  get: async (endpoint: string, customHeaders?: any) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { ...getHeaders(endpoint), ...customHeaders },
    });
    return res.json();
  },

  post: async (endpoint: string, body: any, customHeaders?: any) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { ...getHeaders(endpoint), ...customHeaders },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  delete: async (endpoint: string, customHeaders?: any) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { ...getHeaders(endpoint), ...customHeaders },
    });
    return res.json();
  },

  put: async (endpoint: string, body: any, customHeaders?: any) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { ...getHeaders(endpoint), ...customHeaders },
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

