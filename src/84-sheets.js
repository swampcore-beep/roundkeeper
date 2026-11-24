/* ---------- sheets ---------- */
function closeSheet(){$("#overlay").innerHTML=""}
let condTarget=null;
/* ---- the DM puts a spell on anyone: Bless from a player, Hold Person from a monster, Darkness on the battlefield ---- */
let dEff=null;
/* ---- Spell effect (1.7): cast a spell from a statblock or by hand. With a saving throw: an instant spell with damage (Fireball) goes to Hit several,
   filled in and with the saves rolled (monsters here, players on their phones); a spell that lasts (Hold Person) stays only on those who fail, and
   can be saved against again at the end of each of their turns. The save, its DC, the dice and the level come from the spell and the caster's
   statblock (the SRD or 5e.tools, the same fields), and every one of them can be changed. ---- */
function dEffSheet(o){
  dEff=Object.assign({name:"",src:"",conc:false,area:false,by:"",targets:new Set(),q:"",lvl:0,lvl0:0,lvlNote:"",inst:false,sv:{ab:"",dc:"",on:"half",
    again:true},
    dmg:{d:"",t:"",base:"",inc:""},warn:"",touched:{},showOng:false,info:null},o||{});
  if(dEff.name){const x=spellFind(dEff.name,dEff.src);if(x){dEff.conc=!!x[2];dEff.area=!!x[3];dEff.src=x[7]||dEff.src}}
  if(!dEff.by)dEff.conc=false;
  dEffSpell();dEffRender(true);
}
const dEffTxt=e=>{const out=[];const w=x=>{if(typeof x==="string")out.push(x);else if(Array.isArray(x))x.forEach(w);else if(x&&typeof x==="object"){
  if(x.entries)w(x.entries);if(x.items)w(x.items)}};w(e);
  return out.join(" ").replace(/\{@(\w+) ([^}]*)\}/g,(m,t,b)=>{const p=b.split("|");return t==="scaledamage"||t==="scaledice"?p[2]||p[0]:p[0]})};
const dEffDiceAt=(base,inc,l0,l)=>{const b=String(base||"").replace(/\s/g,"").match(/^(\d+)d(\d+)([+-]\d+)?$/),i=String(inc||"").match(/^(\d+)d(\d+)$/);
  if(!b)return base||"";if(!i||i[2]!==b[2]||!(l>l0))return b[0];return `${Number(b[1])+Number(i[1])*(l-l0)}d${b[2]}${b[3]||""}`};
