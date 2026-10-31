const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const quotaExceeded of [false,true]){
 const original=[{id:'topic',name:'Topic',keys:['test'],entries:[{id:'old',text:'x'.repeat(1100000),images:[]}]}];
 const stored=new Map([['reading-issues',JSON.stringify(original)]]),elements=new Map();let closed=false,syncs=0;
 const $=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',close(){closed=true}});return elements.get(id)};
 $('#entry-text').value='這次只有新增文字，沒有貼圖片。';$('#entry-date').value='2026-10-31';$('#entry-label').value='筆記';
 const context={$,window:{saveGitHubIssues(){syncs++}},localStorage:{getItem:key=>stored.get(key)||null,setItem(key,value){if(quotaExceeded&&key==='reading-issues')throw Object.assign(new Error('Storage full'),{name:'QuotaExceededError'});stored.set(key,value)}},document:{querySelector:$,body:{classList:{add(){}}},querySelectorAll:selector=>selector==='#entry-issues input:checked'?[{value:'topic'}]:[],dispatchEvent(){}},EntryImages:{get:()=>[],mount(){}},NoteContent:{normalize:value=>value},renderIssues(){},load(){},crypto:require('node:crypto').webcrypto,CustomEvent:class{},videos:[],esc:String,TextEncoder};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('dist/app.js','utf8').split('const date=')[0],context);
 vm.runInContext(fs.readFileSync('dist/entry-relations.js','utf8'),context);
 vm.runInContext(fs.readFileSync('dist/issues.js','utf8'),context);
 $('#entry-form').onsubmit({preventDefault(){}});
 const saved=JSON.parse(stored.get('reading-issues'));
 assert.equal(saved[0].entries[0].text,original[0].entries[0].text);
 if(quotaExceeded){assert.equal(saved[0].entries.length,1);assert.equal(vm.runInContext('issues[0].entries.length',context),1);assert.equal(closed,false);assert.equal(syncs,0);assert.match($('#entry-error').textContent,/本機儲存空間不足/)}
 else{assert.equal(saved[0].entries.length,2);assert.equal(saved[0].entries[1].text,$('#entry-text').value);assert.equal(closed,true);assert.equal(syncs,1);assert.equal($('#entry-error').textContent,'')}
}
console.log('Text-only notes save beyond 1 MB; real storage failures keep the editor and original data intact');
