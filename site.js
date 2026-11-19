const tour = document.querySelector('[data-scroll-tour]');

if (tour) {
  const preference = window.matchMedia('(prefers-reduced-motion: no-preference) and (min-height: 500px)');
  const chapters = [...tour.querySelectorAll('[data-tour-chapter]')];
  const visual = tour.querySelector('[data-tour-visual]');
  const canvas = tour.querySelector('[data-tour-frames]');
  const progress = tour.querySelector('[data-tour-progress]');
  const mobile = window.matchMedia('(max-width: 740px)');
  const hero = document.querySelector('.hero-media');
  const heroImage = hero.querySelector('.venue-photo, .venue-art');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const smooth = (value) => value * value * (3 - 2 * value);
  const originals = chapters.map((chapter) => chapter.querySelector('.chapter-media'));
  let frames = [];
  let tick = 0;

  function draw() {
    tick = 0;
    const tourBounds = tour.getBoundingClientRect();
    const viewport = window.innerHeight;
    const heroBounds = hero.getBoundingClientRect();

    if (heroBounds.bottom > 0) {
      const travel = clamp(1 - heroBounds.bottom / heroBounds.height, 0, 1);
      heroImage.style.transform = `scale(${(1.045 - travel * .045).toFixed(4)})`;
    }

    if (tourBounds.bottom <= 0 || tourBounds.top >= viewport) return;

    const viewBottom = Math.max(0, visual.getBoundingClientRect().bottom);
    const playhead = mobile.matches
      ? Math.max(viewport * .56, viewBottom + (viewport - viewBottom) * .42)
      : viewport * .53;
    const centers = chapters.map((chapter) => {
      const bounds = chapter.getBoundingClientRect();
      return bounds.top + bounds.height * .5;
    });

    const next = centers.findIndex((center) => center >= playhead);
    const last = centers.length - 1;
    const upper = next < 0 ? last : next;
    const lower = Math.max(0, upper - 1);
    const fraction = next < 0
      ? 1
      : centerFraction(lower, upper, playhead, centers);
    const position = lower + fraction;
    const overlay = smooth(clamp((fraction - .22) / .56, 0, 1));

    frames.forEach(({ frame, image }, index) => {
      frame.style.opacity = index === lower ? '1' : index === upper ? overlay.toFixed(4) : '0';
      const distance = clamp(index - position, -1, 1);
      const scale = 1.09 + Math.abs(distance) * .045;
      image.style.transform = `translate3d(0,${(distance * 3.1).toFixed(3)}%,0) scale(${scale.toFixed(4)})`;
    });

    const fullTravel = clamp((playhead - tourBounds.top) / tourBounds.height, 0, 1);
    progress.style.transform = `scaleX(${fullTravel.toFixed(4)})`;
  }

  function centerFraction(lower, upper, playhead, centers) {
    if (lower === upper) return 0;
    return clamp((playhead - centers[lower]) / (centers[upper] - centers[lower]), 0, 1);
  }

  function requestDraw() {
    if (!tick) tick = requestAnimationFrame(draw);
  }

  function syncMotion() {
    if (!preference.matches) {
      window.removeEventListener('scroll', requestDraw);
      window.removeEventListener('resize', requestDraw);
      cancelAnimationFrame(tick);
      tick = 0;
      delete tour.dataset.motion;
      heroImage.style.removeProperty('transform');
      return;
    }

    if (!frames.length) {
      frames = originals.map((figure) => {
        const frame = document.createElement('div');
        const original = figure.querySelector('.venue-photo, .venue-art');
        const image = original instanceof HTMLImageElement ? original.cloneNode(false) : document.createElement('div');
        if (image instanceof HTMLImageElement) {
          image.alt = '';
        } else {
          image.className = original.className;
          image.append(document.createElement('span'));
        }
        frame.className = 'tour-frame';
        frame.append(image);
        canvas.append(frame);
        return { frame, image };
      });
    }

    tour.dataset.motion = 'on';
    window.addEventListener('scroll', requestDraw, { passive: true });
    window.addEventListener('resize', requestDraw);
    requestDraw();
  }

  preference.addEventListener('change', syncMotion);
  syncMotion();
}
