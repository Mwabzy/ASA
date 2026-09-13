/* Thin client for the registry API. Every call surfaces failure to the caller
   so the screens can render a real error state rather than empty data. */

const BASE = '/api';

async function request(path, options){
  let res;
  try {
    res = await fetch(BASE+path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
  } catch (e) {
    throw new Error('Could not reach the registry service. Check your connection and try again.');
  }
  if(!res.ok){
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch (e) { /* non-JSON body */ }
    throw new Error(detail || ('The registry service returned '+res.status+'.'));
  }
  if(res.status===204) return null;
  return res.json();
}

export const api = {
  listDoctors: () => request('/doctors'),
  createDoctor: (doctor) => request('/doctors', { method:'POST', body: JSON.stringify(doctor) }),
  updateDoctor: (id, doctor) => request('/doctors/'+encodeURIComponent(id), { method:'PUT', body: JSON.stringify(doctor) }),
  bulkImport: (payload) => request('/doctors/bulk', { method:'POST', body: JSON.stringify(payload) }),
  meta: () => request('/meta')
};
