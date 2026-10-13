const works = [
  {
    name: 'panorama',
    title: 'Landscape',
    src: '/assets/coast-desktop.webp',
    width: 1344,
    height: 752,
    alt: 'An imagined landscape blending from daylight to night: a coastal city and the USS Midway on the left, inland terrain and a land drilling rig on the right, a house on a distant hill, stars, a full moon, and a launching rocket.'
  },
  {
    name: 'portrait',
    title: 'Portrait',
    src: '/assets/coast-mobile.webp',
    width: 752,
    height: 1344,
    alt: 'A portrait view of an imagined coastal and inland landscape, with the USS Midway, a coastal city, a land drilling rig, a house on a hill, a full moon, stars, and a rocket launching into the night sky.'
  }
];

const zoomSteps = [1, 1.25, 1.5, 2, 2.5, 3];
let dialog, viewport, stage, picture, title, count, status, error;
let currentIndex = 0, zoomIndex = 0, focusOrigin = null;
let resizeObserver, previousBodyOverflow = '', initialized = false;

function createDialog() {
  dialog = document.createElement('dialog');
  dialog.className = 'image-gallery-modal';
  dialog.setAttribute('aria-labelledby', 'image-gallery-title');
  dialog.setAttribute('aria-describedby', 'image-gallery-help');
  dialog.innerHTML = `
    <div class="image-gallery-frame">
      <header class="image-gallery-header">
        <div class="image-gallery-heading"><span class="image-gallery-count" aria-hidden="true">01 / 02</span><h2 id="image-gallery-title">Landscape</h2></div>
        <button class="image-gallery-close" type="button" aria-label="Close image viewer" title="Close · Escape" autofocus><span aria-hidden="true">×</span></button>
      </header>
      <div class="image-gallery-viewport" tabindex="0" role="region" aria-label="Image. Zoom in to scroll around the image." aria-busy="true">
        <div class="image-gallery-stage"><img class="image-gallery-picture" alt="" draggable="false" decoding="async"/></div>
        <p class="image-gallery-error" hidden>The image could not be loaded.</p>
      </div>
      <footer class="image-gallery-footer">
        <div class="image-gallery-navigation" role="group" aria-label="Choose an image">
          <button class="image-gallery-previous" type="button" aria-label="Previous image" title="Previous image · Left arrow"><span aria-hidden="true">←</span></button>
          <span class="image-gallery-position" aria-hidden="true">1 / 2</span>
          <button class="image-gallery-next" type="button" aria-label="Next image" title="Next image · Right arrow"><span aria-hidden="true">→</span></button>
        </div>
        <p id="image-gallery-help">Arrow keys to browse<span class="image-gallery-zoom-hint"> · Zoom to look closer</span></p>
        <div class="image-gallery-zoom" role="group" aria-label="Image zoom">
          <button class="image-gallery-zoom-out" type="button" aria-label="Zoom out" title="Zoom out · Minus"><span aria-hidden="true">−</span></button>
          <output class="image-gallery-zoom-value" aria-label="Zoom relative to fit">100%</output>
          <button class="image-gallery-zoom-in" type="button" aria-label="Zoom in" title="Zoom in · Plus"><span aria-hidden="true">+</span></button>
          <button class="image-gallery-fit" type="button" aria-label="Fit image to viewer" title="Fit image · 0">Fit</button>
        </div>
      </footer>
      <span class="image-gallery-status" role="status" aria-live="polite"></span>
    </div>
  `;
  document.body.append(dialog);
  viewport = dialog.querySelector('.image-gallery-viewport');
  stage = dialog.querySelector('.image-gallery-stage');
  picture = dialog.querySelector('.image-gallery-picture');
  title = dialog.querySelector('#image-gallery-title');
  count = dialog.querySelector('.image-gallery-count');
  status = dialog.querySelector('.image-gallery-status');
  error = dialog.querySelector('.image-gallery-error');

  dialog.querySelector('.image-gallery-close').addEventListener('click', closeGallery);
  dialog.querySelector('.image-gallery-previous').addEventListener('click', () => changeImage(-1));
  dialog.querySelector('.image-gallery-next').addEventListener('click', () => changeImage(1));
  dialog.querySelector('.image-gallery-zoom-out').addEventListener('click', () => changeZoom(zoomIndex - 1));
  dialog.querySelector('.image-gallery-zoom-in').addEventListener('click', () => changeZoom(zoomIndex + 1));
  dialog.querySelector('.image-gallery-fit').addEventListener('click', () => changeZoom(0));
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeGallery(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeGallery();
  });
  dialog.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); changeImage(-1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); changeImage(1); }
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); changeZoom(zoomIndex + 1); }
    else if (event.key === '-' || event.key === '_') { event.preventDefault(); changeZoom(zoomIndex - 1); }
    else if (event.key === '0') { event.preventDefault(); changeZoom(0); }
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousBodyOverflow;
    if (focusOrigin?.isConnected && !focusOrigin.closest('[inert]')) focusOrigin.focus({ preventScroll: true });
    focusOrigin = null;
    window.dispatchEvent(new CustomEvent('gallery:close', { detail: { name: works[currentIndex].name } }));
  });
  picture.addEventListener('load', () => {
    viewport.setAttribute('aria-busy', 'false');
    error.hidden = true;
    picture.hidden = false;
    fitImage(false);
  });
  picture.addEventListener('error', () => {
    viewport.setAttribute('aria-busy', 'false');
    picture.hidden = true;
    error.hidden = false;
    status.textContent = 'The image could not be loaded. You can try the other view.';
  });
  resizeObserver = new ResizeObserver(() => { if (dialog.open) fitImage(true); });
  resizeObserver.observe(viewport);
}

