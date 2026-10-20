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
hp:220,maxHp:220,mp:100,maxMp:100,atk:22,def:8,speed:120,
cd:[0,0,0,0],hurt:0,atkAnim:null,moving:false};
var EQ={w:null,a:null,r:null};
var BAG=[];
var camX=0,camY=0,locked=null,shake=0,longPress=null;

var QUAL=[{n:'普通',c:'#bbb',m:1},{n:'优秀',c:'#4d4',m:1.6},
{n:'精良',c:'#5af',m:2.4},{n:'史诗',c:'#c6f',m:3.4}];
var NAMEW=['短剑','长刃','裂风刀'];
var NAMEA=['皮甲','锁甲','林泉护肩'];
var NAMER=['指环','护符','林地徽记'];

function rollQuality(){var r=Math.random();
if(r<0.55)return 0;if(r<0.82)return 1;if(r<0.95)return 2;return 3;}

function makeItem(){
var q=rollQuality();
var slots=['w','a','r'];
var slot=slots[Math.floor(Math.random()*3)];
var base=slot==='w'?22:(slot==='a'?8:220);
var m=QUAL[q].m;
var val=Math.round(base*0.18*m+Math.random()*3);
var names=slot==='w'?NAMEW:(slot==='a'?NAMEA:NAMER);
var nm=names[Math.floor(Math.random()*names.length)];
return {slot:slot,q:q,m:m,val:val,name:nm};
}

function statText(it){
if(it.slot==='w')return '攻击+'+it.val;
if(it.slot==='a')return '防御+'+it.val;
return '生命+'+it.val;
}
function itemLabel(it){return it.name+' ['+QUAL[it.q].n+'] '+statText(it);}

function recalc(){
var atk=22,def=8,hp=220;
if(EQ.w)atk=22+EQ.w.val;
if(EQ.a)def=8+EQ.a.val;
if(EQ.r)hp=220+EQ.r.val;
P.atk=atk+ (P.level-5)*2;
P.def=def+ (P.level-5)*1;
P.maxHp=hp+ (P.level-5)*12;
if(P.hp>P.maxHp)P.hp=P.maxHp;
}

var SK=[
{name:'挥砍',cd:0.6,mp:0,range:34,arc:1.5,dmg:1.0,ultra:false},
{name:'突进斩',cd:4.0,mp:8,range:70,arc:1.1,dmg:1.3,ultra:false},
{name:'旋斩',cd:6.0,mp:12,range:42,arc:Math.PI*2,dmg:0.85,ultra:false},
{name:'林泉·斩',cd:10.0,mp:50,range:96,arc:1.9,dmg:2.2,ultra:true}
];

var BTN=[];
function layoutBtn(){
var W2=cv.width/DPR,H2=cv.height/DPR;
var r=Math.min(36,W2*0.075);
var bx=W2-r-28,by=H2-r-70;
BTN=[
{x:bx-r*2-12,y:by-40,r:r},
{x:bx,y:by-40,r:r},
{x:bx-r*2-12,y:by-40-r*2-10,r:r},
{x:bx,y:by-40-r*2-10,r:r}
];
}
layoutBtn();
window.addEventListener('resize',function(){fit();layoutBtn();});

var mobs=[];
function spawnMob(nx,ny,neutral){
return {x:nx,y:ny,hx:nx,hy:ny,
r:neutral?12:13,hp:neutral?55:70,maxHp:neutral?55:70,
atk:neutral?7:9,def:2,aggro:neutral?0:190,
speed:neutral?60:70,exp:neutral?14:26,
dropRate:neutral?0.35:0.85,neutral:neutral,
dead:false,respawn:0,hurt:0,atkCd:0,kx:0,ky:0,
provoked:false,aggroOn:false,wander:0,wx:nx,wy:ny};
}
for(var i=0;i<7;i++)mobs.push(spawnMob(200+Math.random()*1200,200+Math.random()*800,false));
for(var i=0;i<5;i++)mobs.push(spawnMob(200+Math.random()*1200,200+Math.random()*800,true));

var joy={on:false,id:-1,bx:0,by:0,x:0,y:0};
var btnTouches={};
var pressTimer=null,pressBtn=-1;

