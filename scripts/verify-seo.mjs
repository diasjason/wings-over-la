import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const origin = 'https://www.wingsoverla.net';
const pages = ["index.html","about/index.html","accessibility/index.html","air-tours/index.html","contact/index.html","experiences/index.html","fleet/index.html","flight-training/index.html","multi-engine-mei/index.html","privacy/index.html","professional-pilot/index.html","rentals/index.html","sms-opt-in/index.html","terms/index.html"];
const routes = ["/","/about/","/air-tours/","/contact/","/experiences/","/fleet/","/flight-training/","/multi-engine-mei/","/professional-pilot/","/rentals/"];
const expectedRedirects = [["/index","/"],["/index/","/"],["/index/flight-training","/flight-training/"],["/index/flight-training/","/flight-training/"],["/rentals/airplane-rentals","/rentals/"],["/rentals/airplane-rentals/","/rentals/"]];
const attr = (tag, key) => tag.match(new RegExp('\\b' + key + '\\s*=\\s*(["\u0027])(.*?)\\1', 'i'))?.[2];
for (const p of pages) {
  const html = read(p);
  const route = p === 'index.html' ? '/' : '/' + p.replace(/index\.html$/, '');
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
  const canonical = links.filter(t => attr(t, 'rel') === 'canonical');
  assert.equal(canonical.length, 1, p + ': one canonical');
  assert.equal(attr(canonical[0], 'href'), origin + route, p + ': canonical');
  assert.ok(!metas.some(t => attr(t, 'name')?.toLowerCase() === 'robots' && /\bnoindex\b/i.test(attr(t, 'content') || '')), p + ': production noindex');
  assert.ok(!/https:\/\/(?:www\.)?wingsoverla\.com\b/i.test(html), p + ': old domain URL');
  assert.ok(metas.some(t => attr(t, 'property') === 'og:url' && attr(t, 'content') === origin + route), p + ': og:url');
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) JSON.parse(m[1]);
}
const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.deepEqual(locs.sort(), routes.map(r => origin + r).sort());
for (const route of routes) assert.ok(existsSync(new URL(route.slice(1) + 'index.html', root)), route + ': missing file');
assert.ok(read('robots.txt').includes('Sitemap: ' + origin + '/sitemap.xml'));
assert.ok(!/^Disallow:\s*\/\s*$/im.test(read('robots.txt')));
const rules = read('_redirects').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')).map(s => s.split(/\s+/));
assert.deepEqual(rules, expectedRedirects.map(([from,to]) => [from,to,'301']));
for (const [from,to] of expectedRedirects) {
  assert.notEqual(from,to);
  assert.ok(routes.includes(to), to + ': not a canonical route');
  assert.ok(!expectedRedirects.some(([src]) => src === to), to + ': redirect chain');
}
assert.ok(read('_headers').includes('https://wings-over-la.pages.dev/*\n  X-Robots-Tag: noindex'));
console.log('PASS: 14 HTML pages, canonical/OG URLs, indexing, JSON-LD, sitemap, robots and core redirects. Live HTTP checks still required.');
