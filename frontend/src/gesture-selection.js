// Deterministic gesture-selection state machine: time is in milliseconds.
// Students may change their mind for as long as their fingers are visible.
export const GESTURE_FINGER_STABLE_MS=400; // Hold a finger count before changing highlighted answer.
export const GESTURE_RELEASE_MS=800;  // Missing fingers must persist (camera flicker protection).
export const GESTURE_OK_HOLD_MS=650;  // A deliberate OK sign, not one noisy frame.
export const GESTURE_NEXT_FEEDBACK_MS=950;

export function freshGestureSelection(blockOkUntilRelease=false){
 return {preview:-1,confirmed:-1,missingSince:null,okSince:null,blockOkUntilRelease,pendingCount:0,pendingSince:null};
}

/**
 * signal = {kind:'fingers',count:1..4} | {kind:'ok'} | {kind:'none'}
 * Return {state,event}; event = {type:'confirm'|'confirm_and_next'|'next',index?}
 */
export function advanceGestureSelection(previous,signal,at){
 const state={...previous};
 let event=null;
 const kind=signal?.kind||'none';

 if(kind==='ok'){
  state.missingSince=null;
  state.pendingCount=0;
  state.pendingSince=null;
  if(state.blockOkUntilRelease)return {state,event};
  if(state.okSince===null)state.okSince=at;
  if(at-state.okSince>=GESTURE_OK_HOLD_MS){
   if(state.confirmed>=0)event={type:'next'};
   else if(state.preview>=0){
    state.confirmed=state.preview;
    event={type:'confirm_and_next',index:state.confirmed};
   }
   if(event)state.blockOkUntilRelease=true;
  }
  return {state,event};
 }

 state.okSince=null;
 state.blockOkUntilRelease=false;
 if(state.confirmed>=0)return {state,event};

 if(kind==='fingers'&&Number.isInteger(signal.count)&&signal.count>=1&&signal.count<=4){
  state.missingSince=null;
  if(signal.count!==state.pendingCount){
   state.pendingCount=signal.count;
   state.pendingSince=at;
  }
  // A hand changing toward OK briefly resembles other finger counts.
  // Preserve the last stable selection until the new count is deliberate.
  if(state.pendingSince!==null&&at-state.pendingSince>=GESTURE_FINGER_STABLE_MS){
   state.preview=signal.count-1;
  }
 }else{
  state.pendingCount=0;
  state.pendingSince=null;
  if(state.preview>=0){
   if(state.missingSince===null)state.missingSince=at;
   if(at-state.missingSince>=GESTURE_RELEASE_MS){
    state.confirmed=state.preview;
    event={type:'confirm',index:state.confirmed};
   }
  }
 }
 return {state,event};
}
