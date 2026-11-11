/* ---- Ctrl+K: every spell, item, condition, rule, feat… in the DM's 5e.tools files, and a card to show on the table ---- */
const QK_GROUPS=[["all","All"],["spell","Spells",["spell"]],["item","Items",["item","baseitem"]],["cond","Conditions",["condition","status","disease"]],["rule",
  "Rules & actions",["variantrule","action","sense","skill"]],
  ["feat","Feats & features",["feat","optionalfeature"]],["char","Species & backgrounds",["race","background"]],["trap","Traps & hazards",["trap","hazard"]],
    ["name","Names",["name"]]];
const QK_CORE=["xphb","xdmg","xmm","phb","dmg","mm"];   // the core books first when names tie
const QK_ORDER=["condition","status","action","spell","variantrule","item","baseitem","feat","optionalfeature","race","background","sense","skill","disease",
  "hazard","trap","name"];
let qkIdx=null,qkSig="",qkQ="",qkGrp="all",qkOld=false,qkHb=false,qkHits=[],qkSel=0,qkCur=null,qkT=null;
async function qkLoad(){
  if(!served)return;await fetRefresh();if(!fetInfo||fetInfo.state!=="ready"){qkIdx=null;return}
  if(qkIdx&&qkSig===fetInfo.sig)return;
  try{const r=await fetch("/5et/refindex",{cache:"no-store"});if(!r.ok)return;const d=await r.json();qkSig=d.sig;
    qkIdx=d.list.map(x=>({t:x[0],n:x[1],s:x[2],l:x[3],old:x[4],g:x[5],low:String(x[1]).toLowerCase(),o:QK_ORDER.indexOf(x[0]),p:
      QK_CORE.indexOf(String(x[2]).toLowerCase())>>>0}))}catch(e){}
}
function qkSearch(){
  const q=qkQ.trim().toLowerCase();if(!q){qkHits=[];return}
  const grp=QK_GROUPS.find(g=>g[0]===qkGrp),types=grp&&grp[2];let pool=[];
  if(qkIdx)pool=qkIdx;
  else pool=Object.values(RULES).map(R=>({t:"condition",n:R.t,s:"",l:"",old:0,g:"off",low:R.t.toLowerCase(),o:0,app:
    1}));   // no 5e.tools files: the app's own condition rules
  const out=[];
  for(const x of pool){
    if(types&&!types.includes(x.t))continue;if(x.old&&!qkOld)continue;if(x.g==="hb"&&!qkHb)continue;
    const i=x.low.indexOf(q);if(i<0)continue;
    const sc=x.low===q?0:i===0?1:x.low[i-1]===" "||x.low[i-1]==="("||x.low[i-1]==="-"?2:3;
    out.push([sc,x])}
  out.sort((a,b)=>a[0]-b[0]||a[1].old-b[1].old||(a[1].g==="hb")-(b[1].g==="hb")||a[1].o-b[1].o||(a[1].p||0)-(b[1].p||0)||a[1].low.length-b[1].low.length||
    a[1].low.localeCompare(b[1].low));
  qkHits=out.slice(0,80).map(x=>x[1]);
}
function qkCounts(){   // what the toggles would add
  const q=qkQ.trim().toLowerCase();if(!q||!qkIdx)return {old:0,hb:0};let old=0,hb=0;
  const grp=QK_GROUPS.find(g=>g[0]===qkGrp),types=grp&&grp[2];
  for(const x of qkIdx){if(types&&!types.includes(x.t))continue;if(!x.low.includes(q))continue;if(x.old&&!qkOld)old++;else if(x.g==="hb"&&!qkHb)hb++}
  return {old,hb};
}
function qkListHtml(){
  if(!qkQ.trim())return `<p class="psub qkhint">${qkIdx?`Type a name: <i>grapple</i>, <i>fireball</i>, <i>bag of holding</i>, <i>exhaustion</i>, <i>alert</i>…`:
    served?
    "Without 5e.tools files only the app's own condition rules are here. Put the 5e.tools zip in the 5etools folder next to the app for everything else.":
    "Open the tracker through the app to search 5e.tools."}</p>`;
  const c=qkCounts();
  return (qkHits.length?qkHits.map((x,i)=>`<button type="button" class="qkrow${i===qkSel?" on":
    ""}" data-act="qkpick" data-i="${i}" role="option" aria-selected="${i===qkSel}"><b>${esc(x.n)}</b><small><span class="qkt t-${x.t}">${REF_TYPE[x.t]||
    x.t}</span>${x.l?" · "+esc(srcName(x.l)):""}${x.old?" · older printing":""}</small></button>`).join("")
    :`<p class="psub">Nothing called “${esc(qkQ)}”.</p>`)
    +(c.old?`<button type="button" class="linkbtn qkmore" data-act="qkold">${c.old} older printing${c.old>1?"s":""} hidden · Show</button>`:qkOld?
      `<button type="button" class="linkbtn qkmore" data-act="qkold">Hide older printings</button>`:"")
    +(c.hb?`<button type="button" class="linkbtn qkmore" data-act="qkhb">${c.hb} from other homebrew · Show</button>`:qkHb?
      `<button type="button" class="linkbtn qkmore" data-act="qkhb">Hide other homebrew</button>`:"");
}
function qkCardHtml(){
  if(!qkCur)return `<div class="qkempty">${ic("search")}<span>Pick a result to read it here.</span></div>`;
  if(qkCur.loading)return `<div class="qkempty"><span>Loading…</span></div>`;
  if(!qkCur.d)return `<div class="qkempty"><span>No text for this one.</span></div>`;
  const on=state.tcard&&state.tcard.key===qkCur.key;
  const it=qkCur.d.item||{};
  if(qkCur.d.t==="name"){const sel=selId&&byId(selId),nm=sel&&sel.kind!=="pc"?sel:null;
    return `<div class="qkcardin">${refCardHtml(qkCur.d)}</div><div class="qkacts"><span class="psub">${nmLast?`Copied: <b>${esc(nmLast)}</b>`:""}</span>${nm&&
      nmLast?`<button type="button" class="btn" data-act="nmgive" data-id="${esc(nm.id)}">Name ${esc(nm.name)} “${esc(nmLast)}”</button>`:
      ""}<button type="button" class="btn primary" data-act="nmroll">${ic("reload")} Other names</button></div>`}
  return `<div class="qkcardin">${refCardHtml(qkCur.d)}</div><div class="qkacts">${qkCur.d.t==="spell"?
    `<button type="button" class="btn" data-act="refcast" data-n="${esc(it.name||"")}" data-s="${esc(it.source||
    "")}">${ic("spark")} Cast as an effect</button>${spellFxKnown(it.name,(it.damageInflict||[])[0])&&sfx("spells")?
    `<button type="button" class="btn" data-act="qkscene" data-n="${esc(it.name||"")}" data-t="${esc((it.damageInflict||[])[0]||
    "")}" title="Plays on the tablet and the TV">✨ In the scene</button>`:""}`:""}<button type="button" class="btn${on?"":" primary"}" data-act="qktable">${on?
    "Hide from the table":"Show on the table"}</button></div>`;
}
let nmLast="";
function qkRedraw(list,card){
  if(list!==false){const l=$("#qkList");if(l){l.innerHTML=qkListHtml();const o=l.querySelector(".qkrow.on");o&&o.scrollIntoView({block:"nearest"})}}
  if(card!==false){const c=$("#qkCard");if(c)c.innerHTML=qkCardHtml()}
  const f=$("#qkF");if(f)f.innerHTML=QK_GROUPS.map(([k,l])=>`<button type="button" data-act="qkgrp" data-v="${k}" aria-pressed="${qkGrp===
    k}">${l}</button>`).join("");
}
function qkShow(){   // the selected result's card, a moment after the selection settles
  const x=qkHits[qkSel];if(!x){clearTimeout(qkT);qkCur=null;qkRedraw(false);return}
  const key=[x.t,x.n,x.s].join("|");if(qkCur&&qkCur.key===key)return;clearTimeout(qkT);
  qkCur={key,x,loading:true};qkRedraw(false);
  qkT=setTimeout(async()=>{const d=x.app?{t:"condition",item:{name:RULES[slug(x.n)].t,entries:RULES[slug(x.n)].d.slice()},label:""}:await refGet(x.t,
    x.n,x.s,true);
    if(!qkCur||qkCur.key!==key)return;qkCur={key,x,d};qkRedraw(false)},120);
}
async function qkSheet(){
  refClose(0);
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet qksheet" role="dialog" aria-modal="true" aria-label="Search the rules">
    <div class="qkbar">${
      ic("search")}<input class="field" id="qkQ" type="search" placeholder="Spells, items, conditions, rules, feats…" autocomplete="off" spellcheck="false" value="${
      esc(qkQ)}"><kbd>Esc</kbd></div>
    <div class="seg2 qkf" id="qkF"></div>
    <div class="qkbody"><div class="qklist" id="qkList" role="listbox"></div><div class="qkcard refcard" id="qkCard" data-l="-1"></div></div></div></div>`;
  const q=$("#qkQ");q.focus();q.select();
  q.addEventListener("input",()=>{qkQ=q.value;qkSel=0;qkSearch();qkRedraw(true,false);qkShow()});
  q.addEventListener("keydown",e=>{
    if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(!qkHits.length)return;
      qkSel=Math.max(0,Math.min(qkHits.length-1,qkSel+(e.key==="ArrowDown"?1:-1)));qkRedraw(true,false);qkShow()}
    else if(e.key==="Enter"){e.preventDefault();if(qkCur&&qkCur.d&&qkCur.d.t!=="name")qkTable()}});
  qkRedraw();
  await qkLoad();qkSearch();qkRedraw();qkShow();
}
function qkTable(){
  if(!qkCur||!qkCur.d)return;
  if(state.tcard&&state.tcard.key===qkCur.key){state.tcard=null;commit();toast("Card taken off the table")}
  else{state.tcard={id:uid(),key:qkCur.key,name:refPlain(fetTxt(qkCur.d.item&&qkCur.d.item.name||qkCur.x.n)),html:refCardHtml(qkCur.d,true),at:Date.now()};
    commit();toast("On the table: "+state.tcard.name)}
  qkRedraw(false);
}
function shortcutsSheet(){
  const K=[["1–9","Pick that row"],["↑ ↓","Move the selection"],["B","Bloodied"],["D","Down / 0 HP"],["H","Hidden"],["A","Show or hide AC"],["I",
    "Inspiration (player) / Boss (enemy)"],
    ["C","Conditions"],["K","What the party knows"],["T","Hourglass for that player"],["S","Ask that player for a death save (opens it on their phone)"],
      ["Delete","Remove"],["Esc","Clear the selection"],["Q","Quick add"],["R","Clear all reactions"],["J","Show or hide the join QR code on the tablet"],
      ["N / P","Next / previous turn"],["Ctrl+K","Search spells, items, conditions, rules, feats"],["Ctrl+Z / Ctrl+Y","Undo / redo"]];
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true"><h2>Keyboard shortcuts</h2>
    <div class="keys">${K.map(([k,d])=>`<kbd>${k}</kbd><span>${d}</span>`).join("")}</div>
    <div style="display:flex;justify-content:flex-end"><button class="btn primary" type="button" data-act="close">Done</button></div></div></div>`;
}
function toggleHidden(c){c.hidden=!c.hidden;if(c.hidden)state.vanish.push({id:c.id,at:Date.now()});else c.revealedAt=Date.now()}
function clearReactions(){let n=0;state.list.forEach(c=>{if((c.tags||[]).includes("reaction")){c.tags=c.tags.filter(t=>t!=="reaction");n++}});if(n){commit();
  toast(`Reactions cleared (${n})`)}else toast("No reactions to clear")}
