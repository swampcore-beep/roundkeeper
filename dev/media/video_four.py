import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# Put the four recordings side by side in one 1920x1080 video, synced by the marks of each pass.
import json,os,subprocess,bisect,sys
from PIL import Image,ImageDraw
import look
R=rk.MEDIA+'/four-video/'
W,H,FPS=1920,1080,30
OUT=sys.argv[1] if len(sys.argv)>1 else rk.MEDIA+'/roundkeeper-four-screens.mp4'
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
# the static layer: the table surface, the devices, their labels (look.py)
BOX={'tablet':('tablet',80,150,1008,672),'tv':('tv',1170,150,672,378),'dm':('laptop',1230,640,400,225),'phone':('phone',1712,600,150,325)}
RAD={}
def static():
    im=look.surface()
    for k,(kind,x,y,w,h) in BOX.items(): im,RAD[k]=look.device(im,kind,x,y,w,h)
    d=ImageDraw.Draw(im)
    for t,x,y in (("Tablet on the table",80,112),("TV across the room",1170,112),("The DM's laptop",1230,604),("Phone",1712,564)): look.label(d,t,x,y)
    look.brand(d,80,36,34)
    return im
BG=static()
MASK={k:look.mask(w,h,RAD[k]) for k,(kind,x,y,w,h) in BOX.items()}
cache={}
def frame_of(k,t):
    st=S[k];wt=mapt(st,t);i=max(0,bisect.bisect_right(st['ts'],wt)-1);key=(k,i)
    if key not in cache:
        _,x,y,w,h=BOX[k];cache.clear() if len(cache)>40 else None
        cache[key]=Image.open(st['fn'][i]).convert('RGB').resize((w,h),Image.LANCZOS)
    return cache[key]
def main_frame(t):
    im=BG.copy()
    for k,(kind,x,y,w,h) in BOX.items(): im.paste(frame_of(k,t),(x,y),MASK[k])
    c=None
    for ct,cc in caps:
        if t>=ct-0.05: c=(ct,cc)
    if c: look.caption(ImageDraw.Draw(im,'RGBA'),c[1],80,870,1000,size=40,alpha=int(255*min(1,(t-c[0]+0.05)/0.35)))
    return im
if __name__=='__main__':
    INTRO=look.card("Roundkeeper",["One fight, four screens:","the DM's laptop, a tablet on the table, a TV and the players' phones."])
    OUTRO=look.card("Roundkeeper",["Free and open source, for Windows, Mac and Linux.","No accounts, no internet: it runs on your own Wi-Fi."],foot="github.com/swampcore-beep/roundkeeper")
    def blend(a,b,x): return Image.blend(a,b,max(0,min(1,x)))
    ff=subprocess.Popen(['ffmpeg','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
        '-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',OUT],stdin=subprocess.PIPE)
    IN,OUTD,X=2.4,3.5,0.5
    n_main=int(TEND*FPS);first=main_frame(0);last=main_frame(TEND)
    for i in range(int(IN*FPS)): ff.stdin.write(blend(INTRO,first,(i/FPS-(IN-X))/X).tobytes())
    for i in range(n_main):
        ff.stdin.write(main_frame(i/FPS).tobytes())
        if i%150==0: print('frame',i,'/',n_main,flush=True)
    for i in range(int(OUTD*FPS)): ff.stdin.write(blend(last,OUTRO,i/FPS/X).tobytes())
    ff.stdin.close();ff.wait();print('done',OUT)
