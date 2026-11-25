import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# Put the README video at the top of the page together: python3 dev/media/video_home.py [out.mp4]
# The four passes of video_home_rec.py (dm, tablet, tv, phone), lined up by their caption marks, shown in the layout
# home_plan.py gives each caption, with a short cross-fade when the layout changes. The DM's cursor is drawn while the
# laptop is big, the phone's taps while the phone is big. Intro and outro cards. CRF 25 (RK_CRF) keeps about two
# minutes under GitHub's 10 MB for a video on a free plan.
import json,os,subprocess,bisect,sys
from PIL import Image,ImageDraw
import look
from vrec import PACE
from home_plan import PLAN
D=rk.MEDIA+'/home-video/'
OUT=sys.argv[1] if len(sys.argv)>1 else rk.MEDIA+'/roundkeeper-home.mp4'
W,H,FPS=look.W,look.H,30
CRF=os.environ.get('RK_CRF','25')
VIEW={'dm':(1536,864),'tablet':(1200,800),'tv':(1280,720),'phone':(390,844)}
KIND={'dm':'laptop','tablet':'tablet','tv':'tv','phone':'phone'}
# per layout: screens (x, y, w, h), labels, the caption (x, y, width, size), where the name goes
LAYOUT={
 'four':dict(box={'tablet':(80,150,1008,672),'tv':(1170,150,672,378),'dm':(1230,640,400,225),'phone':(1712,600,150,325)},
   labels=[("Tablet on the table",80,112),("TV across the room",1170,112),("The DM's laptop",1230,604),("Phone",1712,564)],
   cap=(80,870,1000,40),brand=(1240,985)),
 'dm':dict(box={'dm':(96,96,1344,756),'tablet':(1530,150,330,220),'phone':(1606,486,180,390)},
   labels=[("Tablet on the table",1530,112),("A player's phone",1606,448)],cap=(96,936,1340,40),brand=(1606,968)),
 'phone':dict(box={'phone':(720,90,402,870),'tablet':(1240,330,600,400)},
   labels=[("A player's phone",720,52),("Tablet on the table",1240,292)],cap=(110,380,520,46),brand=(110,96)),
 'table':dict(box={'tablet':(70,190,900,600),'tv':(1030,190,820,461)},
   labels=[("Tablet on the table",70,152),("TV across the room",1030,152)],cap=(70,880,900,40),brand=(1600,960)),
}
LAYOUT_OF={c:l for l,c in PLAN}
def load(t):
    d=json.load(open(D+f'raw_{t}/index.json'));d['marks']=[x for x in d['marks'] if x[1]!='start']
    d['ts']=[x[0] for x in d['frames']];d['fn']=[x[1] for x in d['frames']];return d
S={t:load(t) for t in VIEW}
MS=S['dm'];M=MS['marks'];T0=M[0][0];TEND=M[-1][0]-T0+0.3
caps=[(t-T0,c) for t,c in M[:-1]]
for _,c in caps: assert c in LAYOUT_OF,("a caption that home_plan.py doesn't know",c)
def mapt(st,t):  # master seconds -> this stream's wall clock
    if st is MS: return T0+t
    a=[x[0]-T0 for x in M];b=[x[0] for x in st['marks']]
    i=max(0,min(len(a)-2,bisect.bisect_right(a,t)-1))
    return b[i]+(t-a[i])*(b[i+1]-b[i])/(a[i+1]-a[i])
def static(L):
    im=look.surface();rad={}
    for k,(x,y,w,h) in L['box'].items(): im,rad[k]=look.device(im,KIND[k],x,y,w,h)
    d=ImageDraw.Draw(im)
    for t,x,y in L['labels']: look.label(d,t,x,y)
    look.brand(d,*L['brand'],size=30)
    return im,{k:look.mask(w,h,rad[k]) for k,(x,y,w,h) in L['box'].items()}
BG={n:static(L) for n,L in LAYOUT.items()}
cache={}
def frame_of(lay,k,t):
    st=S[k];wt=mapt(st,t);i=max(0,bisect.bisect_right(st['ts'],wt)-1);key=(lay,k,i)
    if key not in cache:
        if len(cache)>80: cache.clear()
        x,y,w,h=LAYOUT[lay]['box'][k];cache[key]=Image.open(st['fn'][i]).convert('RGB').resize((w,h),Image.LANCZOS)
    return cache[key]
def to_box(lay,k,x,y):
    bx,by,w,h=LAYOUT[lay]['box'][k];vw,vh=VIEW[k];return bx+x*w/vw,by+y*h/vh
