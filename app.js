'use strict';
// Resolve preview links relative to this script, on file:// and local servers.
const previewRoot = new URL('./', document.currentScript.src);
const previewLink = path => new URL(path.replace(/^\//, '').replace(/\/(?=[?#]|$)/, '/index.html'), previewRoot).href;
const menuButton = document.querySelector('.menu-btn');
const nav = document.querySelector('#main-nav');
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && nav?.classList.contains('open')) {
    nav.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.focus();
  }
});
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false');
}));
const hero = document.querySelector('.hero');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const heroVideo = document.querySelector('#hero-video');
if (hero && heroVideo) {
  const media = heroVideo.closest('.hero-media');
  let motionDisabled = reducedMotion.matches || navigator.connection?.saveData === true;
  let heroVisible = true;
  let sourcesLoaded = false;
  function syncVideoState() {
    const paused = heroVideo.paused;
    hero.classList.toggle('paused', paused);
  }
  function loadVideo() {
    if (sourcesLoaded) return;
    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.querySelectorAll('source[data-src]').forEach(source => { source.src = source.dataset.src; });
    sourcesLoaded = true;
    heroVideo.load();
  }
  function playVideo() {
    if (motionDisabled || !heroVisible || document.hidden) return;
    loadVideo();
    heroVideo.play().catch(() => syncVideoState());
  }
  heroVideo.addEventListener('playing', () => {
    media.classList.add('video-ready');
    syncVideoState();
  });
  heroVideo.addEventListener('pause', syncVideoState);
  heroVideo.addEventListener('error', () => {
    media.classList.remove('video-ready');
  });
  reducedMotion.addEventListener('change', () => {
    motionDisabled = reducedMotion.matches || navigator.connection?.saveData === true;
    if (motionDisabled) heroVideo.pause();
    else playVideo();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) heroVideo.pause();
    else playVideo();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible) playVideo();
      else heroVideo.pause();
    }, {threshold: 0}).observe(media);
  }
  heroVideo.autoplay = !motionDisabled;
  syncVideoState();
  playVideo();
}

const privacyDialog = document.querySelector('#privacy-dialog');
const gpc = navigator.globalPrivacyControl === true;
const privacyStatus = document.querySelector('#gpc-status');
if (privacyStatus) privacyStatus.textContent = gpc
  ? 'Global Privacy Control is enabled. No advertising or analytics trackers are used.'
  : 'No advertising or analytics trackers are used.';
function dismissPrivacy() {
  if (privacyDialog?.open) privacyDialog.close();
}
document.querySelectorAll('[data-privacy]').forEach(button => button.addEventListener('click', () => privacyDialog.showModal()));
document.querySelectorAll('[data-dismiss-privacy]').forEach(button => button.addEventListener('click', dismissPrivacy));
document.querySelector('.dialog-close')?.addEventListener('click', () => privacyDialog.close());
privacyDialog?.addEventListener('click', event => {
  if (event.target !== privacyDialog) return;
  const rect = privacyDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) privacyDialog.close();
});

function stampSmsConsentFields(form) {
  const now = new Date().toISOString();
  const urlInput = form.querySelector('[name="consent_page_url"]');
  const timeInput = form.querySelector('[name="consent_timestamp"]');
  const ipInput = form.querySelector('[name="consent_ip"]');
  if (urlInput) urlInput.value = location.href;
  if (timeInput) timeInput.value = now;
  const record = {
    consent_version: form.querySelector('[name="consent_version"]')?.value || 'v4',
    page_url: location.href,
    timestamp: now,
    ip: (ipInput && ipInput.value) || '',
    sms_service_consent: form.querySelector('[name="sms_service_consent"]')?.checked ? 'yes' : 'no',
    sms_marketing_consent: form.querySelector('[name="sms_marketing_consent"]')?.checked ? 'yes' : 'no',
    disclosure_text: form.querySelector('#sms-consent-disclosures')?.innerText.trim() || '',
    service_text: form.querySelector('#sms-service-consent')?.closest('label')?.querySelector('.consent-copy')?.innerText.trim() || '',
    marketing_text: form.querySelector('#sms-marketing-consent')?.closest('label')?.querySelector('.consent-copy')?.innerText.trim() || '',
    program_text: form.querySelector('#sms-consent-title')?.innerText.trim() || ''
  };
  return record;
}

