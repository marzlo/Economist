(() => {
  const banner = document.querySelector('header .journey-banner');
  if (!banner) return;
  const desktopNav = document.querySelector('.desktop-nav');
  const mobileNav = document.querySelector('.mobile-nav');
  if (!desktopNav || !mobileNav) return;
  const dock = document.createElement('div');
  dock.className = 'journey-dock';
  dock.hidden = true;
  const miniature = banner.cloneNode(true);
  miniature.classList.add('journey-miniature');
  miniature.setAttribute('aria-label', '城市探險車縮圖');
  dock.append(miniature);
  let paused = false;
  const applyPause = () => {
    [banner, miniature].forEach(scene => {
      scene.classList.toggle('is-paused', paused);
      const button = scene.querySelector('.journey-toggle');
      button.setAttribute('aria-pressed', String(paused));
      button.textContent = scene === miniature ? (paused ? '▶' : 'Ⅱ') : (paused ? '播放動畫' : '暫停動畫');
      button.setAttribute('aria-label', paused ? '播放車輛動畫' : '暫停車輛動畫');
    });
  };
  [banner, miniature].forEach(scene => scene.querySelector('.journey-toggle').addEventListener('click', () => {
    paused = !paused;
    applyPause();
  }));
  applyPause();
  const smallScreen = matchMedia('(max-width:850px)');
  const placeDock = () => {
    (smallScreen.matches ? mobileNav : desktopNav).append(dock);
  };
  placeDock();
  smallScreen.addEventListener('change', placeDock);
  // Observe the original only, so docking never changes its layout or scroll position.
  const observer = new IntersectionObserver(([entry]) => {
    const docked = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
    dock.hidden = !docked;
    document.body.classList.toggle('journey-docked', docked);
    banner.classList.toggle('journey-offscreen', docked);
  }, {threshold: 0});
  observer.observe(banner);
})();
