(()=>{
const root=document.getElementById('long-term-observations');
if(!root)return;
const trackers=[
 {name:'AI 投資能不能回本？',category:'產業與資金',metric:'台積電資本支出／營收',frequency:'每季',definition:'同一季的資本支出除以合併營收，以相同幣別計算；搭配營收年增率與自由現金流。',question:'支出增加之後，收入與現金流有沒有跟上？',caution:'公司整體資本支出包含其他用途，不能全部當作 AI 投資。季度波動需搭配全年趨勢。',source:'台積電季度財報',url:'https://investor.tsmc.com/chinese/quarterly-results',ids:['0480b43f-1e59-437d-9f5e-7981596ddb1c','60e50a2b-266d-4a53-8beb-eac4ccb8b82b']},
 {name:'政府還有多少能力照顧民生？',category:'財政與生活',metric:'美國聯邦淨利息支出／財政收入',frequency:'每月，觀察近 12 個月',definition:'近 12 個月聯邦淨利息支出合計，除以同期間財政收入合計；避免單月稅收季節性干擾。',question:'政府每收進 100 元，有多少先拿去付利息？',caution:'利息負擔不能單獨判斷公共服務品質；各國的淨利息與財政統計口徑也未必相同。',source:'美國財政部 Monthly Treasury Statement',url:'https://fiscaldata.treasury.gov/datasets/monthly-treasury-statement/',ids:['d37e0c93-dedd-49bc-928d-796881ae958c','c64ff033-d344-4da3-86d5-9da3b791f811']},
 {name:'能源衝擊有沒有傳到生活？',category:'能源與物價',metric:'美國柴油零售價格',frequency:'每週；食品 CPI 每月',definition:'使用 EIA 全美公路柴油含稅零售價（美元／加侖），搭配 BLS 美國食品 CPI 年增率分開觀察。',question:'柴油漲價之後，食品價格是否也持續上升？',caution:'兩項數據頻率不同，也可能受天氣、工資與供需影響；一起上漲不代表已證明因果。',source:'EIA 柴油週價格',url:'https://www.eia.gov/petroleum/gasdiesel/',secondary:{name:'BLS 食品 CPI',url:'https://www.bls.gov/cpi/'},ids:['13285c87-0bba-4931-9c79-fe91005c9af2','e007fa68-8334-47c1-a8b9-a0287cabe59e','bc5cb1d2-6719-4886-a6ac-8e6c0bd0c2c2']}
];

const observations=[
 {unit:'%',value:'36',change:'較 2023 年下降 8 個百分點',period:'2026 年（記事記錄）',points:[{label:'2023',value:44},{label:'2026',value:36}],status:'記事摘錄 · 待核對',definition:'記事記錄的年度資本支出占營收比例；2026 年是否為全年預估仍待核對。'},
 {unit:'美元',value:'逾 1 兆',change:'缺少同口徑前期資料',period:'統計期間未註明',points:[],status:'記事摘錄 · 待核對',definition:'10/15 記事記錄美國淨利息支出逾一兆美元，但未註明統計期間。尚無收入分母，不能計算利息負擔率。'},
 {unit:'USD／加侖',value:'6.29',change:'記事稱上漲 72%，比較基期未註明',period:'統計日期未註明',points:[],status:'記事摘錄 · 待核對',definition:'10/21 記事記錄的柴油價格，地區、日期與漲幅比較基期仍待核對。'}
];
trackers[1].metric='美國聯邦淨利息支出';
let signature='',selected=0;
function line(points,small=false){
 if(points.length<2)return small?'<div class="ob-spark-empty">待補同口徑歷史資料</div>':'<div class="ob-chart-empty"><strong>尚無可比較的歷史走勢</strong><p>目前僅有記事中的單一數值。核對原始資料與統計期間後，再補入圖表。</p></div>';
 const width=small?240:930,height=small?64:280,left=small?5:65,right=small?235:880,top=small?8:30,bottom=small?56:230;
 const min=Math.min(...points.map(p=>p.value)),max=Math.max(...points.map(p=>p.value)),pad=Math.max((max-min)*.25,1),lo=min-pad,hi=max+pad;
 const coords=points.map((p,i)=>[left+i*(right-left)/(points.length-1),bottom-(p.value-lo)/(hi-lo)*(bottom-top)]);
 return `<svg class="${small?'ob-spark':'ob-chart'}" viewBox="0 0 ${width} ${height}" role="img" aria-label="記事摘錄數值比較，待核對；連線不代表中間年份的實際走勢">${small?'':[0,1,2,3].map(i=>{const y=top+i*(bottom-top)/3;return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#e1e6db"/><text x="48" y="${y+5}" text-anchor="end" fill="#798575" font-size="13">${(hi-i*(hi-lo)/3).toFixed(0)}</text>`}).join('')}<polyline points="${coords.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#b17a30" stroke-width="${small?2:3}" stroke-dasharray="5 5"/>${coords.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${small?3:5}" fill="#b17a30"><title>${points[i].label}：${points[i].value}%（記事摘錄，待核對）</title></circle>${small?'':`<text x="${p[0]}" y="${p[1]-12}" text-anchor="middle" font-size="14" fill="#586951">${points[i].value}%</text><text x="${p[0]}" y="265" text-anchor="middle" font-size="13" fill="#798575">${points[i].label}</text>`}`).join('')}</svg>`;
}
function render(){
 const notes=ReviewModel.collect(issues);signature=JSON.stringify(issues);
 root.innerHTML=`<div class="ob-heading"><div><div class="ob-eyebrow">LONG VIEW / 長期數據觀察</div><h2 id="observations-heading">把在意的事，放進時間裡看。</h2><p>從你的記事出發，追蹤數字如何改變，也回看自己的理解。</p></div></div><p class="ob-data-notice">目前顯示記事摘錄，尚未核對官方統計；不代表最新行情。沒有足夠資料的項目暫不繪製走勢。</p><div class="ob-topline"><h3>追蹤數據</h3><span>點卡片切換走勢 ↓</span></div><div class="ob-grid" role="group" aria-label="選擇追蹤數據">${trackers.map((t,i)=>{const d=observations[i];return `<button type="button" class="ob-card" data-observation="${i}" aria-pressed="${selected===i}" aria-controls="ob-detail"><div class="ob-label">${esc(t.metric)}</div><div class="ob-value">${esc(d.value)}<span>${esc(d.unit)}</span></div><div class="ob-change">${esc(d.change)}</div>${line(d.points,true)}<div class="ob-record-status">${esc(d.status)}</div></button>`}).join('')}</div><div id="ob-detail" class="ob-detail" aria-live="polite"></div><p class="ob-footnote">每日影片與新聞更新尚未串接這些數據。這裡不會自動呼叫付費 AI；記事數字經官方來源核對後，才會列為已核對數據。</p>`;
 root.querySelectorAll('[data-observation]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.observation);root.querySelectorAll('[data-observation]').forEach(c=>c.setAttribute('aria-pressed',Number(c.dataset.observation)===selected));detail(notes)});detail(notes);
}
function detail(notes){
 const t=trackers[selected],d=observations[selected],related=t.ids.map(id=>notes.find(n=>n.id===id)).filter(Boolean);
 root.querySelector('#ob-detail').innerHTML=`<div class="ob-chart-heading"><div><div class="ob-eyebrow">${esc(t.category)} / 數據比較</div><h3>${esc(t.metric)}</h3><p>${esc(d.definition)}</p></div><span class="ob-status">${esc(d.status)}</span></div>${line(d.points)}${d.points.length>1?'<p class="ob-chart-caption">只有兩個年度的記事數字，虛線僅連接比較點，並非完整歷史走勢。</p>':''}<dl class="ob-metadata"><div><dt>核對來源</dt><dd><a href="${t.url}" target="_blank" rel="noopener">${esc(t.source)} ↗</a></dd></div><div><dt>預定追蹤頻率</dt><dd>${esc(t.frequency)}</dd></div><div><dt>摘錄數字的統計期間</dt><dd>${esc(d.period)}</dd></div><div><dt>資料狀態</dt><dd>未串接官方數據</dd></div></dl><div class="ob-story"><div><h4>我的觀察方向</h4><strong>${esc(t.question)}</strong><p>${esc(t.caution)}</p>${selected===1?`<p>長期希望進一步追蹤：${esc(t.definition)}</p>`:''}</div><div><h4>從這些記事開始追蹤（${related.length}）</h4>${related.map(n=>`<details class="ob-note"><summary><time>${esc(n.date||'')}</time><span>${esc(n.title)}</span></summary><p>${esc(n.text||'')}</p>${(n.links||[]).filter(l=>safeLink(l.url)).map(l=>`<a href="${esc(safeLink(l.url))}" target="_blank" rel="noopener">${esc(l.title||'記事來源')} ↗</a>`).join('')}</details>`).join('')||'<p>相關記事尚未載入或已移除。</p>'}</div></div>`;
}
render();setInterval(()=>{if(!document.hidden&&signature!==JSON.stringify(issues))render()},1500);
})();
