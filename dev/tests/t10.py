import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("()=>__t(`"+js+"`)")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on('pageerror',lambda e:errs.append('dm '+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1)
        await T(dm,"state.list=[['Styx','pc','bard',20],['Gregori','pc','cleric',18],['Lich','enemy','',21]].map(([n,k,c,i],j)=>({...newCombatant({kind:k}),id:'c'+j,name:n,cls:c,init:i}));state.turn=null;state.effects=[];state.call=null;commit()")
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
        await ctx.add_init_script("localStorage.setItem('it.meName','\"Styx\"')")
        ph=await ctx.new_page(); ph.on('pageerror',lambda e:errs.append('ph '+str(e))); await ph.goto(rk.PL+'/players'); await asyncio.sleep(2)
        async def tap(k): await ph.locator(f'#appkb button[data-k="{k}"]').dispatch_event('pointerdown')
        sysk=await ph.evaluate("()=>[...document.querySelectorAll('input')].filter(i=>!i.closest('#dm')&&i.type!=='file'&&i.type!=='checkbox'&&i.type!=='hidden'&&i.getAttribute('inputmode')!=='none').map(i=>i.id)")
        # spell search
        await T(ph,"pSheet='effs';renderPSheet()"); await asyncio.sleep(.3)
        await ph.click('#pSpellQ'); await asyncio.sleep(.3)
        chk("text keyboard opens on spell search",await ph.locator('#appkb.kbtext:not([hidden])').count()==1)
        for k in "ban": await tap(k)
        chk("typed with auto capital",await ph.input_value('#pSpellQ')=="Ban")
        await ph.screenshot(path='t10_spell.png')
        chk("list filtered",'Bane' in await ph.locator('#pSpellList').inner_text())
        sysk+=await ph.evaluate("()=>[...document.querySelectorAll('input')].filter(i=>!i.closest('#dm')&&i.type!=='file'&&i.type!=='checkbox'&&i.getAttribute('inputmode')!=='none').map(i=>i.id)")
        await tap('done'); await asyncio.sleep(.3)
        chk("Done closes keyboard",await ph.locator('#appkb:not([hidden])').count()==0)
        # custom effect name with space and apostrophe
        await ph.click('[data-act=pspellother]'); await asyncio.sleep(.4)
        await ph.fill('#pEffName',''); await ph.focus('#pEffName'); await asyncio.sleep(.2)
        for k in ["h","u","n","t","e","r","'","s"," ","m","a","r","k"]: await tap(k)
        chk("custom name typed",await ph.input_value('#pEffName')=="Hunter's Mark" and await T(ph,"effDraft.name")=="Hunter's Mark",await ph.input_value('#pEffName'))
        await tap('done')
        # dice modifier: negative
        await T(ph,"pSheet='dice';renderPSheet()"); await asyncio.sleep(.3)
        await ph.click('#pMod'); await asyncio.sleep(.3)
        chk("number keyboard on modifier",await ph.locator('#appkb.kbnum:not([hidden])').count()==1)
        await ph.evaluate("()=>{const i=document.querySelector('#pMod');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))}")
        await tap('2'); await tap('neg')
        await ph.screenshot(path='t10_mod.png')
        chk("modifier -2",await T(ph,"dice.mod")==-2)
        await tap('done')
        sysk+=await ph.evaluate("()=>[...document.querySelectorAll('input')].filter(i=>!i.closest('#dm')&&i.type!=='file'&&i.type!=='checkbox'&&i.getAttribute('inputmode')!=='none').map(i=>i.id)")
        # resources custom name
        await T(ph,"pSheet='res';renderPSheet()"); await asyncio.sleep(.3)
        await ph.click('[data-act=presother]'); await asyncio.sleep(.4)
        chk("resource name keyboard opens by itself",await ph.locator('#appkb.kbtext:not([hidden])').count()==1)
        await tap('k'); await tap('i')
        chk("resource name",await T(ph,"resDraft.name")=="Ki")
        await tap('done')
        # concentration save bonus
        await T(ph,"pConc={dc:12,dmg:9};pSheet='conc';byId('c0').conds=['Concentrating'];renderPSheet()"); await asyncio.sleep(.3)
        await ph.click('#pConMod'); await tap('3')
        chk("con bonus stored",str(await T(ph,"ls.get('conmod:styx','')")).endswith('3'))
        await tap('done')
        # death save real d20 (form submit on Done)
        await T(dm,"byId('c0').down=true;byId('c0').ds={s:0,f:0};commit()"); await asyncio.sleep(2.2)
        await T(ph,"pSheet='dsave';renderPSheet()"); await asyncio.sleep(.3)
        await ph.click('#pDsNum'); await tap('1'); await tap('5'); await tap('done'); await asyncio.sleep(2.2)
        chk("death save from real d20 (15 = success)",await T(dm,"byId('c0').ds.s")==1, await T(dm,"JSON.stringify(byId('c0').ds)"))
        sysk+=await ph.evaluate("()=>[...document.querySelectorAll('input')].filter(i=>!i.closest('#dm')&&i.type!=='file'&&i.type!=='checkbox'&&i.getAttribute('inputmode')!=='none').map(i=>i.id)")
        chk("no field opens the phone keyboard",not sysk,sysk)
        chk("no page errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
