/* ---------- state ---------- */
const blank=()=>({playerEdits:true,effects:[],list:[],party:[],encounters:[],lair:false,scene:"none",ended:null,vanish:[],rev:0});
function norm(d){const b=blank();d=d&&typeof d==="object"?d:{};const o=Object.assign(b,d);
  ["list","party","encounters","vanish","effects"].forEach(k=>{if(!Array.isArray(o[k]))o[k]=[]});
  o.list.forEach(c=>{if(!c.ds)c.ds={s:0,f:0};if(!Array.isArray(c.conds))c.conds=[]});return o}
let state=blank();
/* the laptop stamps times with its own clock; tablets and phones without internet often disagree by minutes,
   so each device learns the difference from the server's X-Now header and reads stamps through dmNow() */
let clockOff=0,clockRtt=1e9;
function learnClock(r,t0){const n=Number(r.headers.get("X-Now"));if(!n)return;const t1=Date.now(),rtt=t1-t0;
  clockRtt=Math.min(clockRtt+20,1e9);                      // older samples count for less over time
  if(rtt<=clockRtt){clockRtt=rtt;clockOff=n-(t0+t1)/2}}
const dmNow=()=>Date.now()+clockOff;

/* ---------- model ---------- */
const ownerOf=c=>c&&c.owner?state.list.find(x=>x.id===c.owner):null;   // a companion acts right after its owner
const initOf=c=>{const o=ownerOf(c),v=o?o.init:c.init;return (typeof v==="number"&&!isNaN(v))?v:-999};
const tbOf=c=>{const o=ownerOf(c);return o?(o.tb||0)-0.001:(c.tb||0)};
const sorted=()=>[...state.list].sort((a,b)=>initOf(b)-initOf(a)||tbOf(b)-tbOf(a)||a.name.localeCompare(b.name));
const LAIR={id:"__lair",kind:"lair",name:"Lair action",init:20,conds:[]};
/* the boss whose lair this is: in its lair, with lair actions to pick from (2014 books and homebrew; the 2024 Monster Manual gives extra Legendary Actions instead) */
const lairBoss=()=>state.list.find(c=>c.sb&&c.sb.inLair&&(c.sb.lair||[]).length&&!c.down&&!isDead(c));
let lairRegOpen=new Set(),lairShow=false;
const lairShort=t=>{const x=String(t).replace(/\s+/g," ").trim(),m=x.match(/^(.{20,90}?[.!?])(\s|$)/);return m?m[1]:x.length>90?x.slice(0,88)+"…":x};
function lairTip(sb){return [sb.laLair&&sb.la?`In its lair: ${sb.laLair} Legendary Actions instead of ${sb.la.base||sb.la.max}`:"",sb.lrLair&&sb.lr?
  `${sb.lrLair} Legendary Resistances instead of ${sb.lr.base||sb.lr.max}`:"",(sb.lair||[]).length?
  `Lair actions on initiative 20 (${sb.lair.length} to pick from)`:"",(sb.reg||[]).length?"Regional effects":""].filter(Boolean).join(" · ")}
