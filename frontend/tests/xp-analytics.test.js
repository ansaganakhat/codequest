import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeXpActivity,heatmapDays,getKnowledgeMilestones} from '../src/xp-analytics.js';

test('XP chart aggregation uses real persisted events, not mock skill percentages',()=>{
 const events=[
  {source:'daily',date:'2026-11-18',points:20},
  {source:'gesture',date:'2026-11-18',points:30},
  {source:'quiz',date:'2026-11-20',points:100},
  {source:'gesture',date:'invalid',points:30},
  {source:'daily',date:'2026-11-19',points:-20}
 ];
 const data=summarizeXpActivity(events);
 assert.equal(data.total,150);
 assert.equal(data.activeDays,2);
 assert.deepEqual(data.sourceCounts,{daily:1,gesture:1,quiz:1});
 assert.deepEqual(heatmapDays(events,'2026-11-20',3),[
  {date:'2026-11-18',xp:50},{date:'2026-11-19',xp:0},{date:'2026-11-20',xp:100}
 ]);
});
test('tree unlocks only recorded activities and zero data remains blank',()=>{
 assert.deepEqual(getKnowledgeMilestones([]).map(x=>x.unlocked),[false,false,false]);
 assert.deepEqual(getKnowledgeMilestones([{source:'gesture',date:'2026-11-20',points:30}]).map(x=>x.unlocked),[false,true,false]);
 assert.equal(heatmapDays([],'2026-11-20',7).length,7);
});
