import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json,urllib.request
from playwright.async_api import async_playwright
op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def st(): return json.loads(op.open('http://127.0.0.1:8765/state').read())
def post(b): op.open(urllib.request.Request('http://127.0.0.1:8765/player',data=json.dumps(b).encode(),headers={'Content-Type':'application/json'}))
def me(n): return [c for c in st()['list'] if c['name']==n][0]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']); errs=[]
        dm=await (await b.new_context(viewport={'width':1536,'height':864})).new_page(); dm.on('pageerror',lambda e:errs.append('dm '+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await dm.wait_for_timeout(800)
        for n in ['Styx','Gregori']:
            await dm.fill('#pName',n); await dm.fill('#pAc','15'); await dm.press('#pAc','Enter'); await dm.wait_for_timeout(120)
        await dm.click('#party [data-act=pload]'); await dm.fill('#qAdd','Medusa 16 hp60'); await dm.press('#qAdd','Enter'); await dm.wait_for_timeout(300)
        I={c['name']:c['id'] for c in st()['list']}
        ph=await (await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)).new_page(); ph.on('pageerror',lambda e:errs.append('ph '+str(e)))
        await ph.goto(rk.PL+'/players'); await ph.wait_for_timeout(1200)
        await ph.click('[data-act=pickme][data-n="Styx"]'); await ph.wait_for_timeout(500)
        await ph.click('[data-act=php]'); await ph.click('.numpad [data-k="3"]'); await ph.click('.numpad [data-k="0"]'); await ph.click('[data-act=phpdo][data-hp=max]'); await ph.wait_for_timeout(200); await ph.click('.psheet .sx')
        # Styx casts Bless (concentration)
        post({'id':I['Styx'],'action':'effect_add','name':'Bless','targets':[I['Gregori']],'conc':True}); await ph.wait_for_timeout(1500)
        # 1. damage 24 -> concentration DC 12
        await ph.click('[data-act=php]'); await ph.click('.numpad [data-k="2"]'); await ph.click('.numpad [data-k="4"]'); await ph.click('[data-act=phpdo][data-hp=dmg]'); await ph.wait_for_timeout(600)
        print('1 conc sheet:', (await ph.locator('.psheet .callhead').inner_text()).replace('\n',' | '))
        await ph.screenshot(path='/tmp/r_conc.png')
        await ph.click('[data-act=pconres][data-ok="0"]'); await ph.wait_for_timeout(1800)
        print('A after "I lost it": conds', me('Styx')['conds'], '| effects', [e['name'] for e in st()['effects']])
        await ph.click('.psheet .sx')
        # 2. Gregori concentrating then down via DM click -> concentration ends
        post({'id':I['Gregori'],'action':'effect_add','name':'Spirit Guardians','targets':[],'conc':True,'area':True}); await dm.wait_for_timeout(1300)
        print('2 Gregori before:', me('Gregori')['conds'], [e['name'] for e in st()['effects']])
        await dm.locator('.row:has(input[value="Gregori"]) [data-act=down]').click(); await dm.wait_for_timeout(800)
        print('A after 0 HP:', me('Gregori')['conds'], [e['name'] for e in st()['effects']])
        # 4. death saves rolled by Styx: put Styx at 0 HP from the phone
        await ph.click('[data-act=php]'); await ph.click('.numpad [data-k="1"]'); await ph.click('.numpad [data-k="0"]'); await ph.click('[data-act=phpdo][data-hp=dmg]'); await ph.wait_for_timeout(1800); await ph.click('.psheet .sx')
        print('4 Styx down:', me('Styx')['down'])
        await ph.click('[data-act=pconds]'); await ph.wait_for_timeout(600); await ph.screenshot(path='/tmp/r_dbg.png'); print('  sheet:', (await ph.locator('.psheet').inner_text())[:200].replace('\n',' | '))
        for k in range(3):
            await ph.evaluate(f"()=>{{window.__r=Math.random;Math.random=()=>{[0.6,0.2,0.0][k]}}}")
            await ph.click('[data-act=pdsroll]'); await ph.evaluate("()=>{Math.random=window.__r}"); await ph.wait_for_timeout(1300)
            print('  roll', k, (await ph.locator('.psheet .dresult').first.inner_text()).replace('\n',' | '), '| ds', me('Styx').get('ds'))
        await ph.screenshot(path='/tmp/r_ds.png')
        post({'id':I['Styx'],'action':'ds','s':0,'f':1}); await ph.wait_for_timeout(1500)
        await ph.evaluate("()=>{window.__r=Math.random;Math.random=()=>0.999}"); await ph.click('[data-act=pdsroll]'); await ph.evaluate("()=>{Math.random=window.__r}"); await ph.wait_for_timeout(1800)
        s=me('Styx'); print('  nat 20 -> down', s['down'], 'bloodied', s['bloodied'], '| phone HP chip', await ph.locator('[data-act=php]').inner_text())
        await ph.click('.psheet .sx')
        # 5. exhaustion penalty
        post({'id':I['Styx'],'action':'exh','level':2}); await ph.wait_for_timeout(1500)
        await ph.click('[data-act=pdice]'); await ph.click('[data-act=proll]'); await ph.wait_for_timeout(300)
        print('5 dice:', (await ph.locator('.dresult').inner_text()).replace('\n',' | '), '| note:', await ph.locator('.psheet .psub').first.inner_text())
        await ph.click('.psheet .sx')
        # 3. long rest lowers exhaustion
        await ph.click('[data-act=pres]'); await ph.click('[data-act=rrest][data-r=long]'); await ph.wait_for_timeout(1800)
        print('3 after long rest exh:', me('Styx').get('exh'), me('Styx')['conds'])
        print('errors',errs); await b.close()
asyncio.run(main())
