const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const input = path.join(root, 'razab-premium-source.html');
const output = path.join(root, 'razab-premium.html');
const source = fs.readFileSync(input, 'utf8');
const types = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp', woff2:'font/woff2' };
const embedded = new Set();
const html = source.replace(/assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:png|jpg|jpeg|webp|woff2)/g, asset => {
  const full = path.resolve(root, asset);
  if (!full.startsWith(path.join(root, 'assets') + path.sep)) throw Error('Asset outside project: '+asset);
  const ext = path.extname(asset).slice(1);
  embedded.add(asset);
  return 'data:'+types[ext]+';base64,'+fs.readFileSync(full).toString('base64');
});
fs.writeFileSync(output, html);
console.log('Built self-contained storefront. Embedded assets:');
console.log([...embedded].join('\n'));
