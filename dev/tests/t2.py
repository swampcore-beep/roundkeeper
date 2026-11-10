import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("()=>__t(`"+js+"`)")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/')
        await T(dm,"state.party=[];state.list=[{id:'a',name:'Sydon',kind:'enemy',boss:true,title:'God of Storms',init:22,conds:[],ds:{s:0,f:0}},{id:'b',name:'Medusa',kind:'pc',cls:'rogue',init:17,conds:[],ds:{s:0,f:0}},{id:'c',name:'Styx',kind:'pc',cls:'cleric',init:14,conds:['Poisoned'],ds:{s:0,f:0}},{id:'d',name:'Gregori',kind:'pc',cls:'fighter',init:11,conds:[],ds:{s:0,f:0}},{id:'e',name:'Ghoul',kind:'enemy',init:9,conds:[],ds:{s:0,f:0}}];state.ended=null;commit()")
        sfs={}
        for tag,(w,h) in {'portrait':(912,1368),'landscape':(1368,912)}.items():
            c=await b.new_context(viewport={'width':w,'height':h}); pg=await c.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto(rk.PL+'/players?shared=1'); sfs[tag]=pg
        pc=await b.new_context(viewport={'width':390,'height':844},has_touch=True)
        await pc.add_init_script("""localStorage.setItem('it.meName','"Medusa"')""")
        ph=await pc.new_page(); ph.on("pageerror",lambda e:errs.append(str(e))); await ph.goto(rk.PL+'/players'); await asyncio.sleep(2)
        # phone sets Burning on itself
        await T(ph,"pSend({action:'cond',cond:'Burning',on:true})"); await asyncio.sleep(1.5)
        conds=await T(dm,"JSON.stringify(byId('b').conds)")
        chk("phone can set Burning",'Burning' in conds,conds)
        # DM sets Burning on Sydon via condition sheet
        await dm.click('.row[data-id=a] [data-act=rowmenu]'); await dm.click('.row[data-id=a] .rmenu [data-act=conds]')
        await dm.click('#overlay [data-act=pickcond][data-n=Burning]'); await dm.click('#overlay .btn.primary'); await asyncio.sleep(.25)
        await sfs['portrait'].screenshot(path='burn_moment.png')
        await asyncio.sleep(2.5)
        chk("Surface row has burning fx",await sfs['portrait'].locator('li[data-id=a] .fx-burning').count()==1)
        chk("Surface badge Burning",await sfs['portrait'].locator('li[data-id=a] .c-burning').count()==1)
        await sfs['portrait'].screenshot(path='burn_portrait.png')
        # hourglass
        await T(dm,"startTimer(byId('b'))"); await asyncio.sleep(1.5)
        bb=await sfs['portrait'].locator('#hourglass').bounding_box()
        chk("Surface hourglass is big",bb and bb['width']>700 and bb['height']>90,bb)
        await sfs['portrait'].screenshot(path='hg_portrait.png'); await sfs['landscape'].screenshot(path='hg_landscape.png')
        chk("DM pill shows",await dm.locator('#dmTimer').count()==1)
        await dm.screenshot(path='dm_pill.png')
        await dm.click('#dmTimer [data-act=tadd]'); await asyncio.sleep(.3)
        chk("+10 s",await T(dm,"state.timer.secs")==40)
        await dm.click('#dmTimer [data-act=tstop]'); await asyncio.sleep(1.5)
        chk("stopped on DM",await T(dm,"state.timer")is None and await dm.locator('#dmTimer').count()==0)
        chk("gone from Surface",await sfs['portrait'].locator('#hourglass').count()==0)
        # T key toggles
        await T(dm,"startTimer(byId('b'))"); await asyncio.sleep(.2); await T(dm,"startTimer(byId('b'))")
        chk("T twice stops",await T(dm,"state.timer") is None)
        # roll banner
        await T(ph,"pSend({action:'roll',kind:'roll',text:'1d20+5 (14)',total:19})"); await asyncio.sleep(1.6)
        rb=await sfs['portrait'].locator('.rollbanner').bounding_box()
        chk("Surface roll banner is big",rb and rb['height']>90,rb)
        await sfs['portrait'].screenshot(path='roll_portrait.png'); await sfs['landscape'].screenshot(path='roll_landscape.png')
        pb=await ph.locator('.rollbanner').bounding_box()
        chk("phone banner stays phone-sized",pb is None or pb['height']<80,pb)
        chk("no errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
