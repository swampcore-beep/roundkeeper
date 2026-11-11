/* ---- death saves rolled on the phone: 10+ success, 1 counts twice, 20 brings you back with 1 HP ---- */
function rollDeathSave(face){
  const me=meChar();if(!me||!me.down||isDead(me)||isStable(me))return;const real=face>=1&&face<=20,d=real?face:1+Math.floor(Math.random()*20),ex=myExh(),tot=d-2*ex,ds=Object.assign({s:0,f:0},me.ds);let msg;
  if(d===20){const hp=hpGet();if(hp.max){hp.cur=1;hpSet(hp)}pSend({action:"hpstate",bloodied:true,down:false});msg="Natural 20! You're back up with 1 HP"}
  else{if(d===1)ds.f=Math.min(3,ds.f+2);else if(tot>=10)ds.s=Math.min(3,ds.s+1);else ds.f=Math.min(3,ds.f+1);pSend({action:"ds",s:ds.s,f:ds.f});
    msg=d===1?"Natural 1: two failures":tot>=10?"Success":"Failure";if(ds.f>=3)msg+=" — you die";else if(ds.s>=3)msg+=" — you're stable"}
  const text=`Death save ${real?"real ":""}d20 (${d})${ex?` −${2*ex} exhaustion`:""}`;
  if(dice.share)pSend({action:"roll",kind:d===20?"nat20":d===1?"nat1":"roll",text,total:tot});
  dsLast={d,tot,msg};try{navigator.vibrate&&navigator.vibrate(d===20?[60,40,60,40,200]:d===1||tot<10?[300]:[80])}catch(e){}
  renderPSheet();
}
let dsLast=null;
/* ---- Concentration save after damage: DC 10 or half the damage, max 30 ---- */
let pConc=null;
function askConcentration(dmg){
  if(pConc&&pConc.ask&&Date.now()-pConc.askAt<180000){renderPSheet();return}   // the DM already asked for this hit
  const dc=Math.min(30,Math.max(10,Math.floor(dmg/2)));pConc={dc,dmg,res:null};pSheet="conc";
  try{navigator.vibrate&&navigator.vibrate([150,80,150])}catch(e){}renderPSheet();
}
function rollConcentration(adv){
  if(!pConc)return;const me=meChar(),typed=ls.get("conmod:"+(meName||"").toLowerCase(),""),sh=shLocal();const mod=(String(typed).trim()===""&&sh?shCalc(sh).sv.con:Number(typed)||0),ex=myExh();
  const a=1+Math.floor(Math.random()*20),b=1+Math.floor(Math.random()*20),d=adv?Math.max(a,b):a,tot=d+mod-2*ex,ok=tot>=pConc.dc;
  pConc.res={d,tot,ok,text:`d20${adv?` advantage (${a}, ${b})`:` (${d})`}${mod?(mod>0?" +":" ")+mod:""}${ex?` −${2*ex} exhaustion`:""}`};
  if(dice.share)pSend({action:"roll",kind:d===20?"nat20":d===1?"nat1":"roll",text:"Concentration "+pConc.res.text,total:tot});
  if(pConc.ask)pSend({action:"concans",ask:pConc.ask,ok,total:tot});
  else if(!ok&&me)pSend({action:"cond",cond:"Concentrating",on:false});
  try{navigator.vibrate&&navigator.vibrate(ok?[80]:[300])}catch(e){}renderPSheet();
}
function rollDice(){
  const r=n=>1+Math.floor(Math.random()*n);let rolls=[],kept,nat=null,text;
  if(dice.die===20&&dice.count===1&&dice.adv){const a=r(20),b=r(20);kept=dice.adv==="adv"?Math.max(a,b):Math.min(a,b);rolls=[a,b];nat=kept===20?20:kept===1?1:null;
    text=`d20 ${dice.adv==="adv"?"advantage":"disadvantage"} (${a}, ${b})${dice.mod?(dice.mod>0?" +":" ")+dice.mod:""}`}
  else{for(let i=0;i<dice.count;i++)rolls.push(r(dice.die));kept=rolls.reduce((a,b)=>a+b,0);if(dice.die===20&&dice.count===1)nat=kept===20?20:kept===1?1:null;
    text=`${dice.count}d${dice.die}${rolls.length>1?" ("+rolls.join(", ")+")":""}${dice.mod?(dice.mod>0?" +":" ")+dice.mod:""}`}
  const ex=dice.die===20&&dice.count===1?myExh():0;if(ex)text+=` −${2*ex} exhaustion`;
  const total=kept+dice.mod-2*ex;dice.last={total,text,nat};
  if(dice.share)pSend({action:"roll",kind:nat===20?"nat20":nat===1?"nat1":"roll",text,total});
  if(nat&&navigator.vibrate)try{navigator.vibrate(nat===20?[60,40,60,40,200]:[300])}catch(e){}
  renderPSheet();
}
