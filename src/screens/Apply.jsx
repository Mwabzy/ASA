import { useEffect, useMemo, useRef, useState } from 'react';
import { APPLICANT_TYPES } from '../lib/constants.js';
import { parse, fmt } from '../lib/dates.js';
import { kmpdc, insurance, dotFor } from '../lib/status.js';
import { formatContact } from '../lib/validate.js';
import { steps, stepFieldIds, stepIndexOf, stepErrors, normalize, isNewApplicant } from '../lib/form.js';
import { buildFields } from '../lib/fields.js';
import Field from '../components/Field.jsx';
import Mascot from '../components/Mascot.jsx';
import { Pencil } from '../components/icons.jsx';

/* ---------- progress cord ---------- */
function Cord({ step, total }){
  const nodeX = [];
  for(let i=0;i<total;i++) nodeX.push(total<2 ? 175 : Math.round(40 + 270*i/(total-1)));
  const frac = (step+1)/total;
  return (
    <svg width="100%" viewBox="0 0 342 58" fill="none" preserveAspectRatio="none"
         aria-hidden="true" focusable="false"
         className="mx-auto block h-[58px] max-w-[920px]">
      <path d="M28 12 L34 26 M46 12 L40 26" stroke="var(--color-accent)" strokeWidth="2.4" strokeLinecap="round"/>
      <path d="M35 26 C35 34,40 38,48 38 L314 38" stroke="var(--color-line)" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M35 26 C35 34,40 38,48 38 L314 38" stroke="var(--color-brand)" strokeWidth="4" fill="none" strokeLinecap="round"
            pathLength="1000" strokeDasharray="1000" strokeDashoffset={1000*(1-frac)}
            style={{ transition:'stroke-dashoffset .5s cubic-bezier(.22,1,.36,1)' }}/>
      {nodeX.map((cx,i) => (
        <circle key={i} cx={cx} cy="38" r="3.5" fill={i<=step ? 'var(--color-brand)' : 'var(--color-line)'}/>
      ))}
      <circle cx={nodeX[step]} cy="38" r="10" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="3"
              style={{ transition:'cx .5s cubic-bezier(.22,1,.36,1)' }}/>
      <circle cx={nodeX[step]} cy="38" r="4" fill="var(--color-accent)"
              style={{ transition:'cx .5s cubic-bezier(.22,1,.36,1)' }}/>
    </svg>
  );
}

/* ---------- compliance preview, shown on the compliance steps ---------- */
function ComplianceCard({ st, form }){
  if(st.key!=='nCompliance' && st.key!=='xCompliance') return null;
  if(!form.kmpdcIssue) return null;

  const k = kmpdc(form.kmpdcIssue), inv = insurance(form.insuranceFrom);
  const kLine = k.status==='Not recorded' ? 'Not recorded'
    : (k.status==='Active' ? 'Active until '+fmt(k.expiry) : 'Inactive since '+fmt(k.expiry));
  const iLine = inv.status==='Active' ? ('Active · '+inv.days+' days left')
    : (inv.status==='Inactive' ? 'Inactive since '+fmt(inv.coverTo) : 'Not recorded');
  const bad = k.status==='Inactive' || inv.status==='Inactive';
  const note = k.status==='Inactive'
    ? 'KMPDC status is Inactive. The doctor can still be registered, and will show as Inactive on the registry.'
    : (inv.status==='Inactive'
        ? 'Insurance cover has lapsed. Registration continues; it will show as Inactive on the registry.' : '');

  return (
    <div className="anim-rise mx-auto mt-4 flex w-full max-w-[920px] gap-3 card">
      <div className="shrink-0"><Mascot name={bad ? 'concerned' : 'listening'} size={72} /></div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="dot" style={{ background: dotFor(k) }} />
          <span className="text-[11px] uppercase tracking-[.06em] text-ink-52">KMPDC</span>
          <span className="font-mono text-[13px] text-ink">{kLine}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="dot" style={{ background: dotFor(inv) }} />
          <span className="text-[11px] uppercase tracking-[.06em] text-ink-52">Insurance</span>
          <span className="font-mono text-[13px] text-ink">{iLine}</span>
        </div>
        {note && <p className="mt-2.5 text-[12px] leading-relaxed text-ink-72">{note}</p>}
      </div>
    </div>
  );
}

