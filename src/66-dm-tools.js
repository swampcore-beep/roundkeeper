/* ---------- DM tools: roll calls, battlefield, knowledge, hourglass, passives, quick add, shortcuts, export ---------- */
let callSkip=new Set();   // players left out of the next roll call (everyone is in by default)
const callTargets=()=>state.list.filter(c=>c.kind==="pc"&&!c.hidden&&!callSkip.has(c.id));
const CLOCK='<svg class="cwi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
/* E19 (1.4): a saving throw roll call reminds everyone of a Paladin's Aura of Protection (level 6+: + Charisma modifier, at least +1,
   within 10 ft). Level and Charisma come from the sheet the DM keeps; no sheet, no reminder. */
function callAuras(){const out=[];state.list.filter(c=>c.kind==="pc"&&!c.hidden&&!c.down).forEach(c=>{
  const sh=(state.sheets||{})[c.name.toLowerCase()];if(!sh)return;const m=String(sh.cls||"").match(/paladin\s*(\d+)/i);
  const lvl=m?Number(m[1]):c.cls==="paladin"?Number(sh.lvl)||0:0;if(lvl<6)return;const cha=shMod((sh.ab||{}).cha);
  out.push({id:c.id,t:`${c.name}'s aura: +${Math.max(1,cha)} to the save if you're within 10 ft`})});return out}
function renderCall(){
  const call=state.call,el=$("#callStrip");const _ae=document.activeElement;if(_ae&&el.contains(_ae)&&_ae.tagName==="INPUT")return;
  const pcs=state.list.filter(c=>c.kind==="pc"&&!c.hidden);
  if(!call){
    const keep=$("#callText")?$("#callText").value:"";
    el.innerHTML=`<span class="strip-label">Roll call</span>
      <form id="callForm" autocomplete="off"><div class="callrow"><input class="field wide" id="callText" list="callList" placeholder="Dexterity save DC 15" aria-label="What to roll" value="${
        esc(keep)}">
      <datalist id="callList">${["Dexterity save DC 15","Constitution save DC 13","Wisdom save DC 14","Strength save DC 12","Perception check","Stealth check",
        "Initiative"].map(x=>`<option value="${x}">`).join("")}</datalist>
      ${(()=>{const n=callTargets().length,to=!n?"Send":n===pcs.length?"Send to all players":`Send to ${n} player${n>1?"s":""}`;
        return `<button class="btn${n?" primary":""}" type="submit" aria-label="${to}" title="${
          to}: phones buzz and ask for the total; you see every result here">Send</button></div>${
        pcs.length>1?`<div class="chipgrid callpick" role="group" aria-label="Who rolls"><span class="callto" aria-hidden="true">To</span>${pcs.map(c=>
        `<button type="button" data-act="callpick" data-id="${esc(c.id)}" aria-pressed="${!callSkip.has(c.id)}">${esc(c.name)}</button>`).join(
          "")}</div>`:""}${n?"":
          `<span class="fixhint" role="status">Pick at least one player</span>`}`})()}</form>`;
    return;
  }
  const to=(call.to&&call.to.length?call.to:pcs.map(c=>c.id)).map(byId).filter(Boolean),ans=call.answers||{};
  const nin=to.filter(c=>ans[c.id]!=null).length;
  el.innerHTML=`<span class="strip-label">Roll call</span><b class="calltxt">${esc(call.text)}</b>${(call.aura||[]).map(a=>
    `<small class="aurahint">${esc(a.t)}</small>`).join("")}<small class="callin">${nin===to.length?"all in":
    `${nin} of ${to.length} in`}</small>
    <span class="callres">${to.map(c=>{const v=ans[c.id];const st=v==null?"wait":call.dc!=null?(v>=call.dc?"pass":"fail"):"done";
      return `<span class="cw ${st}">${v==null?CLOCK:""}${esc(c.name)} <b>${v==null?"waiting":v}</b></span>`}).join("")}</span>
    <span class="spacer"></span><button class="btn" type="button" data-act="callclose">Close roll call</button>`;
}
/* E1 (1.3): handouts. The DM writes a note, a letter, a wanted poster or a page of lore, picks a style, and shows it on the tablet,
   the TV or both, and on the phones if they want. The saved ones (state.handouts) are the DM's; only the one shown (state.handout) goes out. */
const HSTYLES=[["parch","Parchment"],["letter","Sealed letter"],["wanted","Wanted poster"],["page","Book page"]];
const HWHERE=[["table","Tablet"],["tv","TV"],["both","Both"]];
function renderHand(){
  const el=$("#handStrip");if(!el)return;const H=state.handouts||[],on=state.handout;
  const o=$("#handOn");if(o)o.hidden=!on;
  el.innerHTML=(on?`<div class="handon"><span>On the ${on.where==="tv"?"TV":on.where==="both"?"tablet and TV":"tablet"}${on.phones?" and phones":
    ""}: <b>${esc(on.title||"(untitled)")}</b></span><button type="button" class="btn sm" data-act="handdown">Take it down</button></div>`:"")
    +(H.length?`<div class="handlist">${H.map(h=>`<div class="handrow"><span class="handt">${esc(h.title||"(untitled)")}<small>${esc((HSTYLES.find(x=>
      x[0]===h.style)||HSTYLES[0])[1])}</small></span><button type="button" class="btn sm${on&&on.id===h.id?" primary":""}" data-act="handshow" data-id="${
      esc(h.id)}">${on&&on.id===h.id?"Shown":"Show"}</button><button type="button" class="btn sm" data-act="handedit" data-id="${esc(
        h.id)}">Edit</button><button type="button" class="icon-btn sm" data-act="handdel" data-id="${
      esc(h.id)}" aria-label="Delete ${esc(h.title||"this handout")}" title="Delete (click twice)">${I.x}</button></div>`).join("")}</div>`
      :"")
    +`<button type="button" class="btn sm" data-act="handnew" title="A note, a letter, a wanted poster or a page of lore, shown on the table">New handout…</button>`;
}
function handShow(h){const d=state.handoutWhere||{};state.handout={id:h.id,style:h.style||"parch",title:h.title||"",body:h.body||"",sign:h.sign||"",
  where:d.where||"both",phones:!!d.phones,at:Date.now()};commit()}
