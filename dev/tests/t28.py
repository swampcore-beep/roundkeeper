import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
# round 3: background animations: 15 new scenes (B1–B15), spell and fight reactions (R1–R5), fade between scenes (R6), weather, time of day, calm/wild (K1–K3)
import asyncio,json,sys,urllib.request,urllib.error
pass
from cap import SETUP as S0
from playwright.async_api import async_playwright
SETUP=S0.replace('THEME','"tavern"').replace('SCENE','"dungeon"')
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x if not c else "")
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
def post(u,d):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,data=json.dumps(d).encode(),headers={"Content-Type":"application/json"}),timeout=5);return r.status
    except urllib.error.HTTPError as e: return e.code
NEW="grave,crystal,aurora,autumn,meadow,bloodmoon,ritual,farrealm,mechanus,clouds,festival,battle,mine,ethereal,sewer".split(",")
LIT="(()=>{const c=document.querySelector('#scene'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=400)if(d[i]>0)n++;return n})()"
FXLIT="(()=>{const c=document.querySelector('#sceneFx'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=400)if(d[i]>0)n++;return n})()"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append('dm '+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.5); await T(dm,SETUP)
        sf=await (await b.new_context(viewport={'width':1368,'height':912})).new_page(); sf.on("pageerror",lambda e:errs.append('sf '+str(e)))
        await sf.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(2.5)
        # B1–B15
        bad=[]
        for k in NEW:
            await T(dm,f"state.scene='{k}';commit()"); await asyncio.sleep(1.6)
            if await T(sf,"Scene.kind")!=k or await sf.evaluate(LIT)<20: bad.append(k)
        chk("all 15 new scenes draw on the tablet",not bad,bad)
        chk("the picker shows 35 scenes, the new ones marked",await T(dm,"SCENES.length")==36 and await T(dm,"SCENE_NEW.size")==15)
        # R6: fade
        await T(dm,"state.scene='forest';commit()"); await asyncio.sleep(1.0)
        chk("R6: the old scene fades over the new one",await sf.evaluate("!document.querySelector('#scene2').hidden"))
        await asyncio.sleep(3)
        chk("…and is gone after",await sf.evaluate("document.querySelector('#scene2').hidden"))
        # K1–K3 through Atmosphere
        await T(dm,"atmoT='surface';atmoD=null;atmoSheet()"); await asyncio.sleep(.6)
        await dm.click('[data-act=aweather][data-v=rain]'); await dm.click('[data-act=atod][data-v=dusk]')
        await dm.evaluate("()=>{const r=document.querySelector('#aDen');r.value=180;r.dispatchEvent(new Event('change',{bubbles:true}))}"); await asyncio.sleep(.2)
        await dm.evaluate("()=>{const r=document.querySelector('#aSpd');r.value=50;r.dispatchEvent(new Event('change',{bubbles:true}))}"); await asyncio.sleep(.2)
        nw=await dm.locator('#apNow').inner_text()
        chk("Atmosphere lists the changes",all(x in nw for x in ["weather","time of day","calm or wild"]),nw)
        await dm.click('[data-act=atmogo]'); await asyncio.sleep(2)
        chk("the tablet keeps weather, time and tune",await T(dm,"JSON.stringify([state.weather,state.tod,state.tune.forest])")=='["rain","dusk",[1.8,0.5]]')
        chk("K1: rain over the scene",await T(sf,"Scene.weather")=='rain' and await T(sf,"Scene.W.length")>100)
        chk("K2: dusk tint",await sf.evaluate("document.querySelector('#todTint').className")=='tod-dusk')
        chk("K3: wilder and slower",await T(sf,"Scene.D")==1.8 and await T(sf,"Scene.V")==.5)
        # saved theme carries it
        await dm.fill('#aSaveName','Rainy forest'); await dm.click('#aSaveForm button[type=submit]'); await asyncio.sleep(.3)
        chk("a saved look keeps the weather",await T(dm,"myThemes().find(m=>m.name==='Rainy forest').weather")=='rain')
        await T(dm,"closeSheet()")
        # weather over a picture, no scene
        await T(dm,"state.scene='none';state.weather='snow';commit()"); await asyncio.sleep(1.5)
        chk("K1: snow with no scene still draws",await sf.evaluate(LIT)>20)
        await T(dm,"state.weather='none';state.tod='none';state.scene='dungeon';commit()"); await asyncio.sleep(1.5)
        # R1: Hit several from a statblock
        await T(dm,"mtOn=true;mtSel=new Set(['g1','g2']);byId('g1').hpMax=20;byId('g1').hp=20;byId('g2').hpMax=20;byId('g2').hp=20;mt={n:'9',type:'fire',ab:'',dc:'',on:'half',modes:{},rolls:{},src:{cid:'l',act:'Fire Breath'}};mtApply()"); await asyncio.sleep(1.2)
        sp=json.loads(await T(dm,"JSON.stringify(state.spfx)"))
        chk("R1: Hit several sends the breath to the scene",sp and sp['t']=='fire' and sp['from']=='l' and set(sp['to'])=={'g1','g2'},sp)
        chk("…and the tablet plays it over the order",await T(sf,"Scene.SP.length+Scene.fx.length")>0 and await sf.evaluate(FXLIT)>0)
        await T(dm,"byId('l').hidden=true;mtOn=true;mtSel=new Set(['b']);mt={n:'5',type:'cold',ab:'',dc:'',on:'half',modes:{},rolls:{},src:{cid:'l',act:'Cone of Cold'}};mtApply()"); await asyncio.sleep(.3)
        chk("a hidden caster isn't named",await T(dm,"state.spfx.from")==None)
        await T(dm,"byId('l').hidden=false;commit()")
        await T(dm,"mtOn=true;mtSel=new Set(['g1']);mt={n:'4',type:'slashing',ab:'',dc:'',on:'half',modes:{},rolls:{},src:{cid:'l',act:'Claw'}};const was=state.spfx.id;mtApply();window.__w=was"); await asyncio.sleep(.3)
        chk("a claw doesn't play in the scene",await T(dm,"state.spfx.id===window.__w"))
        # R1: battlefield spells while they last
        await T(dm,"state.effects.push({id:'fc',name:'Fog Cloud',by:'m',targets:[],conc:true,area:true});commit()"); await asyncio.sleep(1.5)
        chk("R1: Fog Cloud stays in the scene",await T(sf,"!!Scene.bf.fog&&!Scene.bf.fog.off"))
        await T(dm,"state.effects=state.effects.filter(e=>e.id!=='fc');commit()"); await asyncio.sleep(1.5)
        chk("…and clears when it ends",await T(sf,"!Scene.bf.fog||!!Scene.bf.fog.off"))
        # R1: Bless wave
        await T(sf,"window.__wv=null;Scene.wave=(o=>function(A,T,bane){window.__wv=[!!A,T.length,bane];return o.apply(this,arguments)})(Scene.wave)")
        await T(dm,"state.effects.push({id:'bl2',name:'Bless',by:'s',targets:['s','a'],conc:false,area:false});commit()"); await asyncio.sleep(2.5)
        chk("R1: Bless waves from the caster to the targets",await T(sf,"JSON.stringify(window.__wv)")=='[true,2,false]',await T(sf,"JSON.stringify(window.__wv)"))
        # R2, R4
        await T(dm,"state.roll={id:'r'+Date.now(),at:Date.now(),kind:'nat20',by:'Mira',text:'Attack',total:20};commit()"); await asyncio.sleep(2.2)
        chk("R2: nat 20 flashes the scene",await T(sf,"Scene.fx.some(f=>f.k==='flash')||document.body.className.includes('sjolt')"))
        await T(dm,"byId('a').down=true;commit()"); await asyncio.sleep(1.4)
        chk("R4: a player at 0 HP drains the colour",await sf.evaluate("document.body.classList.contains('sgrey')"))
        await T(dm,"byId('a').down=false;commit()")
        # R5: ritual circle and a countdown
        await T(dm,"state.scene='ritual';state.clocks=[{id:'k1',name:'Ritual',n:1,max:5}];commit()"); await asyncio.sleep(1.4)
        chk("R5: the circle turns faster near 0",await T(sf,"Scene.rit")>3)
        # a player shows a spell on the table
        ph=await (await b.new_context(viewport={'width':390,'height':844})).new_page(); ph.on("pageerror",lambda e:errs.append('ph '+str(e)))
        await ph.goto(rk.PL+'/players'); await asyncio.sleep(1.2); await ph.click('[data-act=pickme][data-n=Mira]'); await asyncio.sleep(1)
        await T(ph,"spView={n:'Fireball',s:'XPHB',from:'book',d:null};pSheet='spell';renderPSheet()"); await asyncio.sleep(.3)
        chk("phone: Show it on the table",await ph.locator('[data-act=pspfx]').count()==1)
        await ph.click('[data-act=pspfx]'); await asyncio.sleep(3)
        chk("…reaches the DM as Mira's Fireball",await T(dm,"state.spfx.n==='Fireball'&&state.spfx.from==='m'"))
        chk("…and the tablet plays it",await T(sf,"Scene.fx.some(f=>f.k==='bead'||f.k==='boom')||Scene.SP.length>0"))
        chk("server: a bad damage type is refused",post(rk.PL+'/player',{"id":"m","action":"spfx","n":"Fireball","t":"banana"})==400)
        chk("server: no name is refused",post(rk.PL+'/player',{"id":"m","action":"spfx","t":"fire"})==400)
        await T(dm,"state.playerEdits=false;commit()"); await asyncio.sleep(2.5)
        chk("locked: the server refuses it",post(rk.PL+'/player',{"id":"m","action":"spfx","n":"Fireball","t":"fire"})==403)
        await T(ph,"renderPSheet()"); chk("locked: no button",await ph.locator('[data-act=pspfx]').count()==0)
        await T(dm,"state.playerEdits=true;commit()")
        # toggles
        await T(dm,"atmoD=null;atmoSheet()"); await asyncio.sleep(.5)
        await dm.click('[data-act=sfxtoggle][data-k=spells]'); await asyncio.sleep(1.5)
        chk("Spells off: saved",await T(dm,"state.sceneFx.spells")==False)
        await T(sf,"Scene.fx=[];Scene.SP=[]")
        await T(dm,"state.effects.push({id:'dk',name:'Darkness',by:'m',targets:[],conc:true,area:true});state.spfx={id:'x9',at:Date.now(),n:'Fireball',t:'fire',from:null,to:[]};commit()"); await asyncio.sleep(1.5)
        chk("Spells off: nothing plays, no Darkness",await T(sf,"Scene.fx.length+Scene.SP.length")==0 and await T(sf,"!Scene.bf.darkness||!!Scene.bf.darkness.off"))
        await dm.click('[data-act=sfxtoggle][data-k=boss]'); await asyncio.sleep(.3)
        chk("Boss fight chip is the old setting",await T(dm,"state.sceneReact")==False)
        await T(dm,"closeSheet();state.sceneFx={};state.sceneReact=true;commit()")
        # TV light mode skips it all
        tv=await (await b.new_context(viewport={'width':1920,'height':1080})).new_page(); tv.on("pageerror",lambda e:errs.append('tv '+str(e)))
        await T(dm,"state.tv=Object.assign({},state.tv,{look:{same:false,theme:'tavern',look:{},scene:'storm',bg:'',bgDim:.45,mfont:'B',lite:true,weather:'rain',tod:'night',tune:{}}});commit()")
        await tv.goto('http://127.0.0.1:8765/players?shared=1&screen=tv'); await asyncio.sleep(2.5)
        await T(dm,"state.spfx={id:'x10',at:Date.now(),n:'Fireball',t:'fire',from:null,to:[]};commit()"); await asyncio.sleep(1.5)
        chk("TV Light mode: no scene, no weather, no spells",await T(tv,"Scene.kind")=='none' and await T(tv,"Scene.weather")=='none' and await T(tv,"Scene.fx.length+Scene.SP.length")==0)
        # reduced motion
        rm=await (await b.new_context(viewport={'width':1024,'height':768},reduced_motion='reduce')).new_page(); rm.on("pageerror",lambda e:errs.append('rm '+str(e)))
        await rm.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(2)
        await T(dm,"state.spfx={id:'x11',at:Date.now(),n:'Fireball',t:'fire',from:null,to:[]};commit()"); await asyncio.sleep(1.5)
        chk("reduced motion: no spell animation",await T(rm,"Scene.fx.length+Scene.SP.length")==0)
        chk("no page errors",not errs,errs)
        await b.close()
    print("t28: ",("fails=0" if ok else "fails=1"))
asyncio.run(main())
