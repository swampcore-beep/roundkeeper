import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# The look of the README videos (1.4): a matte, warm table surface with grain, real-looking devices with contact
# shadows, plain captions and real keycaps. No gradients, glows, vignettes or centred gold titles.
import os
import numpy as np
from PIL import Image,ImageDraw,ImageFilter,ImageFont
W,H=1920,1080
INK=(241,235,221)        # captions
MUTED=(155,149,138)      # labels, second lines
CLAY=(214,112,80)        # the one accent: clicks, taps, the key outline
SURF=(29,27,24)          # the table
_F={}
def font(name,size):
    """'title' (Alegreya SC, the tablet's names), 'text' and 'bold' (Atkinson Hyperlegible), from the app's fonts folder."""
    src={'title':'alegreya-sc-latin-800-normal.woff2','text':'atkinson-hyperlegible-latin-400-normal.woff2',
         'bold':'atkinson-hyperlegible-latin-700-normal.woff2'}[name]
    ttf=os.path.join(rk.WORK,'fonts',name+'-look.ttf')
    if not os.path.exists(ttf):
        from fontTools.ttLib import TTFont
        os.makedirs(os.path.dirname(ttf),exist_ok=True);f=TTFont(os.path.join(rk.ROOT,'fonts',src));f.flavor=None;f.save(ttf)
    k=(name,size)
    if k not in _F: _F[k]=ImageFont.truetype(ttf,size)
    return _F[k]
def surface(w=W,h=H,seed=7):
    """The table: one warm tone, fine grain and a faint large-scale unevenness, like a matte desk mat."""
    rng=np.random.default_rng(seed)
    grain=rng.normal(0,1,(h,w))*4.2
    low=np.asarray(Image.fromarray((rng.normal(128,40,(h//60+1,w//60+1))).clip(0,255).astype('uint8')).resize((w,h),Image.BICUBIC),dtype=float)-128
    a=np.array(SURF,dtype=float)[None,None,:]+(grain+low*0.05)[:,:,None]
    return Image.fromarray(a.clip(0,255).astype('uint8'))
def _shadow(im,box,r,dy,blur,alpha):
    sh=Image.new('L',im.size,0);x0,y0,x1,y1=box
    ImageDraw.Draw(sh).rounded_rectangle((x0+4,y0+dy,x1-4,y1+dy),r,fill=int(255*alpha))
    sh=sh.filter(ImageFilter.GaussianBlur(blur))
    return Image.composite(Image.new('RGB',im.size,(6,5,4)),im,sh)
def device(im,kind,x,y,w,h):
    """Draws the body of a device around a screen at (x,y,w,h); returns the screen's mask radius."""
    if kind=='laptop':
        bz,r=14,16;box=(x-bz,y-bz,x+w+bz,y+h+bz)
        im=_shadow(im,(box[0]-40,box[3]-10,box[2]+40,box[3]+40),20,20,26,.75)
        im=_shadow(im,box,r,22,30,.55);d=ImageDraw.Draw(im)
        d.rounded_rectangle(box,r,fill=(14,14,15),outline=(58,57,54),width=1)
        # the base: a thin slab with a lip and a notch
        by=box[3];d.polygon([(box[0]-46,by+4),(box[2]+46,by+4),(box[2]+34,by+26),(box[0]-34,by+26)],fill=(52,50,47))
        d.rectangle((box[0]-46,by,box[2]+46,by+5),fill=(78,75,70));cx=(box[0]+box[2])/2
        d.rounded_rectangle((cx-90,by,cx+90,by+7),4,fill=(40,39,37))
        return im,4
    if kind=='tv':
        bz,r=7,6;box=(x-bz,y-bz,x+w+bz,y+h+bz);im=_shadow(im,box,r,18,24,.5);d=ImageDraw.Draw(im)
        d.rounded_rectangle(box,r,fill=(10,10,11),outline=(50,49,46),width=1);cx=(box[0]+box[2])/2
        d.rectangle((cx-10,box[3],cx+10,box[3]+26),fill=(36,35,33));d.rounded_rectangle((cx-120,box[3]+24,cx+120,box[3]+32),4,fill=(44,43,40))
        return im,2
    bz,r={'tablet':(16,26),'phone':(10,32)}[kind];box=(x-bz,y-bz,x+w+bz,y+h+bz)
    im=_shadow(im,box,r,18,26,.6);d=ImageDraw.Draw(im)
    d.rounded_rectangle(box,r,fill=(13,13,14),outline=(62,61,58),width=1)
    return im,max(3,r-bz)
def label(d,text,x,y,size=17):
    """A small label above a device, letter-spaced capitals in the muted colour."""
    f=font('bold',size);sp=size*0.16
    for ch in text.upper():
        d.text((x,y),ch,font=f,fill=MUTED);x+=d.textlength(ch,font=f)+sp
def mask(w,h,r):
    m=Image.new('L',(w,h),0);ImageDraw.Draw(m).rounded_rectangle((0,0,w-1,h-1),r,fill=255);return m
def caption(d,text,x,y,maxw,size=40,sub=None,alpha=255):
    """A caption: plain text in one or two lines, an optional quieter second line. Returns its height."""
    f=font('bold',size);lines=_wrap(d,text,f,maxw);yy=y
    for ln in lines: d.text((x,yy),ln,font=f,fill=INK+(alpha,));yy+=int(size*1.22)
    if sub:
        fs=font('text',int(size*.6))
        for ln in _wrap(d,sub,fs,maxw): d.text((x,yy+4),ln,font=fs,fill=MUTED+(alpha,));yy+=int(size*.6*1.35)
    return yy-y
def keycap(d,text,cx,y,alpha=255,size=30):
    """A real key: light cap, dark letters, a darker lower edge."""
    f=font('bold',size);w=max(54,d.textlength(text,font=f)+40);h=58;x0=cx-w/2
    d.rounded_rectangle((x0,y+6,x0+w,y+h+6),10,fill=(120,114,104,alpha))
    d.rounded_rectangle((x0,y,x0+w,y+h),10,fill=(236,231,220,alpha))
    d.text((cx-d.textlength(text,font=f)/2,y+11),text,font=f,fill=(28,26,23,alpha))
def brand(d,x,y,size=30):
    d.text((x,y),"Roundkeeper",font=font('title',size),fill=INK)
def _wrap(d,txt,f,w):
    out,cur=[],""
    for word in txt.split():
        t=(cur+" "+word).strip()
        if d.textlength(t,font=f)>w and cur: out.append(cur);cur=word
        else: cur=t
    return out+[cur]
def card(title,lines,foot=None,kicker=None):
    """Intro and outro: left-aligned on the table, the name large, a few plain lines, no glow."""
    im=surface();d=ImageDraw.Draw(im);x,y=160,H*0.36
    if kicker: label(d,kicker,x+4,y-36,20)
    d.text((x,y),title,font=font('title',110),fill=INK);y+=150
    for ln in lines: d.text((x,y),ln,font=font('text',38),fill=(214,207,193));y+=58
    if foot: d.text((x,H-130),foot,font=font('bold',24),fill=MUTED)
    return im
