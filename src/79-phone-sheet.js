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
function shBlank(name){return {name:name||"",cls:"",lvl:1,species:"",ac:10,hp:0,speed:30,init:null,prof:null,ab:{str:10,dex:10,con:10,int:10,wis:10,cha:10},sv:
  [],sk:{},sa:"",att:[],spells:null,v:0,by:""}}
function shCalc(sh){
  const lvl=Math.max(1,Math.min(20,Number(sh.lvl)||1)),pb=sh.prof!=null?Number(sh.prof):2+Math.floor((lvl-1)/4),m={};
    SH_AB.forEach(a=>m[a]=shMod((sh.ab||{})[a]));
  const sv={},sk={};SH_AB.forEach(a=>sv[a]=m[a]+((sh.sv||[]).includes(a)?pb:0));SH_SK.forEach(([k,,a])=>sk[k]=m[a]+pb*(Number((sh.sk||{})[k])||0));
  const sa=sh.sa||"";return {lvl,pb,m,sv,sk,init:sh.init!=null?Number(sh.init):m.dex,pp:10+sk.perception,pi:10+sk.insight,pv:10+sk.investigation,
    dc:sh.dc!=null?Number(sh.dc):sa?8+pb+m[sa]:null,atk:sh.atk!=null?Number(sh.atk):sa?pb+m[sa]:null}}
const shAvg=e=>{const x=String(e||"").replace(/\s/g,"").match(/^(\d+)d(\d+)([+-]\d+)?$/i);return x?Math.floor(+x[1]*(+x[2]+1)/2)+(+x[3]||0):null};
/* the sheet as a statblock in the DM's drawer: the same clickable bonuses and damage as a monster's */
function shMd(sh,name){const C=shCalc(sh),L=[];
  L.push(`## ${name||sh.name||"Character"}`,`*${[sh.cls||"",sh.species||""].filter(Boolean).join(" · ")||"Player character"}*`,"",`**Armor Class** ${sh.ac||
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
      "").replace(/([+-])/," $1 ")})${m[2]?" "+m[2]:""} damage`:esc(dm)}.`:""}`)})}
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
  return {sh,found,guess}}
