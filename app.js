/* =====================================================================
   SOMDEJ Moral Compass · app.js — แกนกลาง · หน้าแรก · แบบประเมิน
   BUILD ต้องตรงกัน 3 ที่: Config.gs · app.js (MC_BUILD) · version.json
   ===================================================================== */
var MC_BUILD = '2569-10-02.1';
var MC = { boot: null, stats: null, statsAt: 0, token: null, admin: null };

/* ---------- ตัวช่วยทั่วไป ---------- */
function $(s, el) { return (el || document).querySelector(s); }
function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function fmt(n) { return Number(n || 0).toLocaleString('th-TH'); }
function f2(x) { return x === null || x === undefined ? '–' : Number(x).toFixed(2); }
function pct(a, b) { return b > 0 ? Math.round(a / b * 1000) / 10 : 0; }
function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
function toast(msg, kind) {
  var t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + (kind || '');
  clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = 'toast'; }, 3600);
}
var DIM_COLOR = { S: '#2a78d6', O: '#eb6834', M: '#1baf7a', D: '#eda100', E: '#e87ba4', J: '#008300', P: '#c8334f' };
var SCALE = {
  1: ['น้อยที่สุด', 'น้อย', 'ปานกลาง', 'มาก', 'มากที่สุด'],
  2: ['ควรปรับปรุง', 'พอใช้', 'ปานกลาง', 'ดี', 'ดีมาก']
};
function level(x, part) {
  if (x === null || x === undefined) return '';
  var i = x > 4.5 ? 4 : x > 3.5 ? 3 : x > 2.5 ? 2 : x > 1.5 ? 1 : 0;
  return SCALE[part || 2][i];
}

/* ---------- เรียกหลังบ้าน (ไม่ตั้ง Content-Type เพื่อไม่ให้เกิด preflight) ---------- */
function api(action, payload, opt) {
  opt = opt || {};
  var isRead = /^(get|bootstrap|ping)/.test(action), tries = isRead ? 3 : 1;
  function once(n) {
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, opt.timeout || 45000);
    return fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: action, token: MC.token, payload: payload || {} }), redirect: 'follow', credentials: 'omit', signal: ctl.signal })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        clearTimeout(timer);
        if (t.charAt(0) === '<') throw new Error('เซิร์ฟเวอร์ไม่ว่างชั่วคราว กรุณาลองใหม่อีกครั้ง');
        var j = JSON.parse(t);
        if (!j.ok) { var e = new Error(j.error || 'เกิดข้อผิดพลาด'); e.server = true; e.auth = j.auth; throw e; }
        return j.data;
      })
      .catch(function (e) {
        clearTimeout(timer);
        if (e.server) throw e;
        if (n < tries) return new Promise(function (res) { setTimeout(res, 900 * n); }).then(function () { return once(n + 1); });
        if (e.name === 'AbortError') throw new Error('การเชื่อมต่อใช้เวลานานเกินไป กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
        if (/Failed to fetch|NetworkError|Load failed/i.test(e.message)) throw new Error('เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
        throw e;
      });
  }
  return once(1);
}
function loadBoot(force) {
  if (MC.boot && !force) return Promise.resolve(MC.boot);
  var cached = store('mc_boot');
  var p = api('bootstrap').then(function (b) { MC.boot = b; store('mc_boot', b); afterBoot(); return b; });
  if (cached && !force) { MC.boot = cached; afterBoot(); p.catch(function () { }); return Promise.resolve(cached); }
  return p;
}
function afterBoot() {
  var b = MC.boot; if (!b) return;
  $('#footOrg').textContent = b.settings.orgName;
  $('#footVer').textContent = 'v' + b.version;
}
function loadStats(force) {
  if (MC.stats && !force && Date.now() - MC.statsAt < 30000) return Promise.resolve(MC.stats);
  return api('getStats').then(function (s) { MC.stats = s; MC.statsAt = Date.now(); return s; });
}
function quotaOf(u) { var n = 0; for (var k in u.quota) n += u.quota[k]; return n; }
function totalQuota(units) { return units.reduce(function (s, u) { return s + quotaOf(u); }, 0); }

