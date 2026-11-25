import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# README video at the top of the page: one fight, about two minutes, all four screens recorded in every pass
# (dm | tablet | tv | phone) and put together by video_home.py, which shows the screens in the layout each caption names.
# The laptop and Gregori's phone take part in every pass, so each pass sees the same fight. Run against dev/serve.sh go.
import asyncio,sys
from scene import setup
from vrec import Rec,T,present,pause
from home_plan import PLAN
from playwright.async_api import async_playwright
R=Rec('home',sys.argv[1]);TGT=R.tgt
BASE=(";state.list=state.list.filter(c=>c.id!=='d');state.diceView={tv:'3d',tab:'3d',ph:'off'};state.ended=null;state.hdywt=null;state.rsum=null;"
      "state.clocks=[];state.call=null;state.roll=null;state.tv={mode:'auto'};state.weather='none';state.tod='none';state.tune={};state.sceneFx={};"
      "state.sceneReact=true;state.layout='landscape';state.cstat={};state.nstat={};"
      "byId('i').php={cur:44,max:52,temp:0,at:Date.now()};byId('a').php={cur:21,max:38,temp:5,at:Date.now()};"
      "byId('gr').conds=['Concentrating'];state.effects.push({id:'e3',name:'Haste',by:'gr',targets:['i'],conc:true,area:false,r0:1});commit()")
