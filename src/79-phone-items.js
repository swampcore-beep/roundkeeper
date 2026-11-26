/* ---------- items and coins: the DM gives them, players carry, use, spend and give them (both sides use the helpers here) ---------- */
const COINS=[["gp","Gold","GOLD"],["sp","Silver","SILVER"],["cp","Copper","COPPER"]];
const coinsOf=c=>({gp:Math.max(0,Math.floor(Number(c&&c.gp)||0)),sp:Math.max(0,Math.floor(Number(c&&c.sp)||0)),cp:Math.max(0,Math.floor(Number(c&&
  c.cp)||0))});
const coinCp=c=>{const x=coinsOf(c);return x.gp*100+x.sp*10+x.cp};
const coinTxt=c=>{const x=coinsOf(c),L=COINS.filter(([k])=>x[k]).map(([k])=>`${x[k].toLocaleString("en")} ${k}`);return L.length?L.join(" · "):"no coins"};
const gpTxt=cp=>(Math.round(cp)/100).toLocaleString("en",{maximumFractionDigits:2})+" gp";
/* paying a price (in cp) from a purse: the biggest coins that fit first, then change from one bigger coin when needed; null when it isn't enough */
function coinPay(have,price){
  let {gp,sp,cp}=coinsOf(have),need=Math.max(0,Math.round(price));if(gp*100+sp*10+cp<need)return null;
  const g=Math.min(gp,Math.floor(need/100));gp-=g;need-=g*100;
  const s=Math.min(sp,Math.floor(need/10));sp-=s;need-=s*10;
  const t=Math.min(cp,need);cp-=t;need-=t;
  if(need>0&&sp>0&&need<10){sp--;cp+=10-need;need=0}
  if(need>0&&gp>0&&need<100){gp--;const ch=100-need;sp+=Math.floor(ch/10);cp+=ch%10;need=0}
  return need>0?null:{gp,sp,cp}}
const ITEM_KIND={weapon:"Weapon",armor:"Armor",shield:"Shield",potion:"Potion",ring:"Ring",wand:"Wand",staff:"Staff",rod:"Rod",scroll:"Scroll",
  ammo:"Ammunition",wondrous:"Wondrous item",treasure:"Treasure",tool:"Tool",gear:"Gear"};
const ITEM_RARITY=["","common","uncommon","rare","very rare","legendary","artifact"];
const ITEM_RE={dawn:"at dawn",long:"on a long rest",short:"on a short rest"};
/* the SRD 5.2.1 weapons (CC BY 4.0): damage, type, F finesse / R ranged; the SRD's item list has no numbers for them */
const SRD_WEAPONS={club:["1d4","bludgeoning",""],dagger:["1d4","piercing","F"],greatclub:["1d8","bludgeoning",""],handaxe:["1d6","slashing",""],
  javelin:["1d6","piercing",""],"light hammer":["1d4","bludgeoning",""],mace:["1d6","bludgeoning",""],quarterstaff:["1d6","bludgeoning",""],
  sickle:["1d4","slashing",""],spear:["1d6","piercing",""],dart:["1d4","piercing","F"],"light crossbow":["1d8","piercing","R"],shortbow:["1d6","piercing","R"],
  sling:["1d4","bludgeoning","R"],battleaxe:["1d8","slashing",""],flail:["1d8","bludgeoning",""],glaive:["1d10","slashing",""],greataxe:["1d12","slashing",""],
  greatsword:["2d6","slashing",""],halberd:["1d10","slashing",""],lance:["1d10","piercing",""],longsword:["1d8","slashing",""],maul:["2d6","bludgeoning",""],
  morningstar:["1d8","piercing",""],pike:["1d10","piercing",""],rapier:["1d8","piercing","F"],scimitar:["1d6","slashing","F"],shortsword:["1d6","piercing","F"],
  trident:["1d8","piercing",""],warhammer:["1d8","bludgeoning",""],"war pick":["1d8","piercing",""],whip:["1d4","slashing","F"],blowgun:["1","piercing","R"],
  "hand crossbow":["1d6","piercing","R"],"heavy crossbow":["1d10","piercing","R"],longbow:["1d8","piercing","R"],musket:["1d12","piercing","R"],
  pistol:["1d10","piercing","R"]};
/* dice as the app rolls them ("1d6+1"), and as people read them ("1d6 + 1") */
const diceNorm=s=>String(s??"").replace(/\s+/g,"").replace(/[−–]/g,"-");
const diceOk=s=>/^\d{1,2}(d\d{1,3})?([+-]\d{1,3})?$/.test(diceNorm(s));
const diceRead=s=>diceNorm(s).replace(/([+-])/g," $1 ");
/* the SRD's list has no flags on plain weapons and armor (Dagger, Chain Mail), so their names say it */
const SRD_ARMOR=new Set(["padded armor","leather armor","studded leather armor","hide armor","chain shirt","scale mail","breastplate","half plate armor",
  "ring mail",
  "chain mail","splint armor","plate armor"]);
function itemKindOf(raw){const k=itemKindOf0(raw),n=String(raw&&raw.name||"").trim().toLowerCase();
  return k!=="gear"?k:SRD_WEAPONS[n]?"weapon":SRD_ARMOR.has(n)?"armor":k}
function itemKindOf0(raw){const t=String(raw&&raw.type||"").split("|")[0].toUpperCase();
  if(raw.weapon||raw.weaponCategory||t==="M"||t==="R")return "weapon";if(t==="S"||/^shield$/i.test(String(raw.name||"")))return "shield";
  if(raw.armor||t==="LA"||t==="MA"||t==="HA")return "armor";
  return {P:"potion",RG:"ring",WD:"wand",ST:"staff",RD:"rod",SC:"scroll",A:"ammo",AF:"ammo"}[t]||(raw.wondrous?"wondrous":t[0]==="$"?"treasure":
    ["T","AT","INS","GS"].includes(t)?"tool":"gear")}
const itemBaseWeapon=name=>{const n=String(name||"").toLowerCase();let best="";
  Object.keys(SRD_WEAPONS).forEach(k=>{if(k.length>best.length&&new RegExp(`\\b${k}\\b`).test(n))best=k});return best};
