import React,{useState} from 'react';
import {CheckCircle2,Eye,EyeOff,Mail,ShieldCheck,Save} from 'lucide-react';
import {firebaseApi} from './firebase-adapter.js';

const locales={
 kk:{
  create:'Балаға жеке аккаунт ашу',existing:'Бар балаға логин ашу',
  intro:'Ата-ана баланың нақты email-ін және бастапқы құпиясөзін орнатады. Бала сол аккаунтты кейін де сақтап пайдалана алады.',
  name:'Баланың толық аты-жөні',grade:'Сынып',letter:'Сынып әрпі',school:'Мектеп',
  email:'Баланың қолжетімді email-і',password:'Бастапқы құпиясөз (кемі 10 таңба)',confirm:'Құпиясөзді қайталау',
  consent:'Мен ата-анасы немесе заңды өкілімін және балаға аккаунт ашуға келісемін.',
  note:'Жалған email енгізбеңіз: растау және кейін құпиясөзді қалпына келтіру үшін пошта қажет. Құпиясөз Firestore базасында сақталмайды.',
  saving:'Аккаунт жасалуда...',save:'Аккаунт ашу',success:'Баланың аккаунты жасалды!',
  keep:'Тіркелген email мен өзіңіз енгізген құпиясөзді балаға жеке, қауіпсіз жолмен беріңіз. Бала кейін құпиясөзін өзі ауыстыра алады.',
  verification:'Растау хаты көрсетілген поштаға жіберілді. Баланың email-ін растаңыз.',
  verificationFail:'Аккаунт ашылды, бірақ растау хатын жіберу сәтсіз болды. Бала өз аккаунтынан хатты қайта жібере алады.',
  close:'Жабу',verifyParent:'Алдымен өз email-іңізді растаңыз. Содан кейін қайта кіріп, баланың аккаунтын ашыңыз.',
  rules:'Firebase ережелері рұқсат бермеді. GitHub-тағы жаңартылған firestore.rules файлын Firebase Console → Rules бөліміне жариялау қажет.',
  taken:'Бұл email-мен аккаунт бар. Басқа email таңдаңыз немесе ескі аккаунтқа кіріңіз.',
  invalidEmail:'Дұрыс және жұмыс істейтін email енгізіңіз.',
  invalidPass:'Құпиясөз 10–128 таңба аралығында болуы керек.',mismatch:'Құпиясөздер сәйкес емес.',
  already:'Бұл балаға логин бұрын ашылған.'
 },
 ru:{
  create:'Создать личный аккаунт ребёнка',existing:'Добавить логин ребёнку',
  intro:'Родитель вводит доступный email ребёнка и начальный пароль. Аккаунт сохраняется на будущее.',
  name:'Полное имя ребёнка',grade:'Класс',letter:'Буква класса',school:'Школа',
  email:'Доступный email ребёнка',password:'Начальный пароль (минимум 10 символов)',confirm:'Повторите пароль',
  consent:'Я родитель или законный представитель и согласен на создание аккаунта.',
  note:'Не используйте фиктивную почту: она нужна для подтверждения и восстановления доступа. Пароль не записывается в Firestore.',
  saving:'Создаём аккаунт...',save:'Создать аккаунт',success:'Аккаунт ребёнка создан!',
  keep:'Передайте логин и установленный вами пароль ребёнку безопасным способом. Позже ребёнок сможет изменить пароль.',
  verification:'Письмо для подтверждения отправлено на указанный email.',
  verificationFail:'Аккаунт создан, но письмо для подтверждения не отправилось. Его можно запросить из аккаунта ребёнка.',
  close:'Закрыть',verifyParent:'Сначала подтвердите свой email и войдите заново.',
  rules:'Firebase отказал в доступе. Опубликуйте обновлённый firestore.rules в Firebase Console → Rules.',
  taken:'На этот email уже зарегистрирован аккаунт.',invalidEmail:'Укажите действующий email.',
  invalidPass:'Пароль должен содержать 10–128 символов.',mismatch:'Пароли не совпадают.',already:'Для ребёнка уже создан логин.'
 },
 en:{
  create:'Create a child account',existing:'Give this child a login',
  intro:'A parent sets a real email and initial password. This child account stays available as they grow up.',
  name:'Child full name',grade:'Grade',letter:'Class letter',school:'School',
  email:'Child reachable email',password:'Initial password (10+ characters)',confirm:'Repeat password',
  consent:'I am the parent or legal guardian and consent to creating this account.',
  note:'Do not invent an email address: verification and password recovery require an accessible inbox. No password is stored in Firestore.',
  saving:'Creating account...',save:'Create account',success:'Child account created!',
  keep:'Give the child the login and chosen password privately. They can change the password later.',
  verification:'An email verification message has been sent.',
  verificationFail:'Account was created, but verification mail could not be sent. The child can resend it after login.',
  close:'Close',verifyParent:'Verify your own email first, then sign in again.',
  rules:'Firebase rules rejected the operation. Publish the updated firestore.rules file in Firebase Console → Rules.',
  taken:'This email already has an account.',invalidEmail:'Enter a valid, reachable email.',
  invalidPass:'Password must contain 10–128 characters.',mismatch:'Passwords do not match.',already:'A login already exists for this child.'
 }
};
function errorCopy(error,t){
 const e=error?.code||error?.message||'';
 if(e==='permission-denied'||e==='firestore/permission-denied')return t.rules;
 if(e==='auth/email-already-in-use')return t.taken;
 if(e==='verify_email_first')return t.verifyParent;
 if(e==='child_email_invalid')return t.invalidEmail;
 if(e==='child_password_invalid')return t.invalidPass;
 if(e==='password_mismatch')return t.mismatch;
 if(e==='child_account_already_created')return t.already;
 return String(error?.message||e||'Unknown error');
}

