/* =====================================================================
   SOMDEJ Moral Compass · admin.js — ผู้ดูแลระบบ
   ===================================================================== */
var AD = { tab: 'overview', data: null, round: null };

ROUTES.admin = function (app, parts) {
  if (!MC.token) return adLogin(app);
  if (MC.admin && MC.admin.mustChange) return adFirstPass(app);
  if (parts && parts[0]) AD.tab = parts[0];
  app.innerHTML = '<section class="wrap"><div class="skeleton"><div></div><div></div></div></section>';
  return adLoad().then(function () { adRender(app); }).catch(function (e) {
    if (e.auth === false) { adSignOut(true); return adLogin(app, 'หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่'); }
    if (/ตั้งรหัสผ่านใหม่/.test(e.message)) { MC.admin.mustChange = true; return adFirstPass(app); }
    throw e;
  });
};
function adLoad() { return api('getAdminData', { round: AD.round }).then(function (d) { AD.data = d; if (!AD.round) AD.round = d.settings.roundId; return d; }); }
function adSignOut(silent) { if (!silent && MC.token) api('logout').catch(function () { }); MC.token = null; MC.admin = null; store('mc_tk', null); AD.data = null; AD.round = null; }

function adLogin(app, msg) {
  app.innerHTML = '<section class="wrap narrow"><form class="card login" id="lgForm" autocomplete="on">' + compassSVG({ all: true, cls: 'mid' }) +
    '<h2>ผู้ดูแลระบบ</h2><p class="muted">สำหรับคณะกรรมการจริยธรรมทางการพยาบาลและผู้ที่ได้รับมอบหมาย</p>' + (msg ? '<p class="alert">' + esc(msg) + '</p>' : '') +
    '<label class="fld"><span>ชื่อผู้ใช้</span><input id="lgU" name="username" autocomplete="username" required></label>' +
    '<label class="fld"><span>รหัสผ่าน</span><input id="lgP" name="password" type="password" autocomplete="current-password" required></label>' +
    '<button class="btn primary lg block" id="lgBtn">เข้าสู่ระบบ</button><p class="conn" id="lgConn">กำลังตรวจสอบการเชื่อมต่อ…</p></form></section>';
  api('ping').then(function (p) { $('#lgConn').innerHTML = '<span class="okdot"></span> เชื่อมต่อระบบแล้ว' + (p.build !== MC_BUILD ? ' · หลังบ้านเป็น build ' + esc(p.build) + ' (หน้าเว็บ ' + MC_BUILD + ')' : ''); })
    .catch(function (e) { var c = $('#lgConn'); if (c) c.textContent = e.message; });
  $('#lgForm').onsubmit = function (ev) {
    ev.preventDefault(); var btn = $('#lgBtn'); btn.disabled = true; btn.innerHTML = '<span class="spin-s"></span> กำลังเข้าสู่ระบบ…';
    api('login', { username: $('#lgU').value, password: $('#lgP').value }).then(function (d) {
      MC.token = d.token; MC.admin = d; store('mc_tk', d); route();
    }).catch(function (e) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; toast(e.message, 'bad'); });
  };
}
function adFirstPass(app) {
  app.innerHTML = '<section class="wrap narrow"><form class="card login" id="fpForm"><h2>ตั้งรหัสผ่านใหม่</h2><p class="muted">เข้าใช้งานครั้งแรก กรุณาตั้งรหัสผ่านของท่านเอง (อย่างน้อย 8 ตัวอักษร)</p>' +
    '<label class="fld"><span>รหัสผ่านชั่วคราว</span><input id="fpO" type="password" autocomplete="current-password" required></label>' +
    '<label class="fld"><span>รหัสผ่านใหม่</span><input id="fpN" type="password" autocomplete="new-password" minlength="8" required></label>' +
    '<label class="fld"><span>ยืนยันรหัสผ่านใหม่</span><input id="fpC" type="password" autocomplete="new-password" minlength="8" required></label>' +
    '<button class="btn primary lg block">บันทึกรหัสผ่าน</button><button type="button" class="btn link block" id="fpOut">ออกจากระบบ</button></form></section>';
  $('#fpOut').onclick = function () { adSignOut(); route(); };
  $('#fpForm').onsubmit = function (ev) {
    ev.preventDefault();
    if ($('#fpN').value !== $('#fpC').value) return toast('รหัสผ่านใหม่สองช่องไม่ตรงกัน', 'warn');
    api('changePassword', { oldPassword: $('#fpO').value, newPassword: $('#fpN').value }).then(function () {
      MC.admin.mustChange = false; store('mc_tk', MC.admin); toast('ตั้งรหัสผ่านใหม่เรียบร้อย', 'ok'); route();
    }).catch(function (e) { toast(e.message, 'bad'); });
  };
}

