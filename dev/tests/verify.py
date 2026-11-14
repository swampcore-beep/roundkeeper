import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,sys
from playwright.async_api import async_playwright
SKEW=int(sys.argv[1]) if len(sys.argv)>1 else 0
BASE=sys.argv[2] if len(sys.argv)>2 else '8765'
SK=f"""(()=>{{const o=Date.now.bind(Date);Date.now=()=>o()+{SKEW};}})();"""
ok=True
def chk(name,cond,extra=""):
    global ok; ok&=bool(cond); print(("PASS " if cond else "FAIL ")+name,extra)
async def T(pg,js): return await pg.evaluate("()=>__t(`"+js+"`)")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server'])
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page()
        errs=[]
        dm.on("pageerror",lambda e:errs.append(("DM",str(e))))
        await dm.goto(f'http://127.0.0.1:{BASE}/')
        await T(dm,"state.party=[];state.list=[{id:'a',name:'Sydon',kind:'pc',cls:'wizard',init:18,conds:[],ds:{s:0,f:0}},{id:'b',name:'Medusa',kind:'pc',cls:'rogue',init:12,conds:[],ds:{s:0,f:0}},{id:'e',name:'Ghoul',kind:'enemy',init:10,conds:[],ds:{s:0,f:0}}];state.ended=null;commit()")
        sctx=await b.new_context(viewport={'width':912,'height':1368}); await sctx.add_init_script(SK)
        sf=await sctx.new_page(); sf.on("pageerror",lambda e:errs.append(("SF",str(e))))
        await sf.goto(f'http://{rk.LAN}:{BASE}/players?shared=1')
        pctx=await b.new_context(viewport={'width':390,'height':844},has_touch=True)
        await pctx.add_init_script(SK+"""localStorage.setItem('it.meName','"Medusa"')""")
        ph=await pctx.new_page(); ph.on("pageerror",lambda e:errs.append(("PH",str(e))))
        await ph.goto(f'http://{rk.LAN}:{BASE}/players')
        await asyncio.sleep(2)
        print("surface clockOff",await T(sf,"clockOff"))
        # (a) 0 HP from the DM opens the death save window on the phone
        await dm.click('.row[data-id=b] [data-act=down]'); await asyncio.sleep(1.5)
        chk("a1 phone opens death save on 0 HP",await T(ph,"pSheet")=="dsave")
        await ph.click('[data-act=pclose] >> nth=0'); await asyncio.sleep(.5)
        chk("a2 DM row has Ask to roll",await dm.locator('.row[data-id=b] [data-act=dsask]').count()==1)
        await dm.click('.row[data-id=b] [data-act=dsask]'); await asyncio.sleep(1.5)
        chk("a3 phone reopens on DM ask",await T(ph,"pSheet")=="dsave")
        await ph.fill('#pDsNum','14'); await ph.click('#pDsForm button[type=submit]'); await asyncio.sleep(1.5)
        ds=await T(dm,"JSON.stringify(byId('b').ds)")
        chk("a4 real d20 14 = one success on DM",ds=='{"s":1,"f":0}',ds)
        await ph.click('[data-act=pdsroll]'); await asyncio.sleep(1.5)
        chk("a5 digital roll recorded",await T(dm,"byId('b').ds.s+byId('b').ds.f")>=2 or not await T(dm,"byId('b').down"))
        await ph.screenshot(path='phone_ds.png')
        # menu path on a PC who is up: 0 HP + ask
        await dm.click('.row[data-id=a] [data-act=rowmenu]'); await dm.click('.row[data-id=a] .rmenu [data-act=dsask]'); await asyncio.sleep(.5)
        chk("a6 menu sets Sydon to 0 HP",await T(dm,"byId('a').down")==True)
        await ph.click('[data-act=pclose] >> nth=0') if await T(ph,"pSheet") else None
        # (b) hourglass on the Surface
        await T(dm,"startTimer(byId('b'))"); await asyncio.sleep(1.5)
        txt=await sf.locator('#hourglass').inner_text() if await sf.locator('#hourglass').count() else ""
        chk("b surface hourglass visible with sane seconds",'s' in txt and any(str(n)+'s' in txt for n in range(25,31)),txt.replace('\n',' '))
        # (d) dice on the Surface
        seen=lambda sel: sf.evaluate("(s)=>new Promise(r=>{const t0=Date.now();const f=()=>{if(document.querySelector(s))return r(true);if(Date.now()-t0>5000)return r(false);requestAnimationFrame(f)};f()})",sel)
        await T(ph,"pSend({action:'roll',kind:'nat20',text:'real dice',total:20})")
        chk("d1 nat 20 celebration (after the rolling die)",await seen('.celebrate.n20'))
        await asyncio.sleep(3.8)
        await T(ph,"pSend({action:'roll',kind:'nat1',text:'real dice',total:1})")
        chk("d2 nat 1 effect",await seen('.celebrate.n1'))
        await T(ph,"pSend({action:'roll',kind:'roll',text:'d20+3',total:17})")
        ok_banner=await seen('.rollbanner')
        chk("d3 roll banner",ok_banner)
        # (c) New fight button
        await T(dm,"state.timer=null;commit()")
        await dm.click('#footMore'); await dm.click('#newFight'); await asyncio.sleep(1.8)
        chk("c phone opens initiative on New fight",await T(ph,"pSheet")=="init")
        await ph.screenshot(path='phone_init.png')
        await ph.click('.numpad [data-k="1"]'); await ph.click('.numpad [data-k="5"]'); await ph.click('[data-act=pinitsend]'); await asyncio.sleep(2.5)
        chk("c2 init sent and sheet closes",await T(dm,"byId('b').init")==15 and await T(ph,"pSheet") is None)
        await dm.screenshot(path='dm.png')
        chk("no page errors",not errs,errs)
        await b.close()
asyncio.run(main())
print("ALL OK" if ok else "SOME FAILED")
