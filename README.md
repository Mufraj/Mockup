# RAZAB storefront mockup

Premium Amazon Storefront design using original RAZAB website photographs,
logo, brand colors, and Inter / Playfair Display fonts.

## Deploy on Vercel

Import this GitHub repository into Vercel and keep the Root Directory at the
repository root. The committed `vercel.json` configures the Other framework
preset, `npm run build`, and the `dist` output directory. No environment
variables, dependencies, or browser rendering are required for deployment.

The build serves the storefront at `/`, using separate local image files and
the dedicated mobile artwork. Only the page and its referenced images are
copied into the deployment.

Vercel configuration reference:
[Project configuration](https://vercel.com/docs/project-configuration).

## Local preview and editing

- `output/razab-premium.html`: self-contained offline preview.
- `output/razab-premium-source.html`: preview using separate local images;
  this is the deployment input.
- `output/generate-benchmark-artwork.py`: section composition and copy.
- `output/store-artwork.css`: artwork styling and original fonts.
- `output/assets/amazon-store/upload-manifest.json`: image order, dimensions,
  product references, original photo URLs, and hashes.
- `output/START-HERE.txt`: complete editing and export instructions.

Run `npm run build` to create the deployable site in `dist`.
To change the rendered sections, regenerate and export the artwork first:

```sh
python output/generate-benchmark-artwork.py
node output/export-amazon-modules.cjs
npm run build
```

The artwork exporter needs Chrome or Edge on Windows. Deployment uses the
already exported images and does not run this exporter.

The storefront has 15 content sections. Its latest artwork verification passed
75 browser checks, including original photo provenance, fonts, image loading,
text bounds, and responsive layouts. Local browser profiles, archived
concepts, screenshots, generated ZIP files, and deployment output are excluded
from Git.
