(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const canvas = $('#gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = 960, H = 540;
  const fishImage = new Image(); fishImage.src = '/puzzle-iwashin/iwashin-happy.webp';
  const sadImage = new Image(); sadImage.src = '/puzzle-iwashin/iwashin-cry.png';
  let started = false, paused = false, selectedKind = 'sardine', wave = 0;
  let hp = 5, pearls = 120, weaponLevel = 0, netLevel = 0, score = 0;
  let enemies = [], towers = [], shots = [], particles = [], spawnLeft = 0, spawnTimer = 0;
  let waveLive = false, waveDone = false, specialReady = true, specialTimer = 0;
  let lastTime = 0, toastTimer = 0, activeTower = null;
  let muted = true, audioCtx = null;
  const player = {x: 88, y: 345, blink: 0};
  const kindData = {
    sardine: {name:'イワシ隊',cost:35,range:144,damage:1,rate:.58,color:'#58cedd',speed:'高速',upgrade:40},
    mackerel:{name:'アジ支援隊',cost:55,range:192,damage:2,rate:1.0,color:'#64e3bd',speed:'広範囲',upgrade:55},
    yellowtail:{name:'ブリ大将',cost:85,range:172,damage:4,rate:1.52,color:'#ffad69',speed:'高火力',upgrade:75}
  };
  const slots = [
    {x:240,y:143},{x:410,y:143},{x:580,y:143},{x:750,y:143},
    {x:240,y:414},{x:410,y:414},{x:580,y:414},{x:750,y:414}
  ];
  const route = [{x:-18,y:240},{x:104,y:240},{x:188,y:204},{x:291,y:218},{x:384,y:278},{x:504,y:302},{x:620,y:280},{x:716,y:324},{x:819,y:300},{x:978,y:250}];
  const trashTypes = ['can','bottle','bag','net','driftwood'];

  function resize(){
    const box=canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(box.width*dpr)); canvas.height=Math.max(1,Math.round(box.height*dpr));
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    draw();
  }
  function line(x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
  function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
  function bubble(x,y,r,a=1){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=`rgba(190,249,245,${a})`;ctx.fill();ctx.beginPath();ctx.arc(x-r*.25,y-r*.25,Math.max(1,r*.18),0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${a*.8})`;ctx.fill()}
  function drawBg(t){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#16718a');g.addColorStop(.52,'#0b536c');g.addColorStop(1,'#07334b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(210,20,4,210,20,340);glow.addColorStop(0,'rgba(167,244,224,.28)');glow.addColorStop(1,'rgba(167,244,224,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,540,360);
    for(let i=0;i<6;i++){const y=52+i*76;ctx.beginPath();ctx.moveTo(0,y+Math.sin(t/1500+i)*5);for(let x=0;x<=W;x+=80)ctx.lineTo(x,y+Math.sin(t/1600+i+x/120)*7);ctx.strokeStyle=`rgba(152,239,225,${.045-i*.003})`;ctx.lineWidth=2;ctx.stroke()}
    for(let i=0;i<24;i++){let x=(i*127+((t*.008)%W))%W;let y=(i*83+Math.sin(t/1100+i)*9)%H;bubble(x,y,2+(i%3),.13)}
    // Sea grass and soft reef shelves
    for(let k=0;k<11;k++){let x=k*99-15,y=H-4-(k%3)*4;ctx.fillStyle=k%2?'#174f58':'#1b5f60';ctx.beginPath();ctx.ellipse(x,y,43,23,0,Math.PI,0);ctx.fill();for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(x-22+j*13,y-4);ctx.quadraticCurveTo(x-30+j*15,y-35-Math.sin(t/400+k+j)*3,x-24+j*16,y-49);ctx.strokeStyle='#45a782';ctx.lineWidth=4;ctx.lineCap='round';ctx.stroke()}}
    // Tiny reef stones
    for(let i=0;i<9;i++){let x=i*122+28,y=H-29-(i%3)*8;ctx.fillStyle=i%2?'#458476':'#417e7c';ctx.beginPath();ctx.ellipse(x,y,28,10,-.1,0,Math.PI*2);ctx.fill()}
  }
  function drawNet(){
    // net perimeter
    ctx.save();ctx.shadowColor='#b4f2df99';ctx.shadowBlur=12;ctx.strokeStyle='#d3d8a7';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(125,114);ctx.lineTo(795,114);ctx.lineTo(795,430);ctx.lineTo(125,430);ctx.closePath();ctx.stroke();ctx.restore();
    ctx.fillStyle='rgba(9,43,59,.23)';ctx.fillRect(127,117,665,310);
    ctx.save();ctx.beginPath();ctx.rect(127,117,665,310);ctx.clip();ctx.lineWidth=1.2;
    for(let x=125;x<=800;x+=38)line(x,113,x,435,'rgba(224,240,193,.48)',1.2);
    for(let y=115;y<=435;y+=30)line(122,y,800,y,'rgba(224,240,193,.48)',1.2);
    // loose strands add depth
    for(let i=0;i<15;i++){const x=145+i*45;line(x,120,x+16,426,'rgba(180,224,194,.17)',1)}
    ctx.restore();
    // corner floats
    for(const [x,y] of [[125,114],[795,114],[125,430],[795,430]]){ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fillStyle='#ffcb76';ctx.fill();ctx.strokeStyle='#fff4d9';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(x-3,y-3,3,0,Math.PI*2);ctx.fillStyle='#fff9db';ctx.fill()}
    // path over the net
    ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(route[0].x,route[0].y);for(let i=1;i<route.length;i++){let p=route[i];ctx.lineTo(p.x,p.y)}
    ctx.strokeStyle='rgba(255,205,116,.22)';ctx.lineWidth=42;ctx.stroke();ctx.strokeStyle='rgba(255,222,151,.54)';ctx.lineWidth=3;ctx.setLineDash([7,12]);ctx.stroke();ctx.setLineDash([]);
    // inlet and exit markers
    rounded(11,222,72,35,17,'#11617a','#9ee1d7');ctx.fillStyle='#efffdf';ctx.font='800 13px sans-serif';ctx.textAlign='center';ctx.fillText('ごみ！',47,245);
    rounded(855,224,91,37,18,'#174b59','#ef9a79');ctx.fillStyle='#fff1db';ctx.fillText('あみ出口',900,248);
  }
  function drawSlot(slot,i){
    const occupied=towers.find(t=>t.slot===i);
    if(occupied){drawTower(occupied);return}
    ctx.save();ctx.beginPath();ctx.arc(slot.x,slot.y,23,0,Math.PI*2);ctx.fillStyle=selectedKind?'rgba(120,239,226,.17)':'rgba(255,255,255,.09)';ctx.fill();ctx.setLineDash([4,4]);ctx.strokeStyle='rgba(203,255,240,.8)';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#d3fff0';ctx.font='900 19px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('+',slot.x,slot.y-1);ctx.restore()
  }
  function drawFish(x,y,color,scale=1,level=1,kind='sardine'){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(-31,-18);ctx.lineTo(-28,0);ctx.lineTo(-31,18);ctx.closePath();ctx.fillStyle=kind==='yellowtail'?'#eea36a':color;ctx.fill();
    ctx.beginPath();ctx.ellipse(0,0,29,18,0,0,Math.PI*2);const gr=ctx.createLinearGradient(0,-18,0,18);gr.addColorStop(0,kind==='yellowtail'?'#85d8ca':color);gr.addColorStop(.52,kind==='yellowtail'?'#e9f5df':'#edf1dc');gr.addColorStop(1,'#c5e2dc');ctx.fillStyle=gr;ctx.fill();ctx.strokeStyle='#174d62';ctx.lineWidth=2.8;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-6,-8);ctx.quadraticCurveTo(2,-24,14,-11);ctx.fillStyle=kind==='yellowtail'?'#dc9a60':'#3aa6ba';ctx.fill();
    ctx.beginPath();ctx.arc(16,-4,4.3,0,Math.PI*2);ctx.fillStyle='#062a39';ctx.fill();ctx.beginPath();ctx.arc(17,-5,1.3,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();
    ctx.beginPath();ctx.arc(22,5,5,0,Math.PI);ctx.strokeStyle='#175068';ctx.lineWidth=1.6;ctx.stroke();
    if(kind==='mackerel'){for(let i=0;i<4;i++)line(-6+i*7,-14,-9+i*7,-7,'#3288a7',1.8)}
    if(level>1){ctx.beginPath();ctx.arc(0,-25,9,Math.PI,Math.PI*2);ctx.strokeStyle='#ffdf87';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#fff0b2';ctx.font='900 9px sans-serif';ctx.textAlign='center';ctx.fillText(`+${level-1}`,0,-28)}
    ctx.restore()
  }
  function drawTower(t){
    const d=kindData[t.kind];ctx.save();ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(t.x,t.y,d.range,0,Math.PI*2);ctx.fillStyle=d.color;ctx.fill();ctx.restore();
    ctx.beginPath();ctx.ellipse(t.x,t.y+14,25,11,0,0,Math.PI*2);ctx.fillStyle='#05354a77';ctx.fill();drawFish(t.x,t.y,d.color,t.kind==='yellowtail'?1.12:1,t.level,t.kind);
    ctx.beginPath();ctx.arc(t.x,t.y-22,4,0,Math.PI*2);ctx.fillStyle=d.color;ctx.fill();
  }
  function drawTrash(e){
    ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.sin(e.wobble)*.12);ctx.shadowColor='#001f2d88';ctx.shadowBlur=6;ctx.shadowOffsetY=4;
    if(e.kind==='can'){
      rounded(-13,-18,26,36,5,'#c6d8d6','#698d8e');rounded(-10,-15,20,4,2,'#e7eece');rounded(-10,10,20,4,2,'#78999a');ctx.shadowBlur=0;rounded(-9,-3,18,9,3,'#fa956b');ctx.fillStyle='#fff5d8';ctx.font='900 7px sans-serif';ctx.textAlign='center';ctx.fillText('SEA',0,3);
    }else if(e.kind==='bottle'){
      ctx.beginPath();ctx.moveTo(-7,-20);ctx.lineTo(-5,-28);ctx.lineTo(5,-28);ctx.lineTo(7,-20);ctx.lineTo(11,-14);ctx.lineTo(11,18);ctx.quadraticCurveTo(0,23,-11,18);ctx.lineTo(-11,-14);ctx.closePath();ctx.fillStyle='#b8edcd';ctx.fill();ctx.strokeStyle='#579b87';ctx.lineWidth=2;ctx.stroke();rounded(-5,-30,10,5,2,'#fb8d67');ctx.shadowBlur=0;rounded(-8,-4,16,8,2,'#fff1cf');ctx.fillStyle='#387e76';ctx.font='800 6px sans-serif';ctx.textAlign='center';ctx.fillText('PET',0,2);
    }else if(e.kind==='bag'){
      ctx.beginPath();ctx.moveTo(-17,-15);ctx.lineTo(-8,-10);ctx.lineTo(-4,-18);ctx.lineTo(1,-11);ctx.lineTo(10,-18);ctx.lineTo(17,-13);ctx.lineTo(11,17);ctx.quadraticCurveTo(0,22,-12,15);ctx.closePath();ctx.fillStyle='#f2a9d2';ctx.fill();ctx.strokeStyle='#a6619b';ctx.lineWidth=2;ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(-10,-7);ctx.quadraticCurveTo(0,0,9,-8);ctx.strokeStyle='#fff0f3';ctx.lineWidth=2;ctx.stroke();
    }else if(e.kind==='net'){
      ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(-21,-14);ctx.lineTo(21,-14);ctx.lineTo(18,17);ctx.lineTo(-18,17);ctx.closePath();ctx.strokeStyle='#fb915f';ctx.lineWidth=2.5;ctx.stroke();for(let x=-16;x<=16;x+=8)line(x,-13,x+3,16,'#edbc88',1.5);for(let y=-7;y<=13;y+=8)line(-18,y,20,y,'#edbc88',1.5);
    }else{
      ctx.beginPath();ctx.moveTo(-22,10);ctx.lineTo(-11,-11);ctx.lineTo(-4,-5);ctx.lineTo(3,-22);ctx.lineTo(14,-8);ctx.lineTo(23,12);ctx.quadraticCurveTo(4,23,-22,10);ctx.closePath();ctx.fillStyle='#aa8864';ctx.fill();ctx.strokeStyle='#604d45';ctx.lineWidth=2;ctx.stroke();ctx.shadowBlur=0;line(-12,0,12,6,'#d6b589',2);line(2,-10,9,11,'#725a48',2)
    }
    ctx.restore();
    ctx.fillStyle='#fff2d9';ctx.font='900 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(e.hp>1?`×${Math.ceil(e.hp)}`:'',e.x,e.y+23)
  }
  function drawPlayer(){
    const x=player.x,y=player.y;ctx.save();ctx.beginPath();ctx.ellipse(x,y+26,25,7,0,0,Math.PI*2);ctx.fillStyle='#00263855';ctx.fill();
    if(fishImage.complete&&fishImage.naturalWidth){ctx.drawImage(fishImage,x-28,y-33,56,56)}else drawFish(x,y,'#59c9df',.9,1,'sardine');
    ctx.beginPath();ctx.arc(x,y-35,3,0,Math.PI*2);ctx.fillStyle='#fff4b6';ctx.fill();ctx.restore()
  }
  function draw(){
    if(!canvas.width)return;
    const now=performance.now();drawBg(now);drawNet();
    for(let i=0;i<slots.length;i++)drawSlot(slots[i],i);
    for(const s of shots){ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.tx,s.ty);ctx.strokeStyle=s.color;ctx.lineWidth=s.kind==='yellowtail'?5:3;ctx.shadowColor=s.color;ctx.shadowBlur=9;ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(s.tx,s.ty,4,0,Math.PI*2);ctx.fillStyle='#fff2c7';ctx.fill()}
    for(const e of enemies)drawTrash(e);
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();ctx.globalAlpha=1}
    drawPlayer();
    if(!started){ctx.fillStyle='rgba(255,255,255,.1)';ctx.font='800 14px sans-serif';ctx.textAlign='center';ctx.fillText('魚のなかまを配置して ぼうえい開始！',480,486)}
  }
  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1600)}
  function updateHUD(){
    $('#netHp').textContent=hp;$('#healthFill').style.width=`${Math.max(0,hp/(5+netLevel*2)*100)}%`;$('#netHp').nextElementSibling.textContent=` / ${5+netLevel*2}`;$('#pearls').textContent=pearls;$('#waveNum').textContent=wave;
    $('#wavePips').innerHTML=Array.from({length:5},(_,i)=>`<i class="${i<wave?'done':''}"></i>`).join('');
    $('#teamCount').textContent=`なかま ${towers.length}ひき`;
    $('#teamHint').textContent=towers.length?`ぶき Lv.${weaponLevel+1}　あみ Lv.${netLevel+1}`:'魚カードをえらんでね';
    $('#netUpgradeText').textContent=`耐久 +2　✦ ${45+netLevel*35}`;
    $('#weaponUpgradeText').textContent=`こうげき +20%　✦ ${60+weaponLevel*45}`;
    $('#fishCards').querySelectorAll('.fish-card').forEach(c=>{const d=kindData[c.dataset.kind];c.classList.toggle('selected',c.dataset.kind===selectedKind);c.setAttribute('aria-pressed',String(c.dataset.kind===selectedKind));c.classList.toggle('unaffordable',pearls<d.cost)});
    $('#waveBtn').disabled=!started||waveLive||wave>=5||(wave>0&&!waveDone);
    $('#waveBtn').innerHTML=wave===0?'ぼうえい開始 <span>▶</span>':`つぎの波へ <span>▶</span>`;
    const phase=$('#phaseText'),pill=phase.parentElement;
    pill.classList.toggle('live',waveLive);pill.classList.toggle('alert',hp<=2);
    phase.textContent=waveLive?'ぼうえい中':waveDone?(wave>=5?'クリア！':'じゅんびOK'):started?'じゅんび中':'たいき中';
    $('#sceneTip').textContent=waveLive?'ごみの近くへイワシんを動かそう！':'魚をえらんで、あみの丸をタップ！';
    $('#cleanBtn').classList.toggle('ready',specialReady&&started);
    $('#cleanTimer').textContent=specialReady?'すぐ使える！':`${specialTimer.toFixed(0)}秒でつかえる`;
  }
  function routePoint(progress){
    const segments=[];let total=0;for(let i=0;i<route.length-1;i++){const a=route[i],b=route[i+1],len=Math.hypot(b.x-a.x,b.y-a.y);segments.push({a,b,len,start:total});total+=len}
    let d=Math.max(0,Math.min(1,progress))*total;for(const s of segments){if(d<=s.start+s.len){const u=(d-s.start)/s.len;return{x:s.a.x+(s.b.x-s.a.x)*u,y:s.a.y+(s.b.y-s.a.y)*u}}}return route.at(-1)
  }
  function beginWave(){
    if(!started){started=true;$('#startScreen').classList.add('hidden')}
    if(waveLive||wave>=5)return;
    wave++;waveLive=true;waveDone=false;spawnLeft=6+wave*2;spawnTimer=.15;$('#missionText').textContent=`ウェーブ ${wave}：あと ${spawnLeft}このごみに注意！`;updateHUD();toast(`ウェーブ ${wave} がきたよ！`);sfx(540,.16)
  }
  function newEnemy(){
    const kind=trashTypes[Math.random()<Math.min(.25,.07+wave*.035)?Math.floor(Math.random()*trashTypes.length):Math.floor(Math.random()*3)];
    let hpv=kind==='driftwood'?4+wave:kind==='net'?3+wave*.5:kind==='bottle'?2+wave*.4:1.5+wave*.3;
    enemies.push({kind,x:route[0].x,y:route[0].y,p:0,hp:hpv,maxHp:hpv,speed:(kind==='bag'?42:kind==='net'?35:kind==='driftwood'?29:38)+wave*2,wobble:Math.random()*6,hit:0})
  }
  function addPop(x,y,color,n=7){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*140,vy:(Math.random()-.7)*110,r:2+Math.random()*4,life:.5+Math.random()*.35,color})}
  function attackSpecial(){
    if(!started){toast('ぼうえい開始を押してね！');return}
    if(!specialReady){toast(`あと ${Math.ceil(specialTimer)}秒でつかえるよ`);return}
    specialReady=false;specialTimer=13;let count=0;
    for(const e of [...enemies]){if(Math.hypot(e.x-player.x,e.y-player.y)<195){e.hp-=5;addPop(e.x,e.y,'#a7fff0',5);count++;if(e.hp<=0)defeat(e)}}
    if(count===0&&enemies.length){const e=enemies.reduce((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)<Math.hypot(b.x-player.x,b.y-player.y)?a:b);e.hp-=3;addPop(e.x,e.y,'#a7fff0',5);if(e.hp<=0)defeat(e);count=1}
    toast(count?`おそうじアタック！ ${count}このごみにヒット！`:'おそうじアタック！');updateHUD()
  }
  function defeat(enemy){const i=enemies.indexOf(enemy);if(i<0)return;enemies.splice(i,1);pearls+=8+(enemy.kind==='driftwood'?5:0);score+=10;addPop(enemy.x,enemy.y,'#ffe18c',9);updateHUD();sfx(720,.075)}
  function leak(enemy){const i=enemies.indexOf(enemy);if(i<0)return;enemies.splice(i,1);hp=Math.max(0,hp-1);addPop(870,245,'#ff987b',12);toast('あみから ごみがぬけちゃった！');if(hp<=0)endGame(false);updateHUD()}
  function fireTower(t,target){const d=kindData[t.kind];t.cooldown=d.rate/(1+weaponLevel*.2);let dmg=d.damage*(1+weaponLevel*.2)+(t.level-1);shots.push({x:t.x,y:t.y-6,tx:target.x,ty:target.y,enemy:target,damage:dmg,color:d.color,kind:t.kind,life:.16})}
  function finishWave(){waveLive=false;waveDone=true;updateHUD();if(wave>=5){endGame(true);return}$('#missionText').textContent=`ウェーブ ${wave} をクリア！ 強化して次の波へ` ;toast('ウェーブクリア！よく守ったね！')}
  function endGame(win){
    waveLive=false;waveDone=false;paused=true;
    $('#resultFish').src=win?fishImage.src:(sadImage.complete&&sadImage.naturalWidth?sadImage.src:fishImage.src);
    $('#resultEyebrow').textContent=win?'SEA SAVED!':'TRY AGAIN';$('#resultTitle').textContent=win?'あみをまもった！':'あみがやぶれちゃった…';$('#resultText').textContent=win?`ごみ ${score/10}こをかたづけたよ！ 魚のなかまたちと大活やく！`:'魚のなかまたちと もう一度チャレンジしよう。';$('#resultBtn').textContent=win?'もう一度あそぶ':'もう一度チャレンジ';$('#resultBtn').dataset.restart='yes';$('#resultScreen').classList.remove('hidden');
  }
  function restart(){started=false;paused=false;wave=0;hp=5;pearls=120;weaponLevel=0;netLevel=0;score=0;enemies=[];towers=[];shots=[];particles=[];spawnLeft=0;waveLive=false;waveDone=false;specialReady=true;specialTimer=0;player.x=88;player.y=345;$('#resultScreen').classList.add('hidden');$('#startScreen').classList.remove('hidden');$('#missionText').textContent='5回のごみの波から あみをまもろう';updateHUD();draw()}
  function placeOrSelect(x,y){
    if(!started){return}
    const hitSlot=slots.findIndex(s=>Math.hypot(s.x-x,s.y-y)<32);
    if(hitSlot>=0){const existing=towers.find(t=>t.slot===hitSlot);if(existing){openTower(existing);return}const d=kindData[selectedKind];if(pearls<d.cost){toast('ポイントがたりないよ');return}pearls-=d.cost;towers.push({kind:selectedKind,slot:hitSlot,x:slots[hitSlot].x,y:slots[hitSlot].y,level:1,cooldown:.2});addPop(slots[hitSlot].x,slots[hitSlot].y,d.color,6);toast(`${d.name} が なかまになった！`);updateHUD();sfx(660,.12);return}
    player.x=Math.max(38,Math.min(W-38,x));player.y=Math.max(65,Math.min(H-55,y));player.blink=.18;return
  }
  function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}}
  function openTower(t){activeTower=t;const d=kindData[t.kind];$('#towerTitle').textContent=`${d.name} Lv.${t.level}`;$('#towerDescription').textContent=`射程 ${d.range}　こうげき ${Math.round(d.damage*(1+weaponLevel*.2)+(t.level-1))}　次の強化で攻撃力アップ。`;$('#towerUpgradeBtn').textContent=`強化する　✦ ${d.upgrade+(t.level-1)*30}`;$('#towerUpgradeBtn').disabled=pearls<d.upgrade+(t.level-1)*30;$('#towerDialog').showModal()}
  function upgradeTower(){if(!activeTower)return;const d=kindData[activeTower.kind],cost=d.upgrade+(activeTower.level-1)*30;if(pearls<cost){toast('ポイントがたりないよ');return}pearls-=cost;activeTower.level++;activeTower.cooldown=0;addPop(activeTower.x,activeTower.y,'#ffe08a',12);$('#towerDialog').close();toast(`${d.name} が進化した！ Lv.${activeTower.level}`);updateHUD()}
  function upgradeNet(){const cost=45+netLevel*35;if(pearls<cost){toast('ポイントがたりないよ');return}pearls-=cost;netLevel++;hp=Math.min(5+netLevel*2,hp+2);addPop(490,115,'#a7fff0',16);toast('あみが つよくなった！耐久力も回復！');updateHUD()}
  function upgradeWeapon(){const cost=60+weaponLevel*45;if(pearls<cost){toast('ポイントがたりないよ');return}pearls-=cost;weaponLevel++;addPop(490,264,'#ffd477',15);toast(`魚みんなの ぶきがパワーアップ！ Lv.${weaponLevel+1}`);updateHUD()}
  function tick(dt,now){
    if(!paused){
      if(!specialReady){specialTimer=Math.max(0,specialTimer-dt);if(specialTimer===0)specialReady=true}
      if(waveLive){spawnTimer-=dt;if(spawnLeft>0&&spawnTimer<=0){newEnemy();spawnLeft--;spawnTimer=Math.max(.45,1.15-wave*.08)}
        for(const e of [...enemies]){e.wobble+=dt*4;e.p+=e.speed*dt/1030;const p=routePoint(e.p);e.x=p.x;e.y=p.y;if(e.p>=1)leak(e)}
        for(const t of towers){t.cooldown-=dt;const d=kindData[t.kind];if(t.cooldown<=0){let target=null,most=-1;for(const e of enemies){const dist=Math.hypot(e.x-t.x,e.y-t.y);if(dist<d.range&&e.p>most){most=e.p;target=e}}if(target)fireTower(t,target)}}
        for(const s of [...shots]){s.life-=dt;if(s.life<=0){if(s.enemy&&enemies.includes(s.enemy)){s.enemy.hp-=s.damage;s.enemy.hit=.12;if(s.enemy.hp<=0)defeat(s.enemy)}shots.splice(shots.indexOf(s),1)}}
        if(spawnLeft===0&&enemies.length===0)finishWave();
      }
      for(const p of [...particles]){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=36*dt;if(p.life<=0)particles.splice(particles.indexOf(p),1)}
    }
    draw();updateHUD();requestAnimationFrame(loop)
  }
  function loop(now){if(!lastTime)lastTime=now;let dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;tick(dt,now)}

  canvas.addEventListener('pointerdown',e=>{e.preventDefault();const p=canvasPoint(e);placeOrSelect(p.x,p.y)});
  $('#fishCards').addEventListener('click',e=>{const card=e.target.closest('.fish-card');if(!card)return;selectedKind=card.dataset.kind;updateHUD();if(!started)toast(`${kindData[selectedKind].name} を配置できるよ`)});
  $('#startBtn').addEventListener('click',()=>{started=true;$('#startScreen').classList.add('hidden');updateHUD();toast('魚を配置して、ぼうえい開始！')});
  $('#waveBtn').addEventListener('click',beginWave);$('#cleanBtn').addEventListener('click',attackSpecial);
  $('#netUpgrade').addEventListener('click',upgradeNet);$('#weaponUpgrade').addEventListener('click',upgradeWeapon);
  $('#towerUpgradeBtn').addEventListener('click',upgradeTower);
  $('#towerRemoveBtn').addEventListener('click',()=>{if(activeTower){pearls+=Math.floor(kindData[activeTower.kind].cost*.45);towers=towers.filter(t=>t!==activeTower);activeTower=null;$('#towerDialog').close();updateHUD();toast('なかまをチームからはずしたよ')}});
  $('#resultBtn').addEventListener('click',restart);
  $('#helpBtn').addEventListener('click',()=>$('#helpDialog').showModal());
  $('#pauseBtn').addEventListener('click',()=>{if(!started){$('#helpDialog').showModal();return}paused=true;$('#pauseDialog').showModal()});
  $('#resumeBtn').addEventListener('click',()=>{paused=false;$('#pauseDialog').close()});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d&&d.id!=='pauseDialog')d.close()}));
  function sfx(freq,duration=.1){if(muted||!audioCtx)return;const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.045,audioCtx.currentTime+.015);gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration+.02)}
  $('#soundBtn').addEventListener('click',()=>{muted=!muted;$('#soundBtn').textContent=muted?'♫':'♪';$('#soundBtn').setAttribute('aria-label',muted?'音をオンにする':'音をオフにする');if(!muted){audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume?.();toast('効果音をオンにしたよ');sfx(660,.14)}else toast('音をオフにしたよ')});
  window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();attackSpecial()}if(e.code==='Escape'){if($('#towerDialog').open)$('#towerDialog').close();else if($('#helpDialog').open)$('#helpDialog').close();else if(started&&!paused){paused=true;$('#pauseDialog').showModal()}}});
  window.addEventListener('resize',resize);window.addEventListener('orientationchange',()=>setTimeout(resize,100));
  updateHUD();resize();requestAnimationFrame(loop);
})();