/* ---------- review ---------- */
function reviewGroups(form){
  const f = normalize(form);
  const kv = kmpdc(f.kmpdcIssue), iv = insurance(f.insuranceFrom);
  const nz = v => v || '—';
  const docLine = (key) => {
    const a = f[key] || [];
    return a.length ? a.map(x => x.name).join(', ') : 'Not attached';
  };
  const typeLabel = (APPLICANT_TYPES.find(t => t.id===f.applicantType)||{}).label || '—';

  const docItems = [
    ['Indemnity insurance', docLine('docInsurance'),'ui'],
    ['Practice licence', docLine('docLicence'),'ui'],
    ['Course certificates', docLine('docCourses'),'ui']
  ];
  if(f.applicantType==='new') docItems.push(['Current C.V.', docLine('docCv'),'ui']);

  const groups = f.applicantType==='new' ? [
    { title:'Applicant', key:'applicant', items:[['Applicant type',typeLabel,'ui']] },
    { title:'Particulars', key:'nParticulars', items:[
      ['Salutation',f.salutation,'ui'],['Surname',f.surname,'ui'],['Forenames',f.forenames,'ui'],
      ['Date of birth',fmt(parse(f.dob)),'mono'],['Place of birth',f.placeOfBirth,'ui'],['Nationality',f.nationality,'ui']]},
    { title:'Consulting rooms', key:'nContact', items:[
      ['Telephone',nz(f.telephone),'mono'],['Cell phone',f.contact,'mono'],
      ['Alt. mobile',nz(f.altMobile),'mono'],['Email',f.email,'mono']]},
    { title:'Office', key:'address', items:[
      ['P.O. Box',nz(f.poBox),'mono'],['Town',f.town,'ui'],['Consulting rooms',f.address,'ui']]},
    { title:'Practice', key:'nPractice', items:[
      ['Capacity', f.category==='Other'?(f.categoryOther||'Other'):f.category,'ui'],
      ['Division',f.speciality,'ui'],['Sub-speciality',nz(f.subSpeciality),'ui'],['Registration no.',f.regNo,'mono']]},
    { title:'Training', key:'nTraining', items:[
      ['MB.Ch.B',f.yearMbchb,'mono'],['M.Med',nz(f.yearMmed),'mono'],
      ['Registration',f.yearRegistration,'mono'],['Specialist recognition',f.yearRecognition,'mono']]},
    { title:'Compliance', key:'nCompliance', items:[
      ['Indemnity',f.indemnityDetails,'ui'],
      ['Insurance from', f.insuranceFrom?fmt(parse(f.insuranceFrom)):'Not recorded','mono'],
      ['Cover to', iv.coverTo?fmt(iv.coverTo):'—','mono'],
      ['Practice licence no.',f.practiceLicenceNo,'mono'],
      ['Licence issue',fmt(parse(f.kmpdcIssue)),'mono'],
      ['Licence expiry', kv.expiry?fmt(kv.expiry):'—','mono']]},
    { title:'Referees', key:'nReferees', items:[['1',f.ref1,'ui'],['2',f.ref2,'ui'],['3',f.ref3,'ui']]},
    { title:'Admitting elsewhere', key:'nHospitals', items:[
      ['1',f.hosp1,'ui'],['2',nz(f.hosp2),'ui'],['3',nz(f.hosp3),'ui'],['4',nz(f.hosp4),'ui']]},
    { title:'Membership', key:'membership', items:[
      ['Association',f.assocCategory,'ui'],['Year of admission',f.admissionYear,'mono'],
      ['KHA terms', f.khaAck?'Accepted':'Not accepted','ui']]},
    { title:'Documents', key:'docs', items:docItems },
    { title:'Declaration', key:'declaration', items:[
      ['Signed by',f.signedBy,'ui'],['Date', f.signedDate?fmt(parse(f.signedDate)):'—','mono']]}
  ] : [
    { title:'Applicant', key:'applicant', items:[['Applicant type',typeLabel,'ui']] },
    { title:'Identity', key:'xIdentity', items:[
      ['Salutation',f.salutation,'ui'],['Full names',f.fullNames,'ui'],
      ['Date of birth',fmt(parse(f.dob)),'mono'],['Contact',f.contact,'mono'],['Email',f.email,'mono']]},
    { title:'Office', key:'address', items:[
      ['P.O. Box',nz(f.poBox),'mono'],['Town',f.town,'ui'],['Consulting rooms',nz(f.address),'ui']]},
    { title:'Practice', key:'xPractice', items:[
      ['Registration no.',f.regNo,'mono'],['Qualifications',(f.quals||[]).join(', ')||'—','ui'],
      ['Category', f.category==='Other'?(f.categoryOther||'Other'):f.category,'ui'],
      ['Division',f.speciality,'ui'],['Sub-speciality',nz(f.subSpeciality),'ui']]},
    { title:'Compliance', key:'xCompliance', items:[
      ['KMPDC issue',fmt(parse(f.kmpdcIssue)),'mono'],
      ['Licence expiry', kv.expiry?fmt(kv.expiry):'—','mono'],
      ['Insurance from', f.insuranceFrom?fmt(parse(f.insuranceFrom)):'Not recorded','mono'],
      ['Cover to', iv.coverTo?fmt(iv.coverTo):'—','mono']]},
    { title:'Membership', key:'membership', items:[
      ['Association',f.assocCategory,'ui'],['Year of admission',f.admissionYear,'mono']]},
    { title:'Documents', key:'docs', items:docItems }
  ];

  return { groups, kv, iv };
}

