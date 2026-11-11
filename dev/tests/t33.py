import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
# TV pack 2: initiative cards (TV13), roll call cards (TV7), death saves (TV9), the dice theatre (TV6),
# the countdown ring (TV10) and the end of the fight (TV14), whose summary never names hidden creatures.
import asyncio
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("()=>__t(`"+js+"`)")
LIST=("state.party=[];state.list=[{id:'i',name:'Isandros',kind:'pc',cls:'paladin',init:19,conds:[],ds:{s:0,f:0}},{id:'s',name:'Styx',kind:'pc',cls:'bard',init:15,conds:[],ds:{s:0,f:0}},"
      "{id:'g',name:'Gregori',kind:'pc',cls:'wizard',init:null,conds:[],ds:{s:0,f:0}},{id:'d',name:'Adult Red Dragon',kind:'enemy',boss:true,init:17,conds:[],ds:{s:0,f:0},sb:{cr:'17',raw:''},hp:256,hpMax:256},"
      "{id:'x',name:'Lurking Assassin',kind:'enemy',hidden:true,init:12,conds:[],ds:{s:0,f:0},sb:{cr:'8',raw:''}}];state.turn=null;state.ended=null;state.call=null;state.clocks=[];state.roll=null;state.fightAt=Date.now();")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.2)
        await T(dm,LIST+"commit()"); await asyncio.sleep(.5)
        tv=await (await b.new_context(viewport={'width':1280,'height':720})).new_page(); tv.on("pageerror",lambda e:errs.append(str(e)))
        await tv.goto('http://127.0.0.1:8765/players?shared=1&screen=tv'); await asyncio.sleep(2.5)
        # TV13
        chk("initiative screen while a player hasn't rolled",await tv.locator('#tvLayer .tvini').count()==1)
        chk("the hidden enemy isn't a card",'Lurking' not in await tv.inner_text('#tvLayer'))
        chk("Gregori still rolling",await tv.locator('.tvini .t2wait').count()==1)
        await T(dm,"byId('g').init=4;commit()"); await asyncio.sleep(1.2)
        chk("stays a moment after the last roll",await tv.locator('#tvLayer .tvini').count()==1)
        await asyncio.sleep(3.2)
        chk("then the order",await tv.locator('#tvLayer .tvord').count()==1)
        # TV7
        await T(dm,"state.turn={id:'i',round:1,init:19};state.call={id:'c1',text:'Dex save DC 15',dc:15,at:Date.now(),to:['i','s','g'],answers:{i:18}};commit()"); await asyncio.sleep(1.3)
        chk("roll call fills the TV",await tv.locator('#tvLayer .tvcall').count()==1)
        chk("one card per player",await tv.locator('.tvcall .t2cc').count()==3)
        chk("DC shown",'15' in await tv.inner_text('.tvcall .t2dc'))
        await T(dm,"state.call.answers.s=9;state.call.answers.g=16;commit()"); await asyncio.sleep(1.2)
        chk("results on the cards",await tv.locator('.tvcall .t2pass').count()==2 and await tv.locator('.tvcall .t2fail').count()==1)
        chk("summary",'2 of 3' in await tv.inner_text('.tvcall .t2sum'))
        await asyncio.sleep(10)
        chk("gone 10 s after the last roll",await tv.locator('#tvLayer .tvcall').count()==0 and await tv.locator('#tvLayer .tvsp').count()==1)
        # TV9
        await T(dm,"state.call=null;byId('s').down=true;byId('s').ds={s:2,f:1};state.turn={id:'s',round:1,init:15};commit()"); await asyncio.sleep(1.3)
        chk("death saves on Styx's turn",await tv.locator('#tvLayer .tvds').count()==1)
        chk("two successes, one failure",await tv.locator('.tvds .t2pip.t2s.on').count()==2 and await tv.locator('.tvds .t2pip.t2f.on').count()==1)
        await T(dm,"state.turn={id:'g',round:1,init:4};commit()"); await asyncio.sleep(1.2)
        chk("not on someone else's turn",await tv.locator('#tvLayer .tvds').count()==0)
        # TV6
        await T(dm,"byId('s').down=false;byId('s').ds={s:0,f:0};state.roll={id:'r1',by:'Isandros',kind:'roll',text:'Longsword: d20 (20) +6',total:26,at:dmNow()};commit()"); await asyncio.sleep(1.4)
        chk("dice theatre with a natural 20",await tv.locator('#tvDice.n20').count()==1 and 'Natural 20' in await tv.inner_text('#tvDice'))
        await asyncio.sleep(9)
        chk("gone after 8 s",await tv.locator('#tvDice').count()==0)
        # TV10
        await T(dm,"state.clocks=[{id:'k1',name:'The ritual completes',n:3,max:10}];state.turn={id:'i',round:2,init:19};commit()"); await asyncio.sleep(5)
        chk("countdown ring after the new round",await tv.locator('#moment.tvclk .t2ring').count()==1,await tv.evaluate("()=>document.getElementById('moment')&&document.getElementById('moment').className"))
        # TV14
        await asyncio.sleep(5)
        await T(dm,"byId('d').down=true;state.cstat={Isandros:{d:64,k:1,hits:[{n:30,t:'Lurking Assassin',w:'radiant'}],top:{n:30,t:'Lurking Assassin',w:'radiant'}}};state.nstat={s:{n20:2,n1:0}};endFight();commit()"); await asyncio.sleep(1.5)
        e=await T(dm,"JSON.stringify(state.ended.tv)")
        chk("summary made on the DM's screen",'Victory' in e and '64' in e,e)
        chk("no hidden creature in it",'Lurking' not in e and 'Assassin' not in e,e)
        chk("XP only from enemies the players saw",'"total":18000' in e and '"each":6000' in e,e)
        chk("end screen on the TV",await tv.locator('#tvLayer .tvend').count()==1)
        chk("the TV gets no raw statistics",await tv.evaluate("()=>__t('JSON.stringify([state.cstat||null,state.nstat||null])')")=='[null,null]')
        await T(dm,"state.ended=null;commit()"); await asyncio.sleep(1.2)
        chk("gone when the DM moves on",await tv.locator('#tvLayer .tvend').count()==0)
        chk("no errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
