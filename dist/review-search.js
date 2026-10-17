(function(scope){
 function bindReviewSearch({input,form,clear,onSearch,onClear}){
  let composing=false,timer;
  const cancel=()=>clearTimeout(timer);
  const apply=()=>{cancel();if(composing)return;onSearch(input.value,input.selectionStart,document.activeElement===input)};
  input.oncompositionstart=()=>{composing=true;cancel()};
  input.oncompositionend=()=>{composing=false;cancel();timer=setTimeout(apply,180)};
  input.oninput=event=>{if(composing||event.isComposing)return;cancel();timer=setTimeout(apply,180)};
  input.onsearch=()=>{if(!composing)apply()};
  form.onsubmit=event=>{event.preventDefault();if(!composing)apply()};
  clear.onclick=()=>{cancel();composing=false;onClear()};
  return cancel;
 }
 scope.bindReviewSearch=bindReviewSearch;if(typeof module!=='undefined')module.exports=bindReviewSearch;
})(typeof window==='undefined'?globalThis:window);
