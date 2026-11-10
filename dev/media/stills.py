import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# README media, round 2: everything in tavern + Infernal wastes, on a server with only the built-in SRD
import asyncio,sys,os,json
from scene import setup
from playwright.async_api import async_playwright
O=rk.MEDIA+'/stills/';os.makedirs(O,exist_ok=True)
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
TH,SC="tavern","avernus"
BASE=";state.weather='none';state.tod='none';state.tune={};state.sceneFx={};state.sceneReact=true;state.layout='landscape';byId('i').php={cur:44,max:52,temp:0,at:Date.now()};byId('a').php={cur:21,max:38,temp:5,at:Date.now()};commit()"
async def main():
    only=sys.argv[1].split(',') if len(sys.argv)>1 else None
    want=lambda k: not only or k in only
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server'])
        dm=await (await b.new_context(viewport={'width':1440,'height':900},device_scale_factor=2)).new_page()
        await dm.goto('http://127.0.0.1:8765/');await asyncio.sleep(1.5)
        async def S(js,w=0): await T(dm,js);await asyncio.sleep(w)
        await S(setup(TH,SC,False,"d")+BASE,.6)
        tb=await (await b.new_context(viewport={'width':1200,'height':800},device_scale_factor=1.5)).new_page()
        await tb.goto(rk.PL+'/players?shared=1');await asyncio.sleep(3)
        tv=await (await b.new_context(viewport={'width':1280,'height':720},device_scale_factor=1.5)).new_page()
        await tv.goto('http://127.0.0.1:8765/players?shared=1&screen=tv');await asyncio.sleep(3)
        ph=await (await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)).new_page()
        await ph.goto(rk.PL+'/players');await asyncio.sleep(1.2);await ph.click('[data-act=pickme][data-n=Isandros]');await asyncio.sleep(1)
        await T(ph,"hpSet({cur:44,max:52,temp:0,auto:true});ls.set(shKey(),Object.assign(shBlank('Isandros'),{cls:'Paladin 5 (Devotion)',lvl:5,species:'Human',ac:18,hp:52,ab:{str:16,dex:10,con:14,int:8,wis:12,cha:16},sv:['wis','cha'],sk:{athletics:1,persuasion:1,insight:1},sa:'cha',att:[{n:'Longsword',hit:6,dmg:'1d8+3 slashing'},{n:'Javelin',hit:6,dmg:'1d6+3 piercing'}],v:Date.now()}));renderPlayer()")
        await asyncio.sleep(1.5)
        # 1. the four screens, same moment: the dragon's turn
        if want('four'):
            await S("sbViewId='d';sbLoreOn=false;renderDM()",.6)
            await dm.screenshot(path=O+'s_dm.png');await tb.screenshot(path=O+'s_tablet.png');await tv.screenshot(path=O+'s_tv.png');await ph.screenshot(path=O+'s_phone.png')
            await S("sbViewId=null;renderDM()")
        # 2. gallery
        if want('atmo'):
            await S("atmoT='surface';atmoD=null;atmoSheet()",3);await dm.screenshot(path=O+'g_atmo.png');await S("closeSheet()",.3)
        if want('rollcall'):
            await S("state.call={id:'c'+Date.now(),text:'Dexterity save DC 21 · Fire Breath',dc:21,at:Date.now(),to:['i','s','a','gr'],answers:{i:23,s:12,a:19}};commit()",3)
            await tb.screenshot(path=O+'g_rollcall.png');await S("delete state.call;commit()",1)
        if want('hit'):
            await S("mtOn=true;mtSel=new Set(['g1','g2','g3']);mt={n:'28',type:'fire',ab:'Dex',dc:'15',on:'half',modes:{},rolls:{},src:{cid:'gr',act:'Fireball'}};renderDM()",.8);await S("mtRoll()",.8)
            await dm.screenshot(path=O+'g_hit.png');await S("mtOn=false;mtSel=new Set();renderDM()",.3)
        if want('ctrlk'):
            await dm.keyboard.press('Control+k');await asyncio.sleep(1.2);await dm.keyboard.type('fireball');await asyncio.sleep(1.2)
            await dm.screenshot(path=O+'g_ctrlk.png');await dm.keyboard.press('Escape');await asyncio.sleep(.3)
        if want('party'):
            await S("byId('i').pst={ac:18,pp:11,pi:13,pv:9,dc:14,at:Date.now()};byId('s').pst={ac:14,pp:12,pi:14,pv:11,dc:15,at:Date.now()};byId('a').pst={ac:15,pp:15,pi:15,pv:10,dc:14,at:Date.now()};byId('gr').pst={ac:12,pp:11,pi:11,pv:14,dc:15,at:Date.now()};commit();partySheet()",1)
            await dm.screenshot(path=O+'g_party.png');await S("closeSheet()",.3)
        if want('cond'):
            await S("byId('g1').conds.push('Restrained');byId('s').conds.push('Frightened');byId('i').conds.push('Prone');commit()",2.2)
            await tb.screenshot(path=O+'g_cond.png')
        if want('hdywt'):
            await S("byId('d').hp=0;byId('d').down=true;state.hdywt={id:uid(),pc:'i',name:'Isandros',cls:'paladin',boss:'Adult Red Dragon',at:Date.now()};commit()",3.5)
            await tb.screenshot(path=O+'g_hdywt.png');await S("delete state.hdywt;byId('d').hp=256;byId('d').down=false;commit()",2)
        if want('tvtitle'):
            await S("state.tv=Object.assign({},state.tv,{title:{t:'The Burning Pass',sub:'Two days north of Emberfall',eb:'Session 12',at:Date.now()}});commit()",3)
            await tv.screenshot(path=O+'g_tvtitle.png');await S("state.tv=Object.assign({},state.tv);delete state.tv.title;commit()",1)
        if want('tvpause'):
            await S("state.tv=Object.assign({},state.tv,{pause:{until:Date.now()+10*60000,msg:'Short break'}});commit()",3)
            await tv.screenshot(path=O+'g_tvpause.png');await S("state.tv=Object.assign({},state.tv);delete state.tv.pause;commit()",1)
        if want('spells'):
            await T(ph,"pSheet='book';spellScope='all';bookQ='';renderPSheet()");await asyncio.sleep(2.5);await ph.screenshot(path=O+'g_spells.png')
            await T(ph,"spView={n:'Fireball',s:'SRD52',from:'book'};pSheet='spell';renderPSheet();refGet('spell','Fireball','SRD52',true).then(d=>{spView.d=d;renderPSheet()})");await asyncio.sleep(1.5);await ph.screenshot(path=O+'g_spell.png')
            await T(ph,"pSheet=null;renderPSheet()")
        if want('sheet'):
            await T(ph,"pSheet='sheet';shLast=null;renderPSheet()");await asyncio.sleep(.5)
            await ph.click('[data-act=shroll][data-k=sk][data-a=athletics]');await asyncio.sleep(.5);await ph.screenshot(path=O+'g_sheet.png');await T(ph,"pSheet=null;renderPSheet()")
        if want('conc'):
            await S("byId('a').conds=['Concentrating'];commit()")
            p2=await (await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)).new_page()
            await p2.goto(rk.PL+'/players');await asyncio.sleep(1.2);await p2.click('[data-act=pickme][data-n=Astrea]');await asyncio.sleep(1.5)
            await S("pcConcAsk(byId('a'),24);commit()",3)
            await p2.screenshot(path=O+'g_conc.png')
        if want('dice'):
            await T(ph,"pSheet='dice';renderPSheet()");await asyncio.sleep(.6);await ph.screenshot(path=O+'g_dice.png');await T(ph,"pSheet=null;renderPSheet()")
        await b.close()
asyncio.run(main())
