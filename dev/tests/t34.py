import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py:
# Settings → Updates (step 1): the server asks "GitHub" (a fake one here, on :8799) for the latest release, only for the
# computer running it and only when asked; the window says what's new and links the right download. dev/test.sh starts the
# server for this suite with ROUNDKEEPER_UPDATE_URL pointing here and ROUNDKEEPER_VERSION=v1.0.7.
import asyncio,json,threading,urllib.request,urllib.error
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright
op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
ok=True
def chk(n,c,x=""):
    global ok; ok&=bool(c); print(("PASS " if c else "FAIL ")+n,x)
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
F='http://127.0.0.1:8799'
def release(tag,**k):
    r={"tag_name":tag,"html_url":f"https://github.com/swampcore-beep/roundkeeper/releases/tag/{tag}","published_at":"2026-11-12T10:00:00Z",
       "body":"TV shows roll calls as cards.\n<b>not bold</b> & more","assets":[{"name":n,"browser_download_url":f"{F}/dl/{n}","size":8_000_000}
       for n in ("Roundkeeper-windows.zip","Roundkeeper-mac.zip","Roundkeeper-linux.zip","Roundkeeper-python.zip","SHA256SUMS.txt")]}
    r.update(k);return r
G={"mode":"json","code":200,"data":release("v1.0.8"),"hits":0}
class Fake(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        G["hits"]+=1
        if G["mode"]=="drop": self.close_connection=True;self.wfile.flush();self.connection.shutdown(2);return
        body=(json.dumps(G["data"]) if G["mode"]=="json" else "<html>not json</html>").encode()
        self.send_response(G["code"]);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(body)));self.end_headers();self.wfile.write(body)
srv=ThreadingHTTPServer(('127.0.0.1',8799),Fake);threading.Thread(target=srv.serve_forever,daemon=True).start()
def check(base=rk.DM,force=True):
    try: return 200,json.loads(op.open(base+'/update/check'+('?force=1' if force else ''),timeout=15).read())
    except urllib.error.HTTPError as e: return e.code,json.loads(e.read() or b'{}')
