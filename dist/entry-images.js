/* Every note editor uses the same image upload, paste and compression rules. */
window.EntryImages=(()=>{
function valid(src){if(typeof src!=='string')return false;return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src)||!!safeLink(src)}
function html(entry){const list=(entry.images||[]).filter(i=>valid(i.src)&&!(i.id&&(entry.text||'').includes('](#entry-image-'+i.id+')')));return list.length?`<div class="entry-images">${list.map(i=>`<figure><a href="${esc(i.src)}" target="_blank" rel="noopener"><img src="${esc(i.src)}" alt="${esc(i.caption||'記事圖片')}" loading="lazy" decoding="async"></a>${i.caption?`<figcaption>${esc(i.caption)}</figcaption>`:''}</figure>`).join('')}</div>`:''}
async function compress(file){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('請選擇 JPG、PNG 或 WebP 圖片；其他格式請先轉存。');
 if(file.size>20*1024*1024)throw Error('請選擇小於 20 MB 的圖片。');
 const url=URL.createObjectURL(file),image=new Image();try{image.src=url;await image.decode();const canvas=document.createElement('canvas');const scale=Math.min(1,1280/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);let result;for(const quality of [.8,.65,.5,.35,.2]){result=canvas.toDataURL('image/jpeg',quality);if(result.length<=140000)return result;}throw Error('圖片壓縮後仍過大，請先裁切圖片或改用圖片網址。')}finally{URL.revokeObjectURL(url)}
}
function createEditor({prefix='entry',contentId='entry-text',beforeId='entry-links',imageLabel='記事圖片',contentLabel='內容'}={}){
let images=[],busy=false,generation=0,cursor=0;
const content=()=>document.getElementById(contentId);
function insert(image){const area=content(),token='![記事圖片](#entry-image-'+image.id+')';if(area.value.includes(token))return;const pos=cursor;area.setRangeText('\n\n'+token+'\n\n',pos,pos,'end');cursor=area.selectionEnd;area.dispatchEvent(new Event('input',{bubbles:true}));area.focus()}
function changed(){content().dispatchEvent(new Event('input',{bubbles:true}))}
const max=3;
function render(){const host=document.getElementById(prefix+'-image-preview');host.innerHTML=images.map((i,n)=>`<div class="entry-image-edit"><img src="${esc(i.src)}" alt="圖片預覽"><label>圖片說明<input data-image-caption="${n}" value="${esc(i.caption||'')}" maxlength="300"></label><button type="button" data-image-insert="${n}">插入游標位置</button><button type="button" data-image-remove="${n}">移除圖片</button></div>`).join('');host.querySelectorAll('[data-image-remove]').forEach(b=>b.onclick=()=>{const image=images[Number(b.dataset.imageRemove)];if(image.id)content().value=content().value.replaceAll('![記事圖片](#entry-image-'+image.id+')','');images.splice(Number(b.dataset.imageRemove),1);render();changed()});host.querySelectorAll('[data-image-insert]').forEach(b=>b.onclick=()=>insert(images[Number(b.dataset.imageInsert)]));host.querySelectorAll('[data-image-caption]').forEach(input=>input.oninput=()=>images[Number(input.dataset.imageCaption)].caption=input.value)}
function reset(entry){generation++;busy=false;const status=document.getElementById(prefix+'-paste-status');if(status)status.textContent='';images=(entry?.images||[]).filter(i=>valid(i.src)).map(i=>({...i,id:i.id||crypto.randomUUID()}));cursor=0;document.getElementById(prefix+'-image-file').value='';document.getElementById(prefix+'-image-url').value='';document.getElementById(prefix+'-image-message').textContent='';render()}
function mount(){const field=document.createElement('fieldset');field.innerHTML='<legend>記事圖片（最多 3 張）</legend><label>選擇照片<input id="entry-image-file" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><p class="muted">在上方「內容」點選段落位置後貼上圖片，或選擇照片、加入圖片網址，即可插入該處。照片會縮小後上傳至公開 GitHub 圖片檔案，記事只儲存圖片網址。上傳需要 GitHub 同步權杖。</p><label>圖片網址<input id="entry-image-url" type="url" placeholder="https://…"></label><button id="entry-image-add" type="button">加入圖片網址</button><p id="entry-image-message" role="status" class="muted"></p><div id="entry-image-preview"></div>'.replaceAll('entry-',prefix+'-').replace('記事圖片',imageLabel).replace('上方「內容」','上方「'+contentLabel+'」');document.getElementById(beforeId).parentElement.before(field);
 const content=document.getElementById(contentId);content.noteImages=()=>images;for(const event of ['select','keyup','click','input','blur'])content.addEventListener(event,()=>cursor=content.selectionStart);const hint=document.createElement('p');hint.className='muted';hint.textContent='可直接在「'+contentLabel+'」貼上截圖或照片；圖片會插在游標位置，下方可預覽或將原有圖片插入文章，每篇最多 3 張。';const status=document.createElement('p');status.id=prefix+'-paste-status';status.className='muted';status.setAttribute('role','status');content.parentElement.after(hint,status);
 const message=text=>{document.getElementById(prefix+'-image-message').textContent=text;status.textContent=text};
 document.getElementById(prefix+'-image-add').onclick=()=>{const input=document.getElementById(prefix+'-image-url'),src=safeLink(input.value.trim());if(!src){message('請輸入有效的 http 或 https 圖片網址。');return}if(images.length>=max){message('每篇最多 3 張圖片，請先移除再加入。');return}const image={src,caption:'',id:crypto.randomUUID()};images.push(image);insert(image);input.value='';message('');render()};
 async function addFiles(files){
  if(!files.length)return;
  if(busy){message('圖片仍在處理中，請稍候再加入。');return}
  if(images.length+files.length>max){message('每篇最多 3 張圖片，請先移除部分圖片再加入。');return}
  const session=generation;busy=true;message('正在處理圖片…');const added=files.map(()=>({id:crypto.randomUUID(),caption:''}));for(const image of added)insert(image);
  try{for(let n=0;n<files.length;n++)added[n].src=await compress(files[n]);if(session!==generation)return;if(images.length+added.length>max)throw Error('每篇最多 3 張圖片，請先移除部分圖片再加入。');images.push(...added);render();changed();message('已插入 '+added.length+' 張圖片，可在下方預覽、填寫說明後儲存記事。')}catch(error){if(session===generation){for(const image of added)content.value=content.value.replaceAll('![記事圖片](#entry-image-'+image.id+')','');changed();message(error.message)}}finally{if(session===generation)busy=false}
 }
 document.getElementById(prefix+'-image-file').onchange=e=>{const files=[...e.target.files];e.target.value='';addFiles(files)};
 content.addEventListener('paste',e=>{
  const clipboard=e.clipboardData;if(!clipboard)return;
  let files=[...(clipboard.items||[])].filter(item=>item.kind==='file'&&item.type.startsWith('image/')).map(item=>item.getAsFile()).filter(Boolean);
  if(!files.length)files=[...(clipboard.files||[])].filter(file=>file.type.startsWith('image/'));
  if(!files.length)return; // Plain text keeps the browser's normal paste behavior.
  e.preventDefault();cursor=content.selectionStart;
  const text=e.noteFormattedText||clipboard.getData('text/plain');if(text){content.setRangeText(text,content.selectionStart,content.selectionEnd,'end');content.dispatchEvent(new Event('input',{bubbles:true}))}
  cursor=content.selectionStart;addFiles(files);
 });

}
return {reset,mount,get(){if(busy)throw Error('圖片仍在處理中，請稍候再儲存。');return images.map(i=>({...i}))}};
}
return {html,compress,valid,createEditor,...createEditor()};
})();
