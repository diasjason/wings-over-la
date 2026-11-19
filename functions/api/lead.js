// Cloudflare Pages Function: POST /api/lead
// Server-only adapter. Do not put CRM credentials or webhook URLs into browser code.
const allowedGoals = new Set([
  'Help Me Choose','Private Pilot','Instrument Rating','Commercial Pilot',
  'Multi-Engine Add-On','Commercial Multi-Engine','CFI / CFII','MEI',
  'Introductory Flight','Aircraft Rental','Air Tour','Specialty Training',
  'Flight training','Air tour','Other'
]);
const disclosure = 'Text messages are optional. Message frequency varies; message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase. We never share SMS opt-in data with third parties for their marketing.';
const serviceText = 'I agree to receive service texts from Wings Over L.A. about my inquiry, flight lessons, and bookings.';
const marketingText = 'I agree to occasional promotional texts from Wings Over L.A. about news and offers.';
const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff' }
});
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max + 1) : '';
const fail = (status, code) => json(status, { ok: false, code });

export async function onRequestPost({ request, env }) {
  const origin = new URL(request.url).origin;
  if (request.headers.get('Origin') !== origin) return fail(403, 'forbidden_origin');
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return fail(415, 'json_required');
  if (Number(request.headers.get('Content-Length') || 0) > 12000) return fail(413, 'payload_too_large');
  let input;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return fail(413, 'payload_too_large');
    input = JSON.parse(raw);
  } catch { return fail(400, 'invalid_json'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail(400, 'invalid_payload');

  // Honeypot: do not forward bot-filled submissions to CRM.
  if (clean(input.website, 200)) return fail(422, 'invalid_submission');

  const formType = input.form_type === 'sms_opt_in' ? 'sms_opt_in' : input.form_type === 'contact' ? 'contact' : '';
  const name = clean(input.name, 100), email = clean(input.email, 150);
  const phone = clean(input.phone, 30), goal = clean(input.goal, 80);
  const message = clean(input.message, 2000);
  const service = input.sms_service_consent === true;
  const marketing = input.sms_marketing_consent === true;
  const mandatoryPhone = formType === 'sms_opt_in' || service || marketing;
  if (!formType || !name || name.length > 100 || !email || email.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !allowedGoals.has(goal) || message.length > 2000 ||
      phone.length > 30 || (mandatoryPhone && !phone) ||
      (phone && !/^[+()\d\s.-]{7,30}$/.test(phone))) {
    return fail(422, 'invalid_fields');
  }
  let pageUrl;
  try {
    const parsed = new URL(clean(input.page_url, 2000));
    if (parsed.origin !== origin) return fail(422, 'invalid_page');
    pageUrl = parsed.href;
  } catch { return fail(422, 'invalid_page'); }

  const webhook = env?.CSIQ_WINGS_LEAD_WEBHOOK_URL;
  const token = env?.CSIQ_WINGS_LEAD_WEBHOOK_TOKEN;
  // Explicit fail-closed behavior. Without a configured, authenticated CRM
  // endpoint, the browser shows a truthful email fallback instead of success.
  if (!webhook || !token || !/^https:\/\//i.test(webhook)) return fail(503, 'lead_service_not_configured');

  const reference = crypto.randomUUID();
  const record = {
    reference,
    source: 'Wings Over L.A. website',
    form_type: formType,
    name, email, phone, interest: goal, message,
    submitted_at: new Date().toISOString(),
    page_url: pageUrl,
    consent: {
      version: 'v2',
      sms_service_consent: service,
      sms_marketing_consent: marketing,
      service_text: serviceText,
      marketing_text: marketingText,
      disclosure_text: disclosure
    },
    // Capture consent evidence on server, not by calling external IP services in browser.
    consent_ip: request.headers.get('CF-Connecting-IP') || null,
    user_agent: (request.headers.get('User-Agent') || '').slice(0, 300)
  };
  let response;
  try {
    response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        'Idempotency-Key': reference },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(9000)
    });
  } catch (e) {
    console.error('Wings lead webhook unavailable', e?.name || 'network_error');
    return fail(502, 'lead_delivery_unavailable');
  }
  if (!response.ok) {
    console.error('Wings lead webhook rejected request', response.status);
    return fail(502, 'lead_delivery_rejected');
  }
  console.info('Wings lead accepted', reference, formType);
  return json(201, { ok: true, reference });
}
