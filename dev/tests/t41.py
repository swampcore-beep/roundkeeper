import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
"""t41 (1.5): the new character sheet: subclass, background, size and weapon notes; the sheet as a card in the DM's drawer; the phone's sheet with
Main (sections that open), Spells (slots, casting time and range) and Features; the spell list's time and range from the server."""
import asyncio,json,urllib.request
from playwright.async_api import async_playwright
op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
res=[]
def chk(n,c,x=""):
    res.append(bool(c)); print(("PASS " if c else "FAIL ")+n,("· "+str(x)) if x!="" else "")
async def T(pg,js): return await pg.evaluate("(s)=>__t(s)",js)
SH=("{name:'Isandros',cls:'Paladin 5',sub:'Oath of Devotion',lvl:5,species:'Human',bg:'Acolyte',size:'M',ac:18,hp:52,speed:30,init:null,prof:null,"
    "ab:{str:16,dex:10,con:14,int:8,wis:12,cha:16},sv:['wis','cha'],sk:{athletics:1,insight:2,persuasion:1,religion:1},sa:'cha',"
    "att:[{n:'Longsword',hit:6,dmg:'1d8+3 slashing',note:'Versatile (1d10) · Sap'},{n:'Javelin',hit:6,dmg:'1d6+3 piercing'}],"
    "spells:{prep:['Bless','Command','Cure Wounds'],alw:[['Shield of Faith','Oath of Devotion'],['Aid','Oath of Devotion'],['Find Steed','Faithful Steed']]},v:1,by:''}")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        # ---------- server: the spell list has casting time and range ----------
        sp=json.loads(op.open(rk.DM+'/spells').read())['list']
        bl=[r for r in sp if r[0]=='Bless'][0]; fs=[r for r in sp if r[0]=='Find Steed']
        chk("Server: spell rows end with casting time and range (Bless: Action, 30 ft)",bl[12:14]==['Action','30 ft'],bl[12:])
        mm=[r for r in sp if r[0]=='Mage Armor']; sh=[r for r in sp if r[0]=='Shield']
        chk("Server: Touch and Reaction (Mage Armor, Shield)",(mm and mm[0][13]=='Touch') and (sh and sh[0][12]=='Reaction'),[mm[0][12:] if mm else None,sh[0][12:] if sh else None])
        try: op.open(rk.DM+'/pcref?t=item&n=Longsword'); bad=True
        except Exception: bad=False
        chk("Server: phones still can't read magic items through /pcref (only base weapons)",not bad)
        dm=await (await b.new_context(viewport={'width':1920,'height':1080})).new_page(); dm.on('pageerror',lambda e:errs.append('dm '+str(e)))
        await dm.goto(rk.DM+'/'); await asyncio.sleep(1)
        await T(dm,"state.list=[{...newCombatant({kind:'pc'}),id:'i',name:'Isandros',cls:'paladin',init:12,php:{cur:44,max:52,temp:5},insp:true},"
                   "{...newCombatant({kind:'pc'}),id:'s',name:'Styx',cls:'bard',init:15},{...newCombatant({kind:'pc'}),id:'g',name:'Gregori',cls:'wizard',init:9}];"
                   f"state.sheets={{isandros:{SH},gregori:{{name:'Gregori',cls:'Wizard 5 (Evoker)',lvl:5,species:'',ac:12,hp:27,speed:30,ab:{{str:8,dex:14,con:12,int:18,wis:12,cha:10}},sv:['int','wis'],sk:{{}},sa:'int',att:[],v:1,by:'dm'}}}};"
                   "state.effects=[{id:'e',name:'Bless',by:'s',targets:['i'],conc:true}];byId('s').conds=['Concentrating'];commit();sbViewId='i';renderSbDrawer();'ok'")
        await asyncio.sleep(.6)
        txt=await dm.locator('#sbDrawer').inner_text()
        chk("DM card: band with class · subclass, species · background, level",'PALADIN · OATH OF DEVOTION' in txt.upper() and 'Human · Acolyte' in txt and 'LEVEL' in txt,txt[:160].replace('\n',' | '))
        chk("DM card: AC, initiative, speed, proficiency",all(x in txt for x in ['18','30 ft','+3']) and 'INITIATIVE' in txt.upper(),'')
        chk("DM card: HP from the phone with temp HP",'44 / 52' in txt and '+5 temp' in txt and 'from the phone' in txt,'')
        chk("DM card: effects on the player and Heroic Inspiration",'Bless · from Styx' in txt and 'Heroic Inspiration' in txt,'')
        n=await dm.locator('#sbDrawer .pcca').count(); pf=await dm.locator('#sbDrawer .pcca.pf').count()
        chk("DM card: six abilities, the proficient saves marked (Wis, Cha)",n==6 and pf==2,[n,pf])
        chk("DM card: skills (with expertise), passives, spellcasting DC",'Insight' in txt and '(expertise)' in txt and 'Passive' in txt.title() and 'DC 14' in txt,'')
        chk("DM card: attacks with the weapon note",'Longsword.' in txt and 'Versatile (1d10) · Sap' in txt,'')
        chk("DM card: always prepared spells name their source once (the band is in capitals)",txt.count('Oath of Devotion')==1 and 'Faithful Steed' in txt,txt.count('Oath of Devotion'))
        chk("DM drawer: no '+ Add' for a player, 'Player sheet' under the name",await dm.locator('#sbDrawer [data-act=sbopen]').count()==0 and 'Player sheet' in txt,'')
        await T(dm,"sbLog=[];sbAdv='';window.__r=Math.random;Math.random=()=>0.475"); await dm.click('#sbDrawer .pcca.pf .sv >> nth=0'); await T(dm,"Math.random=window.__r")
        r=await T(dm,"[sbLog[0].what,sbLog[0].tot,sbLog[0].how]")
        chk("DM card: a save rolls in the drawer (Wis save d20 10 +4, Bless +1d4)",r[0]=='Wis save' and 15<=r[1]<=18 and 'Bless' in r[2],r)
        await T(dm,"sbLog=[];window.__r=Math.random;Math.random=()=>0.475"); await dm.click('#sbDrawer .pcct .sbr.dmg >> nth=0'); await T(dm,"Math.random=window.__r")
        r=await T(dm,"[sbLog[0].tot,sbLog[0].what]")
        chk("DM card: damage rolls (1d8+3 with a 4 -> 7)",r[0]==7,r)
        await T(dm,"sbViewId='g';renderSbDrawer()"); await asyncio.sleep(.3); txt=await dm.locator('#sbDrawer').inner_text()
        chk("DM card: an older sheet with the subclass in brackets ('Wizard 5 (Evoker)') and set up by the DM",'WIZARD · EVOKER' in txt.upper() and 'set up by you' in txt,txt[:120].replace('\n',' | '))
        # ---------- the phone ----------
        ph=await (await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)).new_page(); ph.on('pageerror',lambda e:errs.append('ph '+str(e)))
        await ph.goto(rk.PL+'/players'); await asyncio.sleep(1.5); await ph.click('[data-act=pickme][data-n="Isandros"]'); await asyncio.sleep(1.2)
        async def P(js,w=.3):
            v=await T(ph,js); await asyncio.sleep(w); return v
        r=await P("const b=shBlank('x');[b.sub,b.bg,b.size,shClsName({cls:'Wizard 5 (Evoker)'}),shSub({cls:'Wizard 5 (Evoker)'}),shSub({cls:'Wizard 5',sub:'Bladesinger'})]")
        chk("Sheet model: new fields and the class/subclass helpers",r==['','','M','Wizard','Evoker','Bladesinger'],r)
        await P("shDraft=shBlank('Isandros');shStep=0;pSheet='shed';renderPSheet()")
        r=await P("[!!document.getElementById('sh_sub'),!!document.getElementById('sh_bg'),document.querySelectorAll('[data-act=shsize]').length]")
        chk("Sheet entry, step 1: Subclass, Background and Size",r==[True,True,3],r)
        await ph.fill('#sh_sub','Oath of Devotion'); await ph.fill('#sh_bg','Acolyte'); await ph.click('[data-act=shsize][data-v=S]'); await asyncio.sleep(.2)
        r=await P("[shDraft.sub,shDraft.bg,shDraft.size]")
        chk("Sheet entry: typing and tapping fill the draft",r==['Oath of Devotion','Acolyte','S'],r)
        await P("shDraft.att=[{n:'Longsword',hit:6,dmg:'1d8+3'}];shStep=3;renderPSheet()")
        await ph.fill('#sh_ao_0','Versatile (1d10)'); r=await P("shDraft.att[0].note")
        chk("Sheet entry, step 4: notes on an attack",r=='Versatile (1d10)',r)
        r=await P("const x=shParse('Paladin 5\\nBackground: Acolyte\\nSize: Medium\\nArmor Class 18 Hit Points 52');[x.sh.bg,x.sh.size,x.found.join('|')]")
        chk("Paste: Background and Size are read",r[0]=='Acolyte' and r[1]=='M' and 'Background: Acolyte' in r[2],r)
        await P(f"ls.set(shKey(),{SH});hpChange('max',52);const h=hpGet();h.cur=44;h.temp=5;hpSet(h);resSet([{{name:'Spell slot 1',max:4,cur:3,reset:'long'}},{{name:'Spell slot 2',max:2,cur:2,reset:'long'}},"
                "{name:'Lay on Hands',max:25,cur:18,reset:'long'},{name:'Channel Divinity',max:2,cur:1,reset:'shortOne'},{name:'Hit Dice',max:5,cur:4,reset:'long',note:'d10'}]);"
                "ls.set('shOpen',{});shTab='main';shLast=null;document.activeElement&&document.activeElement.blur();shDraft=null;pSheet='sheet';renderPSheet()",.8)
        txt=await ph.locator('.psheet').inner_text()
        tabs=await P("[...document.querySelectorAll('.shtabs button')].map(b=>b.dataset.v).join(',')")
        chk("Phone sheet: band, tabs Main · Spells · Features",'Isandros' in txt and tabs=='main,spells,feat',tabs)
        chk("Phone sheet: AC, HP with temp, initiative, speed, proficiency, passive Perception",all(x in txt for x in ['18','44','/ 52','+5 temp','30 ft','PASSIVE PERC.']),'')
        n=await ph.locator('.shsec').count(); op_=await ph.locator('.shsec.open').count()
        chk("Phone sheet: four sections, Abilities open by default",n==4 and op_==1 and await ph.locator('.shsec.open .shab1').count()==6,[n,op_])
        chk("Phone sheet: a closed section shows its numbers (Skills, Weapons)",'Athletics +6 · Insight +7' in txt and 'Longsword +6 · Javelin +6' in txt,'')
        await ph.click('.shsec:nth-of-type(2) .shsech'); await asyncio.sleep(.3)
        r=await P("[document.querySelectorAll('.shsk2 button').length,document.querySelectorAll('.shsk2 button.pf').length,JSON.stringify(ls.get('shOpen',{}))]")
        chk("Phone sheet: Skills opens with all 18, proficient ones bold, and the phone remembers it",r[0]==18 and r[1]==4 and '"sk":true' in r[2],r)
        await P("const o=shOpen();o.wp=true;o.rs=true;ls.set('shOpen',o);renderPSheet()")
        txt=await ph.locator('.psheet').inner_text()
        chk("Phone sheet: Weapons with notes, Hit Dice boxes and Inspiration",'Versatile (1d10) · Sap' in txt and await ph.locator('.shsec.open .shbx .rpip').count()==5 and 'Heroic Inspiration' in txt,'')
        await P("const _r=Math.random;Math.random=()=>0.475;const b=document.querySelector('.shplates [data-k=init]');b.click();Math.random=_r")
        r=await P("[shLast&&shLast.label,shLast&&shLast.tot]")
        chk("Phone sheet: Initiative rolls (d20 10 +0)",r==['Initiative',10],r)
        await P("shTab='spells';renderPSheet()",.4); txt=await ph.locator('.psheet').inner_text()
        chk("Spells tab: ability, modifier, save DC, spell attack",all(x in txt for x in ['CHA','SAVE DC','14','SPELL ATTACK','+6']),'')
        chk("Spells tab: slots by level as boxes (4 + 2)",await ph.locator('.shcard .shbx .rpip').count()==6,'')
        r=await P("[...document.querySelectorAll('.shsp')].map(b=>b.innerText.replace(/\\s+/g,' ').trim())")
        bless=[x for x in r if x.startswith('Bless')]
        chk("Spells tab: Bless with C, Action, 30 ft; always prepared marked ◆",bool(bless) and 'C' in bless[0] and 'Action' in bless[0] and '30 ft' in bless[0] and any(x.startswith('◆ Aid') for x in r),r[:4])
        await ph.click('.shcard .shbx .rpip.on >> nth=0'); await asyncio.sleep(.2)
        r=await P("resGet()[0].cur")
        chk("Spells tab: tapping a full box spends a slot",r==2,r)
        await ph.click('.shsp >> nth=0'); await asyncio.sleep(.6)
        r=await P("[pSheet,spView&&spView.from]"); await P("pSheet='sheet';renderPSheet()")
        chk("Spells tab: tapping a spell opens its card, Back returns to the sheet",r==['spell','sheet'],r)
        await P("shTab='feat';renderPSheet()",.4); txt=await ph.locator('.psheet').inner_text()
        chk("Features tab: tracked features (Lay on Hands as a pool, Channel Divinity as boxes)",'Lay on Hands' in txt and '18' in txt and 'Channel Divinity' in txt and 'Spell slot' not in txt,'')
        await ph.click('[data-act=shpool][data-d="-1"]'); await asyncio.sleep(.2); r=await P("resGet()[2].cur")
        chk("Features tab: − on the pool uses one",r==17,r)
        await P("pcData={cls:[{n:'Paladin',s:'XPHB',cp:'1/2',tb:[],hd:10,cf:[['Lay On Hands',1],['Spellcasting',1],['Extra Attack',5],['Aura of Protection',6]]}],"
                "sub:[{n:'Oath of Devotion',sn:'Devotion',s:'XPHB',cn:'Paladin',cs:'XPHB',tb:[],as:[],sf:[['Oath of Devotion',3],['Aura of Devotion',7]]}],feats:[]};"
                "profSet({cls:[{n:'Paladin',s:'XPHB',lvl:5,sub:{n:'Oath of Devotion',s:'XPHB',sn:'Devotion'}}],feats:[{n:'Alert'}],mods:{}});renderPSheet()",.4)
        txt=await ph.locator('.psheet').inner_text()
        chk("Features tab: class and subclass features up to your level, and feats",all(x in txt.upper() for x in ['PALADIN 5 · DEVOTION','LAY ON HANDS','EXTRA ATTACK','OATH OF DEVOTION','ALERT'])
            and 'Aura of Protection' not in txt and 'Aura of Devotion' not in txt,'')
        await P("pcData=null;profSet({cls:[],feats:[],mods:{}})")
        # players never get the sheets
        pub=json.loads(op.open(urllib.request.Request(rk.PL+'/state?pub=1')).read())
        chk("Players' view has no sheets",'sheets' not in pub,'')
        print('errors',errs)
        await b.close()
    print("SUMMARY",sum(res),"pass",len(res)-sum(res),"fail")
asyncio.run(main())