function lairRowHtml(){
  const b=lairBoss(),turn=!!(state.turn&&state.turn.id==="__lair"),sb=b&&b.sb,last=sb&&sb.lairLast,R=state.turn?state.turn.round:0;
  const open=b&&(turn||lairShow);
  const acts=open?`<div class="lairbox">${sb.lairIntro?`<p class="psub">${esc(sb.lairIntro)}</p>`:""}${sb.lair.map((t,i)=>{const used=last&&last.i===i&&
    last.r===R,prev=last&&last.i===i&&last.r===R-1;
      return `<div class="lairact${used?" used":""}${prev?" last":""}"${prev?` title="Used last round: the same one can't be used two rounds in a row"`:
        ""}><span>${sbInline(esc(t),"Lair action")}</span><button type="button" class="btn sm" data-act="lairuse" data-i="${i}" aria-pressed="${!!used}">${used?
        "Used ✓":prev?"Last round":"Use"}</button></div>`}).join("")}</div>`:"";
  return `<div class="row k-lair${turn?" turn":""}" data-id="__lair"><div class="lair-init">20</div><div class="who"><div class="lair-name">${b?esc(b.name)+
    " · ":""}Lair action<small>${b?`${sb.lair.length} to pick from${last&&last.r===R-1?` · not “${esc(lairShort(sb.lair[last.i]||""))}” again`:""}`:
    "On initiative 20, loses ties"}</small></div></div><div class="chips">${b&&!turn?
    `<button type="button" class="cond add" data-act="lairshow" aria-expanded="${lairShow}">${lairShow?"Hide":"Show"} actions</button>`:
    ""}</div><div class="tools"><button type="button" class="icon-btn" data-act="lairoff" aria-label="Remove lair action">${I.x}</button></div>${acts}</div>`;
}
function withLair(arr){if(!state.lair)return arr;const a=[...arr];const i=a.findIndex(c=>initOf(c)<20);a.splice(i<0?a.length:i,0,LAIR);return a}
const dsOf=c=>c.ds||{s:0,f:0};
const exhOf=c=>Math.max(1,Math.min(6,c.exh||1));
const isDead=c=>c.kind==="pc"&&c.down&&dsOf(c).f>=3;
const isStable=c=>c.kind==="pc"&&c.down&&dsOf(c).s>=3&&!isDead(c);
const shownToPlayers=c=>(!c.hidden||(PREVIEW&&pvDraft&&pvDraft.reveal===c.id))&&!(c.down&&c.kind!=="pc");   // the DM's reveal preview shows that one
const byId=id=>state.list.find(c=>c.id===id);
const newCombatant=o=>Object.assign({id:uid(),name:"",base:"",kind:"enemy",init:null,tb:-(state.list.length),ac:null,showAc:(o&&o.kind)!=="enemy",hp:null,hpMax:
  null,bloodied:false,hidden:false,down:false,conds:[],boss:false,title:"",insp:false,cls:"",ctype:"",ds:{s:0,f:0}},o);
function addCombatants(f){
  const n=Math.max(1,Math.min(12,f.count||1));
  const existing=state.list.filter(c=>c.base===f.name).length;
  for(let k=0;k<n;k++){
    const name=n>1||existing?`${f.name} ${String.fromCharCode(65+existing+k)}`:f.name;
    state.list.push(newCombatant({name,base:f.name,kind:f.kind,init:f.init===""?null:Number(f.init),ac:f.ac===""?null:Number(f.ac),...(f.kind!=="pc"&&f.hp&&
      Number(f.hp)>0?{hp:Number(f.hp),hpMax:Number(f.hp)}:{}),hidden:f.hidden,boss:f.boss&&f.kind!=="pc",cls:f.kind==="pc"?f.type:"",ctype:f.kind!=="pc"?
      f.type:""}));
  }
  if(state.ended)state.ended=null;
  commit();
}
const EXAMPLE=()=>[
  ["Kaelen","pc",18,16],["Goblin A","enemy",16,15],["Sefa","pc",15,14],["Hobgoblin Captain","enemy",13,18],
  ["Mirela","pc",12,13],["Goblin B","enemy",11,15],["Brom","pc",9,18],["Goblin Shaman","enemy",7,12]
].map(([name,kind,init,ac],i)=>newCombatant({name,base:name.replace(/ [A-Z]$/,""),kind,init,tb:-i,ac,bloodied:name==="Goblin A"||name==="Brom",hidden:name===
  "Goblin Shaman",
  conds:name==="Goblin A"?["Prone"]:name==="Mirela"?["Concentrating"]:[],boss:name==="Hobgoblin Captain",cls:{Kaelen:"fighter",Sefa:"rogue",Mirela:"wizard",
    Brom:"paladin"}[name]||"",ctype:kind==="enemy"?"humanoid":"",title:name==="Hobgoblin Captain"?"Scourge of Red Cliff":"",insp:name==="Sefa"}));

