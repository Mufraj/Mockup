from pathlib import Path
from urllib.request import Request, urlopen
import json, re

root = Path(__file__).resolve().parent
request = Request('https://razab.com/products.json?limit=250',headers={'User-Agent':'Mozilla/5.0'})
catalog = json.loads(urlopen(request,timeout=30).read())
(root / '.qa' / 'razab-catalog.json').write_text(json.dumps(catalog,indent=2),encoding='utf-8')
for product in catalog['products']:
    if re.search(r'35|1860|6500|9500|9.5|loaf|16\s*pc|24\s*pc',product['title'],re.I):
        print(json.dumps({
          'title':product['title'],'handle':product['handle'],
          'body':re.sub('<[^>]+>',' ',product['body_html']),
          'variants':[{k:v.get(k) for k in ['title','sku','price','available']} for v in product['variants']],
          'images':[{'src':i['src'],'alt':i.get('alt'),'width':i.get('width'),'height':i.get('height')} for i in product['images']]
        },ensure_ascii=True))
