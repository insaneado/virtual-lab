const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
    body: options.body && typeof options.body !== 'string'
      ? JSON.stringify(options.body)
      : options.body,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const authAPI = {
  me: () => request('/auth/me'),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

export const roomsAPI = {
  create: (payload) => request('/rooms', { method: 'POST', body: payload }),
  get: (id) => request(`/rooms/${encodeURIComponent(id)}`),
  remove: (id) => request(`/rooms/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const experimentsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/experiments${query ? `?${query}` : ''}`);
  },
  get: (id) => request(`/experiments/${encodeURIComponent(id)}`),
  create: (payload) => request('/experiments', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/experiments/${encodeURIComponent(id)}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/experiments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export default request;
