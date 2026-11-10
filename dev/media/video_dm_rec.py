import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# "A fight from the DM's seat": one pass per screen (dm | tablet | phone), the same clicks every time.
# Frames come from a CDP screencast; the DM pass also logs the mouse (moves, clicks) and keys for the composite.
import asyncio,sys,os,json,time,base64,shutil
from scene import setup
from playwright.async_api import async_playwright
TGT=sys.argv[1]
O=rk.MEDIA+'/dm-video/raw_'+TGT+'/'
shutil.rmtree(O,ignore_errors=True);os.makedirs(O)
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
START=setup("tavern","avernus",False,"i")+(";state.list=state.list.filter(c=>c.kind==='pc');state.turn=null;state.effects=[];"
  "state.weather='none';state.tod='none';state.tune={};state.sceneFx={};state.sceneReact=true;state.layout='landscape';commit()")
marks=[];frames=[];mouse=[];keys=[]
def mark(c): marks.append((time.time(),c));print(round(time.time()-marks[0][0],1),c,flush=True)
async def cast(ctx,pg):
    cdp=await ctx.new_cdp_session(pg)
    def on(ev):
        fn=f"{O}{len(frames):05d}.jpg";open(fn,'wb').write(base64.b64decode(ev['data']));frames.append((ev['metadata']['timestamp'],fn))
        asyncio.ensure_future(cdp.send('Page.screencastFrameAck',{'sessionId':ev['sessionId']}))
    cdp.on('Page.screencastFrame',on)
    await cdp.send('Page.startScreencast',{'format':'jpeg','quality':90,'everyNthFrame':1})
