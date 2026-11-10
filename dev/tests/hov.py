import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json,sys
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("()=>__t(`"+js+"`)")
OUT=rk.OUT
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.5)
        await dm.click('[data-act=sbopen]'); await dm.wait_for_selector('#fetQ'); await dm.fill('#fetQ','lich'); await asyncio.sleep(.2)
        await dm.click('#fetList .fetrow:has-text("MM24") >> nth=0'); await asyncio.sleep(.6)
        await dm.click('[data-act=sbadd]'); await asyncio.sleep(.4)
        await dm.click('.row [data-act=sbview]'); await asyncio.sleep(.4)
        refs=await dm.locator('#sbDrawer .ref').count(); chk("refs marked in drawer",refs>10,refs)
        sp=dm.locator('#sbDrawer .ref.r-spell',has_text='Fireball').first
        await sp.hover(); await asyncio.sleep(.8)
        card=dm.locator('.refcard'); chk("hover shows spell card",await card.count()==1 and 'Evocation' in await card.inner_text() and 'PHB24' in await card.inner_text() and '150 feet' in await card.inner_text(),(await card.inner_text())[:200] if await card.count() else '')
        await dm.screenshot(path=OUT+'/hover_spell.png')
        # nested: hover a ref inside the card
        inner=dm.locator('.refcard .ref').first
        if await inner.count():
            await inner.hover(); await asyncio.sleep(.9)
            chk("nested card",await dm.locator('.refcard').count()==2,await dm.locator('.refcard').count())
            await dm.screenshot(path=OUT+'/hover_nested.png')
        await dm.mouse.move(200,800); await asyncio.sleep(.8)
        chk("cards close when the mouse leaves",await dm.locator('.refcard').count()==0)
        cond=dm.locator('#sbDrawer .ref.r-condition').first
        await cond.click(); await asyncio.sleep(.6)
        chk("click pins condition card",await dm.locator('.refcard.pinned').count()==1,(await dm.locator('.refcard').inner_text())[:120])
        await dm.mouse.move(200,800); await asyncio.sleep(.8)
        chk("pinned stays",await dm.locator('.refcard').count()==1)
        await dm.keyboard.press('Escape'); await asyncio.sleep(.2)
        chk("Esc closes card",await dm.locator('.refcard').count()==0 and await dm.locator('#sbDrawer').count()==1)
        # an .md statblock: names recognised
        md=open(rk.PRIV+'/sb/gyreguard.md').read()
        await dm.click('#sbDrawer [data-act=sbclose]'); await asyncio.sleep(.2)
        await dm.click('[data-act=sbopen]'); await asyncio.sleep(.3); await dm.fill('#sbPaste',md); await asyncio.sleep(.3); await dm.click('[data-act=sbadd]'); await asyncio.sleep(.4)
        gid=await T(dm,"state.list.find(c=>c.name==='Aarakocra Gyreguard').id")
        await dm.click(f'.row[data-id="{gid}"] [data-act=sbview]'); await asyncio.sleep(.4)
        st=dm.locator('#sbDrawer .ref.r-condition'); n=await st.count(); txts=await st.all_inner_texts()
        chk("md: conditions found",n>=2,txts)
        await st.first.hover(); await asyncio.sleep(.8)
        chk("md condition card",await dm.locator('.refcard').count()==1,(await dm.locator('.refcard').inner_text())[:120] if await dm.locator('.refcard').count() else '')
        await dm.screenshot(path=OUT+'/hover_md.png')
        chk("no errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