function canvasPos(t){
var r=cv.getBoundingClientRect();
return {x:t.clientX-r.left,y:t.clientY-r.top};
}

cv.addEventListener('touchstart',function(e){
e.preventDefault();
for(var i=0;i<e.changedTouches.length;i++){
var t=e.changedTouches[i];
var p=canvasPos(t);
var hitBtn=-1;
for(var j=0;j<BTN.length;j++){
var b=BTN[j];
if(Math.hypot(p.x-b.x,p.y-b.y)<b.r*1.3){hitBtn=j;break;}
}
if(hitBtn>=0){
btnTouches[t.identifier]=hitBtn;
pressBtn=hitBtn;
pressTimer=setTimeout(function(){if(pressBtn===hitBtn)longPress={i:hitBtn,t:1.2};},260);
continue;
}
if(p.x<cv.width/DPR*0.45&&p.y>cv.height/DPR*0.45){
joy.on=true;joy.id=t.identifier;
joy.bx=p.x;joy.by=p.y;joy.x=p.x;joy.y=p.y;
continue;
}
var wx=p.x+camX,wy=p.y+camY;
var target=null;
for(var k=0;k<mobs.length;k++){
var m=mobs[k];
if(m.dead)continue;
if(Math.hypot(m.x-wx,m.y-wy)<m.r+22){target=m;break;}
}
locked=target;
if(target)flash(target.x,target.y,'#f44','锁定');
}
},{passive:false});

cv.addEventListener('touchmove',function(e){
e.preventDefault();
for(var i=0;i<e.changedTouches.length;i++){
var t=e.changedTouches[i];
if(joy.on&&t.identifier===joy.id){
var p=canvasPos(t);joy.x=p.x;joy.y=p.y;
}
if(t.identifier in btnTouches){
var p2=canvasPos(t);
var b2=BTN[btnTouches[t.identifier]];
if(Math.hypot(p2.x-b2.x,p2.y-b2.y)>b2.r*1.6){
if(pressTimer){clearTimeout(pressTimer);pressTimer=null;}
pressBtn=-1;
}
}
}
},{passive:false});

function endTouch(e){
for(var i=0;i<e.changedTouches.length;i++){
var t=e.changedTouches[i];
if(joy.on&&t.identifier===joy.id){joy.on=false;joy.id=-1;}
if(t.identifier in btnTouches){
var idx=btnTouches[t.identifier];
delete btnTouches[t.identifier];
if(pressTimer){clearTimeout(pressTimer);pressTimer=null;}
if(pressBtn===idx){cast(idx);pressBtn=-1;}
}
}
}
cv.addEventListener('touchend',function(e){e.preventDefault();endTouch(e);},{passive:false});
cv.addEventListener('touchcancel',function(e){e.preventDefault();endTouch(e);},{passive:false});

cv.addEventListener('mousedown',function(e){
var p=canvasPos(e);
for(var i=0;i<BTN.length;i++){
var b=BTN[i];
if(Math.hypot(p.x-b.x,p.y-b.y)<b.r*1.2){cast(i);return;}
}
var wx=p.x+camX,wy=p.y+camY;
var target=null;
for(var k=0;k<mobs.length;k++){
var m=mobs[k];
if(m.dead)continue;
if(Math.hypot(m.x-wx,m.y-wy)<m.r+22){target=m;break;}
}
locked=target;
});

