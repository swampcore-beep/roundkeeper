/* ---------- 79: the character sheet. The player fills it in on the phone (or the DM on the laptop); it's kept on the laptop,
   the DM sees it like a statblock, and the phone rolls with the real bonuses. Paper players never need it. ---------- */
const SH_AB=["str","dex","con","int","wis","cha"],SH_AB3={str:"STR",dex:"DEX",con:"CON",int:"INT",wis:"WIS",cha:"CHA"},SH_ABN={str:"Strength",dex:"Dexterity",
  con:"Constitution",int:"Intelligence",wis:"Wisdom",cha:"Charisma"};
const SH_SK=[["acrobatics","Acrobatics","dex"],["animal handling","Animal Handling","wis"],["arcana","Arcana","int"],["athletics","Athletics","str"],
  ["deception","Deception","cha"],["history","History","int"],["insight","Insight","wis"],["intimidation","Intimidation","cha"],["investigation",
  "Investigation","int"],["medicine","Medicine","wis"],["nature","Nature","int"],["perception","Perception","wis"],["performance","Performance","cha"],
  ["persuasion","Persuasion","cha"],["religion","Religion","int"],["sleight of hand","Sleight of Hand","dex"],["stealth","Stealth","dex"],["survival",
  "Survival","wis"]];
const SH_CLS_SV={barbarian:["str","con"],bard:["dex","cha"],cleric:["wis","cha"],druid:["int","wis"],fighter:["str","con"],monk:["str","dex"],paladin:["wis",
  "cha"],ranger:["str","dex"],rogue:["dex","int"],sorcerer:["con","cha"],warlock:["wis","cha"],wizard:["int","wis"],artificer:["con","int"]};
const SH_CLS_SA={bard:"cha",cleric:"wis",druid:"wis",paladin:"cha",ranger:"wis",sorcerer:"cha",warlock:"cha",wizard:"int",artificer:"int"};
const shMod=v=>Math.floor(((Number(v)||10)-10)/2),shS=n=>(n>=0?"+":"−")+Math.abs(n);
function shBlank(name){return {name:name||"",cls:"",sub:"",lvl:1,species:"",bg:"",size:"M",ac:10,hp:0,speed:30,init:null,prof:null,ab:{str:10,dex:10,
  con:10,int:10,
  wis:10,cha:10},sv:[],sk:{},sa:"",att:[],feats:[],spells:null,v:0,by:""}}
/* 1.5: feats. The choices (ability scores, saves, skills, expertise) come from the structured fields of the DM's 5e.tools files; a few feats change
   numbers only in their text, so their rules are here by name (edition by book). What a feat changes in numbers the player types (scores, saves,
   skills, speed, max HP) is applied once when it's added ("Add and apply"), or not at all when the sheet already counts it ("Add only"); what the
   app works out itself (initiative from Dex, passives, advantage on Concentration and death saves) it adds by itself. */
const FEAT_FX={"alert|2024":{initPB:1},"alert|2014":{init:5},"tough":{hpLvl:2},"speedy":{speed:10},"mobile|2014":{speed:10},"boon of speed":{speed:30},
  "observant|2014":{pass5:1},"war caster":{concAdv:1},"durable|2024":{dsAdv:1}};
const featEd=s=>s==="PHB"||s==="XGE"||s==="TCE"?"2014":"2024";
const featRule=f=>{const n=String(f.n||"").toLowerCase();return FEAT_FX[n+"|"+featEd(f.s||"")]||FEAT_FX[n]||null};
function shFeatFx(sh){const o={};(sh&&sh.feats||[]).forEach(f=>{const r=featRule(f);
  if(r)Object.keys(r).forEach(k=>{if(k==="init"||k==="speed")o[k]=(o[k]||0)+r[k];
  else if(r[k])o[k]=1})});return o}
const SH_SKN=k=>(SH_SK.find(x=>x[0]===k)||[k,k])[1];
/* what a feat lets you choose, from its 5e.tools entry */
function featChoices(item){const out={ab:[],sv:null,sk:null,exp:0};if(!item)return out;
  (item.ability||[]).forEach(a=>{const fixed=Object.keys(a).filter(k=>SH_AB.includes(k));
    if(fixed.length){out.ab.push({fixed:Object.fromEntries(fixed.map(k=>[k,a[k]])),
    max:a.max||20});return}const c=a.choose;if(c&&Array.isArray(c.from))out.ab.push({from:c.from.filter(k=>SH_AB.includes(k)),amount:c.amount||1,
      count:c.count||1,
    max:a.max||20})});
  (item.savingThrowProficiencies||[]).forEach(s=>{if(s.choose&&s.choose.from)out.sv={from:s.choose.from,count:s.choose.count||1};
    else{const k=Object.keys(s).filter(x=>
    SH_AB.includes(x));if(k.length)out.sv={fixed:k}}});
  const sks=SH_SK.map(x=>x[0]);(item.skillProficiencies||[]).forEach(s=>{if(s.choose&&s.choose.from)out.sk={from:s.choose.from.filter(k=>sks.includes(k)),
    count:s.choose.count||1};else if(s.any)out.sk={from:sks,count:s.any};else{const k=Object.keys(s).filter(x=>sks.includes(x));if(k.length)out.sk={fixed:k}}});
  (item.skillToolLanguageProficiencies||[]).forEach(s=>(s.choose||[]).forEach(c=>{if((c.from||[]).includes("anySkill"))out.sk={from:sks,count:c.count||1,
    orTool:1}}));
  (item.expertise||[]).forEach(e=>{if(e.anyProficientSkill)out.exp=e.anyProficientSkill;else{const k=Object.keys(e).filter(x=>sks.includes(x));
    if(k.length)out.expFixed=k}});
  return out}
/* the changes a feat makes once, from the choices made */
function featChanges(f,sh){const ch={},C=shCalc(sh),r=featRule(f);
  if(f.pick&&f.pick.ab)ch.ab=f.pick.ab;if(f.pick&&f.pick.sv&&f.pick.sv.length)ch.sv=f.pick.sv.filter(a=>!(sh.sv||[]).includes(a));
  if(f.pick&&f.pick.sk&&f.pick.sk.length)ch.sk=f.pick.sk.filter(k=>!Number((sh.sk||{})[k]));if(f.pick&&f.pick.exp&&f.pick.exp.length)ch.exp=f.pick.exp;
  if(r&&r.speed)ch.speed=r.speed;if(r&&r.hpLvl)ch.hp=r.hpLvl*C.lvl;return ch}
function featLines(f,sh,ch){const L=[],r=featRule(f);ch=ch||f.ch||{};
  Object.entries(ch.ab||{}).forEach(([a,n])=>L.push(`${SH_AB3[a]} +${n}`));(ch.sv||[]).forEach(a=>L.push(`${SH_AB3[a]} save`));
    (ch.sk||[]).forEach(k=>L.push(SH_SKN(k)));
  (ch.exp||[]).forEach(k=>L.push(`${SH_SKN(k)} expertise`));if(ch.speed)L.push(`Speed +${ch.speed} ft`);if(ch.hp)L.push(`HP +${ch.hp}`);
  if(r&&r.initPB)L.push("+proficiency to Initiative");if(r&&r.init)L.push(`Initiative +${r.init}`);
    if(r&&r.pass5)L.push("+5 passive Perception and Investigation");
  if(r&&r.concAdv)L.push("advantage on Concentration");if(r&&r.dsAdv)L.push("advantage on death saves");return L}
function featApply(sh,ch,sign){const s=sign||1;
  Object.entries(ch.ab||{}).forEach(([a,n])=>{sh.ab[a]=Math.max(1,Math.min(30,(Number(sh.ab[a])||10)+s*n))});
  (ch.sv||[]).forEach(a=>{sh.sv=s>0?[...new Set((sh.sv||[]).concat([a]))]:(sh.sv||[]).filter(x=>x!==a)});
  (ch.sk||[]).forEach(k=>{sh.sk=sh.sk||{};if(s>0)sh.sk[k]=Math.max(1,Number(sh.sk[k])||0);else if(Number(sh.sk[k])===1)delete sh.sk[k]});
  (ch.exp||[]).forEach(k=>{sh.sk=sh.sk||{};if(s>0)sh.sk[k]=2;else if(Number(sh.sk[k])===2)sh.sk[k]=1});
  if(ch.speed)sh.speed=Math.max(0,(Number(sh.speed)||30)+s*ch.speed);if(ch.hp)sh.hp=Math.max(0,(Number(sh.hp)||0)+s*ch.hp)}
/* 1.5: the class without its level, the subclass (its own field, or "Wizard 5 (Evoker)"), and the size */
const shClsName=sh=>String(sh&&sh.cls||"").replace(/\([^)]*\)/g,"").replace(/\b\d{1,2}\b/g,"").replace(/\s+/g," ").trim();
const shSub=sh=>String(sh&&sh.sub||"").trim()||((String(sh&&sh.cls||"").match(/\(([^)]+)\)/)||[])[1]||"").trim();
const SH_SIZE={T:"Tiny",S:"Small",M:"Medium",L:"Large"};
/* 1.5: the notes on a weapon from the 5e.tools files (properties and mastery); the SRD has no weapon properties, so without them the player types it */
const SH_PROP={V:"Versatile",T:"Thrown",F:"Finesse",L:"Light",H:"Heavy","2H":"Two-handed",R:"Reach",A:"Ammunition",LD:"Loading",S:"Special"};
async function shWeaponNote(name){
  try{const r=await fetch("/pcref?t=baseitem&n="+encodeURIComponent(name),{cache:"no-store"});if(!r.ok)return "";const it=(await r.json()).item||{},out=[];
    (it.property||[]).forEach(p=>{const k=String(p.uid||p).split("|")[0],l=SH_PROP[k];if(!l)return;
      out.push(k==="V"&&it.dmg2?`Versatile (${it.dmg2})`:(k==="T"||k==="A")&&it.range?`${l} ${it.range} ft`:l)});
    (it.mastery||[]).forEach(m=>out.push(String(m.uid||m).split("|")[0]));return out.join(" · ")}catch(e){return ""}}
function shCalc(sh){
  const lvl=Math.max(1,Math.min(20,Number(sh.lvl)||1)),pb=sh.prof!=null?Number(sh.prof):2+Math.floor((lvl-1)/4),m={};
    SH_AB.forEach(a=>m[a]=shMod((sh.ab||{})[a]));
  const sv={},sk={};SH_AB.forEach(a=>sv[a]=m[a]+((sh.sv||[]).includes(a)?pb:0));SH_SK.forEach(([k,,a])=>sk[k]=m[a]+pb*(Number((sh.sk||{})[k])||0));
  const sa=sh.sa||"",fx=shFeatFx(sh);
  return {lvl,pb,m,sv,sk,init:sh.init!=null?Number(sh.init):m.dex+(fx.initPB?pb:0)+(fx.init||0),pp:10+sk.perception+(fx.pass5?5:0),pi:10+sk.insight,
    pv:10+sk.investigation+(fx.pass5?5:0),dc:sh.dc!=null?Number(sh.dc):sa?8+pb+m[sa]:null,atk:sh.atk!=null?Number(sh.atk):sa?pb+m[sa]:null,
    concAdv:!!fx.concAdv,dsAdv:!!fx.dsAdv,fx}}
