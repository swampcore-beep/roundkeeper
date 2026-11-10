import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# Put the four recordings side by side in one 1920x1080 video, synced by the marks of each pass.
import json,os,subprocess,bisect,sys
from PIL import Image,ImageDraw,ImageFont,ImageFilter
R=rk.MEDIA+'/four-video/'
W,H,FPS=1920,1080,30
OUT=sys.argv[1] if len(sys.argv)>1 else rk.MEDIA+'/roundkeeper-four-screens.mp4'
FT=lambda s:rk.font('cinzel',s);FB=lambda s:rk.font('sansbold',s);FR=lambda s:rk.font('sans',s)
GOLD=(244,214,150);SOFT=(205,195,180)
def load(t):
    d=json.load(open(R+f'raw_{t}/index.json'));m=[x for x in d['marks'] if x[1]!='start'];fr=list(d['frames'].values())[0]
    return {'marks':m,'ts':[x[0] for x in fr],'fn':[x[1] for x in fr]}
S={t:load(t) for t in ['tablet','tv','phone','dm']}
M=S['tablet']['marks'];T0=M[0][0];TEND=M[-1][0]-T0+0.4
caps=[(t-T0,c) for t,c in M[:-1]]
def mapt(st,t):  # master seconds -> this stream's wall clock
    a=[x[0]-T0 for x in M];b=[x[0] for x in st['marks']]
    i=max(0,min(len(a)-2,bisect.bisect_right(a,t)-1))
    return b[i]+(t-a[i])*(b[i+1]-b[i])/(a[i+1]-a[i])
# the static layer: background, devices, labels
import bgs
def bgimg(): return bgs.scene(W,H)
BOX={'tablet':(78,176,1032,688,20,28),'tv':(1186,176,672,378,12,8),'dm':(1220,648,448,280,10,12),'phone':(1712,640,172,372,9,22)}
def static():
    bg=bgimg()
    for k,(x,y,w,h,bz,r) in BOX.items():
        box=(x-bz,y-bz,x+w+bz,y+h+bz)
        sh=Image.new('L',(W,H),0);ImageDraw.Draw(sh).rounded_rectangle((box[0]+8,box[1]+18,box[2]+8,box[3]+18),r,fill=170);sh=sh.filter(ImageFilter.GaussianBlur(20))
        bg=Image.composite(Image.new('RGB',(W,H),(0,0,0)),bg,sh)
        d=ImageDraw.Draw(bg);d.rounded_rectangle(box,r,fill=(12,12,16),outline=(90,96,110),width=2)
    d=ImageDraw.Draw(bg)
    x,y,w,h,bz,r=BOX['tv'];d.rectangle((x+w/2-10,y+h+bz,x+w/2+10,y+h+bz+16),fill=(40,38,44));d.rounded_rectangle((x+w/2-120,y+h+bz+14,x+w/2+120,y+h+bz+22),4,fill=(48,46,52))
    x,y,w,h,bz,r=BOX['dm'];d.polygon([(x-40,y+h+bz),(x+w+40,y+h+bz),(x+w+12,y+h+bz+22),(x-12,y+h+bz+22)],fill=(52,50,58),outline=(80,76,84))
    d.text((60,30),"Roundkeeper",font=FT(54),fill=GOLD)
    d.text((63,100),"A free, offline initiative tracker for in-person 5e games",font=FR(26),fill=SOFT)
    lab=FB(22)
    d.text((1186,598),"TV across the room",font=lab,fill=GOLD)
    d.text((1220,980),"DM laptop",font=lab,fill=GOLD)
    d.text((1712,1028),"Phones",font=lab,fill=GOLD)
    d.text((78,890),"Tablet on the table",font=lab,fill=GOLD)
    return bg
BG=static()
MASK={k:(lambda w,h,r:(lambda m:(ImageDraw.Draw(m).rounded_rectangle((0,0,w,h),r,fill=255),m)[1])(Image.new('L',(w,h),0)))(w,h,max(3,r-bz)) for k,(x,y,w,h,bz,r) in BOX.items()}
cache={}
def frame_of(k,t):
    st=S[k];wt=mapt(st,t);i=max(0,bisect.bisect_right(st['ts'],wt)-1)
    key=(k,i)
    if key not in cache:
        x,y,w,h,bz,r=BOX[k];cache.clear() if len(cache)>40 else None
        cache[key]=Image.open(st['fn'][i]).convert('RGB').resize((w,h),Image.LANCZOS)
    return cache[key]
CAP=FB(40)
def main_frame(t):
    im=BG.copy()
    for k,(x,y,w,h,bz,r) in BOX.items(): im.paste(frame_of(k,t),(x,y),MASK[k])
    c=None
    for ct,cc in caps:
        if t>=ct-0.05: c=(ct,cc)
    if c:
        a=min(1,(t-c[0]+0.05)/0.35)
        ov=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(ov)
        d.text((78,935),c[1],font=CAP,fill=(255,246,226,int(255*a)))
        im=Image.alpha_composite(im.convert('RGBA'),ov).convert('RGB')
    return im
def card(lines):
    im=bgimg();d=ImageDraw.Draw(im)
    y=H/2-sum(s for _,s,_ in lines)/2-20
    for txt,size,font in lines:
        f=font(size);w=d.textlength(txt,font=f);d.text(((W-w)/2,y),txt,font=f,fill=GOLD if font is FT else SOFT);y+=size*1.45
    return im
INTRO=card([("Roundkeeper",96,FT),("One fight, four screens: a laptop, a tablet, a TV and phones",34,FR)])
OUTRO=card([("Roundkeeper",96,FT),("Free and open source · Windows, Mac and Linux",34,FR),("No accounts, no internet: it runs on your own Wi-Fi",34,FR)])
def blend(a,b,x): return Image.blend(a,b,max(0,min(1,x)))
ff=subprocess.Popen(['ffmpeg','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
    '-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',OUT],stdin=subprocess.PIPE)
IN,OUTD,X=2.2,3.5,0.5
n_main=int(TEND*FPS);first=main_frame(0);last=main_frame(TEND)
for i in range(int(IN*FPS)):
    t=i/FPS;ff.stdin.write(blend(INTRO,first,(t-(IN-X))/X).tobytes())
for i in range(n_main):
    ff.stdin.write(main_frame(i/FPS).tobytes())
    if i%150==0: print('frame',i,'/',n_main,flush=True)
for i in range(int(OUTD*FPS)):
    t=i/FPS;ff.stdin.write(blend(last,OUTRO,t/X).tobytes())
ff.stdin.close();ff.wait();print('done',OUT)
