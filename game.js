(function(){
var cv=document.getElementById('cv'),ctx=cv.getContext('2d');
var DPR=Math.min(window.devicePixelRatio||1,2);
var W=0,H=0;
function fit(){W=window.innerWidth;H=window.innerHeight;
cv.width=Math.floor(W*DPR);cv.height=Math.floor(H*DPR);
cv.style.width=W+'px';cv.style.height=H+'px';
ctx.setTransform(DPR,0,0,DPR,0,0);}
fit();
window.addEventListener('resize',fit);
window.addEventListener('orientationchange',function(){setTimeout(fit,300);});

var MAPW=1600,MAPH=1200;

var ZONES=[
 {name:'村庄',x:700,y:500,w:400,h:340,safe:true,color:'#4a5a3a'},
 {name:'村外草地',x:80,y:120,w:560,h:400,safe:false,color:'#3f5a32'},
 {name:'林泉野径',x:760,y:120,w:560,h:340,safe:false,color:'#39512e'},
 {name:'林泉深处',x:760,y:880,w:700,h:280,safe:false,color:'#31472b'}
];
function zoneAt(x,y){for(var i=0;i<ZONES.length;i++){var z=ZONES[i];
if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h)return z;}return null;}

var SPAWN=[
 {x:300,y:320,type:'beast',n:4},
 {x:1080,y:290,type:'beast',n:3},
 {x:1100,y:1030,type:'deer',n:5}
];

var P={x:860,y:660,r:11,face:0,level:5,exp:0,expNeed:200,
hp:220,maxHp:220,mp:100,maxMp:100,atk:22,def:8,speed:120,dead:false,
t:null,a:null,r:null};
var EQ={w:null,a:null,r:null};
var BAG=[];
var QUAL=[{n:'普通',c:'#bbb',m:1},{n:'优秀',c:'#4d4',m:1.6},{n:'精良',c:'#5af',m:2.4},{n:'史诗',c:'#c6f',m:3.4}];
var NAMEW=['短剑','长刃','裂风刀'],NAMEA=['皮甲','锁甲','林泉护肩'],NAMER=['指环','护符','林地徽记'];
var AFFIX=['锋锐','沉重','迅捷','守护','林泉'];

var SK={
 slash:{n:'挥砍',cd:0.6,mp:0,range:34,arc:1.5,dmg:1.0},
 dash:{n:'突进斩',cd:4.0,mp:8,range:70,arc:1.1,dmg:1.3},
 spin:{n:'旋斩',cd:6.0,mp:12,range:42,arc:Math.PI*2,dmg:0.85},
 ult:{n:'林泉·斩',cd:10.0,mp:50,range:96,arc:1.9,dmg:2.2}
};
var CD={slash:0,dash:0,spin:0,ult:0};

var MS=[];
function makeMon(sp){
 for(var i=0;i<sp.n;i++){
  var beast=sp.type==='beast';
  MS.push({
   x:sp.x+(Math.random()-0.5)*170,
   y:sp.y+(Math.random()-0.5)*130,
   hx:sp.x,hy:sp.y,
   r:beast?13:12,hostile:beast,
   maxHp:beast?70:55,hp:beast?70:55,
   atk:beast?9:7,def:2,speed:beast?70:60,
   exp:beast?26:14,drop:beast?0.85:0.35,
   aggro:beast?190:0,dead:0,alert:0,hurt:0,hitCd:0,
   wand:Math.random()*6.28,wtime:1+Math.random()*2
  });
 }
}
for(var i=0;i<SPAWN.length;i++)makeMon(SPAWN[i]);

var LOCK=null;
var FLOAT=[];

/* ---------- 碰撞 ---------- */
function separate(){
 /* 怪 vs 怪 */
 for(var i=0;i<MS.length;i++){
  var a=MS[i];if(a.dead)continue;
  for(var j=i+1;j<MS.length;j++){
   var b=MS[j];if(b.dead)continue;
   var dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;
   if(d>0&&d<min){
    var push=(min-d)*0.5;
    dx/=d;dy/=d;
    a.x-=dx*push;a.y-=dy*push;
    b.x+=dx*push;b.y+=dy*push;
   }else if(d===0){a.x-=0.5;b.x+=0.5;}
  }
 }
 /* 怪 vs 玩家 */
 for(var k=0;k<MS.length;k++){
  var m=MS[k];if(m.dead)continue;
  var dx2=P.x-m.x,dy2=P.y-m.y,d2=Math.hypot(dx2,dy2),mn2=P.r+m.r;
  if(d2>0&&d2<mn2){
   var p2=mn2-d2;
   dx2/=d2;dy2/=d2;
   P.x+=dx2*p2*0.9;P.y+=dy2*p2*0.9;
   m.x-=dx2*p2*0.1;m.y-=dy2*p2*0.1;
  }
 }
 P.x=Math.max(20,Math.min(MAPW-20,P.x));
 P.y=Math.max(20,Math.min(MAPH-20,P.y));
}

/* ---------- 输入 ---------- */
var joy={id:null,ox:0,oy:0,x:0,y:0,act:false};
var keys={};
window.addEventListener('keydown',function(e){keys[e.key.toLowerCase()]=1;});
window.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=0;});

