const $=id=>document.getElementById(id);
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ss=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};

// ═══ CURSOR ═══
const cursor=$('cursor'),cdot=$('cdot');
let cx=0,cy=0,tx=0,ty=0;
addEventListener('mousemove',e=>{tx=e.clientX;ty=e.clientY;cdot.style.left=tx+'px';cdot.style.top=ty+'px'});
addEventListener('mousedown',()=>cursor.classList.add('click'));
addEventListener('mouseup',()=>cursor.classList.remove('click'));
(function cl(){cx+=(tx-cx)*.2;cy+=(ty-cy)*.2;cursor.style.left=cx+'px';cursor.style.top=cy+'px';requestAnimationFrame(cl)})();

// ═══ AUDIO (Tone.js) — auto-start on first gesture ═══
let aR=false,aE=true;
let drone,dF,mG,shm,hvS,clS,dpS,nsS,chS;
const aBtn=$('audioBtn');
let _bootAudioPromise=null;

async function bootAudio(){
  if(aR)return;
  if(_bootAudioPromise)return _bootAudioPromise;
  if(typeof Tone==='undefined'){console.warn('Tone unavailable');return}
  _bootAudioPromise=(async()=>{
  try{
    await Tone.start();
    mG=new Tone.Gain(.5).toDestination();
    const rv=new Tone.Reverb({decay:10,wet:.55}).connect(mG);
    dF=new Tone.Filter(600,'lowpass',-24).connect(rv);
    drone=new Tone.FMSynth({harmonicity:1.005,modulationIndex:3,envelope:{attack:6,release:6,sustain:1},oscillator:{type:'sine'},volume:-14}).connect(dF);
    shm=new Tone.PolySynth(Tone.Synth,{oscillator:{type:'sine'},envelope:{attack:3,decay:2,sustain:.5,release:5},volume:-26}).connect(rv);
    hvS=new Tone.Synth({oscillator:{type:'triangle'},envelope:{attack:.001,decay:.12,sustain:0,release:.15},volume:-24}).connect(rv);
    clS=new Tone.Synth({oscillator:{type:'square'},envelope:{attack:.001,decay:.04,sustain:0,release:.04},volume:-22}).connect(mG);
    dpS=new Tone.MembraneSynth({octaves:8,pitchDecay:.04,envelope:{attack:.001,decay:.5,sustain:0,release:.5},volume:-4}).connect(mG);
    nsS=new Tone.NoiseSynth({noise:{type:'brown'},envelope:{attack:.001,decay:1.2,sustain:0},volume:-10}).connect(rv);
    chS=new Tone.PolySynth(Tone.Synth,{oscillator:{type:'triangle'},envelope:{attack:.03,decay:.5,sustain:.4,release:1.5},volume:-14}).connect(rv);
    drone.triggerAttack('C2');
    const notes=['C5','E5','G5','B5','D6','F#5'];
    setInterval(()=>{if(!aE)return;shm.triggerAttackRelease(notes[Math.floor(Math.random()*notes.length)],'1.5n')},5500);
    let fp=0;
    setInterval(()=>{fp+=.012;dF.frequency.rampTo(400+Math.sin(fp)*220,.5)},200);
    aR=true;aE=true;
    aBtn.classList.add('active');aBtn.textContent='♪ AUDIO ON';
  }catch(e){console.warn('audio fail',e);aBtn.textContent='♪ AUDIO N/A';aBtn.disabled=true}
  })();
  return _bootAudioPromise;
}
async function tAudio(){
  if(!aR){aBtn.textContent='♪ AUDIO…';await bootAudio();return}
  aE=!aE;
  if(mG)mG.gain.rampTo(aE?.5:0,.3);
  aBtn.classList.toggle('active',aE);
  aBtn.textContent=aE?'♪ AUDIO ON':'♪ AUDIO OFF';
}
aBtn.addEventListener('click',tAudio);
function fg(){if(!aR)bootAudio()}
addEventListener('click',fg);addEventListener('keydown',fg);

function sHov(p='E5'){if(!aR||!aE)return;try{hvS.triggerAttackRelease(p,'32n')}catch(e){}}
function sClk(){if(!aR||!aE)return;try{clS.triggerAttackRelease('C6','64n')}catch(e){}}
function sBlk(){if(!aR||!aE)return;try{dpS.triggerAttackRelease('G1','16n')}catch(e){}}
function sWin(){if(!aR||!aE)return;try{dpS.triggerAttackRelease('C1','8n');setTimeout(()=>chS.triggerAttackRelease(['C4','E4','G4','B4','D5'],'2n'),80)}catch(e){}}
function sTmp(){if(!aR||!aE)return;try{nsS.triggerAttackRelease('2n');chS.triggerAttackRelease(['C#3','D3','F#3','G3'],'4n')}catch(e){}}
function sMh(){if(!aR||!aE)return;try{clS.triggerAttackRelease('G3','64n')}catch(e){}}

// ═══ UNIVERSAL HOVER/CLICK AUDIO ═══
document.addEventListener('mouseover',e=>{
  const el=e.target.closest('button, a, input, [data-hover], .dc, .tit');
  if(el){
    cursor.classList.add('hov');
    let p='E5';
    if(el.matches('.dc'))p='G5';
    else if(el.matches('.tit'))p='A5';
    else if(el.matches('.mb'))p='C5';
    else if(el.matches('.rb'))p='F5';
    else if(el.matches('input'))p='B5';
    sHov(p);
  }
});
document.addEventListener('mouseout',e=>{
  const el=e.target.closest('button, a, input, [data-hover], .dc, .tit');
  if(el)cursor.classList.remove('hov');
});
document.addEventListener('click',e=>{
  if(e.target.closest('button, a, .dc, .tit, [data-hover]'))sClk();
});

