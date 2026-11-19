import React,{useMemo,useState} from 'react';
import {CalendarCheck,Flame,Trophy,RotateCcw} from 'lucide-react';
import {awardXp,almatyDay} from './xp.js';
const tasks=[
 {q:'Python-дағы print(7 // 2) нәтижесі қандай?',options:['3','3.5','4','14'],answer:0,why:'// — бүтін бөлу, сондықтан 7 // 2 = 3.'},
 {q:'HTML құжатында тақырып жазу үшін қандай тег қолданылады?',options:['<div>','<h1>','<p>','<img>'],answer:1,why:'<h1> — ең жоғары деңгейдегі тақырып тегі.'},
 {q:'Python тіліндегі len([1,2,3,4]) нәтижесі?',options:['3','4','10','0'],answer:1,why:'len() тізімдегі элементтер санын қайтарады.'},
 {q:'CSS-те мәтін түсін өзгерту қасиеті?',options:['background','color','font-size','display'],answer:1,why:'CSS color мәтіннің түсін белгілейді.'},
 {q:'Екілік жүйеде 1010 саны ондық жүйеде неге тең?',options:['8','9','10','11'],answer:2,why:'1010₂ = 8 + 2 = 10.'},
 {q:'Python тілінде шарт тексеретін оператор?',options:['for','if','print','import'],answer:1,why:'if шартты тексереді.'},
 {q:'SQL кестесінен деректерді алу командасы?',options:['SELECT','DELETE','INSERT','DROP'],answer:0,why:'SELECT деректерді таңдайды.'},
 {q:'Алгоритмде қайталауды қай құрылым орындайды?',options:['Шарт','Цикл','Айнымалы','Функция аты'],answer:1,why:'Цикл бір әрекеттер жиынын қайталайды.'},
 {q:'Интернетте қауіпсіз құпиясөздің белгісі?',options:['123456','Аты-жөнің','Ұзын, бірегей','password'],answer:2,why:'Ұзын және бірегей құпиясөз қауіпсіз.'},
 {q:'Python ішіндегі range(3) мәндері?',options:['1,2,3','0,1,2','0,1,2,3','3'],answer:1,why:'range(3) 0-ден басталып, 3-ке жетпейді.'},
 {q:'Компьютердің жедел жадысы қайсы?',options:['RAM','SSD','GPU','USB'],answer:0,why:'RAM — жедел жады.'},
 {q:'HTTP сұрауларында HTTPS айырмашылығы?',options:['Жылдамдық қана','Шифрлау','Тек сурет','Парольсіз'],answer:1,why:'HTTPS TLS арқылы деректерді шифрлайды.'}
];
const day=almatyDay;
export function DailyChallenge({user,lang='kk'}){
 const date=day(),storage='cq_daily_challenge_'+user.id;
 const pick=useMemo(()=>{
  const d=new Date(date+'T12:00:00Z');
  const days=Math.floor(d.getTime()/86400000);
  return tasks[days%tasks.length];
 },[date]);
 const get=()=>{try{return JSON.parse(localStorage.getItem(storage)||'{}')}catch{return {}}};
 const [done,setDone]=useState(get),[choice,setChoice]=useState(-1);
 const [xpError,setXpError]=useState(''),[saving,setSaving]=useState(false),[xpSaved,setXpSaved]=useState(false);
 const saveXp=async()=>{
  setSaving(true);setXpError('');
  try{const result=await awardXp({source:'daily',date});setXpSaved(true);}
  catch(e){setXpError(e?.message||String(e))}
  finally{setSaving(false)}
 };
 const todayResult=done[date]??null;
 const submit=async i=>{
  if(todayResult!==null)return;
  const result={answer:i,correct:i===pick.answer,points:i===pick.answer?20:0};
  const updated={...done,[date]:result};
  setChoice(i);setDone(updated);
  try{localStorage.setItem(storage,JSON.stringify(updated))}catch{}
  if(result.correct)await saveXp();
 };
 const streak=Object.entries(done).filter(([_,v])=>v.correct).length;
 return <div className="learning-panel daily-challenge">
  <header><h2><Flame size={24}/> {lang==='ru'?'Ежедневный челлендж':lang==='en'?'Daily Quest':'Күнделікті челлендж'}</h2>
   <p>{lang==='ru'?'Каждый день — новая задача по информатике.':lang==='en'?'A fresh computer science challenge every day.':'Күн сайын информатикадан жаңа сұрақ. Сыйлық — 20 XP (демо).'}</p></header>
  <div className="daily-score"><span><CalendarCheck size={17}/>{date}</span><span><Trophy size={17}/>{streak} {lang==='ru'?'успешных дней':lang==='en'?'successful days':'сәтті күн'}</span></div>
  <h3>{pick.q}</h3>
  <div className="daily-options">{pick.options.map((o,i)=><button key={i} disabled={todayResult!==null} className={todayResult!==null&&pick.answer===i?'correct':todayResult?.answer===i?'wrong':''} onClick={()=>submit(i)}>{String.fromCharCode(65+i)}. {o}</button>)}</div>
  {todayResult!==null&&<div className="learning-notice"><Trophy size={20}/><strong>{todayResult.correct?(xpSaved?'+20 XP ✓':'+20 XP (сақталмаған)'):'0 XP'}</strong> · {pick.why}</div>}
  {todayResult?.correct&&!xpSaved&&<button type="button" className="learning-secondary" disabled={saving} onClick={saveXp}>{saving?'XP сақталуда...':'XP-ні Firebase-ке сақтау / қайта көру'}</button>}
  {xpError&&<p className="learning-error" role="alert">{xpError}</p>}
  <p className="learning-hint">{lang==='ru'?'Ответ хранится в этом браузере, а XP — в Firebase аккаунте (игровые очки).':lang==='en'?'The answer stays in this browser; XP is saved to your Firebase account (game points).':'Жауап осы браузерде сақталады, ал XP Firebase аккаунтына тіркеледі (ойындық ұпай).'}</p>
 </div>;
}
