const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'dist'),catalog=JSON.parse(fs.readFileSync(path.join(root,'weekly/index.json'),'utf8'));
assert(catalog.issues.some(issue=>issue.id===catalog.latest));
for(const issue of catalog.issues){
 const dir=path.resolve(root,issue.path);assert(dir.startsWith(root+path.sep));
 const data=JSON.parse(fs.readFileSync(path.join(dir,'report-data.json'),'utf8'));
 assert.equal(data.start,issue.start);assert.equal(data.end,issue.end);assert.equal(data.notes.length,issue.notes);
 const ids=data.notes.map(n=>n.id);assert.equal(new Set(ids).size,ids.length);
 const assigned=data.chapters.flatMap(c=>c.ids);assert.equal(new Set(assigned).size,assigned.length);assert.deepEqual([...assigned].sort(),[...ids].sort());
 for(const note of data.notes){assert(note.statDate>=issue.start&&note.statDate<=issue.end);for(const link of note.links)assert(['https:','http:'].includes(new URL(link.url).protocol))}
 assert.equal(new Set(data.notes.flatMap(n=>n.topics.map(t=>t.id))).size,issue.topics);
 assert.equal(new Set(data.notes.flatMap(n=>n.links).map(l=>new URL(l.url)).filter(u=>u.hostname==='www.youtube.com').map(u=>u.searchParams.get('v'))).size,issue.videos);
 assert.deepEqual(issue.chapters.map(c=>c.notes),data.chapters.map(c=>c.ids.length));
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');assert(!html.includes('設計預覽'));assert(!html.includes('尚未加入正式網站'));assert(html.includes('href="../../#weekly-review"'));
 const embedded=html.match(/const DATA=(\{[\s\S]*?\})\s*;\s*(?:const esc=|<\/script>)/);assert(embedded);assert.deepEqual(JSON.parse(embedded[1]),data);
 const quote=data.quote?.text||(!data.ai&&issue.id==='2026-10-12'?'人類的價值在於思考，思考重視的就是過程，也就是理解。':null);if(quote){assert(data.notes.some(n=>n.text.includes(quote)));if(!data.ai)assert(html.includes(quote))}
 for(const resource of ['weekly-review.pdf','weekly-review.md'])assert(fs.statSync(path.join(dir,resource)).size>0);assert(fs.existsSync(path.join(dir,'weekly-hero.png'))||fs.existsSync(path.join(root,'weekly/weekly-hero.png')));
 if(issue.id===catalog.latest){const home=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(home.includes('id="weekly-review"'));assert(home.includes('href="'+issue.path+'"'))}
}
console.log('Weekly archive validated: dates, unique notes, chapter coverage, source counts, original quote, downloads and homepage route');
