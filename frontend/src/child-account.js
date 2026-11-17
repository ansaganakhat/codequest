/**
 * The guardian supplies a REAL, reachable email for the child.
 * Never fabricate email inboxes: the child needs verification and password recovery.
 * Passwords are used only by Firebase Auth and never placed in Firestore.
 */
export function validateChildCredentials(raw) {
 const email=String(raw.email||'').trim().toLowerCase();
 const password=String(raw.password||'');
 const confirm=String(raw.password_confirm||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('child_email_invalid');
 if(password.length<10||password.length>128)throw new Error('child_password_invalid');
 if(password!==confirm)throw new Error('password_mismatch');
 if(raw.guardian_consent!==true)throw new Error('guardian_permission_required');
 return {email,password};
}
export function normalizeChildDetails(raw) {
 const full_name=String(raw.full_name||'').replace(/\s+/g,' ').trim();
 const grade=Number(raw.grade);
 const school_id=Number(raw.school_id);
 const class_letter=String(raw.class_letter||'').trim();
 if(full_name.length<3||full_name.length>130)throw new Error('invalid_child');
 if(!Number.isInteger(grade)||grade<1||grade>11)throw new Error('invalid_child');
 if(!Number.isInteger(school_id)||school_id<=0)throw new Error('invalid_child');
 if(!class_letter||class_letter.length>5)throw new Error('invalid_child');
 return {full_name,grade,school_id,class_letter};
}
export function childNameParts(name){
 const segments=String(name||'').trim().split(/\s+/);
 const [last_name='',first_name='',...middle]=segments;
 return {last_name,first_name:first_name||last_name,middle_name:middle.join(' ')};
}
