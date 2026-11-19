import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,where,updateDoc,writeBatch,deleteDoc} from 'firebase/firestore';

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
  await t.test('Existing parent/teacher signup remains valid; student signup needs guardian acknowledgement',async()=>{
   const parentSignup=env.authenticatedContext('newparent',{email:'newparent@example.com',email_verified:true}).firestore();
   const teacherSignup=env.authenticatedContext('newteacher',{email:'newteacher@example.com',email_verified:true}).firestore();
   const learnerSignup=env.authenticatedContext('newlearner',{email:'newlearner@example.com',email_verified:true}).firestore();
   const base={
     last_name:'Sample',first_name:'Test',middle_name:'',full_name:'Sample Test',
     phone:'',status:'pending',school_id:null,subject_ids:[],
     consented_at:new Date().toISOString(),created_at:new Date().toISOString()
   };
   const parentProfile={...base,id:'newparent',email:'newparent@example.com',role:'parent'};
   const teacherProfile={...base,id:'newteacher',email:'newteacher@example.com',role:'teacher',school_id:2,subject_ids:[1]};
   const learnerProfile={...base,id:'newlearner',email:'newlearner@example.com',role:'student'};
   await assertSucceeds(setDoc(doc(parentSignup,'users','newparent'),parentProfile));
   await assertSucceeds(setDoc(doc(teacherSignup,'users','newteacher'),teacherProfile));
   await assertFails(setDoc(doc(learnerSignup,'users','newlearner'),learnerProfile));
   await assertFails(setDoc(doc(learnerSignup,'users','newlearner'),{...learnerProfile,guardian_permission_acknowledged:false}));
   // Standalone student registration is now disabled even when a consent
   // checkbox is checked. The verified parent must issue a one-time ticket.
   await assertFails(setDoc(doc(learnerSignup,'users','newlearner'),{...learnerProfile,guardian_permission_acknowledged:true}));
   await assertSucceeds(setDoc(doc(parentSignup,'child_provisioning','newlearner'),{
     parent_id:'newparent',email:'newlearner@example.com',created_at:Date.now()
   }));
   await assertFails(setDoc(doc(learnerSignup,'users','newlearner'),{
     ...learnerProfile,guardian_permission_acknowledged:true,guardian_parent_id:'parent1'
   }));
   await assertSucceeds(setDoc(doc(learnerSignup,'users','newlearner'),{
     ...learnerProfile,guardian_permission_acknowledged:true,guardian_parent_id:'newparent'
   }));
   const child={full_name:'Sample Child',grade:5,class_letter:'А',school_id:2,parent_id:'newparent',status:'pending',created_at:new Date().toISOString()};
   await assertSucceeds(setDoc(doc(parentSignup,'students','child-for-parent'),child));
   await assertFails(setDoc(doc(learnerSignup,'students','child-for-learner'),{...child,parent_id:'newlearner'}));
  });
  const linkedUid='linkedKid0123456789AbCdEfGH';
  await t.test('Parent-provisioned student account is linked to its guardian; no outsider can claim it',async()=>{
   const childEmail='linked-child@example.com';
   const kid=env.authenticatedContext(linkedUid,{email:childEmail,email_verified:false}).firestore();
   const otherParent=env.authenticatedContext('parent2',{email:'parent2@example.com',email_verified:true}).firestore();
   await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),'users','parent2'),{id:'parent2',role:'parent',status:'approved',school_id:null,full_name:'Parent Two'});
   });
   const invitation={parent_id:'parent1',email:childEmail,created_at:Date.now()};
   await assertFails(setDoc(doc(student,'child_provisioning',linkedUid),invitation));
   await assertFails(setDoc(doc(otherParent,'child_provisioning',linkedUid),invitation));
   await assertSucceeds(setDoc(doc(parent,'child_provisioning',linkedUid),invitation));
   await assertFails(setDoc(doc(kid,'users',linkedUid),{
    id:linkedUid,role:'student',status:'pending',school_id:null,subject_ids:[],phone:'',
    first_name:'Kid',last_name:'Test',middle_name:'',full_name:'Test Kid',
    email:childEmail,guardian_parent_id:'parent2',
    guardian_permission_acknowledged:true,consented_at:new Date().toISOString(),created_at:new Date().toISOString()
   }));
   const profile={
    id:linkedUid,role:'student',status:'pending',school_id:null,subject_ids:[],phone:'',
    first_name:'Kid',last_name:'Test',middle_name:'',full_name:'Test Kid',
    email:childEmail,guardian_parent_id:'parent1',
    guardian_permission_acknowledged:true,consented_at:new Date().toISOString(),created_at:new Date().toISOString()
   };
   await assertSucceeds(setDoc(doc(kid,'users',linkedUid),profile));
   await assertSucceeds(getDoc(doc(parent,'users',linkedUid)));
   await assertFails(getDoc(doc(otherParent,'users',linkedUid)));
   const linkedDoc={full_name:'Test Kid',grade:5,class_letter:'А',
     school_id:2,parent_id:'parent1',auth_uid:linkedUid,status:'pending',created_at:new Date().toISOString()};
   await assertFails(setDoc(doc(otherParent,'students','linked-child-new'),{...linkedDoc,parent_id:'parent2'}));
   await assertSucceeds(setDoc(doc(parent,'students','linked-child-new'),linkedDoc));
   await assertFails(updateDoc(doc(parent,'students','linked-child-new'),{auth_uid:'otherUidSomeFake123456789'}));
   await assertFails(updateDoc(doc(kid,'users',linkedUid),{guardian_parent_id:'parent2'}));
   const oldRecord={full_name:'Old Kid',grade:6,class_letter:'B',
     school_id:2,parent_id:'parent1',status:'approved',created_at:new Date().toISOString()};
   await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),'students','old-child-record'),oldRecord);
   });
   await assertSucceeds(updateDoc(doc(parent,'students','old-child-record'),{auth_uid:linkedUid}));
   await assertFails(updateDoc(doc(parent,'students','old-child-record'),{auth_uid:'otherUidSomeFake123456789'}));
   await assertFails(updateDoc(doc(otherParent,'students','old-child-record'),{auth_uid:linkedUid}));
   await assertSucceeds(setDoc(doc(parent,'child_provisioning','unusedInvitation11111111111'),{
     parent_id:'parent1',email:'unused@example.com',created_at:Date.now()
   }));
   await assertFails(getDoc(doc(otherParent,'child_provisioning','unusedInvitation11111111111')));
   await assertFails(setDoc(doc(kid,'child_provisioning','another'),invitation));
   await assertSucceeds(deleteDoc(doc(parent,'child_provisioning',linkedUid)));
   await assertFails(deleteDoc(doc(kid,'users',linkedUid)));
  });
  await t.test('Approved school teacher sees pending and approved children only at their school',async()=>{
   // No prod access; these are emulator-only fake students.
   const child=(full_name,school_id,status)=>({
    full_name,school_id,status,grade:6,class_letter:'A',
    parent_id:'parent1',created_at:new Date().toISOString()
   });
   await env.withSecurityRulesDisabled(async ctx=>{
    const db=ctx.firestore();
    await Promise.all([
     setDoc(doc(db,'students','teacher-school-pending'),child('Local Pending',2,'pending')),
     setDoc(doc(db,'students','teacher-school-approved'),child('Local Approved',2,'approved')),
     setDoc(doc(db,'students','other-school-pending'),child('Other School',3,'pending')),
     setDoc(doc(db,'users','unapproved-teacher'),{
       id:'unapproved-teacher',role:'teacher',school_id:2,status:'pending',full_name:'Teacher Not Approved'
     })
    ]);
   });
   const allSameSchool=await assertSucceeds(getDocs(query(collection(teacher,'students'),where('school_id','==',2))));
   const rows=allSameSchool.docs.map(d=>({id:d.id,...d.data()}));
   assert.ok(rows.some(c=>c.id==='teacher-school-pending'&&c.status==='pending'));
   assert.ok(rows.some(c=>c.id==='teacher-school-approved'&&c.status==='approved'));
   assert.ok(rows.every(c=>c.school_id===2));
   await assertFails(getDocs(query(collection(teacher,'students'),where('school_id','==',3))));
   await assertFails(getDoc(doc(teacher,'students','other-school-pending')));
   await assertFails(getDocs(query(collection(other,'students'),where('school_id','==',2))));
   await assertFails(getDocs(query(collection(parent,'students'),where('school_id','==',2))));
   await assertFails(getDocs(query(collection(guest,'students'),where('school_id','==',2))));
   const unverified=env.authenticatedContext('teacher1',{email:'teacher1@example.com',email_verified:false}).firestore();
   await assertFails(getDocs(query(collection(unverified,'students'),where('school_id','==',2))));
   const unapproved=env.authenticatedContext('unapproved-teacher',{email:'unapproved@example.com',email_verified:true}).firestore();
   await assertFails(getDocs(query(collection(unapproved,'students'),where('school_id','==',2))));
  });
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
  await t.test('XP events belong to the student and teacher sees only their own class ranking',async()=>{
   const event={student_uid:'student1',event_id:'daily_2026-11-19',source:'daily',points:20,date:'2026-11-19',created_at:ts};
   await assertSucceeds(setDoc(doc(student,'xp_events','student1','items',event.event_id),event));
   await assertSucceeds(getDocs(collection(student,'xp_events','student1','items')));
   await assertFails(getDocs(collection(student2,'xp_events','student1','items')));
   await assertFails(setDoc(doc(student2,'xp_events','student1','items','daily_2026-11-20'),{...event,event_id:'daily_2026-11-20',date:'2026-11-20'}));
   await assertFails(setDoc(doc(student,'xp_events','student1','items','daily_2026-11-20'),{...event,event_id:'daily_2026-11-20',date:'2026-11-20',points:999}));
   await assertFails(updateDoc(doc(student,'xp_events','student1','items',event.event_id),{points:999}));
   await assertFails(setDoc(doc(student,'xp_events','student1','items',event.event_id),event));
   const classEvent={...event,class_id:classId,student_name:'Student One'};
   const eventDoc=doc(student,'classrooms',classId,'xp_events','student1_'+event.event_id);
   await assertSucceeds(setDoc(eventDoc,classEvent));
   await assertSucceeds(getDocs(collection(teacher,'classrooms',classId,'xp_events')));
   await assertFails(getDocs(collection(other,'classrooms',classId,'xp_events')));
   await assertFails(getDocs(collection(student,'classrooms',classId,'xp_events')));
   await assertFails(setDoc(doc(student2,'classrooms',classId,'xp_events','student2_daily_2026-11-19'),{...classEvent,student_uid:'student2'}));
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
  await t.test('Numeric join code is unique, mapped to teacher quiz, and cannot be hijacked',async()=>{
    const quizNewId='NewCodeQuiz012345678';
    const number='7654321';
    const quiz={owner_uid:'teacher1',school_id:2,title:'Seven digits',questions:[{prompt:'Hello world?',options:['A','B','C','D']}],status:'open',created_at:ts,join_code:number};
    const batch=writeBatch(teacher);
    batch.set(doc(teacher,'quizzes',quizNewId),quiz);
    batch.set(doc(teacher,'quiz_answer_keys',quizNewId),{owner_uid:'teacher1',answers:[1],created_at:ts});
    batch.set(doc(teacher,'quiz_join_codes',number),{quiz_id:quizNewId,owner_uid:'teacher1',created_at:ts});
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(doc(student,'quiz_join_codes',number)));
    await assertFails(getDocs(collection(student,'quiz_join_codes')));
    await assertFails(updateDoc(doc(other,'quiz_join_codes',number),{quiz_id:'hijacked'}));
    await assertFails(setDoc(doc(other,'quiz_join_codes','9999999'),{quiz_id:quizNewId,owner_uid:'teacher2',created_at:ts}));
    await assertSucceeds(getDoc(doc(student,'quizzes',quizNewId)));
   });
  await t.test('Only account owner can set a compact avatar; students cannot upload cloud photos',async()=>{
    const avatar='data:image/jpeg;base64,'+'a'.repeat(400);
    await assertSucceeds(updateDoc(doc(teacher,'users','teacher1'),{avatar_data_url:avatar}));
    await assertFails(updateDoc(doc(student,'users','student1'),{avatar_data_url:avatar}));
    await assertFails(updateDoc(doc(teacher,'users','teacher1'),{status:'approved',school_id:3}));
    await assertFails(updateDoc(doc(teacher,'users','teacher1'),{avatar_data_url:'data:image/svg+xml;base64,AAA'}));
    await assertFails(updateDoc(doc(other,'users','teacher1'),{avatar_data_url:avatar}));
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
