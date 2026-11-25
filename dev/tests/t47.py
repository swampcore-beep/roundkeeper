import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py:
"""t47 (1.7): the DM screen under the mouse, in both themes.
- HP, initiative, AC and the name are values you change: under the mouse a soft tint, no edge, and the value does not move.
  HP keeps 10px of room before its number, its bar starts under the number, and a pencil shows. AC keeps its shield.
- Every button on the DM screen (toolbar, header, turn bar, rows, side panel, statblock) changes under the mouse,
  except one that shows what is picked (aria-pressed/aria-selected true on a tab, the theme or the roll mode)."""
import asyncio
from playwright.async_api import async_playwright
_sys.path.insert(0,_os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))),'media'))
from scene import setup
res=[]
def chk(n,c,x=""):
    res.append(bool(c)); print(("PASS " if c else "FAIL ")+n,("· "+str(x)) if x!="" else "")
async def T(pg,js): return await pg.evaluate("(s)=>__t(s)",js)
LOOK=r"""(sel)=>{const e=document.querySelector(sel);if(!e)return null;const cs=getComputedStyle(e),r=e.getBoundingClientRect(),a=getComputedStyle(e,'::after');
 const n=e.querySelector('.hpn'),bar=e.querySelector('.hpbar3');let tx=null;
 if(n)tx=n.getBoundingClientRect().left;else if(e.tagName==='INPUT'){tx=r.left+parseFloat(cs.paddingLeft)+parseFloat(cs.borderLeftWidth)}
 return {bg:cs.backgroundColor,bd:cs.borderTopWidth==='0px'||cs.borderTopStyle==='none'?'transparent':cs.borderTopColor,bi:cs.backgroundImage,sh:cs.boxShadow,left:r.left,tx,bar:bar?bar.getBoundingClientRect().left:null,pen:+a.opacity,pl:parseFloat(cs.paddingLeft)}}"""
SIG=r"""(i)=>{const e=document.querySelector('[data-t47="'+i+'"]');if(!e)return null;
 const f=x=>{const c=getComputedStyle(x);return [c.backgroundColor,c.borderTopColor,c.boxShadow,c.color,c.filter,c.opacity,c.textDecorationLine].join('|')};
 const p=x=>{const s=[];for(const k of ['::before','::after']){const c=getComputedStyle(x,k);s.push(c.opacity+c.backgroundColor+c.color)}return s.join('|')};
 return f(e)+'#'+p(e)+'#'+[...e.querySelectorAll('*')].slice(0,12).map(f).join(';')}"""
