const assert=require('node:assert/strict'),M=require('./dist/civic-model.js');
assert.equal(M.scopes.length,24);
assert.equal(M.safeUrl('javascript:alert(1)'),null);
assert.equal(M.safeUrl('data:text/html,bad'),null);
const topic={keys:['松山機場']};
const result=M.recommendations(topic,[
 {title:'台北松山機場新消息',url:'https://example.com/a',published:'2026-10-24'},
 {title:'無關新聞',url:'https://example.com/b'},
 {title:'松山機場',url:'javascript:bad'},
 {title:'松山機場重複',url:'https://example.com/a'}
],[{title:'航空專題',description:'松山機場的替代方案',url:'https://example.com/v',published:'2026-10-23'}]);
assert.deepEqual(result.map(i=>i.url),['https://example.com/a','https://example.com/v']);
assert.equal(result[1].type,'影片');
assert.equal(M.normalize('台北'),'臺北');
const old={id:'old',text:'成立專案小組',status:'推進中'};
assert.deepEqual(M.criteria('成立專案小組\n 新方案\n新方案',[old],()=> 'new'),[old,{id:'new',text:'新方案',status:'待查證'}]);
console.log('Public topic matching, deduplication, URL safety and indicator history passed');
const credits={'臺北市':{file:'landmarks/landmark-02.jpg',source:'https://commons.wikimedia.org/wiki/File:example.jpg'}};
assert.equal(M.landmark('臺北市',credits).file,'landmarks/landmark-02.jpg');
assert.equal(M.landmark('臺北市',{'臺北市':{file:'https://untrusted.example/x.jpg',source:'https://example.com'}}),null);
assert.equal(M.landmark('臺北市',{'臺北市':{file:'landmarks/../../x.jpg',source:'https://example.com'}}),null);
assert.equal(M.landmark('不存在',credits),null);
const catalog=require('./dist/landmarks/catalog.json');
assert.deepEqual(Object.keys(catalog).sort(),[...M.scopes].sort());
