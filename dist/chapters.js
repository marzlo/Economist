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
function chapterList(video){const list=chapters(video);return list.length?`<details class="chapters"><summary>章節段落 · ${list.length}</summary><ol>${list.map(c=>`<li><a href="${esc(c.url)}" target="_blank" rel="noopener"><time>${esc(c.time)}</time><span>${esc(c.title)}</span></a></li>`).join('')}</ol></details>`:''}
