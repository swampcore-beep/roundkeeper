import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py:
# 1.4: the DM screen's layout on a laptop (1920×1080 and 1536×864, Windows at 125 %): the turn in one row, nothing covers the order,
# the columns line up, empty cells say what they are, targets of at least 24 px, phones without text under 12 px.
# With dev/.work/axe.min.js present (npm i axe-core, copy axe.min.js there) it also runs axe (WCAG 2.2 AA) on the DM screen and the phone.
import asyncio,os
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
AXE=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'.work','axe.min.js')
FIGHT="""state.list=EXAMPLE();state.list.forEach((c,i)=>{if(typeof c.init!=='number')c.init=20-i});
  state.list.push({id:'nohp',kind:'enemy',name:'Thug',init:3,conds:[]},{id:'wolf',kind:'enemy',ctype:'beast',name:'Wolf',init:4,hpMax:11,hp:11,ac:12,conds:[]});
  state.lair=true;commit()"""
async def axe(pg,name):
    if not os.path.exists(AXE): return
    await pg.add_script_tag(path=AXE)
    v=await pg.evaluate("""async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations
      .filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>v.id+' '+v.nodes.length)""")
    chk(f"axe: no serious problems on {name}",not v,v)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        for w,h in [(1920,1080),(1536,864)]:
            dm=await (await b.new_context(viewport={'width':w,'height':h})).new_page(); dm.on("pageerror",lambda e:errs.append(str(e)))
            await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1.5)
            await T(dm,FIGHT); await asyncio.sleep(.5); await dm.click('[data-act=tnext]'); await asyncio.sleep(.5)
            g=await dm.evaluate("""()=>{const r=e=>e.getBoundingClientRect();const foot=r(document.querySelector('.dmmain>.foot')),
              tools=r(document.querySelector('.dmtools')),ros=document.querySelector('#roster'),R=r(ros),
              tiles=[...document.querySelectorAll('#turnBox>*')].map(e=>Math.round(r(e).top));
              return {footH:Math.round(foot.height),toolsH:Math.round(tools.height),rosterBottom:Math.round(R.bottom),footTop:Math.round(foot.top),
                pageScroll:document.scrollingElement.scrollHeight>innerHeight+1,tileTops:[...new Set(tiles)].length,
                rows:ros.querySelectorAll('.row').length,fits:ros.scrollHeight<=ros.clientHeight+1}}""")
            chk(f"{w}: the turn is one row",g['tileTops']==1 and g['footH']<=76,g)
            chk(f"{w}: the tools are one row",g['toolsH']<=52,g['toolsH'])
            chk(f"{w}: the order ends above the turn row",g['rosterBottom']<=g['footTop'],g)
            chk(f"{w}: the page itself doesn't scroll",not g['pageScroll'])
            chk(f"{w}: the example fight fits without scrolling",g['fits'],g['rows'])
            cols=await dm.evaluate("""()=>['.tools>.hpw','.tools>.ac-wrap','.tools>.stat'].map(s=>[...document.querySelectorAll('#roster .row:not(.k-lair) '+s)]
              .map(e=>Math.round(e.getBoundingClientRect().left))).map(a=>new Set(a).size)""")
            chk(f"{w}: HP, AC and status line up from row to row",cols==[1,1,1],cols)
            heads=await dm.evaluate("()=>[...document.querySelectorAll('#rosterHead span')].map(e=>e.textContent)")
            chk(f"{w}: column heads",heads==['Init','Combatant','Conditions','HP','AC','Status'],heads)
            if w==1920:
                chk("no HP yet: a field that says Set HP",await dm.get_attribute('#hp-nohp','placeholder')=='Set HP')
                bw=await dm.evaluate("()=>getComputedStyle(document.querySelector('#hp-nohp')).borderTopWidth")
                chk("…with a visible border",bw not in ('0px',''),bw)
                chk("no class or type: a person outline, not an empty square",await dm.locator('#roster .row[data-id=nohp] .dmsig.nosig').count()==1 and
                    await dm.evaluate("()=>getComputedStyle(document.querySelector('#roster .row[data-id=nohp] .dmsig.nosig')).maskImage||getComputedStyle(document.querySelector('#roster .row[data-id=nohp] .dmsig.nosig')).webkitMaskImage")!='none')
                chk("empty AC says AC",await dm.get_attribute('#ac-nohp','placeholder')=='AC')
                lair=await dm.evaluate("()=>{const r=document.querySelector('#roster .row.k-lair').getBoundingClientRect();return Math.round(r.height)}")
                chk("the lair action is one line",lair<=48,lair)
                chk("Bloodied is a quiet icon while off",await dm.evaluate("()=>getComputedStyle(document.querySelector('#roster .row[data-id=nohp] .tog.blood .tl')).display")=='none')
                await T(dm,"byId('nohp').bloodied=true;commit()"); await asyncio.sleep(.3)
                chk("…and says Bloodied when on",await dm.evaluate("()=>getComputedStyle(document.querySelector('#roster .row[data-id=nohp] .tog.blood .tl')).display")!='none')
                small=await dm.evaluate("""()=>[...document.querySelectorAll('#roster button,#roster input,.dmtools button,#turnBox button')].filter(e=>{const r=e.getBoundingClientRect();
                  return r.width>0&&r.height>0&&(r.width<24||r.height<24)}).map(e=>(e.className||e.tagName)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height))""")
                chk("targets of at least 24 px in the order, the tools and the turn",not small,small[:6])
                hid=await T(dm,"state.list.find(c=>c.kind!=='pc'&&c.hpMax!=null).id")
                x0=await dm.evaluate(f"()=>Math.round(document.querySelector('#roster .row[data-id=\"{hid}\"] .who').getBoundingClientRect().left)")
                await dm.click('[data-act=mtstart]'); await asyncio.sleep(.4)
                chk("Hit several: the tick sits in the Init column",await dm.locator(f'#roster .row[data-id="{hid}"] .hexw .mtcb').count()==1)
                mt=await dm.evaluate("()=>{const a=document.querySelector('#mtBar').getBoundingClientRect(),f=document.querySelector('.dmmain>.foot').getBoundingClientRect();return a.bottom<=f.top+1}")
                chk("…and its bar sits above the turn row",mt)
                x1=await dm.evaluate(f"()=>Math.round(document.querySelector('#roster .row[data-id=\"{hid}\"] .who').getBoundingClientRect().left)")
                await dm.keyboard.press('Escape'); await asyncio.sleep(.3)
                chk("…and nothing moved",x0==x1,(x0,x1))
                await T(dm,"toast('Testing the toast')"); await asyncio.sleep(.3)
                tt=await dm.evaluate("()=>{const t=document.querySelector('#toast').getBoundingClientRect(),f=document.querySelector('.dmmain>.foot').getBoundingClientRect();return t.bottom<f.top}")
                chk("toasts sit up top, not over the turn row",tt)
                await axe(dm,"the DM screen")
                await T(dm,"state.turn=null;commit()"); await asyncio.sleep(.3)
                chk("before turns: no fight time",await dm.locator('#turnBox .tfight').count()==0 and 'Start turns' in await dm.locator('#turnBox').inner_text())
                chk("before turns: the panel puts Add to combat first",await dm.evaluate("()=>getComputedStyle(document.querySelector('.panel[data-k=add]')).order")=='1')
                await dm.click('[data-act=tnext]'); await asyncio.sleep(.3)
                chk("in a fight: Roll call first",await dm.evaluate("()=>getComputedStyle(document.querySelector('.panel[data-k=call]')).order")=='1')
                await dm.click('#setBtn'); await asyncio.sleep(.3)
                chk("the gear opens Settings and files",await dm.locator('.panel[data-k=more]').is_visible())
                await dm.click('#setBtn'); await asyncio.sleep(.2)
                await dm.set_viewport_size({'width':1024,'height':768}); await asyncio.sleep(.4)
                chk("narrow window: the panel is a drawer, closed",not await dm.locator('#side').is_visible() or await dm.evaluate("()=>document.querySelector('#side').getBoundingClientRect().left>=innerWidth-2"))
                await dm.click('#sideBtn'); await asyncio.sleep(.4)
                chk("…that Panel opens",await dm.evaluate("()=>document.querySelector('#side').getBoundingClientRect().right<=innerWidth+1&&document.querySelector('#side').getBoundingClientRect().left<innerWidth-200"))
        # ---- a phone: the dock and four tabs; nothing under 12 px
        ph=await (await b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)).new_page(); ph.on("pageerror",lambda e:errs.append("phone: "+str(e)))
        await ph.goto(rk.PL+'/players'); await asyncio.sleep(1.2)
        pc=await T(dm,"state.list.find(c=>c.kind==='pc').name")
        await ph.click(f'[data-act=pickme][data-n="{pc}"]'); await asyncio.sleep(1.5)
        tabs=await ph.evaluate("()=>[...document.querySelectorAll('.pbar .ptabs .tab')].map(t=>t.dataset.act)")
        chk("phone: four tabs, More last",len(tabs)==4 and tabs[0]=='pdice' and tabs[-1]=='pmore',tabs)
        chk("phone: the dock has HP",await ph.locator('.pbar .pdock [data-act=php]').count()==1)
        hs=await ph.evaluate("()=>[...document.querySelectorAll('.pbar .ptabs .tab')].map(t=>Math.round(t.getBoundingClientRect().height))")
        chk("phone: tabs at least 48 px high",min(hs)>=48,hs)
        tiny=await ph.evaluate("""()=>{const out=[];const w=document.createTreeWalker(document.querySelector('#player'),NodeFilter.SHOW_TEXT);let t;
          while(t=w.nextNode()){const e=t.parentElement;if(!t.textContent.trim()||!e)continue;const r=e.getBoundingClientRect();if(!r.width||!r.height)continue;
            const s=parseFloat(getComputedStyle(e).fontSize);if(s<11.95)out.push(e.className+' '+s+' '+t.textContent.trim().slice(0,16))}return out}""")
        chk("phone: no text under 12 px",not tiny,tiny[:6])
        await axe(ph,"the phone")
        chk("no page errors",not errs,errs[:3])
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
