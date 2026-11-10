import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# "A fight from the DM's seat": the DM screen large, the tablet and the phone beside it, a drawn cursor, captions.
import json,os,subprocess,bisect,sys,math
from PIL import Image,ImageDraw,ImageFont,ImageFilter
D=rk.MEDIA+'/dm-video/';import bgs
W,H,FPS=1920,1080,30
OUT=sys.argv[1] if len(sys.argv)>1 else rk.MEDIA+'/roundkeeper-dm.mp4'
FT=lambda s:rk.font('cinzel',s);FB=lambda s:rk.font('sansbold',s);FR=lambda s:rk.font('sans',s)
GOLD=(244,214,150);SOFT=(205,212,225)
def load(t):
    d=json.load(open(D+f'raw_{t}/index.json'));d['marks']=[x for x in d['marks'] if x[1]!='start']
    d['ts']=[x[0] for x in d['frames']];d['fn']=[x[1] for x in d['frames']];return d
S={t:load(t) for t in ['dm','tablet','phone']}
M=S['dm']['marks'];T0=M[0][0];TEND=M[-1][0]-T0+0.3
caps=[(t-T0,f"{i+1} · {c}") for i,(t,c) in enumerate(M[:-1])]
def mapt(st,t):
    if st is S['dm']: return T0+t
    a=[x[0]-T0 for x in M];b=[x[0] for x in st['marks']]
    i=max(0,min(len(a)-2,bisect.bisect_right(a,t)-1))
    return b[i]+(t-a[i])*(b[i+1]-b[i])/(a[i+1]-a[i])
BOX={'dm':(32,100,1536,960,10,12),'tablet':(1616,128,272,181,9,14),'phone':(1660,392,184,398,8,20)}
def static():
    bg=bgs.scene(W,H)
    for k,(x,y,w,h,bz,r) in BOX.items():
        box=(x-bz,y-bz,x+w+bz,y+h+bz)
        sh=Image.new('L',(W,H),0);ImageDraw.Draw(sh).rounded_rectangle((box[0]+6,box[1]+16,box[2]+6,box[3]+16),r,fill=170);sh=sh.filter(ImageFilter.GaussianBlur(18))
        bg=Image.composite(Image.new('RGB',(W,H),(0,0,0)),bg,sh)
        ImageDraw.Draw(bg).rounded_rectangle(box,r,fill=(12,12,16),outline=(90,96,110),width=2)
    d=ImageDraw.Draw(bg);lab=FB(22)
    d.text((1616,128-46),"Tablet on the table",font=lab,fill=GOLD)
    d.text((1660,392-46),"A player's phone",font=lab,fill=GOLD)
    f=FT(32);t="Roundkeeper";d.text((1752-d.textlength(t,font=f)/2,960),t,font=f,fill=GOLD)
    f=FR(20);t="from the DM's seat";d.text((1752-d.textlength(t,font=f)/2,1006),t,font=f,fill=SOFT)
    return bg
BG=static()
MASK={k:(lambda w,h,r:(lambda m:(ImageDraw.Draw(m).rounded_rectangle((0,0,w,h),r,fill=255),m)[1])(Image.new('L',(w,h),0)))(w,h,max(3,r-bz)) for k,(x,y,w,h,bz,r) in BOX.items()}
cache={}
def frame_of(k,t):
    st=S[k];wt=mapt(st,t);i=max(0,bisect.bisect_right(st['ts'],wt)-1);key=(k,i)
    if key not in cache:
        if len(cache)>30: cache.clear()
        x,y,w,h,bz,r=BOX[k];cache[key]=Image.open(st['fn'][i]).convert('RGB').resize((w,h),Image.LANCZOS)
    return cache[key]
# cursor
MV=[e for e in S['dm']['mouse'] if e[0]=='move'];CL=[e for e in S['dm']['mouse'] if e[0]=='click']
sx=lambda x:BOX['dm'][0]+x*BOX['dm'][2]/1440;sy=lambda y:BOX['dm'][1]+y*BOX['dm'][3]/900
def cur_at(t):
    wt=T0+t;p=(720,450)
    for _,t0,x0,y0,x1,y1,du in MV:
        if t0>wt: break
        u=min(1,(wt-t0)/du) if du>0 else 1;u=u*u*(3-2*u);p=(x0+(x1-x0)*u,y0+(y1-y0)*u)
    return sx(p[0]),sy(p[1])