function formatSmsConsentRecord(record) {
  return [
    `SMS consent version: ${record.consent_version}`,
    `Page URL: ${record.page_url}`,
    `Timestamp: ${record.timestamp}`,
    `IP: ${record.ip || 'not captured in browser (needs server)'}`,
    `Service texts (customer care, booking, reminders): ${record.sms_service_consent}`,
    `Service consent text: ${record.service_text}`,
    `Shared opt-in disclosure: ${record.disclosure_text}`,
    `Marketing texts (offers and news): ${record.sms_marketing_consent}`,
    `Marketing consent text: ${record.marketing_text}`,
    `Text program: ${record.program_text}`
  ].join('\n');
}

function captureConsentIp(form) {
  const ipInput = form.querySelector('[name="consent_ip"]');
  if (!ipInput) return Promise.resolve('');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  return fetch('https://www.cloudflare.com/cdn-cgi/trace', {signal: controller.signal})
    .then(r => r.text())
    .then(text => {
      const match = text.match(/^ip=(.*)$/m);
      const ip = match ? match[1].trim() : '';
      ipInput.value = ip;
      return ip;
    })
    .catch(() => '')
    .finally(() => clearTimeout(timer));
}

// Post through the same-origin Cloudflare Pages Function. Any unavailable or
// unconfigured backend falls back to a clearly labeled email draft; it never
// displays a false "sent" success state.
async function submitLeadToBackend(form, formType, goal) {
  const data = new FormData(form);
  const value = key => String(data.get(key) || '').trim();
  const payload = {
    form_type: formType,
    name: value('name'),
    email: value('email'),
    phone: value('phone'),
    goal,
    message: value('message'),
    sms_service_consent: data.has('sms_service_consent'),
    sms_marketing_consent: data.has('sms_marketing_consent'),
    page_url: location.href,
    website: value('website')
  };
  try {
    const response = await fetch(previewLink('/api/lead'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'same-origin',
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return null;
    const result = await response.json();
    return result.ok && typeof result.reference === 'string' ? result.reference : null;
  } catch {
    return null;
  }
}
function showLeadReceived(reference, resultId) {
  const result = document.getElementById(resultId);
  if (!result) return;
  const ref = result.querySelector('[data-lead-reference]');
  if (ref) ref.textContent = reference;
  result.hidden = false;
  result.scrollIntoView({behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center'});
}
function setSubmitBusy(form, busy) {
  const submit = form.querySelector('button[type="submit"]');
  if (submit) {
    submit.disabled = busy;
    submit.textContent = busy ? 'Submitting…' : 'Submit';
    submit.setAttribute('aria-busy', String(busy));
  }
}

const inquiryForm = document.querySelector('#inquiry-form');
if (inquiryForm) {
  const inquiryParams = new URLSearchParams(location.search);
  const queryGoal = inquiryParams.get('goal');
  const goalSelect = inquiryForm.querySelector('#goal');
  if (goalSelect && [...goalSelect.options].some(option => option.value === queryGoal)) goalSelect.value = queryGoal;
  const inquiryTopic = inquiryParams.get('subject')?.trim().slice(0, 160);
  const inquiryMessage = inquiryForm.querySelector('#message');
  if (inquiryTopic && inquiryMessage && !inquiryMessage.value) inquiryMessage.value = `I’d like to ask about ${inquiryTopic}.`;
  inquiryForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!inquiryForm.reportValidity()) return;
    setSubmitBusy(inquiryForm, true);
    const data = new FormData(inquiryForm);
    const value = key => String(data.get(key) || '').trim();
    const reference = await submitLeadToBackend(inquiryForm, 'contact', value('goal'));
    setSubmitBusy(inquiryForm, false);
    if (reference) {
      document.querySelector('#email-result').hidden = true;
      showLeadReceived(reference, 'lead-result');
      inquiryForm.querySelector('button[type="submit"]').disabled = true;
      return;
    }

    // Fallback: prepare a draft but do not pretend that it was delivered.
    const subject = `Training inquiry: ${value('goal')}`;
    const body = `Hello Wings Over L.A. team,

I would like to discuss ${value('goal')}.

Name: ${value('name')}
Email: ${value('email')}
Phone: ${value('phone') || 'Not provided'}

Goals and experience:
${value('message') || 'I would like to discuss my options with the team.'}

I request an email or phone response to this inquiry using the contact details above.

Thank you,
${value('name')}`;
    document.querySelector('#send-email').href = `mailto:info@wingsoverla.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.querySelector('#email-copy').value = `To: info@wingsoverla.net
Subject: ${subject}

${body}`;
    const result = document.querySelector('#email-result');
    result.hidden = false;
    result.scrollIntoView({behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center'});
  });
  document.querySelector('#copy-email')?.addEventListener('click', async () => {
    const text = document.querySelector('#email-copy');
    try { await navigator.clipboard.writeText(text.value); document.querySelector('#copy-status').textContent = 'Copied. Paste this into an email to info@wingsoverla.net and send when ready.'; }
    catch { text.focus(); text.select(); document.querySelector('#copy-status').textContent = 'Select and copy this message, then paste it into your email app.'; }
  });
}

const smsOptInForm = document.querySelector('#sms-opt-in-form');
if (smsOptInForm) {
  smsOptInForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!smsOptInForm.reportValidity()) return;
    setSubmitBusy(smsOptInForm, true);
    const data = new FormData(smsOptInForm);
    const value = key => String(data.get(key) || '').trim();
    const reference = await submitLeadToBackend(smsOptInForm, 'sms_opt_in', value('interest'));
    setSubmitBusy(smsOptInForm, false);
    if (reference) {
      document.querySelector('#sms-opt-in-result').hidden = true;
      showLeadReceived(reference, 'sms-lead-result');
      smsOptInForm.querySelector('button[type="submit"]').disabled = true;
      return;
    }
    await captureConsentIp(smsOptInForm);
    const smsRecord = stampSmsConsentFields(smsOptInForm);
    const subject = `SMS opt-in: ${value('interest') || 'Wings Over L.A.'}`;
    const body = `Hello Wings Over L.A. team,

SMS opt-in form submission (consent version v4).

Name: ${value('name')}
Email: ${value('email')}
Mobile phone: ${value('phone')}
Interested in: ${value('interest')}
Message:
${value('message') || '(none)'}

${formatSmsConsentRecord(smsRecord)}

Thank you,
${value('name')}`;
    const send = document.querySelector('#sms-send-email');
    if (send) send.href = `mailto:info@wingsoverla.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const copy = document.querySelector('#sms-email-copy');
    if (copy) copy.value = `To: info@wingsoverla.net
Subject: ${subject}

${body}`;
    const result = document.querySelector('#sms-opt-in-result');
    if (result) {
      result.hidden = false;
      result.scrollIntoView({behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center'});
    }
  });
  document.querySelector('#sms-copy-email')?.addEventListener('click', async () => {
    const text = document.querySelector('#sms-email-copy');
    try { await navigator.clipboard.writeText(text.value); document.querySelector('#sms-copy-status').textContent = 'Copied. Paste this into an email to info@wingsoverla.net and send when ready.'; }
    catch { text.focus(); text.select(); document.querySelector('#sms-copy-status').textContent = 'Select and copy this record, then paste it into your email app.'; }
  });
}

// Training path selector: mouse, touch, and keyboard tabs.
const pathTabs = [...document.querySelectorAll('.path-tabs [role="tab"][aria-controls]')];
function activatePath(tab, focus = false) {
  pathTabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(item.getAttribute('aria-controls'));
    if (panel) {
      panel.hidden = !selected;
      if (selected) animateInterface(panel, [
        {opacity: 0, transform: 'translateY(10px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: 300});
    }
  });
  if (focus) tab.focus();
}
pathTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activatePath(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % pathTabs.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + pathTabs.length) % pathTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = pathTabs.length - 1;
    if (next !== undefined) { event.preventDefault(); activatePath(pathTabs[next], true); }
  });
});

