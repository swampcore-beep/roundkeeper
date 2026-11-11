/* ---------- 5e.tools: monsters from the DM's own 5etools folder (read by the laptop's server, never sent to players) ---------- */
const FET_REF_T=new Set(["spell","condition","disease","status","item","action","variantrule","sense","skill","creature"]);
const refPlain=s=>String(s??"").replace(/⟦(?:[^|⟧]*\|){3}([^⟧]*)⟧/g,"$1");
const FET_SIZE={T:"Tiny",S:"Small",M:"Medium",L:"Large",H:"Huge",G:"Gargantuan"};
const FET_AL={L:"Lawful",N:"Neutral",NX:"Neutral",NY:"Neutral",C:"Chaotic",G:"Good",E:"Evil",U:"Unaligned",A:"Any Alignment"};
const FET_AB={str:"Strength",dex:"Dexterity",con:"Constitution",int:"Intelligence",wis:"Wisdom",cha:"Charisma"};
const FET_SKILL={acrobatics:"dex",animal_handling:"wis","animal handling":"wis",arcana:"int",athletics:"str",deception:"cha",history:"int",insight:"wis",intimidation:"cha",investigation:"int",medicine:"wis",nature:"int",perception:"wis",performance:"cha",persuasion:"cha",religion:"int",sleight_of_hand:"dex","sleight of hand":"dex",stealth:"dex",survival:"wis"};
const fetClone=o=>o==null?o:JSON.parse(JSON.stringify(o));
const fetArr=x=>x==null?[]:Array.isArray(x)?x:[x];
const fetMod=v=>Math.floor(((Number(v)||10)-10)/2);
const fetSign=n=>(n>=0?"+":"−")+Math.abs(n);
function fetCr(m){const c=m.cr;return c&&typeof c==="object"?String(c.cr||""):String(c||"")}
function fetPB(cr){const v=cr==="1/8"||cr==="1/4"||cr==="1/2"?0:Number(cr)||0;return v<5?2:v<9?3:v<13?4:v<17?5:v<21?6:v<25?7:v<29?8:9}
/* {@tag text|source|display} to plain words */
function fetTxt(s){
  s=String(s??"");let guard=0,prev;
  do{prev=s;s=s.replace(/\{@(\w+)(?: ([^{}]*))?\}/g,(m,tag,inner)=>{inner=inner||"";const p=inner.split("|"),t=tag.toLowerCase();
    if(t==="atk"||t==="atkr"){const k=inner.split(",").map(x=>x.trim());const kind=k.map(x=>x[0]==="m"?"Melee":x[0]==="r"?"Ranged":"").filter(Boolean);
      const what=t==="atkr"?"Attack Roll":/s/.test(inner)?"Spell Attack":"Weapon Attack";return `${[...new Set(kind)].join(" or ")} ${what}:`}
    if(t==="hit")return fetSign(Number(p[0])||0);
    if(t==="h")return "Hit: ";if(t==="m")return "Miss: ";if(t==="hom")return "Hit or Miss: ";
    if(t==="damage"||t==="dice"||t==="d20"||t==="scaledamage"||t==="scaledice")return p[t.startsWith("scale")?2:0]||p[0];
    if(t==="dc")return "DC "+p[0];
    if(t==="recharge")return `(Recharge ${p[0]||6}${(p[0]||6)<6?"–6":""})`;
    if(t==="actsave")return `${FET_AB[p[0]]||p[0]} Saving Throw:`;
    if(t==="actsavefail")return "Failure:";if(t==="actsavesuccess")return "Success:";if(t==="actsavesuccessorfail")return "Failure or Success:";
    if(t==="acttrigger")return "Trigger:";if(t==="actresponse")return "Response:";
    if(t==="hityourspellattack")return "your spell attack modifier";
    if(t==="chance")return (p[1]||p[0])+" percent";
    if(t==="b"||t==="bold")return `**${p[0]}**`;if(t==="i"||t==="italic")return `*${p[0]}*`;
    if(t==="note"||t==="u"||t==="sup"||t==="sub"||t==="s"||t==="strike")return p[0];
    if(FET_REF_T.has(t))return `⟦${t}|${p[0]}|${p[1]||""}|${p[2]||p[0]}⟧`;   // kept, so the statblock can show it on hover
    return p[2]||p[0]})}while(s!==prev&&++guard<6);
  return s;
}
function fetEntries(es,depth){
  const out=[];
  fetArr(es).forEach(e=>{
    if(e==null)return;
    if(typeof e==="string"||typeof e==="number"){out.push(fetTxt(e));return}
    if(e.type==="list")fetArr(e.items).forEach(it=>out.push("• "+fetEntries([it],(depth||0)+1).join(" ")));
    else if(e.type==="item"||e.type==="itemSub")out.push((e.name?`**${fetTxt(e.name)}** `:"")+fetEntries(e.entries||e.entry,(depth||0)+1).join(" "));
    else if(e.type==="table")fetArr(e.rows).forEach(r=>out.push(fetArr(r).map(c=>typeof c==="object"?fetEntries([c.roll?`${c.roll.exact??c.roll.min+"–"+c.roll.max}`:c]).join(" "):fetTxt(c)).join(" | ")));
    else if(e.entries||e.entry)out.push((e.name?`**${fetTxt(e.name)}.** `:"")+fetEntries(e.entries||e.entry,(depth||0)+1).join(" "));
  });
  return out;
}
/* a 5e.tools "copy of another monster" and the edits it lists */
function fetWalkStrings(o,f){if(typeof o==="string")return f(o);if(Array.isArray(o))return o.map(x=>fetWalkStrings(x,f));
  if(o&&typeof o==="object"){const r={};for(const k in o)r[k]=k==="name"||k==="type"||k==="source"?o[k]:fetWalkStrings(o[k],f);return r}return o}
