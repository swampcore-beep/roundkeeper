import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# README video "On the players' phones": one pass per screen (phone | tablet). Gregori's phone is tapped in
# both passes (it drives the fight); only the pass's screen is recorded. Run against dev/serve.sh go (SRD only).
import asyncio,sys
from scene import setup
from vrec import Rec,T
from playwright.async_api import async_playwright
R=Rec('phone',sys.argv[1]);TGT=R.tgt
BASE=(";state.weather='none';state.tod='none';state.tune={};state.sceneFx={};state.sceneReact=true;state.layout='auto';state.ended=null;state.clocks=[];state.call=null;state.roll=null;"
      "state.turn=null;byId('gr').init=null;byId('gr').conds=['Concentrating'];state.effects.push({id:'e3',name:'Haste',by:'gr',targets:['i'],conc:true,area:false,r0:1});commit()")
ME=("hpSet({cur:32,max:32,temp:0,auto:true});"
    "ls.set(shKey(),Object.assign(shBlank('Gregori'),{cls:'Wizard 5',lvl:5,species:'Elf',ac:12,hp:32,ab:{str:8,dex:14,con:14,int:18,wis:12,cha:10},sv:['int','wis'],sk:{arcana:1,investigation:1},sa:'int',att:[{n:'Fire Bolt',hit:7,dmg:'2d10 fire'}],v:Date.now()}));"
    "resSet([{name:'Spell slots · level 1',max:4,cur:3,reset:'long'},{name:'Spell slots · level 2',max:3,cur:3,reset:'long'},{name:'Spell slots · level 3',max:2,cur:2,reset:'long'},{name:'Arcane Recovery',max:1,cur:1,reset:'long'}]);"
    "renderPlayer()")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server'])
        dmc=await b.new_context(viewport={'width':1440,'height':900});dm=await dmc.new_page()
        await dm.goto(rk.DM+'/');await asyncio.sleep(1.5)
        async def S(js,w=0): await T(dm,js);await asyncio.sleep(w)
        await S(setup("tavern","avernus",False,"i")+BASE,.5)
        phc=await b.new_context(viewport={'width':390,'height':844},has_touch=True);ph=await phc.new_page()
        await ph.goto(rk.PL+'/players');await asyncio.sleep(1.5)
        await T(ph,"localStorage.clear()");await ph.reload();await asyncio.sleep(1.5)
        if TGT=='tablet':
            c=await b.new_context(viewport={'width':800,'height':1200});pg=await c.new_page();await pg.goto(rk.PL+'/players?shared=1')
        else: c,pg=phc,ph
        await asyncio.sleep(3)
        await R.cast(c,pg);await asyncio.sleep(1.0)
        tap=lambda sel,w=.35:R.tap(ph,sel,w);mark=R.mark
        mark("start")
        mark("Scan the code, then tap your character")
        await asyncio.sleep(1.2);await tap('[data-act=pickme][data-n=Gregori]',.4)
        await T(ph,ME+";window.__r=Math.random");await asyncio.sleep(1.6)
        mark("Initiative on the app's own keypad")
        await tap('.tile[data-act=pinit]',.5)
        for k in "17": await tap(f'[data-act=pkey][data-k="{k}"]',.3)
        await tap('[data-act=pinitsend]',1.0)
        await S("state.list.sort((a,b)=>initOf(b)-initOf(a));state.turn={round:1,id:'gr',init:17};commit()",1.6)
        mark("Your turn: cast from your spellbook, and it plays on the table")
        await tap('.tile[data-act=pbook]',.6)
        await tap('[data-act=pbooklvl][data-v="3"]',.5)
        await tap('[data-act=pbookopen][data-n=Fireball]',.9)
        await tap('[data-act=pspfx]',2.4)
        await tap('.sx[data-act=pclose]',.4)
        mark("Spell slots and class resources: tap a circle to use one")
        await tap('.ptop[data-act=pres]',.7)
        await tap(ph.locator('.rcard').nth(2).locator('.rpip.on').first,.9)
        await tap(ph.locator('.rcard').nth(0).locator('.rpip.on').first,1.0)
        await tap('.sx[data-act=pclose]',.4)
        mark("Your character sheet: tap a check or an attack to roll")
        await tap('[data-act=pmore]',.6)
        await tap('[data-act=psheet]',.8)
        await T(ph,"Math.random=()=>0.81");await tap('[data-act=shroll][data-k=sk][data-a=arcana]',1.5)
        await tap('[data-act=shroll][data-k=spatk]',1.5);await T(ph,"Math.random=window.__r")
        await tap('.sx[data-act=pclose]',.4)
        mark("Roll calls: one tap rolls the save with your sheet's bonus")
        await S("state.call={id:'c'+Date.now(),text:'Dexterity save DC 15',dc:15,at:Date.now(),to:['i','s','a','gr'],answers:{}};commit()",1.4)
        await T(ph,"Math.random=()=>0.62");await tap('[data-act=pcallroll]',.5);await T(ph,"Math.random=window.__r")
        for k,v in (('i',17),('s',12),('a',19)): await S(f"state.call.answers=Object.assign({{}},state.call.answers,{{{k}:{v}}});commit()",.45)
        await asyncio.sleep(1.4);await S("delete state.call;commit()",.4)
        mark("A friend's Bardic Inspiration: tap to roll it")
        await S("byId('gr').gifts=[{id:'gf1',die:'d8',n:'Bardic Inspiration',from:'Styx'}];commit()",1.3)
        await T(ph,"Math.random=()=>0.81");await tap('[data-act=pgiftuse]',1.8);await T(ph,"Math.random=window.__r")
        mark("Conditions you set yourself reach the table")
        await tap('.tile[data-act=pconds]',.6)
        await tap('[data-act=pcond][data-n=Prone]',1.0)
        await tap('.sx[data-act=pclose]',1.0)
        mark("Take damage, and the phone asks for a Concentration save")
        await tap('.tile[data-act=php]',.5)
        for k in "14": await tap(f'[data-act=pkey][data-k="{k}"]',.3)
        await tap('[data-act=phpdo][data-hp=dmg]',1.2)
        await T(ph,"Math.random=()=>0.62");await tap('[data-act=pconroll]:visible',2.2);await T(ph,"Math.random=window.__r")
        if await ph.query_selector('.sx[data-act=pclose]'): await tap('.sx[data-act=pclose]',.3)
        mark("At 0 HP: death saves, rolled on the phone")
        await T(ph,"hpSet({cur:0,max:32,temp:0,auto:true});renderPlayer()")
        await S("const c=byId('gr');c.down=true;c.ds={s:1,f:1};c.conds=c.conds.filter(x=>x!=='Concentrating');commit()",1.4)
        await T(ph,"Math.random=()=>0.72");await tap('[data-act=pdsroll]',2.6);await T(ph,"Math.random=window.__r")
        mark("end")
        await asyncio.sleep(.5)
        R.save();await b.close()
asyncio.run(main())
