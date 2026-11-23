import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
"""t42 (1.5, needs RK_5ETOOLS): feats on the sheet from the DM's 5e.tools files: the list, the choices a feat asks for (ability options, saves, skills,
expertise), Add and apply / Add only, taking a feat off again, the rules some feats have only in their text (Alert, Tough, War Caster, Durable),
their uses as trackers, and the feats on the DM's card."""
import asyncio,json
from playwright.async_api import async_playwright
res=[]
def chk(n,c,x=""):
    res.append(bool(c)); print(("PASS " if c else "FAIL ")+n,("· "+str(x)) if x!="" else "")
async def T(pg,js): return await pg.evaluate("(s)=>__t(s)",js)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        dm=await (await b.new_context(viewport={'width':1920,'height':1080})).new_page(); dm.on('pageerror',lambda e:errs.append('dm '+str(e)))
        await dm.goto(rk.DM+'/'); await asyncio.sleep(1)
        await T(dm,"state.list=[{...newCombatant({kind:'pc'}),id:'i',name:'Isandros',cls:'paladin',init:12}];state.sheets={};commit()")
        ph=await (await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)).new_page(); ph.on('pageerror',lambda e:errs.append('ph '+str(e)))
        await ph.goto(rk.PL+'/players'); await asyncio.sleep(1.5); await ph.click('[data-act=pickme][data-n="Isandros"]'); await asyncio.sleep(1)
        n=await T(ph,"pcLoad().then(d=>d?d.feats.filter(r=>r[0]==='feat').length:0)")
        chk("The phone reads the feats from the DM's files",n>50,n)
        await T(ph,"shDraft=Object.assign(shBlank('Isandros'),{cls:'Paladin 5',lvl:5,ab:{str:16,dex:10,con:13,int:8,wis:12,cha:16},sv:['wis','cha'],sk:{athletics:1},hp:44,speed:30});"
                   "shStep=3;pSheet='shed';renderPSheet()"); await asyncio.sleep(.4)
        chk("Feats step: a list to pick from without typing",await ph.locator('#shFeatList .spi').count()>=5,'')
        async def add(name,picks,ap='1'):
            await T(ph,f"shFeatQ={json.dumps(name)};renderPSheet()"); await asyncio.sleep(.3)
            await ph.locator('#shFeatList .spi').filter(has_text=name).first.click(); await asyncio.sleep(1)
            for k,v in picks: await ph.click(f'.shfpick [data-act=shfsel][data-k={k}][data-v="{v}"]'); await asyncio.sleep(.1)
            prev=await ph.locator('.shfprev').inner_text(); await ph.click(f'.shfpick [data-act=shfadd][data-ap="{ap}"]'); await asyncio.sleep(.3); return prev
        st=lambda: T(ph,"const C=shCalc(shDraft);JSON.stringify({ab:shDraft.ab,sv:shDraft.sv,sk:shDraft.sk,hp:shDraft.hp,speed:shDraft.speed,init:C.init,conc:C.concAdv,ds:C.dsAdv})")
        pv=await add('Resilient',[('ab','con'),('sv','con')]); s=json.loads(await st())
        chk("Resilient: choose Con, the preview says it, Add and apply raises Con and adds the save",'CON +1' in pv and 'CON save' in pv and s['ab']['con']==14 and 'con' in s['sv'],[pv,s['ab']['con'],s['sv']])
        pv=await add('Alert',[]); s=json.loads(await st())
        chk("Alert (2024): proficiency on Initiative, worked out (Dex +0, PB +3 -> +3)",s['init']==3,s['init'])
        pv=await add('Tough',[]); s=json.loads(await st())
        chk("Tough: +2 HP per level once (44 -> 54 at level 5)",s['hp']==54,s['hp'])
        pv=await add('Skill Expert',[('ab','dex'),('sk','stealth'),('exp','athletics')]); s=json.loads(await st())
        chk("Skill Expert: ability, a skill and expertise in a skill you have",s['ab']['dex']==11 and s['sk'].get('stealth')==1 and s['sk'].get('athletics')==2,s['sk'])
        pv=await add('War Caster',[('ab','cha')]); s=json.loads(await st())
        chk("War Caster: Cha +1 and advantage on Concentration",s['ab']['cha']==17 and s['conc'],s)
        pv=await add('Durable',[],ap='0'); s=json.loads(await st())
        chk("Durable with Add only: Con stays (already counted), advantage on death saves still works",s['ab']['con']==14 and s['ds'],s)
        pv=await add('Lucky',[]); r=await T(ph,"resGet().map(x=>x.name+':'+x.max)")
        chk("Lucky: its Luck Points become a tracker, counted from the sheet (PB 3)",any(x.endswith(':3') and 'Luck' in x for x in r),r)
        await T(ph,"shFeatQ='Ability Score';renderPSheet()"); await asyncio.sleep(.3)
        await ph.locator('#shFeatList .spi').filter(has_text='Ability Score Improvement').first.click(); await asyncio.sleep(1)
        opts=await ph.locator('.shfpick [data-act=shfopt]').count()
        await ph.click('.shfpick [data-act=shfopt][data-i="1"]'); await ph.click('.shfpick [data-act=shfsel][data-k=ab][data-v=str]'); await ph.click('.shfpick [data-act=shfsel][data-k=ab][data-v=wis]')
        pv=await ph.locator('.shfprev').inner_text(); await ph.click('.shfpick [data-act=shfadd][data-ap="1"]'); await asyncio.sleep(.3); s=json.loads(await st())
        chk("Ability Score Improvement: two options (+2 to one, +1 to two); +1 Str and Wis",opts==2 and s['ab']['str']==17 and s['ab']['wis']==13,[opts,pv])
        await T(ph,"const i=shDraft.feats.findIndex(f=>f.n==='Resilient');document.querySelectorAll('[data-act=shfeatrm]')[i].click()"); await asyncio.sleep(.3)
        s=json.loads(await st())
        chk("Taking Resilient off undoes what it applied (Con 13, no Con save)",s['ab']['con']==13 and 'con' not in s['sv'],[s['ab']['con'],s['sv']])
        await T(ph,"document.querySelector('[data-act=shdone]')||(shStep=SH_STEPS.length-1,renderPSheet())"); await asyncio.sleep(.3)
        await ph.click('[data-act=shdone]'); await asyncio.sleep(1.5)
        # the DM card lists the feats with what they do
        await T(dm,"sbViewId='i';renderSbDrawer()"); await asyncio.sleep(.5); txt=await dm.locator('#sbDrawer').inner_text()
        chk("DM card: the feats with what they change",'Alert' in txt and 'Tough' in txt and 'advantage on Concentration' in txt,txt[txt.find('FEATS'):][:200].replace('\n',' | '))
        # War Caster on the Concentration save
        await T(dm,"byId('i').conds=['Concentrating'];commit()"); await asyncio.sleep(.8)
        await T(ph,"hpChange('max',54);pConc=null;hpChange('dmg',12)"); await asyncio.sleep(.4)
        r=await T(ph,"(document.querySelector('.psheet [data-act=pconroll].primary')||{}).dataset?.adv||''")
        chk("War Caster: the Concentration save offers advantage first",r=='1',r)
        # Durable on death saves
        await T(dm,"const c=byId('i');c.conds=[];c.down=true;c.ds={s:0,f:0};commit()"); await asyncio.sleep(.8)
        r=await T(ph,"const _r=Math.random;let k=0;Math.random=()=>[0.1,0.6][k++%2];rollDeathSave();Math.random=_r;dsLast&&[dsLast.d,dsLast.msg]")
        chk("Durable: death saves with advantage (3 and 13 -> 13, a success)",r and r[0]==13,r)
        print('errors',errs); await b.close()
    print("SUMMARY",sum(res),"pass",len(res)-sum(res),"fail")
asyncio.run(main())