/* ---------- เข็มทิศ SVG (หกทิศ S-O-M-D-E-J) ---------- */
function hexPt(i, r, cx, cy) { var a = (-90 + i * 60) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
function compassSVG(opt) {
  opt = opt || {};
  var L = ['S', 'O', 'M', 'D', 'E', 'J'], cx = 160, cy = 160, R = 112, s = '';
  var lit = opt.lit || {}, cur = opt.current;
  s += '<svg class="compass ' + (opt.cls || '') + '" viewBox="0 0 320 320" role="img" aria-label="เข็มทิศจริยธรรม SOMDEJ">';
  s += '<circle class="c-ring" cx="160" cy="160" r="146"/><circle class="c-ring2" cx="160" cy="160" r="126"/>';
  for (var t = 0; t < 36; t++) { var a = t * 10 * Math.PI / 180, r1 = 146, r2 = t % 3 === 0 ? 136 : 141; s += '<line class="c-tick" x1="' + (cx + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (cy + r1 * Math.sin(a)).toFixed(1) + '" x2="' + (cx + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (cy + r2 * Math.sin(a)).toFixed(1) + '"/>'; }
  var pts = L.map(function (_, i) { return hexPt(i, R, cx, cy).map(function (v) { return v.toFixed(1); }).join(','); }).join(' ');
  s += '<polygon class="c-hex" points="' + pts + '"/>';
  L.forEach(function (_, i) { var p = hexPt(i, R, cx, cy); s += '<line class="c-spoke" x1="160" y1="160" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '"/>'; });
  var ang = cur ? L.indexOf(cur) * 60 : 0;
  s += '<g class="c-needle' + (opt.spin ? ' spin' : '') + '" style="transform:rotate(' + ang + 'deg)"><path d="M160 62 L172 160 L160 258 L148 160 Z" class="n-south"/><path d="M160 62 L172 160 L148 160 Z" class="n-north"/></g>';
  s += '<circle class="c-hub" cx="160" cy="160" r="9"/>';
  L.forEach(function (l, i) {
    var p = hexPt(i, R, cx, cy), on = lit[l] || opt.all;
    s += '<g class="c-node' + (on ? ' on' : '') + (cur === l ? ' cur' : '') + '" style="--dc:' + DIM_COLOR[l] + ';--i:' + i + '"><circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="24"/><text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 8).toFixed(1) + '">' + l + '</text></g>';
  });
  return s + '</svg>';
}

/* ---------- เส้นทางหน้า ---------- */
var ROUTES = {};
function route() {
  var hsh = location.hash.replace(/^#\/?/, '') || 'home', name = hsh.split('/')[0];
  if (!ROUTES[name]) name = 'home';
  $$('.nav a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-nav') === name); });
  document.body.setAttribute('data-page', name);
  closeModal();
  var app = $('#app');
  Promise.resolve().then(function () { return ROUTES[name](app, hsh.split('/').slice(1)); }).catch(function (e) { pageError(app, e); });
  window.scrollTo(0, 0);
}
function pageError(app, e) {
  app.innerHTML = '<section class="wrap narrow"><div class="card center pad-xl"><div class="err-ico">!</div><h2>เปิดหน้านี้ไม่สำเร็จ</h2><p class="muted">' + esc(e.message) + '</p><button class="btn primary" onclick="route()">ลองใหม่อีกครั้ง</button></div></section>';
}
function openModal(html, cls) {
  var m = $('#modal'); m.hidden = false; m.innerHTML = '<div class="modal-back" data-close></div><div class="modal-box ' + (cls || '') + '" role="dialog" aria-modal="true">' + html + '</div>';
  m.onclick = function (e) { if (e.target.hasAttribute('data-close') || e.target.closest('[data-close]')) closeModal(); };
  document.body.classList.add('no-scroll');
  var f = $('input,select,textarea,button', $('.modal-box', m)); if (f) f.focus();
}
function closeModal() { var m = $('#modal'); if (m.hidden) return; m.hidden = true; m.innerHTML = ''; document.body.classList.remove('no-scroll'); }
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

/* ---------- ตัวเลขวิ่ง ---------- */
function countUp(el, to, dec, suffix) {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches, t0 = performance.now(), dur = 900;
  function out(v) { el.textContent = (dec ? v.toFixed(dec) : fmt(Math.round(v))) + (suffix || ''); }
  if (reduce || !to) return out(to || 0);
  (function step(t) { var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); out(to * e); if (k < 1) requestAnimationFrame(step); })(t0);
}

/* =====================================================================
   หน้าแรก
   ===================================================================== */
ROUTES.home = function (app) {
  return loadBoot().then(function (b) {
    var s = b.settings, done = store('mc_done_' + s.roundId), qn = b.questions.length;
    var dims = b.dims.filter(function (d) { return d.part === 2; });
    app.innerHTML =
      '<section class="hero"><div class="hero-sky" aria-hidden="true">' + stars(26) + '</div><div class="hero-in">' +
      '<div class="hero-copy"><span class="pill gold">' + esc(s.roundName) + '</span>' +
      '<h1><span class="h1-a">SOMDEJ</span> <span class="h1-b">Moral Compass</span></h1>' +
      '<p class="hero-th">เข็มทิศจริยธรรม นำทางการพยาบาลด้วยหัวใจ</p>' +
      '<p class="hero-sub">' + esc(s.surveyTitle) + '</p>' +
      '<div class="hero-cta">' +
      (s.open ? '<a class="btn xl gold" href="#/survey">' + (done ? 'ทำแบบประเมินอีกครั้ง' : 'เริ่มทำแบบประเมิน') + '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>'
        : '<span class="closed-note">' + esc(s.closedMsg) + '</span>') +
      '<a class="btn xl ghost" href="#/dashboard">ดูภาพรวม</a></div>' +
      (done ? '<p class="hero-done">อุปกรณ์นี้ส่งคำตอบแล้ว ขอบคุณที่ร่วมเป็นส่วนหนึ่งค่ะ</p>' : '') +
      '<ul class="hero-facts"><li><b>' + qn + '</b> ข้อ</li><li>ประมาณ <b>5</b> นาที</li><li>ไม่ระบุตัวผู้ตอบ</li></ul></div>' +
      '<div class="hero-art">' + compassSVG({ all: true, spin: true, cls: 'big' }) + '</div></div>' +
      '<svg class="hero-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40c240 40 480 40 720 10s480-40 720 0v30H0z"/></svg></section>' +
      '<section class="wrap"><div class="live" id="live"><div class="live-item"><span class="live-num" id="lvN">–</span><span class="live-lbl">ผู้ร่วมประเมินแล้ว</span></div><div class="live-item"><span class="live-num" id="lvP">–</span><span class="live-lbl">ของบุคลากรฝ่ายการพยาบาล</span></div><div class="live-item"><span class="live-num" id="lvU">–</span><span class="live-lbl">หน่วยงานที่เริ่มตอบแล้ว</span></div></div>' +
      '<h2 class="sec-title">หกทิศของ SOMDEJ MORAL MODEL</h2><p class="sec-sub">อัตลักษณ์ทางจริยธรรมของพยาบาลโรงพยาบาลสมเด็จพระบรมราชเทวี ณ ศรีราชา</p>' +
      '<div class="dims">' + dims.map(function (d, i) {
        return '<article class="dim-card" style="--dc:' + DIM_COLOR[d.code] + ';--i:' + i + '"><span class="dim-letter">' + d.code + '</span><h3>' + esc(d.name) + '</h3><p>' + esc(d.nameTh) + '</p></article>';
      }).join('') + '</div>' +
      '<div class="how"><div class="how-step"><span>1</span><h3>เลือกหน่วยงานและตำแหน่ง</h3><p>ไม่ต้องกรอกชื่อหรือรหัสพนักงาน</p></div><div class="how-step"><span>2</span><h3>ตอบทีละทิศ</h3><p>เข็มทิศจะสว่างขึ้นทีละดวงเมื่อตอบครบแต่ละองค์ประกอบ</p></div><div class="how-step"><span>3</span><h3>ดูเข็มทิศของตนเอง</h3><p>เมื่อส่งคำตอบ ระบบแสดงผลสะท้อนรายองค์ประกอบของท่านทันที</p></div></div></section>';
    loadStats().then(function (st) {
      var units = b.units, tq = totalQuota(units), started = units.filter(function (u) { return (st.byUnit[u.id] || {}).n > 0; }).length;
      countUp($('#lvN'), st.n); countUp($('#lvP'), pct(st.n, tq), 1, '%'); countUp($('#lvU'), started, 0, ' / ' + units.length);
    }).catch(function () { });
  });
};
function stars(n) {
  var s = ''; for (var i = 0; i < n; i++) s += '<i style="left:' + ((i * 37 + 11) % 100) + '%;top:' + ((i * 53 + 7) % 92) + '%;--d:' + ((i % 7) * 0.6) + 's;--s:' + (2 + (i % 3)) + 'px"></i>';
  return s;
}

/* =====================================================================
   แบบประเมิน
   ===================================================================== */
var SV = null;
ROUTES.survey = function (app) {
  return loadBoot(true).catch(function (e) { if (MC.boot) return MC.boot; throw e; }).then(function (b) {
    var s = b.settings;
    if (!s.open) { app.innerHTML = '<section class="wrap narrow"><div class="card center pad-xl">' + compassSVG({ cls: 'mid' }) + '<h2>ปิดรับคำตอบ</h2><p class="muted">' + esc(s.closedMsg) + '</p><a class="btn primary" href="#/dashboard">ดูภาพรวม</a></div></section>'; return; }
    var steps = [{ type: 'intro' }];
    b.dims.forEach(function (d) {
      var qs = b.questions.filter(function (q) { return q.dim === d.code; });
      if (qs.length) steps.push({ type: 'dim', dim: d, qs: qs });
    });
    steps.push({ type: 'end' });
    var draft = store('mc_draft') || {};
    if (draft.round !== s.roundId) draft = {};
    SV = { b: b, steps: steps, i: 0, unitId: draft.unitId || '', posId: draft.posId || '', exp: draft.exp || '', a: draft.a || {}, comment: draft.comment || '', sending: false };
    b.questions.forEach(function () { });
    for (var k in SV.a) if (!b.questions.some(function (q) { return q.id === k; })) delete SV.a[k];
    app.innerHTML = '<section class="wrap survey"><div class="sv-head"><div class="sv-compass" id="svCompass"></div><div class="sv-prog"><div class="sv-prog-top"><span id="svStepLbl"></span><span id="svCount"></span></div><div class="bar"><i id="svBar"></i></div></div></div><div id="svBody"></div></section>';
    svRender();
  });
};
function svSave() { store('mc_draft', { round: SV.b.settings.roundId, unitId: SV.unitId, posId: SV.posId, exp: SV.exp, a: SV.a, comment: SV.comment }); }
function svLit() {
  var lit = {};
  SV.steps.forEach(function (st) { if (st.type === 'dim') lit[st.dim.code] = st.qs.every(function (q) { return SV.a[q.id]; }); });
  return lit;
}
function svProgress() {
  var total = SV.b.questions.length, done = SV.b.questions.filter(function (q) { return SV.a[q.id]; }).length;
  $('#svBar').style.width = pct(done, total) + '%';
  $('#svCount').textContent = 'ตอบแล้ว ' + done + ' / ' + total + ' ข้อ';
  var st = SV.steps[SV.i];
  $('#svCompass').innerHTML = compassSVG({ lit: svLit(), current: st.type === 'dim' && st.dim.part === 2 ? st.dim.code : null, cls: 'mini' });
}
function svRender() {
  var st = SV.steps[SV.i], b = SV.b, body = $('#svBody'), h = '';
  $('#svStepLbl').textContent = 'ขั้นที่ ' + (SV.i + 1) + ' จาก ' + SV.steps.length;
  if (st.type === 'intro') {
    var groups = {}; b.units.forEach(function (u) { (groups[u.group || 'อื่น ๆ'] = groups[u.group || 'อื่น ๆ'] || []).push(u); });
    h = '<div class="card step"><h2>ก่อนเริ่มออกเดินทาง</h2><p class="intro">' + esc(b.settings.intro) + '</p>' +
      '<label class="fld"><span>หน่วยงานของท่าน <em>*</em></span><select id="fUnit"><option value="">เลือกหน่วยงาน</option>' +
      Object.keys(groups).map(function (g) { return '<optgroup label="' + esc(g) + '">' + groups[g].map(function (u) { return '<option value="' + u.id + '"' + (u.id === SV.unitId ? ' selected' : '') + '>' + esc(u.name) + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select></label>' +
      '<div class="fld"><span>ตำแหน่ง <em>*</em></span><div class="chips" id="fPos" role="radiogroup" aria-label="ตำแหน่ง">' + b.positions.map(function (p) { return '<button type="button" role="radio" aria-checked="' + (p.id === SV.posId) + '" class="chip' + (p.id === SV.posId ? ' on' : '') + '" data-v="' + p.id + '">' + esc(p.name) + '</button>'; }).join('') + '</div></div>' +
      '<div class="fld"><span>อายุงานในโรงพยาบาล <small>(ไม่บังคับ)</small></span><div class="chips" id="fExp" role="radiogroup" aria-label="อายุงาน">' + b.exp.map(function (x) { return '<button type="button" role="radio" aria-checked="' + (x === SV.exp) + '" class="chip' + (x === SV.exp ? ' on' : '') + '" data-v="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div></div></div>';
  } else if (st.type === 'dim') {
    var d = st.dim, sc = SCALE[d.part];
    h = '<div class="card step dimstep" style="--dc:' + DIM_COLOR[d.code] + '"><div class="dim-head"><span class="dim-letter lg">' + (d.part === 1 ? '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3z"/><path d="M8 9h6M8 13h6"/></svg>' : d.code) + '</span><div><span class="eyebrow">' + (d.part === 1 ? 'ตอนที่ 1 · การรับรู้' : 'ตอนที่ 2 · ประเมินพฤติกรรมของตนเอง') + '</span><h2>' + esc(d.name) + '</h2><p>' + esc(d.nameTh) + '</p></div></div>' +
      '<p class="scale-hint">' + (d.part === 1 ? 'ท่านรับรู้หรือเห็นด้วยกับข้อความต่อไปนี้ในระดับใด' : 'ท่านปฏิบัติพฤติกรรมต่อไปนี้ในระดับใด') + ' <b>5 = ' + sc[4] + '</b> … <b>1 = ' + sc[0] + '</b></p>' +
      st.qs.map(function (q, n) {
        return '<div class="q' + (SV.a[q.id] ? ' ok' : '') + '" id="q_' + q.id + '" style="--i:' + n + '"><p class="q-text"><span class="q-no">' + (n + 1) + '</span>' + esc(q.text) + '</p><div class="rate" role="radiogroup" aria-label="' + esc(q.text) + '">' +
          [5, 4, 3, 2, 1].map(function (v) { var on = SV.a[q.id] === v; return '<button type="button" role="radio" aria-checked="' + on + '" class="r' + (on ? ' on' : '') + '" data-q="' + q.id + '" data-v="' + v + '"><b>' + v + '</b><small>' + sc[v - 1] + '</small></button>'; }).join('') + '</div></div>';
      }).join('') + '</div>';
  } else {
    var u = b.units.filter(function (x) { return x.id === SV.unitId; })[0], p = b.positions.filter(function (x) { return x.id === SV.posId; })[0];
    h = '<div class="card step"><h2>ถึงปลายทางแล้ว</h2><p class="intro">ตรวจสอบข้อมูลแล้วกดส่งคำตอบได้เลยค่ะ</p>' +
      '<dl class="review"><div><dt>หน่วยงาน</dt><dd>' + esc(u ? u.name : '-') + '</dd></div><div><dt>ตำแหน่ง</dt><dd>' + esc(p ? p.name : '-') + '</dd></div><div><dt>ตอบแล้ว</dt><dd>' + b.questions.filter(function (q) { return SV.a[q.id]; }).length + ' / ' + b.questions.length + ' ข้อ</dd></div></dl>' +
      '<label class="fld"><span>ข้อเสนอแนะเพื่อพัฒนาจริยธรรมทางการพยาบาล <small>(ไม่บังคับ)</small></span><textarea id="fComment" rows="4" maxlength="1000" placeholder="เล่าสิ่งที่อยากให้ฝ่ายการพยาบาลทราบ">' + esc(SV.comment) + '</textarea></label></div>';
  }
  var last = SV.i === SV.steps.length - 1;
  h += '<div class="sv-nav">' + (SV.i > 0 ? '<button class="btn ghost-dark" id="svPrev">ย้อนกลับ</button>' : '<span></span>') +
    '<button class="btn primary lg" id="svNext">' + (last ? 'ส่งคำตอบ' : 'ถัดไป') + '</button></div>';
  body.innerHTML = h;
  svProgress();
  // events
  $$('#fPos .chip', body).forEach(function (c) { c.onclick = function () { SV.posId = c.getAttribute('data-v'); pick('#fPos', c); svSave(); }; });
  $$('#fExp .chip', body).forEach(function (c) { c.onclick = function () { var v = c.getAttribute('data-v'); SV.exp = SV.exp === v ? '' : v; pick('#fExp', SV.exp ? c : null); svSave(); }; });
  var fu = $('#fUnit', body); if (fu) fu.onchange = function () { SV.unitId = fu.value; svSave(); };
  var fc = $('#fComment', body); if (fc) fc.oninput = function () { SV.comment = fc.value; svSave(); };
  $$('.rate .r', body).forEach(function (r) {
    r.onclick = function () {
      var q = r.getAttribute('data-q'); SV.a[q] = Number(r.getAttribute('data-v'));
      $$('.r', r.parentNode).forEach(function (x) { var on = x === r; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
      var box = $('#q_' + q); box.classList.add('ok'); box.classList.remove('miss');
      svSave(); svProgress();
      var nx = box.nextElementSibling;
      if (nx && nx.classList.contains('q') && !nx.classList.contains('ok')) nx.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  });
  var pv = $('#svPrev'); if (pv) pv.onclick = function () { SV.i--; svRender(); window.scrollTo(0, 0); };
  $('#svNext').onclick = svNext;
}
function pick(sel, on) { $$(sel + ' .chip').forEach(function (x) { var is = x === on; x.classList.toggle('on', is); x.setAttribute('aria-checked', is); }); }
function svNext() {
  var st = SV.steps[SV.i];
  if (st.type === 'intro') {
    if (!SV.unitId) return toast('กรุณาเลือกหน่วยงาน', 'warn');
    if (!SV.posId) return toast('กรุณาเลือกตำแหน่ง', 'warn');
  }
  if (st.type === 'dim') {
    var miss = st.qs.filter(function (q) { return !SV.a[q.id]; });
    if (miss.length) {
      miss.forEach(function (q) { $('#q_' + q.id).classList.add('miss'); });
      $('#q_' + miss[0].id).scrollIntoView({ behavior: 'smooth', block: 'center' });
      return toast('ยังเหลืออีก ' + miss.length + ' ข้อในหน้านี้', 'warn');
    }
  }
  if (st.type === 'end') return svSubmit();
  SV.i++; svRender(); window.scrollTo(0, 0);
}
function svSubmit() {
  if (SV.sending) return;
  var btn = $('#svNext'); SV.sending = true; btn.disabled = true; btn.innerHTML = '<span class="spin-s"></span> กำลังส่งคำตอบ…';
  api('submit', { unitId: SV.unitId, posId: SV.posId, exp: SV.exp, answers: SV.a, comment: SV.comment }, { timeout: 60000 }).then(function () {
    var b = SV.b, mine = {};
    b.dims.forEach(function (d) {
      var v = b.questions.filter(function (q) { return q.dim === d.code; }).map(function (q) { return SV.a[q.id]; });
      if (v.length) mine[d.code] = v.reduce(function (x, y) { return x + y; }, 0) / v.length;
    });
    store('mc_draft', null); store('mc_done_' + b.settings.roundId, 1); MC.statsAt = 0;
    svThanks(mine);
  }).catch(function (e) {
    SV.sending = false; btn.disabled = false; btn.textContent = 'ส่งคำตอบ';
    toast(e.message, 'bad');
  });
}
function svThanks(mine) {
  var b = SV.b, dims = b.dims.filter(function (d) { return d.part === 2 && mine[d.code] !== undefined; });
  var all = b.questions.filter(function (q) { return q.part === 2; }).map(function (q) { return SV.a[q.id]; }), avg = all.length ? all.reduce(function (x, y) { return x + y; }, 0) / all.length : null;
  $('#app').innerHTML = '<section class="wrap narrow thanks">' + confetti(28) + '<div class="card center pad-xl"><span class="pill rose">ส่งคำตอบเรียบร้อย</span><h2>ขอบคุณที่ร่วมเป็นเข็มทิศของกันและกัน</h2><p class="muted">นี่คือเข็มทิศจริยธรรมของท่านในวันนี้ ระบบไม่ได้บันทึกว่าท่านเป็นใคร</p>' +
    '<div class="mine">' + radarSVG(dims.map(function (d) { return { code: d.code, name: d.name, v: mine[d.code] }; }), { anim: true }) + '</div>' +
    (avg !== null ? '<p class="mine-avg">ค่าเฉลี่ยรวมของท่าน <b>' + f2(avg) + '</b> <span class="lvl">' + level(avg, 2) + '</span></p>' : '') +
    '<ul class="mine-list">' + dims.map(function (d) { return '<li><span class="dot" style="background:' + DIM_COLOR[d.code] + '"></span><b>' + d.code + '</b> ' + esc(d.name) + '<span class="v">' + f2(mine[d.code]) + '</span></li>'; }).join('') + '</ul>' +
    '<div class="row-btn"><a class="btn primary" href="#/dashboard">ดูภาพรวมของฝ่ายการพยาบาล</a><a class="btn ghost-dark" href="#/">กลับหน้าแรก</a></div></div></section>';
  window.scrollTo(0, 0);
}
function confetti(n) {
  var c = ['#e5486b', '#f0b54a', '#2a78d6', '#1baf7a', '#e87ba4'], s = '<div class="confetti" aria-hidden="true">';
  for (var i = 0; i < n; i++) s += '<i style="left:' + ((i * 41 + 5) % 100) + '%;background:' + c[i % c.length] + ';--d:' + ((i % 9) * 0.12) + 's;--r:' + ((i * 67) % 360) + 'deg"></i>';
  return s + '</div>';
}

/* ---------- เริ่มทำงาน ---------- */
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', function () {
  var tk = store('mc_tk'); if (tk) { MC.token = tk.token; MC.admin = tk; }
  route();
});