// ═══ HUD ═══
setInterval(()=>{
  const d=new Date();
  const hms=[d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds()].map(n=>String(n).padStart(2,'0')).join(':');
  $('htime').textContent=hms+' UTC';
  const bt=$('bootTime');if(bt)bt.textContent=hms;
},1000);
setInterval(()=>{
  $('htps').textContent=(12000+Math.floor(Math.random()*3000)).toLocaleString('fr-FR');
  $('hn').textContent=248+Math.floor(Math.random()*16);
},1600);

// ═══ BOOT ═══
const bootLog=$('bootLog');
const ascii=`       ┌──────┐
      ╱│     ╱│
     ╱ │    ╱ │
    ┌──┼───┐  │
    │  └───┼──┘
    │ ╱    │ ╱
    │╱     │╱
    └──────┘`;
const bL=[
{t:100,text:'tesseract.chain // cold boot'},{t:200,text:''},
{t:100,text:'[BOOT] Loading kernel...',cls:'head'},
{t:100,text:'    [OK] WebGL2 context acquired',cls:'ok'},
{t:100,text:'    [OK] Shader pipeline compiled',cls:'ok'},
{t:100,text:'    [OK] 4D projection matrices loaded',cls:'ok'},
{t:100,text:'    [OK] Post-processing (bloom + aberration)',cls:'ok'},
{t:100,text:'    [OK] SHA-256 hardware acceleration detected',cls:'ok'},
{t:180,text:''},
{t:100,text:'[AUDIO] Synthesis engine...',cls:'head'},
{t:100,text:'    [OK] FM drone + reverb chain ready',cls:'info'},
{t:180,text:''},
{t:100,text:'[NET] Connecting to mesh...',cls:'head'},
{t:120,text:'    nodes[000:064] ............. ONLINE',cls:'info'},
{t:110,text:'    nodes[064:128] ............. ONLINE',cls:'info'},
{t:110,text:'    nodes[128:192] ............. ONLINE',cls:'info'},
{t:110,text:'    nodes[192:256] ............. ONLINE',cls:'info'},
{t:180,text:''},
{t:100,text:'[SYNC] Last block: #8,427,991'},
{t:100,text:'[SYNC] Consensus: validated across 256/256 nodes'},
{t:200,text:''},
{t:100,text:ascii,cls:'ascii'},
{t:380,text:''},
{t:100,text:'▸ TESSERACT ONLINE. All systems nominal.',cls:'warn'}];

async function runBoot(){
  for(const l of bL){
    await new Promise(r=>setTimeout(r,l.t));
    const d=document.createElement('div');
    if(l.cls==='ascii'){d.className='bl ascii';d.textContent=l.text}
    else{d.className='bl'+(l.cls?' '+l.cls:'');d.textContent=l.text||'\u00A0'}
    bootLog.appendChild(d);
  }
  await new Promise(r=>setTimeout(r,400));
  const p=document.createElement('div');
  p.className='bp ready';
  p.innerHTML='&gt;&nbsp;&nbsp;Appuyez sur <span class="key">ENTRÉE</span> pour entrer dans la 4ᵉ dimension';
  bootLog.appendChild(p);
  await new Promise(r=>{
    const h=e=>{if(e.key==='Enter'||e.key===' '||e.type==='click'){removeEventListener('keydown',h);removeEventListener('click',h);r()}};
    addEventListener('keydown',h);addEventListener('click',h);
  });
  const fl=$('flash');fl.classList.add('on');$('boot').classList.add('flash');
  bootAudio();
  setTimeout(()=>fl.classList.remove('on'),160);
  setTimeout(()=>{$('boot').classList.add('gone');$('boot').classList.remove('flash')},240);
  revealHero();
}
function revealHero(){
  const title='TESSERACT\nCHAIN';
  const el=$('ht');el.innerHTML='';
  const letters=[];
  title.split('').forEach(ch=>{
    if(ch==='\n'){el.appendChild(document.createElement('br'));return}
    const s=document.createElement('span');s.textContent=ch;el.appendChild(s);letters.push(s);
  });
  letters.forEach((s,i)=>{s.style.animationDelay=(.2+i*.05)+'s'});
}

// ═══ THREE.JS ═══
const canvas=$('bgCanvas');
const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x02030a,.04);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,100);
camera.position.set(0,0,7);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.autoClear=true;
renderer.setClearColor(0x000000,1);

// 4D data
const v4=[];
for(let i=0;i<16;i++)v4.push([(i&1)?1:-1,(i&2)?1:-1,(i&4)?1:-1,(i&8)?1:-1]);
const edges=[];
for(let i=0;i<16;i++)for(let j=i+1;j<16;j++){const d=i^j;if((d&(d-1))===0)edges.push([i,j])}

function rot4(v,aXW,aYZ,aXY,aZW){
  let [x,y,z,w]=v,c,s,n1,n2;
  c=Math.cos(aXW);s=Math.sin(aXW);n1=x*c-w*s;n2=x*s+w*c;x=n1;w=n2;
  c=Math.cos(aYZ);s=Math.sin(aYZ);n1=y*c-z*s;n2=y*s+z*c;y=n1;z=n2;
  c=Math.cos(aXY);s=Math.sin(aXY);n1=x*c-y*s;n2=x*s+y*c;x=n1;y=n2;
  c=Math.cos(aZW);s=Math.sin(aZW);n1=z*c-w*s;n2=z*s+w*c;z=n1;w=n2;
  return [x,y,z,w];
}
function proj(v,d=2.8){const k=1/(d-v[3]);return [v[0]*k*d,v[1]*k*d,v[2]*k*d]}

function bLines(op,sc){
  const g=new THREE.BufferGeometry();
  const p=new Float32Array(edges.length*6);
  const c=new Float32Array(edges.length*6);
  g.setAttribute('position',new THREE.BufferAttribute(p,3));
  g.setAttribute('color',new THREE.BufferAttribute(c,3));
  const m=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false});
  const l=new THREE.LineSegments(g,m);l.scale.setScalar(sc);return l;
}
const mTess=new THREE.Group();
const layers=[bLines(1,1),bLines(.35,1.04),bLines(.16,1.1),bLines(.07,1.2)];
layers.forEach(l=>mTess.add(l));
scene.add(mTess);

