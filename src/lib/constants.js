/* Reference data — ported verbatim from the original registry.
   The data model, the five divisions and the step flow are unchanged. */

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const SALUTATIONS = ['Dr','Prof','Prof. Dr'];
export const TOWNS = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Ruiru','Nyeri','Machakos',
                      'Kericho','Kakamega','Meru','Kitale','Garissa','Malindi'];
export const QUALS = ['MBChB','MMed','MD','BDS','MRCS','FCS(ECSA)','MRCP','FRCS','PhD'];
export const CATEGORIES = ['Surgeon','Physician','Anaesthesia','Other'];
export const ASSOC = ['Courtesy','Visiting','Associate','Consultant'];

/* The five ASA divisions — a doctor belongs to exactly one. */
export const DIVISIONS = ['Surgery','Medicine','Paediatrics','Obs & Gynae','Anaesthesia'];

export const DIV_BY_CAT = {
  Surgeon:    ['Surgery','Obs & Gynae'],
  Physician:  ['Medicine','Paediatrics'],
  Anaesthesia:['Anaesthesia'],
  Other:      DIVISIONS
};

export const SUB_BY_DIV = {
  'Surgery':      ['Orthopaedics','ENT','Ophthalmology','General surgery','Urology','Neurosurgery'],
  'Medicine':     ['Cardiology','Nephrology','Endocrinology','Gastroenterology','Neurology','Dermatology','Psychiatry'],
  'Paediatrics':  ['Neonatology','Paediatric cardiology','Paediatric surgery'],
  'Obs & Gynae':  ['Maternal-fetal','Gynae-oncology','Reproductive medicine'],
  'Anaesthesia':  ['Critical care','Pain medicine','Paediatric anaesthesia']
};

export const APPLICANT_TYPES = [
  { id:'new',      label:'I’m applying to ASA' },
  { id:'existing', label:'I’m already an ASA doctor' }
];

export const ALL_STEPS = [
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

export const WARN_DAYS = 60;
export const DOC_ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx';

export const LABELS = {
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

export const REQUIRED = ['applicantType','salutation','surname','forenames','fullNames','dob','placeOfBirth',
  'nationality','contact','email','town','address','regNo','quals','category','categoryOther',
  'speciality','kmpdcIssue','assocCategory','admissionYear','yearMbchb','yearRegistration',
  'yearRecognition','indemnityDetails','practiceLicenceNo','ref1','ref2','ref3','hosp1','khaAck',
  'signedBy','signedDate','docInsurance','docLicence','docCourses','docCv'];

export const OPTIONAL = ['poBox','subSpeciality','insuranceFrom','telephone','altMobile','yearMmed','hosp2','hosp3','hosp4'];

export const WIDE = ['applicantType','quals','address','ref1','ref2','ref3','khaAck','categoryOther',
                     'docInsurance','docLicence','docCourses','docCv'];

/* Navigation — real nav links, not a pill switcher. */
export const NAV = [
  { key:'apply',    label:'Apply',    href:'#/apply' },
  { key:'registry', label:'Registry', href:'#/registry' },
  { key:'import',   label:'Import',   href:'#/import' }
];

export const PAGE_SIZE = 12;
