(function(){
'use strict';

/* ================= 联机配置 ================= */
var SUPA_URL='https://rdwhqsvovabtyjlxbagf.supabase.co';
var SUPA_KEY='sb_publishable_G_i8uDGtnjdGTGG73F2Rqg_hBiu-HuZ';
var NET={on:false,room:'',me:'p'+Math.floor(Math.random()*999999),others:{},last:0,ch:null};

/* ================= 画布与镜头 ================= */
var cv=document.getElementById('cv')||document.querySelector('canvas');
var ctx=cv.getContext('2d');
var W=0,H=0,DPR=1;
var MAPW=1600,MAPH=1200;
var S=1,VIEWW=640;
var CAM={x:0,y:0};
var DEBUG=/[?&]debug=1/.test(location.search);

function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=window.innerWidth;H=window.innerHeight;
  cv.width=Math.floor(W*DPR);cv.height=Math.floor(H*DPR);
  cv.style.width=W+'px';cv.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.imageSmoothingEnabled=true;
  S=W/VIEWW;
  if(MAPH*S<H) S=H/MAPH;
  layoutBtns();
  updateCam();
}
window.addEventListener('resize',resize);
window.addEventListener('orientationchange',function(){setTimeout(resize,120);});

function w2sX(x){return (x-CAM.x)*S;}
function w2sY(y){return (y-CAM.y)*S;}
function s2wX(x){return x/S+CAM.x;}
function s2wY(y){return y/S+CAM.y;}

function updateCam(){
  var vw=W/S,vh=H/S;
  CAM.x=P.x-vw/2; CAM.y=P.y-vh/2;
  CAM.x=Math.max(0,Math.min(MAPW-vw,CAM.x));
  CAM.y=Math.max(0,Math.min(MAPH-vh,CAM.y));
  if(MAPW<vw) CAM.x=(MAPW-vw)/2;
  if(MAPH<vh) CAM.y=(MAPH-vh)/2;
}

/* ================= 图片 ================= */
var mapImg=new Image(), inImg=new Image();
var mapOK=false, inOK=false;
mapImg.onload=function(){mapOK=true;};
inImg.onload=function(){inOK=true;};
mapImg.src='map.png';
inImg.src='in.png';

/* ================= 坐标换算 ================= */
var K=1600/1024;
function h2s(x1,y1,x2,y2){return {x:x1*K,y:y1*K,w:(x2-x1)*K,h:(y2-y1)*K};}

/* ============ 房屋（按截图目测收紧：solid=墙体，door=门槛下沿） ============ */
var HOUSES=[
  {name:'红瓦大屋',
   solid:h2s(345,175,500,262),
   door:{x:392*K,y:262*K,w:52*K,h:26*K}},
  {name:'石屋',
   solid:h2s(527,205,648,280),
   door:{x:556*K,y:280*K,w:46*K,h:26*K}},
  {name:'矮屋',
   solid:h2s(352,272,432,322),
   door:{x:376*K,y:322*K,w:42*K,h:24*K}},
  {name:'小屋',
   solid:h2s(340,338,418,388),
   door:{x:364*K,y:388*K,w:40*K,h:24*K}}
];

var VILL=h2s(232,182,708,492);
var EXIT=h2s(452,486,560,510);

var ZONES=[
  {x:VILL.x,y:VILL.y,w:VILL.w,h:VILL.h,name:'林泉村',safe:true},
  {x:60,y:90,w:480,h:300,name:'村外草地'},
  {x:1090,y:90,w:450,h:300,name:'枯木荒坡'},
  {x:1090,y:830,w:450,h:320,name:'林泉野径'},
  {x:60,y:830,w:480,h:320,name:'南边草原'}
];
var WILD={name:'弗兰卡荒野'};

/* ================= 技能 ================= */
var SK={
  slash:{name:'挥砍',cd:0.6,mp:0,range:62,arc:1.5,dmg:1.0},
  dash:{name:'突进斩',cd:4,mp:8,range:110,arc:1.1,dmg:1.3},
  spin:{name:'旋斩',cd:6,mp:12,range:78,arc:Math.PI*2,dmg:0.85},
  ult:{name:'林泉·斩',cd:10,mp:50,range:160,arc:1.9,dmg:2.2}
};
var SKK=['slash','dash','spin','ult'];
var SKILLCD={slash:0,dash:0,spin:0,ult:0};

/* ================= 装备 ================= */
var QUAL=[{n:'普通',c:'#bbb',m:1.0},{n:'精良',c:'#4d4',m:1.6},{n:'稀有',c:'#5af',m:2.4},{n:'传说',c:'#c6f',m:3.4}];
var EQTYPE={weapon:22,armor:8,ring:220};
var AFFIX=['锋锐','沉重','迅捷','守护','林泉'];

function makeEquip(level,forceType){
  var types=['weapon','armor','ring'];
  var t=forceType||types[Math.floor(Math.random()*3)];
  var r=Math.random(),q;
  if(r<0.03)q=3; else if(r<0.15)q=2; else if(r<0.45)q=1; else q=0;
  var base=EQTYPE[t]*level*QUAL[q].m;
  return {type:t,name:AFFIX[Math.floor(Math.random()*AFFIX.length)]+'·'+(t==='weapon'?'剑':t==='armor'?'衣':'戒'),
          val:Math.round(base),q:q,qn:QUAL[q].n,qc:QUAL[q].c};
}

/* ================= 怪物 ================= */
var MON={
  beast:{hp:70,atk:9,def:2,aggro:220,speed:72,r:16,exp:26,drop:0.85,color:'#a34',name:'野兽',hostile:true},
  deer:{hp:55,atk:7,def:2,aggro:0,speed:60,r:15,exp:14,drop:0.35,color:'#8a7',name:'鹿',hostile:false}
};
var SPAWNS=[
  {x:200,y:260,t:'beast',n:4},
  {x:1330,y:250,t:'beast',n:3},
  {x:1300,y:1000,t:'deer',n:4},
  {x:260,y:1010,t:'deer',n:4}
];

/* ================= 玩家 ================= */
var P={
  name:'兰德',x:800,y:620,level:5,
  hp:220,maxHp:220,mp:100,maxMp:100,
  atk:22,def:8,speed:210,r:13,face:1.57,exp:0,
  target:null,bag:[],equip:{weapon:null,armor:null,ring:null},
  baseAtk:22,baseDef:8,baseMaxHp:220,baseMaxMp:100
};
var monsters=[],floats=[],fx=[],corpses=[],shake=0;
var scene='world',doorLock=0,curHouse=null;
var inPos={x:0,y:0};

/* ================= 工具 ================= */
function dist(a,b,c,d){var dx=a-c,dy=b-d;return Math.sqrt(dx*dx+dy*dy);}
function needExp(l){return l*40;}
function inRect(x,y,r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;}
function inVill(x,y){return scene==='room'||inRect(x,y,VILL);}
function zoneName(x,y){
  for(var i=0;i<ZONES.length;i++){if(inRect(x,y,ZONES[i]))return ZONES[i].name;}
  return WILD.name;
}
function addFloat(x,y,txt,c){floats.push({x:x,y:y,txt:txt,c:c||'#fff',t:1.1,vy:-46});}

/* ================= 怪物生成 ================= */
function spawnMonsters(){
  monsters=[];
  SPAWNS.forEach(function(s){
    for(var i=0;i<s.n;i++){
      var m=MON[s.t];
      monsters.push({
        type:s.t,x:s.x+(Math.random()-0.5)*160,y:s.y+(Math.random()-0.5)*160,
        hp:m.hp,maxHp:m.hp,atk:m.atk,def:m.def,r:m.r,
        speed:m.speed,exp:m.exp,atkTimer:0,burning:false,hurtT:0,dead:false,
        face:Math.random()*6.28,homeX:s.x,homeY:s.y
      });
    }
  });
}

function damageMon(m,dmg){
  m.hp-=dmg;m.hurtT=0.2;m.burning=!MON[m.type].hostile||m.burning;
  addFloat(m.x,m.y-m.r-8,Math.round(dmg),'#ff6');
  if(m.hp<=0){
    m.dead=true;
    corpses.push({x:m.x,y:m.y,t:2.4,r:m.r,color:MON[m.type].color});
    gainExp(m.exp);
    if(Math.random()<MON[m.type].drop){
      var e=makeEquip(P.level+(Math.random()<0.3?1:0));
      P.bag.push(e);
      addFloat(m.x,m.y-30,'获得 '+e.name,'#'+e.qc.slice(1));
      renderBag();
    }
  }
}

function gainExp(n){
  P.exp+=n;
  while(P.exp>=needExp(P.level)){
    P.exp-=needExp(P.level);
    P.level++;
    P.maxHp+=12;P.maxMp+=4;P.atk+=2;P.def+=1;
    P.hp=P.maxHp;P.mp=P.maxMp;
    addFloat(P.x,P.y-40,'升级 Lv'+P.level,'#6f6');
    renderBag();
  }
}

/* ================= 目标/施法 ================= */
function aimAng(){
  if(P.target&&!P.target.dead){
    return Math.atan2(P.target.y-P.y,P.target.x-P.x);
  }
  return P.face;
}
function lockTarget(mx,my){
  var best=null,bd=1e9;
  monsters.forEach(function(m){
    if(m.dead)return;
    var d=dist(mx,my,m.x,m.y);
    if(d<m.r+30&&d<bd){bd=d;best=m;}
  });
  P.target=best;
}

function castSkill(k){
  var s=SK[k];
  if(SKILLCD[k]>0)return;
  if(inVill(P.x,P.y)){addFloat(P.x,P.y-30,'村内无法出手','#fa5');return;}
  if(P.mp<s.mp){addFloat(P.x,P.y-30,'魔力不足','#5af');return;}
  P.mp-=s.mp;SKILLCD[k]=s.cd;
  var ang=aimAng();P.face=ang;
  if(k==='dash'){
    var nx=P.x+Math.cos(ang)*70,ny=P.y+Math.sin(ang)*70;
    if(!hitSolid(nx,ny)){P.x=nx;P.y=ny;}
    shake=6;
  }
  if(k==='ult')shake=10;
  if(k==='spin')shake=5;
  fx.push({x:P.x,y:P.y,ang:ang,range:s.range,arc:s.arc,t:0.32,life:0.32,k:k});
  monsters.forEach(function(m){
    if(m.dead)return;
    var d=dist(P.x,P.y,m.x,m.y);
    if(d>s.range+m.r)return;
    var a=Math.atan2(m.y-P.y,m.x-P.x);
    var df=Math.abs(((a-ang+Math.PI*3)%(Math.PI*2))-Math.PI);
    if(df>s.arc/2)return;
    var dmg=(P.atk*s.dmg*(0.9+Math.random()*0.2))-m.def*0.5;
    damageMon(m,Math.max(1,dmg));
  });
  updateCam();
}

/* ================= 碰撞与进门 ================= */
function doorPass(x,y){
  for(var i=0;i<HOUSES.length;i++){
    if(inRect(x,y,HOUSES[i].door))return true;
  }
  return false;
}
function hitSolid(x,y){
  if(inRect(x,y,{x:0,y:0,w:0,h:0}))return false;
  for(var i=0;i<HOUSES.length;i++){
    var h=HOUSES[i];
    var m=8;
    if(x>h.solid.x-m&&x<h.solid.x+h.solid.w+m&&y>h.solid.y-m&&y<h.solid.y+h.solid.h+m){
      if(doorPass(x,y))continue;
      return true;
    }
  }
  return false;
}
function moveWithCollision(dx,dy){
  if(dx!==0){
    if(!hitSolid(P.x+dx,P.y))P.x+=dx;
  }
  if(dy!==0){
    if(!hitSolid(P.x,P.y+dy))P.y+=dy;
  }
  P.x=Math.max(P.r,Math.min(MAPW-P.r,P.x));
  P.y=Math.max(P.r,Math.min(MAPH-P.r,P.y));
}
function tryDoor(){
  if(doorLock>0)return;
  for(var i=0;i<HOUSES.length;i++){
    var h=HOUSES[i];
    if(inRect(P.x,P.y,h.door)){
      curHouse=h;scene='room';doorLock=0.6;
      inPos.x=W/2;inPos.y=H*0.72;
      fx.length=0;P.target=null;
      return;
    }
  }
}
/* ================= 存档 ================= */
var SAVEKEY='frk_div_save_v1';
function snapData(){
  return {x:P.x,y:P.y,level:P.level,hp:P.hp,mp:P.mp,atk:P.atk,def:P.def,
          maxHp:P.maxHp,maxMp:P.maxMp,exp:P.exp,bag:P.bag,equip:P.equip};
}
function applyData(d){
  if(!d)return;
  ['x','y','level','hp','mp','atk','def','maxHp','maxMp','exp'].forEach(function(k){
    if(typeof d[k]==='number')P[k]=d[k];
  });
  if(Array.isArray(d.bag))P.bag=d.bag;
  if(d.equip)P.equip=d.equip;
}
function saveGame(){
  try{localStorage.setItem(SAVEKEY,JSON.stringify(snapData()));}catch(e){}
}
function loadGame(){
  try{
    var s=localStorage.getItem(SAVEKEY);
    if(s)applyData(JSON.parse(s));
  }catch(e){}
}
window.addEventListener('beforeunload',saveGame);
document.addEventListener('visibilitychange',function(){if(document.hidden)saveGame();});
window.__reset=function(){try{localStorage.removeItem(SAVEKEY);}catch(e){}location.reload();};

/* ================= 联机 ================= */
function connect(room){
  NET.room=room;NET.on=true;
  if(!window.supabase){alert('联机库未加载');return;}
  var cli=supabase.createClient(SUPA_URL,SUPA_KEY);
  NET.ch=cli.channel('frk_'+room,{config:{broadcast:{self:false}}});
  NET.ch.on('broadcast',{event:'pos'},function(p){
    if(!p||!p.payload)return;
    var d=p.payload;
    if(d.id===NET.me)return;
    NET.others[d.id]={x:d.x,y:d.y,n:d.name,dir:d.dir,hp:d.hp,ts:performance.now()};
    NET.last=performance.now();
  });
  NET.ch.subscribe();
}
function netTick(now){
  if(!NET.on||!NET.ch)return;
  if(now-(netTick.t||0)<100)return;
  netTick.t=now;
  NET.ch.send({type:'broadcast',event:'pos',payload:{
    id:NET.me,x:Math.round(P.x),y:Math.round(P.y),name:P.name,dir:P.face,hp:P.hp
  }});
  for(var k in NET.others){
    if(now-NET.others[k].ts>3000)delete NET.others[k];
  }
}

/* ================= 画主角（2头身八方风） ================= */
function drawHero(x,y,face){
  var s=S;
  var bw=26*s,bh=30*s,hr=15*s;
  ctx.save();
  ctx.translate(x,y);
  // 影子
  ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.beginPath();ctx.ellipse(0,4*s,20*s,8*s,0,0,6.28);ctx.fill();
  var dir=Math.cos(face)>=0?1:-1;
  // 披风
  ctx.fillStyle='#2b5c8a';
  ctx.beginPath();
  ctx.moveTo(-bw/2,2*s);ctx.lineTo(bw/2,2*s);
  ctx.lineTo(bw/2-4*s,-bh-2*s);ctx.lineTo(-bw/2+4*s,-bh-2*s);
  ctx.closePath();ctx.fill();
  // 腿
  ctx.fillStyle='#4a3b2a';
  ctx.fillRect(-9*s,0,-0+ -0+2*s+7*s,0);
  ctx.fillRect(-9*s,0,7*s,10*s);
  ctx.fillRect(2*s,0,7*s,10*s);
  // 上衣
  ctx.fillStyle='#c9d6e8';
  ctx.fillRect(-bw/2,-bh,bw,bh-2*s);
  // 腰带
  ctx.fillStyle='#8a6b3a';
  ctx.fillRect(-bw/2,-8*s,bw,5*s);
  // 头
  ctx.fillStyle='#f3cfae';
  ctx.beginPath();ctx.arc(0,-bh-hr+6*s,hr,0,6.28);ctx.fill();
  // 头发
  ctx.fillStyle='#4a3324';
  ctx.beginPath();
  ctx.arc(0,-bh-hr+6*s,hr,Math.PI*1.05,Math.PI*1.95);
  ctx.fill();
  ctx.fillRect(-hr,-bh-hr+6*s,hr*2,hr*0.45);
  // 眼睛
  ctx.fillStyle='#222';
  var ex=dir*4*s, ey=-bh-hr+8*s;
  ctx.beginPath();ctx.arc(ex-3*s,ey,1.6*s,0,6.28);ctx.fill();
  ctx.beginPath();ctx.arc(ex+4*s,ey,1.6*s,0,6.28);ctx.fill();
  // 剑
  ctx.save();
  ctx.translate(bw/2-2*s,-bh*0.5);
  ctx.rotate(dir<0?face-Math.PI:face);
  ctx.fillStyle='#dfe7f0';
  ctx.fillRect(0,-2*s,26*s,4*s);
  ctx.fillStyle='#8a6b3a';
  ctx.fillRect(-4*s,-4*s,6*s,8*s);
  ctx.restore();
  // 头顶蓝色三角
  ctx.fillStyle='#4cf';
  ctx.beginPath();
  ctx.moveTo(0,-bh-hr*2-6*s);
  ctx.lineTo(-6*s,-bh-hr*2+2*s);
  ctx.lineTo(6*s,-bh-hr*2+2*s);
  ctx.closePath();ctx.fill();
  ctx.restore();
}

function drawBeast(m){
  var x=w2sX(m.x),y=w2sY(m.y),r=m.r*S;
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.beginPath();ctx.ellipse(0,r*0.7,r*0.9,r*0.35,0,0,6.28);ctx.fill();
  ctx.fillStyle=m.hurtT>0?'#fff':MON[m.type].color;
  ctx.beginPath();ctx.arc(0,-r*0.3,r,0,6.28);ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(-r*0.3,-r*0.5,r*0.18,0,6.28);ctx.fill();
  ctx.beginPath();ctx.arc(r*0.3,-r*0.5,r*0.18,0,6.28);ctx.fill();
  ctx.restore();
}
function drawDeer(m){
  var x=w2sX(m.x),y=w2sY(m.y),r=m.r*S;
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(0,0,0,0.22)';
  ctx.beginPath();ctx.ellipse(0,r*0.7,r*0.9,r*0.32,0,0,6.28);ctx.fill();
  ctx.fillStyle=m.hurtT>0?'#fff':MON[m.type].color;
  ctx.beginPath();ctx.ellipse(0,-r*0.2,r*0.9,r*0.7,0,0,6.28);ctx.fill();
  ctx.beginPath();ctx.arc(r*0.7,-r*0.9,r*0.4,0,6.28);ctx.fill();
  ctx.fillStyle='#5a4a32';
  ctx.fillRect(r*0.6,-r*1.9,2*S,r*0.8);
  ctx.fillRect(r*0.85,-r*1.9,2*S,r*0.8);
  ctx.restore();
}

/* ================= 地图绘制 ================= */
function drawFallbackMap(){
  ctx.fillStyle='#6a9a48';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#c9b483';
  ctx.fillRect(w2sX(VILL.x),w2sY(VILL.y),VILL.w*S,VILL.h*S);
  HOUSES.forEach(function(h){
    ctx.fillStyle='#8a4a2a';
    ctx.fillRect(w2sX(h.solid.x),w2sY(h.solid.y),h.solid.w*S,h.solid.h*S);
    ctx.fillStyle='#5a3a1a';
    ctx.fillRect(w2sX(h.door.x),w2sY(h.door.y),h.door.w*S,h.door.h*S);
  });
}
function drawMap(){
  if(mapOK){
    ctx.drawImage(mapImg,CAM.x*(mapImg.width/MAPW),CAM.y*(mapImg.height/MAPH),
      (W/S)*(mapImg.width/MAPW),(H/S)*(mapImg.height/MAPH),0,0,W,H);
  }else drawFallbackMap();
  if(DEBUG){
    ctx.lineWidth=2;
    HOUSES.forEach(function(h){
      ctx.strokeStyle='#f00';
      ctx.strokeRect(w2sX(h.solid.x),w2sY(h.solid.y),h.solid.w*S,h.solid.h*S);
      ctx.strokeStyle='#0f0';
      ctx.strokeRect(w2sX(h.door.x),w2sY(h.door.y),h.door.w*S,h.door.h*S);
    });
    ctx.strokeStyle='#ff0';
    ctx.strokeRect(w2sX(VILL.x),w2sY(VILL.y),VILL.w*S,VILL.h*S);
    ctx.strokeStyle='#f80';
    ctx.strokeRect(w2sX(EXIT.x),w2sY(EXIT.y),EXIT.w*S,EXIT.h*S);
  }
}
function drawRoom(){
  ctx.fillStyle='#2a2018';ctx.fillRect(0,0,W,H);
  if(inOK){
    var rw=W*0.9,rh=H*0.9;
    var sx=(inImg.width-rw)/2, sy=(inImg.height-rh)/2;
    ctx.drawImage(inImg,0,0,inImg.width,inImg.height,0,0,W,H);
  }
  drawHero(inPos.x,inPos.y,Math.PI/2);
  ctx.fillStyle='#fff';ctx.font='16px sans-serif';
  ctx.textAlign='center';
  ctx.fillText(curHouse?curHouse.name:'屋内',W/2,60);
  ctx.fillStyle='#ffd';ctx.font='14px sans-serif';
  ctx.fillText('向下走到底离开',W/2,88);
}

/* ================= 飘字/特效 ================= */
function drawFloats(){
  floats.forEach(function(f){
    var a=Math.min(1,f.t*2);
    ctx.globalAlpha=a;
    ctx.fillStyle=f.c;
    ctx.font='bold '+Math.round(14*Math.max(1,S*0.6))+'px sans-serif';
    ctx.textAlign='center';
    ctx.fillText(f.txt,w2sX(f.x),w2sY(f.y));
    ctx.globalAlpha=1;
  });
}
function drawFx(){
  fx.forEach(function(f){
    var k=f.t/f.life;
    var x=w2sX(f.x),y=w2sY(f.y);
    ctx.save();
    ctx.translate(x,y);
    ctx.globalAlpha=k*0.8;
    ctx.fillStyle=f.k==='ult'?'#4cf':'#fff6c0';
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,f.range*S,f.ang-f.arc/2,f.ang+f.arc/2);
    ctx.closePath();ctx.fill();
    ctx.restore();
  });
}
function drawCorpses(){
  corpses.forEach(function(c){
    ctx.globalAlpha=Math.min(1,c.t);
    ctx.fillStyle=c.color;
    ctx.beginPath();ctx.arc(w2sX(c.x),w2sY(c.y),c.r*S*0.8,0,6.28);ctx.fill();
    ctx.globalAlpha=1;
  });
}