function cast(i){
var s=SK[i];
if(P.cd[i]>0||P.mp<s.mp)return;
if(locked&&locked.dead)locked=null;
if(locked){
if(Math.hypot(locked.x-P.x,locked.y-P.y)>s.range+locked.r)return;
P.face=Math.atan2(locked.y-P.y,locked.x-P.x);
}
P.mp-=s.mp;
P.cd[i]=s.cd;
P.atkAnim={t:0,dur:0.22,ang:P.face,range:s.range,arc:s.arc,ultra:s.ultra};
slash(P.x+Math.cos(P.face)*20,P.y+Math.sin(P.face)*20,s.ultra?'#aef':'#fff');
var hits=[];
for(var k=0;k<mobs.length;k++){
var m=mobs[k];
if(m.dead)continue;
var d=Math.hypot(m.x-P.x,m.y-P.y);
if(d>s.range+m.r)continue;
if(locked&&m===locked){hits.push(m);continue;}
if(s.arc>=Math.PI*2){hits.push(m);continue;}
var a=Math.atan2(m.y-P.y,m.x-P.x)-P.face;
while(a>Math.PI)a-=Math.PI*2;
while(a<-Math.PI)a+=Math.PI*2;
if(Math.abs(a)<=s.arc/2)hits.push(m);
}
for(var h=0;h<hits.length;h++){
var m=hits[h];
var dmg=Math.max(1,Math.round(P.atk*s.dmg*(0.9+Math.random()*0.2)-m.def));
m.hp-=dmg;m.hurt=0.15;m.aggroOn=true;
if(m.neutral&&!m.provoked){m.provoked=true;flash(m.x,m.y-20,'#ff0','!');}
var ang=Math.atan2(m.y-P.y,m.x-P.x);
m.kx=Math.cos(ang)*(s.ultra?90:40);
m.ky=Math.sin(ang)*(s.ultra?90:40);
flash(m.x,m.y-m.r-6,s.ultra?'#aef':'#fff',''+dmg);
if(s.ultra)ring(m.x,m.y);
if(m.hp<=0){m.dead=true;m.respawn=3;if(locked===m)locked=null;onKill(m);}
}
if(hits.length)shake=s.ultra?10:5;
}

function onKill(m){
P.exp+=m.exp;
while(P.exp>=P.expNeed){P.exp-=P.expNeed;levelUp();}
if(Math.random()<m.dropRate)equipOrBag(makeItem());
}

function levelUp(){
P.level++;
P.maxHp+=12;P.maxMp+=4;P.atk+=2;P.def+=1;
P.hp=P.maxHp;P.mp=P.maxMp;
P.expNeed=P.level*40;
flash(P.x,P.y-30,'#ff0','LEVEL UP');
ring(P.x,P.y);
}

function equipOrBag(it){
var cur=EQ[it.slot];
if(!cur||it.m>cur.m){
EQ[it.slot]=it;recalc();
flash(P.x,P.y-30,'#5f5','装备 '+it.name);
if(cur)BAG.push(cur);
}else{
BAG.push(it);
flash(P.x,P.y-30,'#bbb','入手 '+it.name);
}
refreshBag();
}

var fx=[],flashTexts=[];
function slash(x,y,color){fx.push({type:'slash',x:x,y:y,t:0,dur:0.25,color:color});}
function ring(x,y){fx.push({type:'ring',x:x,y:y,t:0,dur:0.4});}
function flash(x,y,color,text){flashTexts.push({x:x,y:y,color:color,text:text,t:0,dur:0.8});}

function updateFX(dt){
for(var i=fx.length-1;i>=0;i--){fx[i].t+=dt;if(fx[i].t>=fx[i].dur)fx.splice(i,1);}
for(var j=flashTexts.length-1;j>=0;j--){
var f=flashTexts[j];f.t+=dt;f.y-=30*dt;
if(f.t>=f.dur)flashTexts.splice(j,1);
}
}

function hitPlayer(dmg){
var real=Math.max(1,Math.round(dmg-P.def));
P.hp-=real;P.hurt=0.2;shake=6;
flash(P.x,P.y-28,'#f66','-'+real);
if(P.hp<=0){
P.hp=P.maxHp;P.mp=P.maxMp;P.x=800;P.y=600;locked=null;
flash(P.x,P.y-30,'#f66','复活');
}
}

