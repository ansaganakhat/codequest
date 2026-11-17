// Teacher-only quiz export helpers. Source answers are read through teacher-only Firestore rules.
export function quizExportPayload(quiz,answers){
 if(!quiz||!Array.isArray(quiz.questions)||!Array.isArray(answers)||quiz.questions.length!==answers.length){
  throw new Error('quiz_export_incomplete');
 }
 return {
  title:String(quiz.title||'Quiz'),code:quiz.join_code||null,
  questions:quiz.questions.map((q,i)=>({
   number:i+1,question:String(q.prompt||''),
   options:[...q.options],correct_option:Number(answers[i])+1
  }))
 };
}
export function quizExportCSV(quiz,answers){
 const data=quizExportPayload(quiz,answers);
 const cell=v=>{
   let str=String(v??'');
   // Protect spreadsheet importers from formula injection, including Unicode whitespace.
   if(/^[\s\uFEFF]*[=+\-@]/.test(str))str="'"+str;
   return '"'+str.replace(/"/g,'""')+'"';
 };
 const rows=[['№','Сұрақ','A','B','C','D','Дұрыс жауап'],...data.questions.map(q=>[
  q.number,q.question,...q.options,String.fromCharCode(64+q.correct_option)
 ])];
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
export function quizExportHTML(quiz,answers){
 const data=quizExportPayload(quiz,answers);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const items=data.questions.map(q=>'<article><h3>'+q.number+'. '+esc(q.question)+'</h3><ol type="A">'+q.options.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ol></article>').join('');
 const keys=data.questions.map(q=>q.number+': '+String.fromCharCode(64+q.correct_option)).join(', ');
 return '<!DOCTYPE html><html lang="kk"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(data.title)+'</title><style>body{font:16px/1.65 Arial,sans-serif;max-width:850px;margin:35px auto;padding:0 24px;color:#17223b}h1{margin-bottom:5px}h3{margin:0 0 12px}article{margin:24px 0;break-inside:avoid}li{margin:7px 0}.answer-key{page-break-before:always;margin-top:40px;border-top:2px solid #aaa;padding-top:20px}@media print{body{margin:0}article{page-break-inside:avoid}}</style></head><body><h1>'+esc(data.title)+'</h1><p>CodeQuest AI · Quiz '+esc(data.code||'')+'</p>'+items+'<section class="answer-key"><h2>Мұғалімге арналған жауап кілті</h2><p>'+esc(keys)+'</p></section></body></html>';
}
export function downloadQuiz(quiz,answers,format='csv'){
 const data=quizExportPayload(quiz,answers);
 const text=format==='json'?JSON.stringify(data,null,2):format==='html'?quizExportHTML(quiz,answers):quizExportCSV(quiz,answers);
 const mime=format==='json'?'application/json;charset=utf-8':format==='html'?'text/html;charset=utf-8':'text/csv;charset=utf-8';
 const blob=new Blob([text],{type:mime});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 const label=String(quiz.title||'quiz').normalize('NFKD').replace(/[^\p{L}\p{N}-]+/gu,'_').slice(0,60)||'quiz';
 link.href=url;link.download=label+'.'+format;document.body.append(link);link.click();link.remove();
 // Cleanup after download has started.
 window.setTimeout(()=>URL.revokeObjectURL(url),30000);
}
