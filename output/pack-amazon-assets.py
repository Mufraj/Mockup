"""Package exactly the current manifest's upload files, excluding stale exports."""
from pathlib import Path
import json,zipfile
root=Path(__file__).resolve().parent;assets=root/'assets/amazon-store'
manifest=json.loads((assets/'upload-manifest.json').read_text(encoding='utf-8'))
files=['store-logo.png','upload-manifest.json','README.txt']
for m in manifest['modules']:
 files.append(m['desktop'])
 if m['mobile']:files.append(m['mobile'])
with zipfile.ZipFile(root/'razab-amazon-assets.zip','w',compression=zipfile.ZIP_DEFLATED) as archive:
 for name in files:
  asset=assets/name
  if asset.resolve().parent!=assets.resolve():raise ValueError('Invalid asset path')
  archive.write(asset,name)
with zipfile.ZipFile(root/'razab-amazon-assets.zip') as archive:
 assert archive.testzip() is None
 assert len(archive.namelist())==len(files)
print(f'Verified ZIP: {len(files)-2} current images, README and upload manifest.')
