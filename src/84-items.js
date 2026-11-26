/* ---------- items and coins on the laptop: who carries what, giving items, the party's loot, and what the phones send ---------- */
const INV_ACTS=new Set(["coins","item_add","item_set","item_use","item_ch","item_give","item_drop","loot_take"]);
const COIN_CP={gp:100,sp:10,cp:1};
const invK=n=>String(n||"").trim().toLowerCase();
function invGet(name){if(!state.inv||typeof state.inv!=="object"||Array.isArray(state.inv))state.inv={};const k=invK(name);let e=state.inv[k];
  if(!e||typeof e!=="object")e=state.inv[k]={c:{gp:0,sp:0,cp:0},it:[],v:0};e.c=coinsOf(e.c);if(!Array.isArray(e.it))e.it=[];return e}
const invPeek=name=>{const e=state.inv&&state.inv[invK(name)];return e&&typeof e==="object"?e:null};
const lootTaken={};   // who took what from the loot, for a second player who taps Take on it
const invBump=e=>{e.v=Math.max(Date.now(),(Number(e.v)||0)+1)};
function lootGet(){let l=state.loot;if(!l||typeof l!=="object")l=state.loot={c:{gp:0,sp:0,cp:0},it:[]};l.c=coinsOf(l.c);
  if(!Array.isArray(l.it))l.it=[];return l}
/* phones learn whose items changed (each fetches only its own, from /inv) */
function invSync(){const I=state.inv&&typeof state.inv==="object"?state.inv:{};
  state.invv=Object.fromEntries(Object.entries(I).filter(([,e])=>e&&typeof e==="object").map(([k,e])=>[k,Number(e.v)||0]));
  if(MODE==="dm"&&partyTab==="inv"&&$("#overlay .partysheet")){const a=document.activeElement;if(!a||!a.closest||!a.closest("#overlay input,#overlay select"))
    setTimeout(()=>{if(partyTab==="inv"&&$("#overlay .partysheet"))partySheet()},0)}}
/* an item as the app keeps it: only these fields, each checked */
function itemNorm(x){if(!x||typeof x!=="object")return null;const n=String(x.n||"").trim().slice(0,60);if(!n)return null;
  const it={n,q:Math.max(1,Math.min(999,Math.floor(Number(x.q)||1)))};
  [["ty",30],["r",20],["d",3000],["src",20],["un",60],["ud",400]].forEach(([k,m])=>{if(x[k]!=null&&String(x[k]).trim())it[k]=String(x[k]).trim().slice(0,m)});
  if(x.att)it.att=true;if(x.unk)it.unk=true;
  if(x.ch&&Number(x.ch.m)>0){const m=Math.min(99,Math.floor(Number(x.ch.m))),c=x.ch.c==null||x.ch.c===""?m:Math.floor(Number(x.ch.c))||0;
    it.ch={m,c:Math.max(0,Math.min(m,c)),re:ITEM_RE[x.ch.re]?x.ch.re:"",amt:x.ch.amt&&diceOk(x.ch.amt)?diceNorm(x.ch.amt):""}}
  if(x.heal&&diceOk(x.heal))it.heal=diceNorm(x.heal);
  if(x.wpn&&diceOk(x.wpn.dmg)){it.wpn={dmg:diceNorm(x.wpn.dmg),dt:String(x.wpn.dt||"").trim().slice(0,15)};if(x.wpn.f)it.wpn.f=true;if(x.wpn.rg)it.wpn.rg=true;
    const b=Math.max(-5,Math.min(10,parseInt(x.wpn.b,10)||0));if(b)it.wpn.b=b}
  ["acb","svb"].forEach(k=>{const v=Math.max(-5,Math.min(10,parseInt(x[k],10)||0));if(v)it[k]=v});
  const sp=(Array.isArray(x.sp)?x.sp:[]).map(s=>String(s).trim().slice(0,40)).filter(Boolean).slice(0,4);if(sp.length)it.sp=sp;
  return it}
