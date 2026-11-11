import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# README media: Candlelit tavern theme with the Avernus scene
import asyncio,sys,time,json,os,glob,shutil
from scene import setup
from playwright.async_api import async_playwright
O=rk.MEDIA+'/gifs/';os.makedirs(O,exist_ok=True)
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
marks={}
TH,SC="tavern","avernus"
async def rec(b,name,url,size,steps,prep=None):
    d=O+'v_'+name;shutil.rmtree(d,ignore_errors=True)
    ctx=await b.new_context(viewport=size,record_video_dir=d,record_video_size=size,device_scale_factor=1)
    t0=time.monotonic();pg=await ctx.new_page();await pg.goto(url);await asyncio.sleep(2.5)
    if prep: await prep(pg)
    start=time.monotonic()-t0
    await steps(pg)
    dur=time.monotonic()-t0-start
    await ctx.close();v=glob.glob(d+'/*.webm')[0];marks[name]=(v,start,dur);print(name,round(start,1),round(dur,1))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server'])
        dm=await (await b.new_context(viewport={'width':1440,'height':900},device_scale_factor=2)).new_page()
        await dm.goto('http://127.0.0.1:8765/');await asyncio.sleep(1.5)
        async def S(js,w=0): await T(dm,js);await asyncio.sleep(w)
        base=";state.ended=null;state.clocks=[];state.call=null;state.roll=null;state.tv={mode:'auto'};state.weather='none';state.tod='none';state.tune={};state.sceneFx={};state.sceneReact=true;state.layout='landscape';commit()"
        # 1. the tablet in a fight (landscape)
        await S(setup(TH,SC,False,"i")+base,.6)
        async def fight(pg):
            await asyncio.sleep(1.6);await S("moveTurn(1)",2.2)
            await S("state.spfx={id:uid(),at:Date.now(),n:'Fireball',t:'fire',from:'gr',to:['g1','g2','g3']};commit()",3.0)
            await S("const g=byId('g1');g.hp=0;g.down=true;const h=byId('g2');h.hp=3;h.bloodied=true;commit()",2.6)
            await S("moveTurn(1)",1.6)
            await S("state.roll={id:uid(),at:Date.now(),kind:'nat20',by:'Styx',text:'Attack',total:20};commit()",4.2)
        await rec(b,'tablet',rk.PL+'/players?shared=1',{'width':1200,'height':800},fight)
        # 2. the boss arrives (portrait)
        await S(setup(TH,SC,True,"s")+base.replace("'landscape'","'portrait'"),.6)
        async def reveal(pg):
            await asyncio.sleep(1.2);await S("byId('d').hidden=false;byId('d').introAt=Date.now();commit()",6.5)
        await rec(b,'boss',rk.PL+'/players?shared=1',{'width':640,'height':960},reveal)
        # 3. the TV
        await S(setup(TH,SC,False,"i")+base,.6)
        async def tv(pg):
            await asyncio.sleep(2);await S("moveTurn(1)",2.4)
            await S("byId('g1').conds.push('Prone');commit()",2.0)
            await S("moveTurn(1)",2.4)
            await S("state.spfx={id:uid(),at:Date.now(),n:'Call Lightning',t:'lightning',from:'a',to:['d']};commit()",2.6)
            await S("moveTurn(1)",2.4)
        await rec(b,'tv','http://127.0.0.1:8765/players?shared=1&screen=tv',{'width':1280,'height':720},tv)
        # 4. a phone: roll call from the dragon's breath, then HP
        await S(setup(TH,SC,False,"d")+base,.6)
        async def prep(pg):
            await pg.click('[data-act=pickme][data-n=Isandros]');await asyncio.sleep(1)
            await T(pg,"hpSet({cur:44,max:52,temp:0,auto:true});ls.set(shKey(),Object.assign(shBlank('Isandros'),{cls:'Paladin 5',lvl:5,species:'Human',ac:18,hp:52,ab:{str:16,dex:10,con:14,int:8,wis:12,cha:16},sv:['wis','cha'],sk:{athletics:1,persuasion:1},sa:'cha',att:[{n:'Longsword',hit:6,dmg:'1d8+3 slashing'}],v:Date.now()}));renderPlayer()")
            await asyncio.sleep(1)
        async def phone(pg):
            await asyncio.sleep(1.5)
            await S("state.call={id:'c'+Date.now(),text:'Dexterity save DC 21 · Fire Breath',dc:21,at:Date.now(),to:['i','s','a','gr'],answers:{}};commit()",2.6)
            await pg.click('[data-act=pcallroll]');await asyncio.sleep(2.2)
            await pg.click('.tile[data-act=php]');await asyncio.sleep(1)
            for k in "30": await pg.click(f'#overlay [data-k="{k}"]') if await pg.query_selector(f'#overlay [data-k="{k}"]') else None;await asyncio.sleep(.35)
            await asyncio.sleep(.5)
            if await pg.query_selector('[data-act=phpdo][data-hp=dmg]'): await pg.click('[data-act=phpdo][data-hp=dmg]')
            await asyncio.sleep(2.2)
            await T(pg,"pSheet='sheet';renderPSheet()");await asyncio.sleep(.6)
            await pg.screenshot(path=O+'phone_sheet.png')
        await rec(b,'phone',rk.PL+'/players',{'width':390,'height':844},phone,prep)
        # 5. stills: the tablet hero and six scenes
        await S(setup(TH,SC,False,"i")+base,.6)
        ctx=await b.new_context(viewport={'width':1200,'height':800},device_scale_factor=2);pg=await ctx.new_page()
        await pg.goto(rk.PL+'/players?shared=1');await asyncio.sleep(4);await pg.screenshot(path=O+'hero.png')
        await pg.add_style_tag(content='#player{visibility:hidden}')
        for k in ["avernus","bloodmoon","ritual","grave","festival","crystal"]:
            await S(f"state.scene='{k}';commit()",4.5);await pg.screenshot(path=O+f'sc_{k}.png')
        await ctx.close()
        json.dump(marks,open(O+'marks.json','w'))
        await b.close()
    togif()
def togif():
    # the GIFs in media/: tablet 720 wide at 10 fps, boss 420 at 12, tv 720 at 10, phone 300 at 12
    import subprocess
    m=json.load(open(O+'marks.json'));P={'tablet':(10,720),'boss':(12,420),'tv':(10,720),'phone':(12,300)}
    for k,(v,st,du) in m.items():
        fps,wd=P[k]
        vf=f"fps={fps},scale={wd}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle"
        subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(st),'-t',str(du),'-i',v,'-vf',vf,'-loop','0',O+k+'.gif'],check=True)
asyncio.run(main())
