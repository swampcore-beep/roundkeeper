import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py:
"""t45 (1.7): one look per role on the DM screen. The toolbar's actions, the header's pills, Edit… and + Add, the turn bar's arrow and ⋯
are buttons with an edge of 3:1; End combat has a red edge; Players can edit is a toggle; Statblock/Picture and the attack rolls raise the
one that is picked; the quiet icons in a row are light enough to read; the statblock's hint on rolling sits behind "?"; both themes."""
import asyncio
from playwright.async_api import async_playwright
res=[]
def chk(n,c,x=""):
    res.append(bool(c)); print(("PASS " if c else "FAIL ")+n,("· "+str(x)) if x!="" else "")
async def T(pg,js): return await pg.evaluate("(s)=>__t(s)",js)
RAW="Ogre\\nLarge Giant, Chaotic Evil\\nArmor Class 11\\nHit Points 68 (8d10 + 24)\\nSpeed 40 ft.\\nACTIONS\\nGreatclub. Melee Attack Roll: +6, reach 5 ft. Hit: 13 (2d8 + 4) Bludgeoning damage."
SETUP=("state.list=[{...newCombatant({kind:'pc'}),id:'i',name:'Isandros',cls:'paladin',init:15},{...newCombatant({kind:'monster'}),id:'o',name:'Ogre',init:12,hp:68,"
       "hpMax:68}];(()=>{const o=byId('o');o.sb=Object.assign(parseStatblock('"+RAW+"')||{},{raw:'"+RAW+"'})})();state.turn={id:'i',round:1};state.call=null;commit();'ok'")
JS=r"""(sel)=>{const P=s=>{const m=s.match(/[\d.]+/g);return m?m.map(Number):[0,0,0,0]};
 const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
 const CR=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 const bgOf=e=>{for(let n=e;n;n=n.parentElement){const c=P(getComputedStyle(n).backgroundColor);if(c.length<4||c[3]>.5)return c.slice(0,3)}return [17,17,19]};
 const e=document.querySelector(sel);if(!e)return null;const cs=getComputedStyle(e),par=bgOf(e.parentElement);
 const sh=cs.boxShadow.match(/rgba?\([^)]+\)/),bc=cs.borderTopWidth!=='0px'&&cs.borderTopStyle!=='none'?P(cs.borderTopColor).slice(0,3):sh?P(sh[0]).slice(0,3):par;
 const own=P(cs.backgroundColor),bg=(own.length>3&&own[3]>.5)||own.length===3?own.slice(0,3):par;
 return {edge:+CR(bc,par).toFixed(2),text:+CR(P(cs.color).slice(0,3),bg).toFixed(2),bg:cs.backgroundColor,bd:cs.borderTopColor,fg:cs.color}}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        dm=await (await b.new_context(viewport={'width':1536,'height':864})).new_page();dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto(rk.DM+'/');await asyncio.sleep(1.2);await T(dm,SETUP);await asyncio.sleep(.6)
        m=lambda s:dm.evaluate(JS,s)
        for theme in ("dark","light"):
            for name,sel in (("Hit several","[data-act=mtstart].btn"),("Lair action","#lairBtn"),("Clear reactions","[data-act=clearreact]"),("Party","[data-act=party]"),
                             ("Recap","#recapBtn"),("the toolbar's ⋯","#footMore"),("Rules in the header","#dm>.bar [data-act=qk]"),("Previous turn","[data-act=tprev]"),
                             ("+ Condition","#roster .chips .addc"),("a row's ⋯","#roster .stat .morebtn2")):
                r=await m(sel);chk(f"{theme}: {name} has an edge of 3:1",r and r['edge']>=3,r and r['edge'])
            r=await m(".dmtools #endBtn");chk(f"{theme}: End combat has a red edge",r and r['edge']>=3 and r['bg'] in ('rgba(0, 0, 0, 0)','transparent'),r)
            r=await m("#roster .stat .tog.blood");chk(f"{theme}: a row's quiet icons read at 4.5:1",r and r['text']>=4.5,r and r['text'])
            on=await m("#peBtn");await T(dm,"state.playerEdits=false;commit()");await asyncio.sleep(.3);off=await m("#peBtn")
            chk(f"{theme}: Players can edit is a toggle (on tinted, off plain)",on['bg']!=off['bg'] and off['bg'] in ('rgba(0, 0, 0, 0)','transparent'),[on['bg'],off['bg']])
            await T(dm,"state.playerEdits=true;commit()");await asyncio.sleep(.2)
            await dm.click('#roster .sblink');await asyncio.sleep(.5)
            r=await m("#sbDrawer .sbheadb [data-act=sbedit]");chk(f"{theme}: Edit… has an edge of 3:1",r and r['edge']>=3,r and r['edge'])
            pk=await m("#sbDrawer .seg2 [data-act=sbadv][aria-pressed=true]");np=await m("#sbDrawer .seg2 [data-act=sbadv][aria-pressed=false]")
            chk(f"{theme}: the picked attack roll is raised, the others plain",pk['edge']>=3 and np['bg'] in ('rgba(0, 0, 0, 0)','transparent'),[pk['edge'],np['bg']])
            tb=await m("#sbDrawer .sbtabs [aria-pressed=true]");chk(f"{theme}: Statblock/Picture raises the one picked",tb and tb['edge']>=3,tb and tb['edge'])
            if theme=="dark":
                await T(dm,"ls.set('sbHintSeen',true);renderSbDrawer()");await asyncio.sleep(.2)
                chk("the hint on rolling hides once seen",'Click a bonus' not in await dm.inner_text('#sbDrawer'))
                await dm.click('#sbDrawer [data-act=sbhelp]');await asyncio.sleep(.2)
                chk("…and comes back behind ?",'Click a bonus' in await dm.inner_text('#sbDrawer') and await dm.get_attribute('#sbDrawer [data-act=sbhelp]','aria-expanded')=='true')
                await dm.click('#sbDrawer [data-act=sbhelp]');await asyncio.sleep(.2)
                chk("…and goes again",'Click a bonus' not in await dm.inner_text('#sbDrawer'))
                chk("the toolbar's actions have icons",await dm.locator('.dmtools .fgrp .btn>svg').count()==5)
                await dm.hover('#roster .hpw.hpb');await asyncio.sleep(.2)
                r=await m("#roster .hpw.hpb");chk("HP shows a field's edge under the mouse",r and r['edge']>=3,r and r['edge'])
            await T(dm,"sbViewId=null;renderDM()");await asyncio.sleep(.3)
            if theme=="dark": await dm.click('[data-act=dmtheme][data-v=light]');await asyncio.sleep(.5)
        await dm.click('[data-act=dmtheme][data-v=dark]');await asyncio.sleep(.2)
        chk("No page errors",not errs,errs[:4])
        await b.close()
    print(f"{sum(res)}/{len(res)} passed");_sys.exit(0 if all(res) else 1)
asyncio.run(main())