ARROW=[(0,0),(0,26),(7,20),(12,31),(17,29),(12,18),(21,18)]
def draw_cursor(im,lay,t):
    st=S['dm'];wt=T0+t;d=ImageDraw.Draw(im,'RGBA');p=(720,450)
    for e in st['mouse']:
        if e[0]!='move': continue
        _,t0,x0,y0,x1,y1,du=e
        if t0>wt: break
        u=min(1,(wt-t0)/du) if du>0 else 1;u=u*u*(3-2*u);p=(x0+(x1-x0)*u,y0+(y1-y0)*u)
    for e in st['mouse']:
        if e[0]!='click': continue
        a=wt-e[1]
        if 0<=a<.45:
            r=8+26*a/.45;al=int(230*(1-a/.45));X,Y=to_box(lay,'dm',e[2],e[3])
            d.ellipse((X-r,Y-r,X+r,Y+r),outline=look.CLAY+(al,),width=4)
    x,y=to_box(lay,'dm',*p);pts=[(x+px,y+py) for px,py in ARROW];sh=[(px+2,py+3) for px,py in pts]
    d.polygon(sh,fill=(0,0,0,110));d.polygon(pts,fill=(255,255,255,255),outline=(20,20,24,255))
def draw_taps(im,lay,t):
    st=S['phone'];wt=mapt(st,t);d=ImageDraw.Draw(im,'RGBA')
    for tt,x,y in st['taps']:
        a=wt-tt
        if -.12<a<.5:
            X,Y=to_box(lay,'phone',x,y)
            if a<0: r=28;al=int(140*(1+a/.12))
            else: r=28-8*min(1,a/.5);al=int(140*(1-a/.5))
            d.ellipse((X-r,Y-r,X+r,Y+r),fill=(255,255,255,al//2),outline=look.CLAY+(min(255,al+80),),width=3)
def cap_at(t):
    c=None
    for ct,cc in caps:
        if t>=ct-0.05: c=(ct,cc)
    return c or caps[0]
def layout_frame(lay,t,c):
    bg,masks=BG[lay];im=bg.copy()
    for k,(x,y,w,h) in LAYOUT[lay]['box'].items(): im.paste(frame_of(lay,k,t),(x,y),masks[k])
    if lay=='dm': draw_cursor(im,lay,t)
    if lay=='phone': draw_taps(im,lay,t)
    CX,CY,CW,CS=LAYOUT[lay]['cap']
    look.caption(ImageDraw.Draw(im,'RGBA'),c[1],CX,CY,CW,size=CS,alpha=int(255*max(0,min(1,(t-c[0]+0.05)/0.3))))
    return im
X=0.5   # the cross-fade between two layouts
def main_frame(t):
    c=cap_at(t);lay=LAYOUT_OF[c[1]];i=[cc for _,cc in caps].index(c[1])
    prev=LAYOUT_OF[caps[i-1][1]] if i>0 else lay
    if prev!=lay and t-c[0]<X:
        return Image.blend(layout_frame(prev,t,caps[i-1]),layout_frame(lay,t,c),max(0,min(1,(t-c[0])/X)))
    return layout_frame(lay,t,c)
if __name__=='__main__':
    INTRO=look.card("Roundkeeper",["One fight, four screens:","the DM's laptop, a tablet on the table, a TV and the players' phones."],kicker="A combat tracker for 5e at the table")
    OUTRO=look.card("Roundkeeper",["Free and open source, for Windows, Mac and Linux.","No accounts, no internet: it runs on your own Wi-Fi."],foot="github.com/swampcore-beep/roundkeeper")
    IN,OUTD,XF=2.4*PACE,3.5*PACE,0.5
    total=IN+TEND+OUTD;print('home length',round(total,1),'s, CRF',CRF)
    ff=subprocess.Popen(['ffmpeg','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
        '-c:v','libx264','-preset','veryfast','-crf',CRF,'-pix_fmt','yuv420p','-movflags','+faststart',OUT],stdin=subprocess.PIPE)
    n=int(TEND*FPS);first=main_frame(0);last=main_frame(TEND)
    for i in range(int(IN*FPS)): ff.stdin.write(Image.blend(INTRO,first,max(0,min(1,(i/FPS-(IN-XF))/XF))).tobytes())
    for i in range(n):
        ff.stdin.write(main_frame(i/FPS).tobytes())
        if i%300==0: print(i,'/',n,flush=True)
    for i in range(int(OUTD*FPS)): ff.stdin.write(Image.blend(last,OUTRO,min(1,i/FPS/XF)).tobytes())
    ff.stdin.close();ff.wait();print('done',OUT)
