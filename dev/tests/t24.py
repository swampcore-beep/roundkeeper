import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json,os,shutil,io,urllib.request
from PIL import Image
from playwright.async_api import async_playwright
F=rk.SRV
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x if not c or x else "")
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
def get(u):
    try: r=urllib.request.urlopen(u,timeout=5);return r.status,r.read()
    except urllib.error.HTTPError as e: return e.code,b""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(2)
        pics=json.loads(get('http://127.0.0.1:8765/5et/pics')[1]); chk("pictures from the test zip",pics['count']==1 and pics['from']==['5etools-img-test.zip'],pics)
        chk("phones can't ask",get(rk.PL+'/5et/pics')[0]==403)
        await T(dm,"picsSheet()"); await asyncio.sleep(.5)
        t=await dm.locator('.sheet').inner_text(); chk("Pictures sheet: count and where to put them",'1 monster pictures' in t and 'img/bestiary' in t and 'doesn\'t download' not in t,t[:300])
        # a picture folder appears: Check again finds it without a restart
        d=os.path.join(F,'5etools','img','bestiary','MM'); os.makedirs(d,exist_ok=True)
        im=Image.new('RGB',(200,140),(30,60,120)); im.save(os.path.join(d,'Lich.webp'),'WEBP')
        await dm.click('[data-act=picscheck]'); await asyncio.sleep(6)
        pics=json.loads(get('http://127.0.0.1:8765/5et/pics')[1]); chk("the folder is read after Check again",pics['count']==2 and '5etools/img/bestiary' in pics['from'],pics)
        chk("…and served to the DM",get('http://127.0.0.1:8765/5et/img?p=bestiary/mm/lich.webp')[0]==200)
        await dm.keyboard.press('Escape')
        # own picture, remembered for the next one of that monster
        await T(dm,"state.list.push(Object.assign(newCombatant({id:'g',name:'Goblin A',base:'Goblin',kind:'enemy',init:9}),{sb:{raw:'## Goblin\\n**Armor Class** 15',uses:[],rech:[],know:[]}}));commit()")
        await T(dm,"sbViewId='g';sbLoreOn=true;renderSbDrawer()"); await asyncio.sleep(.3)
        chk("Picture button for a monster without 5e.tools",await dm.locator('#sbDrawer [data-act=sblore]').inner_text()=='Picture')
        buf=io.BytesIO();Image.new('RGB',(120,90),(200,40,40)).save(buf,'PNG')
        await dm.set_input_files('#picFile',files=[{'name':'gob.png','mimeType':'image/png','buffer':buf.getvalue()}]); await asyncio.sleep(1.5)
        f=await T(dm,"byId('g').introImg"); chk("uploaded and set",bool(f) and get(f'{rk.PL}/bg/{f}')[0]==200,f)
        chk("remembered for Goblins",await T(dm,"state.monPics['b:goblin']")==f)
        await T(dm,"sbItems=[Object.assign(parseStatblock('## Goblin\\n**Armor Class** 15\\n**Hit Points** 7 (2d6)'),{name:'Goblin',raw:'## Goblin\\n**Armor Class** 15\\n**Hit Points** 7 (2d6)',count:1})];sbAdd()"); await asyncio.sleep(.3)
        chk("the next Goblin gets it",await T(dm,"state.list.filter(c=>c.base==='Goblin'&&c.id!=='g').every(c=>c.introImg===state.monPics['b:goblin'])"))
        await T(dm,"sbViewId='g';renderSbDrawer()"); await dm.click('#sbDrawer [data-act=loreimgoff]'); await asyncio.sleep(.3)
        chk("Remove forgets it",not await T(dm,"!!(state.monPics||{})['b:goblin']"))
        chk("no page errors",not errs,errs)
        await b.close()
    shutil.rmtree(os.path.join(F,'5etools','img'),ignore_errors=True)
    print("t24: ",("fails=0" if ok else "fails=1"))
asyncio.run(main())
