import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json,sys
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("()=>__t(`"+js+"`)")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(.8)
        await dm.click('[data-act=sbopen]'); await dm.wait_for_selector('#fetQ',timeout=10000)
        chk("search box focused",await dm.evaluate("document.activeElement.id")=='fetQ')
        await dm.keyboard.type('lich'); await asyncio.sleep(.2)
        rows=await dm.locator('#fetList .fetrow').all_inner_texts(); print(rows[:6])
        chk("official + own by default, no other homebrew",all('Flee, Mortals' not in r and 'Angry Golem' not in r for r in rows) and any('MM24' in r for r in rows) and not any('MM14' in r for r in rows) and not any('XMM' in r for r in rows))
        await dm.click('#fetList [data-act=fetold]'); await asyncio.sleep(.2)
        rows2=await dm.locator('#fetList .fetrow').all_inner_texts()
        chk("older printings on request",any('MM14' in r for r in rows2))
        await dm.click('#fetList [data-act=fetold]'); await asyncio.sleep(.2)
        await dm.select_option('#fetSrc','all'); await asyncio.sleep(.1)
        rows2=await dm.locator('#fetList .fetrow').count(); chk("everything shows more",rows2>len(rows),(len(rows),rows2))
        await dm.select_option('#fetSrc','offown')
        await dm.fill('#fetQ',''); await dm.select_option('#fetSrc','own'); await asyncio.sleep(.1)
        own=await dm.locator('#fetList .fetrow').count(); chk("own homebrew lists Swampcores",own==115,own)
        await dm.select_option('#fetSrc','offown'); await dm.fill('#fetQ','lich'); await asyncio.sleep(.1)
        await dm.click('#fetList .fetrow:has-text("MM24") >> nth=0'); await asyncio.sleep(.6)
        chk("lich card added",await dm.locator('.sbcard').count()==1 and 'MM24' in await dm.locator('.sbcard').inner_text())
        await dm.fill('#fetQ','goblin warrior'); await asyncio.sleep(.1); await dm.click('#fetList .fetrow >> nth=0'); await asyncio.sleep(.6)
        await dm.click('[data-act=sbcount][data-i="1"][data-d="1"]'); await dm.click('[data-act=sbcount][data-i="1"][data-d="1"]')
        await dm.screenshot(path=rk.OUT+'/fet_sheet.png')
        await dm.click('[data-act=sbadd]'); await asyncio.sleep(.5)
        L=json.loads(await T(dm,"JSON.stringify(state.list.map(c=>[c.name,c.init,c.hp,c.ac,c.ctype,!!c.sb&&!!c.sb.raw]))")); print(L)
        chk("added lich + 3 goblin warriors with stats",len(L)==4 and all(x[2] and x[3] and x[5] for x in L))
        lid=await T(dm,"state.list.find(c=>c.name==='Lich').id")
        await dm.click(f'.row[data-id="{lid}"] [data-act=sbview]'); await asyncio.sleep(.3)
        chk("drawer has roll buttons",await dm.locator('#sbDrawer .sbr.hit').count()>0 and await dm.locator('#sbDrawer .sbr.save').count()>0)
        await dm.click('#sbDrawer .sbr.hit >> nth=0'); await asyncio.sleep(.1)
        await dm.screenshot(path=rk.OUT+'/fet_drawer.png')
        lib=json.loads(await T(dm,"JSON.stringify(lib.map(e=>e.name))")); chk("added to library",'Lich' in lib and 'Goblin Warrior' in lib,lib)
        chk("no errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
