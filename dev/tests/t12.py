import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("(s)=>__t(s)",js)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on('pageerror',lambda e:errs.append('dm '+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1)
        await T(dm,"state.list=[['Styx','pc','bard',20],['Gregori','pc','cleric',18],['Isandros','pc','fighter',15],['Astrea','pc','druid',12],['Medusa','pc','rogue',16],['Lich','enemy','',21]].map(([n,k,c,i],j)=>({...newCombatant({kind:k}),id:'c'+j,name:n,cls:c,init:i}));state.call=null;commit()")
        await asyncio.sleep(.5)
        chk("all players listed and on",await dm.locator('#callForm .callpick button[aria-pressed=true]').count()==5)
        chk("button says all",(await dm.locator('#callForm button[type=submit]').inner_text())=="Send to all players")
        await dm.fill('#callText','Perception check')
        for n in ['Gregori','Medusa']: await dm.click(f'#callForm .callpick button:has-text("{n}")')
        chk("typed text kept while picking",await dm.input_value('#callText')=="Perception check")
        chk("button says 3",(await dm.locator('#callForm button[type=submit]').inner_text())=="Send to 3 players")
        await dm.locator('#callStrip').screenshot(path='t12_pick.png')
        await dm.click('#callForm button[type=submit]'); await asyncio.sleep(.4)
        call=json.loads(await T(dm,"JSON.stringify(state.call)"))
        chk("sent to the 3",sorted(call['to'])==['c0','c2','c3'],call['to'])
        sf=await (await b.new_context(viewport={'width':912,'height':1368})).new_page(); sf.on('pageerror',lambda e:errs.append('sf '+str(e)))
        await sf.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(2.2)
        chk("Surface shows 3 tiles",await sf.locator('.callbar .cw').count()==3)
        ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); await ctx.add_init_script("localStorage.setItem('it.meName','\"Medusa\"')")
        ph=await ctx.new_page(); await ph.goto(rk.PL+'/players'); await asyncio.sleep(2)
        chk("left-out phone not asked",await T(ph,"pSheet")!="call")
        await T(dm,"state.call=null;commit()"); await asyncio.sleep(.4)
        chk("next roll call: everyone again",await dm.locator('#callForm .callpick button[aria-pressed=true]').count()==5)
        for n in ['Styx','Gregori','Isandros','Astrea','Medusa']: await dm.click(f'#callForm .callpick button:has-text("{n}")')
        chk("none picked: disabled",await dm.locator('#callForm button[type=submit]').is_disabled())
        chk("no page errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
