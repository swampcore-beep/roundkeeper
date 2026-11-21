import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# Put the passes of one README video together: python3 dev/media/video_make.py dm|table|phone
# Screens in device bodies on the table surface (look.py), lined up by their caption marks, with captions, the DM's
# cursor and keys, and the phone's taps. Intro and outro cards; the whole video stays under a minute.
import json,subprocess,bisect,sys
from PIL import Image,ImageDraw
import look
V=sys.argv[1];D=rk.MEDIA+f'/{V}-video/'
OUT=sys.argv[2] if len(sys.argv)>2 else rk.MEDIA+f'/roundkeeper-{V}.mp4'
W,H,FPS=look.W,look.H,30
# per video: screens (name: device, x, y, w, h, viewport w, h), labels, the caption (x, y, width, size), the name, the cards
L={
 'dm':dict(box={'dm':('laptop',96,96,1344,756,1536,864),'tablet':('tablet',1530,150,330,220,1200,800),'phone':('phone',1606,486,180,390,390,844)},
   labels=[("Tablet on the table",1530,112),("A player's phone",1606,448)],cap=(96,936,1340,40),brand=(1606,968),
   intro=("The DM's laptop",["Run the fight: monsters, statblocks, rolls,","and HP that only you see."]),cursor='dm',keys=(768,742)),
 'table':dict(box={'tablet':('tablet',110,150,520,780,800,1200),'tv':('tv',730,150,1080,608,1280,720)},
   labels=[("Tablet on the table",110,112),("TV across the room",730,112)],cap=(730,870,1080,40),brand=(1580,1000),
   intro=("The tablet and the TV",["What the players see: the turn order, the big moments,","and only what you choose to show."])),
 'phone':dict(box={'phone':('phone',720,90,402,870,390,844),'tablet':('tablet',1260,240,480,720,800,1200)},
   labels=[("A player's phone",720,52),("Tablet on the table",1260,202)],cap=(110,380,520,46),brand=(110,96),
   intro=("On the players' phones",["Scan a code, pick your character:","HP, spells and rolls, nothing to install."]),taps='phone'),
}[V]
BOX=L['box']
def load(t):
    d=json.load(open(D+f'raw_{t}/index.json'));d['marks']=[x for x in d['marks'] if x[1]!='start']
    d['ts']=[x[0] for x in d['frames']];d['fn']=[x[1] for x in d['frames']];return d
S={t:load(t) for t in BOX}
MS=S[L.get('cursor') or L.get('taps') or next(iter(BOX))];M=MS['marks'];T0=M[0][0];TEND=M[-1][0]-T0+0.3
caps=[(t-T0,c) for t,c in M[:-1]]
def mapt(st,t):
    if st is MS: return T0+t
    a=[x[0]-T0 for x in M];b=[x[0] for x in st['marks']]
    i=max(0,min(len(a)-2,bisect.bisect_right(a,t)-1))
    return b[i]+(t-a[i])*(b[i+1]-b[i])/(a[i+1]-a[i])
RAD={}
def static():
    im=look.surface()
    for k,(kind,x,y,w,h,*_) in BOX.items(): im,RAD[k]=look.device(im,kind,x,y,w,h)
    d=ImageDraw.Draw(im)
    for t,x,y in L['labels']: look.label(d,t,x,y)
    look.brand(d,*L['brand'],size=30)
    return im
BG=static()
MASK={k:look.mask(w,h,RAD[k]) for k,(kind,x,y,w,h,*_) in BOX.items()}
cache={}
def frame_of(k,t):
    st=S[k];wt=mapt(st,t);i=max(0,bisect.bisect_right(st['ts'],wt)-1);key=(k,i)
    if key not in cache:
        if len(cache)>40: cache.clear()
        _,x,y,w,h,*_=BOX[k];cache[key]=Image.open(st['fn'][i]).convert('RGB').resize((w,h),Image.LANCZOS)
    return cache[key]
def to_box(k,x,y):
    _,bx,by,w,h,vw,vh=BOX[k];return bx+x*w/vw,by+y*h/vh
