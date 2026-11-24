import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py:
"""t44 (1.7): the DM's side panel. Two tabs, Fight and Prep, picked by the phase (an open roll call counts as the fight) and by hand
until the phase changes; quick add moves to the foot of Fight; every section title says what is in it; a fight fits a 1536x864
laptop without scrolling; Settings and files open in a window from the gear and close from it again; the sun and the moon switch the
screen in one click and it is remembered; buttons in the panel have an edge of 3:1 against it in both themes."""
import asyncio
from playwright.async_api import async_playwright
res=[]
def chk(n,c,x=""):
    res.append(bool(c)); print(("PASS " if c else "FAIL ")+n,("· "+str(x)) if x!="" else "")
async def T(pg,js): return await pg.evaluate("(s)=>__t(s)",js)
SETUP=("state.list=[{...newCombatant({kind:'pc'}),id:'i',name:'Isandros',cls:'paladin',init:15},{...newCombatant({kind:'pc'}),id:'g',name:'Gregori',"
       "cls:'wizard',init:9},{...newCombatant({kind:'monster'}),id:'o',name:'Orc',init:12,hp:15,hpMax:15}];state.turn=null;state.call=null;"
       "state.effects=[];state.clocks=[];state.party=[];state.encounters=[];state.handouts=[];state.handout=null;commit();'ok'")
def lum(rgb):
    c=[x/255 for x in rgb];c=[x/12.92 if x<=.03928 else ((x+.055)/1.055)**2.4 for x in c];return .2126*c[0]+.7152*c[1]+.0722*c[2]
def ratio(a,b):
    a,b=lum(a),lum(b);return (max(a,b)+.05)/(min(a,b)+.05)
