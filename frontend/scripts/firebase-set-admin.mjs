/**
 * Run on a trusted local computer ONLY, with GOOGLE_APPLICATION_CREDENTIALS
 * pointing to your Firebase Admin SDK service account JSON (NEVER commit it).
 * Command: node scripts/firebase-set-admin.mjs <firebase-auth-uid>
 */
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
const uid=process.argv[2];
if(!uid || uid.length<8){throw new Error('Pass a valid Firebase Auth UID');}
initializeApp({credential:applicationDefault()});
const auth=getAuth();
const user=await auth.getUser(uid);
if(!user.email || !user.emailVerified)throw new Error('Verify the administrator email in Firebase Authentication before granting admin privileges.');
const db=getFirestore();
const ref=db.doc('users/'+uid);
const existing=await ref.get();
if(!existing.exists)throw new Error('User profile not found; register the account first');
const claims={...(user.customClaims||{}),admin:true};
await auth.setCustomUserClaims(uid,claims);
await ref.update({role:'admin',status:'approved'});
console.log('Admin granted to '+user.email+'. User must sign out and sign in again to refresh the custom claim.');
