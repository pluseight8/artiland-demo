const stack = document.querySelector('[data-room-stack]');

if (stack) {
  const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
  const pins = window.matchMedia('(min-width: 861px) and (min-height: 690px)');
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const rooms = [...stack.querySelectorAll('[data-room]')];
  const links = [...document.querySelectorAll('.room-links a')];
  const photos = [...document.querySelectorAll('.cover-window, .room-image, .celebration-image')];
  const revealTargets = [...document.querySelectorAll('[data-reveal]')];
  const revealed = new WeakSet();
  const activeReveals = new Set();
  let observer;
  let currentLink = null;
  let frame = 0;

  function setCurrent(room) {
    const link = room ? links.find((item) => item.hash === `#${room.id}`) : null;
    if (currentLink === link) return;

    currentLink?.removeAttribute('aria-current');
    link?.setAttribute('aria-current', 'location');
    currentLink = link;
  }

  function draw() {
    frame = 0;

    const height = window.innerHeight;
    const pageLength = root.scrollHeight - height;
    const progress = pageLength > 0 ? Math.max(0, Math.min(1, window.scrollY / pageLength)) : 0;
    const readingLine = height * .37;
    const photoRects = photos.map((photo) => photo.getBoundingClientRect());
    const roomRects = rooms.map((room) => room.getBoundingClientRect());
    const activeRoom = roomRects.findLastIndex((rect) => rect.top <= readingLine && rect.bottom >= readingLine);

    setCurrent(rooms[activeRoom]);
    header.style.setProperty('--page-progress', progress.toFixed(4));

    photos.forEach((photo, index) => {
      const bounds = photoRects[index];
      if (bounds.bottom < -50 || bounds.top > height + 50) return;

      const travel = 1 - 2 * (bounds.top + bounds.height / 2) / height;
      const offset = Math.max(-1, Math.min(1, travel)) * Math.min(17, bounds.height * .048);
      photo.style.setProperty('--photo-shift', `${offset.toFixed(1)}px`);
      photo.style.setProperty('--photo-scale', '1.105');
    });

    if (pins.matches) {
      rooms.slice(0, -1).forEach((room, index) => {
        const rect = roomRects[index];
        const overlap = (rect.bottom - roomRects[index + 1].top) / (rect.height * .64);
        const depth = Math.max(0, Math.min(1, overlap));
        room.style.setProperty('--sheet-scale', (1 - .045 * depth).toFixed(4));
      });
    }
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function startReveals() {
    if (observer || !('IntersectionObserver' in window) || !('animate' in Element.prototype)) return;

    observer = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting || !motion.matches || revealed.has(target)) continue;
        observer?.unobserve(target);
        revealed.add(target);
        if (target.contains(document.activeElement)) continue;

        const animation = target.animate([
          { opacity: .24, translate: '0 23px' },
          { opacity: 1, translate: '0 0' }
        ], {
          duration: 680,
          delay: Number(target.dataset.reveal) || 0,
          easing: 'cubic-bezier(.21,.68,.21,1)',
          fill: 'backwards'
        });
        activeReveals.add(animation);
        const forget = () => activeReveals.delete(animation);
        animation.finished.then(forget, forget);
      }
    }, { rootMargin: '0px 0px 26px 0px' });

    for (const target of revealTargets) {
      if (!revealed.has(target)) observer.observe(target);
    }
  }

  function syncMotion() {
    if (motion.matches) {
      root.classList.add('motion-ready');
      stack.dataset.stack = 'scroll';
      if (!pins.matches) rooms.forEach((room) => room.style.removeProperty('--sheet-scale'));
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      startReveals();
      schedule();
      return;
    }

    root.classList.remove('motion-ready', 'cover-intro');
    delete stack.dataset.stack;
    observer?.disconnect();
    observer = undefined;
    activeReveals.forEach((animation) => animation.cancel());
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    cancelAnimationFrame(frame);
    frame = 0;
    photos.forEach((photo) => {
      photo.style.removeProperty('--photo-shift');
      photo.style.removeProperty('--photo-scale');
    });
    header.style.removeProperty('--page-progress');
    rooms.forEach((room) => room.style.removeProperty('--sheet-scale'));
    setCurrent();
  }

  pins.addEventListener('change', syncMotion);
  motion.addEventListener('change', syncMotion);
  if (motion.matches && ['', '#top', '#main'].includes(location.hash)) root.classList.add('cover-intro');
  syncMotion();
}
