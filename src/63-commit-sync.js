/* ---------- commits, undo, sync ---------- */
let undoStack=[],redoStack=[],snap=null,pushing=false,pushAgain=false,pushTimer=null;
function setSync(s,t){const el=$("#sync");if(!el)return;el.dataset.s=s;el.lastElementChild.textContent=t}
/* combat recap: what happened, kept on the laptop only (the server never sends state.clog to players) */
function clogPush(t){if(MODE!=="dm")return;state.clog=state.clog||[];state.clog.push({r:state.turn?state.turn.round:null,at:Date.now(),t});if(state.clog.length>300)state.clog.shift()}
let clogSeen=null;
function clogScan(){
  if(!state.list.length||state.ended){clogSeen=null;return}
  const now=new Map(state.list.map(c=>[c.id,{down:!!c.down,dead:isDead(c),stable:isStable(c),bl:!!c.bloodied,hid:!!c.hidden,name:c.name,pc:c.kind==="pc"}]));
  if(clogSeen)now.forEach((v,id)=>{const o=clogSeen.get(id);if(!o)return;
    if(o.hid&&!v.hid)clogPush(`${v.name} appears`);
    if(v.bl&&!o.bl&&!v.down)clogPush(`${v.name} is Bloodied`);
    if(!o.down&&v.down)clogPush(v.pc?`${v.name} drops to 0 HP`:`${v.name} is defeated`);
    if(v.pc&&v.stable&&!o.stable)clogPush(`${v.name} is stable`);
    if(v.pc&&v.dead&&!o.dead)clogPush(`${v.name} dies`);
    if(v.pc&&o.down&&!v.down)clogPush(`${v.name} is back on their feet`)});
  clogSeen=now;
}
function callRecap(){const k=state.call;if(!k||k.logged)return;const a=k.answers||{};
  const to=(k.to&&k.to.length?k.to:state.list.filter(c=>c.kind==="pc"&&!c.hidden).map(c=>c.id)).map(byId).filter(Boolean);
  if(!to.length||to.some(c=>a[c.id]==null))return;k.logged=true;
  clogPush(`${k.text}: ${to.map(c=>`${c.name} ${a[c.id]}${k.dc!=null?(a[c.id]>=k.dc?" ✓":" ✗"):""}`).join(", ")}`)}
/* 75: natural 20s and 1s each player rolled through the app, and how long their turns took */
function natAdd(id,nat){if(nat!==20&&nat!==1)return;const S=state.nstat=state.nstat||{},x=S[id]=S[id]||{n20:0,n1:0};if(nat===20)x.n20++;else x.n1++}
function turnTime(prevId){const pc=prevId&&byId(prevId);if(pc&&pc.kind==="pc"&&state.turnAt){const ms=Date.now()-state.turnAt;if(ms>1500&&ms<30*60000){
  const S=state.tstat=state.tstat||{},x=S[pc.id]=S[pc.id]||{n:0,ms:0,max:0};x.n++;x.ms+=ms;x.max=Math.max(x.max,ms)}}state.turnAt=Date.now()}
