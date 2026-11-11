/* ---- your character from the 5e.tools files: class, subclass and level make the trackers; feats and class options add theirs ---- */
let pcData=null,pcTried=0,pcLoading=null,pcDraft=null,pcFeatQ="",pcFeatCache=new Map();
function pcLoad(){if(pcData||!served)return Promise.resolve(pcData);
  if(!pcLoading)pcLoading=fetch("/pc",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{pcData=d&&Array.isArray(d.cls)&&d.cls.length?d:null;pcLoading=null;pcTried=Date.now();return pcData}).catch(()=>{pcLoading=null;pcTried=Date.now();return null});
  return pcLoading}
const profKey=()=>"pcProf:"+(meName||"").toLowerCase();
const profGet=()=>{const v=ls.get(profKey(),null);return v&&Array.isArray(v.cls)?Object.assign({feats:[],mods:{}},v):{cls:[],feats:[],mods:{}}};
const profSet=v=>ls.set(profKey(),v);
const pcTxt=x=>refPlain(fetTxt(String(x??""))).replace(/\*\*/g,"").trim();
const PC_CORE=new Set(["PHB","XPHB"]);
const pcEdLabel=c=>c.s==="XPHB"?"2024":c.s==="PHB"?"2014":srcName(c.l||c.s);
const pcClass=e=>pcData&&pcData.cls.find(c=>c.n===e.n&&c.s===e.s);
function pcSubs(c){   // the subclasses for that class; a 2014 one on the 2024 class is a copy, so its numbers come from the original
  if(!pcData||!c)return [];const seen=new Set(),out=[];
  pcData.sub.filter(x=>x.cn===c.n&&x.cs===c.s).forEach(x=>{const k=x.n+"|"+x.s;if(seen.has(k))return;seen.add(k);
    const full=x.cp||(x.tb||[]).length?x:pcData.sub.find(y=>y.cn===c.n&&y.n===x.n&&y.s===x.s&&(y.cp||(y.tb||[]).length))||x;const as=(x.as||[]).length?x.as:(pcData.sub.find(y=>y.n===x.n&&y.s===x.s&&(y.as||[]).length)||{}).as||[];out.push(Object.assign({},x,{cp:full.cp,tb:full.tb,as}))});
  return out.sort((a,b)=>(a.g==="off"?0:1)-(b.g==="off"?0:1)||a.sn.localeCompare(b.sn))}
const pcNum=v=>typeof v==="number"?v:typeof v==="string"&&/^\d+$/.test(v.trim())?Number(v):NaN;
const PC_SLOTS=[[],[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],
  [4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]];
/* the columns of a class table that are things you spend: [tracker name, how it comes back in 2024, in 2014] */
const PC_COLS={"rages":["Rage","shortOne","long"],"second wind":["Second Wind","shortOne","short"],"channel divinity":["Channel Divinity","shortOne","short"],"wild shape":["Wild Shape","shortOne","short"],
  "ki points":["Ki Points","short","short"],"focus points":["Focus Points","short","short"],"sorcery points":["Sorcery Points","long","long"],"favored enemy":["Hunter's Mark (free)","long","long"],
  "superiority dice":["Superiority Dice","short","short"],"infusions known":null,"invocations":null,"invocations known":null};
