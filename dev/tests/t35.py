import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py:
# DM screen v1.1: grouped header (stop under ⋯, Devices without the TV dot, settings button), one End/New combat button,
# New combat and Clear all under ⋯, "Players can edit", HP placeholders, and the statblock that follows the turn.
import asyncio
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.5)
        # ---- header
        pill=await dm.inner_text('#joinPill'); chk("Devices pill has no TV dot",'Tablet' in pill and 'TV' not in pill,pill)
        chk("one Table group: devices, TV, atmosphere",await T(dm,"(()=>{const g=document.getElementById('tableLbl').parentElement;"
            "return g.textContent.trim().startsWith('Table')&&!!g.querySelector('#joinPill')&&!!g.querySelector('#tvBtn')&&!!g.querySelector('#atmoBtn')})()"))
        chk("Rules without the shortcut label",await dm.locator('.qkbtn kbd').count()==0)
        at=await dm.locator('#atmoBtn').inner_text(); tt=await dm.get_attribute('#atmoBtn','title')
        chk("Atmosphere says what it is",at.strip()=='Atmosphere',at); chk("…the theme in its title",'Candlelit tavern' in tt,tt)
        chk("…and as three colour dots",await dm.locator('#atmoBtn .atsw b').count()==3)
        await dm.click('#setBtn'); await asyncio.sleep(.5)
        chk("settings button opens Settings and files",await dm.locator('#setSheet').is_visible())   # 1.7: a window
        chk("light screen switch lives in the header",await dm.locator('#dm>.bar .themetog [data-act=dmtheme]').count()==2)
        await T(dm,"closeSheet()"); await asyncio.sleep(.2)
        # ---- rows: players without HP on the phone get a placeholder in the HP column
        await T(dm,"state.list=EXAMPLE();commit()"); await asyncio.sleep(.5)
        pcs=await T(dm,"state.list.filter(c=>c.kind==='pc'&&!c.php).length")
        chk("HP placeholder for each player",await dm.locator('#roster .hpw.hpnone').count()==pcs,pcs)
        w=await dm.evaluate("()=>[...document.querySelectorAll('#roster .tools>.hpw')].map(e=>Math.round(e.getBoundingClientRect().width))")
        chk("HP column has one width",len(set(w))==1,w)
        x=await dm.evaluate("()=>[...document.querySelectorAll('#roster .tools .ac-wrap')].map(e=>Math.round(e.getBoundingClientRect().left))")
        chk("AC lines up from row to row",len(set(x))==1,x)
        # ---- turns: stop is in the ⋯ menu by Next turn
        await dm.click('[data-act=tnext]'); await asyncio.sleep(.3)
        chk("no stop link in the bar",await dm.locator('#turnBox .linkbtn').count()==0)
        # ---- the look: hex initiative, sigils, now/next, the turn's corners
        n=await T(dm,"state.list.length")
        chk("a hexagon on every row",await dm.locator('#roster .row .hexw').count()==n)
        chk("the fighter's sigil",await dm.locator('#roster .dmsig.fr-fighter').count()>=1)
        chk("now on the row on its turn",await dm.locator('#roster .row.turn .nowtag').count()==1)
        chk("next on one other row",await dm.locator('#roster .row:not(.turn) .nexttag').count()==1)
        chk("one row on its turn, without the 1.1 corners",await dm.locator('#roster .row.turn').count()==1 and await dm.locator('#roster .tframe').count()==0)
        await dm.click('[data-act=turnmenu]'); await asyncio.sleep(.2)
        chk("turn menu opens",await dm.locator('.turnmenu').count()==1)
        await dm.mouse.click(700,820); await asyncio.sleep(.3)
        chk("turn menu closes on a click elsewhere",await dm.locator('.turnmenu').count()==0)
        await dm.click('[data-act=turnmenu]'); await asyncio.sleep(.2); await dm.click('.turnmenu [data-act=tend]'); await asyncio.sleep(.3)
        chk("Stop tracking turns",await T(dm,"state.turn")==None)
        # ---- Players can edit
        chk("Players can edit label",(await dm.inner_text('#peBtn')).strip()=='Players can edit')
        await dm.click('#peBtn'); await asyncio.sleep(.3); chk("unticked",await dm.get_attribute('#peBtn','aria-pressed')=='false')
        await dm.click('#peBtn'); await asyncio.sleep(.3); chk("ticked again",await dm.get_attribute('#peBtn','aria-pressed')=='true')
        # ---- one button: End combat, then New combat
        await dm.click('#endBtn'); await asyncio.sleep(.4)
        chk("ended",await T(dm,"!!state.ended")); chk("button now says New combat",(await dm.inner_text('#endBtn')).strip()=='New combat')
        await dm.click('#endBtn'); await asyncio.sleep(.4)
        chk("New combat from the same button",await T(dm,"!state.ended&&!!state.fightAt"))
        chk("back to End combat",(await dm.inner_text('#endBtn')).strip()=='End combat')
        # ---- ⋯ at the end of the bar: New combat and Clear all
        chk("menu hidden at first",await dm.locator('#footMenu').is_hidden())
        await dm.click('#footMore'); await asyncio.sleep(.2); chk("menu opens",await dm.locator('#footMenu').is_visible())
        await dm.mouse.click(700,500); await asyncio.sleep(.2); chk("menu closes on a click elsewhere",await dm.locator('#footMenu').is_hidden())
        await T(dm,"state.list=EXAMPLE();commit()"); await asyncio.sleep(.4)
        await dm.click('#footMore'); await dm.click('#wipe'); await asyncio.sleep(.2)
        chk("Clear all asks first",(await dm.inner_text('#wipe')).startswith('Sure') and await T(dm,"state.list.length")>0)
        await dm.click('#wipe'); await asyncio.sleep(.3)
        chk("Clear all clears",await T(dm,"state.list.length")==0); chk("…and the menu closes",await dm.locator('#footMenu').is_hidden())
        # ---- the statblock follows the turn while it is open
        await dm.click('[data-act=sbopen]'); await asyncio.sleep(1.5)
        for q in ['goblin','wolf']:
            await dm.fill('#fetQ',q); await asyncio.sleep(.8); await dm.locator('.fetrow').first.click(); await asyncio.sleep(.8)
        await dm.click('[data-act=sbadd]'); await asyncio.sleep(.6)
        await T(dm,"state.list.push(newCombatant({name:'Mira',kind:'pc',init:5}));state.list.forEach((c,i)=>{if(c.kind!=='pc')c.init=20-i});commit()")
        await asyncio.sleep(.4)
        ids=await T(dm,"sorted().map(c=>c.id)"); mons=await T(dm,"sorted().filter(c=>c.kind!=='pc').map(c=>c.id)")
        chk("two monsters with statblocks",len(mons)==2 and await T(dm,"sorted().filter(c=>c.sb&&c.sb.raw).length")==2,mons)
        await dm.click(f'#roster .row[data-id="{mons[0]}"] [data-act=sbview]'); await asyncio.sleep(.5)
        chk("drawer shows the first",await T(dm,"sbViewId")==mons[0])
        chk("Follow the turn on by default",await dm.locator('#sbDrawer [data-act=sbfollow]').is_checked())
        await dm.click('[data-act=tnext]'); await asyncio.sleep(.3)   # first monster
        await dm.click('[data-act=tnext]'); await asyncio.sleep(.4)   # second monster
        chk("drawer followed to the second",await T(dm,"sbViewId")==mons[1],await T(dm,"sbViewId"))
        await dm.click('[data-act=tnext]'); await asyncio.sleep(.4)   # Mira
        chk("a player's turn leaves the drawer alone",await T(dm,"sbViewId")==mons[1])
        await dm.click('#sbDrawer [data-act=sbfollow]'); await asyncio.sleep(.3)
        chk("unticked and remembered",await T(dm,"ls.get('sbFollow',true)")==False)
        await dm.click('[data-act=tnext]'); await asyncio.sleep(.4)   # first monster again, round 2
        chk("pinned: the drawer stays",await T(dm,"sbViewId")==mons[1])
        await dm.click('#sbDrawer [data-act=sbfollow]'); await asyncio.sleep(.2)
        # ---- what waits under the drawer
        pid=await T(dm,"state.list.find(c=>c.kind==='pc').id")
        await T(dm,f"state.call={{text:'Dexterity save DC 15',dc:15,to:['{pid}'],answers:{{}}}};commit()"); await asyncio.sleep(.4)
        u=await dm.locator('#sbDrawer .sbunder').inner_text(); chk("drawer says a roll call waits",'Roll call 0 of 1 in' in u,u)
        await dm.click('#sbDrawer .sbunder'); await asyncio.sleep(.3)
        chk("clicking it closes the drawer",await T(dm,"sbViewId")==None)
        chk("the roll call shows its progress",'0 of 1 in' in await dm.inner_text('#side .panel[data-k=call]'))   # 1.7: in the section's title
        # ---- 1.1.2: fitting a laptop
        await T(dm,f"state.effects=[{{id:'e1',name:'Bless',by:'{pid}',targets:['{pid}']}}];commit()"); await asyncio.sleep(.3)
        await dm.click(f'#roster .row[data-id="{mons[0]}"] [data-act=sbview]'); await asyncio.sleep(.4)
        chk("statblock open: the caster's name is hidden",not await dm.locator(f'#roster .row[data-id="{pid}"] .effby').is_visible())
        t=await dm.get_attribute(f'#roster .row[data-id="{pid}"] .cond.eff','title'); chk("…but kept in the title",' from ' in (t or ''),t)
        await T(dm,"sbViewId=null;renderDM()"); await asyncio.sleep(.3)
        chk("closed: the caster's name is back",await dm.locator(f'#roster .row[data-id="{pid}"] .effby').is_visible())
        sl=await dm.locator('#roster .sblink').first.inner_text(); chk("1.4: the statblock link is a button that says so",sl.strip() in ('Statblock','Sheet'),sl)
        sz=await dm.evaluate("()=>{const r=document.querySelector('#roster .sblink').getBoundingClientRect();return [r.width,r.height]}")
        chk("…at least 24 px high",sz[1]>=24,sz)
        bg=await dm.evaluate("()=>getComputedStyle(document.querySelector('.dmmain>.foot')).backgroundColor")
        chk("bottom bar is opaque",'rgba' not in bg or bg.endswith(', 1)'),bg)
        await dm.set_viewport_size({'width':1100,'height':760}); await asyncio.sleep(.4)
        tops=await dm.evaluate("()=>[...document.querySelectorAll('.bar-row>.brand,.bar-row>.barright')].map(e=>Math.round(e.getBoundingClientRect().top))")
        chk("1100 px: the header stays one line",len(tops)==2 and abs(tops[0]-tops[1])<20,tops)
        await dm.set_viewport_size({'width':900,'height':760}); await asyncio.sleep(.4)
        n=await dm.evaluate("()=>[...document.querySelectorAll('.barright>*:not([hidden])')].map(e=>{const r=e.getBoundingClientRect();return Math.round(r.top+r.height/2)})")
        chk("narrower: the right side wraps as one block",max(n)-min(n)<6,n)
        await dm.set_viewport_size({'width':1440,'height':900}); await asyncio.sleep(.3)
        await dm.click('#setBtn'); await asyncio.sleep(.3)   # 1.7: Settings and files is a window
        heads=await dm.locator('#setSheet .sethead').all_inner_texts(); chk("Settings in four groups (1.6: Dice on the screens)",len(heads)==4,heads)
        await T(dm,"closeSheet()"); await asyncio.sleep(.2)
        chk("no errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