/* ================= 按钮布局 ================= */
var btns=[];
var JOY={rad:58,cx:0,cy:0,on:false,id:null,dx:0,dy:0};
var previewKey=null;

function layoutBtns(){
  btns=[];
  var r=Math.max(32,Math.min(46,Math.min(W,H)*0.068));
  var cx=W-r-24, cy=H-r-24;
  // 扇形排布：挥砍最靠手边
  var pos={
    slash:{x:cx-0.4*r,y:cy-0.2*r},
    dash:{x:cx-1.55*r,y:cy-0.9*r},
    spin:{x:cx-2.5*r,y:cy-0.15*r},
    ult:{x:cx-1.05*r,y:cy-2.0*r}
  };
  SKK.forEach(function(k){
    btns.push({key:k,x:pos[k].x,y:pos[k].y,r:r,label:SK[k].name,kind:'skill'});
  });
  btns.push({key:'lock',x:W-r-24,y:r+96,r:r*0.78,label:'锁敌',kind:'lock'});
  btns.push({key:'bag',x:W-r-24,y:r+20,r:r*0.72,label:'背包',kind:'bag'});
  btns.push({key:'backup',x:r+20,y:H-r-20,r:r*0.66,label:'备份',kind:'backup'});
  JOY.cx=JOY.rad+34;JOY.cy=H-JOY.rad-34;
}
function findBtn(x,y){
  for(var i=0;i<btns.length;i++){
    var b=btns[i];
    if(dist(x,y,b.x,b.y)<=b.r*1.15)return b;
  }
  return null;
}
function inJoyArea(x,y){
  return dist(x,y,JOY.cx,JOY.cy)<JOY.rad*1.7;
}