var btns=[],lockBtn={x:0,y:0,r:30,held:0};
var jinx=110,jiny=0;
function layoutBtn(){
 jinx=110;jiny=H-110;
 lockBtn={x:200,y:H-110,r:30};
 btns=[
  {key:'slash',x:W-70,y:H-70,r:34},
  {key:'dash',x:W-150,y:H-110,r:34},
  {key:'spin',x:W-70,y:H-160,r:34},
  {key:'ult',x:W-160,y:H-40,r:34}
 ];
}
layoutBtn();
window.addEventListener('resize',layoutBtn);
window.addEventListener('orientationchange',function(){setTimeout(layoutBtn,300);});

function inCircle(px,py,c){var dx=px-c.x,dy=py-c.y;return dx*dx+dy*dy<=c.r*c.r;}

var camx=0,camy=0;
function toWorld(sx,sy){return {x:sx+camx,y:sy+camy};}

var preview=null;

/* 自动锁敌：最近的活怪（范围 420） */
function autoLock(){
 var best=null,bd=1e9;
 for(var i=0;i<MS.length;i++){
  var m=MS[i];if(m.dead)continue;
  var d=Math.hypot(m.x-P.x,m.y-P.y);
  if(d<420&&d<bd){bd=d;best=m;}
 }
 if(best){
  LOCK=best;
  P.face=Math.atan2(best.y-P.y,best.x-P.x);
 }else LOCK=null;
}

function onDown(x,y){
 for(var b=0;b<btns.length;b++){
  if(inCircle(x,y,btns[b])){preview={key:btns[b].key};useSkill(btns[b].key);return true;}
 }
 if(inCircle(x,y,lockBtn)){lockBtn.held=1;autoLock();return true;}
 return false;
}
function onUp(){preview=null;lockBtn.held=0;}

cv.addEventListener('touchstart',function(e){
 e.preventDefault();
 for(var i=0;i<e.changedTouches.length;i++){
  var t=e.changedTouches[i],x=t.clientX,y=t.clientY;
  if(onDown(x,y))continue;
  if(x<W*0.42&&y>H*0.32&&joy.id===null){
   joy.id=t.identifier;joy.ox=x;joy.oy=y;joy.x=x;joy.y=y;joy.act=true;continue;
  }
  var w=toWorld(x,y);
  var best=null,bd=1e9;
  for(var m=0;m<MS.length;m++){
   var mo=MS[m];if(mo.dead)continue;
   var dx=w.x-mo.x,dy=w.y-mo.y,dd=dx*dx+dy*dy;
   if(dd<40*40&&dd<bd){bd=dd;best=mo;}
  }
  if(best)LOCK=best;
  else if(Math.hypot(w.x-P.x,w.y-P.y)>60)LOCK=null;
 }
},false);

cv.addEventListener('touchmove',function(e){
 e.preventDefault();
 for(var i=0;i<e.changedTouches.length;i++){
  var t=e.changedTouches[i];
  if(t.identifier===joy.id){joy.x=t.clientX;joy.y=t.clientY;}
 }
},false);

cv.addEventListener('touchend',function(e){
 for(var i=0;i<e.changedTouches.length;i++){
  var t=e.changedTouches[i];
  if(t.identifier===joy.id){joy.id=null;joy.act=false;}
 }
 onUp();
},false);
cv.addEventListener('touchcancel',function(){joy.id=null;joy.act=false;onUp();},false);

