import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json,urllib.request
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x if not c or x else "")
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
def post(body):
    rq=urllib.request.Request(rk.PL+'/player',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'},method='POST')
    try: return urllib.request.urlopen(rq,timeout=5).status
    except urllib.error.HTTPError as e: return e.code
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append("dm "+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(2)
        idx=(await dm.evaluate("fetch('/5et/index').then(r=>r.json())"))['list']
        mid=lambda n,s:next(e[0] for e in idx if e[1]==n and e[2]==s)
        for n,s in [('Lich','XMM'),('Young Red Dragon','XMM'),('Priest','XMM'),('Mage','MM')]:
            await T(dm,"sbSheet()"); await T(dm,f"fetPick({mid(n,s)})"); await asyncio.sleep(.7); await T(dm,"sbAdd()"); await asyncio.sleep(.3)
        await T(dm,"state.list.push(newCombatant({id:'m',name:'Mira',kind:'pc',cls:'wizard',init:12}),newCombatant({id:'b',name:'Bram',kind:'pc',cls:'paladin',init:10}));commit()"); await asyncio.sleep(.3)
        L=lambda n:f"state.list.find(c=>c.name.startsWith('{n}'))"
        # ---- 10: counters read right
        lr=await T(dm,f"JSON.stringify([{L('Lich')}.sb.lr,{L('Lich')}.sb.lrLair])"); chk("Lich: LR 4, 5 in lair",json.loads(lr)==[{'max':4,'used':0},5],lr)
        lid=await T(dm,f"{L('Lich')}.id")
        await T(dm,f"sbViewId='{lid}';selId='{lid}'"); await dm.evaluate(f"__t(\"document.querySelector('.row[data-id=\\\"{lid}\\\"]')\")")
        await T(dm,f"(()=>{{const c=byId('{lid}');const s2=c.sb;s2.inLair=!s2.inLair;if(s2.la&&s2.laLair){{s2.la.base=s2.la.max;s2.la.max=s2.laLair}}if(s2.lr&&s2.lrLair){{s2.lr.base=s2.lr.max;s2.lr.max=s2.lrLair}}commit()}})()")
        await dm.locator(f'.row[data-id="{lid}"] [data-act=sblair]').click(); await asyncio.sleep(.2)   # back out, then in by the button
        await dm.locator(f'.row[data-id="{lid}"] [data-act=sblair]').click(); await asyncio.sleep(.2)
        chk("In lair button: LR 5 and LA 4",await T(dm,f"byId('{lid}').sb.lr.max===5&&byId('{lid}').sb.la.max===4"),await T(dm,f"JSON.stringify(byId('{lid}').sb.lr)"))
        await dm.locator(f'.row[data-id="{lid}"] [data-act=sblair]').click(); await asyncio.sleep(.2)
        chk("out of the lair: back to 4",await T(dm,f"byId('{lid}').sb.lr.max===4&&byId('{lid}').sb.la.max===3"))
        pr=json.loads(await T(dm,f"JSON.stringify({L('Priest')}.sb.uses)"))
        chk("Priest: Divine Aid is one pool of 3",any(u['n']=='Divine Aid' and u['max']==3 and 'Bless' in u.get('sp',[]) for u in pr) and not any(u['n']=='Bless' for u in pr),pr)
        mg=json.loads(await T(dm,f"JSON.stringify({L('Mage')}.sb.uses)"))
        chk("Mage: slots know their spells",any(u['n']=='Level 3 slots' and 'Fireball' in u.get('sp',[]) for u in mg),mg)
        # ---- 9: rolling an action spends it, once per use
        did=await T(dm,f"{L('Young Red Dragon')}.id")
        await T(dm,f"sbViewId='{did}';renderSbDrawer&&renderSbDrawer()")
        await T(dm,"sbRoll({dataset:{k:'dmg',d:'16d6',t:'Fire',n:'Fire Breath'}})"); await asyncio.sleep(.2)
        chk("Fire Breath used by its damage roll",await T(dm,f"byId('{did}').sb.rech[0].ready===false"))
        await T(dm,"sbRoll({dataset:{k:'dmg',d:'16d6',t:'Fire',n:'Fire Breath'}})")
        t=await dm.locator('#toast').inner_text(); chk("a second roll of the same breath doesn't count again",'used' in t and "hasn't" not in t,t)
        await dm.evaluate("Math.__r=Math.random;Math.random=()=>0.99")
        await T(dm,f"state.turn={{round:1,id:'{did}',init:20}};turnStart(byId('{did}'))"); await asyncio.sleep(.2)
        chk("its turn: d6 6 recharges it",await T(dm,f"byId('{did}').sb.rech[0].ready===true"))
        # a spell cast as an effect spends its N/Day
        await T(dm,f"dEffSheet({{name:'Animate Dead',src:'XPHB',by:'{lid}',targets:new Set(['m'])}});dEffAdd()"); await asyncio.sleep(.2)
        u=json.loads(await T(dm,f"JSON.stringify(byId('{lid}').sb.uses.find(u=>u.n==='Animate Dead'))")); chk("Animate Dead 1 of 2 used",u['used']==1,u)
        t=await dm.locator('#toast').inner_text(); chk("toast says what's left",'Animate Dead 1/2 left' in t,t)
        mgid=await T(dm,f"{L('Mage')}.id")
        await T(dm,f"dEffSheet({{name:'Fly',src:'PHB',by:'{mgid}',targets:new Set(['m'])}});dEffAdd()"); await asyncio.sleep(.2)
        chk("Mage's Fly takes a level 3 slot",await T(dm,f"byId('{mgid}').sb.uses.find(u=>u.n==='Level 3 slots').used===1"))
        # ---- 1: Concentration for players
        async def phone(name,extra=""):
            ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            await ctx.add_init_script(f"localStorage.setItem('it.meName','\"{name}\"');{extra}")
            ph=await ctx.new_page(); ph.on('pageerror',lambda e:errs.append('ph '+str(e))); await ph.goto(rk.PL+'/players'); await asyncio.sleep(2.5); return ph
        await T(dm,"dEffSheet({name:'Bless',src:'XPHB',by:'m',targets:new Set(['m','b'])});dEffAdd()"); await asyncio.sleep(.3)
        await T(dm,"dEffSheet({name:'Shield of Faith',src:'XPHB',by:'b',targets:new Set(['b'])});dEffAdd()"); await asyncio.sleep(.3)
        chk("Mira and Bram concentrating",await T(dm,"['m','b'].every(id=>byId(id).conds.some(x=>(x.n||x)==='Concentrating'))"))
        ph=await phone('Mira')
        # the DM hits both with 24 (Hit several, players have no HP here)
        await T(dm,"mtStart&&mtStart()"); await T(dm,"mtToggle('m');mtToggle('b')"); await T(dm,"mt.n='24';mtTargets();mtApply()"); await asyncio.sleep(.4)
        ca=json.loads(await T(dm,"JSON.stringify(state.concAsk||[])")); chk("two asks, DC 12",len(ca)==2 and all(a['dc']==12 for a in ca),ca)
        chk("two DM cards (asked on the phone)",await dm.locator('#concAsk .cac.pc').count()==2)
        await asyncio.sleep(2.2)
        chk("Mira's phone opens the save",await ph.locator('.psheet h2:has-text("Concentration save")').count()>=1 and 'DC 12' in await ph.locator('.psheet').inner_text())
        await ph.evaluate("Math.random=()=>0.01")   # rolls a 1: lost
        await ph.locator('[data-act=pconroll]').first.click(); await asyncio.sleep(2.8)
        chk("DM: Mira lost it, Bless ends",await T(dm,"!byId('m').conds.some(x=>(x.n||x)==='Concentrating')&&!state.effects.some(e=>e.name==='Bless')"))
        chk("her ask is gone, Bram's still open",await T(dm,"(state.concAsk||[]).length===1&&state.concAsk[0].cid==='b'")and await dm.locator('#concAsk .cac.pc').count()==1)
        lg=await T(dm,"actLog.slice(0,4).map(e=>e.text).join(' | ')"); chk("log has the roll",'Mira loses Concentration' in lg and 'vs DC 12' in lg,lg)
        # Bram plays on paper: the DM answers Kept on the card
        await dm.locator('#concAsk .cac.pc [data-act=cakeep]').click(); await asyncio.sleep(.3)
        chk("Bram kept: Shield of Faith stays, no ask left",await T(dm,"byId('b').conds.some(x=>(x.n||x)==='Concentrating')&&state.effects.some(e=>e.name==='Shield of Faith')&&!(state.concAsk||[]).length"))
        # a stale answer is refused by the server
        chk("server refuses an answer to no ask",post({"id":"b","action":"concans","ask":"nope","ok":False})==404)
        # the row menu: ask by hand, with the damage
        await T(dm,"pcConcSheet('b')"); await dm.fill('#pcConcN','40'); await dm.click('[data-act=pcconcgo]'); await asyncio.sleep(.3)
        chk("asked by hand: DC 20",await T(dm,"(state.concAsk||[]).some(a=>a.cid==='b'&&a.dc===20)"))
        await dm.locator('#concAsk .cac.pc [data-act=calost]').click(); await asyncio.sleep(.3)
        chk("Lost on the card ends Shield of Faith",await T(dm,"!state.effects.some(e=>e.name==='Shield of Faith')"))
        # ---- 17: light screen on the phone only
        await ph.keyboard.press('Escape'); await T(ph,"pSheet='more';renderPSheet()"); await asyncio.sleep(.3)
        await ph.locator('[data-act=plight]').click(); await asyncio.sleep(.3)
        chk("phone light on",await ph.evaluate("document.documentElement.dataset.plight==='1'"))
        bg=await ph.evaluate("getComputedStyle(document.body).backgroundColor"); chk("light background",bg=='rgb(242, 238, 229)',bg)
        # ---- 19: classes make the trackers
        await T(ph,"pSheet='res';renderPSheet()"); await asyncio.sleep(.3)
        await ph.locator('[data-act=pcset]').click(); await asyncio.sleep(2)
        chk("guessed Wizard 2024 from the DM's class",await T(ph,"pcDraft.cls[0].n==='Wizard'&&pcDraft.cls[0].s==='XPHB'"))
        for i in range(4): await ph.locator('[data-act=pclvl][data-d="1"]').first.click()
        await asyncio.sleep(.2)
        tr=json.loads(await T(ph,"JSON.stringify(pcTrackers(pcDraft).map(x=>[x.name,x.max,x.reset]))"))
        chk("Wizard 5: slots 4/3/2, Arcane Recovery, 5 Hit Dice",['Spell slot 1',4,'long'] in tr and ['Spell slot 3',2,'long'] in tr and ['Arcane Recovery',1,'long'] in tr and ['Hit Dice',5,'long'] in tr and not any(x[0]=='Spell slot 4' for x in tr),tr)
        await ph.locator('[data-act=pcbuild]').click(); await asyncio.sleep(.3)
        res=json.loads(await T(ph,"JSON.stringify(resGet())")); chk("trackers made",any(r['name']=='Spell slot 1' and r['cur']==4 for r in res),res)
        await T(ph,"(()=>{const r=resGet();r.find(x=>x.name==='Spell slot 1').cur=2;resSet(r)})()")   # spends two
        await T(ph,"pSheet='pcset';renderPSheet()"); await asyncio.sleep(.3)
        await ph.locator('[data-act=pclvl][data-d="1"]').first.click(); await ph.locator('[data-act=pcbuild]').click(); await asyncio.sleep(.3)
        res=json.loads(await T(ph,"JSON.stringify(resGet())")); s1=next(r for r in res if r['name']=='Spell slot 1'); s4=next((r for r in res if r['name']=='Spell slot 4'),None)
        chk("level 6: spent slots stay spent",s1['cur']==2 and s1['max']==4,s1); chk("level 7 slot appears at 6? no: 4th at 7",s4 is None)
        chk("Resources shows the class line",'Wizard 6' in await ph.locator('.pcline').inner_text())
        # multiclass and other classes, straight on the draft
        async def tr_of(prof):
            return json.loads(await T(ph,f"(()=>{{pcDraft={json.dumps(prof)};return JSON.stringify(pcTrackers(pcDraft).map(x=>[x.name,x.max,x.reset,x.note||'']))}})()"))
        t2=await tr_of({"cls":[{"n":"Paladin","s":"XPHB","lvl":5},{"n":"Sorcerer","s":"XPHB","lvl":3}],"feats":[],"mods":{}})
        chk("Paladin 5 / Sorcerer 3: caster level 6 = 4/3/3",['Spell slot 1',4,'long',''] in t2 and ['Spell slot 3',3,'long',''] in t2,t2)
        chk("…Lay on Hands 25, Channel Divinity 2, Sorcery Points 3",['Lay on Hands',25,'long',''] in t2 and ['Channel Divinity',2,'shortOne',''] in t2 and ['Sorcery Points',3,'long',''] in t2,t2)
        chk("…Hit Dice by size",any(x[0]=='Hit Dice d10' and x[1]==5 for x in t2) and any(x[0]=='Hit Dice d6' and x[1]==3 for x in t2),t2)
        t3=await tr_of({"cls":[{"n":"Warlock","s":"XPHB","lvl":11}],"feats":[],"mods":{}})
        chk("Warlock 11: 3 pact slots of level 5, Mystic Arcanum 6",any(x[0]=='Pact slots' and x[1]==3 and x[2]=='short' and x[3]=='level 5' for x in t3) and any(x[0]=='Mystic Arcanum (level 6)' for x in t3),t3)
        t4=await tr_of({"cls":[{"n":"Barbarian","s":"PHB","lvl":3},{"n":"Monk","s":"XPHB","lvl":2}],"feats":[],"mods":{}})
        chk("Barbarian 3 (2014) / Monk 2: Rage 3 long, Focus 2 short",['Rage',3,'long',''] in t4 and ['Focus Points',2,'short',''] in t4,t4)
        t5=await tr_of({"cls":[{"n":"Bard","s":"XPHB","lvl":5}],"feats":[],"mods":{"cha":4}})
        chk("Bard 5, CHA +4: Bardic Inspiration 4 short",['Bardic Inspiration',4,'short',''] in t5,t5)
        t6=await tr_of({"cls":[{"n":"Fighter","s":"XPHB","lvl":7,"sub":{"n":"Eldritch Knight","s":"XPHB","sn":"Eldritch Knight"}}],"feats":[],"mods":{}})
        chk("Eldritch Knight 7: slots from the subclass, Second Wind, Action Surge",any(x[0]=='Spell slot 1' and x[1]==4 for x in t6) and any(x[0]=='Spell slot 2' and x[1]==2 for x in t6) and any(x[0]=='Second Wind' for x in t6) and any(x[0]=='Action Surge' for x in t6),t6)
        t7=await tr_of({"cls":[{"n":"Fighter","s":"PHB","lvl":7,"sub":{"n":"Battle Master","s":"PHB","sn":"Battle Master"}}],"feats":[],"mods":{}})
        chk("Battle Master 7 (2014): 5 Superiority Dice short, Second Wind 1",['Superiority Dice',5,'short',''] in t7 and ['Second Wind',1,'short',''] in t7,t7)
        # ---- 20: feats with uses
        await T(ph,"pcDraft=null;pSheet='pcset';renderPSheet()"); await asyncio.sleep(.3)
        await ph.fill('#pcFeatQ','lucky'); await ph.dispatch_event('#pcFeatQ','input'); await asyncio.sleep(.3)
        await ph.locator('#pcFeatList [data-act=pcfeatadd][data-s=XPHB]').first.click(); await asyncio.sleep(1)
        fu=json.loads(await T(ph,"JSON.stringify(pcDraft.feats[0])")); chk("Lucky (2024): Luck Points = PB per long rest",any(u['max']=='pb' and u['reset']=='long' and 'Luck Points' in u['name'] for u in fu['u']),fu)
        await ph.fill('#pcFeatQ','agonizing'); await ph.dispatch_event('#pcFeatQ','input'); await asyncio.sleep(.3)
        await ph.locator('#pcFeatList [data-act=pcfeatadd]').first.click(); await asyncio.sleep(1)
        fu=json.loads(await T(ph,"JSON.stringify(pcDraft.feats[1])")); chk("Agonizing Blast: nothing to count",fu['n']=='Agonizing Blast' and fu['u']==[],fu)
        await ph.locator('[data-act=pcfeatview][data-i="0"]').click(); await asyncio.sleep(.8)
        chk("feat card readable",'Luck Point' in await ph.locator('.psheet').inner_text())
        await ph.locator('[data-act=pcset]').click(); await asyncio.sleep(.3)
        await ph.locator('[data-act=pcbuild]').click(); await asyncio.sleep(.3)
        res=json.loads(await T(ph,"JSON.stringify(resGet())")); lk=next((r for r in res if 'Luck' in r['name']),None)
        chk("Luck Points tracker = 3 at level 6",lk and lk['max']==3,lk)
        u14=json.loads(await T(ph,"JSON.stringify(pcUses({name:'Lucky',entries:['You have 3 luck points. You regain your expended luck points when you finish a long rest.']}))"))
        chk("2014 Lucky: 3 luck points",u14 and u14[0]['max']==3,u14)
        # privacy: /pc and /pcref only for feats and options
        chk("phones can't read monsters through /pcref",urllib.request.urlopen(rk.PL+'/pcref?t=feat&n=Lucky&s=XPHB',timeout=5).status==200)
        try: code=urllib.request.urlopen(rk.PL+'/pcref?t=monster&n=Lich&s=XMM',timeout=5).status
        except urllib.error.HTTPError as e: code=e.code
        chk("…monster refused",code==404)
        try: code=urllib.request.urlopen(rk.PL+'/5et/ref?t=feat&n=Lucky',timeout=5).status
        except urllib.error.HTTPError as e: code=e.code
        chk("…the DM's /5et/ stays laptop-only",code in (403,404))
        # ---- 26: names in Ctrl+K
        await dm.evaluate("Math.random=Math.__r")
        gid=await T(dm,f"{L('Priest')}.id"); await T(dm,f"selId='{gid}'")
        await dm.keyboard.press('Control+k'); await asyncio.sleep(.8)
        await dm.click('[data-act=qkgrp][data-v=name]'); await dm.keyboard.type('dwarf'); await asyncio.sleep(1.2)
        await dm.keyboard.press('ArrowDown'); await dm.keyboard.press('ArrowUp'); await asyncio.sleep(1.2)
        n=await dm.locator("#qkCard .nmpick").count(); chk("Dwarf name tables with names",n>=12,(n,await dm.locator("#qkCard").inner_text(),await dm.locator("#qkList").inner_text()))
        nm=await dm.locator('#qkCard .nmpick').first.get_attribute('data-v'); await dm.locator('#qkCard .nmpick').first.click(); await asyncio.sleep(.3)
        chk("copied note",nm in await dm.locator('#qkCard .qkacts').inner_text())
        await dm.locator('[data-act=nmgive]').click(); await asyncio.sleep(.3)
        chk("Priest renamed",await T(dm,f"byId('{gid}').name")==nm)
        chk("no Show on the table for names",await dm.locator('#qkCard [data-act=qktable]').count()==0)
        chk("no page errors",not errs,errs)
        await b.close()
    print("t22: ",("fails=0" if ok else "fails=1"))
asyncio.run(main())
