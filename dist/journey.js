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
  const scenes = [banner, miniature];
  const views = scenes.map(scene => ({scene, vehicle: scene.querySelector('.journey-vehicle'), people: [...scene.querySelectorAll('.journey-traveler')]}));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let elapsed = 0;
  let previousTime;
  let lastStopped;
  const renderCycle = state => {
    views.forEach(({scene, vehicle, people}) => {
      if (lastStopped !== state.stopped) scene.classList.toggle('journey-stopped', state.stopped);
      if ((scene === miniature && dock.hidden) || (scene === banner && !dock.hidden)) return;
      vehicle.style.setProperty('--door-open', state.door);
      vehicle.style.setProperty('--ramp-angle', ((1 - state.door) * -95) + 'deg');
      people.forEach((person, index) => {
        const member = state.people[index];
        person.style.left = member.x + '%';
        person.style.top = member.y + '%';
        person.style.visibility = member.visible ? 'visible' : 'hidden';
        person.style.setProperty('--person-direction', member.direction);
        person.classList.toggle('is-walking', member.walking);
      });
    });
    lastStopped = state.stopped;
  };
  renderCycle(JourneyCycle.at(0));
  let previousRender = -Infinity;
  const tick = now => {
    if (previousTime !== undefined && !paused && !document.hidden && !reducedMotion.matches) elapsed += Math.min(now - previousTime, 100);
    previousTime = now;
    if (!paused && !document.hidden && now - previousRender >= 32) {
      renderCycle(JourneyCycle.at(reducedMotion.matches ? 0 : elapsed));
      previousRender = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const smallScreen = matchMedia('(max-width:850px)');
  const fitDock = () => {
    const nav = dock.parentElement;
    if (nav && nav.clientHeight) dock.style.setProperty('--journey-dock-height', nav.clientHeight + 'px');
  };
  const navSize = new ResizeObserver(fitDock);
  navSize.observe(desktopNav);
  navSize.observe(mobileNav);
  const placeDock = () => {
    (smallScreen.matches ? mobileNav : desktopNav).append(dock);
    fitDock();
  };
  placeDock();
  smallScreen.addEventListener('change', placeDock);
  // Observe the original only, so docking never changes its layout or scroll position.
  const observer = new IntersectionObserver(([entry]) => {
    const docked = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
    dock.hidden = !docked;
    document.body.classList.toggle('journey-docked', docked);
    banner.classList.toggle('journey-offscreen', docked);
    fitDock();
  }, {threshold: 0});
  observer.observe(banner);
})();
