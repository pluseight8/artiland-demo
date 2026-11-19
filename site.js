const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const stage = document.querySelector('[data-motion-stage]');

if (stage) {
  const finePointer = window.matchMedia('(min-width: 801px) and (hover: hover) and (pointer: fine)');
  const centerOffset = (position, start, length) => Math.max(-1, Math.min(1, 2 * (position - start) / length - 1));
  let frame = 0;

  function resetTilt() {
    cancelAnimationFrame(frame);
    stage.style.removeProperty('--tilt-x');
    stage.style.removeProperty('--tilt-y');
  }

  stage.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches || !finePointer.matches || event.pointerType !== 'mouse') return;

    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const bounds = stage.getBoundingClientRect();
      const horizontal = centerOffset(event.clientX, bounds.left, bounds.width);
      const vertical = centerOffset(event.clientY, bounds.top, bounds.height);
      stage.style.setProperty('--tilt-x', `${(-vertical * 5).toFixed(2)}deg`);
      stage.style.setProperty('--tilt-y', `${(horizontal * 6).toFixed(2)}deg`);
    });
  }, { passive: true });

  stage.addEventListener('pointerleave', resetTilt);
  stage.addEventListener('pointercancel', resetTilt);
  reducedMotion.addEventListener('change', resetTilt);
  finePointer.addEventListener('change', resetTilt);
}

if ('IntersectionObserver' in window && 'animate' in Element.prototype) {
  const activeReveals = new Set();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const element = entry.target;
      observer.unobserve(element);
      if (reducedMotion.matches) continue;

      const delay = Math.min(320, Math.max(0, Number(element.dataset.revealDelay) || 0));
      const animation = element.animate([
        { opacity: .58, translate: '0 22px' },
        { opacity: 1, translate: '0 0' }
      ], {
        duration: 640,
        delay,
        easing: 'cubic-bezier(.18,.72,.28,1)',
        fill: 'backwards'
      });

      activeReveals.add(animation);
      const forget = () => activeReveals.delete(animation);
      animation.finished.then(forget, forget);
    }
  }, { rootMargin: '0px 0px -5% 0px', threshold: .06 });

  document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) activeReveals.forEach((animation) => animation.cancel());
  });
}

const partyStage = document.querySelector('[data-party-stage]');

if (partyStage) {
  const options = [...document.querySelectorAll('details[data-party]')];

  function syncPartyStage() {
    const openOption = options.find((option) => option.open);
    if (openOption) partyStage.dataset.active = openOption.dataset.party;
  }

  options.forEach((option) => option.addEventListener('toggle', syncPartyStage));
  syncPartyStage();
}
