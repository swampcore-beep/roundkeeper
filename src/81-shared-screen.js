/* ---------- shared-screen extras: battlefield effects, roll calls, hourglass, nat 20 / nat 1 ---------- */
const TAGS=[["reaction","Reaction used"],["readied","Readied action"],["dodge","Dodging"]];
const COVERS=[["","No cover"],["half","Half (+2 AC)"],["tq","Three-quarters (+5 AC)"],["total","Total"]];
const COVER_CHIP={half:"½ cover +2",tq:"¾ cover +5",total:"Total cover"};
/* 58: countdowns: "The ritual completes in 3 rounds" goes down by itself each round; secret ones never leave the laptop */
function clockTick(d){const msgs=[];(state.clocks||[]).forEach(k=>{if(d<0&&k.n>0){k.n--;if(k.n===0){msgs.push(`⏳ ${k.name}: now!`);if(!k.secret)state.clockFx={id:uid(),name:k.name,max:k.max,at:Date.now()}}}else if(d>0&&k.n<k.max)k.n++});return msgs}
function clockSeg(k,big){const n=Math.max(0,k.n),m=Math.max(1,k.max),R=big?26:15,C=2*Math.PI*R,gap=m>1?Math.min(6,C/m*.18):0,seg=C/m-gap;
  let arcs="";for(let i=0;i<m;i++)arcs+=`<circle r="${R}" cx="${R+5}" cy="${R+5}" fill="none" stroke-width="${big?7:5}" class="${i<n?"on":"off"}" stroke-dasharray="${seg} ${C-seg}" stroke-dashoffset="${-(i*(seg+gap))+C/4}"/>`;
  return `<svg class="clk" viewBox="0 0 ${2*R+10} ${2*R+10}" aria-hidden="true">${arcs}<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle">${n}</text></svg>`}
function clocksHtml(){const L=(state.clocks||[]).filter(k=>MODE==="dm"||!k.secret);if(!L.length)return "";
  return `<div class="clocks">${L.map(k=>`<div class="clock${k.n===0?" now":""}">${clockSeg(k,MODE!=="dm")}<span><b>${esc(k.name)}</b><small>${k.n===0?"now!":k.n===1?"1 round":k.n+" rounds"}${k.secret&&MODE==="dm"?" · secret":""}</small></span>${MODE==="dm"?`<button type="button" class="icon-btn sm" data-act="clkm" data-id="${esc(k.id)}" aria-label="One less">−</button><button type="button" class="icon-btn sm" data-act="clkp" data-id="${esc(k.id)}" aria-label="One more">+</button><button type="button" class="icon-btn sm" data-act="clkrm" data-id="${esc(k.id)}" aria-label="Remove ${esc(k.name)}">${I.x}</button>`:""}</div>`).join("")}</div>`}
function clockSheet(){
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="Countdown"><h2>Countdown</h2>
    <p class="psub">Goes down by one at the start of each new round. At 0 the tablet shows it, and you get a note.</p>
    <form id="clockForm" class="clkform" autocomplete="off"><input class="field" id="clkName" maxlength="40" placeholder="The ritual completes, The ceiling collapses…" required>
      <label class="rangerow">Rounds <input class="field" id="clkN" type="number" min="1" max="20" value="3" style="width:5em"></label>
      <label class="chk"><input type="checkbox" id="clkSecret"> Secret: only you see it</label>
      <div class="spacts"><button class="btn" type="button" data-act="close">Cancel</button><button class="btn primary" type="submit">Start the countdown</button></div></form></div></div>`;
  setTimeout(()=>{const i=$("#clkName");i&&i.focus()},30)}
/* the tablet's big moments: a countdown reaching 0 (58), "how do you want to do this?" (59) */
const TV_EV=[["intro","Boss entrance","both"],["dice","Dice: nat 20, nat 1, shared rolls","both"],["hd","How do you want to do this?","both"],["clock","Countdown at 0","both"],["round","New round","tv"],["end","End of combat","both"]];
function screenWants(k){   // where a moment shows: the tablet, the TV, or both (only matters while a TV is connected)
  if(meName!=="*")return true;const v=((state.tv||{}).ev||{})[k]||(TV_EV.find(x=>x[0]===k)||[,,"both"])[2];
  return TV?v!=="surface":!(state.tvSeen&&v==="tv");
}
function surfaceMoments(first){
  if(meName!=="*")return;const now=dmNow();
  const k=state.clockFx;if(k&&k.id!==pv.clockFx){pv.clockFx=k.id;if(!first&&now-k.at<20000&&screenWants("clock")&&TV)tvClockShow({id:k.id,name:k.name,n:0,max:k.max||1},true);else if(!first&&now-k.at<20000&&screenWants("clock"))momentShow("clk",`<div class="mo-eb">⏳ Countdown</div><div class="mo-big">${esc(k.name)}</div>`,6500)}
  const h=state.hdywt;if(h&&h.id!==pv.hd){pv.hd=h.id;if(now-h.at<15000&&screenWants("hd"))momentShow("hd fr fr-"+esc(h.cls||"none"),`<span class="mo-sig sig"></span><div class="mo-big">${esc(h.name)},</div><div class="mo-q">how do you want to do this?</div><div class="mo-eb">${esc(h.boss)} falls</div>`,Math.max(4000,14000-(now-h.at)))}
  if(!h&&pv.hd&&$("#moment.hd"))$("#moment").remove();
}
const TV_MODES=[["auto","Auto"],["scene","Scene"],["spot","Spotlight"],["order","Order"],["mirror","Mirror"]];
function tvModeNow(list){const T=state.tv||{},m=T.mode||"auto",paused=T.pause&&T.pause.until>dmNow();
  if(paused)return "pause";
  if(m!=="auto")return m==="pause"?"scene":(m==="spot"||m==="order")&&tvCallOn()?"call":m;
  if(state.ended&&screenWants("end"))return state.ended.tv?"end":"mirror";
  if(!list.length)return "scene";
  if(tvCallOn())return "call";
  if(!state.turn)return tvInitOn(list)?"init":"order";
  return "spot"}
