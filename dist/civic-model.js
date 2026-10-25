(()=>{
const scopes=['中央','國際','臺北市','新北市','桃園市','臺中市','臺南市','高雄市','基隆市','新竹市','嘉義市','新竹縣','苗栗縣','彰化縣','南投縣','雲林縣','嘉義縣','屏東縣','宜蘭縣','花蓮縣','臺東縣','澎湖縣','金門縣','連江縣'];
const states=['待查證','推進中','已達成','受阻'];
const safeUrl=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
const normalize=value=>String(value||'').toLowerCase().replace(/台/g,'臺');
function recommendations(topic,news,videos){
 const terms=topic.keys.map(normalize).filter(Boolean),seen=new Set();
 return [...news,...videos.map(v=>({...v,type:'影片',source:'下一章閱讀'}))].filter(item=>{
  const url=safeUrl(item.url);if(!url||seen.has(url))return false;
  const haystack=normalize(item.title+' '+(item.description||''));
  if(!terms.some(term=>haystack.includes(term)))return false;
  seen.add(url);return true;
 }).sort((a,b)=>(Date.parse(b.published)||0)-(Date.parse(a.published)||0)).slice(0,12);
}
function criteria(lines,previous,id){return [...new Set(lines.split('\n').map(s=>s.trim()).filter(Boolean))].map(text=>previous.find(c=>c.text===text)||{id:id(),text,status:'待查證'})}
function saveCriterion(topic,value,criterionId,id){
 const text=String(value||'').trim(),list=topic.criteria||[],before=criterionId?list.find(c=>c.id===criterionId):null;
 if(!text)throw Error('請填寫指標內容。');
 if(text.length>500)throw Error('指標內容請控制在 500 字以內。');
 if(criterionId&&!before)throw Error('這個指標已不存在，請重新開啟。');
 const key=t=>normalize(t).replace(/\s+/g,' ');
 if(list.some(c=>c.id!==criterionId&&key(c.text)===key(text)))throw Error('已經有相同的指標。');
 const item=before?{...before,text,updatedAt:new Date().toISOString()}:{id:id(),text,status:'待查證'};
 return {...topic,criteria:before?list.map(c=>c.id===criterionId?item:c):[...list,item]};
}
function removeCriterion(topic,id){return {...topic,criteria:(topic.criteria||[]).filter(c=>c.id!==id)}}
function criterionRecords(topic,id){const c=(topic.criteria||[]).find(c=>c.id===id);return (topic.entries||[]).filter(e=>e.criterionId?e.criterionId===id:!!c&&e.label==='進度紀錄'&&e.title===c.text)}
function landmark(scope,credits){const item=credits[scope];if(!item||!/^landmarks\/[a-z0-9-]+\.(jpg|png|webp|svg)$/.test(item.file)||!safeUrl(item.source))return null;return item}
function removeTopic(list,id){return list.filter(i=>i.id!==id).map(i=>({...i,entries:(i.entries||[]).map(e=>Array.isArray(e.issueIds)&&e.issueIds.includes(id)?{...e,issueIds:e.issueIds.filter(owner=>owner!==id)}:e)}))}
const api={scopes,states,safeUrl,normalize,recommendations,criteria,saveCriterion,removeCriterion,criterionRecords,landmark,removeTopic};
if(typeof module!=='undefined')module.exports=api;else globalThis.CivicModel=api;
})();
