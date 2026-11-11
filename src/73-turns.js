/* ---- turns: Next turn walks the order; rounds count up; hidden creatures take their turns but the tablet doesn't show it ---- */
const turnOrder=()=>withLair(sorted()).filter(c=>c.kind==="lair"||(typeof c.init==="number"&&!(c.kind!=="pc"&&c.down)));
/* turns of the caster left before an effect runs out (it ends at the start of the caster's turn): Bless cast now shows 10, a "1 round" spell 1 */
function effLeft(e){
  if(!e||!state.turn||e.r0==null)return null;
  const sp=spellFind(e.name,e.src),n=sp?durRounds(sp[4]):0;if(!n)return null;
  const o=turnOrder(),ci=o.findIndex(x=>x.id===e.by),ti=o.findIndex(x=>x.id===state.turn.id);
  const passed=ci<0||ti<0||ci<=ti;   // the caster has already had its turn this round
  return Math.max(1,e.r0+n-state.turn.round+(passed?0:1));
}
const effN=e=>{const n=effLeft(e);return n==null?"":`<i class="effn" title="${n===1?"Ends at the start of the caster's next turn":n+
  " more turns of the caster"}">${n}</i>`};
function moveTurn(dir){
  const ord=turnOrder();if(!ord.length){toast("Give the combatants an initiative first");return}
  const t=state.turn;let i,round=t?t.round:1;
  if(!t)i=0;
  else{i=ord.findIndex(c=>c.id===t.id);
    if(i<0){const k=ord.findIndex(c=>initOf(c)<(t.init??99));const pos=k<0?ord.length:k;i=dir>0?pos:pos-1}else i+=dir}
  if(i>=ord.length){i=0;round++}else if(i<0){i=ord.length-1;round=Math.max(1,round-1)}
  const prev=t&&dir>0?byId(t.id):null;if(!t)state.surprise=false;   // initiative is done once turns start
  if(dir>0)turnTime(t&&t.id);
  const c=ord[i];const endMsgs=dir>0?turnEnd(prev):[];const r0=t?t.round:1;state.turn={id:c.id,round,init:initOf(c)};
  if(dir>0){ongTurn(prev,"end");ongTurn(c,"start")}
  if(t&&round!==r0)endMsgs.push(...clockTick(round>r0?-1:1));
  if(t&&round>r0){const hid=state.list.filter(c=>c.hidden).map(c=>c.name.toLowerCase()),L=(state.clog||[]).filter(x=>x.r===r0&&typeof x.t==="string"&&
    !hid.some(n=>x.t.toLowerCase().includes(n))).map(x=>x.t);
    const pri=x=>/defeated|falls|drops to 0|dies|natural 20|loses Concentration|back up/i.test(x)?0:1;
      state.rsum={r:r0,lines:L.map((x,i)=>[pri(x),i,x]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).slice(0,3).map(x=>x[2])}}
  const msgs=dir>0?endMsgs.concat(turnStart(c)):[];
  commit();if(msgs.length)toast(msgs.join(" · "),5000);
  const r=document.querySelector(`#roster .row[data-id="${c.id}"]`);r&&r.scrollIntoView({block:"nearest",behavior:"smooth"});
}
/* condition timing: c.cdur[name] = {end:"start"|"end"|"save", ab:"Wis", dc:15, max:rounds, r0:round it was set} */
const ABIL3=[["Str","Strength"],["Dex","Dexterity"],["Con","Constitution"],["Int","Intelligence"],["Wis","Wisdom"],["Cha","Charisma"]];
const abFull=a=>(ABIL3.find(x=>x[0]===a)||[a,a])[1];
const CSAVE={Frightened:"Wis",Charmed:"Wis",Paralyzed:"Wis",Stunned:"Con",Poisoned:"Con",Blinded:"Con",Deafened:"Con",Restrained:"Str",Incapacitated:"Wis",
  Prone:"Str",Petrified:"Con",Unconscious:"Con"};
const cdurOf=(c,n)=>c&&c.cdur&&c.cdur[n]||null;
const hasCond=(c,n)=>(c.conds||[]).some(x=>(x.n||x)===n);
function cdurTag(d){if(!d)return "";const p=[];if(d.end==="save")p.push(`${d.ab} ${d.dc}`);else if(d.end==="start")p.push("ends on its turn");
  else if(d.end==="end")p.push("ends after its turn");if(d.max)p.push(`max ${d.max} rd`);return p.join(" · ")}
function condEnd(c,n,why,msgs){c.conds=(c.conds||[]).filter(x=>(x.n||x)!==n);if(c.cdur)delete c.cdur[n];const m=`${c.name}: ${n} ends${why?" ("+why+")":""}`;
  msgs.push(m);clogPush(m)}
