/* Thin client for the registry API. Every call surfaces failure to the caller
   so the screens can render a real error state rather than empty data. */

const BASE = '/api';

/* Thrown when the service says there is no valid session, so callers can send
   the user back to sign-in rather than showing it as a load failure. */
export class UnauthorizedError extends Error {
  constructor(message){ super(message || 'Your session has ended. Sign in again.'); this.name = 'UnauthorizedError'; }
}

async function request(path, options){
  let res;
  try {
    res = await fetch(BASE+path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
  } catch (e) {
    throw new Error('Could not reach the registry service. Check your connection and try again.');
  }
  if(!res.ok){
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch (e) { /* non-JSON body */ }
    if(res.status===401) throw new UnauthorizedError(detail);
    throw new Error(detail || ('The registry service returned '+res.status+'.'));
  }
  if(res.status===204) return null;
  return res.json();
}

export const api = {
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method:'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method:'POST' }),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/password', { method:'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  listDoctors: () => request('/doctors'),
  createDoctor: (doctor) => request('/doctors', { method:'POST', body: JSON.stringify(doctor) }),
  updateDoctor: (id, doctor) => request('/doctors/'+encodeURIComponent(id), { method:'PUT', body: JSON.stringify(doctor) }),
  bulkImport: (payload) => request('/doctors/bulk', { method:'POST', body: JSON.stringify(payload) }),
  meta: () => request('/meta')
};
