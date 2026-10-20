(function(){
var cv=document.getElementById('cv'),ctx=cv.getContext('2d');
var W=0,H=0,DPR=Math.min(window.devicePixelRatio||1,2);
function fit(){W=window.innerWidth;H=window.innerHeight;
  cv.width=Math.floor(W*DPR);cv.height=Math.floor(H*DPR);
  cv.style.width=W+'px';cv.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);}
fit();window.addEventListener('resize',fit);
window.addEventListener('orientationchange',function(){setTimeout(fit,200);});

var MAPW=1600,MAPH=1200;
var P={x:800,y:600,r:11,face:0,level:5,exp:0,expNeed:200,
  hp:220,maxHp:220,mp:100,maxMp:100,atk:22,def:8,speed:120,dead:false,revT:0};
var EQ={w:null,a:null,r:null};
var BAG=[];

var QUAL=[{n:'普通',c:'#bbb',m:1},{n:'优秀',c:'#4d4',m:1.6},{n:'精良',c:'#5af',m:2.4},{n:'史诗',c:'#c6f',m:3.4}];
var NAMEW=['短剑','长刃','裂风刀'],NAMEA=['皮甲','锁甲','林泉护肩'],NAMER=['指环','护符','林地徽记'];
function rollQuality(){var r=Math.random();
  if(r<0.55)return 0; if(r<0.82)return 1; if(r<0.95)return 2; return 3;}
function makeItem(){
  var slot=['w','a','r'][Math.floor(Math.random()*3)];
  var q=rollQuality(),base=slot==='w'?22:slot==='a'?8:220;
  var main=Math.max(1,Math.round(base*0.18*QUAL[q].m+Math.random()*3));
  var nm=(slot==='w'?NAMEW:slot==='a'?NAMEA:NAMER)[q%3];
  return{slot:slot,q:q,name:nm,val:main,stat:slot==='w'?'atk':slot==='a'?'def':'hp'};
}
function statText(it){
  var k=it.stat==='atk'?'攻击':it.stat==='def'?'防御':'生命';
  return k+'+'+it.val;
}
function itemLabel(it){return QUAL[it.q].n+it.name+'（'+statText(it)+'）';}

function equip(it){
  var old=EQ[it.slot];EQ[it.slot]=it;
  var i=BAG.indexOf(it);if(i>=0)BAG.splice(i,1);
  if(old)BAG.push(old);
  recalc();refreshBag();
}
function recalc(){
  var a=22,d=8,h=220;
  ['w','a','r'].forEach(function(s){var e=EQ[s];if(!e)return;
    if(e.stat==='atk')a+=e.val;else if(e.stat==='def')d+=e.val;else h+=e.val;});
  P.atk=a;P.def=d;P.maxHp=h;
  if(P.hp>P.maxHp)P.hp=P.maxHp;
}

var SK=[
 {n:'挥砍',cd:0.6,cdt:0,mp:0,range:34,arc:1.5,dmg:1.0,ultra:false},
 {n:'突进斩',cd:4.0,cdt:0,mp:8,range:70,arc:1.1,dmg:1.3,ultra:false},
 {n:'旋斩',cd:6.0,cdt:0,mp:12,range:42,arc:Math.PI*2,dmg:0.85,ultra:false},
 {n:'林泉·斩',cd:10.0,cdt:0,mp:50,range:96,arc:1.9,dmg:2.2,ultra:true}
];
var BTN=[];
var MOBS=[],DROPS=[],FLOAT=[],FX=[];
var target=null,shake=0,camX=0,camY=0,lastT=0,holding=-1;

function spawnMob(type){
  var hostile=type==='h';
  var o={type:type,hostile:hostile,
    x:100+Math.random()*1400,y:100+Math.random()*1000,
    r:hostile?13:12,hp:hostile?70:55,maxHp:hostile?70:55,
    atk:hostile?9:7,def:2,aggro:hostile?190:0,speed:hostile?70:60,
    cd:0,hit:0,aggroed:false,dead:false,revT:0,alert:0,home:{x:0,y:0}};
  o.home.x=o.x;o.home.y=o.y;
  MOBS.push(o);return o;
}
for(var i=0;i<7;i++)spawnMob('h');
for(var i=0;i<5;i++)spawnMob('n');// ===== 触摸 =====
let joy = {on:false, id:-1, bx:0, by:0, x:0, y:0};
let btnTouches = {};
let pressTimer = null, pressBtn = -1;

function canvasPos(t){
  const r = cv.getBoundingClientRect();
  return {x: t.clientX - r.left, y: t.clientY - r.top};
}

cv.addEventListener('touchstart', e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    const p = canvasPos(t);
    // 技能按钮
    let hitBtn = -1;
    for(let i=0;i<BTN.length;i++){
      const b = BTN[i];
      if(Math.hypot(p.x-b.x, p.y-b.y) < b.r*1.25){ hitBtn = i; break; }
    }
    if(hitBtn >= 0){
      btnTouches[t.identifier] = hitBtn;
      pressBtn = hitBtn;
      pressTimer = setTimeout(()=>{ if(pressBtn===hitBtn) drawRange(hitBtn); }, 260);
      continue;
    }
    // 摇杆区域（左下）
    if(p.x < cv.width*0.45 && p.y > cv.height*0.45){
      joy.on = true; joy.id = t.identifier;
      joy.bx = p.x; joy.by = p.y; joy.x = p.x; joy.y = p.y;
      continue;
    }
    // 点世界：锁定 / 取消
    const wx = p.x + camX, wy = p.y + camY;
    let target = null;
    for(const m of mobs){
      if(m.dead) continue;
      if(Math.hypot(m.x-wx, m.y-wy) < m.r+22){ target = m; break; }
    }
    locked = target;
    if(target) flash(target.x, target.y, '#f44', '锁定');
  }
}, {passive:false});

