import { readdirSync, statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const distAssets = join(process.cwd(), 'dist', 'assets');
const entry = readdirSync(distAssets)
  .filter((file) => /^index-[^/]+\.js$/.test(file))
  .sort()
  .at(-1);

if (!entry) {
  console.error('Bundle check failed: no Vite entry chunk was found.');
  process.exit(1);
}

const entryPath = join(distAssets, entry);
const rawBytes = statSync(entryPath).size;
const gzipBytes = gzipSync(readFileSync(entryPath), { level: 9 }).length;
const maxRawBytes = 1_400 * 1024;
const maxGzipBytes = 450 * 1024;

console.log(
  `Bundle ${entry}: raw=${Math.round(rawBytes / 1024)} KiB, gzip=${Math.round(gzipBytes / 1024)} KiB`,
);

if (rawBytes > maxRawBytes || gzipBytes > maxGzipBytes) {
  console.error(
    `Bundle budget exceeded: max raw=${maxRawBytes / 1024} KiB, max gzip=${maxGzipBytes / 1024} KiB`,
  );
  process.exit(1);
}
