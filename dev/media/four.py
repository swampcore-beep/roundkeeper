import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# One fight, four screens: the stills on the table surface (look.py), for the top of the README
from PIL import Image,ImageDraw
import look
O=rk.MEDIA+'/stills/';W,H=2400,1340
im=look.surface(W,H)
def put(im,kind,src,x,y,w,h):
    im,r=look.device(im,kind,x,y,w,h);s=Image.open(O+src).convert('RGB').resize((w,h),Image.LANCZOS);im.paste(s,(x,y),look.mask(w,h,r));return im
im=put(im,'laptop','s_dm.png',100,300,1180,664)
im=put(im,'tv','s_tv.png',1420,160,860,484)
im=put(im,'tablet','s_tablet.png',1420,800,560,373)
im=put(im,'phone','s_phone.png',2070,760,190,411)
d=ImageDraw.Draw(im,'RGBA')
for t,x,y in (("The DM's laptop",100,262),("TV across the room",1420,122),("Tablet on the table",1420,762),("Phone",2070,722)): look.label(d,t,x,y,22)
d.text((100,70),"Roundkeeper",font=look.font('title',64),fill=look.INK)
d.text((104,160),"One fight, four screens. Free, offline, on your own Wi-Fi.",font=look.font('text',32),fill=(214,207,193))
look.caption(d,"The dragon's turn, everywhere at once",100,1080,1200,size=40,sub="Monster HP, statblocks and hidden enemies stay on the laptop; the table sees only what you show.")
im.save(rk.MEDIA+'/four.png')
