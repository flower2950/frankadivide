(function(){
'use strict';
var SUPA_URL='https://rdwhqsvovabtyjlxbagf.supabase.co';
var SUPA_KEY='sb_publishable_G_i8uDGtnjdGTGG73F2Rqg_hBiu-HuZ';
var cv=document.getElementById('cv'),ctx=cv.getContext('2d');
var hint=document.getElementById('hint'),bagBtn=document.getElementById('bagBtn');
var bagPanel=document.getElementById('bagPanel'),eqW=document.getElementById('eqW');
var eqA=document.getElementById('eqA'),eqR=document.getElementById('eqR'),bagList=document.getElementById('bagList');
var W=0,H=0;
function resize(){W=cv.width=Math.floor(window.innerWidth);H=cv.height=Math.floor(window.innerHeight);layoutBtns();}
window.addEventListener('resize',resize);
var MAPW=1600,MAPH=1200,SAVEKEY='frk_div_save_v1';
var ZONES=[{name:'村庄 · 安全区',x:660,y:440,w:460,h:400,safe:true},{name:'村外草地',x:80,y:120,w:560,h:400},{name:'林泉野径',x:760,y:120,w:560,h:340},{name:'林泉深处',x:760,y:880,w:700,h:280}];
var VILL={x:660,y:440,w:460,h:400};
var HOUSES=[{x:700,y:478,w:112,h:86,c:'#8a6a4a',r:'#5e4530',door:{x:44,y:86,w:24,h:20}},{x:848,y:478,w:128,h:76,c:'#907050',r:'#5e4530',door:{x:50,y:76,w:26,h:20}},{x:1000,y:480,w:100,h:84,c:'#846448',r:'#5e4530',door:{x:38,y:84,w:22,h:20}},{x:700,y:742,w:104,h:72,c:'#8f6f4f',r:'#5e4530',door:{x:40,y:72,w:24,h:20}},{x:960,y:740,w:132,h:74,c:'#876849',r:'#5e4530',door:{x:52,y:74,w:26,h:20}}];
var SK={slash:{name:'挥砍',cd:.6,mp:0,range:34,arc:1.5,dmg:1},dash:{name:'突进斩',cd:4,mp:8,range:70,arc:1.1,dmg:1.3},spin:{name:'旋斩',cd:6,mp:12,range:42,arc:6.283,dmg:.85},ult:{name:'林泉·斩',cd:10,mp:50,range:96,arc:1.9,dmg:2.2}};
var SKK=['slash','dash','spin','ult'];
var QUAL=[{color:'#bbb',m:1},{color:'#4d4',m:1.6},{color:'#5af',m:2.4},{color:'#c6f',m:3.4}];
var EQTYPE={weapon:{base:22,names:['短剑','长刃','裂风刀'],slot:'W'},armor:{base:8,names:['皮甲','锁甲','林泉护肩'],slot:'A'},ring:{base:220,names:['指环','护符','林地徽记'],slot:'R'}};
var AFFIX=['锋锐','沉重','迅捷','守护','林泉'];
var SPAWN=[{x:300,y:320,type:'beast',n:4},{x:1080,y:290,type:'beast',n:3},{x:1100,y:1030,type:'deer',n:5}];
var MON={beast:{name:'敌对·林泉兽',hp:70,atk:9,def:2,aggro:190,speed:70,r:13,exp:26,drop:.85,color:'#a34'},deer:{name:'中立·林泉鹿',hp:55,atk:7,def:2,aggro:0,speed:60,r:12,exp:14,drop:.35,color:'#8a7'}};
var P={name:'兰德',x:860,y:660,level:5,exp:0,expNeed:200,hp:220,maxHp:220,mp:100,maxMp:100,atk:22,def:8,speed:120,r:11,face:1.57,cd:{slash:0,dash:0,spin:0,ult:0},EQ:{W:null,A:null,R:null},BAG:[],locked:null,animT:0};
function rnd(a,b){return a+Math.random()*(b-a);}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function dist(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
function inVill(x,y){return x>=VILL.x&&x<=VILL.x+VILL.w&&y>=VILL.y&&y<=VILL.y+VILL.h;}
var floats=[],shake=0;
function float(x,y,t,c){floats.push({x:x,y:y,text:t,color:c||'#fff',life:1});}
function makeEquip(){var ks=['weapon','armor','ring'],t=ks[Math.floor(Math.random()*3)],d=EQTYPE[t],r=Math.random();
var q=r<.55?0:r<.82?1:r<.95?2:3,bn=d.names[Math.floor(Math.random()*d.names.length)],af=Math.random()<.3?AFFIX[Math.floor(Math.random()*5)]:null;
var v=Math.round(d.base*.18*QUAL[q].m+Math.random()*3);if(af)v=Math.round(v*1.15);
return{type:t,q:q,name:(af?af+'·':'')+bn,val:v,slot:d.slot};}
function eqStat(){var a=0,d=0;['W','A','R'].forEach(function(s){var e=P.EQ[s];if(!e)return;if(e.type==='weapon')a+=e.val;else if(e.type==='armor')d+=e.val;else{a+=Math.round(e.val*.05);d+=Math.round(e.val*.02);}});return{atk:a,def:d};}
function tAtk(){return P.atk+eqStat().atk;}function tDef(){return P.def+eqStat().def;}
function renderBag(){if(!bagPanel)return;
function sh(e,l){if(!e)return'<div class="slot"><span>'+l+'</span><b class="w0">空</b></div>';return'<div class="slot"><span>'+l+'</span><b class="w'+e.q+'">'+e.name+' +'+e.val+'</b></div>';}
if(eqW)eqW.innerHTML=sh(P.EQ.W,'武器');if(eqA)eqA.innerHTML=sh(P.EQ.A,'护甲');if(eqR)eqR.innerHTML=sh(P.EQ.R,'饰品');
if(bagList){bagList.innerHTML='';if(!P.BAG.length)bagList.innerHTML='<div class="empty">背包是空的</div>';
else P.BAG.forEach(function(e,i){var d=document.createElement('div');d.className='item w'+e.q;d.textContent=e.name+' +'+e.val;d.onclick=function(){useItem(i);};bagList.appendChild(d);});}}
function useItem(i){var e=P.BAG[i];if(!e)return;var o=P.EQ[e.slot];P.EQ[e.slot]=e;P.BAG.splice(i,1);if(o)P.BAG.push(o);float(P.x,P.y-24,'已装备 '+e.name,QUAL[e.q].color);renderBag();saveGame();}
var monsters=[];
function spawnMonsters(){monsters=[];SPAWN.forEach(function(sp){for(var i=0;i<sp.n;i++){var d=MON[sp.type];monsters.push({type:sp.type,name:d.name,x:sp.x+rnd(-90,90),y:sp.y+rnd(-70,70),hx:sp.x,hy:sp.y,hp:d.hp,maxHp:d.hp,atk:d.atk,def:d.def,r:d.r,speed:d.speed,aggro:d.aggro,exp:d.exp,drop:d.drop,color:d.color,dead:false,respawn:0,hitT:0,atkT:0,wanderT:0,wx:sp.x,wy:sp.y});}});}
function damageMon(m,dmg){var real=Math.max(1,Math.round(dmg-m.def*.5));m.hp-=real;m.hitT=.2;float(m.x+rnd(-6,6),m.y-m.r-8,'-'+real,'#ff8');
if(m.hp<=0&&!m.dead){m.dead=true;m.respawn=3;gainExp(m.exp);float(m.x,m.y-20,'+'+m.exp+' EXP','#8f8');
if(Math.random()<m.drop){var e=makeEquip();P.BAG.push(e);float(P.x,P.y-30,'获得 '+e.name,QUAL[e.q].color);renderBag();saveGame();}}}
function gainExp(n){P.exp+=n;while(P.exp>=P.expNeed){P.exp-=P.expNeed;P.level++;P.maxHp+=12;P.maxMp+=4;P.atk+=2;P.def+=1;P.hp=P.maxHp;P.mp=P.maxMp;P.expNeed=P.level*40;float(P.x,P.y-40,'升级！Lv'+P.level,'#ffd');saveGame();}}
function castSkill(k){var s=SK[k];if(!s||P.cd[k]>0||P.mp<s.mp)return;
if(inVill(P.x,P.y)){float(P.x,P.y-36,'村内无法出手','#9cf');return;}
P.cd[k]=s.cd;P.mp-=s.mp;P.animT=.25;
if(k==='dash'){P.x+=Math.cos(P.face)*30;P.y+=Math.sin(P.face)*30;}shake=Math.max(shake,k==='ult'?10:4);
monsters.forEach(function(m){if(m.dead)return;var d=dist(P,m);if(d>s.range+m.r)return;var a=Math.atan2(m.y-P.y,m.x-P.x);
var df=Math.abs(((a-P.face+Math.PI*3)%(Math.PI*2))-Math.PI);if(P.locked===m||df<s.arc/2){damageMon(m,tAtk()*s.dmg);saveGame();}});}
function snapData(){return {v:1,t:Date.now(),name:P.name,x:P.x,y:P.y,level:P.level,exp:P.exp,expNeed:P.expNeed,maxHp:P.maxHp,maxMp:P.maxMp,atk:P.atk,def:P.def,hp:P.hp,mp:P.mp,EQ:P.EQ,BAG:P.BAG};}
function applyData(d){if(!d||d.v!==1)return false;
P.x=d.x!==undefined?d.x:P.x;P.y=d.y!==undefined?d.y:P.y;
P.level=d.level||P.level;P.exp=d.exp||0;P.expNeed=d.expNeed||(P.level*40);
P.maxHp=d.maxHp||P.maxHp;P.maxMp=d.maxMp||P.maxMp;P.atk=d.atk||P.atk;P.def=d.def||P.def;
P.hp=Math.min(d.hp||P.hp,P.maxHp);P.mp=Math.min(d.mp||P.mp,P.maxMp);
P.EQ=d.EQ||{W:null,A:null,R:null};P.BAG=d.BAG||[];return true;}
function saveGame(){try{localStorage.setItem(SAVEKEY,JSON.stringify(snapData()));}catch(e){}}
function loadGame(){try{var r=localStorage.getItem(SAVEKEY);if(!r)return false;return applyData(JSON.parse(r));}catch(e){return false;}}
window.__reset=function(){if(confirm('确定清空存档？')){localStorage.removeItem(SAVEKEY);location.reload();}};
function exportCode(){try{return 'FRK1:'+encodeURIComponent(JSON.stringify(snapData()));}catch(e){return '';}}
function importCode(code){try{code=(code||'').trim();if(code.indexOf('FRK1:')!==0)return '这不是有效的存档码（应以 FRK1: 开头）';
var d=JSON.parse(decodeURIComponent(code.slice(5)));
if(!d||d.v!==1)return '存档码内容损坏或版本不匹配';
if(!applyData(d))return '存档码无法读取';
saveGame();renderBag();return null;}catch(e){return '存档码解析失败：'+e.message;}}
function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){return navigator.clipboard.writeText(t).then(function(){return true;}).catch(function(){return false;});}
var ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;left:-9999px;top:0;';document.body.appendChild(ta);ta.select();
var ok=false;try{ok=document.execCommand('copy');}catch(e){}document.body.removeChild(ta);return Promise.resolve(ok);}
function showBackupUI(){
  var old=document.getElementById('bkBox');if(old)old.remove();
  var box=document.createElement('div');box.id='bkBox';
  box.style.cssText='position:fixed;inset:0;background:rgba(8,10,16,.95);z-index:120;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;color:#eee;font-family:system-ui,sans-serif;padding:20px 18px;overflow:auto;';
  var code='';
  box.innerHTML='<div style="font-size:19px;letter-spacing:3px;margin:6px 0 4px;">存档备份</div>'+
  '<div style="font-size:12px;color:#89c;margin-bottom:12px;text-align:center;line-height:1.6;">存档码是一长串文字。<br>复制后存到备忘录 / 微信收藏里，换手机粘回来即可。</div>'+
  '<textarea id="bkText" readonly placeholder="点「生成存档码」后这里会出现一长串文字" style="width:100%;max-width:420px;height:110px;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid #456;background:#141a24;color:#9df;font-size:11px;margin-bottom:10px;resize:none;"></textarea>'+
  '<button id="bkGen" style="width:100%;max-width:420px;padding:12px;margin:4px 0;border:0;border-radius:8px;background:#3a7;color:#fff;font-size:15px;font-weight:bold;">① 生成存档码并复制</button>'+
  '<button id="bkImp" style="width:100%;max-width:420px;padding:12px;margin:4px 0;border:0;border-radius:8px;background:#3a6ea8;color:#fff;font-size:15px;font-weight:bold;">② 粘贴存档码并恢复</button>'+
  '<button id="bkDel" style="width:100%;max-width:420px;padding:12px;margin:4px 0;border:0;border-radius:8px;background:#8a3a3a;color:#fff;font-size:15px;">清空本地存档</button>'+
  '<div id="bkMsg" style="font-size:13px;color:#ffd;margin-top:10px;min-height:20px;text-align:center;line-height:1.6;"></div>'+
  '<button id="bkClose" style="margin-top:14px;background:none;border:0;color:#789;font-size:14px;text-decoration:underline;">关闭</button>';
  document.body.appendChild(box);
  var ta=document.getElementById('bkText'),msg=document.getElementById('bkMsg');
  function say(t,c){msg.style.color=c||'#ffd';msg.innerHTML=t;}
  document.getElementById('bkGen').onclick=function(){
    saveGame();code=exportCode();ta.value=code;
    copyText(code).then(function(ok){
      if(ok)say('✅ 已生成并复制存档码（Lv'+P.level+'，'+code.length+'字符）<br>请粘贴到备忘录保存','#8f8');
      else{ta.focus();ta.select();say('已生成，自动复制失败，请长按文本框「全选 → 复制」','#ff8');}
    });
  };
  document.getElementById('bkImp').onclick=function(){
    var v=ta.value.trim();
    if(!v){say('请先在文本框里粘贴存档码','#ff8');return;}
    if(!confirm('恢复会覆盖当前进度，确定吗？'))return;
    var err=importCode(v);
    if(err){say('❌ '+err,'#f88');return;}
    say('✅ 已恢复：Lv'+P.level+'  EXP '+P.exp+'  HP '+Math.round(P.hp)+'/'+P.maxHp,'#8f8');
    float(P.x,P.y-40,'存档已恢复','#8f8');
  };
  document.getElementById('bkDel').onclick=function(){
    if(!confirm('确定清空本地存档？建议先生成存档码备份。'))return;
    try{localStorage.removeItem(SAVEKEY);}catch(e){}
    say('✅ 已清空，刷新页面后从初始状态开始','#8f8');ta.value='';code='';
  };
  document.getElementById('bkClose').onclick=function(){box.remove();};
}
setInterval(saveGame,5000);window.addEventListener('beforeunload',saveGame);
document.addEventListener('visibilitychange',function(){if(document.hidden)saveGame();});
var NET={on:false,room:'',me:'p'+Math.random().toString(36).slice(2,9),others:{},last:0,ch:null};
function connect(room,cb){
  if(!window.supabase){cb('联机库未加载');return;}
  if(NET.ch){try{NET.ch.unsubscribe();}catch(e){}NET.ch=null;}
  var sb;
  try{sb=window.supabase.createClient(SUPA_URL,SUPA_KEY);}catch(e){cb('创建客户端失败:'+e.message);return;}
  var ch=sb.channel('frk_'+room,{config:{broadcast:{self:false}}});
  var done=false;
  ch.on('broadcast',{event:'pos'},function(pl){
    if(!pl||!pl.payload)return;
    var d=pl.payload;
    if(!d.id||d.id===NET.me)return;
    NET.others[d.id]={id:d.id,name:d.name||'玩家',x:d.x,y:d.y,face:d.face||0,level:d.level||1,t:Date.now()};
  });
  ch.subscribe(function(st,err){
    if(st==='SUBSCRIBED'){
      if(done)return;done=true;
      NET.ch=ch;NET.room=room;NET.on=true;NET.last=0;cb(null);
    }else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'){
      if(done)return;done=true;cb('通道错误:'+(err?JSON.stringify(err):st));
    }
  });
  setTimeout(function(){if(!done){done=true;cb('连接超时(8秒)');}},8000);
}
function netTick(dt){
  if(!NET.on||!NET.ch)return;
  NET.last+=dt;
  if(NET.last>0.1){
    NET.last=0;
    try{NET.ch.send({type:'broadcast',event:'pos',payload:{id:NET.me,name:P.name,x:P.x,y:P.y,face:P.face,level:P.level}});}catch(e){}
  }
  var now=Date.now();
  for(var k in NET.others){if(now-NET.others[k].t>3000)delete NET.others[k];}
}
var keys={};
window.addEventListener('keydown',function(e){var k=e.key.toLowerCase();keys[k]=true;
if(k==='l')autoLock();if(k==='1')castSkill('slash');if(k==='2')castSkill('dash');if(k==='3')castSkill('spin');if(k==='4')castSkill('ult');
if(k==='b')showBackupUI();
if(e.key===' '){e.preventDefault();castSkill('slash');}});
window.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=false;});
var JOY={cx:0,cy:0,r:62,knob:26},touch={active:false,id:null,dx:0,dy:0},btns=[],press=null;
function layoutBtns(){
  var s=clamp(Math.min(W,H)/620,.72,1.05);
  JOY.r=Math.round(58*s);JOY.knob=Math.round(24*s);
  JOY.cx=JOY.r+26;JOY.cy=H-JOY.r-22;
  var br=Math.round(42*s),gap=Math.round(10*s),step=br*2+gap;
  var cx=W-br-16,cy=H-br-20;
  btns=[];
  btns.push({x:cx,y:cy,key:'slash',r:br});
  btns.push({x:cx-step,y:cy,key:'dash',r:br});
  btns.push({x:cx,y:cy-step,key:'spin',r:br});
  btns.push({x:cx-step,y:cy-step,key:'ult',r:br});
  var lr=Math.round(30*s);
  btns.push({x:clamp(JOY.cx+JOY.r+lr+18,lr+6,W*0.45),y:JOY.cy-JOY.r*0.4,r:lr,key:'lock'});
  var bkB={x:JOY.cx,y:JOY.cy-JOY.r-lr-18,r:Math.round(25*s),key:'backup'};
  bkB.x=clamp(bkB.x,bkB.r+6,W-bkB.r-6);bkB.y=Math.max(bkB.r+58,bkB.y);
  btns.push(bkB);
}
function findBtn(x,y){for(var i=0;i<btns.length;i++){var b=btns[i],dx=x-b.x,dy=y-b.y;if(dx*dx+dy*dy<b.r*b.r)return b;}return null;}
function inJoy(x,y){var dx=x-JOY.cx,dy=y-JOY.cy;return dx*dx+dy*dy<(JOY.r*1.35)*(JOY.r*1.35);}
function autoLock(){var best=null,bd=420;monsters.forEach(function(m){if(m.dead)return;var d=dist(P,m);if(d<bd){bd=d;best=m;}});P.locked=best;if(best)float(best.x,best.y-best.r-10,'锁定','#f66');else float(P.x,P.y-30,'附近无目标','#9cf');}
function startPress(b){press={key:b.key,t:Date.now(),moved:false};}
function endPress(x,y){if(!press)return;var held=Date.now()-press.t,key=press.key;press=null;
  if(key==='lock'||key==='backup')return;
  if(press&&held>=180){return;}
  if(held>=180){return;}
  castSkill(key);
}
function cancelPress(){press=null;}
cv.addEventListener('touchstart',function(e){e.preventDefault();
 for(var i=0;i<e.changedTouches.length;i++){
  var t=e.changedTouches[i],b=findBtn(t.clientX,t.clientY);
  if(b){
    if(b.key==='lock'){autoLock();continue;}
    if(b.key==='backup'){showBackupUI();continue;}
    startPress(b);continue;
  }
  if(!touch.active&&inJoy(t.clientX,t.clientY)){
    touch.active=true;touch.id=t.identifier;touch.dx=0;touch.dy=0;continue;
  }
  pickTarget(t.clientX,t.clientY);
 }},{passive:false});
