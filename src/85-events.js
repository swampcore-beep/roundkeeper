/* ---------- events ---------- */
document.addEventListener("click",e=>{   // the row menu closes on any click outside it, and after any choice in it
  if(MODE!=="dm"||!menuId)return;const t=e.target.closest("[data-act]");
  if(t&&t.dataset.act==="rowmenu")return;
  if(t&&t.closest(".rmenu")&&t.dataset.keep)return;
  if(e.target.closest(".rmenu")&&(!t||t.tagName==="LABEL"||e.target.tagName==="SELECT"))return;
  menuId=null;setTimeout(()=>{if(!menuId)renderDM()},0);
});
document.addEventListener("click",e=>{
  if(MODE==="player"){
    const inf=$("#info");if(inf&&!inf.hidden){inf.hidden=true;return}
    const mc=e.target.closest("#player [data-more]");
    if(mc){showInfo(null,{t:mc.dataset.who?`Also on ${mc.dataset.who}`:"Effects",d:mc.dataset.more.split("|")});return}
    const chip=e.target.closest("#player [data-info],#player [data-eff],#player li.k-lair");
    if(chip){if(chip.dataset.eff)effectInfo(chip.dataset.eff);else showInfo(chip.dataset.info||"lair");return}
  }
  const t=e.target.closest("[data-act]");if(!t)return;
  const act=t.dataset.act;const row=t.closest(".row");const c=row?byId(row.dataset.id):null;
  switch(act){
    case "close": if(t.classList.contains("scrim")&&e.target!==t)return; closeSheet(); break;
    case "example": state.list=EXAMPLE();commit();break;
    case "prm": state.party.splice(Number(t.dataset.i),1);commit();break;
    case "pload": loadParty();state.ended=null;commit();break;
    case "pfromfight": state.party=sorted().filter(c=>c.kind==="pc").map(c=>({name:c.name,ac:c.ac??null,cls:c.cls||""}));commit();break;
    case "eload":{const en=state.encounters[Number(t.dataset.i)];if(!en)break;
      const rolled={};en.foes.forEach(f=>{const g=f.base||f.name;if(f.ib!=null&&rolled[g]==null)rolled[g]=d20()+f.ib;
        const init=sbInitMode==="hand"||f.ib==null?null:sbInitMode==="each"?d20()+f.ib:rolled[g];
        state.list.push(newCombatant(Object.assign({},JSON.parse(JSON.stringify(f)),{id:uid(),init,tb:(f.ib||0)*100-state.list.length})))});
      state.ended=null;commit();toast(`Encounter added: ${en.name}`);break}
    case "erm": state.encounters.splice(Number(t.dataset.i),1);commit();break;
    case "showac": c.showAc=!c.showAc;commit();break;
    case "bloodied": c.bloodied=!c.bloodied;commit();break;
    case "hidden": toggleHidden(c);commit();break;
    case "callclose": state.call=null;commit();break;
    case "know": knowSheet(c.id);break;
    case "kkind": t.parentElement.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===t)));break;
    case "knowrm":{const x=byId(t.dataset.id);if(!x)break;x.know.splice(Number(t.dataset.i),1);commit();if($("#knowForm"))knowSheet(x.id);break}
    case "tagrm": c.tags=(c.tags||[]).filter(x=>x!==t.dataset.t);commit();break;
    case "clearreact": clearReactions();break;
    case "recap": recapSheet();break;
    case "recapdoc":{const a=document.createElement("a"),d=new Date(state.fightAt||Date.now());
      a.href=URL.createObjectURL(new Blob([recapDoc()],{type:"text/html"}));
      a.download=`combat-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}.html`;document.body.appendChild(a);
        a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);break}
    case "recapcopy":{const ta=$("#recapText");const txt=ta?ta.value:recapText();
      const fb=()=>{if(ta){ta.select();try{document.execCommand("copy");toast("Recap copied")}catch(e){toast("Select the text and copy it")}}};
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(()=>toast("Recap copied"),fb);else fb();break}
    case "recapdl":{const a=document.createElement("a"),d=new Date(state.fightAt||Date.now());
      a.href=URL.createObjectURL(new Blob([recapText()],{type:"text/plain;charset=utf-8"}));a.download=`combat-recap-${d.toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);break}
    case "covercycle":{const o=["","half","tq","total"];c.cover=o[(o.indexOf(c.cover||"")+1)%o.length];commit();break}
    case "timer": startTimer(c);break;
    case "dsask": askDeathSave(c);break;
    case "ptoggle": if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();showPartyTable=!showPartyTable;renderParty();break;
    case "qadd": quickAdd($("#qAdd").value);$("#qAdd").value="";break;
    case "keys": shortcutsSheet();break;
    case "rowmenu": menuId=menuId===c.id?null:c.id;renderDM();break;
    case "atmo": atmoD=null;atmoT="surface";atmoSheet();loadBgList().then(()=>{if($(".sheet.atmo"))atmoRefresh()});break;
    case "scenepick": atmoD.scene=t.dataset.s;atmoRefresh();break;
    case "aweather": atmoD.weather=t.dataset.v;atmoRefresh();break;
    case "atod": atmoD.tod=t.dataset.v;atmoRefresh();break;
    case "atunereset": if(atmoD){atmoD.tune=Object.assign({},atmoD.tune);delete atmoD.tune[atmoD.scene||"none"];atmoRefresh()}break;
    case "sfxtoggle":{const k=t.dataset.k;if(k==="boss")state.sceneReact=state.sceneReact===false;else{state.sceneFx=Object.assign({},state.sceneFx);
      if(state.sceneFx[k]===false)delete state.sceneFx[k];else state.sceneFx[k]=false}commit();atmoRefresh();break}
    case "bgpick": atmoD.bg=t.dataset.f||"";atmoRefresh();break;
    case "athm": atmoTheme(t.dataset.v);break;
    case "apal": atmoSet("pal",t.dataset.v);break;
    case "afont": atmoSet("font",t.dataset.v);break;
    case "arows": atmoSet("rows",t.dataset.v);break;
    case "amine":{const m=myThemes().find(x=>x.id===t.dataset.id);if(m){const th=themeOf(m.theme),def={pal:th[0],rows:th[0],font:th[3],tfont:th[4]},L={};
      for(const k in m.look||{})if(m.look[k]&&m.look[k]!==def[k])L[k]=m.look[k];atmoD.theme=th[0];atmoD.look=L;atmoD.scene=m.scene||atmoD.scene;
      if(m.weather)atmoD.weather=m.weather;if(m.tod)atmoD.tod=m.tod;if(m.tune)atmoD.tune=JSON.parse(JSON.stringify(m.tune));atmoRefresh()}break}
    case "aminerm":{ls.set("myThemes",myThemes().filter(x=>x.id!==t.dataset.id));atmoRefresh();break}
    case "atmogo": atmoGo();break;
    case "qkscene": state.spfx={id:uid(),at:Date.now(),n:t.dataset.n||"",t:t.dataset.t||"",from:state.turn&&byId(state.turn.id)&&!byId(state.turn.id).hidden?
      state.turn.id:null,to:[]};finish();toast("✨ "+(t.dataset.n||"Spell")+" in the scene");break;
    case "tvbar": tvPopOn=!tvPopOn;tvBarRender();break;
    case "tvmode": state.tv=Object.assign({},state.tv,{mode:t.dataset.v});
      if(t.dataset.v==="pause"&&!(state.tv.pause&&state.tv.pause.until>Date.now()))state.tv.pause={until:Date.now()+10*60000,msg:"Short break"};commit();
      tvBarRender();break;
    case "tvpause":{const m=Number(t.dataset.v);state.tv=Object.assign({},state.tv);
      if(m){state.tv.pause={until:Date.now()+m*60000,msg:"Short break"}}else{delete state.tv.pause;if(state.tv.mode==="pause")state.tv.mode="auto"}commit();
      tvBarRender();toast(m?`Pause on the TV: ${m} min`:"Pause over");break}
    case "tvtitleclr": state.tv=Object.assign({},state.tv);delete state.tv.title;commit();tvBarRender();break;
    case "tvev":{const T=state.tv=Object.assign({},state.tv);T.ev=Object.assign({},T.ev,{[t.dataset.k]:t.dataset.v});commit();tvBarRender();break}
    case "tvlook": tvPopOn=false;tvBarRender();atmoT="tv";atmoD=null;atmoSheet();loadBgList().then(()=>{if($(".sheet.atmo"))atmoRefresh()});break;
    case "atmotab": if(atmoT!==t.dataset.v){if(atmoChanged().length)toast("Not sent: the "+(atmoT==="tv"?"TV":"tablet")+" keeps what it had");atmoT=t.dataset.v;
      atmoD=null;const fr=$("#atmoFrame");if(fr)fr.remove();atmoSheet()}break;
    case "atvown": atmoD=Object.assign(ATMO_KEYS(state),{same:false});atmoRefresh();break;
    case "atvsame": atmoD={same:true};atmoRefresh();break;
    case "amfont": atmoD.mfont=t.dataset.v;atmoRefresh();break;
    case "tvlayout": state.tv=Object.assign({},state.tv,{layout:t.dataset.v});commit();if($(".sheet.atmo2"))atmoRefresh();tvBarRender();break;
    case "dmdev": dmPair=null;dmDevLoad().then(dmDevSheet);break;
    case "dmpairnew": dmPairMake(dmPair&&dmPair.name||"");break;
    case "dmpaircancel": dmPair=null;dmDevLoad().then(dmDevSheet);break;
    case "dmunpair": fetch("/dm-unpair",{method:"POST",body:JSON.stringify({id:t.dataset.id})}).then(dmDevLoad).then(()=>{dmDevSheet();
      toast("Removed: that device is a player again")});break;
    case "dmforget": fetch("/dm-forget",{method:"POST",body:"{}"}).then(()=>{location.href="/players"});break;
    case "dmlight": ls.set("dmLight",!ls.get("dmLight",false));dmLightApply();break;
    case "atmodiscard": atmoD=atmoFromState();atmoRefresh();break;
    case "atmoclose": if(atmoChanged().length){toast("Not sent: the tablet keeps what it had");}atmoD=null;closeSheet();break;
    case "bgdel":{const f=t.dataset.f;fetch("/bg-delete",{method:"POST",body:JSON.stringify({file:f})}).then(()=>{if(state.bg===f){state.bg="";
      commit()}if(atmoD&&atmoD.bg===f)atmoD.bg="";return loadBgList()}).then(()=>{if($(".sheet.atmo"))atmoRefresh()});break}
    case "reacttoggle": state.sceneReact=state.sceneReact===false;commit();atmoRefresh();break;
    case "layoutpick": state.layout=t.dataset.v;commit();{const fr=$("#atmoFrame");if(fr)fr.remove()}atmoSheet();break;
    case "titleedit": titleSheet(c.id);break;
    case "hpclear": c.hp=null;c.hpMax=null;commit();break;
    case "logundo": undoLog(t.dataset.l);break;
    case "qr": qrSheet();break;
    case "devices": dmDevLoad().then(devSheet);break;
    case "devcopy":{const u=t.dataset.u,ok=()=>toast("Link copied"),fb=()=>{const i=document.createElement("textarea");i.value=u;document.body.appendChild(i);
      i.select();try{document.execCommand("copy");ok()}catch(e){toast(u)}i.remove()};
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(u).then(ok,fb);else fb();break}
    case "qrpick": state.joinUrl=t.dataset.u;commit();if($("#devSheet"))devSheet();else qrSheet();devPill();break;
    case "qrsurface": state.showQr=!state.showQr;commit();if($("#devSheet"))devSheet();else qrSheet();break;
    case "export": exportState();break;
    case "down": c.down=!c.down;if(!c.down)c.ds={s:0,f:0};commit();break;
    case "insp": c.insp=!c.insp;commit();break;
    case "boss": c.boss=!c.boss;commit();break;
    case "sgrp":{const on=!c.sgrp;[c,...grpKin(c)].forEach(x=>{if(on)x.sgrp=true;else delete x.sgrp});commit();
      toast(on?`The table sees “${grpBase(c)} ×${grpKin(c).length+1}” as one row`:`The table sees each ${grpBase(c)}`);break}
    case "revpv": revealPreview(c.id);break;
    case "intro": c.introAt=Date.now();commit();toast(c.hidden?"They're hidden; the intro will play when you reveal them":
      "Playing the intro on the tablet");break;
    case "ds":{const k=t.dataset.k,i=Number(t.dataset.i);c.ds=Object.assign({s:0,f:0},c.ds);c.ds[k]=c.ds[k]>i?i:i+1;commit();break}
    case "del": state.list=state.list.filter(x=>x!==c);commit();break;
    case "lairoff": state.lair=false;commit();break;
    case "lairshow": lairShow=!lairShow;renderDM();break;
    case "qk": qkSheet();break;
    case "deffon": dEffSheet({targets:new Set([t.dataset.id])});break;
    case "hppop": if(e.shiftKey){mtToggle(t.dataset.hid);break}if(hpPopId===t.dataset.hid)hpPopClose();else hpPopOpen(t.dataset.hid);break;
    case "hpgo": hpGo(t.dataset.k);break;
    case "hpq":{const x=byId(hpPopId);if(x){hpDo(x,"dmg",hpModN(Number(t.dataset.n)));commit();hpPopSync();$("#hpPopIn")&&$("#hpPopIn").focus()}break}
    case "hpmod": hpMod=hpMod===t.dataset.v?"":t.dataset.v;hpPopSync();$("#hpPopIn")&&$("#hpPopIn").focus();break;
    case "hpundo":{const x=byId(t.dataset.hid);if(x){hpUndo(x,t.dataset.e);commit();if(hpTipId)hpTipShow(hpTipId);toast("Taken back")}break}
    case "mtstart": mtStart(t.dataset.id);break;
    case "mttoggle":{const r=t.closest(".row");if(r)mtToggle(r.dataset.id);break}
    case "mtmode": mt.modes[t.dataset.id]=t.dataset.v;mtTargets();break;
    case "mtrm": mtSel.delete(t.dataset.id);renderDM();break;
    case "mtroll": mtRoll();break;
    case "mtapply": mtApply();break;
    case "mtclose": mtStop();break;
    case "caroll": concAnswer(t.dataset.id,"roll");break;
    case "cadrop": concAnswer(t.dataset.id,"drop");break;
    case "cakeep": concAnswer(t.dataset.id,"keep");break;
    case "clocknew": clockSheet();break;
    case "compnew":{compD={owner:t.dataset.id,q:"",pick:null,lvl:2,eff:""};const fe=state.effects.filter(e=>e.by===t.dataset.id&&e.conc).pop();
      if(fe)compD.eff=fe.id;menuId=null;(fetIdx?Promise.resolve():fetRefresh()).then(()=>compSheet());break}
    case "comppick":{const e=fetIdx&&fetIdx.find(x=>String(x[0])===t.dataset.id);if(e){compD.pick={id:e[0],n:e[1],s:e[2],l:e[2]};
      const lv=/spirit|summon/i.test(e[1])?Math.max(compD.lvl,2):compD.lvl;compD.lvl=lv}compSheet();break}
    case "compchg": compD.pick=null;compSheet();break;
    case "complvl": compD.lvl=Math.max(1,Math.min(9,compD.lvl+Number(t.dataset.d)));compSheet();break;
    case "compadd": compAdd();break;
    case "party": partySheet();break;
    case "revpvagain": revealPreview.play&&revealPreview.play();break;
    case "revpvgo":{const c2=byId(t.dataset.id);closeSheet();if(c2){c2.hidden=false;commit();toast(`${c2.name} revealed`)}break}
    case "titleedit2": titleSheet(t.dataset.id);break;
    case "clkm": case "clkp":{const k=(state.clocks||[]).find(x=>x.id===t.dataset.id);if(!k)break;if(a==="clkm"){k.n=Math.max(0,k.n-1);
      if(k.n===0&&!k.secret)state.clockFx={id:uid(),name:k.name,max:k.max,at:Date.now()}}else{k.n=Math.min(20,k.n+1);k.max=Math.max(k.max,k.n)}commit();break}
    case "clkrm": state.clocks=(state.clocks||[]).filter(x=>x.id!==t.dataset.id);commit();break;
    case "ongapply":{const k=dmCards.find(x=>x.id===t.dataset.id);if(!k)break;const c2=byId(k.cid);dmCards=dmCards.filter(x=>x!==k);
      if(c2&&c2.hpMax!=null){hpDo(c2,"dmg",k.tot,[k.name,k.t].filter(Boolean).join(", "));commit();
        toast(`${c2.name} −${k.tot} (${k.name})`)}else if(c2){pcConcAsk(c2,k.tot);commit();toast(`${c2.name} takes ${k.tot}${k.t?" "+k.t:""} (${k.name})`)}
      concAskRender();break}
    case "ongreroll":{const k=dmCards.find(x=>x.id===t.dataset.id);if(!k)break;const r=/^\d+$/.test(k.d)?{tot:Number(k.d),rolls:[k.d]}:sbDice(k.d,false);
      if(r){k.tot=r.tot;k.rolls=r.rolls;k.id=uid()}concAskRender();break}
    case "ongskip": dmCards=dmCards.filter(x=>x.id!==t.dataset.id);concAskRender();break;
    case "hdgo":{const k=dmCards.find(x=>x.id===t.dataset.id),pc=byId(t.dataset.pc);dmCards=dmCards.filter(x=>x!==k);
      if(k&&pc){state.hdywt={id:uid(),pc:pc.id,name:pc.name,cls:pc.cls||"",boss:k.boss,at:Date.now()};commit();
      setTimeout(()=>{if(state.hdywt&&Date.now()-state.hdywt.at>=14000){delete state.hdywt;commit()}},15000)}concAskRender();break}
    case "hdskip": dmCards=dmCards.filter(x=>x.id!==t.dataset.id);concAskRender();break;
    case "calost": concAnswer(t.dataset.id,"lost");break;
    case "pcconc":{const cc=byId(t.dataset.id||menuId);menuId=null;if(cc)pcConcSheet(cc.id);break}
    case "pcconcgo":{const cc=byId(t.dataset.id),n=Number($("#pcConcN").value);if(!cc||!(n>0)){toast("Type the damage");break}closeSheet();pcConcAsk(cc,n);
      commit();toast(`Asked ${cc.name}: Con save DC ${Math.min(30,Math.max(10,Math.floor(n/2)))}`);break}
    case "deffnew": dEffSheet();break;
    case "deffpick": dEffPick(t.dataset.n,t.dataset.s);break;
    case "deffname": dEffPick(dEff.q.trim(),"");break;
    case "deffchg": dEff.name="";dEff.src="";dEffRender(true);break;
    case "deffby": dEff.by=t.dataset.id;{const x=dEff.name&&spellFind(dEff.name,dEff.src);if(!dEff.by)dEff.conc=false;
      else if(x)dEff.conc=!!x[2]}dEffRender();break;
    case "defftgt": dEff.targets.has(t.dataset.id)?dEff.targets.delete(t.dataset.id):dEff.targets.add(t.dataset.id);dEffRender();break;
    case "deffadd": dEffAdd();break;
    case "psphb": spHb=!spHb;ls.set("spHb",spHb);if(dEff&&$("#dEffList"))$("#dEffList").innerHTML=dEffListHtml();break;
    case "refcast":{const n=t.dataset.n,src=t.dataset.s||"",by=t.dataset.by||"";refClose(0);dEffSheet({name:n,src,by,targets:new Set()});break}
    case "qkpick": qkSel=Number(t.dataset.i);qkRedraw(true,false);qkShow();break;
    case "qkgrp": qkGrp=t.dataset.v;qkSel=0;qkSearch();qkRedraw(true,false);qkShow();{const q=$("#qkQ");q&&q.focus()}break;
    case "qkold": qkOld=!qkOld;qkSearch();qkRedraw(true,false);break;
    case "qkhb": qkHb=!qkHb;qkSearch();qkRedraw(true,false);break;
    case "qktable": qkTable();break;
    case "nmroll": qkRedraw(false,true);break;
    case "nmpick":{nmLast=t.dataset.v;try{navigator.clipboard&&navigator.clipboard.writeText(nmLast).catch(()=>{})}catch(e){}
      const acts=document.querySelector("#qkCard .qkacts");if(acts){const tmp=document.createElement("div");tmp.innerHTML=qkCardHtml();
        const na=tmp.querySelector(".qkacts");if(na)acts.replaceWith(na)}toast("Copied: "+nmLast);break}
    case "nmgive":{const c2=byId(t.dataset.id);if(!c2||!nmLast)break;const was=c2.name;c2.name=nmLast;commit();toast(`${was} is now ${nmLast}`);nmLast="";
      qkRedraw(false,true);break}
    case "tcardoff": state.tcard=null;commit();break;
    case "lairuse":{const b=lairBoss();if(!b)break;const i=Number(t.dataset.i),R=state.turn?state.turn.round:0,l=b.sb.lairLast;
      if(l&&l.i===i&&l.r===R){b.sb.lairLast=null;commit();break}   // clicked again: not used after all
      b.sb.lairLast={i,r:R};const short=lairShort(b.sb.lair[i]||"");clogPush(`${b.name} lair action: ${short}`);commit();toast("Lair action: "+short);break}
    case "tstop": stopTimer();break;
    case "tnext": moveTurn(1);break;
    case "previewic": $("#preview").click();break;
    case "byhand":{const f=$("#addForm");const on=!f.classList.contains("byhand");f.classList.toggle("byhand",on);
      t.setAttribute("aria-expanded",String(on));break}
    case "tprev": moveTurn(-1);break;
    case "tend": turnMenuOn=false;state.turn=null;commit();toast("Turn tracking stopped");break;
    case "turnmenu": turnMenuOn=!turnMenuOn;renderDM();break;
    case "footmore": footMenu(!$("#footMenu").hidden?false:true);break;
    case "settingsopen":{if(sbViewId){sbViewId=null;renderDM()}const pn=document.querySelector('.panel[data-k="more"]');if(pn){pn.open=true;
      pn.scrollIntoView({block:"nearest",behavior:"smooth"});pn.classList.remove("ping");void pn.offsetWidth;pn.classList.add("ping")}break}
    case "sbopen": sbItems=[];libQ="";libArmed=null;sbSheet();setTimeout(()=>{const q=$("#fetQ")||$("#libQ");q&&q.focus()},0);
      fetRefresh().then(fetRedraw);break;
    case "fetpick": fetPick(t.dataset.id);break;
    case "fetold": {fetOld=!fetOld;const l=$("#fetList");if(l)l.innerHTML=fetListHtml();break}
    case "libuse":{const e=lib[Number(t.dataset.i)];if(!e)break;const before=sbItems.length;sbTake([e.raw]);
      if(sbItems.length>before){const it=sbItems[sbItems.length-1];it.name=e.name;if(e.fet)it.fet=e.fet;if(e.edited)it.edited=true}libArmed=null;
      sbSheet();break}
    case "libdel":{const i=Number(t.dataset.i);if(libArmed!==i){libArmed=i;const l=$("#libList");if(l)l.innerHTML=libListHtml();break}
      const e=lib.splice(i,1)[0];libArmed=null;libSave();toast(`Deleted from the library: ${e.name}`);sbSheet();break}
    case "sbview": if(c){sbViewId=sbViewId===c.id?null:c.id;sbCrit=false;sbSaveAsk=null;sbLoreOn=false;
      renderDM()}break;   // 82: a statblock opens on the statblock
    case "sbclose": sbViewId=null;renderDM();break;
    case "sbfollow": ls.set("sbFollow",!!t.checked);toast(t.checked?"The statblock follows the turn":"The statblock stays on this monster");break;
    case "sbadv": sbAdv=t.dataset.v;renderSbDrawer();break;
    case "sbnocrit": sbCrit=false;renderSbDrawer();break;
    case "sbroll": sbRoll(t);break;
    case "sbapply": sbApply(Number(t.dataset.i));break;
    case "sblore": sbLoreOn=true;renderSbDrawer();break;
    case "sbtab0": sbLoreOn=false;renderSbDrawer();break;
    case "loreimg":{const c2=byId(sbViewId);if(!c2)break;fetch("/5et/imgbg",{method:"POST",body:JSON.stringify({p:t.dataset.p})}).then(r=>r.ok?r.json():
      null).then(d=>{if(!d||!d.file){toast("Couldn't copy that picture");return}
      c2.introImg=d.file;c2.introImgP=t.dataset.p;picRemember(c2,d.file);commit();renderSbDrawer();
        toast(`${c2.name}'s intro shows this picture${c2.boss?"":" (make it a boss for the intro)"}`)});break}
    case "loreimgoff":{const c2=byId(sbViewId);if(c2){delete c2.introImg;delete c2.introImgP;picRemember(c2,null);commit();renderSbDrawer()}break}
    case "pics": picsSheet();break;
    case "updates": updSheet();break;
    case "updcheck": updCheck(true);break;
    case "gdata": gdArm=null;gdMsg="";gdSheet();break;
    case "gdrm": if(gdArm===t.dataset.n)gdRemove(t.dataset.n);else{gdArm=t.dataset.n;gdSheet()}break;
    case "picscheck":{const b2=t;b2.disabled=true;b2.textContent="Looking…";picsCheck();break}
    case "sbedit": sbEditSheet(sbViewId);break;
    case "sbedthis":{const c2=byId(t.dataset.id);if(!c2)break;const {raw,nm,x}=sbEdRead();if(!x){toast("Couldn't read that statblock");break}
      const keep=c2.sb;c2.sb=Object.assign({},keep,{raw,cr:x.cr,hpf:x.hpf,lr:x.lr?{max:x.lr,used:Math.min((keep.lr||{}).used||0,x.lr)}:null,la:x.la?{max:x.la,
        used:0}:null,
        uses:x.uses.map(u=>Object.assign({n:u.n,max:u.max,used:Math.min(((keep.uses||[]).find(o=>o.n===u.n)||{}).used||0,u.max)},u.sp?{sp:u.sp.slice()}:{})),
          rech:x.rech.map(r=>({n:r.n,min:r.min,ready:true})),know:x.know.slice()});
      if(x.ac!=null)c2.ac=x.ac;if(x.ib!=null)c2.ib=x.ib;if(x.hp&&x.hp!==c2.hpMax){const was=c2.hpMax;c2.hpMax=x.hp;
        c2.hp=c2.hp==null||c2.hp===was?x.hp:Math.min(c2.hp,x.hp)}
      closeSheet();commit();renderSbDrawer();toast(`${c2.name}'s statblock changed`);break}
    case "sbednew":{const c2=byId(t.dataset.id);if(!c2)break;const {raw,nm,x}=sbEdRead();if(!x||!nm){toast("Give it a name");break}
      if(lib.some(y=>y.name.toLowerCase()===nm.toLowerCase())&&nm.toLowerCase()===(c2.base||c2.name).toLowerCase()){
        toast("Give it a new name, or it replaces the one in your library");break}
      libPut({name:nm,raw,cr:x.cr,ctype:x.ctype||c2.ctype,fet:c2.sb.fet,edited:true});libSave();closeSheet();
        toast(`Saved to your library: ${nm} (+ Add → Library)`);break}
    case "sbsave": sbSaveAsk={ab:t.dataset.ab.charAt(0).toUpperCase()+t.dataset.ab.slice(1).toLowerCase(),dc:Number(t.dataset.dc),n:t.dataset.n||"",to:
      state.list.filter(x=>x.kind==="pc"&&!x.hidden).map(x=>x.id)};renderSbDrawer();break;
    case "callpick":{const id=t.dataset.id;if(callSkip.has(id))callSkip.delete(id);else callSkip.add(id);renderCall();break}
    case "sbasktgt":{if(!sbSaveAsk)break;const id=t.dataset.id;sbSaveAsk.to=sbSaveAsk.to.includes(id)?sbSaveAsk.to.filter(x=>x!==id):sbSaveAsk.to.concat([id]);
      renderSbDrawer();break}
    case "sbaskno": sbSaveAsk=null;renderSbDrawer();break;
    case "sbasksend":{if(!sbSaveAsk||!sbSaveAsk.to.length)break;const a=sbSaveAsk,src=byId(sbViewId);sbSpend(src,a.n);
      state.call={id:uid(),text:`${a.ab} save DC ${a.dc}${a.n?" · "+a.n:""}`,dc:a.dc,at:Date.now(),to:a.to.slice(),answers:{}};sbSaveAsk=null;commit();
      toast(`Roll call sent: ${a.ab} save DC ${a.dc}`);const pn=document.querySelector('#side details.panel[data-k="call"]');if(pn)pn.open=true;break}
    case "sbdrop": sbItems.splice(Number(t.dataset.i),1);sbSheet();break;
    case "sbinit":{const x=sbItems[Number(t.dataset.i)];if(x){x.im=t.dataset.m;sbInitMode=t.dataset.m;ls.set("initMode",sbInitMode);sbSheet()}break}
    case "sbcount":{const x=sbItems[Number(t.dataset.i)];if(x){x.count=Math.max(1,Math.min(12,x.count+Number(t.dataset.d)));sbSheet()}break}
    case "sbadd": sbAdd();break;
    case "sbuse":{if(!c||!c.sb)break;const o=t.dataset.k==="use"?c.sb.uses[Number(t.dataset.j)]:c.sb[t.dataset.k];if(!o)break;
      o.used=Math.max(0,Math.min(o.max,o.used+(t.classList.contains("used")?-1:1)));commit();
      break}   // full ones first: a full pip uses one, a spent one gives one back
    case "sbstep":{if(!c||!c.sb)break;const o=c.sb.uses[Number(t.dataset.j)];if(o){o.used=Math.min(o.max,o.used+1);commit()}break}
    case "sbla0": if(c&&c.sb&&c.sb.la){c.sb.la.used=0;commit()}break;
    case "sblair":{if(!c||!c.sb)break;const s2=c.sb;s2.inLair=!s2.inLair;
      if(s2.la&&s2.laLair){if(s2.inLair){s2.la.base=s2.la.max;s2.la.max=s2.laLair}else{s2.la.max=s2.la.base||s2.la.max;delete s2.la.base;
        s2.la.used=Math.min(s2.la.used,s2.la.max)}}
      if(s2.lr&&s2.lrLair){if(s2.inLair){s2.lr.base=s2.lr.max;s2.lr.max=s2.lrLair}else{s2.lr.max=s2.lr.base||s2.lr.max;delete s2.lr.base;
        s2.lr.used=Math.min(s2.lr.used,s2.lr.max)}}
      if((s2.lair||[]).length){if(s2.inLair)state.lair=true;else if(!lairBoss())state.lair=false}
      if(!s2.inLair)lairRegOpen.delete(c.id);
      commit();toast(s2.inLair?[`${c.name} is in its lair`,s2.laLair&&s2.la?`${s2.laLair} Legendary Actions`:"",s2.lrLair&&s2.lr?
        `${s2.lrLair} Legendary Resistances`:"",(s2.lair||[]).length?"lair actions on initiative 20":""].filter(Boolean).join(" · "):
        `${c.name} is out of its lair`);break}
    case "sbreg": if(c){lairRegOpen.has(c.id)?lairRegOpen.delete(c.id):lairRegOpen.add(c.id);renderDM()}break;
    case "sbexpand": if(c){sbOpenRows.has(c.id)?sbOpenRows.delete(c.id):sbOpenRows.add(c.id);renderDM()}break;
    case "sbrech":{if(!c||!c.sb)break;const r=c.sb.rech[Number(t.dataset.j)];if(!r)break;
      if(r.ready){r.ready=false;commit();toast(`${c.name}: ${r.n} used`)}
      else{const d=1+Math.floor(Math.random()*6);if(d>=r.min){r.ready=true;toast(`d6 = ${d}: ${r.n} is back`)}else toast(`d6 = ${d}: ${r.n} not yet`);
        commit()}break}
    case "sbresetall": if(c&&c.sb){if(c.sb.lr)c.sb.lr.used=0;if(c.sb.la)c.sb.la.used=0;(c.sb.uses||[]).forEach(u=>u.used=0);
      (c.sb.rech||[]).forEach(r=>r.ready=true);commit();toast("Counters reset")}break;
    case "sbknow":{const x=byId(t.dataset.id);if(!x)break;x.know=(x.know||[]).concat([t.dataset.k]);commit();knowSheet(x.id);break}
    case "tadd": if(state.timer){state.timer.secs=Math.min(600,state.timer.secs+10);commit();dmTimerTick()}break;
    case "unend": state.ended=null;commit();break;
    case "up": case "dn":{const l=sorted();const i=l.indexOf(c);const o=l[act==="up"?i-1:i+1];if(!o)break;
      if((o.tb||0)===(c.tb||0))c.tb=(o.tb||0)+(act==="up"?.01:-.01);else{const x=c.tb;c.tb=o.tb;o.tb=x}commit();break}
    case "rmcond": c.conds.splice(Number(t.dataset.j),1);commit();break;
    case "conds": condSheet(c.id);break;
    case "pickcond":{const x=byId(condTarget);if(!x)break;const n=t.dataset.n;x.conds=x.conds||[];const j=x.conds.indexOf(n);
      if(j>=0){x.conds.splice(j,1);if(n==="Exhaustion")delete x.exh}else{x.conds.push(n);if(n==="Exhaustion")x.exh=1}
      t.setAttribute("aria-pressed",String(j<0));commit();condSheet(condTarget);break}
    case "exh":{const l=exhOf(c)+Number(t.dataset.d);
      if(l<1){c.conds=c.conds.filter(x=>(x.n||x)!=="Exhaustion");delete c.exh}else c.exh=Math.min(6,l);commit();break}
    case "fs": fsToggle();break;
    case "pwho": pSheet="who";renderPSheet();break;
    case "pmore": pSheet="more";renderPSheet();break;
    case "plight": ls.set("pLight",!ls.get("pLight",false));renderPlayer();renderPSheet();break;
    case "psimple": ls.set("pSimple",!pSimple());pmodeSync(true);renderPlayer();renderPSheet();
      toast(pSimple()?"Simple mode: just your HP":"Everything is back");break;
    case "pconroll": rollConcentration(!!t.dataset.adv);break;
    case "pconhp": if(pConc&&!pConc.hpTaken){pConc.hpTaken=true;hpChange("dmg",pConc.dmg)}break;
    case "pconres":{const ok=t.dataset.ok==="1";if(pConc)pConc.res={d:0,tot:"✓",ok,text:"Real dice"};
      if(pConc&&pConc.ask){const v=$("#pConTot"),tv=v&&v.value.trim()!==""&&Number.isFinite(Number(v.value))?Number(v.value):null;
        pSend({action:"concans",ask:pConc.ask,ok,total:tv})}
      else if(!ok)pSend({action:"cond",cond:"Concentrating",on:false});
      if(pConc&&!ok)pConc.res.tot="✗";renderPSheet();break}
    case "pdsroll": rollDeathSave();break;
    case "phpmax": hpEditMax=true;renderPSheet();break;
    case "phpmaxno": hpEditMax=false;renderPSheet();break;
    case "pkey": padKey(t.dataset.k);try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}break;
    case "pcallsend":{const v=parseInt(padVal,10),st=$("#pCallStatus");
      if(isNaN(v)){if(st){st.textContent="Enter your total, e.g. 14";st.className="e-status err"}break}
      pSend({action:"answer",call:state.call&&state.call.id,value:v}).then(ok=>{if(ok){padVal="";pSheet=null;renderPSheet();toast(`Sent: ${v}`)}});break}
    case "pinitsend":{const v=parseInt(padVal,10),st=$("#pStatus");
      if(isNaN(v)||v<-10||v>60){if(st){st.textContent="Enter a number, e.g. 14";st.className="e-status err"}break}
      pSend({action:"init",value:v}).then(ok=>{if(!ok)return;padVal="";const sh=$("#padShow");if(sh){sh.dataset.ph=`Now ${v}`;
        sh.textContent=""}const s2=$("#pStatus");if(s2){s2.textContent=`Sent: ${v} ✓`;
        s2.className="e-status ok"}setTimeout(()=>{if(pSheet==="init"){pSheet=null;renderPSheet()}},1100)});break}
    case "phpdo":{const kind=t.dataset.hp,n=parseInt(padVal,10);
      if(isNaN(n)||n<0||(kind==="max"&&n<1)){toast(kind==="max"?"Type your max HP first":"Type an amount first");break}
      if(kind==="max")hpEditMax=false;padVal="";const el=$("#padShow");if(el)el.textContent="";hpChange(kind,n);break}
    case "pspell":{const x=spellFind(t.dataset.n,t.dataset.s);if(!x)break;effDraft.name=x[0].slice(0,30);effDraft.src=x[7]||"";effDraft.conc=!!x[2];
      effDraft.area=!!x[3];effDraft.custom=false;rrPSheet();const b=$(".psheet .sbody");if(b)b.scrollTop=0;break}
    case "pspellother": effDraft.custom=true;effDraft.name=spellQ.trim();rrPSheet();setTimeout(()=>{const i=$("#pEffName");i&&i.focus()},50);break;
    case "pspellchg": effDraft.name="";effDraft.custom=false;rrPSheet();break;
    case "pspellscope": spellScope=t.dataset.v;rrPSheet();break;
    case "psphb": spHb=!spHb;ls.set("spHb",spHb);rrPSheet();break;
    case "psped": ls.set(spEdKey(),t.dataset.v);rrPSheet();break;
    case "pbook": pSheet="book";renderPSheet();break;
    case "pbooklvl": bookLvl=t.dataset.v===""?null:Number(t.dataset.v);rrPSheet();break;
    case "pbookopen":{const n=t.dataset.n,src=t.dataset.s||"",from=t.dataset.from||(pSheet==="spell"&&spView?spView.from:"book");
      spView={n,s:src,from};pSheet="spell";renderPSheet();
      refGet("spell",n,src,true).then(d=>{if(!spView||spView.n!==n||spView.s!==src)return;spView.d=d;if(pSheet==="spell")renderPSheet()});break}
    case "pbookback": pSheet=spView&&spView.from==="effs"?"effs":"book";renderPSheet();break;
    case "pspfx": pSend({action:"spfx",n:t.dataset.n||"",t:t.dataset.t||""});toast("✨ "+(t.dataset.n||"Your spell")+" on the table");break;
    case "pbookeff":{const x=spellFind(spView&&spView.n,spView&&spView.s);if(!x)break;
      effDraft={name:x[0].slice(0,30),src:x[7]||"",conc:!!x[2],area:!!x[3],targets:new Set(),custom:false};pSheet="effs";renderPSheet();break}
    case "presp":{resDraft.name=t.dataset.n;resDraft.hint=t.dataset.h||"";resDraft.reset=t.dataset.r||RES_PRESETS[t.dataset.n]||"long";resDraft.custom=false;
      padVal="";rrPSheet();const b=$(".psheet .sbody");if(b)b.scrollTop=b.scrollHeight;break}
    case "presother": resDraft.custom=true;resDraft.name="";padVal="";rrPSheet();setTimeout(()=>{const i=$("#pResName");i&&i.focus()},50);break;
    case "preschg": resDraft.name="";resDraft.custom=false;rrPSheet();break;
    case "presall": resAll=!resAll;rrPSheet();break;
    case "mychip":{const k=t.dataset.k;
      if(!t.classList.contains("armed")){document.querySelectorAll(".mychip.armed").forEach(b=>{b.classList.remove("armed");b.textContent=b.dataset.t});
        t.dataset.t=t.textContent;t.classList.add("armed");t.textContent=k==="exh"?"Lower by 1?":"Remove?";clearTimeout(chipT);
        chipT=setTimeout(()=>{if(t.isConnected){t.classList.remove("armed");t.textContent=t.dataset.t}},3000);break}
      clearTimeout(chipT);t.classList.remove("armed");t.classList.add("gone");t.textContent=t.dataset.t;
      if(k.startsWith("cond:"))pSend({action:"cond",cond:k.slice(5),on:false});
      else if(k.startsWith("tag:"))pSend({action:"tag",tag:k.slice(4),on:false});
      else if(k==="cover")pSend({action:"cover",cover:""});
      else if(k==="exh"){const me=meChar();if(me)pSend({action:"exh",level:Math.max(0,exhOf(me)-1)})}
      break}
    case "pickme": meName=t.dataset.n;ls.set("meName",meName);pSheet=null;render();break;
    case "pshared": meName="*";ls.set("meName",meName);pSheet=null;render();break;
    case "ptv": location.href="/players?shared=1&screen=tv";break;
    case "pinit": pSheet="init";renderPSheet();break;
    case "pconds": pSheet="conds";renderPSheet();break;
    case "pclose": if(t.classList.contains("scrim")&&e.target!==t)return; pSheet=null;hpEditMax=false;renderPSheet();break;
    case "pcond":{const on=t.getAttribute("aria-pressed")!=="true";t.setAttribute("aria-pressed",String(on));pSend({action:"cond",cond:t.dataset.n,on});break}
    case "pexh":{const me=meChar();if(!me)break;const shown=$("#pExh"),cur=shown&&/^\d$/.test(shown.textContent)?Number(shown.textContent):shown?0:((me.conds||
      []).some(x=>(x.n||x)==="Exhaustion")?exhOf(me):0);   // count from what's on screen, so quick double taps add up
      const l=Math.max(0,Math.min(6,cur+Number(t.dataset.d)));const b=$("#pExh");if(b)b.textContent=l||"—";pSend({action:"exh",level:l});break}
    case "pds":{const me=meChar();if(!me)break;const ds=Object.assign({s:0,f:0},me.ds);const k=t.dataset.k,i=Number(t.dataset.i);ds[k]=ds[k]>i?i:i+1;
      t.parentElement.querySelectorAll(".pip").forEach((p,j)=>p.classList.toggle("on",j<ds[k]));pSend({action:"ds",s:ds.s,f:ds.f});break}
    case "peToggle": state.playerEdits=!canEdit();commit();break;
    case "effrm": state.effects=state.effects.filter(x=>x.id!==t.dataset.e);commit();break;
    case "peffs": pSheet="effs";renderPSheet();break;
    case "php": pSheet="hp";renderPSheet();break;
    case "pdice": pSheet="dice";renderPSheet();break;
    case "pdie": dice.die=Number(t.dataset.d);if(dice.die!==20)dice.adv="";renderPSheet();break;
    case "pdcount": dice.count=Math.max(1,Math.min(10,dice.count+Number(t.dataset.d)));if(dice.count>1)dice.adv="";renderPSheet();break;
    case "padv": dice.adv=t.dataset.v;if(dice.adv)dice.count=1;renderPSheet();break;
    case "proll": rollDice();break;
    case "pnat":{const k=t.dataset.k;pSend({action:"roll",kind:k,text:"real dice",total:k==="nat20"?20:1});
      toast(k==="nat20"?"Nat 20 on the big screen!":"Nat 1… on the big screen");break}
    case "ptag":{const on=t.getAttribute("aria-pressed")!=="true";t.setAttribute("aria-pressed",String(on));pSend({action:"tag",tag:t.dataset.t,on});break}
    case "pcover":{t.parentElement.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===t)));
      pSend({action:"cover",cover:t.dataset.c});break}
    case "pres": pcDraft=null;pSheet="res";renderPSheet();break;
    case "pcset": pSheet="pcset";renderPSheet();break;
    case "psheet": shLast=null;pSheet="sheet";renderPSheet();break;
    case "shnew":{const me=meChar();shDraft=shFromProf(me);shStep=0;pSheet="shed";renderPSheet();break}
    case "shedit":{const me=meChar();shDraft=JSON.parse(JSON.stringify(Object.assign(shBlank(me&&me.name),shLocal()||{})));shDraft.att=shDraft.att||[];
      shDraft.sv=shDraft.sv||[];shDraft.sk=shDraft.sk||{};shStep=0;pSheet="shed";renderPSheet();break}
    case "shcancel": shDraft=null;pSheet="sheet";renderPSheet();break;
    case "shstep": shStep=Math.max(0,Math.min(4,shStep+Number(t.dataset.d)));rrPSheet();{const s2=$("#overlay .sheet");if(s2)s2.scrollTop=0}break;
    case "shdone": shSave(shDraft);shDraft=null;pSheet="sheet";renderPSheet();break;
    case "shnum":{const d=shDraft,k=t.dataset.k,n=Number(t.dataset.d),C=shCalc(d);
      if(k.startsWith("hit:")){const a=d.att[+k.slice(4)];if(a)a.hit=Math.max(-5,Math.min(30,(Number(a.hit)||0)+n))}
      else if(k==="init")d.init=Math.max(-5,Math.min(20,C.init+n));else if(k==="prof")d.prof=Math.max(2,Math.min(9,C.pb+n));
      else if(k==="lvl")d.lvl=Math.max(1,Math.min(20,(Number(d.lvl)||1)+n));else if(k==="hp")d.hp=Math.max(0,Math.min(999,(Number(d.hp)||0)+n));
      else if(k==="ac")d.ac=Math.max(1,Math.min(40,(Number(d.ac)||10)+n));else if(k==="speed")d.speed=Math.max(0,Math.min(200,(Number(d.speed)||30)+n));
        shRe();break}
    case "shab": shDraft.ab[t.dataset.a]=Math.max(1,Math.min(30,(Number(shDraft.ab[t.dataset.a])||10)+Number(t.dataset.d)));shRe();break;
    case "shsv":{const a=t.dataset.a,L=shDraft.sv;shDraft.sv=L.includes(a)?L.filter(x=>x!==a):L.concat([a]);shRe();break}
    case "shsk": shDraft.sk[t.dataset.k]=Number(t.dataset.v);if(!shDraft.sk[t.dataset.k])delete shDraft.sk[t.dataset.k];shRe();break;
    case "shsa": shDraft.sa=t.dataset.v;shRe();break;
    case "shattadd": shDraft.att.push({n:"",hit:shCalc(shDraft).pb+Math.max(shCalc(shDraft).m.str,shCalc(shDraft).m.dex),dmg:""});shRe();break;
    case "shattdel": shDraft.att.splice(Number(t.dataset.i),1);shRe();break;
    case "dmsheet":{const cc=c||byId(t.dataset.id);if(!cc)break;dmShId=cc.id;const had=(state.sheets||{})[cc.name.toLowerCase()];
      shDraft=JSON.parse(JSON.stringify(Object.assign(shBlank(cc.name),had||{})));if(!had){const k=String(cc.cls||"").toLowerCase();
        shDraft.cls=LABEL[cc.cls]||"";shDraft.sv=(SH_CLS_SV[k]||[]).slice();shDraft.sa=SH_CLS_SA[k]||"";if(cc.ac)shDraft.ac=cc.ac}
      shDraft.att=shDraft.att||[];shDraft.sv=shDraft.sv||[];shDraft.sk=shDraft.sk||{};shPaste=null;renderDM();dmSheetSheet();break}
    case "dmshparse":{const ta=$("#dm_paste");shPaste={text:ta?ta.value:"",res:null};shPaste.res=shParse(shPaste.text,shDraft);shDraft=shPaste.res.sh;
      shDraft.att=shDraft.att||[];dmSheetSheet();break}
    case "dmshsave":{const c=byId(dmShId);if(!c||!shDraft)break;const only=!!t.dataset.only;state.sheets=Object.assign({},state.sheets);
      state.sheets[c.name.toLowerCase()]=Object.assign(shDraft,{name:c.name,v:Date.now(),by:"dm",only});shDraft=null;shPaste=null;dmShId=null;
        $("#overlay").innerHTML="";commit();
      toast(only?`${c.name}'s sheet: only you see it`:`Sent to ${c.name}'s phone`);break}
    case "shpaste": shPaste={text:"",res:null};pSheet="shpaste";renderPSheet();break;
    case "shparse":{const ta=$("#sh_paste"),me=meChar();shPaste={text:ta?ta.value:"",res:null};shPaste.res=shParse(shPaste.text,shLocal()||shFromProf(me));
      renderPSheet();break}
    case "shpastefix": if(shPaste&&shPaste.res){shDraft=shPaste.res.sh;shDraft.att=shDraft.att||[];shStep=0;pSheet="shed";renderPSheet()}break;
    case "shpastesave": if(shPaste&&shPaste.res){shSave(shPaste.res.sh);shPaste=null;pSheet="sheet";renderPSheet()}break;
    case "shall": shAll=!shAll;renderPSheet();break;
    case "shroll":{const sh=shLocal();if(!sh)break;const C=shCalc(sh),k=t.dataset.k,a=t.dataset.a,A=SH_AB3[a]?SH_AB3[a][0]+SH_AB3[a].slice(1).toLowerCase():"";
      if(k==="ab")shRoll(`${SH_ABN[a]} check`,C.m[a]);else if(k==="sv")shRoll(`${A} save`,C.sv[a]);
        else if(k==="sk")shRoll((SH_SK.find(x=>x[0]===a)||["",a])[1],C.sk[a]);
      else if(k==="spatk")shRoll("Spell attack",C.atk||0);else{const at=(sh.att||[])[Number(t.dataset.i)];
        if(at){if(k==="hit")shRoll(`${at.n} to hit`,Number(at.hit)||0);else shDmg(at.n,at.dmg)}}
      renderPSheet();break}
    case "pcallroll":{const call=state.call,ask=call&&shAsk(call.text);if(!ask)break;const r=shRoll(ask.label,ask.b);
      pSend({action:"answer",call:call.id,value:r.tot,...(r.d===20||r.d===1?{nat:r.d}:{})}).then(ok=>{if(ok){padVal="";pSheet=null;renderPSheet();
        toast(`${ask.label}: ${r.tot} (d20 ${r.d} ${shS(ask.b)}), sent`,5000)}});break}
    case "palwform": alwDraft={n:t.dataset.n,s:t.dataset.s||"",from:ls.get("spAlwFrom",""),lvl:1};renderPSheet();break;
    case "palwno": alwDraft=null;renderPSheet();break;
    case "palwdel":{ls.set(alwKey(),alwOwn().filter(a=>a.n.toLowerCase()!==t.dataset.n.toLowerCase()));renderPSheet();toast("Not always prepared");break}
    case "pprep":{const n=t.dataset.n,src=t.dataset.s||"";let L=prepGet();
      if(prepHas(n,src)){L=L.filter(p=>!(p.n===n&&(p.s||"")===src));ls.set(prepKey(),L);shTouch();renderPSheet();break}
      const d=spView&&spView.d,rx=d&&d.item?prepKind(d.item):"";L.push({n,s:src,...(rx?{rx}:{})});ls.set(prepKey(),L);shTouch();renderPSheet();
      toast(rx&&rx!=="other"?`Prepared. Your phone buzzes when ${n} could matter`:"Prepared");break}
    case "preactuse":{const el=$("#reactPing");if(el)el.remove();pSend({action:"tag",tag:"reaction",on:true});spView={n:t.dataset.n,s:t.dataset.s,from:"book"};
      pSheet="spell";renderPSheet();
      refGet("spell",spView.n,spView.s).then(d=>{if(spView&&spView.n===t.dataset.n){spView.d=d;renderPSheet()}});break}
    case "preactno":{const el=$("#reactPing");if(el)el.remove();break}
    case "pgiftuse":{const me=meChar(),g=me&&(me.gifts||[]).find(x=>x.id===t.dataset.id);if(!g)break;
      const n=Number(g.die.slice(1)),r=1+Math.floor(Math.random()*n);
      pSend({action:"giftuse",gid:g.id,roll:r});toast(`${g.n}: ${g.die} → ${r}`,6000);
        if(dice.share)pSend({action:"roll",kind:"roll",text:`${g.n} ${g.die}`,total:r});break}
    case "pgive":{const r=resGet()[Number(t.dataset.i)];if(!r||r.cur<1){toast("None left");
      break}giveDraft={i:Number(t.dataset.i),name:r.name,die:giveDie(r.name)};pSheet="give";renderPSheet();break}
    case "pgiveto":{const me=meChar(),L=resGet(),r=giveDraft&&L[giveDraft.i];if(!me||!r)break;
      pSend({action:"gift",to:t.dataset.id,name:giveDraft.name,die:giveDraft.die}).then(ok=>{if(!ok)return;r.cur=Math.max(0,r.cur-1);resSet(L);
      const to=byId(t.dataset.id);
      toast(`${to?to.name:"They"} got your ${giveDraft.name} (${giveDraft.die})`);giveDraft=null;pSheet="res";renderPSheet()});break}
    case "pgivedie": if(giveDraft){giveDraft.die=t.dataset.v;renderPSheet()}break;
    case "pcomphp":{compId=t.dataset.id;pSheet="comphp";renderPSheet();break}
    case "pcompsb":{compId=t.dataset.id;pSheet="compsb";renderPSheet();break}
    case "pcompdo":{const n=Number(padVal||t.dataset.n||0);if(!(n>0)&&t.dataset.k!=="temp")break;
      pSend({action:"chp",id:compId,kind:t.dataset.k,n}).then(ok=>{if(ok){padVal="";pSheet=null;renderPSheet()}});break}
    case "pstat":{const k=t.dataset.k,d=Number(t.dataset.d),S=statsGet();S[k]=Math.max(0,Math.min(40,(S[k]??(k==="dc"?0:10))+d));statsSet(S);
      renderPSheet();break}
    case "pstatsend":{const S=statsGet();pSend(Object.assign({action:"stats"},{ac:S.ac??10,pp:S.pp??10,pi:S.pi??10,pv:S.pv??10,dc:S.dc??0})).then(ok=>{
      if(ok)toast("Sent to the DM")});break}
    case "pclvl":{const x=pcDraft&&pcDraft.cls[Number(t.dataset.i)];if(!x)break;const tot=pcDraft.cls.reduce((a,e)=>a+(e.lvl||0),0),d=Number(t.dataset.d);
      if(d>0&&tot>=20)break;x.lvl=Math.max(1,Math.min(20,(x.lvl||1)+d));renderPSheet();break}
    case "pcclsadd": if(pcDraft){pcDraft.cls.push({n:"",s:"",lvl:1,sub:null});renderPSheet()}break;
    case "pcclsrm": if(pcDraft){pcDraft.cls.splice(Number(t.dataset.i),1);renderPSheet()}break;
    case "pcmod":{if(!pcDraft)break;const a=t.dataset.a;pcDraft.mods[a]=Math.max(-5,Math.min(10,(pcDraft.mods[a]??0)+Number(t.dataset.d)));renderPSheet();break}
    case "pcfeatadd":{if(!pcDraft)break;const f={t:t.dataset.t,n:t.dataset.n,s:t.dataset.s,l:t.dataset.l,u:[]};pcDraft.feats.push(f);pcFeatQ="";renderPSheet();
      pcFeatGet(f.t,f.n,f.s).then(d=>{if(d&&d.item){f.u=pcUses(d.item)}if(pSheet==="pcset"||pSheet==="pcfeat")renderPSheet()});break}
    case "pcfeatrm": if(pcDraft){pcDraft.feats.splice(Number(t.dataset.i),1);renderPSheet()}break;
    case "pcfeatview":{pcFeatView=Number(t.dataset.i);const f=pcDraft&&pcDraft.feats[pcFeatView];if(!f)break;pSheet="pcfeat";renderPSheet();
      pcFeatGet(f.t,f.n,f.s).then(()=>{if(pSheet==="pcfeat")renderPSheet()});break}
    case "pcbuild":{if(!pcDraft)break;const n=pcBuild();pSheet="res";renderPSheet();toast(n?`${n} trackers from your class`:"Nothing to track yet");break}
    case "ptgt":{const id=t.dataset.id;if(effDraft.targets.has(id))effDraft.targets.delete(id);else effDraft.targets.add(id);
      t.setAttribute("aria-pressed",String(effDraft.targets.has(id)));break}
    case "peffrm": pSend({action:"effect_rm",eid:t.dataset.e});t.closest(".pchip").remove();break;
    case "rpip":{const r=resGet(),x=r[Number(t.dataset.i)];if(
      !x)break;   // a full circle uses one, an empty one gives one back: always from the end of the full ones
      x.cur=Math.max(0,Math.min(x.max,x.cur+(t.classList.contains("on")?-1:1)));resSet(r);renderPSheet();break}
    case "redit": resEditI=Number(t.dataset.i);pSheet="resedit";renderPSheet();break;
    case "rmax":{const r=resGet(),x=r[resEditI];if(!x)break;x.max=Math.max(1,Math.min(99,x.max+Number(t.dataset.d)));x.cur=Math.min(x.cur,x.max);resSet(r);
      renderPSheet();break}
    case "reditreset":{const r=resGet(),x=r[resEditI];if(!x)break;x.reset=t.dataset.r;resSet(r);renderPSheet();break}
    case "rstep":{const r=resGet(),x=r[Number(t.dataset.i)];if(!x)break;x.cur=Math.max(0,Math.min(x.max,x.cur+Number(t.dataset.d)));resSet(r);
      renderPSheet();break}
    case "rdel":{   // two taps, then an Undo in the toast
      if(!t.classList.contains("armed")){t.classList.add("armed");t.textContent="Tap again to delete";clearTimeout(chipT);
        chipT=setTimeout(()=>{if(t.isConnected){t.classList.remove("armed");t.textContent="Delete this tracker"}},3500);break}
      clearTimeout(chipT);const r=resGet(),i=resEditI,gone=r[i];if(!gone)break;r.splice(i,1);resSet(r);pSheet="res";renderPSheet();
      toastUndo(`${gone.name} deleted`,()=>{const r2=resGet();r2.splice(Math.min(i,r2.length),0,gone);resSet(r2);if(pSheet==="res")renderPSheet()});break}
    case "toastundo":{const f=toastUndoFn;toastUndoFn=null;const tt=$("#toast");if(tt){tt.hidden=true;tt.classList.remove("wact")}clearTimeout(toastT);
      if(f)f();break}
    case "rrest":{const kind=t.dataset.r;
      const r=resGet().map(x=>{const rs=x.reset||"long";if(rs==="none")return x;
        if(kind==="long")return Object.assign(x,{cur:x.max});
        if(rs==="short")return Object.assign(x,{cur:x.max});
        if(rs==="shortOne")return Object.assign(x,{cur:Math.min(x.max,x.cur+1)});return x});
      resSet(r);
      let exNote="";
      if(kind==="long"){const hp=hpGet();if(hp.max){hp.cur=hp.max;hp.temp=0;hpSet(hp);hpReport()}
        const ex=myExh();if(ex){pSend({action:"exh",level:ex-1});exNote=ex>1?` · Exhaustion ${ex}→${ex-1}`:" · Exhaustion gone"}}
      renderPlayer();renderPSheet();toast(kind==="long"?"Long rest: resources and HP restored"+exNote:"Short rest: short-rest resources restored");break}
    case "rreset": resDraft.reset=t.dataset.r;t.parentElement.querySelectorAll("[data-act=rreset]").forEach(b=>b.setAttribute("aria-pressed",
      String(b===t)));break;
    case "presadd":{const name=resDraft.name.trim(),max=parseInt(padVal,10);
      if(!name){toast("Give it a name");break}if(!(max>=1&&max<=999)){toast("Type how many you have");break}
      const r=resGet();r.push({name,max,cur:max,reset:resDraft.reset});resSet(r);resDraft={name:"",max:"",reset:"long",custom:false};padVal="";resAll=false;
      document.activeElement&&document.activeElement.blur();toast(`Tracking ${name}`);renderPSheet();break}
  }
});
document.addEventListener("input",e=>{
  const t=e.target;
  if(t.id&&t.id.startsWith("sh_")&&shDraft){const id=t.id;   // 79: the sheet's text fields
    if(id==="sh_cls"){shDraft.cls=t.value;const m=t.value.match(/(\d{1,2})/g);if(m){const L=m.map(Number).filter(n=>n>=1&&n<=20);
      if(L.length)shDraft.lvl=Math.min(20,L.reduce((x,y)=>x+y,0))}}
    else if(id==="sh_species")shDraft.species=t.value;
    else if(id.startsWith("sh_an_")){const a=shDraft.att[+id.slice(6)];if(a)a.n=t.value}else if(id.startsWith("sh_ad_")){const a=shDraft.att[+id.slice(6)];
      if(a)a.dmg=t.value}
    return}
  if(t.id==="pSpellQ"){spellQ=t.value;const l=$("#pSpellList");if(l)l.innerHTML=spellListHtml(meChar());return}
  if(t.id==="pcFeatQ"){pcFeatQ=t.value;const l=$("#pcFeatList");if(l)l.innerHTML=pcFeatListHtml();return}
  if(t.id==="pBookQ"){bookQ=t.value;const l=$("#pBookList");if(l)l.innerHTML=bookListHtml(meChar());return}
  if(t.id==="pEffName"){effDraft.name=t.value;const x=spellFind(t.value);if(x){effDraft.conc=!!x[2];const c=$("#pEffConc");if(c)c.checked=effDraft.conc}}
  if(t.id==="pEffConc")effDraft.conc=t.checked;
  if(t.id==="pResName"){resDraft.name=t.value;const rs=RES_PRESETS[t.value.trim()];if(rs){resDraft.reset=rs;
    document.querySelectorAll("[data-act=rreset]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.r===rs)))}}
  if(t.id==="pMod"){dice.mod=parseInt(t.value,10)||0;const r=$("[data-act=proll]");
    if(r)r.textContent=`Roll ${dice.count}d${dice.die}${dice.mod?(dice.mod>0?"+":"")+dice.mod:""}`}
  if(t.id==="pResMax")resDraft.max=t.value;
});
document.addEventListener("change",e=>{
  {const t=e.target;if(t.dataset&&t.dataset.pc&&pcDraft){const x=pcDraft.cls[Number(t.dataset.i)];if(!x)return;const [n,src]=(t.value||"|").split("|");
    if(t.dataset.pc==="cls"){x.n=n||"";x.s=src||"";x.sub=null}else{const sb=n?pcSubs(pcClass(x)).find(y=>y.n===n&&y.s===src):null;
      x.sub=sb?{n:sb.n,s:sb.s,sn:sb.sn}:null}
    renderPSheet();return}}
  const t=e.target;
  if(t.dataset&&t.dataset.cdur&&MODE==="dm"){const c=byId(condTarget),row=t.closest(".cdur");if(!c||!row)return;const n=row.dataset.n,k=t.dataset.cdur;
    c.cdur=c.cdur||{};const d=Object.assign({},c.cdur[n]||{});
    if(k==="end"){d.end=t.value;if(t.value==="save"){d.ab=d.ab||CSAVE[n]||"Wis";d.dc=d.dc||15}}
    else if(k==="ab")d.ab=t.value;
    else{const v=parseInt(t.value,10);d[k]=v>0?v:null}
    if(d.max&&d.r0==null)d.r0=state.turn?state.turn.round:null;
    if(!d.end&&!d.max)delete c.cdur[n];else c.cdur[n]=d;
    commit();if(k==="end")condSheet(condTarget);return}
  if(t.id==="pEffConc"){effDraft.conc=t.checked;return}
  if(t.id==="pEffArea"){effDraft.area=t.checked;renderPSheet();return}
  if(t.id==="pShare"){dice.share=t.checked;return}
  if(t.id==="pConMod"){ls.set("conmod:"+(meName||"").toLowerCase(),t.value.trim());return}
  if(t.id==="pHpAuto"){const hp=hpGet();hp.auto=t.checked;hpSet(hp);hpReport();return}
  if(t.id==="pHpShare"){ls.set("hpShare",t.checked);phpSync(true);return}
  if(t.id==="sceneSel"){state.scene=t.value;commit();return}
  if(t.dataset&&t.dataset.pk){const i=Number(t.closest(".pr").dataset.pi),p=state.party[i];if(p){const v=t.value.trim();p[t.dataset.pk]=v===""?null:Number(v);
    commit()}return}
  if(t.id==="autoTimer"){state.autoTimer=t.checked;commit();return}
  if(t.id==="updAuto"){ls.set("updAuto",t.checked);toast(t.checked?"Roundkeeper will check for updates when it starts":"No checks unless you ask");return}
  if(t.id==="concAuto"){ls.set("concAuto",t.checked);toast(t.checked?"Concentration saves: rolled for you":"Concentration saves: the app asks you");return}
  if(t.id==="timerSecs"){state.timerSecs=Math.max(5,Math.min(300,parseInt(t.value,10)||30));commit();return}
  if(t.id==="importFile"){if(t.files&&t.files[0])importState(t.files[0]);t.value="";return}

  if(t.id==="bgFile"){uploadBg(t.files&&t.files[0]);t.value="";return}
  if(t.id==="gdFile"){gdImport(t.files&&t.files[0]);t.value="";return}
  if(t.id==="picFile"){picUpload(t.files&&t.files[0]);t.value="";return}
  if(t.id==="aLite"&&atmoD){atmoD.lite=t.checked;atmoRefresh();return}
  if(t.id==="bgDim"){if(atmoD){atmoD.bgDim=Number(t.value)/100;atmoRefresh()}else{state.bgDim=Number(t.value)/100;commit()}return}
  if((t.id==="aDen"||t.id==="aSpd")&&atmoD){const sc=atmoD.scene||"none",v=tuneOf(atmoD,sc);v[t.id==="aDen"?0:1]=Number(t.value)/100;
    atmoD.tune=Object.assign({},atmoD.tune);
    if(v[0]===1&&v[1]===1)delete atmoD.tune[sc];else atmoD.tune[sc]=v;atmoRefresh();return}
  if(t.id==="textSize"){state.textSize=Number(t.value)/100;commit();return}
  const row=t.closest&&t.closest(".row");if(!row)return;const c=byId(row.dataset.id);if(!c)return;
  const v=t.value.trim();
  if(t.dataset.act==="init")c.init=v===""?null:Number(v);
  else if(t.dataset.act==="ac")c.ac=v===""?null:Number(v);
  else if(t.dataset.act==="name"){if(v)c.name=v;else t.value=c.name}
  else if(t.dataset.act==="title")c.title=v;
  else if(t.dataset.act==="cls"){c.cls=t.value;const p=state.party.find(p=>p.name.toLowerCase()===c.name.toLowerCase());if(p)p.cls=t.value}
  else if(t.dataset.act==="ctype")c.ctype=t.value;
  else if(t.dataset.act==="hp"){if(!applyHp(c,t.value,t.dataset.was)){t.value=c.hpMax!=null?`${c.hp??c.hpMax}/${c.hpMax}`:"";
    if(t.value.trim()||c.hpMax!=null)toast("Use -12, +8, 60 or 60/120");return}}
  else if(t.dataset.act==="rim"){if(t.value)c.rim=t.value;else delete c.rim}
  else return;
  if(t.closest(".rmenu"))menuId=null;
  t.blur();commit();
});
document.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&e.target.matches(".row input"))e.target.blur();
  if(e.key==="Escape"){closeSheet();if(menuId){menuId=null;renderDM()}if(hpPopId)hpPopClose();else if(mtOn&&!e.target.closest("#mtBar"))mtStop()}
  if(MODE==="dm"&&(e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==="k"){e.preventDefault();if($("#qkQ")){$("#qkQ").focus();
    $("#qkQ").select()}else qkSheet();return}
  if(MODE==="dm"&&(e.ctrlKey||e.metaKey)&&!e.target.matches("input,select,textarea")){
    const k=e.key.toLowerCase();
    if(k==="z"&&!e.shiftKey){e.preventDefault();doUndo()}
    else if(k==="y"||(k==="z"&&e.shiftKey)){e.preventDefault();doRedo()}
  }
});
document.addEventListener("click",e=>{   // a roll or a save in a lair action belongs to the boss: its statblock opens with it
  if(MODE!=="dm")return;const x=e.target.closest("#roster .lairbox .sbr");if(!x)return;
  const row=x.closest(".row"),b=row&&row.dataset.id==="__lair"?lairBoss():byId(row&&row.dataset.id);if(b&&b.sb&&b.sb.raw)sbViewId=b.id;
},true);
document.addEventListener("click",e=>{
  if(MODE!=="dm")return;const row=e.target.closest("#roster .row[data-id]");
  if(row&&row.dataset.id!=="__lair"&&e.shiftKey&&!e.target.closest("button,select,label")){e.preventDefault();if(e.target.blur)e.target.blur();
    mtToggle(row.dataset.id);return}   // several at once
  if(!row||row.dataset.id==="__lair"||e.target.closest("button,input,select,label"))return;
  selId=selId===row.dataset.id?null:row.dataset.id;markSel();
});
document.addEventListener("keydown",e=>{
  if(MODE!=="dm"||e.ctrlKey||e.metaKey||e.altKey||e.target.matches("input,select,textarea"))return;
  if($("#overlay").innerHTML&&e.key!=="Escape")return;
  const rows=selRows(),idx=rows.findIndex(r=>r.dataset.id===selId),k=e.key;
  if(/^[1-9]$/.test(k)){const r=rows[Number(k)-1];if(r){selId=r.dataset.id;markSel()}e.preventDefault();return}
  if(k==="ArrowDown"||k==="ArrowUp"){if(!rows.length)return;let i=idx<0?0:idx+(k==="ArrowDown"?1:-1);i=Math.max(0,Math.min(rows.length-1,i));
    selId=rows[i].dataset.id;markSel();e.preventDefault();return}
  if(k==="Escape"&&refCards.length){refClose(0);return}
  if(k==="Escape"){if(sbViewId&&!selId){sbViewId=null;renderDM();return}selId=null;markSel();return}
  if(k==="?"){shortcutsSheet();return}
  if(k==="q"||k==="Q"){e.preventDefault();$("#qAdd").focus();return}
  if(k==="r"||k==="R"){clearReactions();return}
  if((k==="n"||k==="N")&&!e.ctrlKey&&!e.metaKey){moveTurn(1);return}
  if((k==="p"||k==="P")&&!e.ctrlKey&&!e.metaKey&&state.turn){moveTurn(-1);return}
  if(k==="j"||k==="J"){state.showQr=!state.showQr;commit();toast(state.showQr?"QR code on the tablet":"QR code hidden");return}
  const c=selId?byId(selId):null;if(!c)return;
  switch(k.toLowerCase()){
    case "b": c.bloodied=!c.bloodied;commit();break;
    case "d": c.down=!c.down;if(!c.down)c.ds={s:0,f:0};commit();break;
    case "h": toggleHidden(c);commit();break;
    case "a": c.showAc=!c.showAc;commit();break;
    case "i": if(c.kind==="pc")c.insp=!c.insp;else c.boss=!c.boss;commit();break;
    case "c": e.preventDefault();condSheet(c.id);break;
    case "k": if(c.kind!=="pc"){e.preventDefault();knowSheet(c.id)}break;
    case "t": if(c.kind==="pc")startTimer(c);break;
    case "s": if(c.kind==="pc")askDeathSave(c);break;
    case "o": if(c.kind==="pc"&&(c.conds||[]).some(x=>(x.n||x)==="Concentrating")){e.preventDefault();pcConcSheet(c.id)}break;
    case "delete": case "backspace": e.preventDefault();state.list=state.list.filter(x=>x!==c);selId=null;commit();
      toast(`Removed ${c.name}. Ctrl+Z brings it back.`);break;
  }
});
document.addEventListener("focusout",()=>setTimeout(()=>{if(MODE==="dm"&&pendingRender&&!($("#roster").contains(document.activeElement)&&
  document.activeElement.tagName==="INPUT"))renderDM()},0));
(()=>{let y0=null,sh=null,dy=0;
  document.addEventListener("pointerdown",e=>{const h=e.target.closest(".psheet .shead");if(!h||e.target.closest("button")||pSheet==="who")return;
    sh=h.closest(".psheet");y0=e.clientY;dy=0;sh.style.transition="none";try{h.setPointerCapture(e.pointerId)}catch(err){}});
  document.addEventListener("pointermove",e=>{if(y0==null||!sh)return;dy=Math.max(0,e.clientY-y0);sh.style.transform=`translateY(${dy}px)`});
  const end=()=>{if(y0==null)return;y0=null;if(!sh)return;sh.style.transition="transform .2s ease";
    if(dy>80){pSheet=null;hpEditMax=false;renderPSheet()}else sh.style.transform="";sh=null};
  document.addEventListener("pointerup",end);document.addEventListener("pointercancel",end);
})();
document.addEventListener("focusin",e=>{const t=e.target;if(t.dataset&&t.dataset.act==="hp"){t.dataset.was=t.value;t.select();
  t.dataset.sel="1"}});   // type -12 straight over the old value
document.addEventListener("mouseup",e=>{const t=e.target;if(t.dataset&&t.dataset.sel==="1"){e.preventDefault();t.select();delete t.dataset.sel}});
/* statblock import: fields in the sheet, file picker, paste box, Ctrl+V and drag-and-drop anywhere on the DM screen */
document.addEventListener("input",e=>{const t=e.target;if(MODE!=="dm")return;
  if(t.dataset.sbname!=null){const x=sbItems[Number(t.dataset.sbname)];if(x)x.name=t.value}
  if(t.dataset.sbhid!=null){const x=sbItems[Number(t.dataset.sbhid)];if(x)x.hidden=t.checked}
  if(t.dataset.sbsurp!=null){const x=sbItems[Number(t.dataset.sbsurp)];if(x)x.surp=t.checked}
  if(t.id==="partySurp"){state.surprise=t.checked;commit();return}
  if(t.dataset.sbboss!=null){const x=sbItems[Number(t.dataset.sbboss)];if(x)x.boss=t.checked}
  if(t.id==="fetQ"){fetQ=t.value;const l=$("#fetList");if(l)l.innerHTML=fetListHtml();return}
  if(t.id==="fetSrc"||t.id==="fetCr"||t.id==="fetType"){if(t.id==="fetSrc")fetSrc=t.value;if(t.id==="fetCr")fetCrF=t.value;if(t.id==="fetType")fetTypeF=t.value;
    const l=$("#fetList");if(l)l.innerHTML=fetListHtml();return}
  if(t.id==="libQ"){libQ=t.value;libArmed=null;const l=$("#libList");if(l)l.innerHTML=libListHtml();return}
  if(t.id==="sbPaste"&&(e.inputType!=="insertText"||t.value.length>150)&&parseStatblock(t.value)){if(sbTake([t.value])){sbSheet()}}});   // .md or plain text
document.addEventListener("change",async e=>{if(e.target.id!=="sbFile")return;const texts=await sbFiles(e.target.files);const n=sbTake(texts);
  if(!n)toast("No statblock found in that file");sbSheet()});
if(MODE==="dm"){
  document.addEventListener("paste",e=>{const a=document.activeElement;if(a&&(a.tagName==="INPUT"||a.tagName==="TEXTAREA"))return;
    const txt=(e.clipboardData||window.clipboardData).getData("text");if(!txt||!parseStatblock(txt))return;e.preventDefault();
    if(!$(".sbsheet"))sbItems=[];sbTake([txt]);sbSheet()});
  let dragN=0;const isOurs=e=>[...(e.dataTransfer&&e.dataTransfer.types||[])].some(t=>t==="Files"||t==="text/plain");
  document.addEventListener("dragenter",e=>{if(!isOurs(e))return;dragN++;document.body.classList.add("sbdrag")});
  document.addEventListener("dragleave",()=>{if(--dragN<=0){dragN=0;document.body.classList.remove("sbdrag")}});
  document.addEventListener("dragover",e=>{if(isOurs(e))e.preventDefault()});
  document.addEventListener("drop",async e=>{dragN=0;document.body.classList.remove("sbdrag");if(!isOurs(e))return;
    const fl=e.dataTransfer.files;let texts=[];
    if(fl&&fl.length){if(e.target.closest&&e.target.closest("#bgDrop,.bggrid"))return;texts=await sbFiles(fl)}else texts=[e.dataTransfer.getData("text/plain")];
    e.preventDefault();if(!$(".sbsheet"))sbItems=[];if(sbTake(texts))sbSheet();else toast("That doesn't look like a statblock")});
}
document.addEventListener("input",e=>{if(e.target.id==="bgDim"){const v=$("#bgDimV");
  if(v)v.textContent=e.target.value+"%"}if(e.target.id==="aDen"||e.target.id==="aSpd"){const v=$("#"+e.target.id+"V");
  if(v)v.textContent=e.target.value+"%"}if(e.target.id==="textSize"){const v=$("#textSizeV");if(v)v.textContent=e.target.value+"%"}});
document.addEventListener("submit",async e=>{
  const f=e.target;
  if(MODE==="dm"&&document.activeElement&&document.activeElement.blur)document.activeElement.blur();   // so the strip can redraw
  if(f.id==="tvTitleForm"){e.preventDefault();const tt=$("#tvT").value.trim();state.tv=Object.assign({},state.tv);
    if(tt)state.tv.title={t:tt,sub:$("#tvSub").value.trim(),eb:$("#tvEb").value.trim(),at:Date.now()};else delete state.tv.title;commit();tvBarRender();
      toast(tt?"Title card on the TV":"Title card cleared");return}
  if(f.id==="clockForm"){e.preventDefault();const nm=$("#clkName").value.trim(),n=Math.max(1,Math.min(20,Number($("#clkN").value)||3));if(!nm)return;
    state.clocks=(state.clocks||[]).concat([{id:uid(),name:nm,n,max:n,...($("#clkSecret").checked?{secret:true}:{})}]);closeSheet();commit();
      toast(`⏳ ${nm}: ${n} rounds`);return}
  if(f.id==="dmPairForm"){e.preventDefault();dmPairMake($("#dmPairName").value.trim());return}
  if(f.id==="aSaveForm"){e.preventDefault();const nm=$("#aSaveName").value.trim();if(!nm||!atmoD){toast("Give the look a name first");return}
    const L={};for(const k in atmoD.look||{})if(atmoD.look[k])L[k]=atmoD.look[k];
    const all=myThemes().filter(x=>x.name.toLowerCase()!==nm.toLowerCase());
      all.push({id:uid(),name:nm,theme:atmoD.theme,look:Object.assign(lookOf(atmoD),L),scene:atmoD.scene,weather:atmoD.weather||"none",tod:atmoD.tod||"none",
      tune:atmoD.tune||{}});
    ls.set("myThemes",all.slice(-24));toast("Saved: "+nm);atmoRefresh();return}
  if(f.id==="titleForm"){e.preventDefault();const c=byId(f.dataset.id);if(c){c.title=$("#titleText").value.trim();commit()}closeSheet();return}
  if(f.id==="callForm"){e.preventDefault();
    const text=$("#callText").value.trim();if(!text)return;const m=text.match(/\bDC\s*(\d+)/i);
    const to=callTargets().map(c=>c.id);if(!to.length){toast("Pick at least one player");return}
    const all=to.length===state.list.filter(c=>c.kind==="pc"&&!c.hidden).length;
    state.call={id:uid(),text,dc:m?Number(m[1]):null,at:Date.now(),to,answers:{}};callSkip=new Set();
    $("#callText").value="";commit();toast(all?"Roll call sent":`Roll call sent to ${to.length} player${to.length>1?"s":""}`)}
  if(f.id==="fieldForm"){e.preventDefault();
    const name=$("#fieldName").value.trim();if(!name)return;state.effects.push({id:uid(),name,by:"dm",targets:[],conc:false,area:true});
      $("#fieldName").value="";commit()}
  if(f.id==="knowForm"){e.preventDefault();
    const c=byId(f.dataset.id),txt=$("#knowText").value.trim();if(!c||!txt)return;
    const kind=(f.querySelector('[aria-pressed="true"]')||{}).dataset||{};const k=kind.k||"Note";
    c.know=(c.know||[]).concat([k==="Note"?txt:`${k}: ${txt}`]);commit();knowSheet(c.id)}
  if(f.id==="partyForm"){e.preventDefault();
    const n=$("#pName").value.trim(),ac=$("#pAc").value.trim();if(!n)return;
    if(!state.party.some(p=>p.name.toLowerCase()===n.toLowerCase()))state.party.push({name:n,ac:ac===""?null:Number(ac),cls:$("#pCls").value});
    commit();setTimeout(()=>{const x=$("#pName");x&&x.focus()},0)}
  if(f.id==="encForm"){e.preventDefault();
    const foes=state.list.filter(c=>c.kind!=="pc").map(c=>({name:c.name,base:c.base,kind:c.kind,ac:c.ac,showAc:c.showAc,hidden:c.hidden,boss:c.boss,title:
      c.title||"",ctype:c.ctype||"",rim:c.rim||undefined,hp:c.hpMax??null,hpMax:c.hpMax??null,
      ...(c.ib!=null?{ib:c.ib}:{}),...(c.sb?{sb:Object.assign({},c.sb,{inLair:false,lr:c.sb.lr&&{max:c.sb.lr.base||c.sb.lr.max,used:0},la:c.sb.la&&{max:
        c.sb.la.base||c.sb.la.max,used:0},uses:(c.sb.uses||[]).map(u=>Object.assign({n:u.n,max:u.max,used:0},u.sp?{sp:u.sp}:{})),rech:(c.sb.rech||[]).map(r=>({
        n:r.n,min:r.min,ready:true}))})}:{})}));
    if(!foes.length)return;const name=$("#eName").value.trim()||`Encounter ${state.encounters.length+1}`;
    state.encounters.push({id:uid(),name,foes});$("#eName").value="";commit();toast(`Saved: ${name}`)}
  if(f.id==="pHpForm"){e.preventDefault();
    const kind=(e.submitter&&e.submitter.dataset.hp)||"dmg";
    const n=parseInt(kind==="max"?$("#pHpMax").value:$("#pHpNum").value,10);
    if(isNaN(n)||n<0||(kind==="max"&&n<1)){toast("Enter a number");return}
    if(kind==="max")hpEditMax=false;
    document.activeElement&&document.activeElement.blur();hpChange(kind,n);const x=$("#pHpNum");if(x)x.value="";}
  if(f.id==="pEffForm"){e.preventDefault();
    const name=effDraft.name.trim(),tg=effDraft.area?[]:[...effDraft.targets].filter(id=>byId(id));
    if(!name){toast("Enter an effect name");return}if(!tg.length&&!effDraft.area){toast("Pick at least one target");return}
    const src=effDraft.custom?"":effDraft.src||((spellFind(name)||[])[7])||"";
    if(await pSend({action:"effect_add",name,targets:tg,conc:effDraft.conc,area:effDraft.area,...(src?{src}:{})})){toast(`Added: ${name}`);
      pushRecentSpell(name);spellQ="";effDraft={name:"",conc:false,area:false,targets:new Set(),custom:false};
      document.activeElement&&document.activeElement.blur();setTimeout(renderPSheet,900)}}
  if(f.id==="pResForm"){e.preventDefault();
    const name=resDraft.name.trim(),max=parseInt(resDraft.max,10);
    if(!name||isNaN(max)||max<1||max>99){toast("Enter a name and a maximum (1–99)");return}
    const r=resGet();r.push({name,max,cur:max,reset:resDraft.reset});resSet(r);resDraft={name:"",max:"",reset:resDraft.reset};
      document.activeElement&&document.activeElement.blur();renderPSheet()}
});

document.addEventListener("keydown",e=>{
  if(MODE!=="player"||!$("#padShow"))return;const ae=document.activeElement;
  if(ae&&ae.tagName==="INPUT"&&ae.type!=="checkbox"){if(e.key==="Enter"&&(ae.id==="pResName"||ae.id==="pEffName")){e.preventDefault();ae.blur()}return}
  if(/^[0-9]$/.test(e.key)){padKey(e.key);e.preventDefault()}else if(e.key==="Backspace"){padKey("back");e.preventDefault()}
  else if(e.key==="-"&&$('.numpad [data-k="neg"]')){padKey("neg");e.preventDefault()}
  else if(e.key==="Enter"){const b=$(".padsec [data-act=pcallsend],.padsec [data-act=pinitsend]");if(b){b.click();e.preventDefault()}}});
document.addEventListener("submit",e=>{if(e.target.id!=="pAlwForm")return;e.preventDefault();   // 81: always prepared, by hand
  const d=alwDraft;if(!d)return;const from=($("#pAlwFrom").value||"").trim()||"By hand",lvl=Math.max(1,Math.min(20,parseInt($("#pAlwLvl").value,10)||1));
  ls.set("spAlwFrom",from);ls.set(alwKey(),alwOwn().filter(a=>a.n.toLowerCase()!==d.n.toLowerCase()).concat([{n:d.n,s:d.s,from,lvl}]));
  if(prepHas(d.n,d.s))ls.set(prepKey(),prepGet().filter(p=>!(p.n===d.n&&(p.s||"")===(d.s||""))));   // it no longer takes a prepared slot
  alwDraft=null;shTouch();renderPSheet();toast(`${d.n}: always prepared (${from})`)});
document.addEventListener("submit",e=>{if(e.target.id!=="pDsForm")return;e.preventDefault();
  const v=parseInt($("#pDsNum").value,10);if(!(v>=1&&v<=20)){toast("Enter the number on the d20 (1–20)");return}rollDeathSave(v)});

/* the small menus by Next turn and at the end of the bottom bar close when you click elsewhere */
function footMenu(on){const m=$("#footMenu"),b=$("#footMore");if(!m||!b)return;m.hidden=!on;b.setAttribute("aria-expanded",String(on))}
document.addEventListener("pointerdown",e=>{if(MODE!=="dm")return;
  if(turnMenuOn&&!e.target.closest(".turnmore")){turnMenuOn=false;renderDM()}
  if(!e.target.closest(".footmore"))footMenu(false)},true);
