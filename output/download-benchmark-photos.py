from pathlib import Path
import json, urllib.request, concurrent.futures, html
root=Path(__file__).resolve().parent
dest=root/'assets/products'; dest.mkdir(exist_ok=True)
catalog=json.loads((root/'.qa/razab-catalog.json').read_text())['products']
tasks=[]
for p in catalog:
 if p['handle'] in ['16-pc-glass-set','1860-ml-glass','set-of-2-glass-loaf-pans','6500-ml-large-food-storage-container']:
  for i,im in enumerate(p['images']):
   tasks.append((p['handle']+'-'+str(i)+'.'+im['src'].split('?')[0].split('.')[-1],im['src']))
tasks += [('benchmark-35.webp','https://cdn.shopify.com/s/files/1/0648/7018/7256/files/30-pc-glass-set-large-set-with-many-unique-sizes-758648.webp?v=1775241799'),('benchmark-24.webp','https://cdn.shopify.com/s/files/1/0648/7018/7256/files/24-pc-glass-set-5-different-sizes-24-gfood-set-347313.webp?v=1775241835')]
def get(task):
 name,url=task
 try:
  if not (dest/name).exists():
   data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=35).read();(dest/name).write_bytes(data)
  return {'file':name,'source':url,'bytes':(dest/name).stat().st_size}
 except Exception as e:return {'file':name,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:records=list(pool.map(get,tasks))
(dest/'benchmark-sources.json').write_text(json.dumps(records,indent=2))
cards=''.join('<figure><img src="../assets/products/'+r['file']+'"><figcaption>'+r['file'].replace('-food-storage-container','').replace('-large-food-storage-container','').replace('set-of-2-glass-','')+'</figcaption></figure>' for r in records if 'error' not in r)
(root/'.qa/product-gallery.html').write_text('<!doctype html><html><head><style>body{margin:0;background:#ddd;font:12px Arial;width:1920px;display:grid;grid-template-columns:repeat(8,1fr);gap:8px}figure{margin:0;background:white;padding:8px}img{width:224px;height:205px;object-fit:contain}figcaption{padding-top:5px;height:30px}</style></head><body>'+cards+'</body></html>')
print(json.dumps({'photos':len(records),'errors':[r for r in records if 'error' in r]}))
