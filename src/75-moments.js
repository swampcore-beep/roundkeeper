/* ---------- moments: what just happened, played once over the row ---------- */
const MO_COND={petrified:"stone",paralyzed:"zap",prone:"fall",unconscious:"fall",restrained:"chain",grappled:"chain",invisible:"vanish",charmed:"hearts",
  poisoned:"cloud",burning:"ignite",stunned:"stars",incapacitated:"stars",frightened:"shudder",blinded:"dark",deafened:"ring",concentrating:"focus",exhaustion:"drain"};
const MO_SPELL=[[/^bless/i,"bless"],[/^(bane|hex|bestow curse|hunger)/i,"curse"],[/^haste/i,"haste"],[/^hunter'?s mark/i,"mark"],[/^(shield of faith|shield|mage armou?r|sanctuary|protection|warding bond|aid)/i,"ward"]];
const R_=(a,b)=>a+Math.random()*(b-a);
function moLayer(){let m=$("#moments");if(!m){m=document.createElement("div");m.id="moments";document.body.appendChild(m)}return m}
function moment(li,kind,extra){
  if(!li||reduced)return;const r=li.getBoundingClientRect();if(!r.width)return;
  const cs=getComputedStyle(li),el=document.createElement("div");
  el.className="mo mo-"+kind+(extra?" "+extra:"");
  Object.assign(el.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px",borderRadius:cs.borderRadius,fontSize:cs.fontSize});
  const add=(tag,n,f)=>{for(let k=0;k<n;k++){const x=document.createElement(tag);f(x,k);el.appendChild(x)}};
  const zig=(y0,amp,steps)=>{let d=`M0 ${y0}`;for(let k=1;k<=steps;k++)d+=` L${(k/steps*100).toFixed(1)} ${(y0+R_(-amp,amp)).toFixed(1)}`;return d};
  let ms=1800;
  if(kind==="drain"){li.animate([{filter:"none"},{filter:"saturate(.3) brightness(.8)",offset:.5},{filter:"none"}],{duration:1800})}
  else if(kind==="zap"){el.innerHTML=`<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${zig(50,28,14)}"/><path d="${zig(35,20,10)}" style="animation-delay:.12s,.12s"/></svg>`;ms=1300}
  else if(kind==="fall"){add("i",7,(x,k)=>{x.style.left=(5+k*14+R_(-3,3))+"%";x.style.animationDelay=R_(0,.25)+"s"});
    li.animate([{transform:"none"},{transform:"rotate(-1.2deg) translateY(.12em)",offset:.35},{transform:"rotate(.4deg)",offset:.6},{transform:"none"}],{duration:900,easing:"ease-out"})}
  else if(kind==="chain"){add("b",2,()=>{});li.animate([{transform:"none"},{transform:"translateX(.06em)",offset:.45},{transform:"translateX(-.06em)",offset:.55},{transform:"none"}],{duration:1500})}
  else if(kind==="vanish"){add("i",10,x=>{x.style.left=R_(5,95)+"%";x.style.top=R_(15,80)+"%";x.style.animationDelay=R_(0,.5)+"s"});li.animate([{opacity:1},{opacity:.25,offset:.5},{opacity:1}],{duration:1300})}
  else if(kind==="hearts"){add("i",9,x=>{x.textContent="♥";x.style.left=R_(4,92)+"%";x.style.animationDelay=R_(0,.5)+"s";x.style.fontSize=R_(.6,1.1)+"em"})}
  else if(kind==="ignite"){add("i",16,x=>{x.style.left=R_(2,96)+"%";x.style.animationDelay=R_(0,.45)+"s";x.style.setProperty("--dx",R_(-.6,.6)+"em");x.style.fontSize=R_(.7,1.3)+"em"});
    li.animate([{filter:"none"},{filter:"brightness(1.35) saturate(1.3)",offset:.2},{filter:"none"}],{duration:1400});ms=1900}
  else if(kind==="cloud"){add("i",6,x=>{x.style.left=R_(0,85)+"%";x.style.top=R_(-20,40)+"%";x.style.animationDelay=R_(0,.4)+"s"})}
  else if(kind==="stars"){add("i",10,(x,k)=>{x.textContent="★";const a=k/10*6.28;x.style.setProperty("--x",Math.cos(a)*R_(2,5)+"em");x.style.setProperty("--y",Math.sin(a)*R_(.6,1.2)+"em")})}
  else if(kind==="shudder"){li.animate([0,1,2,3,4,5,6,7,8].map(k=>({transform:`translateX(${k%2?.07:-.07}em)`})).concat([{transform:"none"}]),{duration:700})}
  else if(kind==="ring"){add("i",3,(x,k)=>{x.style.animationDelay=k*.22+"s"})}
  else if(kind==="heal"){add("i",8,x=>{x.textContent="+";x.style.left=R_(4,94)+"%";x.style.animationDelay=R_(0,.5)+"s"})}
  else if(kind==="revive"){add("i",16,x=>{x.style.left=R_(2,98)+"%";x.style.animationDelay=R_(0,.6)+"s"});li.animate([{transform:"scale(1)"},{transform:"scale(1.025)",offset:.3},{transform:"scale(1)"}],{duration:1200});ms=2000}
  else if(kind==="dsok"){li.animate([{transform:"scale(1)"},{transform:"scale(1.02)",offset:.15},{transform:"scale(1)",offset:.3},{transform:"scale(1.015)",offset:.45},{transform:"scale(1)"}],{duration:1000})}
  else if(kind==="dsfail"){el.innerHTML=`<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${zig(50,35,9)}"/></svg>`;li.animate([0,1,2,3,4,5].map(k=>({transform:`translateX(${k%2?.08:-.08}em)`})).concat([{transform:"none"}]),{duration:500});ms=1500}
  else if(kind==="death"){add("i",6,x=>{x.style.left=R_(8,40)+"%";x.style.top="40%";x.style.animationDelay=R_(0,.8)+"s"});
    li.animate([{filter:"none"},{filter:"grayscale(1) brightness(.6)",offset:.6},{filter:"grayscale(1) brightness(.6)"}],{duration:2600});ms=2700}
  else if(kind==="sp"){
    if(extra==="bless")add("i",18,x=>{x.style.left=R_(2,98)+"%";x.style.bottom=R_(0,30)+"%";x.style.animationDelay=R_(0,.7)+"s"});
    else if(extra==="curse")add("i",6,x=>{x.style.left=R_(0,85)+"%";x.style.top=R_(-20,40)+"%";x.style.animationDelay=R_(0,.4)+"s"});
    else if(extra==="haste")add("b",8,x=>{x.style.top=R_(10,85)+"%";x.style.left="70%";x.style.animationDelay=R_(0,.6)+"s"});
    else if(extra==="mark")el.innerHTML=`<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="24" cy="24" r="3" fill="currentColor"/><path d="M24 2v10M24 36v10M2 24h10M36 24h10" stroke="currentColor" stroke-width="2.5"/></svg>`;
    else if(extra==="gen")add("i",12,x=>{x.style.left=R_(2,98)+"%";x.style.bottom=R_(0,30)+"%";x.style.animationDelay=R_(0,.6)+"s"});
  }
  moLayer().appendChild(el);setTimeout(()=>el.remove(),ms);
}
let momentQ=[];
function queueMoments(list,prev){
  if(reduced||!prev)return;
  list.forEach(c=>{
    const was=prev.get(c.id),now=pv.seen.get(c.id);if(!was||!now)return;
    const add=[...now].filter(k=>!was.has(k)),gone=[...was].filter(k=>!now.has(k));
    const play=(kind,extra,delay,label)=>momentQ.push({id:c.id,kind,extra,delay:delay||0,label});
    let d=0;
    add.forEach(k=>{if(MO_COND[k]&&!(k==="unconscious"&&add.includes("down"))){play(MO_COND[k],"",d,k[0].toUpperCase()+k.slice(1));d+=250}});
    add.filter(k=>k.startsWith("eff")).forEach(k=>{const e=state.effects.find(x=>"eff"+x.id===k);if(!e)return;const m=MO_SPELL.find(([re])=>re.test(e.name));play("sp",m?m[1]:"gen",d,e.name);d+=200});
    const dsN=s=>{const k=[...s].find(x=>/^ds\d\d$/.test(x));return k?{s:+k[2],f:+k[3]}:null},a=dsN(was),b=dsN(now);
    if(add.includes("dead"))play("death");
    else if(add.includes("stable"))play("stable");
    else if(a&&b&&b.f>a.f)play("dsfail");
    else if(a&&b&&b.s>a.s)play("dsok");
    if((gone.includes("down")||gone.includes("stable"))&&!now.has("dead")&&!now.has("down")&&!now.has("stable"))play("revive");
    else if(gone.includes("bloodied")&&!now.has("down"))play("heal");
  });
}
function flushMoments(P){
  const q=momentQ;momentQ=[];
  q.forEach(m=>setTimeout(()=>{const li=fxRow(P,m.id);if(li)moment(li,m.kind,m.extra);else{const c=byId(m.id);if(!(m.kind==="death"&&c&&c.kind!=="pc"))tvStrip(m.id,m.label||MO_LABEL[m.kind]||"")}},m.delay+80));
}
/* K1–K3 on this screen: weather, time of day, how calm or wild the scene is */
function sceneLook(A,P){
  const lite=TV&&!!A.lite,t=tuneOf(A);Scene.lite=lite;if(lite){Scene.fx=[];Scene.SP=[];Scene.bf={}}
  Scene.opts({D:t[0],V:t[1],weather:lite?"none":A.weather||"none"});
  Scene.pos=id=>{const li=fxRow(P,id);if(!li)return null;const r=li.getBoundingClientRect();return r.width&&r.bottom>0&&r.top<innerHeight?{x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height}:null};Scene.posT=0;
  const tt=$("#todTint");if(tt){const c=A.tod&&A.tod!=="none"?"tod-"+A.tod:"";if(tt.className!==c)tt.className=c}
}
/* R1–R5: the scene answers what happens in the fight */
function sceneReact(A,P,first,prev){
  const lite=TV&&!!A.lite;
  // R5: the Ritual circle turns faster as a countdown nears 0
  const ck=(state.clocks||[]).filter(k=>!k.secret&&k.max>0&&k.n>0).map(k=>k.n/k.max);Scene.rit=sfx("clock")&&ck.length?1+(1-Math.min(...ck))*3.5:1;
  // battlefield spells, while they last
  const vis=id=>{const c=byId(id);return c&&shownToPlayers(c)};
  Scene.field(lite||!sfx("spells")?[]:state.effects.filter(e=>BF_FX[String(e.name).toLowerCase()]).map(e=>({key:BF_FX[String(e.name).toLowerCase()],tg:e.targets.filter(vis),by:vis(e.by)?e.by:null})));
  const ids=new Set(state.effects.map(e=>e.id)),was=pv.effIds;pv.effIds=ids;
  const sp=state.spfx,spNew=sp&&sp.id!==pv.spfx;if(sp)pv.spfx=sp.id;
  if(first||lite||reduced||!was)return;
  // Bless and Bane: a wave from the caster to the rows it touches
  if(sfx("spells"))state.effects.forEach(e=>{if(was.has(e.id))return;const k=String(e.name).toLowerCase();if(k!=="bless"&&k!=="bane")return;
    const T=e.targets.filter(vis).map(id=>Scene.at(id)).filter(Boolean);if(T.length)Scene.wave(vis(e.by)?Scene.at(e.by):null,T,k==="bane")});
  // a spell from the Hit-several box, Ctrl+K or a phone
  if(spNew&&sfx("spells")&&Math.abs(dmNow()-sp.at)<10000){
    const heal=/heal|cure wounds/i.test(sp.n||""),to=(sp.to||[]).filter(vis);let T=to.map(id=>Scene.at(id)).filter(Boolean);
    if(!T.length)T=sorted().filter(c=>shownToPlayers(c)&&!c.down&&(heal?c.kind==="pc":c.kind==="enemy")).map(c=>Scene.at(c.id)).filter(Boolean);
    Scene.spell(sp.n,sp.t,sp.from&&vis(sp.from)?Scene.at(sp.from):null,T,{tg:to,by:sp.from&&vis(sp.from)?sp.from:null})}
  // R4: a player drops to 0 HP and the colour drains for a moment
  if(prev&&sfx("down")&&state.list.some(c=>c.kind==="pc"&&shownToPlayers(c)&&prev.has(c.id)&&pv.seen.has(c.id)&&!["down","dead","stable"].some(k=>prev.get(c.id).has(k))&&pv.seen.get(c.id).has("down")))Scene.tint("sgrey",2600);
  // a countdown reaches 0 on the Ritual circle
  const cf=state.clockFx;if(cf&&cf.id!==pv.clockSc){pv.clockSc=cf.id;if(Math.abs(dmNow()-cf.at)<8000&&sfx("clock")&&Scene.kind==="ritual"){Scene.add({k:"flash",c:"200,120,255",a:.5,dur:900});Scene.add({k:"ring",x:Scene.w/2,y:Scene.h*.52,R:Math.min(Scene.w,Scene.h)*.6,c:"210,150,255",lw:14,dur:1200});Scene.jolt("3")}}
  else if(cf)pv.clockSc=cf.id;
}
/* the scene follows the boss fight: stronger while a boss is Bloodied, calm for a moment when one falls */
function sceneMood(first){
  if(state.sceneReact===false){Scene.target=1;pv.bossAlive=null;return}
  const now=Date.now(),bosses=state.list.filter(c=>c.boss),alive=bosses.filter(c=>!c.down);
  const newFight=state.fightAt&&dmNow()-state.fightAt<4000;
  if(!first&&pv.bossAlive&&!newFight)pv.bossAlive.forEach(id=>{if(!alive.some(c=>c.id===id))pv.calmUntil=now+15000});
  pv.bossAlive=alive.map(c=>c.id);
  if(pv.calmUntil&&now<pv.calmUntil){Scene.target=.55;clearTimeout(pv.calmT);pv.calmT=setTimeout(()=>sceneMood(false),pv.calmUntil-now+50);return}
  Scene.target=alive.some(c=>c.bloodied&&shownToPlayers(c))?1.8:1;
}
function rollForInitiative(){
  if(reduced)return;const el=document.createElement("div");el.className="rfi";el.innerHTML=`<div><small>Combat begins</small>Roll for initiative!</div>`;
  document.body.appendChild(el);setTimeout(()=>el.remove(),2200);
}
function lairTremor(P){
  if(reduced)return;if(sfx("lair"))Scene.lair();P.classList.remove("tremor");void P.offsetWidth;P.classList.add("tremor");setTimeout(()=>P.classList.remove("tremor"),1000);
  const f=document.createElement("div");f.className="lairflash";document.body.appendChild(f);setTimeout(()=>f.remove(),1500);
}
const callSeen={id:null,ans:{},done:false};
function callStamps(P,first){
  const call=state.call;
  if(!call){callSeen.id=null;return}
  if(callSeen.id!==call.id){callSeen.id=call.id;callSeen.ans={};callSeen.done=false;if(first)Object.assign(callSeen.ans,call.answers||{})}
  const ans=call.answers||{};
  P.querySelectorAll(".callbar .cw[data-id]").forEach(el=>{const id=el.dataset.id;if(ans[id]!=null&&callSeen.ans[id]==null&&!first){el.classList.add("stamp")}});
  Object.assign(callSeen.ans,ans);
  const sum=P.querySelector(".callbar .callsum");if(sum&&!callSeen.done){callSeen.done=true;if(!first)sum.classList.add("pop")}
}
function afterRender(list,prev,first){
  // boss intro: when the boss first appears to players, or when the DM clicks "Replay intro"
  list.forEach(c=>{
    if(!c.boss)return;const key=c.introAt||0,was=pv.introSeen.get(c.id);pv.introSeen.set(c.id,key);
    if(first||state.ended)return;
    if((!prev.has(c.id)&&was===undefined)||(key&&key!==was))queueIntro(c);
  });
}
function queueIntro(c){if(!screenWants("intro"))return;pv.introQ.push({name:c.name,title:c.title||"",fk:frameKey(c),img:c.introImg||""});if(!pv.introOn)nextIntro()}
function nextIntro(){
  const it=pv.introQ.shift();if(!it){pv.introOn=false;return}pv.introOn=true;
  const el=document.createElement("div");el.className="intro"+(it.fk?" fr-"+it.fk:"")+(it.img?" withimg":"");
  el.innerHTML=`${it.img&&/^[a-f0-9]{12}\.(jpg|png|webp)$/.test(it.img)?`<div class="intro-img" style="background-image:url(/bg/${it.img})"></div>`:""}<div class="intro-inner"><div class="intro-kicker">Enter</div><div class="intro-name">${esc(it.name)}</div><div class="intro-rule"></div>${it.title?`<div class="intro-title">${esc(it.title)}</div>`:""}</div>`;
  document.body.appendChild(el);setTimeout(()=>{el.remove();nextIntro()},reduced?3000:it.img?6200:4700);
}
let idleT=null;const wakeUi=()=>{document.body.classList.remove("idle");clearTimeout(idleT);idleT=setTimeout(()=>document.body.classList.add("idle"),4000)};
$("#player").addEventListener("animationend",e=>{
  const t=e.target;if(t.classList.contains("new")&&e.animationName==="pop")t.classList.remove("new");
  if(e.animationName==="enter")t.classList.remove("enter");
  if(e.animationName==="emerge")t.classList.remove("reveal");
  if(e.animationName==="hit"){const li=t.closest("li");li&&li.classList.remove("flash")}
  if(e.animationName==="fxin")t.classList.remove("fx-new");
});
function layoutMode(){if(TV)return "land";const o=state.layout||"auto";return o==="portrait"?"port":o==="landscape"?"land":innerHeight>innerWidth*1.05?"port":"land"}
const badgeCount=li=>{const ic=li.querySelector(".ic");return ic?ic.children.length:0};
// how many lines a row's badges take (visible ones only)
function badgeLines(li){const ic=li.querySelector(".ic");if(!ic)return 0;
  const k=[...ic.children].filter(ch=>ch.offsetParent!==null&&getComputedStyle(ch).display!=="none");if(!k.length)return 0;
  const h=Math.min(...k.map(ch=>ch.offsetHeight))/2;let n=1,last=null;
  k.map(ch=>ch.offsetTop+ch.offsetHeight/2).sort((a,b)=>a-b).forEach(y=>{if(last!=null&&y-last>h)n++;last=y});return n}
function resetBadges(li){li.classList.remove("c1");const ic=li.querySelector(".ic");if(!ic)return;
  ic.querySelectorAll(".morec").forEach(m=>m.remove());[...ic.children].forEach(ch=>{ch.style.display=""})}
// last resort: hide the least important badges (they come last) behind a "+N" chip
function trimRow(li,over){
  const ic=li.querySelector(".ic");if(!ic)return;
  const vis=()=>[...ic.children].filter(ch=>!ch.classList.contains("you")&&!ch.classList.contains("morec")&&ch.style.display!=="none"&&getComputedStyle(ch).display!=="none");
  let more=null;const hidden=[];
  while(over()&&vis().length>1){const ch=vis().pop();ch.style.display="none";
    hidden.unshift(...(ch.dataset.more?ch.dataset.more.split("|"):[(ch.querySelector(".lt")||ch).textContent.trim()||ch.getAttribute("title")||""]));
    if(!more){more=document.createElement("span");more.className="cond morec";ic.appendChild(more)}
    more.textContent="+"+hidden.length;more.dataset.more=hidden.join("|");more.dataset.who=(li.querySelector(".nm")||{}).textContent||""}
}
function fitList(n){
  const el=$("#plist");if(!el)return;
  const narrow=innerWidth<600,ts=Math.max(.7,Math.min(1.4,Number(state.textSize)||1));
  const rows=[...el.querySelectorAll(":scope > li")];rows.forEach(resetBadges);
  el.classList.toggle("compact",narrow);
  if(narrow){el.classList.remove("dense","port","stack");el.style.setProperty("--cols",1);el.style.setProperty("--gap","7px");
    el.style.setProperty("--fs",Math.max(17,Math.min(22,innerWidth*0.055))+"px");return}   // phones: short one-line rows that scroll if needed
  const port=layoutMode()==="port";el.classList.toggle("port",port);
  if(port){
    // one column; rows grow with their badges; the font shrinks only as far as it must
    el.classList.remove("dense","stack");el.style.setProperty("--cols",1);
    const H=el.clientHeight,gap=Math.max(6,Math.min(14,H*0.009));el.style.setProperty("--gap",gap+"px");
    const maxFs=Math.min(92,innerWidth*0.085)*ts,floor=Math.max(17,maxFs*0.74),minFs=15;
    el.classList.add("centered");
    let fs=Math.max(minFs,Math.min(maxFs,(H-gap*(n-1))/Math.max(1,n)/2.4));
    const set=v=>{fs=v;el.style.setProperty("--fs",v+"px")},over=()=>el.scrollHeight>el.clientHeight+1;
    set(fs);
    // the extra size for a short fight never costs a name: shrink back towards the normal size while one is cut off
    const normal=Math.min(64,innerWidth*0.056)*ts,cut=()=>[...el.querySelectorAll("li .nm")].some(x=>x.scrollWidth>x.clientWidth+1);
    while(fs>normal&&cut())set(Math.max(normal,fs*0.94));
    while(over()&&fs>floor)set(Math.max(floor,fs*0.94));
    // badges sit under the name here, so only a row whose badges take two lines or more can get shorter:
    // first their short forms (only if that saves a line), then a smaller font for everyone, then "+N" on those rows
    const heavy=[...rows].filter(li=>badgeLines(li)>1).sort((a,b)=>badgeLines(b)-badgeLines(a)||badgeCount(b)-badgeCount(a));
    for(const li of heavy){if(!over())break;const n=badgeLines(li);li.classList.add("c1");if(badgeLines(li)>=n)li.classList.remove("c1")}
    while(over()&&fs>minFs)set(Math.max(minFs,fs*0.94));
    for(const li of heavy){if(!over())break;trimRow(li,()=>over()&&badgeLines(li)>1)}
    return;
  }
  el.classList.remove("port");
  const cols=n>9?2:1,rws=Math.ceil(n/cols);
  el.classList.toggle("stack",cols>1);   // narrow columns: badges go on their own line under the name
  const h=el.clientHeight,gap=Math.max(6,Math.min(14,h*0.012));
  const rowh=Math.min(130*ts,(h-gap*(rws-1))/rws);
  el.classList.remove("dense");el.style.setProperty("--cols",cols);el.style.setProperty("--rows",rws);
  el.style.setProperty("--gap",gap+"px");el.style.setProperty("--rowh",rowh+"px");
  const k=document.documentElement.dataset.skin==="hc"?0.5:0.44;
  el.style.setProperty("--fs",Math.max(14,Math.min(rowh*k,rowh*k*ts))+"px");
  // a row whose badges don't fit: shorter labels, then abbreviations, then "+N"
  const stack=cols>1;
  rows.forEach(li=>{const ic=li.querySelector(".ic");if(!ic||!ic.children.length)return;
    // the NOW / NEXT tab sits in the top right corner: on those rows a second line of badges would run under it
    const tab=!stack&&(li.classList.contains("turn")||li.classList.contains("next")),
      twoLines=()=>{const f=ic.firstElementChild;return !!f&&ic.scrollHeight>f.offsetHeight*1.5};
    const ov0=stack?()=>li.scrollHeight>li.clientHeight+1||ic.scrollWidth>ic.clientWidth+1:()=>ic.scrollHeight>ic.clientHeight+1||ic.scrollWidth>ic.clientWidth+1,
      ov=tab?()=>ov0()||twoLines():ov0;
    if(ov())li.classList.add("c1");
    if(ov())trimRow(li,ov)});
}
addEventListener("resize",()=>{if(MODE==="player")fitList(withLair(sorted().filter(shownToPlayers)).length)});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(MODE==="player")fitList(withLair(sorted().filter(shownToPlayers)).length)});   // names are measured again once the display font has loaded

