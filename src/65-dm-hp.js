/* ---- H1: the HP popover: a number, then Damage, Heal or Temp HP ---- */
const hpNum=()=>{const v=(($("#hpPopIn")||{}).value||"").trim();return v};
function hpPreview(c){
  const v=hpNum(),cur=c.hp??c.hpMax,t=c.thp||0;let m;
  if(!v)return `<span class="psub">type a number</span>`;
  if((m=v.match(/^-?(\d+)$/))){const n=hpModN(Number(m[1])),a=Math.min(t,n),h=Math.max(0,cur-(n-a));
    return `${n!==Number(m[1])?`<small>${n}</small> `:""}${cur}${t?`<small>+${t}</small>`:""} → <b class="d">${h}</b>${t-a?`<small>+${t-a}</small>`:""}${h===
    0?" ☠":""}`}
  if((m=v.match(/^\+(\d+)$/)))return `${cur} → <b class="p">${Math.min(c.hpMax,cur+Number(m[1]))}</b>`;
  if((m=v.match(/^t(\d+)$/i)))return `temp <b class="t">+${Math.max(t,Number(m[1]))}</b>`;
  if((m=v.match(/^=(\d+)$/)))return `set to <b>${m[1]}</b>`;
  if((m=v.match(/^(\d*)\/(\d+)$/)))return `maximum <b>${m[2]}</b>`;
  return `<span class="psub">−12 · +8 · t10 · =60 · 60/120</span>`;
}
const hpModN=n=>hpMod==="half"?Math.floor(n/2):hpMod==="double"?n*2:n;
function hpPopOpen(id){
  const c=byId(id);if(!c||c.hpMax==null)return;hpTipHide(true);hpPopId=id;hpMod="";
  let el=$("#hpPop");if(!el){el=document.createElement("div");el.id="hpPop";el.className="hppop";el.setAttribute("role","dialog");document.body.appendChild(el)}
  el.innerHTML=`<span class="hparrow"></span><h4 id="hpPopHead"></h4>
    <div class="hpdisp"><input id="hpPopIn" class="hpin" autocomplete="off" spellcheck="false" placeholder="0" aria-label="HP change"><span class="hppv" id="hpPv"></span></div>
    <div class="hpmodes"><button type="button" class="dmg" data-act="hpgo" data-k="dmg">− Damage</button><button type="button" class="heal" data-act="hpgo" data-k="heal">+ Heal</button><button type="button" class="tmp" data-act="hpgo" data-k="temp">Temp HP</button></div>
    <div class="hpquick" id="hpQuick"></div>
    <div class="hphint">Number, then <kbd>Enter</kbd> damage · <kbd>H</kbd> heal · <kbd>T</kbd> temp HP · <kbd>=</kbd>60 sets · 60/120 maximum · <kbd>Esc</kbd></div>
    <div class="hphist" id="hpPopHist"></div>
    <div class="hpfoot"><button type="button" class="linkbtn" data-act="mtstart" data-id="${esc(id)}">Hit several at once…</button></div>`;
  const inp=$("#hpPopIn");
  inp.addEventListener("input",()=>{const x=byId(hpPopId);if(x)$("#hpPv").innerHTML=hpPreview(x)});
  inp.addEventListener("keydown",e=>{const v=inp.value.trim();
    if(e.key==="Escape"){e.preventDefault();hpPopClose();return}
    if(e.key==="Enter"){e.preventDefault();hpGo(null);return}
    if(/^\d+$/.test(v)&&/^[hHtT]$/.test(e.key)){e.preventDefault();hpGo(/h/i.test(e.key)?"heal":"temp")}});
  hpPopSync();inp.focus();renderDM();
}
function hpPopSync(){
  const el=$("#hpPop");if(!el)return;const c=hpPopId&&byId(hpPopId);
  if(!c||c.hpMax==null){hpPopClose();return}
  const cur=c.hp??c.hpMax;
  $("#hpPopHead").innerHTML=`<span>${esc(c.name)}</span><b>${cur} / ${c.hpMax}${c.thp?` <i>+${c.thp}</i>`:""}</b>`;
  $("#hpQuick").innerHTML=[1,2,5,10].map(n=>`<button type="button" data-act="hpq" data-n="${n}">−${n}</button>`).join("")
    +`<button type="button" data-act="hpmod" data-v="half" aria-pressed="${hpMod===
      "half"}" title="Half damage (made the save, resistant)">½</button><button type="button" data-act="hpmod" data-v="double" aria-pressed="${hpMod===
      "double"}" title="Double damage (vulnerable)">×2</button>`
    +(c.thp?`<button type="button" data-act="hpgo" data-k="tclear">Clear temp</button>`:"");
  $("#hpPopHist").innerHTML=hpLogHtml(c,4);$("#hpPv").innerHTML=hpPreview(c);
  const box=$("#hp-"+CSS.escape(c.id));if(!box){el.style.visibility="hidden";return}el.style.visibility="";
  const r=box.getBoundingClientRect(),W=el.offsetWidth,H=el.offsetHeight,below=r.bottom+12+H<innerHeight-coveredPx-8;
  el.style.left=Math.max(8,Math.min(innerWidth-W-8,r.left+r.width/2-W/2))+"px";el.style.top=(below?r.bottom+10:Math.max(8,r.top-10-H))+"px";
  el.classList.toggle("up",!below);el.querySelector(".hparrow").style.left=(r.left+r.width/2-parseFloat(el.style.left)-7)+"px";
}
function hpPopClose(){hpPopId=null;hpMod="";const el=$("#hpPop");if(el)el.remove();if(MODE==="dm")renderDM()}
function hpGo(kind){
  const c=byId(hpPopId);if(!c)return;const v=hpNum();let m;
  if(kind==="tclear"){hpDo(c,"temp",0);commit();hpPopSync();return}
  if(!kind){   // Enter: the typed form decides
    if((m=v.match(/^\+(\d+)$/)))return hpApply(c,"heal",Number(m[1]));
    if((m=v.match(/^t(\d+)$/i)))return hpApply(c,"temp",Number(m[1]));
    if((m=v.match(/^=(\d+)$/)))return hpApply(c,"set",Number(m[1]));
    if(/^\d*\/\d+$/.test(v)){if(applyHp(c,v,"")){commit();hpPopClose()}return}
    kind="dmg"}
  const n=Number((v.match(/^[-+t=]?(\d+)$/i)||[])[1]);if(!(n>=0)||v===""){const i=$("#hpPopIn");i.classList.remove("shake");void i.offsetWidth;
    i.classList.add("shake");i.focus();return}
  hpApply(c,kind,n);
}
function hpApply(c,kind,n){
  const nn=kind==="dmg"?hpModN(n):n,why=kind==="dmg"&&hpMod==="half"?"half":kind==="dmg"&&hpMod==="double"?"×2":"";
  hpDo(c,kind,nn,why);commit();hpPopClose();
}
/* ---- H3: the last changes when the mouse rests on the HP ---- */
let hpTipT=null,hpTipId=null;
function hpTipShow(id){
  const c=byId(id),box=$("#hp-"+CSS.escape(id));if(!c||!box||hpPopId||!(c.hpLog||[]).length)return;
  let el=$("#hpTip");if(!el){el=document.createElement("div");el.id="hpTip";el.className="hptip";document.body.appendChild(el);
    el.addEventListener("mouseenter",()=>clearTimeout(hpTipT));el.addEventListener("mouseleave",()=>hpTipHide())}
  hpTipId=id;el.innerHTML=`<div class="eyebrow2">${esc(c.name)} · last changes</div>${hpLogHtml(c,
    5)}<div class="hphint">Damage takes temp HP first · undo takes back just that one</div>`;
  const r=box.getBoundingClientRect();el.style.left=Math.max(8,Math.min(innerWidth-el.offsetWidth-8,r.left))+"px";
  const H=el.offsetHeight;el.style.top=(r.bottom+8+H<innerHeight-coveredPx-8?r.bottom+6:r.top-6-H)+"px";
}
function hpTipHide(now){clearTimeout(hpTipT);const go=()=>{const el=$("#hpTip");if(el)el.remove();hpTipId=null};if(now)go();else hpTipT=setTimeout(go,220)}
document.addEventListener("mouseover",e=>{
  if(MODE!=="dm")return;const b=e.target.closest&&e.target.closest(".hpb");
  if(b){clearTimeout(hpTipT);if(hpTipId!==b.dataset.hid){const id=b.dataset.hid;hpTipT=setTimeout(()=>hpTipShow(id),380)}}
  else if(hpTipId&&!(e.target.closest&&e.target.closest("#hpTip")))hpTipHide();
});
document.addEventListener("pointerdown",e=>{   // a click anywhere else closes the popover
  if(MODE!=="dm"||!hpPopId)return;if(e.target.closest("#hpPop")||e.target.closest(".hpb"))return;hpPopClose();
},true);
/* ---- H2: several at once: tick the rows (or Shift+click), one amount, a damage type, an optional save ---- */
const DMG_TYPES=["acid","bludgeoning","cold","fire","force","lightning","necrotic","piercing","poison","psychic","radiant","slashing","thunder"];
function sbDefs(c){   // resistances, immunities and vulnerabilities from the statblock ("soft": only against nonmagical attacks and the like)
  const raw=c&&c.sb&&c.sb.raw;if(!raw)return null;if(c.sb._defs&&c.sb._defs.raw===raw.length)return c.sb._defs;
  const out={res:new Set(),imm:new Set(),vul:new Set(),soft:new Set(),raw:raw.length};
  refPlain(raw).split(/\r?\n/).forEach(l=>{const x=l.replace(/^[\s>]*[-•]?\s*/,"").replace(/\*\*|__/g,"").trim();
    const m=x.match(/^(?:damage\s+)?(resistances?|immunit(?:y|ies)|vulnerabilit(?:y|ies))\b[:.\s]+(.+)$/i);if(!m)return;
    const kind=/^res/i.test(m[1])?"res":/^imm/i.test(m[1])?"imm":"vul";
    m[2].split(";").forEach(cl=>{const soft=/nonmagical|aren.t|that is|from|except|while|unless/i.test(cl);
      DMG_TYPES.forEach(t=>{if(new RegExp("\\b"+t+"\\b","i").test(cl)){if(soft)out.soft.add(t);else out[kind].add(t)}})})});
  Object.defineProperty(c.sb,"_defs",{value:out,enumerable:false,configurable:true,writable:true});return out;
}
function mtCalc(c){
  const n=Math.max(0,Number(mt.n)||0),mode=mt.modes[c.id]||"full";let x=mode==="full"?n:mode==="half"?Math.floor(n/2):0,note="";
  const d=mt.type?sbDefs(c):null;
  if(d){if(d.imm.has(mt.type)){x=0;note="immune"}else if(d.res.has(mt.type)){x=Math.floor(x/2);note="resistant"}else if(d.vul.has(mt.type)){x*=2;
    note="vulnerable"}
    else if(d.soft.has(mt.type))note=`resistant only in some cases: check`}
  return {x,mode,note};
}
function mtStart(id){mtOn=true;if(id)mtSel.add(id);hpPopClose();renderDM()}
function mtStop(){mtOn=false;mtSel.clear();mt={n:"",type:"",ab:"",dc:"",on:"half",modes:{},rolls:{}};const b=$("#mtBar");if(b)b.remove();const R=$("#roster");
  if(R)R.style.paddingBottom="";renderDM()}
