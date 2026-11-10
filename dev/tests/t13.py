import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("(s)=>__t(s)",js)
GOB="{name:'Goblin',ctype:'humanoid',size:'Small',ac:15,hp:7,hpf:'',ib:2,cr:'1/4',lr:0,la:0,uses:[],rech:[],know:[],raw:'',count:4,hidden:false,boss:false}"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on('pageerror',lambda e:errs.append('dm '+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1)
        await T(dm,"localStorage.removeItem('it.initMode');sbInitMode='group';state.list=[];commit()")
        await T(dm,f"sbItems=[{GOB}];sbSheet()"); await asyncio.sleep(.3)
        chk("three choices for a group",await dm.locator('.sbinit button').count()==3)
        chk("default once for the group",await dm.locator('.sbinit button[data-m=group][aria-pressed=true]').count()==1)
        await dm.locator('.sbcard').screenshot(path='t13_card.png')
        await dm.click('.sbinit button[data-m=each]'); await dm.click('[data-act=sbadd]'); await asyncio.sleep(.4)
        inits=json.loads(await T(dm,"JSON.stringify(state.list.map(c=>c.init))"))
        chk("each rolled separately (3..22)",len(inits)==4 and all(3<=v<=22 for v in inits),inits)
        many=set()
        for k in range(6):
            await T(dm,f"state.list=[];sbItems=[{GOB}];sbSheet()"); await dm.click('[data-act=sbadd]'); await asyncio.sleep(.15)
            many|=set(json.loads(await T(dm,"JSON.stringify(state.list.map(c=>c.init))")))
        chk("choice remembered: rolls differ across goblins",len(many)>2,sorted(many))
        await T(dm,f"state.list=[];sbItems=[{GOB}];sbSheet()"); await asyncio.sleep(.2)
        await dm.click('.sbinit button[data-m=hand]'); await dm.click('[data-act=sbadd]'); await asyncio.sleep(.4)
        chk("by hand: no initiative",json.loads(await T(dm,"JSON.stringify(state.list.map(c=>c.init))"))==[None]*4)
        ph=await dm.get_attribute('#roster .row .init-in','placeholder')
        chk("empty field shows the bonus",ph=="+2",ph)
        await dm.screenshot(path='t13_dm.png')
        first=await T(dm,"state.list[0].id")
        await dm.fill(f'#init-{first}','17'); await dm.press(f'#init-{first}','Enter'); await asyncio.sleep(.3)
        chk("typed 17 kept",await T(dm,f"byId('{first}').init")==17)
        await T(dm,f"state.list=[];sbItems=[{GOB}];sbSheet()"); await asyncio.sleep(.2)
        chk("next window remembers 'I'll roll'",await dm.locator('.sbinit button[data-m=hand][aria-pressed=true]').count()==1)
        await dm.click('.sbinit button[data-m=group]'); await dm.click('[data-act=sbadd]'); await asyncio.sleep(.3)
        chk("group: one shared roll",len(set(json.loads(await T(dm,"JSON.stringify(state.list.map(c=>c.init))"))))==1)
        await T(dm,f"state.list=[];sbItems=[Object.assign({GOB},{{count:1}})];sbSheet()"); await asyncio.sleep(.2)
        chk("single monster: two choices",await dm.locator('.sbinit button').count()==2)
        await dm.keyboard.press('Escape')
        # players never get the bonus
        import urllib.request
        st=json.loads(urllib.request.build_opener(urllib.request.ProxyHandler({})).open(rk.PL+'/state').read())
        chk("bonus not sent to players",all('ib' not in c for c in st['list']))
        chk("no page errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
