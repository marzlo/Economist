let installPrompt=null;
const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#install-app').textContent='安裝 App'});
window.addEventListener('appinstalled',()=>{$('#install-app').textContent='已安裝';installPrompt=null});
$('#install-app').onclick=async()=>{
 if(installed()){$('#install-message').textContent='你已在 App 模式中';return}
 if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return}
 $('#install-dialog').showModal();
};
$('#install-close').onclick=()=>$('#install-dialog').close();
$('#share-app').onclick=async()=>{const data={title:'下一章閱讀',text:'影片章節與議題整理，可安裝到手機主畫面。',url:'https://marzlo.github.io/Economist/'};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(data.url);$('#install-message').textContent='已複製分享網址'}}catch(e){if(e.name!=='AbortError')$('#install-message').textContent='分享網址：https://marzlo.github.io/Economist/'}};
if(installed())$('#install-app').hidden=true;
// A waiting worker cannot replace an open app until the user chooses to update.
const pageVersion='2026.10.31.2';
const version=document.createElement('p');version.id='app-version';version.className='muted';version.textContent='頁面版本 '+pageVersion;
$('#load-status').after(version);
let appRegistration=null,updateRequested=false,reloading=false;
const notice=document.createElement('div');notice.id='app-update-notice';notice.className='update-message';notice.hidden=true;notice.setAttribute('role','status');
const updateText=document.createElement('span'),updateButton=document.createElement('button');updateButton.type='button';updateButton.textContent='更新至新版';notice.append(updateText,' ',updateButton);document.body.prepend(notice);
function showAppUpdate(){notice.hidden=false;updateText.textContent=document.querySelector('dialog[open]')?'新版已就緒。請先儲存或複製編輯內容，關閉編輯視窗後再更新。':'新版已就緒，更新後即可使用最新修正。'}
function reloadApp(){if(reloading)return;reloading=true;const url=new URL(location.href);url.searchParams.set('app-update',Date.now());location.replace(url.href)}
window.refreshReadingApp=async()=>{
 if(document.querySelector('dialog[open]')){showAppUpdate();return false}
 updateButton.disabled=true;
 try{
  if(appRegistration){await appRegistration.update().catch(()=>{});if(appRegistration.waiting){updateRequested=true;appRegistration.waiting.postMessage({type:'SKIP_WAITING'});setTimeout(()=>{if(!document.querySelector('dialog[open]'))reloadApp()},3000);return true}}
  reloadApp();return true;
 }finally{updateButton.disabled=false}
};
updateButton.onclick=()=>window.refreshReadingApp();
if('serviceWorker' in navigator){
 let controlled=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updateRequested&&!document.querySelector('dialog[open]'))reloadApp();else if(controlled&&navigator.serviceWorker.controller)showAppUpdate();controlled=!!navigator.serviceWorker.controller});
 navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(r=>{
  appRegistration=r;if(r.waiting)showAppUpdate();
  r.addEventListener('updatefound',()=>{const worker=r.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showAppUpdate()})});
  r.update().catch(()=>{});
 }).catch(()=>{$('#install-message').textContent='可從瀏覽器選單加入主畫面'});
}
