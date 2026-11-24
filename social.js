/* ألعابنا — accounts, profile character, friends, chat and room invites (Firebase). */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInAnonymously, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = initializeApp({
  apiKey: 'AIzaSyCODWXGkHYo4xWAfYTDYp76U4OedL10dO0',
  authDomain: 'alaabna.firebaseapp.com',
  projectId: 'alaabna',
  storageBucket: 'alaabna.firebasestorage.app',
  messagingSenderId: '462288659418',
  appId: '1:462288659418:web:1443fb8e67425324c156e3'
});
const auth = getAuth(app);
const db = getFirestore(app);

export const GAMES = {
  quiz: { name: 'تحدي المعلومات', file: 'quiz.html' },
  rps: { name: 'حجر ورقة مقص', file: 'rps.html' },
  spy: { name: 'الجاسوس أونلاين', file: 'spy-online.html' },
  draw: { name: 'ارسم وخمّن أونلاين', file: 'draw-online.html' },
  ladder: { name: 'سلّم الكلمات', file: 'ladder.html' }
};

/* ---------- character ---------- */
export const PARTS = {
  skin: ['#ffd8b5', '#f2c9a0', '#e0a978', '#c98b5e', '#a8704a', '#7a4b2c'],
  hair: ['قصير', 'كيرلي', 'منكوش', 'فرق جنب', 'طويل', 'أصلع'],
  hc: ['#2b1a12', '#4a2a16', '#8a4b1c', '#ff8a1f', '#f4d03f', '#9b5de5', '#1fc9b6', '#e8e8e8'],
  shirt: ['#ff6f61', '#1fc9b6', '#8bd346', '#9b5de5', '#3a6df0', '#ffcf33', '#2b2830', '#ff7fb3'],
  acc: ['ولا اشي', 'نظارة', 'سماعات', 'كاب', 'تاج', 'نظارة شمس'],
  face: ['مبسوط', 'ضحكة كبيرة', 'غمزة', 'مستغرب', 'كول']
};
export const DEFAULT_AV = { skin: 1, hair: 0, hc: 0, shirt: 0, acc: 0, face: 0 };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clean = (s, n) => String(s == null ? '' : s).replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, n || 20);

