/* Shared timeline for the header and the docked miniature. Times are milliseconds. */
((root) => {
  const duration = 20000;
  const clamp = x => Math.max(0, Math.min(1, x));
  const mix = (a, b, x) => a + (b - a) * clamp(x);
  function at(elapsed) {
    const t = ((elapsed % duration) + duration) % duration;
    const stopped = t >= 3500 && t < 16500;
    const door = t < 3800 ? 0 : t < 5200 ? clamp((t - 3800) / 1400) : t < 14300 ? 1 : 1 - clamp((t - 14300) / 1400);
    let x = 84, y = 73, direction = 1;
    if (t < 8000) { x = mix(84, 99, (t - 5600) / 2400); y = mix(73, 97, (t - 5600) / 2400); }
    else if (t < 9500) { x = mix(99, 110, (t - 8000) / 1500); y = 97; }
    else if (t < 10800) { x = 110; y = 97; }
    else if (t < 12300) { x = mix(110, 99, (t - 10800) / 1500); y = 97; direction = -1; }
    else { x = mix(99, 84, (t - 12300) / 2000); y = mix(97, 73, (t - 12300) / 2000); direction = -1; }
    const visible = t >= 5600 && t < 14300;
    const walking = visible && !(t >= 9500 && t < 10800);
    const opacity = visible ? Math.min(1, (t - 5600) / 250, (14300 - t) / 250) : 0;
    return {t, stopped, door, person: {x, y, direction, visible, walking, opacity}};
  }
  root.JourneyCycle = {at, duration};
  if (typeof module !== 'undefined') module.exports = root.JourneyCycle;
})(globalThis);
