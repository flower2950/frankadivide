(function(){
'use strict';

/* ===================== 联机（Supabase Realtime broadcast） ===================== */
const SUPA_URL='https://rdwhqsvovabtyjlxbagf.supabase.co';
const SUPA_KEY='sb_publishable_G_i8uDGtnjdGTGG73F2Rqg_hBiu-HuZ';

/* ===================== 画布 ===================== */
const cv=document.getElementById('cv');
const ctx=cv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=window.innerWidth;H=window.innerHeight;
  cv.width=Math.floor(W*DPR);cv.height=Math.floor(H*DPR);
  cv.style.width=W+'px';cv.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.imageSmoothingEnabled=false;
  layoutBtns();
}
window.addEventListener('resize',resize);

/* ===================== 贴图 ===================== */
const mapImg=new Image();let mapReady=false;
mapImg.onload=function(){mapReady=true;};
mapImg.onerror=function(){mapReady=false;};
mapImg.src='map.png';

const inImg=new Image();let inReady=false;
inImg.onload=function(){inReady=true;};
inImg.onerror=function(){inReady=false;};
inImg.src='in.png';

/* ===================== 常量 ===================== */
const SAVEKEY='frk_div_save_v1';
const MAPW=1600,MAPH=1200;
const VILL={x:610,y:430,w:560,h:430};
const ZONES=[
  {x:610,y:430,w:560,h:430,name:'村庄',safe:true},
  {x:80,y:120,w:560,h:400,name:'村外草地'},
  {x:760,y:120,w:560,h:340,name:'林泉野径'},
  {x:760,y:880,w:700,h:280,name:'林泉深处'}
];
const HOUSES=[
  {x:700,y:478,w:112,h:86,door:{x:44,y:86,w:24,h:20}},
  {x:848,y:478,w:128,h:76,door:{x:50,y:76,w:26,h:20}},
  {x:1000,y:480,w:100,h:84,door:{x:38,y:84,w:22,h:20}},
  {x:700,y:742,w:104,h:72,door:{x:40,y:72,w:24,h:20}},
  {x:960,y:740,w:132,h:74,door:{x:52,y:74,w:26,h:20}}
];

let scene='map';
let sceneT=0;
let curHouse=null;
function enterHouse(h){
  curHouse=h;scene='in';sceneT=0;
  P.x=W/2;P.y=H*0.78;
}
function exitHouse(){
  scene='map';sceneT=0;
  if(curHouse){P.x=curHouse.x+curHouse.door.x+curHouse.door.w/2;P.y=curHouse.y+curHouse.h+18;}
  curHouse=null;
}

/* ===================== 技能 ===================== */
const SK={
  slash:{name:'挥砍',cd:0.6,mp:0,range:34,arc:1.5,dmg:1},
  dash:{name:'突进斩',cd:4,mp:8,range:70,arc:1.1,dmg:1.3},
  spin:{name:'旋斩',cd:6,mp:12,range:42,arc:Math.PI*2,dmg:0.85},
  ult:{name:'林泉·斩',cd:10,mp:50,range:96,arc:1.9,dmg:2.2}
};
const SKK=['slash','dash','spin','ult'];

/* ===================== 装备 ===================== */
const QUAL=['#bbb','#4d4','#5af','#c6f'];
const QMUL=[1,1.6,2.4,3.4];
const EQTYPE={weapon:22,armor:8,ring:220};
const AFFIX=['锋锐','沉重','迅捷','守护','林泉'];

/* ===================== 怪物 ===================== */
const MON={
  beast:{hp:70,atk:9,def:2,aggro:190,speed:70,r:13,exp:26,drop:0.85,color:'#a34',name:'野兽'},
  deer:{hp:55,atk:7,def:2,aggro:0,speed:60,r:12,exp:14,drop:0.35,color:'#8a7',name:'鹿'}
};
const SPAWN=[
  {x:300,y:320,type:'beast',n:4},
  {x:1080,y:290,type:'beast',n:3},
  {x:1100,y:1030,type:'deer',n:5}
];

/* ===================== 玩家 ===================== */
const P={name:'兰德',x:860,y:660,level:5,hp:220,maxHp:220,mp:100,maxMp:100,atk:22,def:8,speed:120,r:11,face:1.57};

/* ===================== 工具 ===================== */
function rnd(a,b){return a+Math.random()*(b-a);}
function clamp(v,a,b){return v<a?a:(v>b?b:v);}
function dist(a,b,c,d){var dx=a-c,dy=b-d;return Math.sqrt(dx*dx+dy*dy);}
function inVill(x,y){return x>VILL.x&&x<VILL.x+VILL.w&&y>VILL.y&&y<VILL.y+VILL.h;}

/* ===================== 飘字 / 抖屏 / 尸体 ===================== */
const floats=[];
const shake={t:0,mag:0};
const corpses=[];
function float(x,y,txt,color){
  floats.push({x:x,y:y,txt:txt,color:color||'#fff',life:0.9,max:0.9});
}

/* ===================== 装备生成 ===================== */
function makeEquip(lv){
  const q=Math.random()<0.55?0:(Math.random()<0.65?1:(Math.random()<0.7?2:3));
  const keys=Object.keys(EQTYPE);
  const type=keys[Math.floor(Math.random()*keys.length)];
  const mul=QMUL[q];
  const power=Math.floor((EQTYPE[type]*0.5+lv*3)*mul);
  const affix=Math.random()<0.6?AFFIX[Math.floor(Math.random()*AFFIX.length)]:null;
  return {type:type,q:q,power:power,affix:affix,name:(affix?affix+'之':'')+(type==='weapon'?'刃':type==='armor'?'甲':'戒')};
}
let bag=[];
let equip={weapon:null,armor:null,ring:null};
function eqStat(s){
  var v=0,q=0;
  for(var k in equip){var e=equip[k];if(e&&e.type===s){v+=e.power;q++;}}
  return v;
}
function tAtk(){return P.atk+eqStat('weapon');}
function tDef(){return P.def+eqStat('armor')+eqStat('ring')*0.5;}
function renderBag(){
  var el=document.getElementById('bagList');
  if(!el)return;
  var html='';
  if(equip.weapon)html+='<div>武器：'+equip.weapon.name+' +'+equip.weapon.power+'</div>';
  if(equip.armor)html+='<div>护甲：'+equip.armor.name+' +'+equip.armor.power+'</div>';
  if(equip.ring)html+='<div>戒指：'+equip.ring.name+' +'+equip.ring.power+'</div>';
  for(var i=0;i<bag.length;i++){html+='<div>'+bag[i].name+' +'+bag[i].power+'</div>';}
  el.innerHTML=html||'<div>空空如也</div>';
}
function useItem(it){
  if(!it)return;
  if(it.type==='weapon'||it.type==='armor'||it.type==='ring'){
    var old=equip[it.type];
    equip[it.type]=it;
    if(old)bag.push(old);
  }
  renderBag();saveGame();
}

/* ===================== 怪物逻辑 ===================== */
let monsters=[];
function spawnMonsters(){
  monsters=[];
  for(var i=0;i<SPAWN.length;i++){
    var s=SPAWN[i];
    for(var j=0;j<s.n;j++){
      var m=MON[s.type];
      monsters.push({
        type:s.type,x:s.x+rnd(-90,90),y:s.y+rnd(-90,90),
        hp:m.hp,maxHp:m.hp,atk:m.atk,def:m.def,aggro:m.aggro,speed:m.speed,r:m.r,
        exp:m.exp,drop:m.drop,color:m.color,name:m.name,
        hx:s.x,hy:s.y,home:s,
        chase:false,atkT:0,dead:false,deadT:0,face:1
      });
    }
  }
}
function damageMon(m,dmg){
  if(m.dead)return;
  var real=Math.max(1,Math.round(dmg-m.def));
  m.hp-=real;
  float(m.x,m.y-m.r-6,'-'+real,'#ff6');
  if(m.hp<=0){
    m.dead=true;m.deadT=0;
    corpses.push({x:m.x,y:m.y,r:m.r,type:m.type,color:m.color,life:6});
    gainExp(m.exp);
    if(Math.random()<m.drop){bag.push(makeEquip(P.level));renderBag();}
  }
  m.chase=true;
}
function gainExp(n){
  P.exp=(P.exp||0)+n;
  float(P.x,P.y-30,'+'+n+' 经验','#8ff');
  var need=needExp();
  while(P.exp>=need){
    P.exp-=need;
    P.level++;
    P.maxHp+=12;P.maxMp+=4;P.atk+=2;P.def+=1;
    P.hp=P.maxHp;P.mp=P.maxMp;
    float(P.x,P.y-50,'升级！Lv'+P.level,'#ff0');
    need=needExp();
  }
}
function needExp(){return P.level*40;}

/* ===================== 特效 ===================== */
let fx=[];
const SKILLCD={slash:0,dash:0,spin:0,ult:0};
function addFx(o){o.life=o.life||0.35;o.max=o.life;fx.push(o);}
function castSkill(key,ang){
  var s=SK[key];
  if(!s)return;
  if(SKILLCD[key]>0)return;
  if(inVill(P.x,P.y)){float(P.x,P.y-30,'村内无法出手','#f99');return;}
  if(P.mp<s.mp){float(P.x,P.y-30,'法力不足','#9cf');return;}
  P.mp-=s.mp;
  SKILLCD[key]=s.cd;
  ang=ang===undefined?P.face:ang;
  var range=s.range;
  // 固定满射程：伤害判定用技能本身的最大射程
  var hitList=[];
  for(var i=0;i<monsters.length;i++){
    var m=monsters[i];
    if(m.dead)continue;
    var d=dist(P.x,P.y,m.x,m.y);
    if(d>range+m.r)continue;
    var a=Math.atan2(m.y-P.y,m.x-P.x);
    var diff=Math.abs(((a-ang+Math.PI*3)%(Math.PI*2))-Math.PI);
    if(s.arc<Math.PI*2&&diff>s.arc/2)continue;
    hitList.push(m);
  }
  for(var k=0;k<hitList.length;k++){damageMon(hitList[k],tAtk()*s.dmg);}
  if(s.arc>=Math.PI*2){
    addFx({kind:'ring',x:P.x,y:P.y,r:range,color:'#9df',life:0.3});
  }else{
    addFx({kind:'arc',x:P.x,y:P.y,ang:ang,r:range,arc:s.arc,color:'#9df',life:0.28});
  }
  addFx({kind:'hit',x:P.x+Math.cos(ang)*range*0.8,y:P.y+Math.sin(ang)*range*0.8,life:0.2});
  shake.t=0.15;shake.mag=5;
  for(var j=0;j<hitList.length;j++){
    addFx({kind:'line',x:P.x,y:P.y,x2:hitList[j].x,y2:hitList[j].y,color:'#fff',life:0.15});
  }
}

/* ===================== 存档 ===================== */
function snapData(){
  return {
    P:{name:P.name,x:P.x,y:P.y,level:P.level,hp:P.hp,maxHp:P.maxHp,mp:P.mp,maxMp:P.maxMp,atk:P.atk,def:P.def,exp:P.exp||0},
    equip:equip,bag:bag,monsters:monsters
  };
}
function applyData(d){
  if(!d)return;
  if(d.P){for(var k in d.P){P[k]=d.P[k];}}
  if(d.equip)equip=d.equip;
  if(d.bag)bag=d.bag;
  if(d.monsters)monsters=d.monsters;
}
function saveGame(){
  try{localStorage.setItem(SAVEKEY,JSON.stringify(snapData()));}catch(e){}
}
function loadGame(){
  try{
    var s=localStorage.getItem(SAVEKEY);
    if(!s)return false;
    applyData(JSON.parse(s));
    return true;
  }catch(e){return false;}
}
window.__reset=function(){try{localStorage.removeItem(SAVEKEY);location.reload();}catch(e){}};
function exportCode(){return 'FRK1:'+encodeURIComponent(JSON.stringify(snapData()));}
function importCode(code){
  try{
    if(code.indexOf('FRK1:')!==0)return false;
    applyData(JSON.parse(decodeURIComponent(code.slice(5))));
    renderBag();return true;
  }catch(e){return false;}
}
function copyText(t){
  try{
    var ta=document.createElement('textarea');
    ta.value=t;document.body.appendChild(ta);ta.select();
    document.execCommand('copy');document.body.removeChild(ta);
  }catch(e){}
}
function showBackupUI(){
  var ui=document.getElementById('backupUI');
  if(!ui)return;
  ui.style.display='block';
  var code=exportCode();
  document.getElementById('bkCode').value=code;
}

/* ===================== 联机 ===================== */
const NET={on:false,room:'',me:'p'+Math.floor(Math.random()*9999),others:{},last:0,ch:null};
function connect(){
  if(typeof supabase==='undefined'||!supabase.createClient){
    alert('联机库未加载');return;
  }
  var sb=supabase.createClient(SUPA_URL,SUPA_KEY);
  NET.ch=sb.channel('frk_'+NET.room,{config:{broadcast:{self:false}}});
  NET.ch.on('broadcast',{event:'pos'},function(msg){
    var p=msg.payload;
    if(!p||p.id===NET.me)return;
    NET.others[p.id]={x:p.x,y:p.y,dir:p.dir,hp:p.hp,name:p.name,t:Date.now()};
  });
  NET.ch.subscribe(function(st){
    if(st==='SUBSCRIBED'){NET.on=true;}
  });
}
function netTick(dt){
  if(!NET.on||!NET.ch)return;
  NET.last+=dt;
  if(NET.last<0.1)return;
  NET.last=0;
  try{
    NET.ch.send({type:'broadcast',event:'pos',payload:{id:NET.me,x:P.x,y:P.y,dir:P.face,hp:P.hp,name:P.name}});
  }catch(e){}
  var now=Date.now();
  for(var k in NET.others){
    if(now-NET.others[k].t>3000)delete NET.others[k];
  }
}

/* ===================== 输入 ===================== */
const keys={};
window.addEventListener('keydown',function(e){
  keys[e.key.toLowerCase()]=true;
  if(e.key===' '){e.preventDefault();castSkill('slash');}
  if(e.key==='l'||e.key==='L')autoLock();
  if(e.key>='1'&&e.key<='4')castSkill(SKK[+e.key-1],targetAng());
  if(e.key==='b'||e.key==='B')showBackupUI();
});
window.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=false;});

