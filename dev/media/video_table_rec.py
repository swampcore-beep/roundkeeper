import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# README video "The tablet and the TV": one pass per screen (tablet | tv). The DM's laptop drives the fight
# through the test hook, the same steps in each pass. Run against dev/serve.sh go (SRD only).
import asyncio,sys
from scene import setup
from vrec import Rec,T
from playwright.async_api import async_playwright
R=Rec('table',sys.argv[1]);TGT=R.tgt
BASE=(";state.weather='none';state.tod='none';state.tune={};state.sceneFx={};state.sceneReact=true;state.layout='auto';state.ended=null;"
      "state.tv={mode:'auto'};state.clocks=[];state.rsum=null;state.cstat={};state.nstat={};state.hdywt=null;commit()")
FIGHT=("state.list=window.__keep.map(c=>Object.assign({},c,c.kind==='pc'?{init:null}:{}));state.turn=null;state.effects=[];state.fightAt=Date.now();commit()")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server'])
        dmc=await b.new_context(viewport={'width':1440,'height':900});dm=await dmc.new_page()
        await dm.goto(rk.DM+'/');await asyncio.sleep(1.5)
        async def S(js,w=0): await T(dm,js);await asyncio.sleep(w)
        await S(setup("tavern","avernus",True,"i")+BASE,.5)
        await S("window.__keep=JSON.parse(JSON.stringify(state.list));state.list=[];state.turn=null;state.effects=[];state.showQr=true;commit()",.5)
        if TGT=='tablet': c=await b.new_context(viewport={'width':800,'height':1200});pg=await c.new_page();await pg.goto(rk.PL+'/players?shared=1')
        else: c=await b.new_context(viewport={'width':1280,'height':720});pg=await c.new_page();await pg.goto(rk.DM+'/players?shared=1&screen=tv')
        await asyncio.sleep(3.5)
        await R.cast(c,pg);await asyncio.sleep(1.0)
        mark=R.mark
        mark("start")
        mark("Before the fight: a code to join, a title card on the TV")
        await S("state.tv.title={eb:'Session 12',t:'The Ashen Peaks',sub:'Where the road climbs into smoke',at:Date.now()};commit()",4.0)
        mark("Roll for initiative: the order fills in as players answer")
        await S("state.showQr=false;"+FIGHT,1.6)
        for k,v in (('i',19),('s',15),('a',11),('gr',8)): await S(f"byId('{k}').init={v};commit()",.8)
        await asyncio.sleep(1.6)
        mark("Start turns: whose turn it is, and who's next")
        await S("state.turn={round:1,id:'i',init:19};commit()",5.8)
        mark("Spells play over the turn order")
        await S("state.turn={round:1,id:'gr',init:8};commit()",.8)
        await S("state.spfx={id:uid(),at:Date.now(),n:'Fireball',t:'fire',from:'gr',to:['g1','g2','g3']};commit()",1.6)
        await S("for(const k of ['g1','g3']){const g=byId(k);g.hp=0;g.down=true};const h=byId('g2');h.hp=3;h.bloodied=true;commit()",1.8)
        mark("A roll call: a card for each player as they answer")
        await S("state.call={id:'c'+Date.now(),text:'Dexterity save DC 15',dc:15,at:Date.now(),to:['i','s','a','gr'],answers:{}};commit()",1.2)
        for k,v in (('i',17),('s',12),('a',19),('gr',16)): await S(f"state.call.answers=Object.assign({{}},state.call.answers,{{{k}:{v}}});commit()",.6)
        await asyncio.sleep(1.3);await S("delete state.call;commit()",.3)
        mark("Rolls shared from a phone land on the big screen")
        await S("state.turn={round:1,id:'s',init:15};state.roll={id:uid(),at:Date.now(),kind:'roll',by:'Styx',text:'Attack: d20 (14) + 7',total:21};commit()",4.4)
        mark("A hidden boss is revealed")
        await S("byId('d').hidden=false;byId('d').introAt=Date.now();commit()",4.8)
        mark("A new round: what happened, then the countdown")
        await S("state.clocks=[{id:'k1',name:'The ritual completes',n:3,max:4,secret:false}];"
                "state.rsum={r:1,lines:['Gregori\\'s Fireball drops two goblins','The Adult Red Dragon appears']};"
                "state.turn={round:2,id:'d',init:22};commit()",8.9)
        mark("At 0 HP, the death saves fill the TV")
        await S("const c=byId('i');c.down=true;c.ds={s:1,f:2};state.turn={round:2,id:'i',init:19};commit()",4.5)
        mark("End of the fight: the night's best moments and the XP")
        await S("for(const k of ['d','g2']){const g=byId(k);g.hp=0;g.down=true};"
                "state.cstat={Gregori:{d:84,k:2,top:{n:28,w:'fire',t:'Goblin A'}},Styx:{d:41,k:1,top:{n:21,w:'piercing',t:'Adult Red Dragon'}},Isandros:{d:63,k:1,top:{n:31,w:'radiant',t:'Adult Red Dragon'}}};"
                "state.nstat={s:{n20:1,n1:0}};state.hdywt={id:uid(),pc:'s',name:'Styx',cls:'bard',boss:'Adult Red Dragon',at:Date.now()-60000};"
                "state.fightAt=Date.now()-38*60000;endFight();commit()",5.5)
        mark("end")
        await asyncio.sleep(.5)
        R.save();await b.close()
asyncio.run(main())
