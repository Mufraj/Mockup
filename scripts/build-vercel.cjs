// Publish the local-asset preview without embedding photographs into the HTML.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'output');
const destinationRoot = path.join(root, 'dist');
const html = fs.readFileSync(path.join(sourceRoot, 'razab-premium-source.html'), 'utf8');
const assets = new Set([...html.matchAll(/(?:src|srcset)="(assets\/[^"\s]+)"/g)].map(match => match[1]));
if (!assets.size) throw new Error('The storefront contains no local image assets.');
fs.mkdirSync(destinationRoot, { recursive: true });
for (const asset of assets) {
  const source = path.resolve(sourceRoot, asset);
  const destination = path.resolve(destinationRoot, asset);
  if (!source.startsWith(path.join(sourceRoot, 'assets') + path.sep) ||
      !destination.startsWith(destinationRoot + path.sep)) {
    throw new Error('Asset path is outside the storefront: ' + asset);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
fs.writeFileSync(path.join(destinationRoot, 'index.html'), html);
console.log(`Built dist/index.html with ${assets.size} local image files. No external image requests required.`);