function mkTex(st){
  const c=document.createElement('canvas');c.width=c.height=128;
  const g=c.getContext('2d');
  const gr=g.createRadialGradient(64,64,0,64,64,64);
  st.forEach(([p,col])=>gr.addColorStop(p,col));
  g.fillStyle=gr;g.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}
const nTex=mkTex([[0,'rgba(255,255,255,1)'],[.12,'rgba(0,240,255,1)'],[.35,'rgba(139,92,246,.55)'],[1,'rgba(0,0,0,0)']]);
const pTex=mkTex([[0,'rgba(255,255,255,1)'],[.18,'rgba(255,0,212,1)'],[.48,'rgba(255,0,212,.35)'],[1,'rgba(0,0,0,0)']]);
const sTex=mkTex([[0,'rgba(255,255,255,1)'],[.4,'rgba(255,255,255,.3)'],[1,'rgba(255,255,255,0)']]);
const rTex=mkTex([[0,'rgba(255,255,255,1)'],[.18,'rgba(255,34,68,1)'],[.48,'rgba(255,34,68,.35)'],[1,'rgba(0,0,0,0)']]);

const vSpr=[];
for(let i=0;i<16;i++){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:nTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.9}));
  s.scale.setScalar(.3);
  s.userData={bs:.3,pls:0,rpls:0};
  mTess.add(s);vSpr.push(s);
}

