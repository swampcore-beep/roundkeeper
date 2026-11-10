import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,sys
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("()=>__t(`"+js+"`)")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on('pageerror',lambda e:errs.append('dm '+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1)
        await T(dm,"state.list=[['Styx','pc','bard',20],['Gregori','pc','cleric',18],['Lich','enemy','',21]].map(([n,k,c,i],j)=>({...newCombatant({kind:k}),id:'c'+j,name:n,cls:c,init:i}));state.turn=null;state.effects=[];commit()")
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
        await ctx.add_init_script("localStorage.setItem('it.meName','\"Styx\"')")
        ph=await ctx.new_page(); ph.on('pageerror',lambda e:errs.append('ph '+str(e))); await ph.goto(rk.PL+'/players'); await asyncio.sleep(2)
        # 7a initiative on the pad, with a minus
        await T(ph,"pSheet='init';renderPSheet()"); await asyncio.sleep(.3)
        chk("7 init sheet has pad and no text field",await ph.locator('.psheet .numpad').count()==1 and await ph.locator('.psheet input[type=number]').count()==0)
        for k in ['neg','2']: await ph.click(f'.numpad [data-k="{k}"]')
        chk("7 minus key",await ph.locator('#padShow').inner_text()=="-2")
        await ph.click('.numpad [data-k="back"]'); await ph.click('.numpad [data-k="neg"]'); await ph.click('.numpad [data-k="1"]'); await ph.click('.numpad [data-k="7"]')
        chk("7 pad shows 17",await ph.locator('#padShow').inner_text()=="17")
        await ph.click('[data-act=pinitsend]'); await asyncio.sleep(2.2)
        chk("7 init arrived",await T(dm,"byId('c0').init")==17)
        # 7b roll call on the pad
        await T(dm,"state.call={id:uid(),text:'Wisdom save DC 13',dc:13,to:[],answers:{},at:Date.now()};commit()"); await asyncio.sleep(2.2)
        chk("7 roll call sheet opens",await T(ph,"pSheet")=="call")
        await ph.screenshot(path='t9_call.png')
        await ph.click('[data-act=pcallsend]'); await asyncio.sleep(.3)
        chk("7 empty total is refused",(await ph.locator('#pCallStatus').inner_text()).startswith("Enter"))
        await ph.click('.numpad [data-k="1"]'); await ph.click('.numpad [data-k="4"]'); await ph.click('[data-act=pcallsend]'); await asyncio.sleep(2.2)
        chk("7 roll call answer arrived",await T(dm,"JSON.stringify(state.call.answers)")=='{"c0":14}')
        # 2 rounds left
        await T(dm,"state.call=null;byId('c0').conds=['Concentrating'];byId('c1').conds=['Concentrating'];state.turn={id:'c0',round:3,init:20};state.effects=[{id:'e1',name:'Bless',by:'c0',targets:['c0','c1'],conc:true,r0:3},{id:'e2',name:'Bane',by:'c1',targets:['c2'],conc:true,r0:1},{id:'e3',name:'Dodge',by:'c2',targets:['c2'],r0:null}];commit()")
        await asyncio.sleep(.5)
        L=await T(dm,"JSON.stringify(state.effects.map(e=>effLeft(e)))")
        chk("2 left: Bless cast now 10, Bane from round 1, caster already acted 8, no turns null",L=='[10,8,null]',L)
        await T(dm,"state.turn={id:'c2',round:12,init:21};commit()")
        chk("2 Bless before caster's turn in round 12 -> 2",await T(dm,"effLeft(state.effects[0])")==2)
        await T(dm,"state.turn={id:'c0',round:3,init:20};commit()"); await asyncio.sleep(.5)
        sf=await (await b.new_context(viewport={'width':912,'height':1368})).new_page(); sf.on('pageerror',lambda e:errs.append('sf '+str(e)))
        await sf.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(2.5)
        chk("2 Surface chip shows number",'10' in await sf.locator('li[data-id=c0] .cond.eff .effn').first.inner_text())
        await sf.screenshot(path='t9_sf.png')
        await asyncio.sleep(1.5); await ph.screenshot(path='t9_phone.png')
        chk("2 phone bar shows number",await ph.locator('.mychip .effn').count()>=1)
        await dm.screenshot(path='t9_dm.png')
        chk("2 DM chip shows number",await dm.locator('#roster .cond.eff .effn').count()>=2)
        chk("no page errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
