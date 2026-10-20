import { handleMockRequest } from './mockData.js';

export const isDemoMode = import.meta.env.MODE === 'demo' || import.meta.env.VITE_DEMO_MODE === 'true';

const BASE = isDemoMode
  ? (window.KIKOST_CONFIG?.baseUrl ?? '')
  : (window.KIKOST_CONFIG?.baseUrl || '/kikost-spk');

const API = window.KIKOST_CONFIG?.apiUrl || `${BASE}/api/index.php`;
let csrfToken = '';

export function setCsrfToken(token) { csrfToken = token || ''; }

export async function request(resource, action = '', options = {}) {
  // Mode Demo eksplisit: 100% data sintetis, tanpa fallback ke jaringan/PHP
  if (isDemoMode) {
    return handleMockRequest(resource, action, options);
  }

  const { method = 'GET', params = {}, data = null, formData = false } = options;
  const query = new URLSearchParams({ resource, ...(action ? { action } : {}), ...params });
  const headers = { Accept: 'application/json' };
  const init = { method, credentials: 'same-origin', headers };
  if (method !== 'GET') {
    headers['X-CSRF-Token'] = csrfToken;
    if (formData) init.body = data;
    else {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(data || {});
    }
  }
  const response = await fetch(`${API}?${query.toString()}`, init);
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('Server mengirim respons yang tidak dapat dibaca.'); }
  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.message || 'Permintaan gagal.');
    error.status = response.status;
    error.details = payload.details || {};
    throw error;
  }
  return payload.data;
}

export const get = (resource, params = {}, action = '') => request(resource, action, { params });
export const post = (resource, action, data) => request(resource, action, { method: 'POST', data });
export const postForm = (resource, action, data) => request(resource, action, { method: 'POST', data, formData: true });

export function appBase() { return BASE; }

