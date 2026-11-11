import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# Put the passes of one README video together: python3 dev/media/video_make.py dm|table|phone
# Screens in device frames on the backdrop, lined up by their caption marks, with captions, the DM's cursor
# and keys, and the phone's taps. Intro and outro cards; the whole video stays under a minute.
import json,subprocess,bisect,sys
from PIL import Image,ImageDraw,ImageFilter
import bgs
V=sys.argv[1];D=rk.MEDIA+f'/{V}-video/'
OUT=sys.argv[2] if len(sys.argv)>2 else rk.MEDIA+f'/roundkeeper-{V}.mp4'
W,H,FPS=1920,1080,30
FT=lambda s:rk.font('cinzel',s);FB=lambda s:rk.font('sansbold',s);FR=lambda s:rk.font('sans',s)
GOLD=(244,214,150);SOFT=(205,212,225)
# per video: screens (name: x,y,w,h,bezel,radius,viewport w,h), labels, the caption box, the cards
L={
 'dm':dict(box={'dm':(32,100,1536,960,10,12,1440,900),'tablet':(1616,128,272,181,9,14,1200,800),'phone':(1660,392,184,398,8,20,390,844)},
   labels=[("Tablet on the table",1616,82),("A player's phone",1660,346)],cap=(40,30,1500,38),mark=(1752,960,"from the DM's seat"),
   intro=("The DM's laptop","Run the fight: monsters, statblocks, rolls and HP that only you see"),cursor='dm'),
 'table':dict(box={'tablet':(90,150,560,840,16,26,800,1200),'tv':(730,150,1120,630,12,8,1280,720)},
   labels=[("Tablet on the table",90,96),("TV across the room",730,96)],cap=(730,846,1120,40),mark=(1790,1010,None),
   intro=("The tablet and the TV","What the players see: the turn order, big moments, and only what you show")),
 'phone':dict(box={'phone':(700,90,416,900,12,34,390,844),'tablet':(1250,230,480,720,12,22,800,1200)},
   labels=[("A player's phone",700,40),("Tablet on the table",1250,180)],cap=(70,360,560,46),mark=(350,960,None),
   intro=("On the players' phones","Scan a code, pick your character: HP, spells and rolls, nothing to install"),taps='phone'),
}[V]
BOX=L['box']
def load(t):
    d=json.load(open(D+f'raw_{t}/index.json'));d['marks']=[x for x in d['marks'] if x[1]!='start']
    d['ts']=[x[0] for x in d['frames']];d['fn']=[x[1] for x in d['frames']];return d
S={t:load(t) for t in BOX}
MS=S[L.get('cursor') or L.get('taps') or next(iter(BOX))];M=MS['marks'];T0=M[0][0];TEND=M[-1][0]-T0+0.3
caps=[(t-T0,f"{i+1} · {c}") for i,(t,c) in enumerate(M[:-1])]
def mapt(st,t):
    if st is MS: return T0+t
    a=[x[0]-T0 for x in M];b=[x[0] for x in st['marks']]
    i=max(0,min(len(a)-2,bisect.bisect_right(a,t)-1))
    return b[i]+(t-a[i])*(b[i+1]-b[i])/(a[i+1]-a[i])
def static():
    bg=bgs.scene(W,H)
    for k,(x,y,w,h,bz,r,*_) in BOX.items():
        box=(x-bz,y-bz,x+w+bz,y+h+bz)
        sh=Image.new('L',(W,H),0);ImageDraw.Draw(sh).rounded_rectangle((box[0]+6,box[1]+16,box[2]+6,box[3]+16),r,fill=170);sh=sh.filter(ImageFilter.GaussianBlur(18))
        bg=Image.composite(Image.new('RGB',(W,H),(0,0,0)),bg,sh)
        ImageDraw.Draw(bg).rounded_rectangle(box,r,fill=(12,12,16),outline=(90,96,110),width=2)
    d=ImageDraw.Draw(bg)
    for t,x,y in L['labels']: d.text((x,y),t,font=FB(24),fill=GOLD)
    mx,my,sub=L['mark'];f=FT(34);t="Roundkeeper";d.text((mx-d.textlength(t,font=f)/2,my),t,font=f,fill=GOLD)
    if sub: f=FR(20);d.text((mx-d.textlength(sub,font=f)/2,my+48),sub,font=f,fill=SOFT)
    return bg