const shAvg=e=>{const x=String(e||"").replace(/\s/g,"").match(/^(\d+)d(\d+)([+-]\d+)?$/i);return x?Math.floor(+x[1]*(+x[2]+1)/2)+(+x[3]||0):null};
/* the sheet as a statblock in the DM's drawer: the same clickable bonuses and damage as a monster's */
function shMd(sh,name){const C=shCalc(sh),L=[];
  L.push(`## ${name||sh.name||"Character"}`,`*${[sh.cls||"",sh.sub&&!/\(/.test(sh.cls||"")?sh.sub:"",sh.species||"",sh.bg||""].filter(Boolean).join(" · ")||
    "Player character"}*`,"",`**Armor Class** ${sh.ac||
    10}`,`**Hit Points** ${sh.hp||"—"}`,`**Speed** ${sh.speed||30} ft.`,`**Initiative** ${shS(C.init)} · **Proficiency** ${shS(C.pb)}`,"",
    "| STR | DEX | CON | INT | WIS | CHA |","|:---:|:---:|:---:|:---:|:---:|:---:|","| "+SH_AB.map(a=>`${(sh.ab||{})[a]||10} (${C.m[a]>=0?"+":
      ""}${C.m[a]})`).join(" | ")+" |","");
  const svs=SH_AB.filter(a=>(sh.sv||[]).includes(a));if(svs.length)L.push(`**Saving Throws** ${svs.map(a=>`${SH_AB3[a][0]+
    SH_AB3[a].slice(1).toLowerCase()} ${C.sv[a]>=0?"+":""}${C.sv[a]}`).join(", ")}`);
  const sks=SH_SK.filter(([k])=>Number((sh.sk||{})[k]));if(sks.length)L.push(`**Skills** ${sks.map(([k,l])=>`${l} ${C.sk[k]>=0?"+":
    ""}${C.sk[k]}${Number(sh.sk[k])===2?" (expertise)":""}`).join(", ")}`);
  L.push(`**Senses** Passive Perception ${C.pp}, Passive Insight ${C.pi}, Passive Investigation ${C.pv}`);
  if(sh.sa)L.push(`**Spellcasting** ${SH_ABN[sh.sa]}, spell save DC ${C.dc}, ${C.atk>=0?"+":""}${C.atk} to hit with spell attacks`);
  const at=(sh.att||[]).filter(a=>a&&a.n);if(at.length){L.push("","### Attacks");
    at.forEach(a=>{const dm=String(a.dmg||"").trim(),m=dm.match(/^(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*(.*)$/i),av=m&&shAvg(m[1]);
    L.push(`***${a.n}.*** *Attack:* ${Number(a.hit)>=0?"+":""}${Number(a.hit)||0} to hit.${dm?` *Hit:* ${m&&av!=null?`${av} (${m[1].replace(/\s/g,
      "").replace(/([+-])/," $1 ")})${m[2]?" "+m[2]:""} damage`:esc(dm)}.`:""}${a.note?` ${esc(a.note)}.`:""}`)})}
  const sp=sh.spells;if(sp&&((sp.prep||[]).length||(sp.alw||[]).length)){L.push("","### Spells");
    if((sp.alw||[]).length)L.push(`**Always prepared:** ${sp.alw.map(([n,f])=>`*${n}* (${f})`).join(", ")}`);
    if((sp.prep||[]).length)L.push(`**Prepared:** ${sp.prep.map(n=>`*${n}*`).join(", ")}`)}
  return L.join("\n")}
/* reading a pasted sheet (D&D Beyond, a PDF, notes): what it finds, the player checks */
function shParse(text,base){
  const t=String(text||""),sh=Object.assign(shBlank(),JSON.parse(JSON.stringify(base||{}))),found=[],guess=[];
  const num=re=>{const m=t.match(re);return m?Number(m[1]):null};
  const ac=num(/(?:Armou?r\s*Class|\bAC)\s*[:=]?\s*(\d{1,2})/i),hp=num(/(?:Hit\s*Points|\bHP)(?:\s*max(?:imum)?)?\s*[:=]?\s*(\d{1,3})/i),
    sp=num(/Speed\s*[:=]?\s*(\d{2,3})/i);
  if(ac)sh.ac=ac;if(hp)sh.hp=hp;if(sp)sh.speed=sp;if(ac||hp||sp)found.push([ac,hp,sp].some(v=>v==null)?[ac&&"AC "+ac,hp&&"HP "+hp,sp&&"Speed "+sp+
    " ft"].filter(Boolean).join(" · "):`AC ${ac} · HP ${hp} · Speed ${sp} ft`);
  let nAb=0;SH_AB.forEach(a=>{const m=t.match(new RegExp(`\\b(?:${SH_AB3[a]}|${SH_ABN[a]})\\b\\s*[:=]?\\s*(\\d{1,2})\\b`,"i"));
    if(m&&+m[1]>=1&&+m[1]<=30){sh.ab[a]=+m[1];nAb++}});
  if(nAb)found.push(nAb===6?"Six ability scores":`${nAb} ability scores`);
  const cm=t.match(/\b(Barbarian|Bard|Cleric|Druid|Fighter|Monk|Paladin|Ranger|Rogue|Sorcerer|Warlock|Wizard|Artificer)\s+(\d{1,2})\b/i);
  if(cm){sh.lvl=Math.min(20,+cm[2]);if(!sh.cls)sh.cls=cm[1][0].toUpperCase()+cm[1].slice(1).toLowerCase()+" "+cm[2];const k=cm[1].toLowerCase();
    if(!sh.sa&&SH_CLS_SA[k])sh.sa=SH_CLS_SA[k];found.push(`${cm[1]} ${cm[2]}`)}
  const C0=shCalc(sh);
  const svl=t.match(/Saving\s*Throws?\s*[:]?\s*([^\n]+)/i);if(svl){const got=[];
    SH_AB.forEach(a=>{const m=svl[1].match(new RegExp(`\\b(?:${SH_AB3[a]}|${SH_ABN[a]})\\w*\\s*([+-−]\\s*\\d+)`,"i"));
    if(m){const b=Number(m[1].replace("−","-").replace(/\s/g,""));if(b>C0.m[a]){got.push(a)}}});if(got.length){sh.sv=got;
    found.push("Saves: "+got.map(a=>SH_AB3[a][0]+SH_AB3[a].slice(1).toLowerCase()).join(", "))}}
  const skl=t.match(/Skills\s*[:]?\s*([^\n]+(?:\n(?![A-Z][a-z]+ ?[A-Z]?[a-z]*\s*[:]?\s*\d|\s*$)[^\n]+)?)/i);if(skl){const got=[],sk={};
    SH_SK.forEach(([k,l,a])=>{const m=skl[1].match(new RegExp(`\\b${l.replace(/ /g,"\\s+")}\\s*([+-−]\\s*\\d+)`,"i"));
    if(m){const b=Number(m[1].replace("−","-").replace(/\s/g,"")),over=b-C0.m[a];const lv=over>=2*C0.pb?2:over>=C0.pb?1:0;if(lv){sk[k]=lv;got.push(l)}}});
    if(got.length){sh.sk=sk;found.push("Skills: "+got.join(", "))}}
  const atts=[];t.split(/\n/).forEach(line=>{const m=line.match(
    /^\s*([A-Z][A-Za-z' ,()-]{1,40}?)\s*[:,]?\s+([+-])\s?(\d{1,2})(?:\s*to\s*hit)?\s*[,]?\s+(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*([a-z]+)?/);
    if(m&&!/saving|skills|throws/i.test(m[1]))atts.push({n:m[1].trim(),hit:Number(m[2]+m[3]),dmg:m[4].replace(/\s/g,"")+(m[5]?" "+m[5]:"")})});
  if(atts.length){sh.att=atts.slice(0,8);found.push(`${atts.length} attack${atts.length>1?"s":""}: ${atts.map(a=>a.n).join(", ")}`)}
  const dc=num(/spell\s*save\s*DC\s*[:=]?\s*(\d{1,2})/i);
  if(dc){const C=shCalc(sh);if(C.dc!==dc)sh.dc=dc;found.push("Spell save DC "+dc)}else if(sh.sa){
    guess.push(`Spell save DC (not in the text): ${shCalc(sh).dc}, worked out`)}
  const spc=t.match(/\b(Human|Elf|High Elf|Wood Elf|Drow|Dwarf|Halfling|Gnome|Half-Elf|Half-Orc|Orc|Tiefling|Dragonborn|Aasimar|Goliath)\b/);
    if(spc&&!sh.species)sh.species=spc[1];
  {const bg=t.match(/\bBackground\s*[:=]?\s*([A-Z][A-Za-z' -]{2,30}?)\s*(?:\n|$|,|·|\|)/);if(bg){sh.bg=bg[1].trim();found.push("Background: "+sh.bg)}   // 1.5
   const sz=t.match(/\bSize\s*[:=]?\s*(Tiny|Small|Medium|Large)\b/i);if(sz){sh.size=sz[1][0].toUpperCase();found.push("Size: "+SH_SIZE[sh.size])}
   const sb=String(sh.cls||"").match(/\(([^)]+)\)/);if(sb&&!sh.sub)sh.sub=sb[1].trim()}
  return {sh,found,guess}}
/* the phone's copy, and the laptop's */
const shKey=()=>"sheet:"+(meName||"").toLowerCase();
const shLocal=()=>{const v=ls.get(shKey(),null);return v&&typeof v==="object"&&v.ab?v:null};
function shFromProf(me){const prof=profGet(),sh=shBlank(me?me.name:meName),S=statsGet(),hp=hpGet();
  if(prof.cls.length){sh.cls=prof.cls.map(e=>`${e.n} ${e.lvl||1}`).join(" / ");sh.sub=prof.cls.filter(e=>e.sub).map(e=>e.sub.sn||e.sub.n).join(" / ");
    sh.lvl=prof.cls.reduce((a,e)=>a+(e.lvl||1),0);const k=String(prof.cls[0].n||"").toLowerCase();sh.sv=(SH_CLS_SV[k]||[]).slice();sh.sa=SH_CLS_SA[k]||""}
  else if(me&&LABEL[me.cls]){const k=String(me.cls).toLowerCase();sh.cls=LABEL[me.cls];sh.sv=(SH_CLS_SV[k]||[]).slice();sh.sa=SH_CLS_SA[k]||""}
  sh.feats=(prof.feats||[]).filter(f=>f.t==="feat").map(f=>({n:f.n,s:f.s||"",l:f.l||"",ap:false,ch:{}}));   // 1.5: feats picked in Resources, already counted
  if(S.ac)sh.ac=S.ac;if(hp.max)sh.hp=hp.max;return sh}
function shSpells(){return {prep:prepGet().map(p=>p.n).filter(n=>!alwHas(n)),alw:alwNow().map(a=>[a.n.replace(/\b\w/g,c=>c.toUpperCase()),a.from])}}
function shSave(sh,quiet){
  sh.v=Date.now();sh.by="phone";delete sh.only;sh.spells=shSpells();ls.set(shKey(),sh);
  const C=shCalc(sh),hp=hpGet();if(sh.hp&&hp.max!==Number(sh.hp)){hp.max=Number(sh.hp);if(!hp.cur||hp.cur>hp.max)hp.cur=hp.max;hpSet(hp)}
  statsSet({ac:Number(sh.ac)||10,pp:C.pp,pi:C.pi,pv:C.pv,dc:C.dc||0});
  pSend({action:"sheet",sheet:sh}).then(ok=>{if(ok&&!quiet)toast("Saved. The DM can see your sheet")})}
const shTouch=()=>{const sh=shLocal();if(sh)shSave(sh,true)};   // prepared spells changed: the DM's copy follows
let shPullV=null;
function shPull(){   // a sheet the DM sent, or this character's sheet on a new phone
  if(MODE!=="player"||meName==="*"||PREVIEW||!meName)return;const k=meName.toLowerCase(),sv=(state.sheetv||{})[k],loc=shLocal();
  if(!sv||(loc&&loc.v>=sv)||shPullV===sv)return;shPullV=sv;
  fetch("/sheet?n="+encodeURIComponent(k),{cache:"no-store"}).then(r=>r.ok?r.json():null).then(sh=>{if(!sh||!sh.ab)return;const l=shLocal();
    if(l&&l.v>=sh.v)return;
    ls.set(shKey(),sh);toast(sh.by==="dm"?"The DM set up your sheet":"Your sheet is back on this phone",4500);renderPlayer();
      renderPSheet()}).catch(()=>{shPullV=null})}
/* rolling from the sheet */
let shLast=null,shAll=false,shDraft=null,shStep=0,shPaste=null,shAdv="",shCrit=false;
/* 1.4.8: advantage or disadvantage for the next roll from the sheet (it goes back to Normal after the roll) */
const shAdvHtml=()=>`<div class="seg2 shadv" role="group" aria-label="Next roll">${[["dis","Disadvantage"],["","Normal"],["adv","Advantage"]].map(([k,l])=>
  `<button type="button" data-act="shadv" data-v="${k}" aria-pressed="${shAdv===k}">${l}</button>`).join("")}</div>`;
/* 1.4: Bless (+1d4) and Bane (−1d4) on you go onto attack rolls and saving throws by themselves */
function blessAdd(){const me=meChar();if(!me)return {n:0,t:""};const on=n=>state.effects.some(e=>(e.targets||[]).includes(me.id)&&
  String(e.name).toLowerCase()===n);
  let n=0,t="";if(on("bless")){const r=1+Math.floor(Math.random()*4);n+=r;t+=` +${r} Bless`}if(on("bane")){const r=1+Math.floor(Math.random()*4);n-=r;
    t+=` −${r} Bane`}
  return {n,t}}
const blessFor=label=>/\bsave\b|to hit|attack/i.test(label);
function shRoll(label,bonus){
  const bl=blessFor(label)?blessAdd():{n:0,t:""},adv=shAdv;shAdv="";
  const a=1+Math.floor(Math.random()*20),b=1+Math.floor(Math.random()*20),d=adv==="adv"?Math.max(a,b):adv==="dis"?Math.min(a,b):a,ex=myExh(),
    tot=d+bonus-2*ex+bl.n,text=`${label}: d20 ${adv?`${adv==="adv"?"advantage":"disadvantage"} (${a}, ${b})`:`(${d})`} ${shS(bonus)}${bl.t}${ex?
      ` −${2*ex} exhaustion`:""}`;
  if(/to hit|attack/i.test(label))shCrit=d===20;   // a natural 20 on an attack: the next damage is a critical hit
  shLast={label,tot,how:text,n:d===20?"n20":d===1?"n1":""};if(dice.share)pSend({action:"roll",kind:d===20?"nat20":d===1?"nat1":"roll",text,total:tot});
  try{navigator.vibrate&&navigator.vibrate(d===20?[60,40,60,40,200]:d===1?[300]:[60])}catch(e){}return {d,tot,text}}
function shDmg(label,expr){const crit=shCrit,r=sbDice(String(expr).split(" ")[0],crit);if(!r)return;shCrit=false;
  const text=`${label}${crit?" (critical)":""}: ${r.n}d${r.d} [${r.rolls.join(", ")}]${r.add?(r.add>0?" + ":" − ")+Math.abs(r.add):""}`;
  shLast={label,tot:r.tot,how:text,n:""};if(dice.share)pSend({action:"roll",kind:"roll",text,total:r.tot})}
/* what a roll call asks for, in the sheet's terms: "Dexterity save DC 15" → Dex save +2 */
function shAsk(text){const sh=shLocal();if(!sh)return null;const C=shCalc(sh),t=String(text||"").toLowerCase();
  const sk=SH_SK.find(([k])=>t.includes(k));if(sk)return {label:sk[1],b:C.sk[sk[0]]};
  const a=SH_AB.find(x=>new RegExp(`\\b(${SH_ABN[x].toLowerCase()}|${x})\\b`).test(t));if(!a)return null;
  return /sav/.test(t)?{label:`${SH_AB3[a][0]+SH_AB3[a].slice(1).toLowerCase()} save`,b:C.sv[a]}:{label:`${SH_ABN[a]} check`,b:C.m[a]}}
/* the phone: the sheet, and filling it in */
function shViewHtml(me){const sh=shLocal();
  if(!sh)return `<p class="psub">Add your character once: the DM sees it, and your phone rolls with your real bonuses. Players who keep their sheet on paper can skip this.</p>
    <div class="morelist"><button class="btn primary" type="button" data-act="shnew">Fill it in, step by step<br><small style="font-weight:600;opacity:.85">About 3 minutes. Most numbers fill in by themselves.</small></button>
    <button class="btn" type="button" data-act="shpaste">Paste text from my sheet<br><small style="font-weight:600;color:var(--muted)">From D&amp;D Beyond, a PDF or your notes. You check what was found.</small></button></div>`;
  return shView2Html(me,sh)}
/* 1.5: the sheet on the phone, after Encounter+ and the 2024 sheet: a band in the class colour, Main · Spells · Features, and sections that open on Main
   (each shows its numbers when closed; the phone remembers which are open) */
let shTab=ls.get("shTab","main");
const shOpen=()=>Object.assign({ab:true,sk:false,wp:false,rs:false},ls.get("shOpen",{}));
function shView2Html(me,sh){
  const C=shCalc(sh),hp=hpGet(),fk=me&&me.kind==="pc"?frameKey(me):"",sub=shSub(sh),O=shOpen();
  const line1=[shClsName(sh),sub].filter(Boolean).join(" · "),line2=[sh.species,sh.bg,sh.size&&sh.size!=="M"?SH_SIZE[sh.size]:""].filter(Boolean).join(" · ");
  const R=(k,a,inner,cls,lbl)=>`<button type="button" class="${cls||""}" data-act="shroll" data-k="${k}"${a!=null?` data-a="${esc(a)}"`:""}${lbl?
    ` aria-label="${esc(lbl)}"`:
    ""}>${inner}</button>`;
  const head=`<div class="shband"><div class="shbn"><b>${esc(sh.name||me.name)}</b>${line1?`<span class="l1">${esc(line1)}</span>`:""}${line2?
    `<span class="l2">${esc(line2)}</span>`:""}</div><span class="shlvl"><b>${C.lvl}</b><small>LEVEL</small></span></div>
    <nav class="shtabs" aria-label="Sheet sections">${[["main","Main"],["spells","Spells"],["feat","Features"]].map(([k,l])=>
      `<button type="button" data-act="shtab" data-v="${k}" aria-pressed="${shTab===k}">${l}</button>`).join("")}</nav>
    ${shLast?`<div class="dresult ${shLast.n}"><b>${shLast.tot}</b><small>${esc(shLast.how)}</small></div>`:""}`;
  const advRow=`${shAdvHtml()}${
    shCrit?`<div class="shcrit">Natural 20: the next damage is a critical hit (dice doubled) <button type="button" class="linkbtn" data-act="shnocrit">cancel</button></div>`:""}`;
  const sec=(k,title,sum,body)=>`<section class="shsec${O[k]?" open":""}"><button type="button" class="shsech" data-act="shsec" data-s="${
    k}" aria-expanded="${!!O[k]}">
    <span class="t"><b>${title}</b><small>${sum}</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>${O[k]?
    `<div class="shsecb">${body}</div>`:""}</section>`;
  let body="";
  if(shTab==="spells")body=advRow+shSpellsHtml(sh,C);
  else if(shTab==="feat")body=shFeatHtml(me,sh);
  else{
    const sks=SH_SK.map(([k,l,a])=>({k,l,a,lv:Number((sh.sk||{})[k])||0,v:C.sk[k]})),prof=sks.filter(x=>x.lv);
    const at=(sh.att||[]).filter(a=>a&&a.n),R2=resGet(),hdI=R2.findIndex(x=>/^Hit Dice/i.test(x.name));
    body=`<div class="shtop"><span class="shac"><b>${esc(String(sh.ac||10))}</b><small>AC</small></span>
      <button type="button" class="shhp${hp.max&&hp.cur===0?" zero":""}" data-act="php"><small>HIT POINTS</small><span><b>${hp.max?hp.cur:sh.hp||
        "—"}</b>${hp.max?
        `<i>/ ${hp.max}</i>`:""}${hp.temp?`<em>+${hp.temp} temp</em>`:""}</span>${hp.max?
          `<span class="hpbar"><i style="width:${Math.round(100*hp.cur/hp.max)}%"></i></span>`:
        `<small class="psub">Tap to set your HP</small>`}</button></div>
      <div class="shplates">${R("init",null,`<b>${shS(C.init)}</b><small>INITIATIVE</small>`,"shpl",
        "Roll initiative")}<span class="shpl"><b>${esc(String(sh.speed||
        30))} ft</b><small>SPEED</small></span><span class="shpl"><b>${shS(C.pb)}</b><small>PROFICIENCY</small></span><span class="shpl"><b>${
          C.pp}</b><small>PASSIVE PERC.</small></span></div>
      ${advRow}
      ${sec("ab","Abilities and saves",SH_AB.map(a=>`${SH_AB3[a]} ${shS(C.m[a])}`).join(" · "),`<div class="shab6">${SH_AB.map(a=>{const pf=(sh.sv||
        []).includes(a);
        return `<div class="shab1${pf?" pf":""}"><span class="k">${SH_AB3[a]}</span>${R("ab",a,shS(C.m[a]),"m",SH_ABN[a]+
          " check")}<span class="sc">${(sh.ab||{})[a]||
          10}</span>${R("sv",a,`${pf?"● ":""}save ${shS(C.sv[a])}`,"sv",SH_ABN[a]+" save")}</div>`}).join("")}</div>`)}
      ${sec("sk","Skills",prof.length?prof.map(x=>`${x.l} ${shS(x.v)}`).join(" · "):"No proficient skills",`<div class="shsk2">${sks.map(x=>R("sk",x.k,
        `<span class="d">${x.lv===2?"◆":x.lv?"●":"○"}</span><span class="n">${esc(x.l)} <small>${SH_AB3[x.a]}</small></span><b>${shS(x.v)}</b>`,x.lv?"pf":"",
        x.l)).join("")}</div><div class="shpas2"><span>Passive Insight <b>${C.pi}</b></span><span>Passive Investigation <b>${C.pv}</b></span></div>`)}
      ${at.length?sec("wp","Weapons",at.map(a=>`${a.n} ${shS(Number(a.hit)||0)}`).join(" · "),at.map((a,i0)=>{const i=(sh.att||[]).indexOf(a);
        return `<div class="shatk2"><span class="n"><b>${
        esc(a.n)}</b>${a.note?`<small>${esc(a.note)}</small>`:""}</span>${R("hit",null,shS(Number(a.hit)||0),"atk","To hit").replace('data-k="hit"',
          `data-k="hit" data-i="${i}"`)}${
        a.dmg&&sbDice(String(a.dmg).split(" ")[0],false)?R("dmg",null,`<b>${esc(String(a.dmg).split(" ")[0])}</b><small>${esc(String(a.dmg).split(" ").slice(
          1).join(" ")||
        "damage")}</small>`,"dmg","Damage").replace('data-k="dmg"',`data-k="dmg" data-i="${i}"`):""}</div>`}).join("")):""}
      ${hdI>=0||me.insp?sec("rs","Hit Dice and Inspiration",[hdI>=0?`${R2[hdI].note||""} ${R2[hdI].cur} of ${R2[hdI].max} left`.trim():"",me.insp?
        "Heroic Inspiration":""].filter(Boolean).join(" · "),
        `${hdI>=0?shTrackRow(R2[hdI],hdI,"Hit Dice"+(R2[hdI].note?" · "+R2[hdI].note:""),"all back on a long rest"):""}${me.insp?
          `<div class="shtr"><span class="n"><b>★ Heroic Inspiration</b><small>from the DM: reroll any die you just rolled</small></span></div>`:""}`):""}`}
  return `<div class="shv${fk?" fr-"+fk:""}">${head}${body}</div>
    <p class="psub">Rolls are shared with the table when "Share" is on in Roll.</p>
    <div class="hpbtns"><button class="btn" type="button" data-act="shedit">Edit sheet</button><button class="btn" type="button" data-act="shpaste">Paste again…</button></div>`}
/* one tracker as boxes (taps use and give back, as in Resources), or as a pool with − and + when it's big (Lay on Hands) */
function shTrackRow(r,i,label,note){
  const boxes=r.max<=12?`<span class="shbx">${Array.from({length:r.max},(_,k)=>`<button type="button" class="rpip${k<r.cur?" on":
    ""}" data-act="rpip" data-i="${i}" aria-label="${
    esc(label)} ${k+1}${k<r.cur?"":", used"}"></button>`).join("")}</span>`:
      `<span class="shpool"><button type="button" class="btn" data-act="shpool" data-i="${i}" data-d="-1" aria-label="Use one">−</button><b>${
    r.cur}<i> / ${r.max}</i></b><button type="button" class="btn" data-act="shpool" data-i="${i}" data-d="1" aria-label="Get one back">+</button></span>`;
  return `<div class="shtr"><span class="n"><b>${esc(label)}</b>${note?`<small>${esc(note)}</small>`:""}</span>${boxes}</div>`}
const RESET_TXT={long:"back on a long rest",short:"back on a short rest",shortOne:"one back on a short rest, all on a long rest",none:
  "doesn't come back by itself"};
/* the Spells tab: spellcasting numbers, slots as boxes (from the trackers), and the spells by level with casting time, range, C and ◆ */
function shSpellsHtml(sh,C){
  const R2=resGet(),slots=R2.map((r,i)=>({r,i})).filter(x=>/^Spell slot \d|^Pact slots/.test(x.r.name));
  const alw=alwNow?alwNow():[],prep=prepGet?prepGet():[],have=new Map();
  alw.forEach(a=>have.set(a.n.toLowerCase(),{n:a.n.replace(/\b\w/g,c=>c.toUpperCase()),from:a.from,alw:true}));
  prep.forEach(p=>{const k=String(p.n).toLowerCase();if(!have.has(k))have.set(k,{n:p.n,alw:false})});
  if(!have.size&&sh.spells){(sh.spells.alw||[]).forEach(([n,f])=>have.set(n.toLowerCase(),{n,from:f,alw:true}));(sh.spells.prep||[]).forEach(n=>{if(!have.has(
    n.toLowerCase()))have.set(n.toLowerCase(),{n,alw:false})})}
  const L=[...have.values()].map(x=>{const row=spByName&&spByName.get(x.n.toLowerCase());
    return Object.assign(x,{lv:row?row[1]:99,c:row?!!row[2]:false,t:row&&row[12]||"",
    r:row&&row[13]||"",s:row?row[7]:"",row})}).sort((a,b)=>a.lv-b.lv||a.n.localeCompare(b.n));
  const lvName=l=>l===0?"Cantrips":l===99?"Other":`Level ${l}`,groups=[...new Set(L.map(x=>x.lv))];
  const nPrep=L.filter(x=>!x.alw&&x.lv>0).length;
  return `${sh.sa?`<div class="shplates">${[["ABILITY",SH_AB3[sh.sa]],["MODIFIER",shS(C.m[sh.sa])],["SAVE DC",String(C.dc)]].map(([k,v])=>
    `<span class="shpl"><b>${
    v}</b><small>${k}</small></span>`).join("")}<button type="button" class="shpl" data-act="shroll" data-k="spatk" aria-label="Roll a spell attack"><b>${shS(
      C.atk)}</b><small>SPELL ATTACK</small></button></div>`:
    `<p class="psub">No spellcasting on this sheet. Edit sheet → Spells and attacks sets it.</p>`}
    ${slots.length?`<div class="shcard"><div class="shcardh">Spell slots</div>${slots.map(x=>shTrackRow(x.r,x.i,x.r.name.replace(/^Spell slot (\d)$/,(m,n)=>
      `Level ${n}`)+(x.r.note?" · "+x.r.note:""),"")).join("")}<p class="psub">Tap a full box to spend a slot, an empty one to get it back.</p></div>`:""}
    ${L.length?`<p class="psub">${nPrep?`Prepared ${nPrep}`:""}${nPrep?" · ":""}◆ always prepared · C Concentration · tap a spell to read it</p>${groups.map(g=>
      `<div class="shcard"><div class="shsph"><span>${lvName(g)}</span><span>Time</span><span>Range</span></div>${L.filter(x=>x.lv===g).map(x=>
        `<button type="button" class="shsp" data-act="pbookopen" data-n="${
        esc(x.row?x.row[0]:x.n)}" data-s="${esc(x.s||"")}" data-from="sheet"><span class="n">${x.alw?`<i class="alw" title="Always prepared${x.from?": "+
          esc(x.from):""}">◆</i>`:
        ""}<b>${esc(x.n)}</b>${x.c?`<i class="c" title="Concentration">C</i>`:
          ""}</span><span>${esc(x.t)}</span><span>${esc(x.r)}</span></button>`).join("")}</div>`).join("")}`:
      `<p class="psub">No spells yet. Pick them in Spells on the phone, and they show here.</p>`}`}
/* the Features tab: the class and subclass features up to your level (from the 5e.tools files), feats, and the trackers that aren't slots or Hit Dice */
function shFeatHtml(me,sh){
  const R2=resGet(),tr=R2.map((r,i)=>({r,i})).filter(x=>!/^Spell slot \d|^Pact slots|^Hit Dice/i.test(x.r.name)),prof=profGet();
  const rows=[];prof.cls.forEach(e=>{const c=pcClass(e);if(!c)return;const lvl=e.lvl||1,sub=e.sub?pcSubs(c).find(x=>x.n===e.sub.n&&x.s===e.sub.s):null;
    const cf=(c.cf||[]).filter(([,l])=>l<=lvl).map(([n,l])=>({n,l,k:"c"})),sf=sub?(sub.sf||[]).filter(([,l])=>l<=lvl).map(([n,l])=>({n,l,k:"s"})):[];
    rows.push({t:`${c.n} ${lvl}${sub?" · "+(sub.sn||sub.n):""}`,f:cf.concat(sf).sort((a,b)=>a.l-b.l)})});
  const seen=new Set();
  return `${tr.length?`<div class="shcard"><div class="shcardh">Features you track</div>${tr.map(x=>shTrackRow(x.r,x.i,x.r.name,RESET_TXT[x.r.reset||"long"]||
    "")).join("")}</div>`:""}
    ${rows.length?rows.map(r=>`<div class="shcard"><div class="shcardh">${esc(r.t)}</div><div class="shfeat">${r.f.filter(x=>{const k=x.n.toLowerCase();
      if(seen.has(k))return false;
      seen.add(k);return !/^ability score improvement$|^subclass feature$|^epic boon$/i.test(x.n)}).map(x=>
        `<span><b>${esc(x.n)}</b><small>${x.l}</small></span>`).join("")}</div></div>`).join(""):
      `<p class="psub">${pcData?"Pick your class in Resources and its features show here.":
        "Class features come from the DM's 5e.tools files on the laptop; the built-in SRD doesn't include classes."}</p>`}
    ${(()=>{const sf=sh.feats||[],other=(prof.feats||[]).filter(f=>!sf.some(x=>x.n===f.n));
      return sf.length||other.length?`<div class="shcard"><div class="shcardh">Feats and options</div><div class="shfeat">${
      sf.map(f=>{const L=featLines(f,sh);return `<span><b>${esc(f.n)}</b><small>${esc(L.join(" · "))}</small></span>`}).join("")}${other.map(f=>
        `<span><b>${esc(f.n)}</b></span>`).join(
      "")}</div></div>`:""})()}`}
const SH_STEPS=["Basics","Abilities and saves","Skills","Feats","Spells and attacks","Check and save"];
function shStepHtml(){const st=shStep;
  return `<div class="shsteps">${SH_STEPS.map((x,i)=>`<i class="${i<st?"done":i===st?"on":""}"></i>`).join("")}</div><div class="eyebrow2">Step ${st+
    1} of ${SH_STEPS.length} · ${SH_STEPS[st]}</div>`+shStepBody(st)
    +`<div class="hpbtns">${st?`<button class="btn" type="button" data-act="shstep" data-d="-1">Back</button>`:
      `<button class="btn" type="button" data-act="shcancel">Later</button>`}${st<SH_STEPS.length-1?
      `<button class="btn primary" type="button" data-act="shstep" data-d="1">Next: ${SH_STEPS[st+1].toLowerCase()}</button>`:
      `<button class="btn primary" type="button" data-act="shdone">Save my sheet</button>`}</div>`}
function shStepBody(st){const d=shDraft,C=shCalc(d);
  const num=(k,label,v,step,sub)=>`<div class="shnum"><span>${label}</span><div><button type="button" class="btn" data-act="shnum" data-k="${k}" data-d="-${
    step||1}">−</button><b>${v}</b><button type="button" class="btn" data-act="shnum" data-k="${k}" data-d="${step||1}">+</button></div>${sub?
    `<small>${sub}</small>`:""}</div>`;
  const txt=(id,label,v,ph)=>`<label class="shfl">${label}<input class="field" id="${
    id}" type="text" data-kb="text" inputmode="none" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${esc(v||
    "")}" placeholder="${esc(ph||"")}"></label>`;
  let h="";
  if(st===0)h+=txt("sh_cls","Class and level",d.cls,"Wizard 5")+txt("sh_sub","Subclass",d.sub,shSub(d)||"Evoker")+txt("sh_species","Species",d.species,
    "High Elf")+txt("sh_bg","Background",d.bg,"Sage")+`<div class="shfl">Size<div class="seg2 shsize">${["S","M","L"].map(k=>
      `<button type="button" data-act="shsize" data-v="${
    k}" aria-pressed="${(d.size||"M")===k}">${SH_SIZE[k]}</button>`).join("")}</div></div><div class="shgrid">${num("lvl",
    "Level",d.lvl)}${num("ac","AC",d.ac)}${num("hp","HP max",d.hp||0,1)}${num("speed","Speed",d.speed,5)}${num("init","Initiative",shS(C.init),1,d.init==null?
    "✓ from Dex":"set by hand")}${num("prof","Proficiency",shS(C.pb),1,d.prof==null?`✓ from level ${C.lvl}`:"set by hand")}</div>
    ${MODE==="dm"?"":`<label class="chk"><input type="checkbox" id="pHpShare" ${phpOn()?"checked":""}> Share my HP with the DM (only the DM sees it)</label>`}`;
  else if(st===1)h+=`<p class="psub" style="margin:0">Set the six scores. Tap <b>Save</b> on the ones you're proficient in.</p><div class="shabg">${SH_AB.map(
    a=>`<div class="shab"><span class="k">${SH_AB3[a]}</span><span class="m">${shS(C.m[
    a])}</span><span class="sc"><button type="button" data-act="shab" data-a="${a}" data-d="-1">−</button><b>${d.ab[
    a]}</b><button type="button" data-act="shab" data-a="${a}" data-d="1">+</button></span><button type="button" class="sv${d.sv.includes(a)?" on":
    ""}" data-act="shsv" data-a="${a}">Save ${shS(C.sv[a])}</button></div>`).join("")}</div>
    <p class="psub" style="margin:0">Saves and skills add your proficiency (${shS(C.pb)}) by themselves.</p>`;
  else if(st===2)h+=`<div class="shpas"><div><small>Passive Perception</small><b>${C.pp}</b></div><div><small>Insight</small><b>${
    C.pi}</b></div><div><small>Investigation</small><b>${C.pv}</b></div></div>
    <div>${SH_SK.map(([k,l,a])=>{const v=Number(d.sk[k])||0;return `<div class="shsk"><span>${l}<small>${SH_AB3[a]}</small></span><span class="tri">${[["0",
      "—"],["1","Prof"],["2","Exp"]].map(([x,y])=>`<button type="button" class="${String(v)===x?"on":
      ""}" data-act="shsk" data-k="${esc(k)}" data-v="${x}">${y}</button>`).join("")}</span><b>${shS(C.sk[k])}</b></div>`}).join("")}</div>`;
  else if(st===3)h+=shFeatStepHtml(d);
  else if(st===4)h+=`<div class="eyebrow2">Spellcasting</div><div class="seg2">${[["","None"],["int","Int"],["wis","Wis"],["cha","Cha"]].map(([k,l])=>
    `<button type="button" data-act="shsa" data-v="${k}" aria-pressed="${(d.sa||"")===k}">${l}</button>`).join("")}</div>
    ${d.sa?`<div class="shbig2"><div><small>Spell save DC</small><b>${C.dc}</b></div><div><small>Spell attack</small><b>${shS(
      C.atk)}</b></div></div><span class="shauto">✓ 8 + proficiency + ${SH_ABN[d.sa]}</span>`:""}
    <div class="eyebrow2" style="margin-top:6px">Attacks</div>
    ${d.att.map((a,i)=>`<div class="shatked">${txt("sh_an_"+i,"Name",a.n,"Longsword")}<div class="shatkrow">${num("hit:"+i,"To hit",shS(Number(a.hit)||
      0))}${txt("sh_ad_"+i,"Damage",a.dmg,"1d8+3 slashing")}<button type="button" class="icon-btn" data-act="shattdel" data-i="${i}" aria-label="Remove">${
      I.x}</button></div>${txt("sh_ao_"+i,"Notes",a.note,"Versatile (1d10) · Sap")}</div>`).join("")}
    <button class="btn" type="button" data-act="shattadd">+ Add an attack</button>${d.sa?
      `<p class="psub" style="margin:0">Your prepared spells from Spells are linked to the sheet by themselves.</p>`:""}`;
  else h+=`<div class="shstat"><div><small>AC</small><b>${d.ac}</b></div><div><small>HP</small><b>${d.hp||
    "—"}</b></div><div><small>INIT</small><b>${shS(C.init)}</b></div><div><small>SPEED</small><b>${d.speed}</b></div></div>
    <div class="shsum">${esc(d.cls||"No class")} · ${SH_AB.map(a=>`${SH_AB3[a]} ${d.ab[a]}`).join(" · ")}<br>Saves: ${d.sv.map(a=>SH_AB3[a]).join(", ")||
      "none"} · Skills: ${SH_SK.filter(([k])=>Number(d.sk[k])).map(x=>x[1]).join(", ")||"none"}<br>Passive Perception ${C.pp}${d.sa?` · Spell DC ${C.dc}`:
      ""} · ${d.att.filter(a=>a.n).length} attacks${(d.feats||[]).length?` · Feats: ${d.feats.map(f=>esc(f.n)).join(", ")}`:""}</div>`;
  return h}
/* a feat added on the phone also goes to the class setup in Resources, so its uses become trackers and its spells are always prepared */
function shFeatToPhone(rec,item){const prof=profGet();if(!(prof.feats||[]).some(f=>f.n===rec.n&&f.s===rec.s)){prof.feats=(prof.feats||[]).concat([{t:"feat",n:
  rec.n,s:rec.s,
  l:rec.l||"",u:pcUses(item)}]);profSet(prof)}
  const have=new Set(resGet().map(r=>r.name.toLowerCase())),C=shCalc(shDraft||shBlank("")),add=[];   // its uses, counted from this sheet (level, modifiers)
  pcUses(item).forEach(u=>{const mx=typeof u.max==="number"?u.max:u.max==="pb"?C.pb:u.max&&u.max.mod?Math.max(1,C.m[u.max.mod]??0):0;
    if(mx>0&&!have.has(u.name.toLowerCase()))add.push({name:u.name,max:mx,cur:mx,reset:u.reset||"long",auto:true})});
  if(add.length){resSet(resGet().concat(add));setTimeout(()=>toast(`${add.map(x=>x.name).join(", ")} added to Resources`),1600)}}
/* 1.5: the Feats step: your feats with what they change, a search in the DM's 5e.tools feats, and the choices a feat asks for */
let shFeatQ="",shFeatPick=null;
function shFeatStepHtml(d){
  const fl=d.feats||[],rows=pcData&&(pcData.feats||[]).filter(r=>r[0]==="feat");
  if(!pcData&&!pcLoading&&Date.now()-pcTried>30000)pcLoad().then(x=>{if(x&&shDraft&&shStep===3||x&&MODE==="dm"&&shDraft)shRe()});
  const mine=fl.length?`<div class="shfts">${fl.map((f,i)=>{const L=featLines(f,d);
    return `<div class="shft"><span><b>${esc(f.n)}</b><small>${L.length?esc(L.join(" · ")):
    "nothing on the sheet to change"}${f.ap||!L.length?"":
      " · already in your numbers"}</small></span><button type="button" class="icon-btn" data-act="shfeatrm" data-i="${i}" aria-label="Remove ${
    esc(f.n)}">${I.x}</button></div>`}).join("")}</div>`:`<p class="psub" style="margin:0">No feats yet.</p>`;
  if(shFeatPick)return mine+shFeatPickHtml(d);
  const txt=(id,label,ph)=>`<label class="shfl">${label}<input class="field" id="${id}" type="text" data-kb="text" inputmode="${MODE==="dm"?"text":
    "none"}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${esc(id==="sh_fq"?shFeatQ:
      "")}" placeholder="${esc(ph)}"></label>`;
  return mine+(rows&&rows.length?`${txt("sh_fq","Add a feat","Search: Alert, Tough, Resilient…")}<div class="splist shflist" id="shFeatList">${
    shFeatListHtml(d)}</div>`:
    `<p class="psub" style="margin:0">The feat list comes from the DM's 5e.tools files on the laptop. Without them, add a feat by its name (it changes nothing on its own).</p>`)+
    `<div class="shfman">${txt("sh_fman","Or add by name","Feat name")}<button class="btn" type="button" data-act="shfeatman">Add</button></div>`}
