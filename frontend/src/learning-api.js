/**
 * CodeQuest AI learning workflows.
 * Role and school authorization are enforced by firestore.rules; UI checks are only UX.
 * Quiz is a recreational demo, NEVER a graded exam. Scores are not tamper-proof.
 */
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc,
  where, writeBatch, updateDoc
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {normalizeQuizRoomId} from './quiz-room.js';

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
async function student(){
  requireFirebase();
  await auth.authStateReady();
  const u=auth.currentUser;
  if(!u||u.isAnonymous)throw new Error('student_login_required');
  await u.reload();await u.getIdToken(true);
  const p=await profile();
  if(p.role!=='student'||p.status==='rejected')throw new Error('student_login_required');
  if(!p.verified)throw new Error('verify_email_first');
  return p;
}
const classDoc=id=>doc(store,'classrooms',String(id));
const memberDoc=(classId,uid)=>doc(store,'class_memberships',String(classId)+'_'+String(uid));
const membershipsCol=()=>collection(store,'class_memberships');
const invitationDoc=id=>doc(store,'classrooms',String(id),'active_quiz','current');
function classCode(v){const id=String(v||'').trim();if(!/^[A-Za-z0-9]{20}$/.test(id))throw new Error('class_code_invalid');return id}
async function teacherClass(id){
 const p=await teacher();
 const classId=classCode(id);
 const snap=await getDoc(classDoc(classId));
 if(!snap.exists()||snap.data().owner_uid!==p.id)throw new Error('class_not_owned');
 return {p,id:classId,...snap.data()};
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
  // Memberships are explicitly approved per-class by the teacher.
  async joinClassroom(input){
    const p=await student();
    const classId=classCode(input);
    const snap=await getDoc(classDoc(classId));
    if(!snap.exists())throw new Error('class_not_found');
    const data=snap.data();
    const ref=memberDoc(classId,p.id);
    const existing=await getDoc(ref);
    if(existing.exists())throw new Error('class_request_already_exists');
    const member={
      class_id:classId,owner_uid:data.owner_uid,student_uid:p.id,
      student_name:String(p.full_name||p.first_name||'Оқушы').slice(0,130),
      class_name:data.name,status:'pending',created_at:Date.now()
    };
    await setDoc(ref,member);
    return {id:ref.id,...member};
  },
  async myClassMemberships(){
    const p=await student();
    const snaps=await getDocs(query(membershipsCol(),where('student_uid','==',p.id)));
    return snaps.docs.map(d=>({id:d.id,...d.data()}));
  },
  listenMyClassMemberships(uid,cb,onError=()=>{}){
    requireFirebase();
    return onSnapshot(query(membershipsCol(),where('student_uid','==',uid)),snaps=>{
      cb(snaps.docs.map(d=>({id:d.id,...d.data()})));
    },onError);
  },
  listenClassQuiz(classId,cb,onError=()=>{}){
    requireFirebase();
    return onSnapshot(invitationDoc(classCode(classId)),snap=>{
      cb(snap.exists()?{...snap.data(),id:snap.id}:null);
    },onError);
  },
  async classMembers(classId){
    const clazz=await teacherClass(classId);
    const snaps=await getDocs(query(membershipsCol(),where('owner_uid','==',clazz.p.id)));
    return snaps.docs.map(d=>({id:d.id,...d.data()})).filter(m=>m.class_id===clazz.id);
  },
  async decideMembership(classId,uid,decision){
    const clazz=await teacherClass(classId);
    if(!['approved','rejected'].includes(decision))throw new Error('invalid_membership_decision');
    const ref=memberDoc(clazz.id,uid);
    const snap=await getDoc(ref);
    if(!snap.exists()||snap.data().owner_uid!==clazz.p.id||snap.data().class_id!==clazz.id)throw new Error('membership_missing');
    await updateDoc(ref,{status:decision});
    return {ok:true};
  },
  async createQuiz(input){
    const p=await teacher();
    const items=cleanItems(input.items);
    const title=tidy(input.title,100);
    if(title.length<3)throw new Error('quiz_title_required');
    const ref=doc(collection(store,'quizzes'));  // unpredictable share link, not a guessable 4-digit code
    const publicQuestions=items.map(({prompt,options})=>({prompt,options}));
    const classroom=input.class_id?await teacherClass(input.class_id):null;
    const quiz={
      owner_uid:p.id,school_id:Number(p.school_id||0),title,
      questions:publicQuestions,status:classroom?'draft':'open',created_at:Date.now(),
      ...(classroom?{class_id:classroom.id}:{})
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
  async startQuiz(roomId){
    const p=await teacher();
    const room=await getDoc(doc(store,'quizzes',normalizeQuizRoomId(roomId)));
    if(!room.exists()||room.data().owner_uid!==p.id||room.data().status!=='draft'||!room.data().class_id)throw new Error('quiz_not_startable');
    const klass=await teacherClass(room.data().class_id);
    const stamp=Date.now();
    const b=writeBatch(store);
    b.update(room.ref,{status:'open',started_at:stamp});
    b.set(invitationDoc(klass.id),{
      owner_uid:p.id,class_id:klass.id,quiz_id:room.id,title:room.data().title,
      status:'open',started_at:stamp
    });
    await b.commit();
    return {id:room.id,...room.data(),status:'open',started_at:stamp};
  },
  async closeQuiz(roomId){
    const p=await teacher();
    const room=await getDoc(doc(store,'quizzes',normalizeQuizRoomId(roomId)));
    if(!room.exists()||room.data().owner_uid!==p.id||room.data().status!=='open')throw new Error('quiz_not_open');
    const b=writeBatch(store),stamp=Date.now();
    b.update(room.ref,{status:'closed',closed_at:stamp});
    if(room.data().class_id){
      const alert=await getDoc(invitationDoc(room.data().class_id));
      if(alert.exists()&&alert.data().quiz_id===room.id){
        b.update(alert.ref,{status:'closed'});
      }
    }
    await b.commit();
    return {ok:true};
  },
  async getQuiz(roomId){
    requireFirebase();
    const ref=doc(store,'quizzes',normalizeQuizRoomId(roomId));
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
