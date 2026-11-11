/* ---------- players on their own phones: "Who are you?", button bar, own conditions ---------- */
let meName=ls.get("meName",null);      // character name; "*" = shared screen (Tablet)
let pSheet=null;                       // "who" | "init" | "conds" | "effs" | "res" | "hp" | "dice" | "call"
const meChar=()=>meName&&meName!=="*"?state.list.find(c=>c.kind==="pc"&&!c.hidden&&c.name.toLowerCase()===meName.toLowerCase()):null;
const canEdit=()=>state.playerEdits!==false;
const D20=`<svg viewBox="0 0 24 24" aria-hidden="true" class="d20"><path d="M12 1.8 21.2 7v10L12 22.2 2.8 17V7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 1.8 7.4 9.6h9.2zM7.4 9.6 12 18.4l4.6-8.8M2.8 7l4.6 2.6M21.2 7l-4.6 2.6M12 18.4v3.8M2.8 17 12 18.4 21.2 17" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
/* personal HP: on this phone only; optionally reports Bloodied / 0 HP */
const hpKey=()=>"hp:"+(meName||"").toLowerCase();
const hpGet=()=>Object.assign({cur:0,max:0,temp:0,auto:true},ls.get(hpKey(),{}));
const hpSet=v=>{ls.set(hpKey(),v);phpSync()};
/* 80: the phone's HP goes to the DM (on unless the player turns it off); only the DM ever gets it */
const phpOn=()=>ls.get("hpShare",true)!==false;
const pSimple=()=>!!ls.get("pSimple",false);
let pmodeLast="",pmodeT=null;
function pmodeSync(now){   // 78: the DM sees who uses the simple phone
  if(MODE!=="player"||meName==="*"||PREVIEW)return;clearTimeout(pmodeT);
  pmodeT=setTimeout(()=>{const me=meChar();if(!me)return;const on=pSimple(),key=me.id+"|"+on;if(key===pmodeLast)return;
    if(!on&&!me.psimple&&pmodeLast===""){pmodeLast=key;return}
    pSend({action:"pmode",simple:on}).then(ok=>{if(ok)pmodeLast=key})},now?50:900)}
let phpLast="",phpT=null;
function phpSync(now){
  if(MODE!=="player"||meName==="*"||PREVIEW)return;clearTimeout(phpT);
  phpT=setTimeout(()=>{const me=meChar();if(!me)return;const hp=hpGet(),on=phpOn()&&hp.max>0;
    const key=me.id+"|"+(on?`${hp.cur}/${hp.max}/${hp.temp||0}`:"off");if(key===phpLast)return;
    pSend(on?{action:"php",cur:hp.cur,max:hp.max,temp:hp.temp||0}:{action:"php",off:true}).then(ok=>{if(ok)phpLast=key})},now?50:700)}
const TI={   // tile icons on the phone
  heart:'<svg viewBox="0 0 24 24" class="ti" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  cond:'<svg viewBox="0 0 24 24" class="ti" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  spark:'<svg viewBox="0 0 24 24" class="ti" aria-hidden="true"><path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  book:'<svg viewBox="0 0 24 24" class="ti" aria-hidden="true"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16M8 7h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  pips:'<svg viewBox="0 0 24 24" class="ti" aria-hidden="true"><circle cx="6" cy="12" r="2.6" fill="currentColor"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/><circle cx="18" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'};
const DOTS='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
/* what's on my character right now, for the strip in the bottom bar; k = how to remove it ("" = can't from here) */
function myStatus(me){
  const out=[],conds=me.conds||[];
  if(me.down){const ds=dsOf(me);out.push({k:"",t:`0 HP · ${ds.s}✓ ${ds.f}✗`,cls:"down"})}
  conds.forEach(x=>{const n=x.n||x;if(n!=="Exhaustion")out.push({k:"cond:"+n,t:n,cls:n==="Concentrating"?"conc":""})});
  if(conds.some(x=>(x.n||x)==="Exhaustion"))out.push({k:"exh",t:"Exhaustion "+exhOf(me)});
  (me.tags||[]).forEach(t=>{const L=TAGS.find(x=>x[0]===t);out.push({k:"tag:"+t,t:L?L[1]:t})});
  if(me.cover)out.push({k:"cover",t:COVER_CHIP[me.cover]||"Cover"});
  state.effects.filter(e=>(e.targets||[]).includes(me.id)).forEach(e=>{const by=byId(e.by);
    out.push({k:"",t:"✦ "+e.name+(by&&by.id!==me.id?" · "+by.name:""),cls:"eff",x:effN(e)})});
  return out;
}
let chipT=null,hpEditMax=false;
function playerBar(){
  if(!served||!meName||meName==="*")return "";
  const me=meChar();
  if(!me)return `<div class="pbar"><div class="pmeline"><span class="pme">${esc(
    meName)}<small>Your character isn't in the combat yet</small></span><button class="pb" type="button" data-act="pwho">Change character</button></div></div>`;
  const ed=canEdit(),hp=hpGet(),simple=pSimple();
  const hpTxt=hp.max?`<b>${hp.cur}</b>/${hp.max}${hp.temp?` <i>+${hp.temp}</i>`:""}`:"Set HP";
  const hpCls=!hp.max?"":hp.cur===0?" zero":hp.cur<=Math.floor(hp.max/2)?" low":"";
  const chips=myStatus(me).map(x=>x.k&&ed?`<button type="button" class="mychip ${x.cls||""}" data-act="mychip" data-k="${esc(x.k)}">${esc(x.t)}</button>`:
    `<span class="mychip ${x.cls||""}">${esc(x.t)}${x.x||""}</span>`).join("");
  /* six big tiles (Init · HP · Roll / Conditions · Effects · Spells); Resources and ⋯ sit beside the name.
     A long fight gets slimmer tiles so the order above keeps its room. */
  const many=sorted().filter(shownToPlayers).length>6,book=!!spRows,pct=hp.max?Math.max(0,Math.min(100,Math.round(100*hp.cur/hp.max))):0;
  const tile=(act,inner,cls,label)=>`<button class="tile${cls?" "+cls:""}" type="button" data-act="${act}"${label?` aria-label="${esc(label)}"`:
    ""}>${inner}</button>`;
  const T=[];
  if(simple){   // 78: just my HP (and initiative when it's asked for); what the DM sends still pops up
    if(ed&&typeof me.init!=="number")T.push(tile("pinit",`<small>Init</small><b>?</b>`,"want","Initiative"));
    T.push(tile("php",hp.max?`<small>HP</small><b>${hp.cur}<span class="of"> / ${hp.max}</span>${hp.temp?`<i>+${hp.temp}</i>`:
      ""}</b><span class="hpbar"><i style="width:${pct}%"></i></span>`:`${TI.heart}<span>Set HP</span>`,"hp"+hpCls,"Hit points"));
    return `<div class="pbar simple"><div class="pmeline"><span class="pme">${esc(
      me.name)}<small>Simple</small></span><span class="pmeright"><button class="ptop sq" type="button" data-act="pmore" aria-label="More">${
      DOTS}</button></span></div>
      ${chips?`<div class="mystat" aria-label="Your status">${myStatus(me).map(x=>`<span class="mychip ${x.cls||""}">${esc(x.t)}${x.x||
        ""}</span>`).join("")}</div>`:""}
      ${giftsHtml(me)}<div class="ptiles">${T.join("")}</div></div>`}
  if(ed)T.push(tile("pinit",`<small>Init</small><b>${typeof me.init==="number"?me.init:"?"}</b>`,typeof me.init==="number"?"":"want","Initiative"));
  T.push(tile("php",hp.max?`<small>HP</small><b>${hp.cur}<span class="of"> / ${hp.max}</span>${hp.temp?`<i>+${hp.temp}</i>`:
    ""}</b><span class="hpbar"><i style="width:${pct}%"></i></span>`:`${TI.heart}<span>Set HP</span>`,"hp"+hpCls,"Hit points"));
  T.push(tile("pdice",`${D20}<span>Roll</span>`,"","Dice"));
  if(ed){T.push(tile("pconds",`${TI.cond}<span>Conditions</span>`));T.push(tile("peffs",`${TI.spark}<span>Effects</span>`))}
  T.push(book?tile("pbook",`${TI.book}<span>Spells</span>`):tile("pres",`${TI.pips}<span>Resources</span>`));
  return `<div class="pbar${many?" many":""}"><div class="pmeline"><span class="pme">${esc(me.name)}</span>
      <span class="pmeright">${book?`<button class="ptop" type="button" data-act="pres">${TI.pips}Resources</button>`:
        ""}<button class="ptop sq" type="button" data-act="pmore" aria-label="More">${DOTS}</button></span></div>
    ${chips?`<div class="mystat" aria-label="Your status">${chips}</div>`:""}${ed?"":`<div class="pnote">The DM has locked changes</div>`}
    ${giftsHtml(me)}<div class="ptiles">${T.join("")}</div>${compHtml(me)}</div>`;
}
/* 45: dice someone gave you (Bardic Inspiration…), to use when you want */
function giftsHtml(me){const G=me.gifts||[];if(!G.length)return "";
  return `<div class="pgifts">${G.map(g=>`<button type="button" class="pgift" data-act="pgiftuse" data-id="${esc(g.id)}" title="Roll it and use it"><b>${esc(
    g.die)}</b><span>${esc(g.n)}<small>from ${esc(g.from)} · tap to roll</small></span></button>`).join("")}</div>`}
