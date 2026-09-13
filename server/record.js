/* Row ⇄ record mapping. The application-side shape is the original registry
   record, unchanged; only the column naming differs. */

export const COLUMNS = [
  ['id','id'],
  ['applicant_type','applicantType'],
  ['salutation','salutation'],
  ['surname','surname'],
  ['forenames','forenames'],
  ['full_names','fullNames'],
  ['dob','dob'],
  ['place_of_birth','placeOfBirth'],
  ['nationality','nationality'],
  ['telephone','telephone'],
  ['contact','contact'],
  ['alt_mobile','altMobile'],
  ['email','email'],
  ['po_box','poBox'],
  ['town','town'],
  ['address','address'],
  ['reg_no','regNo'],
  ['quals','quals'],
  ['category','category'],
  ['category_other','categoryOther'],
  ['speciality','speciality'],
  ['sub_speciality','subSpeciality'],
  ['year_mbchb','yearMbchb'],
  ['year_mmed','yearMmed'],
  ['year_registration','yearRegistration'],
  ['year_recognition','yearRecognition'],
  ['indemnity_details','indemnityDetails'],
  ['practice_licence_no','practiceLicenceNo'],
  ['insurance_from','insuranceFrom'],
  ['kmpdc_issue','kmpdcIssue'],
  ['ref1','ref1'],
  ['ref2','ref2'],
  ['ref3','ref3'],
  ['hosp1','hosp1'],
  ['hosp2','hosp2'],
  ['hosp3','hosp3'],
  ['hosp4','hosp4'],
  ['assoc_category','assocCategory'],
  ['admission_year','admissionYear'],
  ['kha_ack','khaAck'],
  ['doc_insurance','docInsurance'],
  ['doc_licence','docLicence'],
  ['doc_courses','docCourses'],
  ['doc_cv','docCv'],
  ['signed_by','signedBy'],
  ['signed_date','signedDate'],
  ['created_at','createdAt']
];

const JSON_COLS = new Set(['quals','doc_insurance','doc_licence','doc_courses','doc_cv']);
const BOOL_COLS = new Set(['kha_ack']);

/* Attachments are listed as {name,size}; anything else in the array is dropped. */
function cleanFiles(v){
  if(!Array.isArray(v)) return [];
  return v
    .filter(x => x && typeof x === 'object' && typeof x.name === 'string')
    .map(x => ({ name: String(x.name).slice(0,300), size: Number(x.size) || 0 }));
}

export function toRow(rec){
  return COLUMNS.map(([col, key]) => {
    const v = rec[key];
    if(col === 'quals'){
      return JSON.stringify(Array.isArray(v) ? v.map(x => String(x).slice(0,120)) : []);
    }
    if(JSON_COLS.has(col)) return JSON.stringify(cleanFiles(v));
    if(BOOL_COLS.has(col)) return !!v;
    if(col === 'created_at') return Number(v) || Date.now();
    return v == null ? '' : String(v);
  });
}

export function fromRow(row){
  const out = {};
  COLUMNS.forEach(([col, key]) => {
    let v = row[col];
    if(JSON_COLS.has(col)) v = Array.isArray(v) ? v : [];
    else if(BOOL_COLS.has(col)) v = !!v;
    else if(col === 'created_at') v = Number(v);
    else if(v == null) v = '';
    out[key] = v;
  });
  return out;
}

export const INSERT_SQL = (() => {
  const cols = COLUMNS.map(c => c[0]);
  const ph = cols.map((_,i) => '$'+(i+1));
  const updates = cols.filter(c => c !== 'id' && c !== 'created_at')
                      .map(c => c+' = EXCLUDED.'+c)
                      .concat(['updated_at = now()']);
  return {
    insert: 'INSERT INTO doctors ('+cols.join(', ')+') VALUES ('+ph.join(', ')+') RETURNING *',
    upsertByRegNo: 'INSERT INTO doctors ('+cols.join(', ')+') VALUES ('+ph.join(', ')+
                   ') ON CONFLICT (reg_no) DO UPDATE SET '+updates.join(', ')+' RETURNING *',
    update: 'UPDATE doctors SET '+
            cols.filter(c => c !== 'id' && c !== 'created_at')
                .map((c,i) => c+' = $'+(i+2)).join(', ')+
            ', updated_at = now() WHERE id = $1 RETURNING *'
  };
})();

/* Values for the UPDATE above: id first, then every column bar id/created_at. */
export function toUpdateParams(id, rec){
  const row = toRow(rec);
  const keep = [];
  COLUMNS.forEach(([col], i) => {
    if(col !== 'id' && col !== 'created_at') keep.push(row[i]);
  });
  return [id, ...keep];
}
