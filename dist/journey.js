(() => {
  const scene = document.querySelector('header .journey-banner');
  const desktopNav = document.querySelector('.desktop-nav');
  const mobileNav = document.querySelector('.mobile-nav');
  if (!scene || !desktopNav || !mobileNav || !window.JourneyCycle) return;
  // Reuse one scene rather than decode and composite a second full scene at startup.
  const slot = document.createElement('div');
  slot.className = 'journey-slot';
  scene.replaceWith(slot);
  slot.append(scene);
  const dock = document.createElement('div');
  dock.className = 'journey-dock';
  dock.hidden = true;
  const button = scene.querySelector('.journey-toggle');
  const vehicle = scene.querySelector('.journey-vehicle');
  const people = [...scene.querySelectorAll('.journey-traveler')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = matchMedia('(max-width:850px)');
  let paused = false, docked = false, elapsed = 0, previousTime, previousRender = -Infinity;
  let lastStopped, lastDoor, width = 0, height = 0;
  const crewState = [];
  const listen = (query, handler) => query.addEventListener ? query.addEventListener('change', handler) : query.addListener(handler);
  const fit = () => {
    const nav = dock.parentElement;
    if (nav && nav.clientHeight) dock.style.setProperty('--journey-dock-height', nav.clientHeight + 'px');
    width = vehicle.clientWidth;
    height = vehicle.clientHeight;
  };
  const setButton = () => {
    scene.classList.toggle('is-paused', paused);
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = docked ? (paused ? '▶' : 'Ⅱ') : (paused ? '播放動畫' : '暫停動畫');
    button.setAttribute('aria-label', paused ? '播放車輛動畫' : '暫停車輛動畫');
  };
  button.addEventListener('click', () => { paused = !paused; setButton(); });
  const placeDock = () => { (smallScreen.matches ? mobileNav : desktopNav).append(dock); fit(); };
  placeDock();
  listen(smallScreen, placeDock);
  const setDocked = value => {
    if (value === docked) return;
    docked = value;
    dock.hidden = !value;
    document.body.classList.toggle('journey-docked', value);
    scene.classList.toggle('journey-miniature', value);
    (value ? dock : slot).append(scene);
    scene.setAttribute('aria-label', value ? '城市探險車縮圖' : '探險車穿行藤蔓覆蓋的城市廢墟');
    setButton();
    fit();
    requestAnimationFrame(fit);
  };
  if (typeof ResizeObserver === 'function') {
    const sizes = new ResizeObserver(fit);
    [desktopNav, mobileNav, vehicle].forEach(element => sizes.observe(element));
  }
  window.addEventListener('resize', fit);
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(([entry]) => setDocked(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0)).observe(slot);
  } else window.addEventListener('scroll', () => setDocked(slot.getBoundingClientRect().bottom <= 0), {passive: true});
  const render = state => {
    if (lastStopped !== state.stopped) scene.classList.toggle('journey-stopped', state.stopped);
    lastStopped = state.stopped;
    if (lastDoor !== state.door) {
      vehicle.style.setProperty('--door-open', state.door);
      vehicle.style.setProperty('--ramp-angle', ((1 - state.door) * -95) + 'deg');
      lastDoor = state.door;
    }
    people.forEach((person, index) => {
      const member = state.people[index];
      const last = crewState[index];
      if (!last || member.visible !== last.visible) person.style.visibility = member.visible ? 'visible' : 'hidden';
      if (!last || member.walking !== last.walking) person.classList.toggle('is-walking', member.walking);
      if (member.visible) person.style.transform = `translate(${member.x * width / 100}px,${member.y * height / 100}px) translate(-50%,-100%) scaleX(${member.direction})`;
      crewState[index] = member;
    });
  };
  setButton();
  fit();
  render(JourneyCycle.at(0));
  document.addEventListener('visibilitychange', () => { previousTime = undefined; });
  const tick = now => {
    if (previousTime !== undefined && !paused && !document.hidden && !reducedMotion.matches) elapsed += now - previousTime;
    previousTime = now;
    if (!paused && !document.hidden && now - previousRender >= 40) {
      render(JourneyCycle.at(reducedMotion.matches ? 0 : elapsed));
      previousRender = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // Old Safari versions without WebP decoding can still show the PNG originals.
  const crewProbe = new Image();
  crewProbe.onerror = () => scene.style.setProperty('--crew-art', 'url("journey-crew.png?v=1")');
  crewProbe.src = 'journey-crew.webp?v=1';
  const mechProbe = new Image();
  mechProbe.onerror = () => scene.style.setProperty('--mech-art', 'url("journey-mech.png?v=1")');
  mechProbe.src = 'journey-mech.webp?v=1';
  const motionNote = document.createElement('span');
  motionNote.className = 'journey-static-note';
  motionNote.textContent = '已依系統設定減少動態效果';
  motionNote.hidden = !reducedMotion.matches;
  scene.append(motionNote);
  listen(reducedMotion, () => { motionNote.hidden = !reducedMotion.matches; });
  scene.querySelectorAll('img').forEach(image => {
    const fallback = () => {
      if (!image.src.includes('.webp')) return;
      image.src = image.src.replace('.webp', '.png');
    };
    image.addEventListener('error', fallback);
    if (image.complete && !image.naturalWidth) fallback();
  });
})();
