(() => {
  const storageKey = 'artiland-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch {
    // Theme still works for the current visit if browser storage is unavailable.
  }

  function applyTheme() {
    const dark = preference === 'dark' || (preference === 'system' && system.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#191426' : '#f7f4ed';
  }

  applyTheme();
  system.addEventListener('change', applyTheme);

  document.addEventListener('DOMContentLoaded', () => {
    const control = document.querySelector('#theme-mode');
    control.value = preference;
    control.parentElement.hidden = false;
    control.addEventListener('change', () => {
      preference = control.value;
      applyTheme();
      try {
        if (preference === 'system') localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, preference);
      } catch {
        // The current selection has already been applied.
      }
    });
  });
})();