const mmss=ms=>{const s=Math.round(ms/1000);return s<60?s+" s":Math.floor(s/60)+" min "+String(s%60).padStart(2,"0")+" s"};
function recapStats(){
  const pcs=sorted().filter(c=>c.kind==="pc"),T=state.tstat||{},N=state.nstat||{};
  const turns=pcs.filter(c=>T[c.id]&&T[c.id].n).map(c=>({c,n:T[c.id].n,avg:T[c.id].ms/T[c.id].n,max:T[c.id].max})),dice=pcs.filter(c=>N[c.id]&&(N[c.id].n20||N[c.id].n1)).map(c=>({c,n20:N[c.id].n20,n1:N[c.id].n1}));
  return {turns,dice};
}
function recapText(){
  const out=[],f=state.fightAt,e=state.ended,end=e?e.at:Date.now(),d=new Date(f||end),log=state.clog||[];
  const dur=f?Math.max(1,Math.round((end-f)/60000)):null,rounds=Math.max((e&&e.rounds)||0,(state.turn&&state.turn.round)||0,...log.map(x=>x.r||0))||null;
  out.push(`Combat · ${d.toLocaleDateString()} ${d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}${dur?` · ${dur} min`:""}${rounds?` · ${rounds} round${rounds>1?"s":""}`:""}`);
  const pcs=sorted().filter(c=>c.kind==="pc"),foes=sorted().filter(c=>c.kind!=="pc"&&c.kind!=="lair");
  if(pcs.length)out.push("","Party: "+pcs.map(c=>`${c.name}${typeof c.init==="number"?` (init ${c.init})`:""}${c.down?(isDead(c)?" · dead":isStable(c)?" · stable at 0 HP":" · at 0 HP"):""}`).join(", "));
  if(foes.length)out.push("Enemies: "+foes.map(c=>`${c.name}${c.down?" · defeated":c.hidden?" · never seen":c.bloodied?" · Bloodied":" · still standing"}`).join(", "));
  const S=Object.entries(state.cstat||{}).filter(([,x])=>x.d>0).sort((a,b)=>b[1].d-a[1].d);
  if(S.length){out.push("","Damage dealt (to creatures whose HP you tracked, by whose turn it was):");
    S.forEach(([n,x],i)=>out.push(`- ${n}: ${x.d}${x.top?` · biggest hit ${x.top.n} on ${x.top.t}${x.top.w?` (${x.top.w})`:""}`:""}${x.k?` · ${x.k} defeated`:""}${i===0&&S.length>1?" · most damage":""}`))}
  {const {turns,dice}=recapStats();
    if(turns.length){out.push("","Turns (players):");turns.sort((a,b)=>b.avg-a.avg).forEach(x=>out.push(`- ${x.c.name}: ${x.n} turn${x.n>1?"s":""} · ${mmss(x.avg)} on average · longest ${mmss(x.max)}`))}
    if(dice.length){out.push("","Natural 20s and 1s (rolled in the app):");dice.forEach(x=>out.push(`- ${x.c.name}: ${x.n20} × 20, ${x.n1} × 1`))}}
  if(log.length){out.push("","What happened:");let r;log.forEach(x=>{if(x.r!==r){r=x.r;if(r!=null)out.push(`Round ${r}`)}out.push(`- ${x.t}`)})}
  else out.push("","Nothing noted yet: defeats, 0 HP, Bloodied, saves, roll calls and natural 20s and 1s appear here as they happen.");
  return out.join("\n");
}
/* 18: the recap as a page to keep, print or send (no DM secrets beyond what the recap already says) */
function recapDoc(){
  const f=state.fightAt,e=state.ended,end=e?e.at:Date.now(),d=new Date(f||end),log=state.clog||[];
  const dur=f?Math.max(1,Math.round((end-f)/60000)):null,rounds=Math.max((e&&e.rounds)||0,(state.turn&&state.turn.round)||0,...log.map(x=>x.r||0))||null;
  const pcs=sorted().filter(c=>c.kind==="pc"),foes=sorted().filter(c=>c.kind!=="pc"&&c.kind!=="lair"&&!c.hidden);
  const S=Object.entries(state.cstat||{}).filter(([,x])=>x.d>0).sort((a,b)=>b[1].d-a[1].d),{turns,dice}=recapStats(),top=S[0];
  const sec=(t,h)=>h?`<section><h2>${t}</h2>${h}</section>`:"";
  const rows=(head,L)=>`<table><thead><tr>${head.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${L.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  let byR="",r;log.forEach(x=>{if(x.r!==r){if(r!==undefined)byR+="</ul>";r=x.r;byR+=`<h3>${r!=null?"Round "+r:"Before the first turn"}</h3><ul>`}byR+=`<li>${esc(x.t)}</li>`});if(byR)byR+="</ul>";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Combat · ${esc(d.toLocaleDateString())}</title>
<style>:root{--fg:#221d16;--muted:#6b6254;--line:#dcd2bf;--accent:#a86a0e;--bg:#fbf7ef}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 Georgia,"Times New Roman",serif}
main{max-width:760px;margin:0 auto;padding:40px 20px 60px}h1{font-size:2.1rem;margin:0 0 4px;letter-spacing:.01em}.meta{color:var(--muted);margin:0 0 24px;font-family:system-ui,sans-serif;font-size:.9rem}
h2{font-size:1.15rem;text-transform:uppercase;letter-spacing:.14em;color:var(--accent);border-bottom:1px solid var(--line);padding-bottom:4px;margin:30px 0 10px;font-family:system-ui,sans-serif}
h3{font-size:1rem;margin:16px 0 4px}table{border-collapse:collapse;width:100%;font-family:system-ui,sans-serif;font-size:.92rem}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-weight:600}
ul{margin:0;padding-left:1.2em}li{margin:2px 0}.hl{background:#fbedc6;border:1px solid #e3c27a;border-radius:10px;padding:12px 14px;font-family:system-ui,sans-serif}@media print{body{background:#fff}main{padding:0}}</style></head><body><main>
<h1>Combat${foes.length?" · "+esc(foes.filter(c=>c.boss).map(c=>c.name)[0]||foes[0].name):""}</h1>
<p class="meta">${esc(d.toLocaleDateString())} ${esc(d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}))}${dur?` · ${dur} min`:""}${rounds?` · ${rounds} round${rounds>1?"s":""}`:""}</p>
${top?`<p class="hl"><b>Most damage:</b> ${esc(top[0])} with ${top[1].d}${top[1].top?` · biggest hit ${top[1].top.n} on ${esc(top[1].top.t)}`:""}</p>`:""}
${sec("Party",pcs.length?rows(["Character","Initiative","At the end"],pcs.map(c=>[esc(c.name),typeof c.init==="number"?c.init:"",c.down?(isDead(c)?"dead":isStable(c)?"stable at 0 HP":"at 0 HP"):"standing"])):"")}
${sec("Enemies",foes.length?rows(["Creature","At the end"],foes.map(c=>[esc(c.name),c.down?"defeated":c.bloodied?"Bloodied":"still standing"])):"")}
${sec("Damage dealt",S.length?rows(["Who","Damage","Biggest hit","Defeated"],S.map(([n,x])=>[esc(n),x.d,x.top?`${x.top.n} on ${esc(x.top.t)}`:"",x.k||""])):"")}
${sec("Turns",turns.length?rows(["Player","Turns","Average","Longest"],turns.map(x=>[esc(x.c.name),x.n,mmss(x.avg),mmss(x.max)])):"")}
${sec("Natural 20s and 1s",dice.length?rows(["Player","20s","1s"],dice.map(x=>[esc(x.c.name),x.n20,x.n1])):"")}
${sec("What happened",byR)}
</main></body></html>`;
}
function recapSheet(){
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true"><h2>Combat recap</h2><p class="psub">For your campaign notes. Only you see this.</p>
    <textarea class="field recapbox" id="recapText" rows="14" readonly>${esc(recapText())}</textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn" type="button" data-act="recapdl">Save as .txt</button><button class="btn" type="button" data-act="recapdoc" title="A page to keep, print or send to the players">Save as a document</button><button class="btn primary" type="button" data-act="recapcopy">Copy</button><button class="btn" type="button" data-act="close">Close</button></div></div></div>`;
}
function commit(){if(snap!==null){undoStack.push(snap);if(undoStack.length>60)undoStack.shift();redoStack=[]}finish()}
let lastListLen=null;
function sheetSync(){   // 79: a player's sheet is their statblock in the DM's drawer; phones learn which sheets changed
  const S=state.sheets||{};state.sheetv=Object.fromEntries(Object.entries(S).filter(([,v])=>v&&!v.only).map(([k,v])=>[k,v.v||0]));
  state.list.forEach(c=>{if(c.kind!=="pc")return;const sh=S[String(c.name||"").toLowerCase()];
    if(!sh){if(c.sb&&c.sb.pc)delete c.sb;return}
    const md=shMd(sh,c.name);if(!c.sb||c.sb.pc){if(!c.sb||c.sb.raw!==md)c.sb={raw:md,uses:[],rech:[],know:[],pc:1}}
    const C=shCalc(sh);if(c.ac==null&&sh.ac)c.ac=Number(sh.ac);c.pst={ac:Number(sh.ac)||c.ac||10,pp:C.pp,pi:C.pi,pv:C.pv,dc:C.dc||0,at:sh.v||0}})}
