// Builds the BRISTLE living style guide: src/design/styleguide.ts -> dist/styleguide.html (one file,
// JS and CSS inlined, fonts copied to dist/fonts/ like build.mjs). Open it straight from file://.
//   node styleguide.mjs          minified
//   node styleguide.mjs --dev    readable output
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');

export async function buildStyleguide({ minify = true } = {}) {
  const res = await esbuild.build({
    entryPoints: [join(here, 'src/design/styleguide.ts')],
    bundle: true, format: 'iife', target: 'es2022', minify, sourcemap: false, write: false, legalComments: 'none',
  });
  const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = readFileSync(join(here, 'src/design/styleguide.css'), 'utf8');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bristle Style Guide</title>
<style>
${css}
</style>
</head>
<body>
<script>
${js}
</script>
</body>
</html>
`;
  mkdirSync(join(dist, 'fonts'), { recursive: true });
  writeFileSync(join(dist, 'styleguide.html'), html);
  if (existsSync(join(here, 'fonts'))) for (const f of readdirSync(join(here, 'fonts'))) if (/\.(otf|woff2?|ttf)$/.test(f)) copyFileSync(join(here, 'fonts', f), join(dist, 'fonts', f));
  return { bytes: html.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = Date.now();
  const { bytes } = await buildStyleguide({ minify: !process.argv.includes('--dev') });
  console.log(`built dist/styleguide.html (${Math.round(bytes / 1024)} KB) in ${Date.now() - t} ms`);
}
