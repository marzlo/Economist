/* Plain Markdown stays in the note; formatting is rendered and sanitized locally. */
window.NoteContent=(()=>{
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const renderer=new marked.Renderer();renderer.html=token=>/^<br\s*\/?>$/i.test(token.text.trim())?'<br>':escape(token.text);
const options={gfm:true,breaks:true,renderer};
const tags=['p','br','strong','b','em','i','del','s','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code','hr','table','thead','tbody','tfoot','tr','th','td','a','img'];
const config={ALLOWED_TAGS:tags,ALLOWED_ATTR:['src','alt','class','href','title','colspan','rowspan','start','align'],ALLOW_DATA_ATTR:false};
function safeURL(value){if(!value||typeof value!=='string')return null;try{const url=new URL(value,location.href);return ['http:','https:'].includes(url.protocol)?url.href:null}catch{return null}}
function finish(html,images=[]){
 const box=document.createElement('div');box.innerHTML=DOMPurify.sanitize(html,config);
 box.querySelectorAll('a').forEach(a=>{const url=safeURL(a.getAttribute('href')||'');if(!a.hasAttribute('href')||!url)a.removeAttribute('href');else{a.href=url;a.target='_blank';a.rel='noopener noreferrer'}});
 box.querySelectorAll('img').forEach(img=>{
  const ref=img.getAttribute('src')||'',attachment=ref.startsWith('#entry-image-')?images.find(i=>i.id===ref.slice(13)):null;
  const url=attachment&&(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(attachment.src)||safeURL(attachment.src))?attachment.src:(ref.startsWith('#entry-image-')?null:safeURL(ref));if(!url){img.replaceWith(document.createTextNode(img.alt||''));return}
  img.src=url;img.loading='lazy';img.decoding='async';img.className='entry-inline-image';
  if(attachment?.caption){const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=attachment.caption;img.before(figure);figure.append(img,caption)}
 });
 box.querySelectorAll('table').forEach(table=>{const scroll=document.createElement('div');scroll.className='entry-table-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','記事表格，可左右滑動');table.before(scroll);scroll.append(table);table.querySelectorAll('th').forEach(th=>th.scope='col')});
 box.querySelectorAll('pre>code.language-mermaid').forEach(code=>{
  const html=window.NoteDiagrams?.render(code.textContent);if(!html)return;
  const figure=document.createElement('figure');figure.className='entry-flowchart';figure.innerHTML=html;code.parentElement.replaceWith(figure);
 });
 return box.innerHTML;
}
function isArticle(text){return /^#{1,6}\s+\S/m.test(text)&&(/!\[[^\]]*\]\(/.test(text)||/^\|[^\n]+\|\s*\n\|[ :|\-]+\|/m.test(text))}
function normalize(value){
 const text=String(value||'');
 if(!/```|~~~/.test(text))return text;
 try{return marked.lexer(text,options).map(token=>token.type==='code'&&/^(?:markdown|md)?$/i.test(token.lang||'')&&isArticle(token.text)?token.text+'\n\n':token.raw).join('')}catch{return text}
}
function render(value,images=[]){try{return finish(marked.parse(normalize(value),options),images)}catch{return '<p>'+escape(value).replace(/\n/g,'<br>')+'</p>'}}
function tables(value,images=[]){value=normalize(value);if(/!\[[^\]]*\]\(/.test(String(value)))return render(value,images);if(!String(value).includes('|')&&!String(value).includes('mermaid'))return '';const tokens=marked.lexer(String(value),options),only=tokens.filter(t=>t.type==='table'||(t.type==='code'&&t.lang==='mermaid'));only.links=tokens.links;return only.length?finish(marked.parser(only,options)):''}
const mdEscape=value=>String(value).replace(/\\/g,'\\\\').replace(/([`*_[\]])/g,'\\$1');
function grid(rows){
 const width=Math.max(...rows.map(r=>r.length));if(!width)return '';
 const line=row=>'| '+Array.from({length:width},(_,i)=>String(row[i]||'').trim().replace(/\|/g,'\\|').replace(/\r?\n/g,'<br>')).join(' | ')+' |';
 return '\n\n'+[line(rows[0]),'| '+Array(width).fill('---').join(' | ')+' |',...rows.slice(1).map(line)].join('\n')+'\n\n';
}
function fromHTML(html){
 const fragment=DOMPurify.sanitize(html,{...config,ALLOWED_TAGS:[...tags,'div','section','article','figure','span'],RETURN_DOM_FRAGMENT:true});
 function walk(node){
  if(node.nodeType===3)return mdEscape(node.textContent.replace(/\s+/g,' '));
  if(node.nodeType!==1&&node.nodeType!==11)return '';
  const tag=node.nodeName.toLowerCase(),children=()=>[...node.childNodes].map(walk).join('');
  if(tag==='table'){
   const rows=[...node.rows].filter(row=>row.closest('table')===node).map(row=>[...row.cells].flatMap(cell=>{const value=[...cell.childNodes].map(walk).join('').trim();return [value,...Array(Math.min(30,Math.max(1,cell.colSpan||1))-1).fill('')]}));
   return rows.length?grid(rows):'';
  }
  if(tag==='img'){const url=safeURL(node.getAttribute('src'));return url?'\n\n!['+mdEscape(node.getAttribute('alt')||'記事圖片')+'](<'+url.replace(/</g,'%3C').replace(/>/g,'%3E')+'>)\n\n':''}
  if(tag==='br')return '<br>';
  if(tag==='pre'){const code=node.textContent;const lang=node.querySelector('code')?.className||'';if((!lang||/language-(markdown|md)\b/i.test(lang))&&isArticle(code))return '\n\n'+code+'\n\n';const fence='`'.repeat(Math.max(3,...(code.match(/`+/g)||[]).map(s=>s.length+1)));return '\n\n'+fence+(node.querySelector('code.language-mermaid')?'mermaid':'')+'\n'+code+'\n'+fence+'\n\n'}
  if(tag==='code'){const text=node.textContent;const fence='`'.repeat(Math.max(1,...(text.match(/`+/g)||[]).map(s=>s.length+1)));return fence+text+fence}
  if(tag==='strong'||tag==='b')return '**'+children()+'**';
  if(tag==='em'||tag==='i')return '*'+children()+'*';
  if(tag==='a'){const text=children(),url=safeURL(node.getAttribute('href'));return url?'['+text+'](<'+url.replace(/</g,'%3C').replace(/>/g,'%3E')+'>)':text}
  if(/^h[1-6]$/.test(tag))return '\n\n'+'#'.repeat(Number(tag[1]))+' '+children().trim()+'\n\n';
  if(tag==='li'){const parent=node.parentElement,ordered=parent?.nodeName==='OL',index=ordered?[...parent.children].indexOf(node)+(Number(parent.getAttribute('start'))||1):0;return '\n'+(ordered?index+'. ':'- ')+children().trim()+'\n'}
  if(tag==='hr')return '\n\n---\n\n';
  if(['p','div','section','article','figure','ul','ol','blockquote'].includes(tag))return '\n\n'+children().trim()+'\n\n';
  return children();
 }
 return [...fragment.childNodes].map(walk).join('').replace(/\n{3,}/g,'\n\n').trim();
}
function fromTSV(text){if(/```|~~~/.test(text))return text;const lines=text.split(/\r?\n/),output=[];for(let i=0;i<lines.length;){if(!lines[i].includes('\t')){output.push(lines[i++]);continue}const rows=[];while(i<lines.length&&lines[i].includes('\t'))rows.push(lines[i++].split('\t'));output.push(rows.length>1?grid(rows):rows[0].join('\t'))}return output.join('\n')}
function mount(){
 document.querySelectorAll('#entry-text,#civic-progress-note').forEach(area=>{
  const preview=document.createElement('details');preview.className='entry-table-preview';preview.open=true;preview.hidden=true;preview.innerHTML='<summary>圖表預覽</summary><div class="entry-content"></div>';area.parentElement.after(preview);
  const update=()=>{const html=tables(area.value,area.noteImages?.()||[]);preview.hidden=!html;preview.querySelector('.entry-content').innerHTML=html};
  const tools=document.createElement('div');tools.className='note-diagram-tools';
  const insert=document.createElement('button');insert.type='button';insert.textContent='＋ 插入流程圖';
  insert.addEventListener('click',()=>{const sample='\n\n```mermaid\nflowchart TD\n A["起點<br/>補充說明"] --> B["下一步<br/>補充說明"]\n B --> C["結果"]\n```\n';area.setRangeText(sample,area.selectionStart,area.selectionEnd,'end');area.dispatchEvent(new Event('input',{bubbles:true}));area.focus()});
  tools.append(insert);area.parentElement.after(tools);
  area.addEventListener('input',update);area.addEventListener('focus',update);
  const dialog=area.closest('dialog');if(dialog)new MutationObserver(update).observe(dialog,{attributes:true,attributeFilter:['open']});
  area.addEventListener('paste',e=>{
   const data=e.clipboardData;if(!data)return;const html=data.getData('text/html'),plain=data.getData('text/plain');
   // Preserve rich headings, lists, emphasis, links, tables and externally hosted images.
   // Some apps put only plain text on the clipboard; images cannot be recovered from it.
   const rich=/<(?:h[1-6]|table|img|pre|ul|ol|blockquote|strong|b|em|i|a)(?:\s|>)/i.test(html);
   let text=normalize(rich?fromHTML(html):fromTSV(plain));
   if(!text||text===plain)return;
   const image=[...(data.items||[])].some(i=>i.kind==='file'&&i.type.startsWith('image/'))||[...(data.files||[])].some(f=>f.type.startsWith('image/'));
   if(image){e.noteFormattedText=text;return}
   e.preventDefault();area.setRangeText(text,area.selectionStart,area.selectionEnd,'end');area.dispatchEvent(new Event('input',{bubbles:true}));
  },true);
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
return {render,tables,fromHTML,fromTSV,normalize};
})();