function shFeatListHtml(d){
  const rows=pcData&&(pcData.feats||[]).filter(r=>r[0]==="feat")||[],q=shFeatQ.trim().toLowerCase(),have=new Set((d.feats||[]).map(f=>f.n.toLowerCase()+"|"+
    (f.s||"")));
  const L=rows.filter(r=>(!q?!r[6]&&/^(O|G|FS)/.test(String(r[4]||"")):r[1].toLowerCase().includes(q)&&(!r[6]||q.length>2))&&
    !have.has(r[1].toLowerCase()+"|"+r[2]));
  return L.slice(0,q?12:8).map(r=>`<button type="button" class="spi" data-act="shfeatpick" data-n="${esc(r[1])}" data-s="${esc(r[2])}" data-l="${esc(r[
    3]||"")}"><b>${
    esc(r[1])}</b><small>${esc([PC_FCAT[r[4]]||"",featEd(r[2])==="2014"?"2014":"",r[3]&&!/^(PHB|XPHB)$/.test(r[2])?r[3]:
      ""].filter(Boolean).join(" · "))}</small></button>`).join("")||
    `<p class="psub">No feat by that name.</p>`}
const PC_FCAT={O:"Origin",G:"General",EB:"Epic Boon",FS:"Fighting Style","FS:P":"Fighting Style","FS:R":"Fighting Style",D:"Dragonmark",DG:"Dark Gift"};
/* what a picked feat asks for: one of its ability options, saves, skills, expertise; then Add and apply, or Add only */
function shFeatPickHtml(d){const P=shFeatPick,c=P.c,S=P.sel;
  if(!P.item)return `<div class="shfpick"><b>${esc(P.n)}</b><p class="psub">${P.item===null?"Couldn't read this feat from the laptop.":"Reading the feat…"}</p>
    <div class="hpbtns"><button class="btn" type="button" data-act="shfcancel">Cancel</button></div></div>`;
  const seg=(k,list,count,lab)=>`<div class="seg2 shfch">${list.map(v=>`<button type="button" data-act="shfsel" data-k="${k}" data-v="${esc(
    v)}" aria-pressed="${S[k].includes(
    v)}">${esc(lab(v))}</button>`).join("")}</div><small class="psub">Pick ${count}</small>`;
  const ab=c.ab[P.opt],optLab=o=>o.fixed?Object.entries(o.fixed).map(([a,n])=>`${SH_AB3[a]} +${n}`).join(", "):o.count>1?`+${o.amount} to ${o.count} scores`:
    `+${o.amount} to one score`;
  let h=`<div class="shfpick"><div class="shfph"><b>${esc(P.n)}</b><small>${esc(P.l||"")}</small></div>`;
  if(c.ab.length>1)h+=`<div class="eyebrow2">Ability scores</div><div class="seg2">${c.ab.map((o,i)=>
    `<button type="button" data-act="shfopt" data-i="${i}" aria-pressed="${
    P.opt===i}">${esc(optLab(o))}</button>`).join("")}</div>`;
  if(ab&&!ab.fixed)h+=`${c.ab.length>1?"":`<div class="eyebrow2">Ability score +${ab.amount}${ab.max>20?` (up to ${ab.max})`:""}</div>`}${seg("ab",ab.from,
    ab.count,a=>SH_AB3[a]+" "+(d.ab[a]||10))}`;
  else if(ab)h+=`<div class="eyebrow2">Ability scores</div><p class="psub" style="margin:0">${esc(optLab(ab))}</p>`;
  if(c.sv&&c.sv.from)h+=`<div class="eyebrow2">Saving throw proficiency</div>${seg("sv",c.sv.from,c.sv.count,a=>SH_AB3[a]+((d.sv||[]).includes(a)?" ✓":""))}`;
  if(c.sk&&c.sk.from)h+=`<div class="eyebrow2">Skill proficiency${c.sk.orTool?" (skills only; tools aren't on the sheet)":""}</div>${seg("sk",c.sk.from,
    c.sk.count,k=>SH_SKN(k)+
    (Number((d.sk||{})[k])?" ✓":""))}`;
  if(c.exp){const pf=SH_SK.map(x=>x[0]).filter(k=>Number((d.sk||{})[k])||S.sk.includes(k)||(c.sk&&c.sk.fixed||[]).includes(k));
    h+=`<div class="eyebrow2">Expertise</div>${pf.length?seg("exp",pf,c.exp,SH_SKN):
      `<p class="psub" style="margin:0">Pick a skill you're proficient in first.</p>`}`}
  const f=shFeatBuild(),L=featLines(f,d,featChanges(f,d));
  h+=`<div class="shfprev"><b>On your sheet:</b> ${L.length?esc(L.join(" · ")):"nothing to change (its uses go to Resources)"}</div>
    <div class="shfgo"><button class="btn primary" type="button" data-act="shfadd" data-ap="1">Add and apply</button><button class="btn" type="button" data-act="shfadd" data-ap="0">Add only<small>my numbers already include it</small></button>
    <button class="btn" type="button" data-act="shfcancel">Cancel</button></div></div>`;
  return h}
