/**
 * Pre-compile the hero supply-chain JSX (animations.jsx + supply-chain.jsx)
 * into a single minified `scene.js` that the iframe loads directly.
 *
 * Why: The original Babel-standalone setup downloaded ~3 MB and compiled
 * JSX in the browser on every visit. This script does that work once at
 * build time so production users get a ~40 KB compiled bundle instead.
 *
 * Tricky bits:
 *  - The two source files share globals via the script-tag mechanism
 *    (no explicit imports between them), so we concatenate first.
 *  - Esbuild reads the project's tsconfig.json which sets jsx="react-jsx"
 *    (automatic runtime). That emits `import { jsx } from "react/jsx-runtime"`
 *    which plain <script> tags can't resolve. We override via tsconfigRaw
 *    to force the classic transform that targets React.createElement.
 */
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'public/cocoa-supply-chain';

// 1. Concatenate the two JSX files into a single combined source.
const animations  = readFileSync(join(dir, 'animations.jsx'),  'utf8');
const supplyChain = readFileSync(join(dir, 'supply-chain.jsx'), 'utf8');
const combinedPath = join(dir, '_combined.jsx');
writeFileSync(combinedPath, animations + '\n' + supplyChain);

// 2. Build with classic JSX transform → React.createElement (no imports).
await esbuild.build({
  entryPoints: [combinedPath],
  loader: { '.jsx': 'jsx' },
  jsx: 'transform',                // classic — uses jsxFactory below
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  // Override project tsconfig (which sets jsx: 'react-jsx' / automatic).
  tsconfigRaw: JSON.stringify({
    compilerOptions: { jsx: 'react' }
  }),
  bundle: false,
  minify: true,
  target: 'es2017',
  outfile: join(dir, 'scene.js'),
  logLevel: 'info',
});

// 3. Clean up the intermediate combined file.
try { unlinkSync(combinedPath); } catch {}
