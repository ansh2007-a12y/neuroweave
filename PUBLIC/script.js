// ============================================================
// script.js
// ------------------------------------------------------------
// Yeh file do kaam karti hai:
//   1. Frontend ke games (reaction time, memory) chalati hai.
//   2. Backend (http://localhost:5000) se baat karti hai —
//      signup, login, check-in save, doctors list, community
//      posts, aur health record — sab yahin se hota hai.
//
// Zaroori: backend server chal raha hona chahiye
// (neuroweave-backend folder mein "npm start") tabhi login,
// posting, booking waghera kaam karenge.
// ============================================================

const API_BASE = 'http://localhost:5000/api';

// Agar tap karne mein isse zyada time lag jaye, matlab user beech mein
// kahin aur chala gaya tha — real reaction/recall speed nahi hai. Aisi
// attempts save nahi karte, warna ek outlier poore stats ko bigaad deta hai.
const MAX_PLAUSIBLE_RESPONSE_MS = 20000; // 20 seconds

// Yeh humara "yaad rakhne" ka tareeka hai — login token aur user
// ko browser ki localStorage mein save karte hain, taaki page
// refresh hone par bhi user logged-in rahe.
let authToken = localStorage.getItem('neuroweave_token') || null;
let currentUser = JSON.parse(localStorage.getItem('neuroweave_user') || 'null');
let currentRoom = 'Memory Support Room';

// ------------------------------------------------------------
// Ek chhota helper function jo har backend request ke liye
// istemaal hota hai, taaki baar baar same code na likhna pade.
// ------------------------------------------------------------
async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  // Agar user logged in hai, toh har request ke saath uska token bhi bhejo.
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;

  const response = await fetch(API_BASE + path, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Backend ne jo error message bheja hai, wahi throw kar do taaki
    // caller use dikha sake.
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

// ============================================================
// AUTH: signup / login / logout / UI update
// ============================================================
const authOverlay = document.getElementById('authOverlay');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const nameField = document.getElementById('nameField');
const authName = document.getElementById('authName');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authError = document.getElementById('authError');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authSwitchText = document.getElementById('authSwitchText');
const authSwitchBtn = document.getElementById('authSwitchBtn');
const navRight = document.getElementById('navRight');

let authMode = 'login'; // ya 'signup'

function openAuth(mode) {
  authMode = mode;
  authError.textContent = '';
  authName.value = '';
  authEmail.value = '';
  authPassword.value = '';
  if (mode === 'login') {
    authTitle.textContent = 'Log in';
    authSubtitle.textContent = 'Welcome back — pick up your check-in streak.';
    nameField.classList.add('hidden');
    authSubmitBtn.textContent = 'Log in';
    authSwitchText.textContent = 'New to NeuroWeave?';
    authSwitchBtn.textContent = 'Create an account';
  } else {
    authTitle.textContent = 'Create your account';
    authSubtitle.textContent = 'Two minutes to set up your first check-in.';
    nameField.classList.remove('hidden');
    authSubmitBtn.textContent = 'Sign up';
    authSwitchText.textContent = 'Already have an account?';
    authSwitchBtn.textContent = 'Log in instead';
  }
  authOverlay.classList.add('open');
}
function closeAuth() {
  authOverlay.classList.remove('open');
}

document.getElementById('loginOpenBtn').addEventListener('click', () => openAuth('login'));
document.getElementById('signupOpenBtn').addEventListener('click', () => openAuth('signup'));
document.getElementById('authCloseBtn').addEventListener('click', closeAuth);
authSwitchBtn.addEventListener('click', () => openAuth(authMode === 'login' ? 'signup' : 'login'));

authSubmitBtn.addEventListener('click', async () => {
  authError.textContent = '';
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    authError.textContent = 'Please fill in email and password.';
    return;
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = 'Please wait...';

  try {
    let data;
    if (authMode === 'signup') {
      const name = authName.value.trim();
      if (!name) { throw new Error('Please enter your name.'); }
      data = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
    } else {
      data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    }

    // Login/signup safal hua — token aur user save karo.
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('neuroweave_token', authToken);
    localStorage.setItem('neuroweave_user', JSON.stringify(currentUser));

    closeAuth();
    refreshLoggedInUI();
  } catch (err) {
    authError.textContent = err.message;
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = authMode === 'signup' ? 'Sign up' : 'Log in';
  }
});

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('neuroweave_token');
  localStorage.removeItem('neuroweave_user');
  refreshLoggedInUI();
}

