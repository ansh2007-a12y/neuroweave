# NeuroWeave Backend — Beginner's Guide

Yeh guide bilkul zero-knowledge assume karke likhi gayi hai. Follow step-by-step, koi step skip mat karo.

---

## 1. Backend hota kya hai? (2-min samajh)

- **Frontend** (jo tumne pehle banaya — index.html, style.css, script.js) = jo user apni screen pe **dekhta** hai.
- **Backend** = jo screen ke *peeche* chalta hai. Ye data ko **save** karta hai (users, scores, posts), aur decide karta hai **kaun kya dekh sakta hai**.
- **Database** = ek file jahan sab data permanently store hota hai (jaise Excel sheet, but code se control hoti hai).

Jab user "Sign Up" button dabata hai:
```
Frontend  →  (internet request bhejta hai)  →  Backend  →  (data save karta hai)  →  Database
Frontend  ←  (token/reply wapas aata hai)   ←  Backend
```

Yeh backend **Node.js** (JavaScript hi hai, bas browser ke bajaye computer pe chalta hai) aur **Express** (backend banane ka tool) se bana hai. Database ke liye **SQLite** use kiya hai — iska matlab tumhe koi alag database software install nahi karna, sab ek simple file (`neuroweave.db`) mein save hota hai, jo apne aap ban jaati hai.

---

## 2. Files ka structure

```
neuroweave-backend/
├── server.js              ← MAIN file, isi ko run karoge
├── package.json            ← project ki settings + zaroori libraries ki list
├── .env.example             ← secret settings ka template
├── db/
│   └── db.js                 ← database aur tables banata hai
├── middleware/
│   └── auth.js               ← check karta hai "user login hai ya nahi"
└── routes/
    ├── auth.js                ← signup / login
    ├── checkins.js             ← brain game scores save/dekhna
    ├── doctors.js               ← doctors ki list, appointment book karna
    ├── community.js              ← community posts
    └── records.js                 ← health record (sab kuch ek jagah)
```

---

## 3. Setup — pehli baar (one-time)

### Step 1: Node.js install karo
- https://nodejs.org pe jao → **LTS version** download karo → install karo (Next, Next, Finish).
- Check karne ke liye, terminal/command-prompt kholo aur likho:
  ```
  node -v
  ```
  Agar version number dikhe (jaise `v22.x.x`), matlab sahi install hua.

### Step 2: Terminal mein folder tak jao
Ye poora `neuroweave-backend` folder apne computer pe kahin save karo, phir terminal mein:
```
cd path/to/neuroweave-backend
```
(`path/to/` ki jagah actual folder ka location daalo)

### Step 3: Libraries install karo
```
npm install
```
Ye command `package.json` mein likhi saari zaroori libraries download karke ek `node_modules` folder bana degi. Isme 10-30 second lagenge. Ye sirf **ek baar** karna hai (jab tak library list na badle).

### Step 4: Secret settings file banao
`.env.example` file ko copy karo aur naam badal ke `.env` rakho.
- Terminal se: `cp .env.example .env` (Mac/Linux) ya `copy .env.example .env` (Windows)
- Ya simply file manager mein copy-paste karke rename kar do.

`.env` file khol ke `JWT_SECRET` ki value ko kisi bhi random lambe text se replace kar do (production mein zaroori hai, abhi testing ke liye default bhi chalega).

---

## 4. Server ko chalana (roz ka kaam)

```
npm start
```

Agar sab sahi hai, terminal mein ye dikhega:
```
✅ NeuroWeave backend is running at http://localhost:5000
```

Browser mein `http://localhost:5000` khol ke check kar sakte ho — `{"message":"NeuroWeave backend is running."}` dikhna chahiye.

Server band karne ke liye terminal mein `Ctrl + C` dabao.

Pehli baar server chalane par ek `neuroweave.db` file khud-ba-khud `db/` folder mein ban jaayegi — yehi tumhara database hai.

---

