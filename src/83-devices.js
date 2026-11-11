/* ---------- join QR: the tablet uses the address it was opened with, the laptop uses what the server reports ---------- */
let joinInfo=null;
async function loadJoinInfo(){try{const r=await fetch("/info",{cache:"no-store"});joinInfo=await r.json()}catch(e){}}
const isLoop=h=>/^(127\.|localhost$|\[::1\]$|::1$)/.test(h);
function laptopUrls(){return joinInfo?[joinInfo.url,...(joinInfo.others||[])]:[]}
function chosenUrl(){const all=laptopUrls();return all.includes(state.joinUrl)?state.joinUrl:(all[0]||"")}
function joinUrl(){
  if(!served)return "";
  if(MODE==="player"&&!isLoop(location.hostname)){const port=(joinInfo&&joinInfo.port)||(location.protocol==="http:"?location.port:"")||"8765";
    return `http://${location.hostname}:${port}/players`}
  return chosenUrl();
}
function qrSvg(text,cls){
  try{const q=qrcode(0,"M");q.addData(text);q.make();const n=q.getModuleCount(),m=4,S=n+2*m;let d="";
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+=`M${c+m} ${r+m}h1v1h-1z`;
    return `<svg class="${cls||"qr"}" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges" role="img" aria-label="QR code for ${esc(text)}"><rect width="${
      S}" height="${S}" fill="#fff"/><path d="${d}" fill="#111"/></svg>`}
  catch(e){return ""}
}
/* ---- DM devices: run the server on one computer, be the DM from another (paired once) ---- */
let dmDev=null,dmPair=null;
async function dmDevLoad(){try{const r=await fetch("/dm-devices",{cache:"no-store"});dmDev=r.ok?await r.json():null}catch(e){dmDev=null}}
const agoTxt=t=>{if(!t)return "never";const s=Date.now()/1000-t;return s<90?"just now":s<3600?Math.round(s/60)+" min ago":s<86400?Math.round(s/3600)+" h ago":
  Math.round(s/86400)+" days ago"};
