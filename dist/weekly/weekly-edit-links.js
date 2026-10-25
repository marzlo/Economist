/* Open the current source note, rather than editing a published weekly snapshot. */
(()=>{
if(typeof DATA!=='undefined'&&DATA.status==='draft')return;
const notes=document.getElementById('notes');if(!notes)return;
const app=new URL('../../',document.baseURI);
function decorate(){
 notes.querySelectorAll('details.note').forEach(note=>{
  if(note.querySelector('.weekly-edit-original'))return;
  const id=note.id.replace(/^note-/,''),url=new URL(app.href);
  url.searchParams.set('edit-entry',id);url.searchParams.set('return-to',location.pathname+'#'+note.id);
  const link=document.createElement('a');link.className='weekly-edit-original text-button';link.href=url.href;link.textContent='✎ 編輯原記事';
  Object.assign(link.style,{display:'inline-block',margin:'14px 0',fontSize:'16px'});
  note.querySelector('.note-meta')?.after(link);
 });
}
decorate();new MutationObserver(decorate).observe(notes,{childList:true});
if(location.hash.startsWith('#note-'))requestAnimationFrame(()=>{let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return}const note=document.getElementById(id);if(note?.matches('details.note')){note.open=true;note.scrollIntoView({block:'start'})}});
})();