// Nav bar ke top-right corner ko login state ke hisaab se update karta hai.
function refreshLoggedInUI() {
  if (currentUser) {
    const initial = currentUser.name.trim().charAt(0).toUpperCase();
    navRight.innerHTML = `
      <div class="nav-user"><span class="avatar-chip">${initial}</span> ${currentUser.name}</div>
      <button class="link-btn" id="logoutBtn">Log out</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', logout);
    // Login ho chuka hai toh personalized data load karo.
    loadTrend();
    loadRecords();
    loadStats('reaction_time');
    loadStats('memory');
  } else {
    navRight.innerHTML = `
      <button class="link-btn" id="loginOpenBtn">Log in</button>
      <button class="nav-cta" id="signupOpenBtn">Sign up</button>
    `;
    document.getElementById('loginOpenBtn').addEventListener('click', () => openAuth('login'));
    document.getElementById('signupOpenBtn').addEventListener('click', () => openAuth('signup'));
    document.getElementById('trendText').textContent =
      'Log in and complete a couple of check-ins to see your personal trend here.';
    document.getElementById('recordBody').innerHTML =
      '<tr><td colspan="3" class="record-empty">Log in to see your record.</td></tr>';
    setStatsPlaceholder('reaction_time', 'Log in to start tracking your stats.');
    setStatsPlaceholder('memory', 'Log in to start tracking your stats.');
  }
}

// ============================================================
// CHECK-IN GAMES + saving results to the backend
// ============================================================

// Ek helper: agar user logged in nahi hai, toh use bata do aur
// login modal khol do — bina login ke score save nahi ho sakta.
function requireLoginOrPrompt() {
  if (!authToken) {
    openAuth('login');
    return false;
  }
  return true;
}

async function saveCheckin(gameType, score) {
  if (!authToken) return; // logged out user ke liye chup-chaap skip karo, error mat dikhao
  try {
    await apiRequest('/checkins', {
      method: 'POST',
      body: JSON.stringify({ game_type: gameType, score }),
    });
    loadTrend(); // score save hone ke baad trend refresh karo
    loadStats(gameType); // is game ka "Your stats" card bhi real numbers se refresh karo
  } catch (err) {
    console.error('Could not save check-in:', err.message);
  }
}

async function loadTrend() {
  const trendText = document.getElementById('trendText');
  if (!authToken) return;
  try {
    const data = await apiRequest('/checkins/trend/reaction_time');
    if (data.message) {
      trendText.textContent = data.message;
    } else {
      trendText.innerHTML =
        `Today's reaction time is <b>${data.latest_score}ms</b>, vs your usual average of ` +
        `<b>${data.your_usual_average}ms</b>. ${data.suggestion}`;
    }
  } catch (err) {
    console.error('Could not load trend:', err.message);
  }
}

// ---------- Reaction time game ----------
const box = document.getElementById('reactionBox');
const result = document.getElementById('reactionResult');
let state = 'idle'; // idle -> waiting -> go -> done
let timeoutId, startTime;

