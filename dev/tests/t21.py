import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json,urllib.request
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x if not c or x else "")
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
def pub(): return json.load(urllib.request.urlopen(urllib.request.Request(rk.PL+'/state'),timeout=5)) if False else None
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append("dm:"+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.5)
        await T(dm,"state.list.push(newCombatant({id:'m',name:'Mira',kind:'pc',cls:'wizard',init:12}),Object.assign(newCombatant({id:'g',name:'Goblin',kind:'enemy',init:9}),{hidden:true}));commit()"); await asyncio.sleep(.3)
        sf=await (await b.new_context(viewport={'width':912,'height':1368})).new_page(); sf.on("pageerror",lambda e:errs.append("sf:"+str(e)))
        await sf.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(2)
        ds=lambda pg:pg.evaluate("Object.assign({},document.documentElement.dataset)")
        chk("Surface starts plain (tavern)",await ds(sf)=={},await ds(sf))
        # ---- light DM screen: only on the laptop
        chk("DM dark by default",'dm' not in await ds(dm))
        await dm.click('#dmLightBtn'); await asyncio.sleep(.3)
        chk("DM light after the click",(await ds(dm)).get('dm')=='light')
        bg=await dm.evaluate("getComputedStyle(document.body).backgroundColor"); chk("light background",bg=='rgb(242, 238, 229)',bg)
        await asyncio.sleep(2.2); chk("Surface stays as it was",'dm' not in await ds(sf))
        await dm.reload(); await asyncio.sleep(1.5); chk("light remembered after reload",(await ds(dm)).get('dm')=='light')
        await dm.click('#dmLightBtn'); await asyncio.sleep(.2); chk("back to dark",'dm' not in await ds(dm))
        st=await dm.evaluate("fetch('/state').then(r=>r.json())"); chk("light mode is not in the shared state",'dmLight' not in json.dumps(st))
        # ---- the Atmosphere sheet with a draft and preview
        await dm.click('#atmoBtn'); await asyncio.sleep(2.5)
        chk("sheet open with the preview",await dm.locator('.sheet.atmo2 #atmoFrame').count()==1)
        chk("Show on the Surface disabled: nothing changed",await dm.locator('[data-act=atmogo]').is_disabled())
        chk("13 themes, 4 marked new",await dm.locator('[data-act=athm]').count()==13 and await dm.locator('.thc.new').count()==4)
        await dm.click('[data-act=athm][data-v=hoard]'); await asyncio.sleep(1)
        fr=dm.frame_locator('#atmoFrame'); fp=dm.frames[1]
        fds=await fp.evaluate("Object.assign({},document.documentElement.dataset)")
        chk("preview shows Dragon's hoard",fds.get('skin')=='hoard' and fds.get('rows')=='hoard' and fds.get('font')=='cinzeldec' and fds.get('tfont')=='uncial',fds)
        chk("preview scene is Fire",await fp.evaluate("__t('(pvDraft||{}).scene')")=='fire')
        await asyncio.sleep(2.2); chk("Surface unchanged before Show",await ds(sf)=={},await ds(sf))
        chk("preview never shows the hidden goblin",await fp.evaluate("!document.body.innerText.includes('Goblin')"))
        txt=await dm.locator('.apnow').inner_text(); chk("lists what changed",'theme' in txt and 'scene' in txt,txt)
        # change single parts on top
        await dm.click('[data-act=apal][data-v=marble]'); await dm.click('[data-act=afont][data-v=didot]'); await dm.select_option('#aTfont','cinzel'); await dm.click('[data-act=arows][data-v=amphora]'); await asyncio.sleep(.6)
        fds=await fp.evaluate("Object.assign({},document.documentElement.dataset)")
        chk("preview: own colours, names font, title font, rows",fds.get('skin')=='marble' and fds.get('font')=='didot' and fds.get('tfont')=='cinzel' and fds.get('rows')=='amphora',fds)
        chk("theme card no longer pressed (custom)",await dm.locator('[data-act=athm][data-v=hoard]').get_attribute('aria-pressed')=='false')
        chk("preview did not reload on part changes",await fp.evaluate("!!window.__t"))
        # Discard goes back to what the Surface has
        await dm.click('[data-act=atmodiscard]'); await asyncio.sleep(.6)
        fds=await fp.evaluate("Object.assign({},document.documentElement.dataset)"); chk("discard: preview back to tavern",fds=={},fds)
        # build again and show it
        await dm.click('[data-act=athm][data-v=marble]'); await dm.click('[data-act=afont][data-v=uncial]'); await asyncio.sleep(.3)
        await dm.click('[data-act=atmogo]'); await asyncio.sleep(2.5)
        sd=await ds(sf); chk("Surface: marble with Uncial names",sd.get('skin')=='marble' and sd.get('rows')=='marble' and sd.get('font')=='uncial' and sd.get('tfont')=='cinzel',sd)
        st=await dm.evaluate("fetch('/state').then(r=>r.json())"); chk("state: theme + only the override",st.get('theme')=='marble' and st.get('look')=={'font':'uncial'} and st.get('scene')=='temple',(st.get('theme'),st.get('look'),st.get('scene')))
        pubst=await sf.evaluate("fetch('/state').then(r=>r.json())"); chk("players get the look",pubst.get('look')=={'font':'uncial'} and pubst.get('theme')=='marble')
        chk("Show disabled again",await dm.locator('[data-act=atmogo]').is_disabled())
        lbl=await dm.locator('#atmoBtn').inner_text(); chk("header says changed",'Marble & gold (changed)' in lbl,lbl)
        # save as my theme, then load it later
        await dm.fill('#aSaveName','Strahd'); await dm.press('#aSaveName','Enter'); await asyncio.sleep(.3)
        chk("saved theme listed",await dm.locator('[data-act=amine]').count()==1)
        await dm.click('[data-act=athm][data-v=wyrm]'); await asyncio.sleep(.3)
        await dm.click('[data-act=amine]'); await asyncio.sleep(.3)
        chk("loaded own theme = what's on the Surface",await dm.locator('[data-act=atmogo]').is_disabled())
        await dm.click('[data-act=aminerm]'); await asyncio.sleep(.2); chk("own theme deleted",await dm.locator('[data-act=amine]').count()==0)
        # close without sending
        await dm.click('[data-act=athm][data-v=gothic]'); await dm.click('[data-act=atmoclose]'); await asyncio.sleep(2.3)
        chk("closing does not send",(await ds(sf)).get('skin')=='marble')
        # the preview iframe is not counted as the Surface (laptop polls are local)
        # each new theme on the real Surface
        for k,f,tf in [('amphora','marcellus','marcellus'),('hoard','cinzeldec','uncial'),('wyrm','uncial','uncial')]:
            await T(dm,f"state.theme='{k}';delete state.look;commit()"); await asyncio.sleep(2.2)
            sd=await ds(sf); chk(f"Surface {k}",sd.get('skin')==k and sd.get('font')==f and sd.get('tfont')==(tf if tf!=f else None),sd)
        tfam=await sf.evaluate("getComputedStyle(document.querySelector('.p-title')).fontFamily"); chk("title uses the title font",'Uncial' in tfam,tfam)
        ok2=await sf.evaluate("document.fonts.check(\"16px 'Uncial Antiqua'\")"); chk("Uncial font loaded",ok2)
        # an older state without look: theme only
        await T(dm,"state.theme='gothic';delete state.look;commit()"); await asyncio.sleep(2.2)
        sd=await ds(sf); chk("old state: theme's own parts",sd.get('skin')=='gothic' and sd.get('font')=='pirata',sd)
        chk("no page errors",not errs,errs)
        await b.close()
    print("t21: ",("fails=0" if ok else "fails=1"))
asyncio.run(main())
