import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json,urllib.request,sys
from playwright.async_api import async_playwright
op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("()=>__t(`"+js+"`)")
D=rk.PRIV+'/sb/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(.6)
        await T(dm,"state.party=[];state.list=[{id:'p',name:'Medusa',kind:'pc',cls:'rogue',init:17,conds:[],ds:{s:0,f:0}},{id:'q',name:'Styx',kind:'pc',cls:'cleric',init:12,conds:['Burning'],ds:{s:0,f:0}},{id:'h',name:'Shadow',kind:'enemy',init:15,hidden:true,conds:[],ds:{s:0,f:0}},{id:'g',name:'Goblin',kind:'enemy',init:9,down:true,conds:[],ds:{s:0,f:0}}];commit()")
        await dm.click('[data-act=sbopen]'); await dm.set_input_files('#sbFile',[D+'lich.md']); await asyncio.sleep(.3); await dm.click('[data-act=sbadd]'); await asyncio.sleep(.4)
        await T(dm,"const L=state.list.find(c=>c.name==='Lich');L.init=20;L.sb.la.used=2;L.sb.rech[0].ready=false;commit()")
        sf=await (await b.new_context(viewport={'width':912,'height':1368})).new_page(); sf.on("pageerror",lambda e:errs.append(str(e))); await sf.goto(rk.PL+'/players?shared=1')
        pc=await b.new_context(viewport={'width':390,'height':844},has_touch=True); await pc.add_init_script("""localStorage.setItem('it.meName','"Medusa"')""")
        ph=await pc.new_page(); ph.on("pageerror",lambda e:errs.append(str(e))); await ph.goto(rk.PL+'/players')
        sc=await b.new_context(viewport={'width':390,'height':844},has_touch=True); await sc.add_init_script("""localStorage.setItem('it.meName','"Styx"')""")
        ps=await sc.new_page(); await ps.goto(rk.PL+'/players'); await asyncio.sleep(2)
        await T(ph,"window.__toasts=[];const o=document.getElementById('toast');new MutationObserver(()=>window.__toasts.push(o.textContent)).observe(o,{childList:true,characterData:true,subtree:true})")
        await T(ps,"window.__toasts=[];const o=document.getElementById('toast');new MutationObserver(()=>window.__toasts.push(o.textContent)).observe(o,{childList:true,characterData:true,subtree:true})")
        # an effect cast before turns started has no round; one cast on round 1 does
        await dm.click('[data-act=tnext]'); await asyncio.sleep(.3)   # Lich (20)
        t=json.loads(await T(dm,"JSON.stringify(state.turn)")); L=json.loads(await T(dm,"JSON.stringify(state.list.find(c=>c.name==='Lich').sb)"))
        chk("starts at Lich, round 1",t['round']==1 and t['init']==20)
        chk("Lich LA reset at its turn",L['la']['used']==0)
        await asyncio.sleep(1.2)
        chk("Surface highlights Lich",await sf.locator('ol.plist li.turn').count()==1 and 'Lich' in await sf.locator('ol.plist li.turn').inner_text())
        chk("Surface next = Medusa",'Medusa' in await sf.locator('ol.plist li.next').inner_text())
        chk("Medusa told she's next",any("next" in x for x in await T(ph,"window.__toasts")))
        await sf.screenshot(path='turn_sf.png')
        # Medusa casts Bless on round 1
        post=lambda b_:op.open(urllib.request.Request('http://127.0.0.1:8765/player',data=json.dumps(b_).encode(),headers={'Content-Type':'application/json'}))
        await dm.click('[data-act=tnext]'); await asyncio.sleep(1.4)   # Medusa
        chk("phone shows your turn",await ph.locator('.yourturn').count()==1)
        await ph.screenshot(path='turn_phone.png')
        post({'id':'p','action':'effect_add','name':'Bless','targets':['q'],'conc':True}); await asyncio.sleep(1.5)
        chk("effect remembers round 1",await T(dm,"state.effects.find(e=>e.name==='Bless').r0")==1)
        await dm.click('[data-act=tnext]'); await asyncio.sleep(.3)   # Shadow (hidden, 15)
        chk("hidden creature gets a turn on DM",await T(dm,"state.turn.id")=='h')
        pub=json.loads(op.open(rk.PL+'/state').read())
        chk("players don't see whose turn (hidden)",pub['turn']['id'] is None and pub['turn']['round']==1,pub['turn'])
        await dm.click('[data-act=tnext]'); await asyncio.sleep(2.6)   # Styx (12) — Burning
        chk("Styx burning reminder on phone",any("Burning" in x for x in await T(ps,"window.__toasts")))
        await dm.click('[data-act=tnext]'); await asyncio.sleep(.3)   # skip downed goblin -> wraps to Lich round 2
        t=json.loads(await T(dm,"JSON.stringify(state.turn)"))
        chk("downed goblin skipped, round 2",t['round']==2 and t['init']==20,t)
        # prev
        await dm.click('[data-act=tprev]'); await asyncio.sleep(.2)
        chk("previous goes back to Styx round 1",await T(dm,"state.turn.id")=='q' and await T(dm,"state.turn.round")==1)
        # jump to round 11 on Medusa: Bless expires
        await T(dm,"state.turn={id:'g',round:10,init:9};commit()")
        for _ in range(2): await dm.click('[data-act=tnext]'); await asyncio.sleep(.2)
        chk("Bless ends after 10 rounds at Medusa's turn",await T(dm,"state.effects.length")==0 and await T(dm,"state.turn.id")=='p')
        # death save at turn start + auto hourglass
        await T(dm,"state.autoTimer=true;byId('p').down=true;state.turn={id:'g',round:12,init:9};commit()")
        for _ in range(2): await dm.click('[data-act=tnext]'); await asyncio.sleep(.25)
        await asyncio.sleep(1.4)
        chk("downed Medusa gets death save at her turn",await T(ph,"pSheet")=='dsave')
        await T(dm,"byId('p').down=false;state.turn={id:'g',round:13,init:9};commit()")
        for _ in range(2): await dm.click('[data-act=tnext]'); await asyncio.sleep(.25)
        chk("auto hourglass for player",await T(dm,"state.timer&&state.timer.cid")=='p')
        await dm.screenshot(path='turn_dm.png')
        # keyboard N
        await dm.click('h1, .brand'); await dm.keyboard.press('n'); await asyncio.sleep(.2)
        chk("N key advances",await T(dm,"state.turn.id")=='h')
        await dm.click('#newFight'); await asyncio.sleep(.3)
        chk("New combat stops turns",await T(dm,"state.turn")==None)
        chk("no errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
