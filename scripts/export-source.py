"""Export portable source without dependencies, builds or secrets."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
destination=root/'public/downloads/cloud-kitchen-source.zip'
destination.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  if not p.is_file():continue
  rel=p.relative_to(root)
  if any(v in rel.parts for v in ['node_modules','dist','.git','.sites-runtime','.wrangler','.agents','.codex','downloads','__pycache__']):continue
  if p.name.startswith('.env') and p.name!='.env.example':continue
  if p.suffix in ['.tsbuildinfo','.log']:continue
  z.write(p,'cloud-kitchen/'+str(rel))
with zipfile.ZipFile(destination) as z:
 assert z.testzip() is None
 assert not any('/node_modules/' in n or n.endswith('/.env') for n in z.namelist())
print('Source bundle validated')