cv.addEventListener('mousedown',function(e){
 var x=e.clientX,y=e.clientY;
 if(onDown(x,y))return;
 var w=toWorld(x,y),best=null,bd=1e9;
 for(var m=0;m<MS.length;m++){var mo=MS[m];if(mo.dead)continue;
  var dx=w.x-mo.x,dy=w.y-mo.y,dd=dx*dx+dy*dy;
  if(dd<40*40&&dd<bd){bd=dd;best=mo;}}
 if(best)LOCK=best;else LOCK=null;
});

/* ---------- 技能 ---------- */
function inArc(tx,ty,sk){
 var dx=tx-P.x,dy=ty-P.y,dist=Math.hypot(dx,dy);
 if(dist>sk.range)return false;
 if(sk.arc>=Math.PI*2)return true;
 var ang=Math.atan2(dy,dx);
 var d=Math.abs(((ang-P.face+Math.PI*3)%(Math.PI*2))-Math.PI);
 return d<=sk.arc/2;
}
function useSkill(k){
 if(P.dead)return;
 var sk=SK[k];
 if(CD[k]>0||P.mp<sk.mp)return;
 CD[k]=sk.cd;P.mp-=sk.mp;
 P.a={key:k,t:0.28};
 for(var i=0;i<MS.length;i++){
  var m=MS[i];if(m.dead)continue;
  var ok=(LOCK===m)||inArc(m.x,m.y,sk);
  if(ok){
   var dmg=Math.max(1,Math.round((P.atk+eqAtk())*sk.dmg*(0.9+Math.random()*0.2)-m.def));
   m.hp-=dmg;m.hurt=0.25;
   addFloat(m.x,m.y,'-'+dmg,'#ffd45a');
   if(m.hp<=0)killMon(m);
   else if(!m.hostile){m.hostile=true;m.alert=1.2;m.aggro=200;m.maxHpRef=1;}
  }
 }
 if(LOCK&&!LOCK.dead)P.face=Math.atan2(LOCK.y-P.y,LOCK.x-P.x);
 shake=Math.min(8,shake+(k==='ult'?8:3));
}

function killMon(m){
 m.dead=1;m.deadT=3;
 addFloat(m.x,m.y,'+'+m.exp,'#8ff');
 gainExp(m.exp);
 if(Math.random()<m.drop)dropItem();
 if(LOCK===m)LOCK=null;
}

function rollAffix(){
 var r=Math.random();
 if(r<0.55)return null;
 return AFFIX[Math.floor(Math.random()*AFFIX.length)];
}
function dropItem(){
 var r=Math.random(),q=0;
 if(r<0.55)q=0;else if(r<0.82)q=1;else if(r<0.95)q=2;else q=3;
 var t=Math.floor(Math.random()*3);
 var base=t===0?22:(t===1?8:220);
 var val=Math.round(base*0.18*QUAL[q].m+Math.random()*3);
 var list=t===0?NAMEW:(t===1?NAMEA:NAMER);
 var nm=list[Math.floor(Math.random()*list.length)];
 var af=rollAffix();
 if(af){nm=af+'·'+nm;val=Math.round(val*1.15);}
 BAG.push({t:t,q:q,val:val,name:nm,affix:af});
 addFloat(P.x,P.y-16,'获得 '+QUAL[q].n+'装备','#'+((q>0)?'ffd45a':'aaaaaa'));
 if(typeof renderBag==='function')renderBag();
}

function gainExp(n){
 P.exp+=n;
 while(P.exp>=P.expNeed){
  P.exp-=P.expNeed;P.level++;P.expNeed=P.level*40;
  P.maxHp+=12;P.maxMp+=4;P.atk+=2;P.def+=1;
  P.hp=P.maxHp;P.mp=P.maxMp;
  addFloat(P.x,P.y-24,'升级!','#ffe066');
 }
}
function addFloat(x,y,txt,c){FLOAT.push({x:x,y:y,txt:txt,c:c,t:1.0,vy:-40});}

function eqAtk(){var s=0;if(EQ.w)s+=EQ.w.val;if(EQ.r)s+=Math.round(EQ.r.val/10);return s;}
function eqDef(){var s=0;if(EQ.a)s+=EQ.a.val;if(EQ.r)s+=Math.round(EQ.r.val/20);return s;}

