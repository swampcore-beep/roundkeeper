/* ---------- sheets ---------- */
function closeSheet(){$("#overlay").innerHTML=""}
let condTarget=null;
/* ---- the DM puts a spell on anyone: Bless from a player, Hold Person from a monster, Darkness on the battlefield ---- */
let dEff=null;
function dEffSheet(o){
  dEff=Object.assign({name:"",src:"",conc:false,area:false,by:"",targets:new Set(),q:""},o||{});
  if(dEff.name){const x=spellFind(dEff.name,dEff.src);if(x){dEff.conc=!!x[2];dEff.area=!!x[3];dEff.src=x[7]||dEff.src}}
  if(!dEff.by)dEff.conc=false;
  dEffRender(true);
}
function dEffListHtml(){
  const q=dEff.q.trim(),ql=q.toLowerCase();
  const hit=spPool(true).filter(x=>!ql||x[0].toLowerCase().includes(ql));
  return spRowsHtml(hit,"deffpick",q,false)+(q?`<button type="button" class="sprow other" data-act="deffname"><b>Use “${esc(q)}”</b><small>an effect of your own, by name</small></button>`:"")+spHbHtml();
}
function dEffRender(focus){
  const L=state.list.filter(c=>c.kind!=="lair"),x=dEff.name?spellFind(dEff.name,dEff.src):null;
  const chip=(act,c,on)=>`<button type="button" data-act="${act}" data-id="${esc(c.id)}" aria-pressed="${on}" class="dw ${c.kind==="pc"?"pc":"foe"}">${esc(c.name)}${c.hidden?` <small>hidden</small>`:""}</button>`;
  const ok=dEff.name&&(dEff.area||dEff.targets.size);
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet deffsheet" role="dialog" aria-modal="true" aria-label="Spell effect"><h2>Spell effect</h2>
    <div class="psec"><div class="eyebrow2">Spell</div>
      ${dEff.name?`<div class="spsel"><div><b>${ic("spark")} ${esc(dEff.name)}</b><small>${x?esc(spellMeta(x)):"your own effect"}</small></div><button type="button" class="btn" data-act="deffchg">Change</button></div>`
        :`<input class="field" id="dEffQ" type="search" placeholder="Search spells, or type a name of your own" autocomplete="off" spellcheck="false" value="${esc(dEff.q)}"><div class="splist deffl" id="dEffList">${dEffListHtml()}</div>`}</div>
    <div class="psec"><div class="eyebrow2">Cast by</div><div class="chipgrid"><button type="button" data-act="deffby" data-id="" aria-pressed="${!dEff.by}">No one</button>${L.map(c=>chip("deffby",c,dEff.by===c.id)).join("")}</div></div>
    <div class="psec"><div class="eyebrow2">On</div>
      <label class="chk"><input type="checkbox" id="dEffArea" ${dEff.area?"checked":""}> The battlefield (a zone, no targets)</label>
      ${dEff.area?"":`<div class="chipgrid">${L.map(c=>chip("defftgt",c,dEff.targets.has(c.id))).join("")}</div>`}</div>
    ${dEff.area?"":`<div class="psec"><div class="eyebrow2">Damage each turn <small>optional: Heat Metal, poison, Searing Smite…</small></div><div class="ongrow">
      <input class="field" id="dEffOngD" placeholder="2d6" maxlength="12" value="${esc((dEff.ong||{}).d||"")}" aria-label="Dice" autocomplete="off">
      <select class="field" id="dEffOngT" aria-label="Damage type"><option value="">damage</option>${DMG_TYPES.map(x=>`<option${(dEff.ong||{}).t===x?" selected":""}>${x}</option>`).join("")}</select>
      <select class="field" id="dEffOngW" aria-label="When"><option value="start"${(dEff.ong||{}).when!=="end"?" selected":""}>at the start of the target's turn</option><option value="end"${(dEff.ong||{}).when==="end"?" selected":""}>at the end of the target's turn</option></select></div>
      <p class="psub">Rolled for you on that turn; you apply it or skip it (if they saved).</p></div>`}
    <label class="chk"><input type="checkbox" id="dEffConc" ${dEff.conc?"checked":""}${dEff.by?"":" disabled"}> Needs Concentration${dEff.by?` (${esc((byId(dEff.by)||{}).name||"")} gets Concentrating, and the effect ends when it's lost)`:" (pick who casts it)"}</label>
    <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" type="button" data-act="close">Cancel</button><button class="btn primary" type="button" data-act="deffadd"${ok?"":" disabled"}>${ic("spark")} Add effect</button></div></div></div>`;
  ["dEffOngD","dEffOngT","dEffOngW"].forEach(id=>{const el=$("#"+id);if(el)el.addEventListener("input",()=>{dEff.ong={d:$("#dEffOngD").value.trim(),t:$("#dEffOngT").value,when:$("#dEffOngW").value}})});
  const q=$("#dEffQ");if(q){q.addEventListener("input",()=>{dEff.q=q.value;$("#dEffList").innerHTML=dEffListHtml()});
    q.addEventListener("keydown",e=>{if(e.key==="Enter"&&q.value.trim()){e.preventDefault();const r=spellFind(q.value.trim());dEffPick(r?r[0]:q.value.trim().slice(0,30),r?r[7]||"":"")}});
    if(focus)q.focus()}
  const a=$("#dEffArea");if(a)a.addEventListener("change",()=>{dEff.area=a.checked;dEffRender()});
  const cc=$("#dEffConc");if(cc)cc.addEventListener("change",()=>{dEff.conc=cc.checked;dEffRender()});
}
function dEffPick(name,src){
  const x=spellFind(name,src);dEff.name=String(x?x[0]:name).slice(0,30);dEff.src=x?x[7]||"":src||"";
  if(x){dEff.conc=!!x[2]&&!!dEff.by;dEff.area=!!x[3]}dEffRender();
}
function dEffAdd(){
  if(!dEff||!dEff.name)return;const c=byId(dEff.by),tg=dEff.area?[]:[...dEff.targets].filter(id=>byId(id));
  if(!dEff.area&&!tg.length)return;
  const conc=!!(dEff.conc&&c),ended=[];
  if(conc){   // a new concentration spell ends the caster's old one
    state.effects=state.effects.filter(e=>{if(e.by===c.id&&e.conc){ended.push(e.name);return false}return true});
    if(!c.conds.some(x=>(x.n||x)==="Concentrating"))c.conds.push("Concentrating");
  }
  const ong=!dEff.area&&dEff.ong&&/^\d*d\d+(\s*[+-]\s*\d+)?$|^\d+$/i.test(dEff.ong.d||"")?{d:dEff.ong.d.replace(/\s/g,"").replace(/^d/i,"1d").toLowerCase(),t:dEff.ong.t||"",when:dEff.ong.when==="end"?"end":"start"}:null;
  state.effects.push({id:uid(),name:dEff.name,by:c?c.id:"dm",targets:tg,conc,area:!!dEff.area,r0:state.turn?state.turn.round:null,...(dEff.src?{src:dEff.src}:{}),...(ong?{ong}:{})});
  if(c&&c.kind!=="pc"&&!c.hidden)state.react={id:uid(),k:"spell",by:c.name,what:dEff.name,at:Date.now()};   // a Counterspell moment
  const name=dEff.name,spent=c&&c.sb?sbSpend(c,name,true):"";closeSheet();commit();
  toast(`✦ ${name}${c?` from ${c.name}`:""}${dEff.area?" on the battlefield":` on ${tg.map(id=>byId(id).name).join(", ")}`}${ended.length?` · ${ended.join(", ")} ends`:""}${spent?` · ${spent}`:""}`);
  dEff=null;
}
function condSheet(id){
  condTarget=id;const c=byId(id);if(!c)return;const has=new Set(c.conds||[]);
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true"><div class="condhead"><h2>Conditions · ${esc(c.name)}</h2><button type="button" class="btn" data-act="deffon" data-id="${esc(c.id)}">${ic("spark")} Spell effect…</button></div>
   <div class="chipgrid">${CONDS.map(n=>`<button type="button" data-act="pickcond" data-n="${n}" aria-pressed="${has.has(n)}">${n}</button>`).join("")}</div>
   ${(()=>{const act=(c.conds||[]).map(x=>x.n||x).filter(n=>n!=="Exhaustion");if(!act.length)return "";
     return `<div class="cdurs"><div class="eyebrow2">When does it end?</div>${act.map(n=>{const d=cdurOf(c,n)||{};
       return `<div class="cdur" data-n="${esc(n)}"><b>${esc(n)}</b><select class="field" data-cdur="end" aria-label="When ${esc(n)} ends">${[["","When you remove it"],["start","At the start of its turn"],["end","At the end of its turn"],["save","Save at the end of each of its turns"]].map(([v,l])=>`<option value="${v}"${(d.end||"")===v?" selected":""}>${l}</option>`).join("")}</select>
         ${d.end==="save"?`<select class="field" data-cdur="ab" aria-label="Which save">${ABIL3.map(([a,f])=>`<option value="${a}"${d.ab===a?" selected":""}>${f}</option>`).join("")}</select><label class="cdc">DC <input class="field" type="number" inputmode="numeric" data-cdur="dc" value="${d.dc??""}" min="1" max="30"></label>`:""}
         <label class="cdc">at most <input class="field" type="number" inputmode="numeric" data-cdur="max" value="${d.max??""}" min="1" max="100" placeholder="—"> rounds</label></div>`}).join("")}
       <p class="psub">Saves: players get a roll call on their phone at the end of their turn and the condition ends when they make it. Monsters roll with the save bonus from their statblock.</p></div>`})()}
   <div style="display:flex;justify-content:flex-end"><button class="btn primary" type="button" data-act="close">Done</button></div></div></div>`;
}
const CR_XP={"0":10,"1/8":25,"1/4":50,"1/2":100,"1":200,"2":450,"3":700,"4":1100,"5":1800,"6":2300,"7":2900,"8":3900,"9":5000,"10":5900,"11":7200,"12":8400,"13":10000,"14":11500,"15":13000,"16":15000,"17":18000,"18":20000,"19":22000,"20":25000,"21":33000,"22":41000,"23":50000,"24":62000,"25":75000,"26":90000,"27":105000,"28":120000,"29":135000,"30":155000};
// TV14: what the TV may show at the end: a few picked numbers about the players, never the raw statistics or anything about hidden creatures
function endSummary(){
  const seen=state.list.filter(c=>!c.hidden),pcs=seen.filter(c=>c.kind==="pc"),foes=seen.filter(c=>c.kind==="enemy"),names=new Set(seen.map(c=>c.name));
  const won=foes.length&&foes.every(c=>c.down),lost=pcs.length&&pcs.every(c=>c.down),boss=foes.find(c=>c.boss&&c.down);
  const mins=state.fightAt?Math.max(1,Math.round((Date.now()-state.fightAt)/60000)):null,rd=state.turn?state.turn.round:null;
  const sub=[boss?`${boss.name} defeated`:won&&foes.length?`${foes.length} ${foes.length===1?"foe":"foes"} defeated`:"",rd?`${rd} round${rd>1?"s":""}`:"",mins?`${mins} minute${mins>1?"s":""}`:""].filter(Boolean).join(" · ");
  const S=Object.entries(state.cstat||{}).filter(([n,x])=>x.d>0&&pcs.some(c=>c.name===n)).sort((a,b)=>b[1].d-a[1].d),cards=[];
  if(S.length){const [n,x]=S[0];cards.push({k:"MVP · most damage",name:n,v:String(x.d),note:x.top&&names.has(x.top.t)?`biggest hit ${x.top.n}${x.top.w?" "+x.top.w:""} on ${x.top.t}`:""})}
  const big=S.map(([n,x])=>[n,x.top]).filter(([,t])=>t).sort((a,b)=>b[1].n-a[1].n)[0];
  if(big&&S.length&&big[0]!==S[0][0])cards.push({k:"Biggest hit",name:big[0],v:String(big[1].n),note:names.has(big[1].t)?`on ${big[1].t}${big[1].w?` · ${big[1].w}`:""}`:""});
  const N=Object.entries(state.nstat||{}).map(([id,x])=>[byId(id),x]).filter(([c,x])=>c&&c.kind==="pc"&&!c.hidden&&x.n20>0).sort((a,b)=>b[1].n20-a[1].n20)[0];
  if(N)cards.push({k:"Luckiest",name:N[0].name,v:N[1].n20>1?`${N[1].n20}×20`:"Nat 20",note:N[1].n20>1?`${N[1].n20} natural 20s`:"a natural 20"});
  const h=state.hdywt;if(h&&(!state.fightAt||h.at>=state.fightAt))cards.push({k:"Final blow",name:h.name,v:h.boss,note:"How did they do it?"});
  else{const K=S.filter(([,x])=>x.k>0).sort((a,b)=>b[1].k-a[1].k)[0];if(K)cards.push({k:"Most defeated",name:K[0],v:String(K[1].k),note:K[1].k>1?"foes dropped":"foe dropped"})}
  const total=foes.filter(c=>c.down&&c.sb&&CR_XP[String(c.sb.cr||"").trim()]!=null).reduce((a,c)=>a+CR_XP[String(c.sb.cr).trim()],0);
  return {title:lost?"The party falls":won?"Victory":"The fight is over",lost:!!lost&&!won,sub,cards:cards.slice(0,4),xp:total?{total,each:pcs.length?Math.floor(total/pcs.length):0}:null};
}
function endFight(){
  const enemies=state.list.filter(c=>c.kind==="enemy");
  state.ended={at:Date.now(),defeated:enemies.filter(c=>c.down).length,down:state.list.filter(c=>c.kind==="pc"&&c.down).map(c=>c.name),rounds:state.turn?state.turn.round:null,tv:endSummary()};
  clogPush("Combat ends");
}