/* 13/30: your companions (Find Familiar, summons): their HP is yours to keep */
const myComps=me=>state.list.filter(c=>c.owner===me.id&&!c.hidden);
function compHtml(me){const L=myComps(me);if(!L.length)return "";
  return `<div class="pcomps">${L.map(c=>`<div class="pcomp"><span class="pcn">${esc(c.name)}<small>${c.hpMax!=null?`${c.hp??c.hpMax}/${c.hpMax} HP${c.thp?
    ` +${c.thp}`:""}`:""}${c.ac!=null?` · AC ${c.ac}`:""}</small></span>
    ${c.hpMax!=null?`<button type="button" class="pb sm" data-act="pcomphp" data-id="${esc(c.id)}">HP</button>`:""}${c.sb&&c.sb.raw?
      `<button type="button" class="pb sm" data-act="pcompsb" data-id="${esc(c.id)}">Statblock</button>`:""}</div>`).join("")}</div>`}
/* 65: prepared spells; 38: the reactions among them buzz when they could matter */
const prepKey=()=>"spPrep:"+(meName||"").toLowerCase();
const prepGet=()=>{const v=ls.get(prepKey(),[]);return Array.isArray(v)?v:[]};
const prepHas=(n,s)=>prepGet().some(p=>p.n===n&&(p.s||"")===(s||""));
/* 81: spells kept always prepared: from the subclass and feats (5e.tools data), or marked by hand for homebrew. They don't count toward the limit. */
const alwKey=()=>"spAlways:"+(meName||"").toLowerCase();
const alwOwn=()=>{const v=ls.get(alwKey(),[]);return Array.isArray(v)?v:[]};
function alwaysList(){
  const prof=profGet(),out=[],seen=new Set(),tot=prof.cls.reduce((a,e)=>a+(e.lvl||1),0)||1;
  const add=(n,s,from,lvl,auto,have)=>{const k=n.toLowerCase();if(seen.has(k))return;seen.add(k);out.push({n,s:s||"",from,lvl:lvl||1,auto,have})};
  if(pcData){
    prof.cls.forEach(e=>{const c=pcClass(e);if(!c||!e.sub)return;const sub=pcSubs(c).find(x=>x.n===e.sub.n&&x.s===e.sub.s);
      (sub&&sub.as||[]).forEach(([l,n,src])=>add(n,src,sub.sn||sub.n,l,true,(e.lvl||1)>=l))});
    (prof.feats||[]).forEach(f=>{const row=(pcData.feats||[]).find(r=>r[0]===f.t&&r[1]===f.n&&r[2]===f.s);
      (row&&row[7]||[]).forEach(([l,n,src])=>add(n,src,f.n,l,true,tot>=l))});
  }
  alwOwn().forEach(a=>add(a.n,a.s,a.from||"By hand",a.lvl||1,false,tot>=(a.lvl||1)));
  return out}