/* what the tables don't have: [class, subclass or "", name, max(level, 2024?, mods, pb), rest(level, 2024?), ability it needs] */
const PC_FEATS=[
  ["bard","","Bardic Inspiration",(l,e,m)=>Math.max(1,m.cha??0),l=>l>=5?"short":"long","cha"],
  ["cleric","","Channel Divinity",(l,e)=>e?0:l>=18?3:l>=6?2:l>=2?1:0,()=>"short"],
  ["cleric","","Divine Intervention",(l,e)=>e&&l>=10?1:0,()=>"long"],
  ["druid","","Wild Shape",(l,e)=>e?0:l>=2?2:0,()=>"short"],
  ["fighter","","Second Wind",(l,e)=>e?0:1,()=>"short"],
  ["fighter","","Action Surge",l=>l>=17?2:l>=2?1:0,()=>"short"],
  ["fighter","","Indomitable",l=>l>=17?3:l>=13?2:l>=9?1:0,()=>"long"],
  ["fighter","battle master","Superiority Dice",l=>l>=15?6:l>=7?5:l>=3?4:0,()=>"short"],
  ["monk","","Uncanny Metabolism",(l,e)=>e&&l>=2?1:0,()=>"long"],
  ["paladin","","Lay on Hands",l=>5*l,()=>"long"],
  ["paladin","","Divine Sense",(l,e,m)=>e?0:1+Math.max(0,m.cha??0),()=>"long","cha2014"],
  ["paladin","","Channel Divinity",(l,e)=>e?0:l>=3?1:0,()=>"short"],
  ["rogue","","Stroke of Luck",l=>l>=20?1:0,()=>"short"],
  ["sorcerer","","Innate Sorcery",(l,e)=>e?2:0,()=>"long"],
  ["warlock","","Mystic Arcanum (level 6)",l=>l>=11?1:0,()=>"long"],["warlock","","Mystic Arcanum (level 7)",l=>l>=13?1:0,()=>"long"],
  ["warlock","","Mystic Arcanum (level 8)",l=>l>=15?1:0,()=>"long"],["warlock","","Mystic Arcanum (level 9)",l=>l>=17?1:0,()=>"long"],
  ["wizard","","Arcane Recovery",()=>1,()=>"long"],
  ["artificer","","Flash of Genius",(l,e,m)=>l>=7?Math.max(1,m.int??0):0,()=>"long","int"]];
const PC_ABIL={cha:"Charisma",int:"Intelligence",wis:"Wisdom",str:"Strength",dex:"Dexterity",con:"Constitution"};
function pcNeeds(prof){   // the ability modifiers the trackers need
  const n=new Set();prof.cls.forEach(e=>{const c=pcClass(e);if(!c)return;const k=c.n.toLowerCase(),e24=c.s!=="PHB";
    PC_FEATS.forEach(f=>{if(f[0]===k&&f[5]&&(f[5]!=="cha2014"||!e24)&&f[3](e.lvl,e24,{},2)>0)n.add(f[5]==="cha2014"?"cha":f[5])})});
  (prof.feats||[]).forEach(f=>(f.u||[]).forEach(u=>{if(u.max&&u.max.mod)n.add(u.max.mod)}));return [...n]}