/* 35: a group of the same monster as one row for the players: "Goblin ×4" (the DM still has each one) */
const grpBase=c=>String(c.name||"").replace(/\s+(?:[A-Z]|\d{1,2})$/,"").trim();
const grpKin=c=>state.list.filter(x=>x!==c&&x.kind===c.kind&&x.kind!=="pc"&&grpBase(x)===grpBase(c)&&grpBase(c)!==c.name);
function grpRows(list){
  const out=[];list.forEach(c=>{
    const last=out[out.length-1];
    if(c.sgrp&&last&&last.sgrp&&last.kind===c.kind&&grpBase(last)===grpBase(c)&&initOf(last)===initOf(c)){
      last.grpIds.push(c.id);last.grpUp+=c.down?0:1;last.conds=[...new Set([...(last.conds||[]).map(x=>x.n||x),...(c.conds||[]).map(x=>x.n||x)])];return}
    out.push(c.sgrp?Object.assign({},c,{grpIds:[c.id],grpUp:c.down?0:1,grpName:grpBase(c)}):c)});
  return out.map(c=>c.grpIds&&c.grpIds.length>1?Object.assign(c,{name:`${c.grpName} ×${c.grpUp||c.grpIds.length}`,down:c.grpUp===0}):c.grpIds?Object.assign({},
    c,{grpIds:undefined}):c);
}
const mtOk=c=>!!c&&(c.hpMax!=null||c.kind==="pc");   // a player without HP here: the damage is told, and a Concentration save asked
function mtToggle(id){const c=byId(id);if(!c)return;if(!mtOk(c)){toast("Track its HP first");return}mtOn=true;
  mtSel.has(id)?mtSel.delete(id):mtSel.add(id);renderDM()}
