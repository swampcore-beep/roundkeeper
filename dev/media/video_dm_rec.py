import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# README video "The DM's laptop": one pass per screen (dm | tablet | phone), the same clicks every time.
# The DM pass also logs the mouse and keys for the drawn cursor. Run against dev/serve.sh go (SRD only).
import asyncio,sys
from scene import setup
from vrec import Rec,T,present
from playwright.async_api import async_playwright
R=Rec('dm',sys.argv[1]);TGT=R.tgt
START=setup("tavern","avernus",False,"i")+(";state.list=state.list.filter(c=>c.kind==='pc');state.turn=null;state.effects=[];state.ended=null;state.clocks=[];state.call=null;state.roll=null;state.tv={mode:'auto'};"
  "state.weather='none';state.tod='none';state.tune={};state.sceneFx={};state.sceneReact=true;state.layout='landscape';commit()")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server'])
        dsf=1.25 if TGT=='dm' else 1
        dmc=await b.new_context(viewport={'width':1440,'height':900},device_scale_factor=dsf);dm=await dmc.new_page()
        await dm.goto(rk.DM+'/');await asyncio.sleep(1.5);await T(dm,START);await asyncio.sleep(.8)
        tb=ph=None
        if TGT=='tablet':
            tbc=await b.new_context(viewport={'width':1200,'height':800});tb=await tbc.new_page();await tb.goto(rk.PL+'/players?shared=1')
        if TGT=='phone':
            phc=await b.new_context(viewport={'width':390,'height':844},has_touch=True);ph=await phc.new_page()
            await ph.goto(rk.PL+'/players');await asyncio.sleep(1.5)
            await ph.click('[data-act=pickme][data-n=Isandros]');await asyncio.sleep(1)
            await T(ph,"hpSet({cur:52,max:52,temp:0,auto:true});renderPlayer()")
        else:
            await T(dm,"byId('i').php={cur:52,max:52,temp:0,at:Date.now()};commit()")
        present();await asyncio.sleep(3)
        await R.cast(*{'dm':(dmc,dm),'tablet':(tb and tbc,tb),'phone':(ph and phc,ph)}[TGT])
        await asyncio.sleep(1.2)
        go=lambda *a,**k:R.go(dm,*a,**k);typ=lambda *a,**k:R.typ(dm,*a,**k);S=lambda js:T(dm,js);mark=R.mark
        mark("start")
        mark("Add monsters from the built-in SRD")
        await go('[data-act=sbopen]',dur=.4);await asyncio.sleep(.4)
        await go('#fetQ',dur=.3);await typ('#fetQ','adult red',.045);await asyncio.sleep(.4)
        await go('#fetList .fetrow',dur=.4);await asyncio.sleep(.6)
        await go('#fetQ',dur=.35);await dm.fill('#fetQ','');await typ('#fetQ','goblin war',.045);await asyncio.sleep(.4)
        await go('#fetList .fetrow',dur=.4);await asyncio.sleep(.5)
        await go(dm.locator('[data-act=sbcount][data-d="1"]').last,dur=.35);await go(dm.locator('[data-act=sbcount][data-d="1"]').last,dur=.2)
        await asyncio.sleep(.3);await go('[data-act=sbadd]');await asyncio.sleep(.4)
        await S("for(const c of state.list){if(c.name==='Adult Red Dragon')c.init=22;else if(/^Goblin/.test(c.name))c.init=13};state.list.sort((a,b)=>(b.init||0)-(a.init||0));commit()")
        await asyncio.sleep(.9)
        mark("Start turns: the order goes to the table")
        await go('[data-act=tnext]');await asyncio.sleep(1.5)
        mark("Click the statblock: attacks and damage roll themselves")
        did=await S("state.list.find(c=>c.name==='Adult Red Dragon').id")
        await go(f'.row[data-id="{did}"] [data-act=sbview]');await asyncio.sleep(.8)
        await go('#sbDrawer .sbbody button:has-text("+14")');await asyncio.sleep(.8)
        await go('#sbDrawer .sbbody button:has-text("1d10 + 8")');await asyncio.sleep(1.1)
        mark("A save in the statblock becomes a roll call on the phones")
        await go('#sbDrawer [data-act=sbsave]');await asyncio.sleep(.6)
        await go('#sbDrawer [data-act=sbasksend]');await asyncio.sleep(.8)
        if ph:
            for k in "23": await R.tap(ph,f'[data-act=pkey][data-k="{k}"]',.3)
            await R.tap(ph,'[data-act=pcallsend]',.4)
        else:
            await asyncio.sleep(1.0);await S("state.call.answers=Object.assign({},state.call.answers,{i:23});commit()")
        for k,v in (('s',12),('a',19),('gr',8)): await asyncio.sleep(.35);await S(f"state.call.answers=Object.assign({{}},state.call.answers,{{{k}:{v}}});commit()")
        await asyncio.sleep(1.3)
        await go('#sbDrawer [data-act=sbclose]',dur=.35);await asyncio.sleep(.2)
        await S("delete state.call;state.turn=Object.assign({},state.turn,{id:'gr',init:8});commit()");await asyncio.sleep(.6)
        mark("Hit several: one Fireball, every save and HP worked out")
        await go('[data-act=mtstart]',dur=.4);await asyncio.sleep(.35)
        for g in 'ABC':
            gid=await S(f"state.list.find(c=>c.name==='Goblin Warrior {g}').id")
            await go(f'.row[data-id="{gid}"] [data-act=mttoggle]',dur=.25)
        await go('#mtN',dur=.35);await typ('#mtN','28',.08)
        await go('#mtType',dur=.35);await dm.select_option('#mtType','fire');await asyncio.sleep(.15)
        await go('#mtAb',dur=.3);await dm.select_option('#mtAb','Dex');await asyncio.sleep(.15)
        await go('#mtDc',dur=.3);await dm.fill('#mtDc','');await typ('#mtDc','15',.08)
        await go('[data-act=mtroll]',dur=.35);await asyncio.sleep(1.2)
        await go('[data-act=mtapply]',dur=.4);await asyncio.sleep(1.9)
        mark("Conditions reach the table and the player's phone")
        await go('.row[data-id=i] [data-act=conds]',dur=.4);await asyncio.sleep(.45)
        await go('[data-act=pickcond][data-n=Prone]',dur=.4);await asyncio.sleep(.35)
        await go(dm.locator('button[data-act=close]:has-text("Done")'),dur=.4);await asyncio.sleep(1.3)
        mark("Ctrl+K: any spell, monster or rule")
        await R.key(dm,'Control+k',"Ctrl + K");await asyncio.sleep(.6)
        for ch in "fireball": await dm.keyboard.type(ch);await asyncio.sleep(.055)
        await asyncio.sleep(1.8);await R.key(dm,'Escape',"Esc");await asyncio.sleep(.5)
        mark("Devices: every screen and phone, with its address")
        await go('[data-act=devices]',dur=.45);await asyncio.sleep(2.3)
        await R.key(dm,'Escape',"Esc");await asyncio.sleep(.4)
        mark("Atmosphere: change the table's look, with a preview")
        await go('[data-act=atmo]',dur=.45);await asyncio.sleep(.6)
        await go('[data-act=athm][data-k=astral], [data-act=athm][data-v=astral], [data-act=athm][data-n=astral]',dur=.45);await asyncio.sleep(1.0)
        await go(dm.locator('[data-act=atmogo]:visible'),dur=.45);await asyncio.sleep(2.6)
        mark("end")
        await asyncio.sleep(.5)
        R.save(dsf=dsf)
        await b.close()
asyncio.run(main())
