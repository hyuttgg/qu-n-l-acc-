const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim().replace(/\/+$/, '');
const BASE_URL = `${rawApiUrl}/api`;

export const getHeaders = () => {
  const token = localStorage.getItem('token');
  const adminPasscode = sessionStorage.getItem('admin_passcode');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(adminPasscode ? { 'x-admin-passcode': adminPasscode } : {}),
  };
};

export const api = {
  get: async (endpoint: string, customHeaders?: any) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { ...getHeaders(), ...customHeaders },
    });
    return res.json();
  },

  post: async (endpoint: string, body: any) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return res.json();
  },

  delete: async (endpoint: string) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  put: async (endpoint: string, body: any) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