function mtRender(){
  let el=$("#mtBar");if(!mtOn){if(el)el.remove();return}
  const R=$("#roster");if(!R)return;
  if(!el){el=document.createElement("div");el.id="mtBar";el.className="mtbar";el.setAttribute("role","region");el.setAttribute("aria-label","Hit several");
    document.body.appendChild(el);
    el.addEventListener("input",e=>{const t=e.target;if(t.id==="mtN")mt.n=t.value;else if(t.id==="mtDc")mt.dc=t.value;else return;mtTargets()});
    el.addEventListener("change",e=>{const t=e.target;if(t.id==="mtType")mt.type=t.value;else if(t.id==="mtAb"){mt.ab=t.value;mt.rolls={};
      }else if(t.id==="mtOn")mt.on=t.value;else return;mtRender()});
    el.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches("input")){e.preventDefault();mtApply()}if(e.key==="Escape"){e.preventDefault();
      mtStop()}})}
  const keep=document.activeElement&&el.contains(document.activeElement)?document.activeElement.id:null,n=Math.max(0,Number(mt.n)||0);
  if(!el.querySelector("#mtN")){
    el.innerHTML=`<div class="mttop"><b class="mtc" id="mtCount"></b>
      <input class="field mtn" id="mtN" inputmode="numeric" placeholder="dmg" aria-label="Damage" autocomplete="off">
      <select class="field" id="mtType" aria-label="Damage type"><option value="">any type</option>${DMG_TYPES.map(t=>
        `<option value="${t}">${t[0].toUpperCase()+t.slice(1)}</option>`).join("")}</select>
      <select class="field" id="mtAb" aria-label="Saving throw"><option value="">no save</option>${ABIL3.map(([a,f])=>
        `<option value="${a}">${a} save</option>`).join("")}</select>
      <span id="mtSaveBits"></span>
      <span class="mthint">Tick rows or Shift+click them · resistances from the statblock apply on their own</span>
      <button type="button" class="btn mtgo" data-act="mtapply" id="mtGo"></button><button type="button" class="icon-btn" data-act="mtclose" aria-label="Close">${
        I.x}</button></div>
      <div class="mttg" id="mtTg"></div>`;
  }
  $("#mtType").value=mt.type;$("#mtAb").value=mt.ab;if(document.activeElement!==$("#mtN"))$("#mtN").value=mt.n;
  $("#mtSaveBits").innerHTML=mt.ab?`<label class="mtdc">DC <input class="field" id="mtDc" inputmode="numeric" value="${esc(
    mt.dc)}" aria-label="Save DC"></label>
      <select class="field" id="mtOn" aria-label="On a success"><option value="half"${mt.on==="half"?" selected":
        ""}>half on a success</option><option value="none"${mt.on==="none"?" selected":""}>nothing on a success</option></select>
      <button type="button" class="btn" data-act="mtroll" title="Roll each target's save with the bonus from its statblock">Roll saves</button>`:"";
  mtTargets();
  if(keep&&$("#"+keep)&&document.activeElement!==$("#"+keep))$("#"+keep).focus();
  const r=R.getBoundingClientRect();el.style.left=r.left+"px";el.style.width=r.width+"px";
  R.style.paddingBottom=(el.offsetHeight+12)+"px";   // the last rows stay reachable above the bar
}
function mtTargets(){
  const L=[...mtSel].map(byId).filter(mtOk),n=Math.max(0,Number(mt.n)||0);
  $("#mtCount").textContent=L.length?`${L.length} selected`:"Pick the targets";
  const g=$("#mtGo");g.disabled=!L.length||!n;g.textContent=n?`Apply ${n}${mt.type?" "+mt.type:""}`:"Apply";
  $("#mtTg").innerHTML=L.map(c=>{const {x,mode,note}=mtCalc(c),cur=c.hp??c.hpMax,t=c.thp||0,a=Math.min(t,x),h=Math.max(0,cur-(x-a)),ro=mt.rolls[c.id];
    return `<span class="mtt"><b>${esc(c.name)}</b><span class="seg3">${[["full","Full"],["half","½"],["none","0"]].map(([v,l])=>
      `<button type="button" data-act="mtmode" data-id="${esc(c.id)}" data-v="${v}" aria-pressed="${mode===v}">${l}</button>`).join("")}</span>
      ${c.hpMax==null?`<i>${n?"takes "+x:"player"}</i>${(c.conds||[]).some(q=>(q.n||q)==="Concentrating")?`<small>Concentration save asked</small>`:""}`:
        `<i class="${h===0&&n?"dead":""}">${n?`${cur}${t?`+${t}`:""} → ${h}${h===0?" ☠":""}`:`${cur}/${c.hpMax}`}</i>`}${x!==n&&n&&mode==="full"?
        `<small>${x}</small>`:""}${note?`<small class="mtn2">${esc(note)}</small>`:""}${ro?`<small>${ro.wait?"asked on the phone…":`${ro.ok?"saved":
        "failed"} (${ro.tot}${ro.pc?"":ro.mod==null?", no statblock":""})`}</small>`:""}
      <button type="button" class="x" data-act="mtrm" data-id="${esc(c.id)}" aria-label="Leave ${esc(c.name)} out">${I.x}</button></span>`}).join("")||
        `<span class="psub">Tick the creatures it hits: the boxes on the left of the rows, or Shift+click a row.</span>`;
}
function mtRoll(){
  const dc=Number(mt.dc);if(!mt.ab||!dc){toast("Pick the save and type the DC");return}
  [...mtSel].map(byId).filter(c=>c&&c.kind!=="pc").forEach(c=>{const mod=c.sb&&c.sb.raw?sbSaveMod(c.sb.raw,mt.ab):null,r=d20(),tot=r+(mod||0),ok=tot>=dc;
    mt.rolls[c.id]={r,tot,mod,ok};mt.modes[c.id]=ok?(mt.on==="half"?"half":"none"):"full"});
  // players roll their own: a roll call to their phones, and the answers set Full or ½
  const pcs=[...mtSel].map(byId).filter(c=>c&&c.kind==="pc"&&!mt.rolls[c.id]);
  if(pcs.length){state.call={id:uid(),text:`${mt.ab} save DC ${dc}${mt.src&&mt.src.act?" · "+mt.src.act:""}`,dc,at:Date.now(),to:pcs.map(c=>c.id),answers:{}};
    mt.callId=state.call.id;
    pcs.forEach(c=>mt.rolls[c.id]={wait:true,pc:true});commit();toast(`Roll call sent to ${pcs.map(c=>c.name).join(", ")}`)}
  mtTargets();
}
function mtApply(){
  const L=[...mtSel].map(byId).filter(mtOk),n=Math.max(0,Number(mt.n)||0);if(!L.length||!n)return;
  const parts=[];
  const hurt=L.filter(c=>c.kind==="pc"&&mtCalc(c).x>0).map(c=>c.id),src=mt.src&&byId(mt.src.cid);
  if(hurt.length)state.react={id:uid(),k:"dmg",to:hurt,by:src&&!src.hidden?src.name:"",t:mt.type,at:Date.now()};   // Hellish Rebuke, Absorb Elements
  {const nm=mt.src&&mt.src.act||"";if(sfx("spells")&&spellFxKnown(nm,mt.type))state.spfx={id:uid(),at:Date.now(),n:nm,t:mt.type||"",from:src&&!src.hidden?
    src.id:null,to:L.filter(c=>!c.hidden).map(c=>c.id)}}   // R1: the breath or the spell plays in the scene
  L.forEach(c=>{const {x,mode,note}=mtCalc(c);if(c.hpMax==null){if(x>0)pcConcAsk(c,x);parts.push(`${c.name} takes ${x}`);
    return}if(x>0)hpDo(c,"dmg",x,[mt.type,mode==="half"?"half":"",note==="resistant"||note==="vulnerable"||note==="immune"?note:""].filter(Boolean).join(", "));
    parts.push(`${c.name} −${x}`)});
  commit();toast(`${n}${mt.type?" "+mt.type:""}: ${parts.join(", ")}`);mtStop();
}
function hpLogHtml(c,max){
  const L=(c.hpLog||[]).slice(0,max||5);if(!L.length)return "";
  return L.map(e=>`<div class="hph"><span><b class="${HPK[e.k]}">${e.k==="dmg"?"−"+e.n:e.k==="heal"?"+"+e.n:e.k==="temp"?(e.n?"+"+e.n+" temp":"temp cleared"):
    "set "+e.n}</b> <small>${[e.why,e.by,e.r?"round "+e.r:""].filter(Boolean).map(esc).join(
    " · ")}</small></span><button type="button" class="hpundo" data-act="hpundo" data-hid="${esc(c.id)}" data-e="${esc(e.id)}">undo</button></div>`).join("");
}
function applyHp(c,raw,was){
  let v=String(raw).replace(/\s+/g,"");const w=String(was||"").replace(/\s+/g,"");
  if(w&&v!==w&&v.startsWith(w))v=v.slice(w.length);   // typed after the old value instead of over it
  if(!v||v===w)return false;let m;
  if((m=v.match(/^(\d*)\/(\d+)$/))){const mx=Number(m[2]);if(mx<1)return false;const old=c.hpMax;c.hpMax=mx;
    c.hp=m[1]!==""?Number(m[1]):(old==null?mx:Math.min(c.hp??mx,mx));}
  else if((m=v.match(/^([+-])(\d+)$/))){if(c.hpMax==null)return false;hpDo(c,m[1]==="-"?"dmg":"heal",Number(m[2]))}
  else if((m=v.match(/^t(\d+)$/i))){if(c.hpMax==null)return false;hpDo(c,"temp",Number(m[1]))}
  else if((m=v.match(/^=?(\d+)$/))){const n=Number(m[1]);if(c.hpMax==null){if(n<1)return false;c.hpMax=n;c.hp=n}else hpDo(c,"set",n)}
  else return false;
  return true;
}
let menuId=null;
function renderDM(){
  const ae=document.activeElement;
  if(ae&&$("#roster").contains(ae)&&ae.tagName==="INPUT"){pendingRender=true;return}
  pendingRender=false;renderParty();renderEnc();renderCall();renderField();
  const tsec=$("#timerSecs");if(tsec&&document.activeElement!==tsec)tsec.value=state.timerSecs||30;
  {const ab=$("#atmoBtn"),sl=(SCENES.find(x=>x[0]===(state.scene||"none"))||["",""])[1];
   if(ab)ab.innerHTML=`<span class="eyebrow2">Atmosphere</span>${esc(atmoLabel(state))} · ${esc(sl)}${state.bg?" · picture":""}`}
  $("#lairBtn").setAttribute("aria-pressed",String(!!state.lair));
  {const tp=$("#tcardPill");if(tp){tp.hidden=!state.tcard;if(state.tcard)tp.innerHTML=`On the table: <b>${esc(state.tcard.name||"card")}</b> ${I.x}`;
    tp.title="Take the card off the tablet"}}
  $("#peBtn").setAttribute("aria-pressed",String(canEdit()));
  requestAnimationFrame(()=>{if(hpPopId)hpPopSync();mtRender();concAskRender()});
  $("#endBtn").textContent=state.ended?"Show order again":"End combat";
  $("#endedNote").hidden=!state.ended;
  const base=sorted(),list=withLair(base);const R=$("#roster");
  if(!list.length){R.innerHTML=
    `<div class="empty"><strong>Nobody in the order yet</strong><span>Add the party and some enemies, or drop in a saved encounter.</span><div class="acts">${
    state.party.length?'<button class="btn primary" type="button" data-act="pload">Add party to combat</button>':
    '<button class="btn" type="button" data-act="example">Load an example</button>'}</div></div>`;return}
  R.innerHTML=list.map(c=>{
    if(c.kind==="lair")return lairRowHtml();
    const i=base.indexOf(c),p=base[i-1],n=base[i+1];
    const canUp=p&&initOf(p)===initOf(c),canDn=n&&initOf(n)===initOf(c);
    const conds=(c.conds||[]).map((x,j)=>{const n=x.n||x;
      if(n==="Exhaustion"){const l=exhOf(c);return `<span class="cond exh${l>=6?" l6":
        ""}" title="Exhaustion level">Exhaustion <button type="button" data-act="exh" data-d="-1" aria-label="Lower level">−</button><b>${
        l}</b><button type="button" data-act="exh" data-d="1" aria-label="Raise level" ${l>=6?"disabled":""}>+</button>${l>=6?" dead":""}</span>`}
      const cd=cdurOf(c,n);return `<button type="button" class="cond" data-act="rmcond" data-j="${j}" title="Remove${cd?" · "+esc(cdurTag(cd)):
        ""}">${esc(n)}${cd?`<i class="cdurb">${esc(cdurTag(cd))}</i>`:""}</button>`}).join("")
      +state.effects.filter(e=>e.targets.includes(c.id)).map(e=>{const by=byId(e.by);
        return `<button type="button" class="cond eff" data-act="effrm" data-e="${esc(e.id)}" title="Remove effect from all targets">✦ ${esc(e.name)}${by?
        ` · ${esc(by.name)}`:""}${effN(e)}</button>`}).join("");
    const ds=dsOf(c);
    const dsHtml=c.kind==="pc"&&c.down?`<span class="ds">
      <span class="grp">${[0,1,2].map(k=>`<button type="button" class="pip s${ds.s>k?" on":""}" data-act="ds" data-k="s" data-i="${k}" aria-label="Success ${k+
        1}"></button>`).join("")}</span>
      <span class="grp">${[0,1,2].map(k=>`<button type="button" class="pip f${ds.f>k?" on":""}" data-act="ds" data-k="f" data-i="${k}" aria-label="Failure ${k+
        1}"></button>`).join("")}</span>
      ${isDead(c)?"<b style='color:var(--fail)'>Dead</b>":isStable(c)?"<b style='color:var(--save)'>Stable</b>":
        `<button type="button" class="cond add dsask" data-act="dsask" title="Open the death save window on ${esc(c.name)}'s phone (S)">${
        D20}Ask to roll</button>`}</span>`:"";
    const typ=c.kind==="pc"?LABEL[c.cls]:LABEL[c.ctype];
    const typeline=[c.sb&&c.sb.raw?`<button type="button" class="sblink${sbViewId===c.id?" on":""}" data-act="sbview" title="${c.sb.pc?
      "Open the character sheet":"Open the statblock"}">${I.book||"📜"} ${c.sb.pc?"Sheet":"Statblock"}</button>`:"",c.boss?
      `<span class="crown">${I.crown}Boss${c.rim?` · ${esc((RIMS.find(r=>r[0]===c.rim)||["",""])[1])}`:""}</span>`:"",typ?esc(typ):"",c.boss&&c.title?
      `<i>${esc(c.title)}</i>`:"",c.kind==="pc"?passivesLine(c):"",c.kind==="pc"&&c.psimple?
      `<span class="simpletag" title="${esc(c.name)} uses the simple phone: just HP and what you send">simple phone</span>`:""].filter(Boolean).join(" · ");
    const chips=(c.hidden?`<button type="button" class="cond hidchip" data-act="hidden" title="Reveal to players (H)">${I.eyeoff}Hidden · reveal</button>`:"")+
      dsHtml+conds
      +(c.insp?`<button type="button" class="cond inspchip" data-act="insp" title="Remove Heroic Inspiration">${I.star}Inspiration</button>`:"")
      +(c.cover?`<button type="button" class="cond add on" data-act="covercycle" title="Click to change">${COVER_CHIP[c.cover]}</button>`:"")
      +(c.tags||[]).map(t=>`<button type="button" class="cond tagdm" data-act="tagrm" data-t="${t}" title="Remove">${(TAGS.find(x=>x[0]===t)||[t,
        t])[1]}</button>`).join("")
      +(c.know||[]).map((k,i)=>`<button type="button" class="cond knowdm" data-act="knowrm" data-id="${esc(c.id)}" data-i="${i}" title="Remove">${esc(
        k)}</button>`).join("")
      +`<button type="button" class="cond add addc" data-act="conds" title="Add a condition (C)" aria-label="Add a condition">+</button>`;
    const K=(k)=>`<kbd>${k}</kbd>`;
    const sb=c.sb,pips=(k,o,j)=>Array.from({length:o.max},(_,q)=>`<button type="button" class="sbpip${q>=o.max-o.used?" used":
      ""}" data-act="sbuse" data-k="${k}"${j!=null?` data-j="${j}"`:""} data-q="${q}" aria-label="${q>=o.max-o.used?"Get one back":
      "Use one"}"></button>`).join("");
    const hasLair=sb&&((sb.lair||[]).length||(sb.reg||[]).length||sb.laLair||sb.lrLair);
    const sbHtml=sb&&(sb.lr||sb.la||(sb.uses||[]).length||(sb.rech||[]).length||hasLair)?`<div class="sbline" title="Only you see these">
        ${hasLair?`<button type="button" class="sbc sblair" data-act="sblair" aria-pressed="${!!sb.inLair}" title="${esc(lairTip(sb))}">${ic(
          "castle")} In lair</button>`:""}
        ${sb.inLair&&(sb.reg||[]).length?`<button type="button" class="sbreset" data-act="sbreg" aria-expanded="${lairRegOpen.has(c.id)}">Regional effects ${ic(
          "next")}</button>`:""}
        ${sb.lr?`<span class="sbc"><i>LR</i>${pips("lr",sb.lr)}</span>`:""}
        ${sb.la?`<span class="sbc"><button type="button" class="sbreset" data-act="sbla0" title="Its turn starts: all Legendary Actions back">LA ${ic(
          "reload")}</button>${pips("la",sb.la)}</span>`:""}
        ${(sb.rech||[]).map((r,j)=>`<button type="button" class="sbrech${r.ready?" ready":""}" data-act="sbrech" data-j="${j}" title="${r.ready?
          "Click when it's used":`Click to roll d6, it's back on ${r.min}${r.min<6?"–6":""}`}">${esc(r.n)} <b>${r.ready?"ready":ic("reload")+" "+r.min+(r.min<6?
          "–6":"")}</b></button>`).join("")}
        ${(sb.uses||[]).length>2&&!sbOpenRows.has(c.id)?
          `<button type="button" class="sbc sbmore" data-act="sbexpand" title="Show the spells and X/Day uses">Spells &amp; uses <b>${sb.uses.reduce((a,u)=>a+
          u.max-u.used,0)}/${sb.uses.reduce((a,u)=>a+u.max,0)}</b> ${ic("next")}</button>`
          :(sb.uses||[]).map((u,j)=>`<span class="sbc"><i>${esc(u.n)}</i>${u.max<=6?pips("use",u,j):
            `<button type="button" class="btn sm" data-act="sbstep" data-j="${j}" data-d="1">−</button><b>${u.max-u.used}</b>`}</span>`).join("")+((sb.uses||
            []).length>2?`<button type="button" class="sbreset" data-act="sbexpand">less</button>`:"")}
      </div>${sb.inLair&&lairRegOpen.has(c.id)?`<div class="lairbox reg">${sb.reg.map(t=>`<p>${sbInline(esc(t),"")}</p>`).join("")}</div>`:""}`:"";
    const menu=menuId===c.id?`<div class="rmenu" role="menu" aria-label="More for ${esc(c.name)}">
        <button type="button" data-act="conds">Conditions… ${K("C")}</button>
        <button type="button" data-act="covercycle" data-keep="1">Cover: ${c.cover?COVER_CHIP[c.cover]:"none"} ${ic("next")}</button>
        ${c.kind!=="pc"?`<button type="button" data-act="know">What the party knows… ${K("K")}</button>`:""}
        <button type="button" data-act="hidden">${c.hidden?"Reveal to players":"Hide from players"} ${K("H")}</button>
        ${c.kind!=="pc"&&grpKin(c).length?`<button type="button" data-act="sgrp">${c.sgrp?`Show each ${esc(grpBase(c))} on the table`:
          `One row on the table: “${esc(grpBase(c))} ×${grpKin(c).length+1}”`}</button>`:""}
        ${c.hidden&&c.boss?`<button type="button" data-act="revpv">Preview the reveal…</button>`:""}
        ${c.kind==="pc"?`<button type="button" data-act="compnew" data-id="${esc(c.id)}">Add a companion or summon…</button>`:""}
        ${c.kind==="pc"&&(c.conds||[]).some(x=>(x.n||x)==="Concentrating")?
          `<button type="button" data-act="pcconc" data-id="${esc(c.id)}">Concentration save… <kbd>O</kbd></button>`:""}
        ${c.kind==="pc"?`<button type="button" data-act="dmsheet">${(state.sheets||{})[c.name.toLowerCase()]?"Character sheet…":
          "Character sheet… (fill in or paste)"}</button>`:""}
        ${c.kind==="pc"?`<button type="button" data-act="dsask">${c.down?"Ask for a death save":
          "0 HP + ask for a death save"} ${K("S")}</button><button type="button" data-act="timer">${state.timer&&state.timer.cid===c.id?"Stop the hourglass":
          "Hourglass"} ${K("T")}</button><button type="button" data-act="insp">${c.insp?"Remove":"Give"} Heroic Inspiration ${K("I")}</button>`
          :`<button type="button" data-act="boss">${c.boss?"Not a boss":"Make it a boss"} ${K("I")}</button>${c.boss?
            `<button type="button" data-act="titleedit">Intro title…</button><button type="button" data-act="intro">Replay intro</button><label>Background<select data-act="rim" aria-label="Boss background">${
            RIMS.map(([k,l])=>`<option value="${k}"${(c.rim||"")===k?" selected":""}>${l}</option>`).join("")}</select></label>`:""}`}
        ${c.kind!=="pc"&&c.hpMax!=null?`<button type="button" data-act="hpclear">Stop tracking HP</button>`:""}
        ${sb?`<button type="button" data-act="sbresetall">Reset statblock counters</button>`:""}
        <label>${c.kind==="pc"?"Class":"Type"}<select data-act="${c.kind==="pc"?"cls":"ctype"}" aria-label="${c.kind==="pc"?"Class":"Type"}">${c.kind==="pc"?
          typeOptions(CLASSES,c.cls,"None"):typeOptions(CTYPES,c.ctype,"None")}</select></label>
        ${canUp||canDn?"<hr>":""}${canUp?`<button type="button" data-act="up" data-keep="1">Move up (tied initiative)</button>`:""}${canDn?
          `<button type="button" data-act="dn" data-keep="1">Move down (tied initiative)</button>`:""}
        <hr><button type="button" class="danger" data-act="del">Remove ${K("Del")}</button></div>`:"";
    return `<div class="row k-${c.kind}${state.turn&&state.turn.id===c.id?" turn":""}${shownToPlayers(c)?"":" out"}${c.hidden?" hid":""}${c.boss?" isboss":
      ""}${mtSel.has(c.id)?" mtsel":""}${mtOn&&mtOk(c)?" mtrow":""}" data-id="${c.id}">
      ${mtOn&&mtOk(c)?`<button type="button" class="mtcb" data-act="mttoggle" aria-pressed="${mtSel.has(c.id)}" aria-label="Hit ${esc(c.name)}">${mtSel.has(
        c.id)?"✓":""}</button>`:""}
      ${c.owner?`<span class="init-in own" title="Acts right after ${esc((ownerOf(c)||{}).name||"its owner")}">↳${initOf(c)>-999?initOf(c):""}</span>`:
        ""}<input${c.owner?" hidden":""} class="init-in${typeof c.init!=="number"&&!c.owner?" missing":""}${freshIds.has(c.id)?" fresh":
        ""}" id="init-${c.id}" type="number" inputmode="numeric" value="${typeof c.init==="number"?c.init:""}" placeholder="${typeof c.ib==="number"?(c.ib>=0?
        "+":"")+c.ib:"?"}" data-act="init" aria-label="Initiative"${typeof c.ib==="number"?` title="Initiative bonus ${c.ib>=0?"+":
        ""}${c.ib}: type the d20 total"`:""}>
      <div class="who"><input class="name-in" id="name-${c.id}" value="${esc(c.name)}" data-act="name" aria-label="Name">${typeline?
        `<div class="typeline">${typeline}</div>`:""}</div>
      <div class="chips">${chips}</div>
      <div class="tools">
        ${c.kind!=="pc"?hpBox(c):c.php?pcHpBox(c):""}
        <span class="ac-wrap"><button type="button" class="tog" data-act="showac" aria-pressed="${!!c.showAc}" title="Show AC to players">${c.showAc?I.eye:
          I.eyeoff}AC</button><input id="ac-${c.id}" type="number" value="${c.ac??""}" placeholder="—" data-act="ac" aria-label="AC"></span>
        <button type="button" class="tog blood" data-act="bloodied" aria-pressed="${!!c.bloodied}" title="Bloodied (B)">${I.drop}Bloodied</button>
        <button type="button" class="tog" data-act="down" aria-pressed="${!!c.down}" title="${c.kind==="pc"?"0 HP":"Down"} (D)">${c.kind==="pc"?"0 HP":
          "Down"}</button>
        <button type="button" class="morebtn2" data-act="rowmenu" aria-haspopup="menu" aria-expanded="${menuId===
          c.id}" aria-label="More for ${esc(c.name)}">${DOTS}</button>
      </div>${sbHtml}${menu}</div>`}).join("");
  freshIds.clear();markSel();renderSbDrawer();
  const tb=$("#turnBox");if(tb){const t=state.turn;
    tb.innerHTML=t?`<span class="rnd">Round <b>${
      t.round}</b></span><button class="icon-btn" type="button" data-act="tprev" title="Previous turn (P)" aria-label="Previous turn">${ic(
      "prev")}</button><button class="btn primary" type="button" data-act="tnext" title="Next turn (N)">Next turn ${ic(
      "next")}</button><button class="linkbtn" type="button" data-act="tend" title="Stop tracking turns">stop</button>`
      :`<button class="btn" type="button" data-act="tnext" title="Start tracking turns from the top (N)">Start turns ${ic("next")}</button>`}
  const at=$("#autoTimer");if(at&&document.activeElement!==at)at.checked=!!state.autoTimer;
  {const ca=$("#concAuto");if(ca)ca.checked=!!ls.get("concAuto",false)}
}