/* ---------- 背包 ---------- */
var bagPanel=document.getElementById('bagPanel');
var bagBtn=document.getElementById('bagBtn');
var bagOpen=false;
if(bagBtn)bagBtn.addEventListener('click',function(){bagOpen=!bagOpen;bagPanel.style.display=bagOpen?'block':'none';renderBag();});

function slotOf(t){return t===0?'w':(t===1?'a':'r');}
function slotName(s){return s==='w'?'武器':(s==='a'?'护甲':'饰品');}
function cmpArrow(it){
 var cur=EQ[slotOf(it.t)];
 if(!cur)return '<span style="color:#4d4">↑ 空位</span>';
 if(it.val>cur.val)return '<span style="color:#4d4">↑ +'+(it.val-cur.val)+'</span>';
 if(it.val<cur.val)return '<span style="color:#e66">↓ -'+(cur.val-it.val)+'</span>';
 return '<span style="color:#999">= 相同</span>';
}
function renderBag(){
 var list=document.getElementById('bagList');if(!list)return;
 var html='';
 for(var i=0;i<BAG.length;i++){
  var it=BAG[i];
  html+='<div class="bagItem" onclick="window.__equip('+i+')" style="padding:6px 4px;border-bottom:1px solid rgba(255,255,255,0.08)">'+
   '<span class="w'+it.q+'" style="font-weight:bold">['+QUAL[it.q].n+']'+it.name+'</span> '+
   '<span class="dim">'+slotName(slotOf(it.t))+' +'+it.val+'</span> '+cmpArrow(it)+'</div>';
 }
 if(!BAG.length)html='<div class="dim">背包空</div>';
 list.innerHTML=html;
 var ew=document.getElementById('eqW'),ea=document.getElementById('eqA'),er=document.getElementById('eqR');
 if(ew)ew.textContent=EQ.w?('['+QUAL[EQ.w.q].n+']'+EQ.w.name+' +'+EQ.w.val):'空';
 if(ea)ea.textContent=EQ.a?('['+QUAL[EQ.a.q].n+']'+EQ.a.name+' +'+EQ.a.val):'空';
 if(er)er.textContent=EQ.r?('['+QUAL[EQ.r.q].n+']'+EQ.r.name+' +'+EQ.r.val):'空';
 var st=document.getElementById('eqStat');
 if(st)st.textContent='攻击 '+(P.atk+eqAtk())+'　防御 '+(P.def+eqDef());
}
window.__equip=function(i){
 var it=BAG[i];if(!it)return;
 var slot=slotOf(it.t);
 var old=EQ[slot];
 EQ[slot]=it;
 BAG.splice(i,1);
 if(old)BAG.push(old);
 renderBag();
};
renderBag();

/* ---------- 循环 ---------- */
var last=0,shake=0;
function loop(ts){
 if(!last)last=ts;
 var dt=Math.min(0.05,(ts-last)/1000);last=ts;
 update(dt);draw();
 requestAnimationFrame(loop);
}

