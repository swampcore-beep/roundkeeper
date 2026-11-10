import sys as _sys,os as _os;_sys.path.insert(0,_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))));import rk  # dev/rk.py
# Copy the finished media from dev/.work/media into media/ with the names, sizes and crops the README uses.
import os,shutil
from PIL import Image
S=rk.MEDIA+'/stills/';D=os.path.join(rk.ROOT,'media')
JPG={  # README name: (still, width)
 'dm':('s_dm',1600),'atmosphere':('g_atmo',1200),'hit-several':('g_hit',1200),'rules':('g_ctrlk',1200),
 'roll-call':('g_rollcall',1000),'conditions':('g_cond',1000),'how-do-you-want':('g_hdywt',1000),
 'tv-title':('g_tvtitle',1000),'tv-break':('g_tvpause',1000),
 'phone-spells':('g_spells',500),'phone-spell':('g_spell',500),'phone-conc':('g_conc',500),'phone-dice':('g_dice',500),'phone-sheet':('g_sheet',500)}
def save(im,name,w=None,crop=None):
    im=im.convert('RGB')
    if crop: im=im.crop(crop)
    if w and im.width!=w: im=im.resize((w,round(im.height*w/im.width)),Image.LANCZOS)
    im.save(os.path.join(D,name),quality=88,optimize=True,progressive=True);print('media/'+name,im.size)
for dst,(src,w) in JPG.items():
    if os.path.exists(S+src+'.png'): save(Image.open(S+src+'.png'),dst+'.jpg',w)
if os.path.exists(S+'g_party.png'): save(Image.open(S+'g_party.png'),'party.jpg',900,(850,450,2030,1340))  # the party sheet only
if os.path.exists(rk.MEDIA+'/four.png'): save(Image.open(rk.MEDIA+'/four.png'),'four-screens.jpg',1600)
if os.path.exists(rk.MEDIA+'/social-preview.png'): shutil.copy(rk.MEDIA+'/social-preview.png',os.path.join(D,'social-preview.png'));print('media/social-preview.png')
for g in ['tablet','boss','tv','phone']:
    f=rk.MEDIA+'/gifs/'+g+'.gif'
    if os.path.exists(f): shutil.copy(f,os.path.join(D,g+'.gif'));print('media/'+g+'.gif')