cv.addEventListener('touchmove',function(e){e.preventDefault();
 for(var i=0;i<e.changedTouches.length;i++){
  var t=e.changedTouches[i];
  if(touch.active&&t.identifier===touch.id){
    var dx=t.clientX-JOY.cx,dy=t.clientY-JOY.cy,m=Math.sqrt(dx*dx+dy*dy),lim=JOY.r;
    if(m>lim){dx=dx/m*lim;dy=dy/m*lim;}
    touch.dx=dx/lim;touch.dy=dy/lim;
  }
 }},{passive:false});
cv.addEventListener('touchend',function(e){e.preventDefault();
 for(var i=0;i<e.changedTouches.length;i++){
  var t=e.changedTouches[i];
  if(touch.active&&t.identifier===touch.id){touch.active=false;touch.id=null;touch.dx=0;touch.dy=0;}
 }
 endPress();
 },{passive:false});
cv.addEventListener('touchcancel',function(e){touch.active=false;touch.id=null;touch.dx=0;touch.dy=0;cancelPress();},{passive:false});
cv.addEventListener('mousedown',function(e){var b=findBtn(e.clientX,e.clientY);
 if(b){if(b.key==='lock'){autoLock();return;}if(b.key==='backup'){showBackupUI();return;}startPress(b);return;}
 if(inJoy(e.clientX,e.clientY)){touch.active=true;touch.id='mouse';touch.dx=0;touch.dy=0;return;}
 pickTarget(e.clientX,e.clientY);});
