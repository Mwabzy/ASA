import Mascot from './Mascot.jsx';
import { Alert, Refresh } from './icons.jsx';

/* ---------- loading ---------- */

export function StatSkeleton(){
  return (
    <div className="card" aria-hidden="true">
      <div className="skel h-8 w-16" />
      <div className="skel mt-2.5 h-3 w-24" />
    </div>
  );
}

export function CardSkeleton(){
  return (
    <div className="card" aria-hidden="true">
      <div className="flex items-baseline justify-between gap-3">
        <div className="skel h-4 w-40" />
        <div className="skel h-3 w-14" />
      </div>
      <div className="skel mt-3 h-3 w-28" />
      <div className="mt-3.5 flex gap-2">
        <div className="skel h-7 w-32 rounded-full" />
        <div className="skel h-7 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function RegistrySkeleton({ cards = 6 }){
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the registry…</span>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length:4 }, (_,i) => <StatSkeleton key={i} />)}
      </div>
      <div className="mt-6 flex gap-2">
        {Array.from({ length:5 }, (_,i) => <div key={i} className="skel h-8 w-24 rounded-full" aria-hidden="true" />)}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length:cards }, (_,i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
}

/* ---------- empty ---------- */

export function EmptyState({ title, body, actionLabel, onAction, secondaryLabel, onSecondary }){
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-8 py-16 text-center">
      <Mascot name="idle" size={96} />
      <h3 className="mt-2 text-[19px] font-bold">{title}</h3>
      <p className="max-w-sm text-[13px] leading-relaxed text-ink-52">{body}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2.5">
        {actionLabel && (
          <button type="button" className="btn btn-sm" onClick={onAction}>{actionLabel}</button>
        )}
        {secondaryLabel && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onSecondary}>{secondaryLabel}</button>
        )}
      </div>
    </div>
  );
}

/* ---------- error ---------- */

export function ErrorState({ title = 'The registry could not be loaded', message, onRetry, retrying }){
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line px-8 py-16 text-center"
      style={{ background:'rgba(220,38,38,.03)' }}
    >
      <span
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-full"
        style={{ background:'rgba(220,38,38,.10)', color:'var(--color-inactive)' }}
      >
        <Alert width="24" height="24" />
      </span>
      <h3 className="mt-1 text-[19px] font-bold">{title}</h3>
      <p className="max-w-md text-[13px] leading-relaxed text-ink-72">{message}</p>
      <button type="button" className="btn btn-sm mt-3" onClick={onRetry} disabled={retrying}>
        <Refresh width="15" height="15" />
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  );
}

/* ---------- toast ---------- */

export function Toast({ text, tone = 'ok' }){
  const colour = tone==='bad' ? 'var(--color-inactive)' : 'var(--color-active)';
  return (
    <div
      role="status"
      aria-live="polite"
      className="anim-rise fixed bottom-7 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-xl border border-accent bg-surface px-4 py-2.5 shadow-[0_10px_30px_rgba(10,10,35,.18)]"
    >
      <span className="dot" style={{ background: colour }} />
      <span className="text-[13px] font-medium text-ink">{text}</span>
    </div>
  );
}
