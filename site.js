const stack = document.querySelector('[data-room-stack]');

if (stack) {
  const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
  const pins = window.matchMedia('(min-width: 861px) and (min-height: 690px)');
  const rooms = [...stack.querySelectorAll('[data-room]')];
  const links = [...document.querySelectorAll('.room-links a')];
  const photos = [document.querySelector('.cover-window'), ...stack.querySelectorAll('.room-image')];
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
    const readingLine = height * .37;
    const photoRects = photos.map((photo) => photo.getBoundingClientRect());
    const roomRects = rooms.map((room) => room.getBoundingClientRect());
    const activeRoom = roomRects.findLastIndex((rect) => rect.top <= readingLine && rect.bottom >= readingLine);

    setCurrent(rooms[activeRoom]);

    photos.forEach((photo, index) => {
      const bounds = photoRects[index];
      if (bounds.bottom < -50 || bounds.top > height + 50) return;

      const progress = 1 - 2 * (bounds.top + bounds.height / 2) / height;
      const offset = Math.max(-1, Math.min(1, progress)) * Math.min(12, bounds.height * .038);
      photo.style.setProperty('--photo-shift', `${offset.toFixed(1)}px`);
      photo.style.setProperty('--photo-scale', '1.085');
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

  function syncMotion() {
    if (motion.matches) {
      stack.dataset.stack = 'scroll';
      if (!pins.matches) rooms.forEach((room) => room.style.removeProperty('--sheet-scale'));
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      schedule();
      return;
    }

    delete stack.dataset.stack;
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    cancelAnimationFrame(frame);
    frame = 0;
    photos.forEach((photo) => {
      photo.style.removeProperty('--photo-shift');
      photo.style.removeProperty('--photo-scale');
    });
    rooms.forEach((room) => room.style.removeProperty('--sheet-scale'));
    setCurrent();
  }

  pins.addEventListener('change', syncMotion);
  motion.addEventListener('change', syncMotion);
  syncMotion();
}
