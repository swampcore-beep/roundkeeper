/* ---------- boot ---------- */
async function poll(ms,onData){
  let fails=0;
  const go=async()=>{
    try{const t0=Date.now(),r=await fetch("/state?rev="+encodeURIComponent(state.rev||0)+(MODE==="player"&&!PREVIEW?"&pub=1":"")+(TV?"&screen=tv":"")+pollWho(),
      {cache:"no-store"});learnClock(r,t0);
      if(r.status===200){const d=await r.json();if(d&&Array.isArray(d.list)&&d.rev!==state.rev){state=norm(d);gotServer=true;
        onData()}else if(!gotServer){gotServer=true;onData()}}
      else if(r.status===204&&!gotServer){gotServer=true;onData()}
      fails=0;const o=$("#offline");if(o)o.hidden=true;
    }catch(e){if(++fails>3){const o=$("#offline");if(o)o.hidden=false}}
    setTimeout(go,ms);
  };go();
}
if(MODE==="player"){
  $("#player").hidden=false;document.title="Roundkeeper · Players";
  if(new URLSearchParams(location.search).get("shared")||TV){meName="*";if(!PREVIEW&&!TV)ls.set("meName","*")}
  if(served&&!meName)pSheet="who";
  Scene.init();render();
  if(served)loadJoinInfo().then(render);
  ["pointermove","pointerdown","keydown"].forEach(ev=>document.addEventListener(ev,wakeUi));wakeUi();
  const lock=async()=>{try{if(navigator.wakeLock&&document.visibilityState==="visible")await navigator.wakeLock.request("screen")}catch(e){}};
  document.addEventListener("visibilitychange",lock);lock();
  setInterval(timerTick,250);
  if(served)poll(500,render);
  if(served)spLoad();
}else{
  $("#dm").hidden=false;dmLightApply();render();
  if(new URLSearchParams(location.search).has("paired")){history.replaceState(null,"","/");
    setTimeout(()=>toast("This device is now paired as the DM"),400)}updUndo();renderLog();setInterval(dmTimerTick,250);libLoad();fetRefresh();
    if(served)spLoad();   // durations of 5e.tools spells
  document.querySelectorAll("#side details.panel").forEach(d=>{const k=d.dataset.k,o=ls.get("panel:"+k,null);if(o!=null)d.open=o;
    d.addEventListener("toggle",()=>{ls.set("panel:"+k,d.open);if(k==="log")renderLog()})});
  const barH=()=>document.documentElement.style.setProperty("--barh",$("#dm .bar").offsetHeight+"px");barH();addEventListener("resize",barH);
    setInterval(barH,2000);
  $("#qAdd").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();e.stopPropagation();quickAdd($("#qAdd").value);$("#qAdd").value=""}});
  $("#addForm").addEventListener("submit",e=>{e.preventDefault();
    const f={name:$("#fName").value.trim(),kind:$("#fKind").value,type:$("#fType").value,count:parseInt($("#fCount").value,10)||1,init:$("#fInit").value.trim(),
      ac:$("#fAc").value.trim(),hp:$("#fHp").value.trim(),hidden:$("#fHidden").checked,boss:$("#fBoss").checked};
    if(!f.name)return;addCombatants(f);$("#fName").value="";$("#fInit").value="";$("#fHp").value="";$("#fCount").value="1";$("#fBoss").checked=false;
      $("#fName").focus();
  });
  const fillType=()=>{const pc=$("#fKind").value==="pc";$("#fType").innerHTML=typeOptions(pc?CLASSES:CTYPES,"",pc?"Class…":"Type…")};
  $("#fKind").addEventListener("change",fillType);fillType();
  $("#preview").addEventListener("click",()=>{window.open(served?location.origin+"/players?shared=1":"?view=player","igraci-pregled",
    "popup=yes,width=1000,height=680")});
  $("#undoBtn").addEventListener("click",doUndo);$("#redoBtn").addEventListener("click",doRedo);
  $("#lairBtn").addEventListener("click",()=>{state.lair=!state.lair;commit()});
  $("#endBtn").addEventListener("click",()=>{if(state.ended)state.ended=null;else{endFight();state.turn=null;
    setTimeout(()=>toast("Combat over · Recap has the summary for your notes",4500),0)}commit()});
  $("#newFight").addEventListener("click",()=>{
    if(state.party.length){state.list=[];loadParty()}
    else state.list=state.list.filter(c=>c.kind==="pc").map(c=>Object.assign({},c,{init:null,bloodied:false,down:false,conds:[],insp:c.insp,ds:{s:0,f:0}}));
    state.ended=null;state.lair=false;state.effects=[];state.call=null;state.timer=null;state.dsAsk=null;state.turn=null;state.fightAt=Date.now();commit()});
  let armed=null;
  $("#wipe").addEventListener("click",e=>{const b=e.currentTarget;
    if(armed){clearTimeout(armed);armed=null;b.classList.remove("armed");b.textContent="Clear all";state.list=[];state.ended=null;state.lair=false;
      state.effects=[];state.call=null;state.timer=null;state.turn=null;commit();return}
    b.classList.add("armed");b.textContent="Sure? Click again";armed=setTimeout(()=>{armed=null;b.classList.remove("armed");b.textContent="Clear all"},3500)});
  if(!served){$("#fileNote").hidden=false;setSync("off","Not started through the server");$("#preview").hidden=true;snap=JSON.stringify(state)}
  else{
    (async()=>{try{const r=await fetch("/state",{cache:"no-store"});const d=await r.json();if(d&&Array.isArray(d.list)){state=norm(d);
      render()}}catch(e){setSync("err","Server not responding")}lastListLen=state.list.length;snap=JSON.stringify(state)})();
    const info=async()=>{
      try{const r=await fetch("/info",{cache:"no-store"});const d=await r.json();
        joinInfo=d;const a=$("#addr");a.hidden=false;
        {const tvOn=d.tvAgo!=null&&d.tvAgo<5,tb=$("#tvBtn");if(tb)tb.classList.toggle("on",tvOn);if(!!state.tvSeen!==tvOn){state.tvSeen=tvOn;finish()}}
        devPill();if($("#devSheet"))devSheet();
        a.innerHTML=`<span>Players (tablet and phones): <b>${esc(chosenUrl()||
          d.url)}</b></span><button class="btn sm" type="button" data-act="qr">QR code</button>`+(d.httpsUrl?`<span>https: <b>${esc(d.httpsUrl)}</b></span>`:
          "")+((d.others||[]).length?`<span>or: ${d.others.map(esc).join(", ")}</span>`:"");
        const on=tabletOn();
        if(!pushing)setSync(on?"ok":"off",on?"Tablet connected":"Tablet not connected");
      }catch(e){setSync("err","Server not responding")}
    };
    info();setInterval(info,2000);
    // changes players send from their phones (initiative, conditions, death saves)
    const acts=async()=>{
      try{const r=await fetch("/player-actions",{cache:"no-store"});const list=await r.json();const notes=[];let quiet=false;
        (Array.isArray(list)?list:[]).forEach(a=>{const c=byId(a.id);if(!c)return;
          if(a.action==="chp"){if(c.owner&&c.hpMax!=null){hpDo(c,a.kind,a.n,"from the phone");
            notes.push([`${c.name}: ${a.kind==="dmg"?"−":a.kind==="heal"?"+":"temp "}${a.n}`,null])}return}
          if(c.kind!=="pc")return;const cn=x=>x.n||x;const L=(text,inv)=>notes.push([text,inv?Object.assign({cid:c.id},inv):null]);
          if(a.nat)natAdd(c.id,a.nat);
          if(a.action==="init"){const prev=c.init;c.init=a.value;freshIds.add(c.id);L(`${c.name}: initiative ${a.value}`,{t:"init",prev})}
          else if(a.action==="cond"){const has=c.conds.some(x=>cn(x)===a.cond);
            if(a.on&&!has){c.conds.push(a.cond);L(`${c.name}: + ${a.cond}`,{t:"cond",cond:a.cond,on:true})}
            if(!a.on&&has){c.conds=c.conds.filter(x=>cn(x)!==a.cond);L(`${c.name}: − ${a.cond}`,{t:"cond",cond:a.cond,on:false})}}
          else if(a.action==="exh"){const had=c.conds.some(x=>cn(x)==="Exhaustion"),prev=had?exhOf(c):0;
            if(a.level<=0){c.conds=c.conds.filter(x=>cn(x)!=="Exhaustion");delete c.exh}
            else{if(!had)c.conds.push("Exhaustion");c.exh=a.level}L(`${c.name}: Exhaustion ${a.level||0}`,{t:"exh",had,prev})}
          else if(a.action==="ds"&&c.down){const prev=Object.assign({s:0,f:0},c.ds);c.ds={s:a.s,f:a.f};
            L(`${c.name}: death saves ${a.s}✓ ${a.f}✗`,{t:"ds",prev})}
          else if(a.action==="effect_add"){const tg=(a.targets||[]).filter(id=>byId(id));if(!tg.length&&!a.area)return;
            const ef={id:uid(),name:a.name,by:c.id,targets:tg,conc:!!a.conc,area:!!a.area,r0:state.turn?state.turn.round:null,...(a.src?{src:a.src}:{})};
              state.effects.push(ef);
            const addedConc=!!a.conc&&!c.conds.some(x=>cn(x)==="Concentrating");if(addedConc)c.conds.push("Concentrating");
            L(`${c.name}: ✦ ${a.name} → ${a.area?"battlefield":tg.map(id=>byId(id).name).join(", ")}`,{t:"effadd",eid:ef.id,addedConc})}
          else if(a.action==="hpstate"){const inv={t:"hp",bloodied:!!c.bloodied,down:!!c.down,ds:Object.assign({s:0,f:0},c.ds)};
            c.bloodied=a.bloodied;if(a.down!==!!c.down){c.down=a.down;c.ds={s:0,f:0}}L(`${c.name}: ${a.down?"0 HP":a.bloodied?"Bloodied":"healthy"}`,inv)}
          else if(a.action==="roll"){state.roll={id:uid(),by:c.name,kind:a.kind,text:a.text,total:a.total,at:Date.now()};
            if(!a.nat&&(a.kind==="nat20"||a.kind==="nat1"))natAdd(c.id,a.kind==="nat20"?20:1);
            if(a.kind==="nat20"||a.kind==="nat1")clogPush(`${c.name}: natural ${a.kind==="nat20"?"20":"1"}`);
            L(`${c.name}: ${a.kind==="nat20"?"NAT 20!":a.kind==="nat1"?"nat 1":a.text+" = "+a.total}`)}
          else if(a.action==="answer"&&state.call&&state.call.id===a.call){state.call.answers=Object.assign({},state.call.answers,{[c.id]:a.value});
            if(mtOn&&mt.callId===a.call&&mtSel.has(c.id)){const ok=Number(a.value)>=Number(state.call.dc);mt.rolls[c.id]={tot:a.value,ok,pc:true};
              mt.modes[c.id]=ok?(mt.on==="half"?"half":"none"):"full";setTimeout(mtTargets,0)}L(`${c.name}: rolled ${a.value} (${state.call.text})`);
            const cc=state.call.cond;if(cc&&cc.id===c.id&&state.call.dc!=null&&a.value>=state.call.dc&&c.conds.some(x=>cn(x)===cc.n)){c.conds=c.conds.filter(x=>
              cn(x)!==cc.n);if(c.cdur)delete c.cdur[cc.n];L(`${c.name}: saved, ${cc.n} ends`,{t:"cond",cond:cc.n,on:false});
              clogPush(`${c.name}: ${cc.n} ends (save ${a.value} vs DC ${state.call.dc})`)}
            callRecap()}
          else if(a.action==="tag"){const tg=new Set(c.tags||[]);const had=tg.has(a.tag);a.on?tg.add(a.tag):tg.delete(a.tag);c.tags=[...tg];
            if(had!==!!a.on)L(`${c.name}: ${a.on?"+":"−"} ${(TAGS.find(x=>x[0]===a.tag)||[a.tag,a.tag])[1]}`,{t:"tag",tag:a.tag,on:!!a.on})}
          else if(a.action==="cover"){const prev=c.cover||"";c.cover=a.cover;L(`${c.name}: ${a.cover?COVER_CHIP[a.cover]:"no cover"}`,{t:"cover",prev})}
          else if(a.action==="gift"){const to=byId(a.to);if(to){to.gifts=(to.gifts||[]).concat([{id:uid(),from:c.name,n:a.name,die:a.die,at:
            Date.now()}]).slice(-5);L(`${c.name} gives ${to.name} ${a.name} (${a.die})`)}}
          else if(a.action==="giftuse"){const g=(c.gifts||[]).find(x=>x.id===a.gid);c.gifts=(c.gifts||[]).filter(x=>x.id!==a.gid);
            if(!c.gifts.length)delete c.gifts;if(g)L(`${c.name} uses ${g.n}${a.roll?`: ${g.die} → ${a.roll}`:""}`)}
          else if(a.action==="sheet"&&a.sheet&&a.sheet.ab){state.sheets=Object.assign({},state.sheets);const k=c.name.toLowerCase(),was=state.sheets[k];
            state.sheets[k]=Object.assign({},a.sheet,{name:c.name,by:"phone",only:false,v:Math.max(Number(a.sheet.v)||0,was&&was.v?was.v+1:0)||Date.now()});
            if(!was)notes.push([`${c.name} added a character sheet`,null]);else quiet=true}
          else if(a.action==="pmode"){if(a.simple)c.psimple=true;else delete c.psimple;quiet=true}
          else if(a.action==="spfx"){const last=(pv.spfxBy||(pv.spfxBy={}))[c.id]||0;
            if(sfx("spells")&&Date.now()-last>3000&&spellFxKnown(a.n,a.t)){pv.spfxBy[c.id]=Date.now();
            state.spfx={id:uid(),at:Date.now(),n:a.n,t:a.t||"",from:c.id,to:[]}}quiet=true}   // R1: a player's spell in the scene
          else if(a.action==="php"){if(a.off)delete c.php;else c.php={cur:a.cur,max:a.max,temp:a.temp,at:Date.now()};quiet=true}
          else if(a.action==="stats"){c.pst={ac:a.ac,pp:a.pp,pi:a.pi,pv:a.pv,dc:a.dc,at:Date.now()};if(c.ac==null&&a.ac)c.ac=a.ac;quiet=true}
          else if(a.action==="concans"){const q=concAsks.find(x=>x.id===a.ask);concAskDrop(a.ask);concAsks=concAsks.filter(x=>x.id!==a.ask);
            const dc=q?q.dc:"",t=a.total!=null?` · ${a.total} vs DC ${dc}`:` (DC ${dc})`;
            if(a.ok){notes.push([`${c.name} keeps Concentrating${t}`,null]);concNote(`${c.name} keeps Concentrating`);
              clogPush(`${c.name} keeps Concentrating${t}`)}
            else if(c.conds.some(x=>cn(x)==="Concentrating"))concLose(c,`${c.name} loses Concentration${t}`,a.total!=null?`${a.total} vs DC ${dc}`:"");
            concAskRender()}
          else if(a.action==="effect_rm"){const ef=state.effects.find(x=>x.id===a.eid&&x.by===c.id);if(ef){state.effects=state.effects.filter(x=>x!==ef);
            L(`${c.name}: − ✦ ${ef.name}`,{t:"effrm",ef:JSON.parse(JSON.stringify(ef))})}}
        });
        if(!notes.length&&quiet)finish();   // HP and stats from phones: saved and shown, nothing to undo
        if(notes.length){commit();notes.forEach(([t,v])=>logPush(t,v));renderLog();
          const pn=document.querySelector('.panel[data-k="log"]');if(pn){pn.classList.remove("ping");void pn.offsetWidth;pn.classList.add("ping")}}
      }catch(e){}
      setTimeout(acts,500);
    };
    setTimeout(acts,800);
  }
}
})();