// Pre-launch AI simulation: only these three preset questions; no SDK or network calls.
const chatLauncher = document.querySelector('#wings-chat-launcher');
const chatPanel = document.querySelector('#wings-chat');
const chatClose = document.querySelector('#wings-chat-close');
const chatLog = document.querySelector('#wings-chat-log');
const quickQuestions = [...document.querySelectorAll('[data-chat-question]')];
const quickAnswers = {
  start: {
    answer: 'An introductory flight is a good first step. You can experience the cockpit, meet the team, and discuss what learning to fly involves. From there, ask about a Private Pilot training plan that fits your goals and schedule. The school confirms flight details, prices, and available dates directly.',
    links: [['Explore introductory flights', previewLink('/experiences/#intro')], ['Ask about your first flight', previewLink('/contact/?goal=Introductory+Flight')]]
  },
  multi: {
    answer: 'Yes. Explore multi-engine add-on, Commercial multi-engine, and Multi-Engine Instructor (MEI) training at Van Nuys. Tell the team your current certificates and ratings, approximate total and multi-engine flight time, and your next goal. An instructor will review eligibility and a suitable training plan with you.',
    links: [['Explore Multi-Engine & MEI', previewLink('/multi-engine-mei/')], ['Request an MEI consultation', previewLink('/contact/?goal=MEI')]]
  },
  cost: {
    answer: 'Training costs and start dates depend on your existing experience, preparation, proficiency, schedule, and aircraft and instructor availability. The team can discuss a current estimate and available dates. This chat cannot confirm a booking, a fixed completion time, or a checkride result. Call (818) 922-2449, or send the team your goals.',
    links: [['Request a training estimate', previewLink('/contact/')], ['Call (818) 922-2449', 'tel:+18189222449']]
  }
};
const chatTeaser = document.querySelector('#wings-chat-teaser');
const chatLiveStatus = document.querySelector('#chat-live-status');
const chatPromptAllowed = !['/privacy/index.html', '/terms/index.html', '/accessibility/index.html'].some(path => location.pathname.endsWith(path));
// Start a fresh delay after this document finishes loading, including on reload.
// Keep dismissal in page memory so earlier visits cannot suppress this greeting.
let chatPromptState = {startedAt: null, handled: false};
let chatPeekTimer;
function stopChatPromptTimers() {
  clearTimeout(chatPeekTimer);
}
function markChatPromptHandled() {
  chatPromptState.handled = true;
  stopChatPromptTimers();
  if (chatTeaser) chatTeaser.hidden = true;
  if (chatLiveStatus) chatLiveStatus.textContent = '';
}
function chatWouldInterrupt() {
  return document.hidden || privacyDialog?.open || nav?.classList.contains('open') ||
    !!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
}
function showChatPeek() {
  if (!chatPromptAllowed || !chatPanel?.hidden || !chatTeaser?.hidden || chatPromptState.handled || chatWouldInterrupt()) return;
  chatTeaser.hidden = false;
  if (chatLiveStatus) chatLiveStatus.textContent = 'Have a question? Ask our AI assistant. This preview offers three sample answers.';
  animateInterface(chatTeaser, [
    {opacity: 0, transform: 'translateY(9px) scale(.98)'},
    {opacity: 1, transform: 'translateY(0) scale(1)'}
  ], {duration: 260});
}
function scheduleChatPrompt() {
  stopChatPromptTimers();
  if (!chatPromptAllowed || chatPromptState.startedAt === null || chatPromptState.handled || !chatPanel?.hidden || document.hidden) return;
  const elapsed = Date.now() - chatPromptState.startedAt;
  if (elapsed >= 10000) showChatPeek();
  else chatPeekTimer = setTimeout(showChatPeek, 10000 - elapsed);
}
function setChatOpen(open) {
  if (!chatPanel || !chatLauncher) return;
  markChatPromptHandled();
  chatPanel.hidden = !open;
  chatLauncher.setAttribute('aria-expanded', String(open));
  chatLauncher.setAttribute('aria-label', open ? 'Close Wings AI Assistant' : 'Open Wings AI Assistant');
  document.body.classList.toggle('chat-open', open);
  if (open) {
    if (chatLiveStatus) chatLiveStatus.textContent = '';
    chatClose.focus();
    animateInterface(chatPanel, [
      {opacity: 0, transform: 'translateY(16px) scale(.985)'},
      {opacity: 1, transform: 'translateY(0) scale(1)'}
    ], {duration: 240});
  } else {
    if (chatLiveStatus) chatLiveStatus.textContent = '';
    chatLauncher.focus();
  }
}
chatLauncher?.addEventListener('click', () => setChatOpen(chatPanel.hidden));
chatClose?.addEventListener('click', () => setChatOpen(false));
document.querySelector('#chat-teaser-open')?.addEventListener('click', () => setChatOpen(true));
document.querySelector('#chat-teaser-dismiss')?.addEventListener('click', () => {
  markChatPromptHandled();
  chatLauncher.focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && chatPanel && !chatPanel.hidden) {
    setChatOpen(false);
    event.preventDefault();
  }
});
document.addEventListener('visibilitychange', scheduleChatPrompt);
document.addEventListener('focusout', () => setTimeout(scheduleChatPrompt, 0));
privacyDialog?.addEventListener('close', scheduleChatPrompt);
menuButton?.addEventListener('click', () => setTimeout(scheduleChatPrompt, 0));
function startChatPromptDelay() {
  chatPromptState.startedAt = Date.now();
  scheduleChatPrompt();
}
if (document.readyState === 'complete') startChatPromptDelay();
else window.addEventListener('load', startChatPromptDelay, {once: true});