/* ================= HUD ================= */
function drawHUD(){
  // 左上
  var x=14,y=14,w=Math.min(210,W*0.34);
  ctx.fillStyle='rgba(0,0,0,0.45)';
  ctx.fillRect(x,y,w,58);
  ctx.fillStyle='#fff';ctx.font='bold 15px sans-serif';ctx.textAlign='left';
  ctx.fillText(P.name+' Lv'+P.level,x+8,y+19);
  ctx.fillStyle='#a33';ctx.fillRect(x+8,y+26,w-16,8);
  ctx.fillStyle='#e55';ctx.fillRect(x+8,y+26,(w-16)*Math.max(0,P.hp/P.maxHp),8);
  ctx.fillStyle='#235';ctx.fillRect(x+8,y+38,w-16,7);
  ctx.fillStyle='#4af';ctx.fillRect(x+8,y+38,(w-16)*Math.max(0,P.mp/P.maxMp),7);
  ctx.fillStyle='#dd8';ctx.fillRect(x+8,y+49,w-16,4);
  ctx.fillStyle='#fd4';ctx.fillRect(x+8,y+49,(w-16)*Math.max(0,P.exp/needExp(P.level)),4);

  // 中上提示
  ctx.fillStyle='rgba(0,0,0,0.4)';
  var tw=Math.min(W-320,420);
  if(tw>120){
    ctx.fillRect(W/2-tw/2,10,tw,26);
    ctx.fillStyle='#eee';ctx.font='13px sans-serif';ctx.textAlign='center';
    ctx.fillText('点敌人锁定 · 点空地取消 · 长按技能看范围',W/2,28);
  }

  // 区域名
  ctx.textAlign='center';
  ctx.fillStyle='rgba(0,0,0,0.5)';
  var zn=zoneName(P.x,P.y);
  ctx.font='bold 15px sans-serif';
  var zw=ctx.measureText(zn).width+30;
  ctx.fillRect(W/2-zw/2,H*0.14,zw,30);
  ctx.fillStyle='#ffe9a0';
  ctx.fillText(zn,W/2,H*0.14+21);

  // 按钮
  btns.forEach(function(b){
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.r,0,6.28);
    ctx.fillStyle=b.kind==='skill'?'rgba(30,60,100,0.72)':'rgba(40,40,40,0.7)';
    ctx.fill();
    ctx.lineWidth=2;ctx.strokeStyle='rgba(150,210,255,0.8)';ctx.stroke();
    if(b.kind==='skill'&&previewKey===b.key){
      ctx.strokeStyle='#ff8';ctx.lineWidth=4;ctx.stroke();
    }
    ctx.fillStyle='#fff';ctx.font='bold '+Math.round(b.r*0.36)+'px sans-serif';
    ctx.textAlign='center';
    ctx.fillText(b.label,b.x,b.y+5);
    if(b.kind==='skill'){
      var cd=SKILLCD[b.key];
      if(cd>0){
        ctx.beginPath();
        ctx.moveTo(b.x,b.y);
        ctx.arc(b.x,b.y,b.r,-Math.PI/2,-Math.PI/2+6.28*(cd/SK[b.key].cd));
        ctx.closePath();
        ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fill();
      }
    }
  });

  // 摇杆
  ctx.beginPath();ctx.arc(JOY.cx,JOY.cy,JOY.rad,0,6.28);
  ctx.fillStyle='rgba(255,255,255,0.10)';ctx.fill();
  ctx.lineWidth=2;ctx.strokeStyle='rgba(255,255,255,0.35)';ctx.stroke();
  ctx.beginPath();
  ctx.arc(JOY.cx+JOY.dx*JOY.rad*0.6,JOY.cy+JOY.dy*JOY.rad*0.6,JOY.rad*0.42,0,6.28);
  ctx.fillStyle='rgba(255,255,255,0.55)';ctx.fill();

  // 锁定目标血条
  if(P.target&&!P.target.dead){
    var m=P.target;
    var tx=w2sX(m.x),ty=w2sY(m.y)-m.r*S-24;
    ctx.fillStyle='#600';ctx.fillRect(tx-34,ty,68,7);
    ctx.fillStyle='#e33';ctx.fillRect(tx-34,ty,68*Math.max(0,m.hp/m.maxHp),7);
    ctx.strokeStyle='#f66';ctx.lineWidth=1.5;ctx.strokeRect(tx-34,ty,68,7);
    ctx.beginPath();ctx.moveTo(tx-6,ty-10);ctx.lineTo(tx+6,ty-10);ctx.lineTo(tx,ty-2);
    ctx.closePath();ctx.fillStyle='#f33';ctx.fill();
  }

  // 联机其他玩家
  for(var id in NET.others){
    var o=NET.others[id];
    drawHero(w2sX(o.x),w2sY(o.y),o.dir);
    ctx.fillStyle='#8cf';ctx.font='11px sans-serif';ctx.textAlign='center';
    ctx.fillText(o.n||'玩家',w2sX(o.x),w2sY(o.y)-52*Math.max(0.7,S*0.75));
  }
}