/* the feat as the choices made so far */
function shFeatBuild(){const P=shFeatPick,c=P.c,S=P.sel,ab=c.ab[P.opt],pick={ab:{},sv:[],sk:[],exp:[]};
  if(ab){if(ab.fixed)Object.assign(pick.ab,ab.fixed);else S.ab.forEach(a=>pick.ab[a]=ab.amount)}
  if(ab){const mx=ab.max||20;Object.keys(pick.ab).forEach(a=>{const n=Math.min(pick.ab[a],mx-(Number((shDraft.ab||{})[a])||10));if(n>0)pick.ab[a]=n;
    else delete pick.ab[a]})}
  if(c.sv)pick.sv=c.sv.fixed?c.sv.fixed.slice():S.sv.slice();if(c.sk)pick.sk=c.sk.fixed?c.sk.fixed.slice():S.sk.slice();pick.exp=(c.expFixed||[]).concat(S.exp);
  return {n:P.n,s:P.s,l:P.l,pick}}
/* the DM fills in or pastes a player's sheet on the laptop, then sends it to the phone or keeps it */
let dmShId=null;
const shRe=()=>MODE==="dm"?dmSheetSheet():rrPSheet();
function dmSheetSheet(){const c=byId(dmShId);if(!c||!shDraft){$("#overlay").innerHTML="";return}
  const O=$("#overlay"),keep=O.querySelector(".dmsh")?O.querySelector(".dmsh").scrollTop:0,had=(state.sheets||{})[c.name.toLowerCase()];
  O.innerHTML=`<div class="scrim" data-act="close"><div class="sheet dmsh" role="dialog" aria-modal="true" aria-label="Character sheet"><h2>Character sheet · ${
    esc(c.name)}</h2>
    <p class="psub">${had?(had.by==="dm"?(had.only?"Kept only for you.":"You set it up; the player can change it."):
      "From the player's phone. Changes you send go back to it."):
      "Fill it in, or paste the text of their sheet. Send it to their phone, or keep it only for yourself (paper players)."}</p>
    <details class="dmshpaste"${had?
      "":" open"}><summary>Paste text from their sheet</summary><textarea class="shpaste" id="dm_paste" placeholder="Armor Class 18  Hit Points 52…"></textarea><button class="btn" type="button" data-act="dmshparse">Read it</button>${
      shPaste&&shPaste.res?`<div class="shfound">${shPaste.res.found.map(f=>`<div><span>${esc(f)}</span><b>✓</b></div>`).join("")}${shPaste.res.guess.map(f=>
      `<div class="q"><span>${esc(f)}</span></div>`).join("")}</div>`:""}</details>
    <div class="dmshgrid"><section>${shStepBody(0)}</section><section>${shStepBody(1)}</section><section>${shStepBody(2)}</section><section>${shStepBody(
      4)}</section><section class="dmshfeat"><div class="eyebrow2">Feats</div>${shStepBody(3)}</section></div>
    <div class="dmshgo"><button class="btn" type="button" data-act="close">Cancel</button><button class="btn" type="button" data-act="dmshsave" data-only="1" title="For a player on paper: you see the numbers, the phone gets nothing">Keep only for me</button><button class="btn primary" type="button" data-act="dmshsave">Send to ${
      esc(c.name)}'s phone</button></div>
  </div></div>`;
  const b=O.querySelector(".dmsh");if(b)b.scrollTop=keep}
