/**
 * Optional Firebase backend for CodeQuest AI.
 * Set all VITE_FIREBASE_* env values to activate. No config => legacy API / offline catalogue.
 * IMPORTANT: Never store national IDs (IIN) or children photos through this browser SDK.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendEmailVerification, deleteUser,
} from 'firebase/auth';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where
} from 'firebase/firestore';
import { previewSchools, previewSubjects } from './catalog.js';

const options = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
export const firebaseReady = Object.values(options).every(x => typeof x === 'string' && x.trim().length>0);
const app = firebaseReady ? initializeApp(options) : null;
const auth = app ? getAuth(app) : null;
const store = app ? getFirestore(app) : null;
const userRef = uid => doc(store, 'users', String(uid));
const childRef = id => doc(store,'students',String(id));
const schoolRef = id => doc(store,'schools',String(id));
const studentCol = () => collection(store, 'students');
const normalizeStudent = snap => ({...snap.data(),id:snap.id,photo_url:null});
const schoolById = id => previewSchools.find(s=>String(s.id)===String(id));
function publicUser(profile) {
  if(!profile)throw new Error('profile_missing');
  return {...profile, school_name:schoolById(profile.school_id)?.name_kk || null,
    subject_ids:profile.subject_ids||[], email_verified:profile.id===auth.currentUser?.uid ? !!auth.currentUser?.emailVerified : null};
}
const fullName = p => [p.last_name,p.first_name,p.middle_name].filter(Boolean).join(' ').trim();
const publicSchool = s=>({...s,name:s.name||s.name_kk});
async function ownProfile() {
  await auth.authStateReady();
  const current=auth.currentUser;
  if(!current)return null;
  const snap=await getDoc(userRef(current.uid));
  return snap.exists()?publicUser({...snap.data(),id:snap.id}):null;
}
async function fetchPublic(path, fallback) {
  try{
    const snaps=await getDocs(collection(store,path));
    if(snaps.empty)return fallback;
    return snaps.docs.map(s=>({...s.data(),id:Number(s.id)||s.id}));
  }catch(err){
    // A configured Firebase backend must not silently fall back when the
    // connection, database or Firestore rules are unavailable.
    throw err;
  }
}
const requireUser=()=>{
  if(!auth.currentUser)throw new Error('not_authenticated');
  return auth.currentUser;
};
async function requireRole(...roles){
  const p=await ownProfile();
  if(!p || !roles.includes(p.role) || p.status==='rejected')throw new Error('forbidden');
  return p;
}
async function mustAdmin(){
  const id=await requireUser().getIdTokenResult(true);
  if(id.claims.admin!==true)throw new Error('forbidden');
}
async function fetchChildrenBy(field,value,status){
  const filters=[where(field,'==',value)];
  if(status)filters.push(where('status','==',status));
  const snap=await getDocs(query(studentCol(),...filters));
  return snap.docs.map(normalizeStudent);
}
function sanitizeChild(v){
  const result={
    full_name:String(v.full_name||'').trim(),
    grade:Number(v.grade),class_letter:String(v.class_letter||'').trim(),
    school_id:Number(v.school_id)
  };
  if(result.full_name.length<3 || result.grade<1 || result.grade>11 || !result.school_id)throw new Error('invalid_child');
  return result;
}
export const firebaseApi={
  async schools(){return (await fetchPublic('schools',previewSchools)).filter(s=>s.active!==false).map(publicSchool)},
  async subjects(){return await fetchPublic('subjects',previewSubjects)},
  async me(){return ownProfile()},
  async register(payload){
    if(payload.password!==payload.password_confirm)throw new Error('password_mismatch');
    if(!['teacher','parent'].includes(payload.role))throw new Error('forbidden');
    if(payload.role==='teacher'&&(!payload.school_id||!payload.subject_ids?.length))throw new Error('select_school_or_subject');
    if(!payload.consent)throw new Error('consent_required');
    if(fullName(payload).length>130)throw new Error('name_too_long');
    const created=await createUserWithEmailAndPassword(auth,payload.email.trim(),payload.password);
    const profile={
      id:created.user.uid,
      first_name:String(payload.first_name||'').trim(),
      last_name:String(payload.last_name||'').trim(),
      middle_name:String(payload.middle_name||'').trim(),
      full_name:fullName(payload),
      email:created.user.email,
      phone:String(payload.phone||'').trim(),
      role:payload.role,status:'pending',
      school_id:payload.role==='teacher'?Number(payload.school_id):null,
      subject_ids:payload.role==='teacher'?payload.subject_ids:[],
      consented_at:new Date().toISOString(),
      created_at:new Date().toISOString()
    };
    try {
      await setDoc(userRef(created.user.uid),profile);
    }catch(err){
      // Avoid leaving an orphan Firebase Auth login when Firestore rules or database setup fails.
      try { await deleteUser(created.user); } catch (cleanupError) {
        console.error('Could not clean up incomplete Firebase registration', cleanupError.code);
      }
      await signOut(auth);
      throw err;
    }
    try {await sendEmailVerification(created.user);}catch(e){console.warn('Email verification could not be sent',e.code);}
    return publicUser(profile);
  },
  async login({email,password}){
    await signInWithEmailAndPassword(auth,email.trim(),password);
    const p=await ownProfile();
    if(!p){await signOut(auth);throw new Error('profile_missing')}
    return p;
  },
  async logout(){await signOut(auth);return {ok:true}},
  async resendVerification(){
    const u=requireUser();
    if(!u.emailVerified)await sendEmailVerification(u);
    return {ok:true};
  },
  async dashboard(){
    const p=await requireRole('teacher','parent','admin');
    if(p.role==='parent'){
      const children=await fetchChildrenBy('parent_id',p.id);
      return {role:'parent',total_children:children.length,pending_children:children.filter(c=>c.status==='pending').length};
    }
    if(p.role==='teacher'){
      if(p.status!=='approved')return {role:'teacher',approved:false,total_students:0,school_name:p.school_name};
      const children=await fetchChildrenBy('school_id',p.school_id,'approved');
      return {role:'teacher',approved:true,total_students:children.filter(c=>c.status==='approved').length,school_name:p.school_name};
    }
    await mustAdmin();
    const [people,children]=await Promise.all([getDocs(collection(store,'users')),getDocs(studentCol())]);
    return {role:'admin',total_users:people.size,total_students:children.size,pending_teachers:people.docs.filter(x=>x.data().role==='teacher'&&x.data().status==='pending').length,pending_children:children.docs.filter(x=>x.data().status==='pending').length};
  },
  async children(){
    const p=await requireRole('parent');
    return (await fetchChildrenBy('parent_id',p.id)).map(s=>({...s,school_name:schoolById(s.school_id)?.name_kk||''}));
  },
  async addChild(payload){
    const p=await requireRole('parent');
    await requireUser().reload();
    await requireUser().getIdToken(true);
    if(!auth.currentUser?.emailVerified)throw new Error('verify_email_first');
    const child={...sanitizeChild(payload),parent_id:p.id,status:'pending',created_at:new Date().toISOString()};
    const ref=await addDoc(studentCol(),child);
    return {id:ref.id,...child};
  },
  async patchChild(id,payload){
    const p=await requireRole('parent');
    const ref=childRef(id),snap=await getDoc(ref);
    if(!snap.exists()||snap.data().parent_id!==p.id)throw new Error('child_not_found');
    const merged={...snap.data(),...payload};
    const fields=sanitizeChild(merged);
    await updateDoc(ref,{...fields,status:'pending'});
    return {id,...fields,status:'pending'};
  },
  async students(q=''){
    const p=await requireRole('teacher','admin');
    let values;
    if(p.role==='admin'){
      await mustAdmin();
      values=(await getDocs(studentCol())).docs.map(normalizeStudent);
    }else{
      if(p.status!=='approved')throw new Error('teacher_awaits_approval');
      values=await fetchChildrenBy('school_id',p.school_id,'approved');
      values=values.filter(s=>s.status==='approved');
    }
    const searched=String(q||'').trim().toLocaleLowerCase();
    return values.filter(s=>!searched||s.full_name.toLocaleLowerCase().includes(searched)).map(s=>({...s,school_name:schoolById(s.school_id)?.name_kk||''}));
  },
  async users(){
    await mustAdmin();
    return (await getDocs(collection(store,'users'))).docs.map(s=>publicUser({...s.data(),id:s.id}));
  },
  async editUser(id,payload){
    await mustAdmin();
    if(payload.role==='admin')throw new Error('admin_claim_requires_trusted_script');
    const updates={};
    for(const k of ['first_name','last_name','middle_name','full_name','phone','role','status','school_id','subject_ids']){
      if(Object.prototype.hasOwnProperty.call(payload,k))updates[k]=payload[k];
    }
    if(payload.first_name&&payload.last_name)updates.full_name=fullName(payload);
    if(Object.keys(updates).length)await updateDoc(userRef(id),updates);
    return {id,...updates};
  },
  async deleteUser(id){
    // Removing a profile alone would leave a Firebase Auth account active.
    // Use a trusted Admin SDK operation to delete BOTH atomically in the admin workflow.
    throw new Error('admin_sdk_required_to_delete_account');
  },
  async editStudent(id,payload){
    await mustAdmin();
    const changes={...sanitizeChild(payload)};
    if(['pending','approved','rejected'].includes(payload.status))changes.status=payload.status;
    await updateDoc(childRef(id),changes);
    return {id,...changes};
  },
  async deleteStudent(id){
    await mustAdmin();
    await deleteDoc(childRef(id));
    return {ok:true};
  },
  async addSchool(payload){
    await mustAdmin();
    const record={name:String(payload.name),name_kk:String(payload.name),city:String(payload.city||''),active:true};
    const result=await addDoc(collection(store,'schools'),record);
    return {id:result.id,...record};
  },
  async editSchool(id,payload){
    await mustAdmin();
    await updateDoc(schoolRef(id),{name:String(payload.name),name_kk:String(payload.name),city:String(payload.city||'')});
    return {id,...payload};
  },
  async deleteSchool(id){
    await mustAdmin();
    await updateDoc(schoolRef(id),{active:false});
    return {ok:true};
  },
  async addSubject(payload){
    await mustAdmin();
    const row={kk:payload.name_kk,ru:payload.name_ru,en:payload.name_en};
    const d=await addDoc(collection(store,'subjects'),row);
    return {id:d.id,...row};
  },
  async editSubject(id,payload){
    await mustAdmin();
    const changes={kk:payload.name_kk,ru:payload.name_ru,en:payload.name_en};
    await updateDoc(doc(store,'subjects',String(id)),changes);
    return {id,...changes};
  },
  async deleteSubject(id){
    await mustAdmin();
    await deleteDoc(doc(store,'subjects',String(id)));
    return {ok:true};
  },
  async photo(){throw new Error('private_storage_not_ready')}
};
