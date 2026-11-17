# CodeQuest AI → Cloudflare Pages көшіру нұсқаулығы

> Мақсаты: Netlify-дің ақылы лимитіне тәуелді болмай, **бұрынғы Firebase дерекқорын сол күйі** қалдырып, React/Vite сайтты және Gemini AI Tutor серверлік функциясын Cloudflare Pages-те іске қосу. Мұғалім/оқушы аккаунттары, Quiz, Face Wheel, Gesture Game, профиль өзгермейді.

## 0. Не көшіріледі және не көшірілмейді

| Бөлік | Жаңа орналасуы |
| --- | --- |
| React, Quiz, Face Wheel, Gesture Game, UI | Cloudflare Pages — `frontend/dist` |
| AI Tutor | Cloudflare Pages Function `POST /api/tutor` |
| Firebase Authentication | Өзгеріссіз, `codequest-1bfc6` |
| Cloud Firestore | Өзгеріссіз, ешқандай дерек көшіру жоқ |
| Gemini API кілті | **Cloudflare Secret** `GEMINI_API_KEY` |
| Ескі Netlify сайты | Жаңа сайт тексерілгенге дейін сақталады |

**Көшіру Firebase Security Rules ережелерін автоматты жарияламайды.** Қазіргі Firebase жобасында дұрыс ережелер жарияланған болуы тиіс.

## 1. Cloudflare Pages GitHub жобасын қосу

1. https://dash.cloudflare.com кір немесе тегін аккаунт аш.
2. Сол жақтан **Workers & Pages** → **Create application** → **Pages** → **Connect to Git** / **Import an existing Git repository** аш. Егер Cloudflare интерфейсі әуелі Workers ұсынса, дәл *Pages* түрін таңда.
3. **GitHub** таңда да Cloudflare GitHub App-қа рұқсат бер. Репозиторийге рұқсат тек қажетті `ansaganakhat/codequest` үшін жеткілікті.
4. Репозиторий: `ansaganakhat/codequest`.
5. **Begin setup**. Cloudflare жобасының аты ретінде `codequest-ai-ansagan` (қолжетімді болса) енгіз. Аты бос болмаса, басқа атау таңда; берілген нақты `*.pages.dev` URL-ді кейінгі қадамда қолданасың.

### Build параметрлері

| Өріс | Мәні |
| --- | --- |
| Production branch | `main` |
| Framework preset | `Vite` (немесе `React` / `None`) |
| **Root directory (advanced)** | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js | `22` (қажет болса Build environment: `NODE_VERSION=22`) |

**Өте маңызды:** Root directory `frontend` екенін тексер. Егер root репозиторийдің өзін көрсетсе, функциялар `frontend/functions` ішінде болғандықтан табылмайды.

**Save and Deploy** бас. Алғашқы жариялануда сайттың `https://<project>.pages.dev` URL-і шығады. Жарияланғанға дейін URL-ді ойдан жазба.

## 2. Gemini-ді толық қосу (сайт серверінде)

Cloudflare → **Workers & Pages → [жаңа Pages жоба] → Settings → Variables and Secrets** (интерфейске қарай «Environment variables» деп аталуы мүмкін).

**Production** үшін:
- **`GEMINI_API_KEY`** — Google AI Studio-дан алынған **Gemini API key**, FreeLLMAPI Unified кілті емес. Міндетті түрде **Encrypt / Secret** түрінде сақта.
- **`GEMINI_MODEL`** — `gemini-3.5-flash-lite` (міндетті емес; кодта әдепкіде осы модель қолданылады).

Егер өте қажет болса, интернетте тәулік бойы қосулы **бөлек HTTPS сервердегі** FreeLLMAPI резервтік опциясы да бар: `FREELLM_BASE_URL`, `FREELLM_API_KEY`, `FREELLM_MODEL`. `http://127.0.0.1:31415/v1` **Cloudflare-ден қолжетімсіз** және компьютер ұйқы режимінде жұмыс істемейді.

**Назар аудар:** API кілтін `VITE_` префиксімен жариялама, GitHub-қа қоспа, суретке түсірме, чатқа жіберме. Кілтті сақтағаннан кейін **Deployments → Retry deployment / Deploy latest commit** арқылы жаңа deploy жаса — құпия мән жаңа функцияға сол кезде беріледі.

## 3. Firebase авторизация доменін тіркеу

1. Cloudflare-дің нақты URL-ін көшір (мысалы, жобаның аты қабылданған жағдайда `https://codequest-ai-ansagan.pages.dev`).
2. https://console.firebase.google.com/project/codequest-1bfc6/authentication/settings бөліміне кір.
3. **Authorized domains** ішіне сайттың **домен бөлігін ғана** қос: `codequest-ai-ansagan.pages.dev` (немесе саған берілген басқа нақты домен), `https://` және соңғы `/` болмауы тиіс.
4. Кейін custom domain қолдансаң, оны да қос. Preview домендерімен аутентификацияны қолдансаң, қажет домендерді жеке тірке.
5. Firebase Authentication және Firestore пайдаланушы деректері өзгермейді.

Ескерту: GitHub-тағы `frontend/.env.production` файлында **Firebase public Web SDK config** бар. Бұл Firebase Admin private key емес. Cloudflare-ге тек **Gemini серверлік құпия кілтін** қосу керек; Firebase-тің ашық айнымалыларын қайта теру міндетті емес.

