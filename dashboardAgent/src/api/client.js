
// Simple API client for backend integration
const RAW_BASE = (typeof import.meta !== 'undefined' && import.meta && /** @type {any} */(import.meta).env && /** @type {any} */(import.meta).env.VITE_API_URL) || 'http://localhost:3000';
const BASE_URL = String(RAW_BASE).replace(/\/+$/, ''); // remove trailing slash

function getToken() {
  try {
    return localStorage.getItem('token') || '';
  } catch (err) {
    console.warn('Unable to read token from localStorage in client', err);
    return '';
  }
}

/**
 * @typedef {Object} RequestOptions
 * @property {string} [method]
 * @property {any} [body]
 * @property {boolean} [auth]
 */

/**
 * @param {string} path
 * @param {RequestOptions} [options]
 */
async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  let url = `${BASE_URL}${cleanPath}`;
  let res;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (networkErr) {
    try {
      if (url.startsWith('http://localhost:')) {
        url = url.replace('http://localhost', 'http://127.0.0.1');
        res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
      } else {
        throw networkErr;
      }
    } catch (retryErr) {
      throw { message: `Impossible de joindre le serveur (${url}). Vérifiez que le backend tourne et VITE_API_URL.`, cause: retryErr };
    }
  }
  clearTimeout(timer);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw { message, status: res.status, data };
  }
  return data;
}

export async function login({ email, motDePasse }) {
  return request('/connexion', { method: 'POST', body: { email, motDePasse } });
}

export async function getUsers() {
  return request('/users', { auth: true });
}

export async function blockUsers(ids, bloquer) {
  return request('/users/block', { method: 'PATCH', auth: true, body: { ids, bloquer } });
}

export async function deleteUsers(ids) {
  return request('/users', { method: 'DELETE', auth: true, body: { ids } });
}

export async function createUser({ prenom, nom, email, role, motDePasse, numTel, numCompte, photo }) {
  return request('/users', { method: 'POST', auth: true, body: { prenom, nom, email, role, motDePasse, numTel, numCompte, photo } });
}

export async function updateUser(id, { nom, prenom, email, numTel, numCompte, role, photo, oldPassword, newPassword }) {
  return request(`/users/${id}`, { method: 'PUT', auth: true, body: { nom, prenom, email, numTel, numCompte, role, photo, oldPassword, newPassword } });
}

export async function updateUserPassword(id, { oldPassword, newPassword }) {
  return request(`/users/${id}/password`, { method: 'PUT', auth: true, body: { oldPassword, newPassword } });
}

// Transactions
export async function getTransactions() {
  return request('/transactions', { auth: true });
}

export async function createTransaction(payload) {
  // payload attendu: { type, montant, numCompteSource?, numCompteDestinataire?, dateTransaction, etat }
  return request('/transactions', { method: 'POST', auth: true, body: payload });
}

export async function cancelTransaction(id) {
  return request(`/transactions/${id}/cancel`, { method: 'PATCH', auth: true });
}
