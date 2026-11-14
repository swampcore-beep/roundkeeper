/* ---------- DM tools: roll calls, battlefield, knowledge, hourglass, passives, quick add, shortcuts, export ---------- */
let callSkip=new Set();   // players left out of the next roll call (everyone is in by default)
const callTargets=()=>state.list.filter(c=>c.kind==="pc"&&!c.hidden&&!callSkip.has(c.id));
function renderCall(){
  const call=state.call,el=$("#callStrip");const _ae=document.activeElement;if(_ae&&el.contains(_ae)&&_ae.tagName==="INPUT")return;
  const pcs=state.list.filter(c=>c.kind==="pc"&&!c.hidden);
  if(!call){
    const keep=$("#callText")?$("#callText").value:"";
    el.innerHTML=`<span class="strip-label">Roll call</span>
      <form id="callForm" autocomplete="off"><input class="field wide" id="callText" list="callList" placeholder="Dexterity save DC 15" aria-label="What to roll" value="${
        esc(keep)}">
      <datalist id="callList">${["Dexterity save DC 15","Constitution save DC 13","Wisdom save DC 14","Strength save DC 12","Perception check","Stealth check",
        "Initiative"].map(x=>`<option value="${x}">`).join("")}</datalist>
      ${pcs.length>1?`<div class="chipgrid callpick" role="group" aria-label="Who rolls">${pcs.map(c=>
        `<button type="button" data-act="callpick" data-id="${esc(c.id)}" aria-pressed="${!callSkip.has(c.id)}">${esc(c.name)}</button>`).join("")}</div>`:""}
      ${(()=>{const n=callTargets().length;return `<button class="btn primary" type="submit" ${n?"":"disabled"}>${!n?"Pick at least one player":n===pcs.length?
        "Send to all players":`Send to ${n} player${n>1?"s":""}`}</button>`})()}</form>
      <span class="strip-empty">Phones buzz and ask for the total; you see every result here.</span>`;
    return;
  }
  const to=(call.to&&call.to.length?call.to:pcs.map(c=>c.id)).map(byId).filter(Boolean),ans=call.answers||{};
  const nin=to.filter(c=>ans[c.id]!=null).length;
  el.innerHTML=`<span class="strip-label">Roll call</span><b class="calltxt">${esc(call.text)}</b><small class="callin">${nin===to.length?"all in":
    `${nin} of ${to.length} in`}</small>
    <span class="callres">${to.map(c=>{const v=ans[c.id];const st=v==null?"wait":call.dc!=null?(v>=call.dc?"pass":"fail"):"done";
      return `<span class="cw ${st}">${esc(c.name)} <b>${v==null?"…":v}</b></span>`}).join("")}</span>
    <span class="spacer"></span><button class="btn" type="button" data-act="callclose">Close roll call</button>`;
}
function renderField(){
  const area=state.effects.filter(e=>e.area),el=$("#fieldStrip");const _ae=document.activeElement;if(_ae&&el.contains(_ae)&&_ae.tagName==="INPUT")return;
  $("#fieldStrip").innerHTML=`<span class="strip-label">Battlefield</span>${area.map(e=>{const c=byId(e.by);
    return `<span class="pchip">✦ ${esc(e.name)}${c?` <small>${esc(c.name)}</small>`:
    ""}<button type="button" class="x" data-act="effrm" data-e="${esc(e.id)}" aria-label="Remove ${esc(e.name)}">${I.x}</button></span>`}).join("")||
    '<span class="strip-empty">Area effects everyone should see: Fog Cloud, Darkness, Wall of Fire…</span>'}
    <span class="spacer"></span><form id="fieldForm" autocomplete="off"><input class="field wide" id="fieldName" list="fieldList" maxlength="30" placeholder="Fog Cloud" aria-label="Battlefield effect">
    <datalist id="fieldList">${["Fog Cloud","Darkness","Spirit Guardians","Wall of Fire","Web","Entangle","Silence","Stinking Cloud","Sleet Storm",
      "Spike Growth","Difficult terrain","Dim light","Heavy rain"].map(x=>`<option value="${x}">`).join("")}</datalist>
    <button class="btn" type="submit">Add</button></form><button class="btn" type="button" data-act="deffnew" title="A spell on players or monsters, with who cast it">${
      ic("spark")} Spell effect…</button><button class="btn" type="button" data-act="clocknew" title="Goes down by one each round">⏳ Countdown…</button>${
      clocksHtml()}`;
}
function partyStats(name){return state.party.find(p=>p.name.toLowerCase()===String(name).toLowerCase())}
function passivesLine(c){const p=partyStats(c.name);if(!p)return "";const bits=[["PP",p.pp],["Ins",p.ins],["Inv",p.inv],["DC",p.dc]].filter(x=>x[1]!=
  null&&x[1]!=="");
  return bits.length?`<span class="passives">${bits.map(([k,v])=>`${k} <b>${esc(v)}</b>`).join(" · ")}</span>`:""}
let showPartyTable=false;
function partyTable(){
  if(!showPartyTable||!state.party.length)return "";
  return `<div class="ptable"><div class="ph"><span>Player</span><span>AC</span><span title="Passive Perception">PP</span><span title="Passive Insight">Ins</span><span title="Passive Investigation">Inv</span><span title="Spell save DC">DC</span></div>
    ${state.party.map((p,i)=>`<div class="pr" data-pi="${i}"><b>${esc(p.name)}</b>${["ac","pp","ins","inv","dc"].map(k=>
      `<input class="field" type="number" inputmode="numeric" id="pt-${i}-${k}" data-pk="${k}" value="${p[k]??
      ""}" aria-label="${k} for ${esc(p.name)}">`).join("")}</div>`).join("")}</div>`;
}
let bgFiles=null;
async function loadBgList(){try{bgFiles=await (await fetch("/bg-list",{cache:"no-store"})).json()}catch(e){bgFiles=bgFiles||[]}}
