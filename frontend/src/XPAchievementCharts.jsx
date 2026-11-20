import React,{useMemo,useState} from 'react';
import {Activity,BrainCircuit,CalendarDays,GitBranch,LockKeyhole,Medal,MousePointer2} from 'lucide-react';
import {almatyDay} from './xp.js';
import {heatmapDays,getKnowledgeMilestones,summarizeXpActivity} from './xp-analytics.js';
import './xp-analytics.css';

const messages={
 kk:{radar:'Skill Radar — Қабілеттер картасы',radarInfo:'Пәндік қабілеттерді бағалау үшін тақырыпқа байланыстырылған тест нәтижелері қажет. Әзірге пайыздар көрсетілмейді.',heat:'Activity Heatmap — Оқу белсенділігі',heatInfo:'Күнді таңдасаңыз, сол күнгі жиналған XP көрсетіледі.',tree:'Knowledge Tree — Білім ағашы',treeInfo:'Ағаштың бұтақтары орындалған ойындық әрекеттер бойынша ашылады. Бұл пәнді меңгеру бағасы емес.',day:'Күнделікті челлендж',gesture:'Gesture Game',quiz:'Live Quiz',empty:'Әзірге дерек жоқ',days:'Белсенді күн',events:'XP берілген әрекет',earned:'Жиналған XP',skillNames:['Python','Логика','Алгоритм','SQL','Веб','ЖИ'],active:'Ашылды',locked:'Әлі ашылмады',less:'Аз',more:'Көп',sample:'Нақты деректер',unit:'XP'},
 ru:{radar:'Skill Radar — Карта навыков',radarInfo:'Для оценки предметных навыков нужны результаты тестов с привязкой к темам. Проценты пока не отображаются.',heat:'Activity Heatmap — Активность',heatInfo:'Выберите день, чтобы увидеть заработанные XP.',tree:'Knowledge Tree — Дерево знаний',treeInfo:'Ветви открываются по выполненным игровым действиям. Это не оценка освоения предмета.',day:'Ежедневное задание',gesture:'Gesture Game',quiz:'Live Quiz',empty:'Пока нет данных',days:'Активных дней',events:'Действий с XP',earned:'Получено XP',skillNames:['Python','Логика','Алгоритмы','SQL','Веб','ИИ'],active:'Открыто',locked:'Не открыто',less:'Меньше',more:'Больше',sample:'Реальные данные',unit:'XP'},
 en:{radar:'Skill Radar — Skills map',radarInfo:'Subject mastery requires quiz results tagged by topic. No percentages are shown until those data exist.',heat:'Activity Heatmap — Learning activity',heatInfo:'Select a day to see XP earned on that day.',tree:'Knowledge Tree — Learning tree',treeInfo:'Branches unlock based on completed game activities, not verified subject mastery.',day:'Daily challenge',gesture:'Gesture Game',quiz:'Live Quiz',empty:'No data yet',days:'Active days',events:'XP-awarding actions',earned:'XP earned',skillNames:['Python','Logic','Algorithms','SQL','Web','AI'],active:'Unlocked',locked:'Locked',less:'Less',more:'More',sample:'Live account data',unit:'XP'}
};
const colors=['#EBE9FB','#D2C5FB','#A88AF5','#7952EE','#5133BB'];
function SkillRadar({l}){
 const cx=160,cy=125,r=83;
 const xy=(i,scale)=>{const a=(i*60-90)*Math.PI/180;return [cx+Math.cos(a)*r*scale,cy+Math.sin(a)*r*scale]};
 return <article className="xp-chart-card"><div className="xp-chart-heading"><BrainCircuit size={21}/><h3>{l.radar}</h3></div>
  <svg className="xp-radar-svg" viewBox="0 0 320 258" role="img" aria-label={l.radar}>
   {[.25,.5,.75,1].map(level=><polygon key={level} points={l.skillNames.map((_,i)=>xy(i,level).join(',')).join(' ')} fill={level===1?'#F6F2FF':'none'} stroke="#C5B8F2" strokeWidth="1"/>)}
   {l.skillNames.map((name,i)=>{const [x,y]=xy(i,1),[tx,ty]=xy(i,1.33);return <g key={name}><path d={`M ${cx} ${cy} L ${x} ${y}`} stroke="#C5B8F2" strokeWidth="1" strokeDasharray="3 4"/><text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="600" fill="#4C427F">{name}</text><circle cx={x} cy={y} r="4" fill="#B6A6E7"/></g>})}
   <circle cx={cx} cy={cy} r="14" fill="#7952EE" opacity=".13"/>
   <text x={cx} y={cy+4} fontSize="12" textAnchor="middle" fill="#7952EE">?</text>
  </svg>
  <div className="xp-chart-note"><LockKeyhole size={17}/><span>{l.radarInfo}</span></div>
 </article>;
}
function Heatmap({events,l}){
 const [range,setRange]=useState(91),[selected,setSelected]=useState(null);
 const days=useMemo(()=>heatmapDays(events,almatyDay(),range),[events,range]);
 const stats=useMemo(()=>summarizeXpActivity(events),[events]);
 const chosen=selected&&days.some(d=>d.date===selected)?days.find(d=>d.date===selected):days[days.length-1];
 const level=n=>n===0?0:n<30?1:n<70?2:n<120?3:4;
 return <article className="xp-chart-card"><div className="xp-chart-heading"><CalendarDays size={21}/><h3>{l.heat}</h3></div>
  <div className="xp-heat-options"><button aria-pressed={range===35} className={range===35?'selected':''} onClick={()=>{setRange(35);setSelected(null)}}>35</button><button aria-pressed={range===91} className={range===91?'selected':''} onClick={()=>{setRange(91);setSelected(null)}}>91</button><span>{l.days}: {stats.activeDays}</span></div>
  <div className="xp-heat-grid" style={{gridTemplateColumns:`repeat(${Math.ceil(range/7)},minmax(0,1fr))`}} aria-label={l.heat}>
   {days.map(day=><button key={day.date} type="button" className={'xp-heat-cell'+(chosen?.date===day.date?' selected':'')} style={{backgroundColor:colors[level(day.xp)]}} title={day.date+': '+day.xp+' XP'} aria-label={day.date+': '+day.xp+' XP'} aria-pressed={chosen?.date===day.date} onClick={()=>setSelected(day.date)}/>)}
  </div>
  <div className="xp-heat-legend"><span>{l.less}</span>{colors.map(x=><i key={x} style={{backgroundColor:x}}/>)}<span>{l.more}</span></div>
  <div className="xp-heat-detail"><Activity size={19}/><strong>{chosen?.date||'—'}</strong><span>{chosen?.xp||0} XP</span></div>
  <p className="xp-caption">{l.heatInfo}</p>
 </article>;
}
function KnowledgeTree({events,l}){
 const nodes=getKnowledgeMilestones(events);
 const labels={daily:l.day,gesture:l.gesture,quiz:l.quiz};
 const positions=[{x:91,y:92},{x:255,y:91},{x:168,y:37}];
 const active=nodes.filter(n=>n.unlocked).length;
 return <article className="xp-chart-card xp-tree-card"><div className="xp-chart-heading"><GitBranch size={21}/><h3>{l.tree}</h3></div>
  <div className="xp-tree-stage">
   <svg viewBox="0 0 340 257" role="img" aria-label={l.tree} className="xp-tree-svg">
    <defs><linearGradient id="cq-trunk" x1="0" x2="1" y1="1" y2="0"><stop stopColor="#AD6B43"/><stop offset="1" stopColor="#F3BF76"/></linearGradient><radialGradient id="cq-glow"><stop stopColor="#7952EE" stopOpacity=".5"/><stop offset="1" stopColor="#7952EE" stopOpacity="0"/></radialGradient></defs>
    <circle cx="170" cy="124" r="123" fill="url(#cq-glow)"/>
    <path d="M170 236 C164 181 166 141 168 118 M168 149 C132 123 119 109 91 92 M168 121 C197 104 225 88 255 91 M168 118 C171 91 167 66 168 37" stroke="url(#cq-trunk)" strokeWidth="13" fill="none" strokeLinecap="round"/>
    {Array.from({length:18},(_,i)=>{let a=i*2.4;let x=170+Math.sin(a)*(.8+(i%4)*12)+Math.cos(a)*60,y=103+Math.cos(a*1.37)*48;return <ellipse key={i} cx={x} cy={y} rx={9+i%3*4} ry={5+i%4*2} fill={i%3===0?'#8C6DE8':'#43CAA8'} opacity={.23+(i%4)*.12} transform={`rotate(${i*35} ${x} ${y})`}/>})}
    {nodes.map((n,i)=>{const p=positions[i];return <g key={n.id}><circle cx={p.x} cy={p.y} r="28" fill={n.unlocked?'#34205F':'#3C3D62'} stroke={n.unlocked?'#B39CFF':'#78819C'} strokeWidth="2"/><text x={p.x} y={p.y+5} textAnchor="middle" fontSize="17" fill="white">{n.unlocked?'✓':'🔒'}</text></g>})}
    <path d="M116 243 Q170 226 225 243" stroke="#D5A570" strokeWidth="9" strokeLinecap="round" fill="none"/>
   </svg>
   <div className="xp-tree-overlay">{nodes.map((n,i)=><div key={n.id} className={'xp-tree-badge n'+i}><span>{labels[n.id]}</span><strong>{n.count} · {n.unlocked?l.active:l.locked}</strong></div>)}</div>
  </div>
  <div className="xp-tree-progress"><Medal size={18}/><b>{active} / {nodes.length}</b><div className="xp-tree-meter"><span style={{width:(active/nodes.length*100)+'%'}}/></div></div>
  <p className="xp-caption">{l.treeInfo}</p>
 </article>;
}
export function XPAchievementCharts({events=[],lang='kk'}){
 const l=messages[lang]||messages.kk;
 return <div className="xp-analytics-grid"><SkillRadar l={l}/><Heatmap events={events} l={l}/><KnowledgeTree events={events} l={l}/></div>;
}
