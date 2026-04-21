(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const sha=async s=>{const b=new TextEncoder().encode(s);const h=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('')};

  // ═══ STATE — store central v2.1 ═══
  const STATE={
    wallet:{addr:null,priv:null,balance:0,createdAt:null},
    chain:{height:0,tip:null,contracts:{}},
    mempool:[],
    nodes:{total:256,online:253,byzantine:false},
    ui:{section:'hero',xray:false},
    minedBlocks:[] // { hash, nonce, t, d, miner }
  };
  const subs=[];
  const emit=k=>subs.forEach(f=>{try{f(k,STATE)}catch(e){}});
  const on=f=>subs.push(f);

  // ═══ WALLET ═══
  const WK='tsc.wallet.v1',BK='tsc.lb.v1',OK='tsc.onboarded.v1';
  let _firstRun=false;
  async function initWallet(){
    try{
      const raw=localStorage.getItem(WK);
      if(raw){Object.assign(STATE.wallet,JSON.parse(raw));return}
    }catch(e){}
    const seed=crypto.getRandomValues(new Uint8Array(16));
    const seedHex=Array.from(seed).map(x=>x.toString(16).padStart(2,'0')).join('');
    const addr='0x'+(await sha(seedHex)).slice(0,40);
    const priv='0x'+(await sha(seedHex+'|priv')).slice(0,64);
    STATE.wallet={addr,priv,balance:0,createdAt:Date.now()};
    _firstRun=true;
    try{localStorage.setItem(WK,JSON.stringify(STATE.wallet))}catch(e){}
  }
  function walletSave(){
    const safe=(window.TSCUi&&window.TSCUi.safeSetItem)||null;
    if(safe)safe(WK,JSON.stringify(STATE.wallet));
    else{try{localStorage.setItem(WK,JSON.stringify(STATE.wallet))}catch(_){}}
  }
  function walletCredit(n){STATE.wallet.balance=+(STATE.wallet.balance+n).toFixed(4);walletSave();updateWalletUI();emit('wallet')}
  function walletDebit(n){if(STATE.wallet.balance<n)return false;STATE.wallet.balance=+(STATE.wallet.balance-n).toFixed(4);walletSave();updateWalletUI();return true}
  function updateWalletUI(){
    const a=$('hwAddr'),b=$('hwBal');
    if(a)a.textContent=STATE.wallet.addr?STATE.wallet.addr.slice(0,6)+'…'+STATE.wallet.addr.slice(-4):'0x---';
    if(b)b.textContent=STATE.wallet.balance.toLocaleString('fr-FR',{maximumFractionDigits:2});
  }

  // ═══ VM minimale — stack based ═══
  const CONTRACTS_PRESET={
    counter:{name:'counter',storage:{count:0},methods:{
      increment:s=>{s.count++;return s.count},
      decrement:s=>{s.count=Math.max(0,s.count-1);return s.count},
      get:s=>s.count,
      reset:s=>{s.count=0;return 0}
    }},
    vote:{name:'vote',storage:{yes:0,no:0,voters:{}},methods:{
      yes:(s,_,from)=>{if(s.voters[from])throw new Error('déjà voté');s.voters[from]=1;s.yes++;return{yes:s.yes,no:s.no}},
      no:(s,_,from)=>{if(s.voters[from])throw new Error('déjà voté');s.voters[from]=1;s.no++;return{yes:s.yes,no:s.no}},
      tally:s=>({yes:s.yes,no:s.no,winner:s.yes>s.no?'yes':(s.no>s.yes?'no':'tie')})
    }}
  };
  async function vmDeploy(name,from){
    const preset=CONTRACTS_PRESET[name];
    if(!preset)throw new Error('contrat inconnu : '+name+' (disponibles : counter, vote)');
    const addr='0x'+(await sha(name+Date.now()+from)).slice(0,40);
    STATE.chain.contracts[addr]={name:preset.name,storage:JSON.parse(JSON.stringify(preset.storage)),deployer:from,createdAt:Date.now()};
    return addr;
  }
  function vmCall(addr,method,args,from){
    const c=STATE.chain.contracts[addr];
    if(!c)throw new Error('contrat inexistant : '+addr.slice(0,10)+'…');
    const preset=CONTRACTS_PRESET[c.name];
    const fn=preset.methods[method];
    if(!fn)throw new Error('méthode inconnue : '+method);
    return fn(c.storage,args,from);
  }

  // ═══ MEMPOOL + sparkline TPS ═══
  const NAMES=['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Hank'];
  function mkTx(){
    const a=NAMES[Math.floor(Math.random()*NAMES.length)];
    let b;do{b=NAMES[Math.floor(Math.random()*NAMES.length)]}while(b===a);
    return {id:Math.random().toString(36).slice(2,10),from:a,to:b,amount:+(Math.random()*50+.1).toFixed(2),fee:+(Math.random()*.01+.001).toFixed(4),ts:Date.now(),status:'pending'};
  }
  function pushTx(tx){
    STATE.mempool.push(tx);
    if(STATE.mempool.length>20)STATE.mempool.shift();
    renderMempool();
  }
  function renderMempool(){
    const list=$('mpList'),count=$('mpCount');
    if(!list)return;
    count.textContent=STATE.mempool.filter(t=>t.status==='pending').length;
    list.innerHTML=STATE.mempool.slice(-8).reverse().map(t=>`<div class="mpl-row ${t.status==='confirmed'?'confirmed':''}"><span class="mpl-tag">${t.status==='pending'?'PEND':'CONF'}</span><span class="mpl-data">${t.from}→${t.to} · <strong style="color:var(--cy)">${t.amount} TSC</strong></span><span class="mpl-fee">fee ${t.fee}</span></div>`).join('');
  }
  const sparkData=new Array(40).fill(0);
  function pushSpark(v){sparkData.push(v);sparkData.shift();const s=$('spark');if(!s)return;s.innerHTML=sparkData.map(x=>`<div class="bar" style="height:${Math.min(100,x*12)}%"></div>`).join('')}
  setInterval(()=>{
    if(Math.random()<.7)pushTx(mkTx());
    // confirm oldest pending occasionally
    const pend=STATE.mempool.filter(t=>t.status==='pending');
    if(pend.length>3&&Math.random()<.5){pend[0].status='confirmed';renderMempool()}
    pushSpark(pend.length);
  },1500);

  // ═══ CINEMATIC — section-aware tesseract ═══
  function initSectionObserver(){
    const secs=['hero','concept','dimensions','timeline','simulation','tamper','mining','outro'];
    const io=new IntersectionObserver(entries=>{
      for(const e of entries){
        if(e.isIntersecting&&e.intersectionRatio>.45){
          const id=e.target.id;
          document.body.classList.remove(...secs.map(s=>'sec-'+s));
          document.body.classList.add('sec-'+id);
          STATE.ui.section=id;
          emit('section');
        }
      }
    },{threshold:[.45,.6]});
    secs.forEach(id=>{const el=$(id);if(el)io.observe(el)});
    document.body.classList.add('sec-hero');
  }

  // ═══ Vertex marks — sommets illuminés par les blocs minés ═══
  function renderVmarks(){
    const n=Math.min(16,STATE.minedBlocks.length);
    const vm=$('vmark'),ct=$('vmCount'),dots=$('vmDots');
    if(!vm)return;
    if(n>0)vm.classList.add('on');
    ct.textContent=n;
    dots.innerHTML=Array.from({length:16},(_,i)=>`<span class="vm-dot ${i<n?'lit':''}"></span>`).join('');
  }

  // ═══ Glitch / chromatic aberration ═══
  function triggerGlitch(){
    document.body.classList.add('glitch');
    const ca=$('chromAb');if(ca){ca.classList.add('on');setTimeout(()=>ca.classList.remove('on'),400)}
    setTimeout(()=>document.body.classList.remove('glitch'),500);
    if(window.Tone&&Tone.context&&Tone.context.state==='running'){
      try{const n=new Tone.NoiseSynth({volume:-20,envelope:{attack:.005,decay:.25,sustain:0}}).toDestination();n.triggerAttackRelease('4n');setTimeout(()=>n.dispose(),500)}catch(e){}
    }
  }

  // ═══ Hero : compteur réseau live ═══
  const nsBlocks=$('ns-blocks'),nsLat=$('ns-lat'),nsNodes=$('ns-nodes'),nsStatus=$('ns-status');
  if(nsBlocks){
    let gb=18450000+Math.floor(Math.random()*9999);
    const fmt=n=>n.toLocaleString('fr-FR');
    nsBlocks.textContent=fmt(gb);
    nsLat.textContent=(40+Math.floor(Math.random()*35));
    setInterval(()=>{
      gb+=Math.random()<.7?1:2;
      nsBlocks.textContent=fmt(gb);
      nsLat.textContent=(38+Math.floor(Math.random()*42));
      const n=254+Math.floor(Math.random()*6);nsNodes.textContent=n;
      if(Math.random()<.02){nsStatus.textContent='SYNC';setTimeout(()=>nsStatus.textContent='ACTIF',1200)}
    },2400);
  }

  // ═══ Tamper : annotation + glitch global ═══
  // Tamper break — listen to the explicit event emitted by core.rMine()'s
  // sibling tEd(). The previous implementation observed DOM class changes
  // on #tch which was fragile (coupled to core.js rendering internals).
  const tch=$('tch'),tanno=$('tanno');
  window.addEventListener('tsc:tampered',e=>{
    const broken=(e.detail&&e.detail.brokenCount)||0;
    if(broken>0){
      if(tanno)tanno.classList.add('on');
      const tw=document.querySelector('.tw');
      if(tw&&!tw.classList.contains('shake')){
        tw.classList.add('shake');
        setTimeout(()=>tw.classList.remove('shake'),500);
      }
      if(tch&&!tch.dataset.glitched){
        tch.dataset.glitched='1';
        triggerGlitch();
        setTimeout(()=>{delete tch.dataset.glitched},800);
      }
    } else if(tanno){
      tanno.classList.remove('on');
    }
  });
  // Also listen to the tamper reset (when user clicks "réinitialiser") —
  // we watch #tch attribute changes just to clear the annotation when
  // invalid blocks disappear. This observer is scoped to a single
  // attribute and registered for cleanup on pagehide.
  if(tch){
    const resetObserver=new MutationObserver(()=>{
      if(!tch.querySelector('.tb.invalid')&&tanno)tanno.classList.remove('on');
    });
    resetObserver.observe(tch,{subtree:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('pagehide',()=>resetObserver.disconnect());
  }

  // ═══ Leaderboard + capture bloc miné → wallet + vertex mark ═══
  const lbRows=$('lbRows'),lbClear=$('lbClear'),mid=$('mid');
  function lbLoad(){try{return JSON.parse(localStorage.getItem(BK)||'[]')}catch(e){return[]}}
  function lbSave(a){
    const safe=(window.TSCUi&&window.TSCUi.safeSetItem)||null;
    const payload=JSON.stringify(a.slice(0,16));
    if(safe)safe(BK,payload);
    else{try{localStorage.setItem(BK,payload)}catch(_){}}
  }
  function lbRender(){
    STATE.minedBlocks=lbLoad();
    renderVmarks();
    if(!lbRows)return;
    const a=STATE.minedBlocks;
    if(!a.length){lbRows.innerHTML='<div class="lboard-empty">— Aucun bloc miné. Lancez le minage pour inscrire votre première signature. —</div>';return}
    lbRows.innerHTML=a.map((r,i)=>`<div class="lboard-row clickable" data-idx="${i}" data-hover><span class="rk">#${String(i+1).padStart(2,'0')}</span><span class="hs">0x${r.h.slice(0,40)}…</span><span class="tm">${(r.t||0).toFixed(2)}s</span><span class="dt">${r.d}</span></div>`).join('');
    lbRows.querySelectorAll('.lboard-row').forEach(row=>row.addEventListener('click',()=>openExplorer(parseInt(row.dataset.idx))));
  }
  if(lbClear)lbClear.addEventListener('click',()=>{if(confirm('Effacer tous les blocs minés ?')){lbSave([]);lbRender()}});

  // Block mined — listen to the explicit 'tsc:blockMined' event emitted
  // by core.rMine() when a valid hash is found. This replaces a fragile
  // MutationObserver + regex-on-text that silently broke if the mining
  // log format ever changed.
  window.addEventListener('tsc:blockMined',e=>{
    const d=e.detail||{};
    const hash=d.hash;
    if(!hash)return;
    const a=lbLoad();
    if(a.some(x=>x.h===hash))return;
    a.unshift({
      h:hash,
      t:d.timeSec||0,
      d:new Date(d.at||Date.now()).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
      m:d.minerId||(mid?mid.textContent:'0x---'),
      nonce:d.nonce||0,
      ts:d.at||Date.now()
    });
    lbSave(a);
    lbRender();
    walletCredit(6.25);
    if(window.TSCUi)window.TSCUi.toast('+6,25 TSC — bloc validé',{level:'success',duration:3200});
    if(window.Tone&&Tone.context&&Tone.context.state==='running'){
      try{
        const s=new Tone.Synth({oscillator:{type:'sine'},volume:-12,envelope:{attack:.01,decay:.4,sustain:0,release:.3}}).toDestination();
        s.triggerAttackRelease('C6','8n');
        setTimeout(()=>s.dispose(),800);
      }catch(_){}
    }
  });

  // ═══ Block explorer modal ═══
  async function openExplorer(idx){
    const b=STATE.minedBlocks[idx];if(!b)return;
    $('xhTitle').textContent=`Bloc #${String(idx+1).padStart(3,'0')}`;
    const mr=await sha(b.h+(b.ts||0));
    const parent=STATE.minedBlocks[idx+1];
    const parentHash=parent?parent.h:'0'.repeat(64)+' (genesis)';
    $('xBody').innerHTML=`
      <div class="xr"><span class="xr-label">Hash</span><strong class="cy">0x${b.h}</strong></div>
      <div class="xr"><span class="xr-label">Parent</span><strong>${parentHash.length>50?'0x'+parentHash.slice(0,56)+'…':parentHash}</strong></div>
      <div class="xr"><span class="xr-label">Nonce</span><strong class="mg">${(b.nonce||0).toLocaleString('fr-FR')}</strong></div>
      <div class="xr"><span class="xr-label">Durée</span><strong class="gd">${(b.t||0).toFixed(3)} s</strong></div>
      <div class="xr"><span class="xr-label">Miner</span><strong>${b.m||'0x---'}</strong></div>
      <div class="xr"><span class="xr-label">Timestamp</span><strong>${b.ts?new Date(b.ts).toLocaleString('fr-FR'):b.d}</strong></div>
      <div class="xr"><span class="xr-label">Difficulté</span><strong>0000 × 65536</strong></div>
      <div class="xr"><span class="xr-label">Récompense</span><strong class="gd">+6,25 TSC</strong></div>
      <div class="xr"><span class="xr-label">Merkle root</span><strong class="cy">0x${mr.slice(0,48)}…</strong></div>
      <div class="xtree">
        <div class="lv1">◆ root ── 0x${mr.slice(0,16)}…</div>
        <div class="lv2">  ├─ h01 ── 0x${mr.slice(16,32)}…</div>
        <div class="lv3">  │    ├─ tx₀ (coinbase +6,25 TSC → ${b.m||'miner'})</div>
        <div class="lv3">  │    └─ tx₁ (network fee: 0.0021 TSC)</div>
        <div class="lv2">  └─ h02 ── 0x${mr.slice(32,48)}…</div>
        <div class="lv3">       ├─ tx₂ (${NAMES[idx%NAMES.length]}→${NAMES[(idx+3)%NAMES.length]}: ${(7+idx*1.7).toFixed(2)} TSC)</div>
        <div class="lv3">       └─ tx₃ (${NAMES[(idx+1)%NAMES.length]}→${NAMES[(idx+2)%NAMES.length]}: ${(3+idx*.8).toFixed(2)} TSC)</div>
      </div>`;
    const ex=$('explorer');
    ex.classList.add('open');
    ex.setAttribute('aria-hidden','false');
    openExplorer._prevFocus=document.activeElement;
    // Focus the close button so keyboard users can dismiss immediately.
    const closeBtn=$('xhClose');if(closeBtn)closeBtn.focus();
  }
  function closeExplorer(){
    const ex=$('explorer');
    if(!ex||!ex.classList.contains('open'))return;
    ex.classList.remove('open');
    ex.setAttribute('aria-hidden','true');
    const prev=openExplorer._prevFocus;
    if(prev&&prev.focus)prev.focus();
  }
  const xhClose=$('xhClose');if(xhClose)xhClose.addEventListener('click',closeExplorer);
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    const ex=$('explorer');
    if(ex&&ex.classList.contains('open')){e.stopPropagation();closeExplorer()}
  });
  // Focus trap inside #explorer while open.
  (function installExplorerFocusTrap(){
    const ex=$('explorer');if(!ex)return;
    ex.addEventListener('keydown',e=>{
      if(e.key!=='Tab'||!ex.classList.contains('open'))return;
      const focusables=ex.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if(!focusables.length)return;
      const first=focusables[0],last=focusables[focusables.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    });
  })();

  // HUD wallet click → accessible modal (replaces blocking alert()).
  const hwallet=$('hwallet');
  if(hwallet){
    hwallet.setAttribute('role','button');
    hwallet.setAttribute('tabindex','0');
    const openWalletModal=()=>{
      if(!window.TSCUi){return}
      const addr=STATE.wallet.addr||'—';
      const bal=(STATE.wallet.balance||0).toLocaleString('fr-FR',{maximumFractionDigits:4});
      const created=STATE.wallet.createdAt?new Date(STATE.wallet.createdAt).toLocaleString('fr-FR'):'—';
      const priv=(STATE.wallet.priv||'').slice(0,18)+'… (masqué)';
      window.TSCUi.modal({
        title:'Votre wallet',
        body:
          '<div class="row"><span class="label">Adresse</span><span class="val"><code>'+addr+'</code></span></div>'+
          '<div class="row"><span class="label">Solde</span><span class="val"><strong style="color:var(--gd)">'+bal+' TSC</strong></span></div>'+
          '<div class="row"><span class="label">Clé privée</span><span class="val"><code>'+priv+'</code></span></div>'+
          '<div class="row"><span class="label">Créé le</span><span class="val">'+created+'</span></div>'+
          '<p style="margin-top:16px;color:var(--wk);font-size:11px;line-height:1.6">Votre identité a été générée dans votre navigateur et ne quitte jamais cet appareil. Tapez <code>wallet</code> dans le CLI pour plus d\'opérations.</p>',
        actions:[
          {label:'Copier l\'adresse',kind:'ghost',onClick:()=>{
            if(navigator.clipboard)navigator.clipboard.writeText(addr).then(()=>window.TSCUi.toast('Adresse copiée',{level:'success'}),()=>window.TSCUi.toast('Copie impossible',{level:'warn'}));
          },closeOnClick:false},
          {label:'Fermer',kind:'primary'}
        ]
      });
    };
    hwallet.addEventListener('click',openWalletModal);
    hwallet.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();openWalletModal()}
    });
  }

  // ═══ Outro : partage X avec lien dynamique ═══
  const shareX=$('shareX');
  if(shareX){
    const msg=encodeURIComponent("Je viens d'explorer TESSERACT.CHAIN — la Blockchain 3.0 projetée depuis la 4ᵉ dimension. Minage SHA-256 réel, mempool live, smart contracts. ◆");
    shareX.href=`https://twitter.com/intent/tweet?text=${msg}&url=${encodeURIComponent(location.href)}`;
  }

  // ═══ Konami → x-ray ═══
  const KONAMI=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let kIdx=0;
  document.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();
    if(k===KONAMI[kIdx].toLowerCase()){kIdx++;if(kIdx===KONAMI.length){kIdx=0;toggleXray()}}
    else kIdx=k===KONAMI[0].toLowerCase()?1:0;
    if(e.key==='Escape'&&STATE.ui.xray)toggleXray();
  });
  function toggleXray(){
    STATE.ui.xray=!STATE.ui.xray;
    const x=$('xray');x.classList.toggle('on',STATE.ui.xray);
    if(STATE.ui.xray)dumpXray();
  }
  function dumpXray(){
    const d=$('xrDump');if(!d)return;
    d.textContent=JSON.stringify({wallet:STATE.wallet,chain:{height:STATE.minedBlocks.length,contracts:Object.keys(STATE.chain.contracts).length,contractsDetails:STATE.chain.contracts},mempoolSize:STATE.mempool.length,nodes:STATE.nodes,section:STATE.ui.section,minedBlocks:STATE.minedBlocks.slice(0,3).map(b=>({hash:b.h.slice(0,20)+'…',nonce:b.nonce}))},null,2);
  }
  setInterval(()=>{if(STATE.ui.xray)dumpXray()},1000);
  $('xrClose').addEventListener('click',toggleXray);

  // ═══ CLI extension v2.1 (capture phase avant le handler existant) ═══
  const cin=$('cin');
  const chist=document.querySelector('.chist');
  function cLine(txt,cls=''){if(!chist)return;const d=document.createElement('div');d.className=cls;d.innerHTML=txt;chist.appendChild(d);chist.scrollTop=chist.scrollHeight}
  const myCmd={
    wallet:()=>{cLine('<span class="out">─── WALLET ───</span>');cLine('  addr     : <span style="color:var(--mg)">'+STATE.wallet.addr+'</span>');cLine('  balance  : <span style="color:var(--gd)">'+STATE.wallet.balance+' TSC</span>');cLine('  priv     : <span style="color:var(--wk)">'+STATE.wallet.priv.slice(0,18)+'… (masqué)</span>');cLine('  créé le  : '+new Date(STATE.wallet.createdAt).toLocaleString('fr-FR'));},
    balance:()=>{cLine('  <span style="color:var(--gd)">'+STATE.wallet.balance+' TSC</span>')},
    stake:(a)=>{
      const n=parseFloat(a[0]);
      if(!n||n<=0){cLine('<span class="err">usage : stake &lt;montant&gt;</span>');return}
      if(!walletDebit(n)){cLine('<span class="err">solde insuffisant ('+STATE.wallet.balance+' TSC)</span>');return}
      cLine('<span class="out">▸ '+n+' TSC stakés — probabilité de minage ↑</span>');
      cLine('<span style="color:var(--wk)">(simulation : effet visuel uniquement, aucun token perdu réellement)</span>');
      setTimeout(()=>{walletCredit(n);cLine('<span style="color:var(--vi)">▸ stake relâché — '+n+' TSC restitués</span>')},4000);
    },
    deploy:async(a)=>{
      const name=a[0];
      if(!name){cLine('<span class="err">usage : deploy &lt;contrat&gt; (counter | vote)</span>');return}
      try{
        const addr=await vmDeploy(name,STATE.wallet.addr);
        cLine('<span class="out">▸ contrat déployé</span>');
        cLine('  type     : '+name);
        cLine('  addr     : <span style="color:var(--cy)">'+addr+'</span>');
        cLine('  gas used : ~21000');
      }catch(e){cLine('<span class="err">'+e.message+'</span>')}
    },
    call:(a)=>{
      if(a.length<2){cLine('<span class="err">usage : call &lt;addr&gt; &lt;method&gt; [arg]</span>');return}
      const addr=a[0],method=a[1],args=a.slice(2);
      try{
        const r=vmCall(addr,method,args,STATE.wallet.addr);
        cLine('<span class="out">▸ '+method+'() → </span><span style="color:var(--cy)">'+(typeof r==='object'?JSON.stringify(r):r)+'</span>');
      }catch(e){cLine('<span class="err">'+e.message+'</span>')}
    },
    contracts:()=>{
      const ks=Object.keys(STATE.chain.contracts);
      if(!ks.length){cLine('<span style="color:var(--wk)">aucun contrat déployé — essayez <strong style="color:var(--cy)">deploy counter</strong></span>');return}
      cLine('<span class="out">─── DEPLOYED CONTRACTS ───</span>');
      ks.forEach(k=>{const c=STATE.chain.contracts[k];cLine('  '+c.name+' @ <span style="color:var(--cy)">'+k.slice(0,18)+'…</span>')});
    },
    explore:(a)=>{
      const n=parseInt(a[0]);
      if(isNaN(n)||n<1){cLine('<span class="err">usage : explore &lt;n&gt; (numéro de bloc miné)</span>');return}
      if(!STATE.minedBlocks[n-1]){cLine('<span class="err">bloc #'+n+' inexistant (minés: '+STATE.minedBlocks.length+')</span>');return}
      openExplorer(n-1);cLine('<span class="out">▸ explorer ouvert — bloc #'+n+'</span>');
    },
    xray:()=>{toggleXray();cLine('<span class="out">▸ mode x-ray '+(STATE.ui.xray?'activé':'désactivé')+'</span>')},
    mempool:()=>{
      const p=STATE.mempool.filter(t=>t.status==='pending');
      cLine('<span class="out">─── MEMPOOL ('+p.length+' pending) ───</span>');
      p.slice(-5).forEach(t=>cLine('  '+t.from+' → '+t.to+' : <span style="color:var(--cy)">'+t.amount+' TSC</span> (fee '+t.fee+')'));
    },
    byzantine:(a)=>{
      const on=a[0]==='on';STATE.nodes.byzantine=on;STATE.nodes.online=on?210:253;
      const hn=$('hn');if(hn)hn.textContent=STATE.nodes.online;
      cLine('<span class="out">▸ mode byzantin '+(on?'<span style="color:var(--rd)">ACTIVÉ</span> — 46 nœuds menteurs':'<span style="color:var(--gr)">désactivé</span>')+'</span>');
    }
  };

  function appendV21Help(){
    cLine('<span class="out">  ─── v2.1 ───</span>');
    cLine('  wallet ......... infos wallet');
    cLine('  balance ........ solde TSC');
    cLine('  stake &lt;n&gt; ...... miser n TSC (PoS simulé)');
    cLine('  deploy &lt;c&gt; ..... déployer contrat (counter, vote)');
    cLine('  call &lt;a&gt; &lt;m&gt; ... appeler méthode de contrat');
    cLine('  contracts ...... lister contrats déployés');
    cLine('  mempool ........ voir transactions en attente');
    cLine('  explore &lt;n&gt; .... ouvrir explorateur de bloc');
    cLine('  xray ........... mode rayons-X');
    cLine('  byzantine on|off  simuler nœuds malveillants');
  }

  // Intercept Enter in the capture phase so v2.1 commands run before
  // core.js's own keydown handler. For `help` we let core render its
  // built-in lines first, then append the v2.1 section on the next
  // tick — no DOM scraping required.
  if(cin){
    cin.addEventListener('keydown',async e=>{
      if(e.key!=='Enter')return;
      const v=cin.value.trim();if(!v)return;
      const ps=v.split(/\s+/),c=ps[0].toLowerCase(),a=ps.slice(1);
      if(myCmd[c]){
        e.stopImmediatePropagation();
        cin.value='';
        cLine('<span class="echo">tesseract@chain:~$ '+v+'</span>');
        try{await myCmd[c](a)}catch(err){cLine('<span class="err">erreur : '+err.message+'</span>')}
      } else if(c==='help'){
        setTimeout(appendV21Help,0);
      }
    },true);
  }

  // ═══ Hash sandbox (section concept) ═══
  // Shows the avalanche effect: every character typed re-hashes the
  // input through SHA-256 and highlights which hex digits flipped.
  (function installHashSandbox(){
    const input=$('hlInput'),out=$('hlHash'),diff=$('hlDiff'),reset=$('hlReset');
    if(!input||!out)return;
    let last='';
    function hexDistance(a,b){
      // Bit-level Hamming distance between two hex strings.
      let d=0;const len=Math.min(a.length,b.length);
      for(let i=0;i<len;i++){
        let x=parseInt(a[i],16)^parseInt(b[i],16);
        while(x){d+=x&1;x>>=1;}
      }
      return d;
    }
    async function renderHash(){
      const v=input.value;
      const h=v?await sha(v):'—'.repeat(32);
      const spans=h.split('').map((c,i)=>{
        const changed=last&&last.length===h.length&&last[i]!==c;
        return '<span class="hx'+(changed?' changed':'')+'">'+c+'</span>';
      }).join('');
      out.innerHTML=spans;
      if(diff&&last&&last.length===h.length){
        const bd=hexDistance(last,h);
        diff.innerHTML='Bits différents <strong>'+bd+' / 256</strong>';
      }
      last=h;
    }
    let pending=null;
    input.addEventListener('input',()=>{
      if(pending)clearTimeout(pending);
      pending=setTimeout(renderHash,60);
    });
    if(reset)reset.addEventListener('click',()=>{
      const samples=['Satoshi','satoshi','Satoshj','Blockchain','blockchain','TESSERACT','Tesseract','Nakamoto 2008','Nakamoto 2009'];
      const pick=samples[Math.floor(Math.random()*samples.length)];
      input.value=pick;renderHash();input.focus();
    });
    // Initial render without highlight noise.
    sha(input.value).then(h=>{
      last=h;
      out.innerHTML=h.split('').map(c=>'<span class="hx">'+c+'</span>').join('');
    });
  })();

  // ═══ Onboarding first-run ═══
  // When a brand-new wallet was generated this session, greet the user
  // once the boot animation has settled. We persist a flag so the
  // modal never shows twice — even if the user clears cookies and
  // regenerates a wallet later, a returning visitor should not be
  // interrupted with the same explainer.
  function shouldOnboard(){
    try{return _firstRun&&!localStorage.getItem(OK)}
    catch(_){return _firstRun}
  }
  function markOnboarded(){
    try{localStorage.setItem(OK,'1')}catch(_){}
  }
  function showOnboarding(){
    if(!window.TSCUi)return;
    const addr=STATE.wallet.addr||'0x…';
    const short=addr.slice(0,10)+'…'+addr.slice(-6);
    window.TSCUi.modal({
      title:'Bienvenue dans la 4ᵉ dimension',
      body:
        '<p style="color:var(--w);font-size:14px;line-height:1.7;margin-bottom:18px">Une identité vient d\'être <strong style="color:var(--cy)">générée dans votre navigateur</strong> pour vous accompagner dans cette exploration :</p>'+
        '<div class="row"><span class="label">Votre adresse</span><span class="val"><code>'+short+'</code></span></div>'+
        '<div class="row"><span class="label">Solde initial</span><span class="val"><strong style="color:var(--gd)">0 TSC</strong></span></div>'+
        '<div class="row"><span class="label">Stockage</span><span class="val">Local — ne quitte jamais votre appareil</span></div>'+
        '<p style="margin-top:20px;color:var(--d);font-size:12px;line-height:1.7">Chaque bloc que vous minerez vous rapportera <strong style="color:var(--gd)">+6,25 TSC</strong>. Vos clés, votre solde et vos blocs sont sauvegardés dans ce navigateur — effacez le cache et tout disparaît. <strong style="color:var(--cy)">Aucun serveur, aucun compte</strong>.</p>'+
        '<p style="margin-top:16px;color:var(--wk);font-size:11px;line-height:1.7">Cliquez sur votre wallet en haut à droite à tout moment pour revoir ces informations. Tapez <code style="color:var(--cy)">help</code> dans le terminal (touche <code style="color:var(--cy)">²</code> ou <code style="color:var(--cy)">~</code>) pour découvrir les commandes avancées.</p>',
      actions:[
        {label:'Commencer l\'exploration',kind:'primary',onClick:markOnboarded}
      ]
    });
  }
  window.addEventListener('tsc:bootComplete',()=>{
    if(shouldOnboard())showOnboarding();
  });

  // ═══ Filet de sécurité curseur ═══
  window.addEventListener('error',e=>{if(String(e.message||'').match(/cursor|cdot/i))document.documentElement.classList.add('no-cursor-js')});

  // ═══ Boot init ═══
  function boot(){
    initWallet().then(()=>{
      updateWalletUI();
      lbRender();
      initSectionObserver();
      // étendre help CLI en affichant nos commandes quand l'utilisateur tape help
      document.addEventListener('click',function once(){
        const h=document.querySelector('.chist');if(!h)return;
        const mo=new MutationObserver(()=>{
          const last=h.lastChild;
          if(last&&last.textContent&&last.textContent.includes('exit ........... fermer')&&!h.dataset.extHelp){
            h.dataset.extHelp='1';
            cLine('<span class="out">  ─── v2.1 ───</span>');
            cLine('  wallet ......... infos wallet');
            cLine('  balance ........ solde TSC');
            cLine('  stake &lt;n&gt; ...... miser n TSC (PoS simulé)');
            cLine('  deploy &lt;c&gt; ..... déployer contrat (counter, vote)');
            cLine('  call &lt;a&gt; &lt;m&gt; ... appeler méthode de contrat');
            cLine('  contracts ...... lister contrats déployés');
            cLine('  mempool ........ voir transactions en attente');
            cLine('  explore &lt;n&gt; .... ouvrir explorateur de bloc');
            cLine('  xray ........... mode rayons-X');
            cLine('  byzantine on|off  simuler nœuds malveillants');
          }
        });
        mo.observe(h,{childList:true});
      },{once:true});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();

  // expose pour debug
  window.TSC=STATE;
})();
