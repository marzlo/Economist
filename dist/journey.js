(() => {
  const banner = document.querySelector('.journey-banner');
  if (!banner) return;
  const toggle = banner.querySelector('.journey-toggle');
  toggle.addEventListener('click', () => {
    const paused = banner.classList.toggle('is-paused');
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? '播放動畫' : '暫停動畫';
    toggle.setAttribute('aria-label', paused ? '播放車輛動畫' : '暫停車輛動畫');
  });
})();
