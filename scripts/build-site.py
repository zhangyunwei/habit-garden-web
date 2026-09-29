"""Stage only public game files for static website hosting."""
from pathlib import Path
import shutil
import json
import subprocess
root=Path(__file__).resolve().parents[1]
out=root/'dist'
if out.exists():
    shutil.rmtree(out)
out.mkdir(exist_ok=True)
atlas=json.loads((root/'animal-atlas.js').read_text().split('=',1)[1].rstrip(';\n'))
active={a['src'] for a in atlas['atlases'].values()}
files=[p for p in (root/'assets/coral').rglob('*.png')
       if (p.parent.name!='animated' or p.relative_to(root).as_posix() in active)
       and p.relative_to(root).as_posix()!='assets/coral/garden.png']
if not shutil.which('cwebp'):
    raise SystemExit('Install cwebp first (macOS: brew install webp).')
# Rebuild the generated directory so discontinued features cannot linger in a package.
total=0
for p in files:
    target=(out/p.relative_to(root)).with_suffix('.webp')
    target.parent.mkdir(parents=True,exist_ok=True)
    subprocess.run(['cwebp','-quiet','-lossless','-m','6','-exact',str(p),'-o',str(target)],check=True)
    total+=target.stat().st_size
for name in ['index.html','style.css','landscape.css','landscape.js','app.js','model.js','environment.js','audio.js','animal-atlas.js','animal-motion.js','animal-renderer.js','animals-preview.html']:
    # Includes template-based sprite paths; source PNG references remain editable.
    (out/name).write_text((root/name).read_text().replace('.png','.webp'))
before=sum(p.stat().st_size for p in files)
print(f'Lossless WebP: {len(files)} images, {before} -> {total} bytes ({(1-total/before)*100:.1f}% saved)')
assert (out/'index.html').is_file()
print('Static site ready:',len(list(out.rglob('*'))),'entries')