ME=("hpSet({cur:32,max:32,temp:0,auto:true});"
    "ls.set(shKey(),Object.assign(shBlank('Gregori'),{cls:'Wizard 5',sub:'Evoker',lvl:5,species:'Elf',bg:'Sage',ac:12,hp:32,ab:{str:8,dex:14,con:14,int:18,wis:12,cha:10},sv:['int','wis'],sk:{arcana:1,investigation:1},sa:'int',att:[{n:'Fire Bolt',hit:7,dmg:'2d10 fire',note:'Cantrip · 120 ft'},{n:'Dagger',hit:5,dmg:'1d4+2 piercing',note:'Finesse, Light, Thrown (20/60 ft)'}],spells:{prep:['Magic Missile','Shield','Misty Step','Fireball','Counterspell']},v:Date.now()}));"
    "resSet([{name:'Spell slots · level 1',max:4,cur:3,reset:'long'},{name:'Spell slots · level 2',max:3,cur:3,reset:'long'},{name:'Spell slots · level 3',max:2,cur:2,reset:'long'},{name:'Arcane Recovery',max:1,cur:1,reset:'long'}]);"
    "renderPlayer()")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        dsf=1.25 if TGT=='dm' else 1
        dmc=await b.new_context(viewport={'width':1536,'height':864},device_scale_factor=dsf);dm=await dmc.new_page()
        await dm.goto(rk.DM+'/');await pause(1.5)
        async def S(js,w=0):
            r=await T(dm,js);await pause(w);return r
        await S(setup("tavern","avernus",False,"i")+BASE,.8)
        phc=await b.new_context(viewport={'width':390,'height':844},has_touch=True);ph=await phc.new_page()
        await ph.goto(rk.PL+'/players');await pause(1.2);await T(ph,"localStorage.clear()");await ph.reload();await pause(1.2)
        await ph.click('[data-act=pickme][data-n=Gregori]');await pause(1)
        await T(ph,ME+";window.__r=Math.random;Dice3D.get().then(()=>1,()=>0)");await pause(.5)
        tb=tv=None
        if TGT=='tablet':
            tbc=await b.new_context(viewport={'width':1200,'height':800});tb=await tbc.new_page();await tb.goto(rk.PL+'/players?shared=1')
        if TGT=='tv':
            tvc=await b.new_context(viewport={'width':1280,'height':720});tv=await tvc.new_page();await tv.goto(rk.DM+'/players?shared=1&screen=tv')
        present(ids=('i','s','a'));await pause(3)
        for x in (tb,tv):
            if x: await T(x,"Dice3D.get().then(()=>1,()=>0)")   # load the 3D dice before the first roll
        await R.cast(*{'dm':(dmc,dm),'tablet':(tb and tbc,tb),'tv':(tv and tvc,tv),'phone':(phc,ph)}[TGT])
        await pause(1.2)
        go=lambda *a,**k:R.go(dm,*a,**k);typ=lambda *a,**k:R.typ(dm,*a,**k);tap=lambda sel,w=.35:R.tap(ph,sel,w)
        cap=iter(PLAN);mark=lambda:R.mark(next(cap)[1])
        R.mark("start")
        # --- all four screens
        mark()
        await pause(1.6);await go('[data-act=tnext]');await pause(2.0);await go('[data-act=tnext]');await pause(1.6)
        mark()
        await S("state.roll={id:uid(),at:Date.now(),kind:'nat20',by:'Styx',text:'Attack: d20 (20) + 7',total:27,dice:[[20,20]]};commit()",5.6)
        if tv: await T(tv,"{const e=$('#tvDice');if(e){e.classList.add('out');Dice3D.hide();setTimeout(()=>e.remove(),650)}}")
        await S("state.diceView={tv:'off',tab:'off',ph:'off'};commit()")   # the other 3D roll is Gregori's own, on his phone
        # --- the DM's laptop
        mark()
        await pause(3.0)
        mark()
        await go('#tabPrep',dur=.45);await pause(.5)
        await go('[data-act=sbopen]',dur=.4);await pause(.5)
        await go('#fetQ',dur=.3);await typ('#fetQ','adult red',.06);await pause(.5)
        await go('#fetList .fetrow',dur=.4);await pause(.7)
        await go(dm.locator('input[data-sbhid]').last,dur=.4);await pause(.5)
        await go('[data-act=sbadd]');await pause(.6)
        await S("{const d=state.list.find(c=>c.name==='Adult Red Dragon');d.init=22;d.boss=true;d.hidden=true;d.title='Scourge of the Ashen Peaks';"
                "state.list.sort((a,b)=>initOf(b)-initOf(a));commit()}",.5)
        await go('#tabFight',dur=.45);await pause(.8)
        mark()
        did=await S("state.list.find(c=>c.name==='Adult Red Dragon').id")
        await go(f'.row[data-id="{did}"] [data-act=sbview]');await pause(.9)
        await go('#sbDrawer .sbbody button:has-text("+14")');await pause(1.0)
        await go('#sbDrawer .sbbody button:has-text("1d10 + 8")');await pause(1.3)
        mark()
        # the dragon is still hidden, so its Fire Breath can't be the save: the roll call comes from the Fight tab
        await go('#sbDrawer .sbheadb [data-act=sbclose]',dur=.35);await pause(.4)
        await go('#callText',dur=.4);await typ('#callText','Dexterity save DC 15',.05);await pause(.3)
        await go('#callForm button[type=submit]',dur=.35);await pause(1.0)
        await T(ph,"Math.random=()=>0.62");await tap('[data-act=pcallroll]',.6);await T(ph,"Math.random=window.__r")
        for k,v in (('i',23),('s',12),('a',19)): await S(f"state.call.answers=Object.assign({{}},state.call.answers,{{{k}:{v}}});commit()",.45)
        await pause(1.8)
        await S("delete state.call;state.turn=Object.assign({},state.turn,{id:'gr',init:8});commit()",.6)
        mark()
        await go('[data-act=mtstart]',dur=.4);await pause(.4)
        for g in ('g1','g2','g3'): await go(f'.row[data-id="{g}"] [data-act=mttoggle]',dur=.25)
        await go('#mtN',dur=.35);await typ('#mtN','28',.08)
        await go('#mtType',dur=.35);await dm.select_option('#mtType','fire');await pause(.2)
        await go('#mtAb',dur=.3);await dm.select_option('#mtAb','Dex');await pause(.2)
        await go('#mtDc',dur=.3);await dm.fill('#mtDc','');await typ('#mtDc','15',.08)
        await go('[data-act=mtroll]',dur=.35);await pause(1.4)
        await go('[data-act=mtapply]',dur=.4);await pause(2.0)
        # --- Gregori's phone
        mark()
        await pause(.6)
        for sel in ('.psheet .btn.primary[data-act=pclose]','.psheet .sx[data-act=pclose]'):
            if await ph.locator(sel).count(): await tap(sel,.5)
        await tap('[data-act=pmore]',.6)
        await tap('[data-act=psheet]',1.8)
        await tap('[data-act=shsec][data-s=sk]',.8)
        await T(ph,"Math.random=()=>0.81;ls.set('diceView','3d')");await tap('[data-act=shroll][data-k=sk][data-a=arcana]',3.4)
        await T(ph,"Math.random=window.__r;ls.set('diceView','dm')")
        await tap('.sx[data-act=pclose]',.5)
        mark()
        await tap('.ptop[data-act=pres]',.8)
        await tap(ph.locator('.rcard',has_text='level 3').locator('.rpip.on').first,1.2)
        await tap(ph.locator('.rcard',has_text='level 1').locator('.rpip.on').first,1.3)
        print('slots',await ph.eval_on_selector_all('.rcard .rct',"e=>e.map(x=>x.textContent).join(' ')"),flush=True)
        await tap('.sx[data-act=pclose]',.5)
        mark()
        await tap('.pdock [data-act=php]',.6)
        for k in "14": await tap(f'[data-act=pkey][data-k="{k}"]',.3)
        await tap('[data-act=phpdo][data-hp=dmg]',1.3)
        await T(ph,"Math.random=()=>0.62");await tap('[data-act=pconroll]:visible',2.4);await T(ph,"Math.random=window.__r")
        if await ph.query_selector('.sx[data-act=pclose]'): await tap('.sx[data-act=pclose]',.4)
        # --- the tablet and the TV
        mark()
        await S("{const d=state.list.find(c=>c.name==='Adult Red Dragon');d.hidden=false;d.introAt=Date.now()};commit()",5.6)
        # the dragon opens round 3: the TV shows the new round with what happened in round 2, and has made way by the death saves
        await S("state.rsum={r:2,lines:['Gregori\\'s Fireball drops three goblins','Styx rolls a natural 20','The Adult Red Dragon appears']};"
                "state.turn={round:3,id:state.list.find(c=>c.name==='Adult Red Dragon').id,init:22};commit()",3.0)
        mark()
        await S("const c=byId('i');c.down=true;c.ds={s:1,f:2};state.turn={round:3,id:'i',init:19};commit()",4.8)
        mark()
        await S("{const d=state.list.find(c=>c.name==='Adult Red Dragon');d.hp=0;d.down=true;state.turn={round:3,id:'s',init:15};"
                "state.hdywt={id:uid(),pc:'s',name:'Styx',cls:'bard',boss:'Adult Red Dragon',at:Date.now()}};commit()",6.0)
        # --- all four again
        mark()
        await S("for(const k of ['g1','g2','g3']){const g=byId(k);g.hp=0;g.down=true};"
                "state.cstat={Gregori:{d:84,k:2,top:{n:28,w:'fire',t:'Goblin A'}},Styx:{d:41,k:1,top:{n:21,w:'piercing',t:'Adult Red Dragon'}},Isandros:{d:63,k:1,top:{n:31,w:'radiant',t:'Adult Red Dragon'}}};"
                "state.nstat={s:{n20:1,n1:0}};state.hdywt=null;state.turn=null;state.fightAt=Date.now()-38*60000;endFight();commit()",6.5)
        R.mark("end")
        await pause(.5)
        R.save(dsf=dsf)
        await b.close()
asyncio.run(main())
