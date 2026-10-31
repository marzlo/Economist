const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({waiting=true,controlled=true}={}){
 const elements=new Map(),messages=[],reloads=[],timers=[],listeners={};let dialogOpen=false;
 const element=()=>({hidden:false,textContent:'',disabled:false,children:[],setAttribute(){},append(...items){this.children.push(...items)},after(){}});
 const $=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
 const registration={waiting:waiting?{postMessage:value=>messages.push(value)}:null,addEventListener(){},async update(){}};
 const worker={controller:controlled?{}:null,async register(){return registration},addEventListener:(name,fn)=>listeners[name]=fn};
 const context={window:{matchMedia:()=>({matches:false}),addEventListener(){}},navigator:{serviceWorker:worker},document:{createElement:element,body:{prepend(){}},querySelector:()=>dialogOpen?{}:null},$,URL,location:{href:'https://example.com/Economist/#issues',replace:url=>reloads.push(url)},Date,setTimeout:fn=>timers.push(fn)};
 vm.createContext(context);vm.runInContext(fs.readFileSync('dist/pwa.js','utf8'),context);
 return {context,worker,messages,reloads,timers,listeners,$,setDialog:open=>dialogOpen=open,registration};
}
(async()=>{
 const test=fixture();await Promise.resolve();await Promise.resolve();
 assert.equal(test.reloads.length,0,'A waiting update never reloads an open page automatically');
 test.setDialog(true);assert.equal(await test.context.window.refreshReadingApp(),false);assert.equal(test.messages.length,0);assert.equal(test.reloads.length,0);
 test.setDialog(false);await test.context.window.refreshReadingApp();assert.equal(test.messages[0].type,'SKIP_WAITING');assert.equal(test.reloads.length,0);
 test.listeners.controllerchange();assert.equal(test.reloads.length,1);const url=new URL(test.reloads[0]);assert.ok(url.searchParams.has('app-update'));assert.equal(url.hash,'#issues');
 for(const timer of test.timers)timer();assert.equal(test.reloads.length,1,'Worker activation and fallback cannot reload twice');
 const fresh=fixture({waiting:false,controlled:false});await Promise.resolve();fresh.worker.controller={};fresh.listeners.controllerchange();assert.equal(fresh.reloads.length,0);
 const plain=fixture({waiting:false});await Promise.resolve();await plain.context.window.refreshReadingApp();assert.equal(plain.reloads.length,1);
 // New workers activate only after an explicit message, never during installation.
 const handlers={};let activations=0,waited=false;
 vm.runInNewContext(fs.readFileSync('dist/sw.js','utf8'),{self:{location:new URL('https://example.com/Economist/sw.js'),addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>{activations++;return Promise.resolve()}},URL});
 assert.equal(activations,0);handlers.message({data:{type:'SKIP_WAITING'},waitUntil:()=>waited=true});assert.equal(activations,1);assert.ok(waited);
 console.log('App updates require a user action, protect open editors, reload once with fresh URL and leave browser data intact');
})().catch(error=>{console.error(error);process.exitCode=1});
