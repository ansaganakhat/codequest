/**
 * Convert a CodeQuest Live Quiz QR link or a Firestore room ID to an ID.
 * This parser does not contact the network and does not modify authentication.
 */
export function normalizeQuizRoomId(input){
  let candidate=String(input??'').trim();
  if(!candidate)throw new Error('quiz_room_invalid');
  if(/^codequest-ai-ansagan\.netlify\.app\//i.test(candidate))candidate='https://'+candidate;
  if(/^https?:\/\//i.test(candidate)){
    let url;
    try{url=new URL(candidate)}catch{throw new Error('quiz_room_invalid')}
    const sameSite=typeof window!=='undefined'&&url.origin===window.location.origin;
    if(!sameSite&&url.hostname!=='codequest-ai-ansagan.netlify.app'){
      throw new Error('quiz_room_foreign_link');
    }
    candidate=url.searchParams.get('join')||'';
  }else if(candidate.startsWith('/?')||candidate.startsWith('?')||candidate.startsWith('join=')){
    const query=candidate.startsWith('/?')?candidate.slice(1):candidate.startsWith('join=')?'?'+candidate:candidate;
    candidate=new URLSearchParams(query).get('join')||'';
  }
  if(!/^[A-Za-z0-9]{20}$/.test(candidate))throw new Error('quiz_room_invalid');
  return candidate;
}
