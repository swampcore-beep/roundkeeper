import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
# round 2: the player's character sheet (79)
import asyncio,json,sys,urllib.request,urllib.error
pass
from cap import SETUP as S0
from playwright.async_api import async_playwright
SETUP=S0.replace('THEME','"tavern"').replace('SCENE','"none"')
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x if not c else "")
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
def get(u):
    try: r=urllib.request.urlopen(u,timeout=5);return r.status,r.read().decode()
    except urllib.error.HTTPError as e: return e.code,""
PASTE="""Mira Vell  Wizard 5  High Elf
Armor Class 12   Hit Points 32   Speed 30 ft.
STR 8 (-1)  DEX 14 (+2)  CON 14 (+2)
INT 18 (+4)  WIS 12 (+1)  CHA 10 (+0)
Saving Throws Int +7, Wis +4
Skills Arcana +7, History +7, Investigation +7, Perception +4
Fire Bolt +7 2d10 fire
Dagger +5 1d4+2 piercing"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append('dm '+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.5); await T(dm,SETUP)
        ph=await (await b.new_context(viewport={'width':390,'height':844})).new_page(); ph.on("pageerror",lambda e:errs.append('ph '+str(e)))
        await ph.goto(rk.PL+'/players'); await asyncio.sleep(1.2); await ph.click('[data-act=pickme][data-n=Mira]'); await asyncio.sleep(1)
        # paste on the phone
        await ph.click('[data-act=pmore]'); await asyncio.sleep(.3); await ph.click('[data-act=psheet]'); await asyncio.sleep(.3)
        chk("empty sheet offers fill in or paste",await ph.locator('[data-act=shnew]').count()==1 and await ph.locator('[data-act=shpaste]').count()==1)
        await ph.click('[data-act=shpaste]'); await asyncio.sleep(.3); await ph.fill('#sh_paste',PASTE); await ph.click('[data-act=shparse]'); await asyncio.sleep(.3)
        f=await ph.locator('.shfound').inner_text()
        chk("paste finds AC/HP/speed, scores, saves, skills, attacks",all(x in f for x in ["AC 12","HP 32","Six ability scores","Saves: Int, Wis","Arcana","2 attacks"]),f)
        await ph.click('[data-act=shpastesave]'); await asyncio.sleep(3)
        sh=json.loads(await T(dm,"JSON.stringify((state.sheets||{}).mira||null)"))
        chk("the laptop keeps the sheet",sh and sh['ab']['int']==18 and sh['sk'].get('arcana')==1 and 'wis' in sh['sv'],sh)
        chk("players' state never has sheets",'"sheets"' not in get(rk.PL+'/state')[1])
        chk("Mira's statblock in the DM's drawer is her sheet",await T(dm,"!!(byId('m').sb&&byId('m').sb.pc)"))
        chk("Party numbers from the sheet",await T(dm,"byId('m').pst.pp")==14)
        await dm.click('#roster .row[data-id=m] [data-act=sbview]'); await asyncio.sleep(.4)
        t=await dm.locator('#sbDrawer').inner_text()
        chk("drawer shows saves, skills, passives, attacks",all(x in t for x in ["Int +7","Arcana +7","Passive Perception 14","Fire Bolt"]),t[:300])
        chk("drawer: Edit sheet…, no lore tab",await dm.locator('#sbDrawer [data-act=dmsheet]').count()==1 and await dm.locator('#sbDrawer .sbtabs').count()==0)
        # the phone rolls with it
        chk("phone view: tap-to-roll",await ph.locator('[data-act=shroll][data-k=sv][data-a=int]').count()==1)
        await ph.click('[data-act=shroll][data-k=sv][data-a=int]'); await asyncio.sleep(.2)
        r=await ph.locator('.dresult').inner_text(); chk("Int save rolls +7",'+7' in r,r)
        await T(ph,"pSheet=null;renderPSheet()")
        await T(dm,"state.call={id:'c1',text:'Dexterity save DC 15',dc:15,answers:{},at:Date.now()};commit()"); await asyncio.sleep(2.5)
        btn=await ph.locator('[data-act=pcallroll]').inner_text() if await ph.locator('[data-act=pcallroll]').count() else ''
        chk("roll call offers Dex save +2",'Dex save +2' in btn,btn)
        await ph.click('[data-act=pcallroll]'); await asyncio.sleep(2.5)
        chk("…and the answer reaches the DM",await T(dm,"state.call.answers.m!=null"))
        # the steps on the phone, from the existing sheet
        await T(ph,"pSheet='sheet';renderPSheet()"); await asyncio.sleep(.2); await ph.click('[data-act=shedit]'); await asyncio.sleep(.2)
        await ph.click('[data-act=shnum][data-k=ac][data-d="1"]'); await asyncio.sleep(.1)
        for _ in range(4): await ph.click('[data-act=shstep][data-d="1"]'); await asyncio.sleep(.15)
        await ph.click('[data-act=shdone]'); await asyncio.sleep(3)
        chk("edited on the phone: AC 13 on the laptop",await T(dm,"state.sheets.mira.ac")==13)
        # the DM makes Bram's sheet and sends it
        await dm.keyboard.press('Escape')
        await T(dm,"menuId=null;renderDM()")
        await dm.click('#roster .row[data-id=b] [data-act=rowmenu]'); await asyncio.sleep(.3)
        await dm.click('.rmenu [data-act=dmsheet]'); await asyncio.sleep(.4)
        chk("DM sheet editor opens",await dm.locator('.dmsh').count()==1)
        await dm.fill('#dm_paste',"Paladin 5\nArmor Class 18 Hit Points 44 Speed 30\nSTR 16 DEX 10 CON 14 INT 8 WIS 12 CHA 16\nSaving Throws Wis +4, Cha +6\nLongsword +6 1d8+3 slashing")
        await dm.click('[data-act=dmshparse]'); await asyncio.sleep(.3)
        await dm.click('.dmshgo [data-act=dmshsave]:not([data-only])'); await asyncio.sleep(.5)
        chk("Bram's sheet saved by the DM",await T(dm,"state.sheets.bram&&state.sheets.bram.by==='dm'&&state.sheets.bram.ac===18"))
        p2=await (await b.new_context(viewport={'width':390,'height':844})).new_page(); p2.on("pageerror",lambda e:errs.append('p2 '+str(e)))
        await p2.goto(rk.PL+'/players'); await asyncio.sleep(1.2); await p2.click('[data-act=pickme][data-n=Bram]'); await asyncio.sleep(3)
        chk("Bram's phone gets it",await T(p2,"!!shLocal()&&shLocal().ac===18&&shLocal().by==='dm'"))
        # one kept only for the DM never leaves the laptop
        await T(dm,"state.sheets=Object.assign({},state.sheets,{styx:Object.assign(shBlank('Styx'),{ac:15,v:Date.now(),by:'dm',only:true})});commit()"); await asyncio.sleep(1)
        chk("a DM-only sheet isn't served",get(rk.PL+'/sheet?n=styx')[0]==404)
        chk("…nor announced",not await T(dm,"'styx' in state.sheetv"))
        # a new phone gets Mira's sheet back
        p3=await (await b.new_context(viewport={'width':390,'height':844})).new_page(); p3.on("pageerror",lambda e:errs.append('p3 '+str(e)))
        await p3.goto(rk.PL+'/players'); await asyncio.sleep(1.2); await p3.click('[data-act=pickme][data-n=Mira]'); await asyncio.sleep(3)
        chk("a new phone gets the sheet back",await T(p3,"!!shLocal()&&shLocal().ab.int===18"))
        chk("no page errors",not errs,errs)
        await b.close()
    print("t27: ",("fails=0" if ok else "fails=1"))
asyncio.run(main())