async def main():
    # ---- the server ----
    code,d=check()
    chk("asks the release and sees a newer one",code==200 and d.get('current')=='v1.0.7' and d.get('latest')=='v1.0.8' and d.get('newer') is True,d)
    plat=d.get('platform');want={'linux':'Roundkeeper-linux.zip','python':'Roundkeeper-python.zip'}.get(plat)
    chk("picks the download for this kind of program",want and (d.get('asset') or {}).get('name')==want and d['asset']['url']==f"{F}/dl/{want}",(plat,d.get('asset')))
    chk("release page and notes",d.get('page','').startswith('https://github.com/') and 'roll calls' in d.get('notes','') and d.get('published','').startswith('2026-11-12'),d)
    chk("not a development build",d.get('dev') is False and d.get('error') is None)
    G["data"]=release("v1.0.9");h=G["hits"];code,d=check(force=False)
    chk("a second look within 10 minutes comes from the cache",d.get('latest')=='v1.0.8' and G["hits"]==h,(d.get('latest'),G["hits"]-h))
    code,d=check();chk("Check again asks again",d.get('latest')=='v1.0.9' and d.get('newer') is True,d.get('latest'))
    for tag,new in (("v1.0.7",False),("v1.0.6",False),("v1.0.10",True),("1.1",True),("v2",True),("nightly",False)):
        G["data"]=release(tag);code,d=check();chk(f"{tag} is {'newer' if new else 'not newer'}",d.get('newer') is new and d.get('error') is None,d.get('newer'))
    G["data"]=release("v1.0.8",html_url="https://evil.example/x",assets=[{"name":"Roundkeeper-linux.zip","browser_download_url":"https://evil.example/a.zip"},
        {"name":"Roundkeeper-python.zip","browser_download_url":"https://evil.example/b.zip"}])
    code,d=check();chk("links that aren't GitHub's are dropped",d.get('page') is None and d.get('asset') is None and d.get('newer') is True,d)
    for mode,c,err in (("json",403,"limit"),("json",429,"limit"),("json",500,"bad"),("html",200,"bad"),("drop",200,"offline")):
        G.update(mode=mode,code=c,data=release("v1.0.8"));code,d=check()
        chk(f"{mode} {c} -> {err}",code==200 and d.get('error')==err and d.get('newer') is False,d.get('error'))
    G.update(mode="json",code=200,data={"message":"Not Found"});code,d=check();chk("not a release -> bad",d.get('error')=='bad',d.get('error'))
    G.update(mode="json",code=200,data=release("v1.0.8",body="<b>not bold</b> & more\nline two"))
    h=G["hits"];code,d=check(rk.PL)
    chk("a phone or a paired device can't ask",code==403 and G["hits"]==h,(code,d))
    check()   # back to v1.0.8, cached for the page below
    # ---- the window ----
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-proxy-server']);errs=[];asks=[]
        ctx=await b.new_context(viewport={'width':1440,'height':900});dm=await ctx.new_page()
        dm.on("pageerror",lambda e:errs.append(str(e)));dm.on("request",lambda r:asks.append(r.url) if '/update/check' in r.url else None)
        await dm.goto(rk.DM+'/');await asyncio.sleep(5.5)
        chk("no check at start unless it's turned on",asks==[],asks)
        await dm.evaluate("document.querySelector('[data-k=more]').open=true");await asyncio.sleep(.3)
        await dm.click('[data-act=updates]');await asyncio.sleep(.6)
        txt=await dm.inner_text('#updSheet')
        chk("opening the window doesn't go online",asks==[] and 'Check for updates' in txt and 'nothing else leaves this computer' in txt,txt[:200])
        chk("the start-up check is off",not await dm.is_checked('#updAuto'))
        await dm.click('[data-act=updcheck]');await asyncio.sleep(2)
        txt=await dm.inner_text('#updSheet')
        chk("it says what's out and what you have",'v1.0.8 is out.' in txt and 'You have v1.0.7' in txt and 'Check again' in txt,txt[:300])
        chk("the notes are text, not HTML",await dm.locator('#updSheet .updnotes b').count()==0 and '<b>not bold</b> & more' in await dm.inner_text('#updSheet .updnotes'))
        href=await dm.get_attribute('#updSheet a.btn.primary','href');lbl=await dm.inner_text('#updSheet a.btn.primary')
        chk("the download button links the right zip",href==f"{F}/dl/{want}" and lbl.startswith('Download for') and '7.6 MB' in lbl,(href,lbl))
        chk("and the release page opens in a new tab",await dm.get_attribute('#updSheet a[target=_blank]','href')=='https://github.com/swampcore-beep/roundkeeper/releases/tag/v1.0.8')
        how=await dm.inner_text('#updSheet')
        chk("how to swap, for this kind of program",('Stop Roundkeeper' in how) if plat=='linux' else ('Stop the server' in how and 'state.json' in how),plat)
        chk("a dot on Settings and on Updates",await dm.evaluate("()=>document.querySelector('[data-k=more]>summary').classList.contains('upddot')&&document.querySelector('[data-act=updates]').classList.contains('upddot')"))
        await dm.check('#updAuto');await asyncio.sleep(.3)
        chk("the start-up check can be turned on",await dm.evaluate("()=>localStorage.getItem('it.updAuto')")=='true')
        # every state of the window
        for name,info,want_txt in (("latest",{"current":"v1.0.8","latest":"v1.0.8","newer":False,"dev":False,"platform":"windows"},"You have the latest version (v1.0.8)"),
                                   ("dev",{"current":"dev","latest":"v1.0.8","newer":False,"dev":True},"development build (dev)"),
                                   ("offline",{"error":"offline"},"Couldn't reach GitHub."),("certs",{"error":"certs"},"Install Certificates.command"),
                                   ("limit",{"error":"limit"},"too many checks"),("host",{"error":"host"},"Only the computer running Roundkeeper"),
                                   ("windows",{"current":"v1.0.7","latest":"v1.0.8","newer":True,"platform":"windows","asset":{"url":"https://github.com/x/w.zip","size":4288433}},"Roundkeeper.exe"),
                                   ("mac",{"current":"v1.0.7","latest":"v1.0.8","newer":True,"platform":"mac","asset":{"url":"https://github.com/x/m.zip","size":0}},"Open Anyway")):
            await T(dm,f"updInfo={json.dumps(info)};updBusy=false;updSheet()");await asyncio.sleep(.2)
            t=await dm.inner_text('#updSheet');chk(f"window: {name}",want_txt in t,t[:160])
        lbl=await dm.inner_text('#updSheet a.btn.primary');chk("Download for Mac",lbl=='Download for Mac',lbl)
        await dm.keyboard.press('Escape')
        # turned on: one check a few seconds after start, and a toast
        asks.clear();await dm.reload();await asyncio.sleep(6)
        toast=await dm.evaluate("()=>[...document.querySelectorAll('#toast')].map(t=>t.textContent).join(' | ')")
        chk("with it on, the DM page checks once at start",len(asks)==1 and '?force' not in asks[0],asks)
        chk("and says so",'v1.0.8 is out' in toast,toast)
        chk("no page errors",errs==[],errs)
        await b.close()
    srv.shutdown()
asyncio.run(main())
sys_exit=0 if ok else 1
import sys;sys.exit(sys_exit)
