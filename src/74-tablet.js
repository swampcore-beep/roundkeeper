/* ---------- Player (Tablet) ---------- */
const slug=x=>String(x).toLowerCase().replace(/[^a-z]/g,"");
const FX={bossrim:"bossrim",bloodied:"bloodied",down:"down",unconscious:"down",dead:"dead",stable:"stable",boss:"boss",lair:"lair",concentrating:
  "concentrating",invisible:"invisible",frightened:"frightened",charmed:"charmed",poisoned:"poisoned",burning:"burning",stunned:"stunned",incapacitated:
  "stunned",paralyzed:"paralyzed",petrified:"petrified",restrained:"restrained",grappled:"restrained",prone:"prone",blinded:"blinded",deafened:"deafened",
  exhaustion:"exhaustion"};
const RIMS=[["","Automatic (by type)"],["orbit","Light around the edge"],["holy","Divine light"],["fire","Fire"],["necro","Necrotic"],["ooze","Ooze"],
  ["eldritch","Eldritch"],["storm","Storm"],["frost","Frost"],["shadow","Shadow"],["calm","Calm glow"],["none","None"]];
const rimOf=c=>c.rim?c.rim:(frameKey(c)?(RIM[frameKey(c)]||"orbit"):"");   // "" = the plain gold boss look
function statusesOf(c){
  const s=new Set((c.conds||[]).map(x=>slug(x.n||x)));
  if(c.kind==="lair"){s.add("lair");return s}
  if(c.bloodied)s.add("bloodied");
  if(c.kind==="pc"&&c.down){if(isDead(c))s.add("dead");else if(isStable(c))s.add("stable");else s.add("down");const d=dsOf(c);s.add("ds"+d.s+d.f)}
  if(c.showAc&&c.ac!=null)s.add("ac");if(c.insp)s.add("insp");if(c.boss){const r=rimOf(c);if(r!=="none")s.add(r?"bossrim":"boss")}
  if(s.has("exhaustion")){const l=exhOf(c);s.add("exh"+l);if(l>=6)s.add("dead")}
  if(isDead(c)){s.delete("unconscious")}
  state.effects.forEach(e=>{if(e.targets.includes(c.id))s.add("eff"+e.id)});
  (c.tags||[]).forEach(t=>s.add("tag"+t));if(c.cover)s.add("cover"+c.cover);(c.know||[]).forEach((k,i)=>s.add("know"+i+k));
  return s;
}
let gotServer=false;
const pv={hadData:false,seen:null,introSeen:new Map(),ended:undefined,introQ:[],introOn:false};
function renderPlayer(){
  const P=$("#player");
  const A=PREVIEW&&pvDraft&&!pvDraft.same?pvDraft:TV&&tvOwn()?state.tv.look:
    state;   // the DM's preview shows the draft, not what's on the table; the TV may have its own look
  document.body.classList.toggle("tvscreen",TV);document.body.classList.toggle("tvlite",TV&&!!A.lite);
  applyLook(lookOf(A));
  Scene.set(TV&&A.lite?"none":A.scene||"none",sfx("fade")&&!PREVIEW);P.classList.toggle("has-scene",(A.scene||"none")!=="none"||!!A.bg);sceneLook(A,P);
  {const bi=$("#bgimg");if(bi){if(A.bg){if(pv.bg!==A.bg){bi.style.backgroundImage=`url(/bg/${A.bg})`;pv.bg=A.bg}bi.style.setProperty("--dim",A.bgDim??.45);
    bi.classList.add("on")}else{bi.classList.remove("on");pv.bg=null}}}
  const list=grpRows(withLair(sorted().filter(shownToPlayers)));
  const pRect=P.getBoundingClientRect();
  const oldRects=new Map(),oldNodes=new Map();
  P.querySelectorAll("ol.plist > li[data-id]").forEach(li=>{oldRects.set(li.dataset.id,li.getBoundingClientRect());oldNodes.set(li.dataset.id,li)});
  const prev=pv.seen,first=prev===null||!pv.hadData;   // first load: no animations or intros
  pv.hadData=gotServer||!served;
  const nowIds=new Set(list.map(c=>c.id));
  const leaving=first?[]:[...oldNodes.keys()].filter(id=>!nowIds.has(id));
  pv.seen=new Map(list.map(c=>[c.id,statusesOf(c)]));
  P.style.setProperty("--ph",-(Date.now()%6000)+"ms");
  const isNew=(c,k)=>prev&&prev.has(c.id)&&!prev.get(c.id).has(k)?" new":"";
  if(first)pv.fightAt=state.fightAt;
  const dealing=!first&&!reduced&&list.length>0&&!state.ended&&!!state.fightAt&&state.fightAt!==pv.fightAt;   // a new fight began
  if(dealing)pv.fightAt=state.fightAt;
  const kinds=[...new Set(list.map(c=>c.kind).filter(k=>k!=="lair"))];
  const legend=kinds.length>1?`<div class="p-legend">${["pc","ally","enemy"].filter(k=>kinds.includes(k)).map(k=>
    `<span class="k-${k}"><i></i>${KIND[k]}</span>`).join("")}</div>`:"";
  const tail=`<button class="fsbtn" type="button" data-act="fs">${fsLabel(
    )}</button><div class="offline" id="offline" hidden>Lost connection to the laptop…</div>`;
  if(state.ended){pv.introQ=[];document.querySelectorAll(".intro").forEach(el=>el.remove())}   // the end screen takes priority over an intro
  const endAnim=state.ended&&pv.ended!==state.ended.at&&!first;
  pv.ended=state.ended?state.ended.at:null;
  const endHtml=state.ended?endScreen(state.ended,endAnim):"";
  let n=0;
  const tIdx=state.turn&&state.turn.id?list.findIndex(c=>c.id===state.turn.id||(c.grpIds||[]).includes(state.turn.id)):-1,nowId=tIdx>=0?list[tIdx].id:null,
    nextId=tIdx>=0&&list.length>1?list[(tIdx+1)%list.length].id:null;
  const body=list.length?`<div class="p-head"><div class="p-title">Initiative${state.turn?` <span class="p-round">Round <b>${state.turn.round}</b></span>`:
    ""}</div>${legend}</div>${callHtml()}${battlefieldHtml()}${clocksHtml()}
    <ol class="plist" id="plist">${list.map(c=>{
      const st=pv.seen.get(c.id);
      const cls=[`k-${c.kind}`,...[...st].map(k=>"st-"+k)];
      if(dealing)cls.push("deal");else if(!first&&!prev.has(c.id))cls.push(c.revealedAt&&dmNow()-c.revealedAt<20000?"reveal":"enter");
      if(c.bloodied&&isNew(c,"bloodied"))cls.push("flash");
      const isMe=meChar()===c;if(isMe)cls.push("me");
      if(c.id===nowId)cls.push("turn");else if(c.id===nextId)cls.push("next");
      let fx=[...new Set([...st].map(k=>FX[k]).filter(Boolean))].map(k=>`<span class="fx fx-${k}${[...st].some(x=>FX[x]===k&&isNew(c,x))?" fx-new":
        ""}"><i></i></span>`).join("");
      if(cls.includes("reveal"))fx+=`<span class="fx fx-reveal"></span>`;
      if(c.id===nowId||c.id===nextId)fx+=`<span class="turnmark" aria-hidden="true"></span>`;
      const fk=frameKey(c);
      const rim=c.boss?rimOf(c):"";if(rim&&rim!=="none")cls.push("rim-"+rim);if(c.boss&&c.rim)cls.push("rimset");
      if(fk){cls.push("fr","fr-"+fk);
        fx+=`<span class="frame" aria-hidden="true"><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></span>`}
      const iv=c.kind==="lair"?20:c.owner&&initOf(c)>-999?initOf(c):(typeof c.init==="number"?c.init:"–");
      const dealI=dealing?list.indexOf(c):-1;
      return `<li data-id="${esc(c.id)}" class="${cls.join(" ")}"${st.has("exhaustion")||dealI>=0?` style="${st.has("exhaustion")?`--exh:${exhOf(c)};`:
        ""}${dealI>=0?`--i:${dealI}`:""}"`:""}>${fx}<span class="pos" title="Initiative">${I.hex}<b>${iv}</b></span>${fk?
        `<span class="sig" title="${esc(LABEL[fk])}"></span>`:""}<span class="nmw"><span class="nmb">${deco(st)}<span class="nm">${esc(c.name)}${c.boss&&
        c.title?`<small>${esc(c.title)}</small>`:""}</span></span></span>${c.kind!=="lair"&&c.showAc&&c.ac!=null?
        `<span class="acw"><span class="shield${isNew(c,"ac")}" data-info="ac" title="AC">${I.shield}<span>${esc(c.ac)}</span></span></span>`:
        ""}<span class="ic">${isMe?'<span class="badge you">You</span>':""}${c.kind==="lair"?"":icons(c,isNew)}</span></li>`}).join("")}</ol>`
    :`<div class="p-empty"><div><strong>Waiting for combat</strong>The initiative order will appear here.${meName==="*"?joinCard(false):""}</div></div>`;
  const bar=playerBar();P.classList.toggle("has-bar",!!bar);document.body.classList.toggle("shared",meName==="*");
  const qrOver=state.showQr&&meName==="*"&&list.length?`<div class="joinover">${joinCard(true)}</div>`:"";
  P.innerHTML=body+endHtml+qrOver+tail+bar;
  const pbar=P.querySelector(".pbar");P.style.paddingBottom=pbar?(pbar.offsetHeight+6)+"px":"";
  fitList(list.length);
  surfaceEvents(first);
  sceneMood(first);sceneReact(A,P,first,prev);
  if(!first){queueMoments(list,prev);flushMoments(P);if(dealing&&!(TV&&tvModeNow(list)==="init"))rollForInitiative();
    if(nowIds.has("__lair")&&!prev.has("__lair"))lairTremor(P)}
  callStamps(P,first);
  fxAfter(P,list,prev,first);
  tcardRender();surfaceMoments(first);if(TV)tvRender(list,first);if(MODE==="player"&&meName!=="*"){reactCheck(first);phpSync();pmodeSync();shPull()}
  if(reduced||first||dealing)return afterRender(list,prev,first);   // a new fight: no ghosts of the old one, no sliding
  // defeated and hidden: a ghost of the old row stays in place and fades
  if(tvCover())leaving.forEach(id=>{
    const o=pv.tvOld&&pv.tvOld.get(id),c=byId(id),hiddenNow=state.vanish.some(v=>v.id===id);if(!o||hiddenNow||(c&&c.kind==="pc"))return;
    const L=$("#tvLayer"),r=o.rect,g=o.node.cloneNode(true);g.classList.add("tvghost");
      g.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;box-sizing:border-box`;
    // empty copies of the card's containers, so the ghost keeps its look; removed with it
    let host=g,shell=null;for(let a=o.node.parentElement;a&&a!==L&&a.id!=="tvLayer";a=a.parentElement){const sh=a.cloneNode(false);sh.classList.add("tvshell");
      sh.appendChild(host);host=sh}
    shell=host;L.appendChild(shell);
    g.animate([{opacity:1,filter:"none"},{opacity:1,filter:"grayscale(1) brightness(1.9)",offset:.12},{opacity:.9,filter:"grayscale(1) brightness(.7)",offset:
      .4},{opacity:0,filter:"grayscale(1) blur(6px)",transform:"translateY(.35em) scale(.95)"}],{duration:1600,easing:"ease-in",fill:"forwards"}).onfinish=()=>
      shell.remove();
    ash(L,r,{left:0,top:0});
  });
  else leaving.forEach(id=>{
    const li=oldNodes.get(id),r=oldRects.get(id);if(!li||!r)return;
    const g=li.cloneNode(true);g.classList.remove("enter","reveal","flash");g.classList.add("ghost");
    g.style.cssText=`left:${r.left-pRect.left}px;top:${r.top-pRect.top}px;width:${r.width}px;height:${r.height}px;font-size:${getComputedStyle(li).fontSize}`;
    P.appendChild(g);
    const c=byId(id),hiddenNow=state.vanish.some(v=>v.id===id);
    const dying=!hiddenNow&&id!=="__lair"&&(c?c.kind!=="pc"&&c.down:g.classList.contains("k-enemy"));
    if(dying){
      g.animate([{opacity:1,filter:"none",transform:"none"},{opacity:1,filter:"grayscale(1) brightness(1.9)",offset:.12},{opacity:.9,filter:
        "grayscale(1) brightness(.7)",offset:.4},{opacity:0,filter:"grayscale(1) blur(6px)",transform:"translateY(.35em) scale(.95)"}],{duration:1600,easing:
        "ease-in",fill:"forwards"}).onfinish=()=>g.remove();
      ash(P,r,pRect);
    }else g.animate([{opacity:1,filter:"none"},{opacity:0,filter:"blur(8px)",transform:"scale(.97)"}],{duration:700,fill:"forwards"}).onfinish=()=>g.remove();
  });
  // the other rows slide to their new places
  P.querySelectorAll("ol.plist > li[data-id]").forEach(li=>{
    const o=oldRects.get(li.dataset.id);if(!o)return;const r=li.getBoundingClientRect();
    const dx=o.left-r.left,dy=o.top-r.top;if(Math.abs(dx)<1&&Math.abs(dy)<1)return;
    li.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"translate(0,0)"}],{duration:650,easing:"cubic-bezier(.2,.8,.2,1)"});
  });
  afterRender(list,prev,first);
}
const knowKey=k=>/^immune/i.test(k)?"know_immune":/^resist/i.test(k)?"know_resist":/^(vuln|weak)/i.test(k)?"know_vuln":"know_note";
function deco(st){
  let h="";
  if(st.has("stunned")||st.has("incapacitated"))h+='<i class="deco dz"><b></b><b></b><b></b></i>';
  if(st.has("deafened"))h+='<i class="deco df"><b></b><b></b></i>';
  if(st.has("charmed"))h+='<i class="deco hr"><b></b><b></b></i>';
  if(st.has("poisoned"))h+='<i class="deco bb"><b></b><b></b><b></b></i>';
  if(st.has("burning"))h+='<i class="deco em"><b></b><b></b><b></b><b></b></i>';
  return h;
}
const SHORT={Concentrating:"Conc.",Incapacitated:"Incap."};
const BIG_COND=new Set(["unconscious","paralyzed","petrified","stunned","incapacitated"]);
// full label and a shorter one that is still a word ("Exh 3", "Conc."): no three-letter codes, players have to read these across the table
const L2=(full,short)=>`<span class="lt">${full}</span><span class="st">${short??full}</span>`;
function icons(c,isNew){
  const ds=dsOf(c),B=[];const add=(p,html)=>B.push([p,B.length,html]);
  if(c.insp)add(6,`<span class="${isNew(c,"insp").trim()}" data-info="insp" title="Heroic Inspiration">${I.star.replace("<svg",'<svg class="star"')}</span>`);
  if(c.bloodied)add(1,`<span class="badge blood${isNew(c,"bloodied")}" data-info="bloodied" title="Bloodied">${I.drop}<span class="t">Bloodied</span></span>`);
  if(c.kind==="pc"&&c.down){
    if(isDead(c))add(0,`<span class="badge dead${isNew(c,"dead")}" data-info="dead">Dead</span>`);
    else if(isStable(c))add(0,`<span class="badge stable${isNew(c,"stable")}" data-info="stable">Stable</span>`);
    else{add(0,`<span class="badge down${isNew(c,"down")}" data-info="zerohp">0 HP</span>`);
      add(0,`<span class="dsp${isNew(c,"ds"+ds.s+ds.f)}" data-info="zerohp" title="Death saves">${[0,1,2].map(k=>`<i class="s${ds.s>k?" on":
        ""}"></i>`).join("")}<b></b>${[0,1,2].map(k=>`<i class="f${ds.f>k?" on":""}"></i>`).join("")}</span>`)}
  }
  const exh=(c.conds||[]).some(x=>slug(x.n||x)==="exhaustion")?exhOf(c):0;
  if(exh>=6&&!isDead(c))add(0,`<span class="badge dead${isNew(c,"dead")}" data-info="exhaustion">Dead</span>`);
  (c.conds||[]).forEach(x=>{const n=x.n||x,k=slug(n);
    if(k==="exhaustion")return add(4,`<span class="cond c-exhaustion lv${exh}${isNew(c,k)||isNew(c,"exh"+
      exh)}" data-info="exhaustion">${L2(`Exhaustion ${exh}<span class="seg">${[0,1,2,3,4,5].map(i=>`<i${i<exh?' class="on"':""}></i>`).join("")}</span>`,
      `Exh ${exh}`)}</span>`);
    add(BIG_COND.has(k)?2:k==="concentrating"?3:5,`<span class="cond c-${k}${isNew(c,k)}" data-info="${k}">${L2(esc(n),SHORT[n]?esc(SHORT[n]):null)}</span>`)});
  const effs=state.effects.filter(e=>e.targets.includes(c.id));
  effs.forEach(e=>add(6,`<span class="cond eff${effs.length>1?" effi":""}${isNew(c,"eff"+e.id)}" data-eff="${esc(e.id)}">${L2("✦ "+esc(e.name)+
    effN(e))}</span>`));
  if(effs.length>1){const nm=effs.map(e=>e.name);
    add(6.5,`<span class="cond eff effm" data-more="${esc(effs.map(e=>{const by=byId(e.by);
      return "✦ "+e.name+(by?" · from "+by.name:"")}).join("|"))}">${L2("✦ "+esc(nm.join(" · ")),"✦ "+esc(nm[0])+" +"+(nm.length-1))}</span>`)}
  if(c.cover){const cv={half:"½ +2",tq:"¾ +5",total:"Total"}[c.cover]||"Cover";
    add(7,`<span class="covc${isNew(c,"cover"+c.cover)}" data-info="cover_${c.cover}">${L2(COVER_CHIP[c.cover],cv)}</span>`)}
  (c.tags||[]).forEach(t=>{const sh={reaction:"Reaction",readied:"Readied",dodge:"Dodge"}[t]||t;
    add(7,`<span class="tagc ${t}${isNew(c,"tag"+t)}" data-info="${t}">${L2((TAGS.find(x=>x[0]===t)||[t,t])[1],sh)}</span>`)});
  (c.know||[]).forEach((k,i)=>{const sh=k.replace(/^immune\w*:?\s*/i,"Imm: ").replace(/^resist\w*:?\s*/i,"Res: ").replace(/^vulnerab\w*:?\s*/i,"Vul: ");
    add(8,`<span class="know${isNew(c,"know"+i+k)}" data-info="${knowKey(k)}">${L2(esc(k),esc(sh))}</span>`)});
  return B.sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(x=>x[2]).join("");
}
function endScreen(e,anim){
  const down=(e.down||[]);
  return `<div class="endscr${anim&&!reduced?" in":
    ""}"><div class="end-inner"><div class="end-kicker">End of combat</div><div class="end-title">The battle is over</div><div class="end-rule"></div>
    <div class="end-stats"><span><b>${esc(e.defeated||0)}</b>enemies defeated</span><span><b>${down.length||"✓"}</b>${down.length?"at 0 HP: "+
      down.map(esc).join(", "):"everyone is still standing"}</span></div></div></div>`;
}
function ash(P,r,pRect){
  const cols=["#8f8b85","#6c6a7a","#c22a40","#3c3a46","#b8b2a8"];
  for(let i=0;i<24;i++){
    const d=document.createElement("div");d.className="ash";
    d.style.left=(r.left-pRect.left+Math.random()*r.width)+"px";d.style.top=(r.top-pRect.top+Math.random()*r.height)+"px";
    d.style.background=cols[i%cols.length];P.appendChild(d);
    const dx=(Math.random()-.5)*80,dy=30+Math.random()*90,rot=(Math.random()-.5)*540;
    d.animate([{opacity:0,transform:"none"},{opacity:1,offset:.15},{opacity:0,transform:`translate(${dx}px,${dy}px) rotate(${rot}deg) scale(.4)`}],
      {duration:1200+Math.random()*900,delay:150+Math.random()*450,easing:"cubic-bezier(.3,.1,.7,1)",fill:"both"}).onfinish=()=>d.remove();
  }
}
