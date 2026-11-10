import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# One fight, four screens: the stills on the backdrop
import bgs
O=rk.MEDIA+'/stills/'
from PIL import Image,ImageDraw,ImageFont,ImageFilter
W,H=2400,1340
bg=bgs.scene(W,H)
F=rk.font('sansbold',40);Fs=rk.font('sans',28)
def shadow(box,r):
    sh=Image.new('L',(W,H),0);ImageDraw.Draw(sh).rounded_rectangle(box,r,fill=170);return sh.filter(ImageFilter.GaussianBlur(26))
def device(img,x,y,w,h,bez,r,col=(12,12,16)):
    global bg
    box=(x-bez,y-bez,x+w+bez,y+h+bez)
    bg=Image.composite(Image.new('RGB',(W,H),(0,0,0)),bg,shadow((box[0]+10,box[1]+24,box[2]+10,box[3]+24),r))
    dd=ImageDraw.Draw(bg);dd.rounded_rectangle(box,r,fill=col,outline=(90,96,110),width=2)
    s=Image.open(img).convert('RGB').resize((w,h),Image.LANCZOS);m=Image.new('L',(w,h),0);ImageDraw.Draw(m).rounded_rectangle((0,0,w,h),max(4,r-bez),fill=255);bg.paste(s,(x,y),m)
def label(x,y,t,sub=""):
    dd=ImageDraw.Draw(bg);dd.text((x,y),t,font=F,fill=(244,214,150))
    if sub:dd.text((x,y+50),sub,font=Fs,fill=(205,195,180))
lx,ly,lw,lh=80,230,1110,694
device(O+'s_dm.png',lx,ly,lw,lh,16,18)
dd=ImageDraw.Draw(bg);dd.polygon([(lx-70,ly+lh+16),(lx+lw+70,ly+lh+16),(lx+lw+20,ly+lh+52),(lx-20,ly+lh+52)],fill=(52,50,58),outline=(80,76,84));dd.rounded_rectangle((lx+lw/2-90,ly+lh+16,lx+lw/2+90,ly+lh+26),5,fill=(36,34,40))
label(lx,ly+lh+90,"DM laptop","Runs the fight: monster HP, statblocks and hidden enemies stay here.")
tx,ty,tw,th=1290,170,1040,585
device(O+'s_tv.png',tx,ty,tw,th,14,10,(8,8,10))
dd=ImageDraw.Draw(bg);dd.rectangle((tx+tw/2-14,ty+th+14,tx+tw/2+14,ty+th+56),fill=(40,38,44));dd.rounded_rectangle((tx+tw/2-170,ty+th+52,tx+tw/2+170,ty+th+64),6,fill=(48,46,52))
label(tx,48,"TV","Whose turn it is, big enough to read across the room.")
ax,ay,aw,ah=1300,870,555,370
device(O+'s_tablet.png',ax,ay,aw,ah,22,30)
label(ax-22,ay+ah+36,"Tablet on the table")
px,py,pw,ph=1985,826,196,424
device(O+'s_phone.png',px,py,pw,ph,12,30)
label(px+10,py+ph+28,"Phones")
label(80,60,"","")
dd=ImageDraw.Draw(bg);FT=rk.font('cinzel',64);dd.text((80,56),"Roundkeeper",font=FT,fill=(244,214,150));dd.text((82,140),"One fight, four screens. Free, offline, on your own Wi-Fi.",font=Fs,fill=(205,195,180))
bg.save(rk.MEDIA+'/four.png')
