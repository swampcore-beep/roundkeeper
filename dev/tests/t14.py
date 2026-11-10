import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1)
        await dm.evaluate("()=>__t(`state.list=[['Styx','pc','bard',20],['Lich','enemy','',21]].map(([n,k,c,i],j)=>({...newCombatant({kind:k}),id:'c'+j,name:n,cls:c,init:i}));commit()`)")
        sf=await (await b.new_context(viewport={'width':912,'height':1368})).new_page(); sf.on('pageerror',lambda e:errs.append(str(e)))
        await sf.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(2.2)
        fs=lambda pg: pg.evaluate("()=>!!document.fullscreenElement")
        btn=sf.locator('.fsbtn')
        chk("label before",(await btn.inner_text())=="Full screen")
        await btn.click(force=True); await asyncio.sleep(.6)
        chk("click enters",await fs(sf))
        chk("label in full screen",(await sf.locator('.fsbtn').inner_text())=="Exit full screen")
        await asyncio.sleep(2.5)   # a re-render must keep the right label
        chk("label survives redraw",(await sf.locator('.fsbtn').inner_text())=="Exit full screen")
        await sf.locator('.fsbtn').click(force=True); await asyncio.sleep(.6)
        chk("click again leaves",not await fs(sf))
        chk("label back",(await sf.locator('.fsbtn').inner_text())=="Full screen")
        await sf.locator('.fsbtn').click(force=True); await asyncio.sleep(.5)
        await sf.evaluate("()=>document.exitFullscreen()"); await asyncio.sleep(.5)   # like Esc / swipe from the top
        chk("left another way: label follows",not await fs(sf) and (await sf.locator('.fsbtn').inner_text())=="Full screen")
        ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); await ctx.add_init_script("localStorage.setItem('it.meName','\"Styx\"')")
        ph=await ctx.new_page(); ph.on('pageerror',lambda e:errs.append(str(e))); await ph.goto(rk.PL+'/players'); await asyncio.sleep(2)
        await ph.evaluate("()=>__t(`pSheet='more';renderPSheet()`)"); await asyncio.sleep(.3)
        await ph.click('.psheet [data-act=fs]'); await asyncio.sleep(.5)
        chk("phone enters",await fs(ph) and (await ph.locator('.psheet [data-act=fs]').inner_text())=="Exit full screen")
        await ph.click('.psheet [data-act=fs]'); await asyncio.sleep(.5)
        chk("phone leaves",not await fs(ph))
        chk("no page errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