var AD_TABS = [['overview', 'ภาพรวมเชิงลึก'], ['units', 'หน่วยงานและกรอบจำนวน'], ['questions', 'ข้อคำถาม'], ['data', 'ข้อมูลและข้อเสนอแนะ'], ['settings', 'ตั้งค่า']];
function adRender(app) {
  var d = AD.data;
  app.innerHTML = '<section class="wrap admin"><div class="ad-bar"><div class="tabs" role="tablist">' + AD_TABS.map(function (t) { return '<a role="tab" href="#/admin/' + t[0] + '" class="tab' + (AD.tab === t[0] ? ' on' : '') + '">' + t[1] + '</a>'; }).join('') + '</div>' +
    '<div class="ad-me"><span>' + esc(d.me.name) + '</span><button class="btn link" id="adOut">ออกจากระบบ</button></div></div><div id="adBody"></div></section>';
  $('#adOut').onclick = function () { adSignOut(); location.hash = '#/'; };
  var body = $('#adBody');
  ({ overview: adOverview, units: adUnits, questions: adQuestions, data: adDataTab, settings: adSettings }[AD.tab] || adOverview)(body, d);
}
function adReload() { return adLoad().then(function () { MC.boot = null; MC.statsAt = 0; store('mc_boot', null); adRender($('#app')); }); }
function busy(btn, on, label) { if (!btn) return; if (on) { btn._t = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin-s"></span> ' + (label || 'กำลังบันทึก…'); } else { btn.disabled = false; btn.innerHTML = btn._t; } }

/* ---------- ภาพรวมเชิงลึก ---------- */
function adOverview(body, d) {
  var roundSel = '<label class="sel-sm"><span class="sr">รอบการประเมิน</span><select id="adRound">' + d.rounds.map(function (r) { return '<option' + (r === AD.round ? ' selected' : '') + '>' + esc(r) + '</option>'; }).join('') + '</select></label><button class="btn ghost-dark sm" id="adPrint">พิมพ์ / บันทึก PDF</button>';
  body.innerHTML = '<div class="dash" id="adDash"></div>';
  var b = { settings: d.settings, units: d.units, positions: d.positions, dims: d.dims, questions: d.questions };
  renderDash($('#adDash'), b, d.stats, { admin: true, headExtra: roundSel, roundName: AD.round === d.settings.roundId ? d.settings.roundName : 'รอบ ' + AD.round, onRefresh: function () { adReload().then(function () { toast('อัปเดตข้อมูลแล้ว', 'ok'); }); } });
  $('#adRound').onchange = function () { AD.round = this.value; adReload(); };
  $('#adPrint').onclick = function () { window.print(); };
}

/* ---------- หน่วยงานและกรอบจำนวน ---------- */
function adUnits(body, d) {
  var pos = d.positions, rows = d.units.map(function (u) { return JSON.parse(JSON.stringify(u)); });
  function tot() { return rows.reduce(function (s, u) { return s + (u.active === false ? 0 : quotaOf(u)); }, 0); }
  function draw() {
    body.innerHTML = '<div class="card"><div class="card-head"><div><h2 class="card-t">หน่วยงานและกรอบจำนวนบุคลากร</h2><p class="card-s">กรอบจำนวนคือฐานที่ใช้คิดร้อยละการตอบกลับ แก้ไขตัวเลขให้ตรงกับจำนวนบุคลากรที่ปฏิบัติงานจริงในแต่ละหน่วยงานได้ · รวมทั้งสิ้น <b id="uTot">' + fmt(tot()) + '</b> คน</p></div><div class="row-btn"><button class="btn ghost-dark sm" id="uAdd">+ เพิ่มหน่วยงาน</button><button class="btn primary sm" id="uSave">บันทึก</button></div></div>' +
      '<div class="tbl-wrap"><table class="tbl edit"><thead><tr><th>ใช้</th><th>ชื่อหน่วยงาน</th><th>ชื่อย่อ</th><th>กลุ่ม</th>' + pos.map(function (p) { return '<th class="num" title="' + esc(p.name) + '">' + esc(p.id) + '</th>'; }).join('') + '<th class="num">รวม</th><th></th></tr></thead><tbody>' +
      rows.map(function (u, i) {
        return '<tr data-i="' + i + '"><td><input type="checkbox" data-f="active"' + (u.active === false ? '' : ' checked') + ' aria-label="เปิดใช้"></td><td><input data-f="name" value="' + esc(u.name) + '" class="w-l" aria-label="ชื่อหน่วยงาน"></td><td><input data-f="short" value="' + esc(u.short) + '" class="w-s" aria-label="ชื่อย่อ"></td><td><input data-f="group" value="' + esc(u.group) + '" class="w-m" list="grpList" aria-label="กลุ่ม"></td>' +
          pos.map(function (p) { return '<td><input type="number" min="0" data-q="' + p.id + '" value="' + (u.quota[p.id] || '') + '" class="w-n" aria-label="' + esc(p.name) + '"></td>'; }).join('') +
          '<td class="num"><b class="rt">' + quotaOf(u) + '</b></td><td class="mv"><button data-mv="-1" aria-label="เลื่อนขึ้น">↑</button><button data-mv="1" aria-label="เลื่อนลง">↓</button></td></tr>';
      }).join('') + '</tbody></table></div><datalist id="grpList">' + uniq(rows.map(function (u) { return u.group; })).map(function (g) { return '<option value="' + esc(g) + '">'; }).join('') + '</datalist>' +
      '<p class="legend-s">' + pos.map(function (p) { return '<b>' + p.id + '</b> ' + esc(p.name); }).join(' · ') + '</p></div>';
    $$('tbody tr', body).forEach(function (tr) {
      var u = rows[Number(tr.getAttribute('data-i'))];
      $$('input', tr).forEach(function (inp) {
        inp.oninput = inp.onchange = function () {
          var f = inp.getAttribute('data-f'), q = inp.getAttribute('data-q');
          if (f === 'active') u.active = inp.checked; else if (f) u[f] = inp.value;
          if (q) { var n = Math.max(0, Math.floor(Number(inp.value) || 0)); if (n) u.quota[q] = n; else delete u.quota[q]; $('.rt', tr).textContent = quotaOf(u); }
          $('#uTot').textContent = fmt(tot());
        };
      });
      $$('[data-mv]', tr).forEach(function (bt) { bt.onclick = function () { var i = rows.indexOf(u), j = i + Number(bt.getAttribute('data-mv')); if (j < 0 || j >= rows.length) return; rows.splice(i, 1); rows.splice(j, 0, u); draw(); }; });
    });
    $('#uAdd').onclick = function () { rows.push({ id: '', name: '', short: '', group: '', active: true, quota: {} }); draw(); var last = $$('tbody tr', body).pop(); last.scrollIntoView({ block: 'center' }); $('input[data-f=name]', last).focus(); };
    $('#uSave').onclick = function () {
      var btn = this; busy(btn, true);
      api('saveUnits', { units: rows }).then(function (r) { toast('บันทึก ' + r.count + ' หน่วยงานเรียบร้อย', 'ok'); return adReload(); }).catch(function (e) { busy(btn, false); toast(e.message, 'bad'); });
    };
  }
  draw();
}
function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }

/* ---------- ข้อคำถาม ---------- */
function adQuestions(body, d) {
  var rows = d.questions.map(function (q) { return JSON.parse(JSON.stringify(q)); }), has = d.stats.n > 0;
  function draw() {
    body.innerHTML = '<div class="card"><div class="card-head"><div><h2 class="card-t">ข้อคำถาม</h2><p class="card-s">ตอนที่ 1 การรับรู้นโยบายและอัตลักษณ์ (P) · ตอนที่ 2 พฤติกรรมตาม SOMDEJ MORAL MODEL (S O M D E J) · เปิดใช้อยู่ ' + rows.filter(function (q) { return q.active !== false; }).length + ' ข้อ</p></div><div class="row-btn"><button class="btn ghost-dark sm" id="qAdd">+ เพิ่มข้อ</button><button class="btn primary sm" id="qSave">บันทึก</button></div></div>' +
      (has ? '<p class="alert warn">รอบปัจจุบันมีผู้ตอบแล้ว ' + fmt(d.stats.n) + ' คน การแก้ถ้อยคำเล็กน้อยทำได้ แต่การเพิ่มหรือปิดข้อจะทำให้คะแนนของผู้ตอบก่อนและหลังเทียบกันไม่ได้ ควรทำก่อนเริ่มรอบใหม่</p>' : '') +
      '<div class="qlist">' + rows.map(function (q, i) {
        return '<div class="qrow' + (q.active === false ? ' off' : '') + '" data-i="' + i + '"><span class="db-l sm" style="background:' + DIM_COLOR[q.dim] + '">' + q.dim + '</span><select data-f="dim" aria-label="องค์ประกอบ">' + d.dims.map(function (x) { return '<option value="' + x.code + '"' + (x.code === q.dim ? ' selected' : '') + '>' + x.code + ' · ' + esc(x.name) + '</option>'; }).join('') + '</select><textarea data-f="text" rows="2" aria-label="ข้อความ">' + esc(q.text) + '</textarea><label class="sw"><input type="checkbox" data-f="active"' + (q.active === false ? '' : ' checked') + '> ใช้</label><span class="mv"><button data-mv="-1" aria-label="เลื่อนขึ้น">↑</button><button data-mv="1" aria-label="เลื่อนลง">↓</button></span></div>';
      }).join('') + '</div></div>';
    $$('.qrow', body).forEach(function (el) {
      var q = rows[Number(el.getAttribute('data-i'))];
      $('[data-f=dim]', el).onchange = function () { q.dim = this.value; draw(); };
      $('[data-f=text]', el).oninput = function () { q.text = this.value; };
      $('[data-f=active]', el).onchange = function () { q.active = this.checked; el.classList.toggle('off', !q.active); };
      $$('[data-mv]', el).forEach(function (bt) { bt.onclick = function () { var i = rows.indexOf(q), j = i + Number(bt.getAttribute('data-mv')); if (j < 0 || j >= rows.length) return; rows.splice(i, 1); rows.splice(j, 0, q); draw(); }; });
    });
    $('#qAdd').onclick = function () { rows.push({ id: '', dim: 'S', text: '', active: true }); draw(); var last = $$('.qrow', body).pop(); last.scrollIntoView({ block: 'center' }); $('textarea', last).focus(); };
    $('#qSave').onclick = function () {
      var btn = this; busy(btn, true);
      api('saveQuestions', { questions: rows }).then(function (r) { toast('บันทึก ' + r.count + ' ข้อเรียบร้อย', 'ok'); return adReload(); }).catch(function (e) { busy(btn, false); toast(e.message, 'bad'); });
    };
  }
  draw();
}

/* ---------- ข้อมูลและข้อเสนอแนะ ---------- */
function adDataTab(body, d) {
  body.innerHTML = '<div class="grid2"><div class="card"><h2 class="card-t">ส่งออกข้อมูล</h2><p class="card-s">รอบ <b>' + esc(AD.round) + '</b> · ' + fmt(d.stats.n) + ' คำตอบ · เปิดด้วย Excel ได้ทันที</p><div class="stack"><button class="btn primary" id="exRaw">คำตอบรายคน (.csv)</button><button class="btn ghost-dark" id="exUnit">สรุปรายหน่วยงาน (.csv)</button><button class="btn ghost-dark" id="exItem">สรุปรายข้อ (.csv)</button></div><p class="note-s">ไฟล์คำตอบรายคนไม่มีชื่อหรือรหัสพนักงาน แต่มีหน่วยงานและตำแหน่ง ควรใช้เพื่อการวิเคราะห์ภาพรวมเท่านั้น</p></div>' +
    '<div class="card"><h2 class="card-t">ล้างคำตอบของรอบ</h2><p class="card-s">ใช้ล้างคำตอบทดสอบก่อนเปิดใช้จริง ระบบจะสำรองข้อมูลไว้ในชีทใหม่ก่อนลบเสมอ</p><button class="btn danger" id="exClear">ล้างคำตอบรอบ ' + esc(AD.round) + '</button></div></div>' +
    '<div class="card"><h2 class="card-t">ข้อเสนอแนะจากผู้ตอบ</h2><p class="card-s">ไม่แสดงชื่อหน่วยงานหากหน่วยงานนั้นมีผู้ตอบน้อย</p><div id="cmList"><div class="skeleton"><div></div></div></div></div>';
  api('getComments', { round: AD.round }).then(function (list) {
    $('#cmList').innerHTML = list.length ? list.map(function (c) { return '<blockquote class="cm"><p>' + esc(c.text) + '</p><footer>' + thaiDate(c.date) + (c.unit ? ' · ' + esc(c.unit) : '') + '</footer></blockquote>'; }).join('') : '<div class="empty">ยังไม่มีข้อเสนอแนะ</div>';
  }).catch(function (e) { $('#cmList').innerHTML = '<p class="muted">' + esc(e.message) + '</p>'; });
  $('#exRaw').onclick = function () {
    var btn = this; busy(btn, true, 'กำลังเตรียมไฟล์…');
    api('getExport', { round: AD.round }).then(function (x) {
      busy(btn, false);
      var key = [[], ['รหัสข้อ', 'องค์ประกอบ', 'ข้อคำถาม']].concat(x.questions);
      csv('MoralCompass_responses_' + AD.round + '.csv', [x.head].concat(x.rows).concat(key));
    }).catch(function (e) { busy(btn, false); toast(e.message, 'bad'); });
  };
  $('#exUnit').onclick = function () {
    var st = d.stats, dims = d.dims, rows = [['หน่วยงาน', 'กลุ่ม', 'กรอบ', 'ตอบแล้ว', 'ร้อยละ'].concat(dims.map(function (x) { return x.code; })).concat(['รวม SOMDEJ'])];
    d.units.forEach(function (u) { var g = st.byUnit[u.id] || { n: 0, d: {} }, q = quotaOf(u); rows.push([u.name, u.group, q, g.n, q ? pct(g.n, q) : ''].concat(dims.map(function (x) { return g.d[x.code] == null ? '' : g.d[x.code]; })).concat([g.total == null ? '' : g.total])); });
    csv('MoralCompass_units_' + AD.round + '.csv', rows);
  };
  $('#exItem').onclick = function () {
    var qt = {}; d.questions.forEach(function (q) { qt[q.id] = q.text; });
    var rows = [['รหัสข้อ', 'องค์ประกอบ', 'ข้อคำถาม', 'n', 'ค่าเฉลี่ย', 'SD', 'ระดับ', 'ตอบ 1', 'ตอบ 2', 'ตอบ 3', 'ตอบ 4', 'ตอบ 5']];
    d.stats.items.forEach(function (i) { rows.push([i.id, i.dim, qt[i.id], i.n, i.mean, i.sd, level(i.mean, i.part)].concat(i.dist)); });
    var al = d.stats.alpha; rows.push([], ['Cronbach alpha ตอนที่ 1', al.part1], ['Cronbach alpha ตอนที่ 2', al.part2]);
    csv('MoralCompass_items_' + AD.round + '.csv', rows);
  };
  $('#exClear').onclick = function () {
    confirmPass('ล้างคำตอบรอบ ' + AD.round, 'คำตอบทั้งหมด ' + fmt(d.stats.n) + ' รายการของรอบนี้จะถูกย้ายไปชีทสำรองและไม่นับในแดชบอร์ดอีก', function (pw) {
      return api('clearResponses', { round: AD.round, password: pw }).then(function (r) { toast('ล้างแล้ว ' + r.removed + ' รายการ', 'ok'); return adReload(); });
    });
  };
}
function csv(name, rows) {
  var txt = rows.map(function (r) { return r.map(function (c) { c = c === null || c === undefined ? '' : String(c); if (/^[=+\-@]/.test(c)) c = "'" + c; return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function confirmPass(title, text, fn) {
  openModal('<button class="x" data-close aria-label="ปิด">×</button><h2>' + esc(title) + '</h2><p class="muted">' + esc(text) + '</p><form id="cpForm"><label class="fld"><span>ยืนยันด้วยรหัสผ่านของท่าน</span><input type="password" id="cpP" autocomplete="current-password" required></label><div class="row-btn end"><button type="button" class="btn ghost-dark" data-close>ยกเลิก</button><button class="btn danger" id="cpOk">ยืนยัน</button></div></form>');
  $('#cpForm').onsubmit = function (ev) {
    ev.preventDefault(); var btn = $('#cpOk'); busy(btn, true, 'กำลังดำเนินการ…');
    fn($('#cpP').value).then(closeModal).catch(function (e) { busy(btn, false); toast(e.message, 'bad'); });
  };
}

/* ---------- ตั้งค่า ---------- */
function adSettings(body, d) {
  var s = d.settings;
  function fld(k, label, hint, type) {
    return '<label class="fld"><span>' + label + (hint ? ' <small>' + hint + '</small>' : '') + '</span>' + (type === 'area' ? '<textarea data-k="' + k + '" rows="3">' + esc(s[k]) + '</textarea>' : '<input data-k="' + k + '" value="' + esc(s[k]) + '"' + (type === 'num' ? ' type="number" min="1" max="50"' : '') + '>') + '</label>';
  }
  body.innerHTML = '<div class="grid2"><div class="card"><h2 class="card-t">การรับคำตอบ</h2>' +
    '<label class="fld"><span>สถานะ</span><select data-k="open"><option value="1"' + (s.open === '1' ? ' selected' : '') + '>เปิดรับคำตอบ</option><option value="0"' + (s.open !== '1' ? ' selected' : '') + '>ปิดรับคำตอบ</option></select></label>' +
    fld('roundId', 'รหัสรอบปัจจุบัน', 'เปลี่ยนรหัสเมื่อเริ่มรอบใหม่ เช่น 2570-2 คำตอบเดิมยังเก็บไว้และย้อนดูได้') + fld('roundName', 'ชื่อรอบที่แสดงบนหน้าเว็บ') + fld('closedMsg', 'ข้อความเมื่อปิดรับคำตอบ') +
    '<h2 class="card-t mt">การแสดงผลสำหรับบุคคลทั่วไป</h2><label class="fld"><span>หน้าภาพรวมแสดงอะไรบ้าง</span><select data-k="publicLevel"><option value="progress">เฉพาะจำนวนและร้อยละผู้ตอบ</option><option value="overall">จำนวนผู้ตอบ และคะแนนภาพรวมของฝ่าย</option><option value="full">ทั้งหมด รวมคะแนนรายหน่วยงาน</option></select></label>' +
    fld('minN', 'จำนวนผู้ตอบขั้นต่ำที่จะแสดงคะแนนของกลุ่มย่อย', 'เพื่อรักษาความเป็นนิรนาม', 'num') + '</div>' +
    '<div class="card"><h2 class="card-t">ข้อความบนหน้าเว็บ</h2>' + fld('orgName', 'ชื่อหน่วยงาน') + fld('surveyTitle', 'ชื่อแบบประเมิน') + fld('intro', 'คำชี้แจงก่อนเริ่มทำ', '', 'area') +
    '<div class="row-btn end"><button class="btn primary" id="stSave">บันทึกการตั้งค่า</button></div></div></div>' +
    '<div class="grid2"><div class="card"><h2 class="card-t">ผู้ดูแลระบบ</h2><table class="tbl"><thead><tr><th>ชื่อผู้ใช้</th><th>ชื่อ</th><th>สถานะ</th><th></th></tr></thead><tbody>' +
    d.admins.map(function (a) { return '<tr><td>' + esc(a.username) + '</td><td>' + esc(a.name) + '</td><td>' + (a.active ? '<em class="tag ok">ใช้งาน</em>' : '<em class="tag">ปิด</em>') + '</td><td class="num"><button class="btn link" data-reset="' + esc(a.username) + '">รีเซ็ตรหัส</button>' + (a.username !== d.me.username ? '<button class="btn link" data-tog="' + esc(a.username) + '" data-on="' + a.active + '">' + (a.active ? 'ปิดบัญชี' : 'เปิดบัญชี') + '</button>' : '') + '</td></tr>'; }).join('') +
    '</tbody></table><button class="btn ghost-dark sm mt" id="amAdd">+ เพิ่มผู้ดูแล</button></div>' +
    '<div class="card"><h2 class="card-t">เปลี่ยนรหัสผ่านของฉัน</h2><form id="pwForm"><label class="fld"><span>รหัสผ่านเดิม</span><input type="password" id="pwO" autocomplete="current-password" required></label><label class="fld"><span>รหัสผ่านใหม่ <small>อย่างน้อย 8 ตัวอักษร</small></span><input type="password" id="pwN" autocomplete="new-password" minlength="8" required></label><div class="row-btn end"><button class="btn primary">เปลี่ยนรหัสผ่าน</button></div></form>' +
    '<p class="note-s">หน้าเว็บ build ' + MC_BUILD + ' · หลังบ้าน build ' + esc((MC.boot || {}).build || '-') + '</p></div></div>';
  $('[data-k=publicLevel]', body).value = s.publicLevel;
  $('#stSave').onclick = function () {
    var btn = this, out = {}; $$('[data-k]', body).forEach(function (el) { out[el.getAttribute('data-k')] = el.value; });
    busy(btn, true);
    api('saveSettings', { settings: out }).then(function () { AD.round = null; toast('บันทึกการตั้งค่าเรียบร้อย', 'ok'); return adReload(); }).catch(function (e) { busy(btn, false); toast(e.message, 'bad'); });
  };
  $('#pwForm').onsubmit = function (ev) {
    ev.preventDefault();
    api('changePassword', { oldPassword: $('#pwO').value, newPassword: $('#pwN').value }).then(function () { toast('เปลี่ยนรหัสผ่านเรียบร้อย', 'ok'); ev.target.reset(); }).catch(function (e) { toast(e.message, 'bad'); });
  };
  function saveAdmin(p, title, text) {
    confirmPass(title, text, function (pw) {
      p.password = pw;
      return api('saveAdmin', p).then(function (r) {
        return adReload().then(function () {
          if (r.tempPassword) setTimeout(function () { openModal('<button class="x" data-close aria-label="ปิด">×</button><h2>รหัสผ่านชั่วคราว</h2><p class="muted">ส่งให้ <b>' + esc(p.username) + '</b> ระบบจะให้ตั้งรหัสใหม่เมื่อเข้าครั้งแรก รหัสนี้แสดงเพียงครั้งเดียว</p><p class="temp-pw">' + esc(r.tempPassword) + '</p><div class="row-btn end"><button class="btn primary" data-close>รับทราบ</button></div>'); }, 50);
          else toast('บันทึกเรียบร้อย', 'ok');
        });
      });
    });
  }
  $$('[data-reset]', body).forEach(function (bt) { bt.onclick = function () { var u = bt.getAttribute('data-reset'); saveAdmin({ username: u, reset: true }, 'รีเซ็ตรหัสผ่าน', 'ออกรหัสผ่านชั่วคราวใหม่ให้ ' + u); }; });
  $$('[data-tog]', body).forEach(function (bt) { bt.onclick = function () { var u = bt.getAttribute('data-tog'), on = bt.getAttribute('data-on') === 'true'; saveAdmin({ username: u, active: !on }, on ? 'ปิดบัญชีผู้ดูแล' : 'เปิดบัญชีผู้ดูแล', u); }; });
  $('#amAdd').onclick = function () {
    openModal('<button class="x" data-close aria-label="ปิด">×</button><h2>เพิ่มผู้ดูแล</h2><form id="amForm"><label class="fld"><span>ชื่อผู้ใช้ <small>a-z 0-9 . _ - ยาว 3–30 ตัว</small></span><input id="amU" required pattern="[A-Za-z0-9._\\-]{3,30}"></label><label class="fld"><span>ชื่อที่แสดง</span><input id="amN" required></label><div class="row-btn end"><button type="button" class="btn ghost-dark" data-close>ยกเลิก</button><button class="btn primary">ถัดไป</button></div></form>');
    $('#amForm').onsubmit = function (ev) { ev.preventDefault(); var p = { username: $('#amU').value.trim().toLowerCase(), name: $('#amN').value.trim() }; closeModal(); saveAdmin(p, 'เพิ่มผู้ดูแล', 'เพิ่มบัญชี ' + p.username + ' (' + p.name + ')'); };
  };
}
