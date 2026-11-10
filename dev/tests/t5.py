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
        ctx=await b.new_context(viewport={'width':1440,'height':900},permissions=['clipboard-read','clipboard-write'])
        dm=await ctx.new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto('http://127.0.0.1:8765/')
        await T(dm,"state.party=[];state.list=[{id:'p',name:'Medusa',kind:'pc',cls:'rogue',init:17,conds:[],ds:{s:0,f:0}}];commit()")
        gy=open(D+'gyreguard.md').read(); li=open(D+'lich.md').read(); pl=open(_os.path.join(_os.path.dirname(_os.path.abspath(__file__)),'plain.txt')).read()
        r=json.loads(await dm.evaluate("(t)=>JSON.stringify(__t('parseStatblock')(t))",gy)); print(r)
        chk("gyreguard parsed",r['name']=='Aarakocra Gyreguard' and r['ac']==15 and r['hp']==104 and r['ib']==3 and r['ctype']=='humanoid' and r['cr']=='5' and r['rech'][0]['n']=='Fury of the Storm' and r['rech'][0]['min']==5)
        r=json.loads(await dm.evaluate("(t)=>JSON.stringify(__t('parseStatblock')(t))",li)); print(r)
        chk("lich parsed",r['lr']==4 and r['la']==3 and len(r['uses'])==6 and r['ib']==7 and r['ctype']=='undead' and 'Immune: Charmed' in r['know'] and 'Resistant: Cold' in r['know'])
        r=json.loads(await dm.evaluate("(t)=>JSON.stringify(__t('parseStatblock')(t))",pl)); print(r)
        chk("plain copy parsed",r['name']=='Goblin Warrior' and r['ac']==15 and r['hp']==10 and r['ib']==2 and r['ctype']=='fey')
        # file picker path
        await dm.click('[data-act=sbopen]'); await dm.set_input_files('#sbFile',[D+'gyreguard.md',D+'lich.md']); await asyncio.sleep(.5)
        chk("two cards",await dm.locator('.sbcard').count()==2)
        await dm.click('[data-act=sbcount][data-i="0"][data-d="1"]'); await asyncio.sleep(.1)
        await dm.screenshot(path='sb_sheet.png')
        await dm.click('[data-act=sbadd]'); await asyncio.sleep(.6)
        names=await T(dm,"JSON.stringify(state.list.map(c=>[c.name,c.init,c.hp,c.ac,c.ctype,c.boss]))"); print(names)
        L=json.loads(names)
        chk("2 gyreguards + lich",[x[0] for x in L].count('Lich')==1 and sum(1 for x in L if x[0].startswith('Aarakocra'))==2)
        g=[x for x in L if x[0].startswith('Aarakocra')]; chk("group shares init",g[0][1]==g[1][1] and 4<=g[0][1]<=23)
        chk("lich is boss",[x for x in L if x[0]=='Lich'][0][5])
        # paste via Ctrl+V
        await dm.evaluate("(t)=>navigator.clipboard.writeText(t)",pl); await dm.click('h1, .bar'); await dm.keyboard.press('Control+V'); await asyncio.sleep(.4)
        chk("Ctrl+V opens sheet",await dm.locator('.sbcard').count()==1)
        await dm.click('[data-act=sbadd]'); await asyncio.sleep(.5)
        # counters on the row
        lid=await T(dm,"state.list.find(c=>c.name==='Lich').id")
        row=dm.locator(f'.row[data-id="{lid}"]')
        await row.locator('[data-act=sbuse][data-k=lr][data-q="0"]').click(); await asyncio.sleep(.2)
        chk("LR used 1",await T(dm,"byId('%s').sb.lr.used"%lid)==1)
        await row.locator('[data-act=sbrech]').click(); await asyncio.sleep(.2)
        chk("recharge used",await T(dm,"byId('%s').sb.rech[0].ready"%lid)==False)
        for _ in range(12):
            await row.locator('[data-act=sbrech]').click(); await asyncio.sleep(.1)
            if await T(dm,"byId('%s').sb.rech[0].ready"%lid): break
        chk("recharge rolls back eventually",await T(dm,"byId('%s').sb.rech[0].ready"%lid))
        await dm.screenshot(path='sb_rows.png')
        # knowledge offers
        await row.locator('[data-act=rowmenu]').click(); await row.locator('.rmenu [data-act=know]').click(); await asyncio.sleep(.2)
        chk("know offers",await dm.locator('[data-act=sbknow]').count()>=5)
        await dm.click('[data-act=sbknow][data-k="Immune: Poison"]'); await asyncio.sleep(.2)
        chk("know added",await T(dm,"byId('%s').know.includes('Immune: Poison')"%lid))
        await dm.click('#overlay .btn.primary[data-act=close]')
        # players never get the statblock
        pub=json.loads(op.open(rk.PL+'/state').read())
        chk("players don't get sb/ib/hp",all('sb' not in c and 'ib' not in c and 'hp' not in c for c in pub['list']))
        # encounter save and load
        await T(dm,"document.querySelector('details.panel[data-k=enc]')&&(document.querySelector('details.panel[data-k=enc]').open=true)")
        ok_enc=await dm.locator('#eName').count()
        if ok_enc:
            await dm.fill('#eName','Lich fight'); await dm.press('#eName','Enter'); await asyncio.sleep(.3)
            await T(dm,"state.list=state.list.filter(c=>c.kind==='pc');commit()")
            await dm.click('[data-act=eload][data-i="0"]'); await asyncio.sleep(.4)
            L=json.loads(await T(dm,"JSON.stringify(state.list.filter(c=>c.sb).map(c=>[c.name,c.init,c.sb.lr&&c.sb.lr.used]))"))
            chk("encounter keeps sb, rolls init, fresh counters",len(L)==4 and all(x[1] is not None for x in L) and [x for x in L if x[0]=='Lich'][0][2]==0,L)
        chk("no errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
