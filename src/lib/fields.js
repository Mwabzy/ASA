/* Field descriptors for the wizard — ported verbatim. */
import {
  APPLICANT_TYPES, SALUTATIONS, TOWNS, QUALS, CATEGORIES, ASSOC,
  DIVISIONS, DIV_BY_CAT, SUB_BY_DIV, LABELS, REQUIRED, OPTIONAL, WIDE, DOC_ACCEPT
} from './constants.js';
import { iso, parse, fmt, diffDays } from './dates.js';
import { kmpdc, insurance } from './status.js';
import { validate } from './validate.js';
import { stepFieldIds, isNewApplicant } from './form.js';

export function buildFields({ form, step, touched, qualDraft, doctors }){
  const ids = stepFieldIds(form, step);
  const today = new Date();
  const maxDob = new Date(); maxDob.setFullYear(maxDob.getFullYear()-20);

  return ids.map((id, i) => {
    const err = touched[id] ? validate(id, form, doctors) : '';
    const f = {
      id, label: LABELS[id]||id, delay:(i*40)+'ms',
      required: REQUIRED.indexOf(id)>=0, optional: OPTIONAL.indexOf(id)>=0,
      value: form[id]==null ? '' : form[id],
      error: err, type:'text', wide: WIDE.indexOf(id)>=0,
      hint:'', help:'', derived:'', placeholder:'', mono:false
    };

    switch(id){
      case 'applicantType':
        f.type='seg'; f.wide=true;
        f.segs = APPLICANT_TYPES.map(o => ({ value:o.id, label:o.label, on:form.applicantType===o.id }));
        f.help = form.applicantType==='new'
          ? 'You’ll complete the full application, attach your certificates, and be admitted under the Courtesy category. It takes about ten minutes — you can go back at any point.'
          : (form.applicantType==='existing'
              ? 'Welcome back. You only need to refresh your indemnity insurance, practice licence and course certificates.'
              : 'Applying for the first time walks through the full admitting-rights questionnaire. If you’re already admitted, it’s a much shorter update.');
        break;
      case 'salutation':
        f.type='seg';
        f.segs = SALUTATIONS.map(o => ({ value:o, label:o, on:form.salutation===o }));
        break;
      case 'khaAck':
        f.type='check'; f.wide=true; f.on = !!form.khaAck;
        f.checkLabel = 'I understand that all admitting doctors must be members of the Kenya Hospital Association — Ksh 10,000 membership fee and Ksh 5,000 annual subscription.';
        break;
      case 'dob': {
        f.type='date'; f.max=iso(maxDob); f.min='1920-01-01';
        const d = parse(form.dob);
        if(d) f.derived = Math.floor(diffDays(today,d)/365.25)+' yrs';
        break;
      }
      case 'signedDate': f.type='date'; f.max=iso(today); break;
      case 'kmpdcIssue': {
        f.type='date'; f.max=iso(today);
        const k = kmpdc(form.kmpdcIssue);
        if(k.expiry) f.derived = 'Expires '+fmt(k.expiry);
        f.hint = 'Licence runs to 31 Dec of the year after issue.';
        break;
      }
      case 'insuranceFrom': {
        f.type='date'; f.max=iso(today);
        const inv = insurance(form.insuranceFrom);
        if(inv.coverTo) f.derived = 'Cover to '+fmt(inv.coverTo);
        else f.help = 'Leave blank if not recorded.';
        break;
      }
      case 'contact': f.type='tel'; break;
      case 'email': f.placeholder='name@hospital.co.ke'; break;
      case 'telephone': f.mono=true; f.placeholder='020 XXX XXXX'; break;
      case 'altMobile': f.mono=true; f.placeholder='07XX XXX XXX'; break;
      case 'poBox': f.mono=true; f.placeholder='00100'; break;
      case 'fullNames': f.placeholder='Jane Wanjiku Kamau'; break;
      case 'surname': f.placeholder='Family name'; break;
      case 'forenames': f.placeholder='All given names'; break;
      case 'placeOfBirth': f.placeholder='Town or city of birth'; break;
      case 'nationality': f.placeholder='e.g. Kenyan'; break;
      case 'town': f.type='combo'; f.options=TOWNS; f.placeholder='Nairobi'; break;
      case 'address':
        f.type='area'; f.wide=true;
        f.placeholder='Building, floor, street and area';
        f.help='Where the doctor consults — this is what reception reads out to patients.';
        break;
      case 'regNo':
        f.mono=true; f.placeholder='A1234'; f.upper=true;
        if(!err) f.hint='Shape: one letter + 4–6 digits';
        break;
      case 'quals': {
        f.type='chips'; f.wide=true;
        const all = QUALS.slice();
        (form.quals||[]).forEach(q => { if(all.indexOf(q)<0) all.push(q); });
        f.chips = all.map(q => ({ value:q, on:(form.quals||[]).indexOf(q)>=0 }));
        f.draft = qualDraft;
        break;
      }
      case 'category':
        f.type='select'; f.options=CATEGORIES; f.placeholder='Select a category';
        f.hint = isNewApplicant(form) ? 'The capacity you propose using the Hospital in.' : '';
        break;
      case 'categoryOther': f.placeholder='Describe the category'; break;
      case 'speciality':
        f.type='select';
        f.options = DIV_BY_CAT[form.category] || DIVISIONS;
        f.placeholder='Select a division';
        f.help='ASA has five divisions. Category narrows the list.';
        break;
      case 'subSpeciality':
        f.type='combo';
        f.options = SUB_BY_DIV[form.speciality] || [];
        f.disabled = !form.speciality;
        if(!form.speciality) f.help='Choose a division first.';
        else f.placeholder='Optional — type or pick';
        break;
      case 'admissionYear':
        f.mono=true; f.placeholder='YYYY'; f.maxlength=4; f.numeric=true;
        break;
      case 'yearMbchb': case 'yearMmed': case 'yearRegistration': case 'yearRecognition':
        f.mono=true; f.placeholder='YYYY'; f.maxlength=4; f.numeric=true;
        if(id==='yearRecognition') f.hint='Requirement: 2 years and above from recognition.';
        if(id==='yearMmed') f.hint='Leave blank if there is no M.Med.';
        break;
      case 'assocCategory':
        f.type='select'; f.options=ASSOC; f.placeholder='Select category';
        if(isNewApplicant(form)) f.help='Pre-filled as Courtesy for new applicants.';
        break;
      case 'indemnityDetails': f.placeholder='Provider and policy number'; break;
      case 'practiceLicenceNo': f.mono=true; f.placeholder='Licence number'; break;
      case 'ref1': case 'ref2': case 'ref3':
        f.type='area'; f.wide=true; f.placeholder='Name, hospital and postal address';
        if(id==='ref1') f.hint='All three referees must be in the same division as you.';
        break;
      case 'hosp1': case 'hosp2': case 'hosp3': case 'hosp4':
        f.placeholder = id==='hosp1' ? 'e.g. Kenyatta National Hospital' : 'Add another, or leave blank';
        break;
      case 'signedBy':
        f.placeholder='Type your full name';
        f.hint='Typing your name here stands in for a signature.';
        break;
      case 'docInsurance': case 'docLicence': case 'docCourses': case 'docCv':
        f.type='file'; f.wide=true;
        f.files = form[id] || [];
        f.multiple = (id==='docCourses');
        f.accept = DOC_ACCEPT;
        f.note = {
          docInsurance:'Current indemnity cover certificate. PDF or photo.',
          docLicence:'KMPDC licence for private practice for the current year.',
          docCourses:'BLS, ACLS or other certificates — you can add several.',
          docCv:'Current curriculum vitae.'
        }[id];
        break;
    }
    return f;
  });
}
