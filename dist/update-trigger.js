const workflowApi='https://api.github.com/repos/marzlo/Economist/actions/workflows/pages.yml';
let updateTimer=null,updateBusy=false;
const updateMessage=(text,url)=>{const el=$('#update-message');el.textContent=text;if(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent=' 查看執行紀錄 ↗';el.append(a)}};
async function actionRequest(path,options={}){const r=await fetch(path,{...options,headers:{...headers(),'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(r.status===401?'權杖無效或已過期':r.status===403?'權杖需開啟 Economist 的 Actions: Read and write 權限':`GitHub 請求失敗（${r.status}）`);return r.status===204?null:r.json()}
function stopUpdate(){clearTimeout(updateTimer);updateTimer=null;updateBusy=false;$('#trigger-update').disabled=false;$('#trigger-update').textContent='↻ 抓取最新影片'}
async function monitorUpdate(state){
 try{
  if(Date.now()-state.started>20*60*1000){updateMessage('更新時間較長，請查看 GitHub 執行紀錄',state.url||'https://github.com/marzlo/Economist/actions');stopUpdate();return}
  let run;
  if(state.id)run=await actionRequest('https://api.github.com/repos/marzlo/Economist/actions/runs/'+state.id);
  else{const list=await actionRequest(workflowApi+'/runs?event=workflow_dispatch&per_page=10');run=list.workflow_runs.find(r=>!state.previous.includes(r.id)&&new Date(r.created_at).getTime()>=state.started-5000);if(run){state.id=run.id;state.url=run.html_url;localStorage.setItem('economist-update-run',JSON.stringify(state))}}
  if(run?.status==='completed'){
   localStorage.removeItem('economist-update-run');stopUpdate();
   if(run.conclusion==='success'){await load();updateMessage('✓ 最新影片已抓取並發布，頁面已重新載入',run.html_url)}else updateMessage('更新未成功（'+run.conclusion+'），請查看原因後重試',run.html_url);
   return;
  }
  updateMessage((run?.status==='in_progress'?'正在抓取影片與發布網站':'更新已送出，等待 GitHub 執行')+' · '+Math.floor((Date.now()-state.started)/1000)+' 秒',run?.html_url);
  updateTimer=setTimeout(()=>monitorUpdate(state),5000);
 }catch(e){updateMessage(e.message+'；更新可能仍在 GitHub 執行',state.url);stopUpdate()}
}
$('#trigger-update').onclick=async()=>{
 if(updateBusy)return;
 if(!token()){updateMessage('請先設定 GitHub 權杖，並開啟 Actions: Read and write 權限');$('#sync-dialog').showModal();return}
 updateBusy=true;$('#trigger-update').disabled=true;$('#trigger-update').textContent='更新中…';updateMessage('正在啟動更新…');
 try{const previous=await actionRequest(workflowApi+'/runs?event=workflow_dispatch&per_page=10');const state={started:Date.now(),previous:previous.workflow_runs.map(r=>r.id)};await actionRequest(workflowApi+'/dispatches',{method:'POST',body:JSON.stringify({ref:'main'})});localStorage.setItem('economist-update-run',JSON.stringify(state));monitorUpdate(state)}catch(e){updateMessage(e.message);stopUpdate()}
};
try{const state=JSON.parse(localStorage.getItem('economist-update-run'));if(state&&token()&&Date.now()-state.started<20*60*1000){updateBusy=true;$('#trigger-update').disabled=true;$('#trigger-update').textContent='更新中…';monitorUpdate(state)}}catch{}
