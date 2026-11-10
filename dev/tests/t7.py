import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json,urllib.request
from playwright.async_api import async_playwright
op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("()=>__t(`"+js+"`)")
D=rk.PRIV+'/sb/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(.6)
        await T(dm,"state.party=[];state.list=[{id:'p',name:'Medusa',kind:'pc',cls:'rogue',init:17,conds:[],ds:{s:0,f:0}},{id:'q',name:'Styx',kind:'pc',cls:'cleric',init:12,conds:[],ds:{s:0,f:0}}];commit()")
        await dm.click('[data-act=sbopen]'); await dm.set_input_files('#sbFile',[D+'gyreguard.md',D+'lich.md']); await asyncio.sleep(.4); await dm.click('[data-act=sbadd]'); await asyncio.sleep(.6)
        lib=json.loads(op.open('http://127.0.0.1:8765/library').read())
        chk("library saved on server",sorted(e['name'] for e in lib)==['Aarakocra Gyreguard','Lich'],[e['name'] for e in lib])
        # open drawer
        gid=await T(dm,"state.list.find(c=>c.name==='Aarakocra Gyreguard').id")
        await dm.click(f'.row[data-id="{gid}"] [data-act=sbview]'); await asyncio.sleep(.3)
        chk("drawer open",await dm.locator('#sbDrawer').count()==1)
        chk("buttons found",await dm.locator('#sbDrawer .sbr.hit').count()>=1 and await dm.locator('#sbDrawer .sbr.dmg').count()>=3 and await dm.locator('#sbDrawer .sbr.save').count()==1,
            (await dm.locator('#sbDrawer .sbr.hit').count(),await dm.locator('#sbDrawer .sbr.dmg').count(),await dm.locator('#sbDrawer .sbr.save').count()))
        await dm.click('#sbDrawer [data-act=sbadv][data-v=adv]'); await dm.click('#sbDrawer .sbr.hit >> nth=0'); await asyncio.sleep(.1)
        top=await dm.locator('.sbl').first.inner_text(); chk("hit roll logged",'Shocking Claw' in top and 'adv' in top,top.replace('\n',' | '))
        await T(dm,"sbCrit=true;renderSbDrawer()"); await dm.click('#sbDrawer .sbr.dmg[data-d="3d8"]'); await asyncio.sleep(.1)
        top=await dm.locator('.sbl').first.inner_text(); chk("crit doubles dice",'6d8' in top and 'crit' in top,top.replace('\n',' | '))
        await dm.click('#sbDrawer .sbr.save'); await asyncio.sleep(.1)
        await dm.click('#sbDrawer [data-act=sbasktgt][data-id=q]'); await dm.click('#sbDrawer [data-act=sbasksend]'); await asyncio.sleep(.3)
        call=json.loads(await T(dm,"JSON.stringify(state.call)"))
        chk("roll call sent to Medusa only",call['dc']==15 and call['to']==['p'] and 'Dexterity save DC 15' in call['text'],call)
        await dm.screenshot(path='drawer.png')
        # lich drawer
        lid=await T(dm,"state.list.find(c=>c.name==='Lich').id")
        await dm.click(f'.row[data-id="{lid}"] [data-act=sbview]'); await asyncio.sleep(.3)
        chk("switch to lich",'Lich' in await dm.locator('#sbDrawer h3').inner_text())
        await dm.screenshot(path='drawer_lich.png')
        await dm.keyboard.press('Escape'); await asyncio.sleep(.2)
        chk("Esc closes",await dm.locator('#sbDrawer').count()==0)
        # library in sheet
        await dm.click('[data-act=sbopen]'); await asyncio.sleep(.2)
        chk("library list",await dm.locator('.librow').count()==2)
        await dm.fill('#libQ','lic'); await asyncio.sleep(.1)
        chk("library search",await dm.locator('.librow').count()==1)
        await dm.click('[data-act=libuse]'); await asyncio.sleep(.2)
        chk("library -> card",await dm.locator('.sbcard').count()==1)
        await dm.screenshot(path='libsheet.png')
        await dm.click('[data-act=sbadd]'); await asyncio.sleep(.4)
        chk("second lich",await T(dm,"state.list.filter(c=>c.base==='Lich').length")==2)
        # players can't read the library
        try: op.open(rk.PL+'/library'); r=None
        except urllib.error.HTTPError as e: r=e.code
        chk("library is laptop-only",r==403,r)
        pub=json.loads(op.open(rk.PL+'/state').read()); chk("no sb in public",all('sb' not in c for c in pub['list']))
        chk("no errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
