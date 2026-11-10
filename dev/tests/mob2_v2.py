import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1280,'height':900})).new_page(); dm.on('pageerror',lambda e:errs.append('dm '+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await dm.wait_for_timeout(800)
        for n,cl,ac in [('Styx','bard','16'),('Gregori','cleric','18'),('Isandros','fighter','21'),('Astrea','druid','17')]:
            await dm.fill('#pName',n); await dm.select_option('#pCls',cl); await dm.fill('#pAc',ac); await dm.press('#pAc','Enter'); await dm.wait_for_timeout(120)
        await dm.click('#party [data-act=pload]'); await dm.wait_for_timeout(200)
        await dm.fill('#qAdd','Sydon 26 ac25 boss, Lutheria 22 ac22 boss, Medusa 16 ac16, Styx 20, Gregori 18, Isandros 15, Astrea 12, Goblin x3 10 ac13'); await dm.press('#qAdd','Enter'); await dm.wait_for_timeout(300)
        row=lambda n: dm.locator(f'.row:has(input[value="{n}"])')
        for nm,tp in [('Sydon','celestial'),('Lutheria','undead'),('Medusa','aberration')]:
            await row(nm).locator('[data-act=rowmenu]').click(); await row(nm).locator('.rmenu select[data-act=ctype]').select_option(tp); await dm.wait_for_timeout(150)
        await row('Medusa').locator('[data-act=bloodied]').click(); await dm.wait_for_timeout(300)
        sf=await (await b.new_context(viewport={'width':1280,'height':800})).new_page(); sf.on('pageerror',lambda e:errs.append('sf '+str(e)))
        await sf.goto(rk.PL+'/players?shared=1')
        ph=await (await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)).new_page(); ph.on('pageerror',lambda e:errs.append('ph '+str(e)))
        await ph.goto(rk.PL+'/players'); await ph.wait_for_timeout(1300)
        await ph.click('[data-act=pickme][data-n="Gregori"]'); await ph.wait_for_timeout(700)
        await ph.screenshot(path='/tmp/u_1main.png')
        # HP first run
        await ph.click('[data-act=php]'); await ph.wait_for_timeout(300); await ph.screenshot(path='/tmp/u_2hpfirst.png')
        await ph.click('.numpad [data-k="3"]'); await ph.click('.numpad [data-k="8"]'); await ph.click('[data-act=phpdo][data-hp=max]'); await ph.wait_for_timeout(300); await ph.screenshot(path='/tmp/u_3hp.png')
        await ph.click('.numpad [data-k="2"]'); await ph.click('.numpad [data-k="1"]'); await ph.click('[data-act=phpdo][data-hp=dmg]'); await ph.wait_for_timeout(300)
        await ph.click('.psheet .sx'); await ph.wait_for_timeout(300)
        # conditions sheet: full content reachable
        await ph.click('[data-act=pconds]'); await ph.wait_for_timeout(300); await ph.screenshot(path='/tmp/u_4conds.png')
        await ph.click('[data-act=pcond][data-n="Prone"]'); await ph.click('[data-act=pexh][data-d="1"]'); await ph.click('[data-act=pexh][data-d="1"]'); await ph.click('[data-act=ptag][data-t=reaction]'); await ph.click('[data-act=pcover][data-c=half]')
        await ph.locator('.psheet .sbody').evaluate('e=>e.scrollTop=e.scrollHeight'); await ph.wait_for_timeout(200); await ph.screenshot(path='/tmp/u_5conds_bottom.png')
        # swipe down on header to close
        hb=await ph.locator('.psheet .shead').bounding_box()
        await ph.mouse.move(hb['x']+60,hb['y']+20); await ph.mouse.down(); await ph.mouse.move(hb['x']+60,hb['y']+200,steps=8); await ph.mouse.up(); await ph.wait_for_timeout(500)
        print('sheet closed by swipe:', await ph.locator('.psheet').count()==0)
        # Bless from Styx on Gregori via server
        import json,urllib.request
        op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
        st=json.loads(op.open('http://127.0.0.1:8765/state').read()); ids={c['name']:c['id'] for c in st['list']}
        op.open(urllib.request.Request('http://127.0.0.1:8765/player',data=json.dumps({'id':ids['Styx'],'action':'effect_add','name':'Bless','targets':[ids['Gregori'],ids['Isandros']],'conc':True}).encode(),headers={'Content-Type':'application/json'}))
        await ph.wait_for_timeout(2200); await ph.screenshot(path='/tmp/u_6bar.png')
        print('my chips:', await ph.locator('.mystat').inner_text())
        # tap-to-remove Prone
        chip=ph.locator('.mychip[data-k="cond:Prone"]'); await chip.click(); await ph.wait_for_timeout(200); print('armed text:', await chip.inner_text())
        await ph.screenshot(path='/tmp/u_7armed.png')
        await chip.click(); await ph.wait_for_timeout(1800); print('after remove:', (await ph.locator('.mystat').inner_text()).replace('\n',' | '))
        print('DM Gregori still prone?', await row('Gregori').locator('text=Prone').count())
        await ph.click('[data-act=pmore]'); await ph.wait_for_timeout(300); await ph.screenshot(path='/tmp/u_8more.png'); await ph.click('.psheet .sx')
        await ph.click('[data-act=pres]'); await ph.wait_for_timeout(300); await ph.screenshot(path='/tmp/u_9res.png'); await ph.click('.psheet .sx')
        await ph.click('[data-act=peffs]'); await ph.wait_for_timeout(300); await ph.screenshot(path='/tmp/u_10effs.png'); await ph.click('.psheet .sx')
        await sf.screenshot(path='/tmp/u_sf.png')
        print('errors', errs); await b.close()
asyncio.run(main())