function fitImage(preserveCenter = true) {
  if (!dialog?.open || !viewport.clientWidth || !viewport.clientHeight) return;
  const centerX = preserveCenter ? (viewport.scrollLeft + viewport.clientWidth / 2) / Math.max(stage.offsetWidth, 1) : .5;
  const centerY = preserveCenter ? (viewport.scrollTop + viewport.clientHeight / 2) / Math.max(stage.offsetHeight, 1) : .5;
  const work = works[currentIndex];
  const padding = viewport.clientWidth < 600 ? 24 : 48;
  const fit = Math.min((viewport.clientWidth - padding) / work.width, (viewport.clientHeight - padding) / work.height, 1);
  const width = Math.max(1, work.width * fit * zoomSteps[zoomIndex]);
  const height = Math.max(1, work.height * fit * zoomSteps[zoomIndex]);
  picture.style.width = `${width}px`;
  picture.style.height = `${height}px`;
  stage.style.width = `${Math.max(viewport.clientWidth, width + padding)}px`;
  stage.style.height = `${Math.max(viewport.clientHeight, height + padding)}px`;
  viewport.scrollLeft = centerX * stage.offsetWidth - viewport.clientWidth / 2;
  viewport.scrollTop = centerY * stage.offsetHeight - viewport.clientHeight / 2;
  dialog.querySelector('.image-gallery-zoom-value').textContent = `${zoomSteps[zoomIndex] * 100}%`;
  dialog.querySelector('.image-gallery-zoom-out').disabled = zoomIndex === 0;
  dialog.querySelector('.image-gallery-zoom-in').disabled = zoomIndex === zoomSteps.length - 1;
  dialog.querySelector('.image-gallery-fit').disabled = zoomIndex === 0;
  viewport.classList.toggle('image-gallery-is-zoomed', zoomIndex > 0);
}

function changeZoom(nextIndex) {
  const clamped = Math.max(0, Math.min(zoomSteps.length - 1, nextIndex));
  if (zoomIndex === clamped) return;
  zoomIndex = clamped;
  fitImage(zoomIndex !== 0);
  status.textContent = zoomIndex === 0 ? 'Image fitted to the viewer.' : `Zoom ${zoomSteps[zoomIndex] * 100} percent. Scroll the image to look around.`;
}

function showImage(index) {
  currentIndex = index;
  zoomIndex = 0;
  const work = works[currentIndex];
  title.textContent = work.title;
  count.textContent = `${String(currentIndex + 1).padStart(2, '0')} / 02`;
  dialog.querySelector('.image-gallery-position').textContent = `${currentIndex + 1} / ${works.length}`;
  picture.alt = work.alt;
  picture.hidden = !picture.complete || !picture.naturalWidth;
  error.hidden = true;
  if (picture.getAttribute('src') !== work.src) {
    picture.hidden = true;
    viewport.setAttribute('aria-busy', 'true');
    picture.src = work.src;
  }
  fitImage(false);
  status.textContent = `${work.title}. Image ${currentIndex + 1} of ${works.length}.`;
  window.dispatchEvent(new CustomEvent('gallery:change', { detail: { name: work.name } }));
}

function changeImage(direction) {
  showImage((currentIndex + direction + works.length) % works.length);
}

/** Initialize once. Buttons or links with data-gallery="panorama|portrait" open the viewer. */
export function initGallery() {
  if (initialized) return;
  initialized = true;
  createDialog();
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest('[data-gallery]');
    if (!trigger || !works.some(work => work.name === trigger.dataset.gallery)) return;
    event.preventDefault();
    openGallery(trigger.dataset.gallery, trigger);
  });
}

/** Open an existing image without changing the URL or browser history. */
export function openGallery(name = 'panorama', trigger = document.activeElement) {
  initGallery();
  const index = Math.max(0, works.findIndex(work => work.name === name));
  if (!dialog.open) {
    focusOrigin = trigger instanceof HTMLElement ? trigger : null;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
  }
  showImage(index);
  dialog.querySelector('.image-gallery-close').focus({ preventScroll: true });
}

/** Close the viewer and restore focus to the element that opened it. */
export function closeGallery() {
  if (dialog?.open) dialog.close();
}
