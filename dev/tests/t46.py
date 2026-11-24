import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py:
"""t46 (1.7): the Spell effect window with a saving throw, from the built-in SRD.
- Fireball from a dragon's statblock: level 6 (the statblock's "level 6 version"), 11d6 fire, DEX, DC 20 from its statblock, half on a success;
  Roll saves hands over to Hit several with the targets ticked, the monsters' saves rolled and a roll call to the players; nothing stays.
- Hold Person from a player: the DC typed once is remembered; only those who fail keep it; a save at the end of a turn ends it; so does a phone's answer.
- Bless asks for no save and adds the effect as before; a spell whose range is the caster (Spirit Guardians) gets no save by itself.
- The DM page loads the spells even where the tablet page once ran in the same browser (it marked the browser as the tablet).
- A spell's card near the bottom of the window stays inside it, its Cast button included."""
import asyncio,json,urllib.request
from playwright.async_api import async_playwright
_sys.path.insert(0,_os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))),'media'))
from scene import setup
res=[]
def chk(n,c,x=""):
    res.append(bool(c)); print(("PASS " if c else "FAIL ")+n,("· "+str(x)) if x!="" else "")
op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def post(body):
    rq=urllib.request.Request(rk.PL+'/player',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'},method='POST')
    try: return op.open(rq,timeout=5).status
    except urllib.error.HTTPError as e: return e.code
async def T(pg,js): return await pg.evaluate("(s)=>__t(s)",js)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        ctx=await b.new_context(viewport={'width':1536,'height':864})
        await ctx.add_init_script("localStorage.setItem('it.meName','\"*\"')")   # the tablet page ran in this browser once
        dm=await ctx.new_page();dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto(rk.DM+'/');await asyncio.sleep(1.5)
        await T(dm,setup("tavern","avernus",False,"d")+";state.call=null;state.effects=[];state.ended=null;commit()");await asyncio.sleep(.8)
        chk("the DM loads the spells despite the tablet mark",await T(dm,"!!spRows&&spRows.length>300"),await T(dm,"spRows?spRows.length:0"))
        # ---- the card near the bottom
        await T(dm,"sbViewId='d';renderDM()");await asyncio.sleep(.8)
        await dm.evaluate("""()=>{const e=document.querySelector('#sbDrawer .ref[data-rn=Fireball]');let s=e.parentElement;while(s&&s.scrollHeight<=s.clientHeight+1)s=s.parentElement;
          const r=e.getBoundingClientRect();s.scrollTop+=r.top-innerHeight*.93}""");await asyncio.sleep(.3)
        await dm.click('#sbDrawer .ref[data-rn=Fireball]');await asyncio.sleep(1.2)
        r=await dm.evaluate("()=>{const c=[...document.querySelectorAll('.refcard')].pop(),b=c&&c.querySelector('[data-act=refcast]');return c&&[c.getBoundingClientRect().bottom,b?b.getBoundingClientRect().bottom:0,innerHeight]}")
        chk("a card near the bottom stays inside the window, with its Cast button",r and r[0]<=r[2] and 0<r[1]<=r[2],r)
        # ---- Fireball from the statblock
        await dm.click('.refcard [data-act=refcast]');await asyncio.sleep(1.5)
        D=json.loads(await T(dm,"JSON.stringify({by:dEff.by,lvl:dEff.lvl,lvl0:dEff.lvl0,inst:dEff.inst,sv:dEff.sv,dmg:dEff.dmg})"))
        chk("Fireball: recognised (not your own effect)",'your own effect' not in await dm.inner_text('#dEffForm'))
        chk("…cast by the dragon, at level 6 from its statblock",D['by']=='d' and D['lvl0']==3 and D['lvl']==6,D)
        chk("…11d6 fire",D['dmg']['d']=='11d6' and D['dmg']['t']=='fire',D['dmg'])
        chk("…Dexterity save, DC 20 from its statblock, half on a success",D['sv']['ab']=='Dex' and D['sv']['dc']=='20' and D['sv']['on']=='half',D['sv'])
        chk("…instant",D['inst'])
        chk("…Roll saves waits for a target",await dm.locator('#dEffForm [data-act=deffadd]').is_disabled() and 'Pick at least one target' in await dm.inner_text('#dEffSum'))
        for n in ['Isandros','Styx','Goblin A']: await dm.locator('#dEffForm [data-act=defftgt]',has_text=n).first.click();await asyncio.sleep(.1)
        chk("…the line above the button says what happens",'casts Fireball (level 6)' in await dm.inner_text('#dEffSum'))
        await dm.click('#dEffForm [data-act=defflv][data-v="7"]');await asyncio.sleep(.2)
        chk("…a level up adds a die",await T(dm,"dEff.dmg.d")=='12d6')
        await dm.click('#dEffForm [data-act=defflv][data-v="6"]');await asyncio.sleep(.2)
        await dm.click('#dEffForm [data-act=deffroll]');await asyncio.sleep(1)
        m=json.loads(await T(dm,"JSON.stringify({on:mtOn,sel:[...mtSel],n:Number(mt.n),type:mt.type,ab:mt.ab,dc:mt.dc,rolls:mt.rolls,call:state.call&&state.call.text,to:state.call&&state.call.to})"))
        chk("Roll saves: Hit several with the three ticked",m['on'] and sorted(m['sel'])==['g1','i','s'],m['sel'])
        chk("…11d6 rolled once",11<=m['n']<=66 and m['type']=='fire' and m['ab']=='Dex' and m['dc']=='20',m)
        chk("…the goblin's save rolled",'tot' in m['rolls'].get('g1',{}),m['rolls'])
        chk("…the players asked on their phones",m['call']=='Dex save DC 20 · Fireball' and sorted(m['to'])==['i','s'],m['call'])
        chk("…nothing stays on the targets",await T(dm,"!state.effects.some(e=>e.name==='Fireball')"))
        await T(dm,"mtStop();state.call=null;commit()");await asyncio.sleep(.3)
        # ---- Hold Person from a player
        await T(dm,"dEffSheet({name:'Hold Person',src:'SRD52'})");await asyncio.sleep(1.2)
        await dm.select_option('#dEffBy','gr');await asyncio.sleep(.6)
        chk("Hold Person: Wisdom save",await T(dm,"dEff.sv.ab")=='Wis' and not await T(dm,"dEff.inst"))
        chk("…a player has no DC yet",await T(dm,"dEff.sv.dc")=='' and await dm.locator('#dEffForm [data-act=deffadd]').count()==1)
        for n in ['Goblin A','Goblin B']: await dm.locator('#dEffForm [data-act=defftgt]',has_text=n).first.click()
        chk("…waits for the DC",await dm.locator('#dEffForm [data-act=deffadd]').is_disabled() and 'Type the DC' in await dm.inner_text('#dEffSum'))
        await dm.fill('#dEffDC','15');await asyncio.sleep(.2)
        chk("…the DC is remembered for Gregori",await T(dm,"ls.get('spellDC:Gregori','')")=='15')
        await dm.click('#dEffForm [data-act=deffadd]');await asyncio.sleep(.5)
        e=json.loads(await T(dm,"JSON.stringify(state.effects.find(e=>e.name==='Hold Person')||null)"))
        tl=await dm.evaluate("()=>[...document.querySelectorAll('.toast')].map(t=>t.innerText).join(' / ')")
        chk("…the goblins rolled: those who saved are off it",('Goblin A saved' in tl or (e and 'g1' in e['targets'])) and ('Goblin B saved' in tl or (e and 'g2' in e['targets'])),tl)
        chk("…the effect keeps its save, to repeat",e is None or (e['save']=={'ab':'Wis','dc':15,'again':True} and e['conc']),e)
        chk("…Gregori concentrates",await T(dm,"byId('gr').conds.some(x=>(x.n||x)==='Concentrating')"))
        # the end of a held goblin's turn: a success ends it on that one
        await T(dm,"state.effects=state.effects.filter(e=>e.name!=='Hold Person');state.effects.push({id:'hp1',name:'Hold Person',by:'gr',targets:['g1','g2'],conc:true,area:false,"
                   "save:{ab:'Wis',dc:1,again:true}});commit()");await asyncio.sleep(.2)
        msgs=json.loads(await T(dm,"(()=>{const m=[];effTurnEnd(byId('g1'),m);commit();return JSON.stringify(m)})()"))
        chk("…a monster's save at the end of its turn ends it on that one",await T(dm,"JSON.stringify(state.effects.find(e=>e.id==='hp1').targets)")=='["g2"]',msgs)
        await T(dm,"state.effects.find(e=>e.id==='hp1').save.dc=99;commit()")
        msgs=json.loads(await T(dm,"(()=>{const m=[];effTurnEnd(byId('g2'),m);commit();return JSON.stringify(m)})()"))
        chk("…a failed one keeps it",await T(dm,"JSON.stringify(state.effects.find(e=>e.id==='hp1').targets)")=='["g2"]' and 'still under Hold Person' in ' '.join(msgs),msgs)
        # a player's answer on the phone
        await T(dm,"state.effects.push({id:'hp2',name:'Hold Person',by:'g1',targets:['s'],conc:false,area:false,save:{ab:'Wis',dc:12,again:true}});"
                   "state.call={id:'c46',text:'Wisdom save DC 12 · Hold Person',dc:12,at:Date.now(),to:['s'],answers:{},eff:{id:'hp2'}};commit()");await asyncio.sleep(1.2)
        st=post({"id":"s","action":"answer","call":"c46","value":17});await asyncio.sleep(1.5)
        chk("…a player's save on the phone ends it on them",st in (200,204) and await T(dm,"!state.effects.some(e=>e.id==='hp2')"),st)
        # ---- Bless: no save, as before
        await T(dm,"dEffSheet({name:'Bless',src:'SRD52'})");await asyncio.sleep(1)
        await dm.select_option('#dEffBy','i');await asyncio.sleep(.4)
        await dm.click('#dEffForm [data-act=deffall][data-v=pc]');await asyncio.sleep(.2)
        chk("Bless: no save, the button adds the effect",await T(dm,"dEff.sv.ab")=='' and 'Add effect' in await dm.inner_text('#dEffForm .deact .primary'))
        await dm.click('#dEffForm [data-act=deffadd]');await asyncio.sleep(.4)
        e=json.loads(await T(dm,"JSON.stringify(state.effects.find(e=>e.name==='Bless')||null)"))
        chk("…on all four players, concentrating, no save",e and len(e['targets'])==4 and e['conc'] and 'save' not in e,e)
        # ---- Spirit Guardians: its range is the caster, no save by itself
        await T(dm,"dEffSheet({name:'Spirit Guardians',src:'SRD52',by:'a'})");await asyncio.sleep(1)
        chk("Spirit Guardians: no save picked by itself",await T(dm,"dEff.sv.ab")=='')
        await T(dm,"closeSheet()")
        chk("No page errors",not errs,errs[:4])
        await b.close()
    print(f"{sum(res)}/{len(res)} passed");_sys.exit(0 if all(res) else 1)
asyncio.run(main())
