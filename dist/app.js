const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaults=[{id:'ai',name:'AI 繁榮背後的代價',keys:['AI','人工智慧','算力'],note:'追蹤技術發展如何改變稅制、商業責任與社會信任。'},{id:'world',name:'國際秩序與同盟信任',keys:['歐洲','美國','國防','同盟','外交'],note:'從各地的政治與安全議題，觀察國際關係的變化。'},{id:'economy',name:'全球資本與經濟變局',keys:['金融','美股','美債','稅制','銀行'],note:'整理市場、公共財政與資金流向的相關閱讀。'}];
let issues;try{issues=JSON.parse(localStorage.getItem('reading-issues'))||defaults}catch{issues=defaults}let videos=[],category='全部',selected=null,limit=10;
if(localStorage.getItem('reading-theme')==='dark')document.body.classList.add('dark');
const save=()=>{localStorage.setItem('reading-issues',JSON.stringify(issues));if(window.saveGitHubIssues)window.saveGitHubIssues()};
const date=s=>new Date(s).toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'});
const matches=(v,i)=>chapters(v).some(c=>chapterMatches(c.title,chapterTerms(i)));
function renderNews(){let q=$('#search').value.toLowerCase(),list=videos.filter(v=>(category==='全部'||v.category===category)&&(!selected||matches(v,selected))&&(v.title+' '+v.description).toLowerCase().includes(q));$('#count').textContent=`${list.length} 部`;$('#news').innerHTML=list.slice(0,limit).map(v=>`<article><a href="${esc(v.url)}" target="_blank" rel="noopener"><img src="${esc(v.thumbnail)}" alt="影片縮圖" loading="lazy"></a><div><div class="meta"><span class="tag">${esc(v.category)}</span><time>${date(v.published)}</time></div><h3><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a></h3><p>${esc((v.description||'').replace(/https?:\/\/\S+/g,'').split('\n').filter(Boolean).slice(0,3).join(' ').slice(0,170))}${v.description?.length>170?'…':''}</p><a class="watch" href="${esc(v.url)}" target="_blank" rel="noopener">觀看影片 ↗</a>${chapterList(v)}</div></article>`).join('')||'<p class="muted">沒有符合條件的影片。</p>';$('#more').hidden=list.length<=limit;$('#filter').innerHTML=selected?`議題篩選：${esc(selected.name)} <button id="clear">清除 ×</button>`:'';$('#clear')?.addEventListener('click',()=>{selected=null;renderNews()})}
function renderIssues(){if(window.renderIssueManager)window.renderIssueManager()}
function renderTabs(){$('#tabs').innerHTML=['全部',...new Set(videos.map(v=>v.category))].map(c=>`<button class="${c===category?'active':''}" aria-pressed="${c===category}">${esc(c)}</button>`).join('');$('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{category=b.textContent;limit=10;renderTabs();renderNews()})}
async function load(){
 if($('#refresh').disabled)return;
 const started=performance.now(),status=$('#load-status'),bar=$('#load-progress'),message=$('#load-message');
 status.hidden=false;bar.removeAttribute('value');$('#refresh').disabled=true;$('#refresh').textContent='載入中…';
 const timer=setInterval(()=>{message.textContent='讀取已發布的影片資料 · '+((performance.now()-started)/1000).toFixed(1)+' 秒'},100);
 try{
  const response=await fetch('videos.json?t='+Date.now(),{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);
  const total=Number(response.headers.get('content-length'));let data;
  if(response.body&&total>0&&!response.headers.get('content-encoding')){
   const reader=response.body.getReader(),chunks=[];let received=0;
   while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.length;bar.value=Math.min(99,received/total*100)}
   data=JSON.parse(await new Blob(chunks).text());
  }else data=await response.json();
  if(!Array.isArray(data.videos))throw Error('資料格式錯誤');
  videos=data.videos.sort((a,b)=>new Date(b.published)-new Date(a.published));$('#updated').textContent=new Date(data.updated).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false});renderTabs();renderNews();renderIssues();bar.value=100;message.textContent='已載入 '+videos.length+' 部影片 · '+((performance.now()-started)/1000).toFixed(1)+' 秒';
 }catch(error){bar.value=0;message.textContent='載入失敗，請重試 · '+((performance.now()-started)/1000).toFixed(1)+' 秒';if(!videos.length){$('#updated').textContent='讀取失敗，請稍後重試';$('#news').textContent='暫時無法讀取影片資料。'}
 }finally{clearInterval(timer);$('#refresh').disabled=false;$('#refresh').textContent='↻ 重新載入'}
}
$('#search').oninput=()=>{limit=10;renderNews()};$('#more').onclick=()=>{limit+=10;renderNews()};$('#refresh').onclick=load;$('#theme').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('reading-theme',document.body.classList.contains('dark')?'dark':'light')};$('#add').onclick=()=>openIssueEditor();$('#cancel').onclick=()=>$('#editor').close();$('#issue-form').onsubmit=e=>saveIssueForm(e);$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(issues,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='reading-issues.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
