/* Date + formatting helpers — ported verbatim. */
import { MONTHS } from './constants.js';

export function pad2(n){ return String(n).padStart(2,'0'); }
export function iso(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
export function daysAgo(n){ const d = new Date(); d.setDate(d.getDate()-n); return iso(d); }

export function parse(s){
  if(!s) return null;
  const p = String(s).split('-');
  if(p.length<3) return null;
  const d = new Date(+p[0], +p[1]-1, +p[2]);
  return isNaN(d.getTime()) ? null : d;
}

export function fmt(d){ return d ? d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear() : '—'; }
export function startDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
export function diffDays(a,b){ return Math.round((startDay(a)-startDay(b))/86400000); }

export function addMonths(d,m){
  const day = d.getDate();
  const t = new Date(d.getFullYear(), d.getMonth()+m, 1);
  const last = new Date(t.getFullYear(), t.getMonth()+1, 0).getDate();
  t.setDate(Math.min(day,last));
  return t;
}

export function fsize(n){
  if(n==null) return '';
  if(n<1024) return n+' B';
  if(n<1048576) return (n/1024).toFixed(0)+' KB';
  return (n/1048576).toFixed(1)+' MB';
}

export function reduced(){
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch(e){ return false; }
}

/* "Last synced with KMPDC" reads as a wall-clock time, not a relative one. */
export function syncStamp(ts){
  const d = ts ? new Date(ts) : new Date();
  if(isNaN(d.getTime())) return '—';
  return d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear()+
         ' at '+pad2(d.getHours())+':'+pad2(d.getMinutes())+' EAT';
}
