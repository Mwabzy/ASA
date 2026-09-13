/* CSV import pipeline — ported verbatim.
   The file's own Status column is deliberately ignored: KMPDC and insurance
   status are always recomputed from the dates, so a stale spreadsheet cannot
   mark a lapsed doctor as active. */
import { pad2, iso } from './dates.js';
import { validate, formatContact } from './validate.js';

export const TARGETS = [
  ['salutation','Salutation',['salutation','title','prefix']],
  ['fullNames','Full names',['fullnames','name','names','doctor','fullname','doctorname']],
  ['dob','Date of birth',['dob','dateofbirth','birth','birthdate']],
  ['contact','Contact',['contact','phone','mobile','tel','telephone','cell']],
  ['email','Email',['email','mail','email']],
  ['poBox','P.O. Box',['pobox','box','postal','postcode']],
  ['town','Town',['town','city','location']],
  ['address','Office (consulting rooms)',['address','physical','street','office','rooms']],
  ['regNo','Registration number',['regno','registration','registrationnumber','licence','license','kmpdcno','regnumber']],
  ['quals','Qualifications',['quals','qualifications','qualification','degrees']],
  ['category','Category',['category','type','class','capacity']],
  ['speciality','Division',['division','speciality','specialty','discipline','dept','department']],
  ['subSpeciality','Sub-speciality',['subspeciality','subspecialty','subdiscipline','sub']],
  ['kmpdcIssue','KMPDC issue date',['kmpdcissue','kmpdcissuedate','issuedate','licenceissue','issue']],
  ['insuranceFrom','Insurance from',['insurancefrom','insurance','indemnity','coverfrom','insurancedate','insstart','indemnitystart']],
  ['assocCategory','Association category',['assoccategory','association','membership','assoc']],
  ['admissionYear','Year of admission',['admissionyear','admissiondate','admission','admitted','joined','yearofadmission']]
];

export const IMP_REQ = ['fullNames','dob','contact','email','town','regNo','quals','category',
                        'speciality','kmpdcIssue','assocCategory','admissionYear'];

function norm(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''); }

export function parseCSV(text){
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n')
    .filter(l => l.trim().length);
  function parseLine(l){
    const out = [];
    let cur = '', q = false;
    for(let i=0;i<l.length;i++){
      const c = l[i];
      if(q){
        if(c==='"'){ if(l[i+1]==='"'){ cur+='"'; i++; } else q=false; }
        else cur += c;
      } else {
        if(c===','){ out.push(cur); cur=''; }
        else if(c==='"') q = true;
        else cur += c;
      }
    }
    out.push(cur);
    return out.map(x => x.trim());
  }
  return { headers: parseLine(lines[0]||''), rows: lines.slice(1).map(parseLine) };
}

export function normDate(v){
  if(!v) return '';
  v = String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if(m) return m[3]+'-'+pad2(m[2])+'-'+pad2(m[1]);
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : iso(d);
}

export function autoMap(headers){
  const map = {};
  TARGETS.forEach(t => {
    const id = t[0], syn = t[2];
    const hit = headers.find(h => {
      const n = norm(h);
      return n===norm(id) || syn.indexOf(n)>=0;
    });
    if(hit){ map[id] = hit; return; }
    const partial = headers.find(h => {
      const n = norm(h);
      return n && syn.some(sy => n.indexOf(sy)>=0 || sy.indexOf(n)>=0);
    });
    if(partial) map[id] = partial;
  });
  return map;
}

function cellVal(row, headers, map, target){
  const h = map[target];
  if(!h) return '';
  const i = headers.indexOf(h);
  return i>=0 ? (row[i]||'') : '';
}

export function buildRecordFromRow(imp, row){
  const rec = {};
  TARGETS.forEach(t => { rec[t[0]] = cellVal(row, imp.headers, imp.map, t[0]); });
  rec.dob = normDate(rec.dob);
  rec.kmpdcIssue = normDate(rec.kmpdcIssue);
  rec.insuranceFrom = normDate(rec.insuranceFrom);
  rec.admissionYear = String(rec.admissionYear||'').trim().slice(0,4);
  if(rec.contact) rec.contact = formatContact(rec.contact);
  if(rec.regNo)   rec.regNo = String(rec.regNo).toUpperCase().trim();
  if(rec.email)   rec.email = String(rec.email).toLowerCase().trim();
  rec.quals = rec.quals ? String(rec.quals).split(/[;|,]/).map(x => x.trim()).filter(Boolean) : [];
  rec.applicantType = 'existing';
  rec.docInsurance = []; rec.docLicence = []; rec.docCourses = []; rec.docCv = [];
  return rec;
}

export function impResults(imp, doctors){
  return imp.rows.map((row,i) => {
    const rec = buildRecordFromRow(imp, row);
    const errs = {};
    IMP_REQ.forEach(id => {
      const e = validate(id, rec, doctors);
      if(e) errs[id] = e;
    });
    const dup = !!rec.regNo && doctors.some(d => d.regNo===rec.regNo);
    /* A duplicate is a decision, not a hard error. */
    if(dup && errs.regNo && errs.regNo.indexOf('already exists')>=0) delete errs.regNo;
    return { i, rec, errs, ok:Object.keys(errs).length===0, dup };
  });
}

export function unmappedRequired(imp){
  return TARGETS.filter(t => IMP_REQ.indexOf(t[0])>=0 && !imp.map[t[0]])
                .map(t => t[1]);
}

export const SAMPLE = {
  headers: ['Title','Doctor Name','Birth','Mobile','E-mail','Box','City','Reg No',
            'Qualifications','Capacity','Division','Sub','Licence Issue','Indemnity Start',
            'Membership','Admitted','Status'],
  rows: [
    ['Dr','Peter Kariuki','1985-04-12','0712345678','peter.k@mail.co.ke','00100','Nairobi','B1201','MBChB;MMed','Physician','Medicine','Cardiology','2025-02-01','2025-11-01','Consultant','2021','Active'],
    ['Dr','Grace Wafula','1990-08-22','+254733112233','grace.w@mail.co.ke','80100','Mombasa','B3402','MBChB','Surgeon','Surgery','Orthopaedics','2024-06-15','2024-03-01','Associate','2023','Active'],
    ['Prof','Samuel Kimani','1978-01-30','0722556677','samuel@mail.co.ke','','Nakuru','C4510','MBChB;MD;PhD','Physician','Medicine','','2026-01-10','','Consultant','2019','Active'],
    ['Dr','Mary Atieno','1993-05-05','0700','mary.a@mail.co.ke','00200','Kisumu','b7788','MBChB','Physician','Paediatrics','','2025-09-01','2026-05-01','Visiting','2024','Active'],
    ['Dr','Joseph Mwangi','not a date','0711223344','joseph[at]mail','00100','Thika','12345','MBChB;MRCS','Surgeon','Cardiology','','2023-07-07','2020-01-01','Associate','2022','Inactive'],
    ['Dr','Achieng Odhiambo','1984-06-11','0712000111','ao@mail.co.ke','00100','Nairobi','A1042','MBChB','Physician','Medicine','','2025-01-01','2025-04-01','Consultant','2020','Active']
  ]
};

export const TEMPLATE_EXAMPLE = ['Dr','Jane Wanjiku','1988-03-14','0712345678','jane@mail.co.ke','00100','Nairobi',
                                 'Doctors Plaza 3rd floor','A1234','MBChB;MMed','Physician','Medicine','Cardiology',
                                 '2025-01-15','2025-06-01','Consultant','2022'];
