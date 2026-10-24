(()=>{
const root=document.getElementById('long-term-observations');
if(!root)return;
const trackers=[
 {name:'AI 投資能不能回本？',category:'產業與資金',metric:'台積電資本支出／營收',frequency:'每季',definition:'同一季的資本支出除以合併營收，以相同幣別計算；搭配營收年增率與自由現金流。',question:'支出增加之後，收入與現金流有沒有跟上？',caution:'公司整體資本支出包含其他用途，不能全部當作 AI 投資。季度波動需搭配全年趨勢。',source:'台積電季度財報',url:'https://investor.tsmc.com/chinese/quarterly-results',ids:['0480b43f-1e59-437d-9f5e-7981596ddb1c','60e50a2b-266d-4a53-8beb-eac4ccb8b82b']},
 {name:'政府還有多少能力照顧民生？',category:'財政與生活',metric:'美國聯邦淨利息支出／財政收入',frequency:'每月，觀察近 12 個月',definition:'近 12 個月聯邦淨利息支出合計，除以同期間財政收入合計；避免單月稅收季節性干擾。',question:'政府每收進 100 元，有多少先拿去付利息？',caution:'利息負擔不能單獨判斷公共服務品質；各國的淨利息與財政統計口徑也未必相同。',source:'美國財政部 Monthly Treasury Statement',url:'https://fiscaldata.treasury.gov/datasets/monthly-treasury-statement/',ids:['d37e0c93-dedd-49bc-928d-796881ae958c','c64ff033-d344-4da3-86d5-9da3b791f811']},
 {name:'能源衝擊有沒有傳到生活？',category:'能源與物價',metric:'美國柴油零售價格',frequency:'每週；食品 CPI 每月',definition:'使用 EIA 全美公路柴油含稅零售價（美元／加侖），搭配 BLS 美國食品 CPI 年增率分開觀察。',question:'柴油漲價之後，食品價格是否也持續上升？',caution:'兩項數據頻率不同，也可能受天氣、工資與供需影響；一起上漲不代表已證明因果。',source:'EIA 柴油週價格',url:'https://www.eia.gov/petroleum/gasdiesel/',secondary:{name:'BLS 食品 CPI',url:'https://www.bls.gov/cpi/'},ids:['13285c87-0bba-4931-9c79-fe91005c9af2','e007fa68-8334-47c1-a8b9-a0287cabe59e','bc5cb1d2-6719-4886-a6ac-8e6c0bd0c2c2']}
];


const keys=['tsmc','treasury-share','diesel'];
trackers[1].metric='美國淨利息／財政收入（近 12 月）';
trackers[1].frequency='每月';
trackers[2].frequency='每週';
let snapshot={series:{}},loadError='',signature='',selected=0;
function current(index){
 const raw=snapshot.series?.[keys[index]]||{},points=(raw.points||[]).filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&Number.isFinite(p.value)).sort((a,b)=>a.date.localeCompare(b.date));
 const latest=points.at(-1),prev=points.at(-2),delta=latest&&prev?latest.value-prev.value:null;
 return {...raw,points,period:latest?.label||latest?.date||'尚未取得',value:latest?format(latest.value,raw.unit==='USD／加侖'?3:2):'—',
 change:delta===null?'等待可比較的歷史資料':`${delta>0?'▲':delta<0?'▼':'→'} ${format(Math.abs(delta),raw.unit==='USD／加侖'?3:2)} ${raw.unit==='%'?'個百分點':raw.unit||''}　較上期`,
 status:loadError?'資料讀取失敗':raw.error?(latest?'更新失敗 · 保留舊資料':'來源暫時無法取得'):latest?'公開來源數據':'等待首次更新'};
}
function format(value,digits=2){return value.toLocaleString('zh-TW',{minimumFractionDigits:digits,maximumFractionDigits:digits})}
function stamp(value){return value?new Date(value).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'尚未成功取得'}
function line(data,small=false){
 const points=data.points.slice(data.periodType==='weekly'?-104:-40);
 if(points.length<2)return small?'<div class="ob-spark-empty">等待歷史資料</div>':'<div class="ob-chart-empty"><strong>尚無足夠資料繪製走勢</strong><p>來源恢復並取得至少兩筆資料後顯示，不使用示意值補齊。</p></div>';
 const width=small?240:930,height=small?64:280,left=small?5:75,right=small?235:870,top=small?8:35,bottom=small?56:230;
 const min=Math.min(...points.map(p=>p.value)),max=Math.max(...points.map(p=>p.value)),pad=Math.max((max-min)*.2,.01),lo=min-pad,hi=max+pad;
 const first=Date.parse(points[0].date),span=Date.parse(points.at(-1).date)-first||1;
 const coords=points.map(p=>[left+(Date.parse(p.date)-first)/span*(right-left),bottom-(p.value-lo)/(hi-lo)*(bottom-top)]);
 const ticks=new Set([0,Math.floor((points.length-1)/3),Math.floor(2*(points.length-1)/3),points.length-1]);
 return `<svg class="${small?'ob-spark':'ob-chart'}" viewBox="0 0 ${width} ${height}" role="img" aria-label="歷史走勢；數值可於下方歷史資料表查看">${small?'':[0,1,2,3].map(i=>{const y=top+i*(bottom-top)/3;return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#e1e6db"/><text x="62" y="${y+5}" text-anchor="end" fill="#798575" font-size="13">${format(hi-i*(hi-lo)/3)}</text>`}).join('')}<polyline points="${coords.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#b17a30" stroke-width="${small?2:3}"/>${coords.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${small?(i===points.length-1?3:0):3}" fill="#b17a30"><title>${esc(points[i].label||points[i].date)}：${format(points[i].value,data.unit==='USD／加侖'?3:2)} ${esc(data.unit||'')}</title></circle>${small||!ticks.has(i)?'':`<text x="${p[0]}" y="265" text-anchor="middle" font-size="13" fill="#798575">${esc(points[i].label||points[i].date)}</text>`}`).join('')}</svg>`;
}
function render(){
 const notes=ReviewModel.collect(issues);signature=JSON.stringify(issues);
 root.innerHTML=`<div class="ob-heading"><div><div class="ob-eyebrow">LONG VIEW / 長期數據觀察</div><h2 id="observations-heading">把在意的事，放進時間裡看。</h2><p>從你的記事出發，追蹤數字如何改變，也回看自己的理解。</p></div></div><p class="ob-data-notice">每天隨網站資料更新檢查公開來源；各指標依原來源頻率發布，統計期間不等於抓取日期。${loadError?'資料暫時讀取失敗，請稍後重新整理。':'抓取失敗時保留上次成功資料。'}</p><div class="ob-topline"><h3>追蹤數據</h3><span>點卡片切換走勢 ↓</span></div><div class="ob-grid" role="group" aria-label="選擇追蹤數據">${trackers.map((t,i)=>{const d=current(i);return `<button type="button" class="ob-card" data-observation="${i}" aria-pressed="${selected===i}" aria-controls="ob-detail"><div class="ob-label">${esc(t.metric)}</div><div class="ob-value">${esc(d.value)}<span>${esc(d.unit||'')}</span></div><div class="ob-change">${esc(d.change)}</div>${line(d,true)}<div class="ob-record-status">${esc(d.status)} · ${esc(d.period)}</div></button>`}).join('')}</div><div id="ob-detail" class="ob-detail" aria-live="polite"></div><p class="ob-footnote">資料自動更新，不使用付費 AI；未發布的新期間不預填數值。公開統計可能修訂，更新時會同步修正同一期間的資料。數據與記事中的舊記錄分開保存。</p>`;
 root.querySelectorAll('[data-observation]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.observation);root.querySelectorAll('[data-observation]').forEach(c=>c.setAttribute('aria-pressed',Number(c.dataset.observation)===selected));detail(notes)});detail(notes);
}
function detail(notes){
 const t=trackers[selected],d=current(selected),related=t.ids.map(id=>notes.find(n=>n.id===id)).filter(Boolean),url=safeLink(d.sourceUrl||t.url);
 root.querySelector('#ob-detail').innerHTML=`<div class="ob-chart-heading"><div><div class="ob-eyebrow">${esc(t.category)} / 歷史走勢</div><h3>${esc(t.metric)}</h3><p>${esc(d.definition||'等待取得來源資料後顯示統計口徑。')}</p></div><span class="ob-status">${esc(d.status)}</span></div>${line(d)}${selected===1&&d.points.length?`<p class="ob-chart-caption">最新近 12 月淨利息支出：${format(d.points.at(-1).netInterestUSD/1e9)} 十億美元 ÷ 同期財政收入：${format(d.points.at(-1).receiptsUSD/1e9)} 十億美元 × 100% = ${d.value}%。</p>`:''}<dl class="ob-metadata"><div><dt>資料來源</dt><dd>${url?`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(d.source||t.source)} ↗</a>`:'來源未提供'}</dd></div><div><dt>資料發布頻率</dt><dd>${esc(d.frequency||t.frequency)}</dd></div><div><dt>最新統計期間</dt><dd>${esc(d.period)}</dd></div><div><dt>最後成功取得（臺灣時間）</dt><dd>${esc(stamp(d.lastSuccess))}</dd></div></dl><p class="ob-footnote">最近檢查：${esc(stamp(d.checkedAt||snapshot.checkedAt))}${d.error?' · 此來源本次更新失敗，已保留舊資料。':''}</p><details class="ob-history-table"><summary>歷史數值（${d.points.length} 筆）</summary><div class="ob-table-scroll"><table><thead><tr><th>統計期間</th><th>數值（${esc(d.unit||'未取得單位')}）</th></tr></thead><tbody>${d.points.slice().reverse().map(p=>`<tr><td>${esc(p.label||p.date)}</td><td>${format(p.value,d.unit==='USD／加侖'?3:2)}</td></tr>`).join('')||'<tr><td colspan="2">尚未取得資料</td></tr>'}</tbody></table></div></details><div class="ob-story"><div><h4>我的觀察方向</h4><strong>${esc(t.question)}</strong><p>${esc(t.caution)}</p>${selected===1?'<p>採最近連續 12 個月加總，避免把財政年度重新起算或單月季節波動誤認為趨勢。分子、分母採相同月份與美元單位。</p>':''}</div><div><h4>從這些記事開始追蹤（${related.length}）</h4>${related.map(n=>`<details class="ob-note"><summary><time>${esc(n.date||'')}</time><span>${esc(n.title)}</span></summary><p>${esc(n.text||'')}</p>${typeof EntryImages!=='undefined'?EntryImages.html(n):''}${(n.links||[]).filter(l=>safeLink(l.url)).map(l=>`<a href="${esc(safeLink(l.url))}" target="_blank" rel="noopener">${esc(l.title||'記事來源')} ↗</a>`).join('')}</details>`).join('')||'<p>相關記事尚未載入或已移除。</p>'}</div></div>`;
}
render();
let lastRead=0;
function reloadData(){lastRead=Date.now();return fetch('observations.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(data.version!==1||!data.series||typeof data.series!=='object')throw Error();snapshot=data;loadError='';render()}).catch(()=>{loadError='讀取失敗';render()});}
reloadData();window.addEventListener('focus',()=>{if(Date.now()-lastRead>60000)reloadData()});setInterval(()=>{if(!document.hidden)reloadData()},900000);
setInterval(()=>{if(!document.hidden&&signature!==JSON.stringify(issues))render()},1500);
})();