box.addEventListener('click', () => {
  if (state === 'idle' || state === 'done') {
    state = 'waiting';
    box.textContent = 'Wait for green...';
    box.className = 'reaction-box';
    const delay = 1200 + Math.random() * 2200;
    timeoutId = setTimeout(() => {
      state = 'go';
      box.classList.add('go');
      box.textContent = 'TAP NOW';
      startTime = performance.now();
    }, delay);
  } else if (state === 'waiting') {
    clearTimeout(timeoutId);
    state = 'done';
    box.classList.add('tooSoon');
    box.textContent = 'Too soon — tap to retry';
    result.innerHTML = '<b>Too early.</b> Wait for the color change next time.';
    setTimeout(() => { box.classList.remove('tooSoon'); }, 150);
  } else if (state === 'go') {
    const rt = Math.round(performance.now() - startTime);
    state = 'done';
    box.classList.remove('go');
    box.textContent = 'Tap to try again';
    if (rt > MAX_PLAUSIBLE_RESPONSE_MS) {
      // Bahut zyada der lag gayi — real reaction time nahi hai, so isko
      // stats mein count nahi karte.
      result.innerHTML = `That took a while — looks like you stepped away. This attempt won't count towards your stats.`;
    } else {
      result.innerHTML = `Reaction time: <b>${rt} ms</b>.`;
      if (authToken) {
        result.innerHTML += ' Saved to your check-in history.';
        saveCheckin('reaction_time', rt);
      } else {
        result.innerHTML += ' <button class="link-btn" id="loginToSave">Log in to save this.</button>';
        document.getElementById('loginToSave').addEventListener('click', () => openAuth('login'));
      }
    }
  }
});

// ---------- Pattern memory game ----------
const grid = document.getElementById('memoGrid');
const status = document.getElementById('memoStatus');
const playBtn = document.getElementById('memoPlay');
const cells = [];
for (let i = 0; i < 8; i++) {
  const c = document.createElement('div');
  c.className = 'memo-cell';
  c.dataset.i = i;
  grid.appendChild(c);
  cells.push(c);
}
let sequence = [], userStep = 0, playing = false, recallStartTime = null;

