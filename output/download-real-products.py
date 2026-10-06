from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor
import json,re
root=Path(__file__).resolve().parent
catalog=json.loads((root/'.qa'/'razab-catalog.json').read_text(encoding='utf-8'))['products']
handles=['16-pc-glass-set','1860-ml-glass','6500-ml-large-food-storage-container','4800-ml-glass-container-with-locking-lid','set-of-2-glass-loaf-pans','3300-ml-glass-set']
dest=root/'assets'/'products';dest.mkdir(parents=True,exist_ok=True)
def get(url):return urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read()
def download(task):
    name,url=task;data=get(url);(dest/name).write_bytes(data);return {'file':'assets/products/'+name,'source':url,'bytes':len(data)}
tasks=[];selected=[]
for handle in handles:
    p=next(p for p in catalog if p['handle']==handle);selected.append(p)
    for index,image in enumerate(p['images'][:4]):
        ext=Path(urlparse(image['src']).path).suffix
        tasks.append((handle+'-'+str(index)+ext,image['src']))
with ThreadPoolExecutor(max_workers=5) as executor:records=list(executor.map(download,tasks))
(dest/'photo-sources.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
(root/'.qa'/'selected-products.json').write_text(json.dumps(selected,indent=2),encoding='utf-8')
for p in selected:
    handle=p['handle'];url='https://razab.com/products/'+handle
    html=get(url).decode('utf-8');(root/'.qa'/(handle+'.html')).write_text(html,encoding='utf-8')
    amazon=list(dict.fromkeys(re.findall(r'https?://[^\s\x22<>]*amazon[^\s\x22<>]*',html)))
    print(json.dumps({'title':p['title'],'handle':handle,'brand_url':url,'amazon_links':amazon,'description':re.sub('<[^>]+>',' ',p['body_html'])[:2200],'price':p['variants'][0]['price'],'images':[r for r in records if handle+'-' in r['file']]}))
all_html=get('https://razab.com/collections/all').decode('utf-8');(root/'.qa'/'collections-all-live.html').write_text(all_html,encoding='utf-8')
print('Live catalog handles:',list(dict.fromkeys(re.findall(r'/products/[^\s\x22<>?#]+',all_html))))