export function avatarSVG(av, size) {
  av = { ...DEFAULT_AV, ...(av || {}) };
  const P = PARTS, sk = P.skin[av.skin] || P.skin[1], hc = P.hc[av.hc] || P.hc[0], sh = P.shirt[av.shirt] || P.shirt[0];
  const hair = [
    `<path d="M-42 -6 Q-44 -46 0 -46 Q44 -46 42 -6 Q30 -26 0 -26 Q-30 -26 -42 -6Z" fill="${hc}"/>`,
    `<g fill="${hc}"><circle cx="-30" cy="-30" r="15"/><circle cx="-12" cy="-40" r="16"/><circle cx="8" cy="-42" r="16"/><circle cx="27" cy="-34" r="15"/><circle cx="38" cy="-18" r="11"/><circle cx="-40" cy="-14" r="10"/></g>`,
    `<path d="M-42 -10 L-36 -48 L-22 -30 L-14 -58 L0 -34 L10 -60 L18 -34 L32 -52 L34 -28 L44 -32 L42 -10 Q0 -28 -42 -10Z" fill="${hc}"/>`,
    `<path d="M-44 -4 Q-46 -48 2 -48 Q44 -48 44 -16 Q20 -36 -10 -34 Q-30 -30 -44 -4Z" fill="${hc}"/>`,
    `<path d="M-46 30 Q-52 -48 0 -48 Q52 -48 46 30 L36 30 Q40 -20 0 -24 Q-40 -20 -36 30Z" fill="${hc}"/>`,
    ``
  ][av.hair] || '';
  const faces = [
    `<path d="M-12 16 Q0 28 12 16" stroke="#2b1340" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<path d="M-14 13 Q0 32 14 13Z" fill="#2b1340"/><path d="M-8 21 Q0 26 8 21" fill="#ff6f61"/>`,
    `<path d="M-12 16 Q0 26 12 14" stroke="#2b1340" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<ellipse cx="0" cy="20" rx="6" ry="7" fill="#2b1340"/>`,
    `<path d="M-10 18 L12 15" stroke="#2b1340" stroke-width="4" stroke-linecap="round"/>`
  ];
  const wink = av.face === 2;
  const eyes = av.acc === 5 ? '' : (wink
    ? `<path d="M-16 2 Q-11 -2 -6 2" stroke="#2b1340" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="11" cy="2" rx="5" ry="6.5" fill="#2b1340"/><circle cx="13" cy="-1" r="2" fill="#fff"/>`
    : `<ellipse cx="-11" cy="2" rx="5" ry="6.5" fill="#2b1340"/><ellipse cx="11" cy="2" rx="5" ry="6.5" fill="#2b1340"/><circle cx="-9" cy="-1" r="2" fill="#fff"/><circle cx="13" cy="-1" r="2" fill="#fff"/>`);
  const acc = [
    '',
    `<g fill="none" stroke="#2b1340" stroke-width="3.5"><circle cx="-12" cy="1" r="11"/><circle cx="12" cy="1" r="11"/><line x1="-1" y1="0" x2="1" y2="0"/></g>`,
    `<path d="M-48 2 Q-52 -60 0 -62 Q52 -60 48 2" stroke="#2b1340" stroke-width="7" fill="none"/><rect x="-56" y="-10" width="16" height="28" rx="8" fill="#ff6f61"/><rect x="40" y="-10" width="16" height="28" rx="8" fill="#ff6f61"/>`,
    `<path d="M-44 -10 Q-42 -52 0 -54 Q42 -52 44 -10Z" fill="#3a6df0"/><path d="M38 -14 Q60 -14 64 -6 Q58 2 36 -4Z" fill="#2a52c4"/><circle cy="-52" r="5" fill="#ffcf33"/>`,
    `<path d="M-30 -40 L-34 -66 L-16 -52 L0 -72 L16 -52 L34 -66 L30 -40Z" fill="#ffcf33" stroke="#d6a300" stroke-width="3"/><circle cx="0" cy="-60" r="4" fill="#ff6f61"/>`,
    `<path d="M-26 -8 H-2 Q0 8 -14 10 Q-26 8 -26 -8Z M2 -8 H26 Q26 8 14 10 Q0 8 2 -8Z" fill="#14101f"/><line x1="-30" y1="-8" x2="30" y2="-8" stroke="#14101f" stroke-width="3"/>`
  ][av.acc] || '';
  return `<svg viewBox="-60 -80 120 140" width="${size || 64}" height="${size ? size * 140 / 120 : 75}" aria-hidden="true">
    <path d="M-48 60 Q-48 34 0 30 Q48 34 48 60Z" fill="${sh}"/>
    ${av.hair === 4 ? hair : ''}
    <circle r="44" fill="${sk}"/>
    ${av.hair !== 4 ? hair : ''}
    <g>${eyes}<ellipse cx="-22" cy="14" rx="7" ry="4" fill="#ff8a8a" opacity=".55"/><ellipse cx="22" cy="14" rx="7" ry="4" fill="#ff8a8a" opacity=".55"/>${faces[av.face] || faces[0]}</g>
    ${acc}
  </svg>`;
}

/* ---------- auth & profile ---------- */
let me = null, profile = null;
const subs = new Set();
const emit = () => subs.forEach(f => { try { f(me, profile); } catch (e) { console.error(e); } });
export function onUser(f) { subs.add(f); if (ready) f(me, profile); return () => subs.delete(f); }
let ready = false, profUnsub = null;

onAuthStateChanged(auth, u => {
  me = u; profile = null;
  if (profUnsub) { profUnsub(); profUnsub = null; }
  if (!u) { ready = true; emit(); window.dispatchEvent(new Event('social-ready')); return; }
  profUnsub = onSnapshot(doc(db, 'users', u.uid), s => {
    profile = s.exists() ? { uid: u.uid, ...s.data() } : null;
    if (profile && profile.name) try { localStorage.setItem('alaabnaName', profile.name); } catch (e) {}
    ready = true; emit(); window.dispatchEvent(new Event('social-ready'));
  }, () => { ready = true; emit(); });
});

