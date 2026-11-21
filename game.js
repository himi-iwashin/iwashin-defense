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
  let enemies = [], towers = [], shots = [], particles = [], bonusCoins = [], spawnLeft = 0, spawnTimer = 0;
  let waveLive = false, waveDone = false, waveStartTimer = 0, specialReady = true, specialTimer = 0;
  let auraEnergy = 100, auraActive = false;
  const auraRadius = 158, auraDrain = 12, auraRecover = 8;
  let lastTime = 0, toastTimer = 0, activeTower = null, hudAccumulator = 0;
  let muted = true, audioCtx = null;
  const player = {x: 88, y: 345, blink: 0};
  const kindData = {
    sardine: {name:'イワシ隊',cost:35,range:144,damage:1,rate:.48,color:'#58cedd',speed:'高速連射',upgrade:40},
    mackerel:{name:'アジ支援隊',cost:55,range:192,damage:2,rate:1.0,color:'#64e3bd',speed:'広範囲',upgrade:55},
    tuna:{name:'マグロ隊長',cost:100,range:190,damage:8,rate:2.35,color:'#fb6c9a',speed:'重い一撃',upgrade:90},
    yellowtail:{name:'ブリ大将',cost:85,range:172,damage:5,rate:1.7,color:'#ffad69',speed:'高火力',upgrade:75}, jelly:{name:'クラゲ先生',cost:65,range:150,damage:0,rate:.2,color:'#b89cff',speed:'近くの敵を35%遅くする',upgrade:60,support:true}, squid:{name:'イカ忍者',cost:75,range:178,damage:0,rate:4.2,color:'#74e6f1',speed:'墨で群れを55%遅くする',upgrade:70,support:true}, octopus:{name:'タコ番長',cost:90,range:164,damage:0,rate:4.8,color:'#ff8c9f',speed:'敵1体を約1秒止める',upgrade:80,support:true}
  };
  const stageMaps = [
    {name:'定置網の海',shape:[[125,114],[795,114],[795,430],[125,430]],slots:[[240,143],[410,143],[580,143],[750,143],[240,414],[410,414],[580,414],[750,414]],route:[[-18,240],[104,240],[188,204],[291,218],[384,278],[504,302],[620,280],[716,324],[819,300],[978,250]]},
    {name:'三角瀬の入り江',shape:[[125,270],[235,120],[690,120],[820,270],[690,425],[235,425]],slots:[[260,155],[430,145],[600,155],[735,220],[260,390],[430,405],[600,390],[735,320]],route:[[-18,180],[105,180],[205,220],[310,300],[410,235],[520,180],[645,230],[755,315],[860,340],[978,340]]},
    {name:'潮流の坂道',shape:[[135,120],[815,155],[770,430],[115,385]],slots:[[230,150],[410,160],[610,175],[760,195],[190,365],[390,380],[590,395],[750,375]],route:[[-18,330],[100,330],[205,275],[320,225],[435,270],[545,330],[650,300],[750,235],[865,205],[978,210]]},
    {name:'まるい岩礁',shape:[[175,125],[320,100],[650,110],[790,155],[835,270],[790,385],[650,435],[310,430],[165,380],[115,270]],slots:[[290,145],[460,135],[630,145],[760,195],[250,385],[430,400],[610,395],[760,345]],route:[[-18,270],[110,270],[205,210],[310,190],[405,245],[500,325],[600,340],[700,285],[805,220],[978,220]]},
    {name:'細長い沖の網',shape:[[115,145],[830,105],[850,380],[145,435]],slots:[[230,160],[410,150],[600,140],[785,135],[205,395],[400,405],[600,395],[790,385]],route:[[-18,255],[100,255],[210,300],[320,340],[435,300],[550,240],[660,205],[770,245],[870,295],[978,295]]},
    {name:'二つの潮だまり',shape:[[120,125],[315,125],[390,205],[560,205],[635,125],[825,125],[825,420],[635,420],[560,340],[390,340],[315,420],[120,420]],slots:[[220,155],[340,175],[610,175],[730,155],[220,385],[340,365],[610,365],[730,385]],route:[[-18,270],[105,270],[205,215],[300,245],[400,275],[505,275],[610,245],[710,215],[830,270],[978,270]]},
    {name:'かくれ岩の迷路',shape:[[125,115],[830,115],[710,235],[830,430],[125,430],[245,235]],slots:[[190,145],[380,145],[580,145],[760,155],[190,395],[380,395],[580,395],[760,395]],route:[[-18,270],[105,270],[205,205],[300,180],[400,250],[500,330],[600,350],[700,305],[820,270],[978,270]]},
    {name:'北風の大網',shape:[[165,125],[755,105],[845,205],[805,355],[700,430],[255,430],[145,355],[105,205]],slots:[[245,145],[425,135],[620,135],[760,205],[220,390],[420,400],[620,390],[760,335]],route:[[-18,205],[105,205],[200,265],[295,335],[400,300],[500,225],[600,190],[710,240],[825,300],[978,335]]},
    {name:'入り組む岩場',shape:[[125,110],[825,110],[825,220],[700,220],[700,330],[825,330],[825,435],[125,435],[125,330],[250,330],[250,220],[125,220]],slots:[[180,145],[410,145],[650,145],[765,185],[180,395],[410,395],[650,395],[765,365]],route:[[-18,270],[110,270],[205,195],[315,195],[410,270],[520,345],[630,345],[735,270],[850,270],[978,270]]},
    {name:'氷見の大定置網',shape:[[125,270],[275,105],[475,150],[665,105],[830,270],[665,435],[475,390],[275,435]],slots:[[270,145],[435,175],[650,145],[760,230],[270,395],[435,365],[650,395],[760,310]],route:[[-18,270],[105,270],[205,330],[300,280],[395,205],[490,230],[590,330],[690,350],[800,285],[978,270]]}
  ];
  const totalStages = stageMaps.length;
  let stageIndex = 0, stage = stageMaps[0], pendingStage = 0;
  let unlockedStage = Math.max(2,Math.min(totalStages,Number(localStorage.getItem('iwashinDefenseUnlocked')||2)));
  let hardUnlocked=localStorage.getItem('iwashinDefenseHardUnlocked')==='1',hardMode=false,pendingHard=false;
  let slots = stage.slots.map(([x,y])=>({x,y}));
  let route = stage.route.map(([x,y])=>({x,y}));
  let routes=[route];
  let netShape = stage.shape.map(([x,y])=>({x,y}));
  const trashTypes = ['can','bottle','bag','net','driftwood'];
  const loadSavedList=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}};
  let leakCount=0,waveAttackBoost=1,waveAttackAt=-1,nextWaveSlowAt=-1,waveChoiceTaken=false;
  let seaLoreUnlocked=loadSavedList('iwashinDefenseSeaLore'),seaVisitStamps=loadSavedList('iwashinDefenseSeaStamps');
  let stageStars=(()=>{try{return JSON.parse(localStorage.getItem('iwashinDefenseStars')||'{}')}catch{return {}}})();
  const seaStories=[
    {title:'氷見は魚のまち',fact:'氷見漁港には150種をこえる多様な魚が水揚げされるよ。初夏のマグロ、冬の寒ブリ、氷見いわしも有名。',visit:'漁港の近くで、季節の魚や海の景色を探してみよう。',url:'https://www.city.himi.toyama.jp/gyosei/soshiki/hishokoho/2/5/1539.html'},
    {title:'越中式定置網',fact:'氷見発祥の「越中式定置網」は、400年以上の歴史をもつ伝統の漁法だよ。',visit:'氷見市漁業文化交流センターで網の仕組みを見てみよう。',url:'https://www.city.himi.toyama.jp/gyosei/kurashi/joge/1/2321.html'},
    {title:'海の底のひみつ',fact:'氷見沖は300メートルより深い場所があり、その深い海には一年を通じて水温1〜2℃の日本海固有水があるよ。',visit:'海と山が近い氷見ならではの地形を、海岸から想像してみよう。',url:'https://www.city.himi.toyama.jp/gyosei/soshiki/norinchikusan/6/1/2176.html'},
    {title:'網が支える漁業',fact:'氷見には今も多くの定置網があり、氷見市の案内では県内漁獲量の3分の1以上を水揚げしていると紹介されているよ。',visit:'魚が港に届くまでを、漁業文化交流センターの展示でたどろう。',url:'https://www.city.himi.toyama.jp/gyosei/soshiki/norinchikusan/6/1/2176.html'},
    {title:'網の歴史をたどる',fact:'氷見市立博物館では、中世末期にさかのぼるとされる台網の歴史や、漁に使われた道具を紹介しているよ。',visit:'氷見市立博物館で、昔の漁の道具や網の模型を見てみよう。',url:'https://www.city.himi.toyama.jp/section/museum/jousetu.html'},
    {title:'海を大切にする漁法',fact:'氷見の定置網漁業は、魚をとりつくさず資源を持続的に使う漁法として紹介されているよ。',visit:'網の仕組みを知ると、海を守る工夫も見えてくるよ。',url:'https://www.city.himi.toyama.jp/gyosei/soshiki/norinchikusan/6/1/1820.html'},
    {title:'魚とまちの行事',fact:'氷見には、魚を大切にしてきた漁村の文化や、えびす講・起舟などの行事が受けつがれているよ。',visit:'まち歩きで、氷見の漁業や海にまつわる文化を探してみよう。',url:'https://www.city.himi.toyama.jp/gyosei/soshiki/norinchikusan/6/1/2177.html'},
    {title:'海を体験する',fact:'氷見市漁業文化交流センター「ひみの海探検館」では、氷見の漁業や越中式定置網について学べるよ。',visit:'現地の展示や体験を見て、ゲームの網と比べてみよう。',url:'https://himigyogyou.com/'},
    {title:'氷見の海と暮らし',fact:'氷見の持続可能な定置網漁業は、日本農業遺産に認定されているよ。海の仕事と地域の暮らしがつながっているんだね。',visit:'海だけでなく、魚を食べる文化やまちの景色にも目を向けよう。',url:'https://www.city.himi.toyama.jp/gyosei/soshiki/furubra/6/6949.html'},
    {title:'ひみ寒ぶりの季節',fact:'「ひみ寒ぶり」には、その年の漁期や魚の基準があるよ。氷見市は漁獲情報を更新しているんだ。',visit:'冬に氷見を訪れるなら、出発前に市の最新情報を見てみよう。',url:'https://www.city.himi.toyama.jp/gyosei/soshiki/norinchikusan/6/1/15357.html'}
  ];

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
    const xs=netShape.map(p=>p.x),ys=netShape.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const polygon=()=>{ctx.beginPath();ctx.moveTo(netShape[0].x,netShape[0].y);for(let i=1;i<netShape.length;i++)ctx.lineTo(netShape[i].x,netShape[i].y);ctx.closePath()};
    ctx.save();ctx.shadowColor='#b4f2df99';ctx.shadowBlur=12;polygon();ctx.fillStyle='rgba(9,43,59,.23)';ctx.fill();ctx.strokeStyle='#d3d8a7';ctx.lineWidth=7;ctx.stroke();ctx.restore();
    ctx.save();polygon();ctx.clip();ctx.lineWidth=1.2;
    for(let x=Math.floor(minX/38)*38;x<=maxX;x+=38)line(x,minY-8,x,maxY+8,'rgba(224,240,193,.48)',1.2);
    for(let y=Math.floor(minY/30)*30;y<=maxY;y+=30)line(minX-8,y,maxX+8,y,'rgba(224,240,193,.48)',1.2);
    for(let i=0;i<15;i++){const x=minX+15+i*((maxX-minX-30)/14);line(x,minY+5,x+16,maxY-5,'rgba(180,224,194,.17)',1)}
    ctx.restore();
    for(const {x,y} of netShape){ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fillStyle='#ffcb76';ctx.fill();ctx.strokeStyle='#fff4d9';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(x-2.5,y-2.5,2.5,0,Math.PI*2);ctx.fillStyle='#fff9db';ctx.fill()}
    ctx.lineCap='round';ctx.lineJoin='round';
    routes.forEach((path,index)=>{ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);ctx.strokeStyle=index===0?'rgba(255,205,116,.22)':'rgba(111,226,224,.18)';ctx.lineWidth=42;ctx.stroke();ctx.strokeStyle=index===0?'rgba(255,222,151,.58)':'rgba(125,234,224,.7)';ctx.lineWidth=index===0?3:2.5;ctx.setLineDash(index===0?[7,12]:[3,9]);ctx.stroke();ctx.setLineDash([])});
    const entry={x:Math.max(7,route[0].x+22),y:route[0].y},exit=route[route.length-1];
    const ey=Math.max(24,Math.min(H-24,entry.y)),xy=Math.max(24,Math.min(H-24,exit.y));
    rounded(entry.x,ey-17,72,34,17,'#11617a','#9ee1d7');ctx.fillStyle='#efffdf';ctx.font='800 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('ごみ！',entry.x+36,ey);
    const exitX=Math.min(W-97,Math.max(7,exit.x-119));rounded(exitX,xy-18,91,36,18,'#174b59','#ef9a79');ctx.fillStyle='#fff1db';ctx.fillText('あみ出口',exitX+45.5,xy);ctx.textBaseline='alphabetic';
  }
  function drawSlot(slot,i){
    const occupied=towers.find(t=>t.slot===i);
    if(occupied){drawTower(occupied);return}
    ctx.save();ctx.beginPath();ctx.arc(slot.x,slot.y,23,0,Math.PI*2);ctx.fillStyle=selectedKind?'rgba(120,239,226,.17)':'rgba(255,255,255,.09)';ctx.fill();ctx.setLineDash([4,4]);ctx.strokeStyle='rgba(203,255,240,.8)';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#d3fff0';ctx.font='900 19px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('+',slot.x,slot.y-1);ctx.restore()
  }
  function drawFish(x,y,color,scale=1,level=1,kind='sardine'){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(-31,-18);ctx.lineTo(-28,0);ctx.lineTo(-31,18);ctx.closePath();ctx.fillStyle=kind==='yellowtail'?'#eea36a':kind==='tuna'?'#fb6c9a':color;ctx.fill();
    ctx.beginPath();ctx.ellipse(0,0,kind==='tuna'?34:29,kind==='tuna'?21:18,0,0,Math.PI*2);const gr=ctx.createLinearGradient(0,-18,0,18);gr.addColorStop(0,kind==='yellowtail'?'#85d8ca':kind==='tuna'?'#719fc1':color);gr.addColorStop(.52,kind==='yellowtail'?'#e9f5df':kind==='tuna'?'#dae8ee':'#edf1dc');gr.addColorStop(1,'#c5e2dc');ctx.fillStyle=gr;ctx.fill();ctx.strokeStyle='#174d62';ctx.lineWidth=2.8;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-6,-8);ctx.quadraticCurveTo(2,-24,14,-11);ctx.fillStyle=kind==='yellowtail'?'#dc9a60':kind==='tuna'?'#466a92':'#3aa6ba';ctx.fill();
    ctx.beginPath();ctx.arc(16,-4,4.3,0,Math.PI*2);ctx.fillStyle='#062a39';ctx.fill();ctx.beginPath();ctx.arc(17,-5,1.3,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();
    ctx.beginPath();ctx.arc(22,5,5,0,Math.PI);ctx.strokeStyle='#175068';ctx.lineWidth=1.6;ctx.stroke();
    if(kind==='mackerel'){for(let i=0;i<4;i++)line(-6+i*7,-14,-9+i*7,-7,'#3288a7',1.8)}if(kind==='tuna'){for(let i=0;i<3;i++)line(-11+i*8,-16,-5+i*8,-10,'#385e83',2.2)}
    if(level>1){ctx.beginPath();ctx.arc(0,-25,9,Math.PI,Math.PI*2);ctx.strokeStyle='#ffdf87';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#fff0b2';ctx.font='900 9px sans-serif';ctx.textAlign='center';ctx.fillText(`+${level-1}`,0,-28)}
    ctx.restore()
  }
  function drawTower(t){
    const d=kindData[t.kind];ctx.save();ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(t.x,t.y,d.range,0,Math.PI*2);ctx.fillStyle=d.color;ctx.fill();ctx.restore();
    ctx.beginPath();ctx.ellipse(t.x,t.y+14,25,11,0,0,Math.PI*2);ctx.fillStyle='#05354a77';ctx.fill();if(t.kind==='jelly'){ctx.save();ctx.fillStyle='#b89cff';ctx.globalAlpha=.88;ctx.beginPath();ctx.ellipse(t.x,t.y-2,19,23,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.55;for(let i=-2;i<=2;i++)line(t.x+i*6,t.y+14,t.x+i*9+Math.sin(performance.now()/180+i)*4,t.y+33,'#ded0ff',3);ctx.globalAlpha=1;ctx.beginPath();ctx.arc(t.x-6,t.y-7,4,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.restore()}else if(t.kind==='squid'){ctx.save();ctx.fillStyle='#74e6f1';ctx.beginPath();ctx.moveTo(t.x,t.y-28);ctx.quadraticCurveTo(t.x+28,t.y-9,t.x+17,t.y+14);ctx.quadraticCurveTo(t.x,t.y+24,t.x-17,t.y+14);ctx.quadraticCurveTo(t.x-28,t.y-9,t.x,t.y-28);ctx.fill();for(let i=-2;i<=2;i++)line(t.x+i*6,t.y+11,t.x+i*8+Math.sin(performance.now()/120+i)*4,t.y+31,'#b8fbff',3);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(t.x+7,t.y-4,3,0,Math.PI*2);ctx.fill();ctx.restore()}else if(t.kind==='octopus'){ctx.save();ctx.fillStyle='#ff8c9f';ctx.beginPath();ctx.ellipse(t.x,t.y-5,22,18,0,Math.PI,0);ctx.fill();for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(t.x+i*7,t.y+2);ctx.quadraticCurveTo(t.x+i*11+Math.sin(performance.now()/150+i)*4,t.y+18,t.x+i*9,t.y+31);ctx.strokeStyle='#ff8c9f';ctx.lineWidth=5;ctx.lineCap='round';ctx.stroke()}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(t.x-7,t.y-8,3,0,Math.PI*2);ctx.arc(t.x+7,t.y-8,3,0,Math.PI*2);ctx.fill();ctx.restore()}else drawFish(t.x,t.y,d.color,t.kind==='tuna'?1.25:t.kind==='yellowtail'?1.12:1,t.level,t.kind);
    ctx.beginPath();ctx.arc(t.x,t.y-22,4,0,Math.PI*2);ctx.fillStyle=d.color;ctx.fill();
  }
  function drawTrash(e){
    ctx.save();ctx.translate(e.x,e.y);if(e.windupTimer>0){ctx.beginPath();ctx.arc(0,0,40+Math.sin(performance.now()/65)*5,0,Math.PI*2);ctx.strokeStyle='#ffb76c';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#fff1d2';ctx.font='900 10px sans-serif';ctx.textAlign='center';ctx.fillText('チャンス！',0,-43)}if(e.freezeTimer>0){ctx.beginPath();ctx.arc(0,0,31,0,Math.PI*2);ctx.strokeStyle='#ff8cad';ctx.lineWidth=4;ctx.stroke()}else if(e.shell){ctx.beginPath();ctx.arc(0,0,29,0,Math.PI*2);ctx.strokeStyle='#ecffc0';ctx.lineWidth=3;ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([])}else if(e.slowTimer>0){ctx.beginPath();ctx.arc(0,0,29,0,Math.PI*2);ctx.strokeStyle='#8deeff';ctx.lineWidth=3;ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([])}ctx.rotate(Math.sin(e.wobble)*.12);ctx.shadowColor='#001f2d88';ctx.shadowBlur=6;ctx.shadowOffsetY=4;
    if(e.kind==='can'){
      rounded(-13,-18,26,36,5,'#c6d8d6','#698d8e');rounded(-10,-15,20,4,2,'#e7eece');rounded(-10,10,20,4,2,'#78999a');ctx.shadowBlur=0;rounded(-9,-3,18,9,3,'#fa956b');ctx.fillStyle='#fff5d8';ctx.font='900 7px sans-serif';ctx.textAlign='center';ctx.fillText('SEA',0,3);
    }else if(e.kind==='bottle'){
      ctx.beginPath();ctx.moveTo(-7,-20);ctx.lineTo(-5,-28);ctx.lineTo(5,-28);ctx.lineTo(7,-20);ctx.lineTo(11,-14);ctx.lineTo(11,18);ctx.quadraticCurveTo(0,23,-11,18);ctx.lineTo(-11,-14);ctx.closePath();ctx.fillStyle='#b8edcd';ctx.fill();ctx.strokeStyle='#579b87';ctx.lineWidth=2;ctx.stroke();rounded(-5,-30,10,5,2,'#fb8d67');ctx.shadowBlur=0;rounded(-8,-4,16,8,2,'#fff1cf');ctx.fillStyle='#387e76';ctx.font='800 6px sans-serif';ctx.textAlign='center';ctx.fillText('PET',0,2);
    }else if(e.kind==='bag'){
      ctx.beginPath();ctx.moveTo(-17,-15);ctx.lineTo(-8,-10);ctx.lineTo(-4,-18);ctx.lineTo(1,-11);ctx.lineTo(10,-18);ctx.lineTo(17,-13);ctx.lineTo(11,17);ctx.quadraticCurveTo(0,22,-12,15);ctx.closePath();ctx.fillStyle='#f2a9d2';ctx.fill();ctx.strokeStyle='#a6619b';ctx.lineWidth=2;ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(-10,-7);ctx.quadraticCurveTo(0,0,9,-8);ctx.strokeStyle='#fff0f3';ctx.lineWidth=2;ctx.stroke();
    }else if(e.kind==='net'){
      ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(-21,-14);ctx.lineTo(21,-14);ctx.lineTo(18,17);ctx.lineTo(-18,17);ctx.closePath();ctx.strokeStyle='#fb915f';ctx.lineWidth=2.5;ctx.stroke();for(let x=-16;x<=16;x+=8)line(x,-13,x+3,16,'#edbc88',1.5);for(let y=-7;y<=13;y+=8)line(-18,y,20,y,'#edbc88',1.5);
    }else{
      if(e.kind==='glass'){ctx.beginPath();ctx.moveTo(-20,14);ctx.lineTo(-9,-19);ctx.lineTo(-1,-5);ctx.lineTo(7,-24);ctx.lineTo(20,15);ctx.closePath();ctx.fillStyle='#baf6f2';ctx.fill();ctx.strokeStyle='#effff4';ctx.lineWidth=3;ctx.stroke();line(-8,7,8,-10,'#6bb8bd',2)}else if(e.kind==='tire'){ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.fillStyle='#263d43';ctx.fill();ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fillStyle='#0b5c6a';ctx.fill();ctx.strokeStyle='#779093';ctx.lineWidth=4;ctx.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;line(Math.cos(a)*12,Math.sin(a)*12,Math.cos(a)*19,Math.sin(a)*19,'#81999a',2)}}else if(e.kind==='oil'){ctx.beginPath();ctx.ellipse(0,4,25,13,Math.sin(e.wobble)*.1,0,Math.PI*2);const oil=ctx.createLinearGradient(-20,-8,20,14);oil.addColorStop(0,'#7ff3e0');oil.addColorStop(.5,'#253e69');oil.addColorStop(1,'#c47cc7');ctx.fillStyle=oil;ctx.fill();ctx.strokeStyle='#bff8ef';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.ellipse(-5,0,9,3,-.3,0,Math.PI);ctx.strokeStyle='#e6fff0';ctx.lineWidth=2;ctx.stroke()}else if(e.kind==='boss'){ctx.beginPath();ctx.roundRect(-28,-31,56,62,10);const metal=ctx.createLinearGradient(-28,0,28,0);metal.addColorStop(0,'#405966');metal.addColorStop(.5,'#c0d1c8');metal.addColorStop(1,'#647c83');ctx.fillStyle=metal;ctx.fill();ctx.strokeStyle='#f8d475';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#e85569';ctx.font='900 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BOSS',0,1);ctx.shadowBlur=0}else{ctx.beginPath();ctx.moveTo(-22,10);ctx.lineTo(-11,-11);ctx.lineTo(-4,-5);ctx.lineTo(3,-22);ctx.lineTo(14,-8);ctx.lineTo(23,12);ctx.quadraticCurveTo(4,23,-22,10);ctx.closePath();ctx.fillStyle='#aa8864';ctx.fill();ctx.strokeStyle='#604d45';ctx.lineWidth=2;ctx.stroke();ctx.shadowBlur=0;line(-12,0,12,6,'#d6b589',2);line(2,-10,9,11,'#725a48',2)}
    }
    ctx.restore();
    ctx.fillStyle='#fff2d9';ctx.font='900 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(e.hp>1?`×${Math.ceil(e.hp)}`:'',e.x,e.y+23)
  }
  function drawPlayer(){
    const x=player.x,y=player.y;
    if(auraActive){ctx.save();ctx.beginPath();ctx.arc(x,y,auraRadius,0,Math.PI*2);ctx.fillStyle='rgba(255,219,80,.16)';ctx.fill();ctx.setLineDash([11,8]);ctx.lineDashOffset=-(performance.now()/45)%19;ctx.strokeStyle='rgba(255,231,105,.98)';ctx.lineWidth=3;ctx.stroke();ctx.restore()}
    ctx.save();ctx.beginPath();ctx.ellipse(x,y+26,25,7,0,0,Math.PI*2);ctx.fillStyle='#00263855';ctx.fill();
    if(fishImage.complete&&fishImage.naturalWidth){ctx.drawImage(fishImage,x-28,y-33,56,56)}else drawFish(x,y,'#59c9df',.9,1,'sardine');
    ctx.beginPath();ctx.arc(x,y-35,3,0,Math.PI*2);ctx.fillStyle='#fff4b6';ctx.fill();ctx.restore()
  }
  function draw(){
    if(!canvas.width)return;
    const now=performance.now();drawBg(now);drawTerrain();drawNet();
    for(let i=0;i<slots.length;i++)drawSlot(slots[i],i);
    for(const s of shots){ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.tx,s.ty);ctx.strokeStyle=s.color;ctx.lineWidth=(s.kind==='tuna'?9:s.kind==='yellowtail'?6:s.kind==='mackerel'?4:2)+(s.boosted?2:0);ctx.lineCap=s.kind==='tuna'?'round':'butt';ctx.shadowColor=s.color;ctx.shadowBlur=s.kind==='tuna'?20:s.boosted?19:9;ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(s.tx,s.ty,s.kind==='tuna'?10:s.kind==='yellowtail'?7:s.boosted?6:4,0,Math.PI*2);ctx.fillStyle=s.boosted?'#fff5a6':s.color;ctx.fill();if(s.kind==='tuna'){ctx.beginPath();ctx.arc(s.tx,s.ty,15+Math.sin(now/35)*2,0,Math.PI*2);ctx.strokeStyle='#ffbfd0';ctx.lineWidth=2;ctx.stroke()}}
    for(const e of enemies)drawTrash(e);for(const c of bonusCoins){const p=routePoint(c.p,routes[c.routeIndex]||route);ctx.save();ctx.translate(p.x,p.y+Math.sin(performance.now()/120+c.phase)*5);ctx.shadowColor='#ffe866';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fillStyle='#ffe866';ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#8d5b13';ctx.font='900 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✦',0,1);ctx.restore()}
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();ctx.globalAlpha=1}
    drawPlayer();
    if(!started){ctx.fillStyle='rgba(255,255,255,.1)';ctx.font='800 14px sans-serif';ctx.textAlign='center';ctx.fillText('魚のなかまを配置して ぼうえい開始！',480,486)}
  }
  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1600)}
  function updateHUD(){
    $('#waveForecast').textContent=nextTrash();$('#netHp').textContent=hp;$('#healthFill').style.width=`${Math.max(0,hp/(5+netLevel*2)*100)}%`;$('#netHp').nextElementSibling.textContent=` / ${5+netLevel*2}`;$('#pearls').textContent=pearls;$('#waveNum').textContent=wave;
    $('#wavePips').innerHTML=Array.from({length:5},(_,i)=>`<i class="${i<wave?'done':''}"></i>`).join('');
    $('#teamCount').textContent=`なかま ${towers.length}ひき`;
    const auraHasFish=auraActive&&towers.some(t=>Math.hypot(t.x-player.x,t.y-player.y)<=auraRadius);
    $('#teamHint').textContent=auraHasFish?'応援エリア内の魚を強化中！':auraActive?'イワシんを魚の近くへ！':towers.length?`ぶき Lv.${weaponLevel+1}　あみ Lv.${netLevel+1}`:'魚カードをえらんでね';
    $('#netUpgradeText').textContent=`最大耐久 +2・耐久回復　✦ ${45+netLevel*35}`;
    $('#weaponUpgradeText').textContent=`こうげき +20%　✦ ${60+weaponLevel*45}`;
    $('#fishCards').querySelectorAll('.fish-card').forEach(c=>{const d=kindData[c.dataset.kind];c.classList.toggle('selected',c.dataset.kind===selectedKind);c.setAttribute('aria-pressed',String(c.dataset.kind===selectedKind));c.classList.toggle('unaffordable',pearls<d.cost)});
    $('#waveBtn').disabled=waveLive||wave>=5;
    $('#waveBtn').innerHTML=!started?'じゅんび開始 <span>▶</span>':waveLive?'ぼうえい中 <span>●</span>':`つぎの波まで ${Math.max(0,Math.ceil(waveStartTimer))}秒 <span>▶</span>`;
    $('#stageLabel').innerHTML=`STAGE ${String(stageIndex+1).padStart(2,'0')} ${hardMode?'<em>HARD</em>':''} <b>${stage.name}</b>`;
    const phase=$('#phaseText'),pill=phase.parentElement;
    pill.classList.toggle('live',waveLive);pill.classList.toggle('alert',hp<=2);
    phase.textContent=waveLive?'ぼうえい中':waveDone?(wave>=5?'クリア！':'じゅんびOK'):started?'じゅんび中':'たいき中';
    $('#sceneTip').textContent=waveLive?'ごみの近くへイワシんを動かそう！':'魚をえらんで、あみの丸をタップ！';
    $('#cleanBtn').classList.toggle('ready',specialReady&&started);
    $('#cleanTimer').textContent=specialReady?'すぐ使える！':`${specialTimer.toFixed(0)}秒でつかえる`;
    const energyPct=Math.round(auraEnergy);$('#auraFill').style.width=`${energyPct}%`;$('#auraStatus').textContent=auraActive?`応援中 ${energyPct}%`:`元気 ${energyPct}%`;
    $('#auraBtn').disabled=!started||auraEnergy<=0;$('#auraBtn').classList.toggle('active',auraActive);$('#auraBtn').setAttribute('aria-pressed',String(auraActive));
  }
  const branchNames={sardine:['れんぞく型','つらぬき型'],mackerel:['ひろがり型','連射型'],tuna:['大物くだき型','高速型'],yellowtail:['網破り型','高速型']};
  const waveTrash=[['空き缶・ペットボトル'],['空き瓶・プラスチックごみ'],['漁網・流木・ガラス'],['タイヤ・油ごみ・漁網'],['大型ごみ・中ボス']];
  function nextTrash(){const i=Math.min(4,wave);return 'つぎの波：'+waveTrash[i][0]+(i===4?'　★中ボス！':'')}
  function setupTerrain(i){stage.gimmick={type:i%2?'current':'kelp',x:230+(i*97)%500,y:145+(i*61)%245,r:64+(i%3)*9}}
  function drawTerrain(){const g=stage.gimmick;if(!g)return;ctx.save();ctx.beginPath();ctx.arc(g.x,g.y,g.r,0,Math.PI*2);ctx.fillStyle=g.type==='current'?'#63dfff20':'#59e3a520';ctx.fill();ctx.setLineDash([8,7]);ctx.lineWidth=3;ctx.strokeStyle=g.type==='current'?'#71e7ff99':'#7bf0b899';ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#effff2';ctx.font='900 11px sans-serif';ctx.textAlign='center';ctx.fillText(g.type==='current'?'潮流：ごみが速くなる':'海藻：ごみが遅くなる',g.x,g.y-g.r-8);ctx.restore()}
  function chooseEvolution(path){if(!activeTower||activeTower.evolution)return;activeTower.evolution=path;toast(path==='power'?'パワー型！攻撃力アップ・攻撃間隔長め':'連射型！攻撃間隔短縮・攻撃力ひかえめ');$('#towerDialog').close();activeTower=null}
  $('#evolutionPathA')?.addEventListener('click',()=>chooseEvolution('power'));$('#evolutionPathB')?.addEventListener('click',()=>chooseEvolution('swift'));
  function makeHardRoute(base,index){
    const side=index%2===0?1:-1,last=base.length-1;
    return base.map((p,i)=>{const a=base[Math.max(0,i-1)],b=base[Math.min(last,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,offset=i===0||i===last?70:54;
      const x=p[0]+(-dy/len)*offset*side,y=p[1]+(dx/len)*offset*side;
      return {x:Math.max(8,Math.min(W-8,x)),y:Math.max(45,Math.min(H-38,y))};
    });
  }
  function setStage(index){
    stageIndex=Math.max(0,Math.min(totalStages-1,index));stage=stageMaps[stageIndex];setupTerrain(stageIndex);
    slots=stage.slots.map(([x,y])=>({x,y}));route=stage.route.map(([x,y])=>({x,y}));routes=hardMode?[route,makeHardRoute(stage.route,stageIndex)]:[route];netShape=stage.shape.map(([x,y])=>({x,y}));
  }
  function unlockSeaLore(index){if(!seaLoreUnlocked.includes(index)){seaLoreUnlocked.push(index);localStorage.setItem('iwashinDefenseSeaLore',JSON.stringify(seaLoreUnlocked))}}
  function openSeaLore(focusIndex=stageIndex){
    let d=$('#seaLoreDialog');
    if(!d){d=document.createElement('dialog');d.id='seaLoreDialog';d.className='help-dialog';d.style.cssText='width:min(940px,94vw);max-height:90vh;overflow:auto;padding:24px;border-radius:24px;background:#0c3549;color:#ecfff8;border:2px solid #57a8b0;box-shadow:0 20px 80px #00131dcc;';
      d.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><small style="letter-spacing:.2em;color:#8de8db;font-weight:900">HIMI SEA JOURNAL</small><h2 style="margin:5px 0 0">氷見の海図鑑</h2></div><button type="button" data-lore-close aria-label="閉じる" style="border:0;border-radius:50%;width:44px;height:44px;background:#1b5367;color:#fff;font-size:24px">×</button></div><p id="seaLoreProgress" style="color:#b8d7dc;margin:12px 0">クリアで氷見の海メモがひらくよ。</p><div id="seaLoreGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:10px;max-height:56vh;overflow:auto;padding:2px"></div><div style="margin-top:16px;padding:14px;border-radius:16px;background:#14465a"><b>氷見に来たら</b><p style="margin:6px 0 10px;color:#d0e8e8">ゲームに出てきた定置網や魚のことを、現地の展示で見つけてみよう。</p><a href="https://himigyogyou.com/" target="_blank" rel="noopener noreferrer" style="color:#8ce9dd;font-weight:900">氷見市漁業文化交流センター「ひみの海探検館」へ ↗</a><br><a href="https://www.city.himi.toyama.jp/section/museum/jousetu.html" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;color:#8ce9dd;font-weight:900">氷見市立博物館の常設展示 ↗</a></div>';
      d.querySelector('[data-lore-close]').addEventListener('click',()=>d.close());document.body.append(d);
    }
    const grid=d.querySelector('#seaLoreGrid');grid.replaceChildren();
    seaStories.forEach((item,i)=>{const unlocked=seaLoreUnlocked.includes(i),card=document.createElement('article');card.dataset.stage=String(i);card.style.cssText='padding:14px;border:1px solid #326477;border-radius:16px;background:#082d40;';
      const kicker=document.createElement('small');kicker.textContent='STAGE '+String(i+1).padStart(2,'0');kicker.style.cssText='color:#8de8db;font-weight:900;letter-spacing:.1em';
      const title=document.createElement('h3');title.textContent=unlocked?item.title:'🔒 ステージクリアで発見';title.style.cssText='font-size:16px;margin:6px 0;color:#fff0cc';card.append(kicker,title);
      const fact=document.createElement('p');fact.textContent=unlocked?item.fact:'この海のひみつを見つけるには、ステージをクリアしよう。';fact.style.cssText='font-size:13px;line-height:1.65;margin:0 0 8px;color:#d2e7e8';card.append(fact);
      if(unlocked){const visit=document.createElement('p');visit.textContent='現地ヒント：'+item.visit;visit.style.cssText='font-size:12px;line-height:1.55;color:#aed2d5;margin:0 0 10px';card.append(visit);const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='氷見市の案内を読む ↗';link.style.cssText='color:#83e5d7;font-size:12px;font-weight:900';card.append(link);const stamp=document.createElement('button');stamp.type='button';stamp.textContent=seaVisitStamps.includes(i)?'旅スタンプ済み':'現地で見つけた！';stamp.disabled=seaVisitStamps.includes(i);stamp.style.cssText='display:block;margin-top:10px;width:100%;padding:10px;border:1px solid #49818b;border-radius:12px;background:#16485a;color:#fff;font-weight:900';stamp.addEventListener('click',()=>{if(!seaVisitStamps.includes(i)){seaVisitStamps.push(i);localStorage.setItem('iwashinDefenseSeaStamps',JSON.stringify(seaVisitStamps));stamp.textContent='旅スタンプ済み';stamp.disabled=true;d.querySelector('#seaLoreProgress').textContent=seaLoreUnlocked.length+' / 10 の海メモ・旅スタンプ '+seaVisitStamps.length+' / 10'}});card.append(stamp)}
      grid.append(card);
    });
    d.querySelector('#seaLoreProgress').textContent=seaLoreUnlocked.length+' / 10 の海メモを発見・旅スタンプ '+seaVisitStamps.length+' / 10';d.showModal();grid.querySelector('[data-stage="'+focusIndex+'"]')?.scrollIntoView({block:'center'});
  }
  function openWaveChoices(){
    let d=$('#waveChoiceDialog');if(!d){d=document.createElement('dialog');d.id='waveChoiceDialog';d.className='help-dialog';d.style.cssText='width:min(720px,94vw);padding:22px;border-radius:24px;background:#0c3549;color:#ecfff8;border:2px solid #63c9c6;box-shadow:0 20px 80px #00131dcc;';d.innerHTML='<small style="letter-spacing:.2em;color:#8de8db;font-weight:900">WAVE CLEAR</small><h2 style="margin:6px 0">つぎの波にそなえよう</h2><p style="margin:0 0 14px;color:#c2e0e3">作戦をひとつ選んでね。選ばなくても6秒後に自動で進むよ。</p><div id="waveChoiceCards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px"></div>';document.body.append(d)}
    const cards=[['🐟','魚たちの連携','つぎのウェーブだけ攻撃力 +25%','attack'],['🪢','網の手入れ','網の元気を2回復','repair'],['🌊','潮を味方に','つぎの波のごみを6秒ゆっくりに','slow']];const host=d.querySelector('#waveChoiceCards');host.replaceChildren();
    cards.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.style.cssText='text-align:left;padding:16px;border:1px solid #367183;border-radius:16px;background:#0a2b3c;color:#f3fff8;min-height:120px;cursor:pointer';b.innerHTML='<span style="font-size:24px">'+c[0]+'</span><br><b>'+c[1]+'</b><br><small style="color:#b9d9de">'+c[2]+'</small>';b.addEventListener('click',()=>chooseWaveCard(i));host.append(b)});d.showModal();
  }
  function chooseWaveCard(index){if(waveChoiceTaken)return;const effects=['attack','repair','slow'];waveChoiceTaken=true;const effect=effects[index];if(effect==='attack'){waveAttackBoost=1.25;waveAttackAt=wave+1;toast('つぎの波は魚の攻撃力がアップ！')}else if(effect==='repair'){hp=Math.min(5+netLevel*2,hp+2);toast('網を手入れ！元気が2回復！')}else{nextWaveSlowAt=wave+1;toast('潮を味方に！つぎの波のごみがゆっくり！')}const d=$('#waveChoiceDialog');if(d?.open)d.close();$('#missionText').textContent='作戦をえらんだよ。6秒後につぎの波！';updateHUD()}
  function renderStageGrid(){
    const note=$('#stageDialogNote');let modeBar=$('#modeBar');
    if(!modeBar){modeBar=document.createElement('div');modeBar.id='modeBar';modeBar.style.cssText='display:flex;gap:10px;margin:14px 0 18px;';note.after(modeBar)}
    modeBar.innerHTML='';
    let loreButton=$('#seaLoreButton');if(!loreButton){loreButton=document.createElement('button');loreButton.id='seaLoreButton';loreButton.type='button';loreButton.style.cssText='width:100%;min-height:44px;margin:-4px 0 14px;border:1px solid #397a89;border-radius:13px;background:#123e51;color:#d9fff5;font-weight:900';loreButton.addEventListener('click',()=>openSeaLore())}modeBar.after(loreButton);loreButton.textContent=`氷見の海図鑑 ${seaLoreUnlocked.length}/10　旅スタンプ ${seaVisitStamps.length}/10`;
    [['ノーマル',false],['ハード'+(hardUnlocked?'':' 🔒'),true]].forEach(([label,isHard])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=isHard&&!hardUnlocked;b.setAttribute('aria-pressed',String(pendingHard===isHard));b.style.cssText=`flex:1;min-height:48px;border-radius:14px;border:1px solid ${pendingHard===isHard?'#7de6d6':'#31536a'};background:${pendingHard===isHard?'linear-gradient(120deg,#75dfd0,#53c5d5)':'#0b2e40'};color:${pendingHard===isHard?'#073446':'#d7edf0'};font-weight:900;opacity:${b.disabled ? .62 : 1};`;b.addEventListener('click',()=>{if(isHard&&!hardUnlocked)return;pendingHard=isHard;renderStageGrid()});modeBar.append(b)});
    const grid=$('#stageGrid');grid.innerHTML='';
    stageMaps.forEach((item,i)=>{
      const unlocked=i<unlockedStage,record=stageStars[(pendingHard?'hard':'normal')+i]||0,button=document.createElement('button');button.type='button';button.className='stage-option';button.disabled=!unlocked;button.classList.toggle('selected',i===pendingStage);
      button.innerHTML=`<b>STAGE ${String(i+1).padStart(2,'0')}</b><span>${unlocked?item.name:'🔒 クリアで解放'}</span><small>${unlocked?`むずかしさ ${'★'.repeat(Math.min(5,1+Math.floor(i/2)))}${pendingHard?' ＋＋':''}${record?'　ベスト '+'★'.repeat(record):''}`:'未解放'}</small>`;
      button.addEventListener('click',()=>{if(!unlocked)return;pendingStage=i;renderStageGrid()});grid.append(button);
    });
    $('#stagePlayBtn').disabled=pendingStage>=unlockedStage;$('#stagePlayBtn').textContent=pendingHard?'ハードでこのステージへ':'このステージへ';
    note.textContent=hardUnlocked?'全10ステージクリア！ハードは敵が強く、別ルートからも攻めてくるよ。':`${unlockedStage}ステージまで解放中。全10ステージをクリアするとハードが開くよ。`;
  }
  function openStageDialog(){pendingStage=stageIndex;pendingHard=hardMode;renderStageGrid();$('#stageDialog').showModal()}
  function enterStage(index){
    setStage(index);started=true;paused=false;wave=0;hp=5+netLevel*2;score=0;leakCount=0;waveChoiceTaken=false;waveAttackBoost=1;waveAttackAt=-1;nextWaveSlowAt=-1;enemies=[];towers=[];shots=[];particles=[];bonusCoins=[];spawnLeft=0;spawnTimer=0;waveLive=false;waveDone=false;waveStartTimer=8;specialReady=true;specialTimer=0;auraEnergy=100;auraActive=false;selectedKind='sardine';player.x=88;player.y=345;
    $('#startScreen').classList.add('hidden');$('#resultScreen').classList.add('hidden');$('#missionText').textContent=`STAGE ${stageIndex+1}${hardMode?' HARD':''}：${stage.name}を5回のごみの波から守ろう`;
    updateHUD();draw();toast(`STAGE ${stageIndex+1}「${stage.name}」へ！`)
  }
  function returnToTitle(){
    hardMode=false;pendingHard=false;setStage(0);started=false;paused=false;wave=0;hp=5;pearls=120;weaponLevel=0;netLevel=0;score=0;enemies=[];towers=[];shots=[];particles=[];bonusCoins=[];spawnLeft=0;waveLive=false;waveDone=false;specialReady=true;specialTimer=0;auraEnergy=100;auraActive=false;player.x=88;player.y=345;
    $('#resultScreen').classList.add('hidden');$('#startScreen').classList.remove('hidden');$('#missionText').textContent='5回のごみの波から あみをまもろう';updateHUD();draw()
  }
  function routePoint(progress,path=route){
    const segments=[];let total=0;for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],len=Math.hypot(b.x-a.x,b.y-a.y);segments.push({a,b,len,start:total});total+=len}
    let d=Math.max(0,Math.min(1,progress))*total;for(const s of segments){if(d<=s.start+s.len){const u=(d-s.start)/s.len;return{x:s.a.x+(s.b.x-s.a.x)*u,y:s.a.y+(s.b.y-s.a.y)*u}}}return path.at(-1)
  }
  function beginWave(){
    if(!started){openStageDialog();return}
    if(waveLive||wave>=5)return;
    if(wave>0&&!waveChoiceTaken)chooseWaveCard(0);const choiceDialog=$('#waveChoiceDialog');if(choiceDialog?.open)choiceDialog.close();
    waveStartTimer=0;wave++;waveLive=true;waveDone=false;spawnLeft=Math.ceil((6+wave*2+stageIndex)*(hardMode?1.38:1));spawnTimer=.15;if(wave===5){newEnemy(true);if(hardMode)newEnemy(true)}$('#missionText').textContent=`STAGE ${stageIndex+1}${hardMode?' HARD':''}・ウェーブ ${wave}：${hardMode?'二つのルートから':'あと'} ${hardMode?'ごみがせまる！':`あと ${spawnLeft}このごみに注意！`}`;updateHUD();toast(hardMode?`ハード波 ${wave}！複数ルートを警戒！`:`ウェーブ ${wave} がきたよ！`);sfx(540,.16)
  }
  function enterPreparation(){
    if(started)return;
    started=true;waveStartTimer=8;$('#startScreen').classList.add('hidden');updateHUD();toast('8秒後に自動でウェーブ開始！魚を配置してね')
  }
  function toggleAura(){
    if(!started)return;
    if(auraActive){auraActive=false;toast('イワシんはひと休み。元気をためるよ！')}
    else if(auraEnergy>0){auraActive=true;toast('イワシん応援！近くの魚がパワーアップ！')}
    updateHUD();draw()
  }
  function newEnemy(isBoss=false){
    const types=['can','bottle','bag'];if(hardMode||stageIndex>=1)types.push('net');if(hardMode||stageIndex>=2)types.push('driftwood');if(hardMode||stageIndex>=4)types.push('glass');if(hardMode||stageIndex>=6)types.push('tire');if(hardMode||stageIndex>=8)types.push('oil');const kind=isBoss?'boss':types[Math.floor(Math.random()*types.length)];
    const baseHp=kind==='boss'?46+stageIndex*13:kind==='oil'?7+wave*1.1:kind==='tire'?6+wave*.8:kind==='glass'?4+wave*.65:kind==='driftwood'?4+wave:kind==='net'?3+wave*.5:kind==='bottle'?2+wave*.4:1.5+wave*.3;const hpv=baseHp*(1+stageIndex*.105)*(hardMode?1.85:1);
    const routeIndex=hardMode?Math.floor(Math.random()*routes.length):0,path=routes[routeIndex]||route;
    enemies.push({kind,x:path[0].x,y:path[0].y,p:0,routeIndex,hp:hpv,maxHp:hpv,speed:(isBoss?22+stageIndex*1.3:((kind==='bag'?45:kind==='net'?35:kind==='driftwood'?29:kind==='tire'?27:kind==='oil'?24:kind==='glass'?37:38)+wave*2)*(1+stageIndex*.025))*(hardMode?1.16:1),wobble:Math.random()*6,hit:0,slowTimer:wave===nextWaveSlowAt?6:0,slowFactor:wave===nextWaveSlowAt ? .62 : 1,freezeTimer:0,shell:kind==='bottle',windupTimer:0,windupDone:false});if(!isBoss&&bonusCoins.length<2&&Math.random()<.14)bonusCoins.push({p:0,routeIndex,life:25,value:20+Math.floor(Math.random()*21),phase:Math.random()*6})
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
  function defeat(enemy){const i=enemies.indexOf(enemy);if(i<0)return;enemies.splice(i,1);if(enemy.kind==='net'&&!enemy.split){for(let n=0;n<2;n++)enemies.push({...enemy,kind:'bag',x:enemy.x+(n?13:-13),y:enemy.y+(n?10:-10),hp:1.2,maxHp:1.2,speed:enemy.speed*1.28,split:true,wobble:Math.random()*6});addPop(enemy.x,enemy.y,'#a9fff0',12);toast('漁網ごみが小さな袋ごみに分かれた！')}pearls+=8+(enemy.kind==='driftwood'?5:0);score+=10;addPop(enemy.x,enemy.y,'#ffe18c',9);updateHUD();sfx(720,.075)}
  function leak(enemy){const i=enemies.indexOf(enemy);if(i<0)return;enemies.splice(i,1);leakCount++;const damage=enemy.kind==='oil'?2:1;hp=Math.max(0,hp-damage);addPop(870,245,'#ff987b',12);toast(enemy.kind==='oil'?'油ごみが網を大きく傷つけた！':'あみから ごみがぬけちゃった！');if(hp<=0)endGame(false);updateHUD()}
  function inIwashinAura(t){return auraActive&&Math.hypot(t.x-player.x,t.y-player.y)<=auraRadius}
  function fireTower(t,target){const d=kindData[t.kind],boosted=inIwashinAura(t),power=t.evolution==='power',swift=t.evolution==='swift',combo=['tuna','yellowtail'].includes(t.kind)&&(target.slowTimer>0||target.freezeTimer>0||target.windupTimer>0),surge=wave===waveAttackAt?waveAttackBoost:1;t.cooldown=d.rate*(power?1.38:swift?.68:1)/(1+weaponLevel*.2)*(boosted?.82:1);let dmg=(d.damage*(power?1.65:swift?.82:1)*(1+weaponLevel*.2)+(t.level-1))*(boosted?1.2:1)*surge*(combo?1.45:1);if(combo)addPop(target.x,target.y,'#c89cff',5);shots.push({x:t.x,y:t.y-6,tx:target.x,ty:target.y,enemy:target,damage:dmg,color:combo?'#c89cff':power?'#ffad4f':swift?'#72f6ff':boosted?'#ffe866':d.color,boosted,combo,kind:t.kind,life:t.kind==='tuna'?.27:.16})}
  function finishWave(){waveLive=false;waveDone=true;auraActive=false;updateHUD();if(wave>=5){endGame(true);return}waveChoiceTaken=false;waveStartTimer=6;$('#missionText').textContent=`ウェーブ ${wave} をクリア！作戦をえらぼう`;openWaveChoices();toast('ウェーブクリア！作戦カードをえらんでね！')}
  function endGame(win){
    waveLive=false;waveDone=false;paused=true;auraActive=false;
    $('#resultFish').src=win?fishImage.src:(sadImage.complete&&sadImage.naturalWidth?sadImage.src:fishImage.src);
    const clearStars=win?(hp/(5+netLevel*2)>=.8&&leakCount===0?3:hp/(5+netLevel*2)>=.45&&leakCount<=2?2:1):0;if(win){unlockedStage=Math.max(unlockedStage,Math.min(totalStages,stageIndex+2));localStorage.setItem('iwashinDefenseUnlocked',String(unlockedStage));unlockSeaLore(stageIndex);const key=(hardMode?'hard':'normal')+stageIndex;stageStars[key]=Math.max(stageStars[key]||0,clearStars);localStorage.setItem('iwashinDefenseStars',JSON.stringify(stageStars));if(!hardMode&&stageIndex===totalStages-1){hardUnlocked=true;localStorage.setItem('iwashinDefenseHardUnlocked','1')}pearls+=40+stageIndex*10}
    let starBadge=$('#resultStars');if(!starBadge){starBadge=document.createElement('p');starBadge.id='resultStars';starBadge.style.cssText='margin:6px 0 10px;color:#ffd978;font-size:22px;font-weight:1000;letter-spacing:.12em';$('#resultTitle').after(starBadge)}starBadge.textContent=win?`評価　${'★'.repeat(clearStars)}${'☆'.repeat(3-clearStars)}`:'';let loreResult=$('#resultLoreBtn');if(!loreResult){loreResult=document.createElement('button');loreResult.id='resultLoreBtn';loreResult.type='button';loreResult.className='result-secondary';loreResult.addEventListener('click',()=>openSeaLore(stageIndex));$('.result-actions').prepend(loreResult)}loreResult.hidden=!win;loreResult.textContent='氷見の海メモを読む　🐟';$('#resultEyebrow').textContent=win?`STAGE ${stageIndex+1} ${hardMode?'HARD ':''}CLEAR!`:'TRY AGAIN';$('#resultTitle').textContent=win?(stageIndex===totalStages-1?(hardMode?'ハード全10ステージ制覇！':hardUnlocked?'ハードモード解放！':'全10ステージ制覇！'):'あみをまもった！'):'あみがやぶれちゃった…';$('#resultText').textContent=win?`「${stage.name}」${hardMode?'ハードで':''}クリア！ ごみ ${score/10}こをかたづけたよ。氷見の海メモを1つ発見！ ${!hardMode&&stageIndex===totalStages-1?'ハードモードが解放されたよ！':'ボーナス ✦ '+(40+stageIndex*10)}`:'魚のなかまたちと もう一度チャレンジしよう。';
    $('#nextStageBtn').hidden=!win||stageIndex>=totalStages-1;$('#retryBtn').hidden=false;$('#stageSelectResultBtn').hidden=false;$('#homeBtn').hidden=false;
    const result=$('#resultScreen');result.classList.remove('win','fail');result.classList.add(win?'win':'fail');result.classList.remove('hidden');
  }
  function retryStage(){enterStage(stageIndex)}
  function placeOrSelect(x,y){
    if(!started){return}
    const coinIndex=bonusCoins.findIndex(c=>{const p=routePoint(c.p,routes[c.routeIndex]||route);return Math.hypot(p.x-x,p.y-y)<25});if(coinIndex>=0){const coin=bonusCoins.splice(coinIndex,1)[0];pearls+=coin.value;addPop(x,y,'#ffe866',12);toast(`ボーナスコイン！ ✦ ${coin.value}ポイント！`);updateHUD();sfx(880,.13);return}const hitSlot=slots.findIndex(s=>Math.hypot(s.x-x,s.y-y)<32);
    if(hitSlot>=0){const existing=towers.find(t=>t.slot===hitSlot);if(existing){openTower(existing);return}const d=kindData[selectedKind];if(pearls<d.cost){toast('ポイントがたりないよ');return}pearls-=d.cost;towers.push({kind:selectedKind,slot:hitSlot,x:slots[hitSlot].x,y:slots[hitSlot].y,level:1,cooldown:.2});addPop(slots[hitSlot].x,slots[hitSlot].y,d.color,6);toast(`${d.name} が なかまになった！`);updateHUD();sfx(660,.12);return}
    player.x=Math.max(38,Math.min(W-38,x));player.y=Math.max(65,Math.min(H-55,y));player.blink=.18;return
  }
  function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}}
  function openTower(t){activeTower=t;const d=kindData[t.kind],refund=Math.floor(d.cost*.45),opts=branchNames[t.kind];$('#towerTitle').textContent=d.name+' Lv.'+t.level;$('#towerDescription').textContent=d.speed+'・射程 '+d.range+'　攻撃力 '+Math.round(d.damage*(1+weaponLevel*.2)+(t.level-1))+'　攻撃間隔 約'+d.rate+'秒。';$('#evolutionChoices').hidden=!opts||!!t.evolution;if(opts){$('#evolutionPathA').textContent=opts[0]+'：攻撃力 +65%、攻撃間隔 +38%';$('#evolutionPathB').textContent=opts[1]+'：攻撃力 -18%、攻撃間隔 -32%';$('#evolutionPathA').disabled=$('#evolutionPathB').disabled=!!t.evolution}$('#towerUpgradeBtn').textContent='強化する　✦ '+(d.upgrade+(t.level-1)*30);$('#towerUpgradeBtn').disabled=pearls<d.upgrade+(t.level-1)*30;$('#towerRemoveBtn').textContent='チームからはずす　返却✦'+refund;$('#towerDialog').showModal()}
  function upgradeTower(){if(!activeTower)return;const d=kindData[activeTower.kind],cost=d.upgrade+(activeTower.level-1)*30;if(pearls<cost){toast('ポイントがたりないよ');return}pearls-=cost;activeTower.level++;activeTower.cooldown=0;addPop(activeTower.x,activeTower.y,'#ffe08a',12);$('#towerDialog').close();toast(`${d.name} が進化した！ Lv.${activeTower.level}`);updateHUD()}
  function upgradeNet(){const cost=45+netLevel*35;if(pearls<cost){toast('ポイントがたりないよ');return}pearls-=cost;netLevel++;hp=Math.min(5+netLevel*2,hp+2);addPop(490,115,'#a7fff0',16);toast('あみが つよくなった！耐久力も回復！');updateHUD()}
  function upgradeWeapon(){const cost=60+weaponLevel*45;if(pearls<cost){toast('ポイントがたりないよ');return}pearls-=cost;weaponLevel++;addPop(490,264,'#ffd477',15);toast(`魚みんなの ぶきがパワーアップ！ Lv.${weaponLevel+1}`);updateHUD()}
  function tick(dt,now){
    if(!paused){
      if(started&&!waveLive&&wave<5&&waveStartTimer>0){waveStartTimer=Math.max(0,waveStartTimer-dt);if(waveStartTimer===0)beginWave()}if(!specialReady){specialTimer=Math.max(0,specialTimer-dt);if(specialTimer===0)specialReady=true}
      const auraWorking=auraActive&&waveLive;
      if(auraWorking){auraEnergy=Math.max(0,auraEnergy-auraDrain*dt);if(auraEnergy===0){auraActive=false;toast('元気を使い切ったよ。休むと回復するよ！')}}
      else if(!auraActive||!waveLive)auraEnergy=Math.min(100,auraEnergy+auraRecover*dt);
      if(waveLive){for(const coin of bonusCoins){coin.p+=dt*.045;coin.life-=dt}bonusCoins=bonusCoins.filter(c=>c.life>0&&c.p<1);spawnTimer-=dt;if(spawnLeft>0&&spawnTimer<=0){newEnemy();spawnLeft--;spawnTimer=Math.max(.32,(1.15-wave*.08)*(hardMode?.72:1))}
        for(const e of [...enemies]){e.wobble+=dt*4;e.slowTimer=Math.max(0,(e.slowTimer||0)-dt);e.freezeTimer=Math.max(0,(e.freezeTimer||0)-dt);let windup=e.windupTimer>0;if(e.kind==='boss'&&!e.windupDone&&e.p>=.46){e.windupDone=true;e.windupTimer=1.5;windup=true;addPop(e.x,e.y,'#ffad69',18);toast('中ボスが大波をためている！今が攻撃チャンス！')}if(windup)e.windupTimer=Math.max(0,e.windupTimer-dt);else e.p+=e.speed*dt/1030*(e.freezeTimer>0?0:e.slowTimer>0?e.slowFactor:1)*(stage.gimmick&&Math.hypot(e.x-stage.gimmick.x,e.y-stage.gimmick.y)<stage.gimmick.r?(stage.gimmick.type==='kelp'?.62:1.42):1);const p=routePoint(e.p,routes[e.routeIndex]||route);e.x=p.x;e.y=p.y;if(e.p>=1)leak(e)}
        for(const t of towers){if(t.kind==='jelly'){const range=kindData.jelly.range+(t.level-1)*12;for(const e of enemies){if(Math.hypot(e.x-t.x,e.y-t.y)<range){e.slowTimer=.16;e.slowFactor=.65}}}else if(t.kind==='squid'){t.cooldown-=dt;if(t.cooldown<=0){let hit=0;for(const e of enemies){if(Math.hypot(e.x-t.x,e.y-t.y)<kindData.squid.range+(t.level-1)*12){e.slowTimer=1.6+(t.level-1)*.2;e.slowFactor=.45;hit++;addPop(e.x,e.y,'#b9f7ff',3)}}t.cooldown=kindData.squid.rate;if(hit)toast('イカの墨！敵の群れがスローダウン！')}}else if(t.kind==='octopus'){t.cooldown-=dt;if(t.cooldown<=0){const target=enemies.filter(e=>Math.hypot(e.x-t.x,e.y-t.y)<kindData.octopus.range+(t.level-1)*12).sort((a,b)=>b.p-a.p)[0];t.cooldown=kindData.octopus.rate;if(target){target.freezeTimer=1.1+(t.level-1)*.15;addPop(target.x,target.y,'#ff9eaf',12);toast('タコの足！敵を足止め！')}}}}for(const t of towers){const d=kindData[t.kind];if(d.support)continue;t.cooldown-=dt;const range=d.range*(t.evolution==='power'?.94:t.evolution==='swift'?1.08:1)*(inIwashinAura(t)?1.12:1);if(t.cooldown<=0){let target=null,most=-1;for(const e of enemies){const dist=Math.hypot(e.x-t.x,e.y-t.y);if(dist<range&&e.p>most){most=e.p;target=e}}if(target)fireTower(t,target)}}
        for(const s of [...shots]){s.life-=dt;if(s.life<=0){if(s.enemy&&enemies.includes(s.enemy)){let hitDamage=s.damage;if(s.enemy.kind==='bottle'&&s.enemy.shell){s.enemy.shell=false;hitDamage*=.45;addPop(s.tx,s.ty,'#eaffc9',10);toast('ペットボトルのかたい殻！次の攻撃から弱くなるよ')}if(s.enemy.kind==='tire')hitDamage*=.72;s.enemy.hp-=hitDamage;s.enemy.hit=.12;if(s.enemy.hp<=0)defeat(s.enemy);if(s.kind==='mackerel'){addPop(s.tx,s.ty,'#71f1cd',8);for(const e of [...enemies])if(e!==s.enemy&&Math.hypot(e.x-s.tx,e.y-s.ty)<48){e.hp-=1.2;if(e.hp<=0)defeat(e)}}else if(s.kind==='tuna')addPop(s.tx,s.ty,'#fb6c9a',16);else if(s.kind==='yellowtail')addPop(s.tx,s.ty,'#ffad69',11)}shots.splice(shots.indexOf(s),1)}}
        if(spawnLeft===0&&enemies.length===0)finishWave();
      }
      for(const p of [...particles]){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=36*dt;if(p.life<=0)particles.splice(particles.indexOf(p),1)}
    }
    draw();hudAccumulator+=dt;if(hudAccumulator>=.1){updateHUD();hudAccumulator=0}requestAnimationFrame(loop)
  }
  function loop(now){if(!lastTime)lastTime=now;let dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;tick(dt,now)}

  canvas.addEventListener('pointerdown',e=>{e.preventDefault();const p=canvasPoint(e);placeOrSelect(p.x,p.y)});
  $('#fishCards').addEventListener('click',e=>{const card=e.target.closest('.fish-card');if(!card)return;selectedKind=card.dataset.kind;updateHUD();if(!started)toast(`${kindData[selectedKind].name} を配置できるよ`)});
  $('#startBtn').addEventListener('click',openStageDialog);
  $('#waveBtn').addEventListener('click',beginWave);$('#cleanBtn').addEventListener('click',attackSpecial);
  $('#auraBtn').addEventListener('click',toggleAura);
  $('#netUpgrade').addEventListener('click',upgradeNet);$('#weaponUpgrade').addEventListener('click',upgradeWeapon);
  $('#towerUpgradeBtn').addEventListener('click',upgradeTower);
  $('#towerRemoveBtn').addEventListener('click',()=>{if(activeTower){const d=kindData[activeTower.kind],refund=Math.floor(d.cost*.45);if(!confirm(`チームからはずしますか？ ${refund}ポイントが戻ります。強化に使ったポイントは戻りません。`))return;pearls+=refund;towers=towers.filter(t=>t!==activeTower);activeTower=null;$('#towerDialog').close();updateHUD();toast(`${d.name}をはずしました。✦${refund}ポイント返却`)}});
  $('#nextStageBtn').addEventListener('click',()=>{if(stageIndex<totalStages-1)enterStage(stageIndex+1)});
  $('#stageSelectResultBtn').addEventListener('click',openStageDialog);
  $('#homeBtn').addEventListener('click',returnToTitle);$('#retryBtn').addEventListener('click',retryStage);
  $('#stageMenuBtn').addEventListener('click',()=>{if(waveLive){toast('ウェーブが終わってからステージをえらんでね');return}openStageDialog()});
  $('#stagePlayBtn').addEventListener('click',()=>{const chosen=pendingStage;hardMode=pendingHard;$('#stageDialog').close();enterStage(chosen)});
  $('#stageBackBtn').addEventListener('click',()=>$('#stageDialog').close());
  $('#helpBtn').addEventListener('click',()=>$('#helpDialog').showModal());
  $('#pauseBtn').addEventListener('click',()=>{if(!started){$('#helpDialog').showModal();return}paused=true;$('#pauseDialog').showModal()});
  $('#resumeBtn').addEventListener('click',()=>{paused=false;$('#pauseDialog').close()});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d&&d.id!=='pauseDialog')d.close()}));
  function sfx(freq,duration=.1){if(muted||!audioCtx)return;const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.045,audioCtx.currentTime+.015);gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration+.02)}
  $('#soundBtn').addEventListener('click',()=>{muted=!muted;$('#soundBtn').textContent=muted?'♫':'♪';$('#soundBtn').setAttribute('aria-label',muted?'音をオンにする':'音をオフにする');if(!muted){audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume?.();toast('効果音をオンにしたよ');sfx(660,.14)}else toast('音をオフにしたよ')});
  window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();attackSpecial()}if(e.code==='Escape'){if($('#towerDialog').open)$('#towerDialog').close();else if($('#helpDialog').open)$('#helpDialog').close();else if(started&&!paused){paused=true;$('#pauseDialog').showModal()}}});
  window.addEventListener('resize',resize);window.addEventListener('orientationchange',()=>setTimeout(resize,100));
  setStage(0);updateHUD();resize();requestAnimationFrame(loop);
})();
