/* ---- the statblock drawer: the full text, with attacks, damage and saves you can click ---- */
let sbOpenRows=new Set(),sbViewId=null,sbLog=[],sbAdv="",sbCrit=false,sbSaveAsk=null;
const ABIL=["Strength","Dexterity","Constitution","Intelligence","Wisdom","Charisma"];
function sbInline(t,act){
  // t is already escaped; act = name of the trait/action this line belongs to
  const A=esc(act||"");
  t=t.replace(/(Attack Roll:\s*|)([+\-−–]\d+)( to hit)?/g,(m,pre,mod,th)=>pre||th?
    `${pre}<button type="button" class="sbr hit" data-act="sbroll" data-k="hit" data-m="${mod.replace(/[−–]/,"-")}" data-n="${A}">${mod}</button>${th||""}`:m);
  t=t.replace(/(\d+) \((\d+d\d+(?:\s*[+\-−–]\s*\d+)?)\)(\s+[A-Za-z]+)?/g,(m,avg,dice,type)=>
    `<button type="button" class="sbr dmg" data-act="sbroll" data-k="dmg" data-d="${dice.replace(/\s/g,"").replace(/[−–]/,"-")}" data-t="${(type||
    "").trim()}" data-n="${A}">${avg} (${dice})</button>${type||""}`);
  t=t.replace(/DC (\d+) (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/gi,(m,dc,ab)=>
    `<button type="button" class="sbr save" data-act="sbsave" data-dc="${dc}" data-ab="${ab}" data-n="${A}">${m}</button>`);
  t=t.replace(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw:\s*DC (\d+)/g,(m,ab,dc)=>
    `<button type="button" class="sbr save" data-act="sbsave" data-dc="${dc}" data-ab="${ab}" data-n="${A}">${m}</button>`);
  t=t.replace(/\*\*\*(.+?)\*\*\*/g,"<b><i>$1</i></b>").replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/(^|[^*])\*([^*]+?)\*/g,
    "$1<i>$2</i>").replace(/_{2}(.+?)_{2}/g,"<b>$1</b>");
  t=t.replace(/⟦([^|⟧]*)\|([^|⟧]*)\|([^|⟧]*)\|([^⟧]*)⟧/g,(m,ty,n,src,disp)=>refSpan(ty,n,src,disp));
  if(sbGuess){   // a statblock from a .md file: no markers, so known names are found in the text
    t=t.replace(/<i>([^<]{3,40})<\/i>/g,(m,n)=>refNames.spell.has(n.toLowerCase())?`<i>${refSpan("spell",n,"",n)}</i>`:m);
    t=t.split(/(<[^>]*>)/).map((part,i)=>i%2?part:part.replace(REF_COND_RE,(m)=>refSpan("condition",m,"",m))).join("");
  }
  return t;
}
const refSpan=(ty,n,src,disp)=>`<span class="ref r-${ty}" tabindex="0" data-rt="${ty}" data-rn="${n}" data-rs="${src}">${disp}</span>`;
let sbGuess=false,refNames={spell:new Set(),condition:new Set()},refNamesSig=null;
const REF_COND_RE=new RegExp(`\\b(${CONDS.concat(["Bloodied"]).filter(x=>x!=="Concentrating").join("|")})\\b`,"gi");
async function refLoadNames(){if(!served||!fetInfo||fetInfo.state!=="ready"||refNamesSig===fetInfo.sig)return;refNamesSig=fetInfo.sig;
  try{const d=await (await fetch("/5et/refnames",{cache:"no-store"})).json();
    refNames={spell:new Set((d.spell||[]).map(x=>x.toLowerCase())),condition:new Set((d.condition||[]).map(x=>x.toLowerCase()))}}catch(e){}}
