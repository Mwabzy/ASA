/* Wizard shape: the empty form, the step list, and the normalise pass that
   runs before a record is written. Ported verbatim. */
import { ALL_STEPS } from './constants.js';
import { validate } from './validate.js';

export function emptyForm(){
  return {
    applicantType:'',
    salutation:'', surname:'', forenames:'', fullNames:'',
    dob:'', placeOfBirth:'', nationality:'Kenyan',
    telephone:'', contact:'', altMobile:'', email:'',
    poBox:'', town:'Nairobi', address:'',
    regNo:'', quals:[], category:'', categoryOther:'', speciality:'', subSpeciality:'',
    yearMbchb:'', yearMmed:'', yearRegistration:'', yearRecognition:'',
    indemnityDetails:'', practiceLicenceNo:'', insuranceFrom:'', kmpdcIssue:'',
    ref1:'', ref2:'', ref3:'',
    hosp1:'', hosp2:'', hosp3:'', hosp4:'',
    assocCategory:'', admissionYear:String(new Date().getFullYear()), khaAck:false,
    docInsurance:[], docLicence:[], docCourses:[], docCv:[],
    signedBy:'', signedDate:''
  };
}

export function steps(form){
  const t = form.applicantType || 'existing';
  return ALL_STEPS.filter(st => !st.only || st.only === t);
}

export function isNewApplicant(form){ return form.applicantType === 'new'; }

export function stepFieldIds(form, i){
  const list = steps(form), st = list[i];
  if(!st) return [];
  const f = st.fields.slice();
  if((st.key==='nPractice' || st.key==='xPractice') && form.category==='Other'){
    f.splice(f.indexOf('category')+1, 0, 'categoryOther');
  }
  if(st.key==='docs' && isNewApplicant(form)) f.push('docCv');
  if(st.key==='membership' && isNewApplicant(form)) f.push('khaAck');
  return f;
}

export function stepIndexOf(form, key){
  const i = steps(form).findIndex(st => st.key===key);
  return i<0 ? 0 : i;
}

export function stepErrors(form, i, doctors){
  const out = {};
  stepFieldIds(form, i).forEach(id => {
    const e = validate(id, form, doctors);
    if(e) out[id] = e;
  });
  return out;
}

export function normalize(f){
  if(f.applicantType!=='new') return f;
  const out = { ...f };
  const names = [String(f.forenames||'').trim(), String(f.surname||'').trim()].filter(Boolean).join(' ');
  if(names) out.fullNames = names;
  const q = [];
  if(f.yearMbchb) q.push('MBChB');
  if(f.yearMmed)  q.push('MMed');
  out.quals = (f.quals && f.quals.length) ? f.quals : q;
  return out;
}

export function newId(){ return 'd'+Math.random().toString(36).slice(2,9); }
