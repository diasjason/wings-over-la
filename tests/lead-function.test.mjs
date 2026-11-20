import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/lead.js';

// Saved evidence must match the wording actually presented by each form.
function assertVisibleConsentMatches(consent, page) {
  const html = readFileSync(new URL(`../${page}/index.html`, import.meta.url), 'utf8');
  const text = value => value.replace(/<[^>]+>/g, '').replaceAll('&amp;', '&').trim();
  const choices = [...html.matchAll(/class="consent-copy"[^>]*>(.*?)<\/span>/g)].map(match => text(match[1]));
  assert.equal(consent.version, html.match(/name="consent_version" value="([^"]+)"/)[1]);
  assert.equal(consent.service_text, choices[0]);
  assert.equal(consent.marketing_text, choices[1]);
  assert.equal(consent.disclosure_text, text(html.match(/id="sms-consent-disclosures">(.*?)<\/p>/)[1]));
  assert.equal(consent.program_text, text(html.match(/id="sms-consent-title">(.*?)<\/p>/)[1]));
}

const origin = 'https://preview.wings.example';
const base = {
  form_type: 'contact', name: 'A Test Pilot', email: 'pilot@example.com',
  phone: '+1 818 555 0134', goal: 'MEI', message: 'Interested in MEI training',
  sms_service_consent: false, sms_marketing_consent: false,
  page_url: origin + '/contact/index.html', website: ''
};
const env = {
  CSIQ_WINGS_LEAD_WEBHOOK_URL: 'https://crm.example.test/webhook',
  CSIQ_WINGS_LEAD_WEBHOOK_TOKEN: 'local-test-token'
};
const request = (data = base, originHeader = origin) => new Request(origin + '/api/lead', {
  method: 'POST',
  headers: {'Origin': originHeader, 'Content-Type': 'application/json',
    'CF-Connecting-IP': '203.0.113.25'},
  body: JSON.stringify(data)
});

test('requires an authenticated CRM configuration and never reports false success', async () => {
  const res = await onRequestPost({request: request(), env: {}});
  assert.equal(res.status, 503);
  assert.equal((await res.json()).ok, false);
});
test('rejects cross-origin submissions', async () => {
  const res = await onRequestPost({request: request(base, 'https://other.example'), env});
  assert.equal(res.status, 403);
});
test('validates required fields, consent phone, and honeypot', async () => {
  assert.equal((await onRequestPost({request: request({...base, email:'not-email'}), env})).status, 422);
  assert.equal((await onRequestPost({request: request({...base, phone:'',sms_marketing_consent:true}), env})).status, 422);
  assert.equal((await onRequestPost({request: request({...base, website:'http://spam.example'}), env})).status, 422);
});
test('forwards a contact lead with opt-in evidence and server timestamp', async () => {
  const oldFetch = globalThis.fetch;
  let delivered;
  globalThis.fetch = async (url, options) => {
    delivered = {url, options, body: JSON.parse(options.body)};
    return new Response('', {status: 201});
  };
  try {
    const res = await onRequestPost({request: request({...base, sms_service_consent:true}), env});
    assert.equal(res.status, 201);
    const result = await res.json();
    assert.equal(result.ok, true);
    assert.ok(result.reference);
    assert.equal(delivered.url, env.CSIQ_WINGS_LEAD_WEBHOOK_URL);
    assert.equal(delivered.options.headers.Authorization, 'Bearer local-test-token');
    assert.equal(delivered.body.consent.version, 'v4');
    assertVisibleConsentMatches(delivered.body.consent, 'contact');
    assert.equal(delivered.body.consent.sms_service_consent, true);
    assert.equal(delivered.body.consent.sms_marketing_consent, false);
    assert.equal(delivered.body.consent_ip, '203.0.113.25');
    assert.equal(delivered.body.form_type, 'contact');
    assert.ok(!delivered.body.consent.sms_marketing_consent);
  } finally { globalThis.fetch = oldFetch; }
});
test('forwarded webhook failures do not claim a submitted lead', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('not available', {status: 502});
  try {
    const res = await onRequestPost({request: request(), env});
    assert.equal(res.status, 502);
    assert.equal((await res.json()).ok, false);
  } finally { globalThis.fetch = oldFetch; }
});
test('SMS opt-in form can record both consent boxes unchecked', async () => {
  const oldFetch = globalThis.fetch;
  let body;
  globalThis.fetch = async (_url, opts) => {
    body = JSON.parse(opts.body);
    return new Response('', {status: 202});
  };
  try {
    const res = await onRequestPost({request: request({
      ...base, form_type:'sms_opt_in', goal:'Flight training'
    }),env});
    assert.equal(res.status, 201);
    assert.equal(body.consent.version, 'v4');
    assertVisibleConsentMatches(body.consent, 'sms-opt-in');
    assert.equal(body.consent.sms_service_consent, false);
    assert.equal(body.consent.sms_marketing_consent, false);
  } finally { globalThis.fetch = oldFetch; }
});
