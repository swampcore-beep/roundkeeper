import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py:
"""t43 (1.6): dice on the screens. Shared rolls carry their dice ([sides, face]) and the server keeps only real ones; the DM picks 3D, Light
or Off for the TV, the tablet and the phones, and a player can pick for their own phone; 3D dice land on the rolled faces; 3D falls back to
Light without WebGL and in the TV's Light mode; reduced motion means Off. The browser runs WebGL in software (SwiftShader)."""
import asyncio,json,urllib.request
from playwright.async_api import async_playwright
op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
res=[]
def chk(n,c,x=""):
    res.append(bool(c)); print(("PASS " if c else "FAIL ")+n,("· "+str(x)) if x!="" else "")
async def T(pg,js): return await pg.evaluate("(s)=>__t(s)",js)
def post(body):
    rq=urllib.request.Request(rk.PL+'/player',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'},method='POST')
    try: return op.open(rq,timeout=5).status
    except urllib.error.HTTPError as e: return e.code
GL=['--no-proxy-server','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
SETUP=("state.list=[{...newCombatant({kind:'pc'}),id:'i',name:'Isandros',cls:'paladin',init:15},{...newCombatant({kind:'pc'}),id:'g',name:'Gregori',cls:'wizard',init:9},"
       "{...newCombatant({kind:'monster'}),id:'o',name:'Orc',init:12,hp:15,hpMax:15}];state.turn={id:'i',round:1};state.effects=[];state.roll=null;"
       "state.diceView={tv:'3d',tab:'3d',ph:'3d'};state.tv={mode:'auto'};state.lite=false;commit();'ok'")
async def wait(pg,js,t=6):
    for _ in range(int(t*10)):
        if await T(pg,js): return True
        await asyncio.sleep(.1)
    return False
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=GL);errs=[]
        def watch(pg,n): pg.on('pageerror',lambda e:errs.append(n+' '+str(e)))
        dm=await (await b.new_context(viewport={'width':1536,'height':864})).new_page();watch(dm,'dm')
        await dm.goto(rk.DM+'/');await asyncio.sleep(1);await T(dm,SETUP);await asyncio.sleep(.6)
        # ---------- server: the dice file, and only real dice in a shared roll ----------
        js=op.open(rk.PL+'/dice/dice-box.js').read()
        chk("Server: the 3D dice library is served to the screens (offline, from the program)",len(js)>400000 and b'three.js' in js.lower() or b'Three.js' in js,len(js))
        async def roll_after(body):
            await T(dm,"state.roll=null;commit()");await asyncio.sleep(.3);post(body)
            await wait(dm,"!!state.roll",5);return json.loads(await T(dm,"JSON.stringify(state.roll)"))
        r=await roll_after({"id":"i","action":"roll","kind":"roll","text":"Longsword: d20 (17) +6","total":23,"dice":[[20,17],[4,2]]})
        chk("A shared roll keeps its dice ([20,17] and Bless's [4,2])",r and r.get('dice')==[[20,17],[4,2]],r)
        for bad,why in [([[20,21]],"a face the die doesn't have"),([[7,3]],"a d7"),([[6,2.5]],"half a pip"),([[6,1]]*31,"31 dice"),("2d6","not a list")]:
            r=await roll_after({"id":"i","action":"roll","kind":"roll","text":"x","total":3,"dice":bad})
            chk(f"The server drops dice that aren't real ({why}), and keeps the roll",r and r.get('total')==3 and 'dice' not in r,r)
        # ---------- the DM's setting reaches the screens ----------
        await dm.click('#setBtn');await asyncio.sleep(.4)   # 1.7: Settings and files is a window
        n=await T(dm,"document.querySelectorAll('#diceSet [data-act=diceview]').length")
        chk("Settings and files: 3D, Light and Off for the TV, the tablet and the phones",n==9,n)
        await dm.locator('#setSheet').screenshot(path='/tmp/dv/set.png')
        await dm.click('#diceSet [data-act=diceview][data-k=tab][data-v=light]');await asyncio.sleep(.3)
        chk("A click sets that screen (tablet: Light)",await T(dm,"diceViewAll().tab==='light'&&diceViewAll().tv==='3d'"))
        pub=json.loads(op.open(rk.PL+'/state').read())
        chk("The players' view carries the setting",(pub.get('diceView') or {}).get('tab')=='light',pub.get('diceView'))
        await T(dm,"state.diceView={tv:'3d',tab:'3d',ph:'3d'};commit()")
        # ---------- the TV: 3D dice that land on the rolled faces, then the card ----------
        tv=await (await b.new_context(viewport={'width':1280,'height':720})).new_page();watch(tv,'tv')
        await tv.goto(rk.PL+'/players?shared=1&screen=tv');await asyncio.sleep(2)
        chk("TV: 3D, and this browser has WebGL",await T(tv,"diceMode()==='3d'&&Dice3D.ok()"))
        ok=await wait(tv,"!!Dice3D.box",12)
        chk("TV: the 3D dice load before the first roll",ok)
        await T(tv,"{const B=Dice3D.box,o=B.roll.bind(B);B.roll=async n=>{window.__note=n;const r=await o(n);window.__dr=r;return r}}")
        post({"id":"i","action":"roll","kind":"roll","text":"Longsword: d20 advantage (17, 4) +6","total":23,"dice":[[20,17],[20,4],[4,2]]})
        ok=await wait(tv,"!!document.querySelector('#tvDice.d3 .t2dice')",5)
        chk("TV: the roll card has a place for the 3D dice instead of the flat d20",ok and await T(tv,"!document.querySelector('#tvDice .t2die')"))
        chk("TV: the total waits while the dice roll",await T(tv,"document.querySelector('#tvDice').classList.contains('rolling')"))
        ok=await wait(tv,"!!window.__dr&&!document.querySelector('#tvDice').classList.contains('rolling')",10)
        dr=json.loads(await T(tv,"JSON.stringify({n:window.__note,f:(window.__dr&&window.__dr.sets||[]).map(s=>[s.sides,s.rolls.map(x=>x.value)])})"))
        # (the library reads a d4 it has turned wrongly, though it shows the right number on top, so the d4 is checked by the notation)
        chk("TV: the dice land on the rolled faces (2d20 on 17 and 4, a d4 on 2)",ok and dr['n']=='2d20+1d4@17,4,2' and dr['f'][0]==[20,[17,4]],dr)
        await asyncio.sleep(.6)
        chk("TV: then the total shows",await T(tv,"getComputedStyle(document.querySelector('#tvDice .t2head')).opacity==='1'"))
        chk("TV: the dice stand where the card keeps their place",await T(tv,
            "(()=>{const a=$('#dice3d').getBoundingClientRect(),b=$('#tvDice .t2dice').getBoundingClientRect();return Math.abs(a.left-b.left)<2&&Math.abs(a.top-b.top)<2})()"))
        # 1.6.1: each player's dice in their own class colour (the library keeps materials by colour set name)
        chk("Dice colours have their own names (wizard, bard)",await T(tv,"diceColors('Gregori').name!==diceColors('Isandros').name"))
        async def tint(who,face):
            post({"id":who,"action":"roll","kind":"roll","text":"d20","total":face,"dice":[[20,face]]})
            await wait(tv,f"!!window.__dr&&window.__note==='1d20@{face}'",10);await T(tv,"window.__dr=null");await asyncio.sleep(.3)
            from PIL import Image;import io
            # 1.6.2: black behind the (transparent) dice canvas while it is measured, so the scene behind it doesn't count, and only the
            # dice's coloured faces: lit but not dark, saturated (the cream numerals are not). A plain "max-min>40" missed the
            # darker blue faces under the lights and measured the numerals alone (−44 for blue dice).
            await T(tv,"document.getElementById('dice3d').style.background='#000'")
            im=Image.open(io.BytesIO(await tv.locator('#dice3d').screenshot())).convert('RGB')
            await T(tv,"document.getElementById('dice3d').style.background=''")
            px=[p for p in im.getdata() if max(p)>60 and max(p)-min(p)>=.25*max(p)]
            return (sum(p[2]-p[0] for p in px)/len(px)) if len(px)>200 else 0   # blue minus red over the dice's faces
        g=await tint("g",13);i=await tint("i",8)
        chk("Gregori's dice are blue, Isandros's are not (the colour changes between rolls)",g>10 and i<0,[round(g,1),round(i,1)])
        await T(tv,"window.__dr=null")
        # a nat 20 with real dice: one d20 that lands on 20
        await T(tv,"window.__dr=null");post({"id":"i","action":"roll","kind":"nat20","text":"real dice","total":20})
        ok=await wait(tv,"!!window.__dr",10)
        chk("TV: a nat 20 from real dice rolls one 3D d20 onto 20",ok and await T(tv,"window.__note==='1d20@20'"),await T(tv,"window.__note"))
        # Light and Off on the TV
        await T(dm,"state.diceView=Object.assign({},state.diceView,{tv:'light'});commit()");await asyncio.sleep(1.2)
        post({"id":"i","action":"roll","kind":"roll","text":"Javelin: d20 (11) +6","total":17,"dice":[[20,11]]})
        ok=await wait(tv,"!!document.querySelector('#tvDice:not(.d3) .t2die')",5)
        chk("TV on Light: the flat d20 as before",ok)
        await T(dm,"state.diceView=Object.assign({},state.diceView,{tv:'off'});commit()");await asyncio.sleep(1.2)
        post({"id":"i","action":"roll","kind":"roll","text":"Javelin: d20 (9) +6","total":15,"dice":[[20,9]]})
        ok=await wait(tv,"!!document.querySelector('#tvDice.nodie')",5)
        chk("TV on Off: the card with the result, no die",ok and await T(tv,"!document.querySelector('#tvDice .t2die,#tvDice .t2dice')&&/15/.test($('#tvDice .t2head').textContent)"))
        await T(dm,"state.diceView=Object.assign({},state.diceView,{tv:'3d'});state.lite=true;commit()");await asyncio.sleep(1.2)
        chk("TV in its Light mode: 3D becomes Light",await T(tv,"document.body.classList.contains('tvlite')&&diceMode()==='light'"))
        await T(dm,"state.lite=false;commit()")
        # ---------- the tablet ----------
        tb=await (await b.new_context(viewport={'width':1200,'height':800})).new_page();watch(tb,'tab')
        await tb.goto(rk.PL+'/players?shared=1');await asyncio.sleep(2)
        await T(dm,"state.tvSeen=0;state.tv=Object.assign({},state.tv,{ev:{dice:'both'}});commit()");await asyncio.sleep(.8)
        await wait(tb,"!!Dice3D.box",12)
        post({"id":"g","action":"roll","kind":"roll","text":"Fire Bolt: 2d10 (7, 3)","total":10,"dice":[[10,7],[10,3]]})
        ok=await wait(tb,"$('#dice3d.tab.on')!=null",5)
        chk("Tablet on 3D: 3D dice, then the roll banner",ok and await wait(tb,"!!document.querySelector('.rollbanner')",10))
        for m,sel,name in [("light",".fxdie","the flat d20"),("off",".rollbanner","straight to the banner")]:
            await T(dm,f"state.diceView=Object.assign({{}},state.diceView,{{tab:'{m}'}});commit()");await asyncio.sleep(1.2)
            await T(tb,"document.querySelectorAll('.rollbanner,.fxdie').forEach(e=>e.remove())")
            post({"id":"g","action":"roll","kind":"roll","text":"Fire Bolt: 2d10 (2, 5)","total":7,"dice":[[10,2],[10,5]]})
            ok=await wait(tb,f"!!document.querySelector('{sel}')",4)
            chk(f"Tablet on {m.capitalize()}: {name}",ok and (m!="off" or await T(tb,"!document.querySelector('.fxdie')&&!$('#dice3d.on')")))
        # ---------- a phone: the DM's choice, or the player's own ----------
        ph=await (await b.new_context(viewport={'width':390,'height':844},has_touch=True)).new_page();watch(ph,'ph')
        await ph.goto(rk.PL+'/players');await asyncio.sleep(1);await ph.click('[data-act=pickme][data-n=Isandros]');await asyncio.sleep(1)
        await T(dm,"state.diceView=Object.assign({},state.diceView,{ph:'3d'});commit()");await asyncio.sleep(1)
        chk("Phone: the DM's choice by default (3D)",await T(ph,"ls.get('diceView','dm')==='dm'&&diceMode()==='3d'"))
        await T(ph,"pSheet='more';renderPSheet()");await asyncio.sleep(.3)
        lab=await T(ph,"[...document.querySelectorAll('[data-act=pdiceview]')].map(b=>b.textContent).join('|')")
        chk("Phone, More: As the DM set (3D) · 3D · Light · Off",lab=="As the DM set (3D)|3D|Light|Off",lab)
        await ph.click('[data-act=pdiceview][data-v=off]');await asyncio.sleep(.2)
        chk("Phone: the player's own choice wins on this phone (Off)",await T(ph,"ls.get('diceView')==='off'&&diceMode()==='off'"))
        chk("…and only there: the DM's setting is unchanged",await T(dm,"diceViewAll().ph==='3d'"))
        await ph.click('[data-act=pdiceview][data-v=dm]');await T(ph,"pSheet=null;renderPSheet();dice.share=true")
        await wait(ph,"!!Dice3D.box",12)
        await T(dm,"state.roll=null;commit()");await asyncio.sleep(.5)
        await T(ph,"shRoll('Athletics',6)")
        chk("Phone on 3D: your own roll rolls 3D dice on your phone",await wait(ph,"$('#dice3d.ph.on')!=null",4))
        ok=await wait(dm,"!!state.roll",5);rr=json.loads(await T(dm,"JSON.stringify(state.roll)"))
        chk("Phone: the shared roll carries its d20",ok and rr.get('dice') and rr['dice'][0][0]==20 and 1<=rr['dice'][0][1]<=20,rr)
        await asyncio.sleep(.4);await ph.tap('#dice3d');await asyncio.sleep(.6)
        chk("Phone: a tap skips the dice",await T(ph,"!$('#dice3d.on')"))
        await T(ph,"ls.set('diceView','light');document.querySelectorAll('.fxdie').forEach(e=>e.remove());rollDice()")
        chk("Phone on Light: the flat d20",await wait(ph,"!!document.querySelector('.fxdie')",2))
        await T(ph,"ls.set('diceView','off');document.querySelectorAll('.fxdie').forEach(e=>e.remove());rollDice()");await asyncio.sleep(.4)
        chk("Phone on Off: no dice, just the result",await T(ph,"!document.querySelector('.fxdie')&&!$('#dice3d.on')&&!!dice.last"))
        # ---------- no WebGL, reduced motion ----------
        await T(dm,"state.diceView=Object.assign({},state.diceView,{tv:'3d'});commit()")
        b2=await p.chromium.launch(args=['--no-proxy-server','--disable-webgl','--disable-3d-apis'])
        tv2=await (await b2.new_context(viewport={'width':1280,'height':720})).new_page();watch(tv2,'tv-nogl')
        await tv2.goto(rk.PL+'/players?shared=1&screen=tv');await asyncio.sleep(2)
        chk("A TV without WebGL shows Light instead of 3D",await T(tv2,"!Dice3D.ok()&&diceMode()==='light'"))
        post({"id":"i","action":"roll","kind":"roll","text":"Javelin: d20 (12) +6","total":18,"dice":[[20,12]]})
        chk("…with the flat d20 in the card",await wait(tv2,"!!document.querySelector('#tvDice .t2die')",5))
        await b2.close()
        rm=await (await b.new_context(viewport={'width':1280,'height':720},reduced_motion='reduce')).new_page();watch(rm,'reduced')
        await rm.goto(rk.PL+'/players?shared=1&screen=tv');await asyncio.sleep(1.5)
        chk("Reduced motion: no dice",await T(rm,"diceMode()==='off'"))
        chk("No page errors",not errs,errs[:4])
        await b.close()
    print(f"{sum(res)}/{len(res)} passed");sys_exit=0 if all(res) else 1;_sys.exit(sys_exit)
asyncio.run(main())