export async function loginGoogle() {
  const p = new GoogleAuthProvider();
  try { await signInWithPopup(auth, p); }
  catch (e) {
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) return signInWithRedirect(auth, p);
    throw e;
  }
}
export const loginGuest = () => signInAnonymously(auth);
export const logout = () => signOut(auth);
export const currentUser = () => me;
export const currentProfile = () => profile;

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

export async function saveProfile(name, av) {
  if (!me) throw new Error('signin');
  name = clean(name, 20);
  if (!name) throw new Error('name');
  let code = profile && profile.code;
  if (!code) {
    for (let i = 0; i < 6 && !code; i++) {
      const c = newCode();
      try { await setDoc(doc(db, 'codes', c), { uid: me.uid }); code = c; } catch (e) { /* taken, try another */ }
    }
  }
  await setDoc(doc(db, 'users', me.uid), { name, av, code: code || '', lastSeen: Date.now(), guest: !!me.isAnonymous }, { merge: true });
}

/* presence heartbeat */
setInterval(() => { if (me && profile) setDoc(doc(db, 'users', me.uid), { lastSeen: Date.now() }, { merge: true }).catch(() => {}); }, 60000);
window.addEventListener('social-ready', () => { if (me && profile) setDoc(doc(db, 'users', me.uid), { lastSeen: Date.now() }, { merge: true }).catch(() => {}); }, { once: true });
export const isOnline = u => !!(u && u.lastSeen && Date.now() - u.lastSeen < 150000);

/* ---------- friends ---------- */
export async function addFriendByCode(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) return { err: 'الكود لازم يكون ٦ حروف وأرقام' };
  if (profile && code === profile.code) return { err: 'هاد كودك إنت 😄' };
  const s = await getDoc(doc(db, 'codes', code));
  if (!s.exists()) return { err: 'ما لقينا حدا بهالكود' };
  const uid = s.data().uid;
  const f = await getDoc(doc(db, 'users', me.uid, 'friends', uid));
  if (f.exists()) return { err: 'هو أصلاً من أصحابك' };
  const theirReq = await getDoc(doc(db, 'users', me.uid, 'requests', uid));
  if (theirReq.exists()) { await acceptRequest(uid); return { ok: 'صرتوا أصحاب!' }; }
  await setDoc(doc(db, 'users', uid, 'requests', me.uid), { name: profile.name, av: profile.av || DEFAULT_AV, at: Date.now() });
  return { ok: 'انبعت طلب صداقة، استنى يقبلك' };
}
export async function acceptRequest(uid) {
  const b = writeBatch(db);
  b.set(doc(db, 'users', me.uid, 'friends', uid), { at: Date.now() });
  b.set(doc(db, 'users', uid, 'friends', me.uid), { at: Date.now() });
  b.delete(doc(db, 'users', me.uid, 'requests', uid));
  await b.commit();
}
export const rejectRequest = uid => deleteDoc(doc(db, 'users', me.uid, 'requests', uid));
export async function removeFriend(uid) {
  await deleteDoc(doc(db, 'users', me.uid, 'friends', uid));
  await deleteDoc(doc(db, 'users', uid, 'friends', me.uid)).catch(() => {});
}
export const watchRequests = cb => onSnapshot(collection(db, 'users', me.uid, 'requests'), s => cb(s.docs.map(d => ({ uid: d.id, ...d.data() }))), () => cb([]));
export function watchFriends(cb) {
  const people = {}, unsubs = {};
  const push = () => cb(Object.values(people).sort((a, b) => (isOnline(b) - isOnline(a)) || String(a.name).localeCompare(String(b.name))));
  const top = onSnapshot(collection(db, 'users', me.uid, 'friends'), s => {
    const ids = new Set(s.docs.map(d => d.id));
    Object.keys(unsubs).forEach(id => { if (!ids.has(id)) { unsubs[id](); delete unsubs[id]; delete people[id]; } });
    ids.forEach(id => {
      if (unsubs[id]) return;
      people[id] = { uid: id, name: '…' };
      unsubs[id] = onSnapshot(doc(db, 'users', id), d => { people[id] = { uid: id, ...(d.data() || { name: 'لاعب' }) }; push(); });
    });
    push();
  }, () => cb([]));
  return () => { top(); Object.values(unsubs).forEach(u => u()); };
}
export const watchUser = (uid, cb) => onSnapshot(doc(db, 'users', uid), d => cb({ uid, ...(d.data() || {}) }));