function appendChatMessage(author, content, links = []) {
  const bubble = document.createElement('div');
  bubble.className = `chat-message ${author === 'You' ? 'visitor-message' : 'assistant-message'}`;
  const label = document.createElement('span');
  label.className = 'chat-author'; label.textContent = author === 'You' ? 'YOU' : 'WINGS AI ASSISTANT';
  const paragraph = document.createElement('p'); paragraph.textContent = content;
  bubble.append(label, paragraph);
  if (links.length) {
    const actions = document.createElement('div'); actions.className = 'chat-response-links';
    links.forEach(([text, href]) => {
      const link = document.createElement('a'); link.textContent = text; link.href = href; actions.append(link);
    });
    bubble.append(actions);
  }
  chatLog.append(bubble);
  animateInterface(bubble, [
    {opacity: 0, transform: 'translateY(7px)'},
    {opacity: 1, transform: 'translateY(0)'}
  ], {duration: 220});
  return bubble;
}
// Replace this response adapter with the production SDK integration at launch.
// Until then, sample replies stay local and accept no free-text input.
function getPreviewChatResponse(questionKey) {
  return new Promise(resolve => {
    setTimeout(() => resolve(quickAnswers[questionKey]), reducedMotion.matches ? 0 : 700);
  });
}
let previewReplyPending = false;
quickQuestions.forEach(button => {
  button.addEventListener('click', async () => {
    const key = button.dataset.chatQuestion;
    if (previewReplyPending || !quickAnswers[key]) return;
    previewReplyPending = true;
    quickQuestions.forEach(question => {
      question.classList.toggle('last-asked', question === button);
      question.setAttribute('aria-disabled', 'true');
    });
    appendChatMessage('You', button.textContent.trim());
    const pending = appendChatMessage('Wings AI Assistant', 'Preparing a sample reply…');
    pending.classList.add('chat-preview-typing');
    const scroller = document.querySelector('#wings-chat-scroll');
    const revealReply = element => scroller.scrollTo({
      top: Math.max(0, element.offsetTop - scroller.offsetTop - 16),
      behavior: reducedMotion.matches ? 'auto' : 'smooth'
    });
    revealReply(pending);
    try {
      const entry = await getPreviewChatResponse(key);
      pending.remove();
      const response = appendChatMessage('Wings AI Assistant', entry.answer, entry.links);
      revealReply(response);
    } finally {
      pending.remove();
      previewReplyPending = false;
      quickQuestions.forEach(question => question.removeAttribute('aria-disabled'));
    }
  });
});

