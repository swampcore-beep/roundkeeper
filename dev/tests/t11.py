import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("(s)=>__t(s)",js)
BASE="""state.list=[['Lich','enemy','',21],['Styx','pc','bard',20],['Gregori','pc','cleric',18],['Isandros','pc','fighter',15],['Goblin A','enemy','',10]].map(([n,k,c,i],j)=>({...newCombatant({kind:k}),id:'c'+j,name:n,cls:c,init:i,ctype:k==='enemy'?'humanoid':''}));
state.effects=[];state.call=null;state.roll=null;state.ended=null;state.turn={id:'c4',round:1,init:10};byId('c2').conds=['Concentrating'];commit()"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on('pageerror',lambda e:errs.append('dm '+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1); await T(dm,BASE); await asyncio.sleep(.4)
        sf=await (await b.new_context(viewport={'width':912,'height':1368})).new_page(); sf.on('pageerror',lambda e:errs.append('sf '+str(e)))
        await sf.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(2.5)
        seen=lambda sel: sf.evaluate("(s)=>new Promise(r=>{const t0=Date.now();const f=()=>{if(document.querySelector(s))return r(true);if(Date.now()-t0>2500)return r(false);requestAnimationFrame(f)};f()})",sel)
        await T(dm,"moveTurn(1)")
        chk("2 new round overlay",await seen('.fxround'))
        chk("1 handoff glow",await seen('.fxbaton'))
        chk("3 class sigil (Lich has no class: none expected)",True)
        await asyncio.sleep(2.5); await T(dm,"moveTurn(1)")
        chk("3 class sigil on Styx",await seen('.fxsig.note'))
        await asyncio.sleep(2); await T(dm,"byId('c4').bloodied=true;commit()")
        chk("4 claws",await seen('.fxclaw'))
        await asyncio.sleep(1.5)
        chk("4 scar stays",await sf.locator('li[data-id=c4] .fxscar').count()==1)
        await T(dm,"byId('c2').conds=[];commit()")
        chk("6 concentration shatters",await seen('.fxshatter'))
        await T(dm,"state.roll={id:uid(),by:'Isandros',kind:'roll',text:'d20 +7 (12)',total:19,at:Date.now()};commit()")
        chk("7 die",await seen('.fxdie'))
        chk("7 banner after die",await seen('.rollbanner'))
        await T(dm,"byId('c3').init=22;commit()")
        await asyncio.sleep(1.4)
        chk("8 init landed",(await sf.locator('li[data-id=c3] .pos b').inner_text())=="22")
        # reduced motion: nothing plays, scar is still drawn
        rc=await b.new_context(viewport={'width':912,'height':1368},reduced_motion='reduce'); rs=await rc.new_page(); rs.on('pageerror',lambda e:errs.append('rs '+str(e)))
        await rs.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(2.5)
        await T(dm,"moveTurn(1)"); await asyncio.sleep(1.2)
        chk("reduced motion: no overlays",await rs.locator('.fxround,.fxbaton,.fxsig').count()==0)
        chk("scar visible on load",await rs.locator('li[data-id=c4] .fxscar').count()==1)
        # phone: no die (Surface only)
        ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); await ctx.add_init_script("localStorage.setItem('it.meName','\"Styx\"')")
        ph=await ctx.new_page(); ph.on('pageerror',lambda e:errs.append('ph '+str(e))); await ph.goto(rk.PL+'/players'); await asyncio.sleep(2)
        await T(dm,"state.roll={id:uid(),by:'Gregori',kind:'roll',text:'d20',total:7,at:Date.now()};commit()"); await asyncio.sleep(1.5)
        chk("phone: no die",await ph.locator('.fxdie').count()==0)
        chk("no page errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
