#!/usr/bin/env node
/**
 * PR preview regression guard for Wings Over L.A.
 * Checks that the hero, learning-path image, and complete fleet remain wired
 * to local files. This does NOT verify rudder motion or photo visual quality.
 */
import { existsSync, readFileSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const read = file => {
  const path = join(root, file);
  if (!existsSync(path)) { errors.push(`Missing ${file}`); return ''; }
  return readFileSync(path, 'utf8');
};
const requireFile = (file, minBytes = 1) => {
  const path = join(root, file);
  if (!existsSync(path)) { errors.push(`Missing ${file}`); return; }
  if (statSync(path).size < minBytes) errors.push(`Unexpectedly small ${file}`);
};
const check = (condition, description) => { if (!condition) errors.push(description); };

const home = read('index.html');
check(home.includes('assets/hero-flight.mp4'), 'Desktop hero video source missing from homepage');
check(home.includes('assets/hero-flight-mobile.mp4'), 'Mobile hero video source missing from homepage');
check(home.includes('assets/hero-flight-poster.webp'), 'Hero fallback poster missing from homepage');
check(home.includes('id="panel-career"'), 'Learn to Fly panel missing');
check(
  home.includes('assets/fleet/N6123V/travel-air-d95-interior-2.jpg'),
  'Learn to Fly D95A cockpit reference missing (do not revert to a generic photo)'
);
requireFile('assets/hero-flight-poster.webp', 1024);
requireFile('assets/fleet/N6123V/travel-air-d95-interior-2.jpg', 1024);

for (const file of ['assets/hero-flight.mp4', 'assets/hero-flight-mobile.mp4']) {
  requireFile(file, 100000);
  if (!existsSync(join(root, file))) continue;
  const fd = openSync(join(root, file), 'r');
  const header = Buffer.alloc(12);
  readSync(fd, header, 0, 12, 0);
  closeSync(fd);
  check(header.subarray(4, 8).toString('ascii') === 'ftyp', `${file} does not have an MP4 ftyp header`);
}

const aircraft = ['N417CB', 'N737QF', 'N5156J', 'N1882S', 'N430EP', 'N5332L', 'N334B', 'N6123V'];
for (const page of ['rentals/index.html', 'fleet/index.html']) {
  const content = read(page);
  for (const tail of aircraft) {
    check(content.includes(`id="fleet-${tail}"`), `${page} is missing the ${tail} fleet card`);
  }
  check(!/N8763X|C182D/.test(content), `${page} accidentally restored the retired C182D`);
  check((content.match(/Training only/g) || []).length >= 2, `${page} should mark both Travel Air twins as training-only`);
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exitCode = 1;
} else {
  console.log('PASS: hero references, local assets, D95A Learn to Fly image, and eight fleet cards are present.');
  console.log('NOTE: Verify corrected rudder direction and image orientation visually before merging.');
}