/* a monster's save bonus from its statblock: the Saving Throws line, else the ability table */
function sbSaveMod(raw,ab){
  const s=String(raw||"").replace(/−/g,"-"),num=x=>parseInt(String(x).replace(/\s/g,""),10);
  let m=s.match(new RegExp("Saving Throws[^\\n]*?\\b"+ab+"[a-z]*\\.?\\s*([+-]\\s*\\d+)","i"));if(m)return num(m[1]);
  m=s.match(new RegExp("\\|\\s*"+ab+"[a-z]*\\s*\\|\\s*\\d+\\s*\\|\\s*([+-]\\d+)\\s*\\|\\s*([+-]\\d+)","i"));if(m)return num(m[2]);
  const L=s.split(/\r?\n/).map(l=>l.replace(/^\s*>\s?/,""));const hi=L.findIndex(l=>/\|\s*STR\s*\|\s*DEX\s*\|/i.test(l));
  if(hi>=0){const head=L[hi].split("|").map(x=>x.trim().toLowerCase()).filter(Boolean),row=L.slice(hi+1).find(l=>/\(\s*[+-]?\d+\s*\)/.test(l));
    if(row){const cells=row.split("|").map(x=>x.trim()).filter(Boolean),i=head.indexOf(ab.toLowerCase()),mm=i>=0&&cells[i]&&
      cells[i].match(/\(\s*([+-]?\d+)\s*\)/);if(mm)return num(mm[1])}}
  return null;
}
const callBusy=()=>{const k=state.call;if(!k)return false;const to=k.to&&k.to.length?k.to:state.list.filter(c=>c.kind==="pc"&&!c.hidden).map(c=>c.id);
  return to.some(id=>byId(id)&&(k.answers||{})[id]==null)};
