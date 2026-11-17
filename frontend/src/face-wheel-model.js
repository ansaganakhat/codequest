/**
 * MediaPipe Tasks FaceDetector expects a BlazeFace model with 896 short-range
 * anchors. The full-range model produces 2304 and crashes at
 * TensorsToDetectionsCalculator (raw_box_tensor shape mismatch).
 * Keep full-frame + overlapping tile scans so classroom faces remain visible.
 */
export const FACE_WHEEL_MODEL_URL='https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

export function faceScanTiles(width,height){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return [];
 return [
  {x:0,y:0,w:width,h:height},
  {x:0,y:0,w:width*0.58,h:height*0.58},
  {x:width*0.42,y:0,w:width*0.58,h:height*0.58},
  {x:0,y:height*0.42,w:width*0.58,h:height*0.58},
  {x:width*0.42,y:height*0.42,w:width*0.58,h:height*0.58},
  {x:width*0.21,y:height*0.21,w:width*0.58,h:height*0.58}
 ];
}
