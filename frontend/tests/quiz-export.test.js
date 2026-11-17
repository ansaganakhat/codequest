import test from 'node:test';
import assert from 'node:assert/strict';
import {quizExportPayload,quizExportCSV} from '../src/quiz-export.js';
const q={title:'Test',join_code:'1234567',questions:[{prompt:'Sample?',options:['=SUM(1,1)','B','C','D']}]};
test('teacher exports quiz with correct answer key',()=>{
 const data=quizExportPayload(q,[2]);
 assert.equal(data.code,'1234567');assert.equal(data.questions[0].correct_option,3);
 const csv=quizExportCSV(q,[2]);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.ok(csv.includes("'=SUM(1,1)"));
 assert.ok(csv.includes('"C"'));
});
test('never export answers from an incomplete key',()=>{
 assert.throws(()=>quizExportCSV(q,[]),{message:'quiz_export_incomplete'});
});
