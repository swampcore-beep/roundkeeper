/* ---------- DM render ---------- */
let pendingRender=false,freshIds=new Set();
function render(){MODE==="player"?(renderPlayer(),renderPSheet()):renderDM()}
/* ---------- player activity: what phones changed, each with its own undo ---------- */
const actLog=[];let logSeen=Date.now();
function logPush(text,inv){actLog.unshift({id:uid(),at:Date.now(),text,inv,done:false,fresh:true});if(actLog.length>40)actLog.pop()}
function renderLog(){
  const el=$("#actLog");if(!el)return;
  el.innerHTML=actLog.length?actLog.map(e=>`<div class="le${e.done?" undone":""}${e.fresh?" fresh":""}"><span class="lt">${new Date(e.at).toLocaleTimeString([],
    {hour:"2-digit",minute:"2-digit",hourCycle:"h23"})}</span><span class="lx">${esc(e.text)}</span>${e.inv&&!e.done?
    `<button class="btn sm" type="button" data-act="logundo" data-l="${e.id}">Undo</button>`:"<span></span>"}</div>`).join("")
    :`<p class="strip-empty" style="margin:0">Nothing from the phones yet.</p>`;
  actLog.forEach(e=>e.fresh=false);
  const pn=document.querySelector('.panel[data-k="log"]'),cnt=$("#logCount");if(!pn||!cnt)return;
  if(pn.open){logSeen=Date.now();cnt.hidden=true}else{const n=actLog.filter(e=>e.at>logSeen).length;cnt.hidden=!n;cnt.textContent=n}
}
function undoLog(id){
  const e=actLog.find(x=>x.id===id);if(!e||e.done||!e.inv)return;const v=e.inv,c=byId(v.cid),cn=x=>x.n||x;
  if(v.t==="init"&&c)c.init=v.prev;
  else if(v.t==="cond"&&c){if(v.on)c.conds=c.conds.filter(x=>cn(x)!==v.cond);else if(!c.conds.some(x=>cn(x)===v.cond))c.conds.push(v.cond)}
  else if(v.t==="concback"&&c){if(!c.conds.some(x=>cn(x)==="Concentrating"))c.conds.push("Concentrating");
    (v.effs||[]).forEach(ef=>{if(!state.effects.some(x=>x.id===ef.id))state.effects.push(ef)})}
  else if(v.t==="exh"&&c){if(v.had){if(!c.conds.some(x=>cn(x)==="Exhaustion"))c.conds.push("Exhaustion");
    c.exh=v.prev}else{c.conds=c.conds.filter(x=>cn(x)!=="Exhaustion");delete c.exh}}
  else if(v.t==="ds"&&c)c.ds=v.prev;
  else if(v.t==="effadd"){state.effects=state.effects.filter(x=>x.id!==v.eid);
    if(c&&v.addedConc&&!state.effects.some(x=>x.by===c.id&&x.conc))c.conds=c.conds.filter(x=>cn(x)!=="Concentrating")}
  else if(v.t==="effrm"){if(!state.effects.some(x=>x.id===v.ef.id))state.effects.push(v.ef)}
  else if(v.t==="hp"&&c){c.bloodied=v.bloodied;c.down=v.down;c.ds=v.ds}
  else if(v.t==="tag"&&c){const t=new Set(c.tags||[]);v.on?t.delete(v.tag):t.add(v.tag);c.tags=[...t]}
  else if(v.t==="cover"&&c)c.cover=v.prev;
  else return;
  e.done=true;commit();renderLog();toast("Undone: "+e.text);
}
/* HP on the DM's rows: a button with the number and a bar (temp HP in blue). A click opens the HP popover;
   the last changes show on hover, each with its own undo. Bloodied and Down stay manual. */
