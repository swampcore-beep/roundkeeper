/* ---------- statblocks from 5e.tools: a downloaded .md, or the text copied off the page ----------
   Only what the DM pastes is read; nothing is fetched. DM-only data lives in c.sb and never reaches the players. */
function parseStatblock(text){
  const L=refPlain(text).split(/\r?\n/).map(l=>l.replace(/^\s*>\s?/,"").replace(/^\s*[-•]\s+/,"").replace(/\*\*\*|\*\*|\*|__|`/g,"").replace(/^#+\s*/,"").replace(/\s+$/,"").trim())
    .filter(l=>l&&!/^_+$/.test(l)&&!/^\|?\s*:?-{3}/.test(l));
  if(!L.length)return null;
  const all=L.join("\n"),num=x=>Number(String(x).replace(/[−–]/g,"-").replace(/\s/g,""));
  const out={name:L[0].replace(/\s*\(.*\)\s*$/,"").slice(0,40),ctype:"",size:"",ac:null,hp:null,hpf:"",ib:null,cr:"",lr:0,la:0,uses:[],rech:[],know:[]};
  const tl=L.find(l=>/^(Tiny|Small|Medium|Large|Huge|Gargantuan)\b/i.test(l));
  if(tl){out.size=tl.split(/[ ,]/)[0];const low=tl.toLowerCase();const t=CTYPES.find(([k])=>new RegExp("\\b"+k+"s?\\b").test(low));if(t)out.ctype=t[0]}
  let m;
  if((m=all.match(/\b(?:Armor Class|AC)\s+(\d+)/)))out.ac=Number(m[1]);
  if((m=all.match(/\b(?:Hit Points|HP)\s+(\d+)(?:\s*\(([^)]*)\))?/))){out.hp=Number(m[1]);out.hpf=(m[2]||"").replace(/\s+/g,"")}
  if((m=all.match(/\bInitiative\s+([+\-−–]\s*\d+)/)))out.ib=num(m[1]);
  else{const row=L.find(l=>(l.match(/\d+\s*\([+\-−–]\d+\)/g)||[]).length>=6);
    if(row){const mods=row.match(/\(([+\-−–]\d+)\)/g);out.ib=num(mods[1].slice(1,-1))}
    else if((m=all.match(/\bDex\s+\d+\s+([+\-−–]\d+)/i)))out.ib=num(m[1])}
  if((m=all.match(/\b(?:Challenge|CR)\s+([\d/]+)/)))out.cr=m[1];
  if((m=all.match(/can take (\d+) legendary actions/i))||(m=all.match(/Legendary Action Uses:?\s*(\d+)/i)))out.la=Number(m[1]);
  if(out.la&&(m=all.match(/Legendary Action Uses:?\s*\d+\s*\((\d+) in (?:its )?Lair\)/i)))out.laLair=Number(m[1]);
  Object.assign(out,parseLair(text));
  let head=null;   // the last "Name (N/Day)." trait: a spell list right under it is the same pool, not a new one
  L.forEach(l=>{
    let k=l.match(/^([A-Z][^.()]{1,60}?)\s*\(([^)]*)\)\.\s/);
    if(k){const n=k[1].trim(),p=k[2];let r;head=null;
      if((r=p.match(/Recharge\s*(\d)/i)))out.rech.push({n,min:Number(r[1]),ready:true});
      else if((r=p.match(/(\d+)\/Day/i))){if(/^Legendary Resistance/i.test(n)){out.lr=Number(r[1]);const z=p.match(/(\d+)\/Day in (?:its )?Lair/i);if(z)out.lrLair=Number(z[1])}
        else if(!/each/i.test(p)){out.uses.push({n,max:Number(r[1]),used:0});head={n,max:Number(r[1])}}}
      else if(/Recharges after a (Short or )?Long Rest/i.test(p))out.uses.push({n,max:1,used:0});}
    else if(/^[A-Z][^.]{1,60}\.\s/.test(l)&&!/^\d+\/Day/i.test(l))head=null;
    if((k=l.match(/^(\d)(?:st|nd|rd|th) level \((\d+) slots?\):?\s*(.*)$/i))){const sp=k[3].split(/,(?![^(]*\))/).map(x=>x.replace(/\(.*?\)|\*/g,"").trim()).filter(Boolean).map(x=>x.charAt(0).toUpperCase()+x.slice(1));
      out.uses.push(Object.assign({n:`Level ${k[1]} slots`,max:Number(k[2]),used:0},sp.length?{sp}:{}))}
    if((k=l.match(/^(\d+)\/Day( each)?:\s*(.+)$/i))){const n=Number(k[1]),each=!!k[2];
      const sp=k[3].split(/,(?![^(]*\))/).map(x=>x.replace(/\(.*?\)/g,"").trim()).filter(Boolean).map(x=>x.charAt(0).toUpperCase()+x.slice(1));
      if(each)sp.forEach(x=>out.uses.push({n:x,max:n,used:0}));
      else if(head&&head.max===n){const u=out.uses.find(u=>u.n===head.n);if(u&&sp.length>1&&!sp.includes(head.n))u.sp=sp}   // already counted by its trait
      else if(sp.length)out.uses.push({n:sp.length>1?sp.join(" / "):sp[0],max:n,used:0,sp});
      head=null}
    if((k=l.match(/^(Damage Resistances|Resistances|Damage Immunities|Condition Immunities|Immunities|Damage Vulnerabilities|Vulnerabilities)\s+(.+)$/i))){
      const kind=/vuln/i.test(k[1])?"Vulnerable":/immun/i.test(k[1])?"Immune":"Resistant";
      k[2].split(";").forEach(part=>{part=part.trim();if(!part)return;
        const items=/from|nonmagical|that aren't|except/i.test(part)?[part]:part.split(/,|\band\b/).map(x=>x.trim()).filter(Boolean);
        items.forEach(x=>out.know.push(`${kind}: ${x.charAt(0).toUpperCase()+x.slice(1)}`))})}
  });
  if(out.ac==null&&out.hp==null)return null;   // not a statblock
  return out;
}
let sbItems=[],lib=[],libQ="",libArmed=null;
/* how added monsters get their initiative: once for the group, one roll each, or typed in by the DM from real dice (the last choice is remembered) */
let sbInitMode=ls.get("initMode","group");if(!["group","each","hand"].includes(sbInitMode))sbInitMode="group";
const d20=()=>1+Math.floor(Math.random()*20);
const INIT_MODES=[["group","Roll once for the group"],["each","Roll for each"],["hand","I'll roll"]];
/* the monster library: every statblock you import is kept on the laptop (library.json next to the app) */
function libPut(x){if(!x.raw)return;const name=(x.base||x.name||"").trim()||x.name;const e={name,raw:x.raw,cr:x.cr||"",ctype:x.ctype||"",at:Date.now(),...(x.fet?{fet:x.fet}:{}),...(x.edited?{edited:true}:{})};
  const i=lib.findIndex(y=>y.name.toLowerCase()===name.toLowerCase());if(i>=0)lib[i]=e;else lib.push(e);lib.sort((a,b)=>a.name.localeCompare(b.name))}
async function libSave(){if(!served){ls.set("library",lib);return}try{await fetch("/library",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(lib)})}catch(e){}}
async function libLoad(){if(!served){lib=ls.get("library",[]);return}try{const r=await fetch("/library",{cache:"no-store"});const d=await r.json();if(Array.isArray(d))lib=d}catch(e){}}
const libListHtml=()=>{const q=libQ.trim().toLowerCase(),hit=lib.filter(e=>!q||e.name.toLowerCase().includes(q));
  return hit.length?hit.map(e=>{const k=lib.indexOf(e);return `<div class="librow"><button type="button" class="libadd" data-act="libuse" data-i="${k}"><b>${esc(e.name)}</b><small>${[e.ctype?(CTYPES.find(t=>t[0]===e.ctype)||["",""])[1]:"",e.cr?"CR "+e.cr:""].filter(Boolean).join(" · ")}</small></button><button type="button" class="icon-btn${libArmed===k?" armed":""}" data-act="libdel" data-i="${k}" aria-label="${libArmed===k?"Click again to delete":"Delete from the library"}" title="${libArmed===k?"Click again to delete":"Delete from the library"}">${libArmed===k?"?":I.x}</button></div>`}).join("")
    :`<p class="psub">${lib.length?"Nothing matches.":""}</p>`};
const sbMeta=x=>[x.size&&x.ctype?`${x.size} ${(CTYPES.find(t=>t[0]===x.ctype)||["",""])[1]}`:"",x.ac!=null?"AC "+x.ac:"",x.hp!=null?"HP "+x.hp:"",x.ib!=null?"Init "+(x.ib>=0?"+":"")+x.ib:"",x.cr?"CR "+x.cr:""].filter(Boolean).join(" · ");
const sbCounters=x=>[x.lr?`Legendary Resistance ${x.lr}/Day`:"",x.la?`${x.la} Legendary Actions`:""].concat(x.rech.map(r=>`${r.n} (Recharge ${r.min}${r.min<6?"–6":""})`),x.uses.map(u=>`${u.n} ${u.max}/Day`)).filter(Boolean);
let sbShownN=-1;
function sbSheet(){
  const old=$(".sbsheet"),top=old?old.scrollTop:0,prevN=old?sbShownN:sbItems.length;sbShownN=sbItems.length;   // a click redraws the window: it stays where it was
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet sbsheet" role="dialog" aria-modal="true"><h2>Add monsters</h2>
    <div id="fetWrap">${fetBoxHtml()}</div>
    ${lib.length?`<div class="libbox"><div class="eyebrow2">Library · ${lib.length} saved</div><input class="field" id="libQ" type="search" placeholder="Search the library" value="${esc(libQ)}" autocomplete="off"><div class="liblist" id="libList">${libListHtml()}</div></div>`:""}
    ${sbItems.length?sbItems.map((x,i)=>`<div class="sbcard"><div class="sbtop"><input class="field" data-sbname="${i}" value="${esc(x.name)}" maxlength="40" aria-label="Name"><button type="button" class="icon-btn" data-act="sbdrop" data-i="${i}" aria-label="Remove">${I.x}</button></div>
        <div class="psub">${esc(sbMeta(x))}${x.from?` · <i>${esc(x.from)}</i>`:""}</div>
        ${sbCounters(x).length?`<div class="sbtags">${sbCounters(x).map(t=>`<span>${esc(t)}</span>`).join("")}</div>`:""}
        ${x.know.length?`<div class="sbtags know">${x.know.map(t=>`<span>${esc(t)}</span>`).join("")}</div>`:""}
        <div class="sbopts"><span class="psub">Count</span><button type="button" class="btn sm" data-act="sbcount" data-i="${i}" data-d="-1">−</button><b>${x.count}</b><button type="button" class="btn sm" data-act="sbcount" data-i="${i}" data-d="1">+</button>
          <label class="chk"><input type="checkbox" data-sbhid="${i}" ${x.hidden?"checked":""}> Hidden</label><label class="chk"><input type="checkbox" data-sbboss="${i}" ${x.boss?"checked":""}> Boss</label><label class="chk" title="Surprised creatures roll initiative with disadvantage"><input type="checkbox" data-sbsurp="${i}" ${x.surp?"checked":""}> Surprised</label></div>
        <div class="seg2 sbinit" role="group" aria-label="Initiative"><span class="psub">Initiative${x.ib!=null?` (${x.ib>=0?"+":""}${x.ib})`:""}</span>${INIT_MODES.filter(([m])=>m!=="each"||x.count>1).map(([m,l])=>`<button type="button" data-act="sbinit" data-i="${i}" data-m="${m}" aria-pressed="${(x.im||sbInitMode)===m||(m==="group"&&x.count<2&&(x.im||sbInitMode)==="each")}">${m==="group"&&x.count<2?"Roll it":l}</button>`).join("")}</div></div>`).join("")
      :`<p class="psub">On 5e.tools, download the statblock as <b>.md</b> and drop the file here, or select the statblock text, copy it and paste it below. You can also just press <kbd>Ctrl</kbd>+<kbd>V</kbd> or drop .md files anywhere on this screen.</p>`}
    <textarea class="field sbpaste" id="sbPaste" rows="${sbItems.length?2:6}" placeholder="Paste a statblock here"></textarea>
    <div class="sbfoot"><label class="btn"><input type="file" id="sbFile" accept=".md,.txt,text/markdown,text/plain" multiple hidden>Choose .md files</label>
      
      <button class="btn" type="button" data-act="close">Cancel</button><button class="btn primary" type="button" data-act="sbadd" ${sbItems.length?"":"disabled"}>Add to combat${sbItems.length?` (${sbItems.reduce((a,x)=>a+Math.max(1,Math.min(12,x.count||1)),0)})`:""}</button></div></div></div>`;
  const sh=$(".sbsheet");if(!sh)return;sh.scrollTop=top;
  if(sbItems.length>prevN){const cards=sh.querySelectorAll(".sbcard"),c=cards[cards.length-1];   // a monster just picked: show its card if it's out of sight, and light it up
    if(c){c.classList.add("just");const r=c.getBoundingClientRect(),R=sh.getBoundingClientRect(),f=sh.querySelector(".sbfoot"),fh=f?f.offsetHeight:0;
      const d=r.top<R.top?r.top-R.top-12:r.bottom>R.bottom-fh?r.bottom-(R.bottom-fh)+12:0;if(d)sh.scrollTo({top:sh.scrollTop+d,behavior:reduced?"auto":"smooth"})}}
}
function sbTake(texts){
  let got=0;texts.forEach(t=>{
    // a file may hold several statblocks: split on second-level headings
    const parts=/^\s*>?\s*##\s/m.test(t)?t.split(/(?=^\s*>?\s*##\s)/m):[t];
    parts.forEach(p=>{const x=parseStatblock(p);if(x){sbItems.push(Object.assign(x,{raw:p.trim().slice(0,20000),count:1,hidden:false,boss:!!(x.lr||x.la)}));got++}})});
  return got;
}
function sbAdd(){
  const done=[];
  sbItems.forEach(x=>{
    const name=x.name.trim()||"Monster",n=Math.max(1,Math.min(12,x.count||1)),existing=state.list.filter(c=>c.base===name).length;
    const roll=()=>x.surp?Math.min(d20(),d20()):d20();   // surprised: disadvantage on initiative
    const mode=x.im||sbInitMode,group=x.ib!=null?roll()+x.ib:null;
    for(let k=0;k<n;k++){const nm=n>1||existing?`${name} ${String.fromCharCode(65+existing+k)}`:name;
      const init=mode==="hand"||x.ib==null?null:mode==="each"?roll()+x.ib:group;
      state.list.push(newCombatant({name:nm,base:name,kind:"enemy",init,ib:x.ib,tb:(x.ib||0)*100-state.list.length,ac:x.ac,hidden:x.hidden,boss:x.boss,ctype:x.ctype,
        ...(x.hp?{hp:x.hp,hpMax:x.hp}:{}),sb:{cr:x.cr,hpf:x.hpf,lr:x.lr?{max:x.lr,used:0}:null,la:x.la?{max:x.la,used:0}:null,
          uses:x.uses.map(u=>Object.assign({n:u.n,max:u.max,used:0},u.sp?{sp:u.sp.slice()}:{})),rech:x.rech.map(r=>({n:r.n,min:r.min,ready:true})),know:x.know.slice(),raw:x.raw||"",
          ...((x.lair||[]).length||(x.reg||[]).length||x.laLair||x.lrLair?{lair:(x.lair||[]).slice(),lairIntro:x.lairIntro||"",reg:(x.reg||[]).slice(),laLair:x.laLair||0,lrLair:x.lrLair||0}:{}),...(x.fet?{fet:x.fet}:{})}}));
      {const nc=state.list[state.list.length-1],pk=(state.monPics||{})[picKey(nc)];if(pk)nc.introImg=pk}
      done.push(nm)}
    libPut(x);
  });
  libSave();
  sbItems=[];if(!done.length)return;if(state.ended)state.ended=null;commit();closeSheet();toast("Added: "+done.join(", "));
}