pos=[720,450]
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
        await asyncio.sleep(3)
        await cast(*{'dm':(dmc,dm),'tablet':(tb and tbc,tb),'phone':(ph and phc,ph)}[TGT])
        await asyncio.sleep(1.2)
        async def go(loc,click=True,dur=.55,dx=0,dy=0):
            loc=dm.locator(loc).first if isinstance(loc,str) else loc
            await loc.scroll_into_view_if_needed();bb=await loc.bounding_box()
            x,y=bb['x']+bb['width']/2+dx,bb['y']+bb['height']/2+dy
            t0=time.time();mouse.append(('move',t0,pos[0],pos[1],x,y,dur))
            await dm.mouse.move(x,y,steps=8);rest=dur-(time.time()-t0)
            if rest>0: await asyncio.sleep(rest)
            pos[0],pos[1]=x,y
            if click: mouse.append(('click',time.time(),x,y));await dm.mouse.click(x,y);await asyncio.sleep(.25)
        async def typ(sel,txt,d=.07):
            await dm.locator(sel).first.focus()
            for ch in txt: await dm.keyboard.type(ch);await asyncio.sleep(d)
        S=lambda js:T(dm,js)
        mark("start")
        # 1 add monsters
        mark("Add monsters from the built-in SRD")
        await go('[data-act=sbopen]');await asyncio.sleep(.8)
        await go('#fetQ');await typ('#fetQ','adult red');await asyncio.sleep(.6)
        await go('#fetList .fetrow');await asyncio.sleep(1.1)
        await go('#fetQ');await dm.fill('#fetQ','');await typ('#fetQ','goblin warrior');await asyncio.sleep(.6)
        await go('#fetList .fetrow');await asyncio.sleep(1.0)
        await go(dm.locator('[data-act=sbcount][data-d="1"]').last);await go(dm.locator('[data-act=sbcount][data-d="1"]').last,dur=.25)
        await asyncio.sleep(.5);await go('[data-act=sbadd]');await asyncio.sleep(.6)
        await S("for(const c of state.list){if(c.name==='Adult Red Dragon')c.init=22;else if(/^Goblin/.test(c.name))c.init=13};state.list.sort((a,b)=>(b.init||0)-(a.init||0));commit()")
        await asyncio.sleep(1.4)
        mark("Start the fight: the turn order goes to the table")
        await go('[data-act=tnext]');await asyncio.sleep(1.6)
        # 2 statblock
        mark("Click the statblock: attacks and damage roll themselves")
        did=await S("state.list.find(c=>c.name==='Adult Red Dragon').id")
        await go(f'.row[data-id="{did}"] [data-act=sbview]');await asyncio.sleep(1.0)
        await go('#sbDrawer .sbbody button:has-text("+14")');await asyncio.sleep(.9)
        await go('#sbDrawer .sbbody button:has-text("1d10 + 8")');await asyncio.sleep(1.4)
        # 3 roll call
        mark("A save in the statblock becomes a roll call on the phones")
        await go('#sbDrawer [data-act=sbsave]');await asyncio.sleep(.8)
        await go('#sbDrawer [data-act=sbasksend]');await asyncio.sleep(1.4)
        if ph:
            for k in "23": await ph.click(f'[data-act=pkey][data-k="{k}"]');await asyncio.sleep(.35)
            await ph.click('[data-act=pcallsend]');await asyncio.sleep(.5)
        else:
            await asyncio.sleep(1.2);await S("state.call.answers=Object.assign({},state.call.answers,{i:23});commit()")
        await asyncio.sleep(.6);await S("state.call.answers=Object.assign({},state.call.answers,{s:12});commit()")
        await asyncio.sleep(.6);await S("state.call.answers=Object.assign({},state.call.answers,{a:19});commit()")
        await asyncio.sleep(.6);await S("state.call.answers=Object.assign({},state.call.answers,{gr:8});commit()")
        await asyncio.sleep(2.2)
        await go('#sbDrawer [data-act=sbclose]');await asyncio.sleep(.5)
        await S("delete state.call;commit()");await asyncio.sleep(.4)
        # 4 next turns to Gregori
        mark("Next turn, and every screen follows")
        for i in range(7): await go('[data-act=tnext]',dur=.3 if i else .5);await asyncio.sleep(.35)
        await asyncio.sleep(.8)
        # 5 hit several
        mark("Hit several: one Fireball, every save and HP worked out")
        await go('[data-act=mtstart]');await asyncio.sleep(.6)
        for g in 'ABC':
            gid=await S(f"state.list.find(c=>c.name==='Goblin Warrior {g}').id")
            await go(f'.row[data-id="{gid}"] [data-act=mttoggle]',dur=.35)
        await go('#mtN');await typ('#mtN','28',.12)
        await go('#mtType');await dm.select_option('#mtType','fire');await asyncio.sleep(.3)
        await go('#mtAb');await dm.select_option('#mtAb','Dex');await asyncio.sleep(.4)
        await go('#mtDc');await dm.fill('#mtDc','');await typ('#mtDc','15',.12)
        await go('[data-act=mtroll]');await asyncio.sleep(1.6)
        await go('[data-act=mtapply]');await asyncio.sleep(2.6)
        # 6 conditions
        mark("Conditions reach the table and the player's phone")
        await go('.row[data-id=i] [data-act=conds]');await asyncio.sleep(.7)
        await go('[data-act=pickcond][data-n=Prone]');await asyncio.sleep(.6)
        await go(dm.locator('button[data-act=close]:has-text("Done")'));await asyncio.sleep(1.8)
        # 7 ctrl+k
        mark("Ctrl+K: any spell, monster or rule in a second")
        keys.append((time.time(),"Ctrl + K"));await dm.keyboard.press('Control+k');await asyncio.sleep(.7)
        for ch in "fireball": await dm.keyboard.type(ch);await asyncio.sleep(.08)
        await asyncio.sleep(2.6);keys.append((time.time(),"Esc"));await dm.keyboard.press('Escape');await asyncio.sleep(.6)
        # 8 atmosphere
        mark("Atmosphere: change the look of the table, live")
        await go('[data-act=atmo]');await asyncio.sleep(1.0)
        await go('[data-act=athm][data-k=astral], [data-act=athm][data-v=astral], [data-act=athm][data-n=astral]');await asyncio.sleep(1.4)
        await go(dm.locator('[data-act=atmogo]:visible'));await asyncio.sleep(3.2)
        mark("end")
        await asyncio.sleep(.5)
        json.dump({'marks':marks,'frames':frames,'mouse':mouse,'keys':keys,'dsf':dsf},open(O+'index.json','w'))
        print(TGT,len(frames),'frames')
        await b.close()
asyncio.run(main())
