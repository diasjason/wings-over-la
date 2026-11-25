/* Contact-only review carousel: complete readable cards and gentle automatic rotation. */
(() => {
  const section = document.querySelector('.contact-review-marquee');
  if (!section) return;
  const viewport = section.querySelector('.contact-review-viewport');
  const track = section.querySelector('.contact-review-track');
  const cards = [...track.children];
  const controls = section.querySelector('.contact-review-controls');
  const pause = section.querySelector('[data-contact-review-pause]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const layout = section.closest('.contact-layout');
  const form = layout?.querySelector('#inquiry');
  let perPage = 1, timer = 0, visible = false, userPaused = false;
  function matchFormHeight() {
    const columns = getComputedStyle(layout).gridTemplateColumns.trim().split(/\s+/);
    if (form && columns.length === 2) section.style.setProperty('--review-form-height', `${form.getBoundingClientRect().height}px`);
    else section.style.removeProperty('--review-form-height');
  }
  function measure() {
    matchFormHeight();
    perPage = viewport.clientWidth >= 450 ? 2 : 1;
    section.style.setProperty('--contact-review-card-width', `${(viewport.clientWidth - (perPage - 1) * 14) / perPage}px`);
    viewport.scrollLeft = 0;
  }
  function reading() { return section.contains(document.activeElement) && document.activeElement.matches(':focus-visible'); }
  function schedule() {
    clearTimeout(timer);
    const running = visible && !document.hidden && !reduced.matches && !userPaused && !reading();
    section.dataset.scrolling = running ? 'playing' : 'paused';
    if (running) timer = setTimeout(() => { move(1); schedule(); }, 6500);
  }
  function move(direction) {
    const width = cards[0].getBoundingClientRect().width + 14;
    const current = Math.round(viewport.scrollLeft / width);
    let next = current + direction * perPage;
    if (next >= cards.length) next = 0;
    if (next < 0) next = Math.max(0, cards.length - perPage);
    viewport.scrollTo({left: next * width, behavior: reduced.matches ? 'instant' : 'smooth'});
  }
  function sync() {
    pause.textContent = userPaused ? 'Play' : 'Pause';
    pause.setAttribute('aria-pressed', String(userPaused));
    pause.setAttribute('aria-label', userPaused ? 'Play Google review rotation' : 'Pause Google review rotation');
    pause.hidden = reduced.matches;
    schedule();
  }
  pause.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  section.querySelector('[data-contact-review-prev]').addEventListener('click', () => { move(-1); schedule(); });
  section.querySelector('[data-contact-review-next]').addEventListener('click', () => { move(1); schedule(); });
  section.addEventListener('focusin', schedule);
  section.addEventListener('focusout', () => setTimeout(schedule, 0));
  viewport.addEventListener('pointerdown', () => clearTimeout(timer));
  viewport.addEventListener('pointerup', schedule);
  viewport.addEventListener('wheel', schedule, {passive: true});
  viewport.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); schedule();
  });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(section);
  new ResizeObserver(measure).observe(viewport);
  if (form) new ResizeObserver(matchFormHeight).observe(form);
  window.addEventListener('resize', measure, {passive: true});
  document.fonts?.ready.then(measure);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', sync);
  controls.hidden = false;
  measure(); sync();
})();
