"""Embed the local runtime and art into a single offline-playable HTML file."""
from pathlib import Path
import base64, json, re
root=Path(__file__).resolve().parent
assets={p.relative_to(root).as_posix():'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode() for p in (root/'assets/coral').rglob('*.png')}
html=(root/'index.html').read_text()
html=re.sub(r'src="(assets/[^\"]+)"',lambda m:'src="'+assets[m[1]]+'"',html)
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>')
scripts='<script>window.GARDEN_ASSETS='+json.dumps(assets,separators=(',',':'))+';</script>'
for name in ['model.js','app.js']:
 scripts+='<script>'+(root/name).read_text().replace('</script','<\\/script')+'</script>'
html=html.replace('<script src="model.js"></script><script src="app.js"></script>',scripts)
out=root/'习惯花园-双击即玩.html';out.write_text(html)
print(f'Built {out.name}: {out.stat().st_size/1024/1024:.1f} MB; {len(assets)} embedded images')