const alwNow=()=>alwaysList().filter(a=>a.have);
const alwHas=(n,s)=>alwNow().some(a=>a.n.toLowerCase()===String(n).toLowerCase());
const alwOf=n=>alwaysList().find(a=>a.n.toLowerCase()===String(n).toLowerCase());
function prepMax(){const prof=profGet();if(!pcData||!prof.cls.length)return null;let t=0,any=false;
  prof.cls.forEach(e=>{const c=pcClass(e);if(!c)return;(c.tb||[]).forEach(g=>{const i=g.c.map(pcTxt).findIndex(x=>/^prepared spells$/i.test(x));
    if(i>=0){const v=pcNum((g.r[(e.lvl||1)-1]||[])[i]);if(v>0){t+=v;any=true}}})});return any?t:null}
const REACT_KIND=t=>/cast(s|ing)? a spell|casting a spell/i.test(t)?"spell":/hit by an attack|targeted by|an attack roll/i.test(t)?"attack":
  /damage|damaged/i.test(t)?"dmg":"";
let reactSeen=null;
function reactCheck(first){
  const r=state.react,me=meChar();if(!r||r.id===reactSeen)return;reactSeen=r.id;if(first||!me||me.down||dmNow()-r.at>20000)return;
  if(r.to&&!(Array.isArray(r.to)?r.to:[r.to]).includes(me.id))return;if((me.tags||[]).includes("reaction"))return;
  const hit=prepGet().filter(p=>p.rx&&p.rx===r.k);if(!hit.length)return;
  reactShow(r,hit);
}
function reactShow(r,hit){let el=$("#reactPing");if(el)el.remove();el=document.createElement("div");el.id="reactPing";el.className="reactping";
  el.innerHTML=`<div class="rp-t">${r.k==="spell"?`<b>${esc(r.by)}</b> casts ${esc(r.what)}`:r.k==="attack"?`<b>${esc(r.by)}</b> attacks${r.tot?
    ` (${r.tot} to hit)`:""}`:`<b>${esc(r.by||"Something")}</b> hurts you${r.t?` (${esc(r.t)})`:""}`}</div>
    <div class="rp-b">${hit.map(p=>`<button type="button" class="btn primary" data-act="preactuse" data-n="${esc(p.n)}" data-s="${esc(p.s||
      "")}">${esc(p.n)}?</button>`).join("")}<button type="button" class="btn" data-act="preactno">No</button></div>`;
  document.body.appendChild(el);try{navigator.vibrate&&navigator.vibrate([120,60,120,60,220])}catch(e){}
  clearTimeout(reactShow.t);reactShow.t=setTimeout(()=>el.remove(),15000)}
const prepKind=item=>{const T=fetArr(item&&item.time);const r=T.find(x=>x&&x.unit==="reaction");return r?REACT_KIND(pcTxt(r.condition||""))||"other":""};
/* personal resources: on this phone only */
const resKey=()=>"res:"+(meName||"").toLowerCase();
const resGet=()=>ls.get(resKey(),[]);
const resSet=v=>ls.set(resKey(),v);
