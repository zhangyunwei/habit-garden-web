from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np,json,shutil
root=Path(__file__).resolve().parents[1]
src=root/'素材制作/珊瑚小屋版/生成原图'
out=root/'assets/coral'
out.mkdir(parents=True,exist_ok=True)
manifest=[]
def cut(im,checker=False):
    im=im.convert('RGB'); a=np.asarray(im).astype('int16')
    lo=a.min(2); hi=a.max(2)
    bg=((hi-lo)<18)&(lo>155) if checker else ((hi-lo)<16)&(lo>235)
    # Flood-fill only the exterior background; enclosed light petals and faces survive.
    mask=Image.fromarray(np.pad(bg.astype('uint8')*255,1,constant_values=255)).copy()
    ImageDraw.floodfill(mask,(0,0),128,thresh=0)
    exterior=np.asarray(mask)[1:-1,1:-1]==128
    alpha=Image.fromarray((~exterior).astype('uint8')*255)
    im=im.convert('RGBA');im.putalpha(alpha)
    bbox=im.getbbox()
    return im.crop(bbox) if bbox else im

def save(im,name,size=(256,256),fraction=.88,bottom=.94):
    canvas=Image.new('RGBA',size)
    factor=min(size[0]*fraction/im.width,size[1]*fraction/im.height)
    scaled=im.resize((max(1,round(im.width*factor)),max(1,round(im.height*factor))),Image.Resampling.LANCZOS)
    canvas.alpha_composite(scaled,((size[0]-scaled.width)//2,round(size[1]*bottom)-scaled.height))
    path=out/name;path.parent.mkdir(parents=True,exist_ok=True);canvas.save(path,optimize=True)
    manifest.append({'file':str(path.relative_to(root)),'size':size,'transparent_pixels':int((np.asarray(canvas)[:,:,3]==0).sum())})
    return canvas
shutil.copy2(src/'background.png',out/'garden.png')
for animal in ['capybara','panda']:
    save(cut(Image.open(src/(animal+'.png')),True),f'sprites/animals/animal_{animal}_idle.png',(512,512),.92)
plants=['daisy','carrot','strawberry','sunflower','pumpkin']
atlas=Image.open(src/'plants.png')
for r,stage in enumerate(['seed','sprout','growing','mature']):
    for c,id in enumerate(plants):
        cell=atlas.crop(([0,280,565,840,1110,1402][c],[0,280,525,780,1122][r],[0,280,565,840,1110,1402][c+1],[0,280,525,780,1122][r+1]))
        save(cut(cell),f'sprites/plants/{id}/plant_{id}_{stage}.png',fraction=[.26,.43,.67,.86][r])
atlas=Image.open(src/'decorations.png')
for i,id in enumerate(['daisy_flowerpot','stepping_stones','wooden_bench','courtyard_lamp','stone_fountain','sprout_sign']):
    c=i%3;r=i//3;cell=atlas.crop(([0,465,1040,1536][c],r*512,[0,465,1040,1536][c+1],(r+1)*512))
    save(cut(cell),f'sprites/decorations/decoration_{id}.png')
atlas=Image.open(src/'icons.png')
names=['core/icon_shop','core/icon_seed','core/icon_harvest_tool','core/icon_edit','core/icon_settings','core/icon_warehouse','core/icon_coin','core/icon_exp']+['seeds/icon_seed_'+id for id in plants]+['core/icon_lock','core/icon_confirm','core/icon_cancel']
for i,id in enumerate(names):
    c=i%4;r=i//4;cell=atlas.crop(([0,325,635,935,1254][c],[0,345,635,925,1254][r],[0,325,635,935,1254][c+1],[0,345,635,925,1254][r+1]))
    save(cut(cell),f'icons/{id}.png',fraction=.9,bottom=.95)
soil=cut(Image.open(src/'soil.png'))
for state in ['empty','locked','unlockable']:
    save(soil,f'sprites/plots/plot_{state}.png',(384,240),.98,bottom=.99)
(root/'素材制作/珊瑚小屋版/透明素材清单.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
files=list(out.rglob('*.png'));thumbs=Image.new('RGB',(1000,((len(files)+7)//8)*145),'#c0da85');d=ImageDraw.Draw(thumbs)
for i,p in enumerate(files):
    im=Image.open(p).convert('RGBA');im.thumbnail((115,115));x=i%8*125;y=i//8*145;thumbs.paste(im,(x+(125-im.width)//2,y),im);d.text((x+2,y+116),p.stem.replace('plant_','').replace('icon_','')[:20],fill='#344432')
thumbs.save(root/'素材制作/珊瑚小屋版/透明素材总览.png')
print('ASSETS',len(files))
