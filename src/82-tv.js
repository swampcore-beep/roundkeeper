/* ---- TV pack 2 ---- */
const tvRerender=()=>{if(TV)tvRender(grpRows(withLair(sorted().filter(shownToPlayers))),false)};
const tvLater=(ms,k)=>{clearTimeout(tvLater[k]);tvLater[k]=setTimeout(tvRerender,ms+60)};
const callTo=call=>(call.to&&call.to.length?call.to:state.list.filter(c=>c.kind==="pc").map(c=>c.id)).map(id=>byId(id)).filter(c=>c&&!c.hidden);
// TV7: a roll call fills the TV while players roll, and 10 s after the last one
function tvCallOn(){const call=state.call;if(!call)return false;const to=callTo(call),ans=call.answers||{};if(!to.length)return false;
  if(!to.every(c=>ans[c.id]!=null))return true;
  pv.tvCallDone=pv.tvCallDone||{};if(pv.tvCallDone[call.id]==null)pv.tvCallDone[call.id]=dmNow()-call.at>60000?0:Date.now();
  const left=10000-(Date.now()-pv.tvCallDone[call.id]);if(left>0)tvLater(left,"call");return left>0}
// TV13: while initiative comes in, and 3 s after the last player's
function tvInitOn(list){const pcs=list.filter(c=>c.kind==="pc");if(!pcs.length)return false;const key=state.fightAt||0;
  if(pcs.some(c=>initOf(c)<=-999)){pv.tvIniWait=key;pv.tvIniDone=null;return true}
  if(pv.tvIniWait!==key)return false;if(pv.tvIniDone==null)pv.tvIniDone=Date.now();
  const left=3000-(Date.now()-pv.tvIniDone);if(left>0)tvLater(left,"ini");return left>0}
