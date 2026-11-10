import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.abspath(__file__)));_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# Four phones side by side on the backdrop (Reddit gallery)
from PIL import Image,ImageDraw,ImageFilter
import bgs
O=rk.MEDIA+'/stills/'
W,H=2400,1560
bg=bgs.scene(W,H)
F=rk.font('sansbold',38)
P=[('s_phone','Turn order and your own HP'),('g_sheet','Character sheet'),('g_spell','Full spell cards'),('g_conc','Concentration saves')]
pw,ph=480,1039;gap=(W-4*pw)//5;y=120
for i,(f,lab) in enumerate(P):
    x=gap+i*(pw+gap);bz=16;r=48
    sh=Image.new('L',(W,H),0);ImageDraw.Draw(sh).rounded_rectangle((x-bz+10,y-bz+24,x+pw+bz+10,y+ph+bz+24),r,fill=170);sh=sh.filter(ImageFilter.GaussianBlur(26))
    bg=Image.composite(Image.new('RGB',(W,H),(0,0,0)),bg,sh);dd=ImageDraw.Draw(bg)
    dd.rounded_rectangle((x-bz,y-bz,x+pw+bz,y+ph+bz),r,fill=(12,12,16),outline=(90,96,110),width=3)
    s=Image.open(O+f+'.png').convert('RGB').resize((pw,ph),Image.LANCZOS);m=Image.new('L',(pw,ph),0);ImageDraw.Draw(m).rounded_rectangle((0,0,pw,ph),r-bz,fill=255);bg.paste(s,(x,y),m)
    tw=dd.textlength(lab,font=F);dd.text((x+pw/2-tw/2,y+ph+bz+40),lab,font=F,fill=(244,214,150))
bg.save(rk.MEDIA+'/phones.png')
