/* ---- hover cards: a spell, condition, item or creature named in a statblock ---- */
const refCache=new Map();let refCards=[],refT=null;
const SCHOOL={A:"Abjuration",C:"Conjuration",D:"Divination",E:"Enchantment",V:"Evocation",I:"Illusion",N:"Necromancy",T:"Transmutation"};
const ITEM_T={M:"Melee weapon",R:"Ranged weapon",A:"Ammunition",LA:"Light armor",MA:"Medium armor",HA:"Heavy armor",S:"Shield",P:"Potion",RG:"Ring",RD:"Rod",WD:"Wand",ST:"Staff",SC:"Scroll",W:"Wondrous item",G:"Adventuring gear",INS:"Instrument",AT:"Artisan's tools",T:"Tools",SCF:"Spellcasting focus",GS:"Gaming set",MNT:"Mount",VEH:"Vehicle",TAH:"Tack and harness",FD:"Food and drink",TG:"Trade good",$:"Treasure"};
const DMG_T={A:"Acid",B:"Bludgeoning",C:"Cold",F:"Fire",O:"Force",L:"Lightning",N:"Necrotic",P:"Piercing",I:"Poison",Y:"Psychic",R:"Radiant",S:"Slashing",T:"Thunder"};
let refPlainOut=false;   // a card for the tablet or a phone: plain text, no rolls or links
const plainInline=t=>esc(refPlain(t)).replace(/\*\*\*(.+?)\*\*\*/g,"<b><i>$1</i></b>").replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/(^|[^*])\*([^*]+?)\*/g,"$1<i>$2</i>");
function refLines(es,act){return fetEntries(es).map(l=>`<p>${refPlainOut?plainInline(l):sbInline(esc(l),act)}</p>`).join("")}
function spellProps(sp){
  const time=fetArr(sp.time).map(t=>`${t.number} ${t.unit}${t.number>1?"s":""}${t.condition?", "+fetTxt(t.condition):""}`).join(" or ");
  const r=sp.range||{},d=r.distance||{};const range=r.type==="special"?"Special":d.type==="self"?"Self"+(r.type&&r.type!=="point"?` (${d.amount?d.amount+"-foot ":""}${r.type})`:""):d.type==="touch"?"Touch":d.type==="sight"?"Sight":d.type==="unlimited"?"Unlimited":d.amount!=null?`${d.amount} ${d.type}${r.type&&r.type!=="point"?` (${r.type})`:""}`:"";
  const c=sp.components||{};const comp=[c.v?"V":"",c.s?"S":"",c.m?`M (${typeof c.m==="object"?c.m.text:c.m})`:""].filter(Boolean).join(", ");
  const dur=fetArr(sp.duration).map(x=>x.type==="instant"?"Instantaneous":x.type==="permanent"?"Until dispelled":x.type==="special"?"Special":x.duration?`${x.concentration?"Concentration, up to ":""}${x.duration.amount} ${x.duration.type}${x.duration.amount>1?"s":""}`:"").join(" or ");
  return [["Casting Time",time],["Range",range],["Components",comp],["Duration",dur]].filter(x=>x[1]);
}
const REF_TYPE={spell:"Spell",item:"Item",baseitem:"Item",condition:"Condition",status:"Status",disease:"Disease",action:"Action",variantrule:"Rule",sense:"Sense",skill:"Skill",feat:"Feat",optionalfeature:"Feature",background:"Background",race:"Species",trap:"Trap",hazard:"Hazard",creature:"Creature",name:"Names"};
const OPTF={EI:"Eldritch Invocation",MM:"Metamagic","FS:F":"Fighting Style","FS:R":"Fighting Style","FS:P":"Fighting Style","FS:B":"Fighting Style",AI:"Artificer Infusion",MV:"Maneuver","MV:B":"Maneuver",AS:"Arcane Shot",PB:"Pact Boon",ED:"Elemental Discipline",RN:"Rune",AF:"Alchemical Formula"};
function refPrereq(it){
  return fetArr(it.prerequisite).map(p=>[p.level?`Level ${typeof p.level==="object"?p.level.level:p.level}${p.level&&p.level.class?" "+p.level.class.name:""}`:"",
    p.ability?fetArr(p.ability).map(a=>Object.entries(a).map(([k,v])=>`${(FET_AB[k]||k)} ${v}+`).join(" or ")).join(", "):"",
    p.spellcasting||p.spellcasting2020?"Spellcasting":"",p.feat?fetArr(p.feat).map(f=>refPlain(fetTxt(`{@feat ${f}}`))).join(", "):"",
    p.race?fetArr(p.race).map(r=>titleish(r.name||"")).join(" or "):"",p.other||"",p.otherSummary?fetTxt(p.otherSummary.entry||""):""].filter(Boolean).join(", ")).filter(Boolean).join("; ");
}
function raceProps(it){
  const spd=typeof it.speed==="number"?`${it.speed} ft.`:it.speed&&typeof it.speed==="object"?Object.entries(it.speed).filter(([k,v])=>typeof v==="number").map(([k,v])=>`${k==="walk"?"":k+" "}${v} ft.`).join(", "):"";
  const rows=[["Size",fetArr(it.size).map(z=>FET_SIZE[z]||z).join(" or ")],["Speed",spd],["Type",it.creatureTypes?fetArr(it.creatureTypes).map(titleish).join(", "):""],["Darkvision",it.darkvision?it.darkvision+" ft.":""]].filter(x=>x[1]);
  return rows.length?`<div class="rprops">${rows.map(([k,v])=>`<div><b>${k}</b> ${esc(v)}</div>`).join("")}</div>`:"";
}
function refCardHtml(d,plain){refPlainOut=!!plain;try{return refCardHtml0(d)}finally{refPlainOut=false}}
function refCardHtml0(d){
  const it=d.item||{},nm=refPlain(fetTxt(it.name||"")),src=srcName(d.label||it.source||"");let head="",body="";
  if(d.t==="spell"){head=it.level?`Level ${it.level} ${SCHOOL[it.school]||""}`:`${SCHOOL[it.school]||""} Cantrip`;
    body=`<div class="rprops">${spellProps(it).map(([k,v])=>`<div><b>${k}</b> ${refPlainOut?plainInline(v):sbInline(esc(v),nm)}</div>`).join("")}</div>`+refLines(it.entries,nm)+refLines(it.entriesHigherLevel,nm)}
  else if(d.t==="item"||d.t==="baseitem"){const ty=String(it.type||"").split("|")[0];
    head=[ITEM_T[ty]||"",it.rarity&&it.rarity!=="none"?it.rarity:"",it.reqAttune?`requires attunement${typeof it.reqAttune==="string"?" "+it.reqAttune:""}`:""].filter(Boolean).join(", ");
    const w=it.dmg1?`${it.dmg1} ${DMG_T[it.dmgType]||""}${it.dmg2?` (versatile ${it.dmg2})`:""}`:it.ac!=null?`AC ${it.ac}`:"";
    body=(w?`<div class="rprops"><div>${esc(w)}</div></div>`:"")+refLines(it.entries,nm)}
  else if(d.t==="creature"){head="Creature";body=d.html}
  else if(d.t==="name"){head="Name tables · click a name to copy it";   // a few at random from each table
    const pick=(t,n)=>{const L=fetArr(t.table).map(r=>pcTxt(r.result)).filter(Boolean),o=[];for(let i=0;i<40&&o.length<n&&o.length<L.length;i++){const x=L[Math.floor(Math.random()*L.length)];if(!o.includes(x))o.push(x)}return o};
    body=`<div class="nmtabs">${fetArr(it.tables).map(t=>`<div class="nmrow"><b>${esc(pcTxt(t.option))}</b><span>${pick(t,4).map(x=>`<button type="button" class="nmpick" data-act="nmpick" data-v="${esc(x.replace(/\s*\(.*\)$/,""))}">${esc(x)}</button>`).join("")}</span></div>`).join("")}</div>`}
  else{head=(REF_TYPE[d.t]||"")+(d.t==="optionalfeature"&&it.featureType?` · ${fetArr(it.featureType).map(f=>OPTF[f]||f).join(", ")}`:"");
    const pre=refPrereq(it);
    body=(d.t==="action"&&it.time?`<div class="rprops"><div><b>Time</b> ${esc(fetArr(it.time).map(t=>typeof t==="string"?t:`${t.number} ${t.unit}`).join(", "))}</div></div>`:"")
      +(pre?`<div class="rprops"><div><b>Prerequisite</b> ${esc(pre)}</div></div>`:"")
      +(d.t==="race"?raceProps(it):"")+refLines(it.entries||(it.entry?[it.entry]:[]),nm)}
  return `<div class="rhead"><b>${esc(nm)}</b><small>${esc(head)}${src?` · ${esc(src)}`:""}</small></div><div class="rbody">${body||'<p class="psub">No text for this one.</p>'}</div>`;
}
async function refGet(ty,n,src,exact){
  const key=[ty,n,src,exact?"x":""].join("|").toLowerCase();if(refCache.has(key))return refCache.get(key);let d=null;
  if(served&&fetInfo&&fetInfo.state==="ready"){
    try{if(ty==="creature"){const r=await fetch(`/5et/monster?n=${encodeURIComponent(n)}&s=${encodeURIComponent(src)}`);if(r.ok){const resp=await r.json();const m=fetResolve(resp);d={t:"creature",item:{name:m.name},label:resp.label,html:sbRender(fetToMd(m))}}}
      else{const r=await fetch(`/5et/ref?t=${encodeURIComponent(ty)}&n=${encodeURIComponent(n)}&s=${encodeURIComponent(src)}${exact?"&x=1":""}`);if(r.ok)d=await r.json()}}catch(e){}}
  else if(ty==="spell"&&MODE==="player"&&served){try{const r=await fetch(`/spell?n=${encodeURIComponent(n)}&s=${encodeURIComponent(src||"")}`);if(r.ok)d=await r.json()}catch(e){}}   // phones may read spells, nothing else
  if(!d&&(ty==="condition"||ty==="status")){const R=RULES[slug(n)];if(R)d={t:"condition",item:{name:R.t,entries:R.d.map(x=>x)},label:""}}   // the app's own short rules
  refCache.set(key,d);return d;
}
async function refOpen(el,pin){
  const lvl=el.closest(".refcard")?Number(el.closest(".refcard").dataset.l)+1:0;
  refClose(lvl);const d=await refGet(el.dataset.rt,el.dataset.rn,el.dataset.rs);
  if(!d||!el.isConnected){if(!d&&pin)toast("Nothing to show for that");return}
  refClose(lvl);measureCovered();const c=document.createElement("div");c.className="refcard"+(pin?" pinned":"");c.dataset.l=lvl;c.innerHTML=refCardHtml(d);document.body.appendChild(c);refCards[lvl]=c;
  const bottom=innerHeight-coveredPx-12,maxH=Math.min(640,bottom-12);c.style.maxHeight=maxH+"px";
  const r=el.getBoundingClientRect(),W=Math.min(400,innerWidth-24);c.style.width=W+"px";const H=Math.min(c.offsetHeight,maxH);
  let x=r.left-W-12;if(x<12)x=Math.min(innerWidth-W-12,r.right+12);let y=Math.max(12,Math.min(r.top-20,bottom-H));
  if(el.closest("#sbDrawer")&&x+W>innerWidth-12){x=12}
  Object.assign(c.style,{left:x+"px",top:y+"px",width:W+"px"});
  if(d.t==="spell"&&MODE==="dm"&&d.item){   // a spell in a statblock: that monster casts it
    const by=el.closest("#sbDrawer")&&sbViewId&&byId(sbViewId)?sbViewId:"";
    c.insertAdjacentHTML("beforeend",`<div class="refacts"><button type="button" class="btn sm" data-act="refcast" data-n="${esc(d.item.name)}" data-s="${esc(d.item.source||"")}" data-by="${esc(by)}">${ic("spark")} Cast as an effect${by?` · ${esc(byId(by).name)}`:""}</button></div>`)}
}
/* the browser window can be taller than what's visible (full screen with the taskbar on top, or a window
   reaching under it); the hidden strip at the bottom is measured so cards and panels stay above it */
