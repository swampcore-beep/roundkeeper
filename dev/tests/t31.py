import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
# UI polish: Add monsters keeps its place, Prone doesn't tilt the row, effect chips on the light phone, your own roll
# doesn't pop up over the sheet, and the TV's pause time is 24-hour.
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
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.5)
        # ---- Add monsters: a click doesn't jump to the top, the button counts, a new card is lit
        await dm.click('[data-act=sbopen]'); await asyncio.sleep(1.5)
        for q in ['goblin','wolf','skeleton','zombie']:
            await dm.fill('#fetQ',q); await asyncio.sleep(.8); await dm.locator('.fetrow').first.click(); await asyncio.sleep(.9)
        chk("4 cards",await dm.locator('.sbcard').count()==4)
        chk("new card lit",await dm.locator('.sbcard.just').count()==1)
        top=await dm.evaluate("()=>document.querySelector('.sbsheet').scrollTop")
        chk("window followed the new card",top>0,top)
        await dm.locator('[data-act=sbcount][data-i="3"][data-d="1"]').click(); await asyncio.sleep(.3)
        await dm.locator('[data-sbhid="3"]').click(); await asyncio.sleep(.3)
        top2=await dm.evaluate("()=>document.querySelector('.sbsheet').scrollTop")
        chk("clicks keep the scroll",abs(top2-top)<2,(top,top2))
        chk("Add to combat counts monsters",(await dm.inner_text('[data-act=sbadd]')).strip()=="Add to combat (5)")
        fb=await dm.evaluate("()=>{const f=document.querySelector('.sbsheet .sbfoot').getBoundingClientRect(),s=document.querySelector('.sbsheet').getBoundingClientRect();return Math.abs(f.bottom-s.bottom)}")
        chk("footer sits at the bottom of the window",fb<3,fb)
        await dm.keyboard.press('Escape'); await asyncio.sleep(.3)
        # ---- a fight for the screens
        await T(dm,"state.party=[];state.list=[{id:'a',name:'Mira',kind:'pc',cls:'sorcerer',init:17,conds:['Prone'],ds:{s:0,f:0}},{id:'g',name:'Goblin',kind:'enemy',init:12,conds:[],ds:{s:0,f:0}}];state.effects=[{id:'e1',name:'Bless',by:'a',targets:['a'],conc:true},{id:'e2',name:'Fog Cloud',by:'a',area:true,targets:[]}];state.ended=null;commit()")
        await asyncio.sleep(.5)
        tb=await (await b.new_context(viewport={'width':1024,'height':700})).new_page(); tb.on("pageerror",lambda e:errs.append(str(e)))
        await tb.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(3)
        tr=await tb.evaluate("()=>{const li=[...document.querySelectorAll('#plist>li')].find(l=>l.textContent.includes('Mira'));return [getComputedStyle(li).transform,getComputedStyle(li.querySelector('.nm')).transform]}")
        chk("Prone: the row stays level, the name lies down",tr[0]=="none" and tr[1]!="none",tr)
        # ---- light phone: effect chips readable
        pc=await b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
        await pc.add_init_script("""localStorage.setItem('it.meName','"Mira"')""")
        ph=await pc.new_page(); ph.on("pageerror",lambda e:errs.append(str(e))); await ph.goto(rk.PL+'/players'); await asyncio.sleep(1.8)
        await T(ph,"ls.set('pLight',true);renderPlayer()"); await asyncio.sleep(1)
        col=await ph.evaluate("()=>getComputedStyle(document.querySelector('.field-strip .cond.eff')).color")
        chk("battlefield chip is dark on the light screen",col=="rgb(94, 63, 5)",col)
        # ---- your own roll from the sheet: no popup over it
        await T(ph,"pSheet='dice';renderPSheet()"); await asyncio.sleep(.3)
        await T(ph,"state.roll={id:'r1',by:'Mira',kind:'roll',text:'Athletics: d20 (7) +6',total:13,at:dmNow()};surfaceEvents(false)"); await asyncio.sleep(.4)
        n=await ph.evaluate("()=>document.querySelectorAll('.rollnote,.rollpop,.dnote,.sharedroll').length")
        vis=await ph.evaluate("()=>[...document.body.querySelectorAll('div')].filter(d=>/Athletics: d20 \\(7\\)/.test(d.textContent)&&!d.closest('.psheet')&&d.children.length<6).length")
        chk("own roll doesn't pop up",vis==0,(n,vis))
        await T(ph,"state.roll={id:'r2',by:'Goblin',kind:'roll',text:'Bite: d20 (9) +4',total:13,at:dmNow()};surfaceEvents(false)"); await asyncio.sleep(.4)
        vis2=await ph.evaluate("()=>[...document.body.querySelectorAll('div')].filter(d=>/Bite: d20 \\(9\\)/.test(d.textContent)&&!d.closest('.psheet')&&d.children.length<6).length")
        chk("someone else's roll still shows",vis2>0,vis2)
        # ---- TV pause in 24-hour time
        tv=await (await b.new_context(viewport={'width':1280,'height':720},locale='en-US')).new_page(); tv.on("pageerror",lambda e:errs.append(str(e)))
        await tv.goto('http://127.0.0.1:8765/players?shared=1&screen=tv'); await asyncio.sleep(2)
        await T(dm,"state.tv=Object.assign({},state.tv,{pause:{until:Date.now()+600000,msg:''}});commit()"); await asyncio.sleep(1.5)
        s=await tv.evaluate("()=>(document.querySelector('.tvpz .s')||{}).textContent||''")
        chk("pause time has no AM/PM",s and 'AM' not in s and 'PM' not in s,s)
        # ---- no three-letter codes: a crowded fight on an upright tablet keeps full names on its badges
        js="state.layout='auto';state.effects=[{id:'e1',name:'Bless',by:'x0',targets:['x0','x1'],conc:true}];state.turn={id:'x0',round:2,init:20};state.list=["+",".join(f"{{id:'x{i}',name:'{n}',kind:'{k}',init:{20-i},conds:{c},ds:{{s:0,f:0}}}}" for i,(n,k,c) in enumerate([
          ('Isandros','pc',"['Prone','Frightened']"),('Styx','pc',"['Concentrating','Restrained','Blinded','Deafened','Charmed']"),('Astrea','pc',"['Concentrating']"),
          ('Goblin A','enemy',"['Prone']"),('Goblin B','enemy',"['Frightened','Grappled']"),('Goblin C','enemy',"[]"),('Wolf A','enemy',"['Prone']"),('Wolf B','enemy',"[]"),
          ('Skeleton A','enemy',"['Incapacitated','Poisoned','Blinded']"),('Zombie','enemy',"['Grappled']"),('Bandit','enemy',"['Charmed','Frightened']")]))+"];state.ended=null;commit()"
        await T(dm,js); await asyncio.sleep(.5)
        up=await (await b.new_context(viewport={'width':800,'height':1200})).new_page(); up.on("pageerror",lambda e:errs.append(str(e)))
        await up.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(3)
        codes=await up.evaluate(r"()=>[...document.querySelectorAll('#plist .ic > *')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.textContent.trim()).filter(t=>/^(✦ )?[A-Z]{2,3}\d?( \d+)?$/.test(t))")
        chk("no three-letter codes",not codes,codes)
        full=await up.evaluate("()=>[...document.querySelectorAll('#plist .ic .lt')].filter(e=>getComputedStyle(e).display!=='none').length")
        chk("badges show full names",full>=15,full)
        chk("no errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
