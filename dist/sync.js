const issueEndpoint='https://api.github.com/repos/marzlo/Economist/contents/issues.json';
let issueSha=null,syncBusy=false,syncQueue=Promise.resolve(),syncConflict=false;
if(!localStorage.getItem('economist-legacy-backup'))localStorage.setItem('economist-legacy-backup',JSON.stringify(issues));
let localImport=JSON.parse(localStorage.getItem('economist-legacy-backup'));
const syncMessage=text=>{for(const el of [$('#sync-message'),$('#note-sync-status')].filter(Boolean)){el.textContent=text;el.classList.toggle('sync-error',/失敗|衝突|無效|錯誤|尚未|等待/.test(text));if(el.id==='note-sync-status'&&/尚未|同步失敗/.test(text)){const button=document.createElement('button');button.type='button';button.textContent='同步設定';button.onclick=()=>$('#sync-settings').click();el.append(' ',button)}}};
const token=()=>localStorage.getItem('economist-github-token')||'';
const headers=()=>({Accept:'application/vnd.github+json',...(token()?{Authorization:'Bearer '+token()}:{})});
const encodeIssues=value=>btoa(Array.from(new TextEncoder().encode(JSON.stringify(value,null,2)+'\n'),b=>String.fromCharCode(b)).join(''));
const decodeIssues=value=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g,'')),c=>c.charCodeAt(0))));
function normalizeIssues(value){if(!Array.isArray(value)||!value.every(i=>typeof i.id==='string'&&typeof i.name==='string'&&Array.isArray(i.keys)))throw Error('議題資料格式不正確');return value.map(i=>({...i,entries:i.entries||[],status:i.status||'觀察中',then:i.then||'',note:i.note||''}))}
async function remoteIssues(){
 const r=await fetch(issueEndpoint+'?ref=main&t='+Date.now(),{headers:headers(),cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error(r.status===401?'權杖無效或已過期':'GitHub 讀取失敗（'+r.status+'）');
 const data=await r.json();let value;
 // Contents omits inline content above 1 MB. Fetch the exact blob so the data and PUT SHA agree.
 if(data.encoding==='none'||!data.content){
  const raw=await fetch('https://api.github.com/repos/marzlo/Economist/git/blobs/'+encodeURIComponent(data.sha)+'?t='+Date.now(),{headers:{...headers(),Accept:'application/vnd.github.raw+json'},cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!raw.ok)throw Error('GitHub 完整記事讀取失敗（'+raw.status+'）');
  value=await raw.json();
 }else value=decodeIssues(data.content);
 return {sha:data.sha,issues:normalizeIssues(value)};
}
let baseIssues=JSON.parse(localStorage.getItem('economist-sync-base')||'null');

const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function mergeChanges(base,local,remote){
 if(!base)return local;
 const result=new Map(remote.map(i=>[i.id,i])),old=new Map(base.map(i=>[i.id,i]));
 for(const before of base)if(!local.some(i=>i.id===before.id))result.delete(before.id);
 for(const item of local){const before=old.get(item.id);if(!before){result.set(item.id,item);continue}if(equal(before,item))continue;
 const updated={...(result.get(item.id)||item)};
 for(const key of Object.keys(item))if(key!=='entries'&&!equal(item[key],before[key]))updated[key]=item[key];
 const entries=new Map((updated.entries||[]).map(e=>[e.id,e]));
 for(const e of before.entries||[])if(!(item.entries||[]).some(x=>x.id===e.id))entries.delete(e.id);
 for(const e of item.entries||[])if(!equal(e,(before.entries||[]).find(x=>x.id===e.id)))entries.set(e.id,e);
 updated.entries=[...entries.values()];result.set(item.id,updated)}return [...result.values()];
}
function showSynced(remote){issues=remote;selected=selected?issues.find(i=>i.id===selected.id)||null:null;localStorage.setItem('reading-issues',JSON.stringify(issues));renderIssues();renderNews()}
async function pullIssues(){
 if(syncBusy||document.querySelector('dialog[open]'))return;
 const pending=!!localStorage.getItem('economist-sync-pending');
 if(pending&&token()){window.saveGitHubIssues();return}
 syncBusy=true;
 try{
  const remote=await remoteIssues();issueSha=remote.sha;
  if(pending){
   // Read fresh shared data even without a write token; preserve unsent local edits.
   if(baseIssues){const merged=mergeChanges(baseIssues,issues,remote.issues);baseIssues=remote.issues;localStorage.setItem('economist-sync-base',JSON.stringify(baseIssues));if(!equal(issues,merged))showSynced(merged)}
   syncMessage('本機編輯尚未上傳：此瀏覽器／主畫面 App 尚未設定 GitHub 同步權杖。請開啟「GitHub 同步設定」；本機內容會保留。');
  }else{
   baseIssues=remote.issues;localStorage.setItem('economist-sync-base',JSON.stringify(baseIssues));
   if(!equal(issues,remote.issues))showSynced(remote.issues);
   syncMessage('✓ 記事已與 GitHub 同步 · '+new Date().toLocaleTimeString('zh-TW'));
  }
 }catch(e){syncMessage('同步失敗：'+e.message+'；保留本機資料')}
 finally{syncBusy=false;window.issuesSyncSettled=true;document.dispatchEvent(new Event('issues-sync-settled'))}
}
window.saveGitHubIssues=function(){localStorage.setItem('economist-sync-pending','1');if(!token()){syncMessage('已保存在本機，尚未上傳：請在此瀏覽器／主畫面 App 的「GitHub 同步設定」設定權杖，其他裝置才會看到編輯');return}const snapshot=JSON.parse(JSON.stringify(issues));syncQueue=syncQueue.then(async()=>{syncBusy=true;try{syncMessage('正在自動儲存至 GitHub…');const base=baseIssues;let saved;
 for(let attempt=0;attempt<3;attempt++){const remote=await remoteIssues();const merged=mergeChanges(base,snapshot,remote.issues);const r=await fetch(issueEndpoint,{method:'PUT',signal:AbortSignal.timeout(20000),headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({message:'Update reading issues and notes',content:encodeIssues(merged),sha:remote.sha,branch:'main'})});if(r.status===409||r.status===422)continue;if(!r.ok)throw Error(r.status===401?'權杖無效或已過期':r.status===403?'權杖需要 Economist 的 Contents: Read and write 權限':'GitHub 儲存失敗（'+r.status+'）');issueSha=(await r.json()).content.sha;saved=merged;break}
 if(!saved)throw Error('其他裝置正在更新，稍後會自動重試');baseIssues=saved;localStorage.setItem('economist-sync-base',JSON.stringify(saved));if(equal(snapshot,issues)){localStorage.removeItem('economist-sync-pending');showSynced(saved)}syncMessage('✓ 已自動儲存至 GitHub · '+new Date().toLocaleTimeString('zh-TW'))
 }catch(e){syncMessage('同步失敗：'+e.message+'；本機內容保留，稍後自動重試')}finally{syncBusy=false}})};
$('#sync-settings').onclick=()=>{$('#sync-token').value='';$('#sync-dialog').showModal()};
$('#sync-close').onclick=()=>$('#sync-dialog').close();
$('#sync-forget').onclick=()=>{localStorage.removeItem('economist-github-token');$('#sync-dialog').close();syncMessage('已清除此裝置權杖')};
$('#sync-form').onsubmit=e=>{e.preventDefault();const value=$('#sync-token').value.trim();if(!value)return;localStorage.setItem('economist-github-token',value);$('#sync-token').value='';$('#sync-dialog').close();syncMessage('權杖已設定，正在自動同步…');if(localStorage.getItem('economist-sync-pending'))window.saveGitHubIssues();else pullIssues()};
$('#sync-pull').onclick=pullIssues;
setTimeout(pullIssues,0);
setInterval(()=>{if(!document.hidden)pullIssues()},15000);
window.addEventListener('focus',pullIssues);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)pullIssues()});
window.addEventListener('online',pullIssues);