let coveredPx=0;
function measureCovered(){
  let h=0;
  try{const scale=window.outerWidth/window.innerWidth;   // page zoom: screen sizes are in unzoomed pixels
    if(scale>0.3&&scale<4){const chromeTop=Math.max(0,window.outerHeight-window.innerHeight*scale);
      const visibleBottom=((screen.availTop||0)+screen.availHeight-(window.screenY||0)-chromeTop)/scale;
      h=Math.round(window.innerHeight-visibleBottom);if(!(h>0&&h<260))h=0}}catch(e){h=0}
  if(h!==coveredPx){coveredPx=h;document.documentElement.style.setProperty("--covered",h+"px")}
}
if(MODE==="dm"){measureCovered();addEventListener("resize",measureCovered);setInterval(measureCovered,1500)}
function refClose(from){for(let i=refCards.length-1;i>=from;i--){if(refCards[i])refCards[i].remove();refCards.length=i}}
function refInside(n){return n&&n.closest&&(n.closest(".refcard")||n.closest(".ref"))}
document.addEventListener("mouseover",e=>{if(MODE!=="dm")return;const el=e.target.closest&&e.target.closest(".ref");
  if(el){clearTimeout(refT);if(el._open)return;refT=setTimeout(()=>{el._open=true;refOpen(el,false).finally(()=>{el._open=false})},140);return}
  const card=e.target.closest&&e.target.closest(".refcard");if(card){clearTimeout(refT);return}});
document.addEventListener("mouseout",e=>{if(MODE!=="dm")return;if(!refInside(e.target))return;if(refInside(e.relatedTarget))return;
  clearTimeout(refT);refT=setTimeout(()=>{const keep=refCards.findIndex(c=>c&&c.classList.contains("pinned"));refClose(keep<0?0:keep+1)},320)});
document.addEventListener("click",e=>{if(MODE!=="dm")return;const el=e.target.closest(".ref");
  if(el){e.preventDefault();clearTimeout(refT);refOpen(el,true);return}
  if(!e.target.closest(".refcard"))refClose(0)},true);
