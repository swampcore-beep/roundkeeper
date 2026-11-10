import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x if not c or x else "")
S=rk.OUT+"/"
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context()).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.5)
        await T(dm,"state.list=[newCombatant({id:'d',name:'Astrea',kind:'pc',cls:'druid',init:12}),newCombatant({id:'w',name:'Mira',kind:'pc',cls:'wizard',init:10}),newCombatant({id:'p',name:'Bram',kind:'pc',cls:'paladin',init:8}),newCombatant({id:'g',name:'Goblin',kind:'enemy',init:14})];commit()"); await asyncio.sleep(.5)
        async def phone(name):
            ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            await ctx.add_init_script(f"localStorage.setItem('it.meName','\"{name}\"')")
            ph=await ctx.new_page(); ph.on('pageerror',lambda e:errs.append('ph '+str(e))); await ph.goto(rk.PL+'/players'); await asyncio.sleep(2.5); return ph
        ph=await phone('Astrea')
        await ph.locator('.ptiles [data-act=pbook]').click(); await asyncio.sleep(.4)
        chk("2024 by default",await ph.locator('.sped [data-v="2024"][aria-pressed=true]').count()==1)
        n24=await T(ph,"spPool(false).filter(x=>spCls(x).includes('D')).length")
        names24=set(await T(ph,"spPool(false).map(x=>x[0])"))
        await ph.locator('.sped [data-v="2014"]').click(); await asyncio.sleep(.3)
        chk("switch remembered for the character",await T(ph,"ls.get(spEdKey())")=="2014")
        pool=await T(ph,"spPool(false).map(x=>[x[0],x[7]])")
        chk("no 2024 printings in 2014",all(s.lower()!='xphb' for n,s in pool))
        names14=set(n for n,s in pool)
        chk("2024-only spells hidden (Elementalism, Starry Wisp, Divine Smite)",not ({'Elementalism','Starry Wisp','Divine Smite'}&names14) and {'Elementalism','Starry Wisp'}<=names24)
        chk("2014 keeps Xanathar's and Tasha's",'Toll the Dead' in names14 and "Tasha's Caustic Brew" in names14)
        await ph.fill('#pBookQ','fireball'); await ph.dispatch_event('#pBookQ','input'); await asyncio.sleep(.3)
        rows=await ph.locator('#pBookList .sprow').count(); chk("druid doesn't get Fireball",rows==0,rows)
        await ph.fill('#pBookQ','moonbeam'); await ph.dispatch_event('#pBookQ','input'); await asyncio.sleep(.3)
        await ph.locator('#pBookList .sprow').first.click(); await asyncio.sleep(1)
        head=await ph.locator('.spcard .rhead').inner_text(); chk("opens the 2014 text",'PHB14' in head,head)
        await ph.locator('[data-act=pbookeff]').click(); await asyncio.sleep(.3)
        chk("effect remembers the printing",await T(ph,"effDraft.src")=="PHB")
        await ph.locator('#pEffForm [type=submit]').click(); await asyncio.sleep(2)
        e=json.loads(await T(dm,"JSON.stringify(state.effects.find(e=>e.name==='Moonbeam')||null)")); chk("DM gets the printing",e and e.get('src')=='PHB',e)
        # 2014 class lists: Spiritual Weapon is cleric in 2014, also paladin in 2024? use XGE spell on druid list via classVariant
        await ph.locator('.sped [data-v="2024"]').click() if await ph.locator('.sped').count() else None
        await T(ph,"ls.set(spEdKey(),'2024');pSheet='book';bookQ='';renderPSheet()"); await asyncio.sleep(.3)
        chk("back on 2024 the newest printings",await T(ph,"spPool(false).every(x=>!x[9])"))
        # the paladin on 2014 doesn't see Divine Smite; on 2024 does
        pb=await phone('Bram')
        d24=await T(pb,"spPool(false).some(x=>x[0]==='Divine Smite'&&spCls(x).includes('P'))")
        await T(pb,"ls.set(spEdKey(),'2014')")
        d14=await T(pb,"spPool(false).some(x=>x[0]==='Divine Smite')")
        chk("Divine Smite only on 2024",d24 and not d14,(d24,d14))
        chk("one phone's choice doesn't change another's",await T(ph,"sp14()")==False)
        print("errors:",errs[:5]); chk("no page errors",not errs)
        await b.close()
    print("ALL PASS" if ok else "SOME FAILED")
asyncio.run(main())
