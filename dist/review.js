(()=>{
const root=document.getElementById('reading-review'),M=ReviewModel;
let mode='map',period=null,region='all',topic='all',selectedNote=null,outline=false,mapData=null,loaded=false,signature='';
const h=s=>esc(s),regionName=id=>M.regions.find(r=>r[0]===id)?.[1]||({global:'全球／未指定',all:'所有地區'}[id]||id);
const addDays=(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return M.iso(d)};
const periodLabel=s=>s==='all'?'所有記事':s.replaceAll('-','/')+' — '+addDays(s,6).slice(5).replace('-','/');
function links(n){return (n.links||[]).filter(l=>safeLink(l.url)).map(l=>`<a target="_blank" rel="noopener" href="${h(safeLink(l.url))}">↗ ${h(l.title||l.url)}</a>`).join('')}
function tags(n){return n.topics.map(t=>`<span class="rv-tag">${h(t.name)}</span>`).join('')}
function body(n){return `<p class="rv-text">${h(n.text||'')}</p><div class="rv-sources">${links(n)}</div>`}
function noteRow(n){return `<details class="rv-note"><summary><time>${h(n.date||n.statDate)}</time><div><span class="rv-note-title">${h(n.title)}</span><div class="rv-tags">${tags(n)}</div></div><span aria-hidden="true">›</span></summary><div class="rv-note-body">${body(n)}<button type="button" data-edit-review="${h(n.id)}">編輯記事</button></div></details>`}
function empty(){return `<div class="rv-empty"><h3>這個期間還沒有記事</h3><p>可切換其他週次或「所有記事」查看累積內容。</p></div>`}
function render(){
 activeObservers.forEach(o=>o.disconnect());activeObservers=[];
 const all=M.collect(issues),now=M.taipeiDate(Date.now()),current=M.weekStart(now);
 if(!period)period=addDays(current,-7);
 const weekly=all.filter(n=>M.inWeek(n,period)),topicList=[...new Map(weekly.flatMap(n=>n.topics).map(t=>[t.id,t])).values()];
 if(topic!=='all'&&!topicList.some(t=>t.id===topic))topic='all';
 const weekOptions=M.options(all,now);if(period!=='all'&&!weekOptions.includes(period))weekOptions.push(period);
 root.innerHTML=`<div class="rv-heading"><div><div class="eyebrow">READING FOOTPRINTS</div><h2>閱讀足跡</h2><p>回看記事，連起你的閱讀與思考。</p></div><div class="rv-controls"><label>回顧期間<select id="rv-period">${weekOptions.sort().reverse().map(w=>`<option value="${w}" ${period===w?'selected':''}>${w===current?'本週 · ':w===addDays(current,-7)?'上週 · ':''}${periodLabel(w)}</option>`).join('')}<option value="all" ${period==='all'?'selected':''}>所有記事</option></select></label></div></div><div class="rv-stats"><div><span>${period==='all'?'期間記事':period===addDays(current,-7)?'上週記事':period===current?'本週記事':'該週記事'}</span><strong>${weekly.length}<small>篇</small></strong></div><div><span>涉及議題</span><strong>${topicList.length}<small>個</small></strong></div><div><span>整體累積</span><strong>${all.length}<small>篇</small></strong></div></div><div class="rv-mode-tabs" role="tablist" aria-label="閱讀呈現方式">${[['map','世界地圖'],['paper','每週閱讀報紙'],['stars','閱讀星圖']].map(([id,name])=>`<button type="button" role="tab" id="rv-tab-${id}" aria-controls="rv-panel" aria-selected="${mode===id}" data-mode="${id}">${name}</button>`).join('')}</div><div id="rv-panel" role="tabpanel" aria-labelledby="rv-tab-${mode}"></div><p class="rv-stat-note">同篇跨議題只計一次 · 台灣時間週一至週日 · 舊記事依填寫日期，新記事依建立日期統計</p>`;
 root.querySelector('#rv-period').onchange=e=>{period=e.target.value;region='all';topic='all';selectedNote=null;render()};
 root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;render()});
 const panel=root.querySelector('#rv-panel');
 if(mode==='map')renderMap(panel,weekly);else if(mode==='paper')renderPaper(panel,weekly,topicList);else renderStars(panel,weekly,topicList);
 root.querySelectorAll('[data-edit-review]').forEach(b=>b.onclick=()=>{const n=all.find(n=>n.id===b.dataset.editReview);if(n?.topics[0])openEntry(n.topics[0].id,n.id)});
 signature=JSON.stringify(issues);
}
function renderMap(panel,notes){
 const ids=['all',...M.regions.filter(r=>notes.some(n=>n.regionIds.includes(r[0]))).map(r=>r[0]),...(notes.some(n=>n.regionIds.includes('global'))?['global']:[])];
 if(!ids.includes(region))region='all';
 const list=region==='all'?notes:notes.filter(n=>n.regionIds.includes(region));
 panel.innerHTML=`<div class="rv-section-head"><h3>這一週，讀到了哪裡？</h3><span>地區依記事文字推測，可在編輯時指定</span></div><div class="rv-map" aria-label="記事地區世界地圖">${mapData?`<svg viewBox="0 0 900 330" role="img" aria-label="世界地圖上的記事分布">${mapData.paths.map(d=>`<path class="rv-land" d="${d}"/>`).join('')}${mapData.points.map(p=>{const count=notes.filter(n=>n.regionIds.includes(p.id)).length;if(!count)return '';const [x,y]=p.xy;return `<g class="rv-map-point" data-map-region="${p.id}" style="opacity:${region==='all'||region===p.id?1:.3}"><circle cx="${x}" cy="${y}" r="${19+Math.min(count,6)*2}" class="rv-halo"/><circle cx="${x}" cy="${y}" r="12"/><text x="${x}" y="${y+4}" text-anchor="middle" class="rv-map-count">${count}</text><text x="${x}" y="${y-29}" class="rv-map-label" text-anchor="middle">${regionName(p.id)}</text></g>`}).join('')}</svg>`:'<p class="muted">地圖載入中，仍可從下方選擇地區。</p>'}</div><div class="rv-region-tabs">${ids.map(id=>`<button type="button" data-region="${id}" aria-pressed="${region===id}">${regionName(id)} ${id==='all'?notes.length:notes.filter(n=>n.regionIds.includes(id)).length}</button>`).join('')}</div><div class="rv-section-head"><h3>${regionName(region)}的記事</h3><span>${list.length} 篇 · 多地區記事可出現在多區</span></div>${list.length?list.map(noteRow).join(''):empty()}`;
 panel.querySelectorAll('[data-region],[data-map-region]').forEach(b=>b.onclick=()=>{region=b.dataset.region||b.dataset.mapRegion;render()});
}
function renderPaper(panel,notes,topics){
 if(!notes.length){panel.innerHTML=empty();return}
 const lead=notes[0],counts=topics.map(t=>({...t,count:notes.filter(n=>n.topics.some(i=>i.id===t.id)).length})).sort((a,b)=>b.count-a.count);
 panel.innerHTML=`<div class="rv-paper-meta"><span>THE NEXT CHAPTER / WEEKLY EDITION</span><span>${h(periodLabel(period))} · ${notes.length} 篇記事</span></div><h3 class="rv-masthead">本 週 思 考</h3><div class="rv-paper-grid"><article class="rv-lead"><div class="eyebrow">本期選讀 · 最近一篇記事</div><div class="rv-topic-art" aria-label="本期議題記事分布">${counts.slice(0,4).map(t=>`<div><span>${h(t.name)}</span><div class="rv-topic-track"><div style="width:${t.count/notes.length*100}%"></div></div><b>${t.count} 篇</b></div>`).join('')}<small>同篇可關聯多議題，篇數不相加</small></div><h3>${h(lead.title)}</h3><div class="rv-tags">${tags(lead)}</div><p class="rv-lead-excerpt">${h((lead.text||'').slice(0,200))}${lead.text?.length>200?'…':''}</p><details class="rv-note"><summary><span>閱讀完整記事與來源</span><span>›</span></summary><div class="rv-note-body">${body(lead)}<button data-edit-review="${h(lead.id)}" type="button">編輯記事</button></div></details></article><div><div class="eyebrow">${notes.length>1?'其餘 '+(notes.length-1)+' 篇 · 閱讀摘記':'本期只有這篇記事'}</div>${notes.slice(1).map(noteRow).join('')}</div></div>`;
}
function renderStars(panel,notes,topicList){
 if(!notes.length){panel.innerHTML=empty();return}
 let visible=notes.filter(n=>topic==='all'||n.topics.some(t=>t.id===topic));
 const graphNotes=visible.slice(0,12);if(!graphNotes.some(n=>n.id===selectedNote))selectedNote=graphNotes[0]?.id;
 const focus=graphNotes.find(n=>n.id===selectedNote);
 panel.innerHTML=`<div class="rv-star-tools"><div class="rv-region-tabs"><button data-topic="all" aria-pressed="${topic==='all'}">全部議題</button>${topicList.map(t=>`<button data-topic="${h(t.id)}" aria-pressed="${topic===t.id}">${h(t.name)}</button>`).join('')}</div><label>節點顯示<select id="rv-star-mode"><option value="title" ${outline?'':'selected'}>短標題</option><option value="outline" ${outline?'selected':''}>大綱摘錄</option></select></label></div><div class="rv-star-board"><svg class="rv-star-lines" aria-hidden="true"></svg><div class="rv-star-nodes"></div></div><p class="rv-stat-note">連線代表議題關聯 · 本圖顯示 ${graphNotes.length}／${visible.length} 篇，全部記事列於下方</p>${focus?`<div class="rv-focus" aria-live="polite"><div class="eyebrow">${h(focus.date)} · 選中的記事</div><h3>${h(focus.title)}</h3><div class="rv-tags">${tags(focus)}</div>${body(focus)}<button data-edit-review="${h(focus.id)}" type="button">編輯記事</button></div>`:''}<div class="rv-section-head"><h3>記事清單</h3><span>${visible.length} 篇</span></div>${visible.map(noteRow).join('')}`;
 panel.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{topic=b.dataset.topic;render()});panel.querySelector('#rv-star-mode').onchange=e=>{outline=e.target.value==='outline';render()};
 const board=panel.querySelector('.rv-star-board');
 const draw=()=>{if(!board.isConnected)return;const w=board.clientWidth;if(!w)return;const narrow=w<620,used=topicList.filter(t=>graphNotes.some(n=>n.topics.some(i=>i.id===t.id))),height=Math.max(narrow?graphNotes.length*92:Math.ceil(graphNotes.length/2)*112,used.length*75)+35;
 board.style.height=height+'px';const positions=graphNotes.map((n,i)=>[narrow?w*.7:w*(i%2===0?.46:.8),50+(narrow?i*92:Math.floor(i/2)*112)]),tp=used.map((t,i)=>[w*.12,40+i*(height-70)/Math.max(used.length-1,1)]),cw=narrow?Math.min(w*.52,190):Math.min(w*.28,220);
 const svg=board.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${w} ${height}`);svg.innerHTML=graphNotes.flatMap((n,j)=>used.map((t,i)=>n.topics.some(x=>x.id===t.id)?`<line x1="${tp[i][0]}" y1="${tp[i][1]}" x2="${positions[j][0]}" y2="${positions[j][1]}" class="${n.id===selectedNote?'rv-line-selected':''}"/>`:'')).join('');
 board.querySelector('.rv-star-nodes').innerHTML=used.map((t,i)=>`<div class="rv-topic-node" style="left:${tp[i][0]}px;top:${tp[i][1]}px;width:${narrow?w*.23:w*.2}px"><span>◎</span><strong>${h(t.name)}</strong></div>`).join('')+graphNotes.map((n,i)=>`<button type="button" class="rv-star-note" data-node="${h(n.id)}" aria-pressed="${n.id===selectedNote}" style="left:${positions[i][0]}px;top:${positions[i][1]}px;width:${cw}px"><time>${h(n.date)}</time><span>${h(outline?n.text:n.title)}</span></button>`).join('');board.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>{selectedNote=b.dataset.node;render()})};
 requestAnimationFrame(draw);const observer=new ResizeObserver(draw);observer.observe(board);activeObservers.push(observer);
}
let activeObservers=[];
window.renderReadingReview=()=>{if(!loaded)return;activeObservers.forEach(o=>o.disconnect());activeObservers=[];render()};
fetch('review-world.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{mapData=data;window.renderReadingReview()}).catch(()=>{});
loaded=true;render();
setInterval(()=>{if(!document.hidden&&signature!==JSON.stringify(issues))window.renderReadingReview()},1500);
})();