const TV_CHECK=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`,
  TV_CROSS=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const ordinal=n=>n+(n%100>=11&&n%100<=13?"th":["th","st","nd","rd"][n%10]||"th");
function tvCallHtml(){const call=state.call,to=callTo(call),ans=call.answers||{},dc=call.dc;
  pv.tvCallSeen=pv.tvCallSeen&&pv.tvCallSeen.id===call.id?pv.tvCallSeen:{id:call.id,ans:{}};
  const title=String(call.text||"Roll").replace(/\s*DC\s*\d+/i,"").trim();
  const cards=to.map(c=>{const v=ans[c.id],st=v==null?"wait":dc!=null?(v>=dc?"pass":"fail"):"done",flip=v!=null&&pv.tvCallSeen.ans[c.id]==null;
    return `<div class="t2cc t2${st}${flip?" t2flip":""}"><span class="t2n">${esc(c.name)}</span><span class="t2v">${v==null?"?":
      esc(String(v))}</span><span class="t2r">${st==="wait"?"rolling…":st==="pass"?TV_CHECK.replace("<svg",
      '<svg style="width:1em;height:1em;vertical-align:-.12em"')+" Succeeded":st==="fail"?TV_CROSS.replace("<svg",
      '<svg style="width:.9em;height:.9em;vertical-align:-.08em"')+" Failed":"Rolled"}</span></div>`}).join("");
  to.forEach(c=>{if(ans[c.id]!=null)pv.tvCallSeen.ans[c.id]=1});
  const got=to.filter(c=>ans[c.id]!=null),ok=dc!=null?got.filter(c=>ans[c.id]>=dc).length:0,wait=to.filter(c=>ans[c.id]==null);
  const sum=dc!=null?`<b>${ok} of ${got.length===to.length?to.length:got.length}</b>succeeded${got.length<to.length?" so far":""}`:
    `<b>${got.length} of ${to.length}</b>rolled`;
  return `<div class="tvcall"><div class="t2hd"><div class="t2t"><span class="tveb">Roll call</span><span class="tvbig">${esc(title)}</span></div>${dc!=null?
    `<div class="t2dc"><span class="tveb">DC</span><span class="tvbig">${esc(String(dc))}</span></div>`:""}</div>
    <div class="t2cards">${cards}</div><div class="t2sum">${sum}${wait.length?` <span>· waiting for ${esc(wait.map(c=>c.name).join(", "))}</span>`:
      ""}</div></div>`}
function tvInitHtml(list){const got=list.filter(c=>initOf(c)>-999||c.kind==="lair"),wait=list.filter(c=>c.kind!=="lair"&&initOf(c)<=-999);
  const ids=new Set(got.map(c=>c.id)),prev=pv.tvIniPrev||new Set();const fresh=[...ids].filter(id=>!prev.has(id));
  if(pv.tvIniPrev&&fresh.length===1)pv.tvIniJust={id:fresh[0],at:Date.now()};pv.tvIniPrev=ids;
  const just=pv.tvIniJust&&Date.now()-pv.tvIniJust.at<2500?pv.tvIniJust.id:null;if(just)tvLater(2500,"just");
  const n=got.length+wait.length,pcs=list.filter(c=>c.kind==="pc"),pdone=pcs.filter(c=>initOf(c)>-999).length;
  const card=(c,k)=>`<div class="t2ic k-${c.kind}${frameKey(c)&&c.kind!=="lair"?" fr fr-"+frameKey(c):""}${k===0?" t2first":""}${c.id===just?" t2just":
    ""}"><span class="t2o">${c.id===just?"JUST IN":ordinal(k+1).toUpperCase()}</span><span class="t2v">${c.kind==="lair"?20:
    initOf(c)}</span><span class="t2n">${esc(c.name)}</span></div>`;
  return `<div class="tvini" style="--iw:${Math.min(100,n*16)}%"><span class="t2hd tvbig">Roll for initiative!</span>
    <div class="t2row">${got.map(card).join("")}${wait.map(c=>`<div class="t2ic t2wait"><span class="t2o">${c.kind==="pc"?"STILL ROLLING":
      "THE DM ROLLS"}</span><span class="t2v">?</span><span class="t2n">${esc(c.name)}</span></div>`).join("")}</div>
    <div class="t2sum"><b>${pdone} of ${pcs.length}</b>players have rolled</div></div>`}
// TV9: a player at 0 HP on their turn, with the death saves big
function tvDsHtml(c){const d=dsOf(c),pip=(on,k)=>`<div class="t2pip t2${k}${on?" on":""}">${on?(k==="s"?TV_CHECK:TV_CROSS).replace('stroke="currentColor"',
  `stroke="${k==="s"?"#06232e":"#2b0c02"}"`):""}</div>`;
  const msg=d.s>=2&&d.f>=2?"Everything rides on this roll":d.s>=2?`One more success and ${c.name} is stable`:d.f>=2?`One more failure and ${c.name} dies`:
    `${c.name} rolls a death save`;
  return `<div class="tvds"><div class="t2top"><span class="tveb">Death save${state.turn?" · Round "+state.turn.round:
    ""}</span><span class="tvbig">${esc(c.name)}</span><small>${esc(LABEL[c.cls]||"Player")} · 0 HP</small></div>
    <svg class="t2ecg" viewBox="0 0 1280 160" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80 H420 L450 80 L470 30 L495 140 L520 10 L545 120 L565 80 H760 L785 80 L800 55 L820 105 L840 80 H1280" fill="none" stroke="#e05a5a" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>
    <div class="t2rows"><div><span class="tveb t2s">Successes</span><div class="t2pips">${[0,1,2].map(i=>pip(i<d.s,
      "s")).join("")}</div></div><div><span class="tveb t2f">Failures</span><div class="t2pips">${[0,1,2].map(i=>pip(i<d.f,"f")).join("")}</div></div></div>
    <div class="t2msg">${esc(msg)}</div></div>`}
// TV14: the end of the fight, from the summary the DM's screen made (no raw statistics reach the TV)
function tvEndHtml(){const e=state.ended.tv;
  return `<div class="tvend"><div class="t2hd"><span class="tvbig${e.lost?" t2lost":""}">${esc(e.title)}</span>${e.sub?`<span>${esc(e.sub)}</span>`:""}</div>
    <div class="t2cards">${(e.cards||[]).map((x,i)=>`<div class="t2mv${i===0?" t2top":
      ""}"><span class="t2k">${esc(x.k)}</span><span class="t2n">${esc(x.name)}</span><span class="t2v${String(x.v).length>7?" t2vs":
      ""}">${esc(x.v)}</span>${x.note?`<small>${esc(x.note)}</small>`:""}</div>`).join("")}</div>
    ${e.xp?`<div class="t2xp"><span class="tveb">Experience</span><b>${e.xp.total.toLocaleString("en")} XP</b>${e.xp.each?
      `<i></i><b class="t2each">${e.xp.each.toLocaleString("en")} each</b>`:""}</div>`:"<div></div>"}</div>`}
// TV10: the countdown ring
function tvRingSvg(k,big){const m=Math.max(1,k.max||k.n||1),n=Math.max(0,k.n),R=200,C=2*Math.PI*R,gap=m>1?Math.min(10,C/m*.12):0,seg=C/m-gap;
  const lit=n?Array.from({length:n},()=>`${seg.toFixed(2)} ${gap.toFixed(2)}`).join(" ")+" 0 "+C.toFixed(1):`0 ${C.toFixed(1)}`;
  return `<svg class="t2ring" viewBox="0 0 520 520" role="img" aria-label="${n} of ${m} rounds left"><circle cx="260" cy="260" r="${
    R}" fill="none" stroke="color-mix(in srgb,var(--fg) 16%,transparent)" stroke-width="44" stroke-dasharray="${seg.toFixed(2)} ${gap.toFixed(
    2)}" transform="rotate(-90 260 260)"/>
    <circle cx="260" cy="260" r="${R}" fill="none" stroke="#f2a65a" stroke-width="44" stroke-dasharray="${
      lit}" transform="rotate(-90 260 260)" style="filter:drop-shadow(0 0 14px rgba(242,166,90,.8))"/>
    <text x="260" y="${n?300:296}" text-anchor="middle" font-size="${n?170:120}" fill="#ffd9a8">${n?n:"Now"}</text>${n?
      `<text x="260" y="352" text-anchor="middle" font-size="30" fill="currentColor" letter-spacing="4" style="font-family:var(--body);font-weight:700">${n===1?
      "ROUND LEFT":"ROUNDS LEFT"}</text>`:""}</svg>`}
function tvClockShow(k,zero){const L=(state.clocks||[]).filter(x=>!x.secret&&x.id!==k.id&&x.n>0);
  momentShow("tvclk"+(zero?" zero":""),`<div class="mo-eb">⏳ Countdown</div><div class="mo-big">${esc(k.name)}</div>${tvRingSvg(k)}${L.length?
    `<div class="t2more">Also: ${L.map(x=>`${esc(x.name)} · ${x.n}`).join(" · ")}</div>`:""}`,zero?8000:5000)}
// TV6: a shared roll on the TV: the die lands, the result is big, the round's other rolls on the side
function tvDice(r){const old=$("#tvDice");if(old)old.remove();
  const m=String(r.text||"").match(/d20\s*\((\d+)\)/),nat=r.kind==="nat20"?20:r.kind==="nat1"?1:m?+m[1]:null,face=nat!=null?nat:r.total!=null?r.total:"";
  const n20=nat===20,n1=nat===1,rd=state.turn?state.turn.round:0;
  pv.tvRolls=(pv.tvRolls||[]).filter(x=>x.rd===rd);
  const what=String(r.text||"").split(":")[0]||(n20||n1?"Natural "+nat:"Roll");
  const el=document.createElement("div");el.id="tvDice";if(n20)el.className="n20";else if(n1)el.className="n1";
  el.innerHTML=`<div class="t2rays"></div><div class="t2who"><span class="tveb">${rd?`Round ${rd} · `:""}${esc(r.by||
    "")}</span><span class="tvbig">${esc(what)}</span></div>
    <div class="t2mid"><svg class="t2die" viewBox="0 0 100 100" role="img" aria-label="d20 showing ${esc(String(
      face))}"><polygon points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" fill="#2b2233" stroke="${n1?"#e08a7e":
      "#f2c97a"}" stroke-width="2.2" stroke-linejoin="round"/><polygon points="50,22 76,66 24,66" fill="#3a2d40" stroke="${n1?"#e08a7e":
      "#f2c97a"}" stroke-width="1.6" stroke-linejoin="round"/><path d="M50 3 L50 22 M91 26.5 L76 66 M9 26.5 L24 66 M50 97 L76 66 M50 97 L24 66 M91 73.5 L76 66 M9 73.5 L24 66 M91 26.5 L50 22 M9 26.5 L50 22" stroke="${
      n1?
      "#e08a7e":"#f2c97a"}" stroke-width="1.2" fill="none" opacity=".75"/><text x="50" y="56.5" text-anchor="middle" font-family="var(--tdisplay,var(--display))" font-weight="800" font-size="${
      String(face).length>2?15:21}" fill="${n1?"#ffd0c8":"#ffe2a6"}">${esc(String(face))}</text></svg>
      ${n20?`<span class="t2head tvbig">Natural 20!</span>`:n1?`<span class="t2head tvbig">Natural 1</span>`:`<span class="t2head tvbig">${esc(String(r.total??
        face))}</span>`}
      ${r.text?`<span class="t2line">${esc(r.text)}${r.total!=null&&(n20||n1)?` = <b>${esc(String(r.total))}</b>`:""}</span>`:""}</div>
    ${pv.tvRolls.length?`<div class="t2hist"><span class="tveb">Earlier this round</span>${pv.tvRolls.slice(-3).reverse().map(x=>`<div class="${x.n1?"n1":
      ""}"><span>${esc(x.by)} · ${esc(x.what)}</span><b>${esc(String(x.v))}</b></div>`).join("")}</div>`:""}`;
  document.body.appendChild(el);
  pv.tvRolls.push({rd,by:r.by||"",what,v:r.total??face,n1});
  clearTimeout(tvDice.t);tvDice.t=setTimeout(()=>{el.classList.add("out");setTimeout(()=>el.remove(),650)},n20||n1?8000:4500)}