/* one item from the game data, in the shape the app keeps: what it does is read from its fields, or from its words in the SRD */
function itemFromRef(raw){
  raw=raw||{};const kind=itemKindOf(raw),txt=fetEntries(raw.entries).map(x=>pcTxt(x)).join("\n").trim();
  const rar=String(raw.rarity||"").toLowerCase(),it={n:String(raw.name||"Item").slice(0,60),ty:ITEM_KIND[kind]||"Gear",q:1};
  if(rar&&rar!=="none"&&rar!=="unknown")it.r=rar==="unknown (magic)"?"magic":rar;
  if(raw.reqAttune)it.att=true;if(txt)it.d=txt.slice(0,3000);if(raw.source)it.src=String(raw.source).slice(0,20);
  const chM=Number(raw.charges)||Number((txt.match(/\bhas (\d{1,2}) charges\b/i)||[])[1])||0;
  if(chM>0&&chM<=99){const rc=String(raw.recharge||"");
    const re=/restShort/i.test(rc)?"short":/restLong/i.test(rc)?"long":/dawn|dusk|midnight/i.test(rc)||
      /\bcharges? (?:daily )?at dawn\b|\bdaily at dawn\b/i.test(
      txt)?"dawn":"";
    let amt=diceNorm(pcTxt(String(raw.rechargeAmount||"")));
    if(!amt){const m=txt.match(/regains? (?:up to )?(\d+d\d+(?:\s*[+−-]\s*\d+)?|\d+)\s+(?:expended )?charges/i);amt=m?diceNorm(m[1]):""}
    if(amt&&!diceOk(amt))amt="";it.ch={m:chM,c:chM,re,amt}}
  if(kind==="potion"){const m=txt.match(/regains? (\d+d\d+(?:\s*[+−-]\s*\d+)?) Hit Points/i);if(m&&diceOk(m[1]))it.heal=diceNorm(m[1])}
  if(kind==="weapon"){const base=itemBaseWeapon(String(raw.baseItem||"").split("|")[0])||itemBaseWeapon(raw.name),W=SRD_WEAPONS[base];
    const dmg=diceNorm(raw.dmg1||(W&&W[0])||""),props=fetArr(raw.property).map(p=>String(p&&p.uid||p).split("|")[0].toUpperCase());
    const b=parseInt(raw.bonusWeapon,10)||parseInt((String(raw.name).match(/\+(\d)\b/)||[])[1],10)||0;
    if(dmg&&diceOk(dmg)){it.wpn={dmg,dt:String(DMG_T[String(raw.dmgType||"").toUpperCase()]||(W&&W[1])||"").toLowerCase()};
      if(props.includes("F")||(W&&W[2]==="F"))it.wpn.f=true;
      if(String(raw.type||"").split("|")[0].toUpperCase()==="R"||(W&&W[2]==="R"))it.wpn.rg=true;if(b)it.wpn.b=b}}
  const acb=parseInt(raw.bonusAc,10)||parseInt((txt.match(/\+(\d) bonus to (?:your )?Armor Class/i)||[])[1],10)||0;if(acb)it.acb=acb;
  const svb=parseInt(raw.bonusSavingThrow,10)||parseInt((txt.match(/\+(\d) bonus to (?:your )?(?:Armor Class and )?saving throws/i)||[])[1],10)||0;
  if(svb)it.svb=svb;
  const sp=[];const add=s=>{s=pcTxt(String(s||"").split("|")[0]).replace(/\b\w/g,c=>c.toUpperCase()).trim();if(s&&s.length<=40&&!sp.includes(s)&&sp.length<4)
    sp.push(s)};
  (function walk(x){if(typeof x==="string")add(x);else if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==="object")Object.values(x).forEach(walk)})(
    raw.attachedSpells);
  if(!sp.length)(txt.match(/\bcast (?:the )?([A-Z][A-Za-z'’]+(?: [A-Z][A-Za-z'’]+){0,3})(?: spell)? from (?:it|the)/g)||[]).forEach(m=>add(m.replace(
    /^cast (?:the )?/i,"").replace(/(?: spell)? from (?:it|the)$/i,"")));
  if(sp.length)it.sp=sp;
  return it}
const itemLine=it=>[[it.ty,it.r].filter(Boolean).join(", "),it.att?"attunement":""].filter(Boolean).join(" · ");
function itemFx(it){const L=[];
  if(it.ch)L.push(`${it.ch.m} charge${it.ch.m===1?"":"s"}${it.ch.re?` · ${it.ch.amt?diceRead(it.ch.amt):"all"} back ${ITEM_RE[it.ch.re]}`:""}`);
  if((it.sp||[]).length)L.push("Casts "+it.sp.join(", "));
  if(it.heal)L.push("Heals "+diceRead(it.heal));
  if(it.wpn)L.push(`${diceRead(it.wpn.dmg)}${it.wpn.b?` + ${it.wpn.b}`:""} ${it.wpn.dt||"damage"}${it.wpn.b?` · +${it.wpn.b} to hit`:""}`);
  if(it.acb)L.push(`${shS(it.acb)} AC`);if(it.svb)L.push(`${shS(it.svb)} to saving throws`);
  return L}
/* the item list from the laptop: phones get the official books and the SRD, the DM everything */
let itemRows=null,itemRowsAt=0,itemRowsBusy=false;
async function itemsLoad(){if(itemRows&&Date.now()-itemRowsAt<60000)return itemRows;
  try{const r=await fetch("/items",{cache:"no-store"});if(r.ok){itemRows=(await r.json()).list||[];itemRowsAt=Date.now()}}catch(e){}return itemRows||[]}
/* a list that needs the items: one request at a time, and again after 4 s while the laptop is still reading its game data (paint stops when the list is gone) */
function itemsWant(paint){if(itemRows||itemRowsBusy)return;itemRowsBusy=true;
  itemsLoad().then(()=>{itemRowsBusy=false;if(itemRows)paint();else setTimeout(paint,4000)})}
/* dice the phone rolls: "2d4+2", or a flat number ("1", "10") */
function invDice(expr){const e=diceNorm(expr);if(/d/.test(e))return sbDice(e,false);const m=e.match(/^(\d+)([+-]\d+)?$/);
  return m?{rolls:[],add:Number(m[2]||0),tot:Number(m[1])+Number(m[2]||0),n:0,d:0}:null}
const ITEM_FILTER={all:()=>true,gear:r=>["gear","tool","ammo","treasure"].includes(r[3]),weapon:r=>r[3]==="weapon",armor:r=>r[3]==="armor"||r[3]==="shield",
  magic:r=>!!r[4],potion:r=>r[3]==="potion",ring:r=>r[3]==="ring",wand:r=>["wand","staff","rod"].includes(r[3]),wondrous:r=>r[3]==="wondrous"};
