(()=>{
const url=new URL(location.href),id=url.searchParams.get('edit-entry');if(!id)return;
const base=new URL('./',location.href),returnValue=url.searchParams.get('return-to');
let returnURL=null;
try{const candidate=new URL(returnValue||'',base);const relative=candidate.pathname.slice(base.pathname.length);if(candidate.origin===base.origin&&candidate.pathname.startsWith(base.pathname)&&/^weekly\/\d{4}-\d{2}-\d{2}\/(?:index\.html)?$/.test(relative))returnURL=candidate}catch{}
const banner=document.createElement('div');banner.className='entry-link-notice';banner.setAttribute('role','status');
const message=document.createElement('p');message.textContent='正在讀取要編輯的原記事…';banner.append(message);
if(returnURL){const back=document.createElement('a');back.href=returnURL.href;back.textContent='返回這期週報 →';banner.append(back)}
document.querySelector('main').prepend(banner);
const note=document.createElement('p');note.className='muted';note.textContent='正在編輯目前的原記事；已發布週報仍保留當時的內容。';
let opened=false;
function open(){
 if(opened||document.querySelector('dialog[open]'))return;
 const owner=issues.find(topic=>(topic.entries||[]).some(entry=>entry.id===id));
 if(!owner){message.textContent='找不到這篇原記事，可能尚未同步或已被移除。週報仍保留當時版本。';return}
 opened=true;document.getElementById('entry-title').after(note);openEntry(owner.id,id);
 message.textContent='已開啟原記事。儲存後會沿用原本的 GitHub 同步。';
 const clean=new URL(location.href);clean.searchParams.delete('edit-entry');clean.searchParams.delete('return-to');history.replaceState(null,'',clean);
}
document.addEventListener('issues-sync-settled',open);
if(window.issuesSyncSettled||localStorage.getItem('economist-sync-pending'))requestAnimationFrame(open);
document.addEventListener('entry-saved',e=>{if(e.detail?.id===id)message.textContent='原記事已儲存；同步狀態請見頁面上的 GitHub 提示。週報內容未改動。'});
})();
