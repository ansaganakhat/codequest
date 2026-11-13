import React,{useEffect,useMemo,useRef,useState} from 'react';
import { Camera, CameraOff, Users, Play, Square, RefreshCcw, ClipboardList, Trophy, CheckCircle2,
  QrCode, Copy, School, Plus, Trash2, BookOpen, ShieldCheck, Hand, BrainCircuit, BarChart3, Send,
  Check, X, ArrowRight, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';
import {learningApi} from './learning-api.js';
import {firebaseApi} from './firebase-adapter.js';

const labels={
 kk:{cameraAllowTitle:'Камераға рұқсат беру',cameraAllowIntro:'Камера іске қосылмас бұрын рұқсат қажет. Төмендегі батырманы басып, браузер сұрағанда «Рұқсат беру» (Allow) таңдаңыз.',cameraAllowButton:'Камераға рұқсат сұрау',cameraAllowBusy:'Браузерден рұқсат күтілуде...',cameraBlocked:'Камера бұғатталған. Браузердің адрес жолағындағы баптау/құлып белгісін басыңыз → Сайт параметрлері → Камера → Рұқсат беру. Содан кейін бетті жаңартып, қайта көріңіз.',cameraUnavailable:'Камера табылмады. Құрылғыны қосып, Windows камера параметрлерін тексеріңіз.',cameraInUse:'Камераны басқа бағдарлама пайдаланып тұр. Zoom, Teams немесе басқа камера қосымшасын жауып көріңіз.',cameraHttps:'Камера үшін HTTPS немесе localhost қажет. Сайтты https://codequest-ai-ansagan.netlify.app мекенжайынан ашыңыз.',cameraGeneric:'Камера іске қосылмады. Браузердің және Windows жүйесінің камераға рұқсаттарын тексеріңіз.',gestureModelError:'Камера ашылды, бірақ қол тану модулі жүктелмеді. Интернет байланысын тексеріңіз.',cameraPermissionHelp:'Егер бұған дейін «Бұғаттау» басылса, браузер өздігінен рұқсат терезесін қайта шығармайды.',start:'Бастау',stop:'Тоқтату',create:'Құру',loading:'Жүктелуде...',error:'Қате',classroom:'Сыныптар',face:'Face Wheel',quiz:'Live Quiz',gesture:'Gesture Game',tutor:'Оқу көмекшісі',analytics:'Аналитика',
   classroomDesc:'Өзіңіздің мектебіңізге арналған виртуалды сыныптарды ашыңыз.',newClass:'Жаңа сынып',className:'Сынып атауы',grade:'Сынып',letter:'Әріп',studentCount:'Оқушылар',empty:'Әлі мәлімет жоқ',approvedOnly:'Бұл бөлім үшін растаудан өткен мұғалім аккаунты қажет.',
   privateInfo:'Балалардың ЖСН-і, фотосы және жеке деректері камера ойындарында серверге жіберілмейді.',wheelHint:'Камераны іске қосып, сыныптағы беттерді анықтаңыз. START бір оқушыны кездейсоқ таңдайды.',startCamera:'Камераны қосу',scan:'Беттерді анықтау',spin:'START — оқушы таңдау',detected:'Анықталған беттер',winner:'Таңдалған оқушы',noFace:'Бет анықталмады. Камера бағытын немесе жарықты өзгертіңіз.',cameraFail:'Камераны ашу мүмкін емес. HTTPS және браузер рұқсаттарын тексеріңіз.',notSaved:'Кадрлар тек осы браузердің уақытша жадында. Серверге сақталмайды.',closeCamera:'Камераны тоқтату',
   quizDesc:'Сұрақтарды дайындап, QR арқылы оқушыларға бөлісіңіз. Нәтиже мұғалім экранында тікелей жаңарады.',newQuiz:'Жаңа викторина',quizName:'Викторина тақырыбы',question:'Сұрақ',addQuestion:'Сұрақ қосу',correct:'Дұрыс жауап',join:'Қосылу',copy:'Сілтемені көшіру',room:'Ойын бөлмесі',roomClosed:'Бұл викторина аяқталды.',answerSent:'Жауап қабылданды!',next:'Келесі сұрақ',nickname:'Қатысушы лақап аты (ЖСН немесе толық аты-жөніңізді жазбаңыз)',results:'Нәтижелер',closeRoom:'Викторинаны аяқтау',participants:'Қатысушылар',scoreDemo:'Ойын ұпайлары, ресми баға емес',needAnonymous:'Қатысу үшін Firebase → Authentication → Sign-in method → Anonymous әдісін қосыңыз.',createPrompt:'Кемінде бір сұрақты және төрт нұсқаны енгізіңіз.',
   gestureDesc:'Сұраққа камера алдындағы сұқ саусағыңызбен жауап таңдаңыз. Бас бармақ пен сұқ саусақты қосқанда таңдау бекітіледі.',gestureStart:'Қолмен басқаруды қосу',gestureTip:'Саусағыңызды солдан оңға жылжытыңыз; pinch арқылы таңдаңыз. Тышқанмен де жауап беруге болады.',points:'XP (демо)',hint:'Кеңес',tutorIntro:'Бұл алғашқы оқу көмекшісі: алдын ала құрылған кеңестер береді, әзірге генеративті ЖИ-ге қосылмаған.',topic:'Тақырыпты таңдаңыз',guide:'Келесі кеңес',answer:'Мысал шешімі',analyticsDesc:'Викторина жауаптары бойынша жиынтық мәлімет. Академиялық баға ретінде қолданылмайды.',accuracy:'Дұрыс жауап үлесі',answered:'Жауаптар саны',noAnalytics:'Викториналар өткізілгеннен кейін график пайда болады.',wait:'Алдымен Firebase Rules ішіне жаңа classroom/quiz ережелерін жариялау қажет.',
   guestWelcome:'Викторинаға қосылу',enterRoom:'Бөлме сілтемесі немесе коды',guestCheck:'Сыныпқа кіру үшін тек лақап ат қолданыңыз.',invalidRoom:'Бөлме табылмады',finish:'Аяқтау'},
 ru:{cameraAllowTitle:'Разрешение на доступ к камере',cameraAllowIntro:'Перед запуском нужна камера. Нажмите кнопку ниже и выберите «Разрешить» (Allow), когда браузер спросит.',cameraAllowButton:'Запросить доступ к камере',cameraAllowBusy:'Ожидаем разрешение браузера...',cameraBlocked:'Доступ к камере заблокирован. Нажмите на значок настроек/замка возле адреса → Настройки сайта → Камера → Разрешить. Обновите страницу и повторите попытку.',cameraUnavailable:'Камера не найдена. Подключите устройство и проверьте настройки камеры Windows.',cameraInUse:'Камера занята другой программой. Закройте Zoom, Teams или другие программы с камерой.',cameraHttps:'Для доступа к камере требуется HTTPS или localhost. Откройте https://codequest-ai-ansagan.netlify.app.',cameraGeneric:'Не удалось включить камеру. Проверьте разрешения браузера и Windows.',gestureModelError:'Камера доступна, но модель распознавания рук не загрузилась. Проверьте интернет.',cameraPermissionHelp:'Если вы раньше нажали «Блокировать», браузер может не показать запрос повторно.',start:'Начать',stop:'Остановить',create:'Создать',loading:'Загрузка...',error:'Ошибка',classroom:'Классы',face:'Face Wheel',quiz:'Live Quiz',gesture:'Gesture Game',tutor:'Учебный помощник',analytics:'Аналитика',classroomDesc:'Создавайте виртуальные классы своей школы.',newClass:'Новый класс',className:'Название класса',grade:'Класс',letter:'Буква',studentCount:'Ученики',empty:'Нет данных',approvedOnly:'Требуется подтвержденная учетная запись учителя.',privateInfo:'ИИН и фотографии детей не отправляются на сервер в играх с камерой.',wheelHint:'Включите камеру, найдите лица и нажмите START для случайного выбора ученика.',startCamera:'Включить камеру',scan:'Найти лица',spin:'START — выбрать ученика',detected:'Найдено лиц',winner:'Выбранный ученик',noFace:'Лица не обнаружены, измените угол или освещение.',cameraFail:'Камера недоступна. Проверьте HTTPS и разрешения браузера.',notSaved:'Кадры остаются только в памяти браузера и не загружаются на сервер.',closeCamera:'Выключить камеру',quizDesc:'Создайте вопросы, поделитесь QR-кодом. Ответы отображаются в реальном времени.',newQuiz:'Новая викторина',quizName:'Название викторины',question:'Вопрос',addQuestion:'Добавить вопрос',correct:'Правильный ответ',join:'Присоединиться',copy:'Копировать ссылку',room:'Комната игры',roomClosed:'Викторина завершена.',answerSent:'Ответ отправлен!',next:'Далее',nickname:'Псевдоним участника (не указывайте ИИН или ФИО)',results:'Результаты',closeRoom:'Завершить викторину',participants:'Участники',scoreDemo:'Игровые очки — не официальная оценка',needAnonymous:'В Firebase → Authentication → Sign-in method включите Anonymous.',createPrompt:'Введите вопрос и четыре варианта ответа.',gestureDesc:'Указывайте ответ указательным пальцем и сведите большой и указательный пальцы для выбора.',gestureStart:'Включить управление рукой',gestureTip:'Двигайте палец слева направо и сделайте щипок для выбора. Мышь также работает.',points:'XP (демо)',hint:'Подсказка',tutorIntro:'Прототип помощника на готовых подсказках, пока без генеративной модели ИИ.',topic:'Выберите тему',guide:'Следующая подсказка',answer:'Пример решения',analyticsDesc:'Агрегированные ответы в викторинах; не используются для официальных оценок.',accuracy:'Доля правильных',answered:'Ответы',noAnalytics:'Графики появятся после викторин.',wait:'Сначала опубликуйте новые правила для классов и викторин в Firestore Rules.',guestWelcome:'Войти в викторину',enterRoom:'Ссылка или код комнаты',guestCheck:'Используйте только псевдоним.',invalidRoom:'Комната не найдена',finish:'Готово'},
 en:{cameraAllowTitle:'Allow camera access',cameraAllowIntro:'Camera permission is required before starting. Press the button below, then choose Allow when your browser asks.',cameraAllowButton:'Request camera permission',cameraAllowBusy:'Waiting for browser permission...',cameraBlocked:'Camera access is blocked. Click the site controls/lock icon near the address bar → Site settings → Camera → Allow. Reload the page and try again.',cameraUnavailable:'No camera found. Connect a camera and check Windows camera settings.',cameraInUse:'Another application is using the camera. Close Zoom, Teams, or other camera apps and retry.',cameraHttps:'Camera access requires HTTPS or localhost. Open https://codequest-ai-ansagan.netlify.app.',cameraGeneric:'Could not start the camera. Check browser and Windows camera permissions.',gestureModelError:'Camera opened, but the hand-tracking model could not load. Check your internet connection.',cameraPermissionHelp:'If you previously selected Block, the browser may not show the permission prompt again.',start:'Start',stop:'Stop',create:'Create',loading:'Loading...',error:'Error',classroom:'Classrooms',face:'Face Wheel',quiz:'Live Quiz',gesture:'Gesture Game',tutor:'Study assistant',analytics:'Analytics',classroomDesc:'Create virtual classrooms for your school.',newClass:'New classroom',className:'Class name',grade:'Grade',letter:'Class letter',studentCount:'Students',empty:'No data yet',approvedOnly:'An approved teacher account is required.',privateInfo:'Children’s IDs and photos are never sent to the server during camera games.',wheelHint:'Enable your camera, detect faces, then spin to randomly select a pupil.',startCamera:'Enable camera',scan:'Detect faces',spin:'START — pick a pupil',detected:'Faces detected',winner:'Selected pupil',noFace:'No faces detected. Adjust camera angle and lighting.',cameraFail:'Cannot open camera. Check HTTPS and browser permissions.',notSaved:'Frames stay in browser memory and are never uploaded.',closeCamera:'Stop camera',quizDesc:'Create a quiz and share a QR code. Answers update in real time.',newQuiz:'New quiz',quizName:'Quiz title',question:'Question',addQuestion:'Add question',correct:'Correct answer',join:'Join',copy:'Copy link',room:'Game room',roomClosed:'This quiz has ended.',answerSent:'Answer sent!',next:'Next',nickname:'Player nickname (do not provide legal name or national ID)',results:'Results',closeRoom:'End quiz',participants:'Participants',scoreDemo:'Game points, not an official grade',needAnonymous:'Enable Anonymous under Firebase Authentication → Sign-in method.',createPrompt:'Provide a question and four answer options.',gestureDesc:'Point at an answer with your index finger; pinch thumb and index finger to select.',gestureStart:'Enable hand tracking',gestureTip:'Move your finger horizontally and pinch to select. Mouse clicks work too.',points:'XP (demo)',hint:'Hint',tutorIntro:'Rule-based study assistant prototype, not connected to generative AI yet.',topic:'Choose topic',guide:'Next hint',answer:'Example solution',analyticsDesc:'Aggregated quiz responses, not formal grading.',accuracy:'Correct answer rate',answered:'Answers',noAnalytics:'Charts will appear after quizzes.',wait:'Publish updated classroom/quiz Firestore rules first.',guestWelcome:'Join quiz',enterRoom:'Room link or code',guestCheck:'Use a nickname only.',invalidRoom:'Room not found',finish:'Finish'}
};
const T=(lang,k)=>labels[lang]?.[k]||labels.kk[k]||k;
const report=e=>e?.code==='permission-denied'?'Firebase Firestore Rules: permission-denied':e?.code==='auth/operation-not-allowed'?'Anonymous Firebase Auth is not enabled':e?.message||String(e);
const starters=[{prompt:'print(2 + 3) нәтижесі?',options:['23','5','2','Қате'],correct:1}];
const gentle=[
 {q:'Python тілінде экранға қалай мәтін шығарамыз?',options:['print()','input()','len()','range()'],correct:0,info:'print() мәтінді немесе мәнді экранға шығарады.'},
 {q:'Алгоритм дегеніміз не?',options:['Кездейсоқ сан','Іс-әрекеттердің реттелген тізбегі','Компьютер түрі','Желі атауы'],correct:1,info:'Алгоритм — нақты қадамдардың бірізділігі.'},
 {q:'Python list индексі нешеден басталады?',options:['1','-1','0','2'],correct:2,info:'Python тізім индексі 0-ден басталады.'},
 {q:'if операторы не үшін қолданылады?',options:['Шарт тексеру','Файл өшіру','Тек сурет шығару','Интернетке қосылу'],correct:0,info:'if шарт ақиқат болғанда блокты орындайды.'}
];
const topics=[
 {name:'Алгоритм',hints:['Мәселені кіші қадамдарға бөліңіз.','Әр қадамның реті түсінікті болуы тиіс.','Тармақталу болса, шарттарды if/else арқылы көрсетіңіз.'],answer:'Мысал: санды оқы → егер сан жұп болса «жұп» деп шығар → әйтпесе «тақ» деп шығар.'},
 {name:'Python',hints:['Мәлімет типін анықтаңыз: int, str, list.','Кіріс қажет болса input(), нәтиже үшін print() қолданыңыз.','Қайталанатын жұмысты for/while арқылы іске асырыңыз.'],answer:'Мысал: n = int(input()); print(n * 2)'},
 {name:'Цикл',hints:['Қанша рет қайталануы керегін белгілеңіз.','Сан белгілі болса for range(n) қолайлы.','Шарт бойынша қайталау керек болса while пайдаланыңыз.'],answer:'Мысал: for i in range(5): print(i)'},
 {name:'Киберқауіпсіздік',hints:['Күмәнді сілтемеге өтпеңіз.','Құпиясөздерді әртүрлі әрі ұзын етіңіз.','Екі факторлы растауды қосып, рұқсаттарды тексеріңіз.'],answer:'Мысал: белгісіз хаттағы сілтемені ашпай, сайтқа өзіңіз кіріңіз.'}
];
function Panel({title,desc,children}){return <section className="learning-panel"><header><h2>{title}</h2><p>{desc}</p></header>{children}</section>}
function cameraAccessError(err,lang){
 if(typeof window!=='undefined'&&!window.isSecureContext)return T(lang,'cameraHttps');
 if(!navigator.mediaDevices?.getUserMedia || err?.name==='InsecureContextError')return T(lang,'cameraHttps');
 if(['NotAllowedError','PermissionDeniedError','SecurityError'].includes(err?.name))return T(lang,'cameraBlocked');
 if(['NotFoundError','DevicesNotFoundError','OverconstrainedError'].includes(err?.name))return T(lang,'cameraUnavailable');
 if(['NotReadableError','TrackStartError','AbortError'].includes(err?.name))return T(lang,'cameraInUse');
 return T(lang,'cameraGeneric')+' '+(err?.message||'');
}
async function requestCamera(constraints){
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
  const error=new Error('HTTPS is required');error.name='InsecureContextError';throw error;
 }
 // Calling getUserMedia inside the button click requests native browser permission.
 // Browsers cannot be forced to re-prompt if the site was previously blocked.
 return navigator.mediaDevices.getUserMedia({video:constraints,audio:false});
}
function CameraPermissionGate({lang,onRequest,busy,error}){
 return <section className="camera-permission-box" aria-label={T(lang,'cameraAllowTitle')}>
  <div className="camera-permission-copy"><span className="camera-permission-symbol"><Camera size={24}/></span><div><h3>{T(lang,'cameraAllowTitle')}</h3><p>{T(lang,'cameraAllowIntro')}</p></div></div>
  <button type="button" className="learning-button camera-request-button" onClick={onRequest} disabled={busy}>
   <Camera size={19}/>{T(lang,busy?'cameraAllowBusy':'cameraAllowButton')}
  </button>
  {error&&<div className="camera-permission-alert" role="alert"><p>{error}</p><small>{T(lang,'cameraPermissionHelp')}</small></div>}
 </section>;
}