class Pulse{
  constructor(){
    this.spr=new THREE.Sprite(new THREE.SpriteMaterial({map:Math.random()<.4?pTex:nTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));
    this.spr.scale.setScalar(.2+Math.random()*.12);
    this.reset(true);
  }
  reset(i){
    this.ei=Math.floor(Math.random()*edges.length);
    this.pr=i?Math.random():0;
    this.sp=.18+Math.random()*.55;
    this.lf=i?Math.random()*2:0;
    this.ml=1.5+Math.random()*2.2;
  }
  update(dt,pj){
    this.pr+=this.sp*dt;this.lf+=dt;
    if(this.pr>=1||this.lf>=this.ml)this.reset(false);
    const [a,b]=edges[this.ei];const p1=pj[a],p2=pj[b];
    this.spr.position.set(p1[0]+(p2[0]-p1[0])*this.pr,p1[1]+(p2[1]-p1[1])*this.pr,p1[2]+(p2[2]-p1[2])*this.pr);
    const t=this.lf/this.ml;
    this.spr.material.opacity=Math.sin(Math.PI*t)*.95;
  }
}
const pulses=Array.from({length:44},()=>new Pulse());
pulses.forEach(p=>mTess.add(p.spr));

// Satellite tesseracts for outro
const sats=[];
for(let s=0;s<6;s++){
  const grp=new THREE.Group();
  const g=new THREE.BufferGeometry();
  const p=new Float32Array(edges.length*6);
  const c=new Float32Array(edges.length*6);
  g.setAttribute('position',new THREE.BufferAttribute(p,3));
  g.setAttribute('color',new THREE.BufferAttribute(c,3));
  const m=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
  const ln=new THREE.LineSegments(g,m);grp.add(ln);
  const a=(s/6)*Math.PI*2;const ds=14+Math.random()*5;
  grp.position.set(Math.cos(a)*ds,(Math.random()-.5)*7,Math.sin(a)*ds);
  grp.scale.setScalar(.6+Math.random()*.35);
  grp.userData={ln,m,ph:Math.random()*1000};
  scene.add(grp);sats.push(grp);
}

// Stars
const sG=new THREE.BufferGeometry();
const sP=new Float32Array(1500*3),sC=new Float32Array(1500*3);
const cA=new THREE.Color(0x00f0ff),cB=new THREE.Color(0xff00d4),cC=new THREE.Color(0x8b5cf6);
for(let i=0;i<1500;i++){
  const r=10+Math.random()*40;const th=Math.random()*Math.PI*2;const ph=Math.acos(2*Math.random()-1);
  sP[i*3]=r*Math.sin(ph)*Math.cos(th);sP[i*3+1]=r*Math.sin(ph)*Math.sin(th);sP[i*3+2]=r*Math.cos(ph);
  const rn=Math.random();const c=rn<.55?cA:(rn<.8?cB:cC);
  sC[i*3]=c.r;sC[i*3+1]=c.g;sC[i*3+2]=c.b;
}
sG.setAttribute('position',new THREE.BufferAttribute(sP,3));
sG.setAttribute('color',new THREE.BufferAttribute(sC,3));
const stars=new THREE.Points(sG,new THREE.PointsMaterial({size:.11,map:sTex,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));
scene.add(stars);

// ═══ POST-PROCESSING ═══
const vs=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}`;
const sRT=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
const hw=Math.max(256,Math.floor(innerWidth/2));
const hh=Math.max(256,Math.floor(innerHeight/2));
const bRT=new THREE.WebGLRenderTarget(hw,hh);
const h1=new THREE.WebGLRenderTarget(hw,hh);
const h2=new THREE.WebGLRenderTarget(hw,hh);

const pScn=new THREE.Scene();
const pCm=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const pQd=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial());
pScn.add(pQd);

const thM=new THREE.ShaderMaterial({
  uniforms:{tD:{value:null}},vertexShader:vs,
  fragmentShader:`uniform sampler2D tD;varying vec2 vUv;void main(){vec3 c=texture2D(tD,vUv).rgb;float b=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(.55,1.,b),1.);}`
});
const blM=new THREE.ShaderMaterial({
  uniforms:{tD:{value:null},uDr:{value:new THREE.Vector2(1,0)},uR:{value:new THREE.Vector2(hw,hh)}},
  vertexShader:vs,
  fragmentShader:`uniform sampler2D tD;uniform vec2 uDr;uniform vec2 uR;varying vec2 vUv;
  void main(){vec2 t=1./uR;vec4 s=vec4(0.);float w[9];w[0]=.05;w[1]=.09;w[2]=.12;w[3]=.15;w[4]=.18;w[5]=.15;w[6]=.12;w[7]=.09;w[8]=.05;
  for(int i=0;i<9;i++){vec2 o=uDr*t*float(i-4)*2.5;s+=texture2D(tD,vUv+o)*w[i];}gl_FragColor=s;}`
});
const cmM=new THREE.ShaderMaterial({
  uniforms:{tS:{value:null},tB:{value:null},uT:{value:0},uAb:{value:.005},uBl:{value:1.4},uRd:{value:0}},
  vertexShader:vs,
  fragmentShader:`uniform sampler2D tS;uniform sampler2D tB;uniform float uT;uniform float uAb;uniform float uBl;uniform float uRd;varying vec2 vUv;
  float rnd(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){
    vec2 uv=vUv;vec2 ct=vec2(.5);vec2 dr=uv-ct;float ds=length(dr);
    vec3 bg=mix(vec3(.005,.012,.04),vec3(.09,.045,.17),uv.y);
    bg+=vec3(.54,.36,.96)*smoothstep(.85,.3,length(uv-vec2(.5,1.1)))*.25;
    bg+=vec3(0.,.94,1.)*smoothstep(.7,.2,length(uv-vec2(.5,-.1)))*.12;
    float am=uAb*(1.+ds*1.8);
    float r=texture2D(tS,uv-dr*am).r;float g=texture2D(tS,uv).g;float b=texture2D(tS,uv+dr*am).b;
    vec3 sc=vec3(r,g,b);
    vec3 bl=texture2D(tB,uv).rgb*uBl;
    vec3 col=bg+sc+bl;
    if(uRd>.01){vec3 rt=vec3(1.,.2,.3);col=mix(col,col*rt+vec3(.15,0.,.02),uRd);}
    col*=mix(.25,1.,smoothstep(1.3,.3,ds));
    col+=(rnd(uv*1800.+uT)-.5)*.055;
    col=col/(col+vec3(.5))*1.5;
    gl_FragColor=vec4(col,1.);
  }`
});

function renderPost(t){
  renderer.setRenderTarget(sRT);renderer.clear();renderer.render(scene,camera);
  pQd.material=thM;thM.uniforms.tD.value=sRT.texture;
  renderer.setRenderTarget(bRT);renderer.clear();renderer.render(pScn,pCm);
  pQd.material=blM;
  blM.uniforms.tD.value=bRT.texture;blM.uniforms.uDr.value.set(1,0);
  renderer.setRenderTarget(h1);renderer.clear();renderer.render(pScn,pCm);
  blM.uniforms.tD.value=h1.texture;blM.uniforms.uDr.value.set(0,1);
  renderer.setRenderTarget(h2);renderer.clear();renderer.render(pScn,pCm);
  blM.uniforms.tD.value=h2.texture;blM.uniforms.uDr.value.set(1,0);
  renderer.setRenderTarget(h1);renderer.clear();renderer.render(pScn,pCm);
  blM.uniforms.tD.value=h1.texture;blM.uniforms.uDr.value.set(0,1);
  renderer.setRenderTarget(h2);renderer.clear();renderer.render(pScn,pCm);
  pQd.material=cmM;
  cmM.uniforms.tS.value=sRT.texture;cmM.uniforms.tB.value=h2.texture;cmM.uniforms.uT.value=t;
  renderer.setRenderTarget(null);renderer.clear();renderer.render(pScn,pCm);
}

// ═══ INTERACTION ═══
let dragY=0,dragX=0,dragW=0,vdX=0,vdY=0,vdW=0;
let isDr=false,shH=false,lMx=0,lMy=0;

function onInt(t){return t&&t.closest&&t.closest('button, a, input, .dc, .tit, .tb, .tbe, #cli, .hb')}

addEventListener('mousedown',e=>{
  if(onInt(e.target))return;
  isDr=true;lMx=e.clientX;lMy=e.clientY;
  cursor.classList.add('drag');
});
addEventListener('mouseup',()=>{isDr=false;cursor.classList.remove('drag')});
addEventListener('mousemove',e=>{
  if(!isDr)return;
  const dx=e.clientX-lMx,dy=e.clientY-lMy;
  lMx=e.clientX;lMy=e.clientY;
  if(shH)vdW+=dx*.005;
  else{vdY+=dx*.005;vdX+=dy*.005}
});
addEventListener('keydown',e=>{if(e.key==='Shift')shH=true});
addEventListener('keyup',e=>{if(e.key==='Shift')shH=false});

// Scroll
let sy=0,sp=0;
addEventListener('scroll',()=>{sy=scrollY;sp=clamp(sy/(document.body.scrollHeight-innerHeight),0,1)});
let tmx=0,tmy=0,mx=0,my=0;
addEventListener('mousemove',e=>{tmx=(e.clientX/innerWidth-.5)*2;tmy=(e.clientY/innerHeight-.5)*2});

// Camera keys
const cK=[
{p:[0,0,7],l:[0,0,0]},
{p:[-1.8,.5,5.2],l:[0,0,0]},
{p:[0,0,2.8],l:[0,0,0]},
{p:[2.5,.3,5.5],l:[0,0,0]},
{p:[0,-.8,3.8],l:[0,0,0]},
{p:[-1,-1.5,3.3],l:[0,0,0]},
{p:[1.5,1,4.5],l:[0,0,0]},
{p:[0,6,18],l:[0,0,0]}];
function gK(p){
  const n=cK.length-1;const idx=clamp(Math.floor(p*n),0,n-1);
  const t=p*n-idx;const a=cK[idx],b=cK[idx+1];const tt=t*t*(3-2*t);
  return {p:[lerp(a.p[0],b.p[0],tt),lerp(a.p[1],b.p[1],tt),lerp(a.p[2],b.p[2],tt)],l:[lerp(a.l[0],b.l[0],tt),lerp(a.l[1],b.l[1],tt),lerp(a.l[2],b.l[2],tt)]};
}

// Tesseract state
let tPls=0,rMd=0,gMd=0;
function pTs(){tPls=1}
function sRM(v){rMd=v}
function shake(){document.body.classList.add('shake');setTimeout(()=>document.body.classList.remove('shake'),500)}
function pVx(idx,red){
  if(idx<0||idx>=vSpr.length)return;
  const s=vSpr[idx];
  if(red){s.material.map=rTex;s.userData.rpls=1}
  else{s.material.map=nTex;s.userData.pls=1}
}

// ═══ LOOP ═══
let t0=performance.now();
function frame(){
  const n=performance.now(),t=(n-t0)*.001,dt=.016;
  mx+=(tmx-mx)*.04;my+=(tmy-my)*.04;
  dragX+=vdX;dragY+=vdY;dragW+=vdW;
  vdX*=.92;vdY*=.92;vdW*=.92;

  const aXW=t*.22+dragW,aYZ=t*.36-dragX*.4,aXY=t*.16+dragY,aZW=t*.2;
  const pj=v4.map(v=>proj(rot4(v,aXW,aYZ,aXY,aZW)));

  layers.forEach((L,li)=>{
    const pos=L.geometry.attributes.position.array;
    const col=L.geometry.attributes.color.array;
    edges.forEach((e,i)=>{
      const [a,b]=e;const p1=pj[a],p2=pj[b];const o=i*6;
      pos[o]=p1[0];pos[o+1]=p1[1];pos[o+2]=p1[2];
      pos[o+3]=p2[0];pos[o+4]=p2[1];pos[o+5]=p2[2];
      const ph=(i/edges.length+t*.08+li*.1)%1;
      let c1;
      if(rMd>.02)c1=new THREE.Color(0xff3355).lerp(new THREE.Color(0xffcc3d),ph);
      else if(gMd>.02)c1=new THREE.Color(0xffcc3d).lerp(new THREE.Color(0x00f0ff),ph);
      else c1=ph<.5?cA.clone().lerp(cC,ph*2):cC.clone().lerp(cB,(ph-.5)*2);
      col[o]=c1.r;col[o+1]=c1.g;col[o+2]=c1.b;
      col[o+3]=c1.r;col[o+4]=c1.g;col[o+5]=c1.b;
    });
    L.geometry.attributes.position.needsUpdate=true;
    L.geometry.attributes.color.needsUpdate=true;
  });

  vSpr.forEach((s,i)=>{
    s.position.set(pj[i][0],pj[i][1],pj[i][2]);
    s.userData.pls*=.92;s.userData.rpls*=.94;
    s.scale.setScalar(s.userData.bs*(1+s.userData.pls*1.5+s.userData.rpls*2));
    s.material.opacity=.85+s.userData.pls*.5+s.userData.rpls*.5;
    if(s.userData.rpls<.02&&s.material.map===rTex)s.material.map=nTex;
  });

  pulses.forEach(p=>p.update(dt,pj));

  tPls*=.93;
  const ps=1+tPls*.18;
  layers.forEach((l,i)=>l.scale.setScalar(ps*(1+i*.03)));

  // Satellites
  const sVis=ss(.78,.97,sp);
  sats.forEach((g,si)=>{
    const ln=g.userData.ln,m=g.userData.m,ph=g.userData.ph;
    m.opacity=.35*sVis;
    const sp2=v4.map(v=>proj(rot4(v,t*.15+ph,t*.2+ph,t*.1+ph,t*.17+ph)));
    const pos=ln.geometry.attributes.position.array;
    const col=ln.geometry.attributes.color.array;
    edges.forEach((e,i)=>{
      const [a,b]=e;const p1=sp2[a],p2=sp2[b];const o=i*6;
      pos[o]=p1[0];pos[o+1]=p1[1];pos[o+2]=p1[2];
      pos[o+3]=p2[0];pos[o+4]=p2[1];pos[o+5]=p2[2];
      const c=cA.clone().lerp(cC,(i/edges.length+t*.1)%1);
      col[o]=c.r;col[o+1]=c.g;col[o+2]=c.b;
      col[o+3]=c.r;col[o+4]=c.g;col[o+5]=c.b;
    });
    ln.geometry.attributes.position.needsUpdate=true;
    ln.geometry.attributes.color.needsUpdate=true;
    g.rotation.y+=.002;g.rotation.x+=.0012;
  });

  rMd*=.97;gMd*=.97;

  const cm=gK(sp);
  camera.position.x=lerp(camera.position.x,cm.p[0]+mx*.35,.05);
  camera.position.y=lerp(camera.position.y,cm.p[1]-my*.2,.05);
  camera.position.z=lerp(camera.position.z,cm.p[2],.05);
  camera.lookAt(cm.l[0],cm.l[1],cm.l[2]);

  stars.rotation.y+=.0005;stars.rotation.x+=.0002;

  cmM.uniforms.uRd.value=rMd;
  cmM.uniforms.uAb.value=.004+rMd*.008+tPls*.005;
  cmM.uniforms.uBl.value=1.35+tPls*.4;

  renderPost(t);

  const r0=rot4(v4[0],aXW,aYZ,aXY,aZW);
  const fc=$('fcrd');
  if(fc)fc.textContent=`X:${r0[0].toFixed(2)} Y:${r0[1].toFixed(2)} Z:${r0[2].toFixed(2)} W:${r0[3].toFixed(2)}`;

  requestAnimationFrame(frame);
}
frame();

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  sRT.setSize(innerWidth,innerHeight);
  const nw=Math.max(256,Math.floor(innerWidth/2)),nh=Math.max(256,Math.floor(innerHeight/2));
  bRT.setSize(nw,nh);h1.setSize(nw,nh);h2.setSize(nw,nh);
  blM.uniforms.uR.value.set(nw,nh);
});

// ═══ SHA-256 ═══
async function sha256(s){
  const b=new TextEncoder().encode(s);
  const h=await crypto.subtle.digest('SHA-256',b);
  return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('');
}

// ═══ CHAIN SIM ═══
const cth=$('cth'),sbk=$('sbk'),stx=$('stx'),srt=$('srt');
let sIdx=0,sTx=0,sPrev='';
function nt(){return new Date().toTimeString().slice(0,8)}

async function mkBlk(mined=false){
  const tc=200+Math.floor(Math.random()*800);
  const d=`${sIdx}|${nt()}|${tc}|${sPrev}|${Math.random()}`;
  const h=await sha256(d);
  return {index:sIdx,timestamp:nt(),hash:h,prevHash:sPrev||'0'.repeat(64),txCount:tc,mined};
}

function rBlk(b){
  const d=document.createElement('div');
  d.className='bk'+(b.mined?' mine':'');
  d.innerHTML=`<div class="bh"><span>BLOCK #${String(b.index).padStart(5,'0')}</span><span style="color:var(--wk)">${b.timestamp}</span></div>
