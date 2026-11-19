/**
 * CodeQuest XP pilot. Client-awarded game points are NOT certified grades.
 * Only immutable events count; one event ID = one award.
 */
import {initializeApp,getApp,getApps} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore,collection,doc,getDoc,getDocs,onSnapshot,query,where,writeBatch} from 'firebase/firestore';

const config={apiKey:import.meta.env.VITE_FIREBASE_API_KEY,authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,appId:import.meta.env.VITE_FIREBASE_APP_ID};
const available=Object.values(config).every(Boolean);
const app=available?(getApps().length?getApp():initializeApp(config)):null;
const db=app?getFirestore(app):null;
const auth=app?getAuth(app):null;
export const XP_REWARDS=Object.freeze({daily:20,gesture:30});
export const xpEnabled=available;
export const almatyDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Almaty',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const xpLevel=total=>{
 const xp=Math.max(0,Number(total)||0);
 const level=Math.floor(xp/200)+1;
 return {xp,level,progress:xp%200,next:200,remaining:200-(xp%200)};
};
const ledger=uid=>collection(db,'xp_events',uid,'items');
const classLedger=classId=>collection(db,'classrooms',classId,'xp_events');
export const totalXp=events=>events.reduce((n,e)=>n+(Number(e.points)||0),0);
export const xpSummary=events=>xpLevel(totalXp(events));
const checkUser=async()=>{
 if(!db||!auth)throw new Error('Firebase XP сақтауы қосылмаған.');
 await auth.authStateReady();
 const user=auth.currentUser;
 if(!user||user.isAnonymous||!user.emailVerified)throw new Error('XP сақтау үшін расталған оқушы аккаунты қажет.');
 await user.getIdToken(true);
 return user.uid;
};
export async function awardXp({source,date=almatyDay(),questionIndex=null}){
 const uid=await checkUser();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Күн форматы қате.');
 if(!['daily','gesture'].includes(source))throw new Error('XP әрекеті белгісіз.');
 if(source==='gesture'&&(!Number.isInteger(questionIndex)||questionIndex<0||questionIndex>=12))throw new Error('Сұрақ нөмірі жарамсыз.');
 const id=source==='daily'?'daily_'+date:'gesture_'+date+'_'+questionIndex;
 const points=XP_REWARDS[source];
 const memberships=await getDocs(query(collection(db,'class_memberships'),where('student_uid','==',uid)));
 const approved=memberships.docs.map(d=>d.data()).filter(m=>m.status==='approved').slice(0,15);
 const base={student_uid:uid,event_id:id,source,points,date,created_at:Date.now()};
 const existing=await getDoc(doc(ledger(uid),id));
 if(existing.exists())return {awarded:false,points:0};
 const batch=writeBatch(db);
 batch.set(doc(ledger(uid),id),base);
 for(const m of approved){
  batch.set(doc(classLedger(m.class_id),uid+'_'+id),{...base,class_id:m.class_id,student_name:String(m.student_name||'Оқушы').slice(0,130)});
 }
 try{await batch.commit();return {awarded:true,points}}catch(error){
  if(error?.code==='permission-denied')throw new Error('Firebase Rules жарияланбаған немесе XP жазуға рұқсат жоқ.');
  throw error;
 }
}
// Only the owning teacher can settle a closed, class-linked quiz.
// Unauthenticated guests and incomplete quizzes are deliberately excluded.
export async function grantQuizXp(quiz,results){
 if(!db||!auth)throw new Error('Firebase XP қосылмаған.');
 await auth.authStateReady();
 const teacher=auth.currentUser;
 if(!teacher||teacher.isAnonymous||!teacher.emailVerified)throw new Error('Мұғалім аккаунты қажет.');
 await teacher.getIdToken(true);
 if(!quiz?.class_id||!quiz?.id||quiz.status!=='closed')throw new Error('Алдымен сынып тестін аяқтаңыз.');
 const classroom=await getDoc(doc(db,'classrooms',quiz.class_id));
 if(!classroom.exists()||classroom.data().owner_uid!==teacher.uid)throw new Error('Бұл сынып сізге тиесілі емес.');
 const quizDoc=await getDoc(doc(db,'quizzes',quiz.id));
 if(!quizDoc.exists()||quizDoc.data().owner_uid!==teacher.uid||quizDoc.data().class_id!==quiz.class_id||quizDoc.data().status!=='closed')throw new Error('Тест аяқталмаған.');
 const memberships=await getDocs(query(collection(db,'class_memberships'),where('owner_uid','==',teacher.uid)));
 const members=new Map(memberships.docs.map(d=>d.data()).filter(m=>m.class_id===quiz.class_id&&m.status==='approved').map(m=>[m.student_uid,m]));
 const totalQuestions=Array.isArray(quiz.questions)?quiz.questions.length:0;
 if(!totalQuestions)throw new Error('Тест сұрақтары жоқ.');
 let awarded=0,skipped=0,failed=0;
 const date=almatyDay();
 for(const result of results){
  const member=members.get(result.uid);
  const share=result.correct/totalQuestions;
  if(!member||result.answers!==totalQuestions||share<.8){skipped++;continue}
  const points=share===1?100:70;
  const eventId='quiz_'+quiz.id;
  const classEventRef=doc(classLedger(quiz.class_id),result.uid+'_'+eventId);
  try{
   if((await getDoc(classEventRef)).exists()){skipped++;continue}
   const entry={student_uid:result.uid,event_id:eventId,source:'quiz',points,date,created_at:Date.now(),class_id:quiz.class_id,student_name:String(member.student_name||'Оқушы').slice(0,130),quiz_id:quiz.id};
   const batch=writeBatch(db);
   batch.set(doc(ledger(result.uid),eventId),entry);
   batch.set(classEventRef,entry);
   await batch.commit();
   awarded++;
  }catch(e){failed++;console.warn('Quiz XP grant failed',e?.code||e?.message)}
 }
 if(failed)throw new Error('XP-нің '+failed+' жазбасын сақтау мүмкін болмады. Қайта көріңіз. Сәтті жазбалар қайталанбайды.');
 return {awarded,skipped};
}
export function watchXp(uid,onData,onError){
 if(!db||!uid){onData([]);return ()=>{};}
 return onSnapshot(ledger(uid),snap=>onData(snap.docs.map(d=>({id:d.id,...d.data()}))),onError);
}
export async function classXpRanking(classId,members){
 if(!db)return [];
 const approved=members.filter(m=>m.status==='approved');
 const snap=await getDocs(classLedger(classId));
 const totals=new Map(approved.map(m=>[m.student_uid,{uid:m.student_uid,name:m.student_name,xp:0}]));
 for(const row of snap.docs){
  const event=row.data();
  const student=totals.get(event.student_uid);
  if(student)student.xp+=Number(event.points)||0;
 }
 return [...totals.values()].sort((a,b)=>b.xp-a.xp||a.name.localeCompare(b.name));
}
