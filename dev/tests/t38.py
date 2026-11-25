import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py:
# 1.4 on the phones: the "Your turn" screen (and turning it off), the table's roll log (E18, and what it carries to the players),
# the aura reminder in a save roll call (E19), Bless and Bane on saves and attacks, and the HP sheet's "18 → 12".
import asyncio,json
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto(rk.DM+'/'); await asyncio.sleep(1.5)
        await T(dm,"""state.list=EXAMPLE();state.list.forEach((c,i)=>{if(typeof c.init!=='number')c.init=20-i});
          state.list.push({id:'gob',kind:'enemy',name:'Goblin',init:1,hpMax:7,hp:7,hidden:true,conds:[]});commit()"""); await asyncio.sleep(.5)
        pcs=await T(dm,"state.list.filter(c=>c.kind==='pc').map(c=>({id:c.id,name:c.name}))")
        A,B=pcs[0],pcs[1]
        ph=await (await b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)).new_page(); ph.on("pageerror",lambda e:errs.append("phone: "+str(e)))
        await ph.goto(rk.PL+'/players'); await asyncio.sleep(1.2)
        await ph.click(f'[data-act=pickme][data-n="{A["name"]}"]'); await asyncio.sleep(1.5)
        # ---- Your turn: a screen with what matters, on by default
        await T(dm,f"byId('{A['id']}').conds=['Prone'];byId('{B['id']}').conds=['Concentrating'];state.effects=[{{id:'e1',name:'Bless',by:'{B['id']}',targets:['{A['id']}'],conc:true,rounds:10,at:1}}];commit()")
        await asyncio.sleep(.8)
        await T(dm,f"state.turn={{round:1,id:'{A['id']}',init:byId('{A['id']}').init}};commit()"); await asyncio.sleep(2)
        h=await ph.locator('.psheet .shead h2').inner_text() if await ph.locator('.psheet .shead h2').count() else ''
        chk("phone: Your turn screen opens on my turn",'Your turn' in h,h)
        txt=await ph.locator('.psheet .ytcs').inner_text() if await ph.locator('.psheet .ytcs').count() else ''
        chk("…it says I'm Prone and what that means",'Prone' in txt and 'half your Speed' in txt,txt[:120])
        chk("…and that Bless is on me, from whom",'Bless' in txt and B['name'] in txt,txt[:200])
        chk("…with a way to stand up",await ph.locator('.psheet .ytcs [data-act=pcond][data-n=Prone]').count()==1)
        await ph.screenshot(path='t38-turn.png')
        await ph.click('.psheet .ytcs [data-act=pcond][data-n=Prone]'); await asyncio.sleep(1.5)
        chk("standing up removes Prone",'Prone' not in await T(dm,f"byId('{A['id']}').conds"))
        await T(ph,"pSheet=null;renderPSheet()")
        await ph.click('.pbar [data-act=pmore]'); await asyncio.sleep(.3)
        chk("More has the Your turn screen switch",await ph.locator('[data-act=pturncard]').count()==1)
        await ph.click('[data-act=pturncard]'); await asyncio.sleep(.2)
        chk("…which turns it off",await T(ph,"pTurnCard()")==False)
        await T(ph,"pSheet=null;renderPSheet()")
        await T(dm,f"state.turn={{round:1,id:'{B['id']}',init:0}};commit()"); await asyncio.sleep(1.2)
        await T(dm,f"state.turn={{round:2,id:'{A['id']}',init:0}};commit()"); await asyncio.sleep(2)
        chk("off: no screen on my turn",await ph.locator('.psheet .ytcs').count()==0)
        await T(ph,"ls.set('pTurnCard',true)")
        # ---- Bless on saves and attacks, not on checks
        s=await T(ph,"shRoll('Dex save',2).text"); chk("Bless goes onto a save",'Bless' in s,s)
        s=await T(ph,"shRoll('Rapier to hit',5).text"); chk("…and an attack",'Bless' in s,s)
        s=await T(ph,"shRoll('Perception',4).text"); chk("…not a skill check",'Bless' not in s,s)
        # ---- E18: the rolls people show the table
        await T(ph,"dice.share=true;pSend({action:'roll',kind:'roll',text:'Dex save: d20 (12) +2',total:14})"); await asyncio.sleep(2)
        chk("the DM keeps the roll in the log",await T(dm,"(state.rollLog||[])[0]&&state.rollLog[0].by")==A['name'])
        st=json.loads(await (await (await b.new_context()).request.get(rk.PL+'/state')).text())
        chk("players get the roll log",(st.get('rollLog') or [{}])[0].get('by')==A['name'])
        chk("…but still no sheets, no hidden goblin, no monster HP",'sheets' not in st and not any(c.get('id')=='gob' for c in st.get('list',[]))
            and not any('hpMax' in c for c in st.get('list',[]) if c.get('kind')!='pc'))
        await ph.click('.pbar [data-act=pdice]'); await asyncio.sleep(.6)
        chk("phone: At the table under the dice",await ph.locator('.psheet .tlog .tlr').count()>=1 and A['name'] in await ph.locator('.psheet .tlog').inner_text())
        await T(ph,"pSheet=null;renderPSheet()")
        # ---- the HP sheet shows where Damage and Heal would leave you
        await T(ph,"ls.set(hpKey(),{cur:18,max:27,temp:0,auto:false});render()"); await asyncio.sleep(.3)
        await ph.click('.pbar [data-act=php]'); await asyncio.sleep(.4)
        for k in "6": await ph.click(f'.numpad [data-k="{k}"]')
        pv=await ph.locator('#hpPrev').inner_text(); chk("HP: Damage 18 → 12 and Heal 18 → 24",'18 → 12' in pv and '18 → 24' in pv,pv)
        await T(ph,"pSheet=null;renderPSheet()")
        # ---- E19: a Paladin's aura in a save roll call, from the DM's sheet
        await T(dm,f"byId('{B['id']}').cls='paladin';state.sheets=Object.assign(state.sheets||{{}},{{['{B['name'].lower()}']:{{cls:'Paladin 6',lvl:6,ab:{{cha:16}}}}}});commit()")
        await T(dm,"document.querySelector('.panel[data-k=call]').open=true"); await asyncio.sleep(.2)
        await dm.fill('#callText','Dexterity save DC 15'); await dm.click('#callForm [type=submit]'); await asyncio.sleep(2)
        au=await T(dm,"(state.call.aura||[]).map(a=>a.t)")
        chk("the call carries the aura",len(au)==1 and B['name'] in au[0] and '+3' in au[0],au)
        chk("phone: the aura reminder in the call",await ph.locator('.psheet .aurahint').count()==1)
        await T(dm,"state.call=null;commit()"); await asyncio.sleep(.5)
        await dm.fill('#callText','Perception check'); await dm.click('#callForm [type=submit]'); await asyncio.sleep(.8)
        chk("no aura for a check",not await T(dm,"!!state.call.aura"))
        chk("no page errors",not errs,errs[:3])
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
