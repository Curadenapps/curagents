// Builds BRISTLE into dist/: one self-contained index.html (JS and CSS inlined) plus fonts/.
//   node build.mjs              production build
//   node build.mjs --fragment   also writes dist/fragment.html (no <html>/<head> shell, for hosts that add their own)
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');

export async function build({ minify = true } = {}) {
  const res = await esbuild.build({
    entryPoints: [join(here, 'src/main.ts')],
    bundle: true, format: 'iife', target: 'es2022', minify, sourcemap: false, write: false, legalComments: 'none',
    define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  });
  const js = res.outputFiles[0].text;
  const css = readFileSync(join(here, 'src/styles.css'), 'utf8');
  let html = readFileSync(join(here, 'index.html'), 'utf8');
  html = html.replace('<!--STYLE-->', () => '<style>\n' + css + '\n</style>').replace('<!--SCRIPT-->', () => '<script>\n' + js.replace(/<\/script/gi, '<\\/script') + '\n</script>');
  mkdirSync(join(dist, 'fonts'), { recursive: true });
  writeFileSync(join(dist, 'index.html'), html);
  if (existsSync(join(here, 'fonts'))) for (const f of readdirSync(join(here, 'fonts'))) if (/\.(otf|woff2?|ttf)$/.test(f)) copyFileSync(join(here, 'fonts', f), join(dist, 'fonts', f));
  if (process.argv.includes('--fragment')) {
    const frag = html.replace(/<!DOCTYPE html>\s*|<\/?html[^>]*>\s*|<\/?head>\s*|<\/?body>\s*|<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*/g, '');
    writeFileSync(join(dist, 'fragment.html'), frag);
  }
  return { bytes: html.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = Date.now();
  const { bytes } = await build({ minify: !process.argv.includes('--dev') });
  console.log(`built dist/index.html (${Math.round(bytes / 1024)} KB) in ${Date.now() - t} ms`);
}
