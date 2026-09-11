"""Stage only public game files for static website hosting."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
out=root/'dist'
out.mkdir(exist_ok=True)
for name in ['index.html','style.css','app.js','model.js','environment.js','audio.js']:
    shutil.copy2(root/name,out/name)
shutil.copytree(root/'assets/coral',out/'assets/coral',dirs_exist_ok=True)
assert (out/'index.html').is_file()
print('Static site ready:',len(list(out.rglob('*'))),'entries')
