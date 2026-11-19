/* Shared call + text icon bar (ported from home.js). No tracking. */
(() => {
  const bar = document.querySelector('#home-inquiry-bar');
  if (!bar) return;
  const root = document.body;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  function animate(element, frames, options = {}) {
    if (!element || preference.matches || typeof element.animate !== 'function') return;
    element.getAnimations().forEach(animation => animation.cancel());
    const animation = element.animate(frames, {duration:500,easing:'cubic-bezier(.2,.7,.25,1)',...options});
    animation.onfinish = () => animation.cancel();
    return animation;
  }
  function setVisible(passed) {
    if (bar.hidden === !passed) return;
    bar.hidden = !passed;
    root.classList.toggle('home-inquiry-visible', passed);
    if (passed) animate(bar, [{opacity:0},{opacity:1}], {duration:230});
  }
  // Same show/hide as the home page: hide while the hero is on screen, show after it is scrolled past.
  // Pages without a home or inner hero (contact, legal, SMS opt-in, accessibility) show the bar immediately.
  const hero = document.querySelector('#home-hero, .inner-hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const passed = entries[0].boundingClientRect.bottom <= 0;
      setVisible(passed);
    }, {threshold:0}).observe(hero);
  } else {
    setVisible(true);
  }
})();
