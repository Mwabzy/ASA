/* Field validation — ported verbatim. The only change is that the doctor
   list is passed in rather than read off a module-level store, so the same
   rules serve both the wizard and the CSV importer. */
import { DIVISIONS } from './constants.js';
import { parse } from './dates.js';

export function yearErr(v, required){
  const t = String(v||'').trim();
  if(!t) return required ? 'Enter a four-digit year.' : '';
  if(!/^\d{4}$/.test(t)) return 'Use a four-digit year, e.g. 2005.';
  const y = Number(t), now = new Date().getFullYear();
  if(y<1940 || y>now) return 'Year must be between 1940 and '+now+'.';
  return '';
}

export function formatContact(raw){
  const d = String(raw).replace(/[^\d+]/g,'');
  let nat = '';
  if(d.indexOf('+254')===0) nat = d.slice(4);
  else if(d.indexOf('254')===0) nat = d.slice(3);
  else if(d.indexOf('0')===0) nat = d.slice(1);
  else nat = d.replace('+','');
  nat = nat.replace(/\D/g,'').slice(0,9);
  if(nat.length<9) return String(raw).trim();
  return '+254 '+nat.slice(0,3)+' '+nat.slice(3,6)+' '+nat.slice(6);
}

export function validate(id, form, doctors){
  const list = doctors || [];
  const v = form[id] == null ? '' : form[id];
  switch(id){
    case 'applicantType': return v ? '' : 'Tell us whether this is a new or existing doctor.';
    case 'salutation':    return v ? '' : 'Choose a salutation.';
    case 'fullNames': {
      const w = String(v).trim().split(/\s+/).filter(Boolean);
      return (w.length>=2 && String(v).trim().length>=4) ? '' : 'Enter at least two names, e.g. Jane Wanjiku.';
    }
    case 'surname':      return String(v).trim().length>=2 ? '' : 'Enter the surname as it appears on the KMPDC register.';
    case 'forenames':    return String(v).trim().length>=2 ? '' : 'Enter all forenames.';
    case 'placeOfBirth': return String(v).trim().length>=2 ? '' : 'Enter the place of birth.';
    case 'nationality':  return String(v).trim().length>=3 ? '' : 'Enter the nationality.';
    case 'dob': {
      if(!v) return 'Enter the date of birth.';
      const d = parse(v), max = new Date();
      max.setFullYear(max.getFullYear()-20);
      return (d && d<=max) ? '' : 'Date of birth must be at least 20 years ago.';
    }
    case 'contact': {
      const s = String(v).replace(/\s/g,'');
      return /^(07\d{8}|\+2547\d{8}|2547\d{8})$/.test(s) ? '' : 'Enter a Kenyan number like 0712 345 678.';
    }
    case 'telephone': return !v ? '' : (/^[0-9+\s()-]{7,}$/.test(v) ? '' : 'Enter a valid landline, or leave it blank.');
    case 'altMobile': return !v ? '' : (/^(?:\+254|0)[17]\d{8}$/.test(String(v).replace(/\s/g,'')) ? '' : 'Use 07XXXXXXXX or +2547XXXXXXXX.');
    case 'email':     return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? '' : 'Enter an email like name@hospital.co.ke.';
    case 'town':      return String(v).trim() ? '' : 'Enter a town — start typing to pick one.';
    case 'address':   return String(v).trim().length>=5 ? '' : 'Enter the office or consulting rooms location.';
    case 'regNo': {
      if(!/^[A-Z]\d{4,6}$/.test(v)) return 'Registration number looks like A1234 — one letter, then four to six digits.';
      const dup = list.some(x => x.regNo===v && x.id!==form._editId);
      return dup ? 'A doctor with '+v+' already exists.' : '';
    }
    case 'quals':         return (form.quals && form.quals.length>=1) ? '' : 'Add at least one qualification.';
    case 'category':      return v ? '' : 'Choose a category.';
    case 'categoryOther': return (form.category==='Other' && !String(v).trim()) ? 'Describe the category.' : '';
    case 'speciality':
      if(!v) return 'Choose a division.';
      return DIVISIONS.indexOf(v)>=0 ? '' : 'Division must be one of: '+DIVISIONS.join(', ')+'.';
    case 'kmpdcIssue': {
      if(!v) return 'Enter the KMPDC issue date.';
      const k = parse(v);
      return (k && k<=new Date()) ? '' : 'The issue date cannot be in the future.';
    }
    case 'insuranceFrom': {
      if(!v) return '';
      const f = parse(v);
      return (f && f<=new Date()) ? '' : 'The start date cannot be in the future.';
    }
    case 'assocCategory': return v ? '' : 'Choose an association category.';
    case 'admissionYear': {
      const e = yearErr(v, true);
      if(e) return e;
      const dob = parse(form.dob);
      if(dob && Number(v) < dob.getFullYear()+20) return 'Admission cannot be before the doctor turns 20.';
      return '';
    }
    case 'yearMbchb':       return yearErr(v, true);
    case 'yearMmed':        return yearErr(v, false);
    case 'yearRegistration':return yearErr(v, true);
    case 'yearRecognition': {
      const ye = yearErr(v, true);
      if(ye) return ye;
      return (new Date().getFullYear() - Number(v)) >= 2
        ? '' : 'Requirement: 2 years and above from the date of recognition.';
    }
    case 'indemnityDetails':  return String(v).trim().length>=3 ? '' : 'Name the indemnity provider and policy number.';
    case 'practiceLicenceNo': return String(v).trim().length>=4 ? '' : 'Enter the licence for private practice number.';
    case 'ref1': case 'ref2': case 'ref3':
      return String(v).trim().length>=6 ? '' : 'Give the referee’s name and address.';
    case 'hosp1': return String(v).trim().length>=3 ? '' : 'Name at least one hospital where you currently admit.';
    case 'hosp2': case 'hosp3': case 'hosp4': return '';
    case 'khaAck':  return v ? '' : 'You must accept the KHA membership requirement to continue.';
    case 'signedBy':return String(v).trim().length>=3 ? '' : 'Type your full name as the signature.';
    case 'signedDate': return v ? '' : 'Date the declaration.';
    case 'docInsurance': return (form.docInsurance && form.docInsurance.length) ? '' : 'Attach the professional indemnity insurance certificate.';
    case 'docLicence':   return (form.docLicence && form.docLicence.length) ? '' : 'Attach the licence for private practice.';
    case 'docCourses':   return (form.docCourses && form.docCourses.length) ? '' : 'Attach at least one course certificate (BLS, ACLS or similar).';
    case 'docCv':        return (form.docCv && form.docCv.length) ? '' : 'Attach a copy of the current C.V.';
    default: return '';
  }
}