<div class="br">HASH<strong class="hot">0x${b.hash.slice(0,20)}...</strong></div>
<div class="br">PREV<strong style="color:var(--wk)">0x${b.prevHash.slice(0,12)}...</strong></div>
<div class="br">TX<strong class="hot">${b.txCount}</strong></div>
${b.mined?'<div class="br"><strong class="hl">▸ MINÉ PAR VOUS</strong></div>':''}`;
  cth.appendChild(d);
  while(cth.children.length>25)cth.removeChild(cth.firstChild);
  sbk.textContent=b.index+1;sTx+=b.txCount;
  stx.textContent=sTx.toLocaleString('fr-FR');
  const off=Math.max(0,cth.scrollWidth-cth.parentElement.clientWidth+40);
  cth.style.transform=`translateX(-${off}px)`;
}

async function adB(m=false){
  const b=await mkBlk(m);
  sPrev=b.hash;sIdx++;
  rBlk(b);
  pVx(sIdx%16);pTs();sBlk();
}
(async()=>{for(let i=0;i<6;i++)await adB();setInterval(()=>adB(),4000)})();

let rSh=0,rTg=14000;
setInterval(()=>{rTg=10000+Math.random()*8000},2200);
setInterval(()=>{rSh+=(rTg-rSh)*.08;srt.textContent=Math.floor(rSh).toLocaleString('fr-FR')},60);

// ═══ TAMPER ═══
const tchE=$('tch'),tcsE=$('tcs'),rF=$('redFlood');
const iniT=['Alice → Bob : 50 TSC','Bob → Carol : 30 TSC','Carol → Dave : 20 TSC','Dave → Eve : 10 TSC','Eve → Alice : 5 TSC'];
let tBlks=[];

async function bTCh(){
  tBlks=[];let pv='0'.repeat(64);
  for(let i=0;i<iniT.length;i++){
    const d=iniT[i];const h=await sha256(`${i}|${d}|${pv}`);
    tBlks.push({index:i,data:d,hash:h,prevHash:pv,oH:h,oP:pv,valid:true});pv=h;
  }
  rTCh();tLog('▸ Chaîne initiale synchronisée. 5 blocs validés.','ok');
}

function rTCh(){
  tchE.innerHTML='';
  tBlks.forEach((b,i)=>{
    const d=document.createElement('div');
    const cls=i===1?'source':(b.valid?'':'invalid');
    d.className='tb'+(cls?' '+cls:'');
    const st=i===1?'✎ MODIFIABLE':(b.valid?'✓ VALIDE':'✗ INVALIDE');
    d.innerHTML=`<div class="tbh"><span>#${String(i).padStart(3,'0')}</span><span class="tbs">${st}</span></div>
