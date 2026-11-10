import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# Reddit video: the DM laptop, the tablet, the TV and a phone, recorded at the same time during one fight
# (SRD-only server). Each page is captured with a CDP screencast; frames + event marks go to reddit/raw.
import asyncio,sys,os,json,time,base64,shutil
from scene import setup
from playwright.async_api import async_playwright
TGT=sys.argv[1]
O=rk.MEDIA+'/four-video/raw_'+TGT+'/'
shutil.rmtree(O,ignore_errors=True);os.makedirs(O)
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
TH,SC="tavern","avernus"
BASE=(";state.weather='none';state.tod='none';state.tune={};state.sceneFx={};state.sceneReact=true;state.layout='landscape';"
      "byId('i').php={cur:44,max:52,temp:0,at:Date.now()};byId('a').php={cur:21,max:38,temp:5,at:Date.now()};commit()")
marks=[];frames={}
async def cast(ctx,pg,name,q=88):
    os.makedirs(O+name);frames[name]=[]
    cdp=await ctx.new_cdp_session(pg)
    def on(ev):
        ts=ev['metadata']['timestamp'];fn=f"{O}{name}/{len(frames[name]):05d}.jpg"
        open(fn,'wb').write(base64.b64decode(ev['data']));frames[name].append((ts,fn))
        asyncio.ensure_future(cdp.send('Page.screencastFrameAck',{'sessionId':ev['sessionId']}))
    cdp.on('Page.screencastFrame',on)
    await cdp.send('Page.startScreencast',{'format':'jpeg','quality':q,'everyNthFrame':1})
    return cdp
def mark(cap): marks.append((time.time(),cap));print(round(time.time()-marks[0][0],1) if marks else 0,cap)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server'])
        dmc=await b.new_context(viewport={'width':1440,'height':900});dm=await dmc.new_page()
        await dm.goto(rk.DM+'/');await asyncio.sleep(1.5)
        async def S(js,w=0): await T(dm,js);await asyncio.sleep(w)
        st=setup(TH,SC,True,"i").replace("Scourge of the Sword Coast","Scourge of the Ashen Peaks")+BASE
        await S(st,.8)
        tb=tv=ph=None
        if TGT=='tablet':
            tbc=await b.new_context(viewport={'width':1200,'height':800});tb=await tbc.new_page()
            await tb.goto(rk.PL+'/players?shared=1')
        if TGT=='tv':
            tvc=await b.new_context(viewport={'width':1280,'height':720});tv=await tvc.new_page()
            await tv.goto(rk.DM+'/players?shared=1&screen=tv')
        if TGT=='phone':
            phc=await b.new_context(viewport={'width':390,'height':844},has_touch=True);ph=await phc.new_page()
            await ph.goto(rk.PL+'/players');await asyncio.sleep(1.5)
            await ph.click('[data-act=pickme][data-n=Isandros]');await asyncio.sleep(1)
            await T(ph,"hpSet({cur:44,max:52,temp:0,auto:true});renderPlayer()")
        await asyncio.sleep(3)
        c,pg={'dm':(dmc,dm),'tablet':(tb and tbc,tb),'tv':(tv and tvc,tv),'phone':(ph and phc,ph)}[TGT]
        await cast(c,pg,TGT)
        await asyncio.sleep(1.5)
        nxt=lambda: dm.click('[data-act=tnext]')
        mark("start")
        mark("Next turn on the laptop, and every screen follows");await asyncio.sleep(2.2)
        await nxt();await asyncio.sleep(2.0)
        await nxt();await asyncio.sleep(1.4)
        mark("A natural 20 lights up the table")
        await S("state.roll={id:uid(),at:Date.now(),kind:'nat20',by:'Styx',text:'Attack',total:20};commit()",3.6)
        await nxt();await asyncio.sleep(1.2);await nxt();await asyncio.sleep(1.2);await nxt();await asyncio.sleep(1.0)
        mark("Fireball on three goblins")
        await S("state.spfx={id:uid(),at:Date.now(),n:'Fireball',t:'fire',from:'gr',to:['g1','g2','g3']};commit()",2.6)
        await S("for(const k of ['g1','g3']){const g=byId(k);g.hp=0;g.down=true};const h=byId('g2');h.hp=3;h.bloodied=true;commit()",2.4)
        mark("The boss arrives")
        await S("byId('d').hidden=false;byId('d').introAt=Date.now();commit()",6.0)
        await S("state.turn={round:3,id:'d',init:22};commit()",1.2)
        mark("Fire Breath: the players roll the save on their phones")
        await S("state.call={id:'c'+Date.now(),text:'Dexterity save DC 21 · Fire Breath',dc:21,at:Date.now(),to:['i','s','a','gr'],answers:{}};commit()",1.6)
        if ph:
            for k in "23": await ph.click(f'[data-act=pkey][data-k="{k}"]');await asyncio.sleep(.35)
            await ph.click('[data-act=pcallsend]');await asyncio.sleep(.6)
        else:
            await asyncio.sleep(.7);await S("state.call.answers=Object.assign({},state.call.answers,{i:23});commit()",.6)
        await S("state.call.answers=Object.assign({},state.call.answers,{s:12});commit()",.7)
        await S("state.call.answers=Object.assign({},state.call.answers,{a:19});commit()",.7)
        await S("state.call.answers=Object.assign({},state.call.answers,{gr:8});commit()",2.4)
        await S("delete state.call;commit()",.4)
        mark("Players keep their own HP")
        if ph:
            await ph.click('.tile[data-act=php]');await asyncio.sleep(.8)
            for k in "30":
                q=f'#overlay [data-k="{k}"]'
                if await ph.query_selector(q): await ph.click(q)
                await asyncio.sleep(.4)
            await asyncio.sleep(.4)
            if await ph.query_selector('[data-act=phpdo][data-hp=dmg]'): await ph.click('[data-act=phpdo][data-hp=dmg]')
            await asyncio.sleep(1.3)
            await T(ph,"pSheet=null;renderPSheet()")
            await asyncio.sleep(.9)
        else: await asyncio.sleep(4.4)
        await S("state.turn={round:3,id:'i',init:19};commit()",1.4)
        mark("The dragon falls")
        await S("byId('d').hp=0;byId('d').down=true;state.hdywt={id:uid(),pc:'i',name:'Isandros',cls:'paladin',boss:'Adult Red Dragon',at:Date.now()};commit()",5.0)
        mark("end")
        await asyncio.sleep(.5)
        json.dump({'marks':marks,'frames':frames},open(O+'index.json','w'))
        print({k:len(v) for k,v in frames.items()})
        for cdp in []: pass
        await pg.close()
        await b.close()
asyncio.run(main())
