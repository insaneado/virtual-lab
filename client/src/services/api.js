/**
 * client/src/services/api.js
 * ────────────────────────────────────────────────────────
 * REST API client for experiments and rooms.
 * Wraps fetch with base URL and error handling.
 * ────────────────────────────────────────────────────────
 */

const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE}${endpoint}`;

  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Experiments ────────────────────────────────────────

export const experimentsAPI = {
  list:   (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/experiments${qs ? `?${qs}` : ''}`);
  },
  get:    (id) => request(`/experiments/${id}`),
  create: (data) => request('/experiments', { method: 'POST', body: data }),
  update: (id, data) => request(`/experiments/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/experiments/${id}`, { method: 'DELETE' }),
  fork:   (id, authorId) => request(`/experiments/${id}/fork`, { method: 'POST', body: { authorId } }),
};

// ─── Rooms ──────────────────────────────────────────────

export const roomsAPI = {
  check: (code) => request(`/rooms/${code}`),
  list:  () => request('/rooms'),
};