/* ---------- chat ---------- */
export const chatId = (a, b) => [a, b].sort().join('_');
export const sendMessage = (uid, text) => addDoc(collection(db, 'chats', chatId(me.uid, uid), 'msgs'), { from: me.uid, text: clean(text, 500), t: 'm', at: serverTimestamp() });
export const watchChat = (uid, cb, n) => onSnapshot(query(collection(db, 'chats', chatId(me.uid, uid), 'msgs'), orderBy('at', 'desc'), limit(n || 80)),
  s => cb(s.docs.map(d => ({ id: d.id, ...d.data(), ms: d.data().at ? d.data().at.toMillis() : Date.now() })).reverse()), () => cb([]));
export const lastRead = uid => { try { return +localStorage.getItem('alaabnaRead_' + uid) || 0; } catch (e) { return 0; } };
export const markRead = uid => { try { localStorage.setItem('alaabnaRead_' + uid, Date.now()); } catch (e) {} };

/* ---------- invites ---------- */
export async function invite(uid, game, code) {
  const g = GAMES[game]; if (!g || !profile) return;
  await addDoc(collection(db, 'invites', uid, 'items'), { from: me.uid, name: profile.name, av: profile.av || DEFAULT_AV, game, code: String(code), at: Date.now() });
  await addDoc(collection(db, 'chats', chatId(me.uid, uid), 'msgs'), { from: me.uid, text: 'تعال العب معي ' + g.name, t: 'inv', game, code: String(code), at: serverTimestamp() }).catch(() => {});
}
export const joinUrl = (game, code) => (GAMES[game] ? GAMES[game].file : 'index.html') + '?join=' + encodeURIComponent(code);

/* ---------- floating invite toast (every page) ---------- */
function injectCSS() {
  if (document.getElementById('soc-css')) return;
  const st = document.createElement('style'); st.id = 'soc-css';
  st.textContent = `
  .soc-toast{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;width:min(420px,calc(100% - 24px));background:#fff;color:#2b1340;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.35);display:flex;align-items:center;gap:10px;padding:10px 12px;font:700 15px Cairo,system-ui,sans-serif;direction:rtl;animation:socIn .3s}
  @keyframes socIn{from{transform:translate(-50%,40px);opacity:0}}
  .soc-toast .t{flex:1;line-height:1.35}.soc-toast .t small{display:block;font-weight:400;opacity:.7}
  .soc-toast button{border:0;border-radius:12px;min-height:42px;padding:0 14px;font:900 15px Cairo,sans-serif;cursor:pointer}
  .soc-toast .go{background:#2fbf6a;color:#fff}.soc-toast .no{background:#eee;color:#2b1340}
  .soc-modal{position:fixed;inset:0;z-index:9998;background:rgba(10,5,20,.6);display:flex;align-items:flex-end;justify-content:center;direction:rtl}
  .soc-sheet{width:min(480px,100%);max-height:80vh;overflow:auto;background:#fff;color:#2b1340;border-radius:24px 24px 0 0;padding:18px 16px 24px;font:16px/1.5 Cairo,system-ui,sans-serif}
  .soc-sheet h3{margin:0 0 10px;font:400 26px Lalezar,Cairo,sans-serif}
  .soc-row{display:flex;align-items:center;gap:10px;padding:8px;border-radius:14px}
  .soc-row:nth-child(odd){background:#f6f0fb}
  .soc-row .n{flex:1;font-weight:900}.soc-row .n small{display:block;font-weight:400;opacity:.65}
  .soc-row button{border:0;border-radius:12px;min-height:40px;padding:0 14px;background:#ffcf33;color:#2b1340;font:900 14px Cairo,sans-serif}
  .soc-row button:disabled{background:#2fbf6a;color:#fff}
  .soc-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#bbb;margin-inline-start:6px}.soc-dot.on{background:#2fbf6a}
  .soc-close{margin-top:12px;width:100%;min-height:46px;border-radius:14px;border:2px solid #2b1340;background:none;font:900 16px Cairo,sans-serif;color:#2b1340}
  .soc-empty{opacity:.7;text-align:center;padding:14px}
  .soc-btn{min-height:48px;width:min(440px,100%);border-radius:16px;border:2px dashed currentColor;background:rgba(255,255,255,.12);color:inherit;font:900 17px Cairo,sans-serif;cursor:pointer}`;
  document.head.appendChild(st);
}
let inviteUnsub = null;
function startInviteListener() {
  if (inviteUnsub) { inviteUnsub(); inviteUnsub = null; }
  if (!me || !profile) return;
  const t0 = Date.now() - 10 * 60000;
  inviteUnsub = onSnapshot(query(collection(db, 'invites', me.uid, 'items'), orderBy('at', 'desc'), limit(5)), s => {
    s.docChanges().forEach(ch => {
      if (ch.type !== 'added') return;
      const d = ch.doc.data(), ref = ch.doc.ref;
      if (d.at < t0) { deleteDoc(ref).catch(() => {}); return; }
      showInviteToast(d, () => deleteDoc(ref).catch(() => {}));
    });
  }, () => {});
}
export function showInviteToast(d, done) {
  injectCSS();
  const g = GAMES[d.game]; if (!g) return done && done();
  const el = document.createElement('div'); el.className = 'soc-toast';
  el.innerHTML = `${avatarSVG(d.av, 44)}<div class="t">${esc(d.name)} عزمك<small>${esc(g.name)} · كود ${esc(d.code)}</small></div><button class="go">ادخل</button><button class="no">✕</button>`;
  document.body.appendChild(el);
  try { navigator.vibrate && navigator.vibrate([80, 60, 80]); } catch (e) {}
  const close = () => { el.remove(); done && done(); };
  el.querySelector('.no').onclick = close;
  el.querySelector('.go').onclick = () => { done && done(); location.href = joinUrl(d.game, d.code); };
  setTimeout(() => { if (el.isConnected) close(); }, 60000);
}
onUser(() => startInviteListener());