const hpFlash=new Map();   // id -> {d, at}: the "-5" that flashes after a change
let hpPopId=null,hpMod="",mtOn=false,mtSel=new Set(),mt={n:"",type:"",ab:"",dc:"",on:"half",modes:{},rolls:{}};
function hpBox(c){
  if(c.hpMax==null)return `<span class="hpw add" title="Track HP: type the maximum"><span class="hpl">HP</span><input id="hp-${
    c.id}" data-act="hp" placeholder="max" aria-label="Maximum HP for ${esc(c.name)}" inputmode="numeric"></span>`;
  const cur=c.hp??c.hpMax,t=c.thp||0,tot=Math.max(c.hpMax,cur)+t,cls=cur<=0?" zero":cur<=c.hpMax/2?" half":"";
  const f=hpFlash.get(c.id),age=f?Date.now()-f.at:1e9;
  return `<button type="button" class="hpw hpb${cls}${hpPopId===c.id?" open":""}${mtSel.has(c.id)?" mt":
    ""}" id="hp-${c.id}" data-act="hppop" data-hid="${esc(c.id)}" aria-label="HP ${cur} of ${c.hpMax}${t?`, ${t} temporary`:
    ""} for ${esc(c.name)}: change it" title="Click to change HP · Shift+click the row to hit several at once">
    <span class="hprow"><span class="hpl">HP</span><b class="hpn">${cur}/${c.hpMax}</b>${t?`<span class="hpt">+${t}</span>`:""}</span>
    <span class="hpbar3"><i class="hpv" style="width:${Math.max(0,100*cur/tot)}%"></i>${t?`<i class="hptv" style="width:${100*t/tot}%"></i>`:""}</span>
    ${age<1800?`<span class="hpdelta${f.d>0?" up":""}" style="animation-delay:-${age}ms">${f.d>0?"+":"−"}${Math.abs(f.d)}</span>`:""}</button>`;
}
/* 80: a player's HP as their phone has it; the DM reads it, the player changes it */
function pcHpBox(c){const p=c.php,cur=p.cur,t=p.temp||0,tot=Math.max(p.max,cur)+t,cls=cur<=0?" zero":cur<=p.max/2?" half":"";
  return `<span class="hpw hpb pchp${cls}" title="${esc(c.name)}'s HP from their phone. Only you see it." aria-label="HP ${cur} of ${p.max}${t?
    `, ${t} temporary`:""} for ${esc(c.name)}, from their phone">
    <span class="hprow"><span class="hpl">HP</span><b class="hpn">${cur}/${p.max}</b>${t?`<span class="hpt">+${t}</span>`:""}</span>
    <span class="hpbar3"><i class="hpv" style="width:${Math.max(0,100*cur/tot)}%"></i>${t?`<i class="hptv" style="width:${100*t/tot}%"></i>`:
      ""}</span><small>phone</small></span>`}
