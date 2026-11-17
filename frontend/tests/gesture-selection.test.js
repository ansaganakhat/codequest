import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGestureSelection,advanceGestureSelection,GESTURE_RELEASE_MS,GESTURE_OK_HOLD_MS} from '../src/gesture-selection.js';

const step=(state,kind,time,count)=>advanceGestureSelection(state,{kind,count},time);

test('finger count updates the highlighted preview indefinitely, without auto choosing',()=>{
 let state=freshGestureSelection();
 let result=step(state,'fingers',0,1);
 assert.equal(result.state.preview,0);assert.equal(result.state.confirmed,-1);assert.equal(result.event,null);
 state=result.state;
 result=step(state,'fingers',8000,3);
 assert.equal(result.state.preview,2);assert.equal(result.state.confirmed,-1);assert.equal(result.event,null);
 result=step(result.state,'fingers',36000,4);
 assert.equal(result.state.preview,3);assert.equal(result.state.confirmed,-1);assert.equal(result.event,null);
});

test('hand disappearance confirms the LAST preview only after debounce',()=>{
 let s=step(freshGestureSelection(),'fingers',0,2).state;
 s=step(s,'fingers',400,3).state;
 let r=step(s,'none',500);
 assert.equal(r.state.preview,2);assert.equal(r.event,null);
 r=step(r.state,'none',500+GESTURE_RELEASE_MS-1);
 assert.equal(r.event,null);
 r=step(r.state,'none',500+GESTURE_RELEASE_MS);
 assert.deepEqual(r.event,{type:'confirm',index:2});
 assert.equal(r.state.confirmed,2);
 assert.equal(step(r.state,'none',3000).event,null);
});

test('camera misses a hand briefly: moving it back cancels the confirmation timer',()=>{
 let s=step(freshGestureSelection(),'fingers',0,1).state;
 s=step(s,'none',100).state;
 s=step(s,'fingers',100+GESTURE_RELEASE_MS-50,4).state;
 assert.equal(s.preview,3);assert.equal(s.missingSince,null);
 assert.equal(step(s,'none',2000).event,null);
});

test('fist/no raised fingers also allows release confirmation',()=>{
 let s=step(freshGestureSelection(),'fingers',0,4).state;
 s=step(s,'none',200).state;
 const r=step(s,'none',200+GESTURE_RELEASE_MS);
 assert.equal(r.event?.index,3);
});

test('stable OK while still previewing confirms answer and requests next',()=>{
 let s=step(freshGestureSelection(),'fingers',0,2).state;
 s=step(s,'ok',100).state;
 let r=step(s,'ok',100+GESTURE_OK_HOLD_MS-1);
 assert.equal(r.event,null);
 r=step(r.state,'ok',100+GESTURE_OK_HOLD_MS);
 assert.deepEqual(r.event,{type:'confirm_and_next',index:1});
 assert.equal(step(r.state,'ok',3000).event,null);
});

test('after answer is confirmed, stable OK advances to next question without altering score',()=>{
 let s=step(freshGestureSelection(),'fingers',0,2).state;
 s=step(s,'none',100).state;
 s=step(s,'none',100+GESTURE_RELEASE_MS).state;
 assert.equal(s.confirmed,1);
 s=step(s,'ok',3000).state;
 const r=step(s,'ok',3000+GESTURE_OK_HOLD_MS);
 assert.deepEqual(r.event,{type:'next'});
 assert.equal(r.state.confirmed,1);
});

test('held OK after advancing cannot immediately pick or advance another question',()=>{
 let s=freshGestureSelection(true);
 let r=step(s,'ok',0);
 assert.equal(r.event,null);
 r=step(r.state,'ok',5000);
 assert.equal(r.event,null);
 s=step(r.state,'none',5100).state;
 assert.equal(s.blockOkUntilRelease,false);
 r=step(s,'ok',5200);
 assert.equal(r.event,null);
 assert.equal(r.state.preview,-1);
 r=step(r.state,'ok',5200+GESTURE_OK_HOLD_MS);
 assert.equal(r.event,null);
});

test('without an answer, an OK gesture cannot skip a question',()=>{
 let s=step(freshGestureSelection(),'ok',0).state;
 const r=step(s,'ok',GESTURE_OK_HOLD_MS+1000);
 assert.equal(r.event,null);
 assert.equal(r.state.confirmed,-1);
});