/* ================= 输入 ================= */
var keys={};
var presses={}; // id -> {kind:'skill'|'joy'|'btn', key}
function onDown(id,x,y){
  if(scene==='room'){presses[id]={kind:'room'};return;}
  var b=findBtn(x,y);
  if(b){
    if(b.kind==='skill'){
      previewKey=b.key;
      presses[id]={kind:'skill',key:b.key};
    }else if(b.kind==='lock'){
      // 空白点取消由下面处理
      presses[id]={kind:'btn'};
      var found=false;
      monsters.forEach(function(m){
        if(m.dead)return;
        if(dist(x,y,w2sX(m.x),w2sY(m.y))<m.r*S+26)P.target=m;
      });
    }else if(b.kind==='bag'){
      renderBag();presses[id]={kind:'btn'};
    }else if(b.kind==='backup'){
      showBackup();presses[id]={kind:'btn'};
    }
    return;
  }
  if(inJoyArea(x,y)){
    JOY.on=true;JOY.id=id;
    presses[id]={kind:'joy'};
    return;
  }
  presses[id]={kind:'tap'};
  // 点地图：锁定/取消/走路
  var hit=null;
  monsters.forEach(function(m){
    if(m.dead)return;
    if(dist(x,y,w2sX(m.x),w2sY(m.y))<m.r*S+22&&!hit)hit=m;
  });
  if(hit)P.target=hit;
  else P.target=null;
}
function onMove(id,x,y){
  if(scene==='room')return;
  var p=presses[id];
  if(!p)return;
  if(p.kind==='joy'){
    var dx=x-JOY.cx,dy=y-JOY.cy;
    var d=Math.sqrt(dx*dx+dy*dy);
    var lim=JOY.rad*0.95;
    if(d>lim){dx*=lim/d;dy*=lim/d;d=lim;}
    JOY.dx=dx/JOY.rad;JOY.dy=dy/JOY.rad;
  }else if(p.kind==='tap'){
    // 地拖：转身
    var wx=s2wX(x),wy=s2wY(y);
    P.face=Math.atan2(wy-P.y,wx-P.x);
  }
}
function onUp(id,x,y){
  var p=presses[id];
  delete presses[id];
  if(!p)return;
  if(p.kind==='joy'){
    JOY.on=false;JOY.id=null;JOY.dx=0;JOY.dy=0;
  }else if(p.kind==='skill'){
    if(previewKey===p.key&&scene==='world')castSkill(p.key);
    previewKey=null;
  }else if(p.kind==='room'){
    // 室内向下走离开
  }
}
function cancelPress(id){
  var p=presses[id];
  delete presses[id];
  if(p&&p.kind==='joy'){JOY.on=false;JOY.id=null;JOY.dx=0;JOY.dy=0;}
  previewKey=null;
}