function shPasteHtml(){const p=shPaste||{text:"",res:null};
  return `<p class="psub">Copy the text of your character sheet and paste it here. It only goes to the DM's laptop.</p>
    <textarea class="shpaste" id="sh_paste" placeholder="Armor Class 12   Hit Points 32   Speed 30 ft.&#10;STR 8  DEX 14  CON 14  INT 18  WIS 12  CHA 10&#10;Saving Throws Int +7, Wis +4…">${
      esc(p.text)}</textarea>
    <button class="btn" type="button" data-act="shparse">Read it</button>
    ${p.res?`<div class="eyebrow2">Found</div><div class="shfound">${p.res.found.map(f=>`<div><span>${esc(f)}</span><b>✓</b></div>`).join("")||
      `<div class="q"><span>Nothing recognisable yet</span></div>`}${p.res.guess.map(f=>`<div class="q"><span>${esc(f)}</span></div>`).join("")}</div>
      <div class="hpbtns"><button class="btn" type="button" data-act="shpastefix">Fix by hand</button><button class="btn primary" type="button" data-act="shpastesave"${
        p.res.found.length?"":" disabled"}>Looks right: save</button></div>`:""}`}
function pcBuild(){   // new numbers, but what you've already spent stays spent
  const prof=pcDraft,made=pcTrackers(prof),old=resGet(),names=new Set(made.map(x=>x.name));
  const keep=old.filter(x=>!x.auto&&!names.has(x.name));
  const next=made.map(x=>{const was=old.find(o=>o.name===x.name),spent=was?Math.max(0,(was.max||0)-(was.cur||0)):0;
    return Object.assign(x,{cur:Math.max(0,x.max-spent)})});
  resSet(next.concat(keep));profSet(prof);pcDraft=null;return next.length;
}
let effDraft={name:"",conc:false,area:false,targets:new Set(),custom:false},resDraft={name:"",max:"",reset:"long",custom:false},resEditI=-1;
/* E18 (1.4): the rolls people showed to the table, newest first, on every phone */
function tableLogHtml(){const L=(state.rollLog||[]).slice(0,6);if(!L.length)return "";
  const col=n=>{const c=state.list.find(x=>x.kind==="pc"&&x.name===n),k=c&&frameKey(c);return k?` fr-${k}`:""};
  return `<div class="psec"><div class="eyebrow2">At the table</div><div class="tlog">${L.map(r=>
    `<div class="tlr"><i class="tld${col(r.by)}" aria-hidden="true"></i><b>${esc(
    r.by)}</b><span>${esc(String(r.text||"").replace(/:.*$/,"")||"roll")}</span><em>${esc(String(r.total))}</em></div>`).join("")}</div></div>`}
/* 1.4: the "Your turn" screen. What matters this turn, in plain words: conditions (from RULES), effects and how long they last,
   your Concentration, dice someone gave you, and whether your reaction is spent. It can be turned off in More. */
const pTurnCard=()=>ls.get("pTurnCard",true)!==false;
function turnCardHtml(me){
  const conds=(me.conds||[]).map(x=>x.n||x),out=[],tags=new Set(me.tags||[]),ed=canEdit();
  const card=(ico,t,lines,btn)=>out.push(`<div class="ytc">${ico}<div><b>${t}</b>${lines.map(l=>`<p>${l}</p>`).join("")}${btn||""}</div></div>`);
  conds.filter(n=>n!=="Concentrating").forEach(n=>{const r=RULES[n.toLowerCase()];if(!r)return;
    card(condIco(n,"tci"),n==="Exhaustion"?`Exhaustion ${exhOf(me)}`:esc(r.t),r.d.slice(0,2).map(esc),
      n==="Prone"&&ed?`<button class="btn sm" type="button" data-act="pcond" data-n="Prone" aria-pressed="true">I stand up</button>`:"")});
  state.effects.filter(e=>(e.targets||[]).includes(me.id)).forEach(e=>{const by=byId(e.by),n=effLeft(e);
    card('<span class="tci tce" aria-hidden="true">✦</span>',esc(e.name)+(n!=null?` · ${n} round${n===1?"":"s"} left`:""),
      [by&&by.id!==me.id?`From ${esc(by.name)}.`:"Your own effect."].concat(e.name==="Bless"?["Your phone adds 1d4 to your attack rolls and saving throws."]:
        e.name==="Bane"?["Your phone takes 1d4 off your attack rolls and saving throws."]:[]))});
  const mine=state.effects.filter(e=>e.by===me.id&&e.conc);
  if(conds.includes("Concentrating"))card(condIco("Concentrating","tci"),"Concentrating"+(mine.length?` on ${esc(mine.map(e=>e.name).join(", "))}`:""),
    ["Damage means a Constitution save: DC 10 or half the damage."]);
  (me.gifts||[]).forEach(g=>card('<span class="tci tce" aria-hidden="true">◆</span>',`${esc(g.n)} · ${esc(g.die)}`,
    [`From ${esc(g.from)}: add it to a roll when you want.`]));
  card('<span class="tci tce" aria-hidden="true">↺</span>',tags.has("reaction")?"Reaction used":"Reaction ready",[tags.has("reaction")?
    "It comes back at the start of your turn.":"You can still use it before your next turn."]);
  return `<div class="ytcs">${out.join("")}</div>`;
}
/* the phone's own number pad: the system keyboard would cover the buttons under the field */
let padVal="",padFor=null,spellQ="",spellScope=null,resAll=false;
const padHtml=(ph,neg)=>`<div class="padshow" id="padShow" data-ph="${esc(ph)}" aria-live="polite">${esc(padVal)}</div>
  <div class="numpad">${["1","2","3","4","5","6","7","8","9",neg?"neg":"clr","0","back"].map(k=>
    `<button type="button" data-act="pkey" data-k="${k}" aria-label="${k==="back"?"Delete":k==="clr"?"Clear":k==="neg"?"Minus":k}">${k==="back"?"⌫":k==="clr"?
    "C":k==="neg"?"±":k}</button>`).join("")}</div>`;
function padKey(k){
  if(k==="back")padVal=padVal.slice(0,-1);else if(k==="clr")padVal="";else if(k==="neg")padVal=padVal.startsWith("-")?padVal.slice(1):"-"+padVal;
  else if(padVal.replace("-","").length<3||(padVal.length<4&&!padVal.startsWith("-")))padVal=(padVal==="0"?"":padVal==="-0"?"-":padVal)+k;
  const el=$("#padShow");if(el)el.textContent=padVal;hpPrevSync();
}
/* 1.4: before you press Damage or Heal, the phone shows where each would leave you */
function hpPrevSync(){const el=$("#hpPrev");if(!el)return;const hp=hpGet(),n=Number(padVal);
  if(!padVal||!(n>0)||!hp.max){el.innerHTML="";return}
  const a=Math.min(hp.temp||0,n),dmg=Math.max(0,hp.cur-(n-a)),heal=Math.min(hp.max,hp.cur+n),half=Math.floor(hp.max/2);
  el.innerHTML=`<span class="hpvd">Damage: ${hp.cur} → <b>${dmg}</b>${dmg===0?" · 0 HP":dmg<=half&&hp.cur>half?" · Bloodied":
    ""}</span><span class="hpvh">Heal: ${hp.cur} → <b>${heal}</b></span>`}
/* the app's own keyboard for every other field on the phone: docked at the bottom, it never covers the sheet's buttons */
let kbShift=null;   // null = automatic capitals (start of the field, after a space)
function kbField(){const a=document.activeElement;return a&&a.matches&&a.matches("input[data-kb]")?a:null}
function kbRender(){
  let k=$("#appkb");const f=kbField();
  if(!f||MODE!=="player"){if(k)k.hidden=true;document.body.classList.remove("kbopen");return}
  if(!k){k=document.createElement("div");k.id="appkb";k.setAttribute("role","group");k.setAttribute("aria-label","Keyboard");document.body.appendChild(k);
    k.addEventListener("pointerdown",kbPress)}
  const mode=f.dataset.kb,up=kbShift!=null?kbShift:(!f.value||/[\s-]$/.test(f.value));
  const key=(v,lab,cls)=>`<button type="button" data-k="${esc(v)}"${cls?` class="${cls}"`:""} aria-label="${esc(v==="back"?"Delete":v==="done"?"Done":v===
    "shift"?"Capitals":v==="neg"?"Minus":v===" "?"Space":lab||v)}">${lab||v}</button>`;
  const L=(r)=>`<div class="kbrow">${r}</div>`;
  k.className=mode==="num"?"kbnum":"kbtext";
  k.innerHTML=mode==="num"
    ?`<div class="numpad">${["1","2","3","4","5","6","7","8","9","neg","0","back"].map(x=>key(x,x==="back"?"⌫":x==="neg"?"±":x)).join("")}</div>${L(key("done",
      "Done","kbdone"))}`
    :L([..."qwertyuiop"].map(x=>key(x,up?x.toUpperCase():x)).join(""))+L([..."asdfghjkl"].map(x=>key(x,up?x.toUpperCase():x)).join(""))
     +L(key("shift","⇧","kbshift"+(up?" on":""))+[..."zxcvbnm"].map(x=>key(x,up?x.toUpperCase():x)).join("")+key("back","⌫","kbback"))
     +L(key("'","'")+key("-","-")+key(" ","space","kbspace")+key("done","Done","kbdone"));
  k.hidden=false;document.body.classList.add("kbopen");
  document.documentElement.style.setProperty("--kbh",k.offsetHeight+"px");
  setTimeout(()=>{try{f.scrollIntoView({block:"nearest"})}catch(e){}},30);
}
function kbPress(e){
  const b=e.target.closest("button[data-k]");e.preventDefault();if(!b)return;   // keep the focus in the field
  const f=kbField();if(!f)return;const v=b.dataset.k;
  try{navigator.vibrate&&navigator.vibrate(8)}catch(_){}
  if(v==="done"){const fm=f.closest("form");if(f.hasAttribute("data-kbsubmit")&&fm&&fm.requestSubmit)fm.requestSubmit();else f.blur();
    return}   // Done sends only where Enter used to
  if(v==="shift"){const up=kbShift!=null?kbShift:(!f.value||/[\s-]$/.test(f.value));kbShift=!up;kbRender();return}
  let x=f.value;
  if(v==="back")x=x.slice(0,-1);
  else if(v==="neg")x=x.startsWith("-")?x.slice(1):"-"+x.replace(/^\+/,"");
  else{const up=kbShift!=null?kbShift:(!x||/[\s-]$/.test(x));const c=f.dataset.kb==="text"&&/[a-z]/.test(v)&&up?v.toUpperCase():v;
    const max=f.maxLength>0?f.maxLength:f.dataset.kb==="num"?3:60;if(x.replace(/^-/,"").length<max)x+=c;kbShift=null}
  f.value=x;f.dispatchEvent(new Event("input",{bubbles:true}));f.dispatchEvent(new Event("change",{bubbles:true}));kbRender();
}
document.addEventListener("focusin",e=>{if(MODE==="player"&&e.target.matches&&e.target.matches("input[data-kb]")){kbShift=null;kbRender()}});
document.addEventListener("focusout",()=>setTimeout(()=>{if(!kbField())kbRender()},0));
const recentSpells=()=>ls.get("spells:"+(meName||"").toLowerCase(),[]);
function pushRecentSpell(n){const k="spells:"+(meName||"").toLowerCase();ls.set(k,[n].concat(ls.get(k,[]).filter(x=>x!==n)).slice(0,8))}
const SP_CAP=150;
function spRowsHtml(hit,act,q,mine,lvl){
  let h="",lv=null;const shown=hit.slice(0,SP_CAP);
  shown.forEach(x=>{if(x[1]!==lv){lv=x[1];h+=`<div class="splv">${lv<0?"Class features":lv===0?"Cantrips":"Level "+lv}</div>`}
    h+=`<button type="button" class="sprow sp1 lv${Math.max(0,x[1])}" data-act="${act}" data-n="${esc(x[0])}" data-s="${esc(x[7]||"")}"><b>${esc(x[0])}${x[8]===
      "hb"||x[8]==="own"?`<i class="sphb">${esc(srcName(x[6]))}</i>`:""}</b><span class="spi">${x[10]?`<span class="spr" title="Ritual">R</span>`:""}${x[2]?
      `<span class="spc" title="Concentration">${SVGI.clock}</span>`:""}${x[3]?`<span class="spa" title="Battlefield">${SVGI.area}</span>`:
      ""}<small>${esc(x[4]==="Instant"?"":x[4]||"")}</small></span></button>`});
  if(hit.length>SP_CAP)h+=`<p class="psub">Showing ${SP_CAP} of ${hit.length}. Type a few letters to narrow it down.</p>`;
  if(!hit.length)h+=`<p class="psub">No spell${q?` called “${esc(q)}”`:""}${lvl!=null?` at ${lvl?"level "+lvl:"cantrip level"}`:""}${mine?
    " on your class list":""}.</p>`;
  return h;
}
function spHbHtml(){const n=spHbCount();return n?`<button type="button" class="linkbtn sphbt" data-act="psphb">${spHb?"Hide other homebrew":
  `+ ${n} homebrew spells`}</button>`:""}