let walkT=0;

const JOY={active:false,id:-1,ox:0,oy:0,x:0,y:0,dx:0,dy:0,radius:58};
const touch={};
const btns=[];
const btnDefs=[
  {id:'slash',label:'挥砍',x:0,y:0,r:38},
  {id:'dash',label:'突进',x:0,y:0,r:38},
  {id:'spin',label:'旋斩',x:0,y:0,r:38},
  {id:'ult',label:'林泉',x:0,y:0,r:38},
  {id:'lock',label:'锁敌',x:0,y:0,r:32},
  {id:'bag',label:'背包',x:0,y:0,r:30},
  {id:'bk',label:'备份',x:0,y:0,r:30}
];
function layoutBtns(){
  btns.length=0;
  for(var i=0;i<btnDefs.length;i++){btns.push(Object.assign({},btnDefs[i]));}
  var cx=W-92,cy=H-92;
  var ring=[];
  for(var j=0;j<4;j++){
    var a=-Math.PI/2+j*(Math.PI/2);
    ring.push({x:cx+Math.cos(a)*82,y:cy+Math.sin(a)*82});
  }
  btns[0].x=ring[0].x;btns[0].y=ring[0].y;
  btns[1].x=ring[1].x;btns[1].y=ring[1].y;
  btns[2].x=ring[2].x;btns[2].y=ring[2].y;
  btns[3].x=ring[3].x;btns[3].y=ring[3].y;
  btns[4].x=W-52;btns[4].y=88;
  btns[5].x=52;btns[5].y=88;
  btns[6].x=52;btns[6].y=150;
}
function findBtn(x,y){
  for(var i=0;i<btns.length;i++){
    var b=btns[i];
    if(dist(x,y,b.x,b.y)<=b.r+10)return b;
  }
  return null;
}
function inJoy(x,y){return x<W*0.45&&y>H*0.45;}

