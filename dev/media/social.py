import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# The 1280x640 social preview, on the table surface (look.py)
from PIL import Image,ImageDraw
import look
O=rk.MEDIA+'/stills/';W,H=1280,640
im=look.surface(W,H)
def put(im,kind,src,x,y,w,h):
    im,r=look.device(im,kind,x,y,w,h);s=Image.open(O+src).convert('RGB').resize((w,h),Image.LANCZOS);im.paste(s,(x,y),look.mask(w,h,r));return im
im=put(im,'tv','s_tv.png',660,60,560,315)
im=put(im,'tablet','s_tablet.png',640,392,330,220)
im=put(im,'phone','s_phone.png',1060,330,118,256)
d=ImageDraw.Draw(im)
d.text((62,150),"Roundkeeper",font=look.font('title',70),fill=look.INK)
for i,t in enumerate(("A free, offline combat tracker","for 5e games at the table")): d.text((64,258+i*44),t,font=look.font('bold',32),fill=look.INK)
for i,t in enumerate(("DM laptop · tablet · TV · phones","SRD 5.2.1 built in · no accounts")): d.text((64,370+i*36),t,font=look.font('text',24),fill=(205,198,184))
im.save(rk.MEDIA+'/social-preview.png')
