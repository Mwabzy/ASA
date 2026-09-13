import { useEffect, useRef } from 'react';
import { parse, fmt, diffDays } from '../lib/dates.js';
import { kmpdc, insurance, dotFor, statusColor } from '../lib/status.js';
import Mascot from './Mascot.jsx';
import { Close, Pencil } from './icons.jsx';

function detailGroups(d){
  const docs = (k) => {
    const a = d[k] || [];
    return a.length ? a.map(x => x.name).join(', ') : 'Not attached';
  };
  return [
    { title:'Identity', items:[
      ['Salutation',d.salutation,'ui'],['Full names',d.fullNames,'ui'],
      ['Date of birth',fmt(parse(d.dob)),'mono'],['Contact',d.contact,'mono'],['Email',d.email,'mono']]},
    { title:'Office', items:[
      ['P.O. Box',d.poBox||'—','mono'],['Town',d.town,'ui'],['Consulting rooms',d.address||'—','ui']]},
    { title:'Practice', items:[
      ['Registration no.',d.regNo,'mono'],['Qualifications',(d.quals||[]).join(', ')||'—','ui'],
      ['Category', d.category==='Other'?(d.categoryOther||'Other'):d.category,'ui'],
      ['Division',d.speciality,'ui'],['Sub-speciality',d.subSpeciality||'—','ui']]},
    { title:'Membership', items:[
      ['Association',d.assocCategory,'ui'],['Year of admission',d.admissionYear||'—','mono']]},
    { title:'Documents', items:[
      ['Indemnity insurance',docs('docInsurance'),'ui'],
      ['Practice licence',docs('docLicence'),'ui'],
      ['Course certificates',docs('docCourses'),'ui']]}
  ];
}

/* A timeline per status showing where today sits between issue and expiry. */
function StatusBlock({ label, v, rule, startLabel, startDate, endLabel, endDate, startD, endD }){
  let pct = 50;
  if(startD && endD){
    const total = diffDays(endD,startD) || 1;
    pct = Math.max(4, Math.min(96, diffDays(new Date(),startD)/total*100));
  }
  return (
    <div className="mb-3 rounded-[14px] border border-line px-4 py-3.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className="dot" style={{ background: dotFor(v) }} />
          <span className="text-[13px] font-semibold" style={{ color: statusColor(v) }}>{v.status}</span>
        </span>
      </div>

      {v.status!=='Not recorded' && (
        <>
          <div className="relative mx-1 mb-1 mt-5 h-0.5 rounded-sm bg-line">
            <i aria-hidden="true" className="absolute -top-[3px] left-0 h-2 w-2 rounded-full bg-brand" />
            <i aria-hidden="true" className="absolute -top-[3px] right-0 h-2 w-2 rounded-full" style={{ background:'var(--color-ink-52)' }} />
            <i aria-hidden="true" className="absolute -top-[7px] h-4 w-0.5 -translate-x-1/2 bg-brand" style={{ left: pct+'%' }} />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[11px] text-ink-72">
            <span>{startDate}</span>
            <span className="text-brand">today</span>
            <span>{endDate}</span>
          </div>
        </>
      )}

      <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-52">
        {startLabel} → {endLabel} · <span className="text-ink-72">{rule}</span>
      </p>
    </div>
  );
}

export default function DoctorDetail({ doctor, onClose, onEdit }){
  const panel = useRef(null);
  const restoreTo = useRef(null);

  useEffect(() => {
    restoreTo.current = document.activeElement;
    const esc = (e) => { if(e.key==='Escape') onClose(); };
    document.addEventListener('keydown', esc);
    /* Move focus into the panel so screen readers and keyboards land here. */
    const t = setTimeout(() => panel.current && panel.current.focus(), 30);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      if(restoreTo.current && restoreTo.current.focus) restoreTo.current.focus();
    };
  }, [onClose]);

  if(!doctor) return null;

  const k = kmpdc(doctor.kmpdcIssue);
  const inv = insurance(doctor.insuranceFrom);
  const mascot = (k.status==='Inactive'||inv.status==='Inactive') ? 'concerned'
    : ((k.status==='Not recorded'&&inv.status==='Not recorded') ? 'idle' : 'done');
  const name = (doctor.salutation ? doctor.salutation+' ' : '')+doctor.fullNames;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close detail"
        onClick={onClose}
        className="anim-in absolute inset-0 bg-[rgba(10,10,35,.45)]"
      />

      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={name+' — registry record'}
        className="anim-sheet absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl border-t border-line bg-surface shadow-[0_-20px_60px_rgba(10,10,35,.16)] outline-none sm:anim-drawer sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(30rem,100%)] sm:rounded-none sm:rounded-l-2xl sm:border-l sm:border-t-0"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-line px-5 pb-4 pt-5">
          <div className="-mt-1.5 shrink-0"><Mascot name={mascot} size={60} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[21px] font-bold leading-tight">{name}</h2>
            <p className="mt-1 text-[12px] text-ink-52">
              <span className="font-mono">{doctor.regNo}</span> · {doctor.speciality || '—'}
              {doctor.subSpeciality ? ' · '+doctor.subSpeciality : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(doctor)}
              className="btn btn-ghost btn-sm"
            >
              <Pencil width="14" height="14" />
              Edit
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink-72 transition-colors hover:bg-raised"
            >
              <Close width="15" height="15" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4">
          {detailGroups(doctor).map(g => (
            <section key={g.title} className="mb-4">
              <h3 className="kicker mb-2">{g.title}</h3>
              {g.items.map(it => (
                <div key={it[0]} className="kv border-b border-line-soft">
                  <span className="kv-k">{it[0]}</span>
                  <span className={'kv-v'+(it[2]==='mono' ? ' font-mono' : '')}>{it[1] || '—'}</span>
                </div>
              ))}
            </section>
          ))}

          <StatusBlock
            label="KMPDC licence" v={k} rule="31 Dec of issue year + 1"
            startLabel="Issued" startDate={fmt(parse(doctor.kmpdcIssue))}
            endLabel="Expires" endDate={k.expiry ? fmt(k.expiry) : '—'}
            startD={parse(doctor.kmpdcIssue)} endD={k.expiry}
          />
          <StatusBlock
            label="Indemnity insurance" v={inv} rule="start + 12 months"
            startLabel="From" startDate={doctor.insuranceFrom ? fmt(parse(doctor.insuranceFrom)) : 'Not recorded'}
            endLabel="Cover to" endDate={inv.coverTo ? fmt(inv.coverTo) : '—'}
            startD={parse(doctor.insuranceFrom)} endD={inv.coverTo}
          />
        </div>
      </div>
    </div>
  );
}
