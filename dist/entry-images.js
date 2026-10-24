/* Images remain part of the note and follow its existing sync/export path. */
window.EntryImages=(()=>{
let images=[],busy=false;
const max=3;
function valid(src){if(typeof src!=='string')return false;return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src)||!!safeLink(src)}
function html(entry){const list=(entry.images||[]).filter(i=>valid(i.src));return list.length?`<div class="entry-images">${list.map(i=>`<figure><a href="${esc(i.src)}" target="_blank" rel="noopener"><img src="${esc(i.src)}" alt="${esc(i.caption||'記事圖片')}" loading="lazy" decoding="async"></a>${i.caption?`<figcaption>${esc(i.caption)}</figcaption>`:''}</figure>`).join('')}</div>`:''}
function render(){const host=document.getElementById('entry-image-preview');host.innerHTML=images.map((i,n)=>`<div class="entry-image-edit"><img src="${esc(i.src)}" alt="圖片預覽"><label>圖片說明<input data-image-caption="${n}" value="${esc(i.caption||'')}" maxlength="300"></label><button type="button" data-image-remove="${n}">移除圖片</button></div>`).join('');host.querySelectorAll('[data-image-remove]').forEach(b=>b.onclick=()=>{images.splice(Number(b.dataset.imageRemove),1);render()});host.querySelectorAll('[data-image-caption]').forEach(input=>input.oninput=()=>images[Number(input.dataset.imageCaption)].caption=input.value)}
function reset(entry){images=(entry?.images||[]).filter(i=>valid(i.src)).map(i=>({...i}));document.getElementById('entry-image-file').value='';document.getElementById('entry-image-url').value='';document.getElementById('entry-image-message').textContent='';render()}
async function compress(file){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('請選擇 JPG、PNG 或 WebP 圖片；其他格式請先轉存。');
 if(file.size>20*1024*1024)throw Error('請選擇小於 20 MB 的圖片。');
 const url=URL.createObjectURL(file),image=new Image();try{image.src=url;await image.decode();const canvas=document.createElement('canvas');const scale=Math.min(1,1280/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);let result;for(const quality of [.8,.65,.5,.35,.2]){result=canvas.toDataURL('image/jpeg',quality);if(result.length<=140000)return result;}throw Error('圖片壓縮後仍過大，請先裁切圖片或改用圖片網址。')}finally{URL.revokeObjectURL(url)}
}
function mount(){const field=document.createElement('fieldset');field.innerHTML='<legend>記事圖片（最多 3 張）</legend><label>選擇照片<input id="entry-image-file" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><p class="muted">照片會縮小後隨記事同步，儲存後公開。也可以貼上公開圖片的網址。</p><label>圖片網址<input id="entry-image-url" type="url" placeholder="https://…"></label><button id="entry-image-add" type="button">加入圖片網址</button><p id="entry-image-message" role="status" class="muted"></p><div id="entry-image-preview"></div>';document.getElementById('entry-links').parentElement.before(field);
 const message=text=>document.getElementById('entry-image-message').textContent=text;
 document.getElementById('entry-image-add').onclick=()=>{const input=document.getElementById('entry-image-url'),src=safeLink(input.value.trim());if(!src){message('請輸入有效的 http 或 https 圖片網址。');return}if(images.length>=max){message('每篇最多 3 張圖片，請先移除再加入。');return}images.push({src,caption:''});input.value='';message('');render()};
 document.getElementById('entry-image-file').onchange=async e=>{const files=[...e.target.files];if(images.length+files.length>max){message('每篇最多 3 張圖片，請減少選取張數。');e.target.value='';return}busy=true;message('正在處理圖片…');try{const added=[];for(const file of files)added.push({src:await compress(file),caption:''});images.push(...added);render();message('圖片已加入，可填寫說明後儲存記事。')}catch(error){message(error.message)}finally{busy=false;e.target.value=''}};
}
return {html,compress,valid,reset,mount,get(){if(busy)throw Error('圖片仍在處理中，請稍候再儲存。');return images.map(i=>({...i}))}};
})();
