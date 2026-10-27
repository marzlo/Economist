/* Read-only search of known note storage keys. Never reads credentials or writes notes. */
((root)=>{
 const keys=['reading-issues','economist-sync-base','economist-legacy-backup'];
 const labels={'reading-issues':'本機記事','economist-sync-base':'上次同步基準','economist-legacy-backup':'早期本機備份'};
 function scan(read,query){
  const terms=String(query||'').normalize('NFKC').toLowerCase().split(/[\s,，]+/).filter(Boolean);
  if(!terms.length)return [];
  const found=new Map();
  for(const key of keys){let rows;try{rows=JSON.parse(read(key)||'null')}catch{continue}if(!Array.isArray(rows))continue;
   for(const topic of rows){if(!topic||typeof topic.id!=='string')continue;const text=JSON.stringify(topic).normalize('NFKC').toLowerCase();if(!terms.some(term=>text.includes(term)))continue;const signature=topic.id+'\n'+JSON.stringify(topic);let item=found.get(signature);if(!item){item={id:topic.id,name:topic.name||'未命名議題',scope:topic.scope||'',entries:Array.isArray(topic.entries)?topic.entries.length:0,sources:[]};found.set(signature,item)}item.sources.push(labels[key]);}
  }
  return [...found.values()];
 }
 root.NoteBackupScan={scan};
 if(typeof module!=='undefined')module.exports={scan};
 if(typeof document==='undefined')return;
 const form=document.querySelector('#sync-form');if(!form)return;
 const section=document.createElement('details');section.className='note-backup-check';
 const summary=document.createElement('summary');summary.textContent='檢查本機議題備份（唯讀）';
 const help=document.createElement('p');help.className='muted';help.textContent='只搜尋這個瀏覽器／主畫面 App 的記事與既有備份，不讀取權杖，也不修改或上傳資料。';
 const input=document.createElement('input');input.type='search';input.value='缺師 國中 教師 師資';input.setAttribute('aria-label','備份搜尋關鍵字，以空格分隔');
 const button=document.createElement('button');button.type='button';button.textContent='檢查本機備份';
 const result=document.createElement('div');result.setAttribute('role','status');
 button.onclick=()=>{let matches;try{matches=scan(key=>localStorage.getItem(key),input.value)}catch{result.textContent='目前無法讀取此瀏覽器的本機儲存空間。';return}
  result.replaceChildren();if(!matches.length){const p=document.createElement('p');p.className='muted';p.textContent='這個瀏覽器／主畫面 App 的可讀取備份沒有符合內容。請在原本新增議題的 Safari、主畫面 App 或另一台裝置分別檢查；這不代表議題從未建立。';result.append(p);return}
  const list=document.createElement('ul');for(const item of matches){const li=document.createElement('li');li.textContent=item.name+(item.scope?' · '+item.scope:'')+' · '+item.entries+' 篇記事 · 找到於：'+item.sources.join('、');list.append(li)}result.append(list);
 };
 section.append(summary,help,input,button,result);form.append(section);
})(globalThis);
