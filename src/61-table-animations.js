/* ---------- table animations: turn handoff, new round, class sigil, claw scar, Concentration shatters, rolling die, initiative slots in ---------- */
function fxEl(cls,r,html,top){const el=document.createElement("div");el.className="fxo "+cls;
  if(r)Object.assign(el.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px"});if(html)el.innerHTML=html;
  (top?document.body:moLayer()).appendChild(el);return el}
const tvCover=()=>TV&&document.body.classList.contains("tvcover");
const fxRow=(P,id)=>tvCover()?document.querySelector(`#tvLayer [data-tid="${CSS.escape(id)}"]`):P.querySelector(`ol.plist > li[data-id="${CSS.escape(id)}"]`);
/* 83: on the TV, something that happens to a creature that has no card on screen shows as a short line at the bottom */
function tvStrip(id,text){
  if(!tvCover()||!text||$("#tvLayer.m-pause"))return;const c=byId(id);if(!c||!shownToPlayers(c))return;
  let box=$("#tvStrips");if(!box){box=document.createElement("div");box.id="tvStrips";document.body.appendChild(box)}
  const el=document.createElement("div");el.className="tvstrip";el.innerHTML=`<b>${esc(c.name)}</b><span>${esc(text)}</span>`;box.appendChild(el);
  while(box.children.length>3)box.firstChild.remove();
  setTimeout(()=>{el.classList.add("out");setTimeout(()=>el.remove(),500)},2800);
}
const MO_LABEL={stone:"Petrified",zap:"Paralyzed",chain:"Restrained",vanish:"Invisible",hearts:"Charmed",cloud:"Poisoned",ignite:"Burning",stars:"Stunned",
  shudder:"Frightened",dark:"Blinded",ring:"Deafened",focus:"Concentrating",drain:"Exhaustion",
  heal:"healed",revive:"back on their feet",dsok:"death save: success",dsfail:"death save: failure",stable:"stable",death:"has died"};
/* a card the DM put on the table (Ctrl+K → Show on the table): only the tablet shows it, tapping closes it there */
let tcardShut=null;
function tcardRender(){
  const tc=state.tcard,show=MODE==="player"&&meName==="*"&&tc&&tc.html&&tc.id!==tcardShut;let el=$("#tcard");
  if(!show){if(el)el.remove();return}
  if(el&&el.dataset.id===tc.id)return;if(el)el.remove();
  el=document.createElement("div");el.id="tcard";el.className="tcard";el.dataset.id=tc.id;
  el.innerHTML=`<div class="tcardin">${tc.html}<div class="tcardx">Tap to close</div></div>`;
  el.addEventListener("click",()=>{tcardShut=tc.id;tcardRender()});document.body.appendChild(el);
  const inn=el.querySelector(".tcardin"),body=el.querySelector(".rbody");if(!inn||!body)return;   // long rules shrink until they fit
  let fs=parseFloat(getComputedStyle(inn).fontSize);
  for(let k=0;k<30&&body.scrollHeight>body.clientHeight+2&&fs>12;k++){fs*=0.93;inn.style.fontSize=fs+"px"}
  if(body.scrollHeight>body.clientHeight+2)body.style.overflow="auto";
}
function fxAfter(P,list,prev,first){
  const t=state.turn,pt=pv.fxTurn;pv.fxTurn=t?{id:t.id,round:t.round}:null;
  const inits=new Map(list.map(c=>[c.id,c.init])),pi=pv.fxInit;pv.fxInit=inits;
  // scars stay on bloodied enemies (rows are redrawn, so they are put back each time)
  P.querySelectorAll("ol.plist > li.st-bloodied:not(.k-pc):not(.k-ally)").forEach(li=>{if(!li.querySelector(".fxscar"))li.insertAdjacentHTML("beforeend",
    FX_CLAW("fxscar"))});
  if(first||!prev||reduced)return;
  // a new round sweeps across the table, then settles into the title
  const newRound=!!(t&&pt&&t.round>pt.round);if(newRound&&!tvCover())fxRound(P,t.round);
  // the light slides from the row that finished to the row that starts; t3: the class sigil answers
  if(t&&pt&&t.id!==pt.id){
    if(tvCover()){const was=pv.tvOld&&(pv.tvOld.get(t.id)||pv.tvOld.get(pt.id));   // the TV: the light slides from the card that was "next" into the spotlight
      setTimeout(()=>{const b=fxRow(P,t.id);if(!b)return;fxHandoff(was?{getBoundingClientRect:()=>was.rect}:null,b);
        setTimeout(()=>fxSigil(b),420)},newRound?900:30)}
    else{const a=fxRow(P,pt.id),b=fxRow(P,t.id);
    if(b){setTimeout(()=>fxHandoff(a,b),newRound?900:0);setTimeout(()=>fxSigil(b),(newRound?900:0)+420)}}
  }
  list.forEach(c=>{
    const was=prev.get(c.id),now=pv.seen.get(c.id);if(!was||!now)return;
    // claws rake a freshly Bloodied enemy
    if(now.has("bloodied")&&!was.has("bloodied")&&c.kind!=="pc"&&c.kind!=="ally")setTimeout(()=>{const li=fxRow(P,c.id);if(li)fxClaw(li);
      else tvStrip(c.id,"Bloodied")},280);
    // Concentration shatters
    if(was.has("concentrating")&&!now.has("concentrating"))setTimeout(()=>{const li=fxRow(P,c.id);if(li)fxShatter(li);
      else tvStrip(c.id,"lost Concentration")},60);
  });
  // a new initiative spins into place
  if(pi)list.forEach(c=>{if(typeof c.init==="number"&&pi.has(c.id)&&pi.get(c.id)!==c.init)setTimeout(()=>fxSpin(fxRow(P,c.id),c.init),tvCover()?30:0)});
}
function fxHandoff(a,b){
  const rb=b.getBoundingClientRect(),ra=a?a.getBoundingClientRect():{left:rb.left,top:rb.top-rb.height,width:rb.width,height:rb.height};
  const el=fxEl("fxbaton",ra);el.style.borderRadius=getComputedStyle(b).borderRadius;
  el.animate([{left:ra.left+"px",top:ra.top+"px",width:ra.width+"px",height:ra.height+"px",opacity:.95},{opacity:1,offset:.7},{left:rb.left+"px",top:rb.top+
    "px",width:rb.width+"px",height:rb.height+"px",opacity:0}],{duration:650,easing:"cubic-bezier(.5,0,.2,1)",fill:"forwards"}).onfinish=()=>el.remove();
  b.animate([{transform:"none"},{transform:"translateY(-.1em) scale(1.018)",offset:.55},{transform:"none"}],{duration:750,delay:380,easing:"ease-out"});
}
function fxRound(P,n){
  const el=fxEl("fxround",null,`<div><small>Round</small><b>${n}</b><i></i></div>`,true);
  const tgt=P.querySelector(".p-round");
  const a=el.firstChild.animate([{transform:"scale(.6)",opacity:0,filter:"blur(8px)"},{transform:"scale(1)",opacity:1,filter:"none",offset:.25},{transform:
    "scale(1)",opacity:1,offset:.6},{transform:"scale(1.04)",opacity:0}],{duration:1500,easing:"ease-out",fill:"forwards"});
  el.animate([{opacity:0},{opacity:1,offset:.2},{opacity:1,offset:.6},{opacity:0}],{duration:1500,fill:"forwards"});
  a.onfinish=()=>{el.remove();if(tgt)tgt.animate([{transform:"scale(1)",boxShadow:"0 0 0 0 transparent"},{transform:"scale(1.25)",boxShadow:
    "0 0 1.2em var(--accent)",offset:.35},{transform:"scale(1)",boxShadow:"0 0 0 0 transparent"}],{duration:700,easing:"ease-out"})};
}
const FX_SIG={bard:"note",wizard:"spark",sorcerer:"spark",warlock:"spark",druid:"leaf",ranger:"leaf",cleric:"ray",paladin:"ray",fighter:"ember",barbarian:
  "ember",rogue:"ember",monk:"ember"};
function fxSigil(li){
  const sg=li&&li.querySelector(".sig,.emb,.ce");if(!sg)return;const cls=[...li.classList].find(x=>x.startsWith("fr-"));
    const kind=FX_SIG[cls&&cls.slice(3)]||"ember";
  const r=sg.getBoundingClientRect(),col=getComputedStyle(sg).backgroundColor,fs=parseFloat(getComputedStyle(li).fontSize);
  const el=fxEl("fxsig "+kind,{left:r.left+r.width/2,top:r.top+r.height/2,width:0,height:0});el.style.color=col;el.style.fontSize=fs+"px";
  const ring=document.createElement("b");ring.className="ring";el.appendChild(ring);
  const n=kind==="ray"?11:16;
  for(let k=0;k<n;k++){const x=document.createElement("i");
    if(kind==="note")x.textContent=k%2?"♪":"♫";
    const ang=kind==="ray"?(-90+(k-(n-1)/2)*16):(kind==="note"||kind==="leaf"?R_(-150,-30):k/n*360+R_(-12,12));
    const dist=(kind==="ray"?R_(1.6,2.4):kind==="note"?R_(1.4,2.6):kind==="leaf"?R_(1.6,3):R_(1,2))*1.6;
    x.style.setProperty("--x",(Math.cos(ang*Math.PI/180)*dist+(kind==="leaf"?R_(.4,1.2):0)).toFixed(2)+"em");
      x.style.setProperty("--y",(Math.sin(ang*Math.PI/180)*dist).toFixed(2)+"em");
    x.style.setProperty("--r",(kind==="ray"?ang+90:R_(-200,200)).toFixed(0)+"deg");
      x.style.animationDelay=(kind==="ray"?Math.abs(k-(n-1)/2)*.03:R_(0,.25)).toFixed(2)+"s";el.appendChild(x)}
  setTimeout(()=>el.remove(),1900);
}
const FX_CLAW=cls=>
  `<svg class="${cls}" viewBox="0 0 90 60" aria-hidden="true"><path d="M18 3 C28 20 38 40 50 58"/><path d="M36 2 C46 18 56 38 68 56"/><path d="M54 2 C64 16 74 34 86 52"/></svg>`;
function fxClaw(li){
  if(!li)return;const el=fxEl("fxclaw",li.getBoundingClientRect(),FX_CLAW("draw"));el.style.borderRadius=getComputedStyle(li).borderRadius;
  li.animate([{transform:"none"},{transform:"translate(.06em,.03em)",offset:.15},{transform:"translate(-.05em,-.02em)",offset:.3},{transform:
    "translate(.03em,0)",offset:.45},{transform:"none"}],{duration:520,delay:120});
  setTimeout(()=>el.remove(),1300);
}
function fxShatter(li){
  if(!li)return;const r=li.getBoundingClientRect(),el=fxEl("fxshatter",r);el.style.borderRadius=getComputedStyle(li).borderRadius;
  const ring=document.createElement("b");ring.className="ring";el.appendChild(ring);
  const per=2*(r.width+r.height),N=34;el.style.fontSize=getComputedStyle(li).fontSize;
  for(let k=0;k<N;k++){const d=(k+R_(0,.8))/N*per;let x,y;
    if(d<r.width){x=d;y=0}else if(d<r.width+r.height){x=r.width;y=d-r.width}else if(d<2*r.width+r.height){x=r.width-(d-r.width-r.height);y=r.height}else{x=0;
      y=r.height-(d-2*r.width-r.height)}
    const s=document.createElement("i");s.style.left=x+"px";s.style.top=y+"px";
    s.style.setProperty("--dx",((x-r.width/2)/r.width*R_(.8,2.4)).toFixed(2)+"em");
      s.style.setProperty("--dy",(R_(1,2.6)+(y<r.height/2?-.4:.3)).toFixed(2)+"em");s.style.setProperty("--r",R_(-260,260).toFixed(0)+"deg");
    s.style.setProperty("--s",R_(.6,1.4).toFixed(2));s.style.animationDelay=(.18+R_(0,.12)).toFixed(2)+"s";el.appendChild(s)}
  li.animate([{filter:"none"},{filter:"brightness(1.5) saturate(1.4)",offset:.15},{filter:"none"}],{duration:600});
  setTimeout(()=>el.remove(),2000);
}
function fxSpin(li,v){
  const b=li&&li.querySelector(".pos b,.hex b,.hx");if(!b)return;let n=0;const iv=setInterval(()=>{b.textContent=1+Math.floor(Math.random()*20);
    if(++n>=11){clearInterval(iv);b.textContent=v;
    li.animate([{boxShadow:"0 0 0 0 transparent"},{boxShadow:"0 0 0 .08em var(--accent), 0 0 1.4em color-mix(in srgb,var(--accent) 60%,transparent)",offset:.3},
      {boxShadow:"0 0 0 0 transparent"}],{duration:900,easing:"ease-out"});
    b.animate([{transform:"scale(1.5)"},{transform:"scale(1)"}],{duration:350,easing:"cubic-bezier(.2,1.6,.4,1)"})}},55);
}
/* the shared roll is a die tumbling to a stop first, then the usual banner or celebration */
function fxDie(r,then){
  const final=r.kind==="nat20"?20:r.kind==="nat1"?1:r.total;
  const el=fxEl("fxdie"+(r.kind==="nat20"?" n20":r.kind==="nat1"?" n1":""),null,`<div class="die">${D20}<b>?</b></div>`,true);
  const die=el.querySelector(".die"),num=el.querySelector("b");let k=0;
  const iv=setInterval(()=>{num.textContent=1+Math.floor(Math.random()*20);if(++k>12)clearInterval(iv)},60);
  die.animate([{transform:"translate(-60vw,10vh) rotate(-540deg) scale(.7)",opacity:0},{opacity:1,offset:.15},{transform:
    "translate(-8vw,-6vh) rotate(-120deg) scale(1)",offset:.55},{transform:"translate(2vw,1vh) rotate(18deg) scale(1)",offset:.78},{transform:
    "translate(0,0) rotate(0) scale(1)"}],{duration:900,easing:"cubic-bezier(.2,.7,.3,1)",fill:"forwards"})
    .onfinish=()=>{clearInterval(iv);num.textContent=final;die.animate([{transform:"scale(1)"},{transform:"scale(1.25)",offset:.4},{transform:"scale(1)"}],{
      duration:380,easing:"ease-out"});
      setTimeout(()=>{el.animate([{opacity:1},{opacity:0}],{duration:300,fill:"forwards"}).onfinish=()=>el.remove();then()},520)};
}

const served=location.protocol.indexOf("http")===0;
const path=location.pathname.replace(/\/+$/,"");
const MODE=(/\/(players|igraci|unos)$/.test(path)||new URLSearchParams(location.search).get("view")==="player")?"player":"dm";
const PREVIEW=MODE==="player"&&new URLSearchParams(location.search).has("preview");   // the tablet inside the DM's Atmosphere window
let pvDraft=null;
/* the TV: a second shared screen (e.g. HDMI from the computer running the server); it shows one thing at a time, big */
const TV=MODE==="player"&&new URLSearchParams(location.search).get("screen")==="tv";
if(PREVIEW)addEventListener("message",e=>{if(e.origin!==location.origin||!e.data||e.data.t!=="lookdraft")return;pvDraft=e.data.d;try{render()}catch(x){}});
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;

