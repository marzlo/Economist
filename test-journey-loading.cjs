const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
(async () => {
  const events = {}, stored = new Map();
  let fetches = 0, preloaded;
  const cache = {
    match: async request => stored.get(request.url),
    put: async (request, response) => stored.set(request.url, response),
    addAll: async urls => { preloaded = urls; }
  };
  const context = {URL, Response, self: {location: new URL('https://example.test/Economist/sw.js'), addEventListener:(type, callback)=>events[type]=callback}, caches: {open:async()=>cache}, fetch:async()=>{fetches++;return new Response('art');}};
  vm.runInNewContext(fs.readFileSync('dist/sw.js','utf8'), context);
  let installing;
  events.install({waitUntil: promise => installing = promise});
  await installing;
  assert.ok(!preloaded.some(url => /journey-.*\.(webp|png)/.test(url)), 'bulk install must not compete with initial artwork');
  async function requestArt() {
    let response;
    const writes = [];
    events.fetch({request:{url:'https://example.test/Economist/journey-vehicle.webp?v=1',method:'GET',headers:new Headers()},respondWith:p=>response=p,waitUntil:p=>writes.push(p)});
    assert.equal(await (await response).text(), 'art');
    await Promise.all(writes);
  }
  await requestArt();
  await requestArt();
  assert.equal(fetches, 1, 'cached versioned artwork must not wait for network again');
  console.log('Journey cache-first artwork and non-blocking install passed');
})();
