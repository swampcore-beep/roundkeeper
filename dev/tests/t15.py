import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py: paths and addresses
import asyncio,json,urllib.request
from playwright.async_api import async_playwright
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("(s)=>__t(s)",js)
RAW="## Goblin\\n|STR|DEX|CON|INT|WIS|CHA|\\n|:---:|:---:|:---:|:---:|:---:|:---:|\\n|8 (-1)|14 (+2)|10 (+0)|10 (+0)|8 (-1)|8 (-1)|"
SET=f"""state.list=[['Styx','pc','bard',20],['Gregori','pc','cleric',18],['Isandros','pc','fighter',15],['Goblin','enemy','',10]].map(([n,k,c,i],j)=>({{...newCombatant({{kind:k}}),id:'c'+j,name:n,cls:c,init:i}}));
byId('c3').sb={{raw:"{RAW}",lr:null,la:null,uses:[],rech:[]}};state.turn=null;state.call=null;state.ended=null;state.fightAt=Date.now();commit()"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[]
        dm=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); dm.on('pageerror',lambda e:errs.append('dm '+str(e)))
        await dm.goto('http://127.0.0.1:8765/'); await asyncio.sleep(1); await T(dm,SET); await asyncio.sleep(.4)
        chk("save bonus from the ability table",await T(dm,"sbSaveMod(byId('c3').sb.raw,'Wis')")==-1)
        chk("save bonus from a Saving Throws line",await T(dm,"sbSaveMod('- **Saving Throws** Dex +6, Wis +4','Wis')")==4)
        chk("save bonus from a 2024 table",await T(dm,"sbSaveMod('| Wis | 14 | +2 | +5 |','Wis')")==5)
        # the sheet
        await T(dm,"byId('c3').conds=['Frightened'];commit();condSheet('c3')"); await asyncio.sleep(.3)
        await dm.select_option('.cdur[data-n=Frightened] select[data-cdur=end]','save'); await asyncio.sleep(.3)
        d=json.loads(await T(dm,"JSON.stringify(byId('c3').cdur)"))
        chk("choosing a save fills Wisdom DC 15",d.get('Frightened',{}).get('ab')=='Wis' and d['Frightened'].get('dc')==15,d)
        chk("save fields shown",await dm.locator('.cdur [data-cdur=dc]').count()==1)
        await dm.fill('.cdur [data-cdur=dc]','40'); await dm.press('.cdur [data-cdur=dc]','Tab'); await asyncio.sleep(.2)
        chk("DC typed",await T(dm,"byId('c3').cdur.Frightened.dc")==40)
        await dm.locator('.sheet').screenshot(path='t15_sheet.png')
        await T(dm,"closeSheet()")
        chk("DM chip shows timing",'Wis 40' in await dm.locator('#roster .row[data-id=c3] .cond').first.inner_text())
        # the rest by state
        await T(dm,"byId('c0').conds=['Frightened'];byId('c0').cdur={Frightened:{end:'save',ab:'Wis',dc:12}};byId('c1').conds=['Prone'];byId('c1').cdur={Prone:{end:'end'}};byId('c2').conds=['Blinded'];byId('c2').cdur={Blinded:{max:1,r0:1}};commit()")
        ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); await ctx.add_init_script("localStorage.setItem('it.meName','\"Styx\"')")
        ph=await ctx.new_page(); ph.on('pageerror',lambda e:errs.append('ph '+str(e))); await ph.goto(rk.PL+'/players'); await asyncio.sleep(2)
        await T(dm,"moveTurn(1)")   # Styx starts
        await T(dm,"moveTurn(1)"); await asyncio.sleep(.3)   # Styx ends: save asked
        call=json.loads(await T(dm,"JSON.stringify(state.call)"))
        chk("player asked for the save on the phone",call and call['to']==['c0'] and 'Wisdom save DC 12' in call['text'],call and call['text'])
        await asyncio.sleep(2)
        chk("phone shows the save",await T(ph,"pSheet")=="call")
        for k in ['1','5']: await ph.locator(f'.numpad [data-k="{k}"]').click()
        await ph.locator('[data-act=pcallsend]').click(); await asyncio.sleep(2.5)
        chk("made it: Frightened ends",await T(dm,"hasCond(byId('c0'),'Frightened')")==False)
        chk("logged in Player activity",'saved, Frightened ends' in await dm.locator('body').inner_text())
        await T(dm,"moveTurn(1)"); await asyncio.sleep(.2)   # Gregori ends: Prone gone; Isandros starts round1
        chk("ends at the end of its turn",await T(dm,"hasCond(byId('c1'),'Prone')")==False)
        chk("max 1 round not yet",await T(dm,"hasCond(byId('c2'),'Blinded')")==True)
        await T(dm,"moveTurn(1)"); await asyncio.sleep(.2)   # Isandros ends, Goblin starts
        await T(dm,"moveTurn(1)"); await asyncio.sleep(.2)   # Goblin ends: Wis -1 vs DC 40 fails ; round 2 Styx
        chk("monster rolls and fails DC 40",await T(dm,"hasCond(byId('c3'),'Frightened')")==True)
        await T(dm,"byId('c3').cdur.Frightened.dc=-5;commit()")
        await T(dm,"moveTurn(1)");await T(dm,"moveTurn(1)");await T(dm,"moveTurn(1)")   # round 2: Styx, Gregori -> Isandros starts
        chk("max rounds: Blinded ends at its turn in round 2",await T(dm,"hasCond(byId('c2'),'Blinded')")==False)
        await T(dm,"moveTurn(1)");await T(dm,"moveTurn(1)")   # goblin starts, goblin ends
        chk("monster makes the save",await T(dm,"hasCond(byId('c3'),'Frightened')")==False)
        await T(dm,"byId('c3').conds=['Restrained'];byId('c3').cdur={Restrained:{end:'start'}};commit()")
        await T(dm,"state.turn={id:'c2',round:3,init:15};commit();moveTurn(1)")
        chk("ends at the start of its turn",await T(dm,"hasCond(byId('c3'),'Restrained')")==False)
        # surprise
        await T(dm,"state.turn=null;state.surprise=false;commit()")
        await T(dm,"let q=[0.99,0.0];const R=Math.random;Math.random=()=>q.length?q.shift():R();sbItems=[{name:'Orc',ctype:'humanoid',size:'Medium',ac:13,hp:15,hpf:'',ib:2,cr:'1/2',lr:0,la:0,uses:[],rech:[],know:[],raw:'',count:1,hidden:false,boss:false,surp:true,im:'group'}];sbAdd()")
        chk("surprised monster: lower of two d20",await T(dm,"state.list.find(c=>c.name==='Orc').init")==3)
        await dm.check('#partySurp'); await asyncio.sleep(.3)
        chk("party surprised on",await T(dm,"state.surprise")==True)
        await T(ph,"pSheet='init';renderPSheet()"); await asyncio.sleep(2.2); await T(ph,"pSheet='init';renderPSheet()"); await asyncio.sleep(.3)
        chk("phone tells the player",await ph.locator('.surpnote').count()==1)
        await ph.screenshot(path='t15_phone.png')
        await T(ph,"pSheet=null;renderPSheet()")
        await T(dm,"moveTurn(1)")
        chk("turns starting turns surprise off",await T(dm,"state.surprise")==False)
        # roll call steps aside
        sf=await (await b.new_context(viewport={'width':912,'height':1368})).new_page(); sf.on('pageerror',lambda e:errs.append('sf '+str(e)))
        await sf.goto(rk.PL+'/players?shared=1'); await asyncio.sleep(2)
        await T(dm,"state.call={id:uid(),text:'Dexterity save DC 15',dc:15,at:Date.now(),to:['c0','c1'],answers:{c0:17,c1:9}};commit()"); await asyncio.sleep(2)
        chk("full panel first",await sf.locator('.callbar:not(.mini)').count()==1)
        await asyncio.sleep(15.5)
        chk("after 15 s one line",await sf.locator('.callbar.mini').count()==1)
        await sf.screenshot(path='t15_mini.png')
        # recap
        await T(dm,"byId('c3').bloodied=true;commit()"); await T(dm,"byId('c3').down=true;commit()")
        await T(ph,"pSend({action:'roll',kind:'nat20',text:'real dice',total:20})"); await asyncio.sleep(2)
        await dm.click('#endBtn'); await asyncio.sleep(.3)
        rec=await T(dm,"recapText()")
        print(rec)
        for want in ['Goblin is Bloodied','Goblin is defeated','Styx: natural 20','Dexterity save DC 15: Styx 17 ✓, Gregori 9 ✗','Frightened ends','Round 1','Combat ends','Enemies:']:
            chk("recap has: "+want,want in rec)
        await dm.click('#recapBtn'); await asyncio.sleep(.3)
        chk("recap sheet",await dm.locator('#recapText').count()==1)
        await dm.locator('.sheet').screenshot(path='t15_recap.png')
        op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
        st=json.loads(op.open(rk.PL+'/state').read())
        chk("players never get the recap",'clog' not in st)
        chk("no page errors",not errs,errs)
        await b.close()
asyncio.run(main()); print("ALL OK" if ok else "SOME FAILED")
