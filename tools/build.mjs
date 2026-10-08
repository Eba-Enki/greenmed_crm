// Production build, run by the deploy workflow before the FTP upload.
// Compiles the JSX in the text/babel scripts ahead of time — with the same Babel version and the same
// presets/plugins the in-browser transformer uses — so visitors no longer download @babel/standalone
// (2.8 MB) and no longer compile the app on every page load. It also stamps every local script with a
// content hash (?v=…) so browsers never run a cached copy of the previous file.
//
// Usage: node tools/build.mjs <siteRoot>      (rewrites index.html and js/*.js in place)
// Local development is unchanged: the repository's index.html still compiles in the browser.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Babel = require('@babel/standalone'); // pinned to the version index.html loads (see package.json)

const root = path.resolve(process.argv[2] || '.');
// The build overwrites the sources, so outside CI it only runs on a copy (a folder that is not a git checkout)
if (fs.existsSync(path.join(root, '.git')) && process.env.CI !== 'true' && !process.argv.includes('--force')) {
  console.error(`Refusing to build in ${root}: it is a git working copy and this would overwrite the sources.\n` +
    'Copy the project elsewhere and build the copy (CI does this automatically).');
  process.exit(1);
}
const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Exactly what @babel/standalone applies to <script type="text/babel"> without data-presets/data-plugins
const OPTIONS = {
  presets: ['react', 'env'],
  plugins: ['transform-class-properties', 'transform-object-rest-spread', 'transform-flow-strip-types'],
  comments: false,
  compact: true,
};

const hash = buf => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
let compiled = 0;

// 1. Compile every text/babel script and turn its tag into a plain script
html = html.replace(/<script type="text\/babel" src="([^"?]+)(?:\?v=[^"]*)?"><\/script>/g, (tag, src) => {
  const file = path.join(root, src);
  const out = Babel.transform(fs.readFileSync(file, 'utf8'), { ...OPTIONS, filename: src }).code;
  fs.writeFileSync(file, out);
  compiled++;
  console.log(`compiled ${src} (${Math.round(out.length / 1024)} KB)`);
  return `<script src="${src}?v=${hash(out)}"></script>`;
});

// 2. The in-browser compiler is no longer needed
const babelTag = /\s*<script src="https:\/\/unpkg\.com\/@babel\/standalone@[^"]+"><\/script>/;
if (!babelTag.test(html)) throw new Error('Babel <script> tag not found in index.html');
html = html.replace(babelTag, '');

// 3. Every other local script reference — plain tags like js/i18n.js and the on-demand URLs in #gm-lazy
//    (js/fonts.js) — gets a content hash too
html = html.replace(/(js\/[\w.-]+\.js)\?v=[^"&]*/g, (ref, src) =>
  `${src}?v=${hash(fs.readFileSync(path.join(root, src)))}`);

if (/text\/babel/.test(html)) throw new Error('index.html still has text/babel scripts');
if (compiled === 0) throw new Error('no text/babel scripts found — nothing compiled');
fs.writeFileSync(indexPath, html);
console.log(`index.html updated: ${compiled} scripts precompiled, Babel removed`);