def rgb(s): return [int(float(x)) for x in s[s.index('(')+1:s.index(')')].split(',')[:3]]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        dm=await (await b.new_context(viewport={'width':1536,'height':864})).new_page();dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto(rk.DM+'/');await asyncio.sleep(1.2);await T(dm,SETUP);await asyncio.sleep(.5)
        tab=lambda:dm.evaluate("()=>document.getElementById('dm').dataset.tab")
        vis=lambda k:dm.locator(f'#side .panel[data-k={k}]').is_visible()
        # ---- tabs follow the phase
        chk("before turns: Prep",await tab()=='prep')
        chk("…with Add to combat, Players and Encounters",await vis('add') and await vis('party') and await vis('enc'))
        chk("…and not the fight's sections",not await vis('call') and not await vis('field') and not await vis('log') and not await vis('hand'))
        chk("…quick add sits in Add to combat",await dm.evaluate("()=>!!document.querySelector('#addForm .quick')"))
        chk("Party is called Players in the panel",(await dm.locator('#side .panel[data-k=party]>summary').inner_text()).startswith('Players'))
        await dm.click('#tabFight');await asyncio.sleep(.2)
        chk("a click picks Fight before turns",await tab()=='fight' and await vis('call'))
        chk("…and quick add moves to its foot",await dm.evaluate("()=>!!document.querySelector('#sideFoot .quick')"))
        await T(dm,"commit()");await asyncio.sleep(.3)
        chk("…the pick stays while the phase doesn't change",await tab()=='fight')
        await T(dm,"state.turn={id:'i',round:1};commit()");await asyncio.sleep(.3)
        chk("turns start: Fight",await tab()=='fight')
        await dm.click('#tabPrep');await asyncio.sleep(.2);chk("Prep by hand in a fight",await tab()=='prep')
        await T(dm,"state.turn=null;commit()");await asyncio.sleep(.3)
        await T(dm,"state.turn={id:'i',round:1};commit()");await asyncio.sleep(.3)
        chk("a new phase picks again",await tab()=='fight')
        await T(dm,"state.turn=null;state.call={id:'c1',text:'Perception check',at:Date.now(),to:['i','g'],answers:{i:14}};commit()");await asyncio.sleep(.4)
        chk("a roll call before turns leaves Prep",await tab()=='prep')
        chk("…with a dot on Fight while it waits",await dm.evaluate("()=>document.getElementById('tabFight').classList.contains('dot')"))
        await dm.click('#tabFight');await asyncio.sleep(.2)
        chk("…and its title says how many are in",'1 of 2 in' in await dm.locator('#side .panel[data-k=call]>summary').inner_text())
        chk("…no dot while Fight is open",not await dm.evaluate("()=>document.getElementById('tabFight').classList.contains('dot')"))
        await dm.click('#tabPrep');await asyncio.sleep(.2)
        await T(dm,"state.call=null;commit()");await asyncio.sleep(.3)
        chk("the dot goes with it",not await dm.evaluate("()=>document.getElementById('tabFight').classList.contains('dot')"))
        # ---- titles and empty sections
        await T(dm,"state.turn={id:'i',round:1};state.effects=[{id:'e1',name:'Fog Cloud',by:'dm',targets:[],conc:false,area:true}];state.party=[{name:'Isandros',cls:'paladin',ac:20}];commit()")
        await asyncio.sleep(.4)
        st=lambda k:dm.locator(f'#side .panel[data-k={k}]>summary').inner_text()
        chk("Battlefield says 1 active",'1 active' in await st('field'),await st('field'))
        chk("Handouts says none",'none' in await st('hand'),await st('hand'))
        chk("Player activity says nothing yet and has no body",'nothing yet' in await st('log') and
            await dm.evaluate("()=>document.querySelector('#side .panel[data-k=log]').classList.contains('noitems')"))
        chk("no standing hints in the fight's sections",await dm.locator('#side .panel[data-k=call] .strip-empty, #side .panel[data-k=field] .strip-empty').count()==0)
        await T(dm,"logPush('Gregori: Bless on Isandros');renderLog()");await asyncio.sleep(.2)
        chk("an entry fills it",not await dm.evaluate("()=>document.querySelector('#side .panel[data-k=log]').classList.contains('noitems')") and
            'nothing yet' not in await st('log'))
        # ---- a fight fits the laptop
        await T(dm,"logSeen=Date.now();actLog.length=0;renderLog()");await asyncio.sleep(.2)
        sh=await dm.evaluate("()=>{const s=document.getElementById('side');return [s.scrollHeight,s.clientHeight]}")
        chk("Fight fits 1536x864 without scrolling",sh[0]<=sh[1]+1,sh)
        foot=await dm.evaluate("()=>{const f=document.getElementById('sideFoot').getBoundingClientRect(),s=document.getElementById('side').getBoundingClientRect();return f.bottom<=s.bottom+1&&f.top>s.top}")
        chk("…with Add monsters and quick add at its foot",foot and await dm.locator('#sideFoot .sbbtn').is_visible() and await dm.locator('#sideFoot #qAdd').is_visible())
        chk("quick add help hidden",not await dm.locator('#qHint').is_visible())
        await dm.click('#side [data-act=qhelp]');await asyncio.sleep(.2)
        chk("…and shown by ?",await dm.locator('#qHint').is_visible() and await dm.get_attribute('#side [data-act=qhelp]','aria-expanded')=='true')
        await dm.fill('#qAdd','Goblin 14 hp7');await dm.press('#qAdd','Enter');await asyncio.sleep(.4)
        chk("quick add from the foot works",await T(dm,"state.list.some(c=>c.name==='Goblin')"))
        # ---- roll call: the question and Send in one row
        await T(dm,"state.call=null;commit()");await asyncio.sleep(.3)
        y=await dm.evaluate("()=>[document.getElementById('callText').getBoundingClientRect().top,document.querySelector('#callForm [type=submit]').getBoundingClientRect().top].map(Math.round)")
        chk("roll call: field and Send in one row",abs(y[0]-y[1])<=4,y)
        chk("…Send says who in its label",await dm.get_attribute('#callForm [type=submit]','aria-label')=='Send to all players')
        # ---- 1.6.3: an open statblock hides the panel, as before 1.6.2
        await T(dm,"(()=>{const r='Orc\\nArmor Class 13\\nHit Points 15 (2d8 + 6)';byId('o').sb=Object.assign(parseStatblock(r)||{},{raw:r});commit();sbViewId='o';renderDM()})()");await asyncio.sleep(.5)
        chk("an open statblock hides the panel",await dm.evaluate("()=>document.body.classList.contains('sbopen')") and not await dm.locator('#side').is_visible())
        await T(dm,"sbViewId=null;renderDM()");await asyncio.sleep(.4)
        chk("…and it comes back when the statblock closes",await dm.locator('#side').is_visible())
        # ---- Settings and files: a window from the gear
        await dm.click('#setBtn');await asyncio.sleep(.3)
        chk("the gear opens Settings and files in a window",await dm.locator('#setSheet[role=dialog]').is_visible())
        chk("…with the dice for each screen",await dm.locator('#setSheet #diceSet [data-act=diceview]').count()==9)
        chk("…and no light switch any more",'Light screen' not in await dm.locator('#setSheet').inner_text())
        await dm.fill('#timerSecs','45');await dm.press('#timerSecs','Tab');await asyncio.sleep(.3)
        chk("…its fields still work (hourglass 45 s)",await T(dm,"state.timerSecs")==45)
        await dm.click('#setSheet #autoTimer');await asyncio.sleep(.3);chk("…and its checkboxes",await T(dm,"state.autoTimer")==True)
        await dm.keyboard.press('Escape');await asyncio.sleep(.2)
        if await dm.locator('#setSheet').count(): await dm.click('#setSheet [data-act=close]');await asyncio.sleep(.2)
        chk("…it closes",await dm.locator('#setSheet').count()==0)
        await dm.click('#setBtn');await asyncio.sleep(.2);chk("…remembers the hourglass",await dm.input_value('#timerSecs')=='45')
        await dm.click('#setBtn',force=True);await asyncio.sleep(.2)
        if await dm.locator('#setSheet').count(): await T(dm,"closeSheet()")
        chk("the side panel has no Settings section",await dm.locator('#side [data-k=more]').count()==0)
        # ---- buttons stand apart from the panel, in both themes
        async def edge(theme):
            bg=rgb(await dm.evaluate("()=>getComputedStyle(document.getElementById('side')).backgroundColor"))
            bd=rgb(await dm.evaluate("()=>getComputedStyle(document.querySelector('#fieldForm .btn')).borderTopColor"))
            r=ratio(bg,bd);chk(f"{theme}: a panel button's edge is 3:1 against the panel",r>=3,round(r,2))
        await edge("dark")
        # ---- the sun and the moon
        chk("dark by default, the moon pressed",await dm.get_attribute('[data-act=dmtheme][data-v=dark]','aria-pressed')=='true')
        await dm.click('[data-act=dmtheme][data-v=light]');await asyncio.sleep(.3)
        chk("one click on the sun: light",await dm.evaluate("()=>document.documentElement.dataset.dm")=='light' and await dm.locator('#overlay .sheet').count()==0)
        chk("…the sun pressed",await dm.get_attribute('[data-act=dmtheme][data-v=light]','aria-pressed')=='true')
        await edge("light")
        await dm.click('[data-act=dmtheme][data-v=light]');await asyncio.sleep(.2)
        chk("the sun again keeps it light",await dm.evaluate("()=>document.documentElement.dataset.dm")=='light')
        await dm.reload();await asyncio.sleep(1.2)
        chk("light remembered after a reload",await dm.evaluate("()=>document.documentElement.dataset.dm")=='light')
        await dm.click('[data-act=dmtheme][data-v=dark]');await asyncio.sleep(.2)
        chk("one click on the moon: dark",await dm.evaluate("()=>!document.documentElement.dataset.dm"))
        # ---- a narrow window: the drawer still has the tabs
        await dm.set_viewport_size({'width':1024,'height':768});await asyncio.sleep(.3);await dm.click('#sideBtn');await asyncio.sleep(.4)
        chk("narrow window: the drawer has the tabs",await dm.locator('#side .sidetabs').is_visible())
        chk("No page errors",not errs,errs[:4])
        await b.close()
    print(f"{sum(res)}/{len(res)} passed");_sys.exit(0 if all(res) else 1)
asyncio.run(main())
