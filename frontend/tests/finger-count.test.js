import test from 'node:test';
import assert from 'node:assert/strict';
import {countRaisedFingers,isOkGesture} from '../src/finger-count.js';
const make=(n)=>{
 const pts=Array.from({length:21},()=>({x:.5,y:.7}));
 pts[0]={x:.5,y:1};
 for(const [j,ids] of [[0,[5,6,8]],[1,[9,10,12]],[2,[13,14,16]],[3,[17,18,20]]]){
   const x=.25+j*.16;
   pts[ids[0]]={x,y:.75};
   pts[ids[1]]={x,y:.55};
   pts[ids[2]]={x,y:j<n?.2:.88};
 }
 return pts;
};
test('counts 0 through 4 stable fingers, thumb ignored',()=>{
 for(let n=0;n<=4;n++)assert.equal(countRaisedFingers(make(n)),n);
 assert.equal(countRaisedFingers([]),0);
});

test('detects deliberate OK pinch with middle, ring and pinky extended',()=>{
 const points=make(4);
 points[8]={x:.25,y:.78}; // index is bent
 points[4]={x:.27,y:.77}; // thumb touches index
 assert.equal(countRaisedFingers(points),3);
 assert.equal(isOkGesture(points),true);
 assert.equal(isOkGesture(make(4)),false);
 assert.equal(isOkGesture(make(0)),false);
 const withoutPinky=points.map(p=>({...p}));
 withoutPinky[20]={x:.73,y:.88};
 assert.equal(isOkGesture(withoutPinky),false);
 assert.equal(isOkGesture(null),false);
});
