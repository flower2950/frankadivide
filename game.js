(function () {
  'use strict';

  /* ========== 联机配置 ========== */
  var SUPA_URL = 'https://rdwhqsvovabtyjlxbagf.supabase.co';
  var SUPA_KEY = 'sb_publishable_G_i8uDGtnjdGTGG73F2Rqg_hBiu-HuZ';
  var NET = { on: false, room: '', me: 'p' + Math.floor(Math.random() * 99999), others: {}, last: 0, ch: null };

  /* ========== 画布 ========== */
  var cv = document.getElementById('cv');
  var ctx = cv.getContext('2d');
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var MAPW = 1600, MAPH = 1200;
  var S = 1, OX = 0, OY = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.floor(W * DPR);
    cv.height = Math.floor(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    S = Math.max(W / MAPW, H / MAPH);
    OX = (W - MAPW * S) / 2;
    OY = (H - MAPH * S) / 2;
    layoutBtns();
  }
  function w2sX(x) { return OX + x * S; }
  function w2sY(y) { return OY + y * S; }

  /* ========== 图片 ========== */
  var mapImg = new Image(); mapImg.src = 'map.png';
  var inImg = new Image(); inImg.src = 'in.png';
  var mapOK = false, inOK = false;
  mapImg.onload = function () { mapOK = mapImg.naturalWidth > 0; };
  inImg.onload = function () { inOK = inImg.naturalWidth > 0; };
  mapImg.onerror = function () { mapOK = false; };

  /* ========== 世界设定 ========== */
  var VILL = { x: 610, y: 430, w: 560, h: 430 };
  var ZONES = [
    { x: 610, y: 430, w: 560, h: 430, name: '林泉村', safe: true },
    { x: 80, y: 120, w: 560, h: 400, name: '村外草地' },
    { x: 760, y: 120, w: 560, h: 340, name: '林泉野径' },
    { x: 760, y: 880, w: 700, h: 280, name: '林泉深处' }
  ];
  var HOUSES = [
    { x: 700, y: 478, w: 112, h: 86, door: { x: 44, y: 86, w: 24, h: 20 } },
    { x: 848, y: 478, w: 128, h: 76, door: { x: 50, y: 76, w: 26, h: 20 } },
    { x: 1000, y: 480, w: 100, h: 84, door: { x: 38, y: 84, w: 22, h: 20 } },
    { x: 700, y: 742, w: 104, h: 72, door: { x: 40, y: 72, w: 24, h: 20 } },
    { x: 960, y: 740, w: 132, h: 74, door: { x: 52, y: 74, w: 26, h: 20 } }
  ];

  /* ========== 技能 ========== */
  var SK = {
    slash: { name: '挥砍', cd: 0.6, mp: 0, range: 34, arc: 1.5, dmg: 1.0 },
    dash:  { name: '突进斩', cd: 4, mp: 8, range: 70, arc: 1.1, dmg: 1.3 },
    spin:  { name: '旋斩', cd: 6, mp: 12, range: 42, arc: Math.PI * 2, dmg: 0.85 },
    ult:   { name: '林泉·斩', cd: 10, mp: 50, range: 96, arc: 1.9, dmg: 2.2 }
  };
  var SKK = ['slash', 'dash', 'spin', 'ult'];
  var SKILLCD = { slash: 0, dash: 0, spin: 0, ult: 0 };

  /* ========== 装备 ========== */
  var QUAL = [
    { name: '普通', color: '#bbb', mul: 1.0 },
    { name: '精良', color: '#4d4', mul: 1.6 },
    { name: '稀有', color: '#5af', mul: 2.4 },
    { name: '传说', color: '#c6f', mul: 3.4 }
  ];
  var EQTYPE = { weapon: 22, armor: 8, ring: 220 };
  var AFFIX = ['锋锐', '沉重', '迅捷', '守护', '林泉'];

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ri(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function makeEquip(level, forceType) {
    var type = forceType || pick(['weapon', 'armor', 'ring']);
    var q = 0, r = Math.random();
    if (r > 0.97) q = 3; else if (r > 0.85) q = 2; else if (r > 0.55) q = 1;
    var base = EQTYPE[type] * (1 + level * 0.35) * QUAL[q].mul;
    var val = Math.max(1, Math.round(base));
    var affix = pick(AFFIX);
    var label = { weapon: '剑', armor: '甲', ring: '戒' }[type];
    return {
      id: Date.now() + Math.floor(Math.random() * 9999),
      type: type, q: q, affix: affix, val: val,
      name: QUAL[q].name + '·' + affix + label,
      color: QUAL[q].color
    };
  }

  /* ========== 怪物 ========== */
  var MON = {
    beast: { hp: 70, atk: 9, def: 2, aggro: 190, speed: 70, r: 13, exp: 26, drop: 0.85, color: '#a34' },
    deer:  { hp: 55, atk: 7, def: 2, aggro: 0,   speed: 60, r: 12, exp: 14, drop: 0.35, color: '#8a7' }
  };
  var SPAWNS = [
    { x: 300, y: 320, type: 'beast', n: 4 },
    { x: 1080, y: 290, type: 'beast', n: 3 },
    { x: 1100, y: 1030, type: 'deer', n: 5 }
  ];

  /* ========== 玩家 ========== */
  var P = {
    name: '兰德', x: 860, y: 660, level: 5,
    hp: 220, maxHp: 220, mp: 100, maxMp: 100,
    atk: 22, def: 8, speed: 120, r: 11,
    face: 1.57, exp: 0, target: null,
    bag: [], equip: { weapon: null, armor: null, ring: null }
  };

  var monsters = [];
  var floats = [], fx = [], corpses = [], shake = 0;

  /* ========== 场景 ========== */
  var scene = 'world';
  var doorLock = 0, curHouse = null;
  var inPos = { x: 0, y: 0 };

  /* ========== 工具 ========== */
  function dist(a, b, c, d) { var dx = a - c, dy = b - d; return Math.sqrt(dx * dx + dy * dy); }
  function needExp(level) { return level * 40; }
  function inVill() { return P.x > VILL.x && P.x < VILL.x + VILL.w && P.y > VILL.y && P.y < VILL.y + VILL.h; }
  function zoneName() {
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      if (P.x > z.x && P.x < z.x + z.w && P.y > z.y && P.y < z.y + z.h) return z;
    }
    return { name: '弗兰卡荒野' };
  }

  function addFloat(x, y, txt, color) {
    floats.push({ x: x, y: y, txt: txt, color: color || '#fff', life: 0.9, max: 0.9 });
  }

  /* ========== 怪物 ========== */
  function spawnMonsters() {
    monsters = [];
    for (var i = 0; i < SPAWNS.length; i++) {
      var s = SPAWNS[i];
      for (var j = 0; j < s.n; j++) {
        var m = MON[s.type];
        monsters.push({
          type: s.type, hp: m.hp, maxHp: m.hp, atk: m.atk, def: m.def,
          speed: m.speed, r: m.r, exp: m.exp, drop: m.drop, color: m.color,
          x: s.x + rnd(-70, 70), y: s.y + rnd(-70, 70),
          hx: s.x, hy: s.y, aggro: false, atkCd: 0, alive: true
        });
      }
    }
  }

  function damageMon(m, dmg, isCrit) {
    m.hp -= dmg;
    addFloat(m.x, m.y - 18, Math.round(dmg), isCrit ? '#ffd54a' : '#fff');
    if (m.hp <= 0) {
      m.alive = false;
      corpses.push({ x: m.x, y: m.y, r: m.r, color: m.color, life: 8 });
      gainExp(m.exp);
      if (Math.random() < m.drop) {
        var e = makeEquip(P.level);
        P.bag.push(e);
        addFloat(m.x, m.y - 30, e.name, e.color);
        renderBag();
      }
      monsters = monsters.filter(function (t) { return t !== m; });
      if (P.target === m) P.target = null;
    }
  }

  function gainExp(n) {
    P.exp += n;
    while (P.exp >= needExp(P.level)) {
      P.exp -= needExp(P.level);
      P.level++;
      P.maxHp += 12; P.hp = P.maxHp;
      P.maxMp += 4; P.mp = P.maxMp;
      P.atk += 2; P.def += 1;
      addFloat(P.x, P.y - 40, '升级！Lv' + P.level, '#ffd54a');
    }
  }

  /* ========== 技能释放 ========== */
  var aimAng = 0;

  function lockTarget() {
    var best = null, bd = 1e9;
    for (var i = 0; i < monsters.length; i++) {
      var m = monsters[i];
      if (!m.alive) continue;
      var d = dist(P.x, P.y, m.x, m.y);
      if (d < bd) { bd = d; best = m; }
    }
    P.target = (P.target === best) ? null : best;
    if (P.target) addFloat(P.x, P.y - 30, '锁定', '#ff6b6b');
  }

  function castSkill(key) {
    var s = SK[key];
    if (!s) return;
    if (scene !== 'world') { addFloat(P.x, P.y - 30, '室内无法出手', '#bbb'); return; }
    if (inVill()) { addFloat(P.x, P.y - 30, '村内无法出手', '#bbb'); return; }
    if (SKILLCD[key] > 0) return;
    if (P.mp < s.mp) { addFloat(P.x, P.y - 30, '蓝量不足', '#69f'); return; }
    P.mp -= s.mp;
    SKILLCD[key] = s.cd;

    var ang = aimAng;
    if (P.target) ang = Math.atan2(P.target.y - P.y, P.target.x - P.x);
    else ang = P.face;
    P.face = ang;

    fx.push({ type: 'arc', x: P.x, y: P.y, ang: ang, arc: s.arc, range: s.range, life: 0.25, max: 0.25, key: key });
    if (key === 'dash') {
      P.x += Math.cos(ang) * 55;
      P.y += Math.sin(ang) * 55;
    }
    if (key === 'ult' || key === 'spin') shake = key === 'ult' ? 10 : 5;

    for (var i = monsters.length - 1; i >= 0; i--) {
      var m = monsters[i];
      if (!m.alive) continue;
      var d = dist(P.x, P.y, m.x, m.y);
      if (d > s.range + m.r) continue;
      if (s.arc < Math.PI * 2) {
        var a2 = Math.atan2(m.y - P.y, m.x - P.x);
        var diff = Math.abs(((a2 - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (diff > s.arc / 2) continue;
      }
      var crit = Math.random() < 0.15;
      var dmg = Math.max(1, (P.atk * s.dmg - m.def) * (crit ? 1.8 : 1));
      damageMon(m, dmg, crit);
    }
  }

  /* ========== 存档 ========== */
  var SAVEKEY = 'frk_div_save_v1';
  function snapData() {
    return {
      name: P.name, x: P.x, y: P.y, level: P.level, hp: P.hp, maxHp: P.maxHp,
      mp: P.mp, maxMp: P.maxMp, atk: P.atk, def: P.def, exp: P.exp,
      bag: P.bag, equip: P.equip
    };
  }
  function applyData(d) {
    if (!d) return;
    for (var k in d) { if (k !== 'bag' && k !== 'equip') P[k] = d[k]; }
    P.bag = d.bag || [];
    P.equip = d.equip || { weapon: null, armor: null, ring: null };
  }
  function saveGame() {
    try { localStorage.setItem(SAVEKEY, JSON.stringify(snapData())); } catch (e) {}
  }
  function loadGame() {
    try {
      var s = localStorage.getItem(SAVEKEY);
      if (s) applyData(JSON.parse(s));
    } catch (e) {}
  }
  window.__reset = function () { localStorage.removeItem(SAVEKEY); location.reload(); };

  /* ========== 联机 ========== */
  function connect(room) {
    if (!window.supabase) { addFloat(P.x, P.y - 40, '联机库未加载', '#f66'); return; }
    NET.room = room;
    try {
      var client = window.supabase.createClient(SUPA_URL, SUPA_KEY);
      NET.ch = client.channel('frk_' + room, { config: { broadcast: { self: false } } });
      NET.ch.on('broadcast', { event: 'pos' }, function (p) {
        var d = p.payload;
        if (!d || d.id === NET.me) return;
        NET.others[d.id] = { x: d.x, y: d.y, name: d.name, t: performance.now() };
      });
      NET.ch.subscribe();
      NET.on = true;
    } catch (e) { addFloat(P.x, P.y - 40, '联机失败', '#f66'); }
  }
  function netTick(now) {
    if (!NET.on) return;
    if (now - NET.last > 100) {
      NET.last = now;
      try {
        NET.ch.send({ type: 'broadcast', event: 'pos', payload: { id: NET.me, x: P.x, y: P.y, name: P.name } });
      } catch (e) {}
    }
    for (var k in NET.others) {
      if (now - NET.others[k].t > 3000) delete NET.others[k];
    }
  }

  /* ========== 绘制：人物 ========== */
  function drawHuman(x, y, r, ang, isMe) {
    // 影子
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.7, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 身体
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + Math.PI / 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0a0a0a';
    ctx.fillStyle = isMe ? '#4a7fd4' : '#d4a04a';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(r * 0.75, r * 0.7);
    ctx.lineTo(0, r * 0.35);
    ctx.lineTo(-r * 0.75, r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 武器
    ctx.fillStyle = '#ddd';
    ctx.fillRect(r * 0.6, -r * 1.2, 3, r * 1.4);
    ctx.restore();

    // 头部白圈，保证任何底色可见
    ctx.beginPath();
    ctx.fillStyle = '#f2e3c0';
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0a0a0a';
    ctx.stroke();
  }

  function drawBeast(x, y, r, color, hpRatio) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2a0a0a';
    ctx.stroke();
    // 角
    ctx.beginPath();
    ctx.fillStyle = '#2a0a0a';
    ctx.arc(x - r * 0.4, y - r * 0.8, r * 0.22, 0, Math.PI * 2);
    ctx.arc(x + r * 0.4, y - r * 0.8, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    // 眼
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.1, r * 0.16, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3, y - r * 0.1, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    if (hpRatio < 1) {
      ctx.fillStyle = '#300';
      ctx.fillRect(x - r, y - r - 10, r * 2, 4);
      ctx.fillStyle = '#e55';
      ctx.fillRect(x - r, y - r - 10, r * 2 * hpRatio, 4);
    }
  }

  function drawDeer(x, y, r, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111';
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x + r * 0.7, y - r * 0.5, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ========== 绘制：地图 ========== */
  function drawFallbackMap() {
    // 草地
    ctx.fillStyle = '#3a5f35';
    ctx.fillRect(0, 0, W, H);
    // 土路（按世界坐标画）
    ctx.save();
    ctx.fillStyle = '#7a6344';
    var roads = [
      [VILL.x + 20, VILL.y + VILL.h / 2 - 30, VILL.w - 40, 60],
      [W / 2 - 30, VILL.y + VILL.h, 60, MAPH - VILL.y - VILL.h]
    ];
    for (var i = 0; i < roads.length; i++) {
      var r = roads[i];
      ctx.fillRect(w2sX(r[0]), w2sY(r[1]), r[2] * S, r[3] * S);
    }
    // 房子
    for (var h = 0; h < HOUSES.length; h++) {
      var hs = HOUSES[h];
      ctx.fillStyle = '#8b5a3c';
      ctx.fillRect(w2sX(hs.x), w2sY(hs.y), hs.w * S, hs.h * S);
      ctx.fillStyle = '#5c3a24';
      ctx.fillRect(w2sX(hs.x + hs.door.x), w2sY(hs.y + hs.door.y), hs.door.w * S, hs.door.h * S);
    }
    // 水塘
    ctx.fillStyle = '#2f5a7a';
    ctx.beginPath();
    ctx.ellipse(w2sX(1250), w2sY(700), 110 * S, 70 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMap() {
    if (mapOK) {
      ctx.drawImage(mapImg, OX, OY, MAPW * S, MAPH * S);
    } else {
      drawFallbackMap();
    }
    // 村庄边界提示
    ctx.save();
    ctx.strokeStyle = 'rgba(255,220,120,0.35)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.strokeRect(w2sX(VILL.x), w2sY(VILL.y), VILL.w * S, VILL.h * S);
    ctx.restore();
  }

  function drawRoom() {
    ctx.fillStyle = '#2b2118';
    ctx.fillRect(0, 0, W, H);
    var rw = Math.min(W * 0.9, 620), rh = Math.min(H * 0.75, 420);
    var rx = (W - rw) / 2, ry = (H - rh) / 2;
    ctx.fillStyle = '#6b4f33';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 8;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.fillStyle = '#c8b48a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('屋内（走到下方门口离开）', W / 2, ry + 40);
  }

  /* ========== 绘制特效 ========== */
  function drawFloats() {
    for (var i = floats.length - 1; i >= 0; i--) {
      var f = floats[i];
      var t = 1 - f.life / f.max;
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.fillStyle = f.color;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.txt, w2sX(f.x), w2sY(f.y) - t * 36);
      ctx.globalAlpha = 1;
      f.life -= 0.016;
      if (f.life <= 0) floats.splice(i, 1);
    }
  }

  function drawFx() {
    for (var i = fx.length - 1; i >= 0; i--) {
      var f = fx[i];
      var t = 1 - f.life / f.max;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = f.key === 'ult' ? '#9ef' : '#fff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(w2sX(f.x), w2sY(f.y), f.range * S * (0.5 + t), f.ang - f.arc / 2, f.ang + f.arc / 2);
      ctx.stroke();
      ctx.restore();
      f.life -= 0.016;
      if (f.life <= 0) fx.splice(i, 1);
    }
  }

  function drawCorpses() {
    for (var i = corpses.length - 1; i >= 0; i--) {
      var c = corpses[i];
      ctx.globalAlpha = Math.min(1, c.life / 3) * 0.5;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(w2sX(c.x), w2sY(c.y), c.r * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      c.life -= 0.016;
      if (c.life <= 0) corpses.splice(i, 1);
    }
  }

  /* ========== HUD 与按钮 ========== */
  var btns = [];
  var JOY = { active: false, bx: 0, by: 0, x: 0, y: 0, dx: 0, dy: 0, id: null, rad: 52 };

  function layoutBtns() {
    btns = [];
    var m = Math.min(W, H);
    var r = Math.max(30, Math.min(46, m * 0.072));
    var gap = r * 0.28;
    // 右下菱形：挥砍(下) 突进斩(右) 旋斩(右下偏) 林泉·斩(左)
    var cx = W - r - 20, cy = H - r - 20;
    var pos = {
      slash: { x: cx - r * 1.75, y: cy - r * 0.85 },
      dash:  { x: cx,          y: cy - r * 1.6 },
      spin:  { x: cx,          y: cy },
      ult:   { x: cx - r * 1.9, y: cy - r * 2.2 }
    };
    for (var i = 0; i < SKK.length; i++) {
      var k = SKK[i];
      btns.push({ id: k, x: pos[k].x, y: pos[k].y, r: r, label: SK[k].name, kind: 'skill' });
    }
    // 锁敌：右上
    btns.push({ id: 'lock', x: W - r - 20, y: 96 + r, r: r * 0.9, label: '锁敌', kind: 'lock' });
    // 备份：左下
    btns.push({ id: 'backup', x: r + 20, y: H - r - 24, r: r * 0.85, label: '备份', kind: 'backup' });
    // 摇杆中心
    JOY.bx = JOY.x = JOY.rad + 28;
    JOY.by = JOY.y = H - JOY.rad - 28;
  }

  function findBtn(x, y) {
    for (var i = btns.length - 1; i >= 0; i--) {
      var b = btns[i];
      if (dist(x, y, b.x, b.y) <= b.r + 8) return b;
    }
    return null;
  }

  function inJoyArea(x, y) {
    if (findBtn(x, y)) return false;
    var d = dist(x, y, JOY.bx, JOY.by);
    return d < JOY.rad * 2.6;
  }

  function drawHUD() {
    // 顶部血蓝
    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(62, 14, 200, 46);
    ctx.fillStyle = '#c33';
    ctx.fillRect(70, 20, 184 * Math.max(0, P.hp / P.maxHp), 12);
    ctx.fillStyle = '#3a7fd4';
    ctx.fillRect(70, 36, 184 * Math.max(0, P.mp / P.maxMp), 10);
    ctx.fillStyle = '#ddd';
    ctx.fillText(P.name + ' Lv' + P.level, 8, 40);
    // 经验
    ctx.fillStyle = '#543';
    ctx.fillRect(70, 50, 184, 5);
    ctx.fillStyle = '#ffd54a';
    ctx.fillRect(70, 50, 184 * Math.min(1, P.exp / needExp(P.level)), 5);

    // 区域名
    var z = zoneName();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '14px sans-serif';
    ctx.fillText(z.name + (z.safe ? '（安全区）' : ''), W / 2, 36);

    // 联机人数
    var n = Object.keys(NET.others).length;
    if (NET.on) {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(180,255,200,0.8)';
      ctx.fillText('房间 ' + NET.room + ' · 在线 ' + (n + 1), W - 12, H - 8);
    }
    ctx.restore();

    // 摇杆
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(JOY.bx, JOY.by, JOY.rad, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.65;
    ctx.beginPath(); ctx.arc(JOY.x, JOY.y, JOY.rad * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 按钮
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.kind === 'skill' ? 'rgba(30,70,120,0.75)' : 'rgba(40,40,40,0.7)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(140,200,255,0.85)';
      ctx.stroke();
      // 冷却遮罩
      if (b.kind === 'skill' && SKILLCD[b.id] > 0) {
        var ratio = SKILLCD[b.id] / SK[b.id].cd;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.max(11, b.r * 0.36) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x, b.y);
      ctx.restore();
    }
  }

  /* ========== 主循环 ========== */
  var lastT = performance.now();
  var errMsg = '';

  function update(dt) {
    var kx = 0, ky = 0;
    if (keys['w'] || keys['arrowup']) ky -= 1;
    if (keys['s'] || keys['arrowdown']) ky += 1;
    if (keys['a'] || keys['arrowleft']) kx -= 1;
    if (keys['d'] || keys['arrowright']) kx += 1;
    if (JOY.active) { kx += JOY.dx; ky += JOY.dy; }
    var len = Math.sqrt(kx * kx + ky * ky);
    if (len > 1) { kx /= len; ky /= len; }

    if (scene === 'world') {
      if (len > 0.01) {
        var nx = P.x + kx * P.speed * dt;
        var ny = P.y + ky * P.speed * dt;
        nx = Math.max(20, Math.min(MAPW - 20, nx));
        ny = Math.max(20, Math.min(MAPH - 20, ny));
        resolveObst(nx, ny);
        P.face = Math.atan2(ky, kx);
      }
      if (P.target && P.target.alive) {
        aimAng = Math.atan2(P.target.y - P.y, P.target.x - P.x);
      }
    } else {
      inPos.x += kx * P.speed * dt;
      inPos.y += ky * P.speed * dt;
      inPos.x = Math.max(40, Math.min(W - 40, inPos.x));
      inPos.y = Math.max(60, Math.min(H - 20, inPos.y));
      if (inPos.y > H - 44) { scene = 'world'; doorLock = 1.2; }
    }

    // 冷却
    for (var k in SKILLCD) if (SKILLCD[k] > 0) SKILLCD[k] -= dt;
    if (doorLock > 0) doorLock -= dt;
    if (shake > 0) shake = Math.max(0, shake - dt * 40);

    // 回复
    if (scene === 'world') {
      if (inVill()) { P.hp = Math.min(P.maxHp, P.hp + 12 * dt); P.mp = Math.min(P.maxMp, P.mp + 10 * dt); }
      else { P.mp = Math.min(P.maxMp, P.mp + 6 * dt); P.hp = Math.min(P.maxHp, P.hp + 1.5 * dt); }
    }

    // 怪物
    if (scene === 'world') {
      for (var i = 0; i < monsters.length; i++) {
        var m = monsters[i];
        if (!m.alive) continue;
        var d = dist(P.x, P.y, m.x, m.y);
        var cfg = MON[m.type];
        if (cfg.aggro > 0 && d < cfg.aggro) m.aggro = true;
        if (m.aggro && d > 2) {
          var spd = m.speed * dt;
          if (d > m.r + P.r) {
            m.x += (P.x - m.x) / d * spd;
            m.y += (P.y - m.y) / d * spd;
          }
        } else if (m.type === 'deer' && !m.aggro) {
          // 中立怪原地小范围游荡
          m.x += Math.sin(performance.now() / 1500 + m.hx) * 8 * dt;
          m.y += Math.cos(performance.now() / 1700 + m.hy) * 8 * dt;
        }
        // 攻击玩家
        m.atkCd -= dt;
        if (d < m.r + P.r + 4 && m.atkCd <= 0) {
          m.atkCd = 1.2;
          var dmg = Math.max(1, m.atk - P.def * 0.5);
          P.hp -= dmg;
          addFloat(P.x, P.y - 26, '-' + Math.round(dmg), '#f66');
          shake = 4;
          if (P.hp <= 0) {
            P.hp = P.maxHp * 0.5; P.mp = P.maxMp * 0.5;
            P.x = 860; P.y = 660;
            addFloat(P.x, P.y - 40, '你被击倒，回村复活', '#f66');
          }
        }
      }
      // 进门检测
      if (doorLock <= 0) tryDoor();
    }

    netTick(performance.now());
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (scene === 'world') {
      drawMap();
      // 房子（若地图是备用图，房子已画在上面，不重复）
      if (!mapOK) { /* 已画 */ }
      // 尸体
      drawCorpses();
      // 怪物
      for (var i = 0; i < monsters.length; i++) {
        var m = monsters[i];
        if (m.type === 'beast') drawBeast(w2sX(m.x), w2sY(m.y), m.r * S * 1.15, m.color, m.hp / m.maxHp);
        else drawDeer(w2sX(m.x), w2sY(m.y), m.r * S * 1.15, m.color);
        if (P.target === m) {
          ctx.beginPath();
          ctx.strokeStyle = '#ff4b4b';
          ctx.lineWidth = 2;
          ctx.arc(w2sX(m.x), w2sY(m.y), m.r * S * 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // 其他玩家
      for (var k in NET.others) {
        var o = NET.others[k];
        drawHuman(w2sX(o.x), w2sY(o.y), 13 * S * 1.15, 0, false);
      }
      // 自己
      drawHuman(w2sX(P.x), w2sY(P.y), Math.max(12, P.r * S * 1.15), P.face, true);
      // 射程预览
      if (P.target && P.target.alive) {
        var sk = SK.slash;
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#9ef';
        ctx.beginPath();
        ctx.moveTo(w2sX(P.x), w2sY(P.y));
        ctx.arc(w2sX(P.x), w2sY(P.y), sk.range * S, aimAng - sk.arc / 2, aimAng + sk.arc / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      drawFx();
      drawFloats();
      drawHUD();
    } else {
      drawRoom();
      drawHuman(inPos.x, inPos.y, 14, Math.PI / 2, true);
      drawFloats();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, H - 60, W, 60);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↓ 向下走离开房屋', W / 2, H - 24);
      drawHUD();
    }

    if (shake > 0) {
      ctx.save();
      ctx.translate(rnd(-shake, shake), rnd(-shake, shake));
      ctx.restore();
    }

    if (errMsg) {
      ctx.save();
      ctx.fillStyle = 'rgba(160,0,0,0.85)';
      ctx.fillRect(0, 0, W, 26);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ERR: ' + errMsg.slice(0, 90), 6, 18);
      ctx.restore();
    }
  }

  function loop(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    try {
      if (!window.__paused) update(dt);
      draw();
    } catch (e) {
      errMsg = (e && e.message) ? e.message : String(e);
    }
    requestAnimationFrame(loop);
  }

  /* ========== 输入 ========== */
  var keys = {};
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'l') lockTarget();
    if (k === 'b') showBackup();
    if (k === ' ') { castSkill('slash'); e.preventDefault(); }
    var idx = SKK.indexOf({ '1': 'slash', '2': 'dash', '3': 'spin', '4': 'ult' }[k]);
    if (idx >= 0) castSkill(SKK[idx]);
  });
  document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });

  var pressBtn = null;

  function onDown(e) {
    var t = e.changedTouches ? e.changedTouches[0] : e;
    var x = t.clientX, y = t.clientY;
    var b = findBtn(x, y);
    if (b) {
      pressBtn = b.id;
      if (b.kind === 'skill') castSkill(b.id);
      else if (b.id === 'lock') lockTarget();
      else if (b.id === 'backup') showBackup();
      return;
    }
    if (inJoyArea(x, y)) {
      JOY.active = true;
      JOY.x = x; JOY.y = y;
      JOY.dx = 0; JOY.dy = 0;
    } else if (scene === 'world') {
      // 点敌人锁敌，点空白取消
      var wx = (x - OX) / S, wy = (y - OY) / S;
      var hit = null;
      for (var i = 0; i < monsters.length; i++) {
        if (dist(wx, wy, monsters[i].x, monsters[i].y) < Math.max(24, monsters[i].r * 1.6)) { hit = monsters[i]; break; }
      }
      P.target = hit;
    }
  }
  function onMove(e) {
    if (!JOY.active) return;
    var t = e.changedTouches ? e.changedTouches[0] : e;
    var d = dist(t.clientX, t.clientY, JOY.bx, JOY.by);
    var maxD = JOY.rad;
    JOY.dx = (t.clientX - JOY.bx) / maxD;
    JOY.dy = (t.clientY - JOY.by) / maxD;
    var l = Math.sqrt(JOY.dx * JOY.dx + JOY.dy * JOY.dy);
    if (l > 1) { JOY.dx /= l; JOY.dy /= l; }
    JOY.x = JOY.bx + JOY.dx * maxD * 0.9;
    JOY.y = JOY.by + JOY.dy * maxD * 0.9;
  }
  function onUp() {
    JOY.active = false;
    JOY.dx = 0; JOY.dy = 0;
    JOY.x = JOY.bx; JOY.y = JOY.by;
    pressBtn = null;
  }

  cv.addEventListener('touchstart', function (e) { e.preventDefault(); onDown(e); }, { passive: false });
  cv.addEventListener('touchmove', function (e) { e.preventDefault(); onMove(e); }, { passive: false });
  cv.addEventListener('touchend', function (e) { e.preventDefault(); onUp(); }, { passive: false });
  cv.addEventListener('mousedown', onDown);
  cv.addEventListener('mousemove', function (e) { if (JOY.active) onMove(e); });
  cv.addEventListener('mouseup', onUp);

  /* ========== 障碍与门 ========== */
  function resolveObst(nx, ny) {
    // 简单的房子碰撞：不能穿过房体（门口除外）
    for (var i = 0; i < HOUSES.length; i++) {
      var h = HOUSES[i];
      var dx = h.door.x, dy = h.door.y, dw = h.door.w, dh = h.door.h;
      var inDoor = nx > h.x + dx - 6 && nx < h.x + dx + dw + 6 && ny > h.y + dy - 6;
      if (!inDoor &&
        nx > h.x - P.r && nx < h.x + h.w + P.r &&
        ny > h.y - P.r && ny < h.y + h.h + P.r) {
        // 从外侧推回
        var cx = h.x + h.w / 2, cy = h.y + h.h / 2;
        if (Math.abs(nx - cx) / (h.w / 2) > Math.abs(ny - cy) / (h.h / 2)) {
          nx = nx > cx ? h.x + h.w + P.r + 1 : h.x - P.r - 1;
        } else {
          ny = ny > cy ? h.y + h.h + P.r + 1 : h.y - P.r - 1;
        }
      }
    }
    P.x = nx; P.y = ny;
  }

  function tryDoor() {
    for (var i = 0; i < HOUSES.length; i++) {
      var h = HOUSES[i];
      var dx = h.door.x, dy = h.door.y, dw = h.door.w;
      if (P.x > h.x + dx - 6 && P.x < h.x + dx + dw + 6 &&
        P.y > h.y + dy - 14 && P.y < h.y + dy + 14) {
        curHouse = h;
        scene = 'room';
        doorLock = 1.5;
        inPos.x = W / 2;
        inPos.y = H * 0.78;
        return;
      }
    }
  }

  /* ========== 背包 ========== */
  var bagEl = document.getElementById('bag');
  var bagListEl = document.getElementById('bagList');
  var bagInfoEl = document.getElementById('bagInfo');

  function statText(e) {
    if (!e) return '—';
    var t = { weapon: '攻击', armor: '防御', ring: '生命' }[e.type];
    return e.name + ' ' + t + '+' + e.val;
  }

  function renderBag() {
    if (!bagEl) return;
    bagEl.style.display = 'block';
    var html = '<div style="color:#aaa;margin-bottom:6px">当前装备：剑 ' + statText(P.equip.weapon) +
      '｜甲 ' + statText(P.equip.armor) + '｜戒 ' + statText(P.equip.ring) + '</div>';
    if (!P.bag.length) html += '<div style="color:#777">背包空空</div>';
    for (var i = 0; i < P.bag.length; i++) {
      var e = P.bag[i];
      html += '<div class="item" data-i="' + i + '" style="color:' + e.color +
        ';padding:6px;border-bottom:1px solid #333">' + e.name + '（' +
        { weapon: '剑', armor: '甲', ring: '戒' }[e.type] + ' +' + e.val + '）</div>';
    }
    bagListEl.innerHTML = html;
    var items = bagListEl.querySelectorAll('.item');
    for (var j = 0; j < items.length; j++) {
      items[j].onclick = function () {
        var idx = +this.getAttribute('data-i');
        var eq = P.bag[idx];
        if (!eq) return;
        var old = P.equip[eq.type];
        P.equip[eq.type] = eq;
        P.bag.splice(idx, 1);
        if (old) P.bag.push(old);
        applyEquipStats();
        renderBag();
        saveGame();
      };
    }
  }

  var baseAtk = P.atk, baseMaxHp = P.maxHp, baseDef = P.def;
  function applyEquipStats() {
    P.atk = baseAtk + (P.equip.weapon ? P.equip.weapon.val : 0);
    P.def = baseDef + (P.equip.armor ? P.equip.armor.val * 0.3 : 0);
    var bonusHp = P.equip.ring ? P.equip.ring.val : 0;
    P.maxHp = baseMaxHp + bonusHp;
    if (P.hp > P.maxHp) P.hp = P.maxHp;
  }

  function showBackup() {
    var code = 'FRK1:' + encodeURIComponent(JSON.stringify(snapData()));
    if (bagInfoEl) {
      bagInfoEl.style.display = 'block';
      bagInfoEl.innerHTML = '<div style="color:#ffd54a;margin-bottom:6px">备份码（长按复制）</div>' +
        '<textarea readonly style="width:100%;height:90px;background:#111;color:#aaa;border:1px solid #444;font-size:11px">' +
        code + '</textarea>';
      var ta = bagInfoEl.querySelector('textarea');
      if (ta) { ta.focus(); ta.select(); copyText(code); }
    }
  }
  function copyText(t) {
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(t);
      else {
        var ta = document.createElement('textarea');
        ta.value = t; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
    } catch (e) {}
  }

  /* ========== 进入游戏 ========== */
  function showJoinUI() {
    var el = document.getElementById('join');
    if (!el) return;
    el.style.display = 'flex';
    var nameIn = document.getElementById('nameIn');
    var roomIn = document.getElementById('roomIn');
    var goBtn = document.getElementById('goBtn');
    if (goBtn) {
      goBtn.onclick = function () {
        P.name = (nameIn && nameIn.value.trim()) || '兰德';
        var room = (roomIn && roomIn.value.trim()) || '';
        el.style.display = 'none';
        if (room) connect(room);
      };
    }
  }

  function startGame() {
    resize();
    spawnMonsters();
    loadGame();
    baseAtk = P.atk; baseDef = P.def; baseMaxHp = P.maxHp;
    applyEquipStats();
    renderBag();
    showJoinUI();
  }

  /* ========== 启动 ========== */
  window.addEventListener('resize', function () { resize(); });
  window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
  window.addEventListener('beforeunload', saveGame);
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveGame(); });

  resize();
  startGame();
  setInterval(function () { if (!P.isDead) saveGame(); }, 5000);
  requestAnimationFrame(loop);
})();