function itemSearch(rows,q,f){q=String(q||"").trim().toLowerCase();const ok=ITEM_FILTER[f]||ITEM_FILTER.all;
  const L=(rows||[]).filter(r=>ok(r)&&(!q||String(r[0]).toLowerCase().includes(q)));
  if(q)L.sort((a,b)=>(String(b[0]).toLowerCase().startsWith(q)-String(a[0]).toLowerCase().startsWith(q))||String(a[0]).localeCompare(String(b[0])));
  return L}
const itemRowLine=r=>[[ITEM_KIND[r[3]]||"",r[4]].filter(Boolean).join(", "),r[5]?"attunement":""].filter(Boolean).join(" · ");
async function itemGet(n,s){try{const r=await fetch(`/item?n=${encodeURIComponent(n)}&s=${encodeURIComponent(s||"")}`,{cache:"no-store"});
  if(r.ok)return itemFromRef((await r.json()).item)}catch(e){}return null}

/* bonuses from items on the sheet: saving throws count by themselves; AC is the player's number, so the phone asks (sh.ib: ac and sv by item, no = said no) */
const shItemSv=sh=>Object.values(sh&&sh.ib&&sh.ib.sv||{}).reduce((a,v)=>a+(Number(v)||0),0);
/* ---------- the phone: Items and coins ---------- */
let invMe=null,invFor=null,invLastV=null,invSeq=0,invView=null,invQ="",invKind="all",invPick=null,invOwn=null,invGive=null,invCoin="gp",invUseN=1,
  invGot=[],invRowsShown=null,invBonus=null;
const invKey=()=>(meName||"").toLowerCase();
function invPull(force){
  if(MODE!=="player"||!served||PREVIEW||!meName||meName==="*")return;
  if(invFor!==invKey()){invFor=invKey();invMe=null;invLastV=null}
  const v=(state.invv||{})[invKey()]??0;if(!force&&invMe&&v===invLastV)return;invLastV=v;const seq=++invSeq;
  fetch("/inv?n="+encodeURIComponent(invKey()),{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(!d||seq!==invSeq||invFor!==invKey())return;
    invMe={c:coinsOf(d.c),it:Array.isArray(d.it)?d.it:[],v:d.v||0,cn:d.cn||null};invNews();invBonusCheck();
    if(pSheet&&String(pSheet).startsWith("inv"))renderPSheet()}).catch(()=>{invLastV=null})}
/* something new from the DM or another player: the newest shows as a card (or a note, when another window is open) */
function invNews(){const k="invSeen:"+invKey(),seen=ls.get(k,null),now=dmNow(),it=invMe.it;
  const at=x=>Math.max(Number(x.got)||0,Number(x.rv)||0),top=it.reduce((a,x)=>Math.max(a,at(x)),0);
  const since=seen==null?now-180000:seen,fresh=it.filter(x=>at(x)>since);
  if(top>(seen||0))ls.set(k,top);
  const ck="invCn:"+invKey(),cs=ls.get(ck,null),cn=invMe.cn;
  if(cn&&cn.at>(cs==null?now-180000:cs)){ls.set(ck,cn.at);if(!fresh.length)toast(cn.t,5000)}
  else if(cn&&cs==null)ls.set(ck,cn.at);
  if(!fresh.length)return;
  if(!pSheet||pSheet==="invgot"||pSheet==="inv"||pSheet==="invitem"){invGot=fresh.slice(-6);pSheet="invgot";
    renderPSheet()}   // not over a roll call or a keypad
  else toast(fresh.length>1?`${fresh.length} new items: More → Items and coins`:`${fresh[0].n}: in your items`,5000)}
const invItem=id=>invMe&&invMe.it.find(x=>x.id===id);
/* an item's bonus counts while the player has it, or, when it needs attunement, while attuned */
const invOn=it=>!!it&&!it.unk&&!String(it.id).startsWith("new")&&(it.att?!!it.at:true);
function invBonusCheck(){
  if(invBonus&&pSheet!=="invbonus")invBonus=null;   // closed without an answer: asked again later
  const sh=shLocal();if(!sh||!invMe||MODE!=="player")return;const ib=sh.ib=Object.assign({ac:{},sv:{},no:{}},sh.ib),on={};let save=false;const notes=[];
  invMe.it.forEach(it=>{if(invOn(it))on[it.id]=it});
  Object.values(on).forEach(it=>{if(it.svb&&ib.sv[it.id]==null){ib.sv[it.id]=it.svb;save=true;notes.push(`${it.n}: ${shS(it.svb)} to your saving throws`)}});
  Object.keys(ib.sv).forEach(id=>{if(!on[id]){const it=invItem(id);delete ib.sv[id];save=true;notes.push(`${it?it.n:"An item"} is off: saving throws back`)}});
  Object.keys(ib.no).forEach(id=>{if(!on[id]){delete ib.no[id];save=true}});
  if(save){shSave(sh,true);toast(notes.join(" · "),5000)}
  if(invBonus||(pSheet&&pSheet!=="inv"&&pSheet!=="invitem"))return;   // one question at a time, and never over a roll call or a keypad
  const add=Object.values(on).find(it=>it.acb&&ib.ac[it.id]==null&&!ib.no[it.id]),gone=Object.keys(ib.ac).find(id=>!on[id]);
  if(add)invBonus={id:add.id,n:add.n,v:add.acb,add:true,back:pSheet};
  else if(gone){const it=invItem(gone);invBonus={id:gone,n:it?it.n:"An item",v:ib.ac[gone],add:false,back:pSheet}}
  if(invBonus){pSheet="invbonus";renderPSheet()}}
const invAttuned=()=>invMe?invMe.it.filter(x=>x.at).length:0;
/* a weapon on the sheet: the attack with the same name, if the player has one */
const invAtkOf=it=>{const sh=shLocal();if(!sh||!it)return -1;const n=it.n.toLowerCase();return (sh.att||[]).findIndex(a=>a&&a.n&&a.n.trim().toLowerCase()===n)};
async function invSend(body,local){const ok=await pSend(body);if(ok&&local&&invMe){local(invMe);renderPSheet();invBonusCheck()}
  if(ok)setTimeout(()=>invPull(true),1600);return ok}