/* 触屏 */
cv.addEventListener('touchstart',function(e){
  e.preventDefault();
  for(var i=0;i<e.changedTouches.length;i++){
    var t=e.changedTouches[i];
    onDown(t.identifier,t.clientX,t.clientY);
  }
},{passive:false});
cv.addEventListener('touchmove',function(e){
  e.preventDefault();
  for(var i=0;i<e.changedTouches.length;i++){
    var t=e.changedTouches[i];
    onMove(t.identifier,t.clientX,t.clientY);
  }
},{passive:false});
cv.addEventListener('touchend',function(e){
  e.preventDefault();
  for(var i=0;i<e.changedTouches.length;i++){
    var t=e.changedTouches[i];
    onUp(t.identifier,t.clientX,t.clientY);
  }
},{passive:false});
cv.addEventListener('touchcancel',function(e){
  for(var i=0;i<e.changedTouches.length;i++)cancelPress(e.changedTouches[i].identifier);
},{passive:false});

/* 鼠标（便于电脑调试） */
var mouseDown=false,mouseMoved=false;
cv.addEventListener('mousedown',function(e){
  mouseDown=true;mouseMoved=false;
  onDown('mouse',e.clientX,e.clientY);
});
cv.addEventListener('mousemove',function(e){
  if(!mouseDown)return;
  if(!mouseMoved){mouseMoved=true;}
  onMove('mouse',e.clientX,e.clientY);
});
cv.addEventListener('mouseup',function(e){
  mouseDown=false;
  onUp('mouse',e.clientX,e.clientY);
});

