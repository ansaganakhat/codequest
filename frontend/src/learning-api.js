/**
 * CodeQuest AI learning workflows.
 * Role and school authorization are enforced by firestore.rules; UI checks are only UX.
 * Quiz is a recreational demo, NEVER a graded exam. Scores are not tamper-proof.
 */
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc,
  where, writeBatch, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const config={
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:import.meta.env.VITE_FIREBASE_APP_ID
};
const configured=Object.values(config).every(Boolean);
const app=configured?(getApps().length?getApp():initializeApp(config)):null;
const auth=app?getAuth(app):null;
const store=app?getFirestore(app):null;

function requireFirebase(){if(!store)throw new Error('firebase_not_ready');}
async function profile(){
  requireFirebase();
  await auth.authStateReady();
  const u=auth.currentUser;
  if(!u || u.isAnonymous)throw new Error('teacher_login_required');
  const snap=await getDoc(doc(store,'users',u.uid));
  if(!snap.exists())throw new Error('profile_missing');
  return {id:u.uid,...snap.data(),verified:u.emailVerified};
}
async function teacher(){
  // Keep Firebase Auth email_verified claim in sync with the user's verified
  // address before Firestore Rules evaluate teacher-owned writes or queries.
  await auth.authStateReady();
  const current=auth.currentUser;
  if(!current || current.isAnonymous)throw new Error('teacher_login_required');
  await current.reload();
  await current.getIdToken(true);
  const p=await profile();
  if((p.role!=='teacher'&&p.role!=='admin')||p.status!=='approved'||!p.verified)throw new Error('teacher_awaits_approval');
  if(!p.school_id && p.role!=='admin')throw new Error('teacher_school_missing');
  return p;
}
function tidy(s,max=80){return String(s||'').replace(/\s+/g,' ').trim().slice(0,max)}
function cleanItems(items){
  if(!Array.isArray(items)||items.length<1||items.length>10)throw new Error('quiz_question_count');
  return items.map(q=>{
    const prompt=tidy(q.prompt,200);
    const options=(q.options||[]).map(x=>tidy(x,90));
    const correct=Number(q.correct);
    if(prompt.length<5||options.length!==4||options.some(x=>x.length<1)||!Number.isInteger(correct)||correct<0||correct>3)throw new Error('quiz_invalid_question');
    return {prompt,options,correct};
  });
}
export const learningApi={
  enabled:configured,
  async createClassroom(input){
    const p=await teacher();
    const name=tidy(input.name,80);
    const grade=Number(input.grade);
    const letter=tidy(input.letter,4).toUpperCase();
    if(name.length<3||grade<1||grade>11)throw new Error('invalid_classroom');
    const data={owner_uid:p.id,school_id:Number(p.school_id),name,grade,letter,created_at:Date.now()};
    const ref=await addDoc(collection(store,'classrooms'),data);
    return {id:ref.id,...data};
  },
  async classrooms(){
    const p=await teacher();
    const snap=await getDocs(query(collection(store,'classrooms'),where('owner_uid','==',p.id)));
    return snap.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>b.created_at-a.created_at);
  },
  async createQuiz(input){
    const p=await teacher();
    const items=cleanItems(input.items);
    const title=tidy(input.title,100);
    if(title.length<3)throw new Error('quiz_title_required');
    const ref=doc(collection(store,'quizzes'));  // unpredictable share link, not a guessable 4-digit code
    const publicQuestions=items.map(({prompt,options})=>({prompt,options}));
    const quiz={
      owner_uid:p.id,school_id:Number(p.school_id||0),title,
      questions:publicQuestions,status:'open',created_at:Date.now()
    };
    const batch=writeBatch(store);
    batch.set(ref,quiz);
    batch.set(doc(store,'quiz_answer_keys',ref.id),{
      owner_uid:p.id,answers:items.map(x=>x.correct),created_at:Date.now()
    });
    await batch.commit();
    return {id:ref.id,...quiz};
  },
  async quizzes(){
    const p=await teacher();
    const snap=await getDocs(query(collection(store,'quizzes'),where('owner_uid','==',p.id)));
    return snap.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>b.created_at-a.created_at);
  },
  async closeQuiz(roomId){
    const p=await teacher();
    await updateDoc(doc(store,'quizzes',roomId),{status:'closed',closed_at:Date.now()});
    return p;
  },
  async getQuiz(roomId){
    requireFirebase();
    const ref=doc(store,'quizzes',String(roomId));
    const snap=await getDoc(ref);
    if(!snap.exists())throw new Error('room_not_found');
    return {id:snap.id,...snap.data()};
  },
  async ensureGuest(){
    requireFirebase();
    await auth.authStateReady();
    if(!auth.currentUser)await signInAnonymously(auth);
    return auth.currentUser;
  },
  async submitQuizAnswer(roomId,index,choice,alias){
    requireFirebase();
    const user=await this.ensureGuest();
    const nick=tidy(alias,24)||'Қатысушы';
    const q=Number(index),c=Number(choice);
    if(!Number.isInteger(q)||q<0||q>9||!Number.isInteger(c)||c<0||c>3)throw new Error('invalid_answer');
    const ref=doc(store,'quizzes',roomId,'responses',user.uid+'_'+q);
    // setDoc is create-only by rules; second attempt is denied.
    await setDoc(ref,{participant_uid:user.uid,question_index:q,option_index:c,alias:nick,created_at:Date.now()});
    return true;
  },
  async quizKey(roomId){
    const p=await teacher();
    const snapshot=await getDoc(doc(store,'quiz_answer_keys',roomId));
    if(!snapshot.exists())throw new Error('quiz_key_not_found');
    return snapshot.data().answers;
  },
  listenResponses(roomId,onData,onError=()=>{}){
    requireFirebase();
    return onSnapshot(collection(store,'quizzes',roomId,'responses'),snap=>{
      onData(snap.docs.map(d=>({id:d.id,...d.data()})));
    },onError);
  },
  listenRoom(roomId,onData,onError=()=>{}){
    requireFirebase();
    return onSnapshot(doc(store,'quizzes',roomId),d=>{
      if(d.exists())onData({id:d.id,...d.data()});
    },onError);
  },
  async analytics(){
    const qs=await this.quizzes();
    const recent=qs.slice(0,12);
    const results=await Promise.all(recent.map(async q=>{
      const [answerKey,answers]=await Promise.all([
        this.quizKey(q.id),
        getDocs(collection(store,'quizzes',q.id,'responses'))
      ]);
      const responses=answers.docs.map(x=>x.data());
      const correct=responses.filter(a=>answerKey[a.question_index]===a.option_index).length;
      return {title:q.title,created_at:q.created_at,participants:new Set(responses.map(x=>x.participant_uid)).size,
        answers:responses.length,correct,accuracy:responses.length?Math.round(100*correct/responses.length):0};
    }));
    return results;
  }
};