## 5. Backend frontend se kaise judega?

Tumhare `script.js` (frontend) mein, jahan bhi data save/fetch karna ho, wahan `fetch()` use karke backend ko call karo. Example:

**Signup karna:**
```javascript
const response = await fetch('http://localhost:5000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Aisha', email: 'aisha@example.com', password: 'test123' })
});
const data = await response.json();
console.log(data.token); // ye token save karke rakhna hai (localStorage mein), aage login-required requests ke liye zaroori hai
```

**Login-required request bhejna (token ke saath):**
```javascript
const response = await fetch('http://localhost:5000/api/checkins', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + savedToken   // yehi wo token hai jo signup/login se mila tha
  },
  body: JSON.stringify({ game_type: 'reaction_time', score: 320 })
});
```

> Note: NeuroWeave ka frontend artifact (jo humne pehle banaya) filhaal in APIs ko call nahi karta — wo sirf ek visual demo hai. Isse asli banane ke liye upar jaisa `fetch()` code frontend ke `script.js` mein add karna hoga.

---

## 6. Available API routes (endpoints ki poori list)

| Method | URL | Login chahiye? | Kaam |
|---|---|---|---|
| POST | `/api/auth/signup` | Nahi | Naya account banana |
| POST | `/api/auth/login` | Nahi | Login karna |
| POST | `/api/checkins` | Haan | Brain-game score save karna |
| GET | `/api/checkins` | Haan | Apne saare purane scores dekhna |
| GET | `/api/checkins/trend/:game_type` | Haan | Aaj ka score apne average se compare karna |
| GET | `/api/doctors` | Nahi | Sab doctors ki list |
| POST | `/api/doctors/:id/book` | Haan | Doctor ke saath appointment request karna |
| GET | `/api/doctors/appointments/mine` | Haan | Apni saari appointments dekhna |
| GET | `/api/community/:room` | Nahi | Us room ke posts dekhna |
| POST | `/api/community/:room` | Haan | Us room mein post karna |
| GET | `/api/records` | Haan | Health record (check-ins + appointments ek saath) |

"Login chahiye" wale routes mein header mein token bhejna zaroori hai:
```
Authorization: Bearer <token>
```

---

## 7. Bina frontend ke test karna (Postman se)

Coding ke bina bhi backend test karne ke liye **Postman** app use kar sakte ho (free):
1. https://www.postman.com/downloads se install karo.
2. New Request → Method `POST` → URL `http://localhost:5000/api/auth/signup`.
3. Body tab → "raw" → "JSON" select karo → likho:
   ```json
   { "name": "Aisha", "email": "aisha@example.com", "password": "test123" }
   ```
4. Send dabao → reply mein `token` milega, use copy karke aage wali requests ke Headers mein `Authorization: Bearer <token>` daal ke test karte raho.

---

## 8. Common problems

| Problem | Solution |
|---|---|
| `command not found: node` | Node.js install nahi hua — Step 1 dobara karo |
| `Cannot find module 'express'` | `npm install` nahi chalaya — Step 3 karo |
| `EADDRINUSE` error | Port 5000 pehle se use ho raha hai — `.env` mein `PORT=5001` kar do |
| Frontend se request fail ho rahi hai | Server chal raha hai ya nahi check karo (`npm start`); browser console mein error dekho |
| Data reset karna ho | `db/neuroweave.db` file delete kar do — server restart karne par nayi ban jaayegi (par sab purana data delete ho jaayega) |

---

## 9. Production mein le jaane se pehle (zaroori)

Yeh version **sirf sikhne/demo ke liye** hai. Real users ke liye launch karne se pehle:
- `.env` mein ek strong, random `JWT_SECRET` daalo (kabhi GitHub pe commit mat karo `.env` file).
- HTTPS use karo (plain HTTP secure nahi hai).
- Kisi experienced developer se security review karwao, especially health-data wale app ke liye (privacy laws lagu hote hain).