function invItemRow(it){
  if(String(it.id).startsWith("new"))return `<div class="invrow"><span class="invn"><b>${esc(it.n)}${it.q>1?` <i>×${it.q}</i>`:
    ""}</b><small>Adding…</small></span></div>`;
  const sub=[],ai=it.wpn?invAtkOf(it):-1;
  if(it.unk)sub.push("Not yet known");if(it.eq)sub.push("Equipped");if(it.at)sub.push("Attuned");if(it.heal)sub.push("Heals "+diceRead(it.heal));
  if(it.ch)sub.push(`${it.ch.c} / ${it.ch.m} charges`);if(it.from&&it.from!=="loot")sub.push("from "+it.from);
  const act=ai>=0?`<button class="pb invq" type="button" data-act="inv" data-op="atk" data-id="${esc(it.id)}">Attack</button>`:it.heal&&!it.ch?
    `<button class="pb invq" type="button" data-act="inv" data-op="drink" data-id="${esc(it.id)}">Drink</button>`:it.ch&&it.ch.c>0?
    `<button class="pb invq" type="button" data-act="inv" data-op="open" data-id="${esc(it.id)}">Use</button>`:"";
  return `<div class="invrow${it.unk?" unk":""}"><button type="button" class="invn" data-act="inv" data-op="open" data-id="${esc(it.id)}"><b>${esc(it.n)}${it.q>
    1?` <i>×${it.q}</i>`:""}</b>${sub.length?`<small>${esc(sub.join(" · "))}</small>`:""}</button>${act}</div>`}
function invPips(ch,big){return `<span class="invpips${big?" big":""}" aria-label="${ch.c} of ${ch.m} charges left">${Array.from({length:Math.min(ch.m,
  30)},(_,i)=>`<i class="${i<ch.c?"on":""}"></i>`).join("")}</span>`}
