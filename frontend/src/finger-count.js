// A / B / C / D = index, middle, ring, pinky. The thumb is ignored.
// MediaPipe provides normalized 21-point landmarks per hand.
const distance=(points,a,b)=>Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y);
const fingerExtended=(points,tip,pip,mcp)=>
  distance(points,tip,mcp)>distance(points,pip,mcp)*1.35 &&
  distance(points,tip,0)>distance(points,pip,0)*1.12;

export function countRaisedFingers(landmarks){
 if(!Array.isArray(landmarks)||landmarks.length<21)return 0;
 return [[8,6,5],[12,10,9],[16,14,13],[20,18,17]]
   .filter(([tip,pip,mcp])=>fingerExtended(landmarks,tip,pip,mcp)).length;
}

// Real OK gesture: thumb tip (4) touches index tip (8), while middle,
// ring and pinky fingers are open. Relative distances work with both hands
// and at different camera distances.
export function isOkGesture(landmarks){
 if(!Array.isArray(landmarks)||landmarks.length<21)return false;
 const palm=Math.max(0.001,distance(landmarks,0,9));
 const touching=distance(landmarks,4,8)<palm*0.38;
 const indexFolded=!fingerExtended(landmarks,8,6,5);
 const otherFingersRaised=[[12,10,9],[16,14,13],[20,18,17]]
   .every(([tip,pip,mcp])=>fingerExtended(landmarks,tip,pip,mcp));
 return touching&&indexFolded&&otherFingersRaised;
}
