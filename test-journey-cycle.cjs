const assert = require('node:assert/strict');
const cycle = require('./dist/journey-cycle.js');
assert.equal(cycle.at(0).door, 0);
assert.equal(cycle.at(3499).stopped, false);
assert.equal(cycle.at(3500).stopped, true);
assert.equal(cycle.at(5200).door, 1);
assert.equal(cycle.at(22000).stopped, false);
assert.equal(cycle.at(20700).door, 0);
for (let t = 0; t < cycle.duration; t += 50) {
  const s = cycle.at(t);
  assert.equal(s.people.length, 3);
  for (const p of s.people) if (p.visible) {
    assert.equal(s.stopped, true, 'crew may leave only while stopped');
    assert.equal(s.door, 1, 'ramp stays fully open until everyone is inside');
  }
  if (!s.stopped) assert.equal(s.door, 0);
}
assert.equal(cycle.at(6000).people.filter(p => p.visible).length, 1);
assert.equal(cycle.at(9000).people.filter(p => p.visible).length, 3);
for (let i = 0; i < 3; i++) {
  const enters = cycle.at(5600 + i * 650 + 11490).people[i];
  assert.equal(enters.direction, -1);
  assert.ok(enters.x + 2.4 < 84, 'person is behind doorway occlusion before hiding');
  assert.equal(enters.visible, true);
  assert.equal(cycle.at(5600 + i * 650 + 11500).people[i].visible, false);
}
assert.deepEqual(cycle.at(cycle.duration), cycle.at(0));
console.log('Three-person crew, doorway occlusion and stop/resume timeline passed');
