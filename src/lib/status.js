/* ---- the two status rules --------------------------------------------
   KMPDC     : licence runs to 31 Dec of (issue year + 1).
   Insurance : cover runs 12 months from the start date; the anniversary
               day itself is already lapsed.

   Computed, never stored. Ported verbatim — do not change.
   --------------------------------------------------------------------- */
import { WARN_DAYS } from './constants.js';
import { parse, fmt, startDay, diffDays, addMonths } from './dates.js';

export function kmpdc(issueStr, today){
  today = today || new Date();
  const issue = parse(issueStr);
  if(!issue) return { status:'Not recorded', expiry:null, days:null };
  const expiry = new Date(issue.getFullYear()+1, 11, 31);
  const days = diffDays(expiry, today);
  return { status: days>=0 ? 'Active' : 'Inactive', expiry, days };
}

export function insurance(fromStr, today){
  today = today || new Date();
  const from = parse(fromStr);
  if(!from) return { status:'Not recorded', coverTo:null, days:null };
  const coverTo = addMonths(from,12);
  const days = diffDays(coverTo, today);
  return {
    status: startDay(coverTo) > startDay(today) ? 'Active' : 'Inactive',
    coverTo, days
  };
}

/* Green = active, red = inactive, amber = expiring, grey = not recorded.
   These four are the only place those colours are used. */
export function dotFor(v){
  if(v.status==='Not recorded') return 'var(--color-line)';
  if(v.status==='Inactive') return 'var(--color-inactive)';
  if(v.days!=null && v.days>=0 && v.days<=WARN_DAYS) return 'var(--color-expiring)';
  return 'var(--color-active)';
}

export function statusColor(v){
  if(v.status==='Inactive') return 'var(--color-inactive)';
  if(v.status==='Not recorded') return 'var(--color-ink-52)';
  return 'var(--color-active)';
}

export function statusOf(d){
  const k = kmpdc(d.kmpdcIssue), inv = insurance(d.insuranceFrom);
  const warn = v => v.status==='Active' && v.days!=null && v.days>=0 && v.days<=WARN_DAYS;
  const rec = [];
  if(k.status!=='Not recorded' && k.days!=null) rec.push(k.days);
  if(inv.status!=='Not recorded' && inv.days!=null) rec.push(inv.days);
  return {
    k, inv,
    kDot:dotFor(k), iDot:dotFor(inv),
    kDate: k.expiry ? fmt(k.expiry) : '—',
    iDate: inv.coverTo ? fmt(inv.coverTo) : '—',
    kWarn: warn(k), iWarn: warn(inv),
    soonest: rec.length ? Math.min.apply(null, rec) : Infinity
  };
}
