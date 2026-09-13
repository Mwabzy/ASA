/* The registry mascot. Ported verbatim from the original SVG builder —
   same poses, same geometry, now as a component. */

const NAVY = '#0A0A23';

function pose(name){
  switch(name){
    case 'greeting':
      return {
        eyes: <><circle cx="42" cy="42" r="2.6" fill={NAVY}/><circle cx="58" cy="42" r="2.6" fill={NAVY}/></>,
        mouth: <path d="M43 50 q7 6 14 0" stroke={NAVY} strokeWidth="2.2" fill="none" strokeLinecap="round"/>,
        arm: <>
          <path d="M76 92 q14 -8 11 -24" stroke={NAVY} strokeWidth="2.4" fill="none" strokeLinecap="round"/>
          <circle cx="87" cy="65" r="6.5" fill="#fff" stroke={NAVY} strokeWidth="2.2"/>
        </>
      };
    case 'checking':
      return {
        eyes: <>
          <path d="M38 43 q4 -4 8 0" stroke={NAVY} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          <path d="M54 43 q4 -4 8 0" stroke={NAVY} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        </>,
        mouth: <path d="M45 51 h10" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round"/>,
        arm: <>
          <rect x="58" y="88" width="28" height="34" rx="4" fill="#fff" stroke={NAVY} strokeWidth="2.2"/>
          <rect x="66" y="84" width="12" height="7" rx="2" fill="var(--color-accent)"/>
          <path d="M64 100 h16 M64 108 h16 M64 116 h10" stroke="var(--color-line)" strokeWidth="2.4" strokeLinecap="round"/>
        </>
      };
    case 'listening':
      return {
        eyes: <><circle cx="42" cy="42" r="2.6" fill={NAVY}/><circle cx="58" cy="42" r="2.6" fill={NAVY}/></>,
        mouth: <path d="M44 50 q6 5 12 0" stroke={NAVY} strokeWidth="2.2" fill="none" strokeLinecap="round"/>,
        arm: <>
          <path d="M76 92 q12 -4 10 -18" stroke={NAVY} strokeWidth="2.4" fill="none" strokeLinecap="round"/>
          <circle cx="85" cy="70" r="6" fill="#fff" stroke={NAVY} strokeWidth="2.2"/>
          <path d="M88 56 q6 4 5 11" stroke="var(--color-accent)" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
        </>
      };
    case 'sorting':
      return {
        eyes: <><circle cx="42" cy="42" r="2.6" fill={NAVY}/><circle cx="58" cy="42" r="2.6" fill={NAVY}/></>,
        mouth: <path d="M45 50 h10" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round"/>,
        arm: <>
          <rect x="14" y="90" width="24" height="18" rx="3" fill="#fff" stroke={NAVY} strokeWidth="2.2" transform="rotate(-10 26 99)"/>
          <rect x="62" y="86" width="24" height="18" rx="3" fill="#fff" stroke={NAVY} strokeWidth="2.2" transform="rotate(9 74 95)"/>
          <path d="M18 96 h14 M66 92 h14" stroke="var(--color-accent)" strokeWidth="2.2" strokeLinecap="round"/>
        </>
      };
    case 'concerned':
      return {
        eyes: <>
          <circle cx="42" cy="43" r="2.6" fill={NAVY}/><circle cx="58" cy="43" r="2.6" fill={NAVY}/>
          <path d="M36 36 l8 3 M64 36 l-8 3" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round"/>
        </>,
        mouth: <path d="M44 53 q6 -5 12 0" stroke={NAVY} strokeWidth="2.2" fill="none" strokeLinecap="round"/>,
        arm: <>
          <path d="M74 94 q10 -8 4 -18" stroke={NAVY} strokeWidth="2.4" fill="none" strokeLinecap="round"/>
          <circle cx="74" cy="70" r="6" fill="#fff" stroke={NAVY} strokeWidth="2.2"/>
        </>
      };
    case 'done':
      return {
        eyes: <>
          <path d="M38 43 q4 -5 8 0" stroke={NAVY} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          <path d="M54 43 q4 -5 8 0" stroke={NAVY} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        </>,
        mouth: <path d="M42 49 q8 8 16 0" stroke={NAVY} strokeWidth="2.2" fill="none" strokeLinecap="round"/>,
        arm: <>
          <path d="M76 94 q13 -6 11 -20" stroke={NAVY} strokeWidth="2.4" fill="none" strokeLinecap="round"/>
          <circle cx="87" cy="70" r="7" fill="var(--color-accent)"/>
          <path d="M83.5 70 l2.5 2.5 l4.5 -5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      };
    default: /* idle */
      return {
        eyes: <><circle cx="42" cy="42" r="2.6" fill={NAVY}/><circle cx="58" cy="42" r="2.6" fill={NAVY}/></>,
        mouth: <path d="M45 50 h10" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round"/>,
        arm: null
      };
  }
}

export default function Mascot({ name = 'idle', size = 96, className = '' }){
  const p = pose(name);
  return (
    <svg width={Math.round(size*0.74)} height={size} viewBox="0 0 100 140" fill="none"
         aria-hidden="true" focusable="false" className={className}>
      <ellipse cx="50" cy="133" rx="25" ry="4.5" fill="rgba(10,10,35,.07)"/>
      {/* coat */}
      <path d="M50 64 L74 74 q6 3 6 10 v38 q0 6 -6 6 H26 q-6 0 -6 -6 V84 q0 -7 6 -10 z"
            fill="#fff" stroke={NAVY} strokeWidth="2.4" strokeLinejoin="round"/>
      <path d="M50 64 L58 80 L50 90 L42 80 z" fill="var(--color-brand)"/>
      <rect x="21" y="114" width="58" height="5" fill="var(--color-accent)" opacity=".85"/>
      {/* stethoscope */}
      <path d="M39 70 q-13 12 -8 29 q3 10 13 10" stroke="var(--color-accent)" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
      <circle cx="47" cy="108" r="4.5" fill="var(--color-accent)"/>
      {p.arm}
      {/* head */}
      <circle cx="50" cy="40" r="22" fill="#fff" stroke={NAVY} strokeWidth="2.4"/>
      <path d="M28 34 a22 22 0 0 1 44 0 z" fill="var(--color-brand)"/>
      <path d="M28 34 h44" stroke={NAVY} strokeWidth="2.4" strokeLinecap="round"/>
      {p.eyes}
      {p.mouth}
    </svg>
  );
}