function update(dt){
var mx=0,my=0;
if(joy.on){
var dx=joy.x-joy.bx,dy=joy.y-joy.by;
var d=Math.hypot(dx,dy);
if(d>6){var s=Math.min(1,d/60);mx=dx/d*s;my=dy/d*s;}
}
if(mx||my){
P.x+=mx*P.speed*dt;P.y+=my*P.speed*dt;
P.face=Math.atan2(my,mx);P.moving=true;
}else P.moving=false;
P.x=Math.max(20,Math.min(MAPW-20,P.x));
P.y=Math.max(20,Math.min(MAPH-20,P.y));

P.mp=Math.min(P.maxMp,P.mp+6*dt);
P.hp=Math.min(P.maxHp,P.hp+1.5*dt);
for(var i=0;i<SK.length;i++)if(P.cd[i]>0)P.cd[i]=Math.max(0,P.cd[i]-dt);
if(P.hurt>0)P.hurt-=dt;
if(P.atkAnim){P.atkAnim.t+=dt;if(P.atkAnim.t>=P.atkAnim.dur)P.atkAnim=null;}

for(var k=0;k<mobs.length;k++){
var m=mobs[k];
if(m.dead){
m.respawn-=dt;
if(m.respawn<=0){m.dead=false;m.hp=m.maxHp;m.x=m.hx;m.y=m.hy;m.provoked=false;m.aggroOn=false;}
continue;
}
if(m.hurt>0)m.hurt-=dt;
if(m.kx||m.ky){
m.x+=m.kx*dt;m.y+=m.ky*dt;
m.kx*=0.85;m.ky*=0.85;
if(Math.abs(m.kx)<1)m.kx=0;
if(Math.abs(m.ky)<1)m.ky=0;
}
var dm=Math.hypot(P.x-m.x,P.y-m.y);
var hostile=!m.neutral||m.provoked;
if(hostile){
if(dm<m.aggro||m.provoked||m.aggroOn){
m.aggroOn=true;
if(dm>m.r+P.r+2){
var a1=Math.atan2(P.y-m.y,P.x-m.x);
m.x+=Math.cos(a1)*m.speed*dt;m.y+=Math.sin(a1)*m.speed*dt;
}else if(m.atkCd<=0){hitPlayer(m.atk);m.atkCd=1.2;}
}
}else{
m.wander-=dt;
if(m.wander<=0){
m.wander=1.5+Math.random()*2.5;
var a2=Math.random()*Math.PI*2;
m.wx=m.hx+Math.cos(a2)*60;m.wy=m.hy+Math.sin(a2)*60;
}
var dd=Math.hypot(m.wx-m.x,m.wy-m.y);
if(dd>4){
var a3=Math.atan2(m.wy-m.y,m.wx-m.x);
m.x+=Math.cos(a3)*m.speed*0.4*dt;m.y+=Math.sin(a3)*m.speed*0.4*dt;
}
}
if(m.atkCd>0)m.atkCd-=dt;
}

var VW=cv.width/DPR,VH=cv.height/DPR;
var wantX=P.x-VW/2,wantY=P.y-VH/2;
camX+=(wantX-camX)*Math.min(1,dt*8);
camY+=(wantY-camY)*Math.min(1,dt*8);
camX=Math.max(0,Math.min(Math.max(0,MAPW-VW),camX));
camY=Math.max(0,Math.min(Math.max(0,MAPH-VH),camY));

if(shake>0)shake=Math.max(0,shake-30*dt);
updateFX(dt);
if(longPress){longPress.t-=dt;if(longPress.t<=0)longPress=null;}
}

