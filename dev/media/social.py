import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# The 1280x640 social preview
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import bgs
O=rk.MEDIA+'/stills/'
W,H=1280,640
bg=bgs.scene(W,H)
def device(img,x,y,w,h,bez,r,col=(12,12,16)):
    global bg
    box=(x-bez,y-bez,x+w+bez,y+h+bez)
    sh=Image.new('L',(W,H),0);ImageDraw.Draw(sh).rounded_rectangle((box[0]+6,box[1]+14,box[2]+6,box[3]+14),r,fill=180);sh=sh.filter(ImageFilter.GaussianBlur(16))
    bg=Image.composite(Image.new('RGB',(W,H),(0,0,0)),bg,sh)
    d=ImageDraw.Draw(bg);d.rounded_rectangle(box,r,fill=col,outline=(90,96,110),width=2)
    s=Image.open(img).convert('RGB').resize((w,h),Image.LANCZOS);m=Image.new('L',(w,h),0);ImageDraw.Draw(m).rounded_rectangle((0,0,w,h),max(3,r-bez),fill=255);bg.paste(s,(x,y),m)
device(O+'s_tv.png',660,60,560,315,8,6,(8,8,10))
device(O+'s_tablet.png',618,350,396,264,12,20)
device(O+'s_phone.png',1080,302,120,260,8,18)
d=ImageDraw.Draw(bg)
FT=rk.font('cinzel',66);FB=rk.font('sansbold',31);FR=rk.font('sans',24)
d.text((62,160),"Roundkeeper",font=FT,fill=(244,214,150))
d.text((64,258),"A free, offline combat tracker",font=FB,fill=(240,236,230))
d.text((64,302),"for 5e games at the table",font=FB,fill=(240,236,230))
d.text((64,368),"DM laptop · tablet · TV · phones",font=FR,fill=(200,206,220))
d.text((64,404),"SRD 5.2.1 built in · no accounts",font=FR,fill=(200,206,220))
bg.save(rk.MEDIA+'/social-preview.png')
