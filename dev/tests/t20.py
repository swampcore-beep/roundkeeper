import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json,urllib.request
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x if not c or x else "")
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(2)
        idx=(await dm.evaluate("fetch('/5et/index').then(r=>r.json())"))['list']; lich=next(e[0] for e in idx if e[1]=='Lich' and e[2]=='XMM')
        await T(dm,"sbSheet()"); await T(dm,f"fetPick({lich})"); await asyncio.sleep(.8); await T(dm,"sbAdd()"); await asyncio.sleep(.4)
        await T(dm,"state.list.push(Object.assign(newCombatant({id:'g1',name:'Goblin A',kind:'enemy',init:15}),{hp:12,hpMax:12}),Object.assign(newCombatant({id:'g2',name:'Goblin B',kind:'enemy',init:14}),{hp:7,hpMax:7}),newCombatant({id:'m',name:'Mira',kind:'pc',cls:'wizard',init:12}),newCombatant({id:'b',name:'Bram',kind:'pc',cls:'paladin',init:10}));commit()"); await asyncio.sleep(.3)
        lid=await T(dm,"state.list.find(c=>c.name.startsWith('Lich')).id")
        chk("asks by default",await T(dm,"ls.get('concAuto',false)")==False)
        await T(dm,"ls.set('concAuto',true)")   # the automatic part first
        # the lich and goblin A concentrate on something
        await T(dm,f"dEffSheet({{by:'{lid}',targets:new Set(['b'])}});dEffPick('Hold Person','XPHB');dEffAdd()")
        await T(dm,"dEffSheet({by:'g1',targets:new Set(['m'])});dEffPick('Bane','XPHB');dEffAdd()"); await asyncio.sleep(.3)
        chk("both concentrating",await T(dm,f"['{lid}','g1'].every(id=>byId(id).conds.some(x=>(x.n||x)==='Concentrating'))"))
        # Mira's turn: 31 cold on the lich, the d20 rolls 20: keeps it
        await T(dm,"state.turn={round:1,id:'m',init:12};commit()")
        await dm.evaluate("Math.random=()=>0.999")
        await T(dm,f"hpPopOpen('{lid}')"); await asyncio.sleep(.2); await dm.keyboard.type('31'); await dm.keyboard.press('Enter'); await asyncio.sleep(.4)
        chk("lich keeps it on a 20",await T(dm,f"byId('{lid}').conds.some(x=>(x.n||x)==='Concentrating')&&state.effects.some(e=>e.name==='Hold Person')"))
        logt=await T(dm,"actLog[0].text"); chk("logged with the DC (15) and the Con bonus",'keeps Concentrating' in logt and 'DC 15' in logt and '+' in logt,logt)
        # Bram's turn: goblin A takes 4, rolls a 1, no statblock: loses Bane
        await T(dm,"state.turn={round:1,id:'b',init:10};commit()")
        await dm.evaluate("Math.random=()=>0")
        await T(dm,"hpPopOpen('g1')"); await asyncio.sleep(.2); await dm.keyboard.type('4'); await dm.keyboard.press('Enter'); await asyncio.sleep(.4)
        chk("goblin loses Concentration and Bane ends",await T(dm,"!byId('g1').conds.some(x=>(x.n||x)==='Concentrating')&&!state.effects.some(e=>e.name==='Bane')"))
        logt=await T(dm,"actLog[0].text"); chk("log: DC 10, no statblock, Bane ends",'DC 10' in logt and 'no statblock' in logt and 'Bane ends' in logt,logt)
        t=await dm.locator('#toast').inner_text(); chk("toast tells it",'loses Concentration' in t,t)
        # undo from Player activity brings both back
        eid=await T(dm,"actLog[0].id"); await T(dm,f"undoLog('{eid}')"); await asyncio.sleep(.3)
        chk("undo: Concentrating and Bane come back",await T(dm,"byId('g1').conds.some(x=>(x.n||x)==='Concentrating')&&state.effects.some(e=>e.name==='Bane'&&e.by==='g1')"))
        # damage to 0 HP: ends without a roll
        await T(dm,"hpPopOpen('g1')"); await asyncio.sleep(.2); await dm.keyboard.type('20'); await dm.keyboard.press('Enter'); await asyncio.sleep(.4)
        chk("0 HP ends it",await T(dm,"!byId('g1').conds.some(x=>(x.n||x)==='Concentrating')")and 'drops to 0 HP' in await T(dm,"actLog[0].text"))
        # a big hit: DC is half (60 → 30, capped)
        await dm.evaluate("Math.random=()=>0.999")
        await T(dm,"state.turn={round:2,id:'m',init:12};commit()")
        await T(dm,f"hpPopOpen('{lid}')"); await asyncio.sleep(.2); await dm.keyboard.type('70'); await dm.keyboard.press('Enter'); await asyncio.sleep(.4)
        chk("DC capped at 30",'DC 30' in await T(dm,"actLog[0].text"),await T(dm,"actLog[0].text"))
        # Bram kills goblin B in round 2 with Hit several
        await T(dm,"state.turn={round:2,id:'b',init:10};commit();mtStart('g2');mt.n='9';mt.type='radiant';mtApply()"); await asyncio.sleep(.4)
        txt=await T(dm,"recapText()"); print(txt)
        chk("recap: Mira's damage and biggest hit",'Mira: 101' in txt and 'biggest hit 70 on Lich' in txt and 'most damage' in txt)
        chk("recap: Bram's damage and defeats",'Bram: 19' in txt and '2 defeated' in txt,txt)
        # undoing a hit takes it out of the stats
        hid=await T(dm,f"byId('{lid}').hpLog[0].id"); await T(dm,f"hpUndo(byId('{lid}'),'{hid}');commit()")
        txt=await T(dm,"recapText()"); chk("undo takes it out, biggest hit falls back to 31",'Mira: 31 · biggest hit 31 on Lich' in txt,txt)
        pub=json.load(urllib.request.urlopen(rk.PL+"/state")); chk("players don't get the stats",'cstat' not in pub and 'clog' not in pub)
        # ---- asking: type a number, roll, or let it go
        await T(dm,"ls.set('concAuto',false)")
        await T(dm,"byId('g2').hp=7;byId('g1').hp=12;state.effects=[];commit()")
        await T(dm,"dEffSheet({by:'g1',targets:new Set(['m'])});dEffPick('Bane','XPHB');dEffAdd()")
        await T(dm,f"dEffSheet({{by:'{lid}',targets:new Set(['b'])}});dEffPick('Hold Person','XPHB');dEffAdd()"); await asyncio.sleep(.3)
        await T(dm,"hpPopOpen('g1')"); await asyncio.sleep(.2); await dm.keyboard.type('6'); await dm.keyboard.press('Enter'); await asyncio.sleep(.5)
        chk("a card asks instead of rolling",await dm.locator('#concAsk .cac').count()==1 and await T(dm,"byId('g1').conds.some(x=>(x.n||x)==='Concentrating')"))
        card=await dm.locator('#concAsk .cac').inner_text(); chk("card: who, damage, spell, DC",'Goblin A' in card and '6' in card and 'Bane' in card and 'DC 10' in card.replace('\n',' '),card)
        chk("its box has the focus",await dm.evaluate("document.activeElement.dataset.ca")is not None)
        await dm.keyboard.type('8'); await dm.keyboard.press('Enter'); await asyncio.sleep(.4)
        chk("typed 8 < 10: loses it, Bane ends",await T(dm,"!byId('g1').conds.some(x=>(x.n||x)==='Concentrating')&&!state.effects.some(e=>e.name==='Bane')") and await dm.locator('#concAsk').count()==0)
        await dm.screenshot(path=rk.OUT+"/t20_none.png")
        # two hits on the lich: two cards; roll one, let the other go
        await T(dm,f"const L=byId('{lid}');L.hp=200;hpDo(L,'dmg',20);hpDo(L,'dmg',40);commit()"); await asyncio.sleep(.4)
        chk("two hits, two cards",await dm.locator('#concAsk .cac').count()==2)
        txt=await dm.locator('#concAsk').inner_text(); chk("DCs 10 and 20, the lich's +10",'DC 10' in txt.replace('\n',' ') and 'DC 20' in txt.replace('\n',' ') and '+10' in txt,txt)
        await dm.screenshot(path=rk.OUT+"/t20_ask.png")
        await dm.evaluate("Math.random=()=>0.999")
        await dm.locator('#concAsk [data-act=caroll]').first.click(); await asyncio.sleep(.3)
        chk("Roll: 20+10 keeps it",await T(dm,f"byId('{lid}').conds.some(x=>(x.n||x)==='Concentrating')") and 'keeps' in await T(dm,"actLog[0].text"))
        await dm.locator('#concAsk [data-act=cadrop]').click(); await asyncio.sleep(.3)
        chk("× lets it go: still concentrating, no card",await T(dm,f"byId('{lid}').conds.some(x=>(x.n||x)==='Concentrating')") and await dm.locator('#concAsk').count()==0)
        # 0 HP still ends it without asking
        await T(dm,f"hpDo(byId('{lid}'),'dmg',999);commit()"); await asyncio.sleep(.3)
        chk("0 HP ends it, no card",await T(dm,f"!byId('{lid}').conds.some(x=>(x.n||x)==='Concentrating')") and await dm.locator('#concAsk .cac:not(.hd)').count()==0)
        print("errors:",errs[:5]); chk("no page errors",not errs)
        await b.close()
    print("ALL PASS" if ok else "SOME FAILED")
asyncio.run(main())