BG=static()
MASK={k:(lambda w,h,r:(lambda m:(ImageDraw.Draw(m).rounded_rectangle((0,0,w,h),r,fill=255),m)[1])(Image.new('L',(w,h),0)))(w,h,max(3,r-bz)) for k,(x,y,w,h,bz,r,*_) in BOX.items()}
cache={}
def frame_of(k,t):
    st=S[k];wt=mapt(st,t);i=max(0,bisect.bisect_right(st['ts'],wt)-1);key=(k,i)
    if key not in cache:
        if len(cache)>40: cache.clear()
        x,y,w,h,*_=BOX[k];cache[key]=Image.open(st['fn'][i]).convert('RGB').resize((w,h),Image.LANCZOS)
    return cache[key]
def to_box(k,x,y):
    bx,by,w,h,bz,r,vw,vh=BOX[k];return bx+x*w/vw,by+y*h/vh
# the DM's cursor and keys
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
            r=8+30*a/.45;al=int(200*(1-a/.45));X,Y=to_box(k,e[2],e[3])
            d.ellipse((X-r,Y-r,X+r,Y+r),outline=(244,214,150,al),width=4)
    x,y=to_box(k,*p);pts=[(x+px,y+py) for px,py in ARROW];sh=[(px+2,py+3) for px,py in pts]
    d.polygon(sh,fill=(0,0,0,110));d.polygon(pts,fill=(255,255,255,255),outline=(20,20,24,255))
    for tk,txt in st['keys']:
        a=wt-tk
        if -.1<a<1.3:
            al=int(235*min(1,(a+.1)/.15)*min(1,(1.3-a)/.3));f=FB(34);w=d.textlength(txt,font=f)
            bx,by,bw,bh,*_=BOX[k];x0=bx+bw/2-w/2-28;y0=by+bh-110
            d.rounded_rectangle((x0,y0,x0+w+56,y0+64),14,fill=(16,16,22,al),outline=(244,214,150,al),width=2);d.text((x0+28,y0+12),txt,font=f,fill=(255,246,226,al))
# a finger on the phone
def draw_taps(im,t):
    k=L['taps'];st=S[k];wt=mapt(st,t);d=ImageDraw.Draw(im,'RGBA')
    for tt,x,y in st['taps']:
        a=wt-tt
        if -.12<a<.5:
            X,Y=to_box(k,x,y)
            if a<0: r=30;al=int(150*(1+a/.12))
            else: r=30-10*min(1,a/.5);al=int(150*(1-a/.5))
            d.ellipse((X-r,Y-r,X+r,Y+r),fill=(255,255,255,al),outline=(244,214,150,min(255,al+60)),width=3)
def wrap(d,txt,f,w):
    out,cur=[],""
    for word in txt.split():
        t=(cur+" "+word).strip()
        if d.textlength(t,font=f)>w and cur: out.append(cur);cur=word
        else: cur=t
    return out+[cur]
CX,CY,CW,CS=L['cap'];CAP=FB(CS)
def main_frame(t):
    im=BG.copy()
    for k,(x,y,*_) in BOX.items(): im.paste(frame_of(k,t),(x,y),MASK[k])
    if L.get('cursor'): draw_cursor(im,t)
    if L.get('taps'): draw_taps(im,t)
    c=None
    for ct,cc in caps:
        if t>=ct-0.05: c=(ct,cc)
    if c:
        a=min(1,(t-c[0]+0.05)/0.3);d=ImageDraw.Draw(im,'RGBA')
        for j,line in enumerate(wrap(d,c[1],CAP,CW)): d.text((CX,CY+j*CS*1.3),line,font=CAP,fill=(255,246,226,int(255*a)))
    return im
def card(lines):
    im=bgs.scene(W,H);d=ImageDraw.Draw(im);y=H/2-sum(s for _,s,_ in lines)/2-20
    for txt,size,font in lines:
        f=font(size);w=d.textlength(txt,font=f);d.text(((W-w)/2,y),txt,font=f,fill=GOLD if font is FT else SOFT);y+=size*1.45
    return im
if __name__=='__main__':
    ti,sub=L['intro']
    INTRO=card([(ti,80,FT),("Roundkeeper · "+sub,32,FR)])
    OUTRO=card([("Roundkeeper",96,FT),("Free and open source · Windows, Mac and Linux",34,FR),("No accounts, no internet: it runs on your own Wi-Fi",34,FR)])
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
