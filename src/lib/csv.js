/* CSV export + download — ported verbatim. */
import { statusOf } from './status.js';
import { TARGETS, TEMPLATE_EXAMPLE } from './importer.js';

function cell(v){
  const s = Array.isArray(v) ? v.join('; ') : (v || '');
  return /[,"]/.test(s) ? '"'+String(s).replace(/"/g,'""')+'"' : s;
}

export function download(name, text){
  try {
    const b = new Blob([text], { type:'text/csv' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  } catch (e) { /* download blocked — nothing useful to fall back to */ }
}

const EXPORT_COLS = ['salutation','fullNames','regNo','category','speciality','subSpeciality','quals',
                     'assocCategory','admissionYear','kmpdcIssue','insuranceFrom','dob','contact','email','town','address'];

export function exportCsv(list){
  const head = EXPORT_COLS.join(',')+',kmpdcStatus,insuranceStatus';
  const body = list.map(d => {
    const st = statusOf(d);
    return EXPORT_COLS.map(c => cell(d[c])).join(',')+','+st.k.status+','+st.inv.status;
  }).join('\n');
  download('nairobi-hospital-admitting-rights.csv', head+'\n'+body);
}

export function downloadTemplate(){
  const cols = TARGETS.map(t => t[1]);
  download('admitting-rights-import-template.csv',
    cols.join(',')+'\n'+TEMPLATE_EXAMPLE.map(cell).join(','));
}

export function downloadErrors(results){
  const bad = results.filter(r => !r.ok);
  const cols = TARGETS.map(t => t[0]);
  const head = cols.join(',')+',reason';
  const body = bad.map(r => {
    const vals = cols.map(c => cell(r.rec[c]));
    return vals.join(',')+',"'+Object.keys(r.errs).map(k => r.errs[k]).join(' ').replace(/"/g,'""')+'"';
  }).join('\n');
  download('admitting-rights-import-errors.csv', head+'\n'+body);
}
