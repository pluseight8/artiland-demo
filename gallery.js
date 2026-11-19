(() => {
  if (typeof HTMLDialogElement === 'undefined' || !('showModal' in HTMLDialogElement.prototype)) return;

  function imageSource(image) {
    return image.currentSrc || (image.getAttribute('src') ? image.src : '');
  }

  const photos = [];
  const openers = new Map();
  for (const button of document.querySelectorAll('button[data-gallery-open]')) {
    const item = button.closest('[data-gallery-item]');
    const image = button.querySelector('img.venue-photo') || item?.querySelector('img.venue-photo');
    if (!image || !imageSource(image)) continue;

    let index = photos.findIndex((photo) => photo.image === image);
    if (index === -1) {
      const caption = item?.querySelector('[data-gallery-caption], figcaption');
      photos.push({ image, title: caption?.textContent.trim() || image.alt });
      index = photos.length - 1;
    }
    openers.set(button, index);
  }
  if (!photos.length) return;
  for (const button of document.querySelectorAll('button[data-gallery-launch]')) {
    openers.set(button, 0);
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'gallery-dialog';
  dialog.setAttribute('aria-labelledby', 'gallery-dialog-title');
  dialog.innerHTML = `
    <div class="gallery-dialog__layout">
      <header class="gallery-dialog__header">
        <h2 id="gallery-dialog-title">Фотографии игровой</h2>
        <button class="gallery-dialog__control" type="button" data-gallery-close aria-label="Закрыть фотографии" autofocus>×</button>
      </header>
      <div class="gallery-dialog__stage">
        <img class="gallery-dialog__photo" alt="">
        <span class="gallery-dialog__stamp" aria-hidden="true">ДЕМО · ДО ОПЛАТЫ</span>
        <span class="gallery-dialog__watermark" aria-hidden="true">Демо · до оплаты</span>
      </div>
      <div class="gallery-dialog__bar">
        <button class="gallery-dialog__control" type="button" data-gallery-prev aria-label="Предыдущая фотография">←</button>
        <div class="gallery-dialog__caption" role="status">
          <span class="gallery-dialog__count"></span>
          <span class="gallery-dialog__title"></span>
        </div>
        <button class="gallery-dialog__control" type="button" data-gallery-next aria-label="Следующая фотография">→</button>
      </div>
      <div class="gallery-dialog__thumbs" role="group" aria-label="Выбрать фотографию"></div>
    </div>`;
  document.body.append(dialog);

  const slide = dialog.querySelector('.gallery-dialog__photo');
  const stage = dialog.querySelector('.gallery-dialog__stage');
  const caption = dialog.querySelector('.gallery-dialog__title');
  const count = dialog.querySelector('.gallery-dialog__count');
  const rail = dialog.querySelector('.gallery-dialog__thumbs');
  const close = dialog.querySelector('[data-gallery-close]');
  const previous = dialog.querySelector('[data-gallery-prev]');
  const next = dialog.querySelector('[data-gallery-next]');
  const multiple = photos.length > 1;
  const root = document.documentElement;
  const slideMotion = window.matchMedia('(prefers-reduced-motion: no-preference)');
  let selected = 0;
  let opener;
  let slideAnimation;
  let swipe;
  previous.hidden = next.hidden = rail.hidden = !multiple;

  const thumbnails = multiple ? photos.map((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', photo.title ? `Фото ${index + 1}. ${photo.title}` : `Фото ${index + 1}`);

    const preview = document.createElement('img');
    preview.alt = '';
    preview.loading = 'lazy';
    preview.decoding = 'async';
    button.append(preview);
    button.addEventListener('click', () => select(index, Math.sign(index - selected)));
    rail.append(button);
    return { button, preview };
  }) : [];

  function select(index, direction = 0) {
    const photo = photos[index];
    const source = imageSource(photo.image);
    if (slide.getAttribute('src') !== source) slide.src = source;
    slide.alt = photo.image.alt;
    caption.textContent = photo.title;
    count.textContent = `${index + 1} из ${photos.length}`;

    slideAnimation?.cancel();
    if (direction && slideMotion.matches && 'animate' in slide) {
      slideAnimation = slide.animate([
        { opacity: .3, translate: `${direction * 16}px 0` },
        { opacity: 1, translate: '0 0' }
      ], { duration: 290, easing: 'cubic-bezier(.2,.68,.25,1)' });
    }

    if (multiple) {
      thumbnails[selected].button.removeAttribute('aria-current');
      const { button } = thumbnails[index];
      button.setAttribute('aria-current', 'true');
      const { left, right } = button.getBoundingClientRect();
      const bounds = rail.getBoundingClientRect();
      if (left < bounds.left) rail.scrollLeft -= bounds.left - left + 4;
      if (right > bounds.right) rail.scrollLeft += right - bounds.right + 4;
    }
    selected = index;
  }

  function move(direction) {
    select((selected + direction + photos.length) % photos.length, direction);
  }

  for (const [button, index] of openers) {
    button.hidden = false;
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', () => {
      opener = button;
      thumbnails.forEach(({ preview }, photoIndex) => {
        const source = imageSource(photos[photoIndex].image);
        if (preview.getAttribute('src') !== source) preview.src = source;
      });
      root.classList.toggle('gallery-gutter', window.innerWidth > root.clientWidth);
      dialog.showModal();
      root.classList.add('gallery-active');
      select(index);
    });
  }

  close.addEventListener('click', () => dialog.close());
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  slideMotion.addEventListener('change', () => slideAnimation?.cancel());
  stage.addEventListener('pointerdown', (event) => {
    if (!multiple || !event.isPrimary || event.pointerType !== 'touch') return;
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  stage.addEventListener('pointerup', (event) => {
    if (event.pointerId !== swipe?.id) return;
    const distance = event.clientX - swipe.x;
    const vertical = Math.abs(event.clientY - swipe.y);
    swipe = undefined;
    if (Math.abs(distance) > Math.max(42, vertical * 1.45)) move(distance > 0 ? -1 : 1);
  });
  stage.addEventListener('pointercancel', () => { swipe = undefined; });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    slideAnimation?.cancel();
    swipe = undefined;
    root.classList.remove('gallery-active', 'gallery-gutter');
    opener?.focus({ preventScroll: true });
  });
  dialog.addEventListener('keydown', (event) => {
    if (!multiple) return;
    const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (direction) {
      event.preventDefault();
      move(direction);
    }
  });
})();