function Msg({error}){return error?<p className="learning-error" role="alert">{report(error)}</p>:null}
function Button({children,...rest}){return <button className="learning-button" {...rest}>{children}</button>}

function Classrooms({lang,students=[]}){
 const [rows,setRows]=useState([]),[name,setName]=useState('6-А'),[grade,setGrade]=useState(6),[letter,setLetter]=useState('А'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async()=>{try{setRows(await learningApi.classrooms());setError('')}catch(e){setError(report(e))}};
 useEffect(()=>{load()},[]);
 const create=async e=>{e.preventDefault();setBusy(true);try{await learningApi.createClassroom({name,grade,letter});await load()}catch(e){setError(report(e))}finally{setBusy(false)}};
 return <Panel title={T(lang,'classroom')} desc={T(lang,'classroomDesc')}>
  <form className="learning-form" onSubmit={create}><label>{T(lang,'className')}<input required minLength={3} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><label>{T(lang,'grade')}<select value={grade} onChange={e=>setGrade(Number(e.target.value))}>{Array.from({length:11},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label><label>{T(lang,'letter')}<input maxLength={4} value={letter} onChange={e=>setLetter(e.target.value)}/></label><Button disabled={busy}><Plus size={16}/> {T(lang,'create')}</Button></form>
  <Msg error={error}/><div className="learning-grid">{rows.map(c=>{const n=students.filter(s=>s.status==='approved'&&Number(s.school_id)===Number(c.school_id)&&s.grade===c.grade&&(!c.letter||s.class_letter===c.letter)).length;return <div key={c.id} className="learning-tile"><School size={25}/><strong>{c.name}</strong><small>{c.grade}{c.letter} · {T(lang,'studentCount')}: {n}</small><p>{students.filter(s=>s.status==='approved'&&s.grade===c.grade&&(!c.letter||s.class_letter===c.letter)&&Number(s.school_id)===Number(c.school_id)).slice(0,12).map(s=>s.full_name).join(', ')||T(lang,'empty')}</p></div>})}</div>
 </Panel>;
}
function FaceWheel({lang}){
 const video=useRef(null),stream=useRef(null),detector=useRef(null),timer=useRef(null);
 const [running,setRunning]=useState(false),[busy,setBusy]=useState(false),[faces,setFaces]=useState([]),[index,setIndex]=useState(-1),[winner,setWinner]=useState(-1),[error,setError]=useState('');
 const release=()=>{if(timer.current){clearInterval(timer.current);timer.current=null;}if(stream.current)stream.current.getTracks().forEach(t=>t.stop());stream.current=null;detector.current?.close?.();detector.current=null;setRunning(false)};
 useEffect(()=>()=>{if(timer.current)clearInterval(timer.current);stream.current?.getTracks().forEach(t=>t.stop());detector.current?.close?.()},[]);
 const begin=async()=>{
  setBusy(true);setError('');
  try{
   const track=await requestCamera({width:{ideal:1280},height:{ideal:720},facingMode:'user'});stream.current=track;
   if(video.current){video.current.srcObject=track;await video.current.play();}
   setRunning(true);
  }catch(e){setError(cameraAccessError(e,lang));release()}finally{setBusy(false)}
 };
 const scan=async()=>{
  if(!video.current||!stream.current)return;
  setBusy(true);setError('');
  try{
   const {FaceDetector,FilesetResolver}=await import('@mediapipe/tasks-vision');
   if(!detector.current){
    const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm');
    detector.current=await FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',delegate:'CPU'},runningMode:'VIDEO',minDetectionConfidence:0.55});
   }
   const v=video.current;const detection=detector.current.detectForVideo(v,performance.now());
   const w=v.videoWidth,h=v.videoHeight;
   const snapshots=(detection.detections||[]).slice(0,35).map((face)=>{
    const b=face.boundingBox;if(!b)return null;
    const pad=Math.max(b.width,b.height)*0.17;
    const x=Math.max(0,b.originX-pad),y=Math.max(0,b.originY-pad);
    const dw=Math.min(w-x,b.width+pad*2),dh=Math.min(h-y,b.height+pad*2);
    if(dw<20||dh<20)return null;
    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;
    canvas.getContext('2d').drawImage(v,x,y,dw,dh,0,0,160,160);
    return canvas.toDataURL('image/jpeg',0.72);
   }).filter(Boolean);
   setFaces(snapshots);setIndex(-1);setWinner(-1);
   if(!snapshots.length)setError(T(lang,'noFace'));
  }catch(e){setError(report(e))}finally{setBusy(false)}
 };
 const spin=()=>{if(!faces.length||timer.current)return;setWinner(-1);let count=0;
  timer.current=setInterval(()=>{count++;const n=Math.floor(Math.random()*faces.length);setIndex(n);if(count>=36){clearInterval(timer.current);timer.current=null;setWinner(n)}},90);
 };
 const stop=()=>{release();setFaces([]);setIndex(-1);setWinner(-1)};
 return <Panel title="Face Wheel" desc={T(lang,'wheelHint')}>
  <p className="learning-notice"><ShieldCheck size={17}/>{T(lang,'notSaved')}</p>
  {!running&&<CameraPermissionGate lang={lang} busy={busy} error={error} onRequest={begin}/>}
  <div className="camera-layout"><div className="camera-view"><video ref={video} autoPlay playsInline muted style={{display:running?'block':'none'}}/>{!running&&<div className="camera-empty"><Camera size={46}/>{T(lang,'startCamera')}</div>}</div><div className="faces-view">
   <strong>{T(lang,'detected')}: {faces.length}</strong>
   {faces.length>0?<><div className="face-grid">{faces.map((f,i)=><img key={i} alt={'face '+(i+1)} src={f} className={'face-thumb '+(index===i?'selected':'')}/>)}</div>{winner>=0&&<div className="winner"><Trophy size={21}/> {T(lang,'winner')} #{winner+1}</div>}</>:<small>{T(lang,'noFace')}</small>}
  </div></div>
  {running&&<div className="learning-actions"><Button onClick={scan} disabled={busy}><Users size={17}/>{T(lang,'scan')}</Button><Button disabled={!faces.length||busy} onClick={spin}><Play size={17}/>{T(lang,'spin')}</Button><button className="learning-secondary" onClick={stop}><CameraOff size={17}/>{T(lang,'closeCamera')}</button></div>}
  {running&&<Msg error={error}/>}
 </Panel>;
}

function QuizHost({lang}){
 const [title,setTitle]=useState('Информатика блиц'),[items,setItems]=useState(starters),[rows,setRows]=useState([]),[active,setActive]=useState(null),[answers,setAnswers]=useState([]),[keys,setKeys]=useState([]),[qr,setQr]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async()=>{try{setRows(await learningApi.quizzes());}catch(e){setError(report(e))}};
 useEffect(()=>{load()},[]);
 useEffect(()=>{if(!active)return;const url=window.location.origin+'/?join='+encodeURIComponent(active.id);QRCode.toDataURL(url,{margin:2,width:170,errorCorrectionLevel:'M'}).then(setQr).catch(()=>setQr(''));},[active?.id]);
 useEffect(()=>{if(!active)return;const unsub=learningApi.listenResponses(active.id,setAnswers,e=>setError(report(e)));return()=>unsub()},[active?.id]);
 useEffect(()=>{if(!active)return;learningApi.quizKey(active.id).then(setKeys).catch(e=>setError(report(e)));},[active?.id]);
 const edit=(i,k,value)=>setItems(v=>v.map((q,j)=>i===j?{...q,[k]:value}:q));
 const create=async()=>{setBusy(true);setError('');try{const q=await learningApi.createQuiz({title,items});setActive(q);setAnswers([]);setKeys(items.map(x=>x.correct));await load()}catch(e){setError(report(e))}finally{setBusy(false)}};
 const counts=useMemo(()=>{const map=new Map();answers.forEach(a=>{const uid=a.participant_uid;const prev=map.get(uid)||{uid,alias:a.alias,correct:0,answers:0};prev.answers++;if(keys[a.question_index]===a.option_index)prev.correct++;map.set(uid,prev)});return Array.from(map.values()).sort((a,b)=>b.correct-a.correct)},[answers,keys]);
 const link=active?window.location.origin+'/?join='+active.id:'';
 return <Panel title="Live Quiz" desc={T(lang,'quizDesc')}>
  {!active&&<><div className="learning-form"><label>{T(lang,'quizName')}<input value={title} maxLength={100} onChange={e=>setTitle(e.target.value)}/></label></div>
  <div className="question-list">{items.map((q,i)=><div key={i} className="learning-question"><header><strong>{T(lang,'question')} #{i+1}</strong>{items.length>1&&<button title="Remove" onClick={()=>setItems(v=>v.filter((_,j)=>j!==i))}><Trash2 size={17}/></button>}</header><input aria-label="Question" value={q.prompt} onChange={e=>edit(i,'prompt',e.target.value)}/><div className="option-grid">{q.options.map((o,j)=><label key={j}><span>{String.fromCharCode(65+j)}</span><input value={o} maxLength={90} onChange={e=>edit(i,'options',q.options.map((x,k)=>k===j?e.target.value:x))}/><input type="radio" name={'correct-'+i} checked={q.correct===j} onChange={()=>edit(i,'correct',j)} title={T(lang,'correct')}/></label>)}</div></div>)}</div>
  <div className="learning-actions"><button className="learning-secondary" onClick={()=>setItems(v=>v.length<10?[...v,{prompt:'',options:['','','',''],correct:0}]:v)}><Plus size={16}/>{T(lang,'addQuestion')}</button><Button disabled={busy} onClick={create}><Play size={16}/>{T(lang,'create')}</Button></div></>}
  {active&&<><div className="room-header"><div><small>{T(lang,'room')}</small><h3>{active.title}</h3><code>{active.id}</code><p><a href={link} target="_blank" rel="noopener noreferrer">{link}</a></p></div>{qr&&<img src={qr} width="165" height="165" alt="QR link to quiz"/>}</div>
   <div className="learning-actions"><button className="learning-secondary" onClick={()=>navigator.clipboard.writeText(link)}><Copy size={16}/>{T(lang,'copy')}</button>{active.status==='open'&&<Button onClick={async()=>{try{await learningApi.closeQuiz(active.id);setActive({...active,status:'closed'});await load()}catch(e){setError(report(e))}}}><Square size={16}/>{T(lang,'closeRoom')}</Button>}<button className="learning-secondary" onClick={()=>{setActive(null);setAnswers([])}}><X size={16}/>{T(lang,'finish')}</button></div>
   <h3 className="section-title">{T(lang,'results')} · {counts.length} {T(lang,'participants')}</h3><p className="learning-notice">{T(lang,'scoreDemo')}</p>
   <div className="leaderboard">{counts.map((p,i)=><div key={p.uid} className="leader-row"><span>#{i+1}</span><b>{p.alias}</b><span>{p.correct}/{active.questions.length}</span><strong>{p.correct*20} XP</strong></div>)}</div>
  </>}
  {!active&&rows.length>0&&<div className="previous-quizzes"><h3>{T(lang,'results')}</h3>{rows.map(q=><button key={q.id} onClick={()=>{setActive(q);setAnswers([])}}>{q.title} · {q.status==='open'?'● Live':'Closed'} <ArrowRight size={16}/></button>)}</div>}
  <Msg error={error}/>
 </Panel>;
}
export function QuizGuest({lang='kk',roomId=''}){
 const [room,setRoom]=useState(roomId),[quiz,setQuiz]=useState(null),[name,setName]=useState('Қатысушы'),[position,setPosition]=useState(0),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async()=>{setBusy(true);setError('');try{await learningApi.ensureGuest();const q=await learningApi.getQuiz(room.trim());setQuiz(q);setPosition(0);setSent(false)}catch(e){setError(e.code==='auth/operation-not-allowed'?T(lang,'needAnonymous'):report(e))}finally{setBusy(false)}};
 useEffect(()=>{if(!roomId)return;load()},[roomId]);
 useEffect(()=>{if(!quiz)return;const unsub=learningApi.listenRoom(quiz.id,setQuiz,e=>setError(report(e)));return()=>unsub()},[quiz?.id]);
 const submit=async i=>{setBusy(true);setError('');try{await learningApi.submitQuizAnswer(quiz.id,position,i,name);setSent(true)}catch(e){setError(report(e))}finally{setBusy(false)}};
 const next=()=>{setPosition(x=>x+1);setSent(false)};
 return <div className="guest-page"><div className="guest-card"><div className="guest-brand">✦ CodeQuest AI · Live Quiz</div><h1>{T(lang,'guestWelcome')}</h1>
  {!quiz?<><label>{T(lang,'enterRoom')}<input value={room} onChange={e=>setRoom(e.target.value)}/></label><p>{T(lang,'guestCheck')}</p><Button onClick={load} disabled={busy||room.trim().length<10}>{T(lang,'join')}<ArrowRight size={16}/></Button></>:
  <><h2>{quiz.title}</h2><p>{quiz.status!=='open'?T(lang,'roomClosed'):(position+1)+' / '+quiz.questions.length}</p>
   {quiz.status==='open'&&position<quiz.questions.length&&<><label>{T(lang,'nickname')}<input maxLength={24} value={name} onChange={e=>setName(e.target.value)}/></label><div className="guest-question"><h3>{quiz.questions[position].prompt}</h3><div>{quiz.questions[position].options.map((o,i)=><button disabled={sent||busy} key={i} onClick={()=>submit(i)}><b>{String.fromCharCode(65+i)}</b>{o}</button>)}</div></div>{sent&&<><p className="learning-success"><CheckCircle2 size={17}/>{T(lang,'answerSent')}</p>{position+1<quiz.questions.length?<Button onClick={next}>{T(lang,'next')}<ArrowRight size={16}/></Button>:<p>{T(lang,'finish')} ✓</p>}</>}</>}
  </>}<Msg error={error}/></div></div>
}

function Gesture({lang}){
 const video=useRef(null),stream=useRef(null),model=useRef(null),raf=useRef(0),wasPinch=useRef(false),choice=useRef(-1),qIndexRef=useRef(0);
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[picked,setPicked]=useState(-1),[question,setQuestion]=useState(0),[xp,setXp]=useState(0),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const answer=n=>{if(!Number.isInteger(n)||n<0||n>3||choice.current>=0)return;choice.current=n;setPicked(n);setXp(v=>v+(gentle[qIndexRef.current%gentle.length].correct===n?20:0));setNotice(gentle[qIndexRef.current%gentle.length].info)};
 const stop=()=>{cancelAnimationFrame(raf.current);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;model.current?.close?.();model.current=null;setEnabled(false);wasPinch.current=false};
 useEffect(()=>()=>{cancelAnimationFrame(raf.current);stream.current?.getTracks().forEach(t=>t.stop());model.current?.close?.()},[]);
 const start=async()=>{
  if(busy)return;
  setBusy(true);setError('');
  try{
   const track=await requestCamera({width:640,height:480});stream.current=track;
   if(video.current){video.current.srcObject=track;await video.current.play();}
   setEnabled(true);
   const {HandLandmarker,FilesetResolver}=await import('@mediapipe/tasks-vision');
   const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm');
   model.current=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:1});
   let lastFrame=-1;
   const loop=()=>{
    const v=video.current;if(v&&model.current&&v.videoWidth&&v.currentTime!==lastFrame){
      lastFrame=v.currentTime;
      const res=model.current.detectForVideo(v,performance.now()),lm=res.landmarks?.[0];
      if(lm){
       const option=Math.max(0,Math.min(3,Math.floor((1-lm[8].x)*4)));
       setPicked(prev=>choice.current>=0?prev:option);
       const dist=Math.hypot(lm[8].x-lm[4].x,lm[8].y-lm[4].y);
       const isPinch=dist<0.055;
       if(isPinch&&!wasPinch.current&&choice.current<0)answer(option);
       wasPinch.current=isPinch;
      }
    }
    raf.current=requestAnimationFrame(loop);
   };loop();
  }catch(e){
   const isCameraIssue=['NotAllowedError','PermissionDeniedError','SecurityError','NotFoundError','NotReadableError','InsecureContextError','OverconstrainedError'].includes(e?.name)||!stream.current;
   setError(isCameraIssue?cameraAccessError(e,lang):T(lang,'gestureModelError')+' '+report(e));stop();
  }finally{setBusy(false)}
 };
 const next=()=>{choice.current=-1;qIndexRef.current+=1;setPicked(-1);setNotice('');setQuestion(x=>x+1)};
 const q=gentle[question%gentle.length];
 return <Panel title="Gesture Game" desc={T(lang,'gestureDesc')}>
  <p className="learning-notice"><ShieldCheck size={17}/>{T(lang,'privateInfo')}</p>
  {!enabled&&<CameraPermissionGate lang={lang} busy={busy} error={error} onRequest={start}/>}
  <div className="gesture-layout"><div className="gesture-camera"><video ref={video} muted playsInline autoPlay style={{display:enabled?'block':'none'}}/>{!enabled&&<Hand size={45}/>}</div><div className="gesture-task"><b>{T(lang,'points')}: {xp}</b><h3>{q.q}</h3><div className="gesture-options">{q.options.map((o,i)=><button key={i} className={(picked===i?'hovered ':'')+(choice.current===i?'chosen':'')} disabled={choice.current>=0} onClick={()=>answer(i)}>{String.fromCharCode(65+i)} · {o}</button>)}</div>{notice&&<><p>{notice}</p><Button onClick={next}>{T(lang,'next')}<ArrowRight size={16}/></Button></>}</div></div>
  {enabled&&<div className="learning-actions"><button className="learning-secondary" onClick={stop}><CameraOff size={17}/>{T(lang,'stop')}</button></div>}
  <p className="learning-notice">{T(lang,'gestureTip')}</p>
 </Panel>;
}
function Tutor({lang}){
 const [topic,setTopic]=useState(0),[step,setStep]=useState(0),[showAnswer,setShowAnswer]=useState(false);
 const item=topics[topic];
 return <Panel title={T(lang,'tutor')} desc={T(lang,'tutorIntro')}>
  <label className="learning-topic">{T(lang,'topic')}<select value={topic} onChange={e=>{setTopic(Number(e.target.value));setStep(0);setShowAnswer(false)}}>{topics.map((v,i)=><option key={i} value={i}>{v.name}</option>)}</select></label>
  <div className="tutor-box"><div className="tutor-avatar"><BrainCircuit size={26}/></div><p>{item.hints[step]}</p></div>
  {showAnswer&&<p className="tutor-answer">{item.answer}</p>}
  <div className="learning-actions"><Button onClick={()=>setStep(i=>(i+1)%item.hints.length)}><Sparkles size={16}/>{T(lang,'guide')}</Button><button className="learning-secondary" onClick={()=>setShowAnswer(v=>!v)}>{T(lang,'answer')}</button></div>
 </Panel>;
}
function Analytics({lang}){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 useEffect(()=>{learningApi.analytics().then(setRows).catch(e=>setError(report(e))).finally(()=>setBusy(false))},[]);
 return <Panel title={T(lang,'analytics')} desc={T(lang,'analyticsDesc')}>
  {busy&&<p>{T(lang,'loading')}</p>}<Msg error={error}/>{!busy&&!error&&!rows.length&&<p>{T(lang,'noAnalytics')}</p>}
  {rows.map((r,i)=><div key={i} className="analytics-row"><div><b>{r.title}</b><small>{r.participants} {T(lang,'participants')} · {r.answers} {T(lang,'answered')}</small></div><div className="analytics-bar"><span style={{width:r.accuracy+'%'}}/></div><strong>{r.accuracy}%</strong></div>)}
 </Panel>;
}
export function LearningStudio({section,user,lang='kk',students=[]}){
 if(section==='faceWheel')return <FaceWheel lang={lang}/>;
 if(section==='gestureGame')return <Gesture lang={lang}/>;
 if(section==='tutor')return <Tutor lang={lang}/>;
 const approved=user.role==='teacher'&&user.status==='approved'&&user.email_verified;
 if(!approved)return <Panel title={T(lang,section==='liveQuiz'?'quiz':section==='analytics'?'analytics':'classroom')} desc={T(lang,'approvedOnly')}><p className="learning-notice"><ShieldCheck size={18}/>{T(lang,'approvedOnly')}</p></Panel>;
 if(section==='classrooms')return <Classrooms lang={lang} students={students}/>;
 if(section==='liveQuiz')return <QuizHost lang={lang}/>;
 if(section==='analytics')return <Analytics lang={lang}/>;
 return <Tutor lang={lang}/>;
}
