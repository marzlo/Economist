function chapters(video){
 const found=[],seen=new Set();
 for(const line of (video.description||'').split(/\r?\n/)){
  const match=line.match(/^\s*(?:[-•▶📌]\s*)?(\d{1,3}:\d{2}(?::\d{2})?)\s+(.+?)\s*$/u);
  if(!match)continue;
  const parts=match[1].split(':').map(Number);
  if(parts.slice(1).some(n=>n>=60))continue;
  const seconds=parts.reduce((total,n)=>total*60+n,0);
  if(seen.has(seconds))continue;
  seen.add(seconds);
  const url=new URL(video.url);url.searchParams.set('t',seconds+'s');
  found.push({time:match[1],seconds,title:match[2],url:url.href});
 }
 return found.sort((a,b)=>a.seconds-b.seconds);
}
function chapterTerms(issue){
 if(!issue)return [];
 const terms=issue.keys.map(k=>k.trim()).filter(Boolean);
 if(typeof keywordGroups!=='undefined')for(const group of keywordGroups){if(terms.some(k=>group.triggers.some(t=>k.toLowerCase()===t.toLowerCase()||(/[^a-z -]/i.test(t)&&k.includes(t)))))terms.push(...group.words)}
 return [...new Set(terms.map(k=>k.toLowerCase()))].sort((a,b)=>b.length-a.length);
}
function chapterRanges(title,terms){
 const lower=title.toLowerCase(),ranges=[];
 for(const term of terms){let offset=0,index;const english=/^[a-z0-9][a-z0-9 -]*$/i.test(term);
 while((index=lower.indexOf(term,offset))!==-1){const end=index+term.length;
 if(!english||(!/[a-z0-9_]/i.test(lower[index-1]||'')&&!/[a-z0-9_]/i.test(lower[end]||'')))ranges.push([index,end]);
 offset=end;
 }}
 ranges.sort((a,b)=>a[0]-b[0]);const merged=[];for(const range of ranges){const last=merged[merged.length-1];if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push([...range])}return merged;
}
function chapterMatches(title,terms){return chapterRanges(title,terms).length>0}
function highlightChapter(title,terms){
 let output='',offset=0;for(const [start,end] of chapterRanges(title,terms)){output+=esc(title.slice(offset,start))+'<mark>'+esc(title.slice(start,end))+'</mark>';offset=end}return output+esc(title.slice(offset));
}
function chapterList(video){
 const list=chapters(video),terms=chapterTerms(selected),count=list.filter(c=>chapterMatches(c.title,terms)).length;
 return list.length?`<details class="chapters" ${selected?'open':''}><summary>章節段落 · ${list.length}${selected?` · <span class="chapter-count">${count?count+' 個符合議題':'章節標題無符合關鍵字'}</span>`:''}</summary><ol>${list.map(c=>{const match=chapterMatches(c.title,terms);return `<li class="${match?'chapter-hit':''}"><a href="${esc(c.url)}" target="_blank" rel="noopener"><time>${esc(c.time)}</time><span>${highlightChapter(c.title,terms)}${match?'<small class="chapter-badge">相關段落</small>':''}</span></a></li>`}).join('')}</ol></details>`:'';
}
