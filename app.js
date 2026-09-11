/* ============================================================
   ASA — Doctor Registry · showcase demo
   Vanilla JS. No build step, no framework, no network needed.
   ============================================================ */
(function () {
'use strict';

/* ------------------------------------------------------------------ */
/* Reference data                                                      */
/* ------------------------------------------------------------------ */

var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var SALUTATIONS = ['Dr','Prof','Prof. Dr'];
var TOWNS = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Ruiru','Nyeri','Machakos',
             'Kericho','Kakamega','Meru','Kitale','Garissa','Malindi'];
var QUALS = ['MBChB','MMed','MD','BDS','MRCS','FCS(ECSA)','MRCP','FRCS','PhD'];
var CATEGORIES = ['Surgeon','Physician','Anaesthesia','Other'];
var ASSOC = ['Courtesy','Visiting','Associate','Consultant'];

/* The five ASA divisions — a doctor belongs to exactly one. */
var DIVISIONS = ['Surgery','Medicine','Paediatrics','Obs & Gynae','Anaesthesia'];
var DIV_BY_CAT = {
  Surgeon:    ['Surgery','Obs & Gynae'],
  Physician:  ['Medicine','Paediatrics'],
  Anaesthesia:['Anaesthesia'],
  Other:      DIVISIONS
};
var SUB_BY_DIV = {
  'Surgery':      ['Orthopaedics','ENT','Ophthalmology','General surgery','Urology','Neurosurgery'],
  'Medicine':     ['Cardiology','Nephrology','Endocrinology','Gastroenterology','Neurology','Dermatology','Psychiatry'],
  'Paediatrics':  ['Neonatology','Paediatric cardiology','Paediatric surgery'],
  'Obs & Gynae':  ['Maternal-fetal','Gynae-oncology','Reproductive medicine'],
  'Anaesthesia':  ['Critical care','Pain medicine','Paediatric anaesthesia']
};

var APPLICANT_TYPES = [
  { id:'new',      label:'I’m applying to ASA' },
  { id:'existing', label:'I’m already an ASA doctor' }
];

var ALL_STEPS = [
  { key:'applicant',   title:'Welcome to ASA', sub:'Are you applying, or already an ASA doctor?',
    fields:['applicantType'], pose:'greeting' },

  { key:'nParticulars', only:'new', title:'Particulars', sub:'Surname, forenames and birth',
    fields:['salutation','surname','forenames','dob','placeOfBirth','nationality'], pose:'checking' },
  { key:'xIdentity',    only:'existing', title:'Identity', sub:'Who is being registered',
    fields:['salutation','fullNames','dob','contact','email'], pose:'checking' },

  { key:'nContact', only:'new', title:'Consulting rooms', sub:'How the hospital reaches you',
    fields:['telephone','contact','altMobile','email'], pose:'listening' },

  { key:'address', title:'Office', sub:'Where they can be reached',
    fields:['poBox','town','address'], pose:'checking' },

  { key:'nPractice', only:'new', title:'Practice', sub:'Capacity, division and registration',
    fields:['category','speciality','subSpeciality','regNo'], pose:'listening' },
  { key:'xPractice', only:'existing', title:'Practice', sub:'Registration and division',
    fields:['regNo','quals','category','speciality','subSpeciality'], pose:'listening' },

  { key:'nTraining', only:'new', title:'Training', sub:'Qualifying years and recognition',
    fields:['yearMbchb','yearMmed','yearRegistration','yearRecognition'], pose:'checking' },

  { key:'nCompliance', only:'new', title:'Compliance', sub:'Indemnity and practice licence',
    fields:['indemnityDetails','insuranceFrom','practiceLicenceNo','kmpdcIssue'], pose:'checking' },
  { key:'xCompliance', only:'existing', title:'Compliance', sub:'Licence and indemnity',
    fields:['kmpdcIssue','insuranceFrom'], pose:'checking' },

  { key:'nReferees',  only:'new', title:'Referees', sub:'Three, in your division',
    fields:['ref1','ref2','ref3'], pose:'listening' },
  { key:'nHospitals', only:'new', title:'Admitting elsewhere', sub:'Where you admit currently',
    fields:['hosp1','hosp2','hosp3','hosp4'], pose:'sorting' },

  { key:'membership', title:'Membership', sub:'Association standing',
    fields:['assocCategory','admissionYear'], pose:'checking' },
  { key:'docs', title:'Documents', sub:'Insurance, licence and courses',
    fields:['docInsurance','docLicence','docCourses'], pose:'sorting' },
  { key:'declaration', only:'new', title:'Declaration', sub:'Sign off on the application',
    fields:['signedBy','signedDate'], pose:'sorting' },
  { key:'review', title:'Review', sub:'Confirm and register', fields:[], pose:'checking' }
];

var REPO_KEY = 'asa.doctors.v1';
var WARN_DAYS = 60;
var DOC_ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx';

/* Object URLs for attachments, so "View" works within the session. */
var FILE_URLS = Object.create(null);

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function pad2(n){ return String(n).padStart(2,'0'); }
function iso(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function daysAgo(n){ var d=new Date(); d.setDate(d.getDate()-n); return iso(d); }
function parse(s){
  if(!s) return null;
  var p = String(s).split('-');
  if(p.length<3) return null;
  var d = new Date(+p[0], +p[1]-1, +p[2]);
  return isNaN(d.getTime()) ? null : d;
}
function fmt(d){ return d ? d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear() : '—'; }
function startDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function diffDays(a,b){ return Math.round((startDay(a)-startDay(b))/86400000); }
function addMonths(d,m){
  var day = d.getDate();
  var t = new Date(d.getFullYear(), d.getMonth()+m, 1);
  var last = new Date(t.getFullYear(), t.getMonth()+1, 0).getDate();
  t.setDate(Math.min(day,last));
  return t;
}
function fsize(n){
  if(n==null) return '';
  if(n<1024) return n+' B';
  if(n<1048576) return (n/1024).toFixed(0)+' KB';
  return (n/1048576).toFixed(1)+' MB';
}
function reduced(){
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch(e){ return false; }
}

/* ---- the two status rules -------------------------------------------
   KMPDC     : licence runs to 31 Dec of (issue year + 1).
   Insurance : cover runs 12 months from the start date; the anniversary
               day itself is already lapsed.
--------------------------------------------------------------------- */
function kmpdc(issueStr, today){
  today = today || new Date();
  var issue = parse(issueStr);
  if(!issue) return { status:'Not recorded', expiry:null, days:null };
  var expiry = new Date(issue.getFullYear()+1, 11, 31);
  var days = diffDays(expiry, today);
  return { status: days>=0 ? 'Active' : 'Inactive', expiry:expiry, days:days };
}
function insurance(fromStr, today){
  today = today || new Date();
  var from = parse(fromStr);
  if(!from) return { status:'Not recorded', coverTo:null, days:null };
  var coverTo = addMonths(from,12);
  var days = diffDays(coverTo, today);
  return {
    status: startDay(coverTo) > startDay(today) ? 'Active' : 'Inactive',
    coverTo: coverTo, days: days
  };
}
function dotFor(v){
  if(v.status==='Not recorded') return 'var(--mist16)';
  if(v.status==='Inactive') return 'var(--stop)';
  if(v.days!=null && v.days>=0 && v.days<=WARN_DAYS) return 'var(--warn)';
  return 'var(--ok)';
}
function statusOf(d){
  var k = kmpdc(d.kmpdcIssue), inv = insurance(d.insuranceFrom);
  var warn = function(v){ return v.status==='Active' && v.days!=null && v.days>=0 && v.days<=WARN_DAYS; };
  var rec = [];
  if(k.status!=='Not recorded' && k.days!=null) rec.push(k.days);
  if(inv.status!=='Not recorded' && inv.days!=null) rec.push(inv.days);
  return {
    k:k, inv:inv,
    kDot:dotFor(k), iDot:dotFor(inv),
    kDate: k.expiry ? fmt(k.expiry) : '—',
    iDate: inv.coverTo ? fmt(inv.coverTo) : '—',
    kWarn: warn(k), iWarn: warn(inv),
    soonest: rec.length ? Math.min.apply(null, rec) : Infinity
  };
}

/* ------------------------------------------------------------------ */
/* The mascot                                                          */
/* ------------------------------------------------------------------ */

function character(pose, size){
  var eyes, mouth, arm = '';
  switch(pose){
    case 'greeting':
      eyes  = '<circle cx="42" cy="42" r="2.6" fill="#0A0A23"/><circle cx="58" cy="42" r="2.6" fill="#0A0A23"/>';
      mouth = '<path d="M43 50 q7 6 14 0" stroke="#0A0A23" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
      arm   = '<path d="M76 92 q14 -8 11 -24" stroke="#0A0A23" stroke-width="2.4" fill="none" stroke-linecap="round"/>'+
              '<circle cx="87" cy="65" r="6.5" fill="#fff" stroke="#0A0A23" stroke-width="2.2"/>';
      break;
    case 'checking':
      eyes  = '<path d="M38 43 q4 -4 8 0" stroke="#0A0A23" stroke-width="2.2" fill="none" stroke-linecap="round"/>'+
              '<path d="M54 43 q4 -4 8 0" stroke="#0A0A23" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
      mouth = '<path d="M45 51 h10" stroke="#0A0A23" stroke-width="2.2" stroke-linecap="round"/>';
      arm   = '<rect x="58" y="88" width="28" height="34" rx="4" fill="#fff" stroke="#0A0A23" stroke-width="2.2"/>'+
              '<rect x="66" y="84" width="12" height="7" rx="2" fill="var(--gold)"/>'+
              '<path d="M64 100 h16 M64 108 h16 M64 116 h10" stroke="var(--mist16)" stroke-width="2.4" stroke-linecap="round"/>';
      break;
    case 'listening':
      eyes  = '<circle cx="42" cy="42" r="2.6" fill="#0A0A23"/><circle cx="58" cy="42" r="2.6" fill="#0A0A23"/>';
      mouth = '<path d="M44 50 q6 5 12 0" stroke="#0A0A23" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
      arm   = '<path d="M76 92 q12 -4 10 -18" stroke="#0A0A23" stroke-width="2.4" fill="none" stroke-linecap="round"/>'+
              '<circle cx="85" cy="70" r="6" fill="#fff" stroke="#0A0A23" stroke-width="2.2"/>'+
              '<path d="M88 56 q6 4 5 11" stroke="var(--gold)" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
      break;
    case 'sorting':
      eyes  = '<circle cx="42" cy="42" r="2.6" fill="#0A0A23"/><circle cx="58" cy="42" r="2.6" fill="#0A0A23"/>';
      mouth = '<path d="M45 50 h10" stroke="#0A0A23" stroke-width="2.2" stroke-linecap="round"/>';
      arm   = '<rect x="14" y="90" width="24" height="18" rx="3" fill="#fff" stroke="#0A0A23" stroke-width="2.2" transform="rotate(-10 26 99)"/>'+
              '<rect x="62" y="86" width="24" height="18" rx="3" fill="#fff" stroke="#0A0A23" stroke-width="2.2" transform="rotate(9 74 95)"/>'+
              '<path d="M18 96 h14 M66 92 h14" stroke="var(--gold)" stroke-width="2.2" stroke-linecap="round"/>';
      break;
    case 'concerned':
      eyes  = '<circle cx="42" cy="43" r="2.6" fill="#0A0A23"/><circle cx="58" cy="43" r="2.6" fill="#0A0A23"/>'+
              '<path d="M36 36 l8 3 M64 36 l-8 3" stroke="#0A0A23" stroke-width="2.2" stroke-linecap="round"/>';
      mouth = '<path d="M44 53 q6 -5 12 0" stroke="#0A0A23" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
      arm   = '<path d="M74 94 q10 -8 4 -18" stroke="#0A0A23" stroke-width="2.4" fill="none" stroke-linecap="round"/>'+
              '<circle cx="74" cy="70" r="6" fill="#fff" stroke="#0A0A23" stroke-width="2.2"/>';
      break;
    case 'done':
      eyes  = '<path d="M38 43 q4 -5 8 0" stroke="#0A0A23" stroke-width="2.2" fill="none" stroke-linecap="round"/>'+
              '<path d="M54 43 q4 -5 8 0" stroke="#0A0A23" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
      mouth = '<path d="M42 49 q8 8 16 0" stroke="#0A0A23" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
      arm   = '<path d="M76 94 q13 -6 11 -20" stroke="#0A0A23" stroke-width="2.4" fill="none" stroke-linecap="round"/>'+
              '<circle cx="87" cy="70" r="7" fill="var(--gold)"/>'+
              '<path d="M83.5 70 l2.5 2.5 l4.5 -5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
      break;
    default: /* idle */
      eyes  = '<circle cx="42" cy="42" r="2.6" fill="#0A0A23"/><circle cx="58" cy="42" r="2.6" fill="#0A0A23"/>';
      mouth = '<path d="M45 50 h10" stroke="#0A0A23" stroke-width="2.2" stroke-linecap="round"/>';
  }
  return '<svg width="'+Math.round(size*0.74)+'" height="'+size+'" viewBox="0 0 100 140" fill="none" aria-hidden="true">'+
    '<ellipse cx="50" cy="133" rx="25" ry="4.5" fill="rgba(10,10,35,.07)"/>'+
    /* coat */
    '<path d="M50 64 L74 74 q6 3 6 10 v38 q0 6 -6 6 H26 q-6 0 -6 -6 V84 q0 -7 6 -10 z" fill="#fff" stroke="#0A0A23" stroke-width="2.4" stroke-linejoin="round"/>'+
    '<path d="M50 64 L58 80 L50 90 L42 80 z" fill="var(--pulse)"/>'+
    '<rect x="21" y="114" width="58" height="5" fill="var(--gold)" opacity=".85"/>'+
    /* stethoscope */
    '<path d="M39 70 q-13 12 -8 29 q3 10 13 10" stroke="var(--gold)" stroke-width="2.8" fill="none" stroke-linecap="round"/>'+
    '<circle cx="47" cy="108" r="4.5" fill="var(--gold)"/>'+
    arm +
    /* head */
    '<circle cx="50" cy="40" r="22" fill="#fff" stroke="#0A0A23" stroke-width="2.4"/>'+
    '<path d="M28 34 a22 22 0 0 1 44 0 z" fill="var(--pulse)"/>'+
    '<path d="M28 34 h44" stroke="#0A0A23" stroke-width="2.4" stroke-linecap="round"/>'+
    eyes + mouth +
  '</svg>';
}

/* ------------------------------------------------------------------ */
/* Seed data + persistence                                             */
/* ------------------------------------------------------------------ */

function seed(){
  function mk(sal,name,reg,cat,div,sub,quals,assoc,admYear,kIssue,iFrom,dob,town){
    return {
      id:'d'+Math.random().toString(36).slice(2,9),
      applicantType:'existing', salutation:sal, fullNames:name, regNo:reg,
      category:cat, speciality:div, subSpeciality:sub||'', quals:quals,
      assocCategory:assoc, admissionYear:String(admYear),
      kmpdcIssue:kIssue, insuranceFrom:iFrom, dob:dob,
      poBox:'00100', town:town||'Nairobi', address:'Doctors Plaza, 3rd floor',
      contact:'+254 700 000 000',
      email:(name.split(' ')[0]+'.'+name.split(' ').slice(-1)[0]+'@mail.co.ke').toLowerCase(),
      docInsurance:[], docLicence:[], docCourses:[], docCv:[],
      createdAt:Date.now()
    };
  }
  return [
    mk('Dr','Achieng Odhiambo','A1042','Physician','Medicine','Cardiology',['MBChB','MMed'],'Consultant',2020,daysAgo(300),daysAgo(120),'1984-06-11','Nairobi'),
    mk('Dr','Brian Mwangi','A2210','Surgeon','Surgery','Orthopaedics',['MBChB','MMed','FCS(ECSA)'],'Consultant',2019,daysAgo(200),daysAgo(60),'1980-02-03','Nairobi'),
    mk('Prof','Catherine Wanjiru','C1188','Physician','Paediatrics','Neonatology',['MBChB','MMed','PhD'],'Consultant',2021,daysAgo(410),daysAgo(150),'1975-11-20','Nairobi'),
    mk('Dr','Daniel Kiptoo','A3320','Surgeon','Surgery','ENT',['MBChB','MRCS'],'Visiting',2022,daysAgo(250),daysAgo(30),'1988-09-15','Eldoret'),
    mk('Dr','Esther Njoroge','A4451','Physician','Medicine','Endocrinology',['MBChB','MRCP'],'Associate',2023,daysAgo(180),daysAgo(200),'1990-01-08','Nairobi'),
    mk('Dr','Faith Cheruiyot','A5567','Anaesthesia','Anaesthesia','Critical care',['MBChB','MD'],'Associate',2024,daysAgo(140),daysAgo(90),'1991-07-22','Kericho'),
    mk('Dr','George Otieno','A6690','Surgeon','Surgery','Ophthalmology',['MBChB','FRCS'],'Consultant',2020,daysAgo(360),daysAgo(45),'1983-03-30','Kisumu'),
    mk('Dr','Hellen Mutua','A7712','Physician','Medicine','Psychiatry',['MBChB','MMed'],'Visiting',2025,daysAgo(120),daysAgo(320),'1989-12-12','Machakos'),
    mk('Prof. Dr','Ian Kamau','C2245','Surgeon','Obs & Gynae','Maternal-fetal',['MBChB','MMed','MD'],'Consultant',2019,daysAgo(280),daysAgo(335),'1972-05-18','Nairobi'),
    mk('Dr','Joyce Wambui','A8834','Physician','Medicine','Cardiology',['MBChB','MMed'],'Associate',2024,daysAgo(160),daysAgo(345),'1992-08-05','Nairobi'),
    mk('Dr','Kevin Barasa','A9901','Anaesthesia','Anaesthesia','Pain medicine',['MBChB'],'Courtesy',2018,daysAgo(700),daysAgo(80),'1979-04-14','Kakamega'),
    mk('Dr','Lucy Achieng','A1230','Surgeon','Surgery','General surgery',['MBChB','MMed'],'Visiting',2017,daysAgo(730),daysAgo(110),'1978-10-02','Kisumu'),
    mk('Dr','Martin Wekesa','A3345','Physician','Medicine','Nephrology',['MBChB','MRCP'],'Consultant',2021,daysAgo(220),daysAgo(500),'1986-06-25','Kitale'),
    mk('Dr','Nancy Gathoni','A4456','Physician','Paediatrics','',['MBChB','MMed'],'Associate',2026,daysAgo(90),'','1993-02-19','Nyeri')
  ];
}
function loadDoctors(){
  try {
    var raw = localStorage.getItem(REPO_KEY);
    if(raw) return JSON.parse(raw);
  } catch(e){}
  var s = seed();
  saveDoctors(s);
  return s;
}
function saveDoctors(docs){
  try { localStorage.setItem(REPO_KEY, JSON.stringify(docs)); } catch(e){}
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

function emptyForm(){
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

var S = {
  screen:'register', step:0, dir:1, animKey:0,
  form: emptyForm(), touched:{}, qualDraft:'',
  doctors: loadDoctors(),
  toast:{show:false,text:''},
  focusField:null,
  filter:'all', catFilter:'All', divFilter:'All',
  selectedId:null, kpiT:0, dragY:0, batchIds:null,
  imp:{ stage:0, over:false, fileName:'', headers:[], rows:[], map:{}, dups:{}, progress:0, summary:null }
};

function set(patch){ Object.assign(S, patch); schedule(); }
function setForm(id, value){
  S.form[id] = value;
  schedule();
}
function touch(id){ S.touched[id] = true; schedule(); }

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

function steps(){
  var t = S.form.applicantType || 'existing';
  return ALL_STEPS.filter(function(st){ return !st.only || st.only === t; });
}
function isNewApplicant(){ return S.form.applicantType === 'new'; }
function stepFieldIds(i){
  var list = steps(), st = list[i];
  if(!st) return [];
  var f = st.fields.slice();
  if((st.key==='nPractice' || st.key==='xPractice') && S.form.category==='Other'){
    f.splice(f.indexOf('category')+1, 0, 'categoryOther');
  }
  if(st.key==='docs' && isNewApplicant()) f.push('docCv');
  if(st.key==='membership' && isNewApplicant()) f.push('khaAck');
  return f;
}
function stepIndexOf(key){
  var i = steps().findIndex(function(st){ return st.key===key; });
  return i<0 ? 0 : i;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function yearErr(v, required){
  var t = String(v||'').trim();
  if(!t) return required ? 'Enter a four-digit year.' : '';
  if(!/^\d{4}$/.test(t)) return 'Use a four-digit year, e.g. 2005.';
  var y = Number(t), now = new Date().getFullYear();
  if(y<1940 || y>now) return 'Year must be between 1940 and '+now+'.';
  return '';
}
function formatContact(raw){
  var d = String(raw).replace(/[^\d+]/g,''), nat = '';
  if(d.indexOf('+254')===0) nat = d.slice(4);
  else if(d.indexOf('254')===0) nat = d.slice(3);
  else if(d.indexOf('0')===0) nat = d.slice(1);
  else nat = d.replace('+','');
  nat = nat.replace(/\D/g,'').slice(0,9);
  if(nat.length<9) return String(raw).trim();
  return '+254 '+nat.slice(0,3)+' '+nat.slice(3,6)+' '+nat.slice(6);
}

function validate(id, form){
  var v = form[id] == null ? '' : form[id];
  switch(id){
    case 'applicantType': return v ? '' : 'Tell us whether this is a new or existing doctor.';
    case 'salutation':    return v ? '' : 'Choose a salutation.';
    case 'fullNames': {
      var w = String(v).trim().split(/\s+/).filter(Boolean);
      return (w.length>=2 && String(v).trim().length>=4) ? '' : 'Enter at least two names, e.g. Jane Wanjiku.';
    }
    case 'surname':      return String(v).trim().length>=2 ? '' : 'Enter the surname as it appears on the KMPDC register.';
    case 'forenames':    return String(v).trim().length>=2 ? '' : 'Enter all forenames.';
    case 'placeOfBirth': return String(v).trim().length>=2 ? '' : 'Enter the place of birth.';
    case 'nationality':  return String(v).trim().length>=3 ? '' : 'Enter the nationality.';
    case 'dob': {
      if(!v) return 'Enter the date of birth.';
      var d = parse(v), max = new Date();
      max.setFullYear(max.getFullYear()-20);
      return (d && d<=max) ? '' : 'Date of birth must be at least 20 years ago.';
    }
    case 'contact': {
      var s = String(v).replace(/\s/g,'');
      return /^(07\d{8}|\+2547\d{8}|2547\d{8})$/.test(s) ? '' : 'Enter a Kenyan number like 0712 345 678.';
    }
    case 'telephone': return !v ? '' : (/^[0-9+\s()-]{7,}$/.test(v) ? '' : 'Enter a valid landline, or leave it blank.');
    case 'altMobile': return !v ? '' : (/^(?:\+254|0)[17]\d{8}$/.test(String(v).replace(/\s/g,'')) ? '' : 'Use 07XXXXXXXX or +2547XXXXXXXX.');
    case 'email':     return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? '' : 'Enter an email like name@hospital.co.ke.';
    case 'town':      return String(v).trim() ? '' : 'Enter a town — start typing to pick one.';
    case 'address':   return String(v).trim().length>=5 ? '' : 'Enter the office or consulting rooms location.';
    case 'regNo': {
      if(!/^[A-Z]\d{4,6}$/.test(v)) return 'Registration number looks like A1234 — one letter, then four to six digits.';
      var dup = S.doctors.some(function(x){ return x.regNo===v && x.id!==form._editId; });
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
      var k = parse(v);
      return (k && k<=new Date()) ? '' : 'The issue date cannot be in the future.';
    }
    case 'insuranceFrom': {
      if(!v) return '';
      var f = parse(v);
      return (f && f<=new Date()) ? '' : 'The start date cannot be in the future.';
    }
    case 'assocCategory': return v ? '' : 'Choose an association category.';
    case 'admissionYear': {
      var e = yearErr(v, true);
      if(e) return e;
      var dob = parse(form.dob);
      if(dob && Number(v) < dob.getFullYear()+20) return 'Admission cannot be before the doctor turns 20.';
      return '';
    }
    case 'yearMbchb':       return yearErr(v, true);
    case 'yearMmed':        return yearErr(v, false);
    case 'yearRegistration':return yearErr(v, true);
    case 'yearRecognition': {
      var ye = yearErr(v, true);
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
function stepErrors(i){
  var out = {};
  stepFieldIds(i).forEach(function(id){
    var e = validate(id, S.form);
    if(e) out[id] = e;
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

function toast(text){
  S.toast = { show:true, text:text };
  schedule();
  clearTimeout(toast._t);
  toast._t = setTimeout(function(){ S.toast = {show:false,text:''}; schedule(); }, 2600);
}
function go(screen){
  S.screen = screen; S.selectedId = null; S.dragY = 0;
  if(screen==='dashboard'){ S.batchIds = null; runKpi(); }
  schedule();
}
function runKpi(){
  if(reduced()){ S.kpiT = 1; schedule(); return; }
  var start = performance.now();
  S.kpiT = 0;
  (function tick(now){
    var t = Math.min(1, (now-start)/700);
    S.kpiT = 1-Math.pow(1-t,3);
    schedule();
    if(t<1) requestAnimationFrame(tick);
  })(start);
}
function next(){
  var list = steps();
  if(S.step < list.length-1){
    var errs = stepErrors(S.step);
    if(Object.keys(errs).length){
      Object.keys(errs).forEach(function(k){ S.touched[k] = true; });
      schedule();
      return;
    }
    S.step++; S.dir = 1; S.animKey++;
    schedule();
  } else {
    register();
  }
}
function back(){
  if(S.step>0){ S.step--; S.dir = -1; S.animKey++; schedule(); }
}
function jumpTo(i, field){
  S.screen='register'; S.step=i; S.dir=-1; S.animKey++; S.focusField=field||null;
  schedule();
}
function normalize(f){
  if(f.applicantType!=='new') return f;
  var out = Object.assign({}, f);
  var names = [String(f.forenames||'').trim(), String(f.surname||'').trim()].filter(Boolean).join(' ');
  if(names) out.fullNames = names;
  var q = [];
  if(f.yearMbchb) q.push('MBChB');
  if(f.yearMmed)  q.push('MMed');
  out.quals = (f.quals && f.quals.length) ? f.quals : q;
  return out;
}
function register(){
  var f = normalize(S.form);
  var rec = Object.assign({}, f, { id:'d'+Math.random().toString(36).slice(2,9), createdAt:Date.now() });
  delete rec._editId;
  S.doctors = [rec].concat(S.doctors);
  saveDoctors(S.doctors);
  S.screen = 'success';
  schedule();
  toast(f.applicantType==='new' ? 'Application submitted' : 'Doctor registered');
}
function registerAnother(){
  S.form = emptyForm(); S.touched = {}; S.step = 0; S.dir = 1; S.animKey++;
  S.screen = 'register';
  schedule();
}
function addQual(){
  var q = S.qualDraft.trim();
  if(!q) return;
  if(S.form.quals.indexOf(q)<0) S.form.quals = S.form.quals.concat([q]);
  S.qualDraft = '';
  S.touched.quals = true;
  schedule();
}
function addFiles(id, fileList){
  var incoming = Array.prototype.slice.call(fileList||[]).map(function(f){
    try { FILE_URLS[f.name] = URL.createObjectURL(f); } catch(e){}
    return { name:f.name, size:f.size };
  });
  if(!incoming.length) return;
  var have = S.form[id] || [];
  var merged = have.slice();
  incoming.forEach(function(f){
    if(!merged.some(function(x){ return x.name===f.name && x.size===f.size; })) merged.push(f);
  });
  S.form[id] = merged;
  S.touched[id] = true;
  schedule();
}
function removeFile(id, idx){
  S.form[id] = (S.form[id]||[]).filter(function(_,i){ return i!==idx; });
  schedule();
}
function setApplicantType(t){
  S.form.applicantType = t;
  if(t==='new'){ if(!S.form.assocCategory) S.form.assocCategory = 'Courtesy'; }
  S.touched.applicantType = true;
  schedule();
}
function resetDemo(){
  if(!confirm('Reset the demo back to the 14 seeded doctors?')) return;
  S.doctors = seed();
  saveDoctors(S.doctors);
  S.batchIds = null; S.filter='all'; S.catFilter='All'; S.divFilter='All';
  runKpi();
  toast('Demo data reset');
}
function exportCsv(){
  var cols = ['salutation','fullNames','regNo','category','speciality','subSpeciality','quals',
              'assocCategory','admissionYear','kmpdcIssue','insuranceFrom','dob','contact','email','town','address'];
  var head = cols.join(',')+',kmpdcStatus,insuranceStatus';
  var body = filtered().map(function(d){
    var st = statusOf(d);
    var vals = cols.map(function(c){
      var v = Array.isArray(d[c]) ? d[c].join('; ') : (d[c]||'');
      return /[,"]/.test(v) ? '"'+String(v).replace(/"/g,'""')+'"' : v;
    });
    return vals.join(',')+','+st.k.status+','+st.inv.status;
  }).join('\n');
  download('asa-doctors.csv', head+'\n'+body);
  toast('Exported '+filtered().length+' records');
}
function download(name, text){
  try {
    var b = new Blob([text], {type:'text/csv'});
    var u = URL.createObjectURL(b);
    var a = document.createElement('a');
    a.href = u; a.download = name; a.click();
    setTimeout(function(){ URL.revokeObjectURL(u); }, 1000);
  } catch(e){}
}

/* ------------------------------------------------------------------ */
/* Dashboard data                                                      */
/* ------------------------------------------------------------------ */

function filtered(){
  var list = S.doctors.slice();
  if(S.batchIds) list = list.filter(function(d){ return S.batchIds.indexOf(d.id)>=0; });
  list = list.filter(function(d){
    var st = statusOf(d);
    if(S.filter==='kmpdc-inactive'     && st.k.status!=='Inactive') return false;
    if(S.filter==='insurance-inactive' && st.inv.status!=='Inactive') return false;
    if(S.filter==='expiring'           && !(st.kWarn||st.iWarn)) return false;
    if(S.filter==='not-recorded'       && !(st.k.status==='Not recorded'||st.inv.status==='Not recorded')) return false;
    if(S.catFilter!=='All' && d.category!==S.catFilter) return false;
    if(S.divFilter!=='All' && d.speciality!==S.divFilter) return false;
    return true;
  });
  list.sort(function(a,b){ return statusOf(a).soonest - statusOf(b).soonest; });
  return list;
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

var TARGETS = [
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
var IMP_REQ = ['fullNames','dob','contact','email','town','regNo','quals','category',
               'speciality','kmpdcIssue','assocCategory','admissionYear'];

function norm(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''); }

function parseCSV(text){
  var lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n')
    .filter(function(l){ return l.trim().length; });
  function parseLine(l){
    var out = [], cur = '', q = false;
    for(var i=0;i<l.length;i++){
      var c = l[i];
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
    return out.map(function(x){ return x.trim(); });
  }
  return { headers: parseLine(lines[0]||''), rows: lines.slice(1).map(parseLine) };
}
function normDate(v){
  if(!v) return '';
  v = String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  var m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if(m) return m[3]+'-'+pad2(m[2])+'-'+pad2(m[1]);
  var d = new Date(v);
  return isNaN(d.getTime()) ? v : iso(d);
}
function autoMap(headers){
  var map = {};
  TARGETS.forEach(function(t){
    var id = t[0], syn = t[2];
    var hit = headers.find(function(h){
      var n = norm(h);
      return n===norm(id) || syn.indexOf(n)>=0;
    });
    if(hit){ map[id] = hit; return; }
    var partial = headers.find(function(h){
      var n = norm(h);
      return n && syn.some(function(sy){ return n.indexOf(sy)>=0 || sy.indexOf(n)>=0; });
    });
    if(partial) map[id] = partial;
  });
  return map;
}
function cellVal(row, headers, map, target){
  var h = map[target];
  if(!h) return '';
  var i = headers.indexOf(h);
  return i>=0 ? (row[i]||'') : '';
}
function buildRecordFromRow(row){
  var im = S.imp, rec = {};
  TARGETS.forEach(function(t){ rec[t[0]] = cellVal(row, im.headers, im.map, t[0]); });
  rec.dob = normDate(rec.dob);
  rec.kmpdcIssue = normDate(rec.kmpdcIssue);
  rec.insuranceFrom = normDate(rec.insuranceFrom);
  rec.admissionYear = String(rec.admissionYear||'').trim().slice(0,4);
  if(rec.contact) rec.contact = formatContact(rec.contact);
  if(rec.regNo)   rec.regNo = String(rec.regNo).toUpperCase().trim();
  if(rec.email)   rec.email = String(rec.email).toLowerCase().trim();
  rec.quals = rec.quals ? String(rec.quals).split(/[;|,]/).map(function(x){ return x.trim(); }).filter(Boolean) : [];
  rec.applicantType = 'existing';
  rec.docInsurance = []; rec.docLicence = []; rec.docCourses = []; rec.docCv = [];
  return rec;
}
function impResults(){
  return S.imp.rows.map(function(row,i){
    var rec = buildRecordFromRow(row);
    var errs = {};
    IMP_REQ.forEach(function(id){
      var e = validate(id, rec);
      if(e) errs[id] = e;
    });
    var dup = !!rec.regNo && S.doctors.some(function(d){ return d.regNo===rec.regNo; });
    /* A duplicate is a decision, not a hard error. */
    if(dup && errs.regNo && errs.regNo.indexOf('already exists')>=0) delete errs.regNo;
    return { i:i, rec:rec, errs:errs, ok:Object.keys(errs).length===0, dup:dup };
  });
}
function onImpFile(file){
  if(!file) return;
  var r = new FileReader();
  r.onload = function(){
    var parsed;
    try { parsed = parseCSV(String(r.result)); }
    catch(e){ parsed = {headers:[],rows:[]}; }
    S.imp = Object.assign({}, S.imp, {
      stage:1, over:false, fileName:file.name,
      headers:parsed.headers, rows:parsed.rows,
      map:autoMap(parsed.headers), dups:{}
    });
    schedule();
  };
  r.readAsText(file);
}
function loadImpSample(){
  var headers = ['Title','Doctor Name','Birth','Mobile','E-mail','Box','City','Reg No',
                 'Qualifications','Capacity','Division','Sub','Licence Issue','Indemnity Start',
                 'Membership','Admitted','Status'];
  var rows = [
    ['Dr','Peter Kariuki','1985-04-12','0712345678','peter.k@mail.co.ke','00100','Nairobi','B1201','MBChB;MMed','Physician','Medicine','Cardiology','2025-02-01','2025-11-01','Consultant','2021','Active'],
    ['Dr','Grace Wafula','1990-08-22','+254733112233','grace.w@mail.co.ke','80100','Mombasa','B3402','MBChB','Surgeon','Surgery','Orthopaedics','2024-06-15','2024-03-01','Associate','2023','Active'],
    ['Prof','Samuel Kimani','1978-01-30','0722556677','samuel@mail.co.ke','','Nakuru','C4510','MBChB;MD;PhD','Physician','Medicine','','2026-01-10','','Consultant','2019','Active'],
    ['Dr','Mary Atieno','1993-05-05','0700','mary.a@mail.co.ke','00200','Kisumu','b7788','MBChB','Physician','Paediatrics','','2025-09-01','2026-05-01','Visiting','2024','Active'],
    ['Dr','Joseph Mwangi','not a date','0711223344','joseph[at]mail','00100','Thika','12345','MBChB;MRCS','Surgeon','Cardiology','','2023-07-07','2020-01-01','Associate','2022','Inactive'],
    ['Dr','Achieng Odhiambo','1984-06-11','0712000111','ao@mail.co.ke','00100','Nairobi','A1042','MBChB','Physician','Medicine','','2025-01-01','2025-04-01','Consultant','2020','Active']
  ];
  S.imp = Object.assign({}, S.imp, {
    stage:1, over:false, fileName:'sample-doctors.csv',
    headers:headers, rows:rows, map:autoMap(headers), dups:{}
  });
  schedule();
}
function downloadTemplate(){
  var cols = TARGETS.map(function(t){ return t[1]; });
  var example = ['Dr','Jane Wanjiku','1988-03-14','0712345678','jane@mail.co.ke','00100','Nairobi',
                 'Doctors Plaza 3rd floor','A1234','MBChB;MMed','Physician','Medicine','Cardiology',
                 '2025-01-15','2025-06-01','Consultant','2022'];
  download('asa-import-template.csv',
    cols.join(',')+'\n'+example.map(function(v){ return /[,"]/.test(v) ? '"'+v+'"' : v; }).join(','));
}
function downloadErrors(){
  var bad = impResults().filter(function(r){ return !r.ok; });
  var cols = TARGETS.map(function(t){ return t[0]; });
  var head = cols.join(',')+',reason';
  var body = bad.map(function(r){
    var vals = cols.map(function(c){
      var v = Array.isArray(r.rec[c]) ? r.rec[c].join(';') : (r.rec[c]||'');
      return /[,"]/.test(v) ? '"'+String(v).replace(/"/g,'""')+'"' : v;
    });
    return vals.join(',')+',"'+Object.keys(r.errs).map(function(k){ return r.errs[k]; }).join(' ').replace(/"/g,'""')+'"';
  }).join('\n');
  download('asa-import-errors.csv', head+'\n'+body);
}
function editImpCell(rowIdx, target, value){
  var rows = S.imp.rows.map(function(r){ return r.slice(); });
  var h = S.imp.map[target];
  var ci = S.imp.headers.indexOf(h);
  if(ci<0){
    /* Column was never in the file — append one so the edit has somewhere to live. */
    S.imp.headers = S.imp.headers.concat([target]);
    S.imp.map = Object.assign({}, S.imp.map, {});
    S.imp.map[target] = target;
    ci = S.imp.headers.length-1;
    rows = rows.map(function(r){ while(r.length<ci) r.push(''); return r; });
  }
  rows[rowIdx][ci] = value;
  S.imp.rows = rows;
  schedule();
}
function commitImport(){
  var results = impResults().filter(function(r){ return r.ok; });
  var imported=0, skipped=0, overwritten=0, ids=[];
  var docs = S.doctors.slice();
  results.forEach(function(r){
    var choice = S.imp.dups[r.i] || 'skip';
    if(r.dup){
      if(choice==='skip'){ skipped++; return; }
      var idx = docs.findIndex(function(d){ return d.regNo===r.rec.regNo; });
      if(idx>=0){
        var id = docs[idx].id;
        docs[idx] = Object.assign({}, r.rec, { id:id, createdAt:Date.now() });
        ids.push(id); overwritten++;
        return;
      }
    }
    var nid = 'd'+Math.random().toString(36).slice(2,9);
    docs.unshift(Object.assign({}, r.rec, { id:nid, createdAt:Date.now() }));
    ids.push(nid); imported++;
  });
  skipped += impResults().filter(function(r){ return !r.ok; }).length;
  saveDoctors(docs);

  var summary = { imported:imported, skipped:skipped, overwritten:overwritten, ids:ids };
  if(reduced()){
    S.doctors = docs;
    S.imp = Object.assign({}, S.imp, { stage:3, progress:100, summary:summary });
    schedule();
    return;
  }
  S.imp = Object.assign({}, S.imp, { stage:3, progress:0, summary:summary });
  schedule();
  var p = 0;
  clearInterval(commitImport._t);
  commitImport._t = setInterval(function(){
    p += 8;
    S.imp.progress = Math.min(100,p);
    if(p>=100){ clearInterval(commitImport._t); S.doctors = docs; }
    schedule();
  }, 40);
}
function cancelImport(){
  S.imp = { stage:0, over:false, fileName:'', headers:[], rows:[], map:{}, dups:{}, progress:0, summary:null };
  go('dashboard');
}
function viewImported(){
  var ids = S.imp.summary ? S.imp.summary.ids : null;
  S.screen='dashboard'; S.filter='all'; S.catFilter='All'; S.divFilter='All';
  S.batchIds = (ids && ids.length) ? ids : null;
  runKpi();
}
function unmappedRequired(){
  return TARGETS.filter(function(t){ return IMP_REQ.indexOf(t[0])>=0 && !S.imp.map[t[0]]; })
                .map(function(t){ return t[1]; });
}

/* ------------------------------------------------------------------ */
/* Field descriptors                                                   */
/* ------------------------------------------------------------------ */

var LABELS = {
  applicantType:'Applicant type', salutation:'Salutation', surname:'Surname', forenames:'Forenames',
  fullNames:'Full names', dob:'Date of birth', placeOfBirth:'Place of birth', nationality:'Nationality',
  telephone:'Consulting rooms telephone', contact:'Cell phone', altMobile:'Alternative mobile no.',
  email:'Email', poBox:'P.O. Box code', town:'Town', address:'Office (consulting rooms)',
  regNo:'Registration number', quals:'Qualifications', category:'Category', categoryOther:'Specify category',
  speciality:'Division', subSpeciality:'Sub-speciality',
  yearMbchb:'Year of MB.Ch.B', yearMmed:'Year of M.Med', yearRegistration:'Year of registration',
  yearRecognition:'Year of specialist recognition',
  indemnityDetails:'Professional indemnity', practiceLicenceNo:'Licence for private practice no.',
  insuranceFrom:'Period of insurance (from)', kmpdcIssue:'KMPDC issue date',
  ref1:'Referee 1', ref2:'Referee 2', ref3:'Referee 3',
  hosp1:'Hospital 1', hosp2:'Hospital 2', hosp3:'Hospital 3', hosp4:'Hospital 4',
  assocCategory:'Association category', admissionYear:'Year of admission', khaAck:'KHA membership',
  docInsurance:'Professional indemnity insurance', docLicence:'Licence for private practice',
  docCourses:'Additional courses (BLS, ACLS…)', docCv:'Copy of current C.V.',
  signedBy:'Signed by', signedDate:'Date signed'
};
var REQUIRED = ['applicantType','salutation','surname','forenames','fullNames','dob','placeOfBirth',
  'nationality','contact','email','town','address','regNo','quals','category','categoryOther',
  'speciality','kmpdcIssue','assocCategory','admissionYear','yearMbchb','yearRegistration',
  'yearRecognition','indemnityDetails','practiceLicenceNo','ref1','ref2','ref3','hosp1','khaAck',
  'signedBy','signedDate','docInsurance','docLicence','docCourses','docCv'];
var OPTIONAL = ['poBox','subSpeciality','insuranceFrom','telephone','altMobile','yearMmed','hosp2','hosp3','hosp4'];
var WIDE = ['applicantType','quals','address','ref1','ref2','ref3','khaAck','categoryOther',
            'docInsurance','docLicence','docCourses','docCv'];

function buildFields(){
  var form = S.form;
  var ids = stepFieldIds(S.step);
  var today = new Date();
  var maxDob = new Date(); maxDob.setFullYear(maxDob.getFullYear()-20);

  return ids.map(function(id, i){
    var err = S.touched[id] ? validate(id, form) : '';
    var f = {
      id:id, label:LABELS[id]||id, delay:(i*40)+'ms',
      required: REQUIRED.indexOf(id)>=0, optional: OPTIONAL.indexOf(id)>=0,
      value: form[id]==null ? '' : form[id],
      error: err, type:'text', wide: WIDE.indexOf(id)>=0,
      hint:'', help:'', derived:'', placeholder:'', mono:false
    };

    switch(id){
      case 'applicantType':
        f.type='seg'; f.wide=true;
        f.segs = APPLICANT_TYPES.map(function(o){ return { value:o.id, label:o.label, on:form.applicantType===o.id }; });
        f.help = form.applicantType==='new'
          ? 'You’ll complete the full application, attach your certificates, and be admitted under the Courtesy category. It takes about ten minutes — you can go back at any point.'
          : (form.applicantType==='existing'
              ? 'Welcome back. You only need to refresh your indemnity insurance, practice licence and course certificates.'
              : 'Applying for the first time walks through the full admitting-rights questionnaire. If you’re already admitted, it’s a much shorter update.');
        break;
      case 'salutation':
        f.type='seg';
        f.segs = SALUTATIONS.map(function(o){ return { value:o, label:o, on:form.salutation===o }; });
        break;
      case 'khaAck':
        f.type='check'; f.wide=true; f.on = !!form.khaAck;
        f.checkLabel = 'I understand that all admitting doctors must be members of the Kenya Hospital Association — Ksh 10,000 membership fee and Ksh 5,000 annual subscription.';
        break;
      case 'dob':
        f.type='date'; f.max=iso(maxDob); f.min='1920-01-01';
        var d = parse(form.dob);
        if(d) f.derived = Math.floor(diffDays(today,d)/365.25)+' yrs';
        break;
      case 'signedDate': f.type='date'; f.max=iso(today); break;
      case 'kmpdcIssue': {
        f.type='date'; f.max=iso(today);
        var k = kmpdc(form.kmpdcIssue);
        if(k.expiry) f.derived = 'Expires '+fmt(k.expiry);
        f.hint = 'Licence runs to 31 Dec of the year after issue.';
        break;
      }
      case 'insuranceFrom': {
        f.type='date'; f.max=iso(today);
        var inv = insurance(form.insuranceFrom);
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
      case 'town': f.type='combo'; f.list='towns-dl'; f.options=TOWNS; f.placeholder='Nairobi'; break;
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
        var all = QUALS.slice();
        (form.quals||[]).forEach(function(q){ if(all.indexOf(q)<0) all.push(q); });
        f.chips = all.map(function(q){ return { value:q, on:(form.quals||[]).indexOf(q)>=0 }; });
        f.draft = S.qualDraft;
        break;
      }
      case 'category':
        f.type='select'; f.options=CATEGORIES; f.placeholder='Select a category';
        f.hint = isNewApplicant() ? 'The capacity you propose using the Hospital in.' : '';
        break;
      case 'categoryOther': f.placeholder='Describe the category'; break;
      case 'speciality':
        f.type='select';
        f.options = DIV_BY_CAT[form.category] || DIVISIONS;
        f.placeholder='Select a division';
        f.help='ASA has five divisions. Category narrows the list.';
        break;
      case 'subSpeciality':
        f.type='combo'; f.list='sub-dl';
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
        if(isNewApplicant()) f.help='Pre-filled as Courtesy for new applicants.';
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

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

var root = document.getElementById('root');
var pending = false;

function schedule(){
  if(pending) return;
  pending = true;
  requestAnimationFrame(function(){ pending = false; render(); });
}

function render(){
  /* Remember where the cursor was so re-rendering doesn't fight typing. */
  var active = document.activeElement;
  var keep = null;
  if(active && active.dataset && (active.dataset.field || active.dataset.cell)){
    keep = {
      sel: active.dataset.field ? '[data-field="'+active.dataset.field+'"]'
                                : '[data-cell="'+active.dataset.cell+'"]',
      start:null, end:null
    };
    try { keep.start = active.selectionStart; keep.end = active.selectionEnd; } catch(e){}
  }

  root.innerHTML = shell();

  var target = null;
  if(S.focusField){
    target = root.querySelector('[data-field="'+S.focusField+'"]');
    S.focusField = null;
  } else if(keep){
    target = root.querySelector(keep.sel);
  }
  if(target){
    try {
      target.focus({preventScroll:true});
      if(keep && keep.start!=null && target.setSelectionRange && target.type!=='date') {
        target.setSelectionRange(keep.start, keep.end);
      }
    } catch(e){}
  }
}

function shell(){
  var tabs = [['register','Apply'],['dashboard','Registry'],['import','Import']];
  var onTab = function(k){ return S.screen===k || (k==='register' && S.screen==='success'); };
  var body =
    S.screen==='register'  ? screenRegister()  :
    S.screen==='success'   ? screenSuccess()   :
    S.screen==='dashboard' ? screenDashboard() :
    S.screen==='import'    ? screenImport()    : '';

  return '<div class="page">'+
    '<div class="brandline">'+
      '<b>ASA</b><span>·</span><span>Admitting Specialists Association — doctor registry</span>'+
    '</div>'+
    '<div class="tabs">'+ tabs.map(function(t){
      return '<button class="tab'+(onTab(t[0])?' on':'')+'" data-act="go" data-v="'+t[0]+'">'+t[1]+'</button>';
    }).join('') +'</div>'+
    '<div class="app">'+ body + sheet() +'</div>'+
    (S.toast.show ? '<div class="toast"><span class="dot" style="background:var(--ok)"></span><span>'+esc(S.toast.text)+'</span></div>' : '')+
  '</div>';
}

/* ---------- register ---------- */

function screenRegister(){
  var list = steps();
  var step = Math.min(S.step, list.length-1);
  var total = list.length;
  var st = list[step];
  var applying = isNewApplicant();

  /* progress cord */
  var nodeX = [];
  for(var i=0;i<total;i++) nodeX.push(total<2 ? 175 : Math.round(40 + 270*i/(total-1)));
  var frac = (step+1)/total;
  var cord = '<svg width="100%" viewBox="0 0 342 58" fill="none" preserveAspectRatio="none" '+
    'style="display:block;max-width:920px;margin:0 auto;height:58px">'+
    '<path d="M28 12 L34 26 M46 12 L40 26" stroke="var(--gold)" stroke-width="2.4" stroke-linecap="round"/>'+
    '<path d="M35 26 C35 34,40 38,48 38 L314 38" stroke="var(--mist16)" stroke-width="4" fill="none" stroke-linecap="round"/>'+
    '<path d="M35 26 C35 34,40 38,48 38 L314 38" stroke="var(--pulse)" stroke-width="4" fill="none" stroke-linecap="round" '+
      'pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="'+(1000*(1-frac))+'" '+
      'style="transition:stroke-dashoffset .5s cubic-bezier(.22,1,.36,1)"/>'+
    nodeX.map(function(cx,i){
      return '<circle cx="'+cx+'" cy="38" r="3.5" fill="'+(i<=step?'var(--pulse)':'var(--mist16)')+'"/>';
    }).join('')+
    '<circle cx="'+nodeX[step]+'" cy="38" r="10" fill="var(--ink)" stroke="var(--gold)" stroke-width="3" style="transition:cx .5s cubic-bezier(.22,1,.36,1)"/>'+
    '<circle cx="'+nodeX[step]+'" cy="38" r="4" fill="var(--gold)" style="transition:cx .5s cubic-bezier(.22,1,.36,1)"/>'+
  '</svg>';

  var isReview = step===total-1;
  var bodyHtml = isReview ? reviewBody() :
    '<div class="cap fgrid">'+ buildFields().map(fieldHTML).join('') +'</div>' + complianceCard(st);

  return '<div class="col">'+
    '<div class="pad">'+
      '<div class="cap" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">'+
        '<span class="eyebrow">'+(isReview ? 'REVIEW' : ('STEP '+(step+1)+' OF '+(total-1)))+'</span>'+
        '<span style="font-family:var(--mono);font-size:11px;color:var(--mist48)">'+(applying?'ASA application':'Doctor registry')+'</span>'+
      '</div>'+
      cord +
      '<div class="hdrow cap">'+
        '<div>'+
          '<div class="stitle">'+esc(isReview && applying ? 'Review & submit' : st.title)+'</div>'+
          '<div class="ssub">'+esc(isReview && applying ? 'Check every answer before it goes to the committee' : st.sub)+'</div>'+
        '</div>'+
        '<div style="flex:none;margin-left:8px">'+character(st.pose, 86)+'</div>'+
      '</div>'+
    '</div>'+
    '<div class="scroll padb '+(S.dir>0?'anim-fwd':'anim-bwd')+'" data-k="'+S.animKey+'">'+ bodyHtml +'</div>'+
    '<div class="padf">'+
      '<div class="cap" style="display:flex;gap:10px">'+
        '<button class="btn ghost" data-act="back" '+(step===0?'disabled':'')+' style="flex:none;padding:14px 22px">Back</button>'+
        '<button class="btn" data-act="next" style="flex:1;max-width:340px;margin-left:auto">'+
          (isReview ? (applying?'Submit application':'Register doctor') : 'Continue')+
        '</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}

function complianceCard(st){
  if(st.key!=='nCompliance' && st.key!=='xCompliance') return '';
  var f = S.form;
  if(!f.kmpdcIssue) return '';
  var k = kmpdc(f.kmpdcIssue), inv = insurance(f.insuranceFrom);
  var kLine = k.status==='Not recorded' ? 'Not recorded'
    : (k.status==='Active' ? 'Active until '+fmt(k.expiry) : 'Inactive since '+fmt(k.expiry));
  var iLine = inv.status==='Active' ? ('Active · '+inv.days+' days left')
    : (inv.status==='Inactive' ? 'Inactive since '+fmt(inv.coverTo) : 'Not recorded');
  var bad = k.status==='Inactive' || inv.status==='Inactive';
  var note = k.status==='Inactive'
    ? 'KMPDC status is Inactive. The doctor can still be registered, and will show as Inactive on the registry.'
    : (inv.status==='Inactive'
        ? 'Insurance cover has lapsed. Registration continues; it will show as Inactive on the registry.' : '');

  return '<div class="cap cardin card" style="display:flex;gap:12px;margin-top:16px">'+
    '<div style="flex:none">'+character(bad?'concerned':'listening', 72)+'</div>'+
    '<div style="flex:1;min-width:0">'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'+
        '<span class="dot" style="background:'+dotFor(k)+'"></span>'+
        '<span style="font-size:11px;color:var(--mist48);text-transform:uppercase;letter-spacing:.06em">KMPDC</span>'+
        '<span style="font-size:13px;color:var(--mist);font-family:var(--mono)">'+esc(kLine)+'</span>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:8px">'+
        '<span class="dot" style="background:'+dotFor(inv)+'"></span>'+
        '<span style="font-size:11px;color:var(--mist48);text-transform:uppercase;letter-spacing:.06em">Insurance</span>'+
        '<span style="font-size:13px;color:var(--mist);font-family:var(--mono)">'+esc(iLine)+'</span>'+
      '</div>'+
      (note ? '<div style="font-size:12px;color:var(--mist72);margin-top:10px;line-height:1.45">'+esc(note)+'</div>' : '')+
    '</div>'+
  '</div>';
}

function fieldHTML(f){
  var cls = 'rise'+(f.wide?' fspan':'');
  var errCls = f.error ? ' err' : '';
  var control = '';

  switch(f.type){
    case 'seg':
      control = '<div class="segrow">'+ f.segs.map(function(o){
        return '<button class="seg'+(o.on?' on':'')+'" data-act="seg" data-f="'+f.id+'" data-v="'+esc(o.value)+'">'+esc(o.label)+'</button>';
      }).join('') +'</div>';
      break;
    case 'check':
      control = '<button class="checkbtn'+errCls+'" data-act="check" data-f="'+f.id+'">'+
        '<span class="box'+(f.on?' on':'')+'">'+(f.on
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>'
          : '')+'</span>'+
        '<span class="txt">'+esc(f.checkLabel)+'</span></button>';
      break;
    case 'tel':
      control = '<div class="telwrap'+errCls+'"><span class="telpre">+254</span>'+
        '<input class="telinp" data-field="'+f.id+'" value="'+esc(f.value)+'" placeholder="7XX XXX XXX" autocomplete="off"></div>';
      break;
    case 'date':
      control = '<input class="inp'+errCls+'" type="date" data-field="'+f.id+'" value="'+esc(f.value)+'"'+
        (f.max?' max="'+f.max+'"':'')+(f.min?' min="'+f.min+'"':'')+'>';
      break;
    case 'area':
      control = '<textarea class="inp'+errCls+'" data-field="'+f.id+'" rows="2" placeholder="'+esc(f.placeholder)+'">'+esc(f.value)+'</textarea>';
      break;
    case 'select':
      control = '<select class="inp'+errCls+'" data-field="'+f.id+'"'+(f.disabled?' disabled':'')+'>'+
        '<option value="">'+esc(f.placeholder)+'</option>'+
        f.options.map(function(o){
          return '<option value="'+esc(o)+'"'+(f.value===o?' selected':'')+'>'+esc(o)+'</option>';
        }).join('')+'</select>';
      break;
    case 'combo':
      control = '<input class="inp'+errCls+'" data-field="'+f.id+'" list="'+f.id+'-dl" value="'+esc(f.value)+'" '+
        'placeholder="'+esc(f.placeholder)+'"'+(f.disabled?' disabled':'')+' autocomplete="off">'+
        '<datalist id="'+f.id+'-dl">'+ f.options.map(function(o){ return '<option value="'+esc(o)+'"></option>'; }).join('') +'</datalist>';
      break;
    case 'chips':
      control = '<div class="chips">'+ f.chips.map(function(c){
          return '<button class="chip'+(c.on?' on':'')+'" data-act="chip" data-f="'+f.id+'" data-v="'+esc(c.value)+'">'+esc(c.value)+'</button>';
        }).join('') +'</div>'+
        '<div class="chiprow">'+
          '<input data-field="__qualDraft" value="'+esc(f.draft)+'" placeholder="Add another…" autocomplete="off">'+
          '<button data-act="addqual">Add</button>'+
        '</div>';
      break;
    case 'file':
      control = '<div class="drop'+errCls+'">'+
        f.files.map(function(af,i){
          var url = FILE_URLS[af.name];
          return '<div class="filerow">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pulse)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>'+
            '<div class="nm"><b>'+esc(af.name)+'</b><span>'+fsize(af.size)+'</span></div>'+
            (url ? '<a class="lnk" href="'+esc(url)+'" target="_blank" rel="noopener">View</a>' : '')+
            '<button class="rm" data-act="rmfile" data-f="'+f.id+'" data-i="'+i+'">Remove</button>'+
          '</div>';
        }).join('')+
        '<label class="fileadd">'+
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>'+
          (f.files.length ? 'Add another file' : 'Choose a file')+
          '<input type="file" data-file="'+f.id+'" accept="'+f.accept+'"'+(f.multiple?' multiple':'')+'>'+
        '</label>'+
        '<div class="filenote">'+esc(f.note)+'</div>'+
      '</div>';
      break;
    default:
      control = '<input class="inp'+errCls+(f.mono?' mono':'')+'" data-field="'+f.id+'" value="'+esc(f.value)+'" '+
        'placeholder="'+esc(f.placeholder)+'"'+(f.maxlength?' maxlength="'+f.maxlength+'"':'')+
        (f.numeric?' inputmode="numeric"':'')+' autocomplete="off">';
  }

  return '<div class="'+cls+'" style="animation-delay:'+f.delay+'">'+
    '<div class="flabelrow">'+
      (f.required ? '<span class="req"></span>' : '')+
      '<label class="flabel">'+esc(f.label)+'</label>'+
      (f.optional ? '<span class="fopt">Optional</span>' : '')+
      (f.derived ? '<span class="fderived">'+esc(f.derived)+'</span>' : '')+
    '</div>'+
    control+
    (f.hint && !f.error ? '<div class="fhint">'+esc(f.hint)+'</div>' : '')+
    (f.help && !f.error ? '<div class="fhelp">'+esc(f.help)+'</div>' : '')+
    (f.error ? '<div class="ferr">'+esc(f.error)+'</div>' : '')+
  '</div>';
}

/* ---------- review ---------- */

function reviewGroups(){
  var f = normalize(S.form);
  var kv = kmpdc(f.kmpdcIssue), iv = insurance(f.insuranceFrom);
  var nz = function(v){ return v || '—'; };
  var docLine = function(key){
    var a = f[key] || [];
    return a.length ? a.map(function(x){ return x.name; }).join(', ') : 'Not attached';
  };
  var typeLabel = (APPLICANT_TYPES.find(function(t){ return t.id===f.applicantType; })||{}).label || '—';
  var docItems = [
    ['Indemnity insurance', docLine('docInsurance'),'ui'],
    ['Practice licence', docLine('docLicence'),'ui'],
    ['Course certificates', docLine('docCourses'),'ui']
  ];
  if(f.applicantType==='new') docItems.push(['Current C.V.', docLine('docCv'),'ui']);

  var groups;
  if(f.applicantType==='new'){
    groups = [
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
    ];
  } else {
    groups = [
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
  }
  return { groups:groups, kv:kv, iv:iv };
}

function reviewBody(){
  var r = reviewGroups();
  return '<div class="cap" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">'+
      '<div class="statuspill"><span class="dot" style="background:'+dotFor(r.kv)+'"></span>KMPDC '+esc(r.kv.status)+'</div>'+
      '<div class="statuspill"><span class="dot" style="background:'+dotFor(r.iv)+'"></span>Insurance '+esc(r.iv.status)+'</div>'+
    '</div>'+
    '<div class="cap rgrid">'+ r.groups.map(function(g){
      return '<div class="card">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
          '<span class="kicker">'+esc(g.title)+'</span>'+
          '<button class="editbtn" data-act="jump" data-v="'+esc(g.key)+'">'+
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>Edit</button>'+
        '</div>'+
        g.items.map(function(it){
          return '<div class="kv"><span class="k">'+esc(it[0])+'</span>'+
            '<span class="v'+(it[2]==='mono'?' mono':'')+'">'+esc(it[1]||'—')+'</span></div>';
        }).join('')+
      '</div>';
    }).join('') +'</div>';
}

/* ---------- success ---------- */

function screenSuccess(){
  var f = normalize(S.form);
  var applying = f.applicantType==='new';
  var who = (f.salutation ? f.salutation+' ' : '') + (f.fullNames || 'The doctor');
  return '<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center;gap:6px">'+
    character('done',150)+
    '<div style="font-family:var(--disp);font-weight:700;font-size:30px;letter-spacing:-.02em;margin-top:8px;color:var(--navy)">'+
      (applying?'Application submitted':'Doctor registered')+'</div>'+
    '<div style="width:52px;height:3px;border-radius:3px;background:var(--gold);margin:10px 0 4px"></div>'+
    '<div style="font-size:15px;color:var(--mist72);max-width:440px;line-height:1.5">'+
      esc(applying
        ? who+'’s application has gone to the ASA committee. You’ll hear back once the referees have replied.'
        : who+' is now on the registry.')+'</div>'+
    '<div style="display:flex;gap:10px;margin-top:22px;width:100%;max-width:320px">'+
      '<button class="btn ghost sm" data-act="another" style="flex:1;padding:13px">'+(applying?'New application':'Register another')+'</button>'+
      '<button class="btn sm" data-act="go" data-v="dashboard" style="flex:1;padding:13px">View registry</button>'+
    '</div>'+
  '</div>';
}

/* ---------- dashboard ---------- */

function screenDashboard(){
  var docs = S.doctors, t = S.kpiT;
  var kAct = docs.filter(function(d){ return kmpdc(d.kmpdcIssue).status==='Active'; }).length;
  var iAct = docs.filter(function(d){ return insurance(d.insuranceFrom).status==='Active'; }).length;
  var inact = docs.filter(function(d){
    return kmpdc(d.kmpdcIssue).status==='Inactive' || insurance(d.insuranceFrom).status==='Inactive';
  }).length;
  var disp = function(n){ return Math.round(n*t); };
  var kpis = [
    ['Registered', disp(docs.length), 'var(--gold-ink)'],
    ['KMPDC active', disp(kAct), 'var(--ok)'],
    ['Insurance active', disp(iAct), 'var(--ok)'],
    ['Inactive', disp(inact), 'var(--stop)']
  ];
  var lenses = [['all','All'],['kmpdc-inactive','KMPDC inactive'],['insurance-inactive','Insurance inactive'],
                ['expiring','Expiring 60d'],['not-recorded','Not recorded']];
  var list = filtered();

  var rows = list.length ? list.map(function(d,i){
    var st = statusOf(d);
    var kLabel = st.kWarn ? ('Active · '+st.k.days+'d') : st.k.status;
    var iLabel = st.iWarn ? ('Active · '+st.inv.days+'d') : st.inv.status;
    return '<button class="drow rise" data-act="open" data-v="'+d.id+'" style="animation-delay:'+(Math.min(i,12)*30)+'ms">'+
      '<div class="top"><span class="nm">'+esc((d.salutation?d.salutation+' ':'')+d.fullNames)+'</span>'+
        '<span class="reg">'+esc(d.regNo)+'</span></div>'+
      '<div class="spec">'+esc(d.speciality||'—')+(d.subSpeciality?' · '+esc(d.subSpeciality):'')+'</div>'+
      '<div class="badges">'+
        '<span class="badge"><span class="dot'+(st.kWarn?' warn-dot':'')+'" style="background:'+st.kDot+'"></span>'+
          '<span class="lb">KMPDC</span><span class="st">'+esc(kLabel)+'</span><span class="dt">'+esc(st.kDate)+'</span></span>'+
        '<span class="badge"><span class="dot'+(st.iWarn?' warn-dot':'')+'" style="background:'+st.iDot+'"></span>'+
          '<span class="lb">Ins</span><span class="st">'+esc(iLabel)+'</span><span class="dt">'+esc(st.iDate)+'</span></span>'+
      '</div></button>';
  }).join('') :
    '<div class="empty fspan">'+character('idle',96)+
      '<h3>Nothing matches</h3><p>No doctor fits the filters you have on. Clear them, or register the first doctor.</p>'+
      '<button class="btn sm" data-act="another">Register a doctor</button></div>';

  return '<div class="col">'+
    '<div class="pad" style="border-bottom:1px solid var(--mist16);padding-bottom:14px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">'+
        '<div>'+
          '<div style="font-family:var(--disp);font-weight:700;font-size:24px;letter-spacing:-.02em;line-height:1;color:var(--navy)">Doctor registry</div>'+
          '<div style="font-size:12px;color:var(--mist48);margin-top:4px">'+
            list.length+(list.length===1?' doctor':' doctors')+' · sorted by soonest expiry</div>'+
        '</div>'+
        '<div style="display:flex;gap:8px">'+
          '<button class="btn ghost sm" data-act="export">Export CSV</button>'+
          '<button class="btn ghost sm" data-act="reset">Reset demo</button>'+
          '<button class="btn sm" data-act="go" data-v="import">Import</button>'+
        '</div>'+
      '</div>'+
      (S.batchIds ? '<div style="margin-top:10px;font-size:12px;color:var(--pulse)">Showing the imported batch · '+
        '<a href="#" data-act="clearbatch">show everyone</a></div>' : '')+
    '</div>'+

    '<div class="scroll">'+
      '<div class="padb kgrid">'+ kpis.map(function(k){
        return '<div class="kpi"><b style="color:'+k[2]+'">'+k[1]+'</b><span>'+k[0]+'</span></div>';
      }).join('') +'</div>'+

      '<div class="pillrow no-bar" style="padding:0 20px 6px">'+ lenses.map(function(l){
        return '<button class="pill'+(S.filter===l[0]?' on':'')+'" data-act="filter" data-v="'+l[0]+'">'+l[1]+'</button>';
      }).join('') +'</div>'+
      '<div class="pillrow no-bar" style="padding:4px 20px 6px"><span class="pilllabel">Cat</span>'+
        ['All'].concat(CATEGORIES).map(function(c){
          return '<button class="pill sub'+(S.catFilter===c?' on':'')+'" data-act="catfilter" data-v="'+esc(c)+'">'+esc(c)+'</button>';
        }).join('') +'</div>'+
      '<div class="pillrow no-bar" style="padding:0 20px 10px"><span class="pilllabel">Div</span>'+
        ['All'].concat(DIVISIONS).map(function(c){
          return '<button class="pill sub'+(S.divFilter===c?' on':'')+'" data-act="divfilter" data-v="'+esc(c)+'">'+esc(c)+'</button>';
        }).join('') +'</div>'+

      '<div class="padb lgrid" style="padding-top:2px">'+ rows +'</div>'+
    '</div>'+
  '</div>';
}

/* ---------- detail sheet ---------- */

function detailGroups(d){
  var docs = function(k){
    var a = d[k] || [];
    return a.length ? a.map(function(x){ return x.name; }).join(', ') : 'Not attached';
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

function statusBlock(label, v, rule, startLabel, startDate, endLabel, endDate, startD, endD){
  var pct = 50;
  if(startD && endD){
    var total = diffDays(endD,startD) || 1;
    pct = Math.max(4, Math.min(96, diffDays(new Date(),startD)/total*100));
  }
  var color = v.status==='Inactive' ? 'var(--stop)' : (v.status==='Not recorded' ? 'var(--mist48)' : 'var(--ok)');
  return '<div class="card" style="background:transparent;margin-bottom:12px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
      '<span style="font-size:13px;font-weight:600;color:var(--mist)">'+esc(label)+'</span>'+
      '<span style="display:flex;align-items:center;gap:7px"><span class="dot" style="background:'+dotFor(v)+'"></span>'+
        '<span style="font-size:13px;color:'+color+';font-weight:600">'+esc(v.status)+'</span></span>'+
    '</div>'+
    (v.status!=='Not recorded'
      ? '<div class="timeline"><i class="a"></i><i class="b"></i><i class="now" style="left:'+pct+'%"></i></div>'+
        '<div class="tlabels"><span>'+esc(startDate)+'</span><span style="color:var(--pulse)">today</span><span>'+esc(endDate)+'</span></div>'
      : '')+
    '<div style="font-size:11.5px;color:var(--mist48);margin-top:10px;line-height:1.45">'+
      esc(startLabel)+' → '+esc(endLabel)+' · <span style="color:var(--mist72)">'+esc(rule)+'</span></div>'+
  '</div>';
}

function sheet(){
  if(S.screen!=='dashboard' || !S.selectedId) return '';
  var d = S.doctors.find(function(x){ return x.id===S.selectedId; });
  if(!d) return '';
  var k = kmpdc(d.kmpdcIssue), inv = insurance(d.insuranceFrom);
  var pose = (k.status==='Inactive'||inv.status==='Inactive') ? 'concerned'
    : ((k.status==='Not recorded'&&inv.status==='Not recorded') ? 'idle' : 'done');

  return '<div class="scrim" data-act="closesheet"></div>'+
    '<div class="sheet" style="transform:translateY('+S.dragY+'px)">'+
      '<div class="grab" data-grab="1"><i></i></div>'+
      '<div class="sheethd">'+
        '<div style="flex:none;margin-top:-6px">'+character(pose,60)+'</div>'+
        '<div style="min-width:0;flex:1">'+
          '<div style="font-family:var(--disp);font-weight:700;font-size:21px;letter-spacing:-.01em;line-height:1.15;color:var(--navy)">'+
            esc((d.salutation?d.salutation+' ':'')+d.fullNames)+'</div>'+
          '<div style="font-size:12px;color:var(--mist48);margin-top:4px">'+
            '<span style="font-family:var(--mono)">'+esc(d.regNo)+'</span> · '+esc(d.speciality||'—')+
            (d.subSpeciality?' · '+esc(d.subSpeciality):'')+'</div>'+
        '</div>'+
        '<button class="sheetclose" data-act="closesheet" aria-label="Close">✕</button>'+
      '</div>'+
      '<div class="scroll" style="padding:16px 20px 28px">'+
        detailGroups(d).map(function(g){
          return '<div style="margin-bottom:16px"><div class="kicker" style="margin-bottom:8px">'+esc(g.title)+'</div>'+
            g.items.map(function(it){
              return '<div class="kv" style="border-bottom:1px solid var(--mist08)"><span class="k">'+esc(it[0])+'</span>'+
                '<span class="v'+(it[2]==='mono'?' mono':'')+'">'+esc(it[1]||'—')+'</span></div>';
            }).join('')+'</div>';
        }).join('')+
        statusBlock('KMPDC licence', k, '31 Dec of issue year + 1',
          'Issued', fmt(parse(d.kmpdcIssue)), 'Expires', k.expiry?fmt(k.expiry):'—',
          parse(d.kmpdcIssue), k.expiry)+
        statusBlock('Indemnity insurance', inv, 'start + 12 months',
          'From', d.insuranceFrom?fmt(parse(d.insuranceFrom)):'Not recorded',
          'Cover to', inv.coverTo?fmt(inv.coverTo):'—',
          parse(d.insuranceFrom), inv.coverTo)+
      '</div>'+
    '</div>';
}

/* ---------- import ---------- */

function screenImport(){
  var im = S.imp;
  var stageNames = ['Drop','Map','Validate','Commit'];
  var poses = ['greeting','listening','checking','sorting'];
  var body =
    im.stage===0 ? importDrop() :
    im.stage===1 ? importMap()  :
    im.stage===2 ? importValidate() : importCommit();

  var footer = '';
  if(im.stage===1){
    var missing = unmappedRequired();
    footer = '<div class="padf" style="display:flex;gap:10px;align-items:center">'+
      '<button class="btn ghost" data-act="impstage" data-v="0" style="padding:13px 18px">Back</button>'+
      '<div style="flex:1">'+
        (missing.length ? '<div style="font-size:11px;color:var(--warn);margin-bottom:6px;line-height:1.35">Map these first: '+esc(missing.join(', '))+'</div>' : '')+
        '<button class="btn" data-act="impstage" data-v="2" style="width:100%;padding:13px"'+(missing.length?' disabled':'')+'>Continue</button>'+
      '</div></div>';
  } else if(im.stage===2){
    var ready = impResults().filter(function(r){
      return r.ok && !(r.dup && (im.dups[r.i]||'skip')==='skip');
    }).length;
    footer = '<div class="padf" style="display:flex;gap:10px;align-items:center">'+
      '<button class="btn ghost" data-act="impstage" data-v="1" style="padding:13px 18px">Back</button>'+
      '<button class="btn" data-act="commit" style="flex:1;padding:13px"'+(ready?'':' disabled')+'>'+
        'Import '+ready+(ready===1?' doctor':' doctors')+'</button></div>';
  }

  return '<div class="col">'+
    '<div class="pad" style="border-bottom:1px solid var(--mist16);padding-bottom:14px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
        '<div>'+
          '<div class="eyebrow">0'+(im.stage+1)+' · IMPORT</div>'+
          '<div style="font-family:var(--disp);font-weight:700;font-size:22px;letter-spacing:-.01em;line-height:1;margin-top:2px;color:var(--navy)">'+
            stageNames[im.stage]+'</div>'+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:10px">'+
          character(poses[im.stage]||'idle',56)+
          '<button class="btn ghost sm" data-act="cancelimport">Cancel</button>'+
        '</div>'+
      '</div>'+
      '<div class="stepbar">'+[0,1,2,3].map(function(n){
        return '<i class="'+(im.stage>=n?'on':'')+'"></i>';
      }).join('')+'</div>'+
    '</div>'+
    '<div class="scroll" style="padding:20px">'+ body +'</div>'+
    footer+
  '</div>';
}

function importDrop(){
  return '<label class="dropzone'+(S.imp.over?' over':'')+'" data-dropzone="1">'+
      '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--pulse)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><path d="m7 12 5 5 5-5"/><path d="M4 19h16"/></svg>'+
      '<div style="font-size:15px;color:var(--mist);font-weight:600">Drop a CSV here</div>'+
      '<div style="font-size:12px;color:var(--mist48)">or click to choose a file</div>'+
      '<input type="file" accept=".csv,text/csv" data-impfile="1">'+
    '</label>'+
    '<div style="display:flex;flex-direction:column;gap:10px;margin-top:20px;max-width:520px;margin-left:auto;margin-right:auto">'+
      '<button class="btn" data-act="impsample">Load sample data</button>'+
      '<button class="btn ghost" data-act="imptemplate" style="padding:12px;font-size:13px">Download blank template (.csv)</button>'+
    '</div>'+
    '<div style="font-size:12px;color:var(--mist48);margin-top:18px;line-height:1.6;text-align:center;max-width:520px;margin-left:auto;margin-right:auto">'+
      'Any status column in your file is ignored — KMPDC and insurance status are always recomputed from the dates, so a stale spreadsheet can’t mark a lapsed doctor as active.</div>';
}

function importMap(){
  var im = S.imp;
  return '<div style="font-size:13px;color:var(--mist72);margin-bottom:4px">'+
      '<span style="font-family:var(--mono);color:var(--mist)">'+esc(im.fileName)+'</span> · '+im.rows.length+' rows</div>'+
    '<div style="font-size:12px;color:var(--mist48);margin-bottom:16px">Matched columns are ticked. Set any that are missing.</div>'+
    TARGETS.map(function(t){
      var id = t[0], label = t[1], src = im.map[id]||'';
      return '<div class="maprow">'+
        '<div class="lb">'+(IMP_REQ.indexOf(id)>=0?'<span class="req" style="width:5px;height:5px"></span>':'')+
          '<span>'+esc(label)+'</span></div>'+
        '<select data-map="'+id+'"><option value="">— not mapped —</option>'+
          im.headers.map(function(h){
            return '<option value="'+esc(h)+'"'+(src===h?' selected':'')+'>'+esc(h)+'</option>';
          }).join('')+'</select>'+
        (src ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M20 6 9 17l-5-5"/></svg>'
             : '<span style="width:16px;flex:none"></span>')+
      '</div>';
    }).join('');
}

function importValidate(){
  var results = impResults();
  var ready = results.filter(function(r){ return r.ok; });
  var bad = results.filter(function(r){ return !r.ok; });
  var dups = results.filter(function(r){ return r.dup && r.ok; });

  var head = '<div style="display:flex;gap:10px;margin-bottom:16px">'+
    '<div class="kpi" style="flex:1"><b style="font-size:26px;color:var(--ok)">'+ready.length+'</b><span>ready</span></div>'+
    '<div class="kpi" style="flex:1"><b style="font-size:26px;color:var(--warn)">'+bad.length+'</b><span>need attention</span></div>'+
    (dups.length ? '<div class="kpi" style="flex:1"><b style="font-size:26px;color:var(--pulse)">'+dups.length+'</b><span>duplicates</span></div>' : '')+
  '</div>';

  var dupHtml = dups.length ? '<div style="margin-bottom:18px">'+
    '<div class="kicker" style="margin-bottom:8px">Already on the registry</div>'+
    dups.map(function(r){
      var choice = S.imp.dups[r.i] || 'skip';
      return '<div class="card" style="margin-bottom:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+
        '<div style="flex:1;min-width:160px"><div style="font-size:13px;font-weight:600">'+esc(r.rec.fullNames)+'</div>'+
          '<div style="font-family:var(--mono);font-size:11px;color:var(--mist48);margin-top:2px">'+esc(r.rec.regNo)+'</div></div>'+
        '<div style="display:flex;gap:8px">'+
          '<button class="pill sub'+(choice==='skip'?' on':'')+'" data-act="dup" data-i="'+r.i+'" data-v="skip">Skip</button>'+
          '<button class="pill sub'+(choice==='overwrite'?' on':'')+'" data-act="dup" data-i="'+r.i+'" data-v="overwrite">Overwrite</button>'+
        '</div></div>';
    }).join('')+'</div>' : '';

  if(!bad.length){
    return head + dupHtml +
      '<div class="card" style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--mist72)">'+
        '<span class="dot" style="background:var(--ok)"></span>Every remaining row is valid and ready to import.</div>';
  }

  return head + dupHtml +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
      '<span style="font-size:12px;color:var(--mist48)">Fix the tinted cells, or they’ll be skipped</span>'+
      '<button class="editbtn" data-act="imperrors">Download error rows</button>'+
    '</div>'+
    bad.map(function(r){
      return '<div class="card" style="margin-bottom:10px">'+
        '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:10px">'+
          '<span style="font-size:13px;font-weight:600;color:var(--mist)">'+esc(r.rec.fullNames || ('Row '+(r.i+1)))+'</span>'+
          '<span style="font-family:var(--mono);font-size:11px;color:var(--mist48);flex:none">'+esc(r.rec.regNo||'—')+'</span>'+
        '</div>'+
        '<div class="cellgrid">'+ IMP_REQ.map(function(id){
          var t = TARGETS.find(function(x){ return x[0]===id; });
          var val = Array.isArray(r.rec[id]) ? r.rec[id].join('; ') : (r.rec[id]||'');
          return '<div class="cell"><label>'+esc(t[1])+'</label>'+
            '<input value="'+esc(val)+'" class="'+(r.errs[id]?'bad':'')+'" data-cell="'+r.i+'|'+id+'"></div>';
        }).join('') +'</div>'+
        '<div style="font-size:11px;color:var(--stop);margin-top:8px;line-height:1.45">'+
          esc(Object.keys(r.errs).map(function(k){ return r.errs[k]; }).join('  '))+'</div>'+
      '</div>';
    }).join('');
}

function importCommit(){
  var im = S.imp, sum = im.summary || {imported:0,skipped:0,overwritten:0};
  if(im.progress<100){
    return '<div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:16px;gap:8px">'+
      character('sorting',120)+
      '<div style="font-size:14px;color:var(--mist72);margin-top:8px">Sorting records…</div>'+
      '<div class="bar" style="margin-top:14px;max-width:420px"><i style="width:'+im.progress+'%"></i></div>'+
    '</div>';
  }
  return '<div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:16px;gap:8px;max-width:520px;margin:0 auto">'+
    character('done',120)+
    '<div style="font-family:var(--disp);font-weight:700;font-size:24px;letter-spacing:-.01em;margin-top:6px;color:var(--navy)">Import complete</div>'+
    '<div style="display:flex;gap:10px;margin-top:14px;width:100%">'+
      '<div class="kpi" style="flex:1"><b style="font-size:24px;color:var(--ok)">'+sum.imported+'</b><span>imported</span></div>'+
      '<div class="kpi" style="flex:1"><b style="font-size:24px;color:var(--pulse)">'+sum.overwritten+'</b><span>overwritten</span></div>'+
      '<div class="kpi" style="flex:1"><b style="font-size:24px;color:var(--mist48)">'+sum.skipped+'</b><span>skipped</span></div>'+
    '</div>'+
    '<button class="btn" data-act="viewimported" style="margin-top:20px;width:100%">View imported doctors</button>'+
  '</div>';
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

root.addEventListener('click', function(e){
  var el = e.target.closest('[data-act]');
  if(!el) return;
  var act = el.dataset.act, v = el.dataset.v;

  switch(act){
    case 'go': go(v); break;
    case 'next': next(); break;
    case 'back': back(); break;
    case 'another': registerAnother(); break;
    case 'seg':
      if(el.dataset.f==='applicantType') setApplicantType(v);
      else { setForm(el.dataset.f, v); touch(el.dataset.f); }
      break;
    case 'check':
      S.form[el.dataset.f] = !S.form[el.dataset.f];
      S.touched[el.dataset.f] = true;
      schedule();
      break;
    case 'chip': {
      var f = el.dataset.f, cur = S.form[f] || [];
      S.form[f] = cur.indexOf(v)>=0 ? cur.filter(function(x){ return x!==v; }) : cur.concat([v]);
      S.touched[f] = true;
      schedule();
      break;
    }
    case 'addqual': addQual(); break;
    case 'rmfile': removeFile(el.dataset.f, +el.dataset.i); break;
    case 'jump': jumpTo(stepIndexOf(v), (steps()[stepIndexOf(v)].fields||[])[0]); break;
    case 'open': S.selectedId = v; S.dragY = 0; schedule(); break;
    case 'closesheet': S.selectedId = null; S.dragY = 0; schedule(); break;
    case 'filter': S.filter = v; schedule(); break;
    case 'catfilter': S.catFilter = v; schedule(); break;
    case 'divfilter': S.divFilter = v; schedule(); break;
    case 'clearbatch': e.preventDefault(); S.batchIds = null; schedule(); break;
    case 'export': exportCsv(); break;
    case 'reset': resetDemo(); break;
    case 'impsample': loadImpSample(); break;
    case 'imptemplate': downloadTemplate(); break;
    case 'imperrors': downloadErrors(); break;
    case 'impstage': S.imp.stage = +v; schedule(); break;
    case 'commit': commitImport(); break;
    case 'cancelimport': cancelImport(); break;
    case 'viewimported': viewImported(); break;
    case 'dup':
      S.imp.dups = Object.assign({}, S.imp.dups);
      S.imp.dups[+el.dataset.i] = v;
      schedule();
      break;
  }
});

root.addEventListener('input', function(e){
  var t = e.target;
  if(t.dataset.field){
    var id = t.dataset.field;
    if(id==='__qualDraft'){ S.qualDraft = t.value; return; }   /* no re-render while typing */
    var val = t.value;
    if(id==='regNo') val = val.toUpperCase();
    if(id==='admissionYear' || /^year/.test(id)) val = val.replace(/\D/g,'').slice(0,4);
    S.form[id] = val;
    if(t.value !== val) t.value = val;
    if(S.touched[id]) schedule();                              /* live error clearing only */
    return;
  }
  if(t.dataset.cell){
    var parts = t.dataset.cell.split('|');
    editImpCell(+parts[0], parts[1], t.value);
  }
});

root.addEventListener('change', function(e){
  var t = e.target;
  if(t.dataset.field){
    var id = t.dataset.field;
    if(id==='__qualDraft') return;
    S.form[id] = t.value;
    if(id==='category'){ S.form.speciality = ''; S.form.subSpeciality = ''; }
    if(id==='speciality'){ S.form.subSpeciality = ''; }
    S.touched[id] = true;
    schedule();
    return;
  }
  if(t.dataset.file){ addFiles(t.dataset.file, t.files); t.value=''; return; }
  if(t.dataset.map){
    S.imp.map = Object.assign({}, S.imp.map);
    S.imp.map[t.dataset.map] = t.value;
    schedule();
    return;
  }
  if(t.dataset.impfile){ onImpFile(t.files && t.files[0]); t.value=''; }
});

root.addEventListener('blur', function(e){
  var t = e.target;
  if(!t.dataset || !t.dataset.field) return;
  var id = t.dataset.field;
  if(id==='__qualDraft') return;
  if(id==='contact') S.form.contact = formatContact(S.form.contact);
  if(id==='email')   S.form.email = String(S.form.email||'').toLowerCase().trim();
  S.touched[id] = true;
  schedule();
}, true);

root.addEventListener('keydown', function(e){
  if(e.target.dataset && e.target.dataset.field==='__qualDraft' && e.key==='Enter'){
    e.preventDefault();
    addQual();
  }
});

/* drag-to-dismiss on the sheet */
var sheetDrag = { on:false, y0:0 };
root.addEventListener('pointerdown', function(e){
  var g = e.target.closest('[data-grab]');
  if(!g) return;
  g.setPointerCapture(e.pointerId);
  sheetDrag.on = true;
  sheetDrag.y0 = e.clientY;
});
root.addEventListener('pointermove', function(e){
  if(!sheetDrag.on) return;
  S.dragY = Math.max(0, e.clientY - sheetDrag.y0);
  schedule();
});
root.addEventListener('pointerup', function(){
  if(!sheetDrag.on) return;
  sheetDrag.on = false;
  if(S.dragY>120){ S.selectedId = null; }
  S.dragY = 0;
  schedule();
});

/* import drag & drop */
root.addEventListener('dragover', function(e){
  if(!e.target.closest('[data-dropzone]')) return;
  e.preventDefault();
  if(!S.imp.over){ S.imp.over = true; schedule(); }
});
root.addEventListener('dragleave', function(e){
  if(!e.target.closest('[data-dropzone]')) return;
  if(S.imp.over){ S.imp.over = false; schedule(); }
});
root.addEventListener('drop', function(e){
  if(!e.target.closest('[data-dropzone]')) return;
  e.preventDefault();
  S.imp.over = false;
  onImpFile(e.dataTransfer.files && e.dataTransfer.files[0]);
});

document.addEventListener('keydown', function(e){
  if(e.key==='Escape' && S.selectedId){ S.selectedId = null; S.dragY = 0; schedule(); }
});

/* ------------------------------------------------------------------ */
render();

})();