function spellListHtml(me){
  const q=spellQ.trim().toLowerCase(),L=CLS_LETTER[me&&me.cls],mine=L&&spellScope!=="all";
  const hit=spPool(true).filter(x=>(!q||x[0].toLowerCase().includes(q))&&(!mine||spCls(x).includes(L)));
  return spRowsHtml(hit,"pspell",spellQ.trim(),mine)+
    `<button type="button" class="sprow other" data-act="pspellother"><b>Something else…</b><small>type the name yourself</small></button>`;
}
/* the spellbook: every spell, with its text from the laptop */
let bookQ="",bookLvl=null,spView=null,alwDraft=null;
function bookListHtml(me){
  const q=bookQ.trim().toLowerCase(),L=CLS_LETTER[me&&me.cls],prep=spellScope==="prep",mine=L&&spellScope!=="all"&&!prep;
  const hit=spPool(false).filter(x=>(!q||x[0].toLowerCase().includes(q))&&(!mine||spCls(x).includes(L))&&(!prep||prepHas(x[0],x[7]||"")||alwHas(x[0]))&&
    (bookLvl==null||x[1]===bookLvl));
  if(prep&&!hit.length)return `<p class="psub">Nothing prepared yet. Open a spell and tap ☆ Prepare it.</p>`;
  let h=spRowsHtml(hit,"pbookopen",bookQ.trim(),mine,bookLvl);
  // 81: a lock and where it comes from, on spells that are always prepared
  alwNow().forEach(a=>{const re=new RegExp(`(data-act="pbookopen" data-n="${esc(a.n).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}"[^>]*><b>[^<]*)`,"i");
    h=h.replace(re,`$1<i class="spalw" title="Always prepared: ${esc(a.from)}">🔒 ${esc(a.from)}</i>`)});
  return h;
}
let dice={die:20,count:1,mod:0,adv:"",share:true,last:null};
let seenCall=null,concAskSeen=null;
const rrPSheet=()=>{const a=document.activeElement;if(a&&a!==document.body&&a.blur)a.blur();
  renderPSheet()};   // iOS keeps focus in a field after tapping a button