function drawHUD(){
var W2=cv.width/DPR,H2=cv.height/DPR;
var pad=14,top=58;
var bw=Math.min(220,W2*0.34),bh=14;
ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(pad,top,bw,bh);
ctx.fillStyle='#c33';ctx.fillRect(pad,top,bw*(P.hp/P.maxHp),bh);
ctx.strokeStyle='#fff6';ctx.lineWidth=1;ctx.strokeRect(pad+0.5,top+0.5,bw-1,bh-1);
ctx.fillStyle='#fff';ctx.font='11px sans-serif';ctx.textAlign='left';
ctx.fillText('HP '+Math.ceil(P.hp)+'/'+P.maxHp,pad+4,top+bh-3);
var my2=top+bh+4;
ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(pad,my2,bw,bh-3);
ctx.fillStyle='#37f';ctx.fillRect(pad,my2,bw*(P.mp/P.maxMp),bh-3);
ctx.fillStyle='#fff';ctx.fillText('MP '+Math.floor(P.mp)+'/'+P.maxMp,pad+4,my2+bh-5);
ctx.fillStyle='#ffd';ctx.font='12px sans-serif';
ctx.fillText('Lv'+P.level,pad,top-6);
var ew=90;
ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(pad+40,top-14,ew,6);
ctx.fillStyle='#fd4';ctx.fillRect(pad+40,top-14,ew*(P.exp/P.expNeed),6);

if(joy.on){
ctx.strokeStyle='#fff6';ctx.lineWidth=2;
ctx.beginPath();ctx.arc(joy.bx,joy.by,52,0,Math.PI*2);ctx.stroke();
var dx=joy.x-joy.bx,dy=joy.y-joy.by;
var d=Math.hypot(dx,dy);
if(d>52){dx=dx/d*52;dy=dy/d*52;}
ctx.fillStyle='#fff5';
ctx.beginPath();ctx.arc(joy.bx+dx,joy.by+dy,22,0,Math.PI*2);ctx.fill();
}

for(var i=0;i<BTN.length;i++){
var b=BTN[i],s=SK[i];
var ready=P.cd[i]<=0&&P.mp>=s.mp;
ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
ctx.fillStyle=s.ultra?(ready?'rgba(80,120,200,0.85)':'rgba(40,60,100,0.75)'):(ready?'rgba(30,30,40,0.8)':'rgba(20,20,25,0.6)');
ctx.fill();
ctx.lineWidth=2;
ctx.strokeStyle=ready?(s.ultra?'#aef':'#fff9'):'#555';
ctx.stroke();
if(P.cd[i]>0){
var ratio=P.cd[i]/s.cd;
ctx.beginPath();ctx.moveTo(b.x,b.y);
ctx.arc(b.x,b.y,b.r,-Math.PI/2,-Math.PI/2+Math.PI*2*ratio);
ctx.closePath();ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fill();
}
ctx.fillStyle=ready?'#fff':'#999';
ctx.font='bold 13px sans-serif';
ctx.textAlign='center';ctx.textBaseline='middle';
ctx.fillText(s.name.length>3?s.name.slice(0,3):s.name,b.x,b.y);
if(s.mp>0){
ctx.font='9px sans-serif';
ctx.fillStyle=P.mp>=s.mp?'#7af':'#a55';
ctx.fillText(''+s.mp,b.x,b.y+b.r*0.55);
}
}
ctx.textBaseline='alphabetic';
}

function render(){
ctx.save();
var sx=shake?(Math.random()-0.5)*shake:0;
var sy=shake?(Math.random()-0.5)*shake:0;
ctx.translate(-camX+sx,-camY+sy);

for(var x=0;x<MAPW;x+=64){
for(var y=0;y<MAPH;y+=64){
ctx.fillStyle=((x/64+y/64)%2===0)?'#1c2b1c':'#1a271a';
ctx.fillRect(x,y,64,64);
}
}
ctx.strokeStyle='#3a4a3a';ctx.lineWidth=4;ctx.strokeRect(0,0,MAPW,MAPH);

if(longPress){
var s=SK[longPress.i];
ctx.beginPath();
ctx.arc(P.x,P.y,s.range,P.face-s.arc/2+Math.PI/2,P.face+s.arc/2+Math.PI/2);
ctx.fillStyle='rgba(120,200,255,0.18)';ctx.fill();
ctx.strokeStyle='rgba(120,200,255,0.6)';ctx.lineWidth=2;ctx.stroke();
}

for(var k=0;k<mobs.length;k++){
var m=mobs[k];
if(m.dead)continue;
ctx.save();
if(m.hurt>0)ctx.globalAlpha=0.6;
ctx.fillStyle=m.hurt>0?'#fff':((m.neutral&&!m.provoked)?'#caa':'#c55');
ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,Math.PI*2);ctx.fill();
ctx.strokeStyle=(m.neutral&&!m.provoked)?'#fd8':'#f66';
ctx.lineWidth=2;ctx.stroke();
ctx.restore();
var w=m.r*2.2,h=4;
ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(m.x-w/2,m.y-m.r-10,w,h);
ctx.fillStyle=(m.neutral&&!m.provoked)?'#fd8':'#e44';
ctx.fillRect(m.x-w/2,m.y-m.r-10,w*(m.hp/m.maxHp),h);
if(locked===m){
ctx.strokeStyle='#f33';ctx.lineWidth=2;
ctx.strokeRect(m.x-m.r-6,m.y-m.r-6,(m.r+6)*2,(m.r+6)*2);
ctx.beginPath();
ctx.moveTo(m.x,m.y-m.r-16);ctx.lineTo(m.x-5,m.y-m.r-24);ctx.lineTo(m.x+5,m.y-m.r-24);
ctx.closePath();ctx.fillStyle='#f33';ctx.fill();
}
}