export function ChildAccountCreator({record=null,schools=[],lang='kk',emailVerified=false,onClose,onComplete}){
 const t=locales[lang]||locales.kk;
 const [data,setData]=useState({
  full_name:record?.full_name||'',grade:record?.grade||5,
  class_letter:record?.class_letter||'А',
  school_id:record?.school_id||schools[0]?.id||'',
  email:'',password:'',password_confirm:'',guardian_consent:false
 });
 const [showPassword,setShowPassword]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[created,setCreated]=useState(null);
 const update=(k,v)=>setData(old=>({...old,[k]:v}));
 async function submit(event){
  event.preventDefault();
  if(busy||!emailVerified)return;
  setBusy(true);setError('');
  try{
   const result=await firebaseApi.createChildAccount({...data,existing_child_id:record?.id||null});
   setData(old=>({...old,password:'',password_confirm:''}));
   setCreated(result);
   try{await onComplete?.()}catch(e){console.warn('Child list refresh failed',e?.code||e?.message)}
  }catch(e){setError(errorCopy(e,t))}
  finally{setBusy(false)}
 }
 if(created)return <div className="modal-form">
  <div className="alert info" role="status"><CheckCircle2 size={20}/>{t.success}</div>
  <label className="field">{t.email}<input readOnly value={created.email}/></label>
  <div className="alert info"><ShieldCheck size={18}/>{t.keep}</div>
  <div className={created.verificationSent?'alert info':'alert warning'}><Mail size={18}/>{created.verificationSent?t.verification:t.verificationFail}</div>
  <button className="primary" type="button" onClick={onClose}>{t.close}</button>
 </div>;
 return <form className="modal-form" onSubmit={submit} autoComplete="off">
  <p className="privacy-hint"><ShieldCheck size={17}/>{t.intro}</p>
  {record?<div className="alert info"><CheckCircle2 size={18}/><strong>{record.full_name} — {record.grade}{record.class_letter}</strong></div>:
   <>
    <label className="field">{t.name}<input required maxLength={130} minLength={3} value={data.full_name} onChange={e=>update('full_name',e.target.value)}/></label>
    <div className="two">
     <label className="field">{t.grade}<select value={data.grade} onChange={e=>update('grade',Number(e.target.value))}>{Array.from({length:11},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
     <label className="field">{t.letter}<input required maxLength={5} value={data.class_letter} onChange={e=>update('class_letter',e.target.value)}/></label>
    </div>
    <label className="field">{t.school}<select required value={data.school_id} onChange={e=>update('school_id',Number(e.target.value))}>
      <option value="">—</option>{schools.map(s=><option key={s.id} value={s.id}>{s['name_'+lang]||s.name||s.name_kk}</option>)}
    </select></label>
   </>}
  <label className="field">{t.email}
   <input required type="email" maxLength={254} autoComplete="off" value={data.email} placeholder="student@example.com" onChange={e=>update('email',e.target.value)}/>
  </label>
  <label className="field">{t.password}
   <div className="input-icon"><input required type={showPassword?'text':'password'} minLength={10} maxLength={128} autoComplete="new-password" value={data.password} onChange={e=>update('password',e.target.value)}/><button type="button" className="eye" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
  </label>
  <label className="field">{t.confirm}
   <input required type={showPassword?'text':'password'} minLength={10} maxLength={128} autoComplete="new-password" value={data.password_confirm} onChange={e=>update('password_confirm',e.target.value)}/>
  </label>
  <label className="consent"><input type="checkbox" checked={data.guardian_consent} onChange={e=>update('guardian_consent',e.target.checked)}/><span>{t.consent}</span></label>
  <p className="privacy-hint"><ShieldCheck size={17}/>{t.note}</p>
  {!emailVerified&&<div className="alert warning"><Mail size={17}/>{t.verifyParent}</div>}
  {error&&<div className="alert error" role="alert">{error}</div>}
  <button className="primary" disabled={!emailVerified||busy||!data.guardian_consent||data.password!==data.password_confirm} type="submit"><Save size={17}/>{busy?t.saving:t.save}</button>
 </form>;
}
