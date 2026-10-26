const assert = require('node:assert/strict');
const cycle = require('./dist/journey-cycle.js');
assert.equal(cycle.at(0).door, 0);
assert.equal(cycle.at(3499).stopped, false);
assert.equal(cycle.at(3500).stopped, true);
assert.equal(cycle.at(5200).door, 1);
assert.equal(cycle.at(9500).person.walking, false);
assert.equal(cycle.at(11000).person.direction, -1);
assert.equal(cycle.at(14300).person.visible, false);
assert.equal(cycle.at(15700).door, 0);
assert.equal(cycle.at(16500).stopped, false);
for (let t = 0; t < cycle.duration; t += 50) {
  const s = cycle.at(t);
  assert.ok(s.door >= 0 && s.door <= 1);
  if (s.person.visible) {
    assert.equal(s.stopped, true, 'person may leave only while stopped');
    assert.equal(s.door, 1, 'ramp must be fully open while occupied');
  }
  if (!s.stopped) assert.equal(s.door, 0, 'door must close before driving');
}
assert.ok(cycle.at(7000).person.x < cycle.at(8500).person.x);
assert.ok(cycle.at(11500).person.x > cycle.at(13500).person.x);
assert.deepEqual(cycle.at(cycle.duration), cycle.at(0));
console.log('Journey stop, door, walking and loop timeline passed');
