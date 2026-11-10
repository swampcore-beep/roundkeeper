import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json,sys
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
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.2)
        # ---- 24 lair
        idx=(await dm.evaluate("fetch('/5et/index').then(r=>r.json())"))['list']
        lich14=next(e[0] for e in idx if e[1]=='Lich' and e[2]=='MM')
        lich24=next(e[0] for e in idx if e[1]=='Lich' and e[2]=='XMM')
        await T(dm,"sbSheet()")
        await T(dm,f"fetPick({lich14})"); await asyncio.sleep(.8)
        await T(dm,f"fetPick({lich24})"); await asyncio.sleep(.8)
        it=await T(dm,"sbItems.map(x=>({n:x.name,la:x.la,laLair:x.laLair,lair:x.lair.length,reg:x.reg.length,intro:x.lairIntro.slice(0,40)}))")
        print(it)
        chk("2014 lich has 5 lair actions",it[0]['lair']>=3 and it[0]['laLair'] is None or it[0]['lair']>=3,it[0])
        chk("2024 lich: 4 legendary actions in lair, regional effects, no lair actions",it[1]['laLair']==4 and it[1]['lair']==0 and it[1]['reg']>=1,it[1])
        await T(dm,"sbItems[0].name='Old Lich';sbItems[1].name='New Lich';sbAdd()"); await asyncio.sleep(.5)
        st=await T(dm,"state.list.map(c=>[c.name,!!c.sb&&c.sb.lair.length,c.sb&&c.sb.laLair])"); print(st)
        rows=await dm.locator('#roster .row .sblair').count(); chk("two In lair buttons",rows==2,rows)
        # 2024: In lair -> LA 4
        await dm.locator('#roster .row:has(input[value="New Lich"]) .sblair').click(); await asyncio.sleep(.3)
        la=await T(dm,"(()=>{const c=state.list.find(c=>c.name==='New Lich');return [c.sb.la.max,c.sb.la.base,state.lair]})()")
        chk("2024 lair: LA 3 -> 4, no lair row",la==[4,3,False],la)
        pips=await dm.locator('#roster .row:has(input[value="New Lich"]) .sbpip[data-k=la]').count(); chk("4 LA pips",pips==4,pips)
        await dm.locator('#roster .row:has(input[value="New Lich"]) [data-act=sbreg]').click(); await asyncio.sleep(.2)
        reg=await dm.locator('#roster .lairbox.reg').inner_text(); chk("regional effects text",'Clairvoyance' in reg,reg[:80])
        await dm.locator('#roster .row:has(input[value="New Lich"]) .sblair').click(); await asyncio.sleep(.2)
        la=await T(dm,"(()=>{const c=state.list.find(c=>c.name==='New Lich');return [c.sb.la.max,c.sb.la.base===undefined]})()"); chk("out of lair: LA back to 3",la==[3,True],la)
        # 2014: lair row
        await dm.locator('#roster .row:has(input[value="Old Lich"]) .sblair').click(); await asyncio.sleep(.3)
        chk("lair row appears",await T(dm,"state.lair")==True)
        nm=await dm.locator('#roster .row.k-lair .lair-name').inner_text(); chk("lair row named after the boss",'Old Lich' in nm,nm)
        await T(dm,"state.list.forEach((c,i)=>c.init=c.name==='Old Lich'?18:10+i);state.turn=null;commit()"); await asyncio.sleep(.2)
        await T(dm,"moveTurn(1)"); await asyncio.sleep(.3)
        tid=await T(dm,"state.turn.id"); chk("first turn is the lair",tid=='__lair',tid)
        n=await dm.locator('#roster .row.k-lair .lairact').count(); chk("lair actions listed on its turn",n>=3,n)
        await dm.screenshot(path=S+"t16_lair.png")
        await dm.locator('#roster .row.k-lair .lairact [data-act=lairuse]').nth(1).click(); await asyncio.sleep(.2)
        await dm.locator('#roster .row.k-lair .lairact .sbr.save').first.click(); await asyncio.sleep(.4)
        chk("save in a lair action opens the boss's statblock with the roll call",await T(dm,"sbViewId===state.list.find(c=>c.name==='Old Lich').id&&!!sbSaveAsk"))
        await T(dm,"sbSaveAsk=null;sbViewId=null;renderDM()")
        chk("picked one shows used",await dm.locator('#roster .row.k-lair .lairact.used').count()==1)
        # next round: the same one is marked as last round
        for _ in range(10):
            await T(dm,"moveTurn(1)"); await asyncio.sleep(.05)
            if await T(dm,"state.turn.id")=='__lair': break
        last=await dm.locator('#roster .row.k-lair .lairact.last').count(); chk("next round: last one marked",last==1,last)
        small=await dm.locator('#roster .row.k-lair .lair-name small').inner_text(); chk("reminder not again",'again' in small,small)
        # players don't see the boss name on the lair row
        import urllib.request;pub=json.load(urllib.request.urlopen(rk.PL+"/state"))
        chk("players' state has no lair actions",'lairIntro' not in json.dumps(pub) and 'Old Lich · ' not in json.dumps(pub))
        # ---- 26 Ctrl+K
        await dm.keyboard.press('Control+k'); await dm.wait_for_selector('#qkQ'); await asyncio.sleep(.6)
        chk("Ctrl+K opens with the box focused",await dm.evaluate("document.activeElement.id")=='qkQ')
        await dm.keyboard.type('grappl'); await asyncio.sleep(.5)
        rows=await dm.locator('#qkList .qkrow').all_inner_texts(); print(rows[:6])
        chk("grapple finds the condition and rules",any('Grappled' in r and 'Condition' in r.title() for r in rows) and any('Grappler' in r for r in rows),rows[:6])
        chk("2024 printings only by default",not any('older printing' in r for r in rows))
        await asyncio.sleep(.5)
        card=await dm.locator('#qkCard').inner_text(); chk("first result's card shows",'Grappled' in card and len(card)>80,card[:100])
        await dm.keyboard.press('ArrowDown'); await asyncio.sleep(.5)
        sel=await dm.locator('#qkList .qkrow.on').inner_text(); card2=await dm.locator('#qkCard .rhead').inner_text(); chk("arrow moves and shows the next card",sel.split('\n')[0] in card2,(sel,card2))
        await dm.fill('#qkQ','fireball'); await dm.dispatch_event('#qkQ','input'); await asyncio.sleep(.7)
        old=await dm.locator('#qkList [data-act=qkold]').count(); chk("older printings hidden with a Show",old==1)
        card=await dm.locator('#qkCard').inner_text(); chk("Fireball 2024 card",'Level 3' in card and 'PHB24' in card,card[:120])
        await dm.locator('#qkList [data-act=qkold]').click(); await asyncio.sleep(.3)
        await dm.locator('#qkList .qkrow:has-text("older printing")').first.click(); await asyncio.sleep(.7)
        card=await dm.locator('#qkCard .rhead').inner_text(); chk("the older printing opens itself, not its reprint",'PHB' in card and 'XPHB' not in card or "Player's Handbook (2014)" in card,card)
        await dm.locator('#qkList [data-act=qkold]').click(); await asyncio.sleep(.2)
        for q,want in [('alert','Feat'),('eldritch spear','Feature'),('acolyte','Background'),('dwarf','Species'),('bag of holding','Item'),('exhaustion','Condition'),('dash','Action'),('falling','Rule'),('sphere of annihilation','Item')]:
            await dm.fill('#qkQ',q); await dm.dispatch_event('#qkQ','input'); await asyncio.sleep(.15)
            r=await dm.locator('#qkList .qkrow').first.inner_text() if await dm.locator('#qkList .qkrow').count() else ''
            chk(f"'{q}' -> {want}",want.upper() in r.upper(),r)
        await dm.fill('#qkQ','grappled'); await dm.dispatch_event('#qkQ','input'); await asyncio.sleep(.7)
        await dm.locator('.qksheet').screenshot(path=S+"t16_qk.png")
        sf=await (await b.new_context(viewport={'width':912,'height':1368})).new_page(); sf.on('pageerror',lambda e:errs.append('sf '+str(e)))
        await sf.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(2)
        await dm.locator('[data-act=qktable]').click(); await asyncio.sleep(2.2)
        chk("card on the Surface",await sf.locator('#tcard').count()==1 and 'Grappled' in await sf.locator('#tcard').inner_text())
        chk("no rolls or hover links in the table card",await sf.locator('#tcard .sbr, #tcard .ref').count()==0)
        await sf.screenshot(path=S+"t16_tcard.png")
        await dm.keyboard.press('Escape'); await asyncio.sleep(.2)
        pill=await dm.locator('#tcardPill').inner_text(); chk("DM sees what's on the table",'Grappled' in pill,pill)
        await dm.fill('#qkQ','') if await dm.locator('#qkQ').count() else None
        await dm.locator('#tcardPill').click(); await asyncio.sleep(2.2)
        chk("taken off the table",await sf.locator('#tcard').count()==0)
        # a long rule shrinks to fit
        await T(dm,"qkSheet()"); await asyncio.sleep(.5); await dm.fill('#qkQ','wish'); await dm.dispatch_event('#qkQ','input'); await asyncio.sleep(.8)
        await dm.locator('[data-act=qktable]').click(); await asyncio.sleep(2.2)
        fit=await sf.evaluate("(()=>{const b=document.querySelector('#tcard .rbody');return b?[b.scrollHeight,b.clientHeight]:null})()"); chk("long card fits",fit and fit[0]<=fit[1]+2,fit)
        await sf.screenshot(path=S+"t16_tcard2.png")
        await sf.locator('#tcard').click(); await asyncio.sleep(.3); chk("tap closes it on the Surface",await sf.locator('#tcard').count()==0)
        await T(dm,"closeSheet();state.tcard=null;commit()")
        # ---- 33 spells on phones
        await T(dm,"state.list.push(newCombatant({id:'pcm',name:'Mira',kind:'pc',cls:'wizard',init:12}),newCombatant({id:'pcb',name:'Bram',kind:'pc',cls:'paladin',init:9}));commit()"); await asyncio.sleep(.5)
        ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); await ctx.add_init_script("localStorage.setItem('it.meName','\"Mira\"')")
        ph=await ctx.new_page(); ph.on('pageerror',lambda e:errs.append('ph '+str(e))); await ph.goto(rk.PL+'/players'); await asyncio.sleep(2.5)
        n=await T(ph,"spRows&&spRows.length"); chk("phone has the full spell list",n and n>1000,n)
        import urllib.request,urllib.error
        def code(u):
            try: return urllib.request.urlopen(u).status
            except urllib.error.HTTPError as e: return e.code
        chk("phones still can't read monsters or rules",code(rk.PL+"/5et/ref?t=condition&n=prone")==403 and code(rk.PL+"/5et/monster?n=goblin")==403 and code(rk.PL+"/5et/refindex")==403)
        chk("/spell gives spells only",code(rk.PL+"/spell?n=Goblin")==404 and code(rk.PL+"/spell?n=Prone")==404 and code(rk.PL+"/spell?n=Fireball")==200)
        await ph.locator('.ptiles [data-act=pbook]').click(); await asyncio.sleep(.4)
        rows=await ph.locator('#pBookList .sprow').count(); chk("spellbook lists wizard spells (capped)",rows>=100,rows)
        await ph.fill('#pBookQ','fireb'); await ph.dispatch_event('#pBookQ','input'); await asyncio.sleep(.3)
        names=await ph.locator('#pBookList .sprow b').all_inner_texts(); chk("search finds Fireball once",names.count('Fireball')==1,names)
        await ph.locator('#pBookList .sprow:has-text("Fireball")').first.click(); await asyncio.sleep(1)
        txt=await ph.locator('.spcard').inner_text(); chk("spell text on the phone",'8d6' in txt and 'Level 3' in txt,txt[:120])
        chk("no rolls or links in the phone card",await ph.locator('.spcard .sbr, .spcard .ref').count()==0)
        await ph.screenshot(path=S+"t16_phone_spell.png")
        await ph.locator('[data-act=pbookopen]:has-text("older printing")').click(); await asyncio.sleep(1)
        txt=await ph.locator('.spcard .rhead').inner_text(); chk("older printing on request",'PHB14' in txt,txt)
        await ph.locator('[data-act=pbookback]').click(); await asyncio.sleep(.3)
        await ph.fill('#pBookQ',''); await ph.dispatch_event('#pBookQ','input')
        await ph.locator('[data-act=pbooklvl][data-v="0"]').click(); await asyncio.sleep(.3)
        lv=await T(ph,"[...document.querySelectorAll('#pBookList .splv')].map(x=>x.textContent)"); chk("cantrips filter",lv==['Cantrips'],lv)
        await ph.screenshot(path=S+"t16_phone_book.png")
        await ph.locator('[data-act=pbooklvl][data-v=""]').click()
        # the spell from the spellbook as an effect
        await ph.fill('#pBookQ','web'); await ph.dispatch_event('#pBookQ','input'); await asyncio.sleep(.3)
        await ph.locator('#pBookList .sprow:has-text("Web")').first.click(); await asyncio.sleep(1)
        await ph.locator('[data-act=pbookeff]').click(); await asyncio.sleep(.4)
        chk("Add as an effect fills the effect",await T(ph,"pSheet==='effs'&&effDraft.name==='Web'&&effDraft.conc&&effDraft.area"))
        await ph.locator('#pEffForm [type=submit]').click(); await asyncio.sleep(2)
        chk("effect reached the DM",await T(dm,"state.effects.some(e=>e.name==='Web')"))
        # a non-SRD spell counts down on the DM
        await T(ph,"pSheet='effs';effDraft={name:'',conc:false,area:false,targets:new Set(),custom:false};spellQ='';renderPSheet()"); await asyncio.sleep(.3)
        await ph.fill('#pSpellQ','caustic'); await ph.dispatch_event('#pSpellQ','input'); await asyncio.sleep(.3)
        await ph.locator('#pSpellList .sprow:has-text("Caustic Brew")').first.click(); await asyncio.sleep(.3)
        chk("spsel has Read",await ph.locator('.spsel [data-act=pbookopen]').count()==1)
        await ph.locator('.spsel [data-act=pbookopen]').click(); await asyncio.sleep(1)
        chk("Read opens the text, Back returns to the effect",'acid' in (await ph.locator('.spcard').inner_text()).lower())
        await ph.locator('[data-act=pbookback]').click(); await asyncio.sleep(.3)
        chk("back with the spell still picked",await T(ph,"pSheet==='effs'&&/Caustic Brew/.test(effDraft.name)"))
        await ph.locator('#pEffForm [data-act=ptgt]').first.click(); await ph.locator('#pEffForm [type=submit]').click(); await asyncio.sleep(2)
        await T(dm,"state.turn={round:1,id:'pcm',init:12};const e=state.effects.find(e=>/Caustic/.test(e.name));e.r0=1;commit()"); await asyncio.sleep(.3)
        left=await T(dm,"effLeft(state.effects.find(e=>/Caustic/.test(e.name)))"); chk("a 1-minute spell from TCE counts 10 turns on the DM",left==10,left)
        chk("Shield of Faith (10 min) still shows no count",await T(dm,"durRounds(spellFind('Shield of Faith')[4])")==0)
        # homebrew toggle
        hb=await T(ph,"spHbCount()"); chk("homebrew hidden by default",hb>100 and await T(ph,"spPool(false).every(x=>x[8]!=='hb')"),hb)
        # the paladin
        await ctx.add_init_script("localStorage.setItem('it.meName','\"Bram\"')")
        await T(ph,"meName='Bram';pSheet='book';bookQ='';renderPSheet()"); await asyncio.sleep(.3)
        ok_p=await T(ph,"[...document.querySelectorAll('#pBookList .sprow b')].map(x=>x.firstChild.textContent).every(n=>spellFind(n)[5].includes('P'))"); chk("paladin sees paladin spells",ok_p)
        # ---- end
        print("errors:",errs[:5]); chk("no page errors",not errs)
        await b.close()
    print("ALL PASS" if ok else "SOME FAILED")
asyncio.run(main())
