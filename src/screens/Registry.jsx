import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, DIVISIONS, PAGE_SIZE } from '../lib/constants.js';
import { kmpdc, insurance, statusOf } from '../lib/status.js';
import { reduced } from '../lib/dates.js';
import { exportCsv } from '../lib/csv.js';
import DoctorCard from '../components/DoctorCard.jsx';
import { RegistrySkeleton, EmptyState, ErrorState } from '../components/States.jsx';
import { Search, Download, Upload, ChevLeft, ChevRight, Close } from '../components/icons.jsx';

const LENSES = [
  ['all','All'],
  ['kmpdc-inactive','KMPDC inactive'],
  ['insurance-inactive','Insurance inactive'],
  ['expiring','Expiring 60d'],
  ['not-recorded','Not recorded']
];

/* Counts tick up once, on arrival. */
function useCountUp(active){
  const [t, setT] = useState(active ? 0 : 1);
  useEffect(() => {
    if(!active) return;
    if(reduced()){ setT(1); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now-start)/700);
      setT(1-Math.pow(1-p,3));
      if(p<1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return t;
}

export default function Registry({
  doctors, loading, error, onRetry, retrying,
  batchIds, onClearBatch, onOpen, onEdit, onNavigate
}){
  const [query, setQuery] = useState('');
  const [lens, setLens] = useState('all');
  const [catFilter, setCatFilter] = useState('All');
  const [divFilter, setDivFilter] = useState('All');
  const [page, setPage] = useState(1);
  const listTop = useRef(null);

  const t = useCountUp(!loading && !error);

  /* --- stats: computed off the whole registry, never off the filtered view --- */
  const stats = useMemo(() => {
    const kAct  = doctors.filter(d => kmpdc(d.kmpdcIssue).status==='Active').length;
    const iAct  = doctors.filter(d => insurance(d.insuranceFrom).status==='Active').length;
    const inact = doctors.filter(d =>
      kmpdc(d.kmpdcIssue).status==='Inactive' || insurance(d.insuranceFrom).status==='Inactive').length;
    return [
      { label:'Registered',       value:doctors.length, color:'var(--color-accent-ink)' },
      { label:'KMPDC active',     value:kAct,           color:'var(--color-active)' },
      { label:'Insurance active', value:iAct,           color:'var(--color-active)' },
      { label:'Inactive',         value:inact,          color:'var(--color-inactive)' }
    ];
  }, [doctors]);

  /* --- filtering + the expiry sort, unchanged --- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = doctors.slice();
    if(batchIds) list = list.filter(d => batchIds.indexOf(d.id)>=0);
    list = list.filter(d => {
      const st = statusOf(d);
      if(lens==='kmpdc-inactive'     && st.k.status!=='Inactive') return false;
      if(lens==='insurance-inactive' && st.inv.status!=='Inactive') return false;
      if(lens==='expiring'           && !(st.kWarn||st.iWarn)) return false;
      if(lens==='not-recorded'       && !(st.k.status==='Not recorded'||st.inv.status==='Not recorded')) return false;
      if(catFilter!=='All' && d.category!==catFilter) return false;
      if(divFilter!=='All' && d.speciality!==divFilter) return false;
      if(q){
        const hay = String(d.fullNames||'').toLowerCase()+' '+String(d.regNo||'').toLowerCase();
        if(hay.indexOf(q)<0) return false;
      }
      return true;
    });
    list.sort((a,b) => statusOf(a).soonest - statusOf(b).soonest);
    return list;
  }, [doctors, batchIds, lens, catFilter, divFilter, query]);

  const filtersOn = lens!=='all' || catFilter!=='All' || divFilter!=='All' || !!query.trim() || !!batchIds;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current   = Math.min(page, pageCount);
  const visible   = filtered.slice((current-1)*PAGE_SIZE, current*PAGE_SIZE);

  /* Any change to the filter set puts you back on page one. */
  useEffect(() => { setPage(1); }, [lens, catFilter, divFilter, query, batchIds]);

  const goPage = (n) => {
    setPage(n);
    if(listTop.current) listTop.current.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block:'start' });
  };

  const resetFilters = () => {
    setQuery(''); setLens('all'); setCatFilter('All'); setDivFilter('All');
    if(batchIds) onClearBatch();
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">

      {/* ---- page head ---- */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-[26px] leading-none lg:text-[30px]">Doctor registry</h1>
          <p className="mt-2 text-[12.5px] text-ink-52">
            {loading
              ? 'Loading records…'
              : <>{filtered.length}{filtered.length===1 ? ' doctor' : ' doctors'} · sorted by soonest expiry</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => exportCsv(filtered)}
            disabled={loading || !!error || !filtered.length}
          >
            <Download width="15" height="15" />
            Export CSV
          </button>
          <button type="button" className="btn btn-sm" onClick={() => onNavigate('import')}>
            <Upload width="15" height="15" />
            Import
          </button>
        </div>
      </div>

      {batchIds && (
        <p className="mt-3 text-[12px] text-brand">
          Showing the imported batch ·{' '}
          <button type="button" onClick={onClearBatch} className="font-semibold underline underline-offset-2">
            show everyone
          </button>
        </p>
      )}

      <div className="mt-6" ref={listTop}>
        {error ? (
          <ErrorState message={error} onRetry={onRetry} retrying={retrying} />
        ) : loading ? (
          <RegistrySkeleton />
        ) : (
          <>
            {/* ---- stats ---- */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map(s => (
                <div key={s.label} className="card">
                  <b className="block font-display text-[32px] font-bold leading-none" style={{ color:s.color }}>
                    {Math.round(s.value*t)}
                  </b>
                  <span className="mt-1.5 block text-[12px] text-ink-52">{s.label}</span>
                </div>
              ))}
            </div>

            {/* ---- search ---- */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 flex-1 sm:max-w-sm">
                <Search width="16" height="16" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-52" />
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name or registration number"
                  aria-label="Search the registry by doctor name or registration number"
                  className="inp pl-10 pr-9"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-ink-52 hover:bg-line-soft hover:text-ink"
                  >
                    <Close width="13" height="13" />
                  </button>
                )}
              </div>
              {filtersOn && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
                  Reset filters
                </button>
              )}
            </div>

            {/* ---- filter chips ---- */}
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status filter">
                {LENSES.map(l => (
                  <button key={l[0]} type="button" className="chip-filter"
                          aria-pressed={lens===l[0]} onClick={() => setLens(l[0])}>
                    {l[1]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Category filter">
                <span className="mr-0.5 text-[11px] uppercase tracking-[.06em] text-ink-52">Cat</span>
                {['All'].concat(CATEGORIES).map(c => (
                  <button key={c} type="button" className="chip-filter chip-sub"
                          aria-pressed={catFilter===c} onClick={() => setCatFilter(c)}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Division filter">
                <span className="mr-0.5 text-[11px] uppercase tracking-[.06em] text-ink-52">Div</span>
                {['All'].concat(DIVISIONS).map(c => (
                  <button key={c} type="button" className="chip-filter chip-sub"
                          aria-pressed={divFilter===c} onClick={() => setDivFilter(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* ---- cards ---- */}
            <div className="mt-5">
              {visible.length ? (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {visible.map((d,i) => (
                      <DoctorCard key={d.id} doctor={d} index={i} onOpen={onOpen} onEdit={onEdit} />
                    ))}
                  </div>

                  {pageCount > 1 && (
                    <nav aria-label="Registry pages" className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                      <p className="text-[12px] text-ink-52" aria-live="polite">
                        Showing <b className="font-mono text-ink-72">{(current-1)*PAGE_SIZE+1}–{Math.min(current*PAGE_SIZE, filtered.length)}</b>
                        {' of '}<b className="font-mono text-ink-72">{filtered.length}</b>
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button" className="btn btn-ghost btn-sm" disabled={current===1}
                          onClick={() => goPage(current-1)} aria-label="Previous page"
                        >
                          <ChevLeft width="15" height="15" /> Prev
                        </button>
                        {Array.from({ length:pageCount }, (_,i) => i+1).map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => goPage(n)}
                            aria-label={'Page '+n}
                            aria-current={n===current ? 'page' : undefined}
                            className={
                              'h-8 min-w-8 rounded-lg border px-2 font-mono text-[12.5px] font-semibold transition-colors '+
                              (n===current ? 'border-brand bg-brand text-white' : 'border-line text-ink-72 hover:border-brand-edge')
                            }
                          >
                            {n}
                          </button>
                        ))}
                        <button
                          type="button" className="btn btn-ghost btn-sm" disabled={current===pageCount}
                          onClick={() => goPage(current+1)} aria-label="Next page"
                        >
                          Next <ChevRight width="15" height="15" />
                        </button>
                      </div>
                    </nav>
                  )}
                </>
              ) : filtersOn ? (
                <EmptyState
                  title="No doctors match these filters"
                  body="Nothing on the registry fits the search and filters you have on. Clear them to see everyone."
                  actionLabel="Reset filters"
                  onAction={resetFilters}
                />
              ) : (
                <EmptyState
                  title="The registry is empty"
                  body="No doctors have been registered yet. Add the first one, or bring across an existing list as a CSV."
                  actionLabel="Register a doctor"
                  onAction={() => onNavigate('apply')}
                  secondaryLabel="Import a CSV"
                  onSecondary={() => onNavigate('import')}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
