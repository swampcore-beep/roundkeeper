import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
# 1.4.1, the TV: Bloodied, Down, Stable and Dead on every card (a player's Bloodied never reached the TV); when the creature
# whose turn it is isn't on the TV (hidden, or defeated before Next turn) the spotlight says "Up next" instead of naming
# someone else "On turn"; a roll call nobody has answered doesn't say "0 of 0"; the end card has no minutes.
import asyncio
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("()=>__t(`"+js+"`)")
LIST=("state.party=[];state.list=[{id:'i',name:'Isandros',kind:'pc',cls:'paladin',init:19,conds:[],ds:{s:0,f:0}},"
      "{id:'s',name:'Styx',kind:'pc',cls:'bard',init:15,conds:[],ds:{s:0,f:0}},"
      "{id:'o',name:'Orc',kind:'enemy',init:14,conds:[],ds:{s:0,f:0},hp:15,hpMax:15},"
      "{id:'g',name:'Gregori',kind:'pc',cls:'wizard',init:10,conds:[],ds:{s:0,f:0}},"
      "{id:'x',name:'Lurking Assassin',kind:'enemy',hidden:true,init:8,conds:[],ds:{s:0,f:0}}];"
      "state.turn=null;state.ended=null;state.call=null;state.clocks=[];state.roll=null;state.effects=[];state.lair=false;state.fightAt=Date.now();")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto(rk.DM+'/'); await asyncio.sleep(1.2)
        await T(dm,LIST+"commit()"); await asyncio.sleep(.5)
        tv=await (await b.new_context(viewport={'width':1920,'height':1080})).new_page(); tv.on("pageerror",lambda e:errs.append(str(e)))
        await tv.goto(rk.PL+'/players?shared=1&screen=tv'); await asyncio.sleep(2.5)
        await T(dm,"state.turn={id:'i',round:1,init:19};commit()"); await asyncio.sleep(4.5)
        chk("the spotlight is Isandros",'Isandros' in await tv.inner_text('.tvsp .spot .big'))
        # a player's Bloodied, set by the DM
        await T(dm,"byId('i').bloodied=true;byId('s').down=true;byId('o').bloodied=true;commit()"); await asyncio.sleep(1.5)
        chk("Bloodied on the player in the spotlight",await tv.locator('.tvsp .spot .chips .tvst.st-bloodied').count()==1)
        chk("…with a red edge",await tv.locator('.tvsp .spot.st-bloodied').count()==1)
        deck=await tv.inner_text('.tvsp .deck')
        chk("Down on a player on deck",await tv.locator('.tvsp .deck .card.st-down .tvst').count()==1 and 'Down' in deck,deck)
        chk("Bloodied on an enemy on deck",await tv.locator('.tvsp .deck .card.st-bloodied .tvst').count()==1)
        await T(dm,"byId('s').ds={s:3,f:0};commit()"); await asyncio.sleep(1.2)
        chk("Stable once three saves",'Stable' in await tv.inner_text('.tvsp .deck'))
        await T(dm,"byId('s').ds={s:0,f:3};commit()"); await asyncio.sleep(1.2)
        chk("Dead after three failures",'Dead' in await tv.inner_text('.tvsp .deck'))
        await T(dm,"byId('s').ds={s:0,f:0};commit()"); await asyncio.sleep(.6)
        # order mode shows them too
        await T(dm,"state.tv=Object.assign({},state.tv,{mode:'order'});commit()"); await asyncio.sleep(1.5)
        chk("order cards carry Bloodied and Down",await tv.locator('.tvord .cd.st-bloodied').count()==2 and await tv.locator('.tvord .cd.st-down').count()==1)
        await T(dm,"state.tv=Object.assign({},state.tv,{mode:'auto'});commit()"); await asyncio.sleep(1.2)
        # the hidden creature's turn: nobody else is named "On turn"
        await T(dm,"state.turn={id:'x',round:1,init:8};commit()"); await asyncio.sleep(1.8)
        eb=await tv.inner_text('.tvsp .spot .eyeb'); big=await tv.inner_text('.tvsp .spot .big')
        chk("a hidden creature's turn: Up next, not On turn",'UP NEXT' in eb.upper() and 'ON TURN' not in eb.upper(),eb)
        chk("…and up next is the top of the order",'Isandros' in big,big)
        chk("…without 'your move'",'your move' not in await tv.inner_text('.tvsp .spot .sub'))
        chk("…the hidden one is nowhere",'Lurking' not in await tv.inner_text('#tvLayer'))
        # a defeated enemy still holding the turn
        await T(dm,"state.turn={id:'o',round:1,init:14};commit()"); await asyncio.sleep(1.8)
        chk("the Orc's turn: Orc in the spotlight",'Orc' in await tv.inner_text('.tvsp .spot .big'))
        await T(dm,"byId('o').hp=0;byId('o').down=true;commit()"); await asyncio.sleep(2.5)
        eb=await tv.inner_text('.tvsp .spot .eyeb'); big=await tv.inner_text('.tvsp .spot .big')
        chk("defeated before Next turn: Up next Gregori",'UP NEXT' in eb.upper() and 'Gregori' in big,(eb,big))
        chk("no NEXT tag on deck while the spotlight is the next one",await tv.locator('.tvsp .deck .tag').count()==0)
        await T(dm,"state.turn={id:'g',round:1,init:10};commit()"); await asyncio.sleep(1.8)
        chk("back to On turn",'ON TURN' in (await tv.inner_text('.tvsp .spot .eyeb')).upper())
        # a roll call nobody has answered
        await T(dm,"state.call={id:'c1',text:'Wisdom save',dc:13,at:Date.now(),to:['i','g'],answers:{}};commit()"); await asyncio.sleep(1.4)
        s=await tv.inner_text('.tvcall .t2sum')
        chk("no '0 of 0' before the first answer",'0 of' not in s.lower() and 'Waiting for' in s,s)
        await T(dm,"state.call.answers.i=15;commit()"); await asyncio.sleep(1.2)
        s=await tv.inner_text('.tvcall .t2sum')
        chk("then the count",'1 of 1' in s.lower() and 'waiting for Gregori' in s,s)
        await T(dm,"state.call=null;commit()"); await asyncio.sleep(.8)
        # the end card: rounds, no minutes
        await T(dm,"endFight();commit()"); await asyncio.sleep(1.5)
        e=await tv.inner_text('#tvLayer .tvend')
        chk("end card without minutes",'minute' not in e and 'round' in e,e)
        await T(dm,"state.ended=null;commit()"); await asyncio.sleep(.5)
        chk("no errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