/* ---------- invite picker for the game waiting rooms ---------- */
export function openInvitePicker(game, code) {
  injectCSS();
  const wrap = document.createElement('div'); wrap.className = 'soc-modal';
  wrap.innerHTML = `<div class="soc-sheet"><h3>ادعي أصحابك</h3><div id="socList"><p class="soc-empty">جاري التحميل…</p></div><button class="soc-close">سكّر</button></div>`;
  document.body.appendChild(wrap);
  const sent = new Set();
  let stop = () => {};
  const close = () => { stop(); wrap.remove(); };
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  wrap.querySelector('.soc-close').onclick = close;
  if (!me || !profile) {
    wrap.querySelector('#socList').innerHTML = `<p class="soc-empty">لازم تعمل حساب عشان تدعي أصحابك.</p><a href="me.html" style="display:block;text-align:center;font-weight:900;color:#9b5de5">اعمل حسابك ←</a>`;
    return;
  }
  stop = watchFriends(list => {
    const box = wrap.querySelector('#socList');
    if (!list.length) { box.innerHTML = `<p class="soc-empty">لسا ما عندك أصحاب. ضيفهم من صفحة «أصحابي».</p>`; return; }
    box.innerHTML = list.map(f => `<div class="soc-row">${avatarSVG(f.av, 40)}<div class="n">${esc(f.name)}<span class="soc-dot ${isOnline(f) ? 'on' : ''}"></span><small>${isOnline(f) ? 'أونلاين' : 'مش أونلاين'}</small></div><button data-u="${esc(f.uid)}" ${sent.has(f.uid) ? 'disabled' : ''}>${sent.has(f.uid) ? 'انبعتت ✓' : 'ادعي'}</button></div>`).join('');
    box.querySelectorAll('button[data-u]').forEach(b => b.onclick = async () => {
      b.disabled = true; b.textContent = '…';
      try { await invite(b.dataset.u, game, code); sent.add(b.dataset.u); b.textContent = 'انبعتت ✓'; }
      catch (e) { b.disabled = false; b.textContent = 'جرّب كمان'; }
    });
  });
}

window.Social = { onUser, currentProfile, currentUser, openInvitePicker, avatarSVG, GAMES };
window.dispatchEvent(new Event('social-loaded'));