<div class="tbl">Données</div><div class="tbd">${b.data}</div>
<input class="tbe" value="${b.data}" data-hover>
<div class="tbl">Hash</div><div class="tbhs">${b.hash.slice(0,32)}...</div>
<div class="tbl">Prev</div><div class="tbhs">${b.prevHash.slice(0,16)}...</div>`;
    tchE.appendChild(d);
  });
  const inp=tchE.querySelector('.tbe');
  if(inp){inp.addEventListener('input',e=>tEd(e.target.value));inp.addEventListener('focus',()=>sHov('A5'))}
}

function tLog(m,cls=''){
  const d=document.createElement('div');
  d.className='tcl'+(cls?' '+cls:'');
  d.innerHTML=`<span class="p">&gt;</span>${m}`;
  tcsE.appendChild(d);tcsE.scrollTop=tcsE.scrollHeight;
  while(tcsE.children.length>40)tcsE.removeChild(tcsE.firstChild);
}

async function tEd(nv){
  tBlks[1].data=nv;
  let pv=tBlks[0].hash;
  for(let i=1;i<tBlks.length;i++){
    const b=tBlks[i];b.prevHash=pv;
    b.hash=await sha256(`${i}|${b.data}|${pv}`);
    b.valid=(b.hash===b.oH&&b.prevHash===b.oP);pv=b.hash;
  }
  rTCh();
  const br=tBlks.filter(b=>!b.valid).length;
  if(br>0){
    tLog(`⚠  ALTÉRATION DÉTECTÉE sur bloc #001`,'warn');
    tLog(`   hash modifié → ${br} bloc(s) suivant(s) invalidé(s) en cascade`,'err');
    tLog(`   le réseau rejetterait cette chaîne en &lt;50ms`,'err');
    sRM(1);shake();rF.classList.add('on');
    setTimeout(()=>rF.classList.remove('on'),400);
    cursor.classList.add('danger');
    setTimeout(()=>cursor.classList.remove('danger'),600);
    tBlks.forEach((b,i)=>{if(!b.valid)pVx(i*3,true)});
    sTmp();
    // Event bus: announce tamper break so extensions can trigger
    // the global glitch, chromatic aberration and contextual note.
    window.dispatchEvent(new CustomEvent('tsc:tampered',{detail:{
      brokenCount:br,totalBlocks:tBlks.length,at:Date.now()
    }}));
  }
}