function handSheet(id){
  const h=(state.handouts||[]).find(x=>x.id===id)||{id:"",style:"parch",title:"",body:"",sign:""},d=state.handoutWhere||{where:"both",phones:false};
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet handsheet" role="dialog" aria-modal="true" aria-label="Handout"><h2>${id?
    "Edit the handout":
    "New handout"}</h2>
    <form id="handForm" data-id="${esc(h.id)}" autocomplete="off" class="handform">
      <div class="handfields">
        <label>Title <input class="field" id="hTitle" maxlength="80" value="${esc(h.title)}" placeholder="Notice to all who pass the bridge"></label>
        <label>Text <textarea class="field" id="hBody" rows="7" maxlength="1200" placeholder="By order of the Reeve…">${esc(h.body)}</textarea></label>
        <label>Signature, reward or source <input class="field" id="hSign" maxlength="80" value="${esc(
          h.sign)}" placeholder="Harrow, Reeve of Millford"></label>
        <fieldset class="seg2 hstyle"><legend>Style</legend>${HSTYLES.map(([k,l])=>`<label><input type="radio" name="hStyle" value="${k}"${h.style===
          k?" checked":
          ""}> ${l}</label>`).join("")}</fieldset>
        <fieldset class="seg2"><legend>Show it on</legend>${HWHERE.map(([k,l])=>`<label><input type="radio" name="hWhere" value="${k}"${(d.where||"both")===k?
          " checked":""}> ${l}</label>`).join("")}<label class="hph"><input type="checkbox" id="hPhones"${d.phones?" checked":
            ""}> and the phones</label></fieldset>
      </div>
      <div class="handprev" aria-label="Preview" id="hPrev"></div>
      <div class="handbtns"><button class="btn" type="button" data-act="close">Cancel</button><button class="btn" type="submit">Save</button><button class="btn primary" type="button" data-act="handsaveshow">Save and show</button></div>
    </form></div></div>`;
  const upd=()=>{const p=$("#hPrev");if(p)p.innerHTML=handoutHtml(handFromForm())};
  $("#handForm").addEventListener("input",upd);upd();setTimeout(()=>{const x=$("#hTitle");x&&x.focus()},0);
}
function handFromForm(){const f=$("#handForm"),st=f.querySelector("input[name=hStyle]:checked");
  return {id:f.dataset.id||uid(),style:st?st.value:"parch",title:$("#hTitle").value.trim(),body:$("#hBody").value.replace(/\s+$/,""),sign:
    $("#hSign").value.trim()}}
function handSave(show){
  const f=$("#handForm");if(!f)return;const h=handFromForm(),w=f.querySelector("input[name=hWhere]:checked");
  if(!h.title&&!h.body){toast("Write a title or some text first");return}
  state.handoutWhere={where:w?w.value:"both",phones:$("#hPhones").checked};
  const H=state.handouts=state.handouts||[],i=H.findIndex(x=>x.id===h.id);if(i>=0)H[i]=h;else H.unshift(h);
  if(state.handout&&state.handout.id===h.id&&!show)Object.assign(state.handout,{style:h.style,title:h.title,body:h.body,sign:h.sign,where:
    state.handoutWhere.where,
    phones:state.handoutWhere.phones});
  closeSheet();if(show)handShow(h);else commit();
}
function renderField(){
  const area=state.effects.filter(e=>e.area),el=$("#fieldStrip");const _ae=document.activeElement;if(_ae&&el.contains(_ae)&&_ae.tagName==="INPUT")return;
  $("#fieldStrip").innerHTML=`<span class="strip-label">Battlefield</span>${area.map(e=>{const c=byId(e.by);
    return `<span class="pchip">✦ ${esc(e.name)}${c?` <small>${esc(c.name)}</small>`:
    ""}<button type="button" class="x" data-act="effrm" data-e="${esc(e.id)}" aria-label="Remove ${esc(e.name)}">${I.x}</button></span>`}).join("")||
    ''}
    <span class="spacer"></span><form id="fieldForm" autocomplete="off"><input class="field wide" id="fieldName" list="fieldList" maxlength="30" placeholder="Fog Cloud, Darkness…" aria-label="Battlefield effect" title="Area effects everyone should see: Fog Cloud, Darkness, Wall of Fire…">
    <datalist id="fieldList">${["Fog Cloud","Darkness","Spirit Guardians","Wall of Fire","Web","Entangle","Silence","Stinking Cloud","Sleet Storm",
      "Spike Growth","Difficult terrain","Dim light","Heavy rain"].map(x=>`<option value="${x}">`).join("")}</datalist>
    <button class="btn" type="submit">Add</button></form><span class="fieldmore"><button class="btn sm" type="button" data-act="deffnew" title="A spell on players or monsters, with who cast it">${
      ic("spark")} Spell effect…</button><button class="btn sm" type="button" data-act="clocknew" title="Goes down by one each round">${ic(
        "hourglass")} Countdown…</button></span>${
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