ctx.save();
if(P.hurt>0)ctx.globalAlpha=0.6;
if(P.atkAnim){
var a=P.atkAnim;
var kk=a.t/a.dur;
ctx.beginPath();
ctx.arc(P.x,P.y,a.range*(0.4+kk*0.8),a.ang-a.arc/2+Math.PI/2,a.ang+a.arc/2+Math.PI/2);
ctx.fillStyle=a.ultra?'rgba(150,220,255,'+(0.5*(1-kk))+')':'rgba(255,255,255,'+(0.35*(1-kk))+')';
ctx.fill();
}
ctx.fillStyle=P.hurt>0?'#fff':'#6cf';
ctx.beginPath();ctx.arc(P.x,P.y,P.r,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
ctx.beginPath();
ctx.moveTo(P.x,P.y);
ctx.lineTo(P.x+Math.cos(P.face)*(P.r+6),P.y+Math.sin(P.face)*(P.r+6));
ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
ctx.restore();

for(var f2=0;f2<fx.length;f2++){
var f=fx[f2];
var k2=f.t/f.dur;
if(f.type==='slash'){
ctx.beginPath();ctx.arc(f.x,f.y,22+k2*18,0,Math.PI*2);
ctx.strokeStyle=f.color;ctx.globalAlpha=1-k2;
ctx.lineWidth=3;ctx.stroke();ctx.globalAlpha=1;
}else if(f.type==='ring'){
ctx.beginPath();ctx.arc(f.x,f.y,10+k2*60,0,Math.PI*2);
ctx.strokeStyle='rgba(150,220,255,'+(1-k2)+')';
ctx.lineWidth=3;ctx.stroke();
}
}

ctx.textAlign='center';
ctx.font='bold 15px sans-serif';
for(var f3=0;f3<flashTexts.length;f3++){
var ft=flashTexts[f3];
ctx.globalAlpha=1-ft.t/ft.dur;
ctx.fillStyle='#000';ctx.fillText(ft.text,ft.x+1,ft.y+1);
ctx.fillStyle=ft.color;ctx.fillText(ft.text,ft.x,ft.y);
}
ctx.globalAlpha=1;
ctx.restore();

drawHUD();
}

var bagBtn=document.getElementById('bagBtn');
var bagPanel=document.getElementById('bagPanel');
var bagClose=document.getElementById('bagClose');
var bagList=document.getElementById('bagList');
var eqW=document.getElementById('eqW');
var eqA=document.getElementById('eqA');
var eqR=document.getElementById('eqR');

bagBtn.addEventListener('click',function(){
bagPanel.classList.toggle('hide');
refreshBag();
});
bagClose.addEventListener('click',function(){bagPanel.classList.add('hide');});

function refreshBag(){
eqW.textContent=EQ.w?EQ.w.name+' +'+EQ.w.val:'—';
eqA.textContent=EQ.a?EQ.a.name+' +'+EQ.a.val:'—';
eqR.textContent=EQ.r?EQ.r.name+' +'+EQ.r.val:'—';
bagList.innerHTML='';
if(!BAG.length){
bagList.innerHTML='<div style="opacity:.5;padding:8px">空</div>';
return;
}
BAG.forEach(function(it,idx){
var row=document.createElement('div');
row.className='bagItem w'+it.q;
var label=document.createElement('span');
label.textContent=itemLabel(it);
var btn=document.createElement('button');
btn.textContent='装备';
btn.addEventListener('click',function(){
BAG.splice(idx,1);
var cur=EQ[it.slot];
EQ[it.slot]=it;
if(cur)BAG.push(cur);
recalc();refreshBag();
});
row.appendChild(label);
row.appendChild(btn);
bagList.appendChild(row);
});
}

var lastT=0;
function step(ts){
if(!lastT)lastT=ts;
var dt=(ts-lastT)/1000;
lastT=ts;
if(dt>0.05)dt=0.05;
update(dt);
render();
requestAnimationFrame(step);
}

recalc();
refreshBag();
requestAnimationFrame(step);
})();