let pressBtn=null;
let pressStart=0;
let pressMoved=false;
function autoLock(){
  var best=null,bd=1e9;
  for(var i=0;i<monsters.length;i++){
    var m=monsters[i];
    if(m.dead)continue;
    var d=dist(P.x,P.y,m.x,m.y);
    if(d<bd){bd=d;best=m;}
  }
  P.target=best;
}
function targetAng(){
  if(P.target&&!P.target.dead){
    return Math.atan2(P.target.y-P.y,P.target.x-P.x);
  }
  return P.face;
}
function startPress(b,x,y){
  pressBtn=b;pressStart=performance.now();pressMoved=false;
  P.pressX=x;P.pressY=y;
}
function movePress(x,y){
  if(!pressBtn)return;
  pressMoved=true;
  var a=Math.atan2(y-pressStartY(),x-pressStartX());
  P.face=a;
  P.aimAng=a;
}
function endPress(x,y){
  if(!pressBtn)return;
  var b=pressBtn;
  pressBtn=null;
  var held=(performance.now()-pressStart)/1000;
  if(b.id==='lock'){autoLock();return;}
  if(b.id==='bag'){renderBag();var el=document.getElementById('bagUI');if(el)el.style.display=el.style.display==='block'?'none':'block';return;}
  if(b.id==='bk'){showBackupUI();return;}
  if(held<0.18){
    // 点按：朝敌人或面朝方向释放
    castSkill(b.id,targetAng());
  }else{
    castSkill(b.id,P.aimAng!==undefined?P.aimAng:P.face);
  }
}
function cancelPress(){pressBtn=null;}