/* what the caster's statblock says: its spell save DC, and "Fireball (level 6 version)" */
function dEffCaster(){
  const c=byId(dEff.by),T=dEff.touched;if(!c)return;const raw=c.sb&&c.sb.raw?refPlain(c.sb.raw):"";
  if(!T.dc){const m=raw.match(/spell save DC\s*(\d+)/i);dEff.sv.dc=m?m[1]:c.kind==="pc"?String(ls.get("spellDC:"+c.name,"")||""):""}
  if(!T.lvl&&dEff.name&&raw){const k=dEff.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),m=raw.match(new RegExp(k+
    "[^\\n(]{0,30}\\(\\s*level\\s*(\\d)\\s*version","i"));
    if(m&&Number(m[1])>dEff.lvl0){dEff.lvl=Number(m[1]);dEff.lvlNote=`the statblock says “level ${m[1]} version”`}}
  if(!T.dmg&&dEff.dmg.base)dEff.dmg.d=dEffDiceAt(dEff.dmg.base,dEff.dmg.inc,dEff.lvl0,dEff.lvl);
}
/* the spell's own data: level, instant or not, the save, the damage and how it grows */
async function dEffSpell(){
  const D=dEff;if(!D||!D.name)return;const x=spellFind(D.name,D.src);
  if(x){D.lvl0=Number(x[1])||0;if(!D.touched.lvl)D.lvl=D.lvl0;D.inst=x[4]==="Instant"}
  dEffCaster();
  const d=await refGet("spell",D.name,D.src||(x&&x[7])||"");if(dEff!==D||!d||!d.item)return;const it=d.item,T=D.touched;
  if(!x){D.lvl0=Number(it.level)||0;if(!T.lvl)D.lvl=D.lvl0;D.inst=(it.duration||[]).some(u=>u.type==="instant")}
  const txt=dEffTxt(it.entries),hi=dEffTxt(it.entriesHigherLevel||[]),sv=(it.savingThrow||[])[0];
  const rg=it.range||{},self=rg.type&&rg.type!=="point"||(rg.distance||{}).type==="self";   // Spirit Guardians and the like: no save for its caster
  if(sv&&!T.ab&&(D.inst||!self))D.sv.ab=sv.slice(0,3).replace(/^./,c=>c.toUpperCase());
  if(!T.on)D.sv.on=/half (?:as much|the|that) damage|half damage|half as much/i.test(txt)?"half":"none";
  const re=new RegExp(`(\\d+d\\d+(?:\\s*[+-]\\s*\\d+)?)\\s+(${DMG_TYPES.join("|")})\\s+damage`,"gi"),hits=[...txt.matchAll(re)];
  if(hits.length&&D.inst){D.dmg.base=hits[0][1].replace(/\s/g,"");if(!T.type)D.dmg.t=hits[0][2].toLowerCase();
    const inc=hi.match(/increases? by (\d+d\d+)/i);D.dmg.inc=inc?inc[1]:""}
  const types=new Set(hits.map(h=>h[2].toLowerCase()));
  D.warn=it.spellAttack?"It starts with a spell attack: check who it hits.":types.size>1||(it.damageInflict||[]).length>1?
    "More than one kind of damage: check the dice.":/random|roll a d8|1d8 to determine/i.test(txt)&&/color|ray/i.test(txt)?
      "Its damage depends on a roll: check it.":"";
  dEffCaster();if($("#dEffForm"))dEffRender();
}
function dEffListHtml(){
  const q=dEff.q.trim(),ql=q.toLowerCase();
  const hit=spPool(true).filter(x=>!ql||x[0].toLowerCase().includes(ql));
  return spRowsHtml(hit,"deffpick",q,false)+(q?`<button type="button" class="sprow other" data-act="deffname"><b>Use “${esc(
    q)}”</b><small>an effect of your own, by name</small></button>`:"")+spHbHtml();
}
const dEffPcSide=c=>c.kind==="pc"||!!c.owner;
function dEffWhy(){   // what the button will do, or what is missing
  const D=dEff,tg=[...D.targets].map(byId).filter(Boolean),c=byId(D.by),save=!!D.sv.ab;
  if(!D.name)return {ok:false,t:"Pick a spell, or type the name of an effect of your own."};
  if(!D.area&&!tg.length)return {ok:false,t:"Pick at least one target."};
  if(save&&!/^\d+$/.test(String(D.sv.dc)))return {ok:false,t:"Type the DC of the save."};
  const who=c?`<b>${esc(c.name)}</b> casts`:"Cast:",lv=D.lvl&&D.lvl>D.lvl0?` (level ${D.lvl})`:"",on=D.area?"the battlefield":tg.length>3?
    `<b>${tg.length}</b> targets`:
    `<b>${tg.map(x=>esc(x.name)).join(", ")}</b>`;
  if(save&&D.inst){if(!sbDiceOk(D.dmg.d))return {ok:false,t:"Type the damage dice, like 8d6."};
    return {ok:true,roll:true,t:`${who} <b>${esc(D.name)}</b>${lv} on ${on}: ${abFull(D.sv.ab)} save DC ${D.sv.dc}, ${esc(D.dmg.d)}${D.dmg.t?" "+D.dmg.t:""}, ${
      D.sv.on==="half"?"half":"nothing"} on a success. Monsters roll their saves, players are asked on their phones, then Hit several applies it.`}}
  if(save)return {ok:true,t:`${who} <b>${esc(D.name)}</b>${lv} on ${on}: ${abFull(D.sv.ab)} save DC ${D.sv.dc}. Only those who fail keep it${D.sv.again?
    "; they save again at the end of each of their turns":""}.`};
  return {ok:true,t:`${who} <b>${esc(D.name)}</b>${lv} on ${on}.`};
}
const sbDiceOk=d=>/^\d+d\d+([+-]\d+)?$/.test(String(d||"").replace(/\s/g,""))||/^\d+$/.test(String(d||"").trim());
function dEffRender(focus){
  const D=dEff,L=state.list.filter(c=>c.kind!=="lair"),x=D.name?spellFind(D.name,D.src):null,c=byId(D.by),save=!!D.sv.ab;
  const chip=k=>`<button type="button" data-act="defftgt" data-id="${esc(k.id)}" aria-pressed="${D.targets.has(k.id)}" class="dw ${dEffPcSide(k)?"pc":
    "foe"}"><span class="dwdot" aria-hidden="true"></span>${esc(k.name)}${k.hidden?` <small>hidden</small>`:""}</button>`;
  const grp=(lab,side,arr)=>arr.length?`<div class="degrp"><span>${lab}</span><button type="button" class="btn sm" data-act="deffall" data-v="${side}">All ${
    lab.toLowerCase()}</button></div><div class="chipgrid">${arr.map(chip).join("")}</div>`:"";
  const pcs=L.filter(dEffPcSide),foes=L.filter(k=>!dEffPcSide(k)),why=dEffWhy(),opt=k=>`<option value="${esc(k.id)}"${D.by===k.id?" selected":
    ""}>${esc(k.name)}</option>`;
  const dcNote=!c?"":c.sb&&c.sb.raw&&/spell save DC/i.test(refPlain(c.sb.raw))?"from its statblock":c.kind==="pc"?`remembered for ${esc(c.name)}`:"";
  $("#overlay").innerHTML=
    `<div class="scrim" data-act="close"><div class="sheet deffsheet" id="dEffForm" role="dialog" aria-modal="true" aria-label="Spell effect">
    ${D.name?`<div class="dehead"><h2>${ic("spark")} ${esc(D.name)}</h2><button type="button" class="btn sm" data-act="deffchg">Change spell</button></div>
      <p class="psub demeta">${x?esc(spellMeta(x)):"your own effect"}</p>${D.lvl0>0?
        `<div class="derow delv"><span>Cast at level</span><div class="seg2 sm" role="group"
        aria-label="Spell level">${[...Array(10-D.lvl0)].map((_,i)=>D.lvl0+i).map(l=>`<button type="button" data-act="defflv" data-v="${l}" aria-pressed="${
        (D.lvl||D.lvl0)===l}">${l}</button>`).join("")}</div>${D.lvlNote?`<span class="psub">${esc(D.lvlNote)}</span>`:""}</div>`:""}`
      :`<h2>Spell effect</h2><input class="field" id="dEffQ" type="search" placeholder="Search spells, or type a name of your own" autocomplete="off" spellcheck="false"
        value="${esc(D.q)}"><div class="splist deffl" id="dEffList">${dEffListHtml()}</div>`}
    <div class="psec"><label class="eyebrow2" for="dEffBy">Cast by</label><select class="field" id="dEffBy"><option value="">No one</option>${pcs.length?
      `<optgroup label="Players">${pcs.map(opt).join("")}</optgroup>`:""}${foes.length?`<optgroup label="Enemies">${foes.map(opt).join("")}</optgroup>`:
        ""}</select>
      ${save&&c?`<p class="psub">${D.sv.dc?`Spell save DC ${esc(D.sv.dc)}${dcNote?" · "+dcNote:""}`:c.kind==="pc"?
        "Players have no statblock here: type the DC below, it is remembered for them":"No spell save DC in its statblock: type it below"}</p>`:""}</div>
    <div class="psec"><div class="eyebrow2">On</div>${D.area?"":grp("Players","pc",pcs)+grp("Enemies","foe",foes)}
      <label class="chk"><input type="checkbox" id="dEffArea" ${D.area?"checked":""}> A zone on the battlefield instead (no targets)</label></div>
    ${D.area?"":`<div class="psec"><div class="eyebrow2">Saving throw</div><div class="seg2 sm desave" role="group" aria-label="Saving throw">${[["",
      "None"]].concat(
      ABIL3.map(([a])=>[a,a.toUpperCase()])).map(([a,l])=>`<button type="button" data-act="deffsv" data-v="${a}" aria-pressed="${D.sv.ab===
        a}">${l}</button>`).join("")}</div>
      ${save?`<div class="derow"><label for="dEffDC">DC</label><input class="field" id="dEffDC" inputmode="numeric" maxlength="2" value="${esc(
        D.sv.dc)}" style="width:4.5em">
        ${D.inst?`<span>On a success</span><div class="seg2 sm" role="group" aria-label="On a success">${[["half","Half damage"],["none",
          "Nothing"]].map(([v,l])=>
          `<button type="button" data-act="deffwin" data-v="${v}" aria-pressed="${D.sv.on===v}">${l}</button>`).join("")}</div>`:""}</div>
        ${D.inst?"":`<label class="chk"><input type="checkbox" id="dEffAgain" ${D.sv.again?"checked":""}> Save again at the end of each of its turns
          <small>a success ends it on that target</small></label>`}`:""}</div>`}
    ${save&&D.inst&&!D.area?
      `<div class="psec"><div class="eyebrow2">Damage</div><div class="derow"><input class="field" id="dEffDmgD" placeholder="8d6" maxlength="14"
      value="${
        esc(D.dmg.d)}" aria-label="Damage dice" autocomplete="off" style="width:7em"><select class="field" id="dEffDmgT" aria-label="Damage type"><option value="">damage</option>${
      DMG_TYPES.map(t=>`<option${D.dmg.t===t?" selected":""}>${t}</option>`).join("")}</select><span class="psub">one roll for everyone</span></div>
      ${D.warn?`<p class="fixhint">${esc(D.warn)}</p>`:""}<p class="psub">Instant: nothing stays on the targets after the damage.</p></div>`:""}
    ${D.area||(save&&D.inst)?"":D.showOng||(D.ong&&D.ong.d)?
      `<div class="psec"><div class="eyebrow2">Damage each turn <small>optional: Heat Metal, poison, Searing Smite…</small></div>
      <div class="ongrow"><input class="field" id="dEffOngD" placeholder="2d6" maxlength="12" value="${esc((D.ong||{}).d||
        "")}" aria-label="Dice" autocomplete="off">
      <select class="field" id="dEffOngT" aria-label="Damage type"><option value="">damage</option>${DMG_TYPES.map(t=>`<option${(D.ong||{}).t===t?" selected":
        ""}>${t}</option>`).join("")}</select>
      <select class="field" id="dEffOngW" aria-label="When"><option value="start"${(D.ong||{}).when!=="end"?" selected":
        ""}>at the start of the target's turn</option>
        <option value="end"${(D.ong||{}).when==="end"?" selected":""}>at the end of the target's turn</option></select></div>
      <p class="psub">Rolled for you on that turn; you apply it or skip it (if they saved).</p></div>`
      :`<button type="button" class="linkbtn deplus" data-act="deffong">+ Damage each turn</button>`}
    ${save&&D.inst?"":`<label class="chk"><input type="checkbox" id="dEffConc" ${D.conc?"checked":""}${c?"":" disabled"}> Concentration <small>${c?
      `${esc(c.name)} gets Concentrating; it ends when that is lost`:
      "pick who casts it"}</small></label>`}
    <p class="desum" id="dEffSum" role="status">${why.t}</p>
    <div class="deact"><button class="btn" type="button" data-act="close">Cancel</button><button class="btn primary" type="button" data-act="${why.roll?
      "deffroll":"deffadd"}"${
      why.ok?"":" disabled"}>${ic("spark")} ${save?"Roll saves":"Add effect"}</button></div></div></div>`;
  ["dEffOngD","dEffOngT","dEffOngW"].forEach(id=>{const el=$("#"+id);if(el)el.addEventListener("input",()=>{D.ong={d:$("#dEffOngD").value.trim(),t:
    $("#dEffOngT").value,when:$("#dEffOngW").value}})});
  const q=$("#dEffQ");if(q){q.addEventListener("input",()=>{D.q=q.value;$("#dEffList").innerHTML=dEffListHtml()});
    q.addEventListener("keydown",e=>{if(e.key==="Enter"&&q.value.trim()){e.preventDefault();const r=spellFind(q.value.trim());
      dEffPick(r?r[0]:q.value.trim().slice(0,30),r?r[7]||"":"")}});
    if(focus)q.focus()}
  const sum=()=>{const w=dEffWhy(),b=$("#dEffForm .deact .primary"),s=$("#dEffSum");if(s)s.innerHTML=w.t;if(b){b.disabled=!w.ok;
    b.dataset.act=w.roll?"deffroll":"deffadd"}};
  const on=(id,ev,f)=>{const el=$("#"+id);if(el)el.addEventListener(ev,f)};
  on("dEffArea","change",e=>{D.area=e.target.checked;dEffRender()});
  on("dEffConc","change",e=>{D.conc=e.target.checked;dEffRender()});
  on("dEffAgain","change",e=>{D.sv.again=e.target.checked;sum()});
  on("dEffBy","change",e=>{D.by=e.target.value;D.touched.dc=false;D.touched.lvl=false;const k=D.name&&spellFind(D.name,D.src);D.conc=!!D.by&&!!(k&&k[2]);
    dEffCaster();dEffRender()});
  on("dEffDC","input",e=>{D.sv.dc=e.target.value.replace(/\D/g,"");D.touched.dc=true;const k=byId(D.by);
    if(k&&k.kind==="pc"&&D.sv.dc)ls.set("spellDC:"+k.name,D.sv.dc);sum()});
  on("dEffDmgD","input",e=>{D.dmg.d=e.target.value.trim();D.touched.dmg=true;sum()});
  on("dEffDmgT","change",e=>{D.dmg.t=e.target.value;D.touched.type=true;sum()});
}
function dEffPick(name,src){
  const x=spellFind(name,src);dEff.name=String(x?x[0]:name).slice(0,30);dEff.src=x?x[7]||"":src||"";
  dEff.sv={ab:"",dc:dEff.sv.dc,on:"half",again:true};dEff.dmg={d:"",t:"",base:"",inc:""};dEff.warn="";dEff.lvl=dEff.lvl0=0;dEff.lvlNote="";dEff.inst=false;
  dEff.touched={dc:dEff.touched.dc};
  if(x){dEff.conc=!!x[2]&&!!dEff.by;dEff.area=!!x[3]}dEffSpell();dEffRender();
}
/* adds the effect; with a save, monsters roll now and those who succeed come off it, players are asked on their phones */
function dEffAdd(){
  if(!dEff||!dEff.name)return;const D=dEff,c=byId(D.by),tg=D.area?[]:[...D.targets].filter(id=>byId(id));
  if(!D.area&&!tg.length)return;const sv=!D.area&&D.sv.ab&&/^\d+$/.test(String(D.sv.dc))?{ab:D.sv.ab,dc:Number(D.sv.dc),again:!!D.sv.again}:null;
  const conc=!!(D.conc&&c),ended=[];
  if(conc){   // a new concentration spell ends the caster's old one
    state.effects=state.effects.filter(e=>{if(e.by===c.id&&e.conc){ended.push(e.name);return false}return true});
    if(!c.conds.some(x=>(x.n||x)==="Concentrating"))c.conds.push("Concentrating");
  }
  const ong=!D.area&&D.ong&&/^\d*d\d+(\s*[+-]\s*\d+)?$|^\d+$/i.test(D.ong.d||"")?{d:D.ong.d.replace(/\s/g,"").replace(/^d/i,"1d").toLowerCase(),t:
    D.ong.t||"",when:D.ong.when==="end"?"end":"start"}:null;
  const e={id:uid(),name:D.name,by:c?c.id:"dm",targets:tg.slice(),conc,area:!!D.area,r0:state.turn?state.turn.round:null,...(D.src?{src:D.src}:{
    }),...(ong?{ong}:{}),...(sv?{save:sv}:{})};
  const msgs=[];
  if(sv){const pcs=[];
    tg.map(byId).forEach(k=>{if(k.kind==="pc"){pcs.push(k.id);return}const mod=k.sb?sbSaveMod(k.sb.raw,sv.ab):null;
      if(mod==null){msgs.push(`${k.name}: roll its ${sv.ab} save at the table`);return}
      const r=d20(),bb=monBB(k),tot=r+mod+bb.n;if(tot>=sv.dc){e.targets=e.targets.filter(id=>id!==k.id);msgs.push(`${k.name} saved (${tot})`)}
      else msgs.push(`${k.name} failed (${tot})`)});
    if(pcs.length){if(callBusy())msgs.push("players: a roll call is still open, ask at the table");
      else{state.call={id:uid(),text:`${abFull(sv.ab)} save DC ${sv.dc} · ${D.name}`,dc:sv.dc,at:Date.now(),to:pcs,answers:{},eff:{id:e.id}};
        msgs.push(`${pcs.map(id=>byId(id).name).join(", ")} asked on the phone`)}}}
  if(e.area||e.targets.length)state.effects.push(e);
  if(c&&c.kind!=="pc"&&!c.hidden)state.react={id:uid(),k:"spell",by:c.name,what:D.name,at:Date.now()};   // a Counterspell moment
  const name=D.name,spent=c&&c.sb?sbSpend(c,name,true):"";closeSheet();commit();
  toast(`✦ ${name}${c?` from ${c.name}`:""}${D.area?" on the battlefield":sv?`: ${msgs.join(" · ")}`:` on ${tg.map(id=>
    byId(id).name).join(", ")}`}${ended.length?
    ` · ${ended.join(", ")} ends`:""}${spent?` · ${spent}`:""}`);
  if(sv)clogPush(`${name}${c?` (${c.name})`:""}, ${sv.ab} save DC ${sv.dc}: ${msgs.join(", ")}`);
  dEff=null;
}
/* an instant spell with a save and damage: the dice are rolled once, then Hit several takes over with the targets ticked and the saves rolled */
function dEffRoll(){
  const D=dEff;if(!D||!dEffWhy().roll)return;const c=byId(D.by),d=String(D.dmg.d).replace(/\s/g,"");
  const r=/^\d+$/.test(d)?{tot:Number(d),rolls:[d]}:sbDice(d,false);if(!r)return;
  const tg=[...D.targets].map(byId).filter(Boolean),ok=tg.filter(mtOk),skip=tg.filter(k=>!mtOk(k));
  if(c&&c.kind!=="pc"&&!c.hidden)state.react={id:uid(),k:"spell",by:c.name,what:D.name,at:Date.now()};
  const spent=c&&c.sb?sbSpend(c,D.name,true):"";
  closeSheet();mtOn=true;mtSel=new Set(ok.map(k=>k.id));
  mt={n:String(r.tot),type:D.dmg.t||"",ab:D.sv.ab,dc:String(D.sv.dc),on:D.sv.on==="none"?"none":"half",modes:{},rolls:{},src:{cid:c?c.id:"",act:D.name}};
  clogPush(`${D.name}${c?` (${c.name})`:""}${D.lvl>D.lvl0?` at level ${D.lvl}`:""}: ${d} = ${r.tot}${D.dmg.t?" "+D.dmg.t:""}`);
  dEff=null;hpPopClose();renderDM();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(mtOn&&ok.length)mtRoll()}));
  toast(`✦ ${mt.src.act}: ${d} = ${r.tot}${mt.type?" "+mt.type:""}${spent?` · ${spent}`:""}${skip.length?` · ${skip.map(k=>k.name).join(", ")
    }: no HP tracked, left out`:""}`);
}
function condSheet(id){
  condTarget=id;const c=byId(id);if(!c)return;const has=new Set(c.conds||[]);
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true"><div class="condhead"><h2>Conditions · ${esc(
    c.name)}</h2><button type="button" class="btn" data-act="deffon" data-id="${esc(c.id)}">${ic("spark")} Spell effect…</button></div>
   <div class="chipgrid">${CONDS.map(n=>`<button type="button" data-act="pickcond" data-n="${n}" aria-pressed="${has.has(n)}">${n}</button>`).join("")}</div>
   ${(()=>{const act=(c.conds||[]).map(x=>x.n||x).filter(n=>n!=="Exhaustion");if(!act.length)return "";
     return `<div class="cdurs"><div class="eyebrow2">When does it end?</div>${act.map(n=>{const d=cdurOf(c,n)||{};
       return `<div class="cdur" data-n="${esc(n)}"><b>${esc(n)}</b><select class="field" data-cdur="end" aria-label="When ${esc(n)} ends">${[["",
         "When you remove it"],["start","At the start of its turn"],["end","At the end of its turn"],["save","Save at the end of each of its turns"]].map(([v,
         l])=>`<option value="${v}"${(d.end||"")===v?" selected":""}>${l}</option>`).join("")}</select>
         ${d.end==="save"?`<select class="field" data-cdur="ab" aria-label="Which save">${ABIL3.map(([a,f])=>`<option value="${a}"${d.ab===a?" selected":
           ""}>${f}</option>`).join("")}</select><label class="cdc">DC <input class="field" type="number" inputmode="numeric" data-cdur="dc" value="${d.dc??
           ""}" min="1" max="30"></label>`:""}
         <label class="cdc">at most <input class="field" type="number" inputmode="numeric" data-cdur="max" value="${d.max??
           ""}" min="1" max="100" placeholder="—"> rounds</label></div>`}).join("")}
       <p class="psub">Saves: players get a roll call on their phone at the end of their turn and the condition ends when they make it. Monsters roll with the save bonus from their statblock.</p></div>`})()}
   <div style="display:flex;justify-content:flex-end"><button class="btn primary" type="button" data-act="close">Done</button></div></div></div>`;
}
const CR_XP={"0":10,"1/8":25,"1/4":50,"1/2":100,"1":200,"2":450,"3":700,"4":1100,"5":1800,"6":2300,"7":2900,"8":3900,"9":5000,"10":5900,"11":7200,"12":8400,
  "13":10000,"14":11500,"15":13000,"16":15000,"17":18000,"18":20000,"19":22000,"20":25000,"21":33000,"22":41000,"23":50000,"24":62000,"25":75000,"26":90000,
  "27":105000,"28":120000,"29":135000,"30":155000};
// TV14: what the TV may show at the end: a few picked numbers about the players, never the raw statistics or anything about hidden creatures
function endSummary(){
  const seen=state.list.filter(c=>!c.hidden),pcs=seen.filter(c=>c.kind==="pc"),foes=seen.filter(c=>c.kind==="enemy"),names=new Set(seen.map(c=>c.name));
  const won=foes.length&&foes.every(c=>c.down),lost=pcs.length&&pcs.every(c=>c.down),boss=foes.find(c=>c.boss&&c.down);
  const rd=state.turn?state.turn.round:null;
  const sub=[boss?`${boss.name} defeated`:won&&foes.length?`${foes.length} ${foes.length===1?"foe":"foes"} defeated`:"",rd?`${rd} round${rd>1?"s":""}`:
    ""].filter(Boolean).join(" · ");
  const S=Object.entries(state.cstat||{}).filter(([n,x])=>x.d>0&&pcs.some(c=>c.name===n)).sort((a,b)=>b[1].d-a[1].d),cards=[];
  if(S.length){const [n,x]=S[0];cards.push({k:"MVP · most damage",name:n,v:String(x.d),note:x.top&&names.has(x.top.t)?`biggest hit ${x.top.n}${x.top.w?" "+
    x.top.w:""} on ${x.top.t}`:""})}
  const big=S.map(([n,x])=>[n,x.top]).filter(([,t])=>t).sort((a,b)=>b[1].n-a[1].n)[0];
  if(big&&S.length&&big[0]!==S[0][0])cards.push({k:"Biggest hit",name:big[0],v:String(big[1].n),note:names.has(big[1].t)?`on ${big[1].t}${big[1].w?
    ` · ${big[1].w}`:""}`:""});
  const N=Object.entries(state.nstat||{}).map(([id,x])=>[byId(id),x]).filter(([c,x])=>c&&c.kind==="pc"&&!c.hidden&&x.n20>0).sort((a,b)=>b[1].n20-a[1].n20)[0];
  if(N)cards.push({k:"Luckiest",name:N[0].name,v:N[1].n20>1?`${N[1].n20}×20`:"Nat 20",note:N[1].n20>1?`${N[1].n20} natural 20s`:"a natural 20"});
  const h=state.hdywt;if(h&&(!state.fightAt||h.at>=state.fightAt))cards.push({k:"Final blow",name:h.name,v:h.boss,note:"How did they do it?"});
  else{const K=S.filter(([,x])=>x.k>0).sort((a,b)=>b[1].k-a[1].k)[0];if(K)cards.push({k:"Most defeated",name:K[0],v:String(K[1].k),note:K[1].k>1?"foes dropped":
    "foe dropped"})}
  const total=foes.filter(c=>c.down&&c.sb&&CR_XP[String(c.sb.cr||"").trim()]!=null).reduce((a,c)=>a+CR_XP[String(c.sb.cr).trim()],0);
  return {title:lost?"The party falls":won?"Victory":"The fight is over",lost:!!lost&&!won,sub,cards:cards.slice(0,4),xp:total?{total,each:pcs.length?
    Math.floor(total/pcs.length):0}:null};
}
function endFight(){
  const enemies=state.list.filter(c=>c.kind==="enemy");
  state.ended={at:Date.now(),defeated:enemies.filter(c=>c.down).length,down:state.list.filter(c=>c.kind==="pc"&&c.down).map(c=>c.name),rounds:state.turn?
    state.turn.round:null,tv:endSummary()};
  clogPush("Combat ends");
}


/* Settings → Updates: is there a newer Roundkeeper? The server asks GitHub, only on the computer running it and only when the DM
   asks (or turned on "check when Roundkeeper starts"). Step 1: it says so, links the right download and explains the swap. */
let updInfo=null,updBusy=false;
const UPD_OS={windows:"Windows",mac:"Mac",linux:"Linux"};
const UPD_HOW={
  windows:"Close the Roundkeeper window, unzip the download and put the new <b>Roundkeeper.exe</b> in place of the old one, in the same folder. "+
    "Start it again: your fights, library and pictures stay.",
  mac:"Quit Roundkeeper (close its Terminal window), unzip the download and put the new <b>Roundkeeper</b> in place of the old one. Start it again; "+
    "the Mac may ask once more (System Settings → Privacy &amp; Security → Open Anyway). Your fights, library and pictures stay.",
  linux:"Stop Roundkeeper, unzip the download into the same folder over the old files, and start it again. Your fights, library and pictures stay."};
const UPD_ERR={offline:["Couldn't reach GitHub.","Check the internet connection, or try again later."],
  limit:["GitHub is busy right now (too many checks).","Try again in a while."],
  certs:["This computer couldn't check GitHub's certificate.",
    "A network filter or a wrong clock can cause it. Look at the latest release on GitHub instead."],
  bad:["GitHub gave an answer the app didn't understand.","Try again later."],server:["Roundkeeper didn't answer.","Is it still running?"]};
async function updCheck(force){
  updBusy=true;if($("#updSheet"))updSheet();
  try{const r=await fetch("/update/check"+(force?"?force=1":""),{cache:"no-store"});updInfo=r.status===403?{error:"host"}:await r.json()}
  catch(e){updInfo={error:"server"}}
  updBusy=false;updMark();if($("#updSheet"))updSheet();return updInfo}
function updMark(){const on=!!(updInfo&&updInfo.newer);
  document.querySelectorAll('#setBtn,[data-act="updates"]').forEach(el=>el.classList.toggle("upddot",on))}
/* 1.7: Settings and files open in a window from the gear, like Devices, so the side panel stays as it was. Light or dark is the
   sun and moon in the header now. renderDM fills the fields that follow the state. */
function setSheet(){
  const upd=updInfo&&updInfo.newer?" upddot":"";
  $("#overlay").innerHTML=
    `<div class="scrim" data-act="close"><div class="sheet setsheet setpanel" id="setSheet" role="dialog" aria-modal="true" aria-label="Settings and files">
    <div class="sethd"><h2>Settings and files</h2><button class="icon-btn" type="button" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="setgrid">
    <section class="setsec" aria-label="During combat"><div class="sethead">During combat</div>
      <label class="setopt" for="timerSecs">Hourglass <input class="field" id="timerSecs" type="number" min="5" max="300" value="${
        state.timerSecs||30}" style="width:5em"> seconds</label>
      <label class="setopt"><input type="checkbox" id="autoTimer"${state.autoTimer?" checked":
        ""}> <span>Start the hourglass on every player's turn</span></label>
      <label class="setopt" title="When a monster you track takes damage while Concentrating"><input type="checkbox" id="concAuto"${ls.get("concAuto",false)?
        " checked":""}> <span>Roll monsters' Concentration saves for me <small>otherwise the app asks</small></span></label></section>
    <section class="setsec" aria-label="Dice on the screens"><div class="sethead">Dice on the screens</div><div class="tvev diceset" id="diceSet">${
      diceSetHtml()}</div></section>
    <section class="setsec" aria-label="This laptop"><div class="sethead">This laptop</div><div class="acts">
      <button class="btn sm" type="button" data-act="dmdev">DM devices</button>
      <button class="btn sm${upd}" type="button" data-act="updates">Updates</button>
      <button class="btn sm" type="button" data-act="keys">Shortcuts (?)</button></div></section>
    <section class="setsec" aria-label="Data and files"><div class="sethead">Data and files</div><div class="acts">
      <button class="btn sm" type="button" data-act="gdata">Game data</button>
      <button class="btn sm" type="button" data-act="pics">Pictures</button>
      <button class="btn sm" type="button" data-act="export">Export</button>
      <label class="btn sm" for="importFile" tabindex="0">Import</label><input type="file" id="importFile" accept="application/json,.json" hidden></div></section>
    </div></div></div>`;
  setTimeout(()=>{const c=$("#setSheet [data-act=close]");c&&c.focus()},0);
}
function updSheet(){
  const U=updInfo||{},cur=esc(U.current||"");let body;
  if(updBusy)body=`<p>Asking GitHub…</p>`;
  else if(!updInfo)body=`<p>See whether there is a newer Roundkeeper. This asks GitHub for the latest release; nothing else leaves this computer.</p>`;
  else if(U.error==="host")body=`<p>Only the computer running Roundkeeper checks for updates: open Settings and files → Updates there.</p>`;
  else if(U.error){const[e1,e2]=UPD_ERR[U.error]||["Couldn't check.","Try again later."];
    body=`<p><b>${e1}</b></p><p class="psub">${e2}</p>`}
  else if(U.newer)body=`<p class="updnew"><b>${esc(U.latest)} is out.</b> You have ${cur}.`+
      (U.published?` <span class="psub">Released ${esc(new Date(U.published).toLocaleDateString())}.</span>`:"")+`</p>`+
      (U.notes?`<div class="eyebrow2">What's new</div><div class="updnotes">${esc(U.notes)}</div>`:"")+
      `<div class="eyebrow2">How to update</div><p>${UPD_HOW[U.platform]||UPD_HOW.linux}</p><div class="spacts updlinks">`+
      (U.asset?`<a class="btn primary" href="${esc(U.asset.url)}" download>Download for ${UPD_OS[U.platform]||"your computer"}`+
        (U.asset.size?` (${(U.asset.size/1048576).toFixed(1)} MB)`:"")+`</a>`:"")+
      (U.page?`<a class="btn" href="${esc(U.page)}" target="_blank" rel="noopener noreferrer">See the release on GitHub</a>`:"")+`</div>`;
  else if(U.dev)body=`<p>This is a development build (${cur}), so it doesn't offer updates.`+
      (U.latest?` The latest release is ${esc(U.latest)}.`:"")+`</p>`;
  else body=`<p><b>You have the latest version</b> (${cur}).</p>`;
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet updsheet" id="updSheet" role="dialog" aria-modal="true" aria-label="Updates">
    <h2>Updates</h2><div class="psec">${body}</div>
    <div class="psec"><label class="scene-pick"><input type="checkbox" id="updAuto"${ls.get("updAuto",false)?" checked":
      ""}> Check when Roundkeeper starts</label>
      <p class="psub">Off unless you turn it on: Roundkeeper only goes online when you ask it to.</p></div>
    <div class="spacts"><button class="btn" type="button" data-act="close">Close</button><button class="btn primary" type="button" data-act="updcheck"`+
      `${updBusy?" disabled":""}>${updInfo&&!updBusy?"Check again":"Check for updates"}</button></div></div></div>`;
}
/* 1.5: a player's sheet in the DM's drawer, as a card (after Encounter+ and the 2024 sheet): the band in the class colour, AC on a shield, the HP from the
   phone, the six abilities with their saves, then skills, passives, spellcasting, attacks and spells. Every bonus rolls in the drawer, as on a statblock. */
function pcCardHtml(c){
  const sh=(state.sheets||{})[c.name.toLowerCase()];if(!sh||!sh.ab)return null;const C=shCalc(sh),fk=frameKey(c),A=n=>esc(n);
  const chk=(label,b,cls)=>`<button type="button" class="sbr ${cls||"hit"}" data-act="sbroll" data-k="chk" data-m="${b}" data-n="${A(label)}">${shS(
    b)}</button>`;
  const sub=shSub(sh),line1=[shClsName(sh)||"Player character",sub].filter(Boolean).join(" · "),
    line2=[sh.species,sh.bg,sh.size&&sh.size!=="M"?SH_SIZE[sh.size]:""].filter(Boolean).join(" · ");
  const p=c.php,hp=p&&p.max?`<div class="pcchp"><span class="k">Hit points</span><b class="v">${p.cur} / ${p.max}</b>${p.temp?
    `<span class="t">+${p.temp} temp</span>`:
    ""}<span class="sp"></span><small>from the phone</small><span class="pcchpbar"><span class="f" style="width:${Math.max(0,Math.min(100,
      Math.round(100*p.cur/p.max)))}%"></span></span></div>`:
    `<div class="pcchp"><span class="k">Hit points</span><b class="v">${sh.hp||
      "—"}</b><span class="sp"></span><small>max · not shared from a phone</small></div>`;
  const effs=(state.effects||[]).filter(e=>(e.targets||[]).includes(c.id)).map(e=>{const by=byId(e.by);return `<span class="pccchip eff">✦ ${esc(e.name)}${
    by&&by.id!==c.id?` · from ${esc(by.name)}`:""}</span>`});
  if(c.insp)effs.push(`<span class="pccchip insp">Heroic Inspiration</span>`);
  const sks=SH_SK.filter(([k])=>Number((sh.sk||{})[k])),L=(k,v)=>`<div class="pccl"><span class="pcck">${k}</span> ${v}</div>`;
  const dmgBtn=(a)=>{const m=String(a.dmg||"").trim().match(/^(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*(.*)$/i);if(!m)return esc(a.dmg||"");const av=shAvg(m[1]);
    return `<button type="button" class="sbr dmg" data-act="sbroll" data-k="dmg" data-d="${m[1].replace(/\s/g,"")}" data-t="${esc(m[2])}" data-n="${A(a.n)}">${
      av!=null?av+" ":""}(${esc(m[1].replace(/\s/g,""))})</button>${m[2]?" "+esc(m[2]):""}`};
  const at=(sh.att||[]).filter(a=>a&&a.n),sp=sh.spells||{},alw=sp.alw||[],prep=sp.prep||[];
  const alwBy=new Map();alw.forEach(([n,f])=>{const k=f||"";alwBy.set(k,(alwBy.get(k)||[]).concat([n]))});
  const spl=n=>refSpan("spell",n,"",n);
  return `<div class="pcc${fk?" fr-"+fk:""}">
    <div class="pccband"><div class="pccname"><b>${esc(c.name)}</b><span class="l1">${esc(line1)}</span>${line2?
      `<span class="l2">${esc(line2)}</span>`:""}</div>
      <span class="pcclvl" title="Level ${C.lvl}"><b>${C.lvl}</b><small>LEVEL</small></span></div>
    <div class="pccdef"><span class="pccac" title="Armor Class"><b>${esc(String(sh.ac||10))}</b><small>AC</small></span>
      <span class="pccpl"><span class="v">${chk("Initiative",C.init,"hit plain")}</span><small>INITIATIVE</small></span>
      <span class="pccpl"><span class="v">${esc(String(sh.speed||30))} ft</span><small>SPEED</small></span>
      <span class="pccpl"><span class="v">${shS(C.pb)}</span><small>PROFICIENCY</small></span></div>
    ${hp}${effs.length?`<div class="pccchips">${effs.join("")}</div>`:""}
    <div class="pccab">${SH_AB.map(a=>{const pf=(sh.sv||[]).includes(a);return `<div class="pcca${pf?" pf":""}"><span class="k">${SH_AB3[a]}</span>${
      chk(SH_ABN[a]+" check",C.m[a],"hit plain big")}<span class="sc">${(sh.ab||{})[a]||
        10}</span><span class="svk">SAVE</span><button type="button" class="sbr ${pf?"save":"hit"} sv" data-act="sbroll" data-k="chk" data-m="${
      C.sv[a]}" data-n="${A(SH_AB3[a][0]+SH_AB3[a].slice(1).toLowerCase()+" save")}" title="${SH_ABN[a]} save${pf?" (proficient)":""}">${pf?"● ":
        ""}${shS(C.sv[a])}</button></div>`}).join("")}</div>
    <div class="pcclines">${sks.length?L("Skills",sks.map(([k,l])=>`${l} ${chk(l,C.sk[k])}${Number(sh.sk[k])===2?" <small>(expertise)</small>":
      ""}`).join(", ")):""}
      ${L("Passive",`Perception ${C.pp} · Insight ${C.pi} · Investigation ${C.pv}`)}
      ${sh.sa?L("Spellcasting",`${SH_ABN[sh.sa]} · save <b>DC ${C.dc}</b> · ${chk("Spell attack",C.atk)} to hit`):""}
      ${(sh.feats||[]).length?L("Feats",sh.feats.map(f=>{const x=featLines(f,sh);
        return `${refSpan("feat",f.n,f.s||"",esc(f.n))}${x.length?` <small>(${esc(x.join(", "))})</small>`:
        ""}`}).join(", ")):""}</div>
    ${at.length?`<h4 class="pcch">Attacks</h4>${at.map(a=>`<div class="pcct"><b><i>${esc(
      a.n)}.</i></b> <button type="button" class="sbr hit" data-act="sbroll" data-k="hit" data-m="${
      Number(a.hit)||0}" data-n="${A(a.n)}">${shS(Number(a.hit)||0)}</button> to hit.${a.dmg?` <i>Hit:</i> ${dmgBtn(a)}.`:""}${a.note?
        ` <span class="pccnote">${esc(a.note)}</span>`:
      ""}</div>`).join("")}`:""}
    ${alw.length||prep.length?`<h4 class="pcch">Spells</h4>${alw.length?L("Always prepared",[...alwBy].map(([f,ns])=>ns.map(spl).join(", ")+(f?
      ` <small>(${esc(f)})</small>`:"")).join(", ")):""}${prep.length?L("Prepared",prep.map(spl).join(", ")):""}`:""}
  </div>`}
