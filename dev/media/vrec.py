import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# Shared recording helpers for the three README videos (video_dm_rec.py, video_table_rec.py, video_phone_rec.py).
# Each pass records one screen with a CDP screencast. The script does the same steps in every pass and logs
# the caption marks, so video_make.py can line the passes up afterwards.
import asyncio,os,json,time,base64,shutil,threading,urllib.request
def present(ids=('i','s','a','gr'),tv=True,tablet=True):
    # make the DM's Devices window and header show the tablet, the TV and the phones as connected, without opening them all
    op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    qs=(['screen=tablet'] if tablet else [])+(['screen=tv'] if tv else [])+[f'me={i}' for i in ids]
    def run():
        while True:
            for q in qs:
                try: op.open(rk.PL+'/state?'+q,timeout=3).read()
                except Exception: pass
            time.sleep(2)
    threading.Thread(target=run,daemon=True).start()
async def T(pg,js): return await pg.evaluate("(js)=>__t(js)",js)
class Rec:
    def __init__(self,video,tgt):
        self.video,self.tgt=video,tgt
        self.O=rk.MEDIA+f'/{video}-video/raw_{tgt}/'
        shutil.rmtree(self.O,ignore_errors=True);os.makedirs(self.O)
        self.marks=[];self.frames=[];self.mouse=[];self.keys=[];self.taps=[];self.pos=[720,450]
    def mark(self,c):
        self.marks.append((time.time(),c));print(round(time.time()-self.marks[0][0],1),c,flush=True)
    async def cast(self,ctx,pg,q=90):
        cdp=await ctx.new_cdp_session(pg)
        def on(ev):
            fn=f"{self.O}{len(self.frames):05d}.jpg";open(fn,'wb').write(base64.b64decode(ev['data']));self.frames.append((ev['metadata']['timestamp'],fn))
            asyncio.ensure_future(cdp.send('Page.screencastFrameAck',{'sessionId':ev['sessionId']}))
        cdp.on('Page.screencastFrame',on)
        await cdp.send('Page.startScreencast',{'format':'jpeg','quality':q,'everyNthFrame':1})
    def save(self,**extra):
        json.dump(dict({'marks':self.marks,'frames':self.frames,'mouse':self.mouse,'keys':self.keys,'taps':self.taps},**extra),open(self.O+'index.json','w'))
        print(self.tgt,len(self.frames),'frames')
    # the DM's mouse: moves smoothly, clicks, and logs both for the drawn cursor
    async def go(self,pg,loc,click=True,dur=.5,dx=0,dy=0):
        loc=pg.locator(loc).first if isinstance(loc,str) else loc
        await loc.scroll_into_view_if_needed();bb=await loc.bounding_box()
        x,y=bb['x']+bb['width']/2+dx,bb['y']+bb['height']/2+dy
        t0=time.time();self.mouse.append(('move',t0,self.pos[0],self.pos[1],x,y,dur))
        await pg.mouse.move(x,y,steps=8);rest=dur-(time.time()-t0)
        if rest>0: await asyncio.sleep(rest)
        self.pos[0],self.pos[1]=x,y
        if click: self.mouse.append(('click',time.time(),x,y));await pg.mouse.click(x,y);await asyncio.sleep(.22)
    async def typ(self,pg,sel,txt,d=.07):
        await pg.locator(sel).first.focus()
        for ch in txt: await pg.keyboard.type(ch);await asyncio.sleep(d)
    async def key(self,pg,k,label):
        self.keys.append((time.time(),label));await pg.keyboard.press(k)
    # a finger on the phone: logs the spot for the drawn touch
    async def tap(self,pg,loc,wait=.35):
        loc=pg.locator(loc).first if isinstance(loc,str) else loc
        await loc.wait_for(state='visible',timeout=8000)
        bb=await loc.bounding_box();vh=pg.viewport_size['height']
        if bb['y']<0 or bb['y']+bb['height']>vh:   # (no Playwright scrolling: it waits for animation frames a page that isn't recorded may not give)
            await loc.evaluate("e=>e.scrollIntoView({block:'center'})");await asyncio.sleep(.15);bb=await loc.bounding_box()
        x,y=bb['x']+bb['width']/2,bb['y']+bb['height']/2
        self.taps.append((time.time(),x,y));await pg.mouse.click(x,y);await asyncio.sleep(wait)
