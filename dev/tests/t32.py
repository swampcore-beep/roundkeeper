import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
# Devices: the tablet and each phone say what they are; only the DM learns which phones are connected;
# the window shows full links for the tablet and the TV.
import asyncio,json,urllib.request
from playwright.async_api import async_playwright
op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("()=>__t(`"+js+"`)")
info=lambda base: json.loads(op.open(base+'/info').read())
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.2)
        await T(dm,"state.party=[];state.list=[{id:'m',name:'Mira',kind:'pc',cls:'sorcerer',init:17,conds:[],ds:{s:0,f:0}},{id:'s',name:'Styx',kind:'pc',cls:'bard',init:12,conds:[],ds:{s:0,f:0}},{id:'g',name:'Goblin',kind:'enemy',init:10,conds:[],ds:{s:0,f:0}}];state.ended=null;commit()")
        await asyncio.sleep(.5)
        d=info('http://127.0.0.1:8765')
        chk("nobody yet",(d.get('phones') or {})=={} and d.get('tabletAgo') is None,d)
        tb=await (await b.new_context(viewport={'width':1024,'height':700})).new_page(); tb.on("pageerror",lambda e:errs.append(str(e)))
        await tb.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(2.5)
        pc=await b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
        await pc.add_init_script("""localStorage.setItem('it.meName','"Mira"')""")
        ph=await pc.new_page(); ph.on("pageerror",lambda e:errs.append(str(e))); await ph.goto(rk.PL+'/players'); await asyncio.sleep(2.5)
        d=info('http://127.0.0.1:8765')
        chk("the tablet is seen",d.get('tabletAgo') is not None and d['tabletAgo']<5,d.get('tabletAgo'))
        chk("Mira's phone is seen",'m' in (d.get('phones') or {}) and 's' not in d['phones'],d.get('phones'))
        chk("a phone doesn't learn who else is connected",info(rk.PL).get('phones') is None)
        await asyncio.sleep(2.2)
        pill=await dm.inner_text('#joinPill')
        chk("header sums it up",'Devices' in pill and '1/2 phones' in pill,pill)
        await dm.click('#joinPill'); await asyncio.sleep(1)
        links=await dm.evaluate("()=>[...document.querySelectorAll('#devSheet .devlink code')].map(c=>c.textContent)")
        chk("full link for the tablet",any(l.startswith('http://') and l.endswith('/players?shared=1') for l in links),links)
        chk("full link for the TV",any(l.startswith('http://') and l.endswith('/players?shared=1&screen=tv') for l in links),links)
        rows=await dm.evaluate("()=>[...document.querySelectorAll('#devSheet .devgrid .devrow')].map(r=>[r.querySelector('b').textContent,r.querySelector('small').textContent,r.querySelector('.jd').classList.contains('on')])")
        chk("Mira connected, Styx not",rows==[['Mira','connected',True],['Styx','not connected yet',False]],rows)
        chk("copy buttons",await dm.locator('#devSheet [data-act=devcopy]').count()>=3)
        await dm.click('.devhelp summary'); await asyncio.sleep(2.5)
        chk("help stays open while the window refreshes",await dm.evaluate("()=>!!document.querySelector('#devSheet .devhelp[open]')"))
        await dm.click('#devSheet [data-act=dmdev]'); await asyncio.sleep(.6)
        chk("DM devices opens from here",await dm.locator('[aria-label="DM devices"]').count()==1)
        chk("no errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