function update(dt){
 for(var k in CD){if(CD[k]>0)CD[k]=Math.max(0,CD[k]-dt);}
 if(P.a){P.a.t-=dt;if(P.a.t<=0)P.a=null;}
 if(shake>0)shake=Math.max(0,shake-dt*20);
 if(!P.dead){P.mp=Math.min(P.maxMp,P.mp+6*dt);P.hp=Math.min(P.maxHp,P.hp+1.5*dt);}

 var mx=0,my=0;
 if(joy.act){
  var dx=joy.x-joy.ox,dy=joy.y-joy.oy,d=Math.hypot(dx,dy);
  if(d>8){mx=dx/d;my=dy/d;}
 }
 if(keys['a']||keys['arrowleft'])mx=-1;
 if(keys['d']||keys['arrowright'])mx=1;
 if(keys['w']||keys['arrowup'])my=-1;
 if(keys['s']||keys['arrowdown'])my=1;
 var ml=Math.hypot(mx,my);
 if(ml>0&&!P.dead){
  mx/=ml;my/=ml;
  P.x+=mx*P.speed*dt;P.y+=my*P.speed*dt;
  P.face=Math.atan2(my,mx);
 }
 if(keys['l'])autoLock();

 for(var i=0;i<MS.length;i++){
  var m=MS[i];
  if(m.hurt>0)m.hurt-=dt;
  if(m.alert>0)m.alert-=dt;
  if(m.dead){
   m.deadT-=dt;
   if(m.deadT<=0){
    m.dead=0;m.hp=m.maxHp;
    m.x=m.hx+(Math.random()-0.5)*170;m.y=m.hy+(Math.random()-0.5)*130;
   }
   continue;
  }
  var dx2=P.x-m.x,dy2=P.y-m.y,dist=Math.hypot(dx2,dy2);
  if(m.hostile&&dist<m.aggro&&!P.dead){
   if(dist>m.r+P.r+6){
    m.x+=dx2/dist*m.speed*dt;m.y+=dy2/dist*m.speed*dt;
   }else{
    m.hitCd-=dt;
    if(m.hitCd<=0){
     m.hitCd=1.1;
     var dm=Math.max(1,Math.round(m.atk-Math.round(P.def*0.5)-eqDef()*0.5));
     P.hp-=dm;addFloat(P.x,P.y-4,'-'+dm,'#ff6b6b');shake=6;
     if(P.hp<=0){P.hp=0;P.dead=true;setTimeout(respawn,1800);}
    }
   }
  }else{
   m.wtime-=dt;
   if(m.wtime<=0){m.wtime=1+Math.random()*2.5;m.wand=Math.random()*6.28;}
   var tx=m.x+Math.cos(m.wand)*m.speed*dt*0.35;
   var ty=m.y+Math.sin(m.wand)*m.speed*dt*0.35;
   if(Math.abs(tx-m.hx)<110&&Math.abs(ty-m.hy)<90){m.x=tx;m.y=ty;}
   else m.wand+=Math.PI;
  }
 }
 separate();

 if(LOCK&&LOCK.dead)LOCK=null;

 for(var f=FLOAT.length-1;f>=0;f--){
  var o=FLOAT[f];o.t-=dt;o.y+=o.vy*dt;
  if(o.t<=0)FLOAT.splice(f,1);
 }
 var tx2=P.x-W/2,ty2=P.y-H/2;
 camx+=(tx2-camx)*Math.min(1,dt*8);
 camy+=(ty2-camy)*Math.min(1,dt*8);
 camx=Math.max(0,Math.min(MAPW-W,camx));
 camy=Math.max(0,Math.min(MAPH-H,camy));
 if(MAPW<W)camx=(MAPW-W)/2;
 if(MAPH<H)camy=(MAPH-H)/2;
}

function respawn(){
 P.dead=false;P.hp=P.maxHp;P.mp=P.maxMp;
 P.x=860;P.y=660;LOCK=null;
}

