from pathlib import Path
import json
import re
import urllib.request

root = Path(__file__).resolve().parent
dest = root / 'assets' / 'fonts'
dest.mkdir(parents=True, exist_ok=True)
url = 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap'
request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'})
css = urllib.request.urlopen(request, timeout=30).read().decode('utf-8')
(dest / 'google-fonts-reference.css').write_text(css, encoding='utf-8')
records = []
for face in re.findall(r'/\* latin \*/\s*(@font-face\s*\{[^}]+\})', css):
    family = re.search(r"font-family:\s*'([^']+)'", face).group(1)
    style = re.search(r'font-style:\s*([^;]+)', face).group(1)
    font_url = re.search(r'url\(([^)]+)\)', face).group(1)
    name = 'inter-latin-variable.woff2' if family == 'Inter' else 'playfair-display-latin-' + ('italic-' if style == 'italic' else '') + 'variable.woff2'
    data = urllib.request.urlopen(font_url, timeout=30).read()
    if data[:4] != b'wOF2':
        raise ValueError('Expected a WOFF2 font: ' + name)
    (dest / name).write_bytes(data)
    records.append({'family': family, 'style': style, 'file': name, 'bytes': len(data), 'source': font_url})
for family in ['inter', 'playfairdisplay']:
    license_url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/' + family + '/OFL.txt'
    text = urllib.request.urlopen(license_url, timeout=30).read().decode('utf-8')
    (dest / (family + '-OFL.txt')).write_text(text, encoding='utf-8')
(dest / 'font-sources.json').write_text(json.dumps({'brand_reference': 'https://razab.com/', 'stylesheet': url, 'fonts': records}, indent=2), encoding='utf-8')
if len(records) != 3:
    raise ValueError('Expected Inter regular, Playfair Display regular, and Playfair Display italic')
print(json.dumps(records, indent=2))
