import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeQuizRoomId} from '../src/quiz-room.js';

const roomId='icmihNLs6VQVmZBPI20i';
test('accepts a raw CodeQuest room code',()=>{
  assert.equal(normalizeQuizRoomId(roomId),roomId);
});
test('accepts a full HTTPS room link copied from QR',()=>{
  assert.equal(normalizeQuizRoomId('https://codequest-ai-ansagan.netlify.app/?join='+roomId),roomId);
});
test('accepts query strings, tracking parameters and whitespace',()=>{
  assert.equal(normalizeQuizRoomId('  https://codequest-ai-ansagan.netlify.app/?utm_source=chatgpt.com&join='+roomId+'&lang=kk  '),roomId);
  assert.equal(normalizeQuizRoomId('?join='+roomId),roomId);
  assert.equal(normalizeQuizRoomId('/?join='+roomId),roomId);
  assert.equal(normalizeQuizRoomId('join='+roomId),roomId);
  assert.equal(normalizeQuizRoomId('codequest-ai-ansagan.netlify.app/?join='+roomId),roomId);
});
test('rejects invalid room IDs before a Firestore document lookup',()=>{
  for(const value of ['', 'https://codequest-ai-ansagan.netlify.app/', 'https://codequest-ai-ansagan.netlify.app/?join=short','quizzes/a/b','not-a-code']){
    assert.throws(()=>normalizeQuizRoomId(value),{message:'quiz_room_invalid'});
  }
});
test('rejects links to other websites',()=>{
  assert.throws(()=>normalizeQuizRoomId('https://fake.example/?join='+roomId),{message:'quiz_room_foreign_link'});
  assert.throws(()=>normalizeQuizRoomId('https://codequest-ai-ansagan.netlify.app.evil.example/?join='+roomId),{message:'quiz_room_foreign_link'});
});
