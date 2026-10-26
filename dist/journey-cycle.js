/* One deterministic timeline, shared by both scenes. Milliseconds. */
((root) => {
  const duration = 26000;
  const clamp = x => Math.max(0, Math.min(1, x));
  const mix = (a, b, x) => a + (b - a) * clamp(x);
  function member(t, index) {
    const local = t - (5600 + index * 650);
    const far = 108 + index * 4;
    let x = 81, y = 80, direction = 1;
    if (local < 700) x = mix(81, 87, local / 700);
    else if (local < 2800) { x = mix(87, 99, (local - 700) / 2100); y = mix(80, 97, (local - 700) / 2100); }
    else if (local < 4300) { x = mix(99, far, (local - 2800) / 1500); y = 97; }
    else if (local < 7000) { x = far; y = 97; }
    else if (local < 8500) { x = mix(far, 99, (local - 7000) / 1500); y = 97; direction = -1; }
    else if (local < 10800) { x = mix(99, 87, (local - 8500) / 2300); y = mix(97, 80, (local - 8500) / 2300); direction = -1; }
    else { x = mix(87, 81, (local - 10800) / 700); y = 80; direction = -1; }
    const visible = local >= 0 && local < 11500;
    return {x, y, direction, visible, walking: visible && !(local >= 4300 && local < 7000)};
  }
  function at(elapsed) {
    const t = ((elapsed % duration) + duration) % duration;
    const stopped = t >= 3500 && t < 22000;
    const door = t < 3800 ? 0 : t < 5200 ? clamp((t - 3800) / 1400) : t < 19000 ? 1 : 1 - clamp((t - 19000) / 1700);
    return {t, stopped, door, people: [0, 1, 2].map(index => member(t, index))};
  }
  root.JourneyCycle = {at, duration};
  if (typeof module !== 'undefined') module.exports = root.JourneyCycle;
})(globalThis);
