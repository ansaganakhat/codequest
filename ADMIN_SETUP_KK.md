# CodeQuest AI: бірінші әкімші аккаунтын орнату

Firebase жобасы: `codequest-1bfc6`.

## 1. Сайтта әкімші ретінде қолданатын аккаунтыңды тірке

1. https://codequest-ai-ansagan.netlify.app аш, Ата-ана рөлімен **өзіңе тиесілі email** арқылы тіркел.
2. Firebase жіберген verification email ішіндегі сілтемені бас; **Спам** папкасын тексер.
3. https://console.firebase.google.com/project/codequest-1bfc6/authentication/users ішінде осы email-ге сәйкес `User UID` көшір.

## 2. Компьютерді дайында

Node.js 20+ және Git керек. PowerShell терезесінде:

```powershell
git clone https://github.com/ansaganakhat/codequest.git
cd codequest\frontend
npm install
```

Егер репозиторий бұрын клондалған болса, қайталап clone жасамай, `git pull` орында.

## 3. Firebase Admin SDK credentials

Firebase Console → Project settings (⚙) → Service accounts → Firebase Admin SDK → Generate new private key.
JSON файлын **GitHub-қа, чатқа, электрондық поштаға немесе жалпыға ортақ қалтаға жүктеме**.
Оны компьютердің жеке қорғалған жолында сақта, мысалы `C:\private\codequest-firebase-admin.json` (нақты файл атауы басқа болуы мүмкін).

PowerShell ішінен нақты файл жолын көрсет:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS='C:\private\codequest-firebase-admin.json'
Test-Path $env:GOOGLE_APPLICATION_CREDENTIALS
```

`Test-Path` нәтижесі `True` болуы қажет. Бұл — тек мысал жол, өзіңнің нақты жолыңды енгіз.

## 4. Әкімші мәртебесін бекіту

```powershell
npm run firebase:admin -- FIREBASE_USER_UID
```

`FIREBASE_USER_UID` орнына 1-қадамда көшірген UID қой. Бұл команда тек **электрондық поштасы расталған** аккаунтқа `admin: true` custom claim және Firestore-да `role: admin`, `status: approved` орнатады.

Команда сәтті орындалса, CodeQuest AI сайтынан шық та қайта кір. Әкімші аккаунтымен кәдімгі **Кіру** формасын қолдан. Бөлек админ логин формасы қажет емес.

## 5. Мектептер мен пәндерді Firestore-ға жазу

Сол PowerShell терезесінде:

```powershell
npm run firebase:seed
```

Бұл 13 Астана мектебін және 17 пән бағытын Firestore-дың `schools` және `subjects` коллекцияларына жазады (қайта орындалса өзгерістерді жаңартады).

## 6. Мұғалімдерді және балаларды тексеру

- **Пайдаланушылар** → мұғалімнің қасындағы қарындаш → мәртебесі `Расталған` → `Сақтау`.
- **Оқушыларды іздеу** → бала қасындағы қарындаш → мәртебесі `Расталған` → `Сақтау`.
- Мұғалімнің өз мектебімен нақты байланысын және баланы тіркеген адамның заңды өкіл екенін **тексермей** бекітпе.
- ЖСН мен фотолар Firebase пилотында әзірге жиналмайды. Нақты баланың жеке деректерімен жұмыс бастамас бұрын құпиялылық пен заңды талаптарды орында.

## 7. Қателер

- `Verify the administrator email` → Пошта растау хатын аш немесе Authentication → Users бөлімінде verified екенін тексер.
- `User profile not found` → Аккаунтты сайттан бастап тірке, Firebase Authentication-де ғана қолмен ашпа.
- `Could not load the default credentials` → `GOOGLE_APPLICATION_CREDENTIALS` қате жолды көрсетіп тұр немесе файл жоқ.
- `PERMISSION_DENIED` → Бұл JSON файлы басқа Firebase жобасына тиесілі болуы немесе әкімшілік рұқсат жеткіліксіз болуы мүмкін.
- `npm` танылмаса → Node.js-ті орнат, терминалды қайта аш.

**Қауіпсіздік:** Admin SDK JSON — өте жоғары құқықты құпия кілт. Оны ешкімге берме, репозиторийге қоспа. Жұмысты бітірген соң файлды қорғалған жерде сақтау/жою саясатын ұстан; қажет болса Firebase/Google Cloud арқылы кілтті қайтарып ал.