async function rTmp(){
  tcsE.innerHTML='';await bTCh();
  tLog('✓ Chaîne restaurée. Immutabilité rétablie.','ok');
  sRM(0);sWin();
}
$('resetT').addEventListener('click',rTmp);
bTCh();

// ═══ MINING ═══
const mbtn=$('mbtn'),mcs=$('mcs'),lvn=$('lvn'),lvr=$('lvr'),lvt=$('lvt'),mid=$('mid');
function rh(n){const c='0123456789ABCDEF';let s='';for(let i=0;i<n;i++)s+=c[Math.floor(Math.random()*16)];return s}
mid.textContent='0x'+rh(4)+'...'+rh(4);

function mLog(m,cls=''){
  const d=document.createElement('div');d.className='cl'+(cls?' '+cls:'');
  d.innerHTML=`<span class="p">&gt;</span>${m}`;
  mcs.appendChild(d);mcs.scrollTop=mcs.scrollHeight;
  while(mcs.children.length>100)mcs.removeChild(mcs.firstChild);
}

const DIFF='0000';
async function rMine(){
  mbtn.disabled=true;mbtn.textContent='⧫ MINAGE EN COURS...';
  mcs.innerHTML='';gMd=.8;
  mLog('tesseract.chain // Web Crypto API SHA-256','info');
  mLog(`mineur_id: ${mid.textContent}`,'mag');
  mLog(`target: hash commence par <strong style="color:var(--cy)">${DIFF}</strong>`);
  mLog('');
  mLog('▸ construction du bloc candidat...','info');
  mLog(`   previous_hash: ${sPrev.slice(0,32)}...`);
  const tic=128+Math.floor(Math.random()*256);
  mLog(`   transactions: ${tic}`);
  mLog(`   timestamp: ${nt()}`);
  mLog('');
  mLog('▸ recherche de nonce valide...','info');
  await new Promise(r=>setTimeout(r,300));

  const bd=`${sIdx}|${sPrev}|${tic}|${nt()}`;
  const tS=performance.now();
  let nc=0,h='';const BT=250;let lL=0,lS=0;

  while(true){
    for(let i=0;i<BT;i++){
      h=await sha256(bd+'|'+nc);
      if(h.startsWith(DIFF))break;
      nc++;
    }
    const el=(performance.now()-tS)/1000,rt=Math.floor(nc/el);
    lvn.textContent=nc.toLocaleString('fr-FR');
    lvr.textContent=rt.toLocaleString('fr-FR');
    lvt.textContent=el.toFixed(1)+'s';
    if(h.startsWith(DIFF))break;
    if(performance.now()-lL>420){
      lL=performance.now();
      mLog(`nonce=${String(nc).padStart(7,'0')} hash=0x${h.slice(0,20)}... <span style="color:var(--rd)">✗</span>`);
      if(performance.now()-lS>400){lS=performance.now();sMh()}
      pVx(Math.floor(Math.random()*16));
    }
    await new Promise(r=>setTimeout(r,0));
    if(nc>2000000){mLog('⚠ abandon après 2M tentatives','err');mbtn.disabled=false;mbtn.textContent='⧫ RELANCER';return}
  }

  const el=(performance.now()-tS)/1000,rt=Math.floor(nc/el);
  lvn.textContent=nc.toLocaleString('fr-FR');
  lvr.textContent=rt.toLocaleString('fr-FR');
  lvt.textContent=el.toFixed(2)+'s';
  mLog('');
  mLog('✦ HASH VALIDE TROUVÉ','ok');
  mLog(`   nonce = <strong style="color:var(--cy)">${nc.toLocaleString('fr-FR')}</strong>`,'ok');
  mLog(`   hash  = <strong style="color:var(--cy)">0x${h}</strong>`,'ok');
  mLog(`   temps = ${el.toFixed(2)}s @ ${rt.toLocaleString('fr-FR')} H/s`,'ok');
  mLog('');
  // Event bus: announce the mined block to any extension listener
  // (wallet credit, leaderboard, vertex marker, explorer). The DOM
  // scraping via MutationObserver is kept as a legacy fallback only.
  window.dispatchEvent(new CustomEvent('tsc:blockMined',{detail:{
    hash:h,nonce:nc,timeSec:el,hashRate:rt,minerId:mid.textContent,at:Date.now()
  }}));
  mLog('▸ diffusion du bloc sur le réseau...','info');
  await new Promise(r=>setTimeout(r,500));
  mLog('▸ 248/256 nœuds ont validé le bloc','info');
  await new Promise(r=>setTimeout(r,400));
  mLog('✦ BLOC AJOUTÉ À LA CHAÎNE','mag');
  mLog('✦ RÉCOMPENSE : +6,25 TSC','mag');
  const fl=$('flash');fl.classList.add('on');
  setTimeout(()=>fl.classList.remove('on'),180);
  pTs();
  for(let i=0;i<16;i++)setTimeout(()=>pVx(i),i*40);
  sWin();await adB(true);
  await new Promise(r=>setTimeout(r,1800));
  gMd=0;mbtn.disabled=false;mbtn.textContent='⧫ MINER UN AUTRE BLOC';
}
mbtn.addEventListener('click',rMine);