export default function Apply({ form, setForm, doctors, editing, onSubmit, submitting, submitError }){
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [animKey, setAnimKey] = useState(0);
  const [touched, setTouched] = useState({});
  const [qualDraft, setQualDraft] = useState('');
  const [fileUrls, setFileUrls] = useState({});
  const focusField = useRef(null);
  const headingRef = useRef(null);

  const list = useMemo(() => steps(form), [form]);
  const current = Math.min(step, list.length-1);
  const total = list.length;
  const st = list[current];
  const applying = isNewApplicant(form);
  const isReview = current === total-1;

  /* Focus lands on the step heading when the step changes, so keyboard and
     screen-reader users are not dropped at the top of the document. */
  useEffect(() => {
    if(headingRef.current) headingRef.current.focus();
  }, [animKey]);

  useEffect(() => {
    if(!focusField.current) return;
    const el = document.querySelector('[id^="f-'+focusField.current+'-"]');
    focusField.current = null;
    if(el) el.focus();
  }, [animKey]);

  const patch = (p) => setForm(f => ({ ...f, ...p }));

  const on = {
    input: (id, value) => {
      let v = value;
      if(id==='regNo') v = v.toUpperCase();
      if(id==='admissionYear' || /^year/.test(id)) v = v.replace(/\D/g,'').slice(0,4);
      patch({ [id]: v });
    },
    change: (id, value) => {
      const p = { [id]: value };
      if(id==='category'){ p.speciality = ''; p.subSpeciality = ''; }
      if(id==='speciality'){ p.subSpeciality = ''; }
      patch(p);
      setTouched(t => ({ ...t, [id]:true }));
    },
    blur: (id) => {
      if(id==='contact') patch({ contact: formatContact(form.contact) });
      if(id==='email')   patch({ email: String(form.email||'').toLowerCase().trim() });
      setTouched(t => ({ ...t, [id]:true }));
    },
    seg: (id, value) => {
      if(id==='applicantType'){
        const p = { applicantType: value };
        if(value==='new' && !form.assocCategory) p.assocCategory = 'Courtesy';
        patch(p);
      } else {
        patch({ [id]: value });
      }
      setTouched(t => ({ ...t, [id]:true }));
    },
    check: (id) => {
      patch({ [id]: !form[id] });
      setTouched(t => ({ ...t, [id]:true }));
    },
    chip: (id, value) => {
      const cur = form[id] || [];
      patch({ [id]: cur.indexOf(value)>=0 ? cur.filter(x => x!==value) : cur.concat([value]) });
      setTouched(t => ({ ...t, [id]:true }));
    },
    qualDraft: setQualDraft,
    addQual: () => {
      const q = qualDraft.trim();
      if(!q) return;
      if((form.quals||[]).indexOf(q)<0) patch({ quals:(form.quals||[]).concat([q]) });
      setQualDraft('');
      setTouched(t => ({ ...t, quals:true }));
    },
    addFiles: (id, fileList) => {
      const urls = {};
      const incoming = Array.from(fileList||[]).map(file => {
        try { urls[file.name] = URL.createObjectURL(file); } catch (e) { /* blob URLs unavailable */ }
        return { name:file.name, size:file.size };
      });
      if(!incoming.length) return;
      setFileUrls(u => ({ ...u, ...urls }));
      const have = form[id] || [];
      const merged = have.slice();
      incoming.forEach(file => {
        if(!merged.some(x => x.name===file.name && x.size===file.size)) merged.push(file);
      });
      patch({ [id]: merged });
      setTouched(t => ({ ...t, [id]:true }));
    },
    removeFile: (id, idx) => patch({ [id]: (form[id]||[]).filter((_,i) => i!==idx) })
  };

  const fields = buildFields({ form, step: current, touched, qualDraft, doctors });

  const next = () => {
    if(current < total-1){
      const errs = stepErrors(form, current, doctors);
      if(Object.keys(errs).length){
        setTouched(t => ({ ...t, ...Object.fromEntries(Object.keys(errs).map(k => [k,true])) }));
        return;
      }
      setStep(current+1); setDir(1); setAnimKey(k => k+1);
    } else {
      onSubmit(normalize(form));
    }
  };

  const back = () => {
    if(current>0){ setStep(current-1); setDir(-1); setAnimKey(k => k+1); }
  };

  const jumpTo = (key) => {
    const i = stepIndexOf(form, key);
    focusField.current = (list[i] && list[i].fields || [])[0] || null;
    setStep(i); setDir(-1); setAnimKey(k => k+1);
  };

  const review = isReview ? reviewGroups(form) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-[920px] items-center justify-between">
          <span className="eyebrow">
            {isReview ? 'REVIEW' : 'STEP '+(current+1)+' OF '+(total-1)}
          </span>
          <span className="font-mono text-[11px] text-ink-52">
            {editing ? 'Editing an existing record' : (applying ? 'ASA application' : 'Doctor registry')}
          </span>
        </div>

        <Cord step={current} total={total} />

        <div className="mx-auto flex w-full max-w-[920px] items-end justify-between gap-4">
          <div>
            <h1 ref={headingRef} tabIndex={-1} className="text-[26px] leading-[1.05] outline-none sm:text-[32px]">
              {isReview && applying ? 'Review & submit' : st.title}
            </h1>
            <p className="mt-1 text-[13px] text-ink-52">
              {isReview && applying ? 'Check every answer before it goes to the committee' : st.sub}
            </p>
          </div>
          <div className="hidden shrink-0 sm:block"><Mascot name={st.pose} size={86} /></div>
        </div>
      </div>

      {/* ---- step body ---- */}
      <div key={animKey} className={'min-h-0 flex-1 px-4 pb-8 pt-6 sm:px-6 lg:px-10 '+(dir>0 ? 'anim-fwd' : 'anim-bwd')}>
        {isReview ? (
          <div className="mx-auto w-full max-w-[920px]">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1.5 text-[12px] text-ink-72">
                <span className="dot" style={{ background: dotFor(review.kv) }} /> KMPDC {review.kv.status}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1.5 text-[12px] text-ink-72">
                <span className="dot" style={{ background: dotFor(review.iv) }} /> Insurance {review.iv.status}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {review.groups.map(g => (
                <section key={g.key+g.title} className="card">
                  <div className="mb-2.5 flex items-center justify-between">
                    <h2 className="kicker">{g.title}</h2>
                    <button
                      type="button"
                      onClick={() => jumpTo(g.key)}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:underline"
                    >
                      <Pencil width="13" height="13" />
                      Edit<span className="sr-only">{' '+g.title}</span>
                    </button>
                  </div>
                  {g.items.map(it => (
                    <div key={it[0]} className="kv">
                      <span className="kv-k">{it[0]}</span>
                      <span className={'kv-v'+(it[2]==='mono' ? ' font-mono' : '')}>{it[1] || '—'}</span>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto grid w-full max-w-[920px] grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-x-6 xl:grid-cols-3">
              {fields.map(f => (
                <Field key={f.id} f={f} form={form} fileUrls={fileUrls} on={on} />
              ))}
            </div>
            <ComplianceCard st={st} form={form} />
          </>
        )}
      </div>

      {/* ---- step footer ---- */}
      <div className="sticky bottom-0 border-t border-line bg-surface px-4 py-4 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[920px]">
          {submitError && (
            <p role="alert" className="mb-3 text-[12.5px]" style={{ color:'var(--color-inactive)' }}>
              {submitError}
            </p>
          )}
          <div className="flex gap-2.5">
            <button type="button" className="btn btn-ghost shrink-0" onClick={back} disabled={current===0}>
              Back
            </button>
            <button type="button" className="btn ml-auto w-full max-w-[340px]" onClick={next} disabled={submitting}>
              {submitting
                ? 'Saving…'
                : isReview
                  ? (editing ? 'Save changes' : (applying ? 'Submit application' : 'Register doctor'))
                  : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
