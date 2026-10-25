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
const original=[{id:'delete-me',entries:[{id:'unique',text:'only here'}]},{id:'keep-me',entries:[{id:'shared',text:'retain shared note',links:[{url:'https://example.com'}],issueIds:['delete-me','keep-me']}]}];
const remaining=M.removeTopic(original,'delete-me');
assert.equal(remaining.length,1);assert.equal(remaining[0].id,'keep-me');assert.equal(remaining[0].entries[0].text,'retain shared note');assert.deepEqual(remaining[0].entries[0].issueIds,['keep-me']);assert.equal(remaining[0].entries[0].links[0].url,'https://example.com');assert.equal(original.length,2);assert.deepEqual(original[1].entries[0].issueIds,['delete-me','keep-me']);

// Managing one criterion must not reset progress, remove history, or edit siblings.
const tracked={id:'topic',criteria:[{id:'kept',text:'成立專案小組',status:'推進中',updatedAt:'before'},{id:'other',text:'成本評估',status:'已達成'}],entries:[{id:'history',text:'既有進度紀錄'}]};
const renamed=M.saveCriterion(tracked,'成立正式跨部會專案小組','kept',()=>{throw Error('Must preserve ID')});
assert.equal(renamed.criteria[0].id,'kept');assert.equal(renamed.criteria[0].status,'推進中');assert.deepEqual(renamed.criteria[1],tracked.criteria[1]);assert.deepEqual(renamed.entries,tracked.entries);assert.equal(tracked.criteria[0].text,'成立專案小組');
const appended=M.saveCriterion(tracked,'分階段時程',null,()=> 'new');assert.equal(appended.criteria.at(-1).status,'待查證');assert.equal(appended.criteria.at(-1).id,'new');
assert.throws(()=>M.saveCriterion(tracked,'成本評估',null,()=> 'duplicate'),/相同/);assert.throws(()=>M.saveCriterion(tracked,' ',null,()=> 'blank'),/填寫/);assert.throws(()=>M.saveCriterion(tracked,'changed','missing',()=> 'x'),/不存在/);
const removed=M.removeCriterion(tracked,'kept');assert.deepEqual(removed.entries,tracked.entries);assert.equal(removed.criteria.length,1);assert.equal(tracked.criteria.length,2);

const linkedTopic={criteria:[{id:'one',text:'已改名指標'}],entries:[{id:'new',criterionId:'one',title:'舊名稱',label:'進度紀錄'},{id:'legacy',label:'進度紀錄',title:'已改名指標'},{id:'ordinary',title:'已改名指標',label:'筆記'},{id:'removed',criterionId:'different',label:'進度紀錄',title:'已改名指標'}]};
assert.deepEqual(M.criterionRecords(linkedTopic,'one').map(e=>e.id),['new','legacy']);
assert.deepEqual(M.criterionRecords(M.removeCriterion(linkedTopic,'one'),'one').map(e=>e.id),['new']);