function renderPSheet(){
  const O=$("#overlay");
  if(!pSheet){if(O.dataset.p){O.innerHTML="";delete O.dataset.p}return}
  const ae=document.activeElement;if(ae&&O.contains(ae)&&ae.tagName==="INPUT"&&ae.type!=="checkbox")return;   // don't interrupt typing
  let body="";
  if(pSheet==="who"){
    const pcs=sorted().filter(c=>c.kind==="pc"&&!c.hidden);
    body=`<h2>Who are you?</h2><p class="psub">${pcs.length?"Pick your character. This device will remember it.":
      "The DM hasn't added characters to the combat yet. The list will appear by itself."}</p>
      <div class="who-grid">${pcs.map(c=>`<button type="button" data-act="pickme" data-n="${esc(c.name)}">${esc(c.name)}${LABEL[c.cls]?
        `<small>${LABEL[c.cls]}</small>`:""}</button>`).join("")}</div>
      <button class="btn" type="button" data-act="pshared">This is the tablet (shared screen)</button>
      <button class="btn" type="button" data-act="ptv">This is the TV</button>`;
  }else{
    const me=meChar();if(me&&!me.down&&pSheet!=="dsave")dsLast=null;
    const padKeyNow=pSheet+(hpEditMax?":max":"");if(padFor!==padKeyNow){padFor=padKeyNow;padVal=""}
    const free=pSheet==="res"||pSheet==="resedit"||pSheet==="pcset"||pSheet==="pcfeat"||pSheet==="give"||pSheet==="comphp"||pSheet==="compsb"||pSheet==="hp"||
      pSheet==="dice"||pSheet==="more"||pSheet==="turn"||pSheet==="conc"||pSheet==="dsave"||pSheet==="book"||(pSheet==="spell"&&(!spView||
        spView.from!=="effs"));
    if(!me||(!canEdit()&&!free&&pSheet!=="call")){pSheet=null;return renderPSheet()}
    if(pSheet==="dsave"){
      const ds=dsOf(me),done=isDead(me)||isStable(me);
      body=`<h2>Death save · ${esc(me.name)}</h2>
        ${!me.down?`<p class="psub">You're no longer at 0 HP.</p>`
        :`<div class="callhead">${D20}<div><div class="eyebrow2">${done?(isDead(me)?"Three failures":"Three successes"):
          "You're at 0 HP"}</div><h2 style="margin:0">${isDead(me)?"You have died":isStable(me)?"You're stable":"10 or higher is a success"}</h2></div></div>
        <div class="psec"><div class="ds big">
          <span class="grp">✓ ${[0,1,2].map(k=>`<button type="button" class="pip s${ds.s>k?" on":
            ""}" data-act="pds" data-k="s" data-i="${k}" aria-label="Success ${k+1}"></button>`).join("")}</span>
          <span class="grp">✗ ${[0,1,2].map(k=>`<button type="button" class="pip f${ds.f>k?" on":
            ""}" data-act="pds" data-k="f" data-i="${k}" aria-label="Failure ${k+1}"></button>`).join("")}</span></div></div>
        ${done?"":`<button class="btn primary e-send" type="button" data-act="pdsroll">Roll death save</button>
        <form id="pDsForm" class="psec" autocomplete="off"><div class="eyebrow2">Rolled a real d20?</div><div class="dsreal"><input class="e-num" id="pDsNum" type="text" data-kb="num" data-kbsubmit inputmode="none" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="1–20" aria-label="The number on the d20"><button class="btn" type="submit">Use it</button></div></form>`}`}
        ${dsLast?`<div class="dresult${dsLast.d===20?" n20":dsLast.d===1?" n1":
          ""}"><b>${dsLast.tot}</b><small>d20 (${dsLast.d}) · ${esc(dsLast.msg)}</small></div>`:""}
        <div style="display:flex;justify-content:flex-end"><button class="btn${dsLast||!me.down?" primary":
          ""}" type="button" data-act="pclose">Close</button></div>`;
    }else if(pSheet==="conc"){
      const c=pConc||{dc:10,dmg:0},r=c.res,still=(me.conds||[]).some(x=>(x.n||x)==="Concentrating"),mod=ls.get("conmod:"+(meName||"").toLowerCase(),"")||
        (shLocal()?shS(shCalc(shLocal()).sv.con):"");
      body=`<h2>Concentration save</h2>
        <div class="callhead">${D20}<div><div class="eyebrow2">${c.ask?"The DM: ":
          ""}You took ${c.dmg} damage while Concentrating</div><h2 style="margin:0">Constitution save · DC ${c.dc}</h2></div></div>
        ${c.ask&&hpGet().max&&!c.hpTaken?`<button class="btn" type="button" data-act="pconhp">Take ${c.dmg} off my HP</button>`:c.ask&&c.hpTaken?
          `<p class="psub">${c.dmg} taken off your HP.</p>`:""}
        ${r?`<div class="dresult${r.d===20?" n20":r.d===1?" n1":""}"><b>${r.tot}</b><small>${esc(r.text)} · ${r.ok?"you keep Concentrating":
          "Concentration lost, your effects end"}</small></div>`:`
        <label class="rangerow" style="max-width:none">Your Constitution save bonus <input class="field big modin" id="pConMod" type="text" data-kb="num" inputmode="none" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${
          esc(mod)}" placeholder="+0" style="max-width:6em"></label>
        ${(()=>{const s0=shLocal(),wc=s0&&shCalc(s0).concAdv;return wc?
          `<div class="hpbtns"><button class="btn primary" type="button" data-act="pconroll" data-adv="1">Roll with advantage<small> War Caster</small></button><button class="btn" type="button" data-act="pconroll">Roll without</button></div>`:
          `<div class="hpbtns"><button class="btn primary" type="button" data-act="pconroll">Roll it</button><button class="btn" type="button" data-act="pconroll" data-adv="1">Roll with advantage</button></div>`})()}
        <div class="psec"><div class="eyebrow2">Rolled real dice?</div><div class="hpbtns"><button class="btn heal" type="button" data-act="pconres" data-ok="1">I made it</button><button class="btn dmg" type="button" data-act="pconres" data-ok="0">I lost it</button></div></div>`}
        ${!still&&!r?`<p class="psub">You're no longer Concentrating.</p>`:""}`;
    }else if(pSheet==="turn"){
      body=`<h2>Your turn, ${esc(me.name)}</h2>${turnCardHtml(me)}
        <div style="display:flex;justify-content:flex-end"><button class="btn primary" type="button" data-act="pclose">Got it</button></div>`;
    }else if(pSheet==="more"){
      body=`<h2>${esc(me.name)}</h2><div class="morelist">
        <button class="pcline" type="button" data-act="psheet">${shLocal()?`<b>My character sheet</b><small>${esc(shLocal().cls||
          "Your sheet")} · tap to roll, or edit</small>`:
          `<b>My character sheet</b><small>Add it once: the DM sees it, and your phone rolls with your real bonuses</small>`}</button>
        <button class="btn" type="button" data-act="pwho">Not ${esc(me.name)}? Change character</button>
        <button class="btn" type="button" data-act="fs">${fsLabel()}</button>
        <button class="btn" type="button" data-act="plight" aria-pressed="${!!ls.get("pLight",false)}">${ls.get("pLight",false)?MOON+" Dark screen":SUN+
          " Light screen"}</button>
        <button class="btn" type="button" data-act="pturncard" aria-pressed="${pTurnCard()}">${pTurnCard()?"Your turn screen: on":
          "Your turn screen: off"}</button>
        <button class="btn" type="button" data-act="psimple" aria-pressed="${pSimple()}">${pSimple()?"Show everything again":
          "Simple: just my HP"}<br><small style="font-weight:600;color:var(--muted)">${pSimple()?"Resources, spells, dice, conditions and the rest come back.":
          "Only your HP, and whatever the DM sends you. For players who keep the rest on paper."}</small></button></div>
        <p class="psub">Tap a status in the bar at the bottom twice to remove it. The light or dark screen is only on this phone.</p>`;
    }else if(pSheet==="sheet"){
      body=`<h2>${shLocal()?"Your sheet":esc(me.name)}</h2>${shViewHtml(me)}`;
    }else if(pSheet==="shed"){
      if(!shDraft){pSheet="sheet";return renderPSheet()}
      body=`<h2>Character sheet · ${esc(me.name)}</h2>${shStepHtml()}`;
    }else if(pSheet==="shpaste"){
      body=`<h2>Paste from my sheet</h2>${shPasteHtml()}`;
    }else if(pSheet==="call"){
      const call=state.call;if(!call||(call.answers||{})[me.id]!=null){pSheet=null;return renderPSheet()}
      const ask=shAsk(call.text);
      body=`<div class="callhead">${D20}<div><div class="eyebrow2">The DM calls for a roll</div><h2>${esc(call.text)}</h2></div></div>
        ${(call.aura||[]).filter(a=>a.id!==me.id).map(a=>`<div class="aurahint">${esc(a.t)}</div>`).join("")}
        ${ask?`${shAdvHtml()}<button class="shrollbig" type="button" data-act="pcallroll"><b>Roll ${esc(ask.label)} ${shS(
          ask.b)}</b><small>from your sheet</small></button><div class="eyebrow2">Rolled real dice?</div>`:""}
        <div class="psec padsec">${padHtml("Your total",true)}<button class="btn primary e-send" type="button" data-act="pcallsend">Send result</button></div>
        <div class="e-status" id="pCallStatus"></div>
        <div style="display:flex;justify-content:space-between;gap:8px"><button class="btn" type="button" data-act="pdice">Roll it here</button><button class="btn" type="button" data-act="pclose">Later</button></div>`;
    }else if(pSheet==="hp"){
      const hp=hpGet();
      if(!hp.max||hpEditMax){
        body=`<h2>HP · ${esc(me.name)}</h2><p class="psub">${hp.max?"Change your maximum HP.":"First, your maximum HP. You only do this once."}</p>
          <div class="psec padsec">${padHtml(hp.max?`Max HP (now ${hp.max})`:"Max HP")}
            <button class="btn primary e-send" type="button" data-act="phpdo" data-hp="max">Save max HP</button>${hp.max?
              `<button class="linkbtn" type="button" data-act="phpmaxno">Cancel</button>`:""}</div>
          <label class="chk"><input type="checkbox" id="pHpAuto" ${hp.auto?"checked":""}> Show Bloodied and 0 HP to the table automatically.</label>
          <label class="chk"><input type="checkbox" id="pHpShare" ${phpOn()?"checked":
            ""}> Share my HP with the DM. Only the DM sees the numbers, never the table or other phones.</label>`;
      }else{
        body=`<h2>HP · ${esc(me.name)}</h2>
          <div class="hpbig${hp.cur===0?" zero":""}"><b>${hp.cur}</b><span>/ ${hp.max}</span>${hp.temp?`<i>+${hp.temp} temp</i>`:""}</div>
          <div class="hpbar"><span style="width:${Math.round(100*hp.cur/hp.max)}%"></span></div>
          <div class="psec padsec">${padHtml("How much?")}<div class="hpprev" id="hpPrev" aria-live="polite"></div>
            <div class="hpbtns"><button class="btn dmg" type="button" data-act="phpdo" data-hp="dmg">Damage</button><button class="btn heal" type="button" data-act="phpdo" data-hp="heal">Heal</button><button class="btn" type="button" data-act="phpdo" data-hp="temp">Temp HP</button></div>${
              hp.cur===0&&me.down&&!isDead(me)?
              `<button class="btn dmg hpcrit" type="button" data-act="phpdo" data-hp="crit">Damage from a critical hit <small>two death save failures</small></button>`:""}
          </div>
          <button class="linkbtn hpmaxlink" type="button" data-act="phpmax">Change max HP (${hp.max})</button>
          <label class="chk"><input type="checkbox" id="pHpShare" ${phpOn()?"checked":""}> Share my HP with the DM (only the DM sees it)</label>`;
      }
    }else if(pSheet==="dice"){
      const L=dice.last,ex=myExh();
      body=`<h2>Dice</h2>${me.down&&!isDead(me)&&!isStable(me)?`<button class="btn primary e-send" type="button" data-act="pdsroll">Roll death save</button>${
        dsLast?`<div class="dresult${dsLast.d===20?" n20":dsLast.d===1?" n1":""}"><b>${dsLast.tot}</b><small>d20 (${dsLast.d}) · ${esc(
        dsLast.msg)}</small></div>`:""}`:""}
        ${ex&&dice.die===20?`<p class="psub">Exhaustion ${ex}: your d20 rolls get −${2*ex}.</p>`:""}
        <div class="dicepick">${[4,6,8,10,12,20,100].map(d=>`<button type="button" data-act="pdie" data-d="${d}" aria-pressed="${dice.die===
          d}">d${d}</button>`).join("")}</div>
        <div class="dicerow"><span class="psub">Dice</span><button type="button" class="btn" data-act="pdcount" data-d="-1">−</button><b>${
          dice.count}</b><button type="button" class="btn" data-act="pdcount" data-d="1">+</button>
          <span class="psub">Modifier</span><input class="field big modin" id="pMod" type="text" data-kb="num" inputmode="none" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${
            dice.mod}"></div>
        ${dice.die===20?`<div class="seg2"><button type="button" data-act="padv" data-v="dis" aria-pressed="${dice.adv===
          "dis"}">Disadvantage</button><button type="button" data-act="padv" data-v="" aria-pressed="${
          !dice.adv}">Normal</button><button type="button" data-act="padv" data-v="adv" aria-pressed="${dice.adv==="adv"}">Advantage</button></div>`:""}
        <label class="chk"><input type="checkbox" id="pShare" ${dice.share?"checked":""}> Show the result on the shared screen</label>
        <button class="btn primary e-send" type="button" data-act="proll">Roll ${dice.count}d${dice.die}${dice.mod?(dice.mod>0?"+":"")+dice.mod:""}</button>
        ${L?`<div class="dresult${L.nat===20?" n20":L.nat===1?" n1":""}"><b>${L.total}</b><small>${esc(L.text)}</small></div>`:""}
        <div class="psec"><div class="eyebrow2">Rolled real dice?</div><div class="hpbtns"><button class="btn n20b" type="button" data-act="pnat" data-k="nat20">Nat 20!</button><button class="btn n1b" type="button" data-act="pnat" data-k="nat1">Nat 1</button></div></div>
        ${shLocal()?`<button class="btn" type="button" data-act="psheet">Roll from my sheet (saves, skills, attacks)</button>`:""}
        ${tableLogHtml()}
        <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="pclose">Close</button></div>`;
    }else if(pSheet==="effs"){
      const mine=state.effects.filter(e=>e.by===me.id);const names=id=>{const c=byId(id);return c?esc(c.name):"?"};
      const targets=sorted().filter(shownToPlayers);
      body=`<h2>Effects · ${esc(me.name)}</h2>
        <div class="psec"><div class="eyebrow2">Your active effects</div>${mine.length?`<div class="chipgrid">${mine.map(e=>
          `<span class="pchip">✦ ${esc(e.name)}${effN(e)} <small>${e.area?"battlefield":e.targets.map(names).join(", ")}${e.conc?" · conc.":
          ""}</small><button type="button" class="x" data-act="peffrm" data-e="${esc(e.id)}" aria-label="Remove ${esc(e.name)}">${I.x}</button></span>`).join(
          "")}</div>`:`<p class="psub">You have no active effects.</p>`}</div>
        ${!effDraft.name&&!effDraft.custom?`<div class="psec"><div class="eyebrow2">New effect · pick a spell</div>
          <input class="field big" id="pSpellQ" type="text" data-kb="text" inputmode="none" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Search spells" value="${
            esc(spellQ)}">
          ${CLS_LETTER[me.cls]?`<div class="seg2">${[["mine",LABEL[me.cls]+" spells"],["all","All spells"]].map(([k,l])=>
            `<button type="button" data-act="pspellscope" data-v="${k}" aria-pressed="${(spellScope==="all"?"all":"mine")===
            k}">${esc(l)}</button>`).join("")}</div>`:""}
          ${spEdHtml()}
          ${recentSpells().length?`<div class="eyebrow2">Recent</div><div class="chipgrid">${recentSpells().map(n=>
            `<button type="button" data-act="pspell" data-n="${esc(n)}">${esc(n)}</button>`).join("")}</div>`:""}
          ${spHbHtml()}
          <div class="splist" id="pSpellList">${spellListHtml(me)}</div></div>`
        :`<form id="pEffForm" autocomplete="off" class="psec">
          <div class="eyebrow2">New effect</div>
          ${
            effDraft.custom?`<div class="spcustom"><input class="field big" id="pEffName" maxlength="30" data-kb="text" inputmode="none" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Name of the effect" value="${
            esc(effDraft.name)}"><button type="button" class="btn" data-act="pspellchg">List</button></div>`
            :(()=>{const x=spellFind(effDraft.name,effDraft.src);return `<div class="spsel"><div><b>${ic("spark")} ${esc(effDraft.name)}</b><small>${x?
              esc(spellMeta(x)):""}</small></div>${spRows&&x&&x[1]>=0?`<button type="button" class="btn" data-act="pbookopen" data-n="${esc(x[0])}" data-s="${
              esc(x[7]||"")}" data-from="effs">Read</button>`:""}<button type="button" class="btn" data-act="pspellchg">Change</button></div>`})()}
          <label class="chk"><input type="checkbox" id="pEffArea" ${effDraft.area?"checked":
            ""}> Battlefield effect, no targets (Fog Cloud, Darkness, Spirit Guardians…)</label>
          ${effDraft.area?"":`<div class="eyebrow2">Targets</div>
          <div class="chipgrid">${targets.map(c=>`<button type="button" data-act="ptgt" data-id="${esc(c.id)}" aria-pressed="${effDraft.targets.has(c.id)}">${
            esc(c.name)}</button>`).join("")}</div>`}
          <label class="chk"><input type="checkbox" id="pEffConc" ${effDraft.conc?"checked":
            ""}> Needs Concentration (you get Concentrating, and the effect ends when you lose it)</label>
          <button class="btn primary e-send" type="submit">Add effect</button>
        </form>`}
        <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="pclose">Close</button></div>`;
    }else if(pSheet==="book"){
      body=`<h2>Spells</h2>
        <div class="psec"><input class="field big" id="pBookQ" type="text" data-kb="text" inputmode="none" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Search spells" value="${
          esc(bookQ)}">
          <div class="seg2">${(CLS_LETTER[me.cls]?[["mine",LABEL[me.cls]+" spells"],["all","All spells"]]:[["all","All spells"]]).concat([["prep",
            `★ Prepared ${prepGet().filter(p=>!alwHas(p.n)).length}${prepMax()?"/"+prepMax():""}${alwNow().length?` + ${alwNow().length} always`:
            ""}`]]).map(([k,l])=>`<button type="button" data-act="pspellscope" data-v="${k}" aria-pressed="${(spellScope==="all"||spellScope==="prep"?
            spellScope:CLS_LETTER[me.cls]?"mine":"all")===k}">${esc(l)}</button>`).join("")}</div>
          ${spEdHtml()}
          <div class="splvls">${[["","All"],[0,"C"],1,2,3,4,5,6,7,8,9].map(v=>{const [k,l]=Array.isArray(v)?v:[v,String(v)];
            return `<button type="button" data-act="pbooklvl" data-v="${k}" aria-pressed="${String(bookLvl??"")===String(k)}"${k===0?' title="Cantrips"':
            ""}>${l}</button>`}).join("")}</div>
          ${spHbHtml()}
          <div class="splist" id="pBookList">${bookListHtml(me)}</div></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="pclose">Close</button></div>`;
    }else if(pSheet==="spell"){
      const v=spView||{},x=spRows&&spRows.find(r=>r[0]===v.n&&r[7]===v.s),older=x&&spRows.find(r=>r[0]===v.n&&r[9]&&r!==x),newer=x&&x[9]&&spRows.find(r=>r[0]===
        v.n&&!r[9]);
      body=`<div class="spcard">${v.d?refCardHtml(v.d,true):v.d===null?`<p class="psub">Couldn't read this spell from the laptop.</p>`:
        `<p class="psub">Loading…</p>`}</div>
        ${older||newer?`<button type="button" class="linkbtn" data-act="pbookopen" data-n="${esc(v.n)}" data-s="${esc((older||
          newer)[7])}" data-from="${esc(v.from||"book")}">${older?"The older printing":"The newer printing"} (${esc(srcName((older||newer)[6]))})</button>`:""}
        ${v.from==="effs"?"":(()=>{const a=alwOf(v.n);
          if(a&&a.auto)return `<div class="spalwbox"><span>🔒 <b>Always prepared</b> · ${esc(a.from)}${a.have?"":
            ` · from level ${a.lvl}`}</span><small>It doesn't count toward your prepared spells.</small></div>`;
          if(a)return `<div class="spalwbox"><span>🔒 <b>Always prepared</b> · ${esc(a.from)}${a.lvl>1?` · from level ${a.lvl}`:
            ""}</span><button type="button" class="linkbtn" data-act="palwdel" data-n="${esc(v.n)}">Not always prepared</button></div>`;
          return `<div class="spprepb"><button type="button" class="btn${prepHas(v.n,v.s)?" primary":
            ""}" data-act="pprep" data-n="${esc(v.n)}" data-s="${esc(v.s||"")}" aria-pressed="${prepHas(v.n,v.s)}">${prepHas(v.n,v.s)?"★ Prepared":
            "☆ Prepare it"}</button>
            <button type="button" class="btn" data-act="palwform" data-n="${esc(v.n)}" data-s="${esc(v.s||"")}">🔒 Always prepared…</button></div>
            ${alwDraft&&alwDraft.n===v.n?
              `<form id="pAlwForm" class="psec alwform" autocomplete="off"><div class="eyebrow2">Always prepared, for a homebrew subclass or an item</div>
              <label class="fl">Where it comes from<input class="field" id="pAlwFrom" maxlength="40" placeholder="Storm Domain" value="${esc(alwDraft.from||
                "")}"></label>
              <label class="fl">From level<input class="field" id="pAlwLvl" type="text" inputmode="numeric" maxlength="2" value="${esc(String(alwDraft.lvl||
                1))}"></label>
              <div class="hpbtns"><button class="btn" type="button" data-act="palwno">Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`:""}`})()}
        ${v.from!=="effs"&&state.playerEdits!==false&&sfx("spells")&&spellFxKnown(v.n,spDmgType(v.d))?
          `<button type="button" class="btn spshow" data-act="pspfx" data-n="${esc(v.n)}" data-t="${esc(spDmgType(v.d))}">✨ Show it on the table</button>`:""}
        <div class="spacts"><button class="btn" type="button" data-act="pbookback">${v.from==="effs"?"Back to the effect":"Back to the list"}</button>
          ${x&&x[4]!=="Instant"&&v.from!=="effs"&&state.playerEdits!==false?
            `<button class="btn primary" type="button" data-act="pbookeff">${ic("spark")} Add as an effect</button>`:""}</div>`;
    }else if(pSheet==="give"){
      const g=giveDraft,others=state.list.filter(x=>x.kind==="pc"&&!x.hidden&&x.id!==me.id);
      body=`<h2>Give ${esc(g?g.name:"")}</h2><p class="psub">They get a die to roll when they want; it comes off your trackers.</p>
        <div class="seg2">${["d6","d8","d10","d12"].map(d=>`<button type="button" data-act="pgivedie" data-v="${d}" aria-pressed="${g&&g.die===
          d}">${d}</button>`).join("")}</div>
        <div class="chipgrid">${others.map(x=>`<button type="button" class="btn" data-act="pgiveto" data-id="${esc(x.id)}">${esc(
          x.name)}</button>`).join("")}</div>
        <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="pres">Back</button></div>`;
    }else if(pSheet==="comphp"){
      const c=byId(compId);
      body=c?`<h2>${esc(c.name)} · ${c.hp??c.hpMax}/${c.hpMax} HP${c.thp?` +${c.thp} temp`:
        ""}</h2><p class="psub">Type a number, then Damage, Heal or Temp HP.</p>
        ${padHtml("0")}
        <div class="spacts"><button class="btn" type="button" data-act="pcompdo" data-k="temp">Temp HP</button><button class="btn" type="button" data-act="pcompdo" data-k="heal">Heal</button><button class="btn primary" type="button" data-act="pcompdo" data-k="dmg">Damage</button></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="pclose">Close</button></div>`:
          `<p class="psub">Gone.</p>`;
    }else if(pSheet==="compsb"){
      const c=byId(compId);
      body=c&&c.sb?`<h2>${esc(c.name)}</h2><div class="spcard compsb">${sbRender(
        c.sb.raw)}</div><div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="pclose">Close</button></div>`:
        `<p class="psub">Gone.</p>`;
    }else if(pSheet==="pcset"){
      if(!pcDraft){const p=profGet();pcDraft=JSON.parse(JSON.stringify(p));if(!pcDraft.cls.length)pcDraft.cls=[{n:"",s:"",lvl:1,sub:null}]}
      if(!pcData&&!pcLoading&&Date.now()-pcTried>10000)pcLoad().then(()=>{if(pSheet==="pcset"){if(pcData&&pcDraft.cls.length===1&&!pcDraft.cls[0].n){
        const g=pcGuess(me);if(g)Object.assign(pcDraft.cls[0],g)}renderPSheet()}});
      body=pcSheetHtml(me);
    }else if(pSheet==="pcfeat"){
      const f=pcDraft&&pcDraft.feats[pcFeatView];const d=f&&pcFeatCache.get(f.t+"|"+f.n+"|"+f.s);
      body=`<div class="spcard">${d?refCardHtml(d,true):`<p class="psub">${d===null?"Couldn't read this from the laptop.":"Loading…"}</p>`}</div>
        ${f&&(f.u||[]).length?`<p class="psub">Trackers: ${f.u.map(u=>`${esc(u.name)} (${u.max==="pb"?"proficiency bonus":u.max&&u.max.mod?PC_ABIL[u.max.mod]+
          " modifier":u.max} per ${u.reset==="short"?"short or long":"long"} rest)`).join(", ")}</p>`:f?
          `<p class="psub">Nothing to count here. If it has uses, add a tracker by hand in Resources.</p>`:""}
        <div class="spacts"><button class="btn" type="button" data-act="pcset">Back</button></div>`;
    }else if(pSheet==="res"){
      const res=resGet();
      const prof=profGet(),pdesc=prof.cls.map(e=>`${e.n} ${e.lvl}${e.sub?` (${e.sub.sn||e.sub.n})`:""}`).join(" / ");
      body=`<h2>Resources · ${esc(me.name)}</h2><p class="psub">Only you can see these; they're saved on this phone.</p>
        ${served?`<button type="button" class="pcline" data-act="pcset">${prof.cls.length?
          `<b>${esc(pdesc)}</b><small>Level up or change: your trackers follow</small>`:
          `<b>Set up from my class</b><small>Class and level make your spell slots, Rage, Focus Points, Hit Dice…</small>`}</button>`:""}
        ${res.length?
          `<p class="psub">Tap a full circle to use one, an empty one to get one back. Tap the name to change or delete it.</p><div class="reslist">${res.map((
          r,i)=>`<div class="rcard"><div class="rtop"><button type="button" class="trkhead" data-act="redit" data-i="${i}" aria-label="Change or delete ${esc(
          r.name)}"><span class="rnm">${esc(r.name)}<small>${r.note?esc(r.note)+" · ":""}${RESET_LABEL[r.reset]||
          "long rest"}</small></span><span class="rct${r.cur?"":" zero"}">${r.cur}/${
          r.max}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>${/bardic inspiration/i.test(r.name)&&r.cur>0&&
          state.list.some(x=>x.kind==="pc"&&!x.hidden&&x.id!==me.id)?`<button type="button" class="linkbtn" data-act="pgive" data-i="${
          i}">Give one…</button>`:""}</div>
          <div class="rpips">${r.max<=12?Array.from({length:Math.ceil(r.max/5)},(_,g)=>`<span class="rgrp">${Array.from({length:Math.min(5,r.max-g*5)},(_,q)=>{
            const k=g*5+q,on=k<r.cur;return `<button type="button" class="rpip${on?" on":""}" data-act="rpip" data-i="${i}" aria-label="${on?"Use one":
            "Get one back"}"></button>`}).join("")}</span>`).join("")
            :`<button type="button" class="btn" data-act="rstep" data-i="${i}" data-d="-1" aria-label="Use one">−</button><b>${
              r.cur}</b><button type="button" class="btn" data-act="rstep" data-i="${i}" data-d="1" aria-label="Get one back">+</button>`}</div></div>`).join(
              "")}</div>`:`<p class="psub">Add spell slots, Hit Dice, Rage, Focus and anything else you count.</p>`}
        <div class="rest"><button type="button" class="btn" data-act="rrest" data-r="short">Short rest</button><button type="button" class="btn" data-act="rrest" data-r="long">Long rest</button></div>
        ${!resDraft.name&&!resDraft.custom?(()=>{const have=new Set(res.map(r=>r.name));
          const row=r=>`<button type="button" class="sprow${have.has(r[0])?" has":
            ""}" data-act="presp" data-n="${esc(r[0])}" data-h="${esc(r[2])}" data-r="${r[1]}"><b>${esc(r[0])}</b><small>${esc(RESET_LABEL[r[1]])}${r[2]?
            " · max "+esc(r[2]):""}${have.has(r[0])?" · already tracked":""}</small></button>`;
          const mineG=RES_GROUPS.filter(g=>g[1]&&g[1]===me.cls),rest=RES_GROUPS.filter(g=>!g[1]),others=RES_GROUPS.filter(g=>g[1]&&g[1]!==me.cls);
          const grp=g=>`<div class="splv">${esc(g[0])}</div>${g[2].map(row).join("")}`;
          return `<div class="psec"><div class="eyebrow2">New tracker</div><div class="splist">${mineG.map(grp).join("")}${rest.map(grp).join("")}
            ${resAll?others.map(grp).join(""):`<button type="button" class="sprow other" data-act="presall"><b>Other classes…</b><small>${mineG.length?
              "features of the other classes":"pick your class's features"}</small></button>`}
            <button type="button" class="sprow other" data-act="presother"><b>Something else…</b><small>type the name yourself</small></button></div></div>`})()
        :`<div class="psec"><div class="eyebrow2">New tracker</div>
          ${
            resDraft.custom?`<div class="spcustom"><input class="field big" id="pResName" maxlength="30" data-kb="text" inputmode="none" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Name, e.g. Ki" value="${
            esc(resDraft.name)}"><button type="button" class="btn" data-act="preschg">List</button></div>`
            :`<div class="spsel"><div><b>${esc(resDraft.name)}</b><small>${resDraft.hint?"Max "+esc(resDraft.hint):
              "How many do you have?"}</small></div><button type="button" class="btn" data-act="preschg">Change</button></div>`}
          ${padHtml("How many?")}
          <div class="seg2"><span class="psub">Recovers:</span>${[["long","Long rest"],["short","Short rest"],["shortOne","1 per short, all on long"],["none",
            "Never"]].map(([k,l])=>`<button type="button" data-act="rreset" data-r="${k}" aria-pressed="${resDraft.reset===k}">${l}</button>`).join("")}</div>
          <button class="btn primary e-send" type="button" data-act="presadd">Add tracker</button></div>`}
        <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="pclose">Close</button></div>`;
    }else if(pSheet==="resedit"){
      const r=resGet()[resEditI];if(!r){pSheet="res";return renderPSheet()}
      body=`<h2>${esc(r.name)}</h2><p class="psub">${r.cur}/${r.max}${r.note?" · "+esc(r.note):""} · ${RESET_LABEL[r.reset]||"long rest"}</p>
        <div class="redrow"><b style="font-family:var(--body);font-size:1rem">Maximum</b><span style="display:flex;align-items:center;gap:10px"><button type="button" class="btn" data-act="rmax" data-d="-1" aria-label="One less">−</button><b>${
          r.max}</b><button type="button" class="btn" data-act="rmax" data-d="1" aria-label="One more">+</button></span></div>
        <div class="seg2"><span class="psub">Recovers:</span>${[["long","Long rest"],["short","Short rest"],["shortOne","1 per short, all on long"],["none",
          "Never"]].map(([k,l])=>`<button type="button" data-act="reditreset" data-r="${k}" aria-pressed="${(r.reset||"long")===
          k}">${l}</button>`).join("")}</div>
        <button type="button" class="btn rdelbtn" data-act="rdel">Delete this tracker</button>
        <p class="psub" style="text-align:center;margin:0">Two taps, so it can't happen by accident. You can undo it right after.</p>
        <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="pres">Back</button></div>`;
    }else if(pSheet==="init"){
      body=`<h2>Initiative · ${esc(me.name)}</h2>${state.surprise?
        `<p class="surpnote">You're surprised: roll initiative with <b>disadvantage</b> (two d20, keep the lower).</p>`:""}
        <div class="psec padsec">${padHtml(typeof me.init==="number"?`Now ${me.init}`:"d20 + mod",
          true)}<button class="btn primary e-send" type="button" data-act="pinitsend">Send</button></div>
        <div class="e-status" id="pStatus"></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="pclose">Close</button></div>`;
    }else{
      const has=new Set((me.conds||[]).map(x=>x.n||x)),ds=dsOf(me),exh=has.has("Exhaustion")?exhOf(me):0,tags=new Set(me.tags||[]);
      const dsHtml=me.down?`<div class="psec"><div class="eyebrow2">Death saves</div><div class="ds big">
          <span class="grp">✓ ${[0,1,2].map(k=>`<button type="button" class="pip s${ds.s>k?" on":
            ""}" data-act="pds" data-k="s" data-i="${k}" aria-label="Success ${k+1}"></button>`).join("")}</span>
          <span class="grp">✗ ${[0,1,2].map(k=>`<button type="button" class="pip f${ds.f>k?" on":
            ""}" data-act="pds" data-k="f" data-i="${k}" aria-label="Failure ${k+1}"></button>`).join("")}</span></div>
          ${isDead(me)||isStable(me)?"":`<button class="btn primary e-send" type="button" data-act="pdsroll">Roll death save</button>`}
          ${dsLast?`<div class="dresult${dsLast.d===20?" n20":dsLast.d===1?" n1":
            ""}"><b>${dsLast.tot}</b><small>d20 (${dsLast.d}) · ${esc(dsLast.msg)}</small></div>`:""}</div>`:"";
      const onMe=state.effects.filter(e=>(e.targets||[]).includes(me.id));   // 1.4: effects live here too (one tab, "On you")
      const effHtml=`<div class="psec"><div class="eyebrow2">Effects on you</div>${onMe.length?`<div class="peffl">${onMe.map(e=>{const by=byId(e.by);
        return `<span class="peffi"><b>✦ ${esc(e.name)}</b><small>${by&&by.id!==me.id?"from "+esc(by.name):"yours"}${effN(e)?" · "+
          effN(e).replace(/<[^>]+>/g,"")+
          " rounds":""}</small></span>`}).join("")}</div>`:""}<button class="btn" type="button" data-act="peffs">Effects…</button></div>`;
      body=`<h2>On you · ${esc(me.name)}</h2>${dsHtml}${effHtml}
        <div class="psec"><div class="eyebrow2">This round</div><div class="chipgrid">${TAGS.map(([k,l])=>
          `<button type="button" data-act="ptag" data-t="${k}" aria-pressed="${tags.has(k)}">${l}</button>`).join("")}</div></div>
        <div class="psec"><div class="eyebrow2">Cover</div><div class="seg2">${COVERS.map(([k,l])=>
          `<button type="button" data-act="pcover" data-c="${k}" aria-pressed="${(me.cover||"")===k}">${l}</button>`).join("")}</div></div>
        <div class="psec"><div class="eyebrow2">Conditions</div><div class="chipgrid">${CONDS.filter(n=>n!=="Exhaustion").map(n=>
          `<button type="button" data-act="pcond" data-n="${n}" aria-pressed="${has.has(n)}">${n}</button>`).join("")}</div></div>
        <div class="psec"><div class="eyebrow2">Exhaustion</div><div class="exhrow"><button type="button" class="btn" data-act="pexh" data-d="-1" ${exh?"":
          "disabled"}>−</button><b id="pExh">${exh||"—"}</b><button type="button" class="btn" data-act="pexh" data-d="1" ${exh>=6?"disabled":
          ""}>+</button></div></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn primary" type="button" data-act="pclose">Done</button></div>`;
    }
  }
  O.dataset.p="1";
  const hm=body.match(/^\s*<h2>([\s\S]*?)<\/h2>/),head=hm?hm[1]:({call:"Roll call"}[pSheet]||""),canClose=pSheet!=="who";
  const rest=(hm?body.slice(hm[0].length):body).replace(
    /<div style="display:flex;justify-content:flex-end"><button class="btn(?: primary)?" type="button" data-act="pclose">(?:Close|Done)<\/button><\/div>/g,"");
  const oldBody=O.querySelector(".psheet .sbody"),keep=oldBody&&O.dataset.ps===pSheet?oldBody.scrollTop:0;
    O.dataset.ps=pSheet;   // a refresh from the table keeps your place
  O.innerHTML=`<div class="scrim pscrim"${canClose?` data-act="pclose"`:
    ""}><div class="sheet psheet" role="dialog" aria-modal="true"><div class="shead">${canClose?'<span class="grab"></span>':""}<h2>${head}</h2>${canClose?
    `<button class="sx" type="button" data-act="pclose" aria-label="Close">${I.x}</button>`:""}</div><div class="sbody">${rest}</div></div></div>`;
  if(keep){const nb=O.querySelector(".psheet .sbody");if(nb)nb.scrollTop=keep}
}
/* HP rules: temp HP absorbs damage first; healing from 0 brings you back; damage at 0 HP is a death save failure (two from a critical hit,
   and it stops you being Stable); damage that leaves at least your max HP over after 0, or at 0 HP, kills you outright */
