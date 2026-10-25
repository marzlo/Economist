(() => {
  const picker = document.getElementById('mobile-nav-select');
  if (!picker) return;
  const syncHash = () => {
    const known = Array.from(picker.options).some(option => option.value === location.hash);
    picker.value = known ? location.hash : '';
  };
  picker.addEventListener('change', () => {
    const target = document.getElementById(picker.value.slice(1));
    if (!target) return;
    history.pushState(null, '', picker.value);
    target.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  });
  window.addEventListener('hashchange', syncHash);
  window.addEventListener('popstate', syncHash);
  syncHash();
})();