// Progressive motion: content is visible by default and reveals only once.
const interfaceAnimations = new Set();
function animateInterface(element, keyframes, options = {}) {
  if (!element || reducedMotion.matches || typeof element.animate !== 'function') return null;
  const animation = element.animate(keyframes, {
    duration: 320,
    easing: 'cubic-bezier(.2,.7,.25,1)',
    ...options
  });
  interfaceAnimations.add(animation);
  const finish = () => {
    interfaceAnimations.delete(animation);
    animation.cancel(); // Release the transform so hover and focus styles keep working.
  };
  animation.onfinish = finish;
  animation.oncancel = () => interfaceAnimations.delete(animation);
  return animation;
}

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) [...interfaceAnimations].forEach(animation => animation.cancel());
});

document.querySelectorAll('.faq-list details').forEach(details => {
  details.addEventListener('toggle', () => {
    if (details.open) animateInterface(details.querySelector('p'), [
      {opacity: 0, transform: 'translateY(5px)'},
      {opacity: 1, transform: 'translateY(0)'}
    ], {duration: 240});
  });
});

let headerScrollFrame = false;
const floatingHeader = document.querySelector('.header');
const headerActions = floatingHeader?.querySelector('.header-actions');
let headerDirectionAnchor = window.scrollY;
function updateFloatingHeader() {
  const scrollPosition = Math.max(0, window.scrollY);
  floatingHeader?.classList.toggle('is-scrolled', scrollPosition > 40);
  const navigationInUse = headerActions?.contains(document.activeElement) ||
    menuButton?.getAttribute('aria-expanded') === 'true' ||
    !!headerActions?.querySelector('.flight-toggle[aria-expanded="true"]');
  if (scrollPosition <= 80 || navigationInUse) {
    floatingHeader?.classList.remove('is-nav-hidden');
    headerDirectionAnchor = scrollPosition;
  } else if (Math.abs(scrollPosition - headerDirectionAnchor) >= 8) {
    floatingHeader?.classList.toggle('is-nav-hidden', scrollPosition > headerDirectionAnchor && scrollPosition > 160);
    headerDirectionAnchor = scrollPosition;
  }
  headerScrollFrame = false;
}
headerActions?.addEventListener('focusin', () => floatingHeader?.classList.remove('is-nav-hidden'));
window.addEventListener('scroll', () => {
  if (headerScrollFrame) return;
  headerScrollFrame = true;
  requestAnimationFrame(updateFloatingHeader);
}, {passive: true});
updateFloatingHeader();
// Career milestones advance every three seconds while visible.
const careerSection = document.querySelector('.career-section');
if (careerSection) {
  const tabs = [...careerSection.querySelectorAll('.career-tab')];
  const panels = [...careerSection.querySelectorAll('.career-panel')];
  const tabList = careerSection.querySelector('.career-tabs');
  const stage = careerSection.querySelector('.career-stage');
  let active = 0;
  let inView = false;
  let hovered = false;
  let touched = false;
  let keyboardFocus = false;
  let timer;
  let progress;
  let entrance;
  const period = 3000;

  function stopTour() {
    clearTimeout(timer);
    progress?.cancel();
    progress = null;
  }
  function syncTour() {
    stopTour();
    const reading = hovered || touched || keyboardFocus;
    careerSection.dataset.tourState = reducedMotion.matches || reading ? 'paused'
      : !inView || document.hidden ? 'waiting' : 'playing';
    if (reading || !inView || document.hidden || reducedMotion.matches) return;
    const bar = tabs[active].querySelector('.career-progress i');
    if (typeof bar.animate === 'function') progress = bar.animate([
      {transform:'scaleX(0)'}, {transform:'scaleX(1)'}
    ], {duration:period,easing:'linear',fill:'forwards'});
    timer = setTimeout(() => activateMilestone((active + 1) % tabs.length), period);
  }
  function centerMilestone(tab) {
    if (tabList.scrollWidth <= tabList.clientWidth) return;
    const left = tab.offsetLeft - tabList.offsetLeft - (tabList.clientWidth - tab.offsetWidth) / 2;
    tabList.scrollTo({left:Math.max(0,left),behavior:reducedMotion.matches ? 'auto' : 'smooth'});
  }
  function activateMilestone(index, focus = false) {
    const changed = active !== index;
    active = index;
    tabs.forEach((tab,i) => {
      tab.setAttribute('aria-selected',String(i === active));
      tab.tabIndex = i === active ? 0 : -1;
      panels[i].hidden = i !== active;
    });
    if (changed) {
      entrance?.cancel();
      entrance = animateInterface(panels[active],[
        {opacity:0,transform:'translateY(9px)'},
        {opacity:1,transform:'translateY(0)'}
      ],{duration:380});
    }
    centerMilestone(tabs[active]);
    if (focus) tabs[active].focus({preventScroll:true});
    syncTour();
  }
  tabs.forEach((tab,index) => {
    tab.addEventListener('click',() => activateMilestone(index));
    tab.addEventListener('keydown',event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); keyboardFocus = true; activateMilestone(next,true); }
    });
  });
  careerSection.addEventListener('focusin',event => {
    keyboardFocus = event.target.matches(':focus-visible');
    syncTour();
  });
  careerSection.addEventListener('focusout',() => setTimeout(() => {
    keyboardFocus = careerSection.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    syncTour();
  },0));
  stage.addEventListener('pointerenter',event => {
    if (event.pointerType !== 'mouse') return;
    hovered = true;
    syncTour();
  });
  stage.addEventListener('pointerleave',() => { hovered = false; touched = false; syncTour(); });
  stage.addEventListener('pointerdown',event => {
    if (event.pointerType === 'touch') touched = true;
    keyboardFocus = false;
    syncTour();
  });
  ['pointerup','pointercancel'].forEach(type => stage.addEventListener(type,() => { touched = false; syncTour(); }));
  reducedMotion.addEventListener('change',syncTour);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncTour();
    },{threshold:.2}).observe(stage);
  }
  document.addEventListener('visibilitychange',syncTour);
  syncTour();
}