// TV15: the DM's own picture drifts and zooms slowly in Scene mode (not in Light mode or with reduced motion)
function tvKenBurns(on){const b=$("#bgimg");if(!b)return;on=on&&b.classList.contains("on")&&!document.body.classList.contains("tvlite")&&!reduced;
  if(!on){if(tvKenBurns.t){clearInterval(tvKenBurns.t);tvKenBurns.t=null;b.style.transition="";b.style.scale="";b.style.translate=""}return}
  if(tvKenBurns.t)return;let k=0;const go=()=>{k^=1;b.style.transition="opacity .8s,filter .6s,scale 40s ease-in-out,translate 40s ease-in-out";
    b.style.scale=k?"1.14":"1";b.style.translate=k?"-2.5% -1.5%":"0 0"};
  setTimeout(go,50);tvKenBurns.t=setInterval(go,40000)}
let tvTick=null;
function tvRender(list,first){
  let el=$("#tvLayer");if(!el){el=document.createElement("div");el.id="tvLayer";document.body.appendChild(el)}
  const T=state.tv||{},mode=tvModeNow(list),hx=I.hex,fk=c=>c.kind==="lair"?"":frameKey(c);
  document.body.classList.toggle("tvcover",mode!=="mirror");el.className="tvl m-"+mode;
  const top=`<div class="tvtop"><span>${state.turn&&mode!=="spot"?`Round ${state.turn.round}`:""}</span>${clocksHtml()}</div>`;
  const conds=c=>(c.conds||[]).map(x=>x.n||x).filter(n=>n!=="Concentrating").slice(0,3).map(n=>
    `<span class="chip" style="--cc:var(--stone)">${esc(n)}</span>`).join("")
    +((c.conds||[]).some(x=>(x.n||x)==="Concentrating")?`<span class="chip" style="--cc:var(--arcane)">Concentrating</span>`:"")
    +(state.effects||[]).filter(e=>(e.targets||[]).includes(c.id)).slice(0,3).map(e=>
      `<span class="chip" style="--cc:#e8c06a">✦ ${esc(e.name)}</span>`).join("")+(c.insp?
      `<span class="chip" style="--cc:var(--accent)">Inspiration</span>`:"");
  const who=c=>c.kind==="pc"?(LABEL[c.cls]||"Player"):c.kind==="ally"?"Ally":c.kind==="lair"?"Lair":c.boss?"Boss":"Enemy";
  let h="";
  tvKenBurns(mode==="scene");
  if(mode==="call")h=tvCallHtml();
  else if(mode==="init")h=tvInitHtml(list);
  else if(mode==="end")h=tvEndHtml();
  else if(mode==="scene"){const t=T.title;h=t&&t.t?`<div class="tvex"><div class="eb">${esc(t.eb||
    "")}</div><div class="ti">${esc(t.t)}</div><div class="ln"></div>${t.sub?`<div class="sub">${esc(t.sub)}</div>`:""}</div>`:""}
  else if(mode==="pause"){const left=Math.max(0,Math.round((T.pause.until-dmNow())/1000));
    h=`<div class="tvpz"><div class="in"><div class="k">${esc(T.pause.msg||"Short break")}</div><div class="t">${Math.floor(left/60)}:${String(
    left%60).padStart(2,"0")}</div><div class="s">We continue at ${new Date(T.pause.until-(dmNow()-Date.now())).toLocaleTimeString([],{hour:"2-digit",minute:
    "2-digit",hourCycle:"h23"})}</div></div></div>`;
    clearTimeout(tvTick);tvTick=setTimeout(()=>{if(TV)tvRender(grpRows(withLair(sorted().filter(shownToPlayers))),false)},1000)}
  else if(mode==="order"){h=`${top}<div class="tvord"><div class="orow">${list.map(c=>{const on=state.turn&&(state.turn.id===c.id||(c.grpIds||
    []).includes(state.turn.id));
      return `<div class="cd k-${c.kind}${fk(c)?" fr fr-"+fk(c):""}${on?" on":""}" data-tid="${esc(c.id)}">${on?`<span class="tag">NOW</span>`:
        ""}<span class="ce"></span><div class="cn">${esc(c.name)}</div><div class="hx">${c.kind==="lair"?20:initOf(c)>-999?initOf(c):
        "–"}</div><small>${esc(who(c))}</small></div>`}).join("")}</div></div>`}
  else if(mode==="spot"&&(()=>{const c=list.find(c=>state.turn&&c.id===state.turn.id);return c&&c.kind==="pc"&&c.down&&!isStable(c)&&!isDead(c)})())
    h=tvDsHtml(list.find(c=>c.id===state.turn.id));
  else if(mode==="spot"){
    const i=list.findIndex(c=>state.turn&&(c.id===state.turn.id||(c.grpIds||[]).includes(state.turn.id))),c=list[i]||list[0];
    const nx=[];for(let k=1;k<list.length&&nx.length<((T.layout||"A")==="B"?4:3);k++)nx.push(list[(i+k)%list.length]);
    const nr=k=>i+k>=list.length;
    h=`${top}<div class="tvsp ${T.layout==="B"?"B":"A"}"><section class="spot k-${c.kind}${fk(c)?" fr fr-"+fk(c):
      ""}" data-tid="${esc(c.id)}"><div class="eyeb"><span>On turn</span><span class="rnd">Round ${state.turn?state.turn.round:1}</span></div>
      <div class="who"><span class="emb"></span><div><div class="big${c.name.length>18?" xl":c.name.length>11?" long":
        ""}">${esc(c.name)}</div><div class="sub">${esc(who(c))}${c.kind==="pc"?" · <b>your move</b>":""}</div>${c.boss&&c.title?
        `<div class="plate">${esc(c.title)}</div>`:""}</div></div><div class="chips">${conds(c)}</div></section>
      <section class="deck"><h4>On deck</h4>${nx.map((d,k)=>`<div class="card k-${d.kind}${fk(d)?" fr fr-"+fk(d):""}${k===0?" n1":
        ""}" data-tid="${esc(d.id)}">${k===0?`<span class="tag">NEXT</span>`:""}<div class="row1"><span class="hex">${hx}<b>${d.kind==="lair"?20:initOf(d)>-999?
        initOf(d):"–"}</b></span><span class="ce"></span></div><div><div class="cn">${esc(d.name)}</div><div class="cs">${esc(who(d))}${nr(k+1)?" · next round":
        ""}</div></div></div>`).join("")}</section></div>`}
  pv.tvOld=new Map([...el.querySelectorAll("[data-tid]")].map(n=>[n.dataset.tid,{node:n,rect:n.getBoundingClientRect()}]));
  el.innerHTML=h+(document.fullscreenElement?"":`<button class="fsbtn tvfs" type="button" data-act="fs">${fsLabel()}</button>`);
  // a long name shrinks to fit its card instead of breaking mid-word (smaller TVs, 1280×720)
  el.querySelectorAll(".tvsp .big,.tvsp .cn,.tvord .cn").forEach(n=>{let fs=parseFloat(getComputedStyle(n).fontSize);for(let k=0;
    k<24&&n.scrollWidth>n.clientWidth+1&&fs>14;k++){fs*=.93;n.style.fontSize=fs+"px"}});
  // a new round: the big number and what happened (once per round)
  const r=state.turn&&state.turn.round;if(r&&pv.tvRound!==undefined&&r>pv.tvRound&&!first&&screenWants("round")&&mode!=="pause")tvRoundShow(r);pv.tvRound=r||0;
  // a new title card: big for a moment
  const t=T.title;if(first&&pv.tvTitle===undefined)pv.tvTitle=t&&t.at||0;
    if(t&&t.at&&t.at!==pv.tvTitle){if(!first&&dmNow()-t.at<15000)momentShow("tvtitle",`<div class="mo-eb">${esc(t.eb||
    "")}</div><div class="mo-big">${esc(t.t)}</div>${t.sub?`<div class="mo-q">${esc(t.sub)}</div>`:""}`,5000);pv.tvTitle=t.at}
}
function tvRoundShow(r){const L=(state.rsum&&state.rsum.r===r-1?state.rsum.lines:[]).slice(0,3);
  momentShow("tvround",`<div class="mo-eb">Round</div><div class="mo-num">${r}</div>${L.length?`<ul>${L.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}`,3200);
  // TV10: then the countdowns that just ticked down, as a big ring
  const k=(state.clocks||[]).filter(x=>!x.secret&&x.n>0).sort((a,b)=>a.n-b.n)[0];if(k){clearTimeout(tvRoundShow.t);
    tvRoundShow.t=setTimeout(()=>{if(!$("#moment")||$("#moment.tvround.out"))tvClockShow(k,false)},3900)}}
let tvPopOn=false;
document.addEventListener("pointerdown",e=>{if(tvPopOn&&!e.target.closest("#tvPop,#tvBtn")){tvPopOn=false;tvBarRender()}},true);
document.addEventListener("keydown",e=>{if(tvPopOn&&e.key==="Escape"){tvPopOn=false;tvBarRender()}});
function tvBarRender(){
  const b=$("#tvBtn");if(b)b.setAttribute("aria-expanded",String(tvPopOn));let el=$("#tvPop");
  if(!tvPopOn||MODE!=="dm"){if(el)el.remove();return}
  if(!el){el=document.createElement("div");el.id="tvPop";el.className="tvpop";el.setAttribute("role","dialog");el.setAttribute("aria-label","TV");
    document.body.appendChild(el)}
  const T=state.tv||{},ev=T.ev||{},paused=T.pause&&T.pause.until>Date.now(),t=T.title||{};
  el.innerHTML=`<div class="tvp-h"><b>TV</b><span class="psub">${state.tvSeen?"connected":`not connected: open <code>${esc((devBase()||"")+
    "/players?shared=1&screen=tv")}</code> on the TV (or pick “This is the TV” on the join page)`}</span><button type="button" class="icon-btn sm" data-act="tvbar" aria-label="Close">${
    I.x}</button></div>
    <div class="seg2 tvmodes">${TV_MODES.map(([k,l])=>`<button type="button" data-act="tvmode" data-v="${k}" aria-pressed="${(T.mode||"auto")===
      k}">${l}</button>`).join("")}</div>
    <p class="psub">Auto: the scene when there's no fight, the order while initiative comes in, Spotlight during turns, the end screen after.</p>
    <div class="tvp-g"><div><div class="eyebrow2">Title card</div><form id="tvTitleForm" class="tvtf" autocomplete="off"><input class="field" id="tvT" maxlength="50" placeholder="The Misty Woods" value="${
      esc(t.t||"")}"><input class="field" id="tvSub" maxlength="70" placeholder="Two days north of Daggerford" value="${esc(t.sub||
      "")}"><input class="field" id="tvEb" maxlength="40" placeholder="Session 12 · Exploring" value="${esc(t.eb||"")}">
        <div class="spacts"><button class="btn" type="button" data-act="tvtitleclr">Clear</button><button class="btn primary" type="submit">Show on the TV</button></div></form></div>
      <div><div class="eyebrow2">Pause</div><div class="spacts">${paused?
        `<button class="btn primary" type="button" data-act="tvpause" data-v="0">End the pause</button>`:[5,10,15].map(m=>
        `<button class="btn" type="button" data-act="tvpause" data-v="${m}">${m} min</button>`).join("")}</div>
        <div class="eyebrow2" style="margin-top:10px">In a fight</div><div class="seg2">${[["A","On deck at the side"],["B","On deck below"]].map(([k,l])=>
          `<button type="button" data-act="tvlayout" data-v="${k}" aria-pressed="${(T.layout||"A")===k}">${l}</button>`).join("")}</div>
        <button type="button" class="btn" style="margin-top:10px" data-act="tvlook">The TV's look…</button></div></div>
    <div class="eyebrow2">Where each moment shows (while the TV is connected)</div><div class="tvev">${TV_EV.map(([k,l,def])=>
      `<span>${esc(l)}</span><span class="seg3">${[["surface","Tablet"],["tv","TV"],["both","Both"]].map(([v,lb])=>
      `<button type="button" data-act="tvev" data-k="${k}" data-v="${v}" aria-pressed="${(ev[k]||def)===
      v}">${lb}</button>`).join("")}</span>`).join("")}</div>`;
}
function momentShow(cls,html,ms){let el=$("#moment");if(el)el.remove();el=document.createElement("div");el.id="moment";el.className="moment "+cls;
  el.innerHTML=`<div class="mo-in">${html}</div>`;document.body.appendChild(el);
  clearTimeout(momentShow.t);momentShow.t=setTimeout(()=>{el.classList.add("out");setTimeout(()=>el.remove(),700)},ms)}
/* 7: the reveal of a hidden boss, played in a preview only the DM sees */
function revealPreview(id){const c=byId(id);if(!c)return;
  $("#overlay").innerHTML=
    `<div class="scrim" data-act="close"><div class="sheet revpv" role="dialog" aria-modal="true" aria-label="Preview the reveal"><h2>Preview the reveal · ${
    esc(c.name)}</h2>
    <p class="psub">What the table will see when you reveal ${esc(c.name)}. Only you see this; ${esc(c.name)} stays hidden.</p>
    <div class="apfrm${(state.layout||"auto")==="landscape"?" land":""}" style="max-width:${(state.layout||"auto")==="landscape"?"760px":
      "460px"};margin:0 auto"><iframe id="atmoFrame" title="Preview of the reveal" src="/players?shared=1&preview=1" tabindex="-1"></iframe></div>
    <div class="spacts"><button class="btn" type="button" data-act="revpvagain" data-id="${esc(
      id)}">Play it again</button><button class="btn" type="button" data-act="titleedit2" data-id="${esc(
      id)}">Intro title…</button><button class="btn primary" type="button" data-act="revpvgo" data-id="${esc(
      id)}">Reveal it now</button><button class="btn" type="button" data-act="close">Close</button></div></div></div>`;
  const fr=$("#atmoFrame");const draft=r=>({theme:state.theme||"tavern",look:state.look||{},scene:state.scene||"none",bg:state.bg||"",bgDim:state.bgDim??.45,
    weather:state.weather||"none",tod:state.tod||"none",tune:state.tune||{},reveal:r});
  const play=()=>{if(!fr.contentWindow)return;fr.contentWindow.postMessage({t:"lookdraft",d:draft(null)},location.origin);
    setTimeout(()=>fr.contentWindow&&fr.contentWindow.postMessage({t:"lookdraft",d:draft(id)},location.origin),900)};
  revealPreview.play=play;fr.addEventListener("load",()=>setTimeout(play,1200));atmoFit();
}
let compD=null;
function compSheet(){const o=byId(compD.owner);if(!o)return;
  const q=fetNorm(compD.q.trim()),hits=q.length>=2&&fetIdx?fetIdx.filter(e=>e[6]!==1&&fetNorm(e[1]).includes(q)).sort((a,b)=>(fetNorm(a[1]).startsWith(q)?0:1)-
    (fetNorm(b[1]).startsWith(q)?0:1)||a[1].localeCompare(b[1])).slice(0,30):[];
  const effs=state.effects.filter(e=>e.by===o.id);
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="Companion"><h2>Companion for ${
    esc(o.name)}</h2>
    <p class="psub">Find Familiar, Summon Beast, Spiritual Weapon, an animal companion… It acts right after ${esc(o.name)}; ${esc(
      o.name)}'s phone keeps its HP and shows its statblock.</p>
    ${compD.pick?`<div class="spsel"><div><b>${esc(compD.pick.n)}</b><small>${esc(srcName(compD.pick.l||
      compD.pick.s))}</small></div><button type="button" class="btn" data-act="compchg">Change</button></div>`
      :`<input class="field" id="compQ" type="search" placeholder="Search 5e.tools: Owl, Bestial Spirit, Spiritual Weapon…" value="${esc(
        compD.q)}" autocomplete="off"><div class="splist" id="compList">${hits.map(e=>
        `<button type="button" class="fetrow" data-act="comppick" data-id="${e[0]}"><b>${esc(e[1])}</b><small>${e[4]?"CR "+esc(e[4]):
        ""} · ${esc(srcName(e[2]))}</small></button>`).join("")||(fetIdx?(q.length>=2?`<p class="psub">Nothing by that name.</p>`:""):
        `<p class="psub">The 5e.tools files aren't loaded.</p>`)}</div>`}
    <div class="pclvl"><span class="psub">Spell level (for summons that grow with it)</span><button type="button" class="btn" data-act="complvl" data-d="-1">−</button><b>${
      compD.lvl}</b><button type="button" class="btn" data-act="complvl" data-d="1">+</button></div>
    <label class="field-row"><span class="psub">Lasts</span><select class="field" id="compEff"><option value="">until you remove it (familiar, companion)</option>${
      effs.map(e=>`<option value="${esc(e.id)}"${compD.eff===e.id?" selected":""}>while ${esc(e.name)} lasts${e.conc?" (Concentration)":
      ""}</option>`).join("")}</select></label>
    <div class="spacts"><button class="btn" type="button" data-act="close">Cancel</button><button class="btn primary" type="button" data-act="compadd"${
      compD.pick?"":" disabled"}>Add it</button></div></div></div>`;
  const i=$("#compQ");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);i.addEventListener("input",()=>{compD.q=i.value;const sv=i.value;
    compSheet()})}
  const se=$("#compEff");if(se)se.addEventListener("change",()=>{compD.eff=se.value});
}
/* a summon's statblock grows with the spell's level: "20 + 5 for each spell level above 2nd", "11 + the level of the spell" */
function compScale(md,lvl){
  return md.replace(/(\d+)\s*\+\s*(\d+)\s*(?:for each|per)\s*spell level above (\d)(?:st|nd|rd|th)?/gi,(m,a,b,c)=>String(Number(a)+Number(b)*Math.max(0,lvl-
    Number(c))))
    .replace(/(\d+)\s*\+\s*the (?:spell's level|level of the spell)/gi,(m,a)=>String(Number(a)+lvl))
    .replace(/\{@summonSpellLevel\}|the spell's level/gi,String(lvl));
}
async function compAdd(){
  const o=byId(compD.owner),pk=compD.pick;if(!o||!pk)return;
  try{const r=await fetch("/5et/monster?id="+encodeURIComponent(pk.id),{cache:"no-store"});if(!r.ok)throw 0;const resp=await r.json();const m=fetResolve(resp);
    const md=compScale(fetToMd(m),compD.lvl);const x=parseStatblock(md)||{};
    const name=`${m.name} (${o.name})`;
    state.list.push(newCombatant({name,base:m.name,kind:"ally",owner:o.id,init:o.init,ac:x.ac??null,ctype:x.ctype||"",...(x.hp?{hp:x.hp,hpMax:x.hp}:{}),
      ...(compD.eff?{byEff:compD.eff}:{}),
      sb:{cr:x.cr||"",hpf:x.hpf||"",lr:null,la:null,uses:(x.uses||[]).map(u=>({n:u.n,max:u.max,used:0})),rech:(x.rech||[]).map(q=>({n:q.n,min:q.min,ready:
        true})),know:[],raw:md,fet:{n:m.name,s:m.source||""}}}));
    closeSheet();commit();toast(`${name} joins: it acts right after ${o.name}`);compD=null;
  }catch(e){toast("Couldn't read that creature")}
}
/* 46: the party's numbers, from their phones */
function partySheet(){
  const pcs=sorted().filter(c=>c.kind==="pc"),dc=Number(partyDC)||0;
  const cell=(c,k)=>{const v=c.pst&&c.pst[k];return v?`<td class="${dc&&k!=="ac"&&k!=="dc"?(v>=dc?"ok":"no"):""}">${v}</td>`:`<td class="psub">–</td>`};
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="Party"><h2>Party numbers</h2>
    <p class="psub">Each player sends these from their phone (Resources → Set up from my class → Your numbers for the DM). Only you see this page.</p>
    <label class="rangerow">Passive check DC <input class="field" id="partyDC" type="number" min="0" max="40" value="${dc||
      ""}" style="width:5em" aria-label="Passive check DC"> <small class="psub">type a DC: who notices turns green</small></label>
    <table class="partyt"><thead><tr><th>Character</th><th>AC</th><th>Perception</th><th>Insight</th><th>Investigation</th><th>Spell DC</th><th></th></tr></thead>
    <tbody>${pcs.map(c=>`<tr><td><b>${esc(c.name)}</b></td>${cell(c,"ac")}${cell(c,"pp")}${cell(c,"pi")}${cell(c,"pv")}${cell(c,"dc")}<td class="psub">${c.pst?
      agoTxt(c.pst.at/1000):"not sent"}</td></tr>`).join("")}</tbody></table>
    <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="close">Close</button></div></div></div>`;
  const i=$("#partyDC");if(i)i.addEventListener("input",()=>{partyDC=i.value;const pos=i.selectionStart;partySheet();const j=$("#partyDC");if(j){j.focus();
    try{j.setSelectionRange(pos,pos)}catch(e){}}})}
let partyDC="";
function battlefieldHtml(){
  const area=state.effects.filter(e=>e.area);if(!area.length)return "";
  return `<div class="field-strip"><span class="eyebrow2">On the battlefield</span>${area.map(e=>{const c=byId(e.by);
    return `<span class="cond eff" data-eff="${esc(e.id)}">✦ ${esc(e.name)}${c?` <small>${esc(c.name)}</small>`:""}</span>`}).join("")}</div>`;
}
const CALL_MINI_MS=15000;   // after everyone has rolled, the panel shrinks to one line
function callHtml(){
  const call=state.call;if(!call)return "";
  const to=(call.to&&call.to.length?call.to:state.list.filter(c=>c.kind==="pc").map(c=>c.id)).map(id=>byId(id)).filter(c=>c&&!c.hidden);
  const ans=call.answers||{};
  const done=to.length>0&&to.every(c=>ans[c.id]!=null);
  if(done&&pv.callDone!==call.id){pv.callDone=call.id;pv.callDoneAt=Date.now();clearTimeout(pv.callT);
    pv.callT=setTimeout(()=>{if(MODE==="player")renderPlayer()},CALL_MINI_MS+80)}
  const mini=done&&pv.callDone===call.id&&Date.now()-pv.callDoneAt>=CALL_MINI_MS;
  return `<div class="callbar${mini?" mini":""}">${D20}<span class="calltext">${esc(call.text)}</span><span class="callwho">${to.map(c=>{const v=ans[c.id];
    const st=v==null?"wait":call.dc!=null?(v>=call.dc?"pass":"fail"):"done";
    return `<span class="cw ${st}" data-id="${esc(c.id)}"><span class="rn">${esc(c.name)}</span><b class="rv">${st==="wait"?"…":(st==="fail"?"✗":"✓")+(v==null?
      "":" "+esc(String(v)))}</b></span>`}).join("")}</span>${(()=>{
      const got=to.filter(c=>ans[c.id]!=null);if(!to.length||got.length<to.length)return "";
      if(call.dc==null)return `<span class="callsum">Everyone rolled</span>`;
      const ok=got.filter(c=>ans[c.id]>=call.dc).length;return `<span class="callsum">${ok} of ${to.length} succeeded</span>`})()}</div>`;
}
