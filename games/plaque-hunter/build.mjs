// Inlines styles.css and src/*.js into one HTML file.
//   node build.mjs dist/plaque-hunter.html            -> a standalone page
//   node build.mjs out.html --fragment                -> body-only page for hosts that add their own <html> shell
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || join(here, 'dist/plaque-hunter.html');
let html = readFileSync(join(here, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="styles.css">', () => '<style>\n' + readFileSync(join(here, 'styles.css'), 'utf8') + '</style>');
html = html.replace(/<script src="(src\/[^"]+)"><\/script>/g, (m, p) => '<script>\n' + readFileSync(join(here, p), 'utf8') + '</script>');
if (process.argv.includes('--fragment')) {
  html = html.replace(/<!DOCTYPE html>\s*|<\/?html[^>]*>\s*|<\/?head>\s*|<\/?body>\s*|<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*/g, '');
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log('wrote', out, Math.round(html.length / 1024) + ' KB');
