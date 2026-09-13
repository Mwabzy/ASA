/* Stroke icons, 24×24 grid, inherit currentColor. */

const base = { viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2,
               strokeLinecap:'round', strokeLinejoin:'round', 'aria-hidden':true, focusable:'false' };

export const Search   = (p) => <svg {...base} {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
export const ChevDown = (p) => <svg {...base} {...p}><path d="m6 9 6 6 6-6"/></svg>;
export const ChevLeft = (p) => <svg {...base} {...p}><path d="m15 18-6-6 6-6"/></svg>;
export const ChevRight= (p) => <svg {...base} {...p}><path d="m9 18 6-6-6-6"/></svg>;
export const Close     = (p) => <svg {...base} {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>;
export const Check     = (p) => <svg {...base} {...p}><path d="M20 6 9 17l-5-5"/></svg>;
export const Menu      = (p) => <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
export const Eye       = (p) => <svg {...base} {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
export const Pencil    = (p) => <svg {...base} {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
export const Download  = (p) => <svg {...base} {...p}><path d="M12 3v13"/><path d="m7 12 5 5 5-5"/><path d="M4 20h16"/></svg>;
export const Upload    = (p) => <svg {...base} {...p}><path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M4 20h16"/></svg>;
export const FileIcon  = (p) => <svg {...base} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>;
export const Refresh   = (p) => <svg {...base} {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>;
export const Alert     = (p) => <svg {...base} {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>;
export const Plus      = (p) => <svg {...base} {...p}><path d="M12 5v14M5 12h14"/></svg>;
export const SignOut   = (p) => <svg {...base} {...p}><path d="M15 17l5-5-5-5"/><path d="M20 12H9"/><path d="M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/></svg>;
export const Sync      = (p) => <svg {...base} {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>;
export const EyeOff    = (p) => <svg {...base} {...p}><path d="M10.7 6.2A9.6 9.6 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9"/><path d="M6.6 6.7A16.6 16.6 0 0 0 2 12s3.6 6 10 6a9.8 9.8 0 0 0 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m3 3 18 18"/></svg>;