function pcTrackers(prof){
  const out=[],add=(name,max,reset,note)=>{if(!(max>0))return;const o=out.find(x=>x.name===name);if(o){o.max=Math.max(o.max,max);return}out.push({name,max,reset,auto:true,...(note?{note}:{})})};
  const mods=prof.mods||{},total=prof.cls.reduce((a,e)=>a+(e.lvl||0),0),pb=2+Math.floor((Math.max(1,total)-1)/4);
  const rows=[];prof.cls.forEach(e=>{const c=pcClass(e);if(!c)return;const sub=e.sub?pcSubs(c).find(x=>x.n===e.sub.n&&x.s===e.sub.s):null;rows.push({e,c,sub,lvl:Math.max(1,Math.min(20,e.lvl||1)),e24:c.s!=="PHB"})});
  // spell slots: one caster uses its own table; several add up their caster levels
  const casters=rows.filter(r=>{const cp=r.c.cp||(r.sub&&r.sub.cp)||"";return cp&&cp!=="pact"});
  const own=r=>{const t=(r.c.tb||[]).concat(r.sub?r.sub.tb||[]:[]).find(t=>t.sp);return t?(t.r[r.lvl-1]||[]).map(pcNum):null};
  let slots=[];
  if(casters.length===1)slots=own(casters[0])||[];
  else if(casters.length>1){const cl=casters.reduce((a,r)=>{const cp=r.c.cp||(r.sub&&r.sub.cp);return a+(cp==="full"?r.lvl:cp==="artificer"?Math.ceil(r.lvl/2):cp==="1/2"?Math.floor(r.lvl/2):cp==="1/3"?Math.floor(r.lvl/3):0)},0);slots=PC_SLOTS[Math.min(20,cl)]||[]}
  slots.forEach((n,i)=>add(`Spell slot ${i+1}`,n,"long"));
  rows.forEach(r=>{
    const k=r.c.n.toLowerCase(),sk=r.sub?r.sub.sn.toLowerCase():"";
    (r.c.tb||[]).concat(r.sub?r.sub.tb||[]:[]).forEach(t=>{if(t.sp)return;const cols=t.c.map(pcTxt),row=t.r[r.lvl-1]||[];
      const si=cols.findIndex(x=>/^spell slots$/i.test(x)),li=cols.findIndex(x=>/^slot level$/i.test(x));
      if(si>=0&&li>=0){const n=pcNum(row[si]),lv=String(pcTxt(row[li])).match(/\d/);add("Pact slots",n,"short",lv?`level ${lv[0]}`:"")}
      cols.forEach((cn,i)=>{if(i===si||i===li)return;const key=cn.toLowerCase();let m=PC_COLS[key];
        if(m===null)return;if(!m&&/points|charges|uses/i.test(cn))m=[cn,"long","long"];if(!m)return;
        add(m[0],pcNum(row[i]),r.e24?m[1]:m[2])})});
    PC_FEATS.forEach(f=>{if(f[0]!==k||(f[1]&&f[1]!==sk))return;add(f[2],f[3](r.lvl,r.e24,mods,pb),f[4](r.lvl,r.e24))})});
  // Hit Dice by size
  const hd={};rows.forEach(r=>{if(r.c.hd)hd[r.c.hd]=(hd[r.c.hd]||0)+r.lvl});const hk=Object.keys(hd);
  hk.forEach(f=>add(hk.length>1?`Hit Dice d${f}`:"Hit Dice",hd[f],"long",hk.length>1?"":`d${f}`));
  // feats and class options
  (prof.feats||[]).forEach(f=>(f.u||[]).forEach(u=>{const mx=typeof u.max==="number"?u.max:u.max==="pb"?pb:u.max&&u.max.mod?Math.max(1,mods[u.max.mod]??0):0;add(u.name,mx,u.reset)}));
  return out;
}
/* how often a feat or an invocation can be used, read from its text */
function pcUses(item){
  const W={one:1,two:2,three:3,four:4,five:5},out=[];
  const look=(name,text)=>{const t=pcTxt(text);if(!/\b(long|short) rest\b/i.test(t))return;
    let max=null,m;
    if(/equal to your proficiency bonus/i.test(t))max="pb";
    else if((m=t.match(/equal to (?:1 \+ )?your (strength|dexterity|constitution|intelligence|wisdom|charisma) modifier/i)))max={mod:m[1].slice(0,3).toLowerCase()};
    else if((m=t.match(/\byou have (\d+|one|two|three|four|five) (?:[a-z]+ )?points\b/i)))max=W[m[1].toLowerCase()]||Number(m[1]);
    else if((m=t.match(/\b(\d+|two|three) times\b/i)))max=W[m[1].toLowerCase()]||Number(m[1]);
    else if(/\bonce\b|can't (?:do so|use (?:it|this)[^.]*) again until|regain the ability/i.test(t))max=1;
    if(max==null)return;
    const reset=/short or long rest/i.test(t)?"short":/long rest/i.test(t)?"long":"short";
    out.push({name,max,reset})};
  const fn=item.name;let any=false;
  fetArr(item.entries).forEach(e=>{if(e&&typeof e==="object"&&e.name&&(e.entries||e.entry)){any=true;look(`${fn}: ${pcTxt(e.name)}`,fetEntries(e.entries||e.entry).join(" "))}});
  if(!out.length)look(fn,fetEntries(item.entries).join(" "));
  return out.slice(0,4);
}
async function pcFeatGet(t,n,src){const k=t+"|"+n+"|"+src;if(pcFeatCache.has(k))return pcFeatCache.get(k);
  try{const r=await fetch(`/pcref?t=${encodeURIComponent(t)}&n=${encodeURIComponent(n)}&s=${encodeURIComponent(src)}`,{cache:"no-store"});const d=r.ok?await r.json():null;pcFeatCache.set(k,d);return d}catch(e){return null}}
const PC_FT={EI:"Invocation",MM:"Metamagic","MV:B":"Maneuver",MV:"Maneuver",FS:"Fighting style","FS:F":"Fighting style","FS:P":"Fighting style","FS:R":"Fighting style",AI:"Infusion",PB:"Pact boon",AS:"Arcane shot",ED:"Elemental discipline",RN:"Rune",OR:"Onomancy",TT:"Traveler's trick"};
const PC_FC={O:"Origin feat",G:"General feat",FS:"Fighting style",EB:"Epic boon",D:"Dragonmark"};
let pcFeatView=-1,giveDraft=null,compId=null;
const statsKey=()=>"pStats:"+(meName||"").toLowerCase(),statsGet=()=>{const v=ls.get(statsKey(),{});return v&&typeof v==="object"?v:{}},statsSet=v=>ls.set(statsKey(),v);
function giveDie(name){   // Bardic Inspiration grows with the bard's level
  if(!/bardic/i.test(name))return /guidance/i.test(name)?"d4":"d6";const p=profGet(),b=p.cls.find(e=>e.n.toLowerCase()==="bard"),l=b?b.lvl:1;return l>=15?"d12":l>=10?"d10":l>=5?"d8":"d6"}
function pcGuess(me){   // the class the DM gave this character, in the rules this phone uses
  if(!pcData||!me||!me.cls)return null;const L=pcData.cls.filter(c=>c.n.toLowerCase()===me.cls&&PC_CORE.has(c.s));
  const c=L.find(c=>c.s===(sp14()?"PHB":"XPHB"))||L[0];return c?{n:c.n,s:c.s,lvl:1,sub:null}:null}
const pcFeatKind=f=>f[0]==="feat"?(PC_FC[f[4]]||"Feat"):(String(f[4]).split(",").map(x=>PC_FT[x]||PC_FT[x.split(":")[0]]).filter(Boolean)[0]||"Class option");
function pcFeatHits(){
  const q=pcFeatQ.trim().toLowerCase();if(!pcData||q.length<2)return [];const old=sp14(),have=new Set((pcDraft.feats||[]).map(f=>f.t+"|"+f.n+"|"+f.s));
  return pcData.feats.filter(f=>f[1].toLowerCase().includes(q)&&!have.has(f[0]+"|"+f[1]+"|"+f[2]))
    .sort((a,b)=>(a[1].toLowerCase().startsWith(q)?0:1)-(b[1].toLowerCase().startsWith(q)?0:1)||(old?b[6]-a[6]:a[6]-b[6])||(a[5]==="off"?0:1)-(b[5]==="off"?0:1)||a[1].localeCompare(b[1]))
    .slice(0,24)}
const pcFeatListHtml=()=>{const h=pcFeatHits();return h.length?h.map(f=>`<button type="button" class="sprow" data-act="pcfeatadd" data-t="${esc(f[0])}" data-n="${esc(f[1])}" data-s="${esc(f[2])}" data-l="${esc(f[3])}"><b>${esc(f[1])}</b><small>${esc(pcFeatKind(f))} · ${esc(srcName(f[3]||f[2]))}</small></button>`).join("")
  :pcFeatQ.trim().length>=2?`<p class="psub">Nothing by that name.</p>`:""};
function pcClassOptions(cur){
  if(!pcData)return "";const old=sp14(),L=pcData.cls.filter(c=>c.g==="off"||c.g==="own"),hb=pcData.cls.filter(c=>c.g==="hb");
  const core=L.filter(c=>PC_CORE.has(c.s)&&(old?c.s==="PHB":c.s==="XPHB")),rest=L.filter(c=>!core.includes(c));
  if(cur&&!core.includes(cur)&&!rest.includes(cur)&&!hb.includes(cur))rest.unshift(cur);
  const opt=c=>`<option value="${esc(c.n+"|"+c.s)}"${cur&&cur.n===c.n&&cur.s===c.s?" selected":""}>${esc(c.n)} · ${esc(pcEdLabel(c))}</option>`;
  return `<option value="">Pick a class</option>${core.map(opt).join("")}<optgroup label="Other books">${rest.map(opt).join("")}</optgroup>${hb.length?`<optgroup label="Homebrew">${hb.map(opt).join("")}</optgroup>`:""}`}
function pcSheetHtml(me){
  if(!pcData)return `<h2>Your character</h2><p class="psub">${pcLoading?"Reading the classes from the laptop…":"The laptop has no class data (it comes from the DM's own data files; the built-in SRD doesn't include it), so classes can't be read. You can still add trackers by hand in Resources."}</p>
    <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="pres">Back</button></div>`;
  const d=pcDraft,needs=pcNeeds(d),tot=d.cls.reduce((a,e)=>a+(e.lvl||0),0),prev=pcTrackers(d);
  return `<h2>Your character · ${esc(me.name)}</h2><p class="psub">From the 5e.tools files on the laptop. Your class and level make your trackers: spell slots, Rage, Focus Points, Hit Dice…</p>
    ${d.cls.map((e,i)=>{const c=pcClass(e),subs=pcSubs(c);return `<div class="pccls"><select class="field" data-pc="cls" data-i="${i}" aria-label="Class">${pcClassOptions(c)}</select>
      <div class="pclvl"><span class="psub">Level</span><button type="button" class="btn" data-act="pclvl" data-i="${i}" data-d="-1" aria-label="Level down">−</button><b>${e.lvl||1}</b><button type="button" class="btn" data-act="pclvl" data-i="${i}" data-d="1" aria-label="Level up">+</button>
        ${d.cls.length>1?`<button type="button" class="icon-btn" data-act="pcclsrm" data-i="${i}" aria-label="Remove this class">${I.x}</button>`:""}</div>
      ${subs.length?`<select class="field" data-pc="sub" data-i="${i}" aria-label="Subclass"><option value="">No subclass yet</option>${subs.map(x=>`<option value="${esc(x.n+"|"+x.s)}"${e.sub&&e.sub.n===x.n&&e.sub.s===x.s?" selected":""}>${esc(x.sn)}${PC_CORE.has(x.s)?"":" · "+esc(srcName(x.l||x.s))}</option>`).join("")}</select>`:""}</div>`}).join("")}
    ${d.cls.length&&d.cls.length<4&&tot<20?`<button type="button" class="linkbtn" data-act="pcclsadd">+ Another class (multiclass)</button>`:""}
    ${needs.length?`<div class="psec"><div class="eyebrow2">Some trackers count your modifier</div>${needs.map(a=>`<div class="pclvl"><span class="psub">${PC_ABIL[a]} modifier</span><button type="button" class="btn" data-act="pcmod" data-a="${a}" data-d="-1">−</button><b>${(d.mods[a]??0)>=0?"+":""}${d.mods[a]??0}</b><button type="button" class="btn" data-act="pcmod" data-a="${a}" data-d="1">+</button></div>`).join("")}</div>`:""}
    <div class="psec"><div class="eyebrow2">Feats, invocations and other options</div>
      ${(d.feats||[]).length?`<div class="pcfeats">${d.feats.map((f,i)=>`<span class="pchip"><button type="button" class="pcfn" data-act="pcfeatview" data-i="${i}">${esc(f.n)}${(f.u||[]).length?` <small>${f.u.length} tracker${f.u.length>1?"s":""}</small>`:""}</button><button type="button" class="x" data-act="pcfeatrm" data-i="${i}" aria-label="Remove ${esc(f.n)}">${I.x}</button></span>`).join("")}</div>`:""}
      <input class="field big" id="pcFeatQ" type="text" data-kb="text" inputmode="none" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Search: Lucky, Agonizing Blast…" value="${esc(pcFeatQ)}">
      <div class="splist" id="pcFeatList">${pcFeatListHtml()}</div></div>
    <div class="psec"><div class="eyebrow2">Your numbers for the DM <small>for passive checks and the party sheet</small></div>${pcStatsHtml()}</div>
    <div class="psec"><div class="eyebrow2">Trackers this makes</div><p class="psub">${prev.length?prev.map(x=>`${esc(x.name)} ${x.max}`).join(" · "):"Pick a class first."}</p></div>
    <div class="spacts"><button class="btn" type="button" data-act="pres">Cancel</button><button class="btn primary" type="button" data-act="pcbuild"${d.cls.some(e=>pcClass(e))?"":" disabled"}>Make my trackers</button></div>`;
}
function pcStatsHtml(){const S=statsGet(),row=(k,l,def)=>`<div class="pclvl"><span class="psub">${l}</span><button type="button" class="btn" data-act="pstat" data-k="${k}" data-d="-1">−</button><b>${S[k]??def}</b><button type="button" class="btn" data-act="pstat" data-k="${k}" data-d="1">+</button></div>`;
  return row("ac","Armor Class",10)+row("pp","Passive Perception",10)+row("pi","Passive Insight",10)+row("pv","Passive Investigation",10)+row("dc","Spell save DC (0 = none)",0)+`<button type="button" class="btn" data-act="pstatsend">Send to the DM</button>`}
