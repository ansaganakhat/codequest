import test from 'node:test';
import assert from 'node:assert/strict';
import {FACE_WHEEL_MODEL_URL,faceScanTiles} from '../src/face-wheel-model.js';

test('Face Wheel uses MediaPipe Tasks compatible short-range model (896 anchors)',()=>{
 assert.match(FACE_WHEEL_MODEL_URL,/\/blaze_face_short_range\/float16\/1\/blaze_face_short_range\.tflite$/);
 assert.doesNotMatch(FACE_WHEEL_MODEL_URL,/full_range/);
});
test('Face Wheel keeps full image and overlapping tiles for distant classroom faces',()=>{
 const width=1920,height=1080,tiles=faceScanTiles(width,height);
 assert.equal(tiles.length,6);
 assert.deepEqual(tiles[0],{x:0,y:0,w:width,h:height});
 for(const tile of tiles){
  assert.ok(tile.w>0&&tile.h>0);
  assert.ok(tile.x>=0&&tile.y>=0);
  assert.ok(tile.x+tile.w<=width+0.001);
  assert.ok(tile.y+tile.h<=height+0.001);
 }
});
test('Face Wheel rejects invalid camera dimensions',()=>{
 assert.deepEqual(faceScanTiles(0,720),[]);
 assert.deepEqual(faceScanTiles(NaN,720),[]);
 assert.deepEqual(faceScanTiles(1920,-1),[]);
});