function sbRender(raw){
  sbGuess=!String(raw||"").includes("⟦");
  const lines=String(raw||"").split(/\r?\n/).map(l=>l.replace(/^\s*>\s?/,"").trimEnd());
  let h="",tbl=[],act="";
  const flush=()=>{if(!tbl.length)return;const rows=tbl.map(r=>r.replace(/^\||\|$/g,"").split("|").map(x=>x.trim()));
    const head=rows[0],vals=rows.find((r,i)=>i>0&&!/^:?-{2,}/.test(r[0]))||[];
    h+=`<div class="sbab">${head.map((x,i)=>`<span><small>${esc(x)}</small><b>${esc(vals[i]||"")}</b></span>`).join("")}</div>`;tbl=[]};
  lines.forEach((l,i)=>{
    if(/^\s*\|/.test(l)){tbl.push(l.trim());return}flush();
    if(!l.trim()||/^_{3,}$/.test(l.trim()))return;
    let m;
    if(i<4&&(m=l.match(/^##\s+(.+)/))){return}   // the name is in the drawer header
    if((m=l.match(/^#{3,}\s+(.+)/))){h+=`<h4>${esc(m[1])}</h4>`;act="";return}
    const n=l.match(/^\s*(?:[-•]\s*)?\*{2,3}(.+?)\.?\*{2,3}/)||l.match(/^([A-Z][A-Za-z' ,\-]{2,40}?)(?: \([^)]*\))?\.\s/);
      act=n?n[1].replace(/\s*\(.*\)$/,"").replace(/\.$/,""):act;
    const body=sbInline(esc(l.replace(/^\s*[-•]\s+/,"")),act);
    h+=/^\s*[-•]\s/.test(l)?`<div class="sbprop">${body}</div>`:`<p>${body}</p>`;
  });flush();
  return h;
}
function sbDice(spec,crit){const m=spec.match(/^(\d+)d(\d+)([+-]\d+)?$/);if(!m)return null;const n=Number(m[1])*(crit?2:1),d=Number(m[2]),add=Number(m[3]||0);
  const rolls=Array.from({length:n},()=>1+Math.floor(Math.random()*d));return{rolls,add,tot:rolls.reduce((a,b)=>a+b,0)+add,n,d}}
/* 25: lore and pictures from the 5e.tools files (only the laptop reads them; a picture reaches the tablet only when you pick it for the intro) */
let sbLoreOn=null;const loreCache=new Map();   // 82: the drawer's tab: the statblock, or lore and picture
async function loreGet(f){const k=f.n+"|"+f.s;if(loreCache.has(k))return loreCache.get(k);
  try{const r=await fetch(`/5et/fluff?n=${encodeURIComponent(f.n)}&s=${encodeURIComponent(f.s)}`,{cache:"no-store"});const d=r.ok?await r.json():null;
    loreCache.set(k,d);return d}catch(e){return null}}
/* Settings → Pictures: are the 5e.tools pictures there, and where to put them (the app reads them, it doesn't fetch them) */
let picsInfo=null;
async function picsLoad(){try{const r=await fetch("/5et/pics",{cache:"no-store"});picsInfo=r.ok?await r.json():null}catch(e){picsInfo=null}}
async function picsCheck(){for(let i=0;i<40;i++){let st=null;try{st=await (await fetch("/5et/status",{cache:"no-store"})).json()}catch(e){}if(st&&st.state!==
  "loading")break;await new Promise(r=>setTimeout(r,700))}
  await picsLoad();loreCache.clear();picsSheet();toast(picsInfo&&picsInfo.count?`${picsInfo.count} pictures found`:"No pictures found yet")}
async function picsSheet(){
  if(!picsInfo)await picsLoad();const P=picsInfo||{count:0,from:[],folder:""};
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="Pictures"><h2>Pictures</h2>
    <div class="psec">${P.count?`<p><b>${P.count} monster pictures</b> found, from: ${P.from.map(esc).join(
      ", ")}.</p><p class="psub">Open a monster's statblock → Lore to see its pictures and pick one for the intro.</p>`
      :`<p><b>No monster pictures yet.</b> The app doesn't download them: if you have them, you put them in the 5etools folder once, and it reads them from there.</p>`}</div>
    <div class="psec"><div class="eyebrow2">Where the app looks</div><ol class="picsteps">
      <li>If you have the pictures as a <code>bestiary</code> folder, put it here: <code>${esc(P.folder||
        "5etools/img/bestiary")}</code> (so the books are folders inside it: <code>…/img/bestiary/XMM/</code>, <code>…/img/bestiary/MM/</code>).</li>
      <li>Or zip the <code>bestiary</code> folder and put the zip in the <code>5etools</code> folder, next to your other data files.</li>
      <li>Then <b>Check again</b>. No restart needed.</li></ol>
      <p class="psub">Your own pictures work without any of this: statblock → Picture / Lore → Upload a picture…</p></div>
    <div class="spacts"><button class="btn" type="button" data-act="close">Close</button><button class="btn primary" type="button" data-act="picscheck">Check again</button></div></div></div>`;
}
/* 84 + 86: Settings → Game data: the SRD the app comes with, the DM's own files, and homebrew added by hand */
let gdBusy=false,gdMsg="",gdArm=null;
async function gdSheet(){
  await fetRefresh();const F=fetInfo||{},c=F.counts||{},imp=F.imported||[],files=(F.files||[]).filter(x=>!/^SRD /.test(x)&&!imp.includes(x));
  const own=(c.own||0)+(c.hb||0),off=Math.max(0,(c.off||0)-(c.srd||0));
  $("#overlay").innerHTML=
    `<div class="scrim" data-act="close"><div class="sheet gdsheet" role="dialog" aria-modal="true" aria-label="Game data"><h2>Game data</h2>
    <div class="psec"><div class="eyebrow2">Built in</div><p><b>SRD 5.2.1</b>: ${(c.srd||0).toLocaleString()} monsters with statblocks${c.srd_spells?
      `, ${c.srd_spells.toLocaleString()} spells`:
      ""}, magic items, conditions and rules. Search them in Add monsters… and Ctrl+K; players get the spells on their phones.</p>
      <p class="psub">A monster, spell or rule that your own files also have is shown from your files instead, so nothing appears twice.</p></div>
    <div class="psec"><div class="eyebrow2">Your files</div>${files.length?
      `<p>${files.map(esc).join(", ")}</p><p class="psub">${off.toLocaleString()} more official monsters and ${own.toLocaleString(
      )} homebrew monsters from these.</p>`:
      `<p class="psub">None yet. JSON data in the common homebrew format goes in a folder named <b>5etools</b> next to the app, or use Import below.</p>`}</div>
    <div class="psec"><div class="eyebrow2">Imported homebrew</div>
      ${imp.length?`<div class="gdlist">${imp.map(n=>`<div class="gdrow"><span>${esc(n)}</span><button type="button" class="btn${gdArm===n?" danger":
        ""}" data-act="gdrm" data-n="${esc(n)}">${gdArm===n?"Remove it?":"Remove"}</button></div>`).join("")}</div>`:
        `<p class="psub">Nothing imported yet.</p>`}
      <label class="btn primary gdadd" tabindex="0">${gdBusy?"Reading the file…":
        "Import a JSON file…"}<input type="file" id="gdFile" accept="application/json,.json" hidden${gdBusy?" disabled":""}></label>
      ${gdMsg?`<p class="gdmsg">${gdMsg}</p>`:""}
      <p class="psub">One homebrew file: monsters, spells, items, conditions or rules, in the common homebrew JSON format. It's copied to <code>5etools/imported</code> next to the app and read like your other files. Only this computer and your DM devices can add or remove them.</p></div>
    <p class="psub gdlic">The SRD 5.2.1 is by Wizards of the Coast LLC, under the Creative Commons Attribution 4.0 International License, available at https://www.dndbeyond.com/srd. Converted from Open5e's transcription.</p>
    <div class="spacts"><button class="btn" type="button" data-act="close">Close</button></div></div></div>`;
}
async function gdWait(){for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,500));await fetRefresh();if(fetInfo&&fetInfo.state!=="loading")break}qkIdx=null;
  refNamesSig=""}
async function gdImport(file){
  if(!file||gdBusy)return;if(file.size>60*1024*1024){gdMsg="That file is larger than 60 MB.";gdSheet();return}
  gdBusy=true;gdMsg="";gdSheet();
  try{const r=await fetch("/5et/import?name="+encodeURIComponent(file.name),{method:"POST",headers:{"Content-Type":"application/json"},body:
    await file.arrayBuffer()});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)gdMsg=esc(d.error||"Couldn't add that file.");
    else{await gdWait();const k=d.kinds||{},L={monster:"monsters",spell:"spells",item:"items",condition:"conditions",variantrule:"rules",feat:"feats",race:
      "species",background:"backgrounds"};
      gdMsg=`Added <b>${esc(d.file)}</b>: ${Object.entries(k).map(([a,n])=>`${n} ${L[a]||a}`).join(", ")}.`;toast("Added "+d.file)}
  }catch(e){gdMsg="Couldn't send the file to the laptop."}finally{gdBusy=false;gdSheet()}
}
async function gdRemove(n){
  try{const r=await fetch("/5et/unimport?name="+encodeURIComponent(n),{method:"POST"});if(!r.ok)throw 0;gdArm=null;gdMsg="";await gdWait();
    toast("Removed "+n)}catch(e){toast("Couldn't remove that file")}gdSheet()}
/* the intro picture: your own upload, or one from the 5e.tools pictures; remembered for that monster next time */
const loreOf=c=>!!(c.sb&&c.sb.fet&&String(c.sb.fet.s).toUpperCase()!=="SRD52");   // the SRD has statblocks, not lore
const picKey=c=>c.sb&&c.sb.fet?`f:${c.sb.fet.n}|${c.sb.fet.s}`.toLowerCase():`b:${(c.base||c.name||"").trim()}`.toLowerCase();
function picRemember(c,file){state.monPics=Object.assign({},state.monPics);if(file)state.monPics[picKey(c)]=file;else delete state.monPics[picKey(c)]}
function picHtml(c){
  return `<div class="sbpic">${c.introImg?`<figure><img src="/bg/${encodeURIComponent(
    c.introImg)}" alt=""><figcaption><b>On the intro</b> <button type="button" class="btn sm" data-act="loreimgoff">Remove</button></figcaption></figure>`:""}
    <label class="btn sm" tabindex="0">${c.introImg?"Another picture…":
      "Upload a picture…"}<input type="file" id="picFile" accept="image/jpeg,image/png,image/webp" hidden></label>
    <span class="psub">${c.boss?`The tablet shows it when ${esc(c.name)} is revealed.`:
      `Shown in the intro of a boss (⋯ → Make it a boss).`} It's kept for the next ${esc(c.base||c.name)} too.</span></div>`}
async function picUpload(file){const c=byId(sbViewId);if(!c||!file)return;if(file.size>25*1024*1024){toast("The picture must be smaller than 25 MB");return}
  try{const r=await fetch("/bg-upload",{method:"POST",body:file});const d=await r.json();if(!r.ok||!d.file)throw new Error(d.error||"Upload failed");
    c.introImg=d.file;delete c.introImgP;picRemember(c,d.file);commit();renderSbDrawer();
      toast(`${c.name}'s intro shows your picture`)}catch(e){toast(e.message||"Upload failed")}}
function loreHtml(c){
  const d=c.sb.fet&&loreCache.get(c.sb.fet.n+"|"+c.sb.fet.s);if(d===undefined)return `<div class="sblore"><p class="psub">Loading…</p></div>`;
  if(!d||(!d.entries.length&&!d.images.length))return `<div class="sblore"><p class="psub">No lore for this one in your 5e.tools files.</p></div>`;
  const pics=d.images.filter(x=>x.ok),missing=d.images.length&&!pics.length;
  return `<div class="sblore">${pics.length?`<div class="lorepics">${pics.slice(0,4).map(x=>
    `<figure><img src="/5et/img?p=${encodeURIComponent(x.p)}" alt="" loading="lazy"><figcaption>${c.introImg&&c.introImgP===x.p?
    `<b>On the intro</b> <button type="button" class="btn sm" data-act="loreimgoff">Remove</button>`:
    `<button type="button" class="btn sm" data-act="loreimg" data-p="${esc(x.p)}" title="The tablet shows it when ${esc(
    c.name)} is revealed">Use in the intro</button>`}</figcaption></figure>`).join("")}</div>`
      :
        missing?`<p class="psub">There's a picture, but your 5e.tools files don't have the images. Put the 5e.tools image zip (or its img folder) next to the others to see them.</p>`:""}
    <div class="lorebody">${fetEntries(d.entries).slice(0,40).map(l=>`<p>${esc(refPlain(fetTxt(String(l).replace(/\{@filter ([^|}]*)[^}]*\}/g,
      "$1")))).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/(^|\s)\*([^*]+)\*/g,"$1<i>$2</i>")}</p>`).join("")}</div></div>`;
}
/* 61: change a statblock, for this creature or as a new monster in the library */
function sbEditSheet(id){const c=byId(id);if(!c||!c.sb)return;const nm=(c.base||c.name).trim();
  const ac=c.ac??"",hp=c.hpMax??"";
  $("#overlay").innerHTML=
    `<div class="scrim" data-act="close"><div class="sheet sbedit" role="dialog" aria-modal="true" aria-label="Edit the statblock"><h2>Edit the statblock · ${
    esc(c.name)}</h2>
    <div class="sbedtop"><label>Name <input class="field" id="sbEdName" maxlength="60" value="${esc(
      nm)}"></label><label>AC <input class="field" id="sbEdAC" type="number" min="0" max="40" value="${esc(String(ac))}"></label>
      <label>HP <input class="field" id="sbEdHP" type="number" min="1" max="9999" value="${esc(String(hp))}"></label></div>
    <p class="psub">Change any text below: actions, damage, DCs, traits. The counters (Legendary, Recharge, X/Day) are read again from it.</p>
    <textarea class="field mono" id="sbEdRaw" spellcheck="false" rows="18">${esc(c.sb.raw)}</textarea>
    <div class="spacts"><button class="btn" type="button" data-act="close">Cancel</button><button class="btn" type="button" data-act="sbedthis" data-id="${esc(
      id)}">Use for ${esc(c.name)} only</button><button class="btn primary" type="button" data-act="sbednew" data-id="${esc(
      id)}">Save as a new monster</button></div></div></div>`;}
function sbEdRead(){   // the text, with the name, AC and HP boxes written into it
  let raw=$("#sbEdRaw").value;const nm=$("#sbEdName").value.trim(),ac=$("#sbEdAC").value.trim(),hp=$("#sbEdHP").value.trim();
  if(nm)raw=/^\s*#{1,4}\s*.+$/m.test(raw)?raw.replace(/^(\s*#{1,4}\s*).+$/m,`$1${nm}`):`## ${nm}\n${raw}`;
  if(/^\d+$/.test(ac))raw=raw.replace(/(\*\*(?:Armor Class|AC)\*\*\s*)\d+/i,`$1${ac}`);
  if(/^\d+$/.test(hp))raw=raw.replace(/(\*\*(?:Hit Points|HP)\*\*\s*)\d+/i,`$1${hp}`);
  return {raw,nm,x:parseStatblock(raw)};
}
/* the statblock covers the side panel: a line at its foot says what waits underneath, and closes it */
const sbFollow=()=>ls.get("sbFollow",true);
function sbUnderHtml(){
  const call=state.call,pcs=state.list.filter(c=>c.kind==="pc"&&!c.hidden),bits=[];
  if(call){const to=(call.to&&call.to.length?call.to:pcs.map(c=>c.id)),n=to.filter(id=>(call.answers||{})[id]!=null).length;
    bits.push(`Roll call ${n} of ${to.length} in`)}
  const nw=actLog.filter(e=>e.at>logSeen).length;if(nw)bits.push(`${nw} new in Player activity`);
  return bits.length?`<button type="button" class="sbunder" data-act="sbclose" title="Close the statblock to see them">${ic("next")}<span>Under this: ${
    bits.map(esc).join(" · ")}</span></button>`:"";
}
/* Follow the turn: when a monster with a statblock comes up while the drawer is open, the drawer shows it */
function sbFollowTurn(){const t=state.turn&&byId(state.turn.id);
  if(!sbViewId||!sbFollow()||!t||t.id===sbViewId||t.kind==="pc"||!t.sb||!t.sb.raw||t.sb.pc)return;
  sbViewId=t.id;sbCrit=false;sbSaveAsk=null;sbLoreOn=false}
function renderSbDrawer(){
  let el=$("#sbDrawer");const c=sbViewId&&byId(sbViewId);
  if(!c||!c.sb||!c.sb.raw){if(el)el.remove();sbViewId=null;document.body.classList.remove("sbopen");return}
  if(!el){el=document.createElement("aside");el.id="sbDrawer";el.setAttribute("aria-label","Statblock");document.body.appendChild(el)}
  document.body.classList.add("sbopen");
  if(sbLoreOn===null)sbLoreOn=false;
  const keep=el.querySelector(".sbbody")?el.querySelector(".sbbody").scrollTop:0,same=el.dataset.id===c.id&&el.dataset.tab===String(sbLoreOn);
    el.dataset.id=c.id;el.dataset.tab=String(sbLoreOn);
  const pcs=state.list.filter(x=>x.kind==="pc"&&!x.hidden);
  el.innerHTML=`<div class="sbhead"><div><h3>${esc(c.name)}</h3><div class="psub">${[c.hpMax!=null?`HP ${c.hp??c.hpMax}/${c.hpMax}`:"",c.ac!=null?"AC "+c.ac:"",
    c.sb.cr?"CR "+c.sb.cr:""].filter(Boolean).join(" · ")}</div></div>
      <span class="sbheadb">${c.sb.pc?`<button type="button" class="btn sm" data-act="dmsheet" data-id="${esc(
        c.id)}" title="Change the sheet, send it to the phone">Edit sheet…</button>`:
        `<button type="button" class="btn sm" data-act="sbedit" title="Change this statblock, or save it as a new monster">Edit…</button>`}<button type="button" class="btn sm" data-act="sbopen" title="Add monsters">+ Add</button><button type="button" class="icon-btn" data-act="sbclose" aria-label="Close the statblock">${
        I.x}</button></span></div>
    ${c.sb.pc?"":`<label class="sbfollow" title="On a monster's turn, show its statblock here (only while this is open)">
      <input type="checkbox" data-act="sbfollow"${
      sbFollow()?" checked":""}> Follow the turn</label>`}
    ${c.sb.pc?"":`<div class="seg2 sbtabs" role="tablist"><button type="button" role="tab" data-act="sbtab0" aria-pressed="${
      !sbLoreOn}">Statblock</button><button type="button" role="tab" data-act="sblore" aria-pressed="${!!sbLoreOn}" title="${loreOf(c)?"Its lore and pictures":
      "A picture for its intro"}">${loreOf(c)?"Lore & picture":"Picture"}</button></div>`}
    ${sbLoreOn?"":`<div class="sbtools"><div class="seg2" aria-label="Attack rolls">${[["dis","Disadvantage"],["","Normal"],["adv","Advantage"]].map(([k,l])=>
      `<button type="button" data-act="sbadv" data-v="${k}" aria-pressed="${sbAdv===k}">${l}</button>`).join("")}</div>
      ${sbCrit?`<span class="sbcrit">Next damage: critical (dice doubled) <button type="button" class="linkbtn" data-act="sbnocrit">cancel</button></span>`:""}
      <div class="sblog">${sbLog.length?sbLog.map((r,i)=>`<div class="sbl${r.cls?" "+r.cls:
        ""}"><span>${esc(r.who)} · ${esc(r.what)}</span><b>${r.tot}</b><small>${esc(r.how)}</small>${r.cid?
        `<button type="button" class="btn sm sbapply" data-act="sbapply" data-i="${
        i}" title="Pick who it hits; saves are rolled or asked">Apply to targets…</button>`:""}</div>`).join(""):
        (ls.get("sbHintSeen",false)?"":`<p class="psub">Click a bonus to roll the attack, a damage number to roll damage, a saving throw to ask the players. Only you see these rolls.</p>`)}</div></div>
    ${sbSaveAsk?`<div class="sbask"><b>${esc(sbSaveAsk.ab)} save DC ${sbSaveAsk.dc}</b>${sbSaveAsk.n?` <span class="psub">· ${esc(sbSaveAsk.n)}</span>`:""}
      <div class="chipgrid">${pcs.map(p=>`<button type="button" data-act="sbasktgt" data-id="${esc(p.id)}" aria-pressed="${sbSaveAsk.to.includes(p.id)}">${esc(
        p.name)}</button>`).join("")}</div>
      <div class="sbaskb"><button class="btn" type="button" data-act="sbaskno">Cancel</button><button class="btn primary" type="button" data-act="sbasksend" ${
        sbSaveAsk.to.length?"":"disabled"}>Send roll call</button></div></div>`:""}`}
    <div class="sbbody">${sbLoreOn&&!c.sb.pc?picHtml(c)+(loreOf(c)?loreHtml(c):""):sbRender(c.sb.raw)}</div>${sbUnderHtml()}`;
  if(sbLog.length&&!ls.get("sbHintSeen",false))ls.set("sbHintSeen",true);
  if(sbLoreOn&&loreOf(c)&&!loreCache.has(c.sb.fet.n+"|"+c.sb.fet.s))loreGet(c.sb.fet).then(()=>{if(sbViewId===c.id)renderSbDrawer()});
  if(same&&keep){const b=el.querySelector(".sbbody");if(b)b.scrollTop=keep}
}
/* rolling or asking a save from an action spends it: a Recharge goes grey, an N/Day loses one (once per use, not per roll) */
let sbSpent=null;
function sbSpend(c,what,quiet){
  if(!c||!c.sb||!what)return;const sb=c.sb,key=c.id+"|"+what.toLowerCase(),now=Date.now();
  if(sbSpent&&sbSpent.k===key&&now-sbSpent.at<30000){sbSpent.at=now;return}
  const r=(sb.rech||[]).find(x=>x.n.toLowerCase()===what.toLowerCase());
  const u=!r&&(sb.uses||[]).find(x=>x.n.toLowerCase()===what.toLowerCase()||(x.sp||[]).some(y=>y.toLowerCase()===what.toLowerCase()));
  if(!r&&!u)return;sbSpent={k:key,at:now};
  let m;
  if(r){if(r.ready){r.ready=false;commit();m=`${r.n} used · back on ${r.min}${r.min<6?"–6":""}`}else m=`${r.n} hasn't recharged yet`}
  else if(u.used<u.max){u.used++;commit();m=`${u.n} ${u.max-u.used}/${u.max} left`}else m=`no ${u.n} left`;
  if(!quiet)toast(`${c.name}: ${m}`);return m;
}
/* the save in an action's text: "DC 15 Dexterity saving throw … half as much damage on a success" */
function sbActSave(c,name){
  const raw=c&&c.sb&&c.sb.raw||"";if(!raw||!name)return null;
  const L=raw.split(/\n/).map(l=>l.replace(/^\s*>\s?/,"")),i=L.findIndex(l=>l.replace(/[*_]/g,"").trim().toLowerCase().startsWith(name.toLowerCase()));
    if(i<0)return null;
  let txt=L[i];for(let j=i+1;j<L.length&&j<i+4&&!/^\s*(\*\*\*|#|\*\*[A-Z])/.test(L[j]);j++)txt+=" "+L[j];txt=txt.replace(/[*_]/g,"");
  const m=txt.match(/DC (\d+) (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/i)||
    txt.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw:\s*DC (\d+)/i);
  if(!m)return null;const dc=Number(/^\d+$/.test(m[1])?m[1]:m[2]),ab=(/^\d+$/.test(m[1])?m[2]:m[1]).slice(0,3).toLowerCase();
  return {dc,ab:ab.charAt(0).toUpperCase()+ab.slice(1),half:/half as much|half damage|Success: Half/i.test(txt)};
}
/* a damage roll from the statblock goes to the targets: Hit several, filled in, with the save */
function sbApply(i){
  const r=sbLog[i];if(!r)return;const c=byId(r.cid);const sv=sbActSave(c,r.act);
  mtOn=true;mtSel.clear();mt={n:String(r.tot),type:DMG_TYPES.includes(r.dtype)?r.dtype:"",ab:sv?sv.ab:"",dc:sv?String(sv.dc):"",on:sv&&!sv.half?"none":"half",
    modes:{},rolls:{},src:{cid:r.cid,act:r.act}};
  hpPopClose();renderDM();toast(sv?`${r.act}: pick the targets. Monsters roll their ${sv.ab} save; players are asked on their phones`:`${r.act||
    "Damage"}: pick the targets, then Apply`);
}
function sbRoll(t){
  const c=byId(sbViewId);if(!c)return;const who=c.name,what=t.dataset.n||"";sbSpend(c,what);
  if(t.dataset.k==="hit"){const mod=Number(t.dataset.m),a=1+Math.floor(Math.random()*20),b=1+Math.floor(Math.random()*20);
    const d=sbAdv==="adv"?Math.max(a,b):sbAdv==="dis"?Math.min(a,b):a;
    if(!c.hidden&&c.kind!=="pc"){state.react={id:uid(),k:"attack",by:c.name,what,tot:d+mod,at:Date.now()};finish()}   // a Shield moment
    sbLog.unshift({who,what:(what?what+" ":"")+"to hit",tot:d+mod,how:`d20 ${sbAdv?`(${a}, ${b} ${sbAdv})`:`(${d})`} ${mod>=0?"+":"−"} ${Math.abs(mod)}${d===20?
      " · natural 20!":d===1?" · natural 1":""}`,cls:d===20?"n20":d===1?"n1":""});
    if(d===20)sbCrit=true}
  else{const r=sbDice(t.dataset.d,sbCrit);if(!r)return;
    sbLog.unshift({who,cid:c.id,act:what,dtype:(t.dataset.t||"").toLowerCase(),what:(what?what+" ":"")+(t.dataset.t||"damage")+(sbCrit?" (crit)":""),tot:r.tot,
      how:`${r.n}d${r.d} [${r.rolls.join(", ")}]${r.add?(r.add>0?" + ":" − ")+Math.abs(r.add):""}`,cls:sbCrit?"n20":""});sbCrit=false}
  sbLog=sbLog.slice(0,8);renderSbDrawer();
}
const sbFiles=fl=>Promise.all([...fl].filter(f=>/\.(md|markdown|txt)$/i.test(f.name)||/^text\//.test(f.type)).map(f=>f.text()));
/* quick add: "Goblin 14, Orc x2 12 ac13 h, Astrea 18" */
function quickAdd(text){
  const done=[];
  text.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean).forEach(tok=>{
    let words=tok.split(/\s+/),init=null,ac=null,hp=null,count=1,hidden=false,boss=false,kind="enemy";
    words=words.filter(w=>{let m;
      if((m=w.match(/^ac(\d+)$/i))){ac=Number(m[1]);return false}
      if((m=w.match(/^hp(\d+)$/i))){hp=Number(m[1]);return false}
      if((m=w.match(/^x(\d+)$/i))||(m=w.match(/^(\d+)x$/i))){count=Math.max(1,Math.min(12,Number(m[1])));return false}
      if(/^(h|hidden)$/i.test(w)){hidden=true;return false}
      if(/^boss$/i.test(w)){boss=true;return false}
      if(/^ally$/i.test(w)){kind="ally";return false}
      return true});
    if(words.length>1&&/^-?\d+$/.test(words[words.length-1]))init=Number(words.pop());
    const name=words.join(" ");if(!name)return;
    const pc=state.list.find(c=>c.kind==="pc"&&c.name.toLowerCase()===name.toLowerCase());
    if(pc){if(init!=null){pc.init=init;freshIds.add(pc.id)}done.push(pc.name);return}
    const party=partyStats(name);
    if(party){state.list.push(newCombatant({name:party.name,base:party.name,kind:"pc",ac:party.ac??null,cls:party.cls||"",init}));done.push(party.name);return}
    const existing=state.list.filter(c=>c.base===name).length;
    for(let k=0;k<count;k++){const nm=count>1||existing?`${name} ${String.fromCharCode(65+existing+k)}`:name;
      state.list.push(newCombatant({name:nm,base:name,kind,init,ac,hidden,boss,...(hp?{hp,hpMax:hp}:{})}));done.push(nm)}
  });
  if(done.length){if(state.ended)state.ended=null;commit();toast("Added: "+done.join(", "))}
}
/* keyboard: pick a row, then act on it */
let selId=null;
function selRows(){return [...document.querySelectorAll("#roster .row[data-id]")].filter(r=>r.dataset.id!=="__lair")}
function markSel(){document.querySelectorAll("#roster .row").forEach(r=>r.classList.toggle("sel",r.dataset.id===selId));
  const r=document.querySelector(`#roster .row.sel`);r&&r.scrollIntoView({block:"nearest"})}
