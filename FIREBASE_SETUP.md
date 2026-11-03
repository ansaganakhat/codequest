# CodeQuest AI — Firebase integration (CodeQuest AI web app configured)

The Firebase web configuration for project `codequest-1bfc6` is already included in `frontend/.env.production`. These values are **public client identifiers**, not administrator credentials. No Netlify environment-variable access is necessary to build the Firebase app.

**To enable registrations:** Firebase Console → Authentication → Sign-in method → Email/Password (enable); Firestore Database (create if missing); Firestore Database → Rules → paste `firestore.rules` from this repository → Publish. Then create the first trusted admin and seed school/subject catalogues following the steps below. Only publish rules you have reviewed for your intended deployment. **Never enable Firestore test mode.**



The existing Netlify site is built with Firebase web configuration, but remains a safe preview if Firestore or its access rules are unavailable. This integration uses the official Firebase JavaScript SDK and needs no ChatGPT integration.

## IMPORTANT — registration launch checklist

Firebase web config is connected and the limited **test registration** gate is set to `VITE_FIREBASE_REGISTRATION_ENABLED=true` in `frontend/.env.production`, based on the project owner's confirmation that Firestore rules were published. The website still checks public Firestore catalogue read access before enabling its buttons. **Actual live signup has not yet been manually verified.**
Before opening registration to even synthetic/test accounts:
1. Create Firestore database (production mode, not test mode).
2. Publish and verify the repository's `firestore.rules`; confirm public reads for schools/subjects and deny student/user data cross-role.
3. Enable Firebase Authentication Email/Password; authorize `codequest-ai-ansagan.netlify.app`.
4. Seed public schools and subject collections from trusted Admin SDK context.
5. Provision a trusted admin account with the provided CLI script and Firebase custom claim.
6. Limited test sign-up is already flagged on for this Firebase project. Confirm Email/Password is Enabled, verify the Rules are exactly as committed, and test with **fictional adult accounts only** before production use.

Because this site's Netlify environment-variable update endpoint returned HTTP 403, the public Firebase web configuration and the non-secret rollout flag are managed in the checked-in `frontend/.env.production` file.
## Implemented
- Firebase Authentication: email/password sign-up/login/logout and verification emails.
- Firestore collections: users, students, schools, subjects.
- Teachers remain pending until a trusted administrator approves them. They may list ONLY approved students at their approved school.
- Parents can add and edit pending child records after confirming their email address.
- Administrator authority is based on Firebase Auth custom claims (admin:true), never on a self-edited profile role.
- 13 Astana schools and 17 subjects have Kazakh, Russian and English labels.
- National identification numbers (IIN) and child photos are NOT accepted in Firebase mode. The browser adapter does not write them.

## 1. Create the Firebase project
1. Open https://console.firebase.google.com/ and create a project named CodeQuest AI.
2. Project overview → Add app → Web → register CodeQuest Web.
3. Note the public web config: apiKey, authDomain, projectId and appId.
4. Authentication → Sign-in method → enable Email/Password.
5. Authentication → Settings → Authorized domains → add codequest-ai-ansagan.netlify.app and localhost.
6. Firestore Database → Create database → production mode; choose the region.

## 2. Configure the frontend locally
From frontend/:

    npm install
    Copy-Item .env.firebase.example .env.local

Fill four variables in .env.local:

    VITE_FIREBASE_API_KEY=YOUR_WEB_API_KEY
    VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT
    VITE_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID

Then run npm run dev and open http://localhost:5173.

## 3. Deploy Firestore access rules
From the repo root:

    npx firebase-tools@latest login
    npx firebase-tools@latest deploy --project YOUR_PROJECT_ID --only firestore:rules,firestore:indexes

Do not enable test mode / broad read/write access. Review and test firestore.rules with Firebase Rules Playground or the local emulator. Verify that parents cannot approve children and teachers cannot list pupils from other schools.

## 4. Seed public schools and subjects
On a trusted local computer, download a Firebase service-account JSON file from Project settings → Service accounts. Keep it outside GitHub and never send it in chat.

    cd frontend
    npm install
    $env:GOOGLE_APPLICATION_CREDENTIALS='C:\secrets\firebase-service-account.json'
    npm run firebase:seed

The script writes 13 non-sensitive school records and 17 subject records.

## 5. Provision the first administrator
Register as an ordinary parent using your admin email (without IIN). In Firebase Console → Authentication → Users, copy its Auth UID. With the Admin service account configured on a trusted machine:

    npm run firebase:admin -- YOUR_FIREBASE_AUTH_UID

This grants Firebase Auth custom claim admin:true and sets the profile to approved admin. Sign out and sign in again to refresh claims. Never create admin users through the browser.

## 6. Activate in Netlify
Open https://app.netlify.com/projects/codequest-ai-ansagan → Environment variables.
The project's public web config is already committed in frontend/.env.production and deployed through GitHub. You do NOT need to repeat the Netlify environment-variable step.
The site is https://codequest-ai-ansagan.netlify.app . Without config it remains catalogue-only preview.

## Important release restrictions
- Do not test with real children or real IIN until verified guardianship, consent, staff identity checks and secure server-side encryption are implemented.
- Photo uploads are disabled in this Firebase trial; use a private storage architecture and billing review before enabling.
- Firebase Auth and Firestore require the correct Firestore rules to work together; changes are not automatic until rules are deployed.
- Admin interface intentionally does not delete Firebase Auth accounts, because deleting only a Firestore profile would leave an orphaned login.
- Previous Supabase and FastAPI work is retained, but there is no automatic data synchronization or migration.

Docs: https://firebase.google.com/docs/web/setup and https://firebase.google.com/docs/firestore/security/get-started
