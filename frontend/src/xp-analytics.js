// Pure XP analytics; no fabricated skill mastery or mock records.
export const XP_SOURCES=['daily','gesture','quiz'];
export function summarizeXpActivity(events=[]){
 const daily=new Map();
 const sourceCounts={daily:0,gesture:0,quiz:0};
 for(const event of events){
  if(!event||!/^\d{4}-\d{2}-\d{2}$/.test(String(event.date||'')))continue;
  const points=Number(event.points);
  if(!Number.isFinite(points)||points<0)continue;
  daily.set(event.date,(daily.get(event.date)||0)+points);
  if(Object.hasOwn(sourceCounts,event.source))sourceCounts[event.source]+=1;
 }
 return {daily,sourceCounts,activeDays:daily.size,total:[...daily.values()].reduce((a,b)=>a+b,0)};
}
export function heatmapDays(events=[],endDate,days=91){
 const {daily}=summarizeXpActivity(events);
 const end=new Date(endDate+'T12:00:00Z');
 if(Number.isNaN(end.getTime()))return [];
 return Array.from({length:days},(_,index)=>{
  const d=new Date(end.getTime()-(days-1-index)*86400000);
  const date=d.toISOString().slice(0,10);
  return {date,xp:daily.get(date)||0};
 });
}
export function getKnowledgeMilestones(events=[]){
 const {sourceCounts}=summarizeXpActivity(events);
 return [
  {id:'daily',count:sourceCounts.daily,unlocked:sourceCounts.daily>0},
  {id:'gesture',count:sourceCounts.gesture,unlocked:sourceCounts.gesture>0},
  {id:'quiz',count:sourceCounts.quiz,unlocked:sourceCounts.quiz>0}
 ];
}
