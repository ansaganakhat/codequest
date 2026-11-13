import React,{useEffect,useMemo,useState} from 'react';
import {CheckCircle2,Clock,GraduationCap,LogIn,RefreshCw,ShieldCheck,Trophy,Users} from 'lucide-react';
import {learningApi} from './learning-api.js';

const copy={
 kk:{myClasses:'Менің сыныптарым',myQuizzes:'Менің тесттерім',join:'Сыныпқа қосылу',code:'Мұғалім берген сынып коды',submit:'Сыныпқа өтініш жіберу',hint:'Мұғалім код бергенде ғана қосылыңыз. Мұғалім өтінішті тексеріп растайды.',pending:'Мұғалімнің растауын күтуде',approved:'Сыныпқа қабылдандыңыз',rejected:'Өтініш қабылданбады',waiting:'Қазір белсенді тест жоқ',active:'Жаңа Live Quiz басталды!',enter:'Тестті ашу',verified:'Алдымен тіркелген email-ге келген растау сілтемесін басыңыз. Содан кейін аккаунтқа қайта кіріңіз.',confirm:'Ата-ана/заңды өкіл келісімі мен мұғалімнің растауы қажет.',joined:'Өтініш жіберілді!',error:'Сыныпқа қосылу сәтсіз',invalid:'Сынып коды 20 әріп не цифрдан тұруы тиіс.',missing:'Сынып табылмады. Кодты мұғалімнен тексеріңіз.',exists:'Бұл сыныпқа өтініш беріп қойғансыз.',none:'Әлі сыныпқа қосылмадыңыз',classes:'Сыныптарым',busy:'Өңделуде...',notify:'Сыныбыңызда жаңа викторина басталды'},
 ru:{myClasses:'Мои классы',myQuizzes:'Мои викторины',join:'Присоединиться к классу',code:'Код класса от учителя',submit:'Отправить заявку',hint:'Вводите код, полученный от учителя. Учитель должен подтвердить заявку.',pending:'Ожидается подтверждение учителя',approved:'Участие подтверждено',rejected:'Заявка отклонена',waiting:'Сейчас нет активных викторин',active:'Началась новая викторина!',enter:'Открыть викторину',verified:'Сначала подтвердите email по ссылке из письма. Затем войдите снова.',confirm:'Требуется разрешение родителя/законного представителя и одобрение учителя.',joined:'Заявка отправлена!',error:'Ошибка при вступлении',invalid:'Код класса должен состоять из 20 букв или цифр.',missing:'Класс не найден. Уточните код у учителя.',exists:'Вы уже подавали заявку в этот класс.',none:'Вы пока не вступили в класс',classes:'Мои классы',busy:'Выполняется...',notify:'В вашем классе началась новая викторина'},
 en:{myClasses:'My classes',myQuizzes:'My quizzes',join:'Join a class',code:'Class code from teacher',submit:'Request to join',hint:'Use the code supplied by your teacher. Your teacher must approve your request.',pending:'Waiting for teacher approval',approved:'Class membership approved',rejected:'Request rejected',waiting:'No active quizzes yet',active:'A new Live Quiz has started!',enter:'Open quiz',verified:'Verify your email using the link in your inbox, then sign in again.',confirm:'Parent/guardian permission and teacher approval are required.',joined:'Request submitted!',error:'Could not join class',invalid:'Class code must contain 20 letters or digits.',missing:'Class not found. Check the code with your teacher.',exists:'You already requested to join this class.',none:'You have not joined a class yet',classes:'My classes',busy:'Working...',notify:'A new quiz started in your class'}
};
const T=(lang,key)=>copy[lang]?.[key]||copy.kk[key]||key;
const errorMessage=(error,lang)=>{
 if(error?.message==='class_code_invalid')return T(lang,'invalid');
 if(error?.message==='class_not_found')return T(lang,'missing');
 if(error?.message==='class_request_already_exists')return T(lang,'exists');
 if(error?.message==='verify_email_first')return T(lang,'verified');
 if(error?.code==='permission-denied')return 'Firebase Rules: permission-denied. Жаңа firestore.rules жарияланғанын тексеріңіз.';
 return error?.message||T(lang,'error');
};
function useStudentClassState(user){
 const [members,setMembers]=useState([]),[notices,setNotices]=useState({}),[error,setError]=useState('');
 useEffect(()=>{
  if(!user?.id||!user.email_verified){setMembers([]);return;}
  let live=true;
  const stop=learningApi.listenMyClassMemberships(user.id,m=>{if(live)setMembers(m)},e=>{if(live)setError(e?.message||String(e))});
  return()=>{live=false;stop?.()};
 },[user?.id,user?.email_verified]);
 const approved=members.filter(m=>m.status==='approved');
 const approvedIds=approved.map(m=>m.class_id).sort().join('|');
 useEffect(()=>{
  setNotices({});
  if(!approvedIds)return;
  let live=true;
  const ids=approvedIds.split('|');
  const stops=ids.map(id=>learningApi.listenClassQuiz(id,d=>{
   if(live)setNotices(prev=>({...prev,[id]:d}));
  },e=>{if(live)setError(e?.message||String(e))}));
  return()=>{live=false;stops.forEach(fn=>fn?.())};
 },[approvedIds]);
 const invitations=approved.filter(m=>notices[m.class_id]?.status==='open'&&notices[m.class_id]?.quiz_id).map(m=>({...notices[m.class_id],class_name:m.class_name})).sort((a,b)=>(b.started_at||0)-(a.started_at||0));
 return {members,invitations,error,setError};
}
export function StudentQuizBanner({user,lang='kk',onOpen}){
 const {invitations}=useStudentClassState(user);
 if(!invitations.length)return null;
 return <div className="student-invite-banner" role="status" aria-live="polite"><Trophy size={20}/><div><b>{T(lang,'notify')}</b><span>{invitations[0].class_name} · {invitations[0].title}</span></div><button type="button" onClick={onOpen}>{T(lang,'enter')}</button></div>;
}
export function StudentHub({user,lang='kk',mode='classes'}){
 const {members,invitations,error,setError}=useStudentClassState(user);
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const join=async e=>{
  e.preventDefault();setError('');setMessage('');setBusy(true);
  try{await learningApi.joinClassroom(code);setMessage(T(lang,'joined'));setCode('')}
  catch(e){setError(errorMessage(e,lang))}
  finally{setBusy(false)}
 };
 return <section className="learning-panel student-hub">
   <header><h2>{T(lang,mode==='quizzes'?'myQuizzes':'myClasses')}</h2><p>{T(lang,'confirm')}</p></header>
   {!user.email_verified&&<p className="learning-notice"><ShieldCheck size={18}/>{T(lang,'verified')}</p>}
   {mode==='classes'&&<form className="learning-form" onSubmit={join}>
    <label>{T(lang,'code')}<input required value={code} maxLength={100} autoComplete="off" spellCheck={false} onChange={e=>setCode(e.target.value)} placeholder="AbCdEf1234567890GhIJ" /></label>
    <button type="submit" className="learning-button" disabled={busy||!user.email_verified||!code.trim()}><LogIn size={17}/>{busy?T(lang,'busy'):T(lang,'submit')}</button>
    <small className="learning-hint">{T(lang,'hint')}</small>
   </form>}
   {message&&<p className="learning-success"><CheckCircle2 size={17}/>{message}</p>}
   {error&&<p className="learning-error" role="alert">{error}</p>}
   {mode==='classes'&&<><h3 className="section-title">{T(lang,'classes')}</h3><div className="learning-grid">
    {members.map(m=><div className="learning-tile" key={m.id}><GraduationCap size={23}/><strong>{m.class_name}</strong><small>{m.status==='approved'?T(lang,'approved'):m.status==='rejected'?T(lang,'rejected'):T(lang,'pending')}</small><span className="student-class-code">{m.class_id}</span></div>)}
   </div>{!members.length&&<p className="learning-notice">{T(lang,'none')}</p>}</>}
   <h3 className="section-title">{T(lang,'myQuizzes')}</h3>
   {invitations.length?<div className="student-invites-list">{invitations.map(q=><div className="student-invite-tile" key={q.quiz_id}><div><small>{q.class_name}</small><b>{q.title}</b><span>{T(lang,'active')}</span></div><a className="learning-button" href={'/?join='+encodeURIComponent(q.quiz_id)}><Trophy size={17}/>{T(lang,'enter')}</a></div>)}</div>:
    <p className="learning-notice"><Clock size={17}/>{T(lang,'waiting')}</p>}
 </section>;
}
