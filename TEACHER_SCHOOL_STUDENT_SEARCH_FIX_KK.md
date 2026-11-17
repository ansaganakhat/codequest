# CodeQuest AI — Teacher / School Student Directory fix (2026-11-17)

## Previous issue

A teacher logged in but the school's student search displayed no students.

**Code review found two causes:**
1. `firebaseApi.students()` and the teacher dashboard queried the `students` collection with **`status == approved`**. Parent-created student records initially have `status == pending` and therefore disappeared from the directory. The old two-field query also relies on a composite Firestore index.
2. `main.jsx` explicitly did `api.students(query).catch(()=>[])` (and `.catch(()=>{})` for search). A Firestore `permission-denied` or index error was therefore displayed as "no students" instead of a useful error.

## Fix

- A verified, **admin-approved** teacher gets a single-field query `where('school_id','==',Number(teacher.school_id))` from `students`. No custom composite index is needed.
- Teachers see their school's **pending** and **approved** child records (rejected child records are excluded in the UI). The existing status chip indicates whether the admin approved each student.
- Firestore rules allow **only** verified, approved teachers to read the `students` records for their **own** school, irrespective of whether individual student registration is still pending. Teachers still cannot write or approve the student record.
- Teacher dashboard counts use the same school-only query, instead of the approved-only composite query.
- Errors are no longer hidden; the directory displays a translated diagnostic with a **Retry** button. An unverified teacher can refresh email verification. The empty state explains that a parent must choose the correct school.
- Admin workflows, parent-only records, authentication accounts and class quizzes were not changed.

## Required Firebase security rules publication

**Important:** GitHub/Cloudflare deployment updates the frontend code, **not** the live Firestore rules. Until the updated rules are published, the new school-only query may be rejected with `permission-denied`; the page now displays that instead of silently showing zero students.

1. Open https://github.com/ansaganakhat/codequest/blob/main/firestore.rules and choose **Raw**. Copy the entire file.
2. Open https://console.firebase.google.com/project/codequest-1bfc6/firestore/rules
3. Replace the editor contents with the updated file and click **Publish**.
4. The teacher must have `users/{teacherUid}.role='teacher'`, `status='approved'`, `school_id` matching the student's numeric school ID, and a **verified email**.
5. The child must exist in `students` (created through the guardian's **Менің балаларым** flow) and must have `school_id` set to the same school. A standalone Firebase Authentication account without a `students` school record cannot be inferred as belonging to that school.
6. Reload the page using **Ctrl+F5**, open **Оқушыларды іздеу / School students**, and click **Retry**.

## Tests

Firebase Firestore Emulator verifies:
- An approved teacher reads pending and approved students from the teacher's own school using a single-field query.
- Querying another school's students is denied.
- An unverified or non-approved teacher is denied.
- An anonymous user or a parent querying the whole school is denied.

Note: A rejected student's record is not shown in the teacher UI, although the approved teacher's school-scoped Firestore read permission encompasses all records for that school. Teachers must have a legitimate school affiliation and access should be removed if they leave.
