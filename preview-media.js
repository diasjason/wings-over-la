/* Preview branch only: load corrected media from this computer for review.
   No files leave the browser, are uploaded, or are stored by this utility. */
(() => {
  if (new URLSearchParams(location.search).get('previewMedia') !== '1') return;
  const hero = document.getElementById('home-hero');
  const video = document.getElementById('hero-video');
  const cockpit = document.querySelector('#panel-career .path-photo img');
  if (!hero || !video || !cockpit) return;

  const style = document.createElement('style');
  style.textContent = `
    .media-review-tray{position:fixed;bottom:14px;right:14px;z-index:9999;width:min(365px,calc(100vw - 28px));max-height:70vh;overflow:auto;background:#07182b;color:#f7f8fa;border:1px solid #c6a467;border-radius:12px;padding:17px;box-shadow:0 12px 32px #07182b90;font:13px/1.5 system-ui,sans-serif}
    .media-review-tray h2{font:600 16px/1.2 system-ui,sans-serif;margin:0 0 7px;color:#f7f8fa}
    .media-review-tray p{margin:0 0 12px;color:#dce7f0;font-size:12px}
    .media-review-tray label{display:block;margin:10px 0 3px;font-weight:600}
    .media-review-tray input{width:100%;font:12px system-ui,sans-serif;color:#f7f8fa}
    .media-review-tray small{display:block;margin-top:10px;color:#c6a467}
    .media-review-tray .media-review-close{float:right;border:1px solid #aab8c5;border-radius:7px;color:#f7f8fa;background:transparent;padding:2px 8px;cursor:pointer}
  `;
  document.head.append(style);

  const tray = document.createElement('aside');
  tray.className = 'media-review-tray';
  tray.setAttribute('aria-label', 'Local-only media preview controls');
  tray.innerHTML = `
    <button type="button" class="media-review-close" aria-label="Close media preview controls">×</button>
    <h2>Preview your updated media</h2>
    <p>Choose corrected files from your computer. Nothing is uploaded and your selection resets when you refresh.</p>
    <label for="media-review-desktop">Desktop hero MP4</label>
    <input id="media-review-desktop" type="file" accept=".mp4,video/mp4">
    <label for="media-review-mobile">Mobile hero MP4</label>
    <input id="media-review-mobile" type="file" accept=".mp4,video/mp4">
    <label for="media-review-image">Learn to Fly / D95A image</label>
    <input id="media-review-image" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp">
    <small id="media-review-status" role="status">Select a file above to preview it on this page.</small>
  `;
  document.body.append(tray);
  tray.querySelector('.media-review-close').addEventListener('click', () => tray.remove());

  const blobs = new Map();
  const status = tray.querySelector('#media-review-status');
  function previewFile(kind, file) {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      status.textContent = 'Please choose a file smaller than 100 MB for this browser preview.';
      return;
    }
    const isVideo = kind !== 'image';
    if (isVideo ? !(/\.mp4$/i.test(file.name) || file.type === 'video/mp4') :
      !(/\.(png|jpe?g|webp)$/i.test(file.name) || file.type.startsWith('image/'))) {
      status.textContent = 'Unsupported file type. Choose an MP4 or a PNG/JPEG/WebP image.';
      return;
    }
    if (blobs.has(kind)) URL.revokeObjectURL(blobs.get(kind));
    const url = URL.createObjectURL(file);
    blobs.set(kind, url);
    if (kind === 'image') {
      cockpit.src = url;
      cockpit.alt = 'User-selected high-resolution Wings Over L.A. D95A cockpit preview';
      cockpit.dataset.upgradeSrc = '';
      status.textContent = 'D95A image loaded. Select the Learn to Fly tab to review.';
    } else {
      const source = kind === 'mobile'
        ? video.querySelector('source[media]')
        : video.querySelector('source:not([media])');
      source.src = url;
      source.dataset.src = url;
      source.dataset.upgradeSrc = '';
      video.pause();
      video.load();
      video.muted = true;
      video.play().catch(() => {});
      status.textContent = kind === 'mobile'
        ? 'Mobile hero video selected. Use a narrow screen to review it.'
        : 'Desktop hero video selected. Review the hero above.';
    }
  }

  tray.querySelector('#media-review-desktop').addEventListener('change', e => previewFile('desktop', e.target.files?.[0]));
  tray.querySelector('#media-review-mobile').addEventListener('change', e => previewFile('mobile', e.target.files?.[0]));
  tray.querySelector('#media-review-image').addEventListener('change', e => previewFile('image', e.target.files?.[0]));
  window.addEventListener('pagehide', () => {
    blobs.forEach(url => URL.revokeObjectURL(url));
  }, {once: true});
})();
