import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,where,updateDoc,writeBatch} from 'firebase/firestore';

// No production Firebase account is used. The emulator is started by CI.
const classId='AbCdEf1234567890GhIJ';
const quizId='Qz1234567890AbCdEfGh';
const ts=Date.now();

test('Firestore rules: students join only after a teacher approves, class quizzes remain private',async t=>{
 const env=await initializeTestEnvironment({
  projectId:'demo-codequest-tests',
  firestore:{rules:readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8')}
 });
 try{
  await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore();
   await Promise.all([
    setDoc(doc(db,'users','teacher1'),{id:'teacher1',role:'teacher',status:'approved',school_id:2,full_name:'Teacher Test'}),
    setDoc(doc(db,'users','teacher2'),{id:'teacher2',role:'teacher',status:'approved',school_id:3,full_name:'Other Teacher'}),
    setDoc(doc(db,'users','student1'),{id:'student1',role:'student',status:'pending',school_id:null,full_name:'Student One',guardian_permission_acknowledged:true}),
    setDoc(doc(db,'users','student2'),{id:'student2',role:'student',status:'pending',school_id:null,full_name:'Student Two',guardian_permission_acknowledged:true}),
    setDoc(doc(db,'users','parent1'),{id:'parent1',role:'parent',status:'approved',school_id:null,full_name:'Parent One'})
   ]);
  });
  const teacher=env.authenticatedContext('teacher1',{email:'teacher1@example.com',email_verified:true}).firestore();
  const other=env.authenticatedContext('teacher2',{email:'teacher2@example.com',email_verified:true}).firestore();
  const student=env.authenticatedContext('student1',{email:'student1@example.com',email_verified:true}).firestore();
  const student2=env.authenticatedContext('student2',{email:'student2@example.com',email_verified:true}).firestore();
  const parent=env.authenticatedContext('parent1',{email:'parent1@example.com',email_verified:true}).firestore();
  const guest=env.unauthenticatedContext().firestore();
  const classroom={owner_uid:'teacher1',school_id:2,name:'6-А',grade:6,letter:'А',created_at:ts};
  await t.test('Only the approved teacher can create their own class',async()=>{
   await assertSucceeds(setDoc(doc(teacher,'classrooms',classId),classroom));
   await assertFails(setDoc(doc(other,'classrooms','AbCdEf1234567890GhIK'),{...classroom,owner_uid:'teacher1'}));
   await assertSucceeds(getDoc(doc(student,'classrooms',classId)));
   await assertFails(getDoc(doc(other,'classrooms',classId)));
  });
  const member={class_id:classId,owner_uid:'teacher1',student_uid:'student1',student_name:'Student One',class_name:'6-А',status:'pending',created_at:ts};
  const memberRef='class_memberships/'+classId+'_student1';
  await t.test('Student cannot approve themself; teacher approves requested membership',async()=>{
   await assertFails(setDoc(doc(student,memberRef),{...member,status:'approved'}));
   await assertFails(setDoc(doc(student,memberRef),{...member,student_uid:'student2'}));
   await assertSucceeds(setDoc(doc(student,memberRef),member));
   await assertSucceeds(getDoc(doc(teacher,memberRef)));
   await assertFails(updateDoc(doc(other,memberRef),{status:'approved'}));
   await assertFails(updateDoc(doc(student,memberRef),{status:'approved'}));
   await assertSucceeds(updateDoc(doc(teacher,memberRef),{status:'approved'}));
   await assertSucceeds(getDocs(query(collection(student,'class_memberships'),where('student_uid','==','student1'))));
   await assertSucceeds(getDocs(query(collection(teacher,'class_memberships'),where('owner_uid','==','teacher1'))));
   await assertFails(getDocs(collection(student,'class_memberships')));
  });
  const publicQ={owner_uid:'teacher1',school_id:2,title:'School quiz',questions:[{prompt:'Test question?',options:['one','two','three','four']}],created_at:ts,class_id:classId,status:'draft'};
  const key={owner_uid:'teacher1',answers:[1],created_at:ts};
  await t.test('Private answer key and draft cannot be read by students',async()=>{
   const b=writeBatch(teacher);
   b.set(doc(teacher,'quizzes',quizId),publicQ);
   b.set(doc(teacher,'quiz_answer_keys',quizId),key);
   await assertSucceeds(b.commit());
   await assertFails(getDoc(doc(student,'quizzes',quizId)));
   await assertFails(getDoc(doc(student2,'quizzes',quizId)));
   await assertFails(getDoc(doc(parent,'quiz_answer_keys',quizId)));
   await assertSucceeds(getDoc(doc(teacher,'quiz_answer_keys',quizId)));
  });
  await t.test('Teacher starts quiz and active invitation becomes available to enrolled student',async()=>{
   const b=writeBatch(teacher);
   b.update(doc(teacher,'quizzes',quizId),{status:'open',started_at:ts+1});
   b.set(doc(teacher,'classrooms',classId,'active_quiz','current'),{owner_uid:'teacher1',class_id:classId,quiz_id:quizId,title:'School quiz',status:'open',started_at:ts+1});
   await assertSucceeds(b.commit());
   await assertSucceeds(getDoc(doc(student,'quizzes',quizId)));
   await assertSucceeds(getDoc(doc(student,'classrooms',classId,'active_quiz','current')));
   await assertFails(getDoc(doc(student2,'quizzes',quizId)));
   await assertFails(getDoc(doc(student2,'classrooms',classId,'active_quiz','current')));
   await assertFails(getDoc(doc(parent,'classrooms',classId,'active_quiz','current')));
   await assertFails(getDoc(doc(guest,'quizzes',quizId)));
  });
  await t.test('Only members can answer, at most once per question',async()=>{
   const response={participant_uid:'student1',question_index:0,option_index:1,alias:'Student One',created_at:ts+2};
   const respRef='quizzes/'+quizId+'/responses/student1_0';
   await assertSucceeds(setDoc(doc(student,respRef),response));
   await assertFails(setDoc(doc(student,respRef),response));
   await assertFails(setDoc(doc(student2,'quizzes',quizId,'responses','student2_0'),{...response,participant_uid:'student2'}));
   await assertFails(setDoc(doc(parent,'quizzes',quizId,'responses','parent1_0'),{...response,participant_uid:'parent1'}));
   await assertSucceeds(getDoc(doc(teacher,respRef)));
  });
  await t.test('Close stops quiz submissions and notifications',async()=>{
   const b=writeBatch(teacher);
   b.update(doc(teacher,'quizzes',quizId),{status:'closed',closed_at:ts+3});
   b.update(doc(teacher,'classrooms',classId,'active_quiz','current'),{status:'closed'});
   await assertSucceeds(b.commit());
   await assertFails(setDoc(doc(student,'quizzes',quizId,'responses','student1_1'),{participant_uid:'student1',question_index:1,option_index:1,alias:'Student One',created_at:ts+4}));
  });
  await t.test('Anonymous legacy free QR quiz still requires authentication but not classroom membership',async()=>{
   const legacyId='LegacyQuizId01234567';
   await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),'quizzes',legacyId),{...publicQ,status:'open',class_id:null});
   });
   // Old public quizzes do not include the class_id field.
   await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),'quizzes',legacyId),{owner_uid:'teacher1',school_id:2,title:'Public demo',questions:publicQ.questions,status:'open',created_at:ts});
   });
   await assertSucceeds(getDoc(doc(student2,'quizzes',legacyId)));
   await assertFails(getDoc(doc(guest,'quizzes',legacyId)));
  });
 }finally{await env.cleanup()}
});