/* 键盘 */
window.addEventListener('keydown',function(e){
  keys[e.key.toLowerCase()]=true;
  if(e.key===' '){e.preventDefault();castSkill('slash');}
  if(e.key==='1')castSkill('slash');
  if(e.key==='2')castSkill('dash');
  if(e.key==='3')castSkill('spin');
  if(e.key==='4')castSkill('ult');
  if(e.key.toLowerCase()==='b')showBackup();
  if(e.key.toLowerCase()==='l'){
    var best=null,bd=1e9;
    monsters.forEach(function(m){if(!m.dead){var d=dist(P.x,P.y,m.x,m.y);if(d<bd){bd=d;best=m;}}});
    P.target=best;
  }
});
window.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=false;});

/* ================= 主循环逻辑 ================= */
function update(dt,now){
  if(doorLock>0)doorLock-=dt;
  for(var k in SKILLCD){if(SKILLCD[k]>0)SKILLCD[k]=Math.max(0,SKILLCD[k]-dt);}
  if(shake>0)shake=Math.max(0,shake-dt*40);

  // 飘字/特效/尸体寿命
  floats.forEach(function(f){f.t-=dt;f.y+=f.vy*dt;});
  floats=floats.filter(function(f){return f.t>0;});
  fx.forEach(function(f){f.t-=dt;});
  fx=fx.filter(function(f){return f.t>0;});
  corpses.forEach(function(c){c.t-=dt;});
  corpses=corpses.filter(function(c){return c.t>0;});
  monsters.forEach(function(m){if(m.hurtT>0)m.hurtT-=dt;});

  if(scene==='room'){
    // 室内走动
    var vx=0,vy=0;
    if(keys['w']||keys['arrowup'])vy-=1;
    if(keys['s']||keys['arrowdown'])vy+=1;
    if(keys['a']||keys['arrowleft'])vx-=1;
    if(keys['d']||keys['arrowright'])vx+=1;
    if(JOY.on){vx+=JOY.dx;vy+=JOY.dy;}
    var l=Math.sqrt(vx*vx+vy*vy);
    if(l>0){vx/=l;vy/=l;}
    inPos.x+=vx*P.speed*0.7*dt;
    inPos.y+=vy*P.speed*0.7*dt;
    inPos.x=Math.max(30,Math.min(W-30,inPos.x));
    inPos.y=Math.max(H*0.3,Math.min(H-20,inPos.y));
    if(inPos.y>H-40&&doorLock<=0){
      scene='world';P.x=curHouse?curHouse.door.x+curHouse.door.w/2:P.x;
      P.y=(curHouse?curHouse.door.y+curHouse.door.h:0)+24;
      doorLock=0.8;curHouse=null;updateCam();
    }
    return;
  }

  // 世界移动
  var mx=0,my=0;
  if(keys['w']||keys['arrowup'])my-=1;
  if(keys['s']||keys['arrowdown'])my+=1;
  if(keys['a']||keys['arrowleft'])mx-=1;
  if(keys['d']||keys['arrowright'])mx+=1;
  if(JOY.on){mx+=JOY.dx;my+=JOY.dy;}
  var ml=Math.sqrt(mx*mx+my*my);
  if(ml>0){
    mx/=ml;my/=ml;
    moveWithCollision(mx*P.speed*dt,my*P.speed*dt);
    P.face=Math.atan2(my,mx);
  }

  // 回血回蓝
  if(inVill(P.x,P.y)){
    P.hp=Math.min(P.maxHp,P.hp+12*dt);
    P.mp=Math.min(P.maxMp,P.mp+10*dt);
  }else{
    P.hp=Math.min(P.maxHp,P.hp+1.5*dt);
    P.mp=Math.min(P.maxMp,P.mp+6*dt);
  }

  // 怪物
  monsters.forEach(function(m){
    if(m.dead)return;
    var md=dist(P.x,P.y,m.x,m.y);
    var mm=MON[m.type];
    var active;
    if(mm.hostile) active=md<mm.aggro;
    else active=m.burning&&md<500;
    if(active){
      if(md>m.r+P.r+2){
        var a=Math.atan2(P.y-m.y,P.x-m.x);
        var sp=m.speed*dt;
        var nx=m.x+Math.cos(a)*sp,ny=m.y+Math.sin(a)*sp;
        if(!hitSolid(nx,ny)){m.x=nx;m.y=ny;}
        else{
          // 简单绕行
          if(!hitSolid(nx,m.y))m.x=nx;
          else if(!hitSolid(m.x,ny))m.y=ny;
        }
        m.face=a;
      }
      m.atkTimer-=dt;
      if(md<m.r+P.r+6&&m.atkTimer<=0){
        m.atkTimer=1.2;
        var dmg=Math.max(1,m.atk-P.def*0.5);
        P.hp-=dmg;
        addFloat(P.x,P.y-36,'-'+Math.round(dmg),'#f66');
        shake=5;
        if(P.hp<=0){
          P.hp=P.maxHp*0.5;P.mp=P.maxMp*0.5;P.x=800;P.y=620;
          addFloat(P.x,P.y-40,'你倒下了…','#f88');
          updateCam();
        }
      }
    }else{
      // 回巢
      var hd=dist(m.x,m.y,m.homeX,m.homeY);
      if(hd>240&&m.burning===false){
        var ha=Math.atan2(m.homeY-m.y,m.homeX-m.x);
        m.x+=Math.cos(ha)*m.speed*0.4*dt;
        m.y+=Math.sin(ha)*m.speed*0.4*dt;
      }
    }
  });

  // 进门
  tryDoor();

  // 目标有效性
  if(P.target&&P.target.dead)P.target=null;

  updateCam();
  netTick(now);
}

