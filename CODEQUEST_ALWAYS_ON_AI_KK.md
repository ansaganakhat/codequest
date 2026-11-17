# CodeQuest AI — компьютер ұйқыда болса да жұмыс істейтін AI Tutor

## Неге бұрын жұмыс істемейтін еді?

Windows-та орнатылған FreeLLMAPI API адресі `http://127.0.0.1:31415/v1` — тек компьютердің өзінде ашылады. Компьютер ұйқыға кеткенде / өшкенде бұл бағдарламаға сырттан сұрау жіберу мүмкін емес.

**Тұрақты шешім:** CodeQuest AI-дағы Netlify Function Gemini API-ге **тікелей бұлттан** сұрау жібереді. Жергілікті FreeLLMAPI-ді қосып қою міндетті емес. Бұрынғы FreeLLMAPI арқылы қосудың HTTPS нұсқасы резервтік балама ретінде кодта сақталған.

## 1. Google AI Studio-дан сайтқа жеке Gemini API кілтін алу

1. https://aistudio.google.com/apikey аш.
2. CodeQuest AI үшін тиісті Google Cloud жобасын таңда (бар кілттің орнына сайтқа арналған **жеке кілт** құруға болады).
3. API key жаса; құпия кілтті тек өзің сақта. Құпия мәнді GitHub-қа, React-ке, осы чатқа, скриншотқа салма.
4. Кілтті тексерген FreeLLMAPI қолданбасын Windows-та жабуға болады: сайт оған тәуелді емес.

## 2. Netlify Environment variables енгізу

1. https://app.netlify.com/projects/codequest-ai-ansagan/configuration/env бетіне өт (панель өзгерсе: Netlify → CodeQuest AI → **Project configuration → Environment variables**).
2. **Add a variable**:
   - `GEMINI_API_KEY` → Google AI Studio-дан алған **Gemini API key** (FreeLLMAPI Unified API Key емес).
   - `GEMINI_MODEL` → `gemini-3.5-flash-lite` (**міндетті емес**, кодта осы модель әдепкі түрде берілген).
3. Кілтті **Contains secret values** деп белгілеуге мүмкіндік болса, белгіле. Functions scope қажет. Netlify тегін жоспарында Scope таңдау мүмкіндігі болмаса, әдепкі барлық scope қолданылады.
4. **Production** deploy контекстінде мәні болуы керек. `VITE_GEMINI_API_KEY` пайдалануға **БОЛМАЙДЫ** — ол браузерде жария болып кетуі мүмкін.
5. Save. **Deploys → Trigger deploy → Deploy site** орында. Кілт мәні тек келесі deploy-дан кейін serverless function-ға өтеді.

## 3. Тексеру

1. https://codequest-ai-ansagan.netlify.app сайтына email-і расталған оқушы/мұғалім аккаунтымен кір.
2. **Оқу көмекшісі** бөлімін ашып, `Python-дағы for циклі қалай жұмыс істейді?` деп сұра.
3. Жауап шықса — сайт Gemini API-ге Netlify арқылы шықты, Windows компьютері ұйқы режимінде де қызмет сұрауларын орындай алады.
4. Компьютеріңді өшіріп, басқа телефоннан өз аккаунтыңмен кіріп тексер. **Сынақты смартфондағы интернет арқылы жаса**, жергілікті Wi-Fi-ға тәуелді емес екеніне көз жеткіз.
5. Егер `ai_not_configured` шықса, `GEMINI_API_KEY` Netlify-ге қосылмаған, немесе соңғы deploy қайта жасалмаған.

## Қателер

- `ai_not_configured`: API кілті серверде жоқ.
- `ai_api_key_invalid`: кілт жарамсыз немесе Google рұқсат бермейді.
- `ai_model_not_found`: модель таңдауы қате немесе аккаунтқа қолжетімсіз.
- `ai_quota_exceeded`: Gemini квотасы біткен; тегін тарифте лимит бар.
- `ai_provider_busy`, `ai_provider_unreachable`: Gemini API уақытша қолжетімсіз.
- `personal_data_not_allowed`: сұрақта анықталатын email/телефон/ЖСН бар; оларды сұрақтан өшір.
- `invalid_firebase_token`: пайдаланушы email-і расталмаған не сессия ескірген.
- `rate_limit`: 5 минуттағы сұрақ саны шектен асты.

## Нақты қолжетімділік және қауіпсіздік

- **Үнемі қосулы Windows қажет емес**, бірақ Netlify және Gemini интернет-сервистері де үзіліс/квота жағдайларына тәуелді. «Кез келген уақытта 100% жұмыс істейді» деп кепілдік жоқ.
- Gemini **free tier** қолжетімді модельдер мен квоталарға тәуелді. Google тегін тарифке жіберілген контентті өнімдерін жақсартуға пайдалана алатынын жариялайды. Нақты оқушылардың құпия деректерін, парольдерін, ЖСН-ін, телефондарын сұраққа жазба. Өндірістік қолдануға шығарар алдында мектеппен деректерді өңдеу саясатын келіс.
- Netlify функциясы Firebase ID token тексергеннен кейін ғана сұрақ қабылдайды. Сұрақтың ұзындығы 700 таңбаға шектелген. Оқу тақырыптарынан тыс сұрақтар шектелген, бірақ кез келген LLM-ді 100% тақырып шегінде ұстап тұруға кепілдік жоқ.
- API кілті **Netlify серверінде** тұрады, браузерге қайтарылмайды.
- Жергілікті FreeLLMAPI-ді қажет деп тапсаң, компьютер ұйқыда жұмыс істеу үшін оны бөлек 24/7 жұмыс істейтін VPS/бұлтты серверге көшіру керек. Содан кейін `FREELLM_BASE_URL`, `FREELLM_API_KEY`, `FREELLM_MODEL` мәндерін бапта. **GEMINI_API_KEY бар болса, сайт Gemini-ді басым қолданады.**

## Ресми құжаттар

- Gemini REST: https://ai.google.dev/gemini-api/docs/text-generation
- Gemini API кілті: https://ai.google.dev/gemini-api/docs/api-key
- Gemini модельдері: https://ai.google.dev/gemini-api/docs/models
- Netlify serverless environment: https://docs.netlify.com/build/functions/environment-variables/