function dmDevSheet(){
  const d=dmDev,host=d&&d.host,L=d?d.list:[];
  const pairUrls=dmPair?(dmPair.ips||[]).map(ip=>`http://${ip}:${dmPair.port}/pair/${dmPair.code}`):[];
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="DM devices"><h2>DM devices</h2>
    <p class="psub">${
      host?"This computer runs the server, so it is always the DM. Pair another computer (e.g. the laptop, when the server runs on the desktop) to be the DM from there; phones stay players.":
      "This device is paired as the DM. Only the computer running the server can pair or remove devices."}</p>
    ${host?(dmPair?`<div class="joincard big">${qrSvg(pairUrls[0]||"")}<div class="jc-t"><div class="eyebrow2">Open on the device that becomes the DM</div>
        ${pairUrls.map(u=>`<div class="jc-url">${esc(u)}</div>`).join(
          "")}<div class="jc-help">Scan it, or type the address in that device's browser. It works once, for 10 minutes. Code: <b>${esc(
          dmPair.code)}</b></div></div></div>
        <div class="spacts"><button class="btn" type="button" data-act="dmpairnew">New link</button><button class="btn" type="button" data-act="dmpaircancel">Done</button></div>`
      :`<form id="dmPairForm" class="asave" autocomplete="off"><input class="field" id="dmPairName" maxlength="40" placeholder="Name, e.g. Laptop"><button class="btn primary" type="submit">Add a DM device</button></form>`):""}
    <div class="psec"><div class="eyebrow2">Paired</div>${L.length?L.map(x=>`<div class="res"><div class="rn">${esc(x.name||"DM device")}${x.me?
      " (this device)":""}<small>${esc(x.ip||"")} · paired ${agoTxt(x.added)} · last seen ${agoTxt(x.seen)}</small></div>
        ${host?`<button class="btn" type="button" data-act="dmunpair" data-id="${esc(x.id)}">Remove</button>`:x.me?
          `<button class="btn" type="button" data-act="dmforget">Unpair this device</button>`:""}</div>`).join(""):`<p class="psub">None yet.</p>`}</div>
    <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="close">Close</button></div></div></div>`;
}
async function dmPairMake(name){try{const r=await fetch("/dm-pair",{method:"POST",body:JSON.stringify({name})});dmPair=r.ok?await r.json():null;
  if(!dmPair)toast("Couldn't make a pairing link")}catch(e){toast("Couldn't make a pairing link")}dmDevSheet()}
const JOIN_HELP=`<b>Can't connect?</b> Use the same Wi-Fi as the laptop (not a guest network). Android + Chrome: Settings → Apps → Chrome → Permissions → <b>Nearby devices</b> → Allow. iPhone: allow <b>Local Network</b> when asked.`;
function joinCard(big){const u=joinUrl();if(!u)return "";
  return `<div class="joincard${big?" big":""}">${qrSvg(u)}<div class="jc-t"><div class="eyebrow2">Scan to join</div><div class="jc-url">${esc(
    u)}</div><div class="jc-help">${JOIN_HELP}</div></div></div>`}
function qrSheet(){
  const u=chosenUrl(),all=laptopUrls();
  if(!u){toast("Start the tracker with start.bat to get the address");return}
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true"><h2>Players join here</h2>
    <div class="qrsheet">${qrSvg(u)}<div class="jc-url">${esc(u)}</div>
      ${all.length>1?
        `<div class="psub">This computer has several network addresses. If phones can't open the one above, pick another:</div><div class="qrpicks">${all.map(
        x=>`<button class="btn" type="button" data-act="qrpick" data-u="${esc(x)}" aria-pressed="${x===u}">${esc(x.replace(/^http:\/\//,
        "").replace(/\/players$/,""))}</button>`).join("")}</div>`:""}
      <button class="btn${state.showQr?" primary":""}" type="button" data-act="qrsurface" aria-pressed="${!!state.showQr}">${state.showQr?
        "Hide the QR code on the tablet":"Show this QR code on the tablet"}</button>
      <p class="psub" style="margin:0">Before combat the tablet shows it by itself. Shortcut: <b>J</b>.</p></div>
    <ul class="qrhelp"><li>Phones must be on the <b>same Wi-Fi</b> as this computer, not a guest network.</li>
      <li><b>Android + Chrome</b> (ERR_TOO_MANY_RETRIES or nothing loads): Settings → Apps → Chrome → Permissions → <b>Nearby devices</b> → Allow, then force-stop Chrome. Samsung Internet and Firefox also work.</li>
      <li><b>iPhone</b>: tap Allow when Safari asks about the Local Network.</li>
      <li>Still nothing on any phone: run <b>allow-network.bat</b> once on this computer.</li></ul>
    <div style="display:flex;justify-content:flex-end"><button class="btn primary" type="button" data-act="close">Done</button></div></div></div>`;
}
/* ---- Devices: who is connected, with the full link for each kind of screen ---- */
function pollWho(){   // the tablet and each phone tell the server what they are, so the DM can see who is connected
  if(MODE!=="player"||PREVIEW)return "";
  if(meName==="*")return TV?"":"&screen=tablet";
  const me=meChar();return me?"&me="+encodeURIComponent(me.id):"";
}
const tabletOn=()=>{const d=joinInfo;if(!d)return false;const a=d.tabletAgo!=null?d.tabletAgo:d.playerAgo;return a!=null&&a<5};
const tvOn=()=>!!(joinInfo&&joinInfo.tvAgo!=null&&joinInfo.tvAgo<5);
const phoneAgo=c=>{const p=joinInfo&&joinInfo.phones;return p&&p[c.id]!=null?p[c.id]:null};
const devPcs=()=>sorted().filter(c=>c.kind==="pc");
function devPill(){const jp=$("#joinPill");if(!jp)return;
  const pcs=devPcs(),on=pcs.filter(c=>{const a=phoneAgo(c);return a!=null&&a<8}).length;
  jp.innerHTML=`<b>Devices</b><i class="jd${tabletOn()?" on":""}"></i><span>Tablet</span><i class="jd${tvOn()?" on":" off"}"></i><span>TV</span>${pcs.length?
    `<i class="jd${on===pcs.length?" on":on?" some":""}"></i><span>${on}/${pcs.length} phones</span>`:""}`}
const devBase=()=>String(chosenUrl()||"").replace(/\/players$/,"");
const devAgo=a=>a==null?"not connected yet":a<8?"connected":a<90?`last seen ${Math.round(a)} s ago`:a<5400?`last seen ${Math.round(a/60)} min ago`:
  `last seen ${Math.round(a/3600)} h ago`;
function devRow(on,name,status,link,extra){
  return `<div class="devrow"><i class="jd${on?" on":""}"></i><div class="devn"><b>${name}</b><small>${status}</small></div>
    ${link?`<div class="devlink"><code>${esc(link)}</code><button class="btn sm" type="button" data-act="devcopy" data-u="${esc(link)}">Copy</button></div>`:
      ""}${extra||""}</div>`}
function devSheet(){
  const u=chosenUrl(),all=laptopUrls(),base=devBase(),d=joinInfo||{};
  if(!u){toast("Start the tracker with start.bat to get the address");return}
  const old=$("#devSheet"),top=old?old.scrollTop:0,keepOpen=old&&old.querySelector("details[open]");
  const pcs=devPcs(),tabA=d.tabletAgo!=null?d.tabletAgo:d.playerAgo;
  const phoneRows=pcs.map(c=>{const a=phoneAgo(c),tags=[c.psimple?"simple phone":"",c.php?"shares HP":"",state.sheets&&
    state.sheets[String(c.name).toLowerCase()]?"sheet":""].filter(Boolean).join(" · ");
    return devRow(a!=null&&a<8,esc(c.name),esc(devAgo(a)+(tags?" · "+tags:"")),null)}).join("");
  const dmN=dmDev&&dmDev.list?dmDev.list.length:0;
  $("#overlay").innerHTML=
    `<div class="scrim" data-act="close"><div class="sheet devsheet" id="devSheet" role="dialog" aria-modal="true" aria-label="Devices"><h2>Devices</h2>
    <div class="devjoin">${qrSvg(u)}<div><div class="eyebrow2">Players join here</div><div class="jc-url">${esc(u)}</div>
      <p class="psub">Phones scan the code or type the address, then tap their name. Before combat the tablet shows this code by itself.</p>
      <div class="spacts" style="justify-content:flex-start"><button class="btn sm" type="button" data-act="devcopy" data-u="${esc(
        u)}">Copy</button><button class="btn sm${state.showQr?" primary":""}" type="button" data-act="qrsurface" aria-pressed="${!!state.showQr}">${
        state.showQr?"Hide the code on the tablet":"Show the code on the tablet"}</button></div>
      ${all.length>1?
        `<div class="psub">This computer has several network addresses. If phones can't open the one above, pick another:</div><div class="qrpicks">${all.map(
        x=>`<button class="btn sm" type="button" data-act="qrpick" data-u="${esc(x)}" aria-pressed="${x===u}">${esc(x.replace(/^http:\/\//,
        "").replace(/\/players$/,""))}</button>`).join("")}</div>`:""}
      ${d.httpsUrl?`<div class="psub">Also over https: <code>${esc(d.httpsUrl)}</code></div>`:""}</div></div>
    <div class="psec"><div class="eyebrow2">Screens</div>
      ${devRow(tabletOn(),"Tablet",esc(devAgo(tabA)),base+"/players?shared=1")}
      ${devRow(tvOn(),"TV",esc(devAgo(d.tvAgo))+" · its modes and look are on the TV button",base+"/players?shared=1&screen=tv")}</div>
    <div class="psec"><div class="eyebrow2">Phones</div>${pcs.length?`<div class="devgrid">${phoneRows}</div>`:
      `<p class="psub">Add the party to the fight and each player's phone shows up here.</p>`}
      ${pcs.length?`<p class="psub" style="margin:0">Players who play on paper never connect; that's fine. Phones open <code>${esc(base+
        "/players")}</code>.</p>`:""}</div>
    <div class="psec"><div class="eyebrow2">DM devices</div><div class="devrow"><div class="devn"><b>${dmN?`${dmN} paired`:
      "None paired"}</b><small>Run the server on one computer and be the DM from another, e.g. the laptop.</small></div><button class="btn sm" type="button" data-act="dmdev">Manage…</button></div></div>
    <details class="devhelp"${keepOpen?" open":
      ""}><summary>Can't connect?</summary><ul class="qrhelp"><li>Phones must be on the <b>same Wi-Fi</b> as this computer, not a guest network.</li>
      <li><b>Android + Chrome</b> (ERR_TOO_MANY_RETRIES or nothing loads): Settings → Apps → Chrome → Permissions → <b>Nearby devices</b> → Allow, then force-stop Chrome. Samsung Internet and Firefox also work.</li>
      <li><b>iPhone</b>: tap Allow when Safari asks about the Local Network.</li>
      <li>Still nothing on any phone: run <b>allow-network.bat</b> once on this computer (as administrator).</li>
      <li>A VPN or a second network card can give the wrong address: pick another one above.</li></ul></details>
    <div style="display:flex;justify-content:flex-end"><button class="btn primary" type="button" data-act="close">Done</button></div></div></div>`;
  const sh=$("#devSheet");if(sh)sh.scrollTop=top;
}
let rollSeen=null,timerSeen=null,dsAskSeen=null,wasDown=null,fightSeen=null,turnSeen=null;
function yourTurn(me){
  if(!reduced){const el=document.createElement("div");el.className="yourturn";
    el.innerHTML=`<div><small>Round ${state.turn.round}</small>Your turn, ${esc(me.name)}!</div>`;document.body.appendChild(el);
    setTimeout(()=>el.remove(),2600)}
  try{navigator.vibrate&&navigator.vibrate([200,100,200,100,400])}catch(e){}
  if((me.conds||[]).some(x=>(x.n||x)==="Burning"))setTimeout(()=>toast("You're Burning: take 1d4 fire damage",4000),900);
}
function surfaceEvents(first){
  // nat 20 / nat 1 / shared rolls
  const r=state.roll;
  if(first)rollSeen=r?r.id:null;
  else if(r&&r.id!==rollSeen){rollSeen=r.id;
    // your own ordinary roll: the sheet you rolled from already shows it, so no second popup over it (nat 20 / nat 1 still celebrate)
    const own=meName!=="*"&&pSheet&&r.kind==="roll"&&meChar()&&r.by===meChar().name;
    if(!own&&Math.abs(dmNow()-r.at)<15000&&screenWants("dice")){if(!reduced&&meName==="*"&&!TV)fxDie(r,()=>showRoll(r));
      else showRoll(r)}}   // the TV has its own die (TV6)
  // a roll call: phones of the called players get a prompt and a buzz
  const me=meChar(),call=state.call;
  if(call&&call.id!==seenCall){seenCall=call.id;
    if(me&&(!call.to||!call.to.length||call.to.includes(me.id))&&(call.answers||{})[me.id]==null){pSheet="call";
      try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}}}
  // the DM asks for a Concentration save after damage
  {const ca=me?(state.concAsk||[]).find(a=>a.cid===me.id):null;
   if(ca&&ca.id!==concAskSeen){concAskSeen=ca.id;if(dmNow()-ca.at<10*60000){pConc={dc:ca.dc,dmg:ca.dmg,res:null,ask:ca.id,askAt:Date.now(),hpTaken:false};
     pSheet="conc";try{navigator.vibrate&&navigator.vibrate([150,80,150])}catch(e){}}}
   else if(!ca&&pConc&&pConc.ask&&!pConc.res&&pSheet==="conc"){pConc.res={d:0,tot:"DM",ok:(me.conds||[]).some(x=>(x.n||x)==="Concentrating"),text:
     "The DM answered it"}}}
  // death saves: the phone opens the death save window when you drop to 0 HP and whenever the DM asks for one
  const ask=state.dsAsk;
  if(first)dsAskSeen=ask?ask.id:null;
  else if(ask&&ask.id!==dsAskSeen){dsAskSeen=ask.id;if(me&&ask.cid===me.id&&me.down){dsLast=null;pSheet="dsave";
    try{navigator.vibrate&&navigator.vibrate([250,120,250,120,250])}catch(e){}}}
  const down=!!(me&&me.down);
  if(!first&&me&&down&&wasDown===false&&pSheet!=="dsave"&&pSheet!=="who"){dsLast=null;pSheet="dsave";try{navigator.vibrate&&navigator.vibrate([400])}catch(e){}}
  wasDown=me?down:null;
  // a new fight: everyone without an initiative gets the initiative window and a buzz
  if(state.fightAt&&state.fightAt!==fightSeen){const fresh=!first||dmNow()-state.fightAt<10*60000;fightSeen=state.fightAt;
    if(fresh&&me&&typeof me.init!=="number"&&!state.ended&&pSheet!=="who"&&pSheet!=="call"){pSheet="init";
      try{navigator.vibrate&&navigator.vibrate([150,80,150])}catch(e){}}}
  // turns: a big "your turn" and a buzz; a small heads-up when you're next
  const tk=state.turn&&state.turn.id?state.turn.id+":"+state.turn.round:null;
  if(first)turnSeen=tk;
  else if(tk!==turnSeen){turnSeen=tk;if(me&&tk){
    if(state.turn.id===me.id)yourTurn(me);
    else{const vis=withLair(sorted().filter(shownToPlayers)),i=vis.findIndex(c=>c.id===state.turn.id);
      if(i>=0&&vis.length>1&&vis[(i+1)%vis.length].id===me.id){toast("You're up next");try{navigator.vibrate&&navigator.vibrate(120)}catch(e){}}}}}
  // the hourglass buzzes the player it is aimed at
  const t=state.timer;
  if(first)timerSeen=t?t.id:null;
  else if(t&&t.id!==timerSeen){timerSeen=t.id;if(me&&t.cid===me.id){try{navigator.vibrate&&navigator.vibrate([100,60,100,60,300])}catch(e){}}}
}
function showRoll(r){
  if(TV){if(r.kind==="nat20"&&sfx("crit"))Scene.crit();tvDice(r);return}
  const el=document.createElement("div");if(r.kind==="nat20"&&meName==="*"&&sfx("crit"))Scene.crit();
  if(r.kind==="nat20"){
    el.className="celebrate n20";
    el.innerHTML=`<div class="rays"></div><div class="cel-inner"><div class="cel-k">Natural</div><div class="cel-n">20</div><div class="cel-who">${esc(
      r.by)}</div></div>`;
    for(let i=0;i<40;i++){const s=document.createElement("i");s.style.setProperty("--a",(Math.random()*360)+"deg");
      s.style.setProperty("--d",(30+Math.random()*45)+"vmin");s.style.animationDelay=(Math.random()*.35)+"s";el.appendChild(s)}
  }else if(r.kind==="nat1"){
    el.className="celebrate n1";
    el.innerHTML=`<svg class="crack" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M48 0 L52 18 L44 30 L55 46 L47 58 L58 74 L50 100 M52 18 L66 24 M44 30 L30 36 M55 46 L72 52 M47 58 L34 66 M58 74 L70 86" fill="none" stroke="currentColor" stroke-width=".7"/></svg><div class="cel-inner"><div class="cel-k">Natural</div><div class="cel-n">1</div><div class="cel-who">${
      esc(r.by)}</div></div>`;
  }else{
    el.className="rollbanner";
    el.innerHTML=`${D20}<span><b>${esc(r.by)}</b> ${esc(r.text)}</span><strong>${esc(r.total)}</strong>`;
  }
  document.body.appendChild(el);setTimeout(()=>el.remove(),r.kind==="roll"?6000:3600);
}
/* the DM's own view of the hourglass, with Stop and +10 s */
const HG_SVG=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
function dmTimerTick(){
  let el=$("#dmTimer");const t=state.timer;
  const left=t?Math.min(t.secs,Math.ceil((t.at+t.secs*1000-Date.now())/1000)):-99;
  if(!t||left<-3){if(el)el.remove();return}
  if(!el){el=document.createElement("div");el.id="dmTimer";el.setAttribute("role","status");
    el.innerHTML=
      `${HG_SVG}<span class="hg-name"></span><b class="hg-left"></b><button class="btn sm" type="button" data-act="tadd">+10 s</button><button class="btn sm danger" type="button" data-act="tstop">Stop</button>`;
    document.body.appendChild(el)}
  const c=byId(t.cid);el.className=left<=0?"done":left<=5?"low":"";
  el.querySelector(".hg-name").textContent=c?c.name:t.name;el.querySelector(".hg-left").textContent=left>0?left+" s":"Time!";
}
function stopTimer(){if(!state.timer)return;state.timer=null;commit();dmTimerTick();toast("Hourglass stopped")}
/* hourglass: drawn every quarter second from state.timer */
function timerTick(){
  let el=$("#hourglass");const t=state.timer;
  const left=t?Math.min(t.secs,Math.ceil((t.at+t.secs*1000-dmNow())/1000)):-99;
  document.body.classList.toggle("hg-on",!!t&&left>=-3);
  if(!t||left<-3){if(el)el.remove();return}
  if(!el){el=document.createElement("div");el.id="hourglass";document.body.appendChild(el)}
  document.body.style.setProperty("--hgh",el.offsetHeight+"px");
  const c=byId(t.cid),pct=Math.max(0,Math.min(100,100*left/t.secs));
  el.className=left<=0?"done":left<=5?"low":"";
  el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    <span class="hg-name">${esc(c?c.name:t.name)}</span><span class="hg-left">${left>0?`${left}<small>s</small>`:
      "Time!"}</span><span class="hg-bar"><i style="width:${pct}%"></i></span>`;
}
let infoT=null;
function showInfo(key,extra){
  const r=RULES[key];if(!r&&!extra)return;
  let el=$("#info");if(!el){el=document.createElement("div");el.id="info";document.body.appendChild(el)}
  el.innerHTML=`<div class="info-card"><h3>${esc(extra?extra.t:r.t)}</h3><ul>${(extra?extra.d:r.d).map(x=>
    `<li>${esc(x)}</li>`).join("")}</ul><div class="info-hint">Tap anywhere to close</div></div>`;
  el.hidden=false;clearTimeout(infoT);infoT=setTimeout(()=>{el.hidden=true},12000);
}
function effectInfo(id){const e=state.effects.find(x=>x.id===id);if(!e)return;const c=byId(e.by);
  const tg=e.targets.map(t=>byId(t)).filter(Boolean).map(t=>t.name);
  showInfo(null,{t:"✦ "+e.name,d:[`Cast by: ${c?c.name:"?"}`,`On: ${tg.join(", ")}`].concat(e.conc?
    ["Needs Concentration: it ends when the caster loses Concentrating."]:[])})}
async function pSend(body){
  const me=meChar();if(!me)return false;
  try{const r=await fetch("/player",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.assign({id:me.id},body))});
    if(r.status===403){toast("The DM has locked changes");return false}
    if(!r.ok)throw new Error(r.status);return true;
  }catch(e){toast("Couldn't send, check the Wi-Fi");return false}
}