function onDown(id,x,y){
  if(inJoy(x,y)){
    JOY.active=true;JOY.id=id;JOY.ox=x;JOY.oy=y;JOY.x=x;JOY.y=y;JOY.dx=0;JOY.dy=0;
    return;
  }
  var b=findBtn(x,y);
  if(b){pressStartXv=x;pressStartYv=y;startPress(b,x,y);return;}
  // 点空地：取消锁敌
  P.target=null;
}
let pressStartXv=0,pressStartYv=0;
function pressStartX(){return pressStartXv;}
function pressStartY(){return pressStartYv;}
function onMove(id,x,y){
  if(JOY.active&&JOY.id===id){
    var dx=x-JOY.ox,dy=y-JOY.oy;
    var d=Math.sqrt(dx*dx+dy*dy);
    var max=JOY.radius;
    if(d>max){dx=dx/d*max;dy=dy/d*max;d=max;}
    JOY.x=JOY.ox+dx;JOY.y=JOY.oy+dy;
    JOY.dx=dx/max;JOY.dy=dy/max;
    return;
  }
  if(pressBtn)movePress(x,y);
}
function onUp(id,x,y){
  if(JOY.active&&JOY.id===id){
    JOY.active=false;JOY.id=-1;JOY.dx=0;JOY.dy=0;return;
  }
  if(pressBtn)endPress(x,y);
}

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
  e.preventDefault();
  cancelPress();
  JOY.active=false;JOY.id=-1;JOY.dx=0;JOY.dy=0;
},{passive:false});
cv.addEventListener('mousedown',function(e){onDown('m',e.clientX,e.clientY);});
cv.addEventListener('mousemove',function(e){onMove('m',e.clientX,e.clientY);});
cv.addEventListener('mouseup',function(e){onUp('m',e.clientX,e.clientY);});

var bagBtn=document.getElementById('bagBtn');
if(bagBtn)bagBtn.onclick=function(){renderBag();var el=document.getElementById('bagUI');if(el)el.style.display=el.style.display==='block'?'none':'block';};

/* ===================== 障碍（房屋墙体） ===================== */
let OBST=[];
function initObst(){
  OBST=[];
  var t=8;
  for(var i=0;i<HOUSES.length;i++){
    var h=HOUSES[i];
    var d=h.door;
    // 上墙
    OBST.push({x:h.x,y:h.y,w:h.w,h:t});
    // 下墙（门两侧）
    OBST.push({x:h.x,y:h.y+h.h-t,w:d.x,h:t});
    OBST.push({x:h.x+d.x+d.w,y:h.y+h.h-t,w:h.w-d.x-d.w,h:t});
    // 左右墙
    OBST.push({x:h.x,y:h.y,w:t,h:h.h});
    OBST.push({x:h.x+h.w-t,y:h.y,w:t,h:h.h});
    // 门两侧挡块
    OBST.push({x:h.x+d.x-6,y:h.y+h.h-t,w:6,h:t});
    OBST.push({x:h.x+d.x+d.w,y:h.y+h.h-t,w:6,h:t});
  }
}
function pushOutR(o,cx,cy,r){
  var nx=clamp(cx,o.x,o.x+o.w);
  var ny=clamp(cy,o.y,o.y+o.h);
  var dx=cx-nx,dy=cy-ny;
  var d=Math.sqrt(dx*dx+dy*dy);
  if(d>=r)return null;
  if(d<0.0001){
    // 在内部：往最近的边推
    var l=cx-o.x,rt=o.x+o.w-cx,t2=cy-o.y,b=o.y+o.h-cy;
    var m=Math.min(l,rt,t2,b);
    if(m===l)return {x:o.x-r,y:cy};
    if(m===rt)return {x:o.x+o.w+r,y:cy};
    if(m===t2)return {x:cx,y:o.y-r};
    return {x:cx,y:o.y+o.h+r};
  }
  var k=(r-d)/d;
  return {x:cx+dx*k,y:cy+dy*k};
}
function resolveObst(ent,r){
  for(var i=0;i<OBST.length;i++){
    var res=pushOutR(OBST[i],ent.x,ent.y,r);
    if(res){ent.x=res.x;ent.y=res.y;}
  }
}
function doorAt(x,y){
  for(var i=0;i<HOUSES.length;i++){
    var h=HOUSES[i],d=h.door;
    if(x>h.x+d.x-6&&x<h.x+d.x+d.w+6&&y>h.y+h.h-14&&y<h.y+h.h+26)return h;
  }
  return null;
}
function checkDoor(){
  var h=doorAt(P.x,P.y);
  if(h&&keys['e']!==true){/* 进入由触碰触发 */}
  if(h){enterHouse(h);}
}
function checkExit(){
  if(scene==='in'&&P.y>H*0.9){exitHouse();}
}