function invSheetHtml(me){
  if(!invMe){invPull(true);return `<h2>Items and coins</h2><p class="psub">Reading your items from the laptop…</p>`}
  const fk=me&&me.kind==="pc"?frameKey(me):"",sh=shLocal(),M=invMe,others=state.list.filter(x=>x.kind==="pc"&&!x.hidden&&x.id!==me.id);
  if(pSheet==="inv"){
    const nav=sh?`<nav class="shtabs" aria-label="Sheet sections">${[["main","Main"],["spells","Spells"],["feat","Features"],["items","Items"]].map(([k,l])=>
      `<button type="button" data-act="shtab" data-v="${k}" aria-pressed="${k==="items"}">${l}</button>`).join("")}</nav>`:"";
    const att=M.it.some(x=>x.att||x.at),loot=state.loot&&Array.isArray(state.loot.it)?state.loot.it:[];
    return `<h2>${sh?"Your sheet":"Items and coins"}</h2><div class="shv inv${fk?" fr-"+fk:""}">${nav}
      <section class="invcard"><div class="invh"><b>Coins</b><span class="sp"></span>${others.length&&coinCp(M.c)>0?
        `<button class="pb" type="button" data-act="inv" data-op="givecoins">Give…</button>`:""}</div>
        <div class="invcoins">${COINS.map(([k,,L])=>`<button type="button" class="coin ${k}" data-act="inv" data-op="coin" data-k="${k}"><b>${M.c[
          k].toLocaleString(
          "en")}</b><small>${L}</small></button>`).join("")}</div>
        <small class="invnote">Tap a coin to add or spend. ${gpTxt(coinCp(M.c))} in all.</small></section>
      <section class="invcard"><div class="invh"><b>Items</b><span class="sp"></span>${att?`<span class="invatt">Attuned ${invAttuned()} / 3</span>`:""}</div>
        ${M.it.length?M.it.map(invItemRow).join(""):`<p class="invnote">Nothing yet. What the DM gives you shows up here.</p>`}</section>
      ${loot.length?`<button type="button" class="invloot" data-act="inv" data-op="loot"><b>The party's loot</b><small>${loot.length} item${loot.length>1?"s":
        ""} to take${coinCp(state.loot.c)?" · "+coinTxt(state.loot.c):""}</small></button>`:""}
      <button type="button" class="invadd" data-act="inv" data-op="add">+ Find or add an item</button></div>`}
  if(pSheet==="invitem"){
    const it=invItem(invView);if(!it)return `<h2>Item</h2><p class="psub">This item isn't in your items any more.</p>
      <div class="hpbtns"><button class="btn" type="button" data-act="inv" data-op="back">Back to Items</button></div>`;
    const fx=it.unk?[]:itemFx(it),ai=it.wpn?invAtkOf(it):-1,a=ai>=0?sh.att[ai]:null,ch=it.ch,mx=ch?Math.min(ch.c,10):0;
    if(invUseN>mx)invUseN=Math.max(1,mx);
    const spOk=n=>Array.isArray(spRows)&&spRows.some(r=>String(r[0]).toLowerCase()===n.toLowerCase());
    return `<h2>${esc(it.n)}</h2><div class="shv inv${fk?" fr-"+fk:""}">
      <section class="invcard"><div class="invline">${esc(it.unk?"Not yet known · the DM will tell you what it does":itemLine(it)||"Item")}${it.q>1?
        ` · ×${it.q}`:""}</div>
        ${fx.length?`<div class="invfx">${fx.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`:""}
        ${it.d?`<p class="invd">${esc(it.d).replace(/\n/g,"<br>")}</p>`:""}</section>
      ${ch?`<section class="invcard"><div class="invh"><b>Charges</b><span class="sp"></span><b class="invbig">${ch.c} <i>/ ${ch.m}</i></b></div>
        ${invPips(ch,true)}<small class="invnote">${ch.re?`${ch.amt?diceRead(ch.amt):"All"} come back ${ITEM_RE[ch.re]}${ch.re==="dawn"?
          " (with your long rest)":""}.`:"They don't come back by themselves."}</small>
        ${ch.c>0?`<div class="invuse"><button class="btn" type="button" data-act="inv" data-op="usen" data-d="-1" aria-label="One less"${invUseN<=1?" disabled":
          ""}>−</button><b>${invUseN}</b><button class="btn" type="button" data-act="inv" data-op="usen" data-d="1" aria-label="One more"${invUseN>=mx?
            " disabled":
          ""}>+</button><button class="btn primary" type="button" data-act="inv" data-op="use" data-id="${esc(it.id)}">Use ${invUseN} charge${invUseN>1?"s":
          ""}</button></div>`:`<p class="invnote">No charges left.</p>`}
        <div class="invfix"><button class="linkbtn" type="button" data-act="inv" data-op="chfix" data-d="-1" data-id="${esc(it.id)}">−1</button>
          <span>Fix the count</span><button class="linkbtn" type="button" data-act="inv" data-op="chfix" data-d="1" data-id="${esc(it.id)}">+1</button></div>
        ${(it.sp||[]).filter(spOk).map(n=>`<button class="btn" type="button" data-act="pbookopen" data-n="${esc(n)}" data-s="" data-from="inv">Open ${esc(
          n)}</button>`).join("")}</section>`:""}
      ${it.heal&&!it.unk?`<button class="btn primary invbtn" type="button" data-act="inv" data-op="drink" data-id="${esc(it.id)}"${it.ch&&it.ch.c<1?" disabled":
        ""}>${it.ch?"Heal":"Drink it · heal"} ${esc(diceRead(it.heal))}${it.ch?" · 1 charge":""}</button>`:""}
      ${it.wpn&&!it.unk?(a?`<div class="hpbtns"><button class="btn primary" type="button" data-act="inv" data-op="atk" data-id="${esc(it.id)}">Attack ${shS(
        Number(a.hit)||0)}</button>${a.dmg?`<button class="btn" type="button" data-act="inv" data-op="dmg" data-id="${esc(it.id)}">Damage ${esc(String(
          a.dmg).split(
          " ")[0])}</button>`:""}</div>`:sh?`<button class="btn invbtn" type="button" data-act="inv" data-op="toatk" data-id="${esc(
          it.id)}">Add to my attacks</button>`:`<button class="btn invbtn" type="button" data-act="inv" data-op="dmg" data-id="${esc(it.id)}">Roll damage ${esc(
          diceRead(it.wpn.dmg))}${it.wpn.b?` + ${it.wpn.b}`:""}</button>`):""}
      ${sh&&sh.ib&&(sh.ib.ac[it.id]!=null||sh.ib.sv[it.id]!=null)?`<p class="psub">On your sheet: ${[sh.ib.ac[it.id]!=null?shS(sh.ib.ac[it.id])+" AC":"",
        sh.ib.sv[it.id]!=null?shS(sh.ib.sv[it.id])+" to saving throws":""].filter(Boolean).join(" · ")}</p>`:it.att&&!it.at&&(it.acb||it.svb)?
        `<p class="psub">Its bonus counts once you attune to it.</p>`:""}
      <div class="invtog"><button type="button" class="btn" data-act="inv" data-op="eq" data-id="${esc(it.id)}" aria-pressed="${!!it.eq}">${it.eq?"✓ Equipped":
        "Equip"}</button>${it.att||it.at?`<button type="button" class="btn" data-act="inv" data-op="at" data-id="${esc(it.id)}" aria-pressed="${
          !!it.at}">${it.at?
        "✓ Attuned":"Attune"}</button>`:""}</div>
      <div class="hpbtns">${others.length?`<button class="btn" type="button" data-act="inv" data-op="give" data-id="${esc(it.id)}">Give to…</button>`:
        ""}<button class="btn" type="button" data-act="inv" data-op="drop" data-id="${esc(it.id)}">${it.q>1?"Drop one":"Drop it"}</button></div>
      <div class="hpbtns"><button class="btn" type="button" data-act="inv" data-op="back">Back to Items</button></div></div>`}
  if(pSheet==="invbonus"){const q=invBonus;if(!q||!sh)return `<h2>Items</h2><p class="psub">Nothing to change.</p>`;const ac=Number(sh.ac)||10;
    return `<h2>${esc(q.n)}</h2><div class="shv inv"><section class="invcard">${q.add?`<div class="invh"><b>${shS(q.v)} AC</b></div>
        <p class="invd">Add ${shS(q.v)} to the AC on your sheet? <b>${ac} → ${ac+q.v}</b></p>
        <small class="invnote">Say no if it doesn't count now (some items need no armor or no shield), or if your AC already has it.</small>`:
        `<div class="invh"><b>${shS(q.v)} AC</b></div><p class="invd">${esc(q.n)} isn't giving you its bonus any more. Take ${shS(
          q.v)} off your AC? <b>${ac} → ${
        ac-q.v}</b></p>`}</section>
      <div class="hpbtns"><button class="btn" type="button" data-act="inv" data-op="bonusno">${q.add?"No":
        "Keep my AC"}</button><button class="btn primary" type="button" data-act="inv" data-op="bonusyes">${
        q.add?`Add ${shS(q.v)}`:`Take ${shS(q.v)} off`}</button></div></div>`}
  if(pSheet==="invcoin"){const k=invCoin,L=(COINS.find(x=>x[0]===k)||COINS[0])[1];
    return `<h2>${L} · ${M.c[k].toLocaleString("en")} ${k}</h2>
      <div class="seg2">${COINS.map(([kk,LL])=>`<button type="button" data-act="inv" data-op="coin" data-k="${kk}" aria-pressed="${kk===
        k}">${LL}</button>`).join(
        "")}</div>
      <div class="psec padsec">${padHtml(`How many ${
        k}`)}<div class="hpbtns"><button class="btn heal" type="button" data-act="inv" data-op="coinadd">Add</button>
        <button class="btn dmg" type="button" data-act="inv" data-op="coinspend">Spend</button></div></div>
      <p class="psub">Spending more ${k} than you have takes change from your other coins.</p>
      <div class="hpbtns"><button class="btn" type="button" data-act="inv" data-op="back">Back to Items</button></div>`}
  if(pSheet==="invgive"){const g=invGive||{},it=g.id?invItem(g.id):null;
    if(g.id&&!it)return `<h2>Give</h2><p class="psub">This item isn't in your items any more.</p>`;
    return `<h2>Give ${it?esc(it.n):"coins"}</h2>
      ${it?(it.q>1?
        `<div class="invuse"><button class="btn" type="button" data-act="inv" data-op="giveq" data-d="-1" aria-label="One less">−</button><b>${g.q}</b>
        <button class="btn" type="button" data-act="inv" data-op="giveq" data-d="1" aria-label="One more">+</button><span class="psub">of ${
          it.q}</span></div>`:""):
        `<div class="seg2">${COINS.map(([kk,LL])=>`<button type="button" data-act="inv" data-op="givek" data-k="${kk}" aria-pressed="${kk===
          g.k}">${LL}</button>`).join(
          "")}</div><div class="psec padsec">${padHtml(`How many ${g.k}`)}</div>`}
      <div class="eyebrow2">To</div><div class="chipgrid">${others.map(x=>`<button type="button" class="btn" data-act="inv" data-op="giveto" data-to="${esc(
        x.id)}">${esc(x.name)}</button>`).join("")}</div>
      <div class="hpbtns"><button class="btn" type="button" data-act="inv" data-op="back">Back</button></div>`}
  if(pSheet==="invloot"){const L=state.loot&&Array.isArray(state.loot.it)?state.loot.it:[];
    return `<h2>The party's loot</h2><p class="psub">Take what you want: it goes into your items. ${coinCp(state.loot&&state.loot.c)?
      `The DM shares the coins (${esc(coinTxt(state.loot.c))}).`:""}</p>
      <div class="shv inv"><section class="invcard">${L.length?L.map(x=>`<div class="invrow"><span class="invn"><b>${esc(x.n)}${x.q>1?` <i>×${x.q}</i>`:
        ""}</b><small>${esc(x.unk?"Not yet known":itemLine(x)||
          "Item")}</small></span><button class="pb invq" type="button" data-act="inv" data-op="take" data-id="${
        esc(x.id)}">Take</button></div>`).join(""):`<p class="invnote">Nothing left.</p>`}</section></div>
      <div class="hpbtns"><button class="btn" type="button" data-act="inv" data-op="back">Back to Items</button></div>`}
  if(pSheet==="invgot"){const L=invGot.map(x=>invItem(x.id)||x);
    return `<div class="invgot"><div class="eyebrow2">${L.some(x=>x.rv&&x.rv>=(x.got||0))?"Now you know":"You got"}</div>
      ${L.map(x=>`<div class="invgotc"><b>${esc(x.n)}${x.q>1?` ×${x.q}`:""}</b><small>${esc(x.unk?"Not yet known":itemLine(x))}${x.from&&x.from!=="loot"?
        ` · from ${esc(x.from)}`:""}</small>${!x.unk&&itemFx(x).length?`<span class="invfx">${itemFx(x).map(f=>`<span>${esc(f)}</span>`).join("")}</span>`:
        x.unk&&x.d?`<span class="invd">${esc(x.d)}</span>`:""}</div>`).join("")}
      <button class="btn primary invbtn" type="button" data-act="inv" data-op="gotok">Nice!</button>
      <button class="btn invbtn" type="button" data-act="inv" data-op="items">Open my items</button></div>`}
  if(pSheet==="invadd"){
    if(invOwn)return `<h2>Write your own</h2><form id="invOwnForm" class="psec" autocomplete="off">
        <label class="fl">Name<input class="field big" id="invOwnN" type="text" data-kb="text" inputmode="none" maxlength="60" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="50 feet of rope" value="${
          esc(invOwn.n||"")}"></label>
        <label class="fl">A note (optional)<input class="field" id="invOwnD" type="text" data-kb="text" inputmode="none" maxlength="200" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="From the blacksmith in Millford" value="${
          esc(invOwn.d||"")}"></label></form>
      <div class="hpbtns"><button class="btn" type="button" data-act="inv" data-op="ownno">Back</button><button class="btn primary" type="button" data-act="inv" data-op="ownadd">Add it</button></div>`;
    if(invPick){const p=invPick,it=p.it,price=p.row?Number(p.row[7])||0:0;
      return `<h2>${esc(p.row?p.row[0]:"Item")}</h2>
        ${it?`<div class="shv inv"><section class="invcard"><div class="invline">${esc(itemLine(it)||"Item")}</div>
          ${itemFx(it).length?`<div class="invfx">${itemFx(it).map(x=>`<span>${esc(x)}</span>`).join("")}</div>`:""}
          ${it.d?`<p class="invd clip">${esc(it.d).replace(/\n/g,"<br>")}</p>`:""}</section></div>`:p.it===null?
          `<p class="psub">Couldn't read this item from the laptop.</p>`:`<p class="psub">Loading…</p>`}
        <div class="invuse"><button class="btn" type="button" data-act="inv" data-op="pickq" data-d="-1" aria-label="One less"${p.q<=1?" disabled":
          ""}>−</button><b>${
          p.q}</b><button class="btn" type="button" data-act="inv" data-op="pickq" data-d="1" aria-label="One more">+</button><span class="psub">how many</span></div>
        <div class="psec invpay"><label class="chk"><input type="checkbox" id="invPay"${p.pay?" checked":
          ""} data-act="inv" data-op="paytog"> Bought it? Pay from my coins</label>
          ${p.pay?
            `<div class="invpayrow"><button class="btn" type="button" data-act="inv" data-op="payd" data-d="-1" aria-label="Lower the price">−</button><b>${
            gpTxt(p.price)}</b><button class="btn" type="button" data-act="inv" data-op="payd" data-d="1" aria-label="Raise the price">+</button></div>
            <small class="psub">${price?`Listed at ${gpTxt(price)} each. `:""}You have ${gpTxt(coinCp(M.c))}${coinPay(M.c,p.price)?
              `, ${gpTxt(coinCp(M.c)-p.price)} after`:": not enough"}.</small>`:""}</div>
        <div class="hpbtns"><button class="btn" type="button" data-act="inv" data-op="pickno">Back to the list</button><button class="btn primary" type="button" data-act="inv" data-op="pickadd"${
          it?"":" disabled"}>Add${p.q>1?" "+p.q:""}</button></div>`}
    return `<h2>Find an item</h2>
      <div class="psec"><input class="field big" id="pItemQ" type="text" data-kb="text" inputmode="none" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Search items" value="${
        esc(invQ)}" aria-label="Search items"><p class="psub">Tap an item to read what it does. Add puts it in your items.</p></div>
      <div class="seg2 invkinds">${[["all","All"],["gear","Gear"],["weapon","Weapons"],["armor","Armor"],["magic","Magic"],["potion","Potions"]].map(([k,l])=>
        `<button type="button" data-act="inv" data-op="kind" data-k="${k}" aria-pressed="${invKind===k}">${l}</button>`).join("")}</div>
      <div id="pItemList">${invAddListHtml()}</div>
      <div class="hpbtns"><button class="btn" type="button" data-act="inv" data-op="own">Not in the list? Write your own</button></div>
      <div class="hpbtns"><button class="btn" type="button" data-act="inv" data-op="back">Back to Items</button></div>`}
  return ""}
function invAddListHtml(){
  if(!itemRows){itemsWant(()=>{const l=$("#pItemList");if(l)l.innerHTML=invAddListHtml()});return `<p class="psub">Loading the items…</p>`}
  const L=itemSearch(itemRows,invQ,invKind);invRowsShown=L.slice(0,40);
  if(!L.length)return `<p class="psub">${itemRows.length?"Nothing with that name.":"The laptop has no item list right now."}</p>`;
  return `<div class="shv inv"><section class="invcard">${invRowsShown.map((r,i)=>
    `<div class="invrow"><button type="button" class="invn" data-act="inv" data-op="pick" data-i="${
    i}"><b>${esc(r[0])}</b><small>${esc(itemRowLine(r)||"Item")}</small></button><button class="pb invq" type="button" data-act="inv" data-op="pick" data-i="${
    i}">Add</button></div>`).join("")}</section></div>${L.length>40?`<p class="psub">${L.length-40} more: type more of the name.</p>`:""}`}
/* the dice for a heal, a charge or a weapon, shared with the table like the sheet's rolls */
function invRoll(label,expr){const r=invDice(expr);if(!r)return null;if(!r.rolls.length)return r;   // a flat number: nothing to roll
  const text=`${label}: ${r.n}d${r.d} [${r.rolls.join(", ")}]${r.add?(r.add>0?" + ":" − ")+Math.abs(r.add):""}`,dd=r.rolls.map(v=>[r.d,v]);
  if(dice.share)pSend({action:"roll",kind:"roll",text:text.slice(0,40),total:r.tot,dice:dd});myDice(dd,r.tot,"roll");return r}
/* a long or short rest gives charges back */
function invRest(kind){if(!invMe)return [];const out=[];
  invMe.it.forEach(it=>{const ch=it.ch;if(!ch||!ch.re||ch.c>=ch.m)return;if(kind!=="long"&&ch.re!=="short")return;
    let add=ch.m;if(ch.amt){const r=invDice(ch.amt);add=r?r.tot:0}
    const c=Math.min(ch.m,ch.c+Math.max(0,add));if(c===ch.c)return;
    out.push(`${it.n} +${c-ch.c}`);pSend({action:"item_ch",iid:it.id,c});ch.c=c});
  if(out.length)setTimeout(()=>invPull(true),1600);return out}
function invAct(t){
  const op=t.dataset.op,me=meChar();if(!me)return;const it=t.dataset.id?invItem(t.dataset.id):null;
  switch(op){
    case "items": invPick=null;invOwn=null;pSheet="inv";invPull(true);renderPSheet();invBonusCheck();break;
    case "back": if(pSheet==="invgive"&&invGive&&invGive.id){invView=invGive.id;pSheet="invitem"}else pSheet="inv";invGive=null;renderPSheet();break;
    case "open": if(!it)break;invView=it.id;invUseN=1;pSheet="invitem";renderPSheet();{const b=$(".psheet .sbody");if(b)b.scrollTop=0}break;
    case "usen": invUseN=Math.max(1,invUseN+Number(t.dataset.d));renderPSheet();break;
    case "use":{if(!it||!it.ch)break;const n=Math.min(invUseN,it.ch.c);if(n<1)break;
      invSend({action:"item_use",iid:it.id,n},()=>{it.ch.c=Math.max(0,it.ch.c-n)}).then(ok=>{if(ok){toast(`${it.n}: ${n} charge${n>1?"s":
        ""} used, ${it.ch.c} left`);
        invUseN=1}});break}
    case "chfix":{if(!it||!it.ch)break;const c=Math.max(0,Math.min(it.ch.m,it.ch.c+Number(t.dataset.d)));if(c===it.ch.c)break;
      invSend({action:"item_ch",iid:it.id,c},()=>{it.ch.c=c});break}
    case "drink":{if(!it||!it.heal)break;if(it.ch&&it.ch.c<1){toast("No charges left");break}const r=invRoll(it.n,it.heal);if(!r)break;
      invSend({action:"item_use",iid:it.id,n:1},()=>{if(it.ch){it.ch.c-=1;return}it.q-=1;if(it.q<1){invMe.it=invMe.it.filter(x=>x!==it);
        if(pSheet==="invitem")pSheet="inv"}}).then(ok=>{
        if(!ok)return;const hp=hpGet();if(hp.max){hpChange("heal",r.tot);toast(`${it.n}: +${r.tot} HP`,5000)}
        else toast(`${it.n}: ${r.tot}. Set your max HP and the phone heals you itself next time`,6000)});break}
    case "atk":{if(!it)break;const i=invAtkOf(it),sh=shLocal();if(i<0)break;const a=sh.att[i];shRoll(`${a.n} to hit`,Number(a.hit)||0);
      toast(`${shLast.tot}: ${shLast.how}`,5000);renderPSheet();break}
    case "dmg":{if(!it)break;const i=invAtkOf(it),sh=shLocal();
      if(i>=0&&sh.att[i].dmg){shDmg(sh.att[i].n,sh.att[i].dmg);toast(`${shLast.tot}: ${shLast.how}`,5000);renderPSheet();break}
      if(!it.wpn)break;const r=invRoll(it.n+" damage",diceNorm(it.wpn.dmg)+(it.wpn.b?"+"+it.wpn.b:""));if(r)toast(`${it.n}: ${r.tot} damage`,5000);break}
    case "toatk":{const sh=shLocal();if(!it||!it.wpn||!sh)break;const C=shCalc(sh),w=it.wpn,b=Number(w.b)||0;
      const m=w.rg?C.m.dex:w.f?Math.max(C.m.str,C.m.dex):C.m.str,dm=m+b;
      sh.att=(sh.att||[]).filter(a=>a&&a.n);sh.att.push({n:it.n,hit:C.pb+m+b,dmg:`${diceNorm(w.dmg)}${dm?(dm>0?"+":"")+dm:""}${w.dt?" "+w.dt:""}`});
      shSave(sh,true);toast(`${it.n} is in your attacks (${shS(C.pb+m+b)}). Change it in Edit sheet if it's different`,6000);renderPSheet();break}
    case "eq": if(!it)break;invSend({action:"item_set",iid:it.id,eq:!it.eq},()=>{it.eq=!it.eq});break;
    case "at":{if(!it)break;if(!it.at&&invAttuned()>=3){toast("You can be attuned to 3 items at most: end one first");break}
      invSend({action:"item_set",iid:it.id,at:!it.at},()=>{it.at=!it.at});break}
    case "give": if(!it)break;invGive={id:it.id,q:1};pSheet="invgive";renderPSheet();break;
    case "givecoins": invGive={k:"gp"};padVal="";pSheet="invgive";renderPSheet();break;
    case "giveq": if(invGive&&invItem(invGive.id)){invGive.q=Math.max(1,Math.min(invItem(invGive.id).q,invGive.q+Number(t.dataset.d)));renderPSheet()}break;
    case "givek": if(invGive){invGive.k=t.dataset.k;renderPSheet()}break;
    case "giveto":{const g=invGive,to=byId(t.dataset.to);if(!g||!to)break;
      if(g.id){const x=invItem(g.id);if(!x)break;const q=Math.min(g.q||1,x.q);
        invSend({action:"item_give",iid:x.id,to:to.id,q},()=>{x.q-=q;if(x.q<1)invMe.it=invMe.it.filter(y=>y!==x)}).then(ok=>{if(ok){toast(`${to.name} got ${
          x.n}${q>1?" ×"+q:""}`);invGive=null;pSheet="inv";renderPSheet()}})}
      else{const n=parseInt(padVal,10);if(!(n>0)){toast("Type how many first");break}const left=coinPay(invMe.c,n*{gp:100,sp:10,cp:1}[g.k]);
        if(!left){toast("You don't have that much");break}
        invSend({action:"coins",to:to.id,d:{[g.k]:n}},M=>{M.c=left}).then(ok=>{if(ok){toast(`${to.name} got ${n} ${g.k}`);padVal="";invGive=null;pSheet="inv";
          renderPSheet()}})}
      break}
    case "drop":{if(!it)break;if(!t.classList.contains("armed")){t.classList.add("armed");t.textContent="Tap again to drop it";
      setTimeout(()=>{if(t.isConnected){t.classList.remove("armed");t.textContent=it.q>1?"Drop one":"Drop it"}},3500);break}
      invSend({action:"item_drop",iid:it.id,q:1},()=>{it.q-=1;if(it.q<1){invMe.it=invMe.it.filter(x=>x!==it);
        pSheet="inv"}}).then(ok=>{if(ok)toast(`${it.n} dropped`)});
      break}
    case "coin": invCoin=t.dataset.k||"gp";padVal="";pSheet="invcoin";renderPSheet();break;
    case "coinadd":case "coinspend":{const n=parseInt(padVal,10),k=invCoin;if(!(n>0)){toast("Type how many first");break}
      if(op==="coinspend"){const left=coinPay(invMe.c,n*{gp:100,sp:10,cp:1}[k]);if(!left){toast(`You have ${gpTxt(coinCp(invMe.c))} in all: not enough`);break}
        invSend({action:"coins",d:{[k]:-n}},M=>{M.c=left}).then(ok=>{if(ok){padVal="";toast(`Spent ${n} ${k}`);pSheet="inv";renderPSheet()}})}
      else invSend({action:"coins",d:{[k]:n}},M=>{M.c[k]+=n}).then(ok=>{if(ok){padVal="";toast(`+${n} ${k}`);pSheet="inv";renderPSheet()}});
      break}
    case "loot": pSheet="invloot";renderPSheet();break;
    case "take":{const x=state.loot&&(state.loot.it||[]).find(y=>y.id===t.dataset.id);if(!x)break;t.disabled=true;
      pSend({action:"loot_take",iid:x.id}).then(ok=>{if(ok){toast(`Taking ${x.n}…`);setTimeout(()=>invPull(true),1600)}else t.disabled=false});break}
    case "gotok": invGot=[];pSheet=null;renderPSheet();invBonusCheck();break;
    case "bonusyes":case "bonusno":{const q=invBonus,sh=shLocal();invBonus=null;pSheet=q&&q.back&&q.back!=="invbonus"?q.back:null;
      if(q&&sh){const ib=sh.ib=Object.assign({ac:{},sv:{},no:{}},sh.ib),ac=Number(sh.ac)||10;
        if(q.add&&op==="bonusyes"){sh.ac=ac+q.v;ib.ac[q.id]=q.v;toast(`AC ${ac} → ${sh.ac}`)}
        else if(q.add)ib.no[q.id]=true;
        else{if(op==="bonusyes"){sh.ac=ac-q.v;toast(`AC ${ac} → ${sh.ac}`)}delete ib.ac[q.id]}
        shSave(sh,true)}
      renderPSheet();invBonusCheck();break}
    case "add": invPick=null;invOwn=null;if(itemRows&&Date.now()-itemRowsAt>60000)itemRows=null;pSheet="invadd";renderPSheet();break;
    case "kind": invKind=t.dataset.k||"all";t.parentElement.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===t)));
      {const l=$("#pItemList");if(l)l.innerHTML=invAddListHtml()}break;
    case "pick":{const r=invRowsShown&&invRowsShown[Number(t.dataset.i)];if(!r)break;const price=Number(r[7])||0;
      invPick={row:r,it:undefined,q:1,pay:false,price,each:price};rrPSheet();
      itemGet(r[0],r[1]).then(x=>{if(invPick&&invPick.row===r){invPick.it=x;if(pSheet==="invadd")renderPSheet()}});break}
    case "pickq": if(invPick){invPick.q=Math.max(1,Math.min(99,invPick.q+Number(t.dataset.d)));if(invPick.each)invPick.price=invPick.each*invPick.q;
      renderPSheet()}break;
    case "paytog": if(invPick){invPick.pay=!!t.checked;renderPSheet()}break;
    case "payd": if(invPick){const d=Number(t.dataset.d),p=invPick.price,st=d>0?(p>=10000?1000:p>=100?100:10):(p>10000?1000:p>100?100:10);
      invPick.price=Math.max(0,p+d*st);renderPSheet()}break;
    case "pickno": invPick=null;rrPSheet();break;
    case "pickadd":{const p=invPick;if(!p||!p.it)break;const item=Object.assign({},p.it,{q:p.q}),body={action:"item_add",item};let left=null;
      if(p.pay&&p.price>0){left=coinPay(invMe.c,p.price);if(!left){toast("Not enough coins for that price");break}
        body.pay=coinSplit(p.price)}
      invSend(body,M=>{M.it.push(Object.assign({id:"new"+Date.now()},item));if(left)M.c=left}).then(ok=>{if(ok){toast(`${item.n}: in your items`);invPick=null;
        pSheet="inv";renderPSheet()}});break}
    case "own": invOwn={n:"",d:""};rrPSheet();setTimeout(()=>{const i=$("#invOwnN");i&&i.focus()},50);break;
    case "ownno": invOwn=null;rrPSheet();break;
    case "ownadd":{const n=($("#invOwnN")||{}).value||invOwn&&invOwn.n||"",d=($("#invOwnD")||{}).value||invOwn&&invOwn.d||"";
      if(!n.trim()){toast("Give it a name");break}const item={n:n.trim().slice(0,60),ty:"Gear",q:1,...(d.trim()?{d:d.trim().slice(0,200)}:{})};
      invSend({action:"item_add",item},M=>{M.it.push(Object.assign({id:"new"+Date.now()},item))}).then(ok=>{if(ok){toast(`${item.n}: in your items`);
        invOwn=null;
        pSheet="inv";renderPSheet()}});break}
  }
}
/* a price in cp as the fewest coins, for the laptop to take from the purse (it makes change itself) */
const coinSplit=cp=>{cp=Math.max(0,Math.round(cp));return {gp:Math.floor(cp/100),sp:Math.floor(cp%100/10),cp:cp%10}};
