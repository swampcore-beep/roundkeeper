import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
# TV: modes, layouts, own look vs the Surface's, big-moment fonts, routing, title, pause, round summary, public view
import asyncio,json,sys,urllib.request
pass
from cap import SETUP as S0
from playwright.async_api import async_playwright
SETUP=S0.replace('THEME','"tavern"').replace('SCENE','"none"').replace("newCombatant({id:'a',name:'Astrea'","Object.assign(newCombatant({id:'h',name:'Hidden Ogre',kind:'enemy',init:3}),{hidden:true,hp:50,hpMax:59}),newCombatant({id:'a',name:'Astrea'")
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x if not c else "")
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
def get(u): return json.loads(urllib.request.urlopen(u,timeout=5).read())
async def cls(pg): return await pg.evaluate("document.getElementById('tvLayer')?.className||''")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':1000})).new_page(); dm.on("pageerror",lambda e:errs.append('dm '+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.5)
        chk("no TV yet",get('http://127.0.0.1:8765/info').get('tvAgo') in (None,-1) or get('http://127.0.0.1:8765/info')['tvAgo']>1e6 or get('http://127.0.0.1:8765/info')['tvAgo']<0,get('http://127.0.0.1:8765/info').get('tvAgo'))
        await T(dm,"state.list=[];commit()")
        tv=await (await b.new_context(viewport={'width':1920,'height':1080})).new_page(); tv.on("pageerror",lambda e:errs.append('tv '+str(e)))
        await tv.goto('http://127.0.0.1:8765/players?shared=1&screen=tv'); await asyncio.sleep(2)
        sf=await (await b.new_context(viewport={'width':912,'height':1368})).new_page(); sf.on("pageerror",lambda e:errs.append('sf '+str(e)))
        await sf.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(1.5)
        chk("auto with no fight: the scene",'m-scene' in await cls(tv),await cls(tv))
        chk("the Surface has no TV layer",await cls(sf)=='')
        i=get('http://127.0.0.1:8765/info'); chk("server sees the TV",0<=i.get('tvAgo',-1)<10,i.get('tvAgo'))
        await asyncio.sleep(3); chk("DM TV button lights up",'on' in await dm.evaluate("document.getElementById('tvBtn').className"))
        # public view even for a local page
        st=json.loads(urllib.request.urlopen('http://127.0.0.1:8765/state?pub=1',timeout=5).read())
        await T(dm,SETUP); await asyncio.sleep(2)
        st=json.loads(urllib.request.urlopen('http://127.0.0.1:8765/state?pub=1&screen=tv',timeout=5).read())
        L=st.get('list',[]); chk("pub=1 on local hides hidden enemies and HP",not any(c.get('name')=='Hidden Ogre' for c in L) and not any('hp' in c and c.get('kind')=='enemy' for c in L),[c.get('name') for c in L])
        full=json.loads(urllib.request.urlopen('http://127.0.0.1:8765/state',timeout=5).read()); chk("local without pub still full",any(c.get('name')=='Hidden Ogre' for c in full['list']))
        chk("auto during turns: Spotlight",'m-spot' in await cls(tv),await cls(tv))
        t=await tv.locator('#tvLayer').inner_text(); chk("Spotlight shows Mira and on deck, not the hidden Ogre",'Mira' in t and 'Styx' in t and 'Ogre' not in t,t[:200])
        chk("the order list is hidden behind the TV layer",await tv.evaluate("getComputedStyle(document.getElementById('player')).visibility")=='hidden')
        # mode buttons in the DM TV panel
        await dm.click('#tvBtn'); await asyncio.sleep(.3)
        await dm.click('#tvPop [data-act=tvmode][data-v=order]'); await asyncio.sleep(2)
        chk("Order mode",'m-order' in await cls(tv) and await tv.locator('.tvord .cd').count()==7 and await tv.locator('.tvord .cd.on').count()==1,await tv.locator('.tvord .cd').count())
        await dm.click('#tvPop [data-act=tvmode][data-v=mirror]'); await asyncio.sleep(2)
        chk("Mirror mode shows the normal list",'m-mirror' in await cls(tv) and await tv.evaluate("getComputedStyle(document.getElementById('player')).visibility")=='visible')
        await dm.click('#tvPop [data-act=tvmode][data-v=spot]'); await asyncio.sleep(.3)
        await dm.click('#tvPop [data-act=tvlayout][data-v=B]') if await dm.locator('#tvPop [data-act=tvlayout][data-v=B]').count() else await T(dm,"state.tv.layout='B';commit()")
        await asyncio.sleep(2); chk("layout B: on deck below, 4 cards",await tv.locator('.tvsp.B .card').count()==4,await tv.locator('.tvsp .card').count())
        # title card: a moment, then on the scene
        await dm.fill('#tvT','The Misty Woods'); await dm.fill('#tvSub','North of Daggerford'); await dm.evaluate("document.querySelector('#tvTitleForm').requestSubmit()"); await asyncio.sleep(2)
        chk("title card shows big on the TV",await tv.locator('#moment.tvtitle').count()==1 and 'Misty' in await tv.locator('#moment').inner_text())
        chk("…not on the Surface",await sf.locator('#moment.tvtitle').count()==0)
        await dm.click('#tvPop [data-act=tvmode][data-v=scene]'); await asyncio.sleep(2)
        chk("scene mode carries the title",'Misty Woods' in await tv.locator('.tvex').inner_text())
        # pause wins over any mode
        await dm.click('#tvPop [data-act=tvpause][data-v="5"]'); await asyncio.sleep(2)
        t=await tv.locator('#tvLayer').inner_text(); chk("pause countdown",'m-pause' in await cls(tv) and ('4:5' in t or '5:00' in t),t[:80])
        await T(dm,"tvBarRender()"); await dm.click('#tvPop [data-act=tvpause][data-v="0"]'); await asyncio.sleep(2)
        chk("pause over",'m-pause' not in await cls(tv) and not (await T(dm,"!!(state.tv.pause)")))
        await T(dm,"state.tv.mode='auto';commit()")
        # routing: dice to the TV only
        await T(dm,"state.tv.ev={dice:'tv'};commit()"); await asyncio.sleep(2)
        chk("Surface: dice not wanted (TV connected)",not await sf.evaluate("()=>__t('screenWants(\"dice\")')"))
        chk("TV: dice wanted",await tv.evaluate("()=>__t('screenWants(\"dice\")')"))
        chk("TV: Surface-only moment not wanted",not await tv.evaluate("()=>__t('state.tv.ev={intro:\"surface\"};screenWants(\"intro\")')"))
        # HDYWTDT on the TV
        await T(dm,"state.tv.ev={};state.hdywt={id:'hx1',at:Date.now(),name:'Mira',cls:'wizard'};commit()"); await asyncio.sleep(2)
        chk("HDYWTDT on the TV",await tv.locator('#moment.hd').count()==1)
        chk("…and on the Surface (both)",await sf.locator('#moment.hd').count()==1)
        chk("no fake italics",await tv.evaluate("getComputedStyle(document.querySelector('#moment .mo-q')).fontStyle")=='normal')
        # round transition + summary
        await asyncio.sleep(5)
        await T(dm,"clogPush('Hidden Ogre grins');clogPush('Mira casts Bless');clogPush('Kobold A is defeated');commit()")
        await T(dm,"moveTurn(1);moveTurn(1);moveTurn(1);moveTurn(1);moveTurn(1)"); await asyncio.sleep(1.8)
        r=await T(dm,"state.turn.round"); rs=await T(dm,"JSON.stringify(state.rsum)")
        chk("round transition on the TV",await tv.locator('#moment.tvround').count()==1 and str(r) in await tv.locator('#moment').inner_text(),rs)
        chk("rsum never names hidden creatures",'Ogre' not in rs,rs)
        # the TV's own look
        await T(dm,"atmoT='tv';atmoD=null;atmoSheet()"); await asyncio.sleep(1.5)
        chk("Atmosphere TV tab: same as the Surface first",await dm.locator('[data-act=atvown]').count()==1)
        chk("16:9 TV preview",'screen=tv' in await dm.evaluate("document.getElementById('atmoFrame').src") and 'tv' in await dm.evaluate("document.querySelector('.apfrm').className"))
        await dm.click('[data-act=atvown]'); await asyncio.sleep(.3)
        await dm.click('[data-act=athm][data-v=hoard]'); await dm.click('[data-act=amfont][data-v=A]'); await dm.click('#aLite'); await asyncio.sleep(2)
        chk("preview shows the draft",await dm.evaluate("()=>document.getElementById('atmoFrame').contentDocument.documentElement.dataset.mfont")=='A')
        chk("TV unchanged until Show",await tv.evaluate("document.documentElement.dataset.mfont||'B'")=='B')
        await dm.click('[data-act=atmogo]'); await asyncio.sleep(2.5)
        lk=await T(dm,"JSON.stringify(state.tv.look)")
        chk("TV look saved",'"same":false' in lk and '"theme":"hoard"' in lk and '"mfont":"A"' in lk and '"lite":true' in lk,lk)
        chk("TV wears it",await tv.evaluate("document.documentElement.dataset.mfont")=='A' and await tv.evaluate("document.body.classList.contains('tvlite')"))
        chk("the Surface keeps its own",await sf.evaluate("document.documentElement.dataset.mfont||'B'")=='B' and await T(dm,"state.theme")=='tavern')
        await dm.click('[data-act=atmotab][data-v=surface]'); await asyncio.sleep(1)
        chk("Surface tab shows the Surface's theme",await dm.evaluate("document.querySelector('[data-act=athm][aria-pressed=true]')?.dataset.v")=='tavern')
        await dm.click('[data-act=atmotab][data-v=tv]'); await asyncio.sleep(1)
        chk("TV tab shows the TV's theme",await dm.evaluate("document.querySelector('[data-act=athm][aria-pressed=true]')?.dataset.v")=='hoard')
        await dm.click('[data-act=atvsame]'); await asyncio.sleep(.3); await dm.click('[data-act=atmogo]'); await asyncio.sleep(2.5)
        chk("back to the Surface's look",not await T(dm,"!!(state.tv.look)") and not await tv.evaluate("document.body.classList.contains('tvlite')"))
        # phones never get TV layer; join page TV button
        ph=await (await b.new_context(viewport={'width':390,'height':800})).new_page(); ph.on("pageerror",lambda e:errs.append('ph '+str(e)))
        await ph.goto(rk.PL+'/players'); await asyncio.sleep(1.5)
        chk("join page offers This is the TV",await ph.locator('[data-act=ptv]').count()==1)
        chk("no page errors",not errs,errs)
        await b.close()
    print("t25: ",("fails=0" if ok else "fails=1"))
asyncio.run(main())