ARROW=[(0,0),(0,26),(7,20),(12,31),(17,29),(12,18),(21,18)]
def draw_cursor(im,t):
    d=ImageDraw.Draw(im,'RGBA');x,y=cur_at(t);wt=T0+t
    for _,tc,cx,cy in CL:
        a=wt-tc
        if 0<=a<.45:
            r=8+30*a/.45;al=int(200*(1-a/.45));X,Y=sx(cx),sy(cy)
            d.ellipse((X-r,Y-r,X+r,Y+r),outline=(244,214,150,al),width=4)
    pts=[(x+px,y+py) for px,py in ARROW];sh=[(px+2,py+3) for px,py in pts]
    d.polygon(sh,fill=(0,0,0,110));d.polygon(pts,fill=(255,255,255,255),outline=(20,20,24,255))
KEYS=S['dm']['keys']
def draw_keys(im,t):
    wt=T0+t
    for tk,txt in KEYS:
        a=wt-tk
        if -.1<a<1.3:
            al=int(235*min(1,(a+.1)/.15)*min(1,(1.3-a)/.3));d=ImageDraw.Draw(im,'RGBA');f=FB(34);w=d.textlength(txt,font=f)
            x0=BOX['dm'][0]+BOX['dm'][2]/2-w/2-28;y0=BOX['dm'][1]+BOX['dm'][3]-110
            d.rounded_rectangle((x0,y0,x0+w+56,y0+64),14,fill=(16,16,22,al),outline=(244,214,150,al),width=2);d.text((x0+28,y0+12),txt,font=f,fill=(255,246,226,al))
CAP=FB(38)
def main_frame(t):
    im=BG.copy()
    for k,(x,y,w,h,bz,r) in BOX.items(): im.paste(frame_of(k,t),(x,y),MASK[k])
    draw_cursor(im,t);draw_keys(im,t)
    c=None
    for ct,cc in caps:
        if t>=ct-0.05: c=(ct,cc)
    if c:
        a=min(1,(t-c[0]+0.05)/0.3);d=ImageDraw.Draw(im,'RGBA');d.text((40,30),c[1],font=CAP,fill=(255,246,226,int(255*a)))
    return im
def card(lines):
    im=bgs.scene(W,H);d=ImageDraw.Draw(im);y=H/2-sum(s for _,s,_ in lines)/2-20
    for txt,size,font in lines:
        f=font(size);w=d.textlength(txt,font=f);d.text(((W-w)/2,y),txt,font=f,fill=GOLD if font is FT else SOFT);y+=size*1.45
    return im
if __name__=='__main__':
    INTRO=card([("A fight from the DM's seat",80,FT),("Roundkeeper · the DM's laptop, with the tablet and a phone beside it",32,FR)])
    OUTRO=card([("Roundkeeper",96,FT),("Free and open source · Windows, Mac and Linux",34,FR),("No accounts, no internet: it runs on your own Wi-Fi",34,FR)])
    ff=subprocess.Popen(['ffmpeg','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
        '-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',OUT],stdin=subprocess.PIPE)
    IN,OUTD,X=2.4,3.2,0.5;n=int(TEND*FPS);first=main_frame(0);last=main_frame(TEND)
    for i in range(int(IN*FPS)): ff.stdin.write(Image.blend(INTRO,first,max(0,min(1,(i/FPS-(IN-X))/X))).tobytes())
    for i in range(n):
        ff.stdin.write(main_frame(i/FPS).tobytes())
        if i%300==0: print(i,'/',n,flush=True)
    for i in range(int(OUTD*FPS)): ff.stdin.write(Image.blend(last,OUTRO,min(1,i/FPS/X)).tobytes())
    ff.stdin.close();ff.wait();print('done',OUT)