/* ---------- 绘制 ---------- */
function draw(){
 ctx.fillStyle='#1c2a1e';ctx.fillRect(0,0,W,H);
 ctx.save();
 var sx=(Math.random()-0.5)*shake,sy=(Math.random()-0.5)*shake;
 ctx.translate(-Math.round(camx)+sx,-Math.round(camy)+sy);

 for(var i=0;i<ZONES.length;i++){
  var z=ZONES[i];
  ctx.fillStyle=z.color;ctx.fillRect(z.x,z.y,z.w,z.h);
  ctx.strokeStyle=z.safe?'#6b8a4f':'rgba(255,255,255,0.06)';
  ctx.lineWidth=z.safe?4:2;ctx.strokeRect(z.x,z.y,z.w,z.h);
 }
 var V=ZONES[0];
 ctx.fillStyle='#5a4a3a';ctx.fillRect(V.x+120,V.y+100,170,120);
 ctx.strokeStyle='#7a6a55';ctx.lineWidth=2;ctx.strokeRect(V.x+120,V.y+100,170,120);
 ctx.fillStyle='#8a5a3a';ctx.fillRect(V.x+130,V.y+40,110,70);
 ctx.fillStyle='#b8433a';
 ctx.beginPath();ctx.moveTo(V.x+120,V.y+45);ctx.lineTo(V.x+185,V.y-10);ctx.lineTo(V.x+250,V.y+45);
 ctx.closePath();ctx.fill();
 ctx.fillStyle='#3a2418';ctx.fillRect(V.x+172,V.y+75,26,35);
 var fx=V.x+340,fy=V.y+330;
 ctx.fillStyle='#3a2a18';ctx.beginPath();ctx.arc(fx,fy,16,0,7);ctx.fill();
 var fl=6+Math.sin(performance.now()/120)*3;
 ctx.fillStyle='#ff9a3c';ctx.beginPath();ctx.arc(fx,fy-4,fl,0,7);ctx.fill();
 ctx.fillStyle='#ffe066';ctx.beginPath();ctx.arc(fx,fy-4,fl*0.5,0,7);ctx.fill();

 for(var s=0;s<SPAWN.length;s++){
  var sp=SPAWN[s];
  ctx.strokeStyle='rgba(255,90,90,0.12)';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(sp.x,sp.y,150,0,7);ctx.stroke();
 }
 for(var m=0;m<MS.length;m++){
  var mo=MS[m];if(mo.dead)continue;
  var c=mo.hostile?'#d94a4a':'#d9c84a';
  if(mo.hurt>0)c='#ffffff';
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath();ctx.ellipse(mo.x,mo.y+mo.r*0.8,mo.r*0.9,mo.r*0.4,0,0,7);ctx.fill();
  ctx.fillStyle=c;ctx.beginPath();ctx.arc(mo.x,mo.y,mo.r,0,7);ctx.fill();
  ctx.fillStyle='#221';
  ctx.beginPath();ctx.arc(mo.x-mo.r*0.3,mo.y-mo.r*0.2,2,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(mo.x+mo.r*0.3,mo.y-mo.r*0.2,2,0,7);ctx.fill();
  if(mo.hp<mo.maxHp||LOCK===mo){
   var bw=34;
   ctx.fillStyle='#000';ctx.fillRect(mo.x-bw/2,mo.y-mo.r-10,bw,4);
   ctx.fillStyle='#e33';ctx.fillRect(mo.x-bw/2,mo.y-mo.r-10,bw*Math.max(0,mo.hp)/mo.maxHp,4);
  }
  if(mo.alert>0){ctx.fillStyle='#ffe066';ctx.font='bold 16px sans-serif';ctx.textAlign='center';
   ctx.fillText('!',mo.x,mo.y-mo.r-14);}
  if(LOCK===mo){
   ctx.strokeStyle='#ff3b3b';ctx.lineWidth=2;
   var lr=mo.r+8;ctx.strokeRect(mo.x-lr,mo.y-lr,lr*2,lr*2);
  }
 }
 var px=P.x,py=P.y;
 if(preview){
  var sk=SK[preview.key];
  ctx.fillStyle='rgba(255,220,120,0.18)';
  ctx.beginPath();ctx.moveTo(px,py);
  ctx.arc(px,py,sk.range,P.face-sk.arc/2,P.face+sk.arc/2);
  ctx.closePath();ctx.fill();
 }
 ctx.fillStyle='rgba(0,0,0,0.3)';
 ctx.beginPath();ctx.ellipse(px,py+9,12,5,0,0,7);ctx.fill();
 var ax=0,ay=0;
 if(P.a){var pp=1-P.a.t/0.28;ax=Math.cos(P.face)*18*Math.sin(pp*Math.PI);ay=Math.sin(P.face)*18*Math.sin(pp*Math.PI);}
 px+=ax;py+=ay;
 ctx.fillStyle=P.dead?'#777':'#5ad1ff';
 ctx.beginPath();ctx.arc(px,py,11,0,7);ctx.fill();
 ctx.fillStyle='#0b2130';
 ctx.beginPath();ctx.arc(px+Math.cos(P.face)*5,py+Math.sin(P.face)*5,3,0,7);ctx.fill();
 if(P.a){
  var a2=1-P.a.t/0.28;
  ctx.strokeStyle='rgba(255,255,255,'+(1-a2)+')';ctx.lineWidth=6;
  ctx.beginPath();ctx.arc(px,py,24,P.face-0.9,P.face+0.9);ctx.stroke();
 }
 for(var f2=0;f2<FLOAT.length;f2++){
  var o=FLOAT[f2];
  ctx.globalAlpha=Math.min(1,o.t*2);
  ctx.fillStyle=o.c;ctx.font='bold 14px sans-serif';ctx.textAlign='center';
  ctx.fillText(o.txt,o.x,o.y);
  ctx.globalAlpha=1;
 }
 ctx.restore();

 var zz=zoneAt(P.x,P.y);
 if(zz){
  ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(W/2-90,14,180,26);
  ctx.fillStyle=zz.safe?'#9fdf7a':'#ffffff';
  ctx.font='bold 14px sans-serif';ctx.textAlign='center';
  ctx.fillText(zz.name+(zz.safe?' · 安全区':''),W/2,32);
 }
 ctx.fillStyle='#000';ctx.fillRect(14,14,180,14);
 ctx.fillStyle='#e33';ctx.fillRect(14,14,180*(P.hp/P.maxHp),14);
 ctx.fillStyle='#000';ctx.fillRect(14,32,180,10);
 ctx.fillStyle='#39f';ctx.fillRect(14,32,180*(P.mp/P.maxMp),10);
 ctx.fillStyle='#fff';ctx.font='11px sans-serif';ctx.textAlign='left';
 ctx.fillText('Lv'+P.level+'  HP '+Math.ceil(P.hp)+'/'+P.maxHp,18,26);
 ctx.fillText('MP '+Math.ceil(P.mp)+'/'+P.maxMp,18,42);
 ctx.fillStyle='#ccc';ctx.fillText('EXP '+P.exp+'/'+P.expNeed,200,26);

 if(joy.act){
  ctx.fillStyle='rgba(255,255,255,0.10)';
  ctx.beginPath();ctx.arc(joy.ox,joy.oy,52,0,7);ctx.fill();
  var jdx=joy.x-joy.ox,jdy=joy.y-joy.oy,jd=Math.hypot(jdx,jdy);
  if(jd>52){jdx=jdx/jd*52;jdy=jdy/jd*52;}
  ctx.fillStyle='rgba(255,255,255,0.35)';
  ctx.beginPath();ctx.arc(joy.ox+jdx,joy.oy+jdy,24,0,7);ctx.fill();
 }else{
  ctx.strokeStyle='rgba(255,255,255,0.16)';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(jinx,jiny,46,0,7);ctx.stroke();
 }
 /* 自动锁敌按钮 */
 ctx.fillStyle=lockBtn.held?'rgba(255,90,90,0.5)':'rgba(255,90,90,0.22)';
 ctx.beginPath();ctx.arc(lockBtn.x,lockBtn.y,lockBtn.r,0,7);ctx.fill();
 ctx.strokeStyle='rgba(255,120,120,0.9)';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#ffd7d7';ctx.font='bold 11px sans-serif';ctx.textAlign='center';
 ctx.fillText('锁敌',lockBtn.x,lockBtn.y+4);

 for(var b=0;b<btns.length;b++){
  var bt=btns[b],sk2=SK[bt.key],ready=CD[bt.key]<=0&&P.mp>=sk2.mp;
  ctx.fillStyle=ready?'rgba(90,209,255,0.28)':'rgba(120,120,120,0.20)';
  ctx.beginPath();ctx.arc(bt.x,bt.y,bt.r,0,7);ctx.fill();
  ctx.strokeStyle=ready?'rgba(90,209,255,0.9)':'rgba(160,160,160,0.5)';
  ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle=ready?'#fff':'#999';
  ctx.font='bold 12px sans-serif';ctx.textAlign='center';
  ctx.fillText(sk2.n,bt.x,bt.y-2);
  ctx.font='10px sans-serif';
  ctx.fillText(sk2.mp>0?(sk2.mp+'MP'):'-',bt.x,bt.y+12);
  if(CD[bt.key]>0){
   ctx.fillStyle='rgba(0,0,0,0.55)';
   ctx.beginPath();ctx.arc(bt.x,bt.y,bt.r,0,7);ctx.fill();
   ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';
   ctx.fillText(CD[bt.key].toFixed(1),bt.x,bt.y+5);
  }
 }
 if(LOCK&&!LOCK.dead){
  ctx.fillStyle='#ff6b6b';ctx.font='11px sans-serif';ctx.textAlign='center';
  ctx.fillText('已锁定（点击空地取消）',W-150,H-200);
 }
}
requestAnimationFrame(loop);
})();
