import { useEffect, useRef, useState, useId } from 'react';
import { NAV } from '../lib/constants.js';
import { ChevDown, Menu, Close, SignOut, Sync } from './icons.jsx';

/* The Kenya Hospital Association roundel, over the hospital name as live text.
   The mark carries the brand; the name stays text so it reflows on small
   screens and stays crisp at any density. */
function HospitalLogo(){
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <img
        src="/logo-nairobi-hospital.png"
        width="36"
        height="36"
        alt="The Nairobi Hospital"
        className="h-9 w-9 shrink-0"
        decoding="async"
      />
      <span className="hidden leading-tight sm:block">
        <span className="block font-display text-[15px] font-bold tracking-tight text-navy">
          The Nairobi Hospital
        </span>
        <span className="block text-[11px] text-ink-52">Admitting Rights Registry</span>
      </span>
    </span>
  );
}

function UserMenu({ user, onSignOut }){
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if(!open) return;
    const away = (e) => { if(wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const esc  = (e) => { if(e.key==='Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={wrap}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-2 transition-colors hover:border-brand-edge hover:bg-raised"
      >
        <span
          aria-hidden="true"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-semibold text-white"
        >
          {user.initials}
        </span>
        <span className="hidden text-[13px] font-medium text-ink md:block">{user.name}</span>
        <ChevDown width="14" height="14" className="text-ink-52" />
        <span className="sr-only">Open account menu</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="anim-in absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_16px_40px_rgba(10,10,35,.14)]"
        >
          <div className="border-b border-line px-4 py-3">
            <div className="text-[13px] font-semibold text-navy">{user.name}</div>
            <div className="truncate text-[12px] text-ink-52">{user.email}</div>
            <div className="mt-1.5 text-[11px] text-ink-52">{user.role}</div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onSignOut(); }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-medium text-ink transition-colors hover:bg-raised"
          >
            <SignOut width="15" height="15" className="text-ink-52" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ route, onNavigate, user, onSignOut, lastSynced, children }){
  const [mobileNav, setMobileNav] = useState(false);

  /* Keep the document title in step with the section being viewed. */
  useEffect(() => {
    const label = (NAV.find(n => n.key===route) || {}).label;
    document.title = (label ? label+' · ' : '')+'Admitting Rights Registry · The Nairobi Hospital';
  }, [route]);

  const navLink = (item, onPick) => {
    const active = route === item.key;
    return (
      <a
        key={item.key}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        onClick={(e) => { e.preventDefault(); onNavigate(item.key); onPick && onPick(); }}
        className={
          'relative block px-1 py-3 text-[13.5px] font-semibold transition-colors ' +
          (active ? 'text-brand' : 'text-ink-72 hover:text-ink')
        }
      >
        {item.label}
        <span
          aria-hidden="true"
          className={'absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-colors '+(active ? 'bg-brand' : 'bg-transparent')}
        />
      </a>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <a
        href="#main"
        className="sr-only rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100]"
      >
        Skip to content
      </a>

      {/* ---- header bar ---- */}
      <header className="no-print sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => setMobileNav(v => !v)}
            aria-expanded={mobileNav}
            aria-label={mobileNav ? 'Close navigation' : 'Open navigation'}
            className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-72 transition-colors hover:bg-raised md:hidden"
          >
            {mobileNav ? <Close width="18" height="18"/> : <Menu width="18" height="18"/>}
          </button>

          <HospitalLogo />

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-[11.5px] text-ink-52 lg:flex">
              <Sync width="13" height="13" className="text-accent-ink" />
              Last synced with KMPDC:&nbsp;
              <time className="font-mono text-ink-72">{lastSynced}</time>
            </span>
            <UserMenu user={user} onSignOut={onSignOut} />
          </div>
        </div>

        {/* ---- primary nav ---- */}
        <nav aria-label="Primary" className="border-t border-line-soft">
          <div className="mx-auto hidden w-full max-w-[1440px] items-center gap-7 px-4 sm:px-6 md:flex lg:px-10">
            {NAV.map(item => navLink(item))}
          </div>

          {mobileNav && (
            <div className="anim-in mx-auto flex w-full max-w-[1440px] flex-col gap-1 px-4 pb-3 sm:px-6 md:hidden">
              {NAV.map(item => navLink(item, () => setMobileNav(false)))}
              <span className="mt-2 flex items-center gap-1.5 border-t border-line-soft pt-2 text-[11.5px] text-ink-52">
                <Sync width="13" height="13" className="text-accent-ink" />
                Last synced with KMPDC: <time className="font-mono text-ink-72">{lastSynced}</time>
              </span>
            </div>
          )}
        </nav>
      </header>

      {/* ---- page body ---- */}
      <main id="main" className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>

      {/* ---- footer ---- */}
      <footer className="no-print border-t border-line bg-raised">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-4 text-[11.5px] text-ink-52 sm:px-6 lg:px-10">
          <span>The Nairobi Hospital</span>
          <span aria-hidden="true" className="text-line">·</span>
          <span>Kenya Hospital Association</span>
          <span className="ml-auto">Internal system — patient-identifying data is not held here.</span>
        </div>
      </footer>
    </div>
  );
}
