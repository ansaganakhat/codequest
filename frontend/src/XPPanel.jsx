import React,{useEffect,useMemo,useState} from 'react';
import {Award,Flame,Star,Trophy} from 'lucide-react';
import {watchXp,xpSummary} from './xp.js';
import {XPAchievementCharts} from './XPAchievementCharts.jsx';
import {summarizeXpActivity} from './xp-analytics.js';
import './xp.css';
const t={
 kk:{title:'Менің жетістіктерім',level:'деңгей',points:'Жиналған XP',next:'Келесі деңгейге',days:'Белсенді күн',awards:'Марапаттар',hint:'XP — ойындық ұпай, академиялық баға емес. Күнделікті челлендж және Gesture Game есептеледі.',loading:'XP жүктелуде...'},
 ru:{title:'Мои достижения',level:'уровень',points:'Всего XP',next:'До следующего уровня',days:'Активных дней',awards:'Награды',hint:'XP — игровые очки, не школьная оценка. Учитываются ежедневные задания и Gesture Game.',loading:'Загрузка XP...'},
 en:{title:'My achievements',level:'level',points:'Total XP',next:'To next level',days:'Active days',awards:'Awards',hint:'XP are game points, not grades. Daily challenges and Gesture Game count.',loading:'Loading XP...'}
};
export function XPPanel({user,lang='kk',compact=false}){
 const [events,setEvents]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{
  if(!user?.id){setEvents([]);setLoading(false);return;}
  setLoading(true);
  return watchXp(user.id,items=>{setEvents(items);setLoading(false);setError('')},e=>{setError(e?.message||String(e));setLoading(false)});
 },[user?.id]);
 const data=useMemo(()=>xpSummary(events),[events]);
 const streak=useMemo(()=>new Set(events.filter(e=>e.source==='daily').map(e=>e.date)).size,[events]);
 const badges=[data.xp>=100,data.xp>=500,data.xp>=1000].filter(Boolean).length;
 const activity=useMemo(()=>summarizeXpActivity(events),[events]);
 const l=t[lang]||t.kk;
 return <div className={compact?'xp-dashboard-compact':'xp-dashboard-full'}><section className={'cq-xp-panel'+(compact?' compact':'')} aria-label={l.title}>
  <div className="cq-xp-heading"><span className="cq-xp-medal"><Trophy size={25}/></span><div><h3>{l.title}</h3><span>{data.level} {l.level} · {l.points}: <b>{data.xp}</b></span></div></div>
  <div className="cq-xp-bar"><span style={{width:(data.progress/data.next*100)+'%'}}/></div>
  <div className="cq-xp-details"><span><Star size={16}/>{data.remaining} XP · {l.next}</span><span><Flame size={16}/>{streak} · {l.days}</span><span><Award size={16}/>{badges} · {l.awards}</span></div>
  {!compact&&<p className="cq-xp-note">{l.hint}</p>}
  {loading&&<small>{l.loading}</small>}
  {error&&<p className="learning-error" role="alert">{error}</p>}
 </section>
  {!compact&&<><div className="xp-dashboard-title">{lang==='ru'?'Аналитика обучения':lang==='en'?'Learning analytics':'Оқу прогресінің аналитикасы'}</div><XPAchievementCharts events={events} lang={lang}/><p className="xp-dashboard-empty">{activity.activeDays} {lang==='ru'?'дней с XP':lang==='en'?'days with XP':'күн XP жиналған'} · {events.length} {lang==='ru'?'событий':lang==='en'?'recorded events':'тіркелген әрекет'}. {l.hint}</p></>}
 </div>;
}