LIST=r"""()=>{document.querySelectorAll('[data-t47]').forEach(e=>delete e.dataset.t47);const scope='.dmtools,#dm>.bar,.turnbar,#roster,#side,#sbDrawer';
 return [...document.querySelectorAll(scope.split(',').map(s=>s+' button').join(','))].filter(e=>{const r=e.getBoundingClientRect();const c=getComputedStyle(e);
   return r.width>6&&r.height>6&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&c.visibility!=='hidden'&&!e.disabled&&c.pointerEvents!=='none'
     &&!(e.getAttribute('aria-pressed')==='true'&&(e.closest('.seg,.sbtabs,.sidetabs,[role=tablist]')||e.dataset.act==='dmtheme'||e.dataset.act==='sbadv'||e.dataset.act==='sidetab'||/^sbtab/.test(e.dataset.act||'')))
     &&e.getAttribute('aria-selected')!=='true'&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})
   .map((e,i)=>{e.dataset.t47=i;const r=e.getBoundingClientRect();return {i,x:r.x+r.width/2,y:r.y+r.height/2,
     name:(e.dataset.act||e.id||'')+' '+(e.getAttribute('aria-label')||e.innerText||'').trim().slice(0,24)}})}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        dm=await (await b.new_context(viewport={'width':1536,'height':864})).new_page();dm.on("pageerror",lambda e:errs.append(str(e)))
        await dm.goto(rk.DM+'/');await asyncio.sleep(1.5)
        await T(dm,setup("tavern","avernus",False,None)+";state.call=null;state.effects=[];state.ended=null;byId('g1').hp=4;commit()");await asyncio.sleep(.8)
        look=lambda s:dm.evaluate(LOOK,s)
        for theme in ("dark","light"):
            if theme=="light": await dm.click('[data-act=dmtheme][data-v=light]');await asyncio.sleep(.6)
            await T(dm,"sbViewId=null;renderDM()");await asyncio.sleep(.4)
            hp='#roster .row[data-id=g1] .hpw.hpb'
            a=await look(hp);await dm.hover(hp);await asyncio.sleep(.35);h=await look(hp);await dm.mouse.move(2,2);await asyncio.sleep(.2)
            chk(f"{theme}: HP: the number does not move under the mouse",a and h and abs(a['tx']-h['tx'])<.6,[a and a['tx'],h and h['tx']])
            chk(f"{theme}: HP: 10px of room before the number",a and a['tx']-a['left']>=9.5,a and a['tx']-a['left'])
            chk(f"{theme}: HP: the bar starts under the number",a and abs(a['bar']-a['tx'])<1.1,a and [a['bar'],a['tx']])
            chk(f"{theme}: HP: a tint and no edge under the mouse",h and h['bg'] not in ('rgba(0, 0, 0, 0)','transparent') and h['sh']=='none',h and [h['bg'],h['sh']])
            chk(f"{theme}: HP: a pencil under the mouse only",a and h and a['pen']==0 and h['pen']==1,[a and a['pen'],h and h['pen']])
            for nm,sel in (("initiative",'#roster .row[data-id=g1] .init-in'),("AC",'#roster .row[data-id=g1] .ac-wrap input'),("the name",'#roster .row[data-id=g1] input[data-act=name]')):
                a=await look(sel);await dm.hover(sel);await asyncio.sleep(.35);h=await look(sel);await dm.mouse.move(2,2);await asyncio.sleep(.2)
                chk(f"{theme}: {nm}: a tint and no edge under the mouse",h and h['bg'] not in ('rgba(0, 0, 0, 0)','transparent') and h['sh']=='none' and h['bd'] in ('rgba(0, 0, 0, 0)','transparent'),
                    h and [h['bg'],h['sh'],h['bd']])
                chk(f"{theme}: {nm}: the value does not move",a and h and abs(a['tx']-h['tx'])<.6,[a and a['tx'],h and h['tx']])
                if nm=="AC": chk(f"{theme}: AC keeps its shield under the mouse",h and 'svg' in h['bi'],h and h['bi'][:40])
                if nm=="the name": chk(f"{theme}: the name has 10px of room",a and a['pl']>=10,a and a['pl'])
            # every button answers the mouse
            for where in ("main","statblock"):
                if where=="statblock": await T(dm,"sbViewId='d';renderDM()");await asyncio.sleep(.8)
                items=await dm.evaluate(LIST);dead=[]
                for it in items:
                    s0=await dm.evaluate(SIG,it['i']);await dm.mouse.move(it['x'],it['y']);await asyncio.sleep(.3)
                    s1=await dm.evaluate(SIG,it['i']);await dm.mouse.move(2,2);await asyncio.sleep(.25)
                    if s0 is not None and s0==s1: dead.append(it["name"])
                chk(f"{theme}, {where}: every button changes under the mouse ({len(items)} checked)",len(items)>15 and not dead,dead[:8])
            await T(dm,"sbViewId=null;renderDM()");await asyncio.sleep(.3)
        await dm.click('[data-act=dmtheme][data-v=dark]');await asyncio.sleep(.2)
        chk("No page errors",not errs,errs[:4])
        await b.close()
    print(f"{sum(res)}/{len(res)} passed");_sys.exit(0 if all(res) else 1)
asyncio.run(main())
