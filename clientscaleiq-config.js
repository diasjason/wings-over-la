/* ClientScaleIQ Browser SDK bootstrap. Public siteKey only; no server secrets. */
window.ClientScaleIQ = window.ClientScaleIQ || [];
window.__CSIQ_SDK = {
  siteKey: 'sk_f575f41e0bf2160e51926ec9a30281a66c033b94f372a71b',
  connectInquiry: true,
  chat: true
};

window.ClientScaleIQ.push(['init', {
  siteKey: window.__CSIQ_SDK.siteKey,
  chat: { enabled: true }
}]);

(function connectInquiryForm() {
  function connect() {
    if (window.__CSIQ_INQUIRY_CONNECTED) return;
    if (!document.querySelector('#inquiry-form')) return;
    if (typeof window.ClientScaleIQ?.forms?.connect !== 'function') return;
    window.ClientScaleIQ.forms.connect({
      target: '#inquiry-form',
      mapping: {
        name: '#name',
        email: '#email',
        phone: '#phone',
        message: '#message',
        goal: '#goal',
        sms_service_consent: '#sms-service-consent',
        sms_marketing_consent: '#sms-marketing-consent'
      }
    });
    window.__CSIQ_INQUIRY_CONNECTED = true;
  }

  function attempt() {
    connect();
    if (window.__CSIQ_INQUIRY_CONNECTED) return;
    const loader = document.querySelector('script[src*="cdn.clientscaleiq.com"]');
    if (loader && !loader.dataset.csiqLoadHooked) {
      loader.dataset.csiqLoadHooked = '1';
      loader.addEventListener('load', connect);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attempt);
  } else {
    attempt();
  }
})();

(function hideSimulatedChat() {
  function hide() {
    if (!window.__CSIQ_SDK?.chat) return;
    ['wings-chat-launcher', 'wings-chat', 'wings-chat-teaser', 'chat-live-status'].forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = true;
      el.setAttribute('hidden', '');
      el.setAttribute('aria-hidden', 'true');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hide);
  else hide();
})();
