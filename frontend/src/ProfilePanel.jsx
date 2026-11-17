import React,{useState} from 'react';
import {Camera,KeyRound,ShieldCheck,UserCircle,Save,Trash2,Lock,CheckCircle2} from 'lucide-react';
import {firebaseApi,firebaseReady} from './firebase-adapter.js';

export function avatarFor(user){
 if(!user)return null;
 if(user.role==='student'){
  try{return localStorage.getItem('cq_local_avatar_'+user.id)||null}catch{return null}
 }
 return user.avatar_data_url||null;
}
async function compressAvatar(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Тек JPG, PNG немесе WEBP суретін таңдаңыз.');
 if(file.size>4*1024*1024)throw new Error('Файл көлемі 4 МБ-тан аспауы керек.');
 const url=URL.createObjectURL(file),img=new Image();
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Сурет ашылмады'));img.src=url});
  const c=document.createElement('canvas');
  c.width=128;c.height=128;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#f3f0ff';ctx.fillRect(0,0,128,128);
  const scale=Math.max(128/img.naturalWidth,128/img.naturalHeight);
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  ctx.drawImage(img,(128-w)/2,(128-h)/2,w,h);
  for(const q of [.76,.62,.45,.32]){
   const data=c.toDataURL('image/jpeg',q);
   if(data.length<=24000)return data;
  }
  throw new Error('Суретті сығымдау мүмкін болмады.');
 }finally{URL.revokeObjectURL(url)}
}
const i18n={
 kk:{title:'Жеке кабинет',details:'Менің деректерім',avatar:'Профиль суретін қою',remove:'Суретті өшіру',password:'Құпиясөзді өзгерту',current:'Қазіргі құпиясөз',next:'Жаңа құпиясөз',confirm:'Жаңа құпиясөзді қайталау',save:'Өзгерту',email:'Электрондық пошта',name:'Аты-жөні',role:'Рөл',phone:'Телефон',school:'Мектеп',status:'Мәртебе',verified:'Email расталды',unverified:'Email расталмаған',success:'Құпиясөз сәтті өзгерді. Жаңа парольмен қайта кіре аласыз.',saved:'Профиль суреті сақталды.',local:'Оқушының суреті Firebase-ке жіберілмейді — тек осы браузерде сақталады. Ортақ компьютерде фотосурет қоюдан бас тартыңыз.',weak:'Құпиясөз кемінде 10 таңба болсын.',mismatch:'Жаңа құпиясөздер сәйкес келмейді.',auth:'Firebase профилінде ғана пароль өзгертуге болады.'},
 ru:{title:'Личный кабинет',details:'Мои данные',avatar:'Добавить фото профиля',remove:'Удалить фото',password:'Изменить пароль',current:'Текущий пароль',next:'Новый пароль',confirm:'Повторите пароль',save:'Сохранить',email:'Электронная почта',name:'ФИО',role:'Роль',phone:'Телефон',school:'Школа',status:'Статус',verified:'Email подтвержден',unverified:'Email не подтвержден',success:'Пароль успешно изменен.',saved:'Фото профиля сохранено.',local:'Фото ученика не загружается в Firebase — хранится только в этом браузере. Не используйте фото на общем компьютере.',weak:'Пароль должен содержать минимум 10 символов.',mismatch:'Пароли не совпадают.',auth:'Изменение пароля доступно только с Firebase.'},
 en:{title:'My profile',details:'Account information',avatar:'Upload profile photo',remove:'Remove photo',password:'Change password',current:'Current password',next:'New password',confirm:'Confirm new password',save:'Save',email:'Email',name:'Full name',role:'Role',phone:'Phone',school:'School',status:'Status',verified:'Email verified',unverified:'Email not verified',success:'Password changed successfully.',saved:'Profile photo saved.',local:'A student photo is stored only in this browser, never in Firebase. Avoid uploading photos on shared devices.',weak:'Password must contain at least 10 characters.',mismatch:'Passwords do not match.',auth:'Password changes require Firebase.'}
};
export function ProfilePanel({user,lang='kk',onUpdate}){
 const t=k=>i18n[lang]?.[k]||i18n.kk[k]||k;
 const [photo,setPhoto]=useState(()=>avatarFor(user));
 const [form,setForm]=useState({old:'',next:'',confirm:''});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState('');
 const displayError=e=>e?.code==='auth/wrong-password'||e?.code==='auth/invalid-credential'?'Қазіргі құпиясөз қате.':e?.code==='auth/too-many-requests'?'Көп әрекет жасалды, кейін көріңіз.':e?.message||String(e);
 const saveImage=async(file)=>{
  setError('');setInfo('');setBusy(true);
  try{
   const data=await compressAvatar(file);
   if(user.role==='student'){
    localStorage.setItem('cq_local_avatar_'+user.id,data);setPhoto(data);
    window.dispatchEvent(new Event('cq-avatar-update'));
   }else{
    if(!firebaseReady)throw Error(t('auth'));
    const updated=await firebaseApi.updateOwnAvatar(data);
    onUpdate(updated);setPhoto(data);
   }
   setInfo(t('saved'));
  }catch(e){setError(displayError(e))}finally{setBusy(false)}
 };
 const remove=async()=>{
  setBusy(true);setError('');
  try{
   if(user.role==='student'){
    localStorage.removeItem('cq_local_avatar_'+user.id);window.dispatchEvent(new Event('cq-avatar-update'));
   }else{
    const updated=await firebaseApi.updateOwnAvatar(null);onUpdate(updated);
   }
   setPhoto(null);
  }catch(e){setError(displayError(e))}finally{setBusy(false)}
 };
 const changePassword=async(e)=>{
  e.preventDefault();setError('');setInfo('');
  if(form.next.length<10){setError(t('weak'));return}
  if(form.next!==form.confirm){setError(t('mismatch'));return}
  setBusy(true);
  try{await firebaseApi.changeOwnPassword(form.old,form.next);setInfo(t('success'));setForm({old:'',next:'',confirm:''})}
  catch(e){setError(displayError(e))}
  finally{setBusy(false)}
 };
 const props=[[t('name'),user.full_name],[t('email'),user.email],[t('role'),user.role],[t('phone'),user.phone||'—'],[t('school'),user.school_name||'—'],[t('status'),user.status||'—'],['Firebase UID',user.id]];
 return <section className="profile-layout">
  <div className="learning-panel profile-details">
   <header><h2>{t('title')}</h2><p>{t('details')}</p></header>
   <div className="profile-hero">{photo?<img className="profile-picture" src={photo} alt="Profile"/>:<div className="profile-picture placeholder"><UserCircle size={52}/></div>}<div><h3>{user.full_name}</h3><small>{user.email_verified?t('verified'):t('unverified')}</small></div></div>
   <div className="learning-actions"><label className="learning-button avatar-input"><Camera size={17}/>{t('avatar')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)saveImage(f)}}/></label>{photo&&<button className="learning-secondary" onClick={remove} disabled={busy}><Trash2 size={16}/>{t('remove')}</button>}</div>
   {user.role==='student'&&<p className="learning-notice"><ShieldCheck size={16}/>{t('local')}</p>}
   <div className="profile-fields">{props.map(([k,v])=><div key={k}><small>{k}</small><strong>{String(v||'—')}</strong></div>)}</div>
  </div>
  <form className="learning-panel profile-password" onSubmit={changePassword}>
   <header><h2><KeyRound size={21}/> {t('password')}</h2></header>
   <label>{t('current')}<input type="password" autoComplete="current-password" required value={form.old} onChange={e=>setForm({...form,old:e.target.value})}/></label>
   <label>{t('next')}<input type="password" autoComplete="new-password" minLength={10} required value={form.next} onChange={e=>setForm({...form,next:e.target.value})}/></label>
   <label>{t('confirm')}<input type="password" autoComplete="new-password" minLength={10} required value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})}/></label>
   <button className="learning-button" disabled={!firebaseReady||busy}><Lock size={16}/>{busy?'...':t('save')}</button>
   {error&&<p className="learning-error" role="alert">{error}</p>}
   {info&&<p className="learning-success"><CheckCircle2 size={16}/>{info}</p>}
  </form>
 </section>;
}
