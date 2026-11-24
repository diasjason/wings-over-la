/* Block-rate details: hover, keyboard focus or tap. Loaded only on fleet pages. */
(() => {
  const items = [...document.querySelectorAll('.block-rate-info')];
  const pinned = new WeakSet();
  const hide = item => {
    pinned.delete(item);
    item.querySelector('[role="tooltip"]').hidden = true;
    item.querySelector('button').setAttribute('aria-expanded', 'false');
  };
  const show = item => {
    items.forEach(other => { if (other !== item) hide(other); });
    item.querySelector('[role="tooltip"]').hidden = false;
    item.querySelector('button').setAttribute('aria-expanded', 'true');
  };
  items.forEach(item => {
    const button = item.querySelector('button');
    item.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') show(item);
    });
    item.addEventListener('pointerleave', () => {
      if (!pinned.has(item) && !button.matches(':focus-visible')) hide(item);
    });
    button.addEventListener('focus', () => {
      if (button.matches(':focus-visible')) show(item);
    });
    button.addEventListener('blur', () => hide(item));
    button.addEventListener('click', () => {
      if (pinned.has(item)) hide(item);
      else { show(item); pinned.add(item); }
    });
  });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.block-rate-info')) items.forEach(hide);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') items.forEach(hide);
  });
})();
