/* ---- Atmosphere: start from a theme, change any part, look at the preview, then send it to the tablet ---- */
let atmoD=null,atmoT="surface";   // the draft: {theme, look, scene, bg, bgDim, mfont}; and which screen it's for
const myThemes=()=>{const v=ls.get("myThemes",[]);return Array.isArray(v)?v:[]};
/* the TV has its own look, or the tablet's */
const tvOwn=()=>!!(state.tv&&state.tv.look&&state.tv.look.same===false);
const atmoCur=()=>atmoT==="tv"&&tvOwn()?state.tv.look:state;   // what that screen shows now
const ATMO_KEYS=st=>({theme:st.theme||"tavern",look:Object.assign({},st.look||{}),scene:st.scene||"none",bg:st.bg||"",bgDim:st.bgDim??.45,mfont:st.mfont||"B",
  lite:!!st.lite,weather:st.weather||"none",tod:st.tod||"none",tune:JSON.parse(JSON.stringify(st.tune||{}))});
const tuneOf=(d,sc)=>{const t=(d.tune||{})[sc||d.scene||"none"];return Array.isArray(t)?[Number(t[0])||1,Number(t[1])||1]:[1,
  1]};   // K3: [density, speed] for one scene
const tuneKey=d=>JSON.stringify(Object.entries(d.tune||{}).filter(([,v])=>Array.isArray(v)&&(v[0]!==1||v[1]!==1)).sort())
function atmoFromState(){const d=ATMO_KEYS(atmoCur());if(atmoT==="tv")d.same=!tvOwn();return d}
const lookKey=d=>JSON.stringify([d.theme,lookOf(d),d.scene,d.bg||"",Math.round((d.bgDim??.45)*100),d.weather||"none",d.tod||"none",tuneKey(d)]);
function atmoChanged(){
  if(!atmoD)return [];const cur=atmoCur(),a=lookOf(atmoD),b=lookOf(cur),out=[];
  if(atmoT==="tv"&&!!atmoD.same!==!tvOwn())out.push(atmoD.same?"same as the tablet":"its own look");
  if(atmoT==="tv"&&atmoD.same)return out;
  const state=cur;   // compare with that screen
  if((atmoD.mfont||"B")!==(state.mfont||"B"))out.push("big moments font");if(!!atmoD.lite!==!!state.lite)out.push("light mode");
  if((atmoD.theme||"tavern")!==(state.theme||"tavern"))out.push("theme");if(a.pal!==b.pal)out.push("colours");if(a.font!==b.font)out.push("names font");
    if(a.tfont!==b.tfont)out.push("title font");
  if(a.rows!==b.rows)out.push("rows");if((atmoD.scene||"none")!==(state.scene||"none"))out.push("scene");if((atmoD.bg||"")!==(state.bg||""))out.push("picture");
  if(Math.round((atmoD.bgDim??.45)*100)!==Math.round((state.bgDim??.45)*100))out.push("darken");
  if((atmoD.weather||"none")!==(state.weather||"none"))out.push("weather");if((atmoD.tod||"none")!==(state.tod||"none"))out.push("time of day");
    if(tuneKey(atmoD)!==tuneKey(state))out.push("calm or wild");return out;
}
function atmoLabel(st){const th=themeOf(st.theme||"tavern"),L=st.look||{},own=Object.keys(L).some(k=>L[k]);return th[1]+(own?" (changed)":"")}
function atmoSheet(){
  if(tvPopOn){tvPopOn=false;tvBarRender()}
  if(!atmoD)atmoD=atmoFromState();
  const tv=atmoT==="tv",layout=state.layout||"auto",land=tv||layout==="landscape";
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet atmo atmo2${tv?" fortv":
    ""}" role="dialog" aria-modal="true" aria-label="Atmosphere"><h2>Atmosphere <span class="seg2 atabs">${[["surface","Tablet"],["tv","TV"]].map(([k,l])=>
    `<button type="button" data-act="atmotab" data-v="${k}" aria-pressed="${atmoT===k}">${l}</button>`).join("")}</span></h2>
    <div class="acol">${atmoColHtml()}</div>
    <div class="aprev">
      <div class="aplbl"><b>Preview · only you see it</b><span>${tv?"TV · 16:9":land?"landscape":"portrait"}</span></div>
      <div class="apfrm${land?" land":""}${tv?" tv":""}"><iframe id="atmoFrame" title="Preview of the ${tv?"TV":"tablet"}" src="/players?shared=1&preview=1${tv?
        "&screen=tv":""}" tabindex="-1"></iframe></div>
      <div id="apNow">${atmoNowHtml()}</div>
      <div style="display:flex;justify-content:flex-end"><button class="btn" type="button" data-act="atmoclose">Close</button></div>
    </div></div></div>`;
  const fr=$("#atmoFrame");if(fr){fr.addEventListener("load",atmoPost);atmoFit()}
  atmoWire();
}
function atmoWire(){const tf=$("#aTfont");if(tf)tf.addEventListener("change",()=>{atmoSet("tfont",tf.value)})}
function atmoNowHtml(){const ch=atmoChanged(),tv=atmoT==="tv",cur=atmoCur(),scr=tv?"TV":"tablet";
  return `<div class="apnow">On the ${scr} now: <b>${tv&&!tvOwn()?"same as the tablet":esc(atmoLabel(cur))}</b>${tv&&!tvOwn()?"":` · ${esc((SCENES.find(x=>
    x[0]===(cur.scene||"none"))||["",""])[1])}${cur.bg?" · picture":""}`}<br>${ch.length?`Changed here: <i>${esc(ch.join(", "))}</i>`:
    "Nothing changed yet"}</div>
      <div class="apgo"><button class="btn primary" type="button" data-act="atmogo"${ch.length?"":
        " disabled"}>Show on the ${scr}</button><button class="btn" type="button" data-act="atmodiscard"${ch.length?"":" disabled"}>Discard</button></div>`}
const MFONTS=[["B","Alegreya","'Alegreya SC'","'Alegreya Sans'"],["A","Cinzel","'Cinzel'","'Cinzel'"],["C","Cormorant","'Cormorant SC'","'Cormorant SC'"],["D",
  "Marcellus + Philosopher","'Marcellus SC'","'Philosopher'"],["E","IM Fell","'IM Fell English SC'","'IM Fell English SC'"],["F","Didot + Cinzel","'GFS Didot'",
  "'Cinzel'"],["T","The theme's fonts","var(--display)","var(--tdisplay,var(--display))"]];
function atmoColHtml(){
  if(atmoT==="tv"&&
    atmoD.same)return `<div class="asec"><div class="eyebrow2">The TV's look</div><p>The TV shows the same theme, fonts, scene and picture as the tablet.</p>
    <button type="button" class="btn primary" data-act="atvown">Give the TV its own look</button><p class="psub">Then pick everything for the TV here, look at the preview, and Show on the TV. The tablet stays as it is.</p></div>${
      tvExtraHtml()}`;
  const d=atmoD,lk=lookOf(d),sc=d.scene||"none",dim=Math.round((d.bgDim??.45)*100),react=state.sceneReact!==false,ch=atmoChanged(),mine=myThemes();
  const thBtn=t=>{const [k,l,,f]=t,P=PALS[k][1],F=FONTS.find(x=>x[0]===f);
    return `<button type="button" class="thc${THEME_NEW.has(k)?" new":""}" data-act="athm" data-v="${k}" aria-pressed="${d.theme===k&&!Object.keys(d.look||{
    }).some(x=>d.look[x])}"><i style="background:${P[0]};color:${P[1]};font-family:${F?F[2]:"inherit"}">Aa</i><span>${esc(l)}</span></button>`};
  const seg=(act,items,cur)=>items.map(([k,l])=>`<button type="button" data-act="${act}" data-v="${esc(k)}" aria-pressed="${cur===
    k}">${esc(l)}</button>`).join("");
  const layout=state.layout||"auto";
  return `
      <div class="asec"><div class="eyebrow2">Start from a theme <small>fills everything below; then change any part</small></div>
        <div class="thgrid">${THEMES.map(thBtn).join("")}${mine.map(m=>`<span class="thmine"><button type="button" class="thc" data-act="amine" data-id="${esc(
          m.id)}"><i style="background:${(PALS[(m.look||{}).pal||m.theme]||PALS.tavern)[1][0]};color:${(PALS[(m.look||{}).pal||m.theme]||
          PALS.tavern)[1][1]}">★</i><span>${esc(m.name)}</span></button><button type="button" class="x" data-act="aminerm" data-id="${esc(
          m.id)}" aria-label="Delete ${esc(m.name)}">${I.x}</button></span>`).join("")}</div></div>
      <div class="asec"><div class="eyebrow2">Colours</div><div class="palrow">${Object.entries(PALS).map(([k,[l,c]])=>
        `<button type="button" data-act="apal" data-v="${k}" aria-pressed="${lk.pal===k}"><b>${c.map(x=>
        `<u style="background:${x}"></u>`).join("")}</b>${esc(l)}</button>`).join("")}</div></div>
      <div class="asec"><div class="eyebrow2">Names font <small>how the names in the order look</small></div><div class="fntgrid">${FONTS.map(([k,l,f])=>
        `<button type="button" data-act="afont" data-v="${k}" aria-pressed="${lk.font===
        k}"><b style="font-family:${f}">Kobold B</b><small>${esc(l)}</small></button>`).join("")}</div></div>
      <div class="atwo">
        <div class="asec"><div class="eyebrow2">Title &amp; round font</div><select class="field" id="aTfont">${FONTS.map(([k,l])=>
          `<option value="${k}"${lk.tfont===k?" selected":""}>${esc(l)}</option>`).join("")}</select></div>
        <div class="asec"><div class="eyebrow2">Rows</div><div class="seg4">${seg("arows",ROWSTYLES,lk.rows)}</div></div>
      </div>
      <div class="asec"><div class="eyebrow2">Scene <small>animated, plays over the background</small></div><div class="scenegrid">${SCENES.map(([k,l])=>
        `<button type="button" class="scard sc-${k}${SCENE_NEW.has(k)?" new":""}" data-act="scenepick" data-s="${k}" aria-pressed="${sc===
        k}"><i></i><span>${esc(l)}</span></button>`).join("")}</div>
        ${sc!=="none"||(d.weather||"none")!=="none"?(()=>{const t=tuneOf(d,sc),dn=Math.round(t[0]*100),sp=Math.round(t[1]*100);
          return `<div class="atune"><span class="psub">${sc!=="none"?`For ${esc((SCENES.find(x=>x[0]===sc)||["",""])[1])}`:"For the weather"}</span>
          <label class="rangerow">Calm <input type="range" id="aDen" min="30" max="200" step="10" value="${
            dn}" aria-label="How much there is"> Wild <b id="aDenV">${dn}%</b></label>
          <label class="rangerow">Slow <input type="range" id="aSpd" min="30" max="250" step="10" value="${
            sp}" aria-label="How fast it moves"> Fast <b id="aSpdV">${sp}%</b></label>
          ${dn!==100||sp!==100?`<button type="button" class="linkbtn" data-act="atunereset">Back to normal</button>`:""}</div>`})():""}</div>
      <div class="atwo even">
        <div class="asec"><div class="eyebrow2">Weather <small>over any scene or your picture</small></div><div class="seg4 segwrap">${seg("aweather",WEATHERS,
          d.weather||"none")}</div></div>
        <div class="asec"><div class="eyebrow2">Time of day</div><div class="seg4 segwrap">${seg("atod",TODS,d.tod||"none")}</div></div>
      </div>
      <div class="asec"><div class="eyebrow2">Your own background picture</div>
        <div class="bggrid"><button type="button" class="bgcard" data-act="bgpick" data-f="" aria-pressed="${!d.bg}">None</button>${(bgFiles||[]).map(f=>
          `<span class="bgwrap"><button type="button" class="bgcard" data-act="bgpick" data-f="${esc(f)}" aria-pressed="${d.bg===
          f}" aria-label="Use this picture" style="background-image:url(/bg/${encodeURIComponent(
          f)})"></button><button type="button" class="bgdel" data-act="bgdel" data-f="${esc(f)}" aria-label="Delete this picture">${
          I.x}</button></span>`).join("")}
          <label class="bgcard add" tabindex="0">+ Upload<input type="file" id="bgFile" accept="image/jpeg,image/png,image/webp" hidden></label></div>
        <label class="rangerow">Darken <input type="range" id="bgDim" min="0" max="85" step="5" value="${dim}"><b id="bgDimV">${dim}%</b></label></div>
      <div class="asec"><div class="eyebrow2">Big moments font <small>“How do you want to do this?”, countdowns at 0</small></div><div class="fntgrid">${
        MFONTS.map(([k,l,n,q])=>`<button type="button" data-act="amfont" data-v="${k}" aria-pressed="${(d.mfont||"B")===
        k}"><b style="font-family:${n}">Mira,</b><small style="display:block;font-family:${q};font-size:.85rem;${k==="A"||k==="F"?
        "text-transform:uppercase;letter-spacing:.08em;":""}color:var(--fg)">how do you want…</small><small>${esc(l)}</small></button>`).join("")}</div></div>
      ${atmoT==="tv"?`<div class="asec"><label class="chk"><input type="checkbox" id="aLite"${d.lite?" checked":
        ""}> Light mode: no animated scene, simple changes (for a slow TV browser)</label>
        <button type="button" class="linkbtn" data-act="atvsame">Use the tablet's look again</button></div>`:""}
      <div class="asec"><div class="eyebrow2">Save this look</div><form id="aSaveForm" class="asave" autocomplete="off"><input class="field" id="aSaveName" maxlength="30" placeholder="e.g. Curse of Strahd"><button class="btn" type="submit">Save as my theme</button></form></div>
      ${atmoT==="tv"?tvExtraHtml():`<details class="asec amore"><summary class="eyebrow2">Screen: layout, text size, boss reactions</summary>
        <div class="seg2">${[["auto","Auto"],["portrait","Portrait"],["landscape","Landscape"]].map(([k,l])=>
          `<button type="button" data-act="layoutpick" data-v="${k}" aria-pressed="${layout===k}">${l}</button>`).join("")}</div>
        <label class="rangerow">Text size <input type="range" id="textSize" min="80" max="130" step="5" value="${Math.round((Number(state.textSize)||
          1)*100)}"><b id="textSizeV">${Math.round((Number(state.textSize)||1)*100)}%</b></label>
        <p class="psub">These change the tablet straight away.</p></details>`}
      <div class="asec"><div class="eyebrow2">The scene reacts to <small>on the tablet and the TV, straight away</small></div>
        <div class="chipgrid sfxchips">${SFX.map(([k,l])=>`<button type="button" data-act="sfxtoggle" data-k="${k}" aria-pressed="${sfx(k)}">${esc(
          l)}</button>`).join("")}</div>
        <p class="psub">Spells play in the scene when you use Hit several from a statblock, “In the scene” in Ctrl+K, or a player taps “Show it on the table” on their phone. Battlefield spells like Fog Cloud or Darkness stay while their effect lasts. A TV in Light mode and screens set to reduce motion skip all of this.</p></div>`;
}
function tvExtraHtml(){const T=state.tv||{};return `<div class="asec"><div class="eyebrow2">TV in a fight</div><div class="seg2">${[["A",
  "Spotlight · On deck at the side"],["B","Spotlight · On deck below"]].map(([k,l])=>
  `<button type="button" data-act="tvlayout" data-v="${k}" aria-pressed="${(T.layout||"A")===k}">${l}</button>`).join("")}</div>
  <p class="psub">These change the TV straight away. Modes, title card, pause and what shows where are in the TV button at the top.</p></div>`}
function atmoFit(){const fr=$("#atmoFrame"),box=fr&&fr.parentElement;if(!box)return;
  const tv=box.classList.contains("tv"),land=box.classList.contains("land"),W=tv?1920:land?1368:912,H=tv?1080:land?912:1368,s=box.clientWidth/W;
  fr.style.width=W+"px";fr.style.height=H+"px";fr.style.transform=`scale(${s})`;box.style.height=H*s+"px"}
function atmoPost(){const fr=$("#atmoFrame");if(fr&&fr.contentWindow&&atmoD)fr.contentWindow.postMessage({t:"lookdraft",d:atmoD},location.origin)}
function atmoRefresh(){   // the controls and the preview, without reloading the preview
  const col=$(".sheet.atmo2 .acol");if(!col){atmoSheet();return}
  const top=col.scrollTop,op=col.querySelector(".amore")&&col.querySelector(".amore").open;
  col.innerHTML=atmoColHtml();col.scrollTop=top;if(op)col.querySelector(".amore").open=true;
  const n=$("#apNow");if(n)n.innerHTML=atmoNowHtml();atmoWire();atmoPost();
}
function atmoSet(part,v){   // one part changed by hand: it stays over whatever theme is picked
  const th=themeOf(atmoD.theme),def={pal:th[0],rows:th[0],font:th[3],tfont:th[4]}[part];
  atmoD.look=Object.assign({},atmoD.look);if(v===def)delete atmoD.look[part];else atmoD.look[part]=v;atmoRefresh();
}
function atmoTheme(k){const th=themeOf(k);atmoD.theme=th[0];atmoD.look={};atmoD.scene=th[2];atmoRefresh()}
function atmoGo(){
  if(!atmoD)return;
  if(atmoT==="tv"){const T=state.tv=Object.assign({},state.tv);
    if(atmoD.same)delete T.look;else{const L={};for(const k in atmoD.look||{})if(atmoD.look[k])L[k]=atmoD.look[k];
      T.look={same:false,theme:atmoD.theme,look:L,scene:atmoD.scene,bg:atmoD.bg||"",bgDim:atmoD.bgDim??.45,mfont:atmoD.mfont||"B",lite:!!atmoD.lite,weather:
        atmoD.weather||"none",tod:atmoD.tod||"none",tune:atmoD.tune||{}}}
    commit();toast(atmoD.same?"The TV shows the tablet's look":"On the TV: "+atmoLabel(T.look));atmoRefresh();return}
  state.mfont=atmoD.mfont||"B";state.theme=atmoD.theme;const L={};for(const k in atmoD.look||{})if(atmoD.look[k])L[k]=atmoD.look[k];
  if(Object.keys(L).length)state.look=L;else delete state.look;
  state.scene=atmoD.scene;state.bg=atmoD.bg||"";state.bgDim=atmoD.bgDim??.45;state.weather=atmoD.weather||"none";state.tod=atmoD.tod||"none";
    state.tune=atmoD.tune||{};commit();toast("On the tablet: "+atmoLabel(state));atmoRefresh();
}
async function uploadBg(file){
  if(!file)return;if(file.size>25*1024*1024){toast("The picture must be smaller than 25 MB");return}
  toast("Uploading the picture…");
  try{const r=await fetch("/bg-upload",{method:"POST",body:file});const d=await r.json();if(!r.ok)throw new Error(d.error||"Upload failed");
    await loadBgList();if(atmoD&&$(".sheet.atmo")){atmoD.bg=d.file;atmoRefresh();
      toast("Picture uploaded: see the preview, then Show on the tablet")}else{state.bg=d.file;commit();toast("Background picture set")}}
  catch(e){toast(e.message||"Upload failed")}
}
function titleSheet(id){
  const c=byId(id);if(!c)return;
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true"><h2>Intro title · ${esc(c.name)}</h2>
    <form id="titleForm" data-id="${esc(c.id)}" autocomplete="off" class="psec"><input class="field big" id="titleText" maxlength="60" value="${esc(c.title||
      "")}" placeholder="e.g. God of Storms" aria-label="Title">
      <p class="psub">Shown under the name when the boss enters.</p>
      <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" type="button" data-act="close">Cancel</button><button class="btn primary" type="submit">Save</button></div></form></div></div>`;
  setTimeout(()=>{const x=$("#titleText");x&&x.focus();x&&x.select()},0);
}
function knowSheet(id){
  const c=byId(id);if(!c)return;
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true"><h2>What the party knows · ${esc(c.name)}</h2>
    <form id="knowForm" data-id="${esc(c.id)}" autocomplete="off" class="psec">
      <div class="seg2" id="knowKind">${["Immune","Resistant","Vulnerable","Note"].map((k,i)=>
        `<button type="button" data-act="kkind" data-k="${k}" aria-pressed="${i===0}">${k}</button>`).join("")}</div>
      <input class="field big" id="knowText" list="dmgList" maxlength="40" placeholder="Poison" aria-label="Damage type or note">
      <datalist id="dmgList">${["Acid","Bludgeoning","Cold","Fire","Force","Lightning","Necrotic","Piercing","Poison","Psychic","Radiant","Slashing","Thunder",
        "Nonmagical attacks","Charmed","Frightened"].map(x=>`<option value="${x}">`).join("")}</datalist>
      <button class="btn primary" type="submit">Show to players</button></form>
    <div class="chipgrid">${(c.know||[]).map((k,i)=>`<span class="pchip">${esc(k)}<button type="button" class="x" data-act="knowrm" data-id="${esc(
      c.id)}" data-i="${i}" aria-label="Remove">${I.x}</button></span>`).join("")}</div>
    ${c.sb&&(c.sb.know||[]).some(k=>!(c.know||[]).includes(k))?
      `<div class="psec"><div class="eyebrow2">From the statblock · tap to show to players</div><div class="chipgrid">${c.sb.know.filter(k=>!(c.know||
      []).includes(k)).map(k=>`<button type="button" data-act="sbknow" data-id="${esc(c.id)}" data-k="${esc(k)}">${esc(k)}</button>`).join("")}</div></div>`:""}
    <div style="display:flex;justify-content:flex-end"><button class="btn primary" type="button" data-act="close">Done</button></div></div></div>`;
  setTimeout(()=>{const x=$("#knowText");x&&x.focus()},0);
}
/* the Lair Actions and Regional Effects sections of a statblock: a list of actions to pick from on initiative 20 */
function parseLair(text){
  const out={lair:[],lairIntro:"",reg:[]};let sec="",lines={lair:[],reg:[]};
  const clean=l=>l.replace(/^\s*[-•]\s+/,"").replace(/^\*{2,3}(.+?)\*{2,3}\s*/,(m,n)=>n.replace(/[.:]$/,"")+". ").replace(/\*\*\*|\*\*|\*|__|`/g,"").trim();
  refPlain(text).split(/\r?\n/).map(l=>l.replace(/^\s*>\s?/,"").trimEnd()).forEach(l=>{
    const h=l.match(/^#{2,}\s*(.+)/);if(h){const t=h[1].replace(/\*/g,"").trim();
      sec=/^lair actions?$/i.test(t)?"lair":/^regional effects?$/i.test(t)?"reg":"";return}
    if(sec&&l.trim())lines[sec].push({item:/^\s*[-•]\s/.test(l),t:clean(l)})});
  const L=lines.lair;
  if(L.some(x=>x.item)){out.lair=L.filter(x=>x.item).map(x=>x.t);out.lairIntro=L.filter(x=>!x.item).map(x=>x.t).join(" ")}
  else if(L.length){const intro=/initiative count 20|lair action/i.test(L[0].t)&&L.length>1;out.lairIntro=intro?L[0].t:"";
    out.lair=L.slice(intro?1:0).map(x=>x.t)}
  out.reg=lines.reg.map(x=>(x.item?"• ":"")+x.t);
  out.lair=out.lair.slice(0,12).map(t=>t.slice(0,600));out.reg=out.reg.slice(0,12).map(t=>t.slice(0,600));out.lairIntro=out.lairIntro.slice(0,400);
  return out;
}
