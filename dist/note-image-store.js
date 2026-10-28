/* Store newly pasted/uploaded note images as separate GitHub files, never Base64 in issues.json. */
window.NoteImageStore=(()=>{
 const repo='marzlo/Economist';
 const root='https://api.github.com/repos/'+repo+'/contents/';
 const raw='https://raw.githubusercontent.com/'+repo+'/main/';
 const validData=/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
 async function uploadOne(image){
  const match=String(image.src||'').match(validData);
  if(!match)return {...image};
  const token=localStorage.getItem('economist-github-token');
  if(!token)throw Error('上傳圖片需要先在「GitHub 同步設定」設定權杖。原有記事與圖片均未變更。');
  const id=crypto.randomUUID(),path='media/entry-images/'+id+'.jpg';
  const response=await fetch(root+path,{method:'PUT',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({message:'Add note image '+id,content:match[1],branch:'main'}),signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('圖片上傳 GitHub 失敗（HTTP '+response.status+'），記事尚未儲存，請重試。');
  return {...image,src:raw+path};
 }
 async function uploadAll(images){const output=[];for(const image of images)output.push(await uploadOne(image));return output}
 return {uploadAll};
})();
