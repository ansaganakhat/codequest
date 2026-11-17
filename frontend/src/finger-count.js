// MediaPipe HandLandmarker: count extended index/middle/ring/pinky fingers.
// Thumb is intentionally ignored so 1..4 maps consistently to A..D.
export function countRaisedFingers(landmarks){
 if(!Array.isArray(landmarks)||landmarks.length<21)return 0;
 const d=(a,b)=>Math.hypot(landmarks[a].x-landmarks[b].x,landmarks[a].y-landmarks[b].y);
 let raised=0;
 for(const [tip,pip,mcp] of [[8,6,5],[12,10,9],[16,14,13],[20,18,17]]){
  const fingerLen=d(tip,mcp);
  const pipLen=d(pip,mcp);
  const wristTip=d(tip,0);
  const wristPip=d(pip,0);
  if(fingerLen>pipLen*1.35 && wristTip>wristPip*1.12)raised++;
 }
 return raised;
}
