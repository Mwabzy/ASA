/* The 14 seeded doctors. Ported verbatim — this is what the database is
   populated with on first migration, not something the UI can re-trigger. */
import { daysAgo } from './dates.js';

function mk(sal,name,reg,cat,div,sub,quals,assoc,admYear,kIssue,iFrom,dob,town){
  return {
    id:'d'+Math.random().toString(36).slice(2,9),
    applicantType:'existing', salutation:sal, fullNames:name, regNo:reg,
    category:cat, speciality:div, subSpeciality:sub||'', quals,
    assocCategory:assoc, admissionYear:String(admYear),
    kmpdcIssue:kIssue, insuranceFrom:iFrom, dob,
    poBox:'00100', town:town||'Nairobi', address:'Doctors Plaza, 3rd floor',
    contact:'+254 700 000 000',
    email:(name.split(' ')[0]+'.'+name.split(' ').slice(-1)[0]+'@mail.co.ke').toLowerCase(),
    docInsurance:[], docLicence:[], docCourses:[], docCv:[],
    createdAt:Date.now()
  };
}

export function seed(){
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