# the DM's cursor, clicks and keys
ARROW=[(0,0),(0,26),(7,20),(12,31),(17,29),(12,18),(21,18)]
def draw_cursor(im,t):
    k=L['cursor'];st=S[k];wt=T0+t;d=ImageDraw.Draw(im,'RGBA');p=(720,450)
    for e in st['mouse']:
        if e[0]!='move': continue
        _,t0,x0,y0,x1,y1,du=e
        if t0>wt: break
        u=min(1,(wt-t0)/du) if du>0 else 1;u=u*u*(3-2*u);p=(x0+(x1-x0)*u,y0+(y1-y0)*u)
    for e in st['mouse']:
        if e[0]!='click': continue
        a=wt-e[1]
        if 0<=a<.45:
            r=8+26*a/.45;al=int(230*(1-a/.45));X,Y=to_box(k,e[2],e[3])
            d.ellipse((X-r,Y-r,X+r,Y+r),outline=look.CLAY+(al,),width=4)
    x,y=to_box(k,*p);pts=[(x+px,y+py) for px,py in ARROW];sh=[(px+2,py+3) for px,py in pts]
    d.polygon(sh,fill=(0,0,0,110));d.polygon(pts,fill=(255,255,255,255),outline=(20,20,24,255))
    for tk,txt in st['keys']:
        a=wt-tk
        if -.1<a<1.3: look.keycap(d,txt,*L['keys'],alpha=int(255*min(1,(a+.1)/.15)*min(1,(1.3-a)/.3)))
# a finger on the phone
def draw_taps(im,t):
    k=L['taps'];st=S[k];wt=mapt(st,t);d=ImageDraw.Draw(im,'RGBA')
    for tt,x,y in st['taps']:
        a=wt-tt
        if -.12<a<.5:
            X,Y=to_box(k,x,y)
            if a<0: r=28;al=int(140*(1+a/.12))
            else: r=28-8*min(1,a/.5);al=int(140*(1-a/.5))
            d.ellipse((X-r,Y-r,X+r,Y+r),fill=(255,255,255,al//2),outline=look.CLAY+(min(255,al+80),),width=3)
CX,CY,CW,CS=L['cap']
def main_frame(t):
    im=BG.copy()
    for k,(kind,x,y,*_) in BOX.items(): im.paste(frame_of(k,t),(x,y),MASK[k])
    if L.get('cursor'): draw_cursor(im,t)
    if L.get('taps'): draw_taps(im,t)
    c=None
    for ct,cc in caps:
        if t>=ct-0.05: c=(ct,cc)
    if c: look.caption(ImageDraw.Draw(im,'RGBA'),c[1],CX,CY,CW,size=CS,alpha=int(255*min(1,(t-c[0]+0.05)/0.3)))
    return im
if __name__=='__main__':
    ti,lines=L['intro']
    INTRO=look.card(ti,lines,kicker="Roundkeeper")
    OUTRO=look.card("Roundkeeper",["Free and open source, for Windows, Mac and Linux.","No accounts, no internet: it runs on your own Wi-Fi."],foot="github.com/swampcore-beep/roundkeeper")
    IN,OUTD,X=2.2,3.0,0.5
    total=IN+TEND+OUTD;print(V,'length',round(total,1),'s');assert total<=60,"over a minute"
    ff=subprocess.Popen(['ffmpeg','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
        '-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',OUT],stdin=subprocess.PIPE)
    n=int(TEND*FPS);first=main_frame(0);last=main_frame(TEND)
    for i in range(int(IN*FPS)): ff.stdin.write(Image.blend(INTRO,first,max(0,min(1,(i/FPS-(IN-X))/X))).tobytes())
    for i in range(n):
        ff.stdin.write(main_frame(i/FPS).tobytes())
        if i%300==0: print(i,'/',n,flush=True)
    for i in range(int(OUTD*FPS)): ff.stdin.write(Image.blend(last,OUTRO,min(1,i/FPS/X)).tobytes())
    ff.stdin.close();ff.wait();print('done',OUT)
