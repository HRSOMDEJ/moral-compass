/* =====================================================================
   SOMDEJ Moral Compass · dash.js — แดชบอร์ด (ใช้ร่วมกันทั้งมุมมองทั่วไปและผู้ดูแล)
   ===================================================================== */

/* ---------- tooltip กลาง: ใส่ data-tip ที่องค์ประกอบใดก็ได้ ---------- */
(function () {
  var tip;
  function show(e) {
    var t = e.target.closest && e.target.closest('[data-tip]'); tip = tip || document.getElementById('tip');
    if (!t) { tip.className = 'tip'; return; }
    tip.innerHTML = t.getAttribute('data-tip'); tip.className = 'tip show';
    var r = t.getBoundingClientRect(), x = (e.clientX || r.left + r.width / 2), y = (e.clientY || r.top);
    var w = tip.offsetWidth, hh = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + 'px';
    tip.style.top = (y - hh - 14 < 8 ? y + 18 : y - hh - 14) + 'px';
  }
  document.addEventListener('mousemove', show);
  document.addEventListener('focusin', show);
  document.addEventListener('focusout', function () { if (tip) tip.className = 'tip'; });
  document.addEventListener('scroll', function () { if (tip) tip.className = 'tip'; }, true);
})();

/* ---------- เรดาร์ (เข็มทิศคะแนน) ---------- */
function radarSVG(items, opt) {
  opt = opt || {};
  var n = items.length, cx = 180, cy = 168, R = 112, s = '';
  if (n < 3) return '';
  function pt(i, r) { var a = (-90 + i * 360 / n) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function poly(r) { return items.map(function (_, i) { return pt(i, r).map(function (v) { return v.toFixed(1); }).join(','); }).join(' '); }
  s += '<svg class="radar' + (opt.anim ? ' anim' : '') + '" viewBox="0 0 360 336" role="img" aria-label="กราฟเรดาร์คะแนนรายองค์ประกอบ">';
  for (var g = 1; g <= 5; g++) s += '<polygon class="r-grid' + (g === 5 ? ' outer' : '') + '" points="' + poly(R * g / 5) + '"/>';
  items.forEach(function (_, i) { var p = pt(i, R); s += '<line class="r-axis" x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '"/>'; });
  for (var k = 1; k <= 5; k++) s += '<text class="r-tick" x="' + (cx + 4) + '" y="' + (cy - R * k / 5 + 4).toFixed(1) + '">' + k + '</text>';
  var has = items.every(function (d) { return d.v !== null && d.v !== undefined; });
  if (has) {
    var pts = items.map(function (d, i) { return pt(i, R * d.v / 5).map(function (v) { return v.toFixed(1); }).join(','); }).join(' ');
    s += '<polygon class="r-area" points="' + pts + '" style="transform-origin:' + cx + 'px ' + cy + 'px"/>';
    items.forEach(function (d, i) {
      var p = pt(i, R * d.v / 5);
      s += '<circle class="r-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5" style="fill:' + DIM_COLOR[d.code] + '"/>' +
        '<circle class="r-hit" tabindex="0" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="16" data-tip="<b>' + esc(d.code) + ' · ' + esc(d.name) + '</b><br>ค่าเฉลี่ย ' + f2(d.v) + ' (' + level(d.v, 2) + ')"/>';
    });
  }
  items.forEach(function (d, i) {
    var p = pt(i, R + 30);
    s += '<g class="r-lab"><circle cx="' + p[0].toFixed(1) + '" cy="' + (p[1] - 6).toFixed(1) + '" r="15" style="fill:' + DIM_COLOR[d.code] + '"/><text class="r-letter" x="' + p[0].toFixed(1) + '" y="' + (p[1] - 1).toFixed(1) + '">' + esc(d.code) + '</text>' +
      '<text class="r-val" x="' + p[0].toFixed(1) + '" y="' + (p[1] + 24).toFixed(1) + '">' + (has ? f2(d.v) : '–') + '</text></g>';
  });
  return s + '</svg>';
}

/* ---------- หน้าแดชบอร์ดทั่วไป ---------- */
var DASH = { group: 'all', sort: 'order' };
ROUTES.dashboard = function (app) {
  app.innerHTML = '<section class="wrap"><div class="skeleton"><div></div><div></div><div></div></div></section>';
  return Promise.all([loadBoot(), loadStats(true)]).then(function (r) {
    app.innerHTML = '<section class="wrap dash" id="dashRoot"></section>';
    renderDash($('#dashRoot'), r[0], r[1], { admin: false });
  });
};

function renderDash(root, b, st, opt) {
  opt = opt || {};
  var units = (opt.units || b.units).filter(function (u) { return u.active !== false; }), positions = b.positions, s = b.settings || {};
  var somdej = b.dims.filter(function (d) { return d.part === 2; }), pol = b.dims.filter(function (d) { return d.part === 1; })[0];
  var tq = totalQuota(units), minN = Number(s.minN) || 5;
  var uStat = units.map(function (u) { var q = quotaOf(u), n = (st.byUnit[u.id] || {}).n || 0; return { u: u, q: q, n: n, p: pct(n, q) }; });
  var reach = uStat.filter(function (x) { return x.q > 0 && x.p >= 80; }).length;
  var ov = st.overall || { d: {} }, hasScore = ov.total !== null && ov.total !== undefined;
  var h = '';

  h += '<div class="dash-head"><div><span class="eyebrow">' + (opt.admin ? 'มุมมองผู้ดูแล' : 'ภาพรวมการประเมิน') + '</span><h1>' + esc(s.surveyTitle || 'SOMDEJ Moral Compass') + '</h1><p class="muted">' + esc(opt.roundName || s.roundName || '') + ' · อัปเดตล่าสุด ' + thaiTime(st.at) + '</p></div>' +
    '<div class="dash-act">' + (opt.headExtra || '') + '<button class="btn ghost-dark sm" id="dRefresh"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/></svg> รีเฟรช</button></div></div>';

  /* KPI */
  var lowest = null;
  if (hasScore) somdej.forEach(function (d) { var v = ov.d[d.code]; if (v !== null && v !== undefined && (!lowest || v < lowest.v)) lowest = { d: d, v: v }; });
  h += '<div class="kpis">' +
    kpi('ผู้ตอบแล้ว', '<span data-count="' + st.n + '">0</span>', 'จากกรอบ ' + fmt(tq) + ' คน') +
    kpi('อัตราการตอบ', '<span data-count="' + pct(st.n, tq) + '" data-dec="1" data-suf="%">0</span>', '<span class="meter"><i style="width:' + Math.min(100, pct(st.n, tq)) + '%"></i></span>') +
    kpi('หน่วยงานที่ตอบถึงร้อยละ 80', '<span data-count="' + reach + '">0</span><small> / ' + units.length + '</small>', 'เริ่มตอบแล้ว ' + uStat.filter(function (x) { return x.n > 0; }).length + ' หน่วยงาน') +
    (hasScore ? kpi('คะแนนพฤติกรรม SOMDEJ', '<span data-count="' + ov.total + '" data-dec="2">0</span><small> / 5</small>', 'ระดับ' + level(ov.total, 2) + (opt.admin && ov.totalSd !== null ? ' · SD ' + f2(ov.totalSd) : '')) : '') +
    (hasScore && pol && ov.d[pol.code] != null ? kpi('การรับรู้นโยบายและอัตลักษณ์', '<span data-count="' + ov.d[pol.code] + '" data-dec="2">0</span><small> / 5</small>', 'ระดับ' + level(ov.d[pol.code], 1)) : '') +
    '</div>';

  /* คะแนนรายองค์ประกอบ */
  if (hasScore) {
    var items = somdej.map(function (d) { return { code: d.code, name: d.name, v: ov.d[d.code] }; });
    h += '<div class="grid2"><div class="card"><h2 class="card-t">เข็มทิศ SOMDEJ ของฝ่ายการพยาบาล</h2><p class="card-s">ค่าเฉลี่ยรายองค์ประกอบ (คะแนนเต็ม 5) จากผู้ตอบ ' + fmt(st.n) + ' คน</p><div class="radar-wrap">' + radarSVG(items, { anim: true }) + '</div></div>' +
      '<div class="card"><h2 class="card-t">รายองค์ประกอบ</h2><p class="card-s">' + (lowest ? 'องค์ประกอบที่ควรพัฒนาเป็นลำดับแรกคือ <b>' + lowest.d.code + ' ' + esc(lowest.d.name) + '</b>' : '') + '</p><div class="dimbars">' +
      somdej.map(function (d) {
        var v = ov.d[d.code], low = lowest && lowest.d.code === d.code;
        return '<div class="dimbar' + (low ? ' low' : '') + '" tabindex="0" data-tip="<b>' + d.code + ' · ' + esc(d.name) + '</b><br>' + esc(d.nameTh) + '<br>ค่าเฉลี่ย ' + f2(v) + (opt.admin ? ' · SD ' + f2(ov.sd[d.code]) : '') + '"><span class="db-l" style="background:' + DIM_COLOR[d.code] + '">' + d.code + '</span><div class="db-m"><div class="db-n">' + esc(d.name) + ' <small>' + esc(d.nameTh) + '</small>' + (low ? '<em class="tag warn">ลำดับแรกที่ควรพัฒนา</em>' : '') + '</div><div class="track"><i style="width:' + (v / 5 * 100) + '%;background:' + DIM_COLOR[d.code] + '"></i></div></div><span class="db-v">' + f2(v) + '<small>' + level(v, 2) + '</small></span></div>';
      }).join('') + '</div></div></div>';
  } else if (st.level !== 'progress') {
    h += '<div class="card note"><b>คะแนนรายองค์ประกอบ</b> จะแสดงเมื่อมีผู้ตอบตั้งแต่ ' + minN + ' คนขึ้นไป เพื่อรักษาความเป็นนิรนามของผู้ตอบ</div>';
  }

  /* การตอบรายหน่วยงาน */
  var groups = []; units.forEach(function (u) { if (groups.indexOf(u.group) < 0) groups.push(u.group); });
  h += '<div class="card"><div class="card-head"><div><h2 class="card-t">การตอบกลับรายหน่วยงาน</h2><p class="card-s">แตะที่หน่วยงานเพื่อดูรายละเอียดแยกตามตำแหน่ง</p></div>' +
    '<label class="sel-sm"><span class="sr">เรียงลำดับ</span><select id="dSort"><option value="order">เรียงตามผังหน่วยงาน</option><option value="desc">ร้อยละมากไปน้อย</option><option value="asc">ร้อยละน้อยไปมาก</option></select></label></div>' +
    '<div class="chips filt" id="dGroups"><button class="chip on" data-g="all">ทั้งหมด</button>' + groups.map(function (g) { return '<button class="chip" data-g="' + esc(g) + '">' + esc(g) + '</button>'; }).join('') + '</div>' +
    '<div class="ulist" id="dUnits"></div></div>';

  /* ตำแหน่ง + รายวัน */
  var posRows = positions.map(function (p) {
    var q = units.reduce(function (a, u) { return a + (u.quota[p.id] || 0); }, 0), n = (st.byPos[p.id] || {}).n || 0;
    return { p: p, q: q, n: n };
  }).filter(function (x) { return x.q > 0 || x.n > 0; });
  h += '<div class="grid2"><div class="card"><h2 class="card-t">การตอบกลับรายตำแหน่ง</h2><p class="card-s">จำนวนผู้ตอบเทียบกับกรอบจำนวนบุคลากร</p><div class="ulist">' +
    posRows.map(function (x) {
      var g = st.byPos[x.p.id] || {};
      return barRow(x.p.name, x.n, x.q, opt.admin || st.level !== 'progress' ? (g.total != null ? 'SOMDEJ ' + f2(g.total) : '') : '', '');
    }).join('') + '</div></div>' +
    '<div class="card"><h2 class="card-t">จำนวนผู้ตอบรายวัน</h2><p class="card-s">' + (st.n ? 'รวม ' + fmt(st.n) + ' คน' : 'ยังไม่มีผู้ตอบ') + '</p>' + dailyChart(st.daily) + '</div></div>';

  /* รายข้อ */
  if (st.items && st.items.length) {
    var qText = {}; (opt.questions || b.questions).forEach(function (q) { qText[q.id] = q.text; });
    h += '<div class="card"><h2 class="card-t">ผลรายข้อ</h2><p class="card-s">ค่าเฉลี่ยรายข้อ จัดกลุ่มตามองค์ประกอบ' + (opt.admin ? ' พร้อมส่วนเบี่ยงเบนมาตรฐานและการกระจายคำตอบ' : '') + '</p><div class="tbl-wrap"><table class="tbl items"><thead><tr><th>องค์ประกอบ</th><th>ข้อคำถาม</th><th class="num">ค่าเฉลี่ย</th>' + (opt.admin ? '<th class="num">SD</th><th>การกระจาย 1→5</th>' : '') + '<th>ระดับ</th></tr></thead><tbody>' +
      st.items.map(function (it) {
        return '<tr><td><span class="db-l sm" style="background:' + DIM_COLOR[it.dim] + '">' + (it.dim === 'P' ? 'P' : it.dim) + '</span></td><td>' + esc(qText[it.id] || it.id) + '</td><td class="num"><b>' + f2(it.mean) + '</b></td>' +
          (opt.admin ? '<td class="num">' + f2(it.sd) + '</td><td>' + distBar(it.dist) + '</td>' : '') + '<td>' + level(it.mean, it.part) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  /* เฉพาะผู้ดูแล: ตารางคะแนนรายหน่วยงาน + ความเที่ยง */
  if (opt.admin) {
    var al = st.alpha || {};
    h += '<div class="card"><h2 class="card-t">คะแนนรายหน่วยงาน</h2><p class="card-s">ค่าเฉลี่ยรายองค์ประกอบ แสดงเฉพาะหน่วยงานที่มีผู้ตอบตั้งแต่ ' + minN + ' คน สีเข้มขึ้นตามคะแนนที่สูงขึ้น</p><div class="tbl-wrap"><table class="tbl heat"><thead><tr><th>หน่วยงาน</th><th class="num">n</th>' + (pol ? '<th class="num">การรับรู้</th>' : '') + somdej.map(function (d) { return '<th class="num">' + d.code + '</th>'; }).join('') + '<th class="num">รวม</th></tr></thead><tbody>' +
      uStat.filter(function (x) { return x.n > 0; }).map(function (x) {
        var g = st.byUnit[x.u.id];
        if (g.masked) return '<tr><td>' + esc(x.u.short) + '</td><td class="num">' + g.n + '</td><td colspan="' + (somdej.length + 1 + (pol ? 1 : 0)) + '" class="muted">ผู้ตอบยังไม่ถึง ' + minN + ' คน</td></tr>';
        return '<tr><td title="' + esc(x.u.name) + '">' + esc(x.u.short) + '</td><td class="num">' + g.n + '</td>' + (pol ? heat(g.d[pol.code]) : '') + somdej.map(function (d) { return heat(g.d[d.code]); }).join('') + heat(g.total, true) + '</tr>';
      }).join('') + (st.n ? '' : '<tr><td colspan="9" class="muted">ยังไม่มีผู้ตอบ</td></tr>') + '</tbody></table></div></div>' +
      '<div class="card"><h2 class="card-t">คุณภาพเครื่องมือ</h2><p class="card-s">ค่าความเที่ยงแบบสอดคล้องภายใน (Cronbach’s alpha) คำนวณจากคำตอบจริงของรอบนี้</p><div class="kpis slim">' +
      kpi('ตอนที่ 1 การรับรู้ (' + (al.k1 || 0) + ' ข้อ)', f2(al.part1), alphaNote(al.part1)) + kpi('ตอนที่ 2 SOMDEJ (' + (al.k2 || 0) + ' ข้อ)', f2(al.part2), alphaNote(al.part2)) +
      kpi('ช่วงเวลาเก็บข้อมูล', '<span class="kpi-date">' + (st.first ? thaiDate(st.first) : '–') + '</span>', st.last ? 'ถึง ' + thaiDate(st.last) : '') + '</div>' +
      '<div class="alpha-dims">' + somdej.map(function (d) { return '<span><b>' + d.code + '</b> α = ' + f2((al.dims || {})[d.code]) + '</span>'; }).join('') + '</div></div>';
  }
  root.innerHTML = h;

  /* interactions */
  $$('[data-count]', root).forEach(function (el) { countUp(el, Number(el.getAttribute('data-count')), Number(el.getAttribute('data-dec') || 0), el.getAttribute('data-suf') || ''); });
  function drawUnits() {
    var list = uStat.filter(function (x) { return DASH.group === 'all' || x.u.group === DASH.group; }).slice();
    if (DASH.sort === 'desc') list.sort(function (a, c) { return c.p - a.p; });
    if (DASH.sort === 'asc') list.sort(function (a, c) { return a.p - c.p; });
    $('#dUnits', root).innerHTML = list.map(function (x) {
      var g = st.byUnit[x.u.id] || {};
      return barRow(x.u.short, x.n, x.q, g.total != null ? 'SOMDEJ ' + f2(g.total) : '', x.u.id, x.u.name);
    }).join('') || '<p class="muted">ไม่มีหน่วยงานในกลุ่มนี้</p>';
    $$('#dUnits .urow', root).forEach(function (r) { r.onclick = function () { unitModal(b, st, units.filter(function (u) { return u.id === r.getAttribute('data-id'); })[0], minN); }; });
  }
  $('#dSort', root).value = DASH.sort;
  $('#dSort', root).onchange = function () { DASH.sort = this.value; drawUnits(); };
  if (groups.indexOf(DASH.group) < 0) DASH.group = 'all';
  $$('#dGroups .chip', root).forEach(function (c) {
    c.classList.toggle('on', c.getAttribute('data-g') === DASH.group);
    c.onclick = function () { DASH.group = c.getAttribute('data-g'); $$('#dGroups .chip', root).forEach(function (x) { x.classList.toggle('on', x === c); }); drawUnits(); };
  });
  drawUnits();
  $('#dRefresh', root).onclick = opt.onRefresh || function () { MC.statsAt = 0; route(); };
}
function kpi(label, value, sub) { return '<div class="kpi"><span class="kpi-l">' + label + '</span><span class="kpi-v">' + value + '</span><span class="kpi-s">' + (sub || '') + '</span></div>'; }
function barRow(name, n, q, extra, id, full) {
  var p = pct(n, q), over = q > 0 && n > q, done = q > 0 && n >= q;
  var tipText = '<b>' + esc(full || name) + '</b><br>ตอบแล้ว ' + fmt(n) + ' จากกรอบ ' + fmt(q) + ' คน' + (q ? ' (' + p + '%)' : '') + (extra ? '<br>' + extra : '');
  return '<' + (id ? 'button type="button"' : 'div') + ' class="urow' + (done ? ' done' : '') + '"' + (id ? ' data-id="' + id + '"' : ' tabindex="0"') + ' data-tip="' + tipText.replace(/"/g, '&quot;') + '"><span class="u-n">' + esc(name) + '</span><span class="track"><i style="width:' + Math.min(100, p) + '%"></i></span><span class="u-v"><b>' + fmt(n) + '</b>/' + fmt(q) + '<small>' + (q ? p + '%' : '–') + '</small>' +
    (over ? '<em class="tag info">เกินกรอบ</em>' : done ? '<em class="tag ok">✓ ครบ</em>' : '') + '</span></' + (id ? 'button' : 'div') + '>';
}
function heat(v, bold) {
  if (v === null || v === undefined) return '<td class="num">–</td>';
  var k = Math.max(0, Math.min(1, (v - 3) / 2));
  return '<td class="num hc" style="--k:' + k.toFixed(2) + '">' + (bold ? '<b>' + f2(v) + '</b>' : f2(v)) + '</td>';
}
function distBar(dist) {
  var t = dist.reduce(function (a, c) { return a + c; }, 0) || 1, lab = dist.map(function (c, i) { return (i + 1) + ' คะแนน: ' + c + ' คน'; }).join('<br>');
  return '<span class="dist" tabindex="0" data-tip="' + lab + '">' + dist.map(function (c, i) { return '<i class="s' + (i + 1) + '" style="width:' + (c / t * 100) + '%"></i>'; }).join('') + '</span>';
}
function alphaNote(a) { if (a === null || a === undefined) return 'ยังมีข้อมูลไม่พอสำหรับคำนวณ'; return a >= 0.9 ? 'ดีเยี่ยม (≥ .90)' : a >= 0.8 ? 'ดี (≥ .80)' : a >= 0.7 ? 'ยอมรับได้ (≥ .70)' : 'ต่ำกว่าเกณฑ์ .70'; }
function dailyChart(daily) {
  var days = Object.keys(daily || {}).sort(); if (!days.length) return '<div class="empty">ยังไม่มีข้อมูล</div>';
  days = days.slice(-21);
  var max = Math.max.apply(null, days.map(function (d) { return daily[d]; }));
  return '<div class="daily" style="--n:' + days.length + '">' + days.map(function (d) {
    return '<div class="dcol" tabindex="0" data-tip="<b>' + thaiDate(d) + '</b><br>' + fmt(daily[d]) + ' คน"><span class="dv">' + (days.length <= 10 ? fmt(daily[d]) : '') + '</span><i style="height:' + Math.max(4, daily[d] / max * 100) + '%"></i><span class="dl">' + Number(d.slice(8, 10)) + '/' + Number(d.slice(5, 7)) + '</span></div>';
  }).join('') + '</div>';
}
var TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
function thaiDate(s) { s = String(s || ''); if (s.length < 10) return '–'; return Number(s.slice(8, 10)) + ' ' + TH_M[Number(s.slice(5, 7)) - 1] + ' ' + (Number(s.slice(0, 4)) + 543); }
function thaiTime(s) { s = String(s || ''); return thaiDate(s) + (s.length >= 16 ? ' เวลา ' + s.slice(11, 16) + ' น.' : ''); }

function unitModal(b, st, u, minN) {
  var g = st.byUnit[u.id] || { n: 0, d: {} }, q = quotaOf(u), somdej = b.dims.filter(function (d) { return d.part === 2; });
  var ids = b.positions.filter(function (p) { return u.quota[p.id] || st.cell[u.id + '|' + p.id]; });
  var h = '<button class="x" data-close aria-label="ปิด">×</button><span class="eyebrow">' + esc(u.group) + '</span><h2>' + esc(u.name) + '</h2>' +
    '<div class="um-top"><div class="ring" style="--p:' + Math.min(100, pct(g.n, q)) + '"><b>' + (q ? pct(g.n, q) + '%' : '–') + '</b></div><div><p class="um-n"><b>' + fmt(g.n) + '</b> จาก ' + fmt(q) + ' คน</p><p class="muted">ตอบแบบประเมินแล้ว</p></div></div>' +
    '<table class="tbl"><thead><tr><th>ตำแหน่ง</th><th class="num">กรอบ</th><th class="num">ตอบแล้ว</th><th class="num">ร้อยละ</th></tr></thead><tbody>' +
    ids.map(function (p) { var qq = u.quota[p.id] || 0, n = st.cell[u.id + '|' + p.id] || 0; return '<tr><td>' + esc(p.name) + '</td><td class="num">' + qq + '</td><td class="num"><b>' + n + '</b></td><td class="num">' + (qq ? pct(n, qq) + '%' : '–') + '</td></tr>'; }).join('') +
    '<tr class="sum"><td>รวม</td><td class="num">' + q + '</td><td class="num"><b>' + g.n + '</b></td><td class="num">' + (q ? pct(g.n, q) + '%' : '–') + '</td></tr></tbody></table>';
  if (g.total !== null && g.total !== undefined) {
    h += '<h3 class="um-h">คะแนนรายองค์ประกอบของหน่วยงาน</h3><div class="radar-wrap sm">' + radarSVG(somdej.map(function (d) { return { code: d.code, name: d.name, v: g.d[d.code] }; }), { anim: true }) + '</div><p class="center">ค่าเฉลี่ยรวม <b>' + f2(g.total) + '</b> · ระดับ' + level(g.total, 2) + '</p>';
  } else if (st.level === 'admin' || st.level === 'full') {
    h += '<p class="note-s">คะแนนของหน่วยงานจะแสดงเมื่อมีผู้ตอบตั้งแต่ ' + minN + ' คน เพื่อรักษาความเป็นนิรนามของผู้ตอบ</p>';
  }
  openModal(h, 'um');
}
