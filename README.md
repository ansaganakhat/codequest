# CodeQuest AI — мектептік платформа (MVP v0.4)

**Жаңа функциялар (1–3 кезең):** Менің сыныптарым, Live Quiz + QR, Face Wheel (жергілікті камера), Gesture Game, ережеге негізделген оқу көмекшісі, викторина аналитикасы. **Іске қосу және жаңа Firestore Rules:** [LEARNING_STUDIO_SETUP_KK.md](LEARNING_STUDIO_SETUP_KK.md).

**Ескерту:** GitHub жаңартуы Firestore Rules-ті автоматты жарияламайды; жаңа cloud-функцияларды қолдану үшін құжаттағы ережелер мен Anonymous Firebase Auth-ты қосу керек. ЖСН мен бала фотосы Firebase сынақ нұсқасында қабылданбайды.

**Firebase сынақ интеграциясы дайын:** [FIREBASE_SETUP.md](FIREBASE_SETUP.md). Firebase веб-конфигурациясы қосылмайынша онлайн сайт қауіпсіз preview режимінде қалады. Firebase сынағы ЖСН және балалардың фотоларын қабылдамайды. Бұрынғы FastAPI/Supabase коды жойылған жоқ.

Қазақша негізгі, орысша және ағылшынша қосымша. Teacher / Parent / Admin.

## v0.3 — Астана мектептері және тіркелу өрістері
- Мұғалім мен ата-ана тіркелгенде **Тегі**, **Аты**, **Әкесінің аты** (бар болса) жеке толтырылады; сервер толық аты-жөнін жинақтап, бөлінген мәндерді бөлек сақтайды.
- **Құпиясөз** пен **Құпиясөзді қайталау** міндетті және екеуінің сәйкестігін сервер тексереді. Растау паролі деректер қорына сақталмайды.
- Сен ұсынған **13 Астана мектебі** қосылды: №1–11, №16, №17. №12–15 және №18–24 туралы дерек жіберілмеген, сондықтан ойдан қоспадық. Мектеп атауы, көшесі, ауданы қазақша/орысша/ағылшынша сақталады; тіркелу өрісінде тілге сай шығады.
- **17 педагогикалық бағыт** (тілдер, STEM, тарих/құқық, өнер/спорт, АӘТД, бастауыш) үш тілде тіркелген және мұғалімнің пән таңдау checkbox тізімінен табылады.
- Бұрынғы SQLite/PostgreSQL базасы іске қосылғанда жаңа бағандар қосылады (additive migration). Бар пайдаланушылардың ескі `full_name` мәні сақталады; жаңа бөлінген бағандары әкімші түзеткенге дейін бос болуы мүмкін.
- Бұл каталогтағы мекенжайлар пайдаланушы берген мәліметтен алынды; **ресми растау жүргізілген жоқ**.

## Implemented
- Мұғалім тіркелуі: аты-жөні, ЖСН, телефон, email, құпиясөз, мектеп, бір немесе бірнеше пән. Әкімші растағанша оқушылар тізіміне рұқсат жоқ.
- Ата-ана тіркелуі, өз баласын ЖСН, аты-жөні, сыныбы, мектебі бойынша қосу, өңдеу және фото жүктеу. Баланың дерегі әкімші растағанша каталогта көрінбейді.
- Әкімші: пайдаланушы мен оқушының дерегін өңдеу, растау, қабылдамау, мектеп қосу және өңдеу, қажет болса жазбаны жою.
- Мұғалім: тек өзі бекітілген мектептегі расталған оқушыларды іздеу, олардың аты-жөнін, сыныбын, мектебін, фотосын көру. ЖСН мұғалім интерфейсіне/API жауабына берілмейді.
- PostgreSQL немесе SQLite. Қорғалған фото, шифрланған ЖСН (Fernet), ЖСН-ді қайталатпау үшін HMAC, пароль хеші, HTTP-only cookie.

## Launch (Windows PowerShell)
Install Python 3.11+ and Node.js 20+.

Clone this repo: https://github.com/ansaganakhat/codequest
Open the backend directory and run:

    py -3.11 -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -r requirements.txt
    Copy-Item .env.example .env

Generate an encryption key:

    .\.venv\Scripts\python.exe -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

Put that key in backend/.env after IIN_ENCRYPTION_KEY=. Back it up securely; losing it makes saved IDs unreadable. Do not commit secrets.

    .\.venv\Scripts\python.exe create_admin.py
    .\.venv\Scripts\python.exe -m uvicorn app:app --reload

Open a second terminal in frontend/:

    npm install
    npm run dev

Open http://localhost:5173 . Backend documentation: http://localhost:8000/docs

Initially 3 demo schools appear. Add your own actual schools through the admin panel.

## Persistent PostgreSQL
Set DATABASE_URL to postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE in backend/.env. Optional local docker compose file included.
Database tables: users, schools, subjects, teacher_subjects, students, sessions, audit_logs.
SQLite defaults to ./codequest.db in the backend working directory.

## Tests
Within backend/: python -m pytest -q

## Important privacy and release warning
Do not put real children's identifiers into a public demo before verifying the guardian-child relationship, school staff affiliation, consent requirements and operational security. Teacher approvals and student verification in this MVP are manual administrator actions; confirming email/phone ownership is not yet built. Public GitHub contains SOURCE CODE ONLY; real data stays on your configured database. Real deployment needs persistent private image/object storage, backup, secure TLS cookies, HTTPS and migrations.

Not yet implemented: lesson editor, CV games, learning analytics, child self-login, reset-password, production-grade identity proofing.
Figma: https://www.figma.com/design/k3xOHYIZFouKkdZji9OIgj/Untitled?node-id=3-6