// Shared dropdowns: one combined desktop button; retain the mobile direct link and toggle.
(() => {
  const menus = [...document.querySelectorAll('.flight-menu')].map(group => ({
    group,
    primaryLink: group.querySelector('.flight-main > a'),
    toggle: group.querySelector('.flight-toggle'),
    submenu: group.querySelector('.flight-submenu')
  })).filter(menu => menu.toggle && menu.submenu);
  if (!menus.length) return;
  const close = (menu, restoreFocus = false) => {
    menu.toggle.setAttribute('aria-expanded', 'false');
    menu.submenu.hidden = true;
    if (restoreFocus) menu.toggle.focus();
  };
  const closeAll = (except) => {
    menus.forEach(menu => { if (menu !== except) close(menu); });
  };
  const desktopNavigation = window.matchMedia('(min-width: 1181px)');
  menus.forEach(menu => {
    if (!menu.primaryLink) return;
    const label = document.createElement('span');
    label.className = 'flight-toggle-label';
    label.textContent = menu.primaryLink.textContent.trim();
    menu.toggle.prepend(label);
    menu.toggle.classList.toggle('active', menu.primaryLink.classList.contains('active'));
    const overview = menu.primaryLink.cloneNode(true);
    overview.className = 'flight-overview-link';
    overview.textContent = label.textContent === 'Our Fleet' ? 'Aircraft Rentals' : 'All Flight Training';
    menu.submenu.prepend(overview);
    const mobileLabel = menu.toggle.getAttribute('aria-label');
    const syncNavigation = () => {
      menu.toggle.setAttribute('aria-label', desktopNavigation.matches ? label.textContent : mobileLabel);
      close(menu);
    };
    desktopNavigation.addEventListener('change', syncNavigation);
    syncNavigation();
  });
  menus.forEach(menu => {
    menu.toggle.addEventListener('click', () => {
      const open = menu.toggle.getAttribute('aria-expanded') !== 'true';
      closeAll(menu);
      menu.toggle.setAttribute('aria-expanded', String(open));
      menu.submenu.hidden = !open;
    });
  });
  document.addEventListener('click', event => {
    if (!menus.some(menu => menu.group.contains(event.target))) {
      menus.forEach(menu => close(menu));
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openMenu = menus.find(menu => !menu.submenu.hidden);
    if (openMenu) close(openMenu, true);
  });
})();

// Site controls and team profiles.
const bioDialog = document.querySelector('.bio-dialog');
let bioTrigger;
document.querySelectorAll('.bio-trigger').forEach(button => button.addEventListener('click', () => {
  const card = button.closest('.team-card');
  bioTrigger = button;
  const photo = card.querySelector('img');
  bioDialog.querySelector('#bio-title').textContent = card.querySelector('h3').textContent;
  bioDialog.querySelector('#bio-role').textContent = card.querySelector('.academy-card-copy > p').textContent;
  const dialogPhoto = bioDialog.querySelector('.bio-photo');
  dialogPhoto.src = photo.src;
  dialogPhoto.alt = photo.alt;
  bioDialog.querySelector('.bio-text').replaceChildren(card.querySelector('.bio-template').content.cloneNode(true));
  bioDialog.showModal();
}));
bioDialog?.querySelector('.bio-close')?.addEventListener('click', () => bioDialog.close());
bioDialog?.addEventListener('close', () => bioTrigger?.focus());
const backToTop = document.createElement('button');
backToTop.type = 'button';
backToTop.className = 'back-to-top';
backToTop.setAttribute('aria-label', 'Back to Top');
backToTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
backToTop.hidden = true;
document.body.append(backToTop);
const updateBackToTop = () => {
  backToTop.hidden = window.scrollY < 500;
  const launcher = document.querySelector('#wings-chat-launcher');
  if (!launcher) return;
  const rect = launcher.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  backToTop.style.setProperty('--back-to-top-right', `${window.innerWidth - rect.left + 14}px`);
  backToTop.style.setProperty('--back-to-top-bottom', `${window.innerHeight - rect.bottom + (rect.height - 46) / 2}px`);
};
window.addEventListener('resize', updateBackToTop, { passive: true });
new MutationObserver(updateBackToTop).observe(document.body, { attributes: true, attributeFilter: ['class'] });
if (window.ResizeObserver && document.querySelector('#wings-chat-launcher')) {
  new ResizeObserver(updateBackToTop).observe(document.querySelector('#wings-chat-launcher'));
}
window.addEventListener('scroll', updateBackToTop, { passive: true });
updateBackToTop();
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
