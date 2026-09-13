import { statusOf } from '../lib/status.js';
import { Eye, Pencil } from './icons.jsx';

function Badge({ label, status, warn, dot, date }){
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1">
      <span className={'dot'+(warn ? ' anim-warn' : '')} style={{ background: dot }} />
      <span className="text-[11px] text-ink-52">{label}</span>
      <span className="text-[11.5px] text-ink-72">{status}</span>
      <span className="font-mono text-[11px] text-ink-52">{date}</span>
    </span>
  );
}

export default function DoctorCard({ doctor, onOpen, onEdit, index = 0 }){
  const st = statusOf(doctor);
  const kLabel = st.kWarn ? ('Active · '+st.k.days+'d') : st.k.status;
  const iLabel = st.iWarn ? ('Active · '+st.inv.days+'d') : st.inv.status;
  const name = (doctor.salutation ? doctor.salutation+' ' : '')+doctor.fullNames;

  return (
    <article
      className="group anim-rise relative rounded-[14px] border border-line bg-raised transition-[border-color,transform,box-shadow] hover:-translate-y-px hover:border-brand-edge hover:shadow-[0_6px_20px_rgba(10,10,35,.07)] focus-within:border-brand-edge"
      style={{ animationDelay: Math.min(index,12)*30+'ms' }}
    >
      {/* The whole card is the click target; the overlay link carries the label. */}
      <button
        type="button"
        onClick={() => onOpen(doctor)}
        className="absolute inset-0 z-0 rounded-[14px]"
      >
        <span className="sr-only">{'View '+name+', registration '+doctor.regNo}</span>
      </button>

      <div className="pointer-events-none relative z-10 px-4 py-3.5">
        <div className="mb-2.5 flex items-baseline justify-between gap-2.5">
          <h3 className="truncate font-sans text-[15px] font-semibold tracking-normal text-ink">{name}</h3>
          <span className="shrink-0 font-mono text-[12px] text-ink-52">{doctor.regNo}</span>
        </div>

        <p className="mb-3 truncate text-[12px] text-ink-52">
          {doctor.speciality || '—'}{doctor.subSpeciality ? ' · '+doctor.subSpeciality : ''}
        </p>

        <div className="flex flex-wrap gap-2">
          <Badge label="KMPDC" status={kLabel} warn={st.kWarn} dot={st.kDot} date={st.kDate} />
          <Badge label="Ins"   status={iLabel} warn={st.iWarn} dot={st.iDot} date={st.iDate} />
        </div>
      </div>

      {/* View / Edit appear on hover and on keyboard focus. */}
      <div className="absolute right-3 top-3 z-20 flex gap-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onOpen(doctor)}
          aria-label={'View '+name}
          className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-surface text-ink-72 transition-colors hover:border-brand-edge hover:text-brand"
        >
          <Eye width="14" height="14" />
        </button>
        <button
          type="button"
          onClick={() => onEdit(doctor)}
          aria-label={'Edit '+name}
          className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-surface text-ink-72 transition-colors hover:border-brand-edge hover:text-brand"
        >
          <Pencil width="14" height="14" />
        </button>
      </div>
    </article>
  );
}
