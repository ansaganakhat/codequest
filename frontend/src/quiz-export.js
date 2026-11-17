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
export function downloadQuiz(quiz,answers,format='csv'){
 const data=quizExportPayload(quiz,answers);
 const text=format==='json'?JSON.stringify(data,null,2):quizExportCSV(quiz,answers);
 const mime=format==='json'?'application/json;charset=utf-8':'text/csv;charset=utf-8';
 const blob=new Blob([text],{type:mime});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 const label=String(quiz.title||'quiz').normalize('NFKD').replace(/[^\p{L}\p{N}-]+/gu,'_').slice(0,60)||'quiz';
 link.href=url;link.download=label+'.'+format;document.body.append(link);link.click();link.remove();
 // Cleanup after download has started.
 window.setTimeout(()=>URL.revokeObjectURL(url),30000);
}
