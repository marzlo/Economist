const assert=require('node:assert/strict'),geo=require('./dist/review-geography.js'),data=require('./dist/review-geography-data.js'),zoom=require('./dist/review-map-zoom.js');
for(const id of ['it','tw','us','in','au','fr']){const nearby=geo.nearby(data,id),state=zoom.constrain(geo.focus(data,id));assert.equal(nearby[0].id,id);assert.ok(nearby.every(c=>c.capital));assert.ok(state.scale>=1.4&&state.scale<=5);const c=nearby[0];assert.ok(c.xy[0]*state.scale+state.x>=0&&c.xy[0]*state.scale+state.x<=900);console.log(id,state.scale.toFixed(2),nearby.map(c=>c.name).join('、'))}
assert.equal(data.find(c=>c.id==='it').capital,'羅馬');assert.equal(geo.focus(data,'all'),null);
const fs=require('fs');assert.ok(fs.readFileSync('dist/review.js','utf8').includes('if(!period)period=current;'));
