// Local play server: serves dist/ and rebuilds on change.
//   npm run dev     watch + serve on http://localhost:5460
//   npm run play    build once + serve
import http from 'node:http';
import { readFileSync, existsSync, statSync, watch } from 'node:fs';
import { dirname, join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');
const PORT = Number(process.env.PORT || 5460);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.otf': 'font/otf', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png' };


async function rebuild() { try { const t = Date.now(); await build({ minify: false }); console.log(`rebuilt in ${Date.now() - t} ms`); } catch (e) { console.error(e.message); } }
if (!process.argv.includes('--no-watch')) {
  await rebuild();
  let timer = null;
  for (const dir of ['src', 'index.html']) watch(join(here, dir), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 80); });
} else if (!existsSync(join(dist, 'index.html'))) await rebuild();

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(dist, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
}).listen(PORT, '127.0.0.1', () => console.log(`BRISTLE on http://localhost:${PORT}`));
