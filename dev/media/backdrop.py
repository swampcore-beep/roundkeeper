import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# The backdrop behind the devices in the composites: the TV in Scene mode, Northern lights.
import asyncio
from scene import setup
from playwright.async_api import async_playwright
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server'])
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page();await dm.goto(rk.DM+'/');await asyncio.sleep(1.5)
        prev=await T(dm,"JSON.stringify(state)")   # put the server back the way it was afterwards
        await T(dm,setup("tavern","aurora",False,"i")+";state.tv=Object.assign({},state.tv,{mode:'scene'});state.weather='snow';state.tod='none';state.sceneFx={};commit()")
        pg=await (await b.new_context(viewport={'width':960,'height':540})).new_page()
        await pg.goto(rk.DM+'/players?shared=1&screen=tv');await asyncio.sleep(6)
        await pg.screenshot(path=rk.MEDIA+'/backdrop.png')
        await T(dm,"state="+prev+";commit()");await asyncio.sleep(.5);await b.close()
asyncio.run(main())