cv.addEventListener('touchmove', e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    if(joy.on && t.identifier === joy.id){
      const p = canvasPos(t);
      joy.x = p.x; joy.y = p.y;
    }
    if(t.identifier in btnTouches){ // 拖动离开按钮即取消长按
      const p = canvasPos(t);
      const b = BTN[btnTouches[t.identifier]];
      if(Math.hypot(p.x-b.x, p.y-b.y) > b.r*1.6){
        if(pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
        pressBtn = -1;
      }
    }
  }
}, {passive:false});

function endTouch(e){
  for(const t of e.changedTouches){
    if(joy.on && t.identifier === joy.id){ joy.on = false; joy.id = -1; }
    if(t.identifier in btnTouches){
      const i = btnTouches[t.identifier];
      delete btnTouches[t.identifier];
      if(pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
      if(pressBtn === i){ cast(i); pressBtn = -1; }
    }
  }
  if(pressBtn >= 0 && pressTimer){ clearTimeout(pressTimer); pressTimer = null; pressBtn = -1; }
}
cv.addEventListener('touchend', e=>{ e.preventDefault(); endTouch(e); }, {passive:false});
cv.addEventListener('touchcancel', e=>{ e.preventDefault(); endTouch(e); }, {passive:false});

// 鼠标（电脑调试用）
cv.addEventListener('mousedown', e=>{
  const p = canvasPos(e);
  for(let i=0;i<BTN.length;i++){
    const b = BTN[i];
    if(Math.hypot(p.x-b.x, p.y-b.y) < b.r*1.2){ cast(i); return; }
  }
  const wx = p.x + camX, wy = p.y + camY;
  let target = null;
  for(const m of mobs){
    if(m.dead) continue;
    if(Math.hypot(m.x-wx, m.y-wy) < m.r+22){ target = m; break; }
  }
  locked = target;
});

// ===== 技能 =====
function cast(i){
  const s = SK[i];
  if(P.cd[i] > 0 || P.mp < s.mp) return;
  if(locked && locked.dead) locked = null;

  if(locked){
    if(Math.hypot(locked.x-P.x, locked.y-P.y) > s.range + locked.r){ return; }
    P.face = Math.atan2(locked.y-P.y, locked.x-P.x);
  } else {
    s.arc >= Math.PI*2 ? null : null;
  }

  P.mp -= s.mp;
  P.cd[i] = s.cd;
  P.atkAnim = {t:0, dur:0.22, ang:P.face, range:s.range, arc:s.arc, ultra:s.ultra};
  slash(P.x + Math.cos(P.face)*20, P.y + Math.sin(P.face)*20, s.ultra?'#aef':'#fff');

  const hits = [];
  for(const m of mobs){
    if(m.dead) continue;
    const d = Math.hypot(m.x-P.x, m.y-P.y);
    if(d > s.range + m.r) continue;
    if(locked && m === locked){ hits.push(m); continue; }
    if(s.arc >= Math.PI*2){ hits.push(m); continue; }
    let a = Math.atan2(m.y-P.y, m.x-P.x) - P.face;
    while(a > Math.PI) a -= Math.PI*2;
    while(a < -Math.PI) a += Math.PI*2;
    if(Math.abs(a) <= s.arc/2) hits.push(m);
  }

  for(const m of hits){
    const dmg = Math.max(1, Math.round(P.atk * s.dmg * (0.9+Math.random()*0.2) - m.def));
    m.hp -= dmg;
    m.hurt = 0.15;
    m.aggroOn = true;
    if(m.neutral && !m.provoked){ m.provoked = true; flash(m.x, m.y-20, '#ff0', '!'); }
    m.kx = Math.cos(Math.atan2(m.y-P.y, m.x-P.x)) * (s.ultra?90:40);
    m.ky = Math.sin(Math.atan2(m.y-P.y, m.x-P.x)) * (s.ultra?90:40);
    flash(m.x, m.y-m.r-6, s.ultra?'#aef':'#fff', dmg);
    if(s.ultra) ring(m.x, m.y);

    if(m.hp <= 0){
      m.dead = true;
      m.respawn = 3;
      if(locked === m) locked = null;
      onKill(m);
    }
  }
  if(hits.length) shake = s.ultra?10:5;
}

function onKill(m){
  P.exp += m.exp;
  while(P.exp >= P.expNeed){
    P.exp -= P.expNeed;
    levelUp();
  }
  if(Math.random() < m.dropRate){
    const it = makeItem();
    equipOrBag(it);
  }
}

function levelUp(){
  P.level++;
  P.maxHp += 12; P.maxMp += 4;
  P.atk += 2; P.def += 1;
  P.hp = P.maxHp; P.mp = P.maxMp;
  P.expNeed = P.level * 40;
  flash(P.x, P.y-30, '#ff0', 'LEVEL UP');
  ring(P.x, P.y);
}

function equipOrBag(it){
  const cur = EQ[it.slot];
  if(!cur || it.m > cur.m){
    EQ[it.slot] = it;
    recalc();
    flash(P.x, P.y-30, '#5f5', '装备 ' + it.name);
    if(cur) BAG.push(cur);
  } else {
    BAG.push(it);
    flash(P.x, P.y-30, '#bbb', '入手 ' + it.name);
  }
  refreshBag();
}

// ===== 特效 =====
let fx = [], flashTexts = [];

function slash(x, y, color){ fx.push({type:'slash', x, y, t:0, dur:0.25, color}); }
function ring(x, y){ fx.push({type:'ring', x, y, t:0, dur:0.4}); }
function flash(x, y, color, text){ flashTexts.push({x, y, color, text, t:0, dur:0.8}); }

function updateFX(dt){
  for(let i=fx.length-1;i>=0;i--){
    fx[i].t += dt;
    if(fx[i].t >= fx[i].dur) fx.splice(i,1);
  }
  for(let i=flashTexts.length-1;i>=0;i--){
    const f = flashTexts[i];
    f.t += dt; f.y -= 30*dt;
    if(f.t >= f.dur) flashTexts.splice(i,1);
  }
}

// ===== 受伤 =====
function hitPlayer(dmg){
  const real = Math.max(1, Math.round(dmg - P.def));
  P.hp -= real;
  P.hurt = 0.2;
  shake = 6;
  flash(P.x, P.y-28, '#f66', '-'+real);
  if(P.hp <= 0){
    P.hp = P.maxHp; P.mp = P.maxMp;
    P.x = 800; P.y = 600;
    locked = null;
    flash(P.x, P.y-30, '#f66', '复活');
  }
}

// ===== 更新 =====
let shake = 0;

function update(dt){
  // 摇杆
  let mx = 0, my = 0;
  if(joy.on){
    const dx = joy.x - joy.bx, dy = joy.y - joy.by;
    const d = Math.hypot(dx, dy);
    if(d > 6){
      const s = Math.min(1, d/60);
      mx = dx/d*s; my = dy/d*s;
    }
  }
  if(mx || my){
    P.x += mx*P.speed*dt;
    P.y += my*P.speed*dt;
    P.face = Math.atan2(my, mx);
    P.moving = true;
  } else P.moving = false;

  P.x = Math.max(20, Math.min(W-20, P.x));
  P.y = Math.max(20, Math.min(H-20, P.y));

  // 资源
  P.mp = Math.min(P.maxMp, P.mp + 6*dt);
  P.hp = Math.min(P.maxHp, P.hp + 1.5*dt);
  for(let i=0;i<SK.length;i++) if(P.cd[i] > 0) P.cd[i] = Math.max(0, P.cd[i]-dt);
  if(P.hurt > 0) P.hurt -= dt;
  if(P.atkAnim){ P.atkAnim.t += dt; if(P.atkAnim.t >= P.atkAnim.dur) P.atkAnim = null; }

  // 怪物
  for(const m of mobs){
    if(m.dead){
      m.respawn -= dt;
      if(m.respawn <= 0){
        m.dead = false; m.hp = m.maxHp;
        m.x = m.hx; m.y = m.hy;
        m.provoked = false; m.aggroOn = false;
      }
      continue;
    }
    if(m.hurt > 0) m.hurt -= dt;
    if(m.kx || m.ky){
      m.x += m.kx*dt; m.y += m.ky*dt;
      m.kx *= 0.85; m.ky *= 0.85;
      if(Math.abs(m.kx) < 1) m.kx = 0;
      if(Math.abs(m.ky) < 1) m.ky = 0;
    }
    const d = Math.hypot(P.x-m.x, P.y-m.y);
    const hostile = !m.neutral || m.provoked;
    if(hostile){
      if(d < m.aggro || m.provoked || m.aggroOn){
        m.aggroOn = true;
        if(d > m.r + P.r + 2){
          const a = Math.atan2(P.y-m.y, P.x-m.x);
          m.x += Math.cos(a)*m.speed*dt;
          m.y += Math.sin(a)*m.speed*dt;
        } else if(m.atkCd <= 0){
          hitPlayer(m.atk);
          m.atkCd = 1.2;
        }
      }
    } else {
      // 中立游荡
      m.wander -= dt;
      if(m.wander <= 0){
        m.wander = 1.5 + Math.random()*2.5;
        const a = Math.random()*Math.PI*2;
        m.wx = m.hx + Math.cos(a)*60;
        m.wy = m.hy + Math.sin(a)*60;
      }
      const dd = Math.hypot(m.wx-m.x, m.wy-m.y);
      if(dd > 4){
        const a = Math.atan2(m.wy-m.y, m.wx-m.x);
        m.x += Math.cos(a)*m.speed*0.4*dt;
        m.y += Math.sin(a)*m.speed*0.4*dt;
      }
    }
    if(m.atkCd > 0) m.atkCd -= dt;
  }

  // 相机
  const tx = Math.max(0, Math.min(W, P.x));
  const ty = Math.max(0, Math.min(H, P.y));
  const wantX = tx - cv.width/2;
  const wantY = ty - cv.height/2;
  camX += (wantX - camX) * Math.min(1, dt*8);
  camY += (wantY - camY) * Math.min(1, dt*8);
  camX = Math.max(0, Math.min(Math.max(0,W-cv.width), camX));
  camY = Math.max(0, Math.min(Math.max(0,H-cv.height), camY));

  if(shake > 0) shake = Math.max(0, shake - 30*dt);
  updateFX(dt);
}

// ===== 渲染 =====
function drawHUD(){
  const W2 = cv.width, H2 = cv.height;
  const pad = 14;
  const top = 58;

  // 血条
  const bw = Math.min(220, W2*0.34), bh = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(pad, top, bw, bh);
  ctx.fillStyle = '#c33';
  ctx.fillRect(pad, top, bw * (P.hp/P.maxHp), bh);
  ctx.strokeStyle = '#fff6'; ctx.lineWidth = 1;
  ctx.strokeRect(pad+0.5, top+0.5, bw-1, bh-1);
  ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('HP ' + Math.ceil(P.hp) + '/' + P.maxHp, pad+4, top+bh-3);

  // 蓝条
  const my2 = top + bh + 4;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(pad, my2, bw, bh-3);
  ctx.fillStyle = '#37f';
  ctx.fillRect(pad, my2, bw * (P.mp/P.maxMp), bh-3);
  ctx.fillStyle = '#fff';
  ctx.fillText('MP ' + Math.floor(P.mp) + '/' + P.maxMp, pad+4, my2+bh-5);

  // 等级经验
  ctx.fillStyle = '#ffd';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Lv' + P.level, pad, top-6);
  const ew = 90;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(pad+40, top-14, ew, 6);
  ctx.fillStyle = '#fd4';
  ctx.fillRect(pad+40, top-14, ew*(P.exp/P.expNeed), 6);

  // 摇杆
  if(joy.on){
    ctx.strokeStyle = '#fff6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(joy.bx, joy.by, 52, 0, Math.PI*2); ctx.stroke();
    let dx = joy.x-joy.bx, dy = joy.y-joy.by;
    const d = Math.hypot(dx,dy);
    if(d > 52){ dx = dx/d*52; dy = dy/d*52; }
    ctx.fillStyle = '#fff5';
    ctx.beginPath(); ctx.arc(joy.bx+dx, joy.by+dy, 22, 0, Math.PI*2); ctx.fill();
  }

  // 技能按钮
  for(let i=0;i<BTN.length;i++){
    const b = BTN[i], s = SK[i];
    const ready = P.cd[i] <= 0 && P.mp >= s.mp;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fillStyle = s.ultra ? (ready?'rgba(80,120,200,0.85)':'rgba(40,60,100,0.75)')
                            : (ready?'rgba(30,30,40,0.8)':'rgba(20,20,25,0.6)');
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ready ? (s.ultra?'#aef':'#fff9') : '#555';
    ctx.stroke();

    // CD 遮罩
    if(P.cd[i] > 0){
      const ratio = P.cd[i] / s.cd;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.arc(b.x, b.y, b.r, -Math.PI/2, -Math.PI/2 + Math.PI*2*ratio);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fill();
    }

    ctx.fillStyle = ready?'#fff':'#999';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.name.length>3?s.name.slice(0,3):s.name, b.x, b.y);
    if(s.mp > 0){
      ctx.font = '9px sans-serif';
      ctx.fillStyle = P.mp>=s.mp?'#7af':'#a55';
      ctx.fillText(s.mp, b.x, b.y + b.r*0.55);
    }
  }
  ctx.textBaseline = 'alphabetic';
}

