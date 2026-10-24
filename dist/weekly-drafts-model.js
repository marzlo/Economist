(()=>{
const dateString=d=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
function monday(value){const d=new Date(value+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)}
function previousWeek(value){const d=new Date(monday(value)+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-7);return d.toISOString().slice(0,10)}
function validate(data){
 if(!data||!/^\d{4}-\d{2}-\d{2}$/.test(data.start)||!Array.isArray(data.notes)||!data.notes.length||!Array.isArray(data.chapters))throw Error('草稿格式不正確');
 const ids=new Set(data.notes.map(n=>n.id)),seen=new Set();if(ids.size!==data.notes.length)throw Error('原記事重複');
 for(const key of ['title','subtitle','intro'])if(typeof data[key]!=='string'||!data[key].trim())throw Error('請填寫標題、導讀與敘事');
 if(!data.chapters.length||data.chapters.length>6)throw Error('章節數量不正確');
 const chapterIds=new Set();for(const c of data.chapters){if(!/^[a-z][a-z0-9-]{0,29}$/.test(c.id)||chapterIds.has(c.id))throw Error('章節識別碼不正確');chapterIds.add(c.id);for(const key of ['name','title','summary','observation','question'])if(typeof c[key]!=='string'||!c[key].trim())throw Error('請填妥各章文字');if(!Array.isArray(c.captions)||c.captions.length<2||c.captions.length>4)throw Error('每章關係圖需 2–4 個概念');for(const id of c.ids){if(!ids.has(id)||seen.has(id))throw Error('章節記事對應不正確');seen.add(id)}}
 if(seen.size!==ids.size)throw Error('有記事尚未分入章節');
 if(data.quote){const n=data.notes.find(n=>n.id===data.quote.noteId);if(!n||!data.quote.text||!n.text.includes(data.quote.text))throw Error('引句必須逐字出自所選記事；可留白移除引句')}
 if(!Array.isArray(data.questions)||!data.questions.length||data.questions.length>4||data.questions.some(q=>!q.trim()))throw Error('請提供 1–4 個延伸問題');
 return data;
}
function previewDocument(template,data,base){validate(data);const serialized=JSON.stringify({...data,status:'draft'}).replace(/</g,'\\u003c');return template.replace('__TITLE__','週報草稿預覽').replace('__DATA__',()=>serialized).replace('<head>','<head><base href="'+new URL('weekly/draft/',base).href+'">')}
const api={dateString,monday,previousWeek,validate,previewDocument};if(typeof module!=='undefined')module.exports=api;else globalThis.WeeklyDrafts=api;
})();
