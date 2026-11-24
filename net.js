/* ألعابنا — room helper for the public site, phone-to-phone with PeerJS.
   The host's phone opens a peer named after the room code; the others connect to it.
   Every phone keeps one presence object {nm, host, st, a, ...}; the host relays everyone's
   presence to everyone, so the games work exactly like inside Claude. */
window.Net = (() => {
  let peer = null, myId = null, hostConn = null, conns = [], isHostMe = false;
  let pres = {}, mine = {}, cb = () => {}, pending = false;
  const clean = s => String(s == null ? '' : s).replace(/[<>&"]/g, '').slice(0, 14);
  const fire = () => { if (pending) return; pending = true; setTimeout(() => { pending = false; cb(list()); }, 0); };
  const roomId = (game, code) => ('alaabna-' + game + '-' + code).toLowerCase();

  function broadcast() {
    const msg = { t: 'all', peers: pres };
    conns.forEach(c => { try { if (c.open) c.send(msg); } catch (e) {} });
  }
  let bT = null;
  const soon = () => { if (bT) return; bT = setTimeout(() => { bT = null; broadcast(); }, 40); };

  function ready() { return Promise.resolve(typeof Peer !== 'undefined'); }

  function join(game, code, nm, isHost) {
    return new Promise((resolve, reject) => {
      if (typeof Peer === 'undefined') return reject(new Error('nolib'));
      leave();
      isHostMe = !!isHost; pres = {}; conns = [];
      mine = { nm: clean(nm), host: isHostMe, st: null, a: null, ch: [] };
      let done = false;
      const fail = e => { if (!done) { done = true; leave(); reject(e); } };
      const ok = () => { if (!done) { done = true; resolve(true); } };
      peer = isHostMe ? new Peer(roomId(game, code)) : new Peer();
      const timer = setTimeout(() => fail(new Error('timeout')), 15000);
      peer.on('error', e => { clearTimeout(timer); fail(e); });
      peer.on('open', id => {
        myId = id;
        pres[myId] = mine;
        if (isHostMe) {
          clearTimeout(timer);
          peer.on('connection', c => {
            c.on('open', () => { conns.push(c); c.send({ t: 'all', peers: pres }); });
            c.on('data', d => {
              if (!d || d.t !== 'p' || typeof d.pr !== 'object') return;
              pres[c.peer] = d.pr; soon(); fire();
            });
            c.on('close', () => { conns = conns.filter(x => x !== c); delete pres[c.peer]; soon(); fire(); });
          });
          fire(); ok();
        } else {
          hostConn = peer.connect(roomId(game, code), { reliable: true });
          hostConn.on('open', () => { clearTimeout(timer); hostConn.send({ t: 'p', pr: mine }); fire(); ok(); });
          hostConn.on('data', d => {
            if (!d || d.t !== 'all' || typeof d.peers !== 'object') return;
            pres = d.peers; pres[myId] = mine; fire();
          });
          hostConn.on('close', () => { pres = { [myId]: mine }; fire(); });
        }
      });
    });
  }

  function list() {
    return Object.keys(pres).filter(id => pres[id] && pres[id].nm).sort().map(id => {
      const p = pres[id];
      return { peer: id, me: id === myId, nm: clean(p.nm), host: !!p.host, st: p.st || null, a: p.a || null, ch: p.ch || null, pr: p };
    });
  }
  function host() { return list().filter(p => p.host)[0] || null; }
  function me() { return list().find(p => p.me) || null; }
  function set(patch) {
    mine = { ...mine };
    Object.keys(patch).forEach(k => { if (patch[k] === null) mine[k] = null; else mine[k] = patch[k]; });
    if (myId) pres[myId] = mine;
    if (isHostMe) soon();
    else if (hostConn && hostConn.open) { try { hostConn.send({ t: 'p', pr: mine }); } catch (e) {} }
    fire();
    return Promise.resolve();
  }
  function leave() {
    try { conns.forEach(c => c.close()); } catch (e) {}
    try { if (hostConn) hostConn.close(); } catch (e) {}
    try { if (peer) peer.destroy(); } catch (e) {}
    peer = null; hostConn = null; conns = []; myId = null;
    return Promise.resolve();
  }
  const code = () => String(Math.floor(1000 + Math.random() * 9000));

  function lobby(game, opts) {
    const $ = s => document.querySelector(s);
    let isH = false, cur = '';
    try { $('#nm').value = localStorage.getItem('alaabnaName') || ''; } catch (e) {}
    const err = m => { const e = $('#err'); e.textContent = m; e.style.display = m ? 'block' : 'none'; };
    const digits = s => s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '');
    async function go(h, c, tries) {
      const nm = clean($('#nm').value.trim());
      if (!nm) return err('اكتب اسمك أول');
      try { localStorage.setItem('alaabnaName', nm); } catch (e) {}
      err('جاري الاتصال…');
      try { await join(game, c, nm, h); }
      catch (e) {
        const t = e && e.type;
        if (h && t === 'unavailable-id' && (tries || 0) < 3) return go(true, code(), (tries || 0) + 1);
        if (!h && t === 'peer-unavailable') return err('ما لقينا غرفة بهالكود. تأكد من الكود، وإنه صاحب الغرفة لسا فاتح اللعبة.');
        return err('ما زبط الاتصال. تأكد إنك متصل بالإنترنت وجرّب كمان مرة.');
      }
      err(''); isH = h; cur = c;
      $('#codeShow').textContent = c;
      opts.joined(h);
    }
    $('#create').addEventListener('click', () => go(true, code()));
    $('#joinB').addEventListener('click', () => {
      const c = digits($('#code').value);
      if (c.length !== 4) return err('الكود لازم يكون ٤ أرقام');
      go(false, c);
    });
    window.addEventListener('pagehide', leave);
    return { isHost: () => isH, code: () => cur };
  }

  return { ready, join, list, host, me, set, leave, code, clean, lobby, onChange: f => { cb = f; } };
})();