window.addEventListener('mousemove',function(e){if(touch.active&&touch.id==='mouse'){var dx=e.clientX-JOY.cx,dy=e.clientY-JOY.cy,m=Math.sqrt(dx*dx+dy*dy),lim=JOY.r;if(m>lim){dx=dx/m*lim;dy=dy/m*lim;}touch.dx=dx/lim;touch.dy=dy/lim;}});
window.addEventListener('mouseup',function(){if(touch.id==='mouse'){touch.active=false;touch.id=null;touch.dx=0;touch.dy=0;}endPress();});
function pickTarget(sx,sy){var wx=P.x+(sx-W/2),wy=P.y+(sy-H/2),best=null,bd=48;
monsters.forEach(function(m){if(m.dead)return;var d=Math.sqrt((m.x-wx)*(m.x-wx)+(m.y-wy)*(m.y-wy));if(d<bd){bd=d;best=m;}});
if(!best){P.locked=null;float(wx,wy,'取消锁定','#9cf');return;}
P.locked=best;float(best.x,best.y-best.r-10,'锁定','#f66');}
if(bagBtn)bagBtn.onclick=function(){if(!bagPanel)return;var s=bagPanel.style.display!=='block';bagPanel.style.display=s?'block':'none';if(s)renderBag();};
function update(dt){var mx=0,my=0;
if(keys['w']||keys['arrowup'])my-=1;if(keys['s']||keys['arrowdown'])my+=1;if(keys['a']||keys['arrowleft'])mx-=1;if(keys['d']||keys['arrowright'])mx+=1;
if(touch.active){var m=Math.sqrt(touch.dx*touch.dx+touch.dy*touch.dy);if(m>.18){mx+=touch.dx;my+=touch.dy;}}
var ml=Math.sqrt(mx*mx+my*my);if(ml>.01){mx/=ml;my/=ml;P.face=Math.atan2(my,mx);P.x+=mx*P.speed*dt;P.y+=my*P.speed*dt;
P.x=clamp(P.x,20,MAPW-20);P.y=clamp(P.y,20,MAPH-20);}
SKK.forEach(function(k){if(P.cd[k]>0)P.cd[k]=Math.max(0,P.cd[k]-dt);});if(P.animT>0)P.animT-=dt;
if(inVill(P.x,P.y)){P.hp=Math.min(P.maxHp,P.hp+12*dt);P.mp=Math.min(P.maxMp,P.mp+10*dt);}
P.mp=Math.min(P.maxMp,P.mp+6*dt);P.hp=Math.min(P.maxHp,P.hp+1.5*dt);
monsters.forEach(function(m){if(m.dead){m.respawn-=dt;if(m.respawn<=0){m.dead=false;m.hp=m.maxHp;m.x=m.hx+rnd(-90,90);m.y=m.hy+rnd(-70,70);}return;}
if(m.hitT>0)m.hitT-=dt;var d=dist(P,m);
if(m.aggro>0&&d<m.aggro&&!inVill(P.x,P.y)){var a=Math.atan2(P.y-m.y,P.x-m.x);if(d>m.r+P.r+2){m.x+=Math.cos(a)*m.speed*dt;m.y+=Math.sin(a)*m.speed*dt;}
else if(m.atkT<=0){m.atkT=1.2;var dmg=Math.max(1,Math.round(m.atk-tDef()*.4));P.hp-=dmg;float(P.x,P.y-P.r-10,'-'+dmg,'#f88');
if(P.hp<=0){P.hp=P.maxHp*.5;P.mp=P.maxMp*.5;P.x=860;P.y=660;float(P.x,P.y-40,'回到村庄','#f66');saveGame();}}}
else{m.wanderT-=dt;if(m.wanderT<=0){m.wanderT=rnd(1.5,3.5);m.wx=m.hx+rnd(-100,100);m.wy=m.hy+rnd(-80,80);}
if(Math.abs(m.wx-m.x)+Math.abs(m.wy-m.y)>6){var wa=Math.atan2(m.wy-m.y,m.wx-m.x);m.x+=Math.cos(wa)*m.speed*.4*dt;m.y+=Math.sin(wa)*m.speed*.4*dt;}}
if(m.atkT>0)m.atkT-=dt;m.x=clamp(m.x,20,MAPW-20);m.y=clamp(m.y,20,MAPH-20);});
monsters.forEach(function(m){if(m.dead)return;var dx=P.x-m.x,dy=P.y-m.y,d=Math.sqrt(dx*dx+dy*dy),mn=P.r+m.r;
if(d<mn&&d>.01){var p=(mn-d)/2;P.x+=dx/d*p;P.y+=dy/d*p;m.x-=dx/d*p;m.y-=dy/d*p;}});
for(var i=0;i<monsters.length;i++)for(var j=i+1;j<monsters.length;j++){var a=monsters[i],b=monsters[j];if(a.dead||b.dead)continue;
var dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy),mn=a.r+b.r;if(d<mn&&d>.01){var p=(mn-d)/2;a.x-=dx/d*p;a.y-=dy/d*p;b.x+=dx/d*p;b.y+=dy/d*p;}}
if(P.locked&&P.locked.dead)P.locked=null;
for(var f=floats.length-1;f>=0;f--){floats[f].life-=dt;floats[f].y-=26*dt;if(floats[f].life<=0)floats.splice(f,1);}
if(shake>0)shake=Math.max(0,shake-40*dt);
netTick(dt);}
function drawVillage(camX,camY){
  ctx.fillStyle='#6d7a52';ctx.fillRect(VILL.x,VILL.y,VILL.w,VILL.h);
  ctx.fillStyle='rgba(150,140,105,.55)';ctx.fillRect(VILL.x+150,VILL.y+150,120,120);
  ctx.fillStyle='rgba(160,150,115,.5)';
  ctx.fillRect(VILL.x+12,VILL.y+VILL.h/2-16,VILL.w-24,32);
  ctx.fillRect(VILL.x+VILL.w/2-16,VILL.y+12,32,VILL.h-24);
  ctx.strokeStyle='#4a3a28';ctx.lineWidth=8;ctx.strokeRect(VILL.x+4,VILL.y+4,VILL.w-8,VILL.h-8);
  ctx.strokeStyle='#3b2e20';ctx.lineWidth=2;ctx.strokeRect(VILL.x+12,VILL.y+12,VILL.w-24,VILL.h-24);
  ctx.globalAlpha=.35;ctx.fillStyle='#2b3a22';ctx.fillRect(VILL.x,VILL.y,VILL.w,VILL.h);ctx.globalAlpha=1;
  HOUSES.forEach(function(h){
    ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(h.x+6,h.y+8,h.w,h.h);
    ctx.fillStyle=h.c;ctx.fill
    ctx.fillRect(h.x,h.y,h.w,h.h);
    ctx.fillStyle=h.r;ctx.fillRect(h.x-6,h.y-10,h.w+12,14);
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(h.x+2,h.y+2,h.w-4,26);
    ctx.fillStyle='#4b3a26';ctx.fillRect(h.x+h.door.x,h.y+h.door.y,h.door.w,h.door.h);
    ctx.fillStyle='#2a1f14';ctx.fillRect(h.x+h.door.x+2,h.y+h.door.y+2,h.door.w-4,h.door.h-2);
    ctx.fillStyle='#9fd';ctx.fillRect(h.x+8,h.y+16,12,10);ctx.fillRect(h.x+h.w-22,h.y+16,12,10);
  });
  var fx=VILL.x+VILL.w/2,fy=VILL.y+VILL.h/2;
  ctx.fillStyle='#6b6b5c';ctx.beginPath();ctx.arc(fx,fy,26,0,6.283);ctx.fill();
  ctx.fillStyle='#3d5d70';ctx.beginPath();ctx.arc(fx,fy,20,0,6.283);ctx.fill();
  ctx.fillStyle='rgba(160,220,240,.5)';ctx.beginPath();ctx.arc(fx-6,fy-6,7,0,6.283);ctx.fill();
  ctx.fillStyle='#7a6a4a';ctx.fillRect(fx-3,fy-34,6,16);
  [[VILL.x+34,VILL.y+34,'#e8a'], [VILL.x+VILL.w-34,VILL.y+34,'#e8a'], [VILL.x+34,VILL.y+VILL.h-34,'#e8a'], [VILL.x+VILL.w-34,VILL.y+VILL.h-34,'#e8a']].forEach(function(p){
    ctx.fillStyle='#5a4630';ctx.fillRect(p[0]-2,p[1]-14,4,14);
    ctx.fillStyle=p[2];ctx.beginPath();ctx.arc(p[0],p[1]-18,5,0,6.283);ctx.fill();
  });
}
function draw(dt){var camX=P.x-W/2,camY=P.y-H/2,ox=shake?rnd(-shake,shake):0,oy=shake?rnd(-shake,shake):0;
ctx.fillStyle='#24301f';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(-camX+ox,-camY+oy);
ctx.strokeStyle='rgba(255,255,255,.03)';var st=64,sx=Math.floor(camX/st)*st,sy=Math.floor(camY/st)*st;
for(var x=sx;x<camX+W+st;x+=st){ctx.beginPath();ctx.moveTo(x,camY);ctx.lineTo(x,camY+H);ctx.stroke();}
for(var y=sy;y<camY+H+st;y+=st){ctx.beginPath();ctx.moveTo(camX,y);ctx.lineTo(camX+W,y);ctx.stroke();}
ZONES.forEach(function(z){if(z.safe)return;
  ctx.fillStyle='rgba(90,120,70,.18)';ctx.fillRect(z.x,z.y,z.w,z.h);
  ctx.strokeStyle='rgba(140,170,110,.25)';ctx.lineWidth=2;ctx.strokeRect(z.x,z.y,z.w,z.h);});
drawVillage(camX,camY);
monsters.forEach(function(m){if(m.dead)return;
ctx.fillStyle=m.hitT>0?'#fff':m.color;ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,6.283);ctx.fill();
ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(m.x,m.y+m.r-2,m.r*.9,m.r*.35,0,0,6.283);ctx.fill();
if(m.hp<m.maxHp){ctx.fillStyle='#400';ctx.fillRect(m.x-16,m.y-m.r-9,32,4);ctx.fillStyle='#e44';ctx.fillRect(m.x-16,m.y-m.r-9,32*(m.hp/m.maxHp),4);}});
for(var k in NET.others){var o=NET.others[k];
ctx.globalAlpha=.65;ctx.fillStyle='#4af';ctx.beginPath();ctx.arc(o.x,o.y,11,0,6.283);ctx.fill();ctx.globalAlpha=1;
ctx.fillStyle='#9df';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText(o.name,o.x,o.y-18);}
ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(P.x,P.y+P.r-2,P.r*.95,P.r*.4,0,0,6.283);ctx.fill();
ctx.fillStyle=P.animT>0?'#ffd':'#ddd';ctx.beginPath();ctx.arc(P.x,P.y,P.r,0,6.283);ctx.fill();
ctx.strokeStyle='#9cf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(P.x,P.y);ctx.lineTo(P.x+Math.cos(P.face)*20,P.y+Math.sin(P.face)*20);ctx.stroke();
if(P.locked&&!P.locked.dead){ctx.strokeStyle='#f44';ctx.lineWidth=2;ctx.beginPath();ctx.arc(P.locked.x,P.locked.y,P.locked.r+6,0,6.283);ctx.stroke();
  ctx.fillStyle='#f44';ctx.beginPath();ctx.moveTo(P.locked.x,P.locked.y-P.locked.r-14);ctx.lineTo(P.locked.x-6,P.locked.y-P.locked.r-22);ctx.lineTo(P.locked.x+6,P.locked.y-P.locked.r-22);ctx.closePath();ctx.fill();}
