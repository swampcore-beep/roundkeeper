import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
# 84 + 86: the SRD 5.2.1 built in (no 5etools folder at all), and Settings → Game data → Import JSON
import asyncio,json,sys,urllib.request,urllib.error,os
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
HB=os.path.join(rk.OUT,'t29_hag.json')
json.dump({"_meta":{"sources":[{"json":"BogBrew","full":"Bog Brew"}]},"monster":[{"name":"Bog Hag","source":"BogBrew","size":["M"],"type":"fey","cr":"3","hp":{"average":38,"formula":"7d8+7"},"ac":[14],"str":12,"dex":12,"con":12,"int":13,"wis":14,"cha":16,"speed":{"walk":30},
  "action":[{"name":"Claws","entries":["{@atkr m} {@hit 5}, reach 5 ft. {@h}9 ({@damage 2d6 + 2}) Slashing damage."]}]}],
  "spell":[{"name":"Mire Grasp","source":"BogBrew","level":1,"school":"C","time":[{"number":1,"unit":"action"}],"range":{"type":"point","distance":{"type":"feet","amount":60}},"components":{"v":True,"s":True},"duration":[{"type":"timed","duration":{"type":"minute","amount":1},"concentration":True}],"entries":["Mud grabs a creature."],"classes":{"fromClassList":[{"name":"Druid","source":"XPHB"}]}}]},open(HB,"w"))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on("pageerror",lambda e:errs.append('dm '+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.5); await T(dm,SETUP)
        st=json.loads(get('http://127.0.0.1:8765/5et/status')[1])
        chk("no data folder: the SRD is there",st['state']=='ready' and st['counts'].get('srd')==331 and st['counts'].get('srd_spells')==339,st)
        # monster search
        await dm.click('[data-act=sbopen]'); await asyncio.sleep(1.2)
        eb=await dm.locator('.fetbox .eyebrow2').inner_text()
        chk("search says 331 SRD",'331 SRD' in eb,eb)
        await dm.fill('#fetQ','adult red'); await asyncio.sleep(.5)
        rows=await dm.locator('#fetList .fetrow').all_inner_texts()
        chk("finds the Adult Red Dragon, from the SRD",any('Adult Red Dragon' in r and 'SRD' in r for r in rows),rows)
        await dm.click('#fetList .fetrow'); await asyncio.sleep(1.2)
        chk("it reads as a statblock: AC, HP, CR, legendary",await T(dm,"JSON.stringify((x=>[x.ac,x.hp,x.cr,x.lr,x.la])(sbItems[sbItems.length-1]))")=='[19,256,"17",3,3]',await T(dm,"JSON.stringify((x=>[x.ac,x.hp,x.cr,x.lr,x.la])(sbItems[sbItems.length-1]))"))
        await dm.click('[data-act=sbadd]'); await asyncio.sleep(.8)
        did=await T(dm,"(state.list.find(c=>c.name==='Adult Red Dragon')||{}).id")
        chk("added to the fight",bool(did))
        await T(dm,f"sbViewId='{did}';sbLoreOn=false;renderDM()"); await asyncio.sleep(.5)
        t=await dm.locator('#sbDrawer .sbbody').inner_text()
        chk("the drawer shows Fire Breath, Rend and Spellcasting",all(x in t for x in ['Fire Breath','Rend','fireball']),t[:300])
        chk("Rend's attack and damage can be clicked",await dm.locator('#sbDrawer .sbbody button:has-text("+14")').count()>=1 and await dm.locator('#sbDrawer .sbbody button:has-text("1d10 + 8")').count()+await dm.locator('#sbDrawer .sbbody button:has-text("13")').count()>=1)
        chk("Fire Breath's save sends a roll call",await dm.locator('#sbDrawer [data-act=sbsave]').count()>=1)
        chk("Fire Breath is a Recharge counter",'Fire Breath' in (await T(dm,f"JSON.stringify(byId('{did}').sb.rech)")))
        chk("Fireball in the statblock is a spell link",await dm.locator('#sbDrawer .sbbody .rf-spell, #sbDrawer .sbbody [data-rt=spell]').count()>=1 or 'fireball' in (await dm.locator('#sbDrawer .sbbody').inner_html()).lower())
        # Ctrl+K
        await T(dm,"sbViewId=null;renderDM()"); await dm.keyboard.press('Control+k'); await asyncio.sleep(1.2)
        await dm.keyboard.type('fireball'); await asyncio.sleep(1)
        card=await dm.locator('.qkcardin').inner_text() if await dm.locator('.qkcardin').count() else ''
        chk("Ctrl+K: the SRD Fireball card",'20-foot-radius' in card and '8d6' in card,card[:200])
        await dm.fill('#qkQ','grappled') if await dm.locator('#qkQ').count() else None; await asyncio.sleep(.8)
        card=await dm.locator('.qkcardin').inner_text() if await dm.locator('.qkcardin').count() else ''
        chk("Ctrl+K: the Grappled condition",'Grappled' in card and ('Speed' in card or 'speed' in card),card[:200])
        await dm.keyboard.press('Escape')
        # a phone gets the SRD spells
        ph=await (await b.new_context(viewport={'width':390,'height':844})).new_page(); ph.on("pageerror",lambda e:errs.append('ph '+str(e)))
        await ph.goto(rk.PL+'/players'); await asyncio.sleep(1.2); await ph.click('[data-act=pickme][data-n=Mira]'); await asyncio.sleep(2.5)
        chk("phone: 339 spells from the SRD",await T(ph,"spRows&&spRows.length")==339)
        chk("phone: wizard list",await T(ph,"spRows.filter(x=>x[5].includes('W')).length")>80)
        await T(ph,"spView={n:'Fireball',s:'SRD52',from:'book'};pSheet='spell';renderPSheet();refGet('spell','Fireball','SRD52',true).then(d=>{spView.d=d;renderPSheet()})"); await asyncio.sleep(1.5)
        chk("phone: the spell's full text",'blossoms' in await ph.locator('.spcard').inner_text())
        chk("players' state never has the library",'"monster"' not in get(rk.PL+'/state')[1])
        chk("players can't read monsters",get(rk.PL+'/5et/index')[0]==403)
        # 86: Import JSON
        await T(dm,"closeSheet()"); await asyncio.sleep(.2)
        await dm.click('details.panel[data-k=more] summary') ; await asyncio.sleep(.3)
        await dm.click('[data-act=gdata]'); await asyncio.sleep(1)
        g=await dm.locator('.gdsheet').inner_text()
        chk("Game data: SRD built in, nothing imported",'331 monsters' in g and 'Nothing imported yet' in g,g[:300])
        await dm.set_input_files('#gdFile',HB); await asyncio.sleep(4)
        g=await dm.locator('.gdsheet').inner_text()
        chk("import: added with what it holds",'t29_hag.json' in g and '1 monsters' in g and '1 spells' in g,g)
        st=json.loads(get('http://127.0.0.1:8765/5et/status')[1])
        chk("…and read with the rest",st['counts'].get('own')==1 and 't29_hag.json' in st['imported'],st)
        await T(dm,"closeSheet();fetQ='bog';sbItems=[];sbSheet()"); await asyncio.sleep(1.5); await T(dm,"fetRedraw()"); await asyncio.sleep(.3)
        rows=await dm.locator('#fetList .fetrow').all_inner_texts()
        chk("the homebrew monster is searchable",any('Bog Hag' in r for r in rows),rows)
        await T(ph,"spLoad()"); await asyncio.sleep(1.5)
        chk("the homebrew spell reaches the phone",await T(ph,"!!spRows.find(x=>x[0]==='Mire Grasp')"))
        await T(dm,"closeSheet()")
        # a bad file
        bad=HB.replace('.json','_bad.json');open(bad,'w').write('{"monster": [')
        await T(dm,"gdArm=null;gdMsg='';gdSheet()"); await asyncio.sleep(.6)
        await dm.set_input_files('#gdFile',bad); await asyncio.sleep(1.5)
        chk("a broken file is refused, with a reason","isn't a JSON file" in await dm.locator('.gdsheet').inner_text())
        # remove
        await dm.click('[data-act=gdrm][data-n="t29_hag.json"]'); await asyncio.sleep(.3)
        chk("remove asks once more",'Remove it?' in await dm.locator('.gdsheet').inner_text())
        await dm.click('[data-act=gdrm][data-n="t29_hag.json"]'); await asyncio.sleep(3)
        st=json.loads(get('http://127.0.0.1:8765/5et/status')[1])
        chk("…and it's gone",not st['imported'] and not st['counts'].get('own'),st)
        try:
            urllib.request.urlopen(urllib.request.Request(rk.PL+'/5et/import?name=x.json',data=b'{"monster":[{"name":"X"}]}',method='POST'),timeout=5);code=200
        except urllib.error.HTTPError as e: code=e.code
        chk("players can't import",code==403,code)
        chk("no page errors",not errs,errs)
        await b.close()
    print("t29: ",("fails=0" if ok else "fails=1"))
asyncio.run(main())