/* the end of a creature's turn: conditions that end now, and saves to end them */
function turnEnd(c){
  const msgs=[];if(!c||!c.cdur)return msgs;
  Object.entries(c.cdur).forEach(([n,d])=>{if(!hasCond(c,n))return;
    if(d.end==="end")condEnd(c,n,"end of its turn",msgs);
    else if(d.end==="save"&&d.ab&&d.dc){const txt=`${abFull(d.ab)} save DC ${d.dc} · ${n}`;
      if(c.kind==="pc"){
        if(callBusy())msgs.push(`${c.name}: ${txt} (a roll call is still open, ask at the table)`);
        else{state.call={id:uid(),text:txt,dc:d.dc,at:Date.now(),to:[c.id],answers:{},cond:{id:c.id,n}};msgs.push(`${c.name}: ${txt}, asked on the phone`)}}
      else{const mod=c.sb?sbSaveMod(c.sb.raw,d.ab):null;
        if(mod==null)msgs.push(`${c.name}: ${txt} to end it`);
        else{const r=d20(),tot=r+mod;if(tot>=d.dc)condEnd(c,n,`${d.ab} save ${tot} vs DC ${d.dc}`,msgs);
          else msgs.push(`${c.name}: ${d.ab} save ${tot} vs DC ${d.dc}, still ${n}`)}}}
  });
  return msgs;
}
function turnStart(c){
  const msgs=[];if(c.kind==="lair"){const b=lairBoss();return [b?`${b.name}: pick a lair action`:"Lair action"]}
  Object.entries(c.cdur||{}).forEach(([n,d])=>{if(!hasCond(c,n))return;
    if(d.max&&d.r0==null)d.r0=state.turn.round;
    if(d.end==="start")condEnd(c,n,"start of its turn",msgs);
    else if(d.max&&state.turn.round-d.r0>=d.max)condEnd(c,n,`${d.max} round${d.max>1?"s":""}`,msgs)});
  if(c.kind==="pc"&&c.down&&!isDead(c)&&!isStable(c)){state.dsAsk={id:uid(),cid:c.id,at:Date.now()};msgs.push(`${c.name}: death save`)}
  if((c.conds||[]).some(x=>(x.n||x)==="Burning"))msgs.push(`${c.name} is Burning: 1d4 fire`);
  if(c.sb){if(c.sb.la)c.sb.la.used=0;
    (c.sb.rech||[]).forEach(r=>{if(r.ready)return;const d=1+Math.floor(Math.random()*6);if(d>=r.min){r.ready=true;
      msgs.push(`${r.n}: d6 = ${d}, recharged`)}else msgs.push(`${r.n}: d6 = ${d}, not yet`)})}
  // effects this creature cast run out: 1 minute = 10 rounds, 1 round = until its next turn
  const R=state.turn.round,gone=state.effects.filter(e=>{if(e.by!==c.id||e.r0==null)return false;const sp=spellFind(e.name,e.src),n=sp?durRounds(sp[4]):0;
    return n&&R-e.r0>=n});
  if(gone.length){state.effects=state.effects.filter(e=>!gone.includes(e));
    if(gone.some(e=>e.conc)&&!state.effects.some(e=>e.by===c.id&&e.conc))c.conds=(c.conds||[]).filter(x=>(x.n||x)!=="Concentrating");
    msgs.push(gone.map(e=>`${e.name} ended`).join(", "))}
  if(state.autoTimer&&c.kind==="pc"&&!c.down)state.timer={id:uid(),cid:c.id,name:c.name,secs:Math.max(5,Math.min(300,state.timerSecs||30)),at:Date.now()};
  return msgs;
}
function askDeathSave(c){
  if(isDead(c)||isStable(c)){toast(`${c.name} is ${isDead(c)?"dead":"stable"}; no more death saves`);return}
  if(!c.down){c.down=true;c.ds={s:0,f:0}}
  state.dsAsk={id:uid(),cid:c.id,at:Date.now()};commit();toast(`Death save window opened on ${c.name}'s phone`);
}
function startTimer(c){
  if(state.timer&&state.timer.cid===c.id&&Date.now()<state.timer.at+state.timer.secs*1000){stopTimer();return}
  state.timer={id:uid(),cid:c.id,name:c.name,secs:Math.max(5,Math.min(300,state.timerSecs||30)),at:Date.now()};commit();
}
function exportState(){
  const blob=new Blob([JSON.stringify(state,null,1)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`initiative-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast("Exported");
}
function importState(file){
  const rd=new FileReader();
  rd.onload=()=>{try{const d=JSON.parse(rd.result);if(!d||!Array.isArray(d.list))throw 0;
      undoStack.push(JSON.stringify(state));redoStack=[];state=norm(d);finish();toast("Imported. Ctrl+Z brings back the previous state.")}
    catch(e){toast("That file isn't a tracker export")}};
  rd.readAsText(file);
}
function renderParty(){
  const party=state.party,el=$("#party");const _ae=document.activeElement;if(_ae&&el.contains(_ae)&&_ae.tagName==="INPUT")return;
  const chips=party.map((p,i)=>`<span class="pchip">${esc(p.name)}${LABEL[p.cls]?` <small>${LABEL[p.cls]}</small>`:""}${p.ac!=null?
    ` <small>AC ${esc(p.ac)}</small>`:""}<button type="button" class="x" data-act="prm" data-i="${i}" aria-label="Remove ${esc(p.name)} from the party">${
    I.x}</button></span>`).join("");
  const pcsInFight=state.list.filter(c=>c.kind==="pc").length;
  $("#party").innerHTML=`<span class="strip-label">Party</span>${chips||
    '<span class="strip-empty">Enter the players once and they stay saved for every combat.</span>'}
    <form id="partyForm" autocomplete="off"><input class="field" id="pName" placeholder="Player name" aria-label="Player name"><select class="field" id="pCls" aria-label="Class">${
      typeOptions(CLASSES,"",
      "Class")}</select><input class="field ac" id="pAc" type="number" placeholder="AC" aria-label="AC"><button class="btn" type="submit">Add</button></form>
    <span class="spacer"></span>
    ${pcsInFight&&!party.length?'<button class="btn" type="button" data-act="pfromfight">Save players from combat</button>':""}
    ${party.length?`<button class="btn" type="button" data-act="ptoggle" aria-pressed="${showPartyTable}">Passives and DCs</button>`:""}
    ${party.length?'<button class="btn primary" type="button" data-act="pload">Add party to combat</button>':""}
    <label class="chk surpchk" title="Phones tell the players to roll initiative with disadvantage. Turns off by itself when turns start."><input type="checkbox" id="partySurp" ${
      state.surprise?"checked":""}> Party is surprised (initiative with disadvantage)</label>`;
  const ae=document.activeElement;if(!(ae&&$("#partyTbl").contains(ae)))$("#partyTbl").innerHTML=partyTable();
}
function renderEnc(){
  {const el=$("#enc");const _ae=document.activeElement;if(_ae&&el.contains(_ae)&&_ae.tagName==="INPUT")return;}
  const foes=state.list.filter(c=>c.kind!=="pc").length;
  const chips=state.encounters.map((e,i)=>`<span class="pchip encchip"><button type="button" class="go" data-act="eload" data-i="${i}" title="Add to combat">${
    esc(e.name)} <small>${e.foes.length}×</small></button><button type="button" class="x" data-act="erm" data-i="${i}" aria-label="Delete encounter ${esc(
    e.name)}">${I.x}</button></span>`).join("");
  const keep=$("#eName")?$("#eName").value:"";
  $("#enc").innerHTML=`<span class="strip-label">Encounters</span>${chips||
    '<span class="strip-empty">Set up enemies in a combat and save them as an encounter for later.</span>'}
    <span class="spacer"></span>
    <form id="encForm" autocomplete="off"><input class="field wide" id="eName" placeholder="Name, e.g. Goblin ambush" aria-label="Encounter name" value="${esc(
      keep)}"><button class="btn" type="submit" ${foes?"":"disabled"}>Save enemies from combat</button></form>`;
}
function loadParty(){
  const have=new Set(state.list.map(c=>c.name.toLowerCase()));
  state.party.forEach(p=>{if(!have.has(p.name.toLowerCase()))state.list.push(newCombatant({name:p.name,base:p.name,kind:"pc",ac:p.ac??null,cls:p.cls||""}))});
}

