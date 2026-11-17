import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChildCredentials,normalizeChildDetails,childNameParts} from '../src/child-account.js';

test('guardian creates durable child login with a real reachable email',()=>{
 const output=validateChildCredentials({
  email:' Student.Test+1@Gmail.com ',password:'LongPrivatePass123!',
  password_confirm:'LongPrivatePass123!',guardian_consent:true
 });
 assert.equal(output.email,'student.test+1@gmail.com');
 assert.equal(output.password,'LongPrivatePass123!');
});
test('no fabricated address, weak password, mismatch or guardian consent bypass',()=>{
 const base={email:'child@example.com',password:'LongPrivatePass123!',password_confirm:'LongPrivatePass123!',guardian_consent:true};
 for(const patch of [{email:'child'}, {email:'invalid@'}, {email:'child@school'}, {email:'child +foo@example.com'}, {password:'123',password_confirm:'123'}, {password_confirm:'different'}, {guardian_consent:false}]){
  assert.throws(()=>validateChildCredentials({...base,...patch}));
 }
});
test('child class details validated and normalized',()=>{
 const v=normalizeChildDetails({full_name:'  Тегі    Аты  ',grade:'7',school_id:'2',class_letter:' А '});
 assert.deepEqual(v,{full_name:'Тегі Аты',grade:7,school_id:2,class_letter:'А'});
 assert.deepEqual(childNameParts(v.full_name),{last_name:'Тегі',first_name:'Аты',middle_name:''});
 assert.throws(()=>normalizeChildDetails({...v,grade:13}));
 assert.throws(()=>normalizeChildDetails({...v,school_id:0}));
});
