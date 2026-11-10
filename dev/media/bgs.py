import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
import math,random
from PIL import Image,ImageDraw,ImageFilter
import numpy as np
def grad(W,H,top,bot):
    t=np.linspace(0,1,H)[:,None,None];a=np.array(top)[None,None,:];b=np.array(bot)[None,None,:]
    return (a+(b-a)*t)*np.ones((1,W,1))
def glow(arr,box,col,amt,blur):
    W,H=arr.shape[1],arr.shape[0]
    g=Image.new('L',(W,H),0);ImageDraw.Draw(g).ellipse(box,fill=255);g=np.asarray(g.filter(ImageFilter.GaussianBlur(blur)))[:,:,None]/255*amt
    return arr*(1-g)+np.array(col)[None,None,:]*g
def vign(arr,k=.55):
    H,W=arr.shape[:2];y,x=np.ogrid[:H,:W];r=np.sqrt(((x-W/2)/(W/2))**2+((y-H/2)/(H/2))**2)
    return arr*(1-k*np.clip(r-0.35,0,1)[:,:,None])
def out(a): return Image.fromarray(np.clip(a,0,255).astype('uint8'))
def midnight(W,H):
    a=grad(W,H,(8,12,26),(14,22,44));a=glow(a,(W*.1,H*.55,W*.9,H*1.4),(40,70,140),.55,int(W*.09))
    a=glow(a,(W*.55,-H*.3,W*1.1,H*.45),(70,50,120),.25,int(W*.08));im=out(vign(a,.35));d=ImageDraw.Draw(im);rnd=random.Random(3)
    for _ in range(int(W*H/9000)):
        x,y=rnd.random()*W,rnd.random()*H*.7;s=rnd.random();c=int(120+120*s);d.point((x,y),fill=(c,c,min(255,c+30)))
    return im
def arcane(W,H):
    a=grad(W,H,(14,10,24),(22,14,36));a=glow(a,(W*.25,H*.15,W*.75,H*1.05),(90,50,150),.35,int(W*.1));im=out(vign(a,.4))
    ov=Image.new('L',(W,H),0);d=ImageDraw.Draw(ov);cx,cy=W*.5,H*.58
    for r,wd in [(H*.62,3),(H*.56,2),(H*.44,2),(H*.30,2)]: d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=255,width=wd)
    R=H*.44;pts=[(cx+R*math.cos(math.pi*(-.5+.8*i)),cy+R*math.sin(math.pi*(-.5+.8*i))) for i in range(6)];d.line(pts,fill=255,width=2)
    for i in range(48):
        t=2*math.pi*i/48;r1,r2=H*.56,H*.62 if i%4 else H*.66;d.line([(cx+r1*math.cos(t),cy+r1*math.sin(t)),(cx+r2*math.cos(t),cy+r2*math.sin(t))],fill=255,width=2)
    ov=ov.filter(ImageFilter.GaussianBlur(1.2))
    return Image.composite(Image.new('RGB',(W,H),(150,110,220)),im,ov.point(lambda v:v*0.22))
def felt(W,H):
    rng=np.random.default_rng(5);n=rng.normal(0,1,(H//2,W//2));n=np.asarray(Image.fromarray(((n*20)+128).clip(0,255).astype('uint8')).resize((W,H)).filter(ImageFilter.GaussianBlur(1.1)),dtype=float)-128
    a=grad(W,H,(16,44,34),(12,36,28))+n[:,:,None]*np.array([.18,.30,.24])[None,None,:]
    a=glow(a,(W*.15,H*.2,W*.85,H*1.0),(34,86,64),.45,int(W*.1));return out(vign(a,.6))
def scene(W,H,src=None):
    src=src or rk.MEDIA+'/backdrop.png'
    im=Image.open(src).convert('RGB').resize((W,H),Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))
    a=np.asarray(im,dtype=float)*1.25+8;return out(vign(a,.5))