floats.forEach(function(f){ctx.globalAlpha=Math.min(1,f.life);ctx.fillStyle=f.color;ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y);ctx.globalAlpha=1;});
ctx.restore();
if(press&&press.key&&SK[press.key]){
  var s=SK[press.key];
  var spx=P.x-camX,spy=P.y-camY;
  var rad=s.range*1;
  ctx.save();
  ctx.fillStyle='rgba(120,200,255,.14)';ctx.strokeStyle='rgba(140,220,255,.85)';ctx.lineWidth=2;
  if(s.arc<6.2){ctx.beginPath();ctx.moveTo(spx,spy);ctx.arc(spx,spy,rad,P.face-s.arc/2,P.face+s.arc/2);ctx.closePath();ctx.fill();ctx.stroke();}
  else{ctx.beginPath();ctx.arc(spx,spy,rad,0,6.283);ctx.fill();ctx.stroke();}
  ctx.fillStyle='#bde';ctx.font='bold 12px sans-serif';ctx.textAlign='center';
  ctx.fillText(s.name+'  射程'+Math.round(s.range),spx,spy-rad-10);
  ctx.restore();
}
ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(0,0,W,54);
ctx.fillStyle='#eee';ctx.font='bold 13px sans-serif';ctx.textAlign='left';
var z=null;for(var i=0;i<ZONES.length;i++){var zz=ZONES[i];if(P.x>=zz.x&&P.x<=zz.x+zz.w&&P.y>=zz.y&&P.y<=zz.y+zz.h)z=zz;}
ctx.fillText((z?z.name:'野外')+'  |  Lv'+P.level+'  '+P.name,10,20);
ctx.fillText('HP '+Math.round(P.hp)+'/'+P.maxHp+'   MP '+Math.round(P.mp)+'/'+P.maxMp+'   EXP '+P.exp+'/'+P.expNeed,10,40);
if(inVill(P.x,P.y)){ctx.fillStyle='#9cf';ctx.font='11px sans-serif';ctx.textAlign='right';ctx.fillText('安全区 · 回血中',W-10,40);}
ctx.textAlign='center';
ctx.beginPath();ctx.arc(JOY.cx,JOY.cy,JOY.r,0,6.283);ctx.fillStyle='rgba(20,30,40,.35)';ctx.fill();
ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=2;ctx.stroke();
var kx=JOY.cx+touch.dx*JOY.r,ky=JOY.cy+touch.dy*JOY.r;
ctx.beginPath();ctx.arc(kx,ky,JOY.knob,0,6.283);ctx.fillStyle=touch.active?'rgba(150,200,240,.85)':'rgba(160,190,210,.6)';ctx.fill();
ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2;ctx.stroke();
btns.forEach(function(b){
  var isLock=b.key==='lock',isBk=b.key==='backup';
  ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,6.283);
  ctx.fillStyle=isLock?'rgba(180,40,40,.78)':isBk?'rgba(70,70,90,.72)':'rgba(40,70,110,.78)';
  if(press&&press.key===b.key&&SK[b.key])ctx.fillStyle='rgba(70,130,190,.95)';
  ctx.fill();ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='bold '+Math.round(b.r*0.30)+'px sans-serif';ctx.textAlign='center';
  if(isLock){ctx.fillText('锁敌',b.x,b.y+5);}
  else if(isBk){ctx.font='bold '+Math.round(b.r*0.42)+'px sans-serif';ctx.fillText('备份',b.x,b.y+5);}
  else{var nm=SK[b.key].name.split('·')[0];ctx.fillText(nm,b.x,b.y+5);
    if(P.cd[b.key]>0){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(b.x,b.y,b.r-3,-1.57,-1.57+6.283*(P.cd[b.key]/SK[b.key].cd));ctx.stroke();}}
});
if(NET.on){ctx.fillStyle='#8f8';ctx.font='11px sans-serif';ctx.textAlign='right';ctx.fillText('房间 '+NET.room+'  '+(Object.keys(NET.others).length+1)+'人',W-10,70);}
}
function loop(now){var dt=Math.min(.05,(now-lastT)/1000);lastT=now;update(dt);draw(dt);requestAnimationFrame(loop);}
var lastT=performance.now();
function showJoinUI(){var box=document.createElement('div');box.id='joinBox';
box.style.cssText='position:fixed;inset:0;background:rgba(8,10,16,.94);z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#eee;font-family:system-ui,sans-serif;padding:24px;text-align:center;';
box.innerHTML='<div style="font-size:22px;letter-spacing:4px;margin-bottom:6px;">弗兰卡 · 裂变</div>'+
'<div style="font-size:12px;color:#89c;margin-bottom:22px;">联机测试 · 相同房间码同屏</div>'+
'<input id="joinName" placeholder="你的名字" maxlength="8" value="兰德" style="width:78%;max-width:280px;padding:12px;margin:6px 0;border-radius:8px;border:1px solid #456;background:#141a24;color:#fff;font-size:16px;">'+
'<input id="joinRoom" placeholder="房间码 如 1234" maxlength="8" style="width:78%;max-width:280px;padding:12px;margin:6px 0;border-radius:8px;border:1px solid #456;background:#141a24;color:#fff;font-size:16px;">'+
'<button id="joinGo" style="width:78%;max-width:280px;padding:14px;margin-top:14px;border:0;border-radius:8px;background:#3a7;color:#fff;font-size:16px;font-weight:bold;">进入</button>'+
'<div id="joinMsg" style="font-size:12px;color:#f88;margin-top:12px;min-height:16px;"></div>'+
'<button id="joinSolo" style="margin-top:18px;background:none;border:0;color:#789;font-size:13px;text-decoration:underline;">单人模式</button>';
document.body.appendChild(box);
document.getElementById('joinSolo').onclick=function(){box.remove();};
document.getElementById('joinGo').onclick=function(){var nm=(document.getElementById('joinName').value||'兰德').trim(),rm=(document.getElementById('joinRoom').value||'').trim(),msg=document.getElementById('joinMsg');
if(!rm){msg.textContent='请填写房间码';return;}msg.style.color='#89c';msg.textContent='连接中...';P.name=nm;
connect(rm,function(err){if(err){msg.style.color='#f88';msg.textContent='连接失败：'+err;return;}box.remove();float(P.x,P.y-40,'进入房间 '+rm,'#8f8');});};}
resize();spawnMonsters();
if(loadGame())setTimeout(function(){float(P.x,P.y-40,'读取存档','#ffd');},500);
renderBag();showJoinUI();requestAnimationFrame(loop);
})();