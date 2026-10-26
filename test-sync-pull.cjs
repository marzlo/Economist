const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
(async()=>{
 for(const pending of [false,true]){
  const base=[{id:'topic',name:'Topic',keys:[],status:'觀察中',then:'',note:'original',entries:[{id:'note',text:'old shared text'}]}];
  const local=structuredClone(base),remote=structuredClone(base);remote[0].entries[0].text='new shared text';if(pending)local[0].note='unsent local observation';
  const stored=new Map([['economist-sync-base',JSON.stringify(base)]]);if(pending)stored.set('economist-sync-pending','1');
  const elements=new Map();const element=()=>({textContent:'',classList:{toggle(){}},append(){}});const $=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
  let writes=0;const context={issues:local,selected:null,$,localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},document:{querySelector:()=>null,createElement:element,addEventListener(){},dispatchEvent(){}},window:{addEventListener(){}},setTimeout(){},setInterval(){},TextEncoder,TextDecoder,atob,btoa,AbortSignal,Event,renderIssues(){},renderNews(){},fetch:async(_,options)=>{if(options.method)writes++;return {ok:true,json:async()=>({sha:'remote',content:Buffer.from(JSON.stringify(remote)).toString('base64')})}}};
  vm.createContext(context);vm.runInContext(fs.readFileSync('dist/sync.js','utf8'),context);await vm.runInContext('pullIssues()',context);
  assert.equal(context.issues[0].entries[0].text,'new shared text');assert.equal(writes,0);
  if(pending){assert.equal(context.issues[0].note,'unsent local observation');assert.ok(stored.has('economist-sync-pending'));assert.ok($('#note-sync-status').textContent.includes('尚未上傳'))}
 }
 console.log('Read-only refresh receives shared edits and preserves pending local changes');
})();