async function hpChange(kind,n){
  const hp=hpGet(),me=meChar();if(!me)return;let dead=false;
  if(kind==="max"){if(n>0){hp.max=n;if(!hp.cur||hp.cur>n)hp.cur=n}}
  else if(kind==="temp"){hp.temp=Math.max(hp.temp,n)}
  else if(kind==="heal"){if(!hp.max){toast("Set your max HP first");return}hp.cur=Math.min(hp.max,hp.cur+n)}
  else if(kind==="dmg"||kind==="crit"){if(!hp.max){toast("Set your max HP first");return}
    const wasZero=hp.cur===0;const fromTemp=Math.min(hp.temp,n);hp.temp-=fromTemp;const rest=n-fromTemp,over=rest-hp.cur;hp.cur=Math.max(0,hp.cur-rest);
    if(wasZero&&rest>0&&me.down&&!isDead(me)){
      if(rest>=hp.max){dead=true;toast(`${rest} damage at 0 HP is at least your max HP: you die`,6000)}
      else{const ds=Object.assign({s:0,f:0},me.ds),k=kind==="crit"?2:1;if(ds.s>=3)ds.s=0;ds.f=Math.min(3,ds.f+k);pSend({action:"ds",s:ds.s,f:ds.f});
        toast(`Damage at 0 HP: ${k===2?"two death save failures (critical hit)":"one death save failure"}${ds.f>=3?" — you die":""}`)}}
    else if(!wasZero&&hp.cur===0&&over>=hp.max){dead=true;toast(`${over} damage left over at 0 HP is at least your max HP: you die`,6000)}}
  hpSet(hp);hpReport(dead);renderPlayer();
  if(kind==="dmg"&&n>0&&hp.cur>0&&(me.conds||[]).some(x=>(x.n||x)==="Concentrating"))return askConcentration(n);
  renderPSheet();
}
function hpReport(dead){
  const hp=hpGet(),me=meChar();if(!me||!hp.max)return;
  if(dead){pSend({action:"hpstate",bloodied:false,down:true,dead:true});return}   // instant death goes to the table even without automatic HP
  if(!hp.auto)return;
  const down=hp.cur===0,bloodied=!down&&hp.cur<=Math.floor(hp.max/2);
  if(!!me.bloodied!==bloodied||!!me.down!==down)pSend({action:"hpstate",bloodied,down});
}
const myExh=()=>{const me=meChar();return me&&(me.conds||[]).some(x=>(x.n||x)==="Exhaustion")?exhOf(me):0};
