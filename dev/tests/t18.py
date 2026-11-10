import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json,urllib.request
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x if not c or x else "")
S=rk.OUT+"/"
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(2)
        await T(dm,"state.list=[newCombatant({id:'b',name:'Bram',kind:'pc',cls:'paladin',init:15}),newCombatant({id:'m',name:'Mira',kind:'pc',cls:'wizard',init:12}),newCombatant({id:'g',name:'Goblin',kind:'enemy',init:10}),Object.assign(newCombatant({id:'h',name:'Cultist',kind:'enemy',init:8}),{hidden:true})];state.turn={round:1,id:'b',init:15};commit()"); await asyncio.sleep(.5)
        # from the + on Bram's row
        await T(dm,"condSheet('b')"); await asyncio.sleep(.2)
        await dm.locator('[data-act=deffon]').click(); await asyncio.sleep(.3)
        chk("target preselected",await T(dm,"[...dEff.targets].join()")=='b')
        await dm.fill('#dEffQ','bless'); await dm.dispatch_event('#dEffQ','input'); await asyncio.sleep(.2)
        await dm.locator('#dEffList .sprow:has-text("Bless")').first.click(); await asyncio.sleep(.2)
        chk("no caster: no concentration",await T(dm,"dEff.name==='Bless'&&!dEff.conc")and await dm.locator('#dEffConc').is_disabled())
        chk("Add disabled? no, has a target",not await dm.locator('[data-act=deffadd]').is_disabled())
        await dm.locator('.deffsheet [data-act=deffby][data-id=b]').click(); await asyncio.sleep(.2)
        chk("caster picks up concentration",await T(dm,"dEff.conc===true"))
        await dm.locator('.deffsheet [data-act=defftgt][data-id=m]').click(); await asyncio.sleep(.2)
        await dm.screenshot(path=S+"t18_sheet.png")
        await dm.locator('[data-act=deffadd]').click(); await asyncio.sleep(.4)
        e=json.loads(await T(dm,"JSON.stringify(state.effects)"))
        chk("Bless on Bram and Mira from Bram",len(e)==1 and e[0]['name']=='Bless' and e[0]['by']=='b' and sorted(e[0]['targets'])==['b','m'] and e[0]['conc'] and e[0]['r0']==1,e)
        chk("Bram concentrating",await T(dm,"byId('b').conds.some(x=>(x.n||x)==='Concentrating')"))
        chk("chips on the rows",await dm.locator('#roster .row[data-id=m] .cond.eff').count()==1)
        # a monster casts Hold Person on Mira
        await T(dm,"dEffSheet({by:'g',targets:new Set(['m'])})"); await asyncio.sleep(.2)
        await dm.fill('#dEffQ','hold person'); await dm.dispatch_event('#dEffQ','input'); await asyncio.sleep(.2)
        await dm.locator('#dEffList .sprow:has-text("Hold Person")').first.click(); await asyncio.sleep(.2)
        await dm.locator('[data-act=deffadd]').click(); await asyncio.sleep(.3)
        chk("goblin concentrating on Hold Person",await T(dm,"state.effects.some(e=>e.name==='Hold Person'&&e.by==='g'&&e.conc)&&byId('g').conds.some(x=>(x.n||x)==='Concentrating')"))
        # a new concentration spell ends the old one
        await T(dm,"dEffSheet({by:'b',targets:new Set(['m'])});dEffPick('Shield of Faith','XPHB')"); await asyncio.sleep(.2)
        await dm.locator('[data-act=deffadd]').click(); await asyncio.sleep(.3)
        chk("Bless ends when Bram concentrates on Shield of Faith",await T(dm,"!state.effects.some(e=>e.name==='Bless')&&state.effects.some(e=>e.name==='Shield of Faith')"))
        # losing concentration ends it
        await T(dm,"byId('g').conds=byId('g').conds.filter(x=>(x.n||x)!=='Concentrating');commit()"); await asyncio.sleep(.2)
        chk("goblin loses concentration: Hold Person ends",await T(dm,"!state.effects.some(e=>e.name==='Hold Person')"))
        # a hidden cultist's Bane and an effect on a hidden target
        await T(dm,"dEffSheet({by:'h',targets:new Set(['m','b'])});dEffPick('Bane','XPHB')"); await asyncio.sleep(.1); await dm.locator('[data-act=deffadd]').click(); await asyncio.sleep(.2)
        await T(dm,"dEffSheet({by:'m',targets:new Set(['h'])});dEffPick('Guiding Bolt','XPHB')"); await asyncio.sleep(.1); await dm.locator('[data-act=deffadd]').click(); await asyncio.sleep(.2)
        await T(dm,"dEffSheet({by:'m',targets:new Set(['h','g'])});dEffPick('Slow','XPHB')"); await asyncio.sleep(.1); await dm.locator('[data-act=deffadd]').click(); await asyncio.sleep(1)
        pub=json.load(urllib.request.urlopen(rk.PL+"/state"))
        names={e['name']:e for e in pub['effects']}
        chk("players don't see the hidden cultist's Bane",'Bane' not in names,list(names))
        chk("an effect only on a hidden creature isn't sent",'Guiding Bolt' not in names)
        chk("hidden targets are left out",'Slow' in names and names['Slow']['targets']==['g'],names.get('Slow'))
        chk("the DM still has all of them",await T(dm,"['Bane','Guiding Bolt','Slow'].every(n=>state.effects.some(e=>e.name===n))"))
        # a name of your own, and the battlefield
        await T(dm,"dEffSheet()"); await asyncio.sleep(.2)
        await dm.fill('#dEffQ','Haunted fog'); await dm.dispatch_event('#dEffQ','input'); await asyncio.sleep(.2)
        await dm.locator('[data-act=deffname]').click(); await asyncio.sleep(.2)
        await dm.locator('#dEffArea').check(); await asyncio.sleep(.2)
        await dm.locator('[data-act=deffadd]').click(); await asyncio.sleep(.3)
        chk("own battlefield effect",await T(dm,"state.effects.some(e=>e.name==='Haunted fog'&&e.area&&e.by==='dm')"))
        chk("battlefield strip has the button",await dm.locator('#fieldStrip [data-act=deffnew]').count()==1)
        # Ctrl+K: Cast as an effect
        await T(dm,"qkSheet()"); await asyncio.sleep(.6); await dm.fill('#qkQ','fireball'); await dm.dispatch_event('#qkQ','input'); await asyncio.sleep(.8)
        await dm.locator('#qkCard [data-act=refcast]').click(); await asyncio.sleep(.3)
        chk("Ctrl+K card casts",await T(dm,"!!dEff&&dEff.name==='Fireball'&&!!$('.deffsheet')"))
        await T(dm,"closeSheet()")
        # statblock: a lich's spell
        idx=(await dm.evaluate("fetch('/5et/index').then(r=>r.json())"))['list']; lich=next(e[0] for e in idx if e[1]=='Lich' and e[2]=='XMM')
        await T(dm,"sbSheet()"); await T(dm,f"fetPick({lich})"); await asyncio.sleep(.8); await T(dm,"sbAdd()"); await asyncio.sleep(.4)
        lid=await T(dm,"state.list.find(c=>c.name.startsWith('Lich')).id")
        await T(dm,f"sbViewId='{lid}';renderSbDrawer()"); await asyncio.sleep(.4)
        ref=dm.locator('#sbDrawer .ref[data-rt=spell]').first; nm=await ref.get_attribute('data-rn')
        await ref.click(); await asyncio.sleep(.8)
        btn=dm.locator('.refcard [data-act=refcast]'); chk("statblock spell card has Cast",await btn.count()==1)
        txt=await btn.inner_text(); chk("cast by the lich",'Lich' in txt,txt)
        await btn.click(); await asyncio.sleep(.3)
        chk("sheet with the lich as caster",await T(dm,f"dEff&&dEff.by==='{lid}'&&dEff.name.toLowerCase()==={json.dumps(nm.lower())}"),nm)
        print("errors:",errs[:5]); chk("no page errors",not errs)
        await b.close()
    print("ALL PASS" if ok else "SOME FAILED")
asyncio.run(main())
