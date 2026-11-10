import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
import asyncio,sys,json
from playwright.async_api import async_playwright
SETUP="""state.list=[
 Object.assign(newCombatant({id:'l',name:'Young Red Dragon',kind:'enemy',ctype:'dragon',init:21}),{hp:150,hpMax:178,boss:true}),
 newCombatant({id:'b',name:'Bram',kind:'pc',cls:'paladin',init:18}),
 Object.assign(newCombatant({id:'g1',name:'Kobold A',kind:'enemy',ctype:'dragon',init:15}),{conds:['Prone']}),
 newCombatant({id:'m',name:'Mira',kind:'pc',cls:'wizard',init:14,conds:['Concentrating']}),
 newCombatant({id:'s',name:'Styx',kind:'pc',cls:'bard',init:12}),
 newCombatant({id:'g2',name:'Kobold B',kind:'enemy',ctype:'dragon',init:9}),
 newCombatant({id:'a',name:'Astrea',kind:'pc',cls:'druid',init:6})];
state.effects=[{id:'e1',name:'Bless',by:'b',targets:['b','m','s'],conc:true,area:false,r0:2}];
state.list.find(c=>c.id==='b').conds=['Concentrating'];
state.turn={round:2,id:'m',init:14};state.theme=THEME;state.scene=SCENE;commit()"""
async def shot(b,dm,name,theme,scene,css,skin,vp={'width':912,'height':1368}):
    await dm.evaluate("(s)=>__t(s)",SETUP.replace('THEME',json.dumps(theme)).replace('SCENE',json.dumps(scene))); await asyncio.sleep(.6)
    ctx=await b.new_context(viewport=vp,device_scale_factor=2)
    sf=await ctx.new_page(); await sf.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(2.5)
    if css:
        await sf.evaluate("([c,k])=>{const st=document.createElement('style');st.textContent=c;document.head.appendChild(st);__t('renderPlayer=(o=>function(){o.apply(this,arguments);document.documentElement.dataset.skin='+JSON.stringify(k)+'})(renderPlayer)');document.documentElement.dataset.skin=k;__t('fitList&&fitList(withLair(sorted().filter(shownToPlayers)).length)')}",[css,skin])
        await sf.evaluate("document.fonts.ready"); await asyncio.sleep(1.2)
    await sf.screenshot(path=name); await ctx.close()
async def main(jobs):
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server','--host-resolver-rules=MAP phone.test '+rk.LAN])
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.5)
        for j in jobs: await shot(b,dm,*j)
        await b.close()
if __name__=="__main__":
    asyncio.run(main([("cur_tavern.png","tavern","tavern","",""),("cur_forge.png","forge","fire","","")]))