/* what a phone sent, done on the laptop (the server already checked it is that player's own item, the loot's, or someone in the fight) */
function invApply(a,c,note){
  const e=invGet(c.name),it=a.iid?e.it.find(x=>x.id===a.iid):null;
  switch(a.action){
    case "coins":{const d=a.d||{},plus={};let neg=0;COINS.forEach(([k])=>{const v=Number(d[k])||0;if(v>0)plus[k]=v;else if(v<0)neg+=-v*COIN_CP[k]});
      if(a.to){const to=byId(a.to);if(!to||to.kind!=="pc"||to.id===c.id||neg)return;const left=coinPay(e.c,coinCp(plus));
        if(!left){note(`${c.name} wanted to give ${to.name} ${coinTxt(plus)}, but doesn't have it`);return}
        e.c=left;const te=invGet(to.name);COINS.forEach(([k])=>te.c[k]+=plus[k]||0);te.cn={at:Date.now(),t:`${coinTxt(plus)} from ${c.name}`};invBump(e);
          invBump(te);
        note(`${c.name} gives ${to.name} ${coinTxt(plus)}`);return}
      COINS.forEach(([k])=>e.c[k]+=plus[k]||0);
      if(neg){const left=coinPay(e.c,neg);if(!left){invBump(e);note(`${c.name} can't pay ${gpTxt(neg)}: not enough coins`);return}e.c=left}
      invBump(e);note(`${c.name}: ${Object.keys(plus).length?"+ "+coinTxt(plus):`− ${gpTxt(neg)}`} → ${coinTxt(e.c)}`);return}
    case "item_add":{const x=itemNorm(a.item);if(!x)return;delete x.unk;delete x.un;delete x.ud;x.id=uid();e.it.push(x);let paid="";
      if(a.pay){const price=coinCp(a.pay),left=coinPay(e.c,price);if(left){e.c=left;paid=` for ${gpTxt(price)}`}else paid=` (couldn't pay ${gpTxt(price)})`}
      invBump(e);note(`${c.name} adds ${x.n}${x.q>1?" ×"+x.q:""}${paid}`);return}
    case "item_set":{if(!it)return;if(a.eq!=null){if(a.eq)it.eq=true;else delete it.eq}
      if(a.at!=null){if(a.at&&!it.at&&e.it.filter(x=>x.at).length>=3)return;if(a.at)it.at=true;else delete it.at}invBump(e);return}
    case "item_use":{if(!it)return;
      if(it.ch){it.ch.c=Math.max(0,(Number(it.ch.c)||0)-a.n);note(`${c.name} uses ${it.n}: ${a.n} charge${a.n>1?"s":""}, ${it.ch.c} left`)}
      else{const q=Math.min(a.n,it.q);it.q-=q;if(it.q<1)e.it=e.it.filter(x=>x!==it);note(`${c.name} ${it.heal?"drinks":"uses"} ${it.n}`)}
      invBump(e);return}
    case "item_ch":{if(!it||!it.ch)return;it.ch.c=Math.max(0,Math.min(it.ch.m,a.c));invBump(e);return}
    case "item_give":{if(!it)return;const to=byId(a.to);if(!to||to.kind!=="pc"||to.id===c.id)return;const q=Math.min(a.q,it.q),te=invGet(to.name);
      const moved=Object.assign(JSON.parse(JSON.stringify(it)),{id:uid(),q,from:c.name,got:Date.now()});delete moved.eq;delete moved.at;delete moved.rv;
      it.q-=q;if(it.q<1)e.it=e.it.filter(x=>x!==it);te.it.push(moved);invBump(e);invBump(te);note(`${c.name} gives ${to.name} ${it.n}${q>1?" ×"+q:""}`);return}
    case "item_drop":{if(!it)return;const q=Math.min(a.q,it.q);it.q-=q;if(it.q<1)e.it=e.it.filter(x=>x!==it);invBump(e);note(`${c.name} drops ${it.n}`);return}
    case "loot_take":{const L=lootGet(),x=L.it.find(y=>y.id===a.iid);
      if(!x){const w=lootTaken[a.iid];e.cn={at:Date.now(),t:w?`${w.by} took ${w.n} first`:"That's no longer in the loot"};invBump(e);return}
      lootTaken[a.iid]={by:c.name,n:x.unk?x.un||"Unknown item":x.n};   /* an unidentified one only by its cover */
      L.it=L.it.filter(y=>y!==x);x.from="loot";delete x.got;e.it.push(x);invBump(e);
        note(`${c.name} takes ${x.n} from the loot`);
      return}
  }}
/* the DM gives an item: to players (each gets one, with a note on the phone), or to the party's loot */
function dmGive(targets,base,o){
  const names=[];let n=0;
  targets.forEach(tg=>{const x=itemNorm(Object.assign({},base,{q:o.q}));if(!x)return;delete x.unk;delete x.un;delete x.ud;x.id=uid();
    if(o.unk){x.unk=true;x.un=String(o.un||"").trim().slice(0,60)||"Unknown item";const ud=String(o.ud||"").trim().slice(0,400);if(ud)x.ud=ud}
    if(tg==="loot"){lootGet().it.push(x);names.push("the party's loot");n++;return}
    const c=byId(tg);if(!c||c.kind!=="pc")return;x.from="the DM";x.got=Date.now();const e=invGet(c.name);e.it.push(x);invBump(e);names.push(c.name);n++});
  if(!n)return false;
  const pcs=names.filter(x=>x!=="the party's loot"),shown=o.unk?String(o.un||"").trim()||"Unknown item":String(base.n);
  if(o.tv&&pcs.length)state.itemFx={id:uid(),at:Date.now(),who:pcs.join(", "),n:shown};
  /* not in the combat recap: its lines reach the TV's round summary */
  commit();toast(`${base.n}${o.q>1?" ×"+o.q:""} → ${names.join(", ")}`);return true}