/* ===================== 绘制：尸体 / 特效 ===================== */
function drawCorpses(){
  for(var i=0;i<corpses.length;i++){
    var c=corpses[i];
    var a=clamp(c.life/6,0,1)*0.75;
    ctx.globalAlpha=a;
    ctx.fillStyle=c.color;
    ctx.beginPath();
    ctx.ellipse(c.x,c.y,c.r*1.2,c.r*0.6,0,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
  }
}
function drawFx(){
  for(var i=0;i<fx.length;i++){
    var f=fx[i];
    var a=clamp(f.life/f.max,0,1);
    ctx.globalAlpha=a;
    if(f.kind==='arc'){
      ctx.strokeStyle=f.color;ctx.lineWidth=4;
      ctx.beginPath();
      ctx.arc(f.x,f.y,f.r,f.ang-f.arc/2,f.ang+f.arc/2);
      ctx.stroke();
    }else if(f.kind==='ring'){
      ctx.strokeStyle=f.color;ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1.1-a*0.1),0,Math.PI*2);ctx.stroke();
    }else if(f.kind==='line'){
      ctx.strokeStyle=f.color;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x2,f.y2);ctx.stroke();
    }else if(f.kind==='rune'){
      ctx.strokeStyle=f.color;ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.stroke();
    }else if(f.kind==='pillar'){
      ctx.fillStyle=f.color;
      ctx.fillRect(f.x-8,f.y-f.r,16,f.r);
    }else if(f.kind==='hit'){
      ctx.fillStyle='#fff';
      ctx.beginPath();ctx.arc(f.x,f.y,10*a,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
}

/* ===================== 室内 ===================== */
function drawRoom(){
  if(inReady){
    ctx.drawImage(inImg,0,0,W,H);
  }else{
    // 木地板
    ctx.fillStyle='#3a2a1c';ctx.fillRect(0,0,W,H);
    for(var y=0;y<H;y+=32){
      for(var x=0;x<W;x+=64){
        ctx.fillStyle=((x/64+y/32)%2===0)?'#4a3624':'#42301f';
        ctx.fillRect(x,y,64,32);
      }
    }
  }
  // 顶部条
  ctx.fillStyle='rgba(0,0,0,0.45)';
  ctx.fillRect(0,0,W,44);
  ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.textAlign='left';
  ctx.fillText('室内',16,28);
  // 底部出口
  ctx.fillStyle='rgba(0,0,0,0.4)';
  ctx.fillRect(0,H-60,W,60);
  ctx.fillStyle='#ffd';ctx.textAlign='center';
  ctx.fillText('▼ 出口',W/2,H-24);
  // 玩家
  drawHuman(P.x,P.y,P.face,'#4af');
  drawFx();drawFloats();
}
function drawFloats(){
  ctx.textAlign='center';
  ctx.font='bold 15px sans-serif';
  for(var i=0;i<floats.length;i++){
    var f=floats[i];
    ctx.globalAlpha=clamp(f.life/f.max,0,1);
    ctx.fillStyle=f.color;
    ctx.fillText(f.txt,f.x,f.y);
  }
  ctx.globalAlpha=1;
}

/* ===================== 地图场景 ===================== */
function drawMapScene(){
  if(mapReady){
    ctx.drawImage(mapImg,0,0,MAPW,MAPH,0,0,W,H);
  }else{
    ctx.fillStyle='#2b4a2b';ctx.fillRect(0,0,W,H);
    drawVillage();
  }
  var sx=W/MAPW, sy=H/MAPH;
  ctx.save();
  ctx.scale(sx,sy);
  drawCorpses();
  // 怪物
  for(var i=0;i<monsters.length;i++){
    var m=monsters[i];
    if(m.dead)continue;
    if(m.type==='beast')drawBeast(m.x,m.y,m);
    else drawDeer(m.x,m.y,m);
    // 血条
    if(m.hp<m.maxHp){
      ctx.fillStyle='#300';ctx.fillRect(m.x-16,m.y-m.r-12,32,4);
      ctx.fillStyle='#e44';ctx.fillRect(m.x-16,m.y-m.r-12,32*(m.hp/m.maxHp),4);
    }
    if(m===P.target){
      ctx.strokeStyle='#f33';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(m.x,m.y,m.r+8,0,Math.PI*2);ctx.stroke();
    }
  }
  // 其他玩家
  for(var k in NET.others){
    var o=NET.others[k];
    drawHuman(o.x,o.y,o.dir||0,'#fc6');
    ctx.fillStyle='#fff';ctx.font='12px sans-serif';ctx.textAlign='center';
    ctx.fillText(o.name||'?',o.x,o.y-22);
  }
  // 自己
  drawHuman(P.x,P.y,P.face,'#4af');
  drawFx();
  drawFloats();
  ctx.restore();
}

/* ===================== 像素建模 ===================== */
function drawHuman(x,y,face,color){
  ctx.save();ctx.translate(x,y);
  var bob=Math.sin(walkT*10)*2*(JOY.active?1:0);
  // 影子
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath();ctx.ellipse(0,10,12,5,0,0,Math.PI*2);ctx.fill();
  var flip=Math.cos(face)<0?-1:1;
  ctx.scale(flip,1);
  // 身体
  ctx.fillStyle=color;ctx.fillRect(-7,-14+bob,14,16);
  // 头
  ctx.fillStyle='#f2c9a0';ctx.fillRect(-6,-26+bob,12,12);
  // 头发
  ctx.fillStyle='#3a2a1a';ctx.fillRect(-6,-27+bob,12,4);
  // 眼睛
  ctx.fillStyle='#222';ctx.fillRect(1,-21+bob,2,2);
  // 腿
  ctx.fillStyle='#2b2b40';
  ctx.fillRect(-6,2+bob,5,9);
  ctx.fillRect(1,2+bob,5,9);
  // 武器
  ctx.fillStyle='#ddd';ctx.fillRect(8,-10+bob,2,16);
  ctx.fillStyle='#8a6';ctx.fillRect(7,-2+bob,4,3);
  ctx.restore();
}
function drawBeast(x,y,m){
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath();ctx.ellipse(0,m.r*0.85,m.r,m.r*0.4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=m.color;
  ctx.beginPath();ctx.ellipse(0,0,m.r,m.r*0.8,0,0,Math.PI*2);ctx.fill();
  // 耳
  ctx.beginPath();ctx.moveTo(-8,-8);ctx.lineTo(-4,-18);ctx.lineTo(0,-8);ctx.fill();
  ctx.beginPath();ctx.moveTo(8,-8);ctx.lineTo(4,-18);ctx.lineTo(0,-8);ctx.fill();
  // 眼
  ctx.fillStyle='#ff2';ctx.fillRect(-5,-4,3,3);ctx.fillRect(2,-4,3,3);
  ctx.restore();
}
function drawDeer(x,y,m){
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath();ctx.ellipse(0,m.r*0.85,m.r,m.r*0.4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=m.color;
  ctx.beginPath();ctx.ellipse(0,0,m.r*0.9,m.r*0.75,0,0,Math.PI*2);ctx.fill();
  // 头
  ctx.beginPath();ctx.arc(m.r*0.6,-m.r*0.6,m.r*0.45,0,Math.PI*2);ctx.fill();
  // 角
  ctx.strokeStyle='#cba';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(m.r*0.5,-m.r*0.9);ctx.lineTo(m.r*0.2,-m.r*1.6);ctx.stroke();
  ctx.beginPath();ctx.moveTo(m.r*0.8,-m.r*0.9);ctx.lineTo(m.r*1.1,-m.r*1.5);ctx.stroke();
  ctx.fillStyle='#222';ctx.fillRect(m.r*0.65,-m.r*0.65,2,2);
  ctx.restore();
}
function drawVillage(){
  ctx.fillStyle='#6b4b2a';
  ctx.fillRect(VILL.x,VILL.y,VILL.w,VILL.h);
  for(var i=0;i<HOUSES.length;i++){
    var h=HOUSES[i];
    ctx.fillStyle='#c9a06a';ctx.fillRect(h.x,h.y,h.w,h.h);
    ctx.fillStyle='#7a3a2a';ctx.fillRect(h.x-4,h.y-10,h.w+8,12);
    ctx.fillStyle='#3a2418';ctx.fillRect(h.x+h.door.x,h.y+h.door.y,h.door.w,h.door.h);
  }
}

/* ===================== 主绘制 ===================== */
function draw(){
  ctx.save();
  if(shake.t>0){
    ctx.translate(rnd(-shake.mag,shake.mag),rnd(-shake.mag,shake.mag));
  }
  ctx.clearRect(-20,-20,W+40,H+40);
  if(scene==='in'){
    drawRoom();
  }else{
    drawMapScene();
  }
  ctx.restore();
  drawHUD();
}

function drawHUD(){
  // 按住技能时的射程预览 + 轮盘
  if(pressBtn&&(pressBtn.id in SK)){
    var s=SK[pressBtn.id];
    ctx.save();
    ctx.translate(P.x*W/MAPW,P.y*H/MAPH);
    ctx.fillStyle='rgba(120,220,255,0.18)';
    ctx.strokeStyle='rgba(120,220,255,0.7)';
    ctx.lineWidth=2;
    var rr=s.range*W/MAPW;
    if(s.arc>=Math.PI*2){
      ctx.beginPath();ctx.arc(0,0,rr,0,Math.PI*2);ctx.fill();ctx.stroke();
    }else{
      var a=P.aimAng!==undefined?P.aimAng:P.face;
      ctx.beginPath();ctx.moveTo(0,0);
      ctx.arc(0,0,rr,a-s.arc/2,a+s.arc/2);ctx.closePath();
      ctx.fill();ctx.stroke();
    }
    ctx.restore();
  }
  // 顶部状态
  ctx.fillStyle='rgba(0,0,0,0.55)';
  ctx.fillRect(0,0,W,64);
  var bw=Math.min(220,W*0.35);
  // 血
  ctx.fillStyle='#511';ctx.fillRect(12,12,bw,14);
  ctx.fillStyle='#e34';ctx.fillRect(12,12,bw*(P.hp/P.maxHp),14);
  ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.strokeRect(12,12,bw,14);
  // 蓝
  ctx.fillStyle='#114';ctx.fillRect(12,32,bw,10);
  ctx.fillStyle='#48c';ctx.fillRect(12,32,bw*(P.mp/P.maxMp),10);
  ctx.strokeRect(12,32,bw,10);
  // 文字
  ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';ctx.textAlign='left';
  ctx.fillText(P.name+' Lv'+P.level,12,58);
  // 经验
  var ex=(P.exp||0)/needExp();
  ctx.fillStyle='#332';ctx.fillRect(12,64,bw,4);
  ctx.fillStyle='#ffd24a';ctx.fillRect(12,64,bw*clamp(ex,0,1),4);
  // 区域
  var zoneName='';
  for(var i=0;i<ZONES.length;i++){
    var z=ZONES[i];
    if(P.x>z.x&&P.x<z.x+z.w&&P.y>z.y&&P.y<z.y+z.h){zoneName=z.name;break;}
  }
  if(scene==='in')zoneName='室内';
  ctx.textAlign='center';
  ctx.fillStyle='#fff';ctx.font='14px sans-serif';
  ctx.fillText(zoneName,W/2,24);
  // 联机人数
  if(NET.on){
    var n=1;for(var k in NET.others)n++;
    ctx.textAlign='right';ctx.fillStyle='#8f8';ctx.font='13px sans-serif';
    ctx.fillText('房间 '+NET.room+' · '+n+'人',W-12,24);
  }
  // 摇杆
  if(JOY.active){
    ctx.strokeStyle='rgba(255,255,255,0.35)';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(JOY.ox,JOY.oy,JOY.radius,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.45)';
    ctx.beginPath();ctx.arc(JOY.x,JOY.y,26,0,Math.PI*2);ctx.fill();
  }else{
    ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(W*0.18,H-96,JOY.radius,0,Math.PI*2);ctx.stroke();
  }
  // 按钮
  ctx.textAlign='center';
  for(var b=0;b<btns.length;b++){
    var bt=btns[b];
    var cd=SKILLCD[bt.id]||0;
    var ready=cd<=0;
    ctx.beginPath();ctx.arc(bt.x,bt.y,bt.r,0,Math.PI*2);
    if(bt.id in SK){
      ctx.fillStyle=ready?'rgba(40,90,140,0.75)':'rgba(50,50,50,0.75)';
      ctx.fill();
      ctx.strokeStyle=ready?'rgba(140,220,255,0.9)':'rgba(120,120,120,0.7)';
      ctx.lineWidth=2;ctx.stroke();
      if(!ready){
        ctx.beginPath();
        ctx.moveTo(bt.x,bt.y);
        ctx.arc(bt.x,bt.y,bt.r,-Math.PI/2,-Math.PI/2+Math.PI*2*(cd/SK[bt.id].cd));
        ctx.closePath();
        ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fill();
      }
      ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';
      ctx.fillText(SK[bt.id].name,bt.x,bt.y+5);
    }else{
      ctx.fillStyle='rgba(60,60,60,0.7)';ctx.fill();
      ctx.strokeStyle='rgba(180,180,180,0.7)';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#fff';ctx.font='12px sans-serif';
      ctx.fillText(bt.label,bt.x,bt.y+4);
    }
  }
  ctx.textAlign='left';
}

/* ===================== 更新 ===================== */
function update(dt){
  sceneT+=dt;
  walkT+=dt;
  // 冷却
  for(var k in SKILLCD){if(SKILLCD[k]>0)SKILLCD[k]=Math.max(0,SKILLCD[k]-dt);}
  // 输入合成
  var mvx=0,mvy=0;
  if(JOY.active){mvx=JOY.dx;mvy=JOY.dy;}
  if(keys['w']||keys['arrowup'])mvy-=1;
  if(keys['s']||keys['arrowdown'])mvy+=1;
  if(keys['a']||keys['arrowleft'])mvx-=1;
  if(keys['d']||keys['arrowright'])mvx+=1;
  var ml=Math.sqrt(mvx*mvx+mvy*mvy);
  if(ml>1){mvx/=ml;mvy/=ml;ml=1;}

  if(scene==='in'){
    P.x+=mvx*P.speed*dt;
    P.y+=mvy*P.speed*dt;
    P.x=clamp(P.x,20,W-20);
    P.y=clamp(P.y,60,H-20);
    if(ml>0.1)P.face=Math.atan2(mvy,mvx);
    checkExit();
  }else{
    var sp=Math.min(W/MAPW,H/MAPH);
    P.x+=mvx*P.speed*dt/sp;
    P.y+=mvy*P.speed*dt/sp;
    P.x=clamp(P.x,10,MAPW-10);
    P.y=clamp(P.y,10,MAPH-10);
    if(ml>0.1)P.face=Math.atan2(mvy,mvx);
    resolveObst(P,P.r);
    checkDoor();
  }

  // 回血回蓝
  if(inVill(P.x,P.y)&&scene==='map'){
    P.hp=Math.min(P.maxHp,P.hp+12*dt);
    P.mp=Math.min(P.maxMp,P.mp+10*dt);
  }else{
    P.mp=Math.min(P.maxMp,P.mp+6*dt);
    P.hp=Math.min(P.maxHp,P.hp+1.5*dt);
  }

  // 怪物
  if(scene==='map'){
    for(var i=0;i<monsters.length;i++){
      var m=monsters[i];
      if(m.dead){
        m.deadT+=dt;
        if(m.deadT>6){
          m.dead=false;m.hp=m.maxHp;
          m.x=m.home.x+rnd(-90,90);
          m.y=m.home.y+rnd(-90,90);
          m.chase=false;
        }
        continue;
      }
      var d=dist(P.x,P.y,m.x,m.y);
      if(m.aggro>0&&d<m.aggro)m.chase=true;
      if(d>m.aggro*2.2)m.chase=false;
      if(m.chase&&d>m.r+P.r){
        var a=Math.atan2(P.y-m.y,P.x-m.x);
        m.x+=Math.cos(a)*m.speed*dt;
        m.y+=Math.sin(a)*m.speed*dt;
        m.face=a;
      }else if(!m.chase){
        // 游荡
        if(!m.wT||m.wT<0){m.wT=rnd(1,3);m.wA=rnd(0,Math.PI*2);}
        m.wT-=dt;
        m.x+=Math.cos(m.wA)*m.speed*0.28*dt;
        m.y+=Math.sin(m.wA)*m.speed*0.28*dt;
        var hd=dist(m.x,m.y,m.home.x,m.home.y);
        if(hd>150){m.wA=Math.atan2(m.home.y-m.y,m.home.x-m.x);}
      }
      m.x=clamp(m.x,0,MAPW);m.y=clamp(m.y,0,MAPH);
      resolveObst(m,m.r);
      // 攻击
      m.atkT-=dt;
      if(m.chase&&d<m.r+P.r+6&&m.atkT<=0){
        m.atkT=1.2;
        var dmg=Math.max(1,Math.round(m.atk-tDef()*0.4));
        P.hp-=dmg;
        float(P.x,P.y-P.r-8,'-'+dmg,'#f66');
        shake.t=0.12;shake.mag=4;
        if(P.hp<=0){P.hp=P.maxHp*0.5;P.mp=P.maxMp*0.5;P.x=860;P.y=660;float(P.x,P.y-40,'你倒下了…','#f88');}
      }
      // 玩家与怪物碰撞推开
      if(d<m.r+P.r&&d>0.001){
        var pa=Math.atan2(P.y-m.y,P.x-m.x);
        var ov=(m.r+P.r-d);
        P.x+=Math.cos(pa)*ov*0.5;
        P.y+=Math.sin(pa)*ov*0.5;
        m.x-=Math.cos(pa)*ov*0.5;
        m.y-=Math.sin(pa)*ov*0.5;
      }
    }
    // 怪物与怪物
    for(var a1=0;a1<monsters.length;a1++){
      if(monsters[a1].dead)continue;
      for(var a2=a1+1;a2<monsters.length;a2++){
        if(monsters[a2].dead)continue;
        var m1=monsters[a1],m2=monsters[a2];
        var dd=dist(m1.x,m1.y,m2.x,m2.y);
        var rr=m1.r+m2.r;
        if(dd<rr&&dd>0.001){
          var ang=Math.atan2(m2.y-m1.y,m2.x-m1.x);
          var ov2=(rr-dd)*0.5;
          m1.x-=Math.cos(ang)*ov2;m1.y-=Math.sin(ang)*ov2;
          m2.x+=Math.cos(ang)*ov2;m2.y+=Math.sin(ang)*ov2;
        }
      }
    }
    // 玩家与尸体碰撞
    for(var c=0;c<corpses.length;c++){
      var co=corpses[c];
      var cd=dist(P.x,P.y,co.x,co.y);
      if(cd<co.r+P.r&&cd>0.001){
        var ca=Math.atan2(P.y-co.y,P.x-co.x);
        var ov3=(co.r+P.r-cd);
        P.x+=Math.cos(ca)*ov3;
        P.y+=Math.sin(ca)*ov3;
      }
      co.life-=dt;
    }
    for(var ci=corpses.length-1;ci>=0;ci--){if(corpses[ci].life<=0)corpses.splice(ci,1);}
  }

  // 锁敌失效
  if(P.target&&(P.target.dead))P.target=null;
  if(P.target){
    var tdd=dist(P.x,P.y,P.target.x,P.target.y);
    if(tdd>500)P.target=null;
  }

  // 飘字 / 特效 / 抖屏
  for(var fi=floats.length-1;fi>=0;fi--){
    var f=floats[fi];
    f.life-=dt;f.y-=30*dt;
    if(f.life<=0)floats.splice(fi,1);
  }
  for(var xi=fx.length-1;xi>=0;xi--){
    fx[xi].life-=dt;
    if(fx[xi].life<=0)fx.splice(xi,1);
  }
  if(shake.t>0){shake.t-=dt;if(shake.t<=0)shake.mag=0;}

  netTick(dt);
}

/* ===================== 主循环 ===================== */
let lastT=0;
function loop(now){
  if(!lastT)lastT=now;
  var dt=Math.min(0.05,(now-lastT)/1000);
  lastT=now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

/* ===================== 进入界面 ===================== */
function showJoinUI(){
  var ui=document.getElementById('joinUI');
  if(!ui){startGame();return;}
  ui.style.display='block';
  var btn=document.getElementById('joinBtn');
  var solo=document.getElementById('soloBtn');
  if(btn)btn.onclick=function(){
    var nm=document.getElementById('nameInput');
    var rm=document.getElementById('roomInput');
    if(nm&&nm.value.trim())P.name=nm.value.trim();
    if(rm&&rm.value.trim())NET.room=rm.value.trim();
    ui.style.display='none';
    startGame();
    if(NET.room)connect();
  };
  if(solo)solo.onclick=function(){
    var nm=document.getElementById('nameInput');
    if(nm&&nm.value.trim())P.name=nm.value.trim();
    ui.style.display='none';
    startGame();
  };
}
function startGame(){
  layoutBtns();
  renderBag();
}
function boot(){
  resize();
  initObst();
  spawnMonsters();
  if(loadGame()){/* 已读档 */}
  renderBag();
  showJoinUI();
  requestAnimationFrame(loop);
}
boot();

/* 自动存档 */
setInterval(saveGame,5000);
window.addEventListener('beforeunload',saveGame);
document.addEventListener('visibilitychange',function(){if(document.hidden)saveGame();});
})();