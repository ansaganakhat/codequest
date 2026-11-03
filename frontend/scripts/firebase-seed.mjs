/**
 * Run once (idempotent) on a trusted local machine using application-default
 * credentials / GOOGLE_APPLICATION_CREDENTIALS. This writes public catalogues.
 * Command: node scripts/firebase-seed.mjs
 */
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {previewSchools,previewSubjects} from '../src/catalog.js';
initializeApp({credential:applicationDefault()});
const db=getFirestore();
let writes=0;
for(const row of previewSchools){
  await db.collection('schools').doc(String(row.id)).set({...row,active:true},{merge:true});
  writes++;
}
for(const row of previewSubjects){
  await db.collection('subjects').doc(String(row.id)).set(row,{merge:true});
  writes++;
}
console.log('Seeded '+writes+' catalogue records (13 schools + 17 subjects)');