const FET_TEXT_PROPS=["trait","action","bonus","reaction","legendary","mythic","lairActions","regionalEffects","variant","legendaryHeader","mythicHeader","spellcasting"];
function fetApplyMods(out,mods,tmplName){
  for(const prop in mods){fetArr(mods[prop]).forEach(md=>{
    if(typeof md==="string")md={mode:md};const mode=md.mode;
    const props=prop==="*"?FET_TEXT_PROPS.filter(p=>out[p]):[prop];
    props.forEach(p=>{
      const items=fetClone(fetArr(md.items));const named=x=>(typeof x==="object"&&x)?x.name:x;
      if(mode==="replaceTxt"){let re;try{re=new RegExp(md.replace,md.flags||"g")}catch(e){return}
        if(out[p]!=null)out[p]=fetWalkStrings(out[p],str=>str.split(/(\{@[^}]*\})/).map((part,i)=>i%2?part:part.replace(re,md.with)).join(""))}
      else if(mode==="appendArr")out[p]=fetArr(out[p]).concat(items);
      else if(mode==="prependArr")out[p]=items.concat(fetArr(out[p]));
      else if(mode==="appendIfNotExistsArr"){const have=fetArr(out[p]).map(x=>JSON.stringify(x));out[p]=fetArr(out[p]).concat(items.filter(x=>!have.includes(JSON.stringify(x))))}
      else if(mode==="insertArr"){const a=fetArr(out[p]).slice();a.splice(md.index||0,0,...items);out[p]=a}
      else if(mode==="replaceArr"||mode==="replaceOrAppendArr"){const a=fetArr(out[p]).slice();const r=md.replace;
        const i=r&&typeof r==="object"&&r.index!=null?r.index:a.findIndex(x=>named(x)===(r&&typeof r==="object"?r.regex?null:r.name:r)||(r&&r.regex&&typeof named(x)==="string"&&new RegExp(r.regex,r.flags||"").test(named(x))));
        if(i>=0)a.splice(i,1,...items);else if(mode==="replaceOrAppendArr")a.push(...items);out[p]=a}
      else if(mode==="removeArr"){const names=fetArr(md.names);const its=fetArr(md.items).map(x=>JSON.stringify(x));
        out[p]=fetArr(out[p]).filter(x=>!names.includes(named(x))&&!its.includes(JSON.stringify(x)))}
      else if(mode==="renameArr"){fetArr(md.renames).forEach(rn=>{fetArr(out[p]).forEach(x=>{if(x&&x.name===rn.rename)x.name=rn.with})})}
      else if(mode==="remove"){if(md.names)out[p]=fetArr(out[p]).filter(x=>!fetArr(md.names).includes(named(x)));else delete out[p]}
      else if(mode==="setProp"){const path=String(md.prop||"").split(".");let o=out;path.slice(0,-1).forEach(k=>{o[k]=o[k]||{};o=o[k]});if(path[0])o[path[path.length-1]]=fetClone(md.value)}
      else if(mode==="addSenses"){fetArr(md.senses).forEach(se=>{const txt=`${se.type} ${se.range} ft.`;out.senses=fetArr(out.senses).filter(x=>!String(x).toLowerCase().startsWith(se.type)).concat([txt])})}
      else if(mode==="addSkills"||mode==="addSaves"){const key=mode==="addSkills"?"skill":"save",pb=fetPB(fetCr(out));out[key]=Object.assign({},out[key]);
        for(const k in (md.skills||md.saves||{})){const ab=mode==="addSkills"?FET_SKILL[k]:k;out[key][k]=fetSign(fetMod(out[ab])+pb*Number(md.skills?md.skills[k]:md.saves[k]))}}
      else if(mode==="addSpells"||mode==="replaceSpells"||mode==="removeSpells"){const sc=fetArr(out.spellcasting)[0];if(!sc)return;
        if(mode==="addSpells"){if(md.will)sc.will=fetArr(sc.will).concat(md.will);for(const k in md.daily||{}){sc.daily=sc.daily||{};sc.daily[k]=fetArr(sc.daily[k]).concat(md.daily[k])}
          for(const k in md.spells||{}){sc.spells=sc.spells||{};sc.spells[k]=sc.spells[k]||{spells:[]};sc.spells[k].spells=fetArr(sc.spells[k].spells).concat(md.spells[k].spells||[]);if(md.spells[k].slots!=null)sc.spells[k].slots=md.spells[k].slots}}
        else if(mode==="removeSpells"){const drop=x=>fetArr(x).filter(z=>!fetArr(md.spells&&md.spells[0]||[]).includes(z));if(md.will)sc.will=fetArr(sc.will).filter(z=>!md.will.includes(z));
          for(const k in md.daily||{})if(sc.daily&&sc.daily[k])sc.daily[k]=sc.daily[k].filter(z=>!md.daily[k].includes(z));for(const k in md.spells||{})if(sc.spells&&sc.spells[k])sc.spells[k].spells=sc.spells[k].spells.filter(z=>!md.spells[k].includes(z))}
        else{const rp=(list,reps)=>fetArr(list).map(z=>{const r=fetArr(reps).find(q=>q.replace===z);return r?r.with:z}).flat();if(md.will)sc.will=rp(sc.will,md.will);
          for(const k in md.daily||{})if(sc.daily&&sc.daily[k])sc.daily[k]=rp(sc.daily[k],md.daily[k]);for(const k in md.spells||{})if(sc.spells&&sc.spells[k])sc.spells[k].spells=rp(sc.spells[k].spells,md.spells[k])}}
      else if(mode==="scalarAddHit"||mode==="scalarAddDc"){const tag=mode==="scalarAddHit"?"hit":"dc";FET_TEXT_PROPS.forEach(q=>{if(out[q])out[q]=fetWalkStrings(out[q],str=>str.replace(new RegExp(`\\{@${tag} (\\d+)\\}`,"g"),(m,n)=>`{@${tag} ${Number(n)+Number(md.scalar||0)}}`))})}
      else if(mode==="maxSize"){const order="TSMLHG";out.size=fetArr(out.size).map(z=>order.indexOf(z)>order.indexOf(md.max)?md.max:z)}
      else if(mode==="scalarAddProp"||mode==="scalarMultProp"){const o=out[p];if(o&&typeof o==="object")for(const k in o){if(md.prop==="*"||md.prop===k){const v=Number(String(o[k]).replace(/[^\d-]/g,""));if(!isNaN(v))o[k]=mode==="scalarAddProp"?fetSign(v+Number(md.scalar)):Math.floor(v*Number(md.scalar))}}}
    });
  })}
}
function fetResolve(resp){
  const chain=resp.chain||[];let out=fetClone(chain[chain.length-1]);
  for(let k=chain.length-2;k>=0;k--){const cp=chain[k],c=cp._copy||{};
    fetArr(c._templates).forEach(t=>{const tp=(resp.templates||[]).find(x=>x.name===t.name&&String(x.source).toLowerCase()===String(t.source).toLowerCase());
      if(tp&&tp.apply){if(tp.apply._root)Object.assign(out,fetClone(tp.apply._root));if(tp.apply._mod)fetApplyMods(out,tp.apply._mod)}});
    for(const key in cp)if(key!=="_copy")out[key]=fetClone(cp[key]);
    if(c._mod)fetApplyMods(out,c._mod);
  }
  delete out._copy;
  if(resp.lgroup)out._lg=fetClone(resp.lgroup);   // the boss's lair actions and regional effects
  const nm=out.name||"",proper=out.isNamedCreature||out.shortName===true,short=typeof out.shortName==="string"?out.shortName:proper?nm:nm.toLowerCase();
  const sn=proper?short:"the "+short,tsn=proper?short:"The "+short;
  return fetWalkStrings(out,s=>s.replace(/<\$title_short_name\$>/g,tsn).replace(/<\$short_name\$>/g,sn).replace(/<\$title_name\$>/g,nm).replace(/<\$name\$>/g,proper?nm:nm.toLowerCase()));
}
/* the resolved monster as the markdown a 5e.tools download would give, so everything else reads it the same way */
function fetToMd(m){
  const L=[],P=x=>L.push(x),txt=x=>fetEntries(x).join(" ");
  const size=fetArr(m.size).map(z=>FET_SIZE[z]||z).join(" or ");
  let type=m.type;if(type&&typeof type==="object"){const base=typeof type.type==="object"?fetArr(type.type.choose).join(" or "):type.type;
    type=type.swarmSize?`Swarm of ${FET_SIZE[type.swarmSize]||""} ${base}s`:base+(type.tags&&type.tags.length?` (${type.tags.map(t=>typeof t==="object"?t.tag:t).join(", ")})`:"")}
  const al=fetArr(m.alignment).map(a=>typeof a==="object"?fetArr(a.alignment).map(z=>FET_AL[z]||z).join(" "):FET_AL[a]||a);
  const align=al.length===2&&al.includes("Neutral")&&al[0]===al[1]?"Neutral":al.join(" ")||"";
  P("## "+m.name);P(`*${size} ${titleish(type||"")}${align?", "+(m.alignmentPrefix||"")+align:""}*`);
  const ac0=fetArr(m.ac)[0];const acTxt=ac0==null?"":typeof ac0==="number"?String(ac0):ac0.special?fetTxt(ac0.special):`${ac0.ac}${ac0.from?` (${ac0.from.map(fetTxt).join(", ")})`:""}`;
  if(acTxt)P(`- **Armor Class** ${acTxt}`);
  if(m.hp)P(`- **Hit Points** ${m.hp.average!=null?`${m.hp.average} (${m.hp.formula||""})`:fetTxt(m.hp.special||"")}`);
  const sp=m.speed||{};const spd=["walk","burrow","climb","fly","swim"].filter(k=>sp[k]!=null).map(k=>{const v=sp[k];const n=typeof v==="object"?`${v.number} ft.${v.condition?" "+fetTxt(v.condition):""}`:`${v} ft.`;return k==="walk"?n:`${k[0].toUpperCase()+k.slice(1)} ${n}`});
  if(spd.length)P(`- **Speed** ${spd.join(", ")}${sp.canHover?" (hover)":""}`);
  const cr=fetCr(m),pb=fetPB(cr),dm=fetMod(m.dex);let ib=dm;
  if(typeof m.initiative==="number")ib=m.initiative;else if(m.initiative&&typeof m.initiative==="object")ib=dm+(Number(m.initiative.proficiency)||0)*pb+(Number(m.initiative.initiative)||0);
  P(`- **Initiative** ${fetSign(ib)} (${10+ib})`);
  if(m.str!=null){P("|STR|DEX|CON|INT|WIS|CHA|");P("|:---:|:---:|:---:|:---:|:---:|:---:|");P("|"+["str","dex","con","int","wis","cha"].map(a=>`${m[a]} (${fetSign(fetMod(m[a]))})`).join("|")+"|")}
  if(m.save)P(`- **Saving Throws** ${Object.entries(m.save).map(([k,v])=>`${k[0].toUpperCase()+k.slice(1)} ${v}`).join(", ")}`);
  if(m.skill)P(`- **Skills** ${Object.entries(m.skill).filter(([k])=>k!=="other").map(([k,v])=>`${titleish(k)} ${v}`).join(", ")}`);
  const dmgList=(arr,key)=>fetArr(arr).map(x=>typeof x==="string"?x:x.special?fetTxt(x.special):`${x.preNote?x.preNote+" ":""}${dmgList(x[key],key)}${x.note?" "+fetTxt(x.note):""}`).join(", ");
  if(m.vulnerable)P(`- **Damage Vulnerabilities** ${dmgList(m.vulnerable,"vulnerable")}`);
  if(m.resist)P(`- **Damage Resistances** ${dmgList(m.resist,"resist")}`);
  if(m.immune)P(`- **Damage Immunities** ${dmgList(m.immune,"immune")}`);
  if(m.conditionImmune)P(`- **Condition Immunities** ${fetArr(m.conditionImmune).map(x=>typeof x==="string"?fetTxt(x):fetArr(x.conditionImmune).map(fetTxt).join(", ")).join(", ")}`);
  P(`- **Senses** ${fetArr(m.senses).map(fetTxt).concat([m.passive!=null?`Passive Perception ${m.passive}`:""]).filter(Boolean).join(", ")}`);
  if(m.languages)P(`- **Languages** ${fetArr(m.languages).map(fetTxt).join(", ")}`);
  if(cr)P(`- **Challenge** ${cr} (PB ${fetSign(pb)})`);
  const block=(arr)=>fetArr(arr).forEach(t=>{const body=fetEntries(t.entries||t.entry);P(`***${refPlain(fetTxt(t.name||"")).trim().replace(/[.:]+$/,"")}.*** ${body[0]||""}`);body.slice(1).forEach(x=>P(x))});
  const casts=fetArr(m.spellcasting),castsIn=where=>casts.filter(c=>(c.displayAs||"trait")===where).forEach(c=>{
    P(`***${fetTxt(c.name||"Spellcasting")}.*** ${txt(c.headerEntries)}`);
    if(c.will)P(`**At Will:** ${fetArr(c.will).map(fetTxt).join(", ")}`);
    Object.keys(c.daily||{}).sort().reverse().forEach(k=>P(`**${parseInt(k)}/Day${/e$/.test(k)?" each":""}:** ${fetArr(c.daily[k]).map(fetTxt).join(", ")}`));
    Object.keys(c.spells||{}).sort().forEach(k=>{const v=c.spells[k];P(k==="0"?`**Cantrips (at will):** ${fetArr(v.spells).map(fetTxt).join(", ")}`:`**${k}${k==="1"?"st":k==="2"?"nd":k==="3"?"rd":"th"} level (${v.slots||0} slots):** ${fetArr(v.spells).map(fetTxt).join(", ")}`)});
    if(c.footerEntries)P(txt(c.footerEntries))});
  block(m.trait);castsIn("trait");
  const sec=(title,arr,where)=>{if(!fetArr(arr).length&&!casts.some(c=>c.displayAs===where))return;P("### "+title);castsIn(where);block(arr)};
  sec("Actions",m.action,"action");sec("Bonus Actions",m.bonus,"bonus");sec("Reactions",m.reaction,"reaction");
  if(fetArr(m.legendary).length){P("### Legendary Actions");const n=m.legendaryActions||3;
    if(m.legendaryHeader)P(txt(m.legendaryHeader));else if(m.legendaryActionsLair||m.initiative)P(`Legendary Action Uses: ${n}${m.legendaryActionsLair?` (${m.legendaryActionsLair} in Lair)`:""}.`);
    else P(`The ${m.name.toLowerCase()} can take ${n} legendary actions, choosing from the options below.`);
    if(!/legendary actions/i.test(txt(m.legendaryHeader))&&m.legendaryHeader)P(`Legendary Action Uses: ${n}.`);
    castsIn("legendary");block(m.legendary)}
  if(fetArr(m.mythic).length){P("### Mythic Actions");if(m.mythicHeader)P(txt(m.mythicHeader));block(m.mythic)}
  const lg=m._lg||{},lairSec=(title,es)=>{if(!fetArr(es).length)return;P("### "+title);fetEntries(es).forEach(l=>P(/^• /.test(l)?"- "+l.slice(2):l))};
  lairSec("Lair Actions",m.lairActions||lg.lairActions);lairSec("Regional Effects",m.regionalEffects||lg.regionalEffects);
  return L.map(l=>">"+l).join("\n");
}
const titleish=s=>String(s).replace(/(^|[\s(\/-])([a-z])/g,(m,a,b)=>a+b.toUpperCase());
let fetInfo=null,fetIdx=null,fetSigSeen="",fetQ="",fetSrc="offown",fetCrF="",fetTypeF="",fetOld=false,fetBusy=false,fetPoll=null;
async function fetRefresh(){
  if(!served)return;
  try{const r=await fetch("/5et/status",{cache:"no-store"});fetInfo=await r.json()}catch(e){fetInfo=null;return}
  refLoadNames();
  if(fetInfo.state==="ready"&&fetInfo.sig!==fetSigSeen){try{const r=await fetch("/5et/index",{cache:"no-store"});if(r.ok){const d=await r.json();fetIdx=d.list;fetSigSeen=d.sig}}catch(e){}}
  clearTimeout(fetPoll);if(fetInfo.state==="loading"&&$(".sbsheet"))fetPoll=setTimeout(async()=>{await fetRefresh();fetRedraw()},1200);
}
const fetNorm=x=>String(x).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const FET_GROUP_ORDER={off:0,own:1,hb:2};
/* book names by year instead of 5e.tools' X prefix: XMM is the 2024 Monster Manual */
const SRC_NAME={MM:"MM14",XMM:"MM24",PHB:"PHB14",XPHB:"PHB24",DMG:"DMG14",XDMG:"DMG24"};
const srcName=x=>SRC_NAME[String(x||"").toUpperCase()]||x||"";
const FET_PREF=["XMM","XPHB","XDMG","MM","MPMM","VGM","MTF"];   // the same name in several books: the newest core book first
const fetSrcRank=e=>{const i=FET_PREF.indexOf(e[2]);return i<0?FET_PREF.length:i};
function fetHits(){
  if(!fetIdx)return{hits:[],more:0};
  const q=fetNorm(fetQ.trim());if(!q&&!fetCrF&&!fetTypeF&&fetSrc!=="own")return{hits:[],more:0};   // your own homebrew can be browsed whole
  const okSrc=g=>fetSrc==="all"||(fetSrc==="offown"?g!=="hb":fetSrc===g);
  const res=[];let old=0;for(const e of fetIdx){if(!okSrc(e[3]))continue;if(fetCrF&&e[4]!==fetCrF)continue;if(fetTypeF&&!String(e[5]).includes(fetTypeF))continue;
    const n=fetNorm(e[1]);if(q&&!n.includes(q))continue;
    if(e[6]===1&&!fetOld){old++;continue}   // a newer printing is in the files too (MM14 next to MM24): shown only on request
    res.push(e)}
  res.sort((a,b)=>{const an=fetNorm(a[1]),bn=fetNorm(b[1]);return (bn===q)-(an===q)||(bn.startsWith(q))-(an.startsWith(q))||FET_GROUP_ORDER[a[3]]-FET_GROUP_ORDER[b[3]]||an.length-bn.length||an.localeCompare(bn)||fetSrcRank(a)-fetSrcRank(b)});
  const cap=fetSrc==="own"&&!q?200:40;return{hits:res.slice(0,cap),more:Math.max(0,res.length-cap),old,oldShown:fetOld&&res.some(e=>e[6]===1)};
}
function fetListHtml(){
  if(!fetIdx)return "";const {hits,more,old,oldShown}=fetHits();
  const oldBtn=old?`<button type="button" class="fetold" data-act="fetold">${old} older printing${old>1?"s":""} hidden (e.g. MM14, newer book in your files) · <b>Show</b></button>`
    :oldShown?`<button type="button" class="fetold" data-act="fetold">Older printings shown · <b>Hide</b></button>`:"";
  if(!hits.length)return `<p class="psub">${fetQ.trim()||fetCrF||fetTypeF?"Nothing matches.":"Type a name, or pick a CR or a type."}</p>`+oldBtn;
  return hits.map(e=>`<button type="button" class="fetrow g-${e[3]}" data-act="fetpick" data-id="${e[0]}"><b>${esc(e[1])}</b><small>${[e[4]?"CR "+esc(e[4]):"",e[5]?esc(titleish(e[5])):"",`<i>${esc(srcName(e[2]))}</i>`].filter(Boolean).join(" · ")}</small></button>`).join("")
    +(more?`<p class="psub">…and ${more} more. Type more of the name.</p>`:"")+oldBtn;
}
function fetBoxHtml(){
  if(!served)return "";
  if(!fetInfo&&!fetIdx)return `<div class="fetbox"><div class="eyebrow2">Monsters</div><p class="psub">Looking for the game data…</p></div>`;
  if(!fetInfo||fetInfo.state==="none")return `<p class="psub fethint">To search every 5e.tools monster, put the 5etools zip and/or your <b>5etools.json</b> in a folder named <b>5etools</b> next to the app.</p>`;
  if(fetInfo.state==="loading"&&!fetIdx)return `<div class="fetbox"><div class="eyebrow2">Monsters</div><p class="psub">Reading the game data…</p></div>`;
  if(fetInfo.state==="error"&&!fetIdx)return `<div class="fetbox"><div class="eyebrow2">Monsters</div><p class="psub">Couldn't read your data files: ${esc(fetInfo.error)}</p></div>`;
  const c=fetInfo.counts||{};const CRS=["0","1/8","1/4","1/2",...Array.from({length:30},(_,i)=>String(i+1))];
  const offF=Math.max(0,(c.off||0)-(c.srd||0)),hbN=(c.own||0)+(c.hb||0);
  return `<div class="fetbox"><div class="eyebrow2">Monsters · ${[c.srd?`${c.srd.toLocaleString()} SRD`:"",offF?`${offF.toLocaleString()} official`:"",hbN?`${hbN.toLocaleString()} homebrew`:""].filter(Boolean).join(", ")||"none"}${!offF&&!hbN?` <small>more with Settings → Game data</small>`:""}</div>
    <input class="field" id="fetQ" type="search" placeholder="Search monsters" value="${esc(fetQ)}" autocomplete="off">
    <div class="fetfilters"><select class="field" id="fetSrc" aria-label="Which monsters">${[["offown","Official + my homebrew"],["off","Official"],["own","My homebrew"],["hb","Other homebrew"],["all","Everything"]].map(([k,l])=>`<option value="${k}"${fetSrc===k?" selected":""}>${l}${k==="own"&&c.own?` (${c.own})`:""}</option>`).join("")}</select>
      <select class="field" id="fetCr" aria-label="Challenge rating"><option value="">Any CR</option>${CRS.map(x=>`<option${fetCrF===x?" selected":""}>${x}</option>`).join("")}</select>
      <select class="field" id="fetType" aria-label="Creature type"><option value="">Any type</option>${CTYPES.map(([k,l])=>`<option value="${k}"${fetTypeF===k?" selected":""}>${l}</option>`).join("")}</select></div>
    <div class="fetlist" id="fetList">${fetListHtml()}</div></div>`;
}
/* only the 5e.tools part of the sheet is redrawn, so a file being chosen or a name being typed elsewhere isn't lost */
function fetRedraw(){const w=$("#fetWrap");if(!w)return;const html=fetBoxHtml();if(w.dataset.h===html)return;
  const typing=document.activeElement&&document.activeElement.id==="fetQ";w.innerHTML=html;w.dataset.h=html;
  const a=document.activeElement,q=$("#fetQ");if(q&&(typing||!a||!a.matches("input,textarea,select"))){q.focus();q.setSelectionRange(q.value.length,q.value.length)}}
async function fetPick(id){
  if(fetBusy)return;fetBusy=true;
  try{const r=await fetch("/5et/monster?id="+encodeURIComponent(id),{cache:"no-store"});if(!r.ok)throw 0;const resp=await r.json();
    const m=fetResolve(resp),md=fetToMd(m);
    const x=parseStatblock(md)||{name:m.name,ctype:"",size:"",ac:null,hp:null,hpf:"",ib:null,cr:"",lr:0,la:0,uses:[],rech:[],know:[]};   // some NPC entries have no stats
    sbItems.push(Object.assign(x,{name:m.name,raw:md,count:1,hidden:false,boss:!!(x.lr||x.la),from:srcName(resp.label),fet:{n:m.name,s:m.source||""}}));sbSheet();
    const l=$(".sbsheet .sbcard:last-of-type");l&&l.scrollIntoView({block:"nearest"});
  }catch(e){toast("Couldn't read that monster")}finally{fetBusy=false}
}