/* every HP change goes through here: damage takes temp HP first, healing stops at the maximum, temp HP doesn't stack */
function hpDo(c,kind,n,why){
  if(!c||c.hpMax==null||!(n>=0))return null;
  const hp0=c.hp??c.hpMax,t0=c.thp||0;let hp=hp0,t=t0;
  if(kind==="dmg"&&c.boss&&hp0>0&&n>=hp0+t0)setTimeout(()=>hdAsk(c),0);
  if(kind==="dmg"){const a=Math.min(t,n);t-=a;hp=Math.max(0,hp-(n-a))}
  else if(kind==="heal")hp=Math.max(hp,Math.min(c.hpMax,hp+n));
  else if(kind==="temp")t=n===0?0:Math.max(t,n);
  else if(kind==="set")hp=Math.max(0,n);
  else return null;
  if(hp===hp0&&t===t0)return null;
  c.hp=hp;if(t)c.thp=t;else delete c.thp;
  const by=state.turn&&byId(state.turn.id),who=by&&by.id!==c.id?by.name:"",lost=(hp0+t0)-(hp+t),kill=hp===0&&hp0>0;
  (c.hpLog=c.hpLog||[]).unshift({id:uid(),k:kind,n,hp0,t0,hp1:hp,t1:t,r:state.turn?state.turn.round:0,by:who,why:why||"",...(kind==="dmg"?{l:lost,kill}:{})});
  if(c.hpLog.length>8)c.hpLog.length=8;
  if(kind==="dmg"&&who&&lost>0)cstatAdd(who,c.name,lost,n,why,kill,1);
  if(kind==="dmg"&&n>0)concCheck(c,n,hp);
  hpFlash.set(c.id,{d:(hp+t)-(hp0+t0),at:Date.now()});setTimeout(()=>{const f=hpFlash.get(c.id);if(f&&Date.now()-f.at>=1700){hpFlash.delete(c.id);
    if(MODE==="dm")renderDM()}},1850);
  return {hp0,t0,hp,t};
}
/* one change taken back, even if others came after it */
function hpUndo(c,id){
  const i=(c.hpLog||[]).findIndex(e=>e.id===id);if(i<0)return;const e=c.hpLog[i];
  c.hp=Math.max(0,Math.min(Math.max(c.hpMax,e.hp0),(c.hp??c.hpMax)+(e.hp0-e.hp1)));
  const t=Math.max(0,(c.thp||0)+(e.t0-e.t1));if(t)c.thp=t;else delete c.thp;
  c.hpLog.splice(i,1);
  if(e.k==="dmg"&&e.by&&e.l>0)cstatAdd(e.by,c.name,e.l,e.n,e.why,e.kill,-1);
}
/* ---- who dealt how much, for the recap (the DM's HP changes, credited to whoever's turn it was) ---- */
function cstatAdd(by,target,lost,n,why,kill,sign){
  if(MODE!=="dm")return;const S=state.cstat=state.cstat||{};const x=S[by]=S[by]||{d:0,k:0,hits:[]};x.hits=x.hits||[];
  x.d=Math.max(0,x.d+sign*lost);if(kill)x.k=Math.max(0,x.k+sign);
  if(sign>0){x.hits.push({n,t:target,w:why||""});if(x.hits.length>200)x.hits.shift()}
  else{const i=x.hits.findIndex(h=>h.n===n&&h.t===target&&h.w===(why||""));if(i>=0)x.hits.splice(i,1)}
  x.top=x.hits.reduce((a,h)=>!a||h.n>a.n?h:a,null);
}
/* ---- a creature the DM tracks takes damage while Concentrating: Con save, DC 10 or half the damage (at most 30) ---- */
let concMsgs=[],concT=null;
function concCheck(c,n,hp){
  if(!(c.conds||[]).some(x=>(x.n||x)==="Concentrating"))return;
  const dc=Math.min(30,Math.max(10,Math.floor(n/2)));
  if(hp!=null&&hp<=0)return concLose(c,`${c.name} drops to 0 HP: Concentration ends`,"0 HP");
  if(c.kind==="pc")return pcConcAsk(c,n);
  const mod=c.sb&&c.sb.raw?sbSaveMod(c.sb.raw,"Con"):null;
  if(!ls.get("concAuto",false)){concAsks.push({id:uid(),cid:c.id,n,dc,mod});concAskT=setTimeout(concAskRender,0);
    return}   // the DM rolls it, types it, or lets it go
  const r=d20();concResolve(c,r+(mod||0),dc,`d20 ${r}${mod!=null?` ${mod<0?"−":"+"} ${Math.abs(mod)}`:", no statblock"}`);
}
function concResolve(c,tot,dc,how){
  const t=`Con save ${tot}${how?` (${how})`:""} vs DC ${dc}`;
  if(tot>=dc){logPush(`${c.name} keeps Concentrating · ${t}`,null);concNote(`${c.name} keeps Concentrating (${tot} vs DC ${dc})`);
    clogPush(`${c.name} keeps Concentrating (${tot} vs DC ${dc})`)}
  else concLose(c,`${c.name} loses Concentration · ${t}`,`${tot} vs DC ${dc}`);
}
/* ---- cards that wait for the DM: damage that lasts (48), and the killing blow on a boss (59) ---- */
let dmCards=[];
function dmCardHtml(k){
  if(k.type==="ong"){const c=byId(k.cid);return `<div class="cac ong" data-id="${esc(k.id)}"><div class="cah"><b>${esc(c?c.name:
    "")}</b>: ${esc(k.name)} · ${k.when==="end"?"end":"start"} of the turn</div>
      <div class="car"><span class="cadc"><b>${k.tot}</b> ${esc(k.t||"damage")} <small>(${esc(k.d)}: ${esc(k.rolls.join(", "))})</small></span>
        <button type="button" class="btn sm primary" data-act="ongapply" data-id="${esc(k.id)}">${c&&c.hpMax!=null?"Apply":
          "Told them"}</button><button type="button" class="btn sm" data-act="ongreroll" data-id="${esc(k.id)}">Reroll</button>
        <button type="button" class="icon-btn sm" data-act="ongskip" data-id="${esc(k.id)}" aria-label="Skip" title="Skip (saved, or doesn't apply)">${
          I.x}</button></div></div>`}
  if(k.type==="hd"){const pcs=state.list.filter(c=>c.kind==="pc"&&!c.hidden);
    return `<div class="cac hd" data-id="${esc(k.id)}"><div class="cah"><b>${esc(k.boss)}</b> falls. How do you want to do this? Who landed it?</div>
      <div class="car hdr">${pcs.map(c=>`<button type="button" class="btn sm${c.id===k.guess?" primary":
        ""}" data-act="hdgo" data-id="${esc(k.id)}" data-pc="${esc(c.id)}">${esc(c.name)}</button>`).join("")}
        <button type="button" class="icon-btn sm" data-act="hdskip" data-id="${esc(k.id)}" aria-label="Skip" title="Skip">${I.x}</button></div></div>`}
  return "";
}
const dmCardsSet=()=>{concAskT=setTimeout(concAskRender,0)};
/* 48: damage each turn, from an effect (Heat Metal, poison…): rolled at the start or end of the target's turn */
function ongRoll(e,c,when){
  const r=/^\d+$/.test(e.ong.d)?{tot:Number(e.ong.d),rolls:[e.ong.d]}:sbDice(e.ong.d,false);if(!r)return;
  dmCards=dmCards.filter(k=>!(k.type==="ong"&&k.eid===e.id&&k.cid===c.id));
  dmCards.push({id:uid(),type:"ong",eid:e.id,cid:c.id,name:e.name,d:e.ong.d,t:e.ong.t||"",when,tot:r.tot,rolls:r.rolls});dmCardsSet();
}
function ongTurn(c,when){if(!c)return;(state.effects||[]).forEach(e=>{if(e.ong&&e.ong.d&&(e.ong.when||"start")===when&&(e.targets||
  []).includes(c.id))ongRoll(e,c,when)})}
/* 59: a boss drops: the DM picks who landed it, the tablet asks them */
function hdAsk(c){
  if(!c||!c.boss||c.hidden||dmCards.some(k=>k.type==="hd"&&k.cid===c.id))return;
  const t=state.turn&&byId(state.turn.id),guess=t&&t.kind==="pc"?t.id:"";
  dmCards.push({id:uid(),type:"hd",cid:c.id,boss:c.name,guess});dmCardsSet();
}
/* a player's Concentration save: asked on their phone (state.concAsk); the DM's card can answer for a player who plays on paper */
function pcConcAsk(c,n){
  if(!(c.conds||[]).some(x=>(x.n||x)==="Concentrating")||!(n>0))return;
  if(c.down)return concLose(c,`${c.name} is at 0 HP: Concentration ends`,"0 HP");
  const dc=Math.min(30,Math.max(10,Math.floor(n/2))),id=uid();
  concAsks=concAsks.filter(a=>a.cid!==c.id);   // a newer hit replaces the one still open
  state.concAsk=(state.concAsk||[]).filter(a=>a.cid!==c.id).concat([{id,cid:c.id,dmg:n,dc,at:Date.now()}]);
  concAsks.push({id,cid:c.id,n,dc,mod:null,pc:true});concAskT=setTimeout(concAskRender,0);
  logPush(`${c.name}: Concentration save DC ${dc} asked on the phone (${n} damage)`,null);
}
const concAskDrop=id=>{if((state.concAsk||[]).some(a=>a.id===id)){state.concAsk=state.concAsk.filter(a=>a.id!==id);
  if(!state.concAsk.length)delete state.concAsk}};
function pcConcSheet(id){const c=byId(id);if(!c)return;
  $("#overlay").innerHTML=
    `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="Concentration save"><h2>Concentration save · ${esc(
    c.name)}</h2>
    <p class="psub">How much damage did ${esc(
      c.name)} take? Their phone asks for a Constitution save (DC 10 or half the damage). For a player on paper, answer on the card yourself.</p>
    <form id="pcConcForm" class="asave" autocomplete="off" onsubmit="return false"><input class="field" id="pcConcN" inputmode="numeric" placeholder="Damage" aria-label="Damage"><button class="btn primary" type="button" data-act="pcconcgo" data-id="${
      esc(c.id)}">Ask for the save</button></form>
    <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="close">Cancel</button></div></div></div>`;
  const i=$("#pcConcN");if(i){i.focus();i.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$('[data-act="pcconcgo"]').click()}})}}
/* the asks: one card per hit, until the DM answers */
let concAsks=[],concAskT=null;
function concAskRender(){
  concAsks=concAsks.filter(a=>{const c=byId(a.cid);return c&&(c.conds||[]).some(x=>(x.n||x)==="Concentrating")});   // it lost it some other way
  if(MODE==="dm"&&(state.concAsk||[]).some(a=>!concAsks.some(q=>q.id===a.id))){state.concAsk=state.concAsk.filter(a=>concAsks.some(q=>q.id===a.id));
    if(!state.concAsk.length)delete state.concAsk;setTimeout(commit,0)}
  let el=$("#concAsk");
  dmCards=dmCards.filter(k=>k.type!=="ong"||byId(k.cid));
  if(MODE!=="dm"||(!concAsks.length&&!dmCards.length)){if(el)el.remove();return}
  if(!el){el=document.createElement("div");el.id="concAsk";el.className="concask";el.setAttribute("role","region");
    el.setAttribute("aria-label","Concentration saves");document.body.appendChild(el);
    el.addEventListener("keydown",e=>{const i=e.target.closest("input[data-ca]");if(!i)return;
      if(e.key==="Enter"){e.preventDefault();concAnswer(i.dataset.ca,"typed",i.value)}else if(e.key==="Escape"){e.preventDefault();
        concAnswer(i.dataset.ca,"drop")}})}
  const had=document.activeElement&&el.contains(document.activeElement)?document.activeElement.dataset.ca:null;
  const known=new Set([...el.querySelectorAll(".cac")].map(x=>x.dataset.id));
  if(concAsks.length+dmCards.length!==known.size||concAsks.some(a=>!known.has(a.id))||dmCards.some(a=>!known.has(a.id))){
    el.innerHTML=dmCards.map(dmCardHtml).join("")+concAsks.map(a=>{const c=byId(a.cid),sp=state.effects.filter(e=>e.by===a.cid&&e.conc).map(e=>
      e.name).join(", ");
      if(a.pc)return `<div class="cac pc" data-id="${esc(a.id)}"><div class="cah"><b>${esc(c.name)}</b> took ${a.n} while Concentrating${sp?
        ` on ${esc(sp)}`:""}</div>
        <div class="car"><span class="cadc">Con save · DC <b>${a.dc}</b> · <i>asked on the phone</i></span>
          <input class="field" data-ca="${esc(a.id)}" inputmode="numeric" placeholder="total" aria-label="Con save total for ${esc(c.name)}" autocomplete="off">
          <button type="button" class="btn sm" data-act="cakeep" data-id="${esc(
            a.id)}" title="Kept it (rolled on paper)">Kept</button><button type="button" class="btn sm" data-act="calost" data-id="${esc(
            a.id)}" title="Lost it">Lost</button>
          <button type="button" class="icon-btn sm" data-act="cadrop" data-id="${esc(
            a.id)}" aria-label="Never mind: keep Concentrating" title="Never mind (keeps Concentrating)">${I.x}</button></div></div>`;
      return `<div class="cac" data-id="${esc(a.id)}"><div class="cah"><b>${esc(c.name)}</b> took ${a.n} while Concentrating${sp?` on ${esc(sp)}`:""}</div>
        <div class="car"><span class="cadc">Con save · DC <b>${a.dc}</b>${a.mod!=null?` · ${a.mod<0?"−":"+"}${Math.abs(a.mod)}`:""}</span>
          <input class="field" data-ca="${esc(a.id)}" inputmode="numeric" placeholder="total" aria-label="Con save total for ${esc(c.name)}" autocomplete="off">
          <button type="button" class="btn sm" data-act="caroll" data-id="${esc(a.id)}" title="Roll d20${a.mod!=null?(a.mod<0?" − ":" + ")+Math.abs(a.mod):
            " (no statblock: +0)"}">Roll${a.mod!=null?` ${a.mod<0?"−":"+"}${Math.abs(a.mod)}`:""}</button>
          <button type="button" class="icon-btn sm" data-act="cadrop" data-id="${esc(
            a.id)}" aria-label="Never mind: keep Concentrating" title="Never mind (keeps Concentrating)">${I.x}</button></div></div>`}).join("");
    const first=el.querySelector("input[data-ca]");if(had&&el.querySelector(`input[data-ca="${CSS.escape(had)}"]`))el.querySelector(`input[data-ca="${
      CSS.escape(had)}"]`).focus();else if(first&&!(document.activeElement&&document.activeElement.matches("input,textarea,select")))first.focus();
  }
  const R=$("#roster");if(R){const r=R.getBoundingClientRect();el.style.left=(r.right-el.offsetWidth)+"px"}
}
function concAnswer(id,how,val){
  const a=concAsks.find(x=>x.id===id);if(!a)return;const c=byId(a.cid);concAsks=concAsks.filter(x=>x.id!==id);
  if(a.pc)concAskDrop(id);
  if(!c||how==="drop"){if(a.pc)commit();concAskRender();return}
  if(how==="keep"||how==="lost"){if(how==="keep"){logPush(`${c.name} keeps Concentrating (DC ${a.dc})`,null);concNote(`${c.name} keeps Concentrating`);
    clogPush(`${c.name} keeps Concentrating (DC ${a.dc})`)}
    else concLose(c,`${c.name} loses Concentration (DC ${a.dc})`,`DC ${a.dc}`);commit();concAskRender();return}
  if(how==="roll"){const r=d20();concResolve(c,r+(a.mod||0),a.dc,`d20 ${r}${a.mod!=null?` ${a.mod<0?"−":"+"} ${Math.abs(a.mod)}`:", no statblock"}`)}
  else{const tot=Number(String(val).trim());if(String(val).trim()===""||!Number.isFinite(tot)){concAsks.unshift(a);
    const i=$(`#concAsk input[data-ca="${CSS.escape(id)}"]`);if(i){i.classList.remove("shake");void i.offsetWidth;i.classList.add("shake")}return}
    concResolve(c,tot,a.dc,"")}
  commit();concAskRender();
}
function concLose(c,text,short){
  const effs=state.effects.filter(e=>e.by===c.id&&e.conc);
  c.conds=c.conds.filter(x=>(x.n||x)!=="Concentrating");state.effects=state.effects.filter(e=>!(e.by===c.id&&e.conc));
  const ends=effs.length?` · ${effs.map(e=>e.name).join(", ")} ends`:"";
  logPush(text+ends,{t:"concback",cid:c.id,effs});concNote(`${c.name} loses Concentration${short?` (${short})`:""}${ends}`);
    clogPush(`${c.name} loses Concentration${short?` (${short})`:""}${ends}`);
}
function concNote(t){concMsgs.push(t);clearTimeout(concT);concT=setTimeout(()=>{toast(concMsgs.join(" · "),5000);concMsgs=[];renderLog()},60)}
const HPK={dmg:"d",heal:"p",temp:"t",set:"s"};