function finish(){
  if(MODE==="dm")sheetSync();
  const nList=state.list.length;if(lastListLen===0&&nList>0)state.fightAt=Date.now();lastListLen=nList;   // the table goes from empty to a fight
  state.rev=Math.max(Date.now(),(state.rev||0)+1);
  state.vanish=(state.vanish||[]).filter(v=>Date.now()-v.at<60000);
  {const gone=state.list.filter(c=>(c.byEff&&!state.effects.some(e=>e.id===c.byEff))||(c.owner&&!state.list.some(x=>x.id===c.owner)));
   state.list.forEach(c=>{const o=ownerOf(c);if(o)c.init=o.init});   // a companion's initiative is its owner's
   if(gone.length){state.list=state.list.filter(c=>!gone.includes(c));gone.forEach(c=>clogPush(`${c.name} vanishes`));setTimeout(()=>toast(gone.map(c=>c.name).join(", ")+" vanishes"),0)}}
  // 0 HP or Incapacitated (Unconscious, Paralyzed, Petrified and Stunned include it) ends Concentration
  const lost=[];state.list.forEach(c=>{const cs=c.conds||[],nm=x=>x.n||x;if(!cs.some(x=>nm(x)==="Concentrating"))return;
    if(c.down||cs.some(x=>["Incapacitated","Unconscious","Paralyzed","Petrified","Stunned"].includes(nm(x)))){c.conds=cs.filter(x=>nm(x)!=="Concentrating");lost.push(c.name)}});
  if(lost.length)setTimeout(()=>toast(`Concentration ends: ${lost.join(", ")}`),0);
  if(MODE==="dm"){
    if(state.clogAt!==state.fightAt){state.clog=[];state.cstat={};state.tstat={};state.nstat={};state.clogAt=state.fightAt;clogSeen=null}
    lost.forEach(n=>clogPush(`${n} loses Concentration`));
    state.list.forEach(c=>{if(c.cdur)for(const n in c.cdur)if(!hasCond(c,n))delete c.cdur[n]});
    clogScan();callRecap();
  }
  // effects disappear with their targets, with the caster, and when the caster loses Concentrating
  state.effects=(state.effects||[]).map(e=>Object.assign({},e,{targets:e.targets.filter(id=>byId(id))})).filter(e=>{const c=byId(e.by);
    return (e.by==="dm"||c)&&(e.targets.length||e.area)&&(!e.conc||(c&&(c.conds||[]).some(x=>(x.n||x)==="Concentrating")))});
  snap=JSON.stringify(state);render();updUndo();
  if(!served||MODE!=="dm")return;clearTimeout(pushTimer);pushTimer=setTimeout(()=>{pushTimer=null;push()},80);
}
function doUndo(){if(!undoStack.length)return;redoStack.push(JSON.stringify(state));state=norm(JSON.parse(undoStack.pop()));finish();toast("Undone")}
function doRedo(){if(!redoStack.length)return;undoStack.push(JSON.stringify(state));state=norm(JSON.parse(redoStack.pop()));finish();toast("Redone")}
function updUndo(){const u=$("#undoBtn"),r=$("#redoBtn");if(u)u.disabled=!undoStack.length;if(r)r.disabled=!redoStack.length}
async function push(){
  if(pushing){pushAgain=true;return}
  pushing=true;
  do{pushAgain=false;
    try{const r=await fetch("/state",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(state)});if(!r.ok)throw new Error(r.status)}
    catch(e){setSync("err","Server not responding");await new Promise(r=>setTimeout(r,1500));pushAgain=true}
  }while(pushAgain);
  pushing=false;
}
let toastT=null;
let toastUndoFn=null;
function toast(msg,ms){const t=$("#toast");if(!t)return;toastUndoFn=null;t.classList.remove("wact");t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,ms||2600)}
function toastUndo(msg,fn,ms){const t=$("#toast");if(!t)return;toast(msg,ms||7000);toastUndoFn=fn;t.classList.add("wact");
  t.insertAdjacentHTML("beforeend",`<button type="button" class="tundo" data-act="toastundo">Undo</button>`)}

