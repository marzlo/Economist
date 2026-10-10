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
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(r=>r.update()).catch(()=>{$('#install-message').textContent='可從瀏覽器選單加入主畫面'});
