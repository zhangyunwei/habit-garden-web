"""Embed the local runtime and art into a single offline-playable HTML file."""
from pathlib import Path
import base64, json, re, subprocess, sys
root=Path(__file__).resolve().parent
subprocess.run([sys.executable,str(root/'scripts/build-site.py')],check=True)
root=root/'dist'
atlas=json.loads((root/'animal-atlas.js').read_text().split('=',1)[1].rstrip(';\n'))
active_atlases={a['src'] for a in atlas['atlases'].values()}
assets={p.relative_to(root).as_posix():'data:image/webp;base64,'+base64.b64encode(p.read_bytes()).decode() for p in (root/'assets/coral').rglob('*.webp')}
html=(root/'index.html').read_text()
html=re.sub(r'src="(assets/[^\"]+)"',lambda m:'src="'+assets[m[1]]+'"',html)
css=(root/'style.css').read_text()
for path,data in assets.items():
 css=css.replace(path,data)
html=re.sub(r'<link rel="stylesheet" href="style.css[^"]*">',lambda _:'<style>'+css+'</style>',html)
scripts='<script>window.GARDEN_ASSETS='+json.dumps(assets,separators=(',',':'))+';</script>'
for name in ['model.js','audio.js','animal-atlas.js','animal-motion.js','animal-renderer.js','app.js','environment.js']:
 scripts+='<script>'+(root/name).read_text().replace('</script','<\\/script')+'</script>'
html=re.sub(r'<script src="model.js[^\"]*"></script>.*?<script src="environment.js[^\"]*"></script>',lambda _:scripts,html,flags=re.S)
out=root.parent/'习惯花园-双击即玩.html';out.write_text(html)
print(f'Built {out.name}: {out.stat().st_size/1024/1024:.1f} MB; {len(assets)} embedded images')
