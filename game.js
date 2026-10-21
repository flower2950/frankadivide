(function () {
  'use strict';

  /* =========================================================
     联机配置
     ========================================================= */
  var SUPA_URL = 'https://rdwhqsvovabtyjlxbagf.supabase.co';
  var SUPA_KEY = 'sb_publishable_G_i8uDGtnjdGTGG73F2Rqg_hBiu-HuZ';
  var NET = { on: false, room: '', me: 'p' + Math.floor(Math.random() * 99999), others: {}, last: 0, ch: null };

  /* =========================================================
     画布
     ========================================================= */
  var cv = document.getElementById('cv');
  var ctx = cv.getContext('2d');
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var MAPW = 1600, MAPH = 1200;
  var S = 1;               // 缩放
  var CAM = { x: 0, y: 0 }; // 镜头左上角（世界坐标）
  var DEBUG = /[?&]debug=1/.test(location.search);

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.floor(W * DPR);
    cv.height = Math.floor(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // 镜头缩放：让可见范围约 900 世界像素宽
    S = Math.max(W / 900, H / (900 * H / W));
    S = W / 900;
    if (MAPH * S < H) S = H / MAPH;
    layoutBtns();
  }

  // 世界 -> 屏幕
  function w2sX(x) { return (x - CAM.x) * S; }
  function w2sY(y) { return (y - CAM.y) * S; }
  // 屏幕 -> 世界
  function s2wX(x) { return x / S + CAM.x; }
  function s2wY(y) { return y / S + CAM.y; }

  function updateCam() {
    var vw = W / S, vh = H / S;
    CAM.x = P.x - vw / 2;
    CAM.y = P.y - vh / 2;
    CAM.x = Math.max(0, Math.min(MAPW - vw, CAM.x));
    CAM.y = Math.max(0, Math.min(MAPH - vh, CAM.y));
    if (MAPW < vw) CAM.x = (MAPW - vw) / 2;
    if (MAPH < vh) CAM.y = (MAPH - vh) / 2;
  }

  /* =========================================================
     图片
     ========================================================= */
  var mapImg = new Image(); mapImg.src = 'map.png';
  var inImg = new Image(); inImg.src = 'in.png';
  var mapOK = false, inOK = false;
  mapImg.onload = function () { mapOK = mapImg.naturalWidth > 0; };
  mapImg.onerror = function () { mapOK = false; };
  inImg.onload = function () { inOK = inImg.naturalWidth > 0; };

  /* =========================================================
     地图真实坐标（由 map.png 1024x768 换算到 1600x1200，乘 1.5625）
     每栋房子：
       solid  = 房体碰撞框（不可穿过）
       door   = 门口踏脚区（走到这里触发进屋）
     ========================================================= */
  var K = 1600 / 1024; // 1.5625

  function h2s(x1, y1, x2, y2) { // 原图矩形 -> 世界矩形
    return { x: x1 * K, y: y1 * K, w: (x2 - x1) * K, h: (y2 - y1) * K };
  }

  var HOUSES = [
    { // 红瓦大屋（左上）
      name: '红瓦大屋',
      solid: h2s(332, 150, 505, 250),
      door:  { x: 406 * K, y: 246 * K, w: 48 * K, h: 22 * K }
    },
    { // 右侧石屋
      name: '石屋',
      solid: h2s(520, 190, 655, 272),
      door:  { x: 560 * K, y: 266 * K, w: 46 * K, h: 22 * K }
    },
    { // 左侧矮屋
      name: '矮屋',
      solid: h2s(345, 258, 440, 316),
      door:  { x: 378 * K, y: 310 * K, w: 40 * K, h: 20 * K }
    },
    { // 左下小屋
      name: '小屋',
      solid: h2s(330, 322, 425, 382),
      door:  { x: 360 * K, y: 376 * K, w: 40 * K, h: 20 * K }
    }
  ];

  // 村庄栅栏范围（原图像素 225,175 ~ 715,500）
  var VILL = h2s(225, 175, 715, 500);
  // 村庄出口（栅栏缺口，下方中偏右）
  var EXIT = h2s(452, 488, 560, 512);

  var ZONES = [
    { x: VILL.x, y: VILL.y, w: VILL.w, h: VILL.h, name: '林泉村', safe: true },
    { x: 60, y: 90, w: 480, h: 300, name: '村外草地' },
    { x: 1090, y: 90, w: 450, h: 300, name: '枯木荒坡' },
    { x: 1090, y: 830, w: 450, h: 320, name: '林泉野径' },
    { x: 60, y: 830, w: 480, h: 320, name: '南边草原' }
  ];

  /* =========================================================
     技能
     ========================================================= */
  var SK = {
    slash: { name: '挥砍',   cd: 0.6, mp: 0,  range: 62,  arc: 1.5,        dmg: 1.0 },
    dash:  { name: '突进斩', cd: 4,   mp: 8,  range: 110, arc: 1.1,        dmg: 1.3 },
    spin:  { name: '旋斩',   cd: 6,   mp: 12, range: 78,  arc: Math.PI * 2, dmg: 0.85 },
    ult:   { name: '林泉·斩', cd: 10, mp: 50, range: 160, arc: 1.9,        dmg: 2.2 }
  };
  var SKK = ['slash', 'dash', 'spin', 'ult'];
  var SKILLCD = { slash: 0, dash: 0, spin: 0, ult: 0 };

  /* =========================================================
     装备
     ========================================================= */
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

  /* =========================================================
     怪物
     ========================================================= */
  var MON = {
    beast: { hp: 70, atk: 9, def: 2, aggro: 220, speed: 72, r: 16, exp: 26, drop: 0.85, color: '#a34' },
    deer:  { hp: 55, atk: 7, def: 2, aggro: 0,   speed: 60, r: 15, exp: 14, drop: 0.35, color: '#8a7' }
  };
  var SPAWNS = [
    { x: 200, y: 260, type: 'beast', n: 4 },
    { x: 1330, y: 250, type: 'beast', n: 3 },
    { x: 1300, y: 1000, type: 'deer', n: 4 },
    { x: 260, y: 1010, type: 'deer', n: 4 }
  ];

  /* =========================================================
     玩家
     ========================================================= */
  var P = {
    name: '兰德', x: 800, y: 620, level: 5,
    hp: 220, maxHp: 220, mp: 100, maxMp: 100,
    atk: 22, def: 8, speed: 210, r: 13,
    face: 1.57, exp: 0, target: null,
    bag: [], equip: { weapon: null, armor: null, ring: null }
  };

  var monsters = [];
  var floats = [], fx = [], corpses = [], shake = 0;

  /* =========================================================
     场景
     ========================================================= */
  var scene = 'world';
  var doorLock = 0, curHouse = null;
  var inPos = { x: 0, y: 0 };

  /* =========================================================
     工具
     ========================================================= */
  function dist(a, b, c, d) { var dx = a - c, dy = b - d; return Math.sqrt(dx * dx + dy * dy); }
  function needExp(level) { return level * 40; }
  function inRect(r, x, y) { return x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h; }
  function inVill() { return inRect(VILL, P.x, P.y); }

  function zoneName() {
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      if (inRect(z, P.x, P.y)) return z;
    }
    return { name: '弗兰卡荒野' };
  }

  function addFloat(x, y, txt, color) {
    floats.push({ x: x, y: y, txt: txt, color: color || '#fff', life: 0.9, max: 0.9 });
  }

  /* =========================================================
     怪物生成与伤害
     ========================================================= */
  function spawnMonsters() {
    monsters = [];
    for (var i = 0; i < SPAWNS.length; i++) {
      var s = SPAWNS[i];
      for (var j = 0; j < s.n; j++) {
        var m = MON[s.type];
        monsters.push({
          type: s.type, hp: m.hp, maxHp: m.hp, atk: m.atk, def: m.def,
          speed: m.speed, r: m.r, exp: m.exp, drop: m.drop, color: m.color,
          x: s.x + rnd(-60, 60), y: s.y + rnd(-60, 60),
          hx: s.x, hy: s.y, aggro: false, atkCd: 0, alive: true
        });
      }
    }
  }

  function damageMon(m, dmg, isCrit) {
    m.hp -= dmg;
    addFloat(m.x, m.y - 22, Math.round(dmg), isCrit ? '#ffd54a' : '#fff');
    if (m.hp <= 0) {
      m.alive = false;
      corpses.push({ x: m.x, y: m.y, r: m.r, color: m.color, life: 8 });
      gainExp(m.exp);
      if (Math.random() < m.drop) {
        var e = makeEquip(P.level);
        P.bag.push(e);
        addFloat(m.x, m.y - 36, e.name, e.color);
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
      addFloat(P.x, P.y - 50, '升级！Lv' + P.level, '#ffd54a');
    }
  }

  /* =========================================================
     技能释放
     ========================================================= */
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
    if (P.target) addFloat(P.x, P.y - 34, '锁定', '#ff6b6b');
  }

  function castSkill(key) {
    var s = SK[key];
    if (!s) return;
    if (scene !== 'world') return;
    if (SKILLCD[key] > 0) return;
    if (P.mp < s.mp) { addFloat(P.x, P.y - 36, '蓝量不足', '#69f'); return; }
    if (inVill()) { addFloat(P.x, P.y - 36, '村内无法出手', '#bbb'); return; }

    P.mp -= s.mp;
    SKILLCD[key] = s.cd;

    var ang = P.face;
    if (P.target && P.target.alive) ang = Math.atan2(P.target.y - P.y, P.target.x - P.x);
    P.face = ang;

    if (key === 'dash') {
      var nx = P.x + Math.cos(ang) * 70;
      var ny = P.y + Math.sin(ang) * 70;
      moveWithCollision(nx, ny);
    }
    if (key === 'ult' || key === 'spin') shake = key === 'ult' ? 10 : 5;

    fx.push({ type: 'arc', x: P.x, y: P.y, ang: ang, arc: s.arc, range: s.range, life: 0.25, max: 0.25, key: key });

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

  /* =========================================================
     碰撞
     ========================================================= */
  function hitSolid(x, y, pad) {
    var pr = P.r + (pad || 0);
    for (var i = 0; i < HOUSES.length; i++) {
      var s = HOUSES[i].solid;
      if (x > s.x - pr && x < s.x + s.w + pr && y > s.y - pr && y < s.y + s.h + pr) {
        // 门口下方放行（允许站在门口）
        var d = HOUSES[i].door;
        if (inRect({ x: d.x, y: d.y, w: d.w, h: d.h }, x, y)) continue;
        // 站在门下方（y 更大）且在门宽度内，允许多走一点点
        if (x > d.x + 4 && x < d.x + d.w - 4 && y > s.y + s.h - 2) continue;
        return true;
      }
    }
    return false;
  }

  function moveWithCollision(nx, ny) {
    nx = Math.max(24, Math.min(MAPW - 24, nx));
    ny = Math.max(24, Math.min(MAPH - 24, ny));
    if (!hitSolid(nx, P.y, 0)) P.x = nx;
    if (!hitSolid(P.x, ny, 0)) P.y = ny;
  }

  // 进门：必须站在门踏脚区里
  function tryDoor() {
    for (var i = 0; i < HOUSES.length; i++) {
      var d = HOUSES[i].door;
      if (inRect(d, P.x, P.y)) {
        curHouse = HOUSES[i];
        scene = 'room';
        doorLock = 1.5;
        inPos.x = W / 2;
        inPos.y = H * 0.76;
        return;
      }
    }
  }

  /* =========================================================
     存档
     ========================================================= */
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

  /* =========================================================
     联机
     ========================================================= */
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

  /* =========================================================
     绘制：八方风主角（2头身像素小人）
     ========================================================= */
  function drawHero(x, y, facing, isMe) {
    var sc = 1.0;
    ctx.save();
    ctx.translate(x, y);

    // 影子
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 2, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    var dir = 0; // 0下 1左 2右 3上
    var a = facing;
    if (a > -Math.PI / 4 && a <= Math.PI / 4) dir = 2;
    else if (a > Math.PI / 4 && a <= Math.PI * 3 / 4) dir = 0;
    else if (a <= -Math.PI / 4 && a > -Math.PI * 3 / 4) dir = 3;
    else dir = 1;

    // 披风
    ctx.fillStyle = '#2f4f8f';
    ctx.beginPath();
    ctx.moveTo(-9, -18);
    ctx.lineTo(9, -18);
    ctx.lineTo(12, 0);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fill();

    // 身体（上衣）
    ctx.fillStyle = '#6b8fbf';
    ctx.fillRect(-8, -20, 16, 14);
    ctx.strokeStyle = '#14243d';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -20, 16, 14);

    // 腿
    ctx.fillStyle = '#2b3550';
    ctx.fillRect(-7, -7, 6, 12);
    ctx.fillRect(1, -7, 6, 12);
    ctx.strokeRect(-7, -7, 6, 12);
    ctx.strokeRect(1, -7, 6, 12);

    // 头
    ctx.fillStyle = '#f3dcc0';
    ctx.beginPath();
    ctx.arc(0, -30, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1b1209';
    ctx.stroke();

    // 头发
    ctx.fillStyle = '#5a3a22';
    ctx.beginPath();
    ctx.arc(0, -32, 12, Math.PI, 0);
    ctx.fill();

    // 眼睛（按朝向）
    ctx.fillStyle = '#1b1209';
    if (dir === 0) {
      ctx.fillRect(-6, -31, 3, 4);
      ctx.fillRect(3, -31, 3, 4);
    } else if (dir === 1) {
      ctx.fillRect(-7, -31, 3, 4);
    } else if (dir === 2) {
      ctx.fillRect(4, -31, 3, 4);
    }

    // 剑（右手侧）
    ctx.save();
    ctx.translate(11, -16);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#d8dde6';
    ctx.fillRect(-2, -26, 4, 26);
    ctx.fillStyle = '#c8a04a';
    ctx.fillRect(-5, 0, 10, 4);
    ctx.restore();

    // 我自己的头顶标识
    if (isMe) {
      ctx.fillStyle = '#8fd0ff';
      ctx.beginPath();
      ctx.moveTo(0, -52);
      ctx.lineTo(-6, -44);
      ctx.lineTo(6, -44);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBeast(x, y, r, color, hpRatio) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2a0a0a';
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = '#2a0a0a';
    ctx.arc(x - r * 0.42, y - r * 0.78, r * 0.24, 0, Math.PI * 2);
    ctx.arc(x + r * 0.42, y - r * 0.78, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.05, r * 0.18, 0, Math.PI * 2);
    ctx.arc(x + r * 0.32, y - r * 0.05, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    if (hpRatio < 1) {
      ctx.fillStyle = '#300';
      ctx.fillRect(x - r, y - r - 12, r * 2, 4);
      ctx.fillStyle = '#e55';
      ctx.fillRect(x - r, y - r - 12, r * 2 * hpRatio, 4);
    }
  }

  function drawDeer(x, y, r, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a2a12';
    ctx.stroke();
    ctx.fillStyle = '#5a4a2a';
    ctx.beginPath();
    ctx.arc(x + r * 0.75, y - r * 0.55, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#5a4a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.7, y - r * 0.9);
    ctx.lineTo(x + r * 0.55, y - r * 1.4);
    ctx.moveTo(x + r * 0.85, y - r * 0.9);
    ctx.lineTo(x + r * 1.0, y - r * 1.35);
    ctx.stroke();
  }

  /* =========================================================
     绘制：地图（镜头裁切）
     ========================================================= */
  function drawFallbackMap() {
    ctx.fillStyle = '#3a5f35';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#7a6344';
    ctx.fillRect(w2sX(VILL.x), w2sY(VILL.y + VILL.h / 2 - 30), VILL.w * S, 60 * S);
  }

  function drawMap() {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    if (mapOK) {
      ctx.drawImage(mapImg, -CAM.x * S, -CAM.y * S, MAPW * S, MAPH * S);
    } else {
      drawFallbackMap();
    }
    // 射程预览
    if (scene === 'world' && previewKey && SK[previewKey]) {
      var s = SK[previewKey];
      var ang = (P.target && P.target.alive)
        ? Math.atan2(P.target.y - P.y, P.target.x - P.x)
        : P.face;
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#9ef';
      ctx.beginPath();
      ctx.moveTo(w2sX(P.x), w2sY(P.y));
      ctx.arc(w2sX(P.x), w2sY(P.y), s.range * S, ang - s.arc / 2, ang + s.arc / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,230,255,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    if (DEBUG) {
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,0,0,0.8)';
      for (var i = 0; i < HOUSES.length; i++) {
        var h = HOUSES[i];
        ctx.strokeRect(w2sX(h.solid.x), w2sY(h.solid.y), h.solid.w * S, h.solid.h * S);
        ctx.strokeStyle = 'rgba(0,255,120,0.9)';
        ctx.strokeRect(w2sX(h.door.x), w2sY(h.door.y), h.door.w * S, h.door.h * S);
        ctx.strokeStyle = 'rgba(255,0,0,0.8)';
      }
      ctx.strokeStyle = 'rgba(255,220,0,0.9)';
      ctx.strokeRect(w2sX(VILL.x), w2sY(VILL.y), VILL.w * S, VILL.h * S);
      ctx.strokeStyle = 'rgba(255,120,0,0.9)';
      ctx.strokeRect(w2sX(EXIT.x), w2sY(EXIT.y), EXIT.w * S, EXIT.h * S);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawRoom() {
    ctx.fillStyle = '#2b2118';
    ctx.fillRect(0, 0, W, H);
    var rw = Math.min(W * 0.9, 620), rh = Math.min(H * 0.75, 420);
    var rx = (W - rw) / 2, ry = (H - rh) / 2;
    if (inOK) {
      ctx.drawImage(inImg, rx, ry, rw, rh);
    } else {
      ctx.fillStyle = '#6b4f33';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 8;
      ctx.strokeRect(rx, ry, rw, rh);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 44);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((curHouse ? curHouse.name : '屋内') + '（走到下方门口离开）', W / 2, 28);
  }

  /* =========================================================
     特效 / 飘字
     ========================================================= */
  function drawFloats() {
    for (var i = floats.length - 1; i >= 0; i--) {
      var f = floats[i];
      var t = 1 - f.life / f.max;
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.fillStyle = f.color;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.txt, w2sX(f.x), w2sY(f.y) - t * 40);
      ctx.globalAlpha = 1;
    }
  }

  function drawFx() {
    for (var i = 0; i < fx.length; i++) {
      var f = fx[i];
      var t = 1 - f.life / f.max;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = f.key === 'ult' ? '#9ef' : '#fff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(w2sX(f.x), w2sY(f.y), f.range * S * (0.45 + t * 0.6), f.ang - f.arc / 2, f.ang + f.arc / 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawCorpses() {
    for (var i = 0; i < corpses.length; i++) {
      var c = corpses[i];
      ctx.globalAlpha = Math.min(1, c.life / 3) * 0.5;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(w2sX(c.x), w2sY(c.y), c.r * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /* =========================================================
     按钮 / 摇杆
     ========================================================= */
  var btns = [];
  var JOY = { active: false, bx: 0, by: 0, x: 0, y: 0, dx: 0, dy: 0, rad: 58 };
  var previewKey = null;

  function layoutBtns() {
    btns = [];
    var m = Math.min(W, H);
    var r = Math.max(34, Math.min(50, m * 0.078));
    var cx = W - r - 22, cy = H - r - 22;

    var pos = {
      slash: { x: cx - r * 1.9,  y: cy - r * 0.95 },
      dash:  { x: cx - r * 0.1,  y: cy - r * 1.85 },
      spin:  { x: cx - r * 0.55, y: cy + r * 0.15 },
      ult:   { x: cx - r * 2.05, y: cy - r * 2.35 }
    };
    for (var i = 0; i < SKK.length; i++) {
      var k = SKK[i];
      btns.push({ id: k, x: pos[k].x, y: pos[k].y, r: r, label: SK[k].name, kind: 'skill' });
    }
    btns.push({ id: 'lock',   x: W - r - 22, y: 110 + r * 0.9, r: r * 0.86, label: '锁敌', kind: 'lock' });
    btns.push({ id: 'backup', x: r + 22,     y: H - r - 26,     r: r * 0.8,  label: '备份', kind: 'backup' });

    JOY.bx = JOY.x = JOY.rad + 30;
    JOY.by = JOY.y = H - JOY.rad - 30;
  }

  function findBtn(x, y) {
    for (var i = btns.length - 1; i >= 0; i--) {
      var b = btns[i];
      if (dist(x, y, b.x, b.y) <= b.r + 10) return b;
    }
    return null;
  }

  function inJoyArea(x, y) {
    if (findBtn(x, y)) return false;
    return dist(x, y, JOY.bx, JOY.by) < JOY.rad * 2.6;
  }

  function drawHUD() {
    ctx.save();
    // 左上状态面板
    ctx.fillStyle = 'rgba(8,12,18,0.62)';
    ctx.fillRect(8, 8, 252, 64);
    ctx.strokeStyle = 'rgba(140,180,220,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, 252, 64);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f0e6d2';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(P.name + ' Lv' + P.level, 18, 30);

    // HP
    ctx.fillStyle = '#3a0f0f';
    ctx.fillRect(18, 38, 232, 12);
    ctx.fillStyle = '#d2412f';
    ctx.fillRect(18, 38, 232 * Math.max(0, P.hp / P.maxHp), 12);
    // MP
    ctx.fillStyle = '#0f1c3a';
    ctx.fillRect(18, 54, 232, 8);
    ctx.fillStyle = '#3f7fe0';
    ctx.fillRect(18, 54, 232 * Math.max(0, P.mp / P.maxMp), 8);

    // 经验条（细）
    ctx.fillStyle = '#2a2318';
    ctx.fillRect(18, 64, 232, 3);
    ctx.fillStyle = '#ffd54a';
    ctx.fillRect(18, 64, 232 * Math.min(1, P.exp / needExp(P.level)), 3);

    // 区域名
    var z = zoneName();
    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    var txt = z.name + (z.safe ? '（安全区）' : '');
    ctx.fillRect(W / 2 - 90, 8, 180, 24);
    ctx.fillStyle = 'rgba(255,245,220,0.92)';
    ctx.fillText(txt, W / 2, 25);

    // 联机
    if (NET.on) {
      var n = Object.keys(NET.others).length;
      ctx.textAlign = 'right';
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(180,255,200,0.85)';
      ctx.fillText('房间 ' + NET.room + ' · 在线 ' + (n + 1), W - 12, H - 8);
    }
    ctx.restore();

    // 摇杆
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(JOY.bx, JOY.by, JOY.rad, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(JOY.x, JOY.y, JOY.rad * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 按钮
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.kind === 'skill' ? 'rgba(26,58,96,0.82)' : 'rgba(30,30,30,0.72)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = previewKey === b.id ? '#ffd54a' : 'rgba(140,200,255,0.85)';
      ctx.stroke();

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
      ctx.font = 'bold ' + Math.max(12, b.r * 0.34) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x, b.y);
      ctx.restore();
    }
  }

  /* =========================================================
     主循环
     ========================================================= */
  var keys = {};
  var lastT = performance.now();
  var errMsg = '';

  function update(dt, now) {
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
        moveWithCollision(P.x + kx * P.speed * dt, P.y + ky * P.speed * dt);
        P.face = Math.atan2(ky, kx);
      }
      if (P.target && P.target.alive) {
        aimAng = Math.atan2(P.target.y - P.y, P.target.x - P.x);
      }
      if (doorLock <= 0) tryDoor();
    } else {
      inPos.x += kx * P.speed * dt;
      inPos.y += ky * P.speed * dt;
      inPos.x = Math.max(40, Math.min(W - 40, inPos.x));
      inPos.y = Math.max(70, Math.min(H - 20, inPos.y));
      if (inPos.y > H - 50 && doorLock <= 0) {
        scene = 'world';
        doorLock = 1.5;
        // 从门口出来
        if (curHouse) {
          P.x = curHouse.door.x + curHouse.door.w / 2;
          P.y = curHouse.door.y + curHouse.door.h + P.r + 4;
        }
      }
    }

    for (var k in SKILLCD) if (SKILLCD[k] > 0) SKILLCD[k] -= dt;
    if (doorLock > 0) doorLock -= dt;
    if (shake > 0) shake = Math.max(0, shake - dt * 45);

    if (scene === 'world') {
      if (inVill()) { P.hp = Math.min(P.maxHp, P.hp + 12 * dt); P.mp = Math.min(P.maxMp, P.mp + 10 * dt); }
      else { P.mp = Math.min(P.maxMp, P.mp + 6 * dt); P.hp = Math.min(P.maxHp, P.hp + 1.5 * dt); }

      for (var i = 0; i < monsters.length; i++) {
        var m = monsters[i];
        if (!m.alive) continue;
        var d = dist(P.x, P.y, m.x, m.y);
        var cfg = MON[m.type];
        if (cfg.aggro > 0 && d < cfg.aggro) m.aggro = true;
        if (m.aggro) {
          if (d > m.r + P.r) {
            var spd = m.speed * dt;
            m.x += (P.x - m.x) / d * spd;
            m.y += (P.y - m.y) / d * spd;
          }
        } else if (d < 400) {
          m.x += Math.sin(now / 1500 + m.hx) * 10 * dt;
          m.y += Math.cos(now / 1700 + m.hy) * 10 * dt;
        }
        m.atkCd -= dt;
        if (d < m.r + P.r + 4 && m.atkCd <= 0 && m.aggro) {
          m.atkCd = 1.2;
          var dmg = Math.max(1, m.atk - P.def * 0.5);
          P.hp -= dmg;
          addFloat(P.x, P.y - 40, '-' + Math.round(dmg), '#f66');
          shake = 5;
          if (P.hp <= 0) {
            P.hp = P.maxHp * 0.5; P.mp = P.maxMp * 0.5;
            P.x = 800; P.y = 620;
            addFloat(P.x, P.y - 50, '你被击倒，回村复活', '#f66');
          }
        }
      }
    }
    netTick(now);
  }

  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var sx = 0, sy = 0;
    if (shake > 0) { sx = rnd(-shake, shake); sy = rnd(-shake, shake); }

    ctx.save();
    ctx.translate(sx, sy);

    if (scene === 'world') {
      updateCam();
      drawMap();
      drawCorpses();
      for (var i = 0; i < monsters.length; i++) {
        var m = monsters[i];
        if (!m.alive) continue;
        if (m.type === 'beast') drawBeast(w2sX(m.x), w2sY(m.y), m.r * S * 1.2, m.color, m.hp / m.maxHp);
        else drawDeer(w2sX(m.x), w2sY(m.y), m.r * S * 1.2, m.color);
        if (P.target === m) {
          ctx.beginPath();
          ctx.strokeStyle = '#ff4b4b';
          ctx.lineWidth = 2;
          ctx.arc(w2sX(m.x), w2sY(m.y), m.r * S * 1.7, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      for (var k in NET.others) {
        var o = NET.others[k];
        drawHero(w2sX(o.x), w2sY(o.y), 1.57, false);
      }
      drawHero(w2sX(P.x), w2sY(P.y), P.face, true);
      drawFx();
      drawFloats();
    } else {
      drawRoom();
      ctx.save();
      ctx.translate(inPos.x, inPos.y);
      drawHero(0, 0, Math.PI / 2, true);
      ctx.restore();
    }

    ctx.restore();
    drawHUD();

    if (errMsg) {
      ctx.save();
      ctx.fillStyle = 'rgba(150,10,10,0.9)';
      ctx.fillRect(0, 0, W, 26);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ERR: ' + errMsg.slice(0, 80), 6, 18);
      ctx.restore();
    }
  }

  var acc = 0;
  function loop(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    try {
      update(dt, now);

      // 计时器
      acc += dt;
      for (var i = floats.length - 1; i >= 0; i--) { floats[i].life -= dt; if (floats[i].life <= 0) floats.splice(i, 1); }
      for (var j = fx.length - 1; j >= 0; j--) { fx[j].life -= dt; if (fx[j].life <= 0) fx.splice(j, 1); }
      for (var c = corpses.length - 1; c >= 0; c--) { corpses[c].life -= dt; if (corpses[c].life <= 0) corpses.splice(c, 1); }

      draw(now);
    } catch (e) {
      errMsg = (e && e.message) ? e.message : String(e);
    }
    requestAnimationFrame(loop);
  }

  /* =========================================================
     输入
     ========================================================= */
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'l') lockTarget();
    if (k === 'b') showBackup();
    if (k === ' ') { castSkill('slash'); e.preventDefault(); }
    var map = { '1': 'slash', '2': 'dash', '3': 'spin', '4': 'ult' };
    if (map[k]) castSkill(map[k]);
  });
  document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });

  var pressBtn = null;

  function onDown(e) {
    var t = e.changedTouches ? e.changedTouches[0] : e;
    var x = t.clientX, y = t.clientY;
    var b = findBtn(x, y);
    if (b) {
      pressBtn = b;
      if (b.kind === 'skill') {
        previewKey = b.id; // 长按显示射程
      } else if (b.id === 'lock') {
        lockTarget();
      } else if (b.id === 'backup') {
        showBackup();
      }
      return;
    }
    if (inJoyArea(x, y)) {
      JOY.active = true;
      JOY.x = x; JOY.y = y;
      JOY.dx = 0; JOY.dy = 0;
      return;
    }
    if (scene === 'world') {
      var wx = s2wX(x), wy = s2wY(y);
      var hit = null;
      for (var i = 0; i < monsters.length; i++) {
        if (!monsters[i].alive) continue;
        if (dist(wx, wy, monsters[i].x, monsters[i].y) < Math.max(36, monsters[i].r * 1.8)) { hit = monsters[i]; break; }
      }
      P.target = hit;
    }
  }

  function onMove(e) {
    if (!JOY.active) return;
    var t = e.changedTouches ? e.changedTouches[0] : e;
    JOY.dx = (t.clientX - JOY.bx) / JOY.rad;
    JOY.dy = (t.clientY - JOY.by) / JOY.rad;
    var l = Math.sqrt(JOY.dx * JOY.dx + JOY.dy * JOY.dy);
    if (l > 1) { JOY.dx /= l; JOY.dy /= l; }
    JOY.x = JOY.bx + JOY.dx * JOY.rad * 0.9;
    JOY.y = JOY.by + JOY.dy * JOY.rad * 0.9;
  }

  function onUp() {
    if (pressBtn && pressBtn.kind === 'skill') {
      castSkill(pressBtn.id);
    }
    previewKey = null;
    pressBtn = null;
    JOY.active = false;
    JOY.dx = 0; JOY.dy = 0;
    JOY.x = JOY.bx; JOY.y = JOY.by;
  }

  cv.addEventListener('touchstart', function (e) { e.preventDefault(); onDown(e); }, { passive: false });
  cv.addEventListener('touchmove', function (e) { e.preventDefault(); onMove(e); }, { passive: false });
  cv.addEventListener('touchend', function (e) { e.preventDefault(); onUp(); }, { passive: false });
  cv.addEventListener('touchcancel', function (e) { e.preventDefault(); onUp(); }, { passive: false });
  cv.addEventListener('mousedown', onDown);
  cv.addEventListener('mousemove', function (e) { if (JOY.active) onMove(e); });
  cv.addEventListener('mouseup', onUp);

  /* =========================================================
     背包
     ========================================================= */
  var bagEl = document.getElementById('bag');
  var bagListEl = document.getElementById('bagList');
  var bagInfoEl = document.getElementById('bagInfo');

  function statText(e) {
    if (!e) return '—';
    var t = { weapon: '攻击', armor: '防御', ring: '生命' }[e.type];
    return e.name + ' ' + t + '+' + e.val;
  }

  function renderBag() {
    if (!bagEl || !bagListEl) return;
    var html = '<div style="color:#aaa;margin-bottom:6px;font-size:12px">剑 ' + statText(P.equip.weapon) +
      '<br>甲 ' + statText(P.equip.armor) + '<br>戒 ' + statText(P.equip.ring) + '</div><hr style="border-color:#333">';
    if (!P.bag.length) html += '<div style="color:#777">背包空空</div>';
    for (var i = 0; i < P.bag.length; i++) {
      var e = P.bag[i];
      html += '<div class="item" data-i="' + i + '" style="color:' + e.color +
        ';padding:8px 4px;border-bottom:1px solid #2a2a2a">' + e.name + '（' +
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
      bagInfoEl.innerHTML = '<div style="color:#ffd54a;margin-bottom:6px">备份码（自动复制）</div>' +
        '<textarea readonly style="width:100%;height:90px;background:#111;color:#aaa;border:1px solid #444;font-size:11px">' + code + '</textarea>';
      var ta = bagInfoEl.querySelector('textarea');
      if (ta) { ta.focus(); ta.select(); }
      copyText(code);
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

  /* =========================================================
     启动
     ========================================================= */
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

  window.addEventListener('resize', function () { resize(); });
  window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
  window.addEventListener('beforeunload', saveGame);
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveGame(); });

  resize();
  spawnMonsters();
  loadGame();
  baseAtk = P.atk; baseDef = P.def; baseMaxHp = P.maxHp;
  applyEquipStats();
  renderBag();
  showJoinUI();
  setInterval(saveGame, 5000);
  requestAnimationFrame(loop);
})();