function randomSeq(len) {
  const s = [];
  for (let i = 0; i < len; i++) s.push(Math.floor(Math.random() * 8));
  return s;
}
async function playSequence() {
  playing = true;
  sequence = randomSeq(4);
  userStep = 0;
  status.textContent = 'Watch closely...';
  for (const idx of sequence) {
    await flash(cells[idx]);
    await sleep(180);
  }
  status.textContent = 'Now repeat the pattern.';
  playing = false;
  // Clock starts the moment the user is allowed to start tapping —
  // this is what we measure their recall speed against.
  recallStartTime = performance.now();
}
function flash(cell) {
  return new Promise((res) => {
    cell.classList.add('on');
    setTimeout(() => { cell.classList.remove('on'); res(); }, 420);
  });
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

playBtn.addEventListener('click', () => { if (!playing) playSequence(); });

cells.forEach((cell) => {
  cell.addEventListener('click', () => {
    if (playing || sequence.length === 0) return;
    const idx = parseInt(cell.dataset.i);
    if (idx === sequence[userStep]) {
      cell.classList.add('correct');
      setTimeout(() => cell.classList.remove('correct'), 300);
      userStep++;
      if (userStep === sequence.length) {
        // Score = kitne milliseconds mein poora sequence sahi tap kiya
        // (chhota, behtar) — same unit (ms) as the reaction time game,
        // so both games' stats are directly comparable.
        const recallTime = Math.round(performance.now() - recallStartTime);
        if (recallTime > MAX_PLAUSIBLE_RESPONSE_MS) {
          // Bahut zyada der lag gayi — real recall speed nahi hai, so
          // isko stats mein count nahi karte.
          status.textContent = "That took a while — this attempt won't count towards your stats.";
        } else {
          status.textContent = '✓ Sequence complete — nice recall!';
          saveCheckin('memory', recallTime);
        }
        sequence = [];
      }
    } else {
      status.textContent = 'Not quite — press play to try again.';
      sequence = [];
    }
  });
});

// ============================================================
// STATS: real per-game statistics (best / average / attempts)
// ------------------------------------------------------------
// Powers the "Your stats" card inside each game. Every number
// here comes from the backend's SQL query over the user's own
// saved scores (see routes/checkins.js -> /stats/:game_type) —
// nothing is random or hardcoded on the frontend either.
// ============================================================
const STAT_EL = {
  reaction_time: {
    best: document.getElementById('reactionStatBest'),
    avg: document.getElementById('reactionStatAvg'),
    count: document.getElementById('reactionStatCount'),
    badge: document.getElementById('reactionStatBadge'),
    spark: document.getElementById('reactionStatSpark'),
    caption: document.querySelector('#reactionStatPanel .stat-caption'),
    color: '--sage',
  },
  memory: {
    best: document.getElementById('memoryStatBest'),
    avg: document.getElementById('memoryStatAvg'),
    count: document.getElementById('memoryStatCount'),
    badge: document.getElementById('memoryStatBadge'),
    spark: document.getElementById('memoryStatSpark'),
    caption: document.querySelector('#memoryStatPanel .stat-caption'),
    color: '--lavender',
  },
};

// Logged-out / no-data placeholder — keeps the card's layout
// steady instead of showing empty boxes.
function setStatsPlaceholder(gameType, message) {
  const el = STAT_EL[gameType];
  if (!el) return;
  el.best.textContent = '—';
  el.avg.textContent = '—';
  el.count.textContent = '—';
  el.badge.textContent = 'Log in';
  el.badge.className = 'stat-badge neutral';
  el.spark.innerHTML = '';
  el.caption.textContent = message;
}

async function loadStats(gameType) {
  if (!authToken || !STAT_EL[gameType]) return;
  try {
    const data = await apiRequest(`/checkins/stats/${gameType}`);
    renderStats(gameType, data);
  } catch (err) {
    console.error('Could not load stats:', err.message);
  }
}

// Displays a percentage safely — caps at 300% so a rare outlier
// attempt (e.g. one accidentally huge score) can't make the badge
// show something absurd like "92625%". The real, uncapped number
// is still there in the API response if you ever need to inspect it.
function formatPercent(percent) {
  const magnitude = Math.abs(percent);
  if (magnitude > 300) return '300%+';
  return Math.round(magnitude) + '%';
}

function renderStats(gameType, data) {
  const el = STAT_EL[gameType];
  if (!el) return;

  if (!data.has_data) {
    el.best.textContent = '—';
    el.avg.textContent = '—';
    el.count.textContent = '0';
    el.badge.textContent = 'New';
    el.badge.className = 'stat-badge neutral';
    el.spark.innerHTML = '';
    el.caption.textContent = 'Play once to start your stats.';
    return;
  }

  el.best.textContent = Math.round(data.best_score) + 'ms';
  el.avg.textContent = Math.round(data.average_score) + 'ms';
  el.count.textContent = data.total_attempts;

  if (data.improvement_percent === null) {
    el.badge.textContent = data.total_attempts + ' logged';
    el.badge.className = 'stat-badge neutral';
    el.caption.textContent = "A few more check-ins and we'll show your trend.";
  } else if (data.improvement_percent > 3) {
    el.badge.textContent = '▲ ' + formatPercent(data.improvement_percent) + ' faster';
    el.badge.className = 'stat-badge good';
    el.caption.textContent = 'Trending up = getting faster. Nice work.';
  } else if (data.improvement_percent < -3) {
    el.badge.textContent = formatPercent(data.improvement_percent) + ' slower';
    el.badge.className = 'stat-badge watch';
    el.caption.textContent = 'A little slower than when you started — everyone has off days.';
  } else {
    el.badge.textContent = 'Steady';
    el.badge.className = 'stat-badge neutral';
    el.caption.textContent = 'Holding steady around your usual average.';
  }

  const recent = data.history.map((row) => row.score);
  el.spark.innerHTML = recent.length >= 2 ? buildSparkline(recent, el.color) : '';
}

// Draws a small line-and-dot trend chart — same node/edge visual
// language as the hero graphic — straight from real scores.
function buildSparkline(scores, colorVar) {
  const w = 200, h = 56, pad = 6;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min;

  const coords = scores.map((s, i) => {
    const x = pad + (i * (w - 2 * pad)) / (scores.length - 1);
    // Normalised so an UPWARD line always reads as "improving", even
    // though a lower millisecond value is technically the better number.
    const perf = range === 0 ? 0.5 : (max - s) / range;
    const y = pad + (1 - perf) * (h - 2 * pad);
    return { x, y };
  });

  const points = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const dots = coords
    .map((c, i) => {
      const isLast = i === coords.length - 1;
      return `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${isLast ? 3.5 : 2.5}" fill="var(${colorVar})" opacity="${isLast ? 1 : 0.6}"/>`;
    })
    .join('');

  return `<svg class="stat-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${points}" fill="none" stroke="var(${colorVar})" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
}

// ============================================================
// DOCTORS: list load karna + booking
// ============================================================
async function loadDoctors() {
  const container = document.getElementById('doctorScroll');
  try {
    const doctors = await apiRequest('/doctors');
    container.innerHTML = doctors
      .map((doc) => {
        const initials = doc.name
          .replace('Dr. ', '')
          .split(' ')
          .map((w) => w.charAt(0))
          .join('')
          .toUpperCase();
        return `
          <div class="doc-card">
            <div class="doc-avatar">${initials}</div>
            <div class="doc-body">
              <h3>${doc.name}</h3>
              <div class="doc-role">${doc.specialty}</div>
              <div class="verified">✔ Verified credentials</div>
              <div class="doc-actions">
                <button class="btn-sm fill" data-book="${doc.id}">Book</button>
                <button class="btn-sm outline">Profile</button>
              </div>
            </div>
          </div>`;
      })
      .join('');

    // Har "Book" button pe click listener lagao.
    container.querySelectorAll('[data-book]').forEach((btn) => {
      btn.addEventListener('click', () => bookDoctor(btn.dataset.book));
    });
  } catch (err) {
    container.innerHTML = `<div class="doc-loading">Could not load doctors — is the backend running?</div>`;
  }
}

async function bookDoctor(doctorId) {
  if (!requireLoginOrPrompt()) return;
  // Simple beginner-friendly tareeka: browser ka built-in prompt() use kar rahe hain
  // taaki ek poora "date/time picker" UI na banana pade.
  const requestedTime = prompt('When would you like the appointment? (e.g. 2026-08-25 10:00 AM)');
  if (!requestedTime) return;
  try {
    await apiRequest(`/doctors/${doctorId}/book`, {
      method: 'POST',
      body: JSON.stringify({ requested_time: requestedTime }),
    });
    alert('Appointment requested! Check your Health Record section.');
    loadRecords();
  } catch (err) {
    alert('Could not book appointment: ' + err.message);
  }
}

// ============================================================
// COMMUNITY: room switch, feed load, posting
// ============================================================
async function loadFeed(room) {
  const feed = document.getElementById('postFeed');
  feed.innerHTML = '<div class="feed-loading">Loading posts…</div>';
  try {
    const posts = await apiRequest(`/community/${encodeURIComponent(room)}`);
    if (posts.length === 0) {
      feed.innerHTML = '<div class="feed-loading">No posts yet in this room — be the first to share.</div>';
      return;
    }
    feed.innerHTML = posts
      .map((post) => {
        const initial = post.author_name.charAt(0).toUpperCase();
        const when = new Date(post.created_at).toLocaleString();
        return `
          <div class="post">
            <div class="post-head">
              <div class="post-avatar">${initial}</div>
              <div><div class="post-name">${post.author_name}</div><div class="post-time">${when} · ${room}</div></div>
            </div>
            <div class="post-text">${escapeHtml(post.content)}</div>
          </div>`;
      })
      .join('');
  } catch (err) {
    feed.innerHTML = `<div class="feed-loading">Could not load posts — is the backend running?</div>`;
  }
}

// Basic safety: user ke post text ko HTML ki tarah render hone se rokta hai.
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.querySelectorAll('.room').forEach((roomEl) => {
  roomEl.addEventListener('click', () => {
    document.querySelectorAll('.room').forEach((r) => r.classList.remove('active'));
    roomEl.classList.add('active');
    currentRoom = roomEl.dataset.room;
    loadFeed(currentRoom);
  });
});

document.getElementById('postSubmitBtn').addEventListener('click', async () => {
  if (!requireLoginOrPrompt()) return;
  const contentBox = document.getElementById('postContent');
  const anonBox = document.getElementById('postAnon');
  const content = contentBox.value.trim();
  if (!content) return;

  try {
    await apiRequest(`/community/${encodeURIComponent(currentRoom)}`, {
      method: 'POST',
      body: JSON.stringify({ content, is_anonymous: anonBox.checked }),
    });
    contentBox.value = '';
    anonBox.checked = false;
    loadFeed(currentRoom);
  } catch (err) {
    alert('Could not post: ' + err.message);
  }
});

// ============================================================
// HEALTH RECORD: combined check-ins + appointments timeline
// ============================================================
async function loadRecords() {
  const body = document.getElementById('recordBody');
  if (!authToken) return;
  try {
    const rows = await apiRequest('/records');
    if (rows.length === 0) {
      body.innerHTML = '<tr><td colspan="3" class="record-empty">Nothing yet — try a check-in or book a doctor.</td></tr>';
      return;
    }
    body.innerHTML = rows
      .map((row) => {
        const date = new Date(row.date).toLocaleDateString();
        const statusClass = row.type === 'checkin' ? 'stable' : 'watch';
        const statusLabel = row.type === 'checkin' ? 'Logged' : 'Appointment';
        return `<tr><td>${date}</td><td>${escapeHtml(row.label)}</td><td><span class="status-pill ${statusClass}">${statusLabel}</span></td></tr>`;
      })
      .join('');
  } catch (err) {
    body.innerHTML = '<tr><td colspan="3" class="record-empty">Could not load your record.</td></tr>';
  }
}

// ------------------------------------------------------------
// "Export PDF" button — koi extra library nahi chahiye. Browser
// ka apna print system use karte hain: window.print() print
// dialog kholta hai, jismein user "Save as PDF" choose kar sakta
// hai. Print-only CSS (style.css mein @media print) sirf record
// card dikhata hai, baaki sab (nav, hero, buttons) hide ho jaata hai.
// ------------------------------------------------------------
document.getElementById('exportPdfBtn').addEventListener('click', () => {
  if (!requireLoginOrPrompt()) return;
  window.print();
});

// ------------------------------------------------------------
// "Share with a doctor" button — koi naya backend feature nahi
// banaya; jo booking route (/api/doctors/:id/book) already kaam
// kar raha hai, usi ko reuse karte hain. User ek doctor choose
// karta hai, aur unke saath record-review ke liye appointment
// request ho jaati hai — wahi Health Record mein "Appointment"
// row ki tarah dikhega.
// ------------------------------------------------------------
async function shareRecordWithDoctor() {
  if (!requireLoginOrPrompt()) return;
  try {
    const doctors = await apiRequest('/doctors');
    if (!doctors.length) {
      alert('No doctors available right now.');
      return;
    }
    const listText = doctors.map((d, i) => `${i + 1}. ${d.name} — ${d.specialty}`).join('\n');
    const choice = prompt(`Share your health record with which doctor?\n\n${listText}\n\nType the number:`);
    if (!choice) return;
    const doctor = doctors[parseInt(choice, 10) - 1];
    if (!doctor) {
      alert('That number is not on the list — try again.');
      return;
    }
    const requestedTime = prompt(`When would you like ${doctor.name} to review your record? (e.g. 2026-08-25 10:00 AM)`);
    if (!requestedTime) return;

    await apiRequest(`/doctors/${doctor.id}/book`, {
      method: 'POST',
      body: JSON.stringify({ requested_time: requestedTime }),
    });
    alert(`Shared! ${doctor.name} has an appointment request to review your record.`);
    loadRecords();
  } catch (err) {
    alert('Could not share your record: ' + err.message);
  }
}
document.getElementById('shareRecordBtn').addEventListener('click', shareRecordWithDoctor);

// ============================================================
// PAGE LOAD: sab kuch shuru karo
// ============================================================
document.getElementById('footerYear').textContent = new Date().getFullYear();
refreshLoggedInUI();
loadDoctors();
loadFeed(currentRoom);
