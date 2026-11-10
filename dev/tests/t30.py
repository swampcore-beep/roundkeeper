import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
# Tracker circles: the phone's Resources (tap uses or gives back one, groups of five, change or delete from the name,
# two-tap Delete with Undo) and the DM's statblock pips (full ones first, tap uses or gives back one).
import asyncio,json
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
        await T(dm,"state.party=[];state.list=[{id:'a',name:'Lich',kind:'enemy',init:22,conds:[],ds:{s:0,f:0},sb:{raw:'',lr:{max:3,used:0},la:{max:3,used:0},uses:[],rech:[]}},{id:'b',name:'Mira',kind:'pc',cls:'sorcerer',init:17,conds:[],ds:{s:0,f:0}}];state.ended=null;commit()")
        await asyncio.sleep(.4)
        # ---- DM statblock pips
        lr=dm.locator('.row[data-id="a"] .sbpip[data-k=lr]')
        chk("3 LR pips",await lr.count()==3)
        await lr.nth(0).click(); await asyncio.sleep(.2)
        chk("first full pip uses one",await T(dm,"byId('a').sb.lr.used")==1)
        cls=await lr.evaluate_all("els=>els.map(e=>e.classList.contains('used'))")
        chk("spent pip is at the end",cls==[False,False,True],cls)
        await lr.nth(0).click(); await asyncio.sleep(.2)
        chk("another full pip uses one more",await T(dm,"byId('a').sb.lr.used")==2)
        await lr.nth(2).click(); await asyncio.sleep(.2)
        chk("a spent pip gives one back",await T(dm,"byId('a').sb.lr.used")==1)
        # ---- phone Resources
        pc=await b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=2)
        await pc.add_init_script("""localStorage.setItem('it.meName','"Mira"')""")
        ph=await pc.new_page(); ph.on("pageerror",lambda e:errs.append(str(e))); await ph.goto(rk.PL+'/players'); await asyncio.sleep(1.8)
        await T(ph,"resSet([{name:'Sorcery Points',max:9,cur:6,reset:'long'},{name:'Spell slot 1',max:4,cur:4,reset:'long'},{name:'Lay on Hands',max:25,cur:25,reset:'long'}]);pSheet='res';renderPSheet()")
        await asyncio.sleep(.3)
        await ph.screenshot(path='res_pips.png')
        chk("no delete X in the list",await ph.locator('.psheet [data-act=rdel]').count()==0)
        sp=ph.locator('.rcard').nth(0)
        chk("9 pips in two groups (5 + 4)",await sp.locator('.rgrp').count()==2 and await sp.locator('.rgrp').nth(1).locator('.rpip').count()==4)
        await sp.locator('.rpip').nth(0).tap(); await asyncio.sleep(.2)
        cur=lambda i: T(ph,f"resGet()[{i}].cur")
        chk("tap on the first full pip uses only one",await cur(0)==5,await cur(0))
        await ph.locator('.rcard').nth(0).locator('.rpip').nth(8).tap(); await asyncio.sleep(.2)
        chk("tap on any empty pip gives one back",await cur(0)==6,await cur(0))
        on=await ph.locator('.rcard').nth(0).locator('.rpip').evaluate_all("els=>els.map(e=>e.classList.contains('on'))")
        chk("full pips first",on==[True]*6+[False]*3,on)
        chk("big tracker keeps − and +",await ph.locator('.rcard').nth(2).locator('[data-act=rstep]').count()==2)
        # Change from the name
        await ph.locator('.rcard').nth(1).locator('[data-act=redit]').tap(); await asyncio.sleep(.3)
        chk("edit sheet opens",await ph.locator('.psheet [data-act=rdel]').count()==1)
        await ph.tap('[data-act=rmax][data-d="1"]'); await asyncio.sleep(.15)
        await ph.tap('[data-act=reditreset][data-r=short]'); await asyncio.sleep(.15)
        r=json.loads(await T(ph,"JSON.stringify(resGet()[1])"))
        chk("max and recovery changed",r['max']==5 and r['reset']=='short' and r['cur']==4,r)
        await ph.screenshot(path='res_edit.png')
        # Delete: first tap only arms it
        await ph.tap('[data-act=rdel]'); await asyncio.sleep(.2)
        chk("one tap doesn't delete",await T(ph,"resGet().length")==3)
        chk("button asks again",'again' in (await ph.inner_text('[data-act=rdel]')).lower())
        await ph.tap('[data-act=rdel]'); await asyncio.sleep(.3)
        chk("second tap deletes",await T(ph,"resGet().map(r=>r.name).join()")=="Sorcery Points,Lay on Hands")
        chk("back on the list",await ph.locator('.rcard').count()==2)
        chk("toast offers Undo",await ph.locator('#toast:not([hidden]) [data-act=toastundo]').count()==1)
        await ph.screenshot(path='res_deleted.png')
        await ph.tap('#toast [data-act=toastundo]'); await asyncio.sleep(.3)
        chk("Undo puts it back in its place",await T(ph,"resGet().map(r=>r.name+':'+r.cur+'/'+r.max).join()")=="Sorcery Points:6/9,Spell slot 1:4/5,Lay on Hands:25/25")
        chk("list shows it again",await ph.locator('.rcard').count()==3)
        chk("no errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
