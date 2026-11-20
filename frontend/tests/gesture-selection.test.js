import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGestureSelection,advanceGestureSelection,GESTURE_RELEASE_MS,GESTURE_OK_HOLD_MS,GESTURE_FINGER_STABLE_MS} from '../src/gesture-selection.js';

const step=(state,kind,time,count)=>advanceGestureSelection(state,{kind,count},time);
const hold=(state,count,at)=>{
 const a=step(state,'fingers',at,count);
 return step(a.state,'fingers',at+GESTURE_FINGER_STABLE_MS,count).state;
};

test('finger numbers change preview only after a deliberate stable hold',()=>{
 let s=freshGestureSelection();
 let r=step(s,'fingers',0,1);
 assert.equal(r.state.preview,-1);
 r=step(r.state,'fingers',GESTURE_FINGER_STABLE_MS-1,1);
 assert.equal(r.state.preview,-1);
 s=step(r.state,'fingers',GESTURE_FINGER_STABLE_MS,1).state;
 assert.equal(s.preview,0);
 s=step(s,'fingers',GESTURE_FINGER_STABLE_MS+100,3).state;
 assert.equal(s.preview,0);
 s=step(s,'fingers',GESTURE_FINGER_STABLE_MS*2+100,3).state;
 assert.equal(s.preview,2);
 s=hold(s,4,2000);
 assert.equal(s.preview,3);
});

test('moving from three fingers into OK does not overwrite chosen answer',()=>{
 let s=hold(freshGestureSelection(),3,0);
 assert.equal(s.preview,2);
 // During the transition to OK the finger detector briefly sees 1, 2 and 4.
 s=step(s,'fingers',550,1).state;
 s=step(s,'fingers',640,2).state;
 s=step(s,'fingers',730,4).state;
 assert.equal(s.preview,2);
 s=step(s,'ok',800).state;
 let r=step(s,'ok',800+GESTURE_OK_HOLD_MS);
 assert.deepEqual(r.event,{type:'confirm_and_next',index:2});
 assert.equal(r.state.confirmed,2);
});

test('the student can still change an answer by holding a new count',()=>{
 let s=hold(freshGestureSelection(),2,0);
 s=hold(s,4,1000);
 assert.equal(s.preview,3);
 let r=step(s,'ok',1700);
 r=step(r.state,'ok',1700+GESTURE_OK_HOLD_MS);
 assert.equal(r.event.index,3);
});

test('hand disappearance confirms the last stable preview after debounce',()=>{
 let s=hold(freshGestureSelection(),2,0);
 s=hold(s,3,1000);
 let r=step(s,'none',1500);
 assert.equal(r.state.preview,2);
 assert.equal(r.event,null);
 r=step(r.state,'none',1500+GESTURE_RELEASE_MS-1);
 assert.equal(r.event,null);
 r=step(r.state,'none',1500+GESTURE_RELEASE_MS);
 assert.deepEqual(r.event,{type:'confirm',index:2});
 assert.equal(r.state.confirmed,2);
 assert.equal(step(r.state,'none',3000).event,null);
});

test('a brief camera miss cancels confirmation when the hand returns',()=>{
 let s=hold(freshGestureSelection(),1,0);
 s=step(s,'none',700).state;
 s=step(s,'fingers',700+GESTURE_RELEASE_MS-50,4).state;
 assert.equal(s.preview,0);
 assert.equal(s.missingSince,null);
 assert.equal(step(s,'none',2000).event,null);
});

test('a fist still allows release confirmation after a preview',()=>{
 let s=hold(freshGestureSelection(),4,0);
 s=step(s,'none',600).state;
 const r=step(s,'none',600+GESTURE_RELEASE_MS);
 assert.equal(r.event?.index,3);
});

test('OK confirms and requests next only after its hold time',()=>{
 let s=hold(freshGestureSelection(),2,0);
 s=step(s,'ok',700).state;
 let r=step(s,'ok',700+GESTURE_OK_HOLD_MS-1);
 assert.equal(r.event,null);
 r=step(r.state,'ok',700+GESTURE_OK_HOLD_MS);
 assert.deepEqual(r.event,{type:'confirm_and_next',index:1});
 assert.equal(step(r.state,'ok',3000).event,null);
});

test('after confirmed answer, OK advances without changing score',()=>{
 let s=hold(freshGestureSelection(),2,0);
 s=step(s,'none',700).state;
 s=step(s,'none',700+GESTURE_RELEASE_MS).state;
 assert.equal(s.confirmed,1);
 s=step(s,'fingers',1800,4).state;
 assert.equal(s.confirmed,1);
 s=step(s,'ok',3000).state;
 const r=step(s,'ok',3000+GESTURE_OK_HOLD_MS);
 assert.deepEqual(r.event,{type:'next'});
 assert.equal(r.state.confirmed,1);
});

test('held OK after advancing cannot immediately skip another question',()=>{
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

test('without an answer, an OK gesture cannot skip the question',()=>{
 let s=step(freshGestureSelection(),'ok',0).state;
 const r=step(s,'ok',GESTURE_OK_HOLD_MS+1000);
 assert.equal(r.event,null);
 assert.equal(r.state.confirmed,-1);
});