function drawRange(i){
  // 长按显示范围：临时高亮
  longPress = {i, t:1.2};
}

function render(){
  const W2 = cv.width, H2 = cv.height;
  ctx.save();
  const sx = shake ? (Math.random()-0.5)*shake : 0;
  const sy = shake ? (Math.random()-0.5)*shake : 0;
  ctx.translate(-camX + sx, -camY + sy);

  // 地面
  for(let x=0;x<W;x+=64){
    for(let y=0;y<H;y+=64){
      ctx.fillStyle = ((x/64 + y/64) % 2 === 0) ? '#1c2b1c' : '#1a271a';
      ctx.fillRect(x, y, 64, 64);
    }
  }
  // 边界
  ctx.strokeStyle = '#3a4a3a'; ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, W, H);

  // 范围指示
  if(longPress){
    const s = SK[longPress.i];
    ctx.beginPath();
    ctx.arc(P.x, P.y, s.range, P.face - s.arc/2 + Math.PI/2, P.face + s.arc/2 + Math.PI/2);
    ctx.fillStyle = 'rgba(120,200,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,0.6)';
    ctx.lineWidth = 2; ctx.stroke();
  }

  // 怪物
  for(const m of mobs){
    if(m.dead) continue;
    ctx.save();
    if(m.hurt > 0){ ctx.globalAlpha = 0.6; }
    ctx.fillStyle = m.hurt > 0 ? '#fff' : (m.neutral ? '#caa' : '#c55');
    if(m.neutral && m.provoked) ctx.fillStyle = '#c55';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = m.neutral && !m.provoked ? '#fd8' : '#f66';
    ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    // 血条
    const w = m.r*2.2, h = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(m.x-w/2, m.y-m.r-10, w, h);
    ctx.fillStyle = m.neutral && !m.provoked ? '#fd8' : '#e44';
    ctx.fillRect(m.x-w/2, m.y-m.r-10, w*(m.hp/m.maxHp), h);

    // 锁定标记
    if(locked === m){
      ctx.strokeStyle = '#f33'; ctx.lineWidth = 2;
      ctx.strokeRect(m.x-m.r-6, m.y-m.r-6, (m.r+6)*2, (m.r+6)*2);
      ctx.beginPath();
      ctx.moveTo(m.x, m.y-m.r-16); ctx.lineTo(m.x-5, m.y-m.r-24); ctx.lineTo(m.x+5, m.y-m.r-24);
      ctx.closePath(); ctx.fillStyle = '#f33'; ctx.fill();
    }
  }

  // 玩家
  ctx.save();
  if(P.hurt > 0) ctx.globalAlpha = 0.6;
  // 攻击扇形动画
  if(P.atkAnim){
    const a = P.atkAnim;
    const k = a.t / a.dur;
    ctx.beginPath();
    ctx.arc(P.x, P.y, a.range * (0.4 + k*0.8), a.ang - a.arc/2 + Math.PI/2, a.ang + a.arc/2 + Math.PI/2);
    ctx.fillStyle = a.ultra ? 'rgba(150,220,255,'+(0.5*(1-k))+')' : 'rgba(255,255,255,'+(0.35*(1-k))+')';
    ctx.fill();
  }
  ctx.fillStyle = P.hurt > 0 ? '#fff' : '#6cf';
  ctx.beginPath(); ctx.arc(P.x, P.y, P.r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  // 面朝方向
  ctx.beginPath();
  ctx.moveTo(P.x, P.y);
  ctx.lineTo(P.x + Math.cos(P.face)*(P.r+6), P.y + Math.sin(P.face)*(P.r+6));
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  // 特效
  for(const f of fx){
    const k = f.t / f.dur;
    if(f.type === 'slash'){
      ctx.beginPath();
      ctx.arc(f.x, f.y, 22 + k*18, 0, Math.PI*2);
      ctx.strokeStyle = f.color; ctx.globalAlpha = 1-k;
      ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
    } else if(f.type === 'ring'){
      ctx.beginPath();
      ctx.arc(f.x, f.y, 10 + k*60, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(150,220,255,'+(1-k)+')';
      ctx.lineWidth = 3; ctx.stroke();
    }
  }

  // 飘字
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px sans-serif';
  for(const f of flashTexts){
    ctx.globalAlpha = 1 - f.t/f.dur;
    ctx.fillStyle = '#000';
    ctx.fillText(f.text, f.x+1, f.y+1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  drawHUD();

  // 长按范围计时
  if(longPress){
    longPress.t -= 1/60;
    if(longPress.t <= 0) longPress = null;
  }
}

// ===== 背包 UI =====
const bagBtn = document.getElementById('bagBtn');
const bagPanel = document.getElementById('bagPanel');
const bagClose = document.getElementById('bagClose');
const bagList = document.getElementById('bagList');
const eqW = document.getElementById('eqW');
const eqA = document.getElementById('eqA');
const eqR = document.getElementById('eqR');

bagBtn.addEventListener('click', ()=>{
  bagPanel.classList.toggle('hide');
  refreshBag();
});
bagClose.addEventListener('click', ()=> bagPanel.classList.add('hide'));

function refreshBag(){
  eqW.textContent = EQ.w ? EQ.w.name + ' +' + EQ.w.val : '—';
  eqA.textContent = EQ.a ? EQ.a.name + ' +' + EQ.a.val : '—';
  eqR.textContent = EQ.r ? EQ.r.name + ' +' + EQ.r.val : '—';

  bagList.innerHTML = '';
  if(!BAG.length){
    bagList.innerHTML = '<div style="opacity:.5;padding:8px">空</div>';
    return;
  }
  BAG.forEach((it, idx)=>{
    const row = document.createElement('div');
    row.className = 'bagItem w' + it.q;
    const label = document.createElement('span');
    label.textContent = itemLabel(it);
    const btn = document.createElement('button');
    btn.textContent = '装备';
    btn.addEventListener('click', ()=>{
      BAG.splice(idx,1);
      const cur = EQ[it.slot];
      EQ[it.slot] = it;
      if(cur) BAG.push(cur);
      recalc();
      refreshBag();
    });
    row.appendChild(label);
    row.appendChild(btn);
    bagList.appendChild(row);
  });
}

// ===== 主循环 =====
let lastT = 0;
function step(ts){
  if(!lastT) lastT = ts;
  let dt = (ts - lastT) / 1000;
  lastT = ts;
  if(dt > 0.05) dt = 0.05;
  update(dt);
  render();
  requestAnimationFrame(step);
}

recalc();
refreshBag();
requestAnimationFrame(step);
})();
