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
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const academyRows = document.querySelectorAll('.academy-rows > .academy-card');
  if (academyRows.length) {
    const revealRows = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('academy-row-visible');
        revealRows.unobserve(entry.target);
      }
    }, { threshold: 0.15 });
    academyRows.forEach(row => revealRows.observe(row));
  }
}
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
    consent_version: 'v1',
    page_url: location.href,
    timestamp: now,
    ip: (ipInput && ipInput.value) || '',
    sms_service_consent: form.querySelector('[name="sms_service_consent"]')?.checked ? 'yes' : 'no',
    sms_marketing_consent: form.querySelector('[name="sms_marketing_consent"]')?.checked ? 'yes' : 'no',
    service_text: form.querySelector('#sms-service-consent')?.closest('label')?.querySelector('.consent-copy')?.innerText.trim() || '',
    marketing_text: form.querySelector('#sms-marketing-consent')?.closest('label')?.querySelector('.consent-copy')?.innerText.trim() || ''
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
    `Marketing texts (offers and news): ${record.sms_marketing_consent}`,
    `Marketing consent text: ${record.marketing_text}`
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

const inquiryForm = document.querySelector('#inquiry-form');
if (inquiryForm) {
  const inquiryParams = new URLSearchParams(location.search);
  const queryGoal = inquiryParams.get('goal');
  const goalSelect = inquiryForm.querySelector('#goal');
  if (goalSelect && [...goalSelect.options].some(option => option.value === queryGoal)) goalSelect.value = queryGoal;
  const inquiryTopic = inquiryParams.get('subject')?.trim().slice(0, 160);
  const inquiryMessage = inquiryForm.querySelector('#message');
  if (inquiryTopic && inquiryMessage && !inquiryMessage.value) inquiryMessage.value = `I’d like to ask about ${inquiryTopic}.`;
  inquiryForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!inquiryForm.reportValidity()) return;
    captureConsentIp(inquiryForm).finally(() => {
      const data = new FormData(inquiryForm);
      const value = key => String(data.get(key) || '').trim();
      const smsRecord = stampSmsConsentFields(inquiryForm);
      if (inquiryForm.querySelector('[name="consent_ip"]')?.value) smsRecord.ip = inquiryForm.querySelector('[name="consent_ip"]').value;
      const subject = `Training inquiry: ${value('goal')}`;
      const body = `Hello Wings Over L.A. team,\n\nI would like to discuss ${value('goal')}.\n\nName: ${value('name')}\nEmail: ${value('email')}\nPhone: ${value('phone') || 'Not provided'}\n\nGoals and experience:\n${value('message') || 'I would like to discuss my options with the team.'}\n\nI request a response to this inquiry using the contact details above. I have reviewed the website privacy notice.\n\n${formatSmsConsentRecord(smsRecord)}\n\nThank you,\n${value('name')}`;
      const emailLink = `mailto:info@wingsoverla.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      document.querySelector('#send-email').href = emailLink;
      document.querySelector('#email-copy').value = `To: info@wingsoverla.net\nSubject: ${subject}\n\n${body}`;
      const result = document.querySelector('#email-result');
      result.hidden = false;
      result.scrollIntoView({behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center'});
      inquiryForm.querySelector('button[type="submit"]').textContent = 'Submit';
    });
  });
  document.querySelector('#copy-email')?.addEventListener('click', async () => {
    const text = document.querySelector('#email-copy');
    try { await navigator.clipboard.writeText(text.value); document.querySelector('#copy-status').textContent = 'Copied. Paste this into an email to info@wingsoverla.net and send when ready.'; }
    catch { text.focus(); text.select(); document.querySelector('#copy-status').textContent = 'Select and copy this message, then paste it into your email app.'; }
  });
}

const smsOptInForm = document.querySelector('#sms-opt-in-form');
if (smsOptInForm) {
  smsOptInForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!smsOptInForm.reportValidity()) return;
    captureConsentIp(smsOptInForm).finally(() => {
      const data = new FormData(smsOptInForm);
      const value = key => String(data.get(key) || '').trim();
      const smsRecord = stampSmsConsentFields(smsOptInForm);
      if (smsOptInForm.querySelector('[name="consent_ip"]')?.value) smsRecord.ip = smsOptInForm.querySelector('[name="consent_ip"]').value;
      const subject = `SMS opt-in: ${value('interest') || 'Wings Over L.A.'}`;
      const body = `Hello Wings Over L.A. team,\n\nSMS opt-in form submission (consent version v1).\n\nName: ${value('name')}\nEmail: ${value('email')}\nMobile phone: ${value('phone')}\nInterested in: ${value('interest')}\nMessage:\n${value('message') || '(none)'}\n\n${formatSmsConsentRecord(smsRecord)}\n\nThank you,\n${value('name')}`;
      const emailLink = `mailto:info@wingsoverla.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const send = document.querySelector('#sms-send-email');
      if (send) send.href = emailLink;
      const copy = document.querySelector('#sms-email-copy');
      if (copy) copy.value = `To: info@wingsoverla.net\nSubject: ${subject}\n\n${body}`;
      const result = document.querySelector('#sms-opt-in-result');
      if (result) {
        result.hidden = false;
        result.scrollIntoView({behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center'});
      }
    });
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

const revealSelectors = [
  'main .section-head > *',
  'main .split > *',
  'main .spotlight-grid > *',
  'main .path-tabs > button',
  'main .path-panels',
  'main .program-row',
  'main .fleet-card',
  'main .step',
  'main .experience',
  'main .flight-route > a',
  'main .faq-wrap > div:first-child',
  'main .faq-list > details',
  'main .contact-layout > div',
  'main .legal-content > h1',
  'main .legal-content > h2',
  'main .legal-content > p',
  'main .hero-copy',
  'main .hero-actions > a',
  '.cta-band .wrap > *',
  '.footer-grid > div'
].join(',');
const allRevealCandidates = [...document.querySelectorAll(revealSelectors)];
// Avoid moving both a block and a nested block at the same time.
const revealCandidates = allRevealCandidates.filter(element =>
  !allRevealCandidates.some(parent => parent !== element && parent.contains(element))
);
const revealDelays = new Map();
document.querySelectorAll('.path-tabs,.step-grid,.fleet-grid,.experiences,.flight-route,.faq-list,.footer-grid,.hero-actions').forEach(group => {
  [...group.children].forEach((element, index) => revealDelays.set(element, Math.min(index, 3) * 75));
});
let revealObserver;
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      revealObserver.unobserve(element);
      if (reducedMotion.matches || element.contains(document.activeElement)) {
        element.dataset.revealState = 'done';
        return;
      }
      element.dataset.revealState = 'running';
      const animation = animateInterface(element, [
        {opacity: 0, transform: 'translate3d(0, 22px, 0)'},
        {opacity: 1, transform: 'translate3d(0, 0, 0)'}
      ], {duration: 640, delay: revealDelays.get(element) || 0, fill: 'both'});
      if (animation) {
        const finish = animation.onfinish;
        animation.onfinish = () => {
          element.dataset.revealState = 'done';
          finish();
        };
        const cancel = animation.oncancel;
        animation.oncancel = () => {
          element.dataset.revealState = 'done';
          cancel();
        };
      } else element.dataset.revealState = 'done';
    });
  }, {threshold: 0.06, rootMargin: '0px 0px -24px 0px'});
  revealCandidates.forEach(element => {
    element.dataset.revealState = 'pending';
    revealObserver.observe(element);
  });
}
reducedMotion.addEventListener('change', () => {
  if (!reducedMotion.matches) return;
  revealObserver?.disconnect();
  [...interfaceAnimations].forEach(animation => animation.cancel());
  revealCandidates.forEach(element => { element.dataset.revealState = 'done'; });
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
function updateFloatingHeader() {
  floatingHeader?.classList.toggle('is-scrolled', window.scrollY > 40);
  headerScrollFrame = false;
}
window.addEventListener('scroll', () => {
  if (headerScrollFrame) return;
  headerScrollFrame = true;
  requestAnimationFrame(updateFloatingHeader);
}, {passive: true});
updateFloatingHeader();
// A keyboard user can focus any section without waiting for its reveal.
document.addEventListener('focusin', event => {
  revealCandidates.forEach(element => {
    if (!element.contains(event.target) || element.dataset.revealState === 'done') return;
    revealObserver?.unobserve(element);
    const animations = typeof element.getAnimations === 'function' ? element.getAnimations() : [];
    animations.forEach(animation => {
      if (interfaceAnimations.has(animation)) animation.cancel();
    });
    element.dataset.revealState = 'done';
  });
});

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

// Shared nav dropdowns (Flight Training, Our Fleet). The primary link remains a direct page link.
(() => {
  const menus = [...document.querySelectorAll('.flight-menu')].map(group => ({
    group,
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