function draw(now){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(shake>0){
    ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
  }
  ctx.clearRect(-20,-20,W+40,H+40);

  if(scene==='room'){
    drawRoom();
  }else{
    drawMap();
    drawCorpses();
    monsters.forEach(function(m){if(!m.dead){if(m.type==='beast')drawBeast(m);else drawDeer(m);}});
    // 长按技能预览
    if(previewKey){
      var s=SK[previewKey];
      var ang=aimAng();
      ctx.save();
      ctx.translate(w2sX(P.x),w2sY(P.y));
      ctx.globalAlpha=0.25;
      ctx.fillStyle='#8cf';
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,s.range*S,ang-s.arc/2,ang+s.arc/2);
      ctx.closePath();ctx.fill();
      ctx.restore();
    }
    drawFx();
    drawHero(w2sX(P.x),w2sY(P.y),P.face);
    drawFloats();
  }
  drawHUD();
}

var lastT=0;
function loop(now){
  try{
    if(!lastT)lastT=now;
    var dt=Math.min(0.05,(now-lastT)/1000);
    lastT=now;
    update(dt,now);
    draw(now);
  }catch(err){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle='rgba(180,0,0,0.9)';
    ctx.fillRect(0,0,W,26);
    ctx.fillStyle='#fff';ctx.font='13px monospace';ctx.textAlign='left';
    ctx.fillText('ERR: '+(err&&err.message?err.message:err),8,18);
    try{console.error(err);}catch(e){}
  }
  requestAnimationFrame(loop);
}

