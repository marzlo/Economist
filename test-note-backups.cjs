const assert=require('node:assert/strict'),{scan}=require('./dist/note-backups.js');
const topic={id:'teacher',name:'臺北市國中缺師',kind:'civic',scope:'臺北市',entries:[{id:'note',text:'代課教師'}]};
const data={'reading-issues':'[]','economist-sync-base':'malformed','economist-legacy-backup':JSON.stringify([topic])};
const reads=[];const found=scan(k=>{reads.push(k);return data[k]},'缺師 國中');
assert.equal(found.length,1);assert.equal(found[0].name,topic.name);assert.deepEqual(found[0].sources,['早期本機備份']);assert.ok(!reads.some(k=>k.includes('token')));assert.equal(scan(k=>data[k],'不存在的內容').length,0);assert.equal(scan(k=>data[k],'').length,0);assert.equal(data['economist-legacy-backup'],JSON.stringify([topic]));
console.log('Read-only local backup search finds historical topics and never reads tokens');