## 4. Сайтты тексеру

1. Cloudflare Deployments: **Success** және Production branch `main`.
2. `https://<project>.pages.dev` — басты бет пен логин ашылады.
3. `https://<project>.pages.dev/api/tutor` — браузердегі **GET 405** қайтарады. Бұл Function маршруты табылғанын көрсетеді. 404 болса, root directory, functions каталогы, Functions build журналы немесе `_routes.json` тексер.
4. Мұғалім/ата-ана/оқушы аккаунттарының тіркелуі және авторизациясы (Firebase), мектептер, сыныптар, 7 сандық кодты Quiz.
5. «Оқу көмекшісі» → «Python for циклін түсіндір» → Gemini жауабы. **401** — алдымен логин, **`ai_not_configured`** — `GEMINI_API_KEY` жоқ, **429** — Gemini квотасы.
6. Face Wheel → камераға Chrome-да рұқсат → анықтау; Gesture Game → 1–4 саусақ. HTTPS автоматты қолданылады; `Permissions-Policy: camera=(self)` статикалық жауапқа беріледі.
7. Сілтеме бөлісу, Quiz QR кодтары, жүктеу (CSV/JSON/HTML), жеке профиль/пароль/аватар және AI Tutor-ды мобильді браузерден тексер.
8. Компьютерді ұйқыға қойып, мобильді интернет арқылы AI сұрау жібер. Gemini мен Cloudflare квоталары сақталса, Windows-ты қосулы ұстау қажет емес.

**Қателерді тексеру:**
- `404 /api/tutor` → Cloudflare Pages жобасында root `frontend` емес немесе Functions құрастырылмаған.
- `403 origin_forbidden` → сайт пен API сұрауының origin-дері әртүрлі; frontend `/api/tutor` **same-origin** қолдануы керек.
- `401 login_required` → Firebase аккаунтына кір.
- `401 invalid_firebase_token` → email расталғанын және токенді тексер.
- `503 ai_not_configured` → Cloudflare Secret `GEMINI_API_KEY` қос, жаңа deploy жаса.
- `502 ai_model_not_found` → Cloudflare `GEMINI_MODEL` мәнін өзгертіп, жарияла.
- `429 ai_quota_exceeded` → Google AI Studio quota.
- `permission-denied` (Firestore) → Firebase Rules-тің нақты жарияланған нұсқасын тексер.
- `getUserMedia` рұқсат қатесі → HTTPS және браузер/Windows рұқсатын тексер.

## 5. Неліктен бұлттық функция қауіпсіз?

- Клиент тек `POST /api/tutor` сұрайды; Cloudflare Worker `context.env.GEMINI_API_KEY` мәнін өзі оқиды.
- Worker Firebase ID токенін Google JWK кілті арқылы тексеріп, email расталғанын талап етеді.
- Сұрақ ұзындығы 700 таңбаға шектелген, мектеп/CodeQuest тақырыптары сүзгіден өтеді, қарапайым PII үлгілері бұғатталады. Бұл сүзгілер 100% қорғаныс емес.
- `frontend/public/_routes.json` арқылы тек `/api/tutor` Worker шақырады. Статикалық беттер Cloudflare Pages-та Function квотасын жемеуі тиіс.
- Cloudflare Pages Free-де build лимиті, Workers сұрау лимиті бар; Gemini квотасы бөлек. Көп оқушыға арналған production жүйеде тұрақты rate limit және контент қауіпсіздігі аудиті қажет.

## 6. GitHub-тен жергілікті тексеру (қосымша)

```powershell
git clone https://github.com/ansaganakhat/codequest.git
cd codequest\frontend
npm install
npm run test
npm run build
npm run test:pages
npm run dev:pages
```

Қалыптыда Wrangler `http://localhost:8788` серверін ашады. Cloudflare Pages Functions ішіндегі құпия кілтті жергілікті сынау үшін `frontend/.dev.vars` ішінде `GEMINI_API_KEY=...` жазуға болады. Оны **GitHub-қа commit жасама**.

## 7. Қандай файлдар өзгерді?

- `frontend/functions/api/tutor.js` — Cloudflare Function маршрут.
- `frontend/server/tutor-core.mjs` — Firebase JWT + сұрақ қауіпсіздігі + Gemini/FreeLLM ортақ логикасы.
- `frontend/netlify/functions/tutor.mjs` — ескі сайтқа уақытша үйлесімді wrapper.
- `frontend/src/LearningStudio.jsx` — AI сұрауы Netlify доменіне тәуелді емес, `/api/tutor` арқылы.
- `frontend/public/_headers`, `frontend/public/_routes.json` — камера қауіпсіздік тақырыптары және Functions маршруты.
- GitHub CI `wrangler pages functions build` командсын іске қосып, Cloudflare-ге жинақталуын тексереді.

## 8. Ескі Netlify-ді қашан өшіруге болады?

Жаңа Pages сайтында **Firebase кірісі, Quiz, камера, профиль және Gemini AI Tutor** толық тексеріліп, оқушыларға жаңа домен берілгеннен кейін ғана. Ескі Netlify сайтын жойған күннің өзінде Firebase-тің Auth/Firestore деректері сол күйі қалады.