/* ================= 背包 / 备份 ================= */
function renderBag(){
  var el=document.getElementById('bag');
  if(!el)return;
  el.innerHTML='';
  ['weapon','armor','ring'].forEach(function(t){
    var e=P.equip[t];
    var d=document.createElement('div');
    d.className='eq';
    d.style.color=e?e.qc:'#666';
    d.textContent=(t==='weapon'?'武器':t==='armor'?'护甲':'戒指')+'：'+(e?e.name+' +'+e.val:'空');
    el.appendChild(d);
  });
  P.bag.forEach(function(e,i){
    var d=document.createElement('div');
    d.className='item';
    d.style.color=e.qc;
    d.textContent=e.name+' +'+e.val;
    d.onclick=function(){
      var old=P.equip[e.type];
      P.equip[e.type]=e;
      P.bag.splice(i,1);
      if(old)P.bag.push(old);
      applyEquipStats();renderBag();saveGame();
    };
    el.appendChild(d);
  });
}
function applyEquipStats(){
  P.atk=P.baseAtk;P.def=P.baseDef;
  ['weapon','armor','ring'].forEach(function(t){
    var e=P.equip[t];
    if(!e)return;
    if(t==='weapon')P.atk+=e.val;
    else if(t==='armor')P.def+=e.val;
  });
}
function showBackup(){
  var code='FRK1:'+encodeURIComponent(JSON.stringify(snapData()));
  var el=document.getElementById('backup');
  if(!el)return;
  el.style.display='block';
  el.innerHTML='<div style="font-size:12px;color:#ccc">备份码（长按复制）：</div>'+
    '<textarea readonly style="width:100%;height:70px;font-size:11px">'+code+'</textarea>'+
    '<button style="margin-top:6px;padding:6px 14px">关闭</button>';
  el.querySelector('button').onclick=function(){el.style.display='none';};
  var ta=el.querySelector('textarea');
  ta.onclick=function(){ta.select();try{document.execCommand('copy');}catch(e){}};
}
function copyText(t){
  try{
    var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);
    ta.select();document.execCommand('copy');document.body.removeChild(ta);
  }catch(e){}
}

/* ================= 联机 UI ================= */
function showJoinUI(){
  var el=document.getElementById('join');
  if(!el){connect('1234');return;}
  el.style.display='flex';
  el.innerHTML='<div style="color:#fff;font-size:16px;margin-bottom:10px">输入房间码</div>'+
    '<input id="roomIn" value="1234" style="padding:8px;font-size:16px;width:120px;text-align:center;border-radius:6px;border:none">'+
    '<div style="margin-top:12px">'+
    '<button id="singleBtn" style="padding:8px 16px;margin:0 6px">单人</button>'+
    '<button id="joinBtn" style="padding:8px 16px;margin:0 6px">联机</button></div>';
  el.querySelector('#singleBtn').onclick=function(){el.style.display='none';};
  el.querySelector('#joinBtn').onclick=function(){
    var r=(el.querySelector('#roomIn').value||'1234').trim();
    el.style.display='none';
    connect(r);
  };
}

/* ================= 启动 ================= */
resize();
spawnMonsters();
loadGame();
P.baseAtk=P.atk;P.baseDef=P.def;P.baseMaxHp=P.maxHp;P.baseMaxMp=P.maxMp;
applyEquipStats();
renderBag();
showJoinUI();
setInterval(saveGame,5000);
requestAnimationFrame(loop);

})();