/* ---------- Party → Gold and items ---------- */
let partyTab="num",dShare={n:"",k:"gp"},dCoinEd=null,dItemMenu=null;
function invPartyHtml(){
  const pcs=sorted().filter(c=>c.kind==="pc"),L=lootGet(),N=pcs.length,n=parseInt(dShare.n,10)||0,each=N?Math.floor(n/N):0,rest=N?n-each*N:0;
  const chip=(owner,x)=>`<button type="button" class="ichip${x.unk?" unk":x.r||x.ch||x.att?" mag":
    ""}" data-act="dinv" data-op="menu" data-n="${esc(owner)}" data-id="${
    esc(x.id)}" aria-expanded="${!!(dItemMenu&&dItemMenu.id===x.id)}" title="${esc(x.unk?`Shown to the player as “${x.un||"Unknown item"}”`:
      itemLine(x))}">${esc(
    x.n)}${x.q>1?` <small>×${x.q}</small>`:""}${x.ch?` <small>${x.ch.c}/${x.ch.m}</small>`:""}${x.at?" <small>attuned</small>":x.eq?
      " <small>equipped</small>":""}${x.unk?
    ` <small>unidentified</small>`:""}</button>`;
  const menu=(owner,list)=>{const x=dItemMenu&&dItemMenu.n===owner&&list.find(y=>y.id===dItemMenu.id);if(!x)return "";const loot=owner==="__loot";
    return `<div class="imenu"><b>${esc(x.n)}</b><span class="psub">${esc(x.unk?`the player sees “${x.un||"Unknown item"}”`:itemLine(x)||"Item")}</span>
      ${x.unk&&!loot?`<button type="button" class="btn sm" data-act="dinv" data-op="reveal" data-n="${esc(owner)}" data-id="${esc(
        x.id)}">Reveal it</button>`:""}
      ${loot?pcs.map(c=>`<button type="button" class="btn sm" data-act="dinv" data-op="lootto" data-to="${esc(c.id)}" data-id="${esc(x.id)}">To ${esc(
        c.name)}</button>`).join(
        ""):`<button type="button" class="btn sm" data-act="dinv" data-op="toloot" data-n="${esc(owner)}" data-id="${esc(x.id)}">Move to the loot</button>`}
      <button type="button" class="btn sm" data-act="dinv" data-op="rm" data-n="${esc(owner)}" data-id="${esc(
        x.id)}" title="Click twice">Remove</button></div>`};
  const coinEd=nm=>dCoinEd===nm?`<div class="icoined">${COINS.map(([k])=>
    `<label>${k}<input class="field" type="number" min="0" max="999999" inputmode="numeric" id="dCoin-${
    k}" aria-label="${k}"></label>`).join("")}<button type="button" class="btn sm" data-act="dinv" data-op="coinadd" data-n="${esc(
    nm)}">Add</button><button type="button" class="btn sm" data-act="dinv" data-op="cointake" data-n="${esc(
      nm)}">Take</button><button type="button" class="btn sm" data-act="dinv" data-op="coined" data-n="">Done</button></div>`:"";
  return `<div class="ishare"><span class="ilbl">Share coins</span><input class="field" id="dShareN" type="number" min="1" max="999999" inputmode="numeric" value="${esc(
    dShare.n)}" aria-label="How many coins" style="width:7em"><select class="field" id="dShareK" aria-label="Which coin">${COINS.map(([k,l])=>
      `<option value="${k}"${
    dShare.k===k?" selected":""}>${l} (${k})</option>`).join("")}</select><span id="dSharePrev" class="psub">${N?`between all ${N}${n?
      `: <b>${each} ${dShare.k} each</b>${
    rest?`, ${rest} ${dShare.k} go to the party's loot`:""}`:""}`:
      "Add the characters to the fight first"}</span><span class="sp"></span><button type="button" class="btn" data-act="dinv" data-op="share"${
    N?"":" disabled"}>Share</button></div>
    ${N?`<table class="partyt invt"><thead><tr><th>Character</th><th>Coins</th><th>Attuned</th><th>Items</th><th></th></tr></thead><tbody>${pcs.map(c=>{
      const e=invPeek(c.name),
      its=e&&Array.isArray(e.it)?e.it:[];
      return `<tr><td><b>${esc(c.name)}</b>${LABEL[c.cls]?`<small class="psub"> ${LABEL[c.cls]}</small>`:""}</td><td class="icoins">${esc(coinTxt(e&&
        e.c))}</td><td>${
        its.filter(x=>x.at).length} / 3</td><td><div class="ichips">${its.map(x=>chip(c.name,x)).join("")||
          `<span class="psub">nothing yet</span>`}</div>${menu(c.name,
        its)}${coinEd(c.name)}</td><td class="iact"><button type="button" class="btn sm" data-act="dinv" data-op="coined" data-n="${esc(
          c.name)}">± Coins</button>
        <button type="button" class="btn sm" data-act="dinv" data-op="givenew" data-to="${esc(c.id)}">Give…</button></td></tr>`}).join("")}
      <tr class="iloot"><td><b>The party's loot</b><small class="psub"> players take from it on their phones</small></td><td class="icoins">${esc(coinTxt(
        L.c))}${coinCp(L.c)&&N?
        `<button type="button" class="linkbtn" data-act="dinv" data-op="sharel">Share these</button>`:""}</td><td></td><td><div class="ichips">${L.it.map(x=>
          chip("__loot",
        x)).join("")||`<span class="psub">empty</span>`}</div>${menu("__loot",
          L.it)}</td><td class="iact"><button type="button" class="btn sm" data-act="dinv" data-op="givenew" data-to="loot">Add…</button></td></tr>
      </tbody></table>`:""}`}
function invShare(src){const pcs=sorted().filter(c=>c.kind==="pc");if(!pcs.length)return;const L=lootGet(),got={};
  if(src==="loot"){COINS.forEach(([k])=>{const n=L.c[k],each=Math.floor(n/pcs.length);if(!each)return;got[k]=each;L.c[k]=n-each*pcs.length})}
  else{const n=Math.max(0,Math.min(999999,parseInt(dShare.n,10)||0)),k=COIN_CP[dShare.k]?dShare.k:"gp";if(!n){toast("Type how many first");return}
    const each=Math.floor(n/pcs.length);if(!each){toast(`Not enough for one ${k} each: nothing was shared`);return}L.c[k]+=n-each*pcs.length;got[k]=each}
  if(!Object.keys(got).length){toast("Not enough in the loot for one coin each");return}
  pcs.forEach(c=>{const e=invGet(c.name);COINS.forEach(([k])=>e.c[k]+=got[k]||0);e.cn={at:Date.now(),t:`${coinTxt(got)} from the DM`};invBump(e)});
  if(src!=="loot")dShare.n="";commit();toast(`${coinTxt(got)} each`);partySheet()}
function dinvAct(t){
  const op=t.dataset.op,nm=t.dataset.n||"",loot=nm==="__loot",list=()=>loot?lootGet().it:invGet(nm).it,find=()=>list().find(x=>x.id===t.dataset.id);
  switch(op){
    case "tab": partyTab=t.dataset.v==="inv"?"inv":"num";dItemMenu=null;dCoinEd=null;partySheet();break;
    case "menu": dItemMenu=dItemMenu&&dItemMenu.id===t.dataset.id?null:{n:nm,id:t.dataset.id};partySheet();break;
    case "coined": dCoinEd=nm||null;partySheet();if(nm)setTimeout(()=>{const i=$("#dCoin-gp");i&&i.focus()},0);break;
    case "coinadd":case "cointake":{const d={};COINS.forEach(([k])=>{const v=parseInt(($("#dCoin-"+k)||{}).value,10);if(v>0)d[k]=Math.min(999999,v)});
      if(!Object.keys(d).length){toast("Type an amount first");break}const e=invGet(nm);
      if(op==="coinadd")COINS.forEach(([k])=>e.c[k]+=d[k]||0);else{const left=coinPay(e.c,coinCp(d));if(!left){toast(`${nm} has only ${coinTxt(e.c)}`);
        break}e.c=left}
      e.cn={at:Date.now(),t:op==="coinadd"?`${coinTxt(d)} from the DM`:`The DM took ${coinTxt(d)}`};invBump(e);commit();partySheet();break}
    case "share": invShare("new");break;
    case "sharel": invShare("loot");break;
    case "reveal":{const x=find();if(!x)break;delete x.unk;delete x.un;delete x.ud;x.rv=Date.now();invBump(invGet(nm));
      dItemMenu=null;commit();toast(`${nm} now knows it is ${x.n}`);partySheet();break}
    case "rm":{const x=find();if(!x)break;if(!t.classList.contains("armed")){t.classList.add("armed");t.textContent="Click again to remove";
      setTimeout(()=>{if(t.isConnected){t.classList.remove("armed");t.textContent="Remove"}},3000);break}
      if(loot)lootGet().it=lootGet().it.filter(y=>y!==x);else{const e=invGet(nm);e.it=e.it.filter(y=>y!==x);invBump(e)}
      dItemMenu=null;commit();partySheet();break}
    case "toloot":{const x=find();if(!x)break;const e=invGet(nm);e.it=e.it.filter(y=>y!==x);delete x.eq;delete x.at;delete x.got;delete x.rv;x.from="";
      lootGet().it.push(x);invBump(e);dItemMenu=null;commit();partySheet();break}
    case "lootto":{const L=lootGet(),x=L.it.find(y=>y.id===t.dataset.id),c=byId(t.dataset.to);if(!x||!c)break;L.it=L.it.filter(y=>y!==x);x.from="the DM";
      x.got=Date.now();const e=invGet(c.name);e.it.push(x);invBump(e);dItemMenu=null;commit();toast(`${x.n} → ${c.name}`);partySheet();break}
    case "givenew": itemSheet({to:t.dataset.to,back:"party"});break;
    default: itemAct(t);
  }}

/* ---------- Give an item: from the game data or your own items, or one you make ---------- */
let dI=null;
const ITEM_MAKE0=()=>({n:"",ty:"Wondrous item",r:"",att:false,d:"",chm:"",chamt:"",chre:"dawn",heal:"",wd:"",wt:"",wb:"",acb:"",svb:"",sp:""});
function itemSheet(o){o=o||{};dI={tab:"list",q:"",f:"all",sel:null,it:undefined,to:new Set(o.to?[o.to]:[]),qty:1,tv:true,unk:false,un:"",ud:"",make:
  ITEM_MAKE0(),
  back:o.back||""};if(itemRows&&Date.now()-itemRowsAt>60000)itemRows=null;itemSheetPaint();setTimeout(()=>{const i=$("#dItemQ");i&&i.focus()},30)}
const itemLib=()=>Array.isArray(state.itemLib)?state.itemLib:[];
function itemFromMake(m){const it={n:m.n.trim(),ty:m.ty,q:1};if(m.r)it.r=m.r;if(m.att)it.att=true;if(m.d.trim())it.d=m.d.trim();
  const chm=parseInt(m.chm,10);if(chm>0)it.ch={m:Math.min(99,chm),c:Math.min(99,chm),re:m.chre||"",amt:diceNorm(m.chamt)};if(m.heal.trim())it.heal=m.heal;
  if(m.wd.trim())it.wpn={dmg:m.wd,dt:m.wt.trim(),b:parseInt(m.wb,10)||0};if(parseInt(m.acb,10))it.acb=parseInt(m.acb,10);
  if(parseInt(m.svb,10))it.svb=parseInt(m.svb,10);const sp=m.sp.split(",").map(s=>s.trim()).filter(Boolean);if(sp.length)it.sp=sp;return it}
function itemMakeFrom(it){const m=ITEM_MAKE0();m.n=it.n||"";m.ty=Object.values(ITEM_KIND).includes(it.ty)?it.ty:"Gear";m.r=ITEM_RARITY.includes(it.r)?it.r:"";
  m.att=!!it.att;m.d=it.d||"";if(it.ch){m.chm=String(it.ch.m);m.chamt=it.ch.amt||"";m.chre=it.ch.re||""}m.heal=it.heal||"";
  if(it.wpn){m.wd=it.wpn.dmg||"";m.wt=it.wpn.dt||"";m.wb=it.wpn.b?String(it.wpn.b):""}m.acb=it.acb?String(it.acb):"";m.svb=it.svb?String(it.svb):"";
  m.sp=(it.sp||[]).join(", ");return m}
/* the dice fields of your own item must be dice the phone can roll */
function itemMakeErr(m){if(!m.n.trim())return "Give it a name";for(const [k,l] of [["chamt","The charges that come back"],["heal","Heals"],["wd",
  "Weapon damage"]])
  if(m[k].trim()&&!diceOk(m[k]))return `${l}: write dice like 1d6+1`;if(m.chamt.trim()&&!(parseInt(m.chm,10)>
    0))return "Write how many charges it has";return ""}
function itemCardHtml(it,unk,un,ud){
  if(unk)return `<div class="icard unk"><div class="icn">${esc(String(un||"").trim()||"Unknown item")} <span class="iq">?</span></div>${String(ud||"").trim()?
    `<p>${esc(ud)}</p>`:""}<small>Not yet known. The DM will tell you what it does.</small></div>`;
  const fx=itemFx(it);
  return `<div class="icard"><div class="icn">${esc(it.n||"Item")}</div><div class="icl">${esc(itemLine(it)||"Item")}</div>${it.d?`<p>${esc(it.d).replace(/\n/g,
    "<br>")}</p>`:""}${fx.length?`<div class="ifx">${fx.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`:""}</div>`}
function itemListPaint(){const el=$("#dItemList");if(!el||!dI)return;if(!itemRows)itemsWant(itemListPaint);const q=dI.q.trim().toLowerCase();
  const lib=itemLib().map((x,i)=>({lib:i,x})).filter(o=>(dI.f==="all"||dI.f==="yours")&&(!q||o.x.n.toLowerCase().includes(q)));
  const rows=dI.f==="yours"?[]:itemSearch(itemRows||[],dI.q,dI.f).slice(0,80);dI.rows=rows;
  el.innerHTML=(lib.length?lib.map(o=>`<button type="button" class="ires${dI.sel&&dI.sel.lib===o.lib?" on":""}" data-act="dinv" data-op="sellib" data-i="${
    o.lib}"><b>★ ${esc(o.x.n)}</b><small>Yours · ${esc(itemLine(o.x)||"Item")}</small></button>`).join(""):"")
    +rows.map((r,i)=>`<button type="button" class="ires${dI.sel&&dI.sel.row===r?" on":
      ""}" data-act="dinv" data-op="sel" data-i="${i}"><b>${esc(r[0])}</b><small>${esc(
      itemRowLine(r)||"Item")}${r[6]!=="off"?" · homebrew":""}</small></button>`).join("")
    +(!itemRows?`<p class="psub">Loading the items…</p>`:!lib.length&&!rows.length?`<p class="psub">Nothing with that name. Make your own instead.</p>`:"")}
function itemTargetsHtml(){const pcs=sorted().filter(c=>c.kind==="pc"&&!c.hidden);
  return `<div class="irow"><span class="ilbl">Give to</span>${pcs.map(c=>
    `<button type="button" class="btn sm itog" data-act="dinv" data-op="to" data-to="${esc(
    c.id)}" aria-pressed="${dI.to.has(c.id)}">${esc(c.name)}</button>`).join(
      "")}<button type="button" class="btn sm itog" data-act="dinv" data-op="to" data-to="loot" aria-pressed="${
    dI.to.has("loot")}">The party's loot</button>${pcs.length?"":`<span class="psub">No characters in the fight yet</span>`}</div>
    <div class="irow"><span class="ilbl">How many</span><button type="button" class="btn sm" data-act="dinv" data-op="qty" data-d="-1" aria-label="One less"${dI.qty<=1?
      " disabled":""}>−</button><b>${
        dI.qty}</b><button type="button" class="btn sm" data-act="dinv" data-op="qty" data-d="1" aria-label="One more">+</button></div>
    <label class="chk"><input type="checkbox" id="dItemTv"${dI.tv?" checked":""}> Show it on the tablet and the TV: “${esc([...dI.to].filter(x=>x!==
      "loot").map(id=>
      (byId(id)||{}).name).filter(Boolean).join(", ")||"Someone")} finds ${esc(dI.unk?dI.un.trim()||"Unknown item":(dI.tab==="make"?dI.make.n:dI.it&&dI.it.n)||
        "…")}”</label>
    <label class="chk"><input type="checkbox" id="dItemUnk"${dI.unk?" checked":
      ""}> Unidentified: the player sees only this until you reveal it (Party → Gold and items)</label>
    ${dI.unk?`<div class="irow2"><label>The player sees<input class="field" id="dItemUn" maxlength="60" value="${esc(
      dI.un)}" placeholder="Tarnished silver ring"></label>
      <label>And reads<input class="field" id="dItemUd" maxlength="400" value="${esc(dI.ud)}" placeholder="Heavy, with a worn crest."></label></div>`:""}`}
function itemRightHtml(){
  if(dI.tab==="make"){const m=dI.make,it=itemFromMake(m),err=itemMakeErr(m);
    return `<div class="ipv"><span class="ilbl">${dI.unk?"The player sees now":"The player sees"}</span>${itemCardHtml(it,dI.unk,dI.un,dI.ud)}${dI.unk?
      `<span class="ilbl">After you reveal it</span>${itemCardHtml(it)}`:""}</div>${itemTargetsHtml()}${err&&m.n.trim()?`<p class="ierr">${esc(err)}</p>`:""}`}
  if(!dI.sel)return `<p class="psub">Pick an item on the left. Your own items (★) are at the top; make one in “Make your own…”.</p>`;
  const it=dI.it;if(it===undefined)return `<p class="psub">Reading the item…</p>`;if(!it)return `<p class="psub">Couldn't read this item.</p>`;
  const fx=itemFx(it);
  return `${itemCardHtml(it)}${fx.length?"":`<p class="psub">Nothing to set up on the phone: the player reads it.</p>`}
    <div class="irow"><button type="button" class="btn sm" data-act="dinv" data-op="copy">Change a copy…</button>${dI.sel.lib!=null?
      `<button type="button" class="btn sm" data-act="dinv" data-op="libdel" title="Click twice">Delete from yours</button>`:""}</div>${itemTargetsHtml()}`}
function itemSheetPaint(){if(!dI)return;const m=dI.make;
  const left=dI.tab==="list"?`<label class="ifl"><span class="ilbl">Search items</span><input class="field" id="dItemQ" value="${esc(
    dI.q)}" placeholder="Wand, potion, longsword…" autocomplete="off"></label>
    <div class="irow">${[["all","All"],["yours","Yours"],["weapon","Weapons"],["armor","Armor"],["wand","Wands & staffs"],["potion","Potions"],["ring","Rings"],
      ["wondrous",
      "Wondrous"]].map(([k,l])=>`<button type="button" class="btn sm itog" data-act="dinv" data-op="f" data-f="${k}" aria-pressed="${dI.f===
        k}">${l}</button>`).join("")}</div>
    <div class="ilist" id="dItemList"></div>`
    :`<form id="dMakeForm" class="imake" autocomplete="off">${dI.base?`<div class="ibase">Based on <b>${esc(dI.base)}</b></div>`:""}
      <label class="ifl"><span class="ilbl">Name</span><input class="field" id="mk_n" maxlength="60" value="${esc(
        m.n)}" placeholder="Grandfather's Signet"></label>
      <div class="igrid3"><label class="ifl"><span class="ilbl">Kind</span><select class="field" id="mk_ty">${Object.values(ITEM_KIND).map(v=>`<option${m.ty===
        v?" selected":
        ""}>${v}</option>`).join("")}</select></label><label class="ifl"><span class="ilbl">Rarity</span><select class="field" id="mk_r">${ITEM_RARITY.map(v=>
          `<option value="${
        v}"${m.r===v?" selected":""}>${v||"none"}</option>`).join("")}</select></label><label class="chk ichk"><input type="checkbox" id="mk_att"${
          m.att?" checked":
        ""}> Needs attunement</label></div>
      <label class="ifl"><span class="ilbl">Description</span><textarea class="field" id="mk_d" rows="3" maxlength="3000" placeholder="What it looks like and what it does">${esc(
        m.d)}</textarea></label>
      <fieldset class="ifs"><legend class="ilbl">What the phone sets up (all optional)</legend>
        <div class="igrid3"><label class="ifl"><span class="ilbl">Charges</span><input class="field" id="mk_chm" type="number" min="0" max="99" value="${esc(
          m.chm)}" placeholder="7"></label>
          <label class="ifl"><span class="ilbl">Come back</span><input class="field" id="mk_chamt" maxlength="12" value="${esc(
            m.chamt)}" placeholder="1d6+1 (empty: all)"></label>
          <label class="ifl"><span class="ilbl">When</span><select class="field" id="mk_chre">${[["dawn","at dawn"],["long","long rest"],["short",
            "short rest"],["",
            "never"]].map(([k,l])=>`<option value="${k}"${m.chre===k?" selected":""}>${l}</option>`).join("")}</select></label></div>
        <div class="igrid3"><label class="ifl"><span class="ilbl">Weapon damage</span><input class="field" id="mk_wd" maxlength="12" value="${esc(
          m.wd)}" placeholder="1d8"></label>
          <label class="ifl"><span class="ilbl">Damage type</span><input class="field" id="mk_wt" maxlength="15" value="${esc(
            m.wt)}" placeholder="slashing"></label>
          <label class="ifl"><span class="ilbl">Magic bonus</span><input class="field" id="mk_wb" type="number" min="-5" max="10" value="${esc(
            m.wb)}" placeholder="+1"></label></div>
        <div class="igrid3"><label class="ifl"><span class="ilbl">Heals</span><input class="field" id="mk_heal" maxlength="12" value="${esc(
          m.heal)}" placeholder="2d4+2"></label>
          <label class="ifl"><span class="ilbl">AC bonus</span><input class="field" id="mk_acb" type="number" min="-5" max="10" value="${esc(m.acb)}"></label>
          <label class="ifl"><span class="ilbl">Saving throw bonus</span><input class="field" id="mk_svb" type="number" min="-5" max="10" value="${esc(
            m.svb)}"></label></div>
        <label class="ifl"><span class="ilbl">Casts (spell names, with commas)</span><input class="field" id="mk_sp" maxlength="160" value="${esc(
          m.sp)}" placeholder="Magic Missile"></label>
        <p class="psub">AC and saving throw bonuses show on the item; the player keeps them in their own numbers.</p></fieldset></form>`;
  const foot=dI.tab===
    "make"?`<button class="btn" type="button" data-act="dinv" data-op="libsave">Save to yours only</button><button class="btn primary" type="button" data-act="dinv" data-op="give">Give</button>`
    :`<button class="btn primary" type="button" data-act="dinv" data-op="give"${dI.it?"":" disabled"}>Give</button>`;
  $("#overlay").innerHTML=`<div class="scrim" data-act="close"><div class="sheet itemsheet" role="dialog" aria-modal="true" aria-label="Give an item">
    <div class="ihead"><h2>Give an item</h2><div class="seg2" role="group" aria-label="Where the item comes from"><button type="button" data-act="dinv" data-op="tab2" data-v="list" aria-pressed="${
      dI.tab==="list"}">From the list</button><button type="button" data-act="dinv" data-op="tab2" data-v="make" aria-pressed="${dI.tab===
        "make"}">Make your own…</button></div></div>
    <div class="ibody"><div class="ileft">${left}</div><div class="iright" id="dItemRight">${itemRightHtml()}</div></div>
    <div class="ifoot">${dI.back==="party"?`<button class="btn" type="button" data-act="dinv" data-op="backparty">Back to Party</button>`:
      `<button class="btn" type="button" data-act="close">Cancel</button>`}<span class="sp"></span>${foot}</div></div></div>`;
  if(dI.tab==="list")itemListPaint();
  const q=$("#dItemQ");if(q)q.addEventListener("input",()=>{dI.q=q.value;itemListPaint()});
  const f=$("#dMakeForm");if(f){const rd=()=>{const g=id=>$("#"+id);Object.assign(m,{n:g("mk_n").value,ty:g("mk_ty").value,r:g("mk_r").value,att:
    g("mk_att").checked,
    d:g("mk_d").value,chm:g("mk_chm").value,chamt:g("mk_chamt").value,chre:g("mk_chre").value,wd:g("mk_wd").value,wt:g("mk_wt").value,wb:
      g("mk_wb").value,heal:g(
      "mk_heal").value,acb:g("mk_acb").value,svb:g("mk_svb").value,sp:g("mk_sp").value});itemRightPaint()};
        f.addEventListener("input",rd);   // not on change: leaving a field would repaint the right side under the click
    f.addEventListener("submit",e=>e.preventDefault())}
  itemRightWire()}
function itemRightPaint(){const r=$("#dItemRight");if(!r||!dI)return;r.innerHTML=itemRightHtml();itemRightWire();
  const g=$(".itemsheet [data-op=give]");if(g)g.disabled=dI.tab==="list"&&!dI.it}
function itemRightWire(){const r=$("#dItemRight");if(!r)return;
  const tv=$("#dItemTv"),uk=$("#dItemUnk"),un=$("#dItemUn"),ud=$("#dItemUd");
  if(tv)tv.addEventListener("change",()=>{dI.tv=tv.checked});
  if(uk)uk.addEventListener("change",()=>{dI.unk=uk.checked;itemRightPaint();if(dI.unk)setTimeout(()=>{const i=$("#dItemUn");i&&i.focus()},0)});
  const upd=()=>{if(dI.tab!=="make")return;const p=r.querySelector(".ipv");if(p){const it=itemFromMake(dI.make);
    p.innerHTML=`<span class="ilbl">The player sees now</span>${itemCardHtml(it,true,dI.un,
      dI.ud)}<span class="ilbl">After you reveal it</span>${itemCardHtml(it)}`}};
  if(un)un.addEventListener("input",()=>{dI.un=un.value;upd()});if(ud)ud.addEventListener("input",()=>{dI.ud=ud.value;upd()})}
function itemAct(t){if(!dI)return;const op=t.dataset.op;
  switch(op){
    case "tab2": dI.tab=t.dataset.v==="make"?"make":"list";itemSheetPaint();break;
    case "f": dI.f=t.dataset.f||"all";t.parentElement.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===t)));itemListPaint();break;
    case "sel":{const r=dI.rows&&dI.rows[Number(t.dataset.i)];if(!r)break;dI.sel={row:r};dI.it=undefined;itemListPaint();itemRightPaint();
      itemGet(r[0],r[1]).then(x=>{if(dI&&dI.sel&&dI.sel.row===r){dI.it=x;itemRightPaint()}});break}
    case "sellib":{const i=Number(t.dataset.i),x=itemLib()[i];if(!x)break;dI.sel={lib:i};dI.it=itemNorm(x);itemListPaint();itemRightPaint();break}
    case "copy": if(!dI.it)break;dI.make=itemMakeFrom(dI.it);dI.base=dI.it.n;dI.tab="make";itemSheetPaint();break;
    case "libdel":{if(dI.sel.lib==null)break;if(!t.classList.contains("armed")){t.classList.add("armed");t.textContent="Click again to delete";break}
      state.itemLib=itemLib().filter((_,i)=>i!==dI.sel.lib);dI.sel=null;dI.it=undefined;commit();itemSheetPaint();break}
    case "to":{const v=t.dataset.to;if(dI.to.has(v))dI.to.delete(v);else dI.to.add(v);itemRightPaint();break}
    case "qty": dI.qty=Math.max(1,Math.min(99,dI.qty+Number(t.dataset.d)));itemRightPaint();break;
    case "libsave":{const err=itemMakeErr(dI.make);if(err){toast(err);break}const x=itemNorm(itemFromMake(dI.make));if(!x)break;
      const L=itemLib().filter(y=>y.n.toLowerCase()!==x.n.toLowerCase());L.unshift(x);state.itemLib=L.slice(0,200);commit();
        toast(`${x.n}: saved to yours`);break}
    case "give":{const base=dI.tab==="make"?itemFromMake(dI.make):dI.it;if(!base)break;
      if(dI.tab==="make"){const err=itemMakeErr(dI.make);if(err){toast(err);break}}
      if(!dI.to.size){toast("Pick who gets it");break}
      if(dI.tab==="make"){const x=itemNorm(base);if(x){const L=itemLib().filter(y=>y.n.toLowerCase()!==x.n.toLowerCase());L.unshift(x);
        state.itemLib=L.slice(0,200)}}
      if(dmGive([...dI.to],base,{q:dI.qty,tv:dI.tv,unk:dI.unk,un:dI.un,ud:dI.ud})){const back=dI.back;dI=null;if(back==="party"){partyTab="inv";partySheet()}
        else closeSheet()}break}
    case "backparty": dI=null;partyTab="inv";partySheet();break;
  }}
