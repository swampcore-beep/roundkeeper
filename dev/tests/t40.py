import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
"""t40 (1.4.8): the rules of play (2024, SRD 5.2.1) the app works out itself, on the DM screen and on a phone."""
import asyncio,json
from playwright.async_api import async_playwright
res=[]
def chk(n,c,x=""):
    res.append((bool(c),n,x)); print(("PASS " if c else "FAIL ")+n,("· "+str(x)) if x!="" else "")
async def T(pg,js): return await pg.evaluate("(s)=>__t(s)",js)
SB_DRAGON="""## Test Dragon
*Huge Dragon*
**Armor Class** 18
**Hit Points** 200
**Damage Resistances** fire
**Damage Vulnerabilities** fire
**Damage Immunities** poison
**Saving Throws** Dex +6, Con +13
| STR | DEX | CON | INT | WIS | CHA |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 27 (+8) | 10 (+0) | 25 (+7) | 16 (+3) | 13 (+1) | 23 (+6) |
***Fire Breath (Recharge 5–6).*** Dexterity Saving Throw: DC 21.
"""
BASE="""state.list=[['Dragon','enemy','',20,0],['Styx','pc','bard',20,0],['Gregori','pc','cleric',18,0],['Goblin','enemy','',10,0],['Orc','enemy','',20,0]].map(([n,k,c,i],j)=>({...newCombatant({kind:k}),id:'c'+j,name:n,cls:c,init:i}));
state.effects=[];state.call=null;state.turn=null;state.lair=false;commit();'ok'"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        dm=await (await b.new_context(viewport={'width':1536,'height':864})).new_page(); dm.on('pageerror',lambda e:errs.append('dm '+str(e)))
        await dm.goto(rk.DM+'/'); await asyncio.sleep(1); await T(dm,BASE)
        # ---------- HP ----------
        r=await T(dm,"const c=byId('c3');c.hpMax=20;c.hp=20;c.thp=5;hpDo(c,'dmg',8);[c.hp,c.thp||0]")
        chk("HP: temp HP absorbs damage first (20+5 temp, 8 dmg -> 17, 0 temp)",r==[17,0],r)
        r=await T(dm,"const c=byId('c3');hpDo(c,'temp',5);hpDo(c,'temp',3);const a=c.thp;hpDo(c,'temp',8);[a,c.thp]")
        chk("HP: temp HP doesn't stack, the higher stays (5 then 3 -> 5, then 8 -> 8)",r==[5,8],r)
        r=await T(dm,"const c=byId('c3');c.hp=15;hpDo(c,'heal',50);c.hp")
        chk("HP: healing stops at max",r==20,r)
        r=await T(dm,"const c=byId('c3');c.hp=3;delete c.thp;hpDo(c,'dmg',10);c.hp")
        chk("HP: HP never below 0",r==0,r)
        # ---------- Concentration ----------
        r=await T(dm,"""concAsks=[];const c=byId('c0');c.hpMax=200;c.hp=200;c.conds=['Concentrating'];ls.set('concAuto',false);
          const out=[];[9,30,70].forEach(n=>{concAsks=[];hpDo(c,'dmg',n);out.push((concAsks[0]||{}).dc)});out""")
        chk("Concentration: DC = max(10, half damage), at most 30 (9->10, 30->15, 70->30)",r==[10,15,30],r)
        r=await T(dm,"const c=byId('c0');c.conds=['Concentrating'];c.hp=5;hpDo(c,'dmg',10);commit();(c.conds||[]).map(x=>x.n||x)")
        chk("Concentration: ends at 0 HP",'Concentrating' not in r,r)
        r=await T(dm,"const c=byId('c0');c.hp=100;c.conds=['Concentrating','Stunned'];commit();(c.conds||[]).map(x=>x.n||x)")
        chk("Concentration: ends when Incapacitated (Stunned)",'Concentrating' not in r,r)
        r=await T(dm,"const c=byId('c0');c.conds=['Concentrating'];c.hp=100;c.thp=50;concAsks=[];hpDo(c,'dmg',20);[c.thp,(concAsks[0]||{}).dc]")
        chk("Concentration: damage taken by temp HP still asks for a save",r[1]==10,r)
        await T(dm,"byId('c0').conds=[];delete byId('c0').thp;commit()")
        # ---------- Hit several: saves, resistance, vulnerability, immunity ----------
        await T(dm,f"const c=byId('c0');c.sb={{raw:{json.dumps(SB_DRAGON)},uses:[],rech:[{{n:'Fire Breath',min:5,ready:false}}],know:[]}};commit()")
        r=await T(dm,"mt={n:'25',type:'poison',ab:'',dc:'',on:'half',modes:{},rolls:{}};mtCalc(byId('c0')).x")
        chk("Damage: immunity -> 0",r==0,r)
        r=await T(dm,"mt={n:'25',type:'cold',ab:'',dc:'',on:'half',modes:{c0:'half'},rolls:{}};mtCalc(byId('c0')).x")
        chk("Damage: save for half rounds down (25 -> 12)",r==12,r)
        r=await T(dm,"mt={n:'25',type:'fire',ab:'',dc:'',on:'half',modes:{},rolls:{}};mtCalc(byId('c0')).x")
        chk("Damage: resistance AND vulnerability to the same type cancel out (25 fire -> 25)",r==25,r)
        await T(dm,"byId('c0').sb.raw=byId('c0').sb.raw.replace('**Damage Vulnerabilities** fire\\n','');commit()")
        r=await T(dm,"mt={n:'25',type:'fire',ab:'',dc:'',on:'half',modes:{c0:'half'},rolls:{}};mtCalc(byId('c0')).x")
        chk("Damage: half on a save, then resistance (25 -> 12 -> 6)",r==6,r)
        # Bless and Bane on a monster: its saves in Hit several, its Concentration, its attacks from the drawer
        await T(dm,"mtStart('c0')"); await asyncio.sleep(.3)
        r=await T(dm,"""state.effects=[{id:'b1',name:'Bane',by:'c1',targets:['c0'],conc:false}];mt={n:'10',type:'',ab:'Dex',dc:'15',on:'half',modes:{},rolls:{}};
          const _r=Math.random;Math.random=()=>0.475;mtRoll();Math.random=_r;const o=mt.rolls.c0;[o.r,o.tot,o.bb]""")
        chk("Bane on a monster: −1d4 on its save in Hit several (d20 10 +6 −2 = 14)",r[0]==10 and r[1]==14 and 'Bane' in r[2],r)
        r=await T(dm,"""state.effects=[{id:'b2',name:'Bless',by:'c1',targets:['c0'],conc:false}];const _r=Math.random;Math.random=()=>0.475;const x=monBB(byId('c0'));Math.random=_r;[x.n,x.t]""")
        chk("Bless on a monster: +1d4",r[0]==2,r)
        r=await T(dm,"""state.effects=[{id:'b1',name:'Bane',by:'c1',targets:['c0'],conc:false}];sbViewId='c0';sbAdv='';sbLog=[];const _r=Math.random;Math.random=()=>0.475;
          const b=document.createElement('button');b.dataset.k='hit';b.dataset.m='14';b.dataset.n='Rend';sbRoll(b);Math.random=_r;[sbLog[0].tot,sbLog[0].how]""")
        chk("Bane on a monster: −1d4 on its attack roll from the drawer (10 +14 −2 = 22)",r[0]==22,r)
        r=await T(dm,"""const c=byId('c0');c.conds=['Concentrating'];c.hp=200;ls.set('concAuto',true);state.effects=[{id:'b1',name:'Bane',by:'c1',targets:['c0'],conc:false}];
          const _r=Math.random;Math.random=()=>0.475;concCheck(c,20,180);Math.random=_r;ls.set('concAuto',false);const k=(c.conds||[]).map(x=>x.n||x);c.conds=[];state.effects=[];k""")
        chk("Bane on a monster: −1d4 on its Concentration save (d20 10 +7 −2 = 15 vs DC 10, keeps it)",'Concentrating' in r,r)
        r=await T(dm,"""mt={n:'10',type:'',ab:'Dex',dc:'15',on:'half',modes:{},rolls:{},adv:{c0:'adv'}};const _r=Math.random;let k=0;Math.random=()=>[0.025,0.975][k++%2];
          mtRoll();Math.random=_r;const o=mt.rolls.c0;mt.adv={c0:'dis'};k=0;Math.random=()=>[0.025,0.975][k++%2];mtRoll();Math.random=_r;[o.r,mt.rolls.c0.r]""")
        chk("Hit several: advantage and disadvantage on one target's save (keep 20, then keep 1)",r==[20,1],r)
        r=await T(dm,"""mtStop();byId('c0').sb.raw+='\\n***Magic Resistance.*** The dragon has Advantage on saving throws against spells and other magical effects.';magicRes(byId('c0'))""")
        chk("Hit several: Magic Resistance is noticed (suggests advantage)",r==True,r)
        r=await T(dm,"sbSaveMod(byId('c0').sb.raw,'Dex')+','+sbSaveMod(byId('c0').sb.raw,'Wis')")
        chk("Saves: monster save bonus from Saving Throws line, else ability (Dex +6, Wis +1)",r=="6,1",r)
        # ---------- turn order ----------
        r=await T(dm,"state.lair=true;commit();turnOrder().map(c=>c.name)")
        chk("Order: lair action on 20, after everyone on 20 (loses ties)",r.index('Lair action')==3 and r[:3]!=[] ,r)
        await T(dm,"state.lair=false;commit()")
        # legendary + recharge at the start of the turn
        r=await T(dm,"""const c=byId('c0');c.sb.la={max:3,used:3};c.sb.rech=[{n:'Fire Breath',min:5,ready:false}];state.turn={id:'c4',round:1,init:20};
          const _r=Math.random;Math.random=()=>0.9;state.turn={id:'c0',round:1,init:20};const m=turnStart(c);Math.random=_r;[c.sb.la.used,c.sb.rech[0].ready,m.join('|')]""")
        chk("Legendary actions come back at the start of its turn",r[0]==0,r)
        chk("Recharge rolled at the start of its turn (d6=6 -> ready)",r[1]==True,r[2])
        r=await T(dm,"const c=byId('c0');c.sb.rech=[{n:'Fire Breath',min:5,ready:false}];const _r=Math.random;Math.random=()=>0.5;turnStart(c);Math.random=_r;c.sb.rech[0].ready")
        chk("Recharge 5–6: a 4 doesn't recharge",r==False,r)
        # Bless lasts 10 rounds and ends at the start of the caster's turn
        r=await T(dm,"""state.turn={id:'c1',round:1,init:20};state.effects=[{id:'e1',name:'Bless',by:'c1',targets:['c2'],conc:true,r0:1}];byId('c1').conds=['Concentrating'];commit();
          const out=[];for(let R=2;R<=11;R++){state.turn={id:'c1',round:R,init:20};turnStart(byId('c1'));out.push(state.effects.length)}out""")
        chk("Bless (1 minute) lasts 10 rounds, ends at the start of the caster's 11th-round turn",r==[1]*9+[0],r)
        # condition that ends at the start of its turn, and a save at the end of its turn
        r=await T(dm,"""const c=byId('c3');c.conds=['Frightened'];c.cdur={Frightened:{end:'start'}};state.turn={id:'c3',round:2,init:10};turnStart(c);(c.conds||[]).map(x=>x.n||x)""")
        chk("Condition 'ends at the start of its next turn'",'Frightened' not in r,r)
        r=await T(dm,"""const c=byId('c0');c.conds=['Frightened'];c.cdur={Frightened:{end:'save',ab:'Wis',dc:10}};const _r=Math.random;Math.random=()=>0.5;turnEnd(c);Math.random=_r;(c.conds||[]).map(x=>x.n||x)""")
        chk("Save at the end of its turn ends a condition (d20 11 +1 vs DC 10)",'Frightened' not in r,r)
        r=await T(dm,"""const c=byId('c1');c.down=true;c.ds={s:0,f:0};state.dsAsk=null;state.turn={id:'c1',round:3,init:20};turnStart(c);!!state.dsAsk""")
        chk("Death save asked at the start of a player's turn at 0 HP",r==True,r)
        r=await T(dm,"""const c=byId('c3');c.down=true;commit();turnOrder().map(x=>x.name)""")
        chk("A defeated monster is skipped in the order; a player at 0 HP still gets turns",('Goblin' not in r) and ('Styx' in r),r)
        await T(dm,"byId('c1').down=false;byId('c3').down=false;commit()")
        # crit doubles the dice in the drawer
        r=await T(dm,"const _r=Math.random;Math.random=()=>0.999;const x=sbDice('2d6+3',true);Math.random=_r;[x.n,x.tot]")
        chk("Critical hit: dice doubled, modifier once (2d6+3 crit -> 4d6+3, max 27)",r==[4,27],r)
        # XP
        r=await T(dm,"[CR_XP['1/4'],CR_XP['5'],CR_XP['17']]")
        chk("XP by CR (1/4 = 50, 5 = 1800, 17 = 18000)",r==[50,1800,18000],r)
        # exhaustion level 6 = dead (badge)
        # ---------- the phone ----------
        await T(dm,"state.list=state.list.filter(c=>c.id!=='c0');byId('c1').conds=[];byId('c1').down=false;byId('c1').ds={s:0,f:0};state.turn=null;commit()")
        ph=await (await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)).new_page(); ph.on('pageerror',lambda e:errs.append('ph '+str(e)))
        await ph.goto(rk.PL+'/players'); await asyncio.sleep(1.5)
        await ph.click('[data-act=pickme][data-n="Styx"]'); await asyncio.sleep(.8)
        async def P(js,wait=.9):
            v=await T(ph,js); await asyncio.sleep(wait); return v
        async def styx(): return await T(dm,"JSON.stringify((({down,bloodied,ds,conds,exh})=>({down,bloodied,ds,conds,exh}))(byId('c1')))")
        await P("hpChange('max',20)")
        await P("hpChange('dmg',12)")
        s=json.loads(await styx()); chk("Phone: Bloodied by itself at half HP or less (8/20)",s['bloodied'] and not s['down'],s)
        await P("hpChange('dmg',20)")
        s=json.loads(await styx()); chk("Phone: 0 HP -> Down on the laptop",s['down'],s)
        await P("hpChange('dmg',3)")
        s=json.loads(await styx()); chk("Phone: damage at 0 HP = one death save failure",s['ds']['f']==1,s)
        await P("hpChange('heal',5)")
        s=json.loads(await styx()); chk("Phone: healing at 0 HP brings you back and clears death saves",(not s['down']) and s['ds']=={'s':0,'f':0},s)
        # instant death: 20 max HP, at 5 HP, 30 damage -> 25 left over >= 20 -> dies
        await P("const h=hpGet();h.cur=5;h.temp=0;hpSet(h);hpReport()")
        await P("hpChange('dmg',30)")
        s=json.loads(await styx()); chk("Rules: instant death when the damage left over at 0 HP is at least your max HP (5 HP, 30 dmg, max 20)",s['ds']['f']>=3,s)
        await T(dm,"const c=byId('c1');c.ds={s:0,f:0};commit()"); await asyncio.sleep(.8)
        await P("hpChange('dmg',25)")
        s=json.loads(await styx()); chk("Rules: at 0 HP, damage of at least your max HP kills you (25 dmg, max 20)",s['ds']['f']>=3,s)
        await T(dm,"const c=byId('c1');c.ds={s:0,f:0};commit()"); await asyncio.sleep(.8)
        await P("const h=hpGet();h.cur=0;h.temp=0;hpSet(h);pSheet='hp';renderPSheet()")
        r=await P("!!document.querySelector('.psheet [data-hp=crit]')",.1)
        chk("Phone: at 0 HP the HP sheet offers damage from a critical hit",r,r)
        await P("hpChange('crit',4)")
        s=json.loads(await styx()); chk("Rules: a critical hit at 0 HP is two death save failures",s['ds']['f']==2,s['ds'])
        await P("pSheet=null;renderPSheet()",.2)
        await T(dm,"const c=byId('c1');c.ds={s:0,f:0};commit()"); await asyncio.sleep(.8)
        # death saves
        async def ds(face):
            await T(dm,"const c=byId('c1');c.down=true;c.ds={s:0,f:0};commit()"); await asyncio.sleep(.8)
            await P(f"const _r=Math.random;Math.random=()=>({face}-0.5)/20;rollDeathSave();Math.random=_r",1)
            return json.loads(await styx())
        s=await ds(1); chk("Death save: natural 1 = two failures",s['ds']['f']==2,s['ds'])
        s=await ds(10); chk("Death save: 10 = success",s['ds']['s']==1,s['ds'])
        s=await ds(9); chk("Death save: 9 = failure",s['ds']['f']==1,s['ds'])
        await T(dm,"const c=byId('c1');c.down=true;c.ds={s:3,f:0};commit()"); await asyncio.sleep(.8)
        await P("const h=hpGet();h.cur=0;hpSet(h)",.2); await P("hpChange('dmg',2)")
        s=json.loads(await styx()); chk("Rules: damage while Stable ends Stable (successes reset, one failure)",s['ds']=={'s':0,'f':1},s['ds'])
        s=await ds(20); hp=await T(ph,"hpGet().cur"); chk("Death save: natural 20 = back up with 1 HP",(not s['down']) and hp==1,[s,hp])
        # concentration on the phone
        await P("hpChange('max',40);const h=hpGet();h.cur=40;hpSet(h);hpReport()")
        await T(dm,"byId('c1').conds=['Concentrating'];commit()"); await asyncio.sleep(.8)
        r=await P("pConc=null;hpChange('dmg',23);pConc&&pConc.dc")
        chk("Phone: Concentration save DC after 23 damage = 11",r==11,r)
        await P("pConc=null;pSheet=null;renderPSheet()",.3)
        await T(dm,"state.effects=[];byId('c1').conds=[];commit()"); await asyncio.sleep(.6)
        await P("pSend({action:'effect_add',name:'Bless',targets:['c2'],conc:true})",1.2)
        await P("pSend({action:'effect_add',name:'Heroism',targets:['c2'],conc:true})",1.2)
        r=await T(dm,"state.effects.filter(e=>e.by==='c1'&&e.conc).map(e=>e.name)")
        chk("Rules: a new Concentration spell ends the old one (Bless, then Heroism)",r==['Heroism'],r)
        r=await T(dm,"const e=actLog.find(x=>x.inv&&x.inv.t==='effadd'&&!x.done);undoLog(e.id);state.effects.filter(e=>e.by==='c1').map(e=>e.name)")
        chk("Undo on the new spell brings the old one back",r==['Bless'],r)
        await T(dm,"state.effects=[];byId('c1').conds=[];commit()"); await asyncio.sleep(.6)
        # exhaustion on rolls
        await T(dm,"byId('c1').conds=['Exhaustion'];byId('c1').exh=2;commit()"); await asyncio.sleep(.8)
        r=await P("dice.die=20;dice.count=1;dice.adv='';dice.mod=0;const _r=Math.random;Math.random=()=>0.475;rollDice();Math.random=_r;dice.last.total",.2)
        chk("Exhaustion 2: −4 on a d20 roll (10 -> 6)",r==6,r)
        # long rest
        await P("hpChange('max',20);const h=hpGet();h.cur=3;h.temp=4;hpSet(h);hpReport()")
        await P("resSet([{name:'Rage',max:3,cur:0,reset:'shortOne'},{name:'Slot',max:2,cur:0,reset:'long'},{name:'Ki',max:4,cur:1,reset:'short'}])",.2)
        await ph.evaluate("()=>{const b=document.createElement('button');b.dataset.act='rrest';b.dataset.r='short';document.body.appendChild(b);b.click();b.remove()}"); await asyncio.sleep(.6)
        r=await P("resGet().map(x=>x.cur)",.1)
        chk("Short rest: 'one back on a short rest' +1, short-rest resources full, long-rest ones not",r==[1,0,4],r)
        await ph.evaluate("()=>{const b=document.createElement('button');b.dataset.act='rrest';b.dataset.r='long';document.body.appendChild(b);b.click();b.remove()}"); await asyncio.sleep(1.2)
        r=await P("[resGet().map(x=>x.cur),hpGet().cur,hpGet().temp]",.1); s=json.loads(await styx())
        chk("Long rest: everything back, full HP, temp HP gone",r==[[3,2,4],20,0],r)
        chk("Long rest: Exhaustion goes down by 1 (2 -> 1)",s.get('exh')==1,s)
        # sheet maths
        r=await P("[1,4,5,8,9,13,17].map(l=>shCalc(Object.assign(shBlank('x'),{lvl:l})).pb)",.1)
        chk("Sheet: proficiency bonus by level (1,4,5,8,9,13,17 -> 2,2,3,3,4,5,6)",r==[2,2,3,3,4,5,6],r)
        r=await P("const C=shCalc(Object.assign(shBlank('x'),{lvl:5,ab:{str:16,dex:14,con:14,int:8,wis:12,cha:16},sv:['wis','cha'],sk:{perception:1,insight:2},sa:'cha'}));[C.sv.wis,C.sv.str,C.sk.insight,C.pp,C.pi,C.dc,C.atk,C.init]",.1)
        chk("Sheet: saves, expertise, passives, spell DC and attack, initiative (Dex)",r==[4,3,7,14,17,14,6,2],r)
        # Bless on a save roll from the sheet, not on a check
        await T(dm,"state.effects=[{id:'e9',name:'Bless',by:'c2',targets:['c1'],conc:true}];commit()"); await asyncio.sleep(.8)
        r=await P("[blessFor('Wis save'),blessFor('Longsword to hit'),blessFor('Perception'),blessFor('Wisdom check')]",.1)
        chk("Bless: on saves and attacks, not on checks",r==[True,True,False,False],r)
        await T(dm,"state.effects=[];commit()"); await asyncio.sleep(.8)
        await P("ls.set(shKey(),Object.assign(shBlank('Styx'),{lvl:5,ab:{str:16,dex:10,con:14,int:8,wis:12,cha:16},att:[{n:'Longsword',hit:6,dmg:'1d8+3 slashing'}]}));pSheet='sheet';renderPSheet()")
        r=await P("document.querySelectorAll('.psheet .shadv [data-act=shadv]').length",.1)
        chk("Phone sheet: Disadvantage / Normal / Advantage buttons",r==3,r)
        r=await P("shAdv='adv';const _r=Math.random;let k=0;Math.random=()=>[0.05,0.95][k++%2];const x=shRoll('Wis save',1);Math.random=_r;[x.d,shAdv,x.text]",.1)
        chk("Phone sheet: advantage keeps the higher d20, then goes back to Normal",r[0]==20 and r[1]=="",r)
        r=await P("shAdv='dis';const _r=Math.random;let k=0;Math.random=()=>[0.05,0.95][k++%2];const x=shRoll('Wis save',1);Math.random=_r;x.d",.1)
        chk("Phone sheet: disadvantage keeps the lower d20",r==2,r)
        r=await P("const _r=Math.random;Math.random=()=>0.999;shRoll('Longsword to hit',6);const c1=shCrit;shDmg('Longsword','1d8+3');const L=shLast;Math.random=_r;[c1,L.tot,shCrit,L.how]",.1)
        chk("Phone sheet: natural 20 to hit -> next damage doubles the dice (1d8+3 -> 2d8+3, max 19)",r[0] and r[1]==19 and not r[2],r)
        r=await P("const _r=Math.random;Math.random=()=>0.999;shDmg('Longsword','1d8+3');Math.random=_r;shLast.tot",.1)
        chk("Phone sheet: the damage after that is normal again (max 11)",r==11,r)
        await T(dm,"state.call={id:'k1',text:'Wisdom save DC 12',dc:12,at:Date.now(),to:['c1'],answers:{}};commit()"); await asyncio.sleep(1)
        r=await P("pSheet='call';renderPSheet();document.querySelectorAll('.psheet .shadv [data-act=shadv]').length",.1)
        chk("Roll call on the phone: advantage buttons next to Roll from your sheet",r==3,r)
        await T(dm,"state.call=null;commit()"); await asyncio.sleep(.6)
        await P("pSheet=null;renderPSheet()",.2)
        r=await P("pcData={cls:[{n:'Paladin',s:'XPHB',cp:'1/2',tb:[],hd:10},{n:'Sorcerer',s:'XPHB',cp:'full',tb:[],hd:6},{n:'Paladin',s:'PHB',cp:'1/2',tb:[],hd:10},{n:'Sorcerer',s:'PHB',cp:'full',tb:[],hd:6}],sub:[]};"
          "const f=s=>pcTrackers({cls:[{n:'Paladin',s,lvl:5},{n:'Sorcerer',s,lvl:1}],feats:[],mods:{}}).filter(x=>/^Spell slot/.test(x.name)).map(x=>x.max);"
          "const o=[f('XPHB'),f('PHB')];pcData=null;o",.1)
        chk("Multiclass slots: Paladin 5 / Sorcerer 1 is a level 4 caster in 2024 (half rounds up), level 3 in 2014",r==[[4,3],[4,2]],r)
        r=await P("giveDie('Bardic Inspiration')",.1)
        chk("Bardic Inspiration die is d6 without class data (level 1)",r=='d6',r)
        print('errors',errs)
        await b.close()
    print("SUMMARY",sum(1 for x in res if x[0]),"pass",sum(1 for x in res if not x[0]),"fail")
asyncio.run(main())