/* the phone's copy, and the laptop's */
const shKey=()=>"sheet:"+(meName||"").toLowerCase();
const shLocal=()=>{const v=ls.get(shKey(),null);return v&&typeof v==="object"&&v.ab?v:null};
function shFromProf(me){const prof=profGet(),sh=shBlank(me?me.name:meName),S=statsGet(),hp=hpGet();
  if(prof.cls.length){sh.cls=prof.cls.map(e=>`${e.n} ${e.lvl||1}${e.sub?` (${e.sub.sn||e.sub.n})`:""}`).join(" / ");
    sh.lvl=prof.cls.reduce((a,e)=>a+(e.lvl||1),0);const k=String(prof.cls[0].n||"").toLowerCase();sh.sv=(SH_CLS_SV[k]||[]).slice();sh.sa=SH_CLS_SA[k]||""}
  else if(me&&LABEL[me.cls]){const k=String(me.cls).toLowerCase();sh.cls=LABEL[me.cls];sh.sv=(SH_CLS_SV[k]||[]).slice();sh.sa=SH_CLS_SA[k]||""}
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
let shLast=null,shAll=false,shDraft=null,shStep=0,shPaste=null;
function shRoll(label,bonus){
  const d=1+Math.floor(Math.random()*20),ex=myExh(),tot=d+bonus-2*ex,text=`${label}: d20 (${d}) ${shS(bonus)}${ex?` −${2*ex} exhaustion`:""}`;
  shLast={label,tot,how:text,n:d===20?"n20":d===1?"n1":""};if(dice.share)pSend({action:"roll",kind:d===20?"nat20":d===1?"nat1":"roll",text,total:tot});
  try{navigator.vibrate&&navigator.vibrate(d===20?[60,40,60,40,200]:d===1?[300]:[60])}catch(e){}return {d,tot,text}}
function shDmg(label,expr){const r=sbDice(String(expr).split(" ")[0],false);if(!r)return;
  const text=`${label}: ${r.n}d${r.d} [${r.rolls.join(", ")}]${r.add?(r.add>0?" + ":" − ")+Math.abs(r.add):""}`;
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
  const C=shCalc(sh),hp=hpGet(),sks=SH_SK.filter(([k])=>shAll||Number((sh.sk||{})[k]));
  return `<div class="psub" style="margin:-6px 0 0">${esc([sh.cls,sh.species].filter(Boolean).join(" · "))}${sh.by==="dm"?" · set up by the DM":""}</div>
    ${shLast?`<div class="dresult ${shLast.n}"><b>${shLast.tot}</b><small>${esc(shLast.how)}</small></div>`:""}
    <div class="shstat"><div><small>AC</small><b>${sh.ac||10}</b></div><div><small>HP</small><b>${hp.max?`${hp.cur}<i>/${hp.max}</i>`:sh.hp||
      "—"}</b></div><div><small>INIT</small><b>${shS(C.init)}</b></div><div><small>SPEED</small><b>${sh.speed||30}</b></div></div>
    <div class="eyebrow2">Tap to roll · checks</div><div class="shabr">${SH_AB.map(a=>
      `<button type="button" data-act="shroll" data-k="ab" data-a="${a}"><small>${SH_AB3[a]}</small><b>${shS(C.m[a])}</b><i>${(sh.ab||{})[a]||
      10}</i></button>`).join("")}</div>
    <div class="eyebrow2">Saves</div><div class="shchips">${SH_AB.map(a=>`<button type="button" class="${(sh.sv||[]).includes(a)?"pf":
      ""}" data-act="shroll" data-k="sv" data-a="${a}">${SH_AB3[a]}<b>${shS(C.sv[a])}</b></button>`).join("")}</div>
    <div class="eyebrow2">Skills</div><div class="shchips">${sks.map(([k,l])=>`<button type="button" class="${Number((sh.sk||{})[k])?"pf":
      ""}" data-act="shroll" data-k="sk" data-a="${esc(k)}">${l}<b>${shS(C.sk[k])}</b></button>`).join("")}<button type="button" data-act="shall">${shAll?
      "Fewer":"All 18…"}</button></div>
    ${sh.sa?`<div class="shbig2"><div><small>Spell save DC</small><b>${
      C.dc}</b></div><button type="button" data-act="shroll" data-k="spatk"><small>Spell attack</small><b>${shS(C.atk)}</b></button></div>`:""}
    ${(sh.att||[]).filter(a=>a.n).map((a,i)=>`<div class="shatk"><b>${esc(a.n)}</b><small>${shS(Number(a.hit)||0)}${a.dmg?" · "+esc(a.dmg):
      ""}</small><span class="r"><button class="btn sm" type="button" data-act="shroll" data-k="hit" data-i="${i}">Hit</button>${a.dmg&&
      sbDice(String(a.dmg).split(" ")[0],false)?`<button class="btn sm primary" type="button" data-act="shroll" data-k="dmg" data-i="${i}">Damage</button>`:
      ""}</span></div>`).join("")}
    <p class="psub">Rolls are shared with the table when "Share" is on in Roll.</p>
    <div class="hpbtns"><button class="btn" type="button" data-act="shedit">Edit sheet</button><button class="btn" type="button" data-act="shpaste">Paste again…</button></div>`}
const SH_STEPS=["Basics","Abilities and saves","Skills","Spells and attacks","Check and save"];
function shStepHtml(){const st=shStep;
  return `<div class="shsteps">${SH_STEPS.map((x,i)=>`<i class="${i<st?"done":i===st?"on":""}"></i>`).join("")}</div><div class="eyebrow2">Step ${st+
    1} of 5 · ${SH_STEPS[st]}</div>`+shStepBody(st)
    +`<div class="hpbtns">${st?`<button class="btn" type="button" data-act="shstep" data-d="-1">Back</button>`:
      `<button class="btn" type="button" data-act="shcancel">Later</button>`}${st<4?
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
  if(st===0)h+=txt("sh_cls","Class and level",d.cls,"Wizard 5 (Evoker)")+txt("sh_species","Species",d.species,"High Elf")+`<div class="shgrid">${num("lvl",
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
  else if(st===3)h+=`<div class="eyebrow2">Spellcasting</div><div class="seg2">${[["","None"],["int","Int"],["wis","Wis"],["cha","Cha"]].map(([k,l])=>
    `<button type="button" data-act="shsa" data-v="${k}" aria-pressed="${(d.sa||"")===k}">${l}</button>`).join("")}</div>
    ${d.sa?`<div class="shbig2"><div><small>Spell save DC</small><b>${C.dc}</b></div><div><small>Spell attack</small><b>${shS(
      C.atk)}</b></div></div><span class="shauto">✓ 8 + proficiency + ${SH_ABN[d.sa]}</span>`:""}
    <div class="eyebrow2" style="margin-top:6px">Attacks</div>
    ${d.att.map((a,i)=>`<div class="shatked">${txt("sh_an_"+i,"Name",a.n,"Longsword")}<div class="shatkrow">${num("hit:"+i,"To hit",shS(Number(a.hit)||
      0))}${txt("sh_ad_"+i,"Damage",a.dmg,"1d8+3 slashing")}<button type="button" class="icon-btn" data-act="shattdel" data-i="${i}" aria-label="Remove">${
      I.x}</button></div></div>`).join("")}
    <button class="btn" type="button" data-act="shattadd">+ Add an attack</button>${d.sa?
      `<p class="psub" style="margin:0">Your prepared spells from Spells are linked to the sheet by themselves.</p>`:""}`;
  else h+=`<div class="shstat"><div><small>AC</small><b>${d.ac}</b></div><div><small>HP</small><b>${d.hp||
    "—"}</b></div><div><small>INIT</small><b>${shS(C.init)}</b></div><div><small>SPEED</small><b>${d.speed}</b></div></div>
    <div class="shsum">${esc(d.cls||"No class")} · ${SH_AB.map(a=>`${SH_AB3[a]} ${d.ab[a]}`).join(" · ")}<br>Saves: ${d.sv.map(a=>SH_AB3[a]).join(", ")||
      "none"} · Skills: ${SH_SK.filter(([k])=>Number(d.sk[k])).map(x=>x[1]).join(", ")||"none"}<br>Passive Perception ${C.pp}${d.sa?` · Spell DC ${C.dc}`:
      ""} · ${d.att.filter(a=>a.n).length} attacks</div>`;
  return h}
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
      3)}</section></div>
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
/* the phone's own number pad: the system keyboard would cover the buttons under the field */
let padVal="",padFor=null,spellQ="",spellScope=null,resAll=false;
const padHtml=(ph,neg)=>`<div class="padshow" id="padShow" data-ph="${esc(ph)}" aria-live="polite">${esc(padVal)}</div>
  <div class="numpad">${["1","2","3","4","5","6","7","8","9",neg?"neg":"clr","0","back"].map(k=>
    `<button type="button" data-act="pkey" data-k="${k}" aria-label="${k==="back"?"Delete":k==="clr"?"Clear":k==="neg"?"Minus":k}">${k==="back"?"⌫":k==="clr"?
    "C":k==="neg"?"±":k}</button>`).join("")}</div>`;
function padKey(k){
  if(k==="back")padVal=padVal.slice(0,-1);else if(k==="clr")padVal="";else if(k==="neg")padVal=padVal.startsWith("-")?padVal.slice(1):"-"+padVal;
  else if(padVal.replace("-","").length<3||(padVal.length<4&&!padVal.startsWith("-")))padVal=(padVal==="0"?"":padVal==="-0"?"-":padVal)+k;
  const el=$("#padShow");if(el)el.textContent=padVal;
}
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
      pSheet==="dice"||pSheet==="more"||pSheet==="conc"||pSheet==="dsave"||pSheet==="book"||(pSheet==="spell"&&(!spView||spView.from!=="effs"));
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
        <div class="hpbtns"><button class="btn primary" type="button" data-act="pconroll">Roll it</button><button class="btn" type="button" data-act="pconroll" data-adv="1">Roll with advantage</button></div>
        <div class="psec"><div class="eyebrow2">Rolled real dice?</div><div class="hpbtns"><button class="btn heal" type="button" data-act="pconres" data-ok="1">I made it</button><button class="btn dmg" type="button" data-act="pconres" data-ok="0">I lost it</button></div></div>`}
        ${!still&&!r?`<p class="psub">You're no longer Concentrating.</p>`:""}`;
    }else if(pSheet==="more"){
      body=`<h2>${esc(me.name)}</h2><div class="morelist">
        <button class="pcline" type="button" data-act="psheet">${shLocal()?`<b>My character sheet</b><small>${esc(shLocal().cls||
          "Your sheet")} · tap to roll, or edit</small>`:
          `<b>My character sheet</b><small>Add it once: the DM sees it, and your phone rolls with your real bonuses</small>`}</button>
        <button class="btn" type="button" data-act="pwho">Not ${esc(me.name)}? Change character</button>
        <button class="btn" type="button" data-act="fs">${fsLabel()}</button>
        <button class="btn" type="button" data-act="plight" aria-pressed="${!!ls.get("pLight",false)}">${ls.get("pLight",false)?MOON+" Dark screen":SUN+
          " Light screen"}</button>
        <button class="btn" type="button" data-act="psimple" aria-pressed="${pSimple()}">${pSimple()?"Show everything again":
          "Simple: just my HP"}<br><small style="font-weight:600;color:var(--muted)">${pSimple()?"Resources, spells, dice, conditions and the rest come back.":
          "Only your HP, and whatever the DM sends you. For players who keep the rest on paper."}</small></button></div>
        <p class="psub">Tap a status in the bar at the bottom twice to remove it. The light or dark screen is only on this phone.</p>`;
    }else if(pSheet==="sheet"){
      body=`<h2>${esc(me.name)}</h2>${shViewHtml(me)}`;
    }else if(pSheet==="shed"){
      if(!shDraft){pSheet="sheet";return renderPSheet()}
      body=`<h2>Character sheet · ${esc(me.name)}</h2>${shStepHtml()}`;
    }else if(pSheet==="shpaste"){
      body=`<h2>Paste from my sheet</h2>${shPasteHtml()}`;
    }else if(pSheet==="call"){
      const call=state.call;if(!call||(call.answers||{})[me.id]!=null){pSheet=null;return renderPSheet()}
      const ask=shAsk(call.text);
      body=`<div class="callhead">${D20}<div><div class="eyebrow2">The DM calls for a roll</div><h2>${esc(call.text)}</h2></div></div>
        ${ask?`<button class="shrollbig" type="button" data-act="pcallroll"><b>Roll ${esc(ask.label)} ${shS(
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
          <div class="psec padsec">${padHtml("How much?")}
            <div class="hpbtns"><button class="btn dmg" type="button" data-act="phpdo" data-hp="dmg">Damage</button><button class="btn heal" type="button" data-act="phpdo" data-hp="heal">Heal</button><button class="btn" type="button" data-act="phpdo" data-hp="temp">Temp HP</button></div>
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
      body=`<h2>My conditions · ${esc(me.name)}</h2>${dsHtml}
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
/* HP rules: temp HP absorbs damage first; healing from 0 brings you back; damage at 0 HP is a death save failure */
async function hpChange(kind,n){
  const hp=hpGet(),me=meChar();if(!me)return;
  if(kind==="max"){if(n>0){hp.max=n;if(!hp.cur||hp.cur>n)hp.cur=n}}
  else if(kind==="temp"){hp.temp=Math.max(hp.temp,n)}
  else if(kind==="heal"){if(!hp.max){toast("Set your max HP first");return}hp.cur=Math.min(hp.max,hp.cur+n)}
  else if(kind==="dmg"){if(!hp.max){toast("Set your max HP first");return}
    const wasZero=hp.cur===0;const fromTemp=Math.min(hp.temp,n);hp.temp-=fromTemp;hp.cur=Math.max(0,hp.cur-(n-fromTemp));
    if(wasZero&&n>0&&me.down){const ds=Object.assign({s:0,f:0},me.ds);ds.f=Math.min(3,ds.f+1);pSend({action:"ds",s:ds.s,f:ds.f});
      toast("Damage at 0 HP: one death save failure")}}
  hpSet(hp);hpReport();renderPlayer();
  if(kind==="dmg"&&n>0&&hp.cur>0&&(me.conds||[]).some(x=>(x.n||x)==="Concentrating"))return askConcentration(n);
  renderPSheet();
}
function hpReport(){
  const hp=hpGet(),me=meChar();if(!me||!hp.auto||!hp.max)return;
  const down=hp.cur===0,bloodied=!down&&hp.cur<=Math.floor(hp.max/2);
  if(!!me.bloodied!==bloodied||!!me.down!==down)pSend({action:"hpstate",bloodied,down});
}
const myExh=()=>{const me=meChar();return me&&(me.conds||[]).some(x=>(x.n||x)==="Exhaustion")?exhOf(me):0};