// ═══ SCRAMBLE TYPE ═══
function scrmb(el,dur=900){
  if(el.dataset.scr)return;el.dataset.scr='1';
  const txt=el.textContent;
  const chars='!@#$%^&*()_+-={}[]|;:,.<>?/~ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const st=performance.now();const fH=el.innerHTML;
  function step(){
    const p=clamp((performance.now()-st)/dur,0,1);
    const rv=Math.floor(txt.length*p);
    let out='';
    for(let i=0;i<txt.length;i++){
      if(i<rv)out+=txt[i];
      else if(txt[i]===' '||txt[i]==='\n')out+=txt[i];
      else out+=chars[Math.floor(Math.random()*chars.length)];
    }
    el.textContent=out;
    if(p<1)requestAnimationFrame(step);
    else el.innerHTML=fH;
  }
  step();
}

// ═══ REVEAL ═══
const io=new IntersectionObserver(es=>{
  es.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('in');
      if(e.target.matches('.scr'))setTimeout(()=>scrmb(e.target),200);
    }
  });
},{threshold:.15});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));

// ═══ CLI ═══
const cli=$('cli'),cin=$('cin'),chist=$('chist'),cliBtn=$('cliBtn');
function cOpen(){cli.classList.add('open');cliBtn.classList.add('active');setTimeout(()=>cin.focus(),200);sClk()}
function cClose(){cli.classList.remove('open');cliBtn.classList.remove('active');sClk()}
function cTg(){cli.classList.contains('open')?cClose():cOpen()}
cliBtn.addEventListener('click',cTg);

addEventListener('keydown',e=>{
  if($('boot')&&!$('boot').classList.contains('gone'))return;
  if(e.key==='²'||e.key==='`'){e.preventDefault();cTg()}
  if(e.key==='Escape'&&cli.classList.contains('open'))cClose();
});

function cO(t,c=''){const d=document.createElement('div');d.className=c;d.innerHTML=t;chist.appendChild(d);chist.scrollTop=chist.scrollHeight}

const cmd={
  help(){
    cO('<span class="out">TESSERACT.CLI // commandes :</span>');
    cO('  help ........... aide');
    cO('  mine ........... lancer le minage');
    cO('  tamper ......... altérer bloc test');
    cO('  reset .......... réinitialiser chaîne');
    cO('  fly &lt;section&gt;    naviguer (hero/concept/dim/time/sim/tamper/mine/outro)');
    cO('  audio .......... basculer audio');
    cO('  nodes .......... état réseau');
    cO('  hash &lt;texte&gt;    calculer SHA-256');
    cO('  pulse .......... pulser tesseract');
    cO('  red ............ mode rouge');
    cO('  clear .......... effacer');
    cO('  exit ........... fermer');
  },
  mine(){cO('<span class="out">▸ minage...</span>');$('mining').scrollIntoView({behavior:'smooth'});setTimeout(()=>mbtn.click(),800);cClose()},
  tamper(){cO('<span class="out">▸ altération bloc #001</span>');$('tamper').scrollIntoView({behavior:'smooth'});setTimeout(()=>tEd('Alice → Bob : 9999 TSC'),1200);cClose()},
  reset(){cO('<span class="out">▸ réinitialisation...</span>');rTmp()},
  audio(){tAudio();cO('<span class="out">▸ audio '+(aE?'activé':'désactivé')+'</span>')},
  nodes(){
    cO('<span class="out">─── NETWORK STATUS ───</span>');
    cO('  nodes_total    : 256');
    cO('  nodes_online   : '+(248+Math.floor(Math.random()*8)));
    cO('  consensus      : <span style="color:var(--cy)">validated</span>');
    cO('  block_height   : '+sIdx);
    cO('  hashrate       : '+(10000+Math.floor(Math.random()*8000)).toLocaleString('fr-FR')+' H/s');
  },
  async hash(a){
    const t=a.join(' ');
    if(!t){cO('<span class="err">usage : hash &lt;texte&gt;</span>');return}
    const h=await sha256(t);
    cO('  input  : '+t);
    cO('  sha256 : <span style="color:var(--cy)">'+h+'</span>');
  },
  fly(a){
    const m={hero:'hero',concept:'concept',dim:'dimensions',dimensions:'dimensions',time:'timeline',timeline:'timeline',sim:'simulation',simulation:'simulation',tamper:'tamper',mine:'mining',mining:'mining',outro:'outro'};
    const id=m[a[0]];
    if(!id){cO('<span class="err">cible inconnue : hero|concept|dim|time|sim|tamper|mine|outro</span>');return}
    $(id).scrollIntoView({behavior:'smooth'});
    cO('<span class="out">▸ navigation vers /'+id+'</span>');cClose();
  },
  pulse(){pTs();for(let i=0;i<16;i++)setTimeout(()=>pVx(i),i*50);cO('<span class="out">▸ pulse</span>')},
  red(){sRM(1);shake();sTmp();cO('<span class="out">▸ red mood</span>')},
  clear(){chist.innerHTML=''},
  exit(){cClose()}
};

cin.addEventListener('keydown',async e=>{
  if(e.key==='Enter'){
    const v=cin.value.trim();cin.value='';
    if(!v)return;
    const ps=v.split(/\s+/),c=ps[0].toLowerCase(),a=ps.slice(1);
    cO('<span class="echo">tesseract@chain:~$ '+v+'</span>');sClk();
    if(cmd[c]){try{await cmd[c](a)}catch(err){cO('<span class="err">erreur : '+err.message+'</span>')}}
    else cO('<span class="err">commande inconnue : '+c+' — tapez <strong>help</strong></span>');
  }
});
cO('<span style="color:var(--wk)">TESSERACT.CLI v3.0 — tapez <strong style="color:var(--cy)">help</strong></span>');

// ═══ KICKOFF ═══
runBoot();
