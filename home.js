/* Homepage presentation only. No tracking, booking or SDK calls. */
(() => {
  const root = document.querySelector('body.home-page');
  if (!root) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Give the primary MEI calls to action a gentle sweep after the first five seconds.
  function startMeiAttention() {
    setTimeout(() => root.classList.add('mei-attention-ready'), 5000);
  }
  if (document.readyState === 'complete') startMeiAttention();
  else window.addEventListener('load', startMeiAttention, {once: true});
  const animations = new Set();
  function animate(element, frames, options = {}) {
    if (!element || preference.matches || typeof element.animate !== 'function') return;
    element.getAnimations().forEach(animation => animation.cancel());
    const animation = element.animate(frames, {duration:500,easing:'cubic-bezier(.2,.7,.25,1)',...options});
    animations.add(animation);
    animation.onfinish = () => { animations.delete(animation); animation.cancel(); };
    animation.oncancel = () => animations.delete(animation);
    return animation;
  }
  function enter(element, delay = 0) {
    return animate(element,[{opacity:0,transform:'translateY(13px)'},{opacity:1,transform:'translateY(0)'}],{duration:500,delay,fill:'both'});
  }
  requestAnimationFrame(() => {
    const copy = root.querySelector('.hero-copy');
    [...copy.children].forEach((element,index) => enter(element,Math.min(index,5)*55));
  });

  if ('IntersectionObserver' in window) {
    const entrances = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entrances.unobserve(entry.target);
        const element = entry.target;
        element.getAnimations().forEach(animation => animation.cancel());
        if (element.classList.contains('aircraft-composition')) {
          animate(element.querySelector('.main-aircraft'),[
            {clipPath:'inset(18% 0 0 0 round 16px)',opacity:0},
            {clipPath:'inset(0 0 0 0 round 16px)',opacity:1}
          ],{duration:700});
          enter(element.querySelector('.cockpit-inset'),140);
          enter(element.querySelector('.aircraft-caption'),200);
        } else [...element.children].forEach((child,index) => enter(child,index*85));
        element.dataset.homeReveal = 'done';
      });
    },{threshold:.12,rootMargin:'0px 0px -20px 0px'});
    root.querySelectorAll('.home-proof .wrap,.aircraft-composition,.home-closing-actions').forEach(element => entrances.observe(element));
  }
  function revealDetails(panel, photoSelector, detailSelector) {
    if (!panel || preference.matches) return;
    panel.getAnimations().forEach(animation => animation.cancel());
    animate(panel.querySelector(photoSelector),[
      {opacity:.3,transform:'scale(1.035)'},{opacity:1,transform:'scale(1)'}
    ],{duration:650});
    panel.querySelectorAll(detailSelector).forEach((element,index) => enter(element,Math.min(index,4)*45));
  }
  let lastPath = root.querySelector('.path-panel:not([hidden])')?.id;
  function syncPath() {
    const panel = root.querySelector('.path-panel:not([hidden])');
    if (!panel || panel.id === lastPath) return;
    lastPath = panel.id;
    revealDetails(panel,'.path-photo>img','.path-detail>*');
  }
  // Training paths follow the same three-second rhythm as career milestones.
  const pathSection = root.querySelector('.path-section');
  const pathStage = pathSection.querySelector('.path-panels');
  const trainingTabs = [...pathSection.querySelectorAll('.path-tabs [role="tab"]')];
  let pathTimer;
  let pathInView = false;
  let pathHovered = false;
  let pathTouched = false;
  function syncPathTour() {
    clearTimeout(pathTimer);
    const focused = pathSection.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    const reading = pathHovered || pathTouched || focused;
    pathSection.dataset.tourState = preference.matches || reading ? 'paused'
      : !pathInView || document.hidden ? 'waiting' : 'playing';
    if (reading || !pathInView || document.hidden || preference.matches) return;
    pathTimer = setTimeout(() => {
      const active = trainingTabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
      activatePath(trainingTabs[(active + 1) % trainingTabs.length]);
    },3000);
  }
  const pathSelection = new MutationObserver(() => { syncPath(); syncPathTour(); });
  trainingTabs.forEach(tab => pathSelection.observe(tab,{attributes:true,attributeFilter:['aria-selected']}));
  pathSection.querySelector('.path-tabs').addEventListener('click',syncPathTour);
  pathSection.querySelector('.path-tabs').addEventListener('keydown',syncPathTour);
  pathSection.addEventListener('focusin',syncPathTour);
  pathSection.addEventListener('focusout',() => setTimeout(syncPathTour,0));
  pathStage.addEventListener('pointerenter',event => {
    if (event.pointerType !== 'mouse') return;
    pathHovered = true;
    syncPathTour();
  });
  pathStage.addEventListener('pointerleave',() => { pathHovered = false; pathTouched = false; syncPathTour(); });
  pathStage.addEventListener('pointerdown',event => {
    if (event.pointerType === 'touch') pathTouched = true;
    syncPathTour();
  });
  ['pointerup','pointercancel'].forEach(type => pathStage.addEventListener(type,() => { pathTouched = false; syncPathTour(); }));
  preference.addEventListener('change',syncPathTour);
  document.addEventListener('visibilitychange',syncPathTour);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      pathInView = entries[0].isIntersecting;
      syncPathTour();
    },{threshold:.2}).observe(pathStage);
  }
  syncPathTour();

  // Measure the tallest responsive panel so auto changes do not move later sections.
  let sizingFrame;
  function sizeMobilePanels() {
    cancelAnimationFrame(sizingFrame);
    sizingFrame = requestAnimationFrame(() => {
      root.querySelectorAll('.path-panels,.career-stage').forEach(stage => {
        stage.style.minHeight = '';
        if (innerWidth > 820) return;
        const measure = stage.cloneNode(true);
        measure.removeAttribute('id');
        measure.setAttribute('aria-hidden','true');
        measure.inert = true;
        measure.style.cssText = `position:absolute;left:-10000px;top:0;width:${stage.getBoundingClientRect().width}px;min-height:0;height:auto;visibility:hidden;pointer-events:none`;
        measure.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
        const panels = [...measure.querySelectorAll('.path-panel,.career-panel')];
        panels.forEach(panel => { panel.hidden = false; });
        root.appendChild(measure);
        const height = Math.max(...panels.map(panel => panel.getBoundingClientRect().height));
        measure.remove();
        stage.style.minHeight = Math.ceil(height + 2)+'px';
      });
    });
  }
  document.fonts?.ready.then(sizeMobilePanels);
  window.addEventListener('resize',sizeMobilePanels,{passive:true});
  sizeMobilePanels();

  const careerTrack = root.querySelector('.career-track');
  const careerTabs = [...root.querySelectorAll('.career-tab')];
  let lastMilestone = -1;
  function syncMilestone() {
    const active = careerTabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    if (active < 0 || active === lastMilestone) return;
    careerTrack.style.setProperty('--stop',active);
    const initial = lastMilestone < 0;
    lastMilestone = active;
    if (!initial) {
      const panel = root.querySelector('#'+careerTabs[active].getAttribute('aria-controls'));
      revealDetails(panel,'.career-photo>img','.career-detail>*');
    }
  }
  const selectionObserver = new MutationObserver(syncMilestone);
  careerTabs.forEach(tab => selectionObserver.observe(tab,{attributes:true,attributeFilter:['aria-selected']}));
  syncMilestone();

  const aircraft = root.querySelector('.main-aircraft');
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
  let scrollFrame = false;
  function moveAircraft() {
    scrollFrame = false;
    if (!aircraft || preference.matches || !finePointer.matches || innerWidth <= 820) return;
    const rect = aircraft.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    const shift = Math.max(-12,Math.min(12,(innerHeight/2 - rect.top - rect.height/2)*.035));
    aircraft.style.setProperty('--image-shift',shift+'px');
  }
  window.addEventListener('scroll',() => {
    if (scrollFrame) return;
    scrollFrame = true;
    requestAnimationFrame(moveAircraft);
  },{passive:true});
  root.addEventListener('focusin',event => {
    let element = event.target;
    while (element && element !== root) {
      element.getAnimations?.().forEach(animation => {
        if (animations.has(animation)) animation.cancel();
      });
      element = element.parentElement;
    }
  });
  preference.addEventListener('change',() => {
    if (!preference.matches) return;
    [...animations].forEach(animation => animation.cancel());
    aircraft?.style.setProperty('--image-shift','0px');
  });
})();
// Static, attributed review marquee. Native scrolling remains available without JS.
(() => {
  const section = document.querySelector('.flight-reviews');
  if (!section) return;
  const viewport = section.querySelector('.flight-review-viewport');
  const track = section.querySelector('.flight-review-track');
  const originals = [...track.children];
  const controls = section.querySelector('.flight-review-controls');
  const pause = section.querySelector('[data-review-pause]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = false, visible = false, resumeAfter = 0;
  let cycle = 0, frame = 0, previous = 0, position = 0;
  function layout() {
    track.querySelectorAll('[data-review-copy]').forEach(el => el.remove());
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    cycle = originals.reduce((width, card) => width + card.offsetWidth + gap, 0);
    if (!cycle) return;
    const copies = Math.ceil(viewport.clientWidth / cycle) + 1;
    for (let i = 0; i < copies; i++) originals.forEach(card => {
      const copy = card.cloneNode(true);
      copy.dataset.reviewCopy = '';
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('a').forEach(link => {
        link.tabIndex = -1;
        link.addEventListener('mousedown', event => event.preventDefault());
      });
      track.append(copy);
    });
    viewport.scrollLeft %= cycle;
    position = viewport.scrollLeft;
  }
  function sync() {
    pause.textContent = userPaused ? 'Play' : 'Pause';
    pause.setAttribute('aria-pressed', String(userPaused));
    pause.setAttribute('aria-label', userPaused ? 'Play review scrolling' : 'Pause review scrolling');
    pause.hidden = reduced.matches;
  }
  function step(now) {
    frame = 0;
    if (!visible || document.hidden) { previous = 0; return; }
    const keyboardReading = viewport.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    if (previous && !userPaused && now >= resumeAfter && !keyboardReading && !reduced.matches && cycle) {
      position = (position + Math.min(now - previous, 50) * .04) % cycle;
      viewport.scrollLeft = position;
    } else {
      position = viewport.scrollLeft;
    }
    previous = now;
    frame = requestAnimationFrame(step);
  }
  function start() { if (visible && !document.hidden && !frame) frame = requestAnimationFrame(step); }
  pause.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  function manual(direction) {
    resumeAfter = performance.now() + 4000;
    if (viewport.scrollLeft < 1 && direction < 0) viewport.scrollLeft = cycle;
    viewport.scrollBy({left: direction * (originals[0].offsetWidth + 22), behavior: reduced.matches ? 'instant' : 'smooth'});
  }
  section.querySelector('[data-review-prev]').addEventListener('click', () => manual(-1));
  section.querySelector('[data-review-next]').addEventListener('click', () => manual(1));
  viewport.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') resumeAfter = performance.now() + 4000; });
  viewport.addEventListener('pointermove', event => { if (event.pointerType !== 'mouse' && event.buttons) resumeAfter = performance.now() + 4000; });
  viewport.addEventListener('wheel', event => { if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) resumeAfter = performance.now() + 4000; }, {passive: true});
  viewport.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); manual(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; start(); }).observe(section);
  new ResizeObserver(layout).observe(viewport);
  document.addEventListener('visibilitychange', start);
  reduced.addEventListener('change', sync);
  controls.hidden = false;
  layout(); sync();
})();
