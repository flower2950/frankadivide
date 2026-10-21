(function(){
'use strict';

/* ===== 联机配置 ===== */
var SUPA_URL='https://rdwhqsvovabtyjlxbagf.supabase.co';
var SUPA_KEY='sb_publishable_G_i8uDGtnjdGTGG73F2Rqg_hBiu-HuZ';

/* ===== 画布 ===== */
var cv=document.getElementById('cv');
var ctx=cv.getContext('2d');
var W=0,H=0,DPR=1,S=1,OX=0,OY=0;
var MAPW=1600,MAPH=1200,VIEWW=800,VIEWH=600;

function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=window.innerWidth;H=window.innerHeight;
  cv.width=Math.floor(W*DPR);cv.height=Math.floor(H*DPR);
  cv.style.width=W+'px';cv.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.imageSmoothingEnabled=false;
  S=Math.max(W/MAPW,H/MAPH);
  VIEWW=W/S;VIEWH=H/S;
  OX=0;OY=0;
  layoutBtns();
}
window.addEventListener('resize',resize);

/* ===== 贴图 ===== */
var mapImg=new Image();var mapReady=false;
mapImg.onload=function(){mapReady=true;};
mapImg.onerror=function(){};
mapImg.src='map.png';

var inImg=new Image();var inReady=false;
inImg.onload=function(){inReady=true;};
inImg.onerror=function(){};
inImg.src='in.png';

/* ===== 常量 ===== */
var SAVEKEY='frk_div_save_v1';
var VILL={x:610,y:430,w:560,h:430};
var ZONES=[
  {x:610,y:430,w:560,h:430,name:'村庄',safe:true},
  {x:80,y:120,w:560,h:400,name:'村外草地'},
  {x:760,y:120,w:560,h:340,name:'林泉野径'},
  {x:760,y:880,w:700,h:280,name:'林泉深处'}
];
var HOUSES=[
  {x:700,y:478,w:112,h:86,door:{x:44,y:86,w:24,h:20}},
  {x:848,y:478,w:128,h:76,door:{x:50,y:76,w:26,h:20}},
  {x:1000,y:480,w:100,h:84,door:{x:38,y:84,w:22,h:20}},
  {x:700,y:742,w:104,h:72,door:{x:40,y:72,w:24,h:20}},
  {x:960,y:740,w:132,h:74,door:{x:52,y:74,w:26,h:20}}
];

var scene='map';
var doorLock=0;
var curHouse=null;
var inPos={x:400,y:460,r:11,face:1.57};

/* ===== 技能 ===== */
var SK={
  slash:{name:'挥砍',cd:0.6,mp:0,range:34,arc:1.5,dmg:1},
  dash:{name:'突进斩',cd:4,mp:8,range:70,arc:1.1,dmg:1.3},
  spin:{name:'旋斩',cd:6,mp:12,range:42,arc:Math.PI*2,dmg:0.85},
  ult:{name:'林泉·斩',cd:10,mp:50,range:96,arc:1.9,dmg:2.2}
};
var SKK=['slash','dash','spin','ult'];

/* ===== 装备 ===== */
var QUAL=['#bbb','#4d4','#5af','#c6f'];
var QMUL=[1,1.6,2.4,3.4];
var EQTYPE={weapon:22,armor:8,ring:220};
var AFFIX=['锋锐','沉重','迅捷','守护','林泉'];
var bag=[];
var equip={weapon:null,armor:null,ring:null};

/* ===== 怪物 ===== */
var MON={
  beast:{hp:70,atk:9,def:2,aggro:190,speed:70,r:13,exp:26,drop:0.85,color:'#a34',name:'野兽'},
  deer:{hp:55,atk:7,def:2,aggro:0,speed:60,r:12,exp:14,drop:0.35,color:'#8a7',name:'鹿'}
};
var SPAWNS=[
  {x:300,y:320,type:'beast',n:4},
  {x:1080,y:290,type:'beast',n:3},
  {x:1100,y:1030,type:'deer',n:5}
];

/* ===== 玩家 ===== */
var P={name:'兰德',x:860,y:660,level:5,hp:220,maxHp:220,mp:100,maxMp:100,atk:22,def:8,speed:120,r:11,face:1.57,exp:0,target:null};

/* ===== 工具 ===== */
function rnd(a,b){return a+Math.random()*(b-a);}
function clamp(v,a,b){return v<a?a:(v>b?b:v);}
function dist(a,b,c,d){var dx=a-c,dy=b-d;return Math.sqrt(dx*dx+dy*dy);}
function inVill(x,y){return x>VILL.x&&x<VILL.x+VILL.w&&y>VILL.y&&y<VILL.y+VILL.h;}

/* ===== 飘字/抖屏/尸体/特效 ===== */
var floats=[],corpses=[],fx=[];
var shake={t:0,mag:0};
function floatAt(x,y,txt,color){floats.push({x:x,y:y,txt:txt,color:color||'#fff',life:0.9,max:0.9});}
function addFx(o){o.life=o.life||0.35;o.max=o.life;fx.push(o);}

/* ===== 装备逻辑 ===== */
function makeEquip(lv){
  var q=Math.random()<0.55?0:(Math.random()<0.65?1:(Math.random()<0.7?2:3));
  var keys=Object.keys(EQTYPE);
  var type=keys[Math.floor(Math.random()*keys.length)];
  var power=Math.floor((EQTYPE[type]*0.5+lv*3)*QMUL[q]);
  var affix=Math.random()<0.6?AFFIX[Math.floor(Math.random()*AFFIX.length)]:null;
  return {type:type,q:q,power:power,affix:affix,name:(affix?affix+'之':'')+(type==='weapon'?'刃':type==='armor'?'甲':'戒')};
}
function eqStat(s){
  var v=0;
  for(var k in equip){var e=equip[k];if(e&&e.type===s)v+=e.power;}
  return v;
}
function tAtk(){return P.atk+eqStat('weapon');}
function tDef(){return P.def+eqStat('armor')+eqStat('ring')*0.5;}
function renderBag(){
  var el=document.getElementById('bagList');
  if(!el)return;
  var h='';
  var names={weapon:'武器',armor:'护甲',ring:'戒指'};
  for(var k in equip){
    var e=equip[k];
    if(e)h+='<div style="color:'+QUAL[e.q]+'">'+names[k]+'：'+e.name+' +'+e.power+'</div>';
  }
  for(var i=0;i<bag.length;i++){
    var it=bag[i];
    h+='<div style="color:'+QUAL[it.q]+'" data-i="'+i+'" class="it">'+names[it.type]+'：'+it.name+' +'+it.power+'</div>';
  }
  el.innerHTML=h||'<div>空空如也</div>';
  var items=el.querySelectorAll('.it');
  for(var j=0;j<items.length;j++){
    items[j].onclick=function(){
      useItem(bag[+this.getAttribute('data-i')]);
    };
  }
}
function useItem(it){
  if(!it)return;
  var old=equip[it.type];
  equip[it.type]=it;
  var idx=bag.indexOf(it);
  if(idx>=0)bag.splice(idx,1);
  if(old)bag.push(old);
  renderBag();saveGame();
}

/* ===== 怪物生成 ===== */
var monsters=[];
function spawnMonsters(){
  monsters=[];
  for(var i=0;i<SPAWNS.length;i++){
    var s=SPAWNS[i];
    for(var j=0;j<s.n;j++){
      var m=MON[s.type];
      monsters.push({
        type:s.type,
        x:s.x+rnd(-90,90),y:s.y+rnd(-90,90),
        hp:m.hp,maxHp:m.hp,atk:m.atk,def:m.def,aggro:m.aggro,speed:m.speed,r:m.r,
        exp:m.exp,drop:m.drop,color:m.color,name:m.name,
        hx:s.x,hy:s.y,chase:false,atkT:0,dead:false,deadT:0,face:1,wT:0,wA:0
      });
    }
  }
}
function damageMon(m,dmg){
  if(m.dead)return;
  var real=Math.max(1,Math.round(dmg-m.def));
  m.hp-=real;
  floatAt(m.x,m.y-m.r-6,'-'+real,'#ff6');
  if(m.hp<=0){
    m.dead=true;m.deadT=0;
    corpses.push({x:m.x,y:m.y,r:m.r,type:m.type,color:m.color,life:6});
    gainExp(m.exp);
    if(Math.random()<m.drop){bag.push(makeEquip(P.level));renderBag();floatAt(m.x,m.y-24,'获得装备','#8f8');}
  }else{
    m.chase=true;
  }
}
function needExp(){return P.level*40;}
function gainExp(n){
  P.exp+=n;
  floatAt(P.x,P.y-30,'+'+n+' 经验','#8ff');
  while(P.exp>=needExp()){
    P.exp-=needExp();
    P.level++;
    P.maxHp+=12;P.maxMp+=4;P.atk+=2;P.def+=1;
    P.hp=P.maxHp;P.mp=P.maxMp;
    floatAt(P.x,P.y-50,'升级！Lv'+P.level,'#ff0');
  }
}

/* ===== 技能释放 ===== */
var SKILLCD={slash:0,dash:0,spin:0,ult:0};
function aimAng(){
  if(P.target&&!P.target.dead){
    return Math.atan2(P.target.y-P.y,P.target.x-P.x);
  }
  return P.face;
}
function castSkill(key,ang){
  var s=SK[key];
  if(!s)return;
  if(SKILLCD[key]>0)return;
  if(scene==='map'&&inVill(P.x,P.y)){floatAt(P.x,P.y-30,'村内无法出手','#f99');return;}
  if(P.mp<s.mp){floatAt(P.x,P.y-30,'法力不足','#9cf');return;}
  P.mp-=s.mp;
  SKILLCD[key]=s.cd;
  ang=(ang===undefined)?aimAng():ang;
  var hit=[];
  if(scene==='map'){
    for(var i=0;i<monsters.length;i++){
      var m=monsters[i];
      if(m.dead)continue;
      var d=dist(P.x,P.y,m.x,m.y);
      if(d>s.range+m.r)continue;
      var a=Math.atan2(m.y-P.y,m.x-P.x);
      var diff=Math.abs(((a-ang+Math.PI*3)%(Math.PI*2))-Math.PI);
      if(s.arc<Math.PI*2&&diff>s.arc/2)continue;
      hit.push(m);
    }
  }
  for(var k=0;k<hit.length;k++)damageMon(hit[k],tAtk()*s.dmg);
  if(s.arc>=Math.PI*2){
    addFx({kind:'ring',x:P.x,y:P.y,r:s.range,color:'#9df',life:0.3});
  }else{
    addFx({kind:'arc',x:P.x,y:P.y,ang:ang,r:s.range,arc:s.arc,color:'#9df',life:0.28});
  }
  for(var j=0;j<hit.length;j++){
    addFx({kind:'line',x:P.x,y:P.y,x2:hit[j].x,y2:hit[j].y,color:'#fff',life:0.15});
  }
  shake.t=0.15;shake.mag=5;
}

/* ===== 存档 ===== */
function snapData(){
  return {
    P:{name:P.name,x:P.x,y:P.y,level:P.level,hp:P.hp,maxHp:P.maxHp,mp:P.mp,maxMp:P.maxMp,atk:P.atk,def:P.def,exp:P.exp},
    equip:equip,bag:bag,monsters:monsters
  };
}
function applyData(d){
  if(!d)return;
  if(d.P){for(var k in d.P)P[k]=d.P[k];}
  if(d.equip)equip=d.equip;
  if(d.bag)bag=d.bag;
  if(d.monsters&&d.monsters.length)monsters=d.monsters;
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

/* ===== 联机 ===== */
var NET={on:false,room:'',me:'p'+Math.floor(Math.random()*99999),others:{},last:0,ch:null};
function connect(){
  if(typeof supabase==='undefined'||!supabase.createClient){
    floatAt(W/2,H/2,'联机库未加载','#f88');return;
  }
  try{
    var sb=supabase.createClient(SUPA_URL,SUPA_KEY);
    NET.ch=sb.channel('frk_'+NET.room,{config:{broadcast:{self:false}}});
    NET.ch.on('broadcast',{event:'pos'},function(msg){
      var p=msg.payload;
      if(!p||p.id===NET.me)return;
      NET.others[p.id]={x:p.x,y:p.y,dir:p.dir,hp:p.hp,name:p.name,t:Date.now()};
    });
    NET.ch.subscribe(function(st){
      if(st==='SUBSCRIBED')NET.on=true;
    });
  }catch(e){}
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

/* ===== 输入 ===== */
var keys={};
var JOY={active:false,id:-1,ox:0,oy:0,x:0,y:0,dx:0,dy:0,r:58};
var btns=[];
var pressBtn=null,pressT0=0,pressX=0,pressY=0,aimA=0;

function layoutBtns(){
  btns=[];
  if(W<H){
    // 竖屏兜底，仍给位置
  }
  var baseR=Math.min(W,H)*0.075;
  var r=clamp(baseR,30,44);
  var cx=W-r-16,cy=H-r-16;
  var gap=r*2.15;
  var list=[
    {id:'slash',label:'挥砍',r:r,x:cx-gap,y:cy},
    {id:'dash',label:'突进',r:r,x:cx,y:cy-gap},
    {id:'spin',label:'旋斩',r:r,x:cx,y:cy},
    {id:'ult',label:'林泉',r:r,x:cx-gap*0.7,y:cy-gap*0.7}
  ];
  /* 右下角摆成菱形四格 */
  list[0].x=cx-gap;list[0].y=cy;
  list[1].x=cx;list[1].y=cy-gap;
  list[2].x=cx;list[2].y=cy;
  list[3].x=cx-gap*1.55;list[3].y=cy-gap*0.55;
  for(var i=0;i<list.length;i++)btns.push(list[i]);
  btns.push({id:'lock',label:'锁敌',r:Math.max(26,r*0.72),x:W-Math.max(26,r*0.72)-12,y:Math.max(26,r*0.72)+82});
  btns.push({id:'back',label:'备份',r:Math.max(24,r*0.6),x:Math.max(24,r*0.6)+12,y:H-Math.max(24,r*0.6)-12});
}
function inJoyArea(x,y){
  if(btns.length){
    for(var i=0;i<btns.length;i++){
      if(dist(x,y,btns[i].x,btns[i].y)<btns[i].r+14)return false;
    }
  }
  return x<W*0.45&&y>H*0.4;
}
function findBtn(x,y){
  for(var i=0;i<btns.length;i++){
    if(dist(x,y,btns[i].x,btns[i].y)<btns[i].r+10)return btns[i];
  }
  return null;
}
function autoLock(){
  var best=null,bd=1e9;
  for(var i=0;i<monsters.length;i++){
    var m=monsters[i];
    if(m.dead)continue;
    var d=dist(P.x,P.y,m.x,m.y);
    if(d<bd){bd=d;best=m;}
  }
  P.target=best;
  if(best)floatAt(best.x,best.y-best.r-20,'锁定','#f66');
}
function onDown(id,x,y){
  if(inJoyArea(x,y)){
    JOY.active=true;JOY.id=id;JOY.ox=x;JOY.oy=y;JOY.x=x;JOY.y=y;JOY.dx=0;JOY.dy=0;
    return;
  }
  var b=findBtn(x,y);
  if(b){
    if(b.id==='lock'){autoLock();return;}
    if(b.id==='back'){showBackup();return;}
    pressBtn=b;pressT0=performance.now();pressX=x;pressY=y;
    if(b.id in SK)aimA=P.face;
    return;
  }
  if(scene==='map')P.target=null;
}
function onMove(id,x,y){
  if(JOY.active&&JOY.id===id){
    var dx=x-JOY.ox,dy=y-JOY.oy;
    var d=Math.sqrt(dx*dx+dy*dy);
    var m=JOY.r;
    if(d>m){dx=dx/d*m;dy=dy/d*m;d=m;}
    JOY.x=JOY.ox+dx;JOY.y=JOY.oy+dy;
    JOY.dx=(d>2)?dx/m:0;JOY.dy=(d>2)?dy/m:0;
    return;
  }
  if(pressBtn&&pressBtn.id in SK){
    aimA=Math.atan2(y-pressY,x-pressX);
  }
}
function onUp(id,x,y){
  if(JOY.active&&JOY.id===id){
    JOY.active=false;JOY.id=-1;JOY.dx=0;JOY.dy=0;
    return;
  }
  if(!pressBtn)return;
  var b=pressBtn;pressBtn=null;
  var held=(performance.now()-pressT0)/1000;
  if(!(b.id in SK))return;
  var ang=(held>0.18)?aimA:aimAng();
  castSkill(b.id,ang);
}
function cancelPress(){pressBtn=null;}
function showBackup(){
  var code='FRK1:'+encodeURIComponent(JSON.stringify(snapData()));
  var ui=document.getElementById('backupUI');
  if(ui){
    ui.style.display='block';
    var ta=document.getElementById('bkCode');
    if(ta){ta.value=code;ta.select();}
    return;
  }
  copyText(code);
  floatAt(W/2,H/2,'备份码已复制','#8f8');
}
function copyText(t){
  try{
    var ta=document.createElement('textarea');
    ta.value=t;ta.style.position='fixed';ta.style.left='-9999px';
    document.body.appendChild(ta);ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }catch(e){}
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

window.addEventListener('keydown',function(e){
  var k=e.key.toLowerCase();
  keys[k]=true;
  if(k===' '){e.preventDefault();castSkill('slash',aimAng());}
  if(k==='l')autoLock();
  if(k>='1'&&k<='4')castSkill(SKK[+k-1],aimAng());
  if(k==='b')showBackup();
});
window.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=false;});

/* ===== 障碍 ===== */
var OBST=[];
function initObst(){
  OBST=[];
  var t=8;
  for(var i=0;i<HOUSES.length;i++){
    var h=HOUSES[i],d=h.door;
    OBST.push({x:h.x,y:h.y,w:h.w,h:t});
    OBST.push({x:h.x,y:h.y+h.h-t,w:d.x,h:t});
    OBST.push({x:h.x+d.x+d.w,y:h.y+h.h-t,w:h.w-d.x-d.w,h:t});
    OBST.push({x:h.x,y:h.y,w:t,h:h.h});
    OBST.push({x:h.x+h.w-t,y:h.y,w:t,h:h.h});
  }
}
function pushOutR(o,cx,cy,r){
  var nx=clamp(cx,o.x,o.x+o.w);
  var ny=clamp(cy,o.y,o.y+o.h);
  var dx=cx-nx,dy=cy-ny;
  var d=Math.sqrt(dx*dx+dy*dy);
  if(d>=r)return null;
  if(d<0.0001){
    var l=cx-o.x,rt=o.x+o.w-cx,tp=cy-o.y,bt=o.y+o.h-cy;
    var m=Math.min(l,rt,tp,bt);
    if(m===l)return{x:o.x-r,y:cy};
    if(m===rt)return{x:o.x+o.w+r,y:cy};
    if(m===tp)return{x:cx,y:o.y-r};
    return{x:cx,y:o.y+o.h+r};
  }
  var kf=(r-d)/d;
  return{x:cx+dx*kf,y:cy+dy*kf};
}
function resolveObst(en,r){
  for(var i=0;i<OBST.length;i++){
    var res=pushOutR(OBST[i],en.x,en.y,r);
    if(res){en.x=res.x;en.y=res.y;}
  }
}
function tryDoor(dt){
  if(doorLock>0){doorLock-=dt;return;}
  for(var i=0;i<HOUSES.length;i++){
    var h=HOUSES[i],d=h.door;
    if(P.x>h.x+d.x&&P.x<h.x+d.x+d.w&&P.y>h.y+h.h-10&&P.y<h.y+h.h+16){
      curHouse=h;
      scene='in';
      inPos.x=W/2;inPos.y=H*0.78;inPos.face=P.face;
      doorLock=1.2;
      return;
    }
  }
}
function checkExit(dt){
  if(doorLock>0)doorLock-=dt;
  if(inPos.y>H-40){
    scene='map';
    if(curHouse){
      var d=curHouse.door;
      P.x=curHouse.x+d.x+d.w/2;
      P.y=curHouse.y+curHouse.h+30;
    }
    curHouse=null;doorLock=1.2;
  }
}

/* ===== 世界坐标 ↔ 屏幕坐标 ===== */
function w2sX(x){return x*S;}
function w2sY(y){return y*S;}

/* ===== 绘制工具 ===== */
function drawFloats(sx,sy){
  ctx.textAlign='center';
  ctx.font='bold 15px sans-serif';
  for(var i=0;i<floats.length;i++){
    var f=floats[i];
    ctx.globalAlpha=clamp(f.life/f.max,0,1);
    ctx.fillStyle=f.color;
    ctx.fillText(f.txt,sx(f.x),sy(f.y));
  }
  ctx.globalAlpha=1;
}
function drawFx(sx,sy){
  for(var i=0;i<fx.length;i++){
    var f=fx[i];
    var a=clamp(f.life/f.max,0,1);
    ctx.globalAlpha=a;
    if(f.kind==='arc'){
      ctx.strokeStyle=f.color;ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(sx(f.x),sy(f.y),f.r*S,f.ang-f.arc/2,f.ang+f.arc/2);ctx.stroke();
    }else if(f.kind==='ring'){
      ctx.strokeStyle=f.color;ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(sx(f.x),sy(f.y),f.r*S,0,Math.PI*2);ctx.stroke();
    }else if(f.kind==='line'){
      ctx.strokeStyle=f.color;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(sx(f.x),sy(f.y));ctx.lineTo(sx(f.x2),sy(f.y2));ctx.stroke();
    }else if(f.kind==='hit'){
      ctx.fillStyle='#fff';
      ctx.beginPath();ctx.arc(sx(f.x),sy(f.y),10*a*S,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
}
function drawCorpses(){
  for(var i=0;i<corpses.length;i++){
    var c=corpses[i];
    ctx.globalAlpha=clamp(c.life/6,0,1)*0.75;
    ctx.fillStyle=c.color;
    ctx.beginPath();
    ctx.ellipse(w2sX(c.x),w2sY(c.y),c.r*1.2*S,c.r*0.6*S,0,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
  }
}

/* ===== 角色绘制 ===== */
function drawHuman(x,y,face,color,scale){
  ctx.save();
  ctx.translate(x,y);
  scale=scale||1;
  ctx.scale(scale,scale);
  var bob=Math.sin(walkT*10)*1.5*((JOY.active&&(JOY.dx||JOY.dy))?1:0);
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath();ctx.ellipse(0,10,12,5,0,0,Math.PI*2);ctx.fill();
  var flip=Math.cos(face)<0?-1:1;
  ctx.scale(flip,1);
  ctx.fillStyle=color;ctx.fillRect(-7,-14+bob,14,16);
  ctx.fillStyle='#f2c9a0';ctx.fillRect(-6,-26+bob,12,12);
  ctx.fillStyle='#3a2a1a';ctx.fillRect(-6,-27+bob,12,4);
  ctx.fillStyle='#222';ctx.fillRect(1,-21+bob,2,2);
  ctx.fillStyle='#2b2b40';
  ctx.fillRect(-6,2+bob,5,9);
  ctx.fillRect(1,2+bob,5,9);
  ctx.fillStyle='#ddd';ctx.fillRect(8,-10+bob,2,16);
  ctx.fillStyle='#8a6';ctx.fillRect(7,-2+bob,4,3);
  ctx.restore();
}
function drawBeast(x,y,m){
  ctx.save();ctx.translate(x,y);
  var r=m.r*S;
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath();ctx.ellipse(0,r*0.85,r,r*0.4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=m.color;
  ctx.beginPath();ctx.ellipse(0,0,r,r*0.8,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(-r*0.6,-r*0.6);ctx.lineTo(-r*0.3,-r*1.4);ctx.lineTo(0,-r*0.6);ctx.fill();
  ctx.beginPath();ctx.moveTo(r*0.6,-r*0.6);ctx.lineTo(r*0.3,-r*1.4);ctx.lineTo(0,-r*0.6);ctx.fill();
  ctx.fillStyle='#ff2';ctx.fillRect(-r*0.4,-r*0.3,r*0.25,r*0.25);ctx.fillRect(r*0.15,-r*0.3,r*0.25,r*0.25);
  ctx.restore();
}
function drawDeer(x,y,m){
  ctx.save();ctx.translate(x,y);
  var r=m.r*S;
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath();ctx.ellipse(0,r*0.85,r,r*0.4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=m.color;
  ctx.beginPath();ctx.ellipse(0,0,r*0.9,r*0.75,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(r*0.6,-r*0.6,r*0.45,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#cba';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(r*0.5,-r*0.9);ctx.lineTo(r*0.2,-r*1.6);ctx.stroke();
  ctx.beginPath();ctx.moveTo(r*0.8,-r*0.9);ctx.lineTo(r*1.1,-r*1.5);ctx.stroke();
  ctx.fillStyle='#222';ctx.fillRect(r*0.65,-r*0.65,2,2);
  ctx.restore();
}

/* ===== 地图场景 ===== */
function drawMap(){
  if(mapReady){
    ctx.drawImage(mapImg,0,0,MAPW,MAPH,0,0,W,H);
  }else{
    ctx.fillStyle='#2b4a2b';ctx.fillRect(0,0,W,H);
  }
  drawCorpses();
  for(var i=0;i<monsters.length;i++){
    var m=monsters[i];
    if(m.dead)continue;
    if(m.type==='beast')drawBeast(w2sX(m.x),w2sY(m.y),m);
    else drawDeer(w2sX(m.x),w2sY(m.y),m);
    if(m.hp<m.maxHp){
      var bw=32*S;
      ctx.fillStyle='#300';ctx.fillRect(w2sX(m.x)-bw/2,w2sY(m.y)-m.r*S-12, bw,4);
      ctx.fillStyle='#e44';ctx.fillRect(w2sX(m.x)-bw/2,w2sY(m.y)-m.r*S-12,bw*(m.hp/m.maxHp),4);
    }
    if(m===P.target){
      ctx.strokeStyle='#f33';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(w2sX(m.x),w2sY(m.y),(m.r+8)*S,0,Math.PI*2);ctx.stroke();
    }
  }
  for(var k in NET.others){
    var o=NET.others[k];
    drawHuman(w2sX(o.x),w2sY(o.y),o.dir||0,'#fc6',S);
    ctx.fillStyle='#fff';ctx.font='12px sans-serif';ctx.textAlign='center';
    ctx.fillText(o.name||'?',w2sX(o.x),w2sY(o.y)-24*S);
  }
  drawHuman(w2sX(P.x),w2sY(P.y),P.face,'#4af',S);
  drawFx(w2sX,w2sY);
  drawFloats(w2sX,w2sY);
}

/* ===== 室内 ===== */
function drawRoom(){
  if(inReady){
    ctx.drawImage(inImg,0,0,W,H);
  }else{
    ctx.fillStyle='#3a2a1c';ctx.fillRect(0,0,W,H);
    for(var y=0;y<H;y+=32){
      for(var x=0;x<W;x+=64){
        ctx.fillStyle=((x/64+y/32)%2===0)?'#4a3624':'#42301f';
        ctx.fillRect(x,y,64,32);
      }
    }
  }
  ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(0,0,W,44);
  ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.textAlign='left';
  ctx.fillText('室内 · 走到下方出口离开',16,28);
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,H-60,W,60);
  ctx.fillStyle='#ffd';ctx.textAlign='center';ctx.fillText('▼ 出口',W/2,H-24);
  drawHuman(inPos.x,inPos.y,inPos.face,'#4af',1.4);
  for(var i=0;i<floats.length;i++){
    var f=floats[i];
    ctx.globalAlpha=clamp(f.life/f.max,0,1);
    ctx.fillStyle=f.color;
    ctx.fillText(f.txt,f.x,f.y);
  }
  ctx.globalAlpha=1;
}

/* ===== HUD ===== */
function drawHUD(){
  if(pressBtn&&(pressBtn.id in SK)&&scene==='in'){
    /* 室内无目标，不画预览 */
  }
  if(pressBtn&&(pressBtn.id in SK)&&scene==='map'){
    var s=SK[pressBtn.id];
    ctx.save();
    var px=w2sX(P.x),py=w2sY(P.y);
    ctx.fillStyle='rgba(120,220,255,0.18)';
    ctx.strokeStyle='rgba(120,220,255,0.7)';
    ctx.lineWidth=2;
    var rr=s.range*S;
    if(s.arc>=Math.PI*2){
      ctx.beginPath();ctx.arc(px,py,rr,0,Math.PI*2);ctx.fill();ctx.stroke();
    }else{
      ctx.beginPath();ctx.moveTo(px,py);
      ctx.arc(px,py,rr,aimA-s.arc/2,aimA+s.arc/2);ctx.closePath();
      ctx.fill();ctx.stroke();
    }
    ctx.restore();
  }

  ctx.fillStyle='rgba(0,0,0,0.55)';
  ctx.fillRect(0,0,W,64);
  var bw=Math.min(220,W*0.32);
  ctx.fillStyle='#511';ctx.fillRect(12,12,bw,14);
  ctx.fillStyle='#e34';ctx.fillRect(12,12,bw*clamp(P.hp/P.maxHp,0,1),14);
  ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.strokeRect(12,12,bw,14);
  ctx.fillStyle='#114';ctx.fillRect(12,32,bw,10);
  ctx.fillStyle='#48c';ctx.fillRect(12,32,bw*clamp(P.mp/P.maxMp,0,1),10);
  ctx.strokeRect(12,32,bw,10);
  ctx.fillStyle='#ffd24a';ctx.fillRect(12,44,bw,4);
  ctx.fillStyle='#000';ctx.fillRect(12,44,bw*clamp(P.exp/needExp(),0,1),4);
  ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';ctx.textAlign='left';
  ctx.fillText(P.name+' Lv'+P.level,12,70);

  var zone='';
  if(scene==='in')zone='室内';
  else{
    for(var i=0;i<ZONES.length;i++){
      var z=ZONES[i];
      if(P.x>z.x&&P.x<z.x+z.w&&P.y>z.y&&P.y<z.y+z.h){zone=z.name;break;}
    }
  }
  ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='14px sans-serif';
  ctx.fillText(zone,W/2,28);
  if(NET.on){
    var n=1;for(var k in NET.others)n++;
    ctx.textAlign='right';ctx.fillStyle='#8f8';ctx.font='13px sans-serif';
    ctx.fillText('房间 '+NET.room+' · '+n+'人',W-12,28);
  }

  if(JOY.active){
    ctx.strokeStyle='rgba(255,255,255,0.35)';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(JOY.ox,JOY.oy,JOY.r,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.45)';
    ctx.beginPath();ctx.arc(JOY.x,JOY.y,26,0,Math.PI*2);ctx.fill();
  }

  ctx.textAlign='center';
  for(var b=0;b<btns.length;b++){
    var bt=btns[b];
    if(bt.id in SK){
      var cd=SKILLCD[bt.id],ready=cd<=0;
      ctx.beginPath();ctx.arc(bt.x,bt.y,bt.r,0,Math.PI*2);
      ctx.fillStyle=ready?'rgba(40,90,140,0.75)':'rgba(50,50,50,0.75)';
      ctx.fill();
      ctx.strokeStyle=ready?'rgba(140,220,255,0.9)':'rgba(120,120,120,0.7)';
      ctx.lineWidth=2;ctx.stroke();
      if(!ready){
        ctx.beginPath();ctx.moveTo(bt.x,bt.y);
        ctx.arc(bt.x,bt.y,bt.r,-Math.PI/2,-Math.PI/2+Math.PI*2*(cd/SK[bt.id].cd));
        ctx.closePath();ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fill();
      }
      ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';
      ctx.fillText(SK[bt.id].name,bt.x,bt.y+4);
    }else{
      ctx.beginPath();ctx.arc(bt.x,bt.y,bt.r,0,Math.PI*2);
      ctx.fillStyle='rgba(60,60,60,0.7)';ctx.fill();
      ctx.strokeStyle='rgba(180,180,180,0.7)';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#fff';ctx.font='12px sans-serif';
      ctx.fillText(bt.label,bt.x,bt.y+4);
    }
  }
  ctx.textAlign='left';
}

/* ===== 主绘制 ===== */
function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.save();
  if(shake.t>0)ctx.translate(rnd(-shake.mag,shake.mag),rnd(-shake.mag,shake.mag));
  if(scene==='in')drawRoom();
  else drawMap();
  ctx.restore();
  drawHUD();
}

/* ===== 更新 ===== */
var walkT=0;
function update(dt){
  walkT+=dt;
  for(var k in SKILLCD)if(SKILLCD[k]>0)SKILLCD[k]=Math.max(0,SKILLCD[k]-dt);

  var mvx=0,mvy=0;
  if(JOY.active){mvx=JOY.dx;mvy=JOY.dy;}
  if(keys['w']||keys['arrowup'])mvy-=1;
  if(keys['s']||keys['arrowdown'])mvy+=1;
  if(keys['a']||keys['arrowleft'])mvx-=1;
  if(keys['d']||keys['arrowright'])mvx+=1;
  var ml=Math.sqrt(mvx*mvx+mvy*mvy);
  if(ml>1){mvx/=ml;mvy/=ml;ml=1;}

  if(scene==='in'){
    inPos.x+=mvx*P.speed*dt*1.1;
    inPos.y+=mvy*P.speed*dt*1.1;
    inPos.x=clamp(inPos.x,30,W-30);
    inPos.y=clamp(inPos.y,60,H-10);
    if(ml>0.1)inPos.face=Math.atan2(mvy,mvx);
    checkExit(dt);
  }else{
    P.x+=mvx*P.speed*dt;
    P.y+=mvy*P.speed*dt;
    P.x=clamp(P.x,10,MAPW-10);
    P.y=clamp(P.y,10,MAPH-10);
    if(ml>0.1)P.face=Math.atan2(mvy,mvx);
    resolveObst(P,P.r);
    tryDoor(dt);
  }

  if(scene==='map'&&inVill(P.x,P.y)){
    P.hp=Math.min(P.maxHp,P.hp+12*dt);
    P.mp=Math.min(P.maxMp,P.mp+10*dt);
  }else{
    P.mp=Math.min(P.maxMp,P.mp+6*dt);
    P.hp=Math.min(P.maxHp,P.hp+1.5*dt);
  }

  if(scene==='map'){
    for(var i=0;i<monsters.length;i++){
      var m=monsters[i];
      if(m.dead){
        m.deadT+=dt;
        if(m.deadT>6){
          m.dead=false;m.hp=m.maxHp;
          m.x=m.hx+rnd(-90,90);m.y=m.hy+rnd(-90,90);
          m.chase=false;
        }
        continue;
      }
      var d=dist(P.x,P.y,m.x,m.y);
      if(m.aggro>0&&d<m.aggro)m.chase=true;
      if(d>m.aggro*2.2+120)m.chase=false;
      if(m.chase&&d>m.r+P.r){
        var a=Math.atan2(P.y-m.y,P.x-m.x);
        m.x+=Math.cos(a)*m.speed*dt;
        m.y+=Math.sin(a)*m.speed*dt;
        m.face=a;
      }else if(!m.chase){
        if(m.wT<=0){m.wT=rnd(1,3);m.wA=rnd(0,Math.PI*2);}
        m.wT-=dt;
        m.x+=Math.cos(m.wA)*m.speed*0.28*dt;
        m.y+=Math.sin(m.wA)*m.speed*0.28*dt;
        if(dist(m.x,m.y,m.hx,m.hy)>150)m.wA=Math.atan2(m.hy-m.y,m.hx-m.x);
      }
      m.x=clamp(m.x,0,MAPW);m.y=clamp(m.y,0,MAPH);
      resolveObst(m,m.r);
      m.atkT-=dt;
      if(m.chase&&d<m.r+P.r+8&&m.atkT<=0){
        m.atkT=1.2;
        var dmg=Math.max(1,Math.round(m.atk-tDef()*0.4));
        P.hp-=dmg;
        floatAt(P.x,P.y-P.r-8,'-'+dmg,'#f66');
        shake.t=0.12;shake.mag=4;
        if(P.hp<=0){
          P.hp=P.maxHp*0.5;P.mp=P.maxMp*0.5;P.x=860;P.y=660;
          floatAt(P.x,P.y-40,'你倒下了…','#f88');
        }
      }
      if(d<m.r+P.r&&d>0.001){
        var pa=Math.atan2(P.y-m.y,P.x-m.x);
        var ov=(m.r+P.r-d)*0.5;
        P.x+=Math.cos(pa)*ov;P.y+=Math.sin(pa)*ov;
        m.x-=Math.cos(pa)*ov;m.y-=Math.sin(pa)*ov;
      }
    }
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
    for(var c=corpses.length-1;c>=0;c--){
      var co=corpses[c];
      var cd=dist(P.x,P.y,co.x,co.y);
      if(cd<co.r+P.r&&cd>0.001){
        var ca=Math.atan2(P.y-co.y,P.x-co.x);
        var ov3=co.r+P.r-cd;
        P.x+=Math.cos(ca)*ov3;P.y+=Math.sin(ca)*ov3;
      }
      co.life-=dt;
      if(co.life<=0)corpses.splice(c,1);
    }
  }

  if(P.target&&P.target.dead)P.target=null;

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

/* ===== 主循环 ===== */
var lastT=0;
function loop(now){
  if(!lastT)lastT=now;
  var dt=Math.min(0.05,(now-lastT)/1000);
  lastT=now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

/* ===== 进入界面 ===== */
function showJoinUI(){
  var ui=document.getElementById('joinUI');
  if(!ui){startGame();return;}
  ui.style.display='block';
  var jb=document.getElementById('joinBtn');
  var sb=document.getElementById('soloBtn');
  if(jb)jb.onclick=function(){
    var nm=document.getElementById('nameInput');
    var rm=document.getElementById('roomInput');
    if(nm&&nm.value.trim())P.name=nm.value.trim();
    if(rm&&rm.value.trim())NET.room=rm.value.trim();
    ui.style.display='none';
    startGame();
    if(NET.room)connect();
  };
  if(sb)sb.onclick=function(){
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

/* ===== 启动 ===== */
resize();
initObst();
spawnMonsters();
loadGame();
renderBag();
showJoinUI();
requestAnimationFrame(loop);

setInterval(saveGame,5000);
window.addEventListener('beforeunload',saveGame);
document.addEventListener('visibilitychange',function(){if(document.hidden)saveGame();});
})();