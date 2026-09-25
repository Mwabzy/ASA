import { motion } from 'motion/react';
import { statusOf } from '../lib/status.js';
import { riseItem } from '../lib/motion.js';
import { Eye, Pencil } from './icons.jsx';

/* The registry as rows: one line per doctor, for scanning a long list. It
   carries the same facts as a card and opens the same detail drawer. */

function Status({ status, warn, dot, days, date }){
  return (
    <span className="flex flex-col">
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <span className={'dot'+(warn ? ' anim-warn' : '')} style={{ background: dot }} />
        <span className="text-[12.5px] text-ink-72">{warn ? 'Active · '+days+'d' : status}</span>
      </span>
      <span className="whitespace-nowrap pl-[14px] font-mono text-[11px] text-ink-52">{date}</span>
    </span>
  );
}

const DOC_KEYS = ['docInsurance','docLicence','docCourses','docCv'];

function docCount(d){
  return DOC_KEYS.reduce((n,k) => n + (d[k] || []).length, 0);
}

const th = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[.06em] text-ink-52';
const iconBtn = 'grid h-7 w-7 place-items-center rounded-lg border border-line bg-surface text-ink-72 transition-colors hover:border-brand-edge hover:text-brand';

export default function DoctorList({ doctors, onOpen, onEdit }){
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-raised">
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">Doctors on the registry, sorted by soonest expiry</caption>
        <thead className="border-b border-line bg-surface">
          <tr>
            <th scope="col" className={th+' w-auto'}>Doctor</th>
            <th scope="col" className={th+' hidden w-[13%] lg:table-cell'}>Category</th>
            <th scope="col" className={th+' hidden w-[20%] md:table-cell'}>Division</th>
            <th scope="col" className={th+' w-[118px] sm:w-[16%]'}>KMPDC</th>
            <th scope="col" className={th+' hidden w-[16%] sm:table-cell'}>Insurance</th>
            <th scope="col" className={th+' hidden w-[9%] xl:table-cell'}>Docs</th>
            <th scope="col" className={th+' w-[76px]'}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {doctors.map(d => {
            const st = statusOf(d);
            const name = (d.salutation ? d.salutation+' ' : '')+d.fullNames;
            const docs = docCount(d);
            return (
              <motion.tr
                key={d.id}
                variants={riseItem}
                onClick={() => onOpen(d)}
                className="cursor-pointer border-b border-line-soft transition-colors last:border-b-0 hover:bg-surface"
              >
                <td className="px-3 py-3 align-top">
                  {/* The name is the keyboard route into the row; the row's
                      own click is a convenience for the mouse. */}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onOpen(d); }}
                    className="block max-w-full truncate text-left text-[14px] font-semibold text-ink hover:text-brand"
                  >
                    {name}
                  </button>
                  <span className="block truncate text-[12px] text-ink-52">
                    <span className="font-mono">{d.regNo}</span>
                    <span className="md:hidden">{' · '+(d.speciality || '—')}</span>
                  </span>
                </td>
                <td className="hidden truncate px-3 py-3 align-top text-[13px] text-ink-72 lg:table-cell">
                  {d.category || '—'}
                </td>
                <td className="hidden px-3 py-3 align-top md:table-cell">
                  <span className="block truncate text-[13px] text-ink-72">{d.speciality || '—'}</span>
                  {d.subSpeciality && <span className="block truncate text-[11.5px] text-ink-52">{d.subSpeciality}</span>}
                </td>
                <td className="px-3 py-3 align-top">
                  <Status status={st.k.status} warn={st.kWarn} dot={st.kDot} days={st.k.days} date={st.kDate} />
                </td>
                <td className="hidden px-3 py-3 align-top sm:table-cell">
                  <Status status={st.inv.status} warn={st.iWarn} dot={st.iDot} days={st.inv.days} date={st.iDate} />
                </td>
                <td className="hidden px-3 py-3 align-top font-mono text-[12.5px] text-ink-72 xl:table-cell">
                  {docs || <span className="text-ink-52">—</span>}
                </td>
                <td className="px-3 py-3 align-top">
                  <span className="flex justify-end gap-1.5">
                    <button type="button" aria-label={'View '+name} className={iconBtn}
                            onClick={e => { e.stopPropagation(); onOpen(d); }}>
                      <Eye width="14" height="14" />
                    </button>
                    <button type="button" aria-label={'Edit '+name} className={iconBtn}
                            onClick={e => { e.stopPropagation(); onEdit(d); }}>
                      <Pencil width="14" height="14" />
                    </button>
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
