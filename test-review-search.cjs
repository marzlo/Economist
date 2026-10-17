const assert=require('node:assert/strict');
const bind=require('./dist/review-search.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const input={value:'',selectionStart:0},form={},clear={},results=[];
 global.document={activeElement:input};
 const dispose=bind({input,form,clear,onSearch:value=>results.push(value),onClear:()=>results.push('cleared')});
 input.oncompositionstart();input.value='印度';input.selectionStart=2;
 input.oninput({isComposing:true});
 await wait(210);assert.equal(results.length,0);
 input.oncompositionend();await wait(210);assert.deepEqual(results,['印度']);
 input.value='美國';input.oninput({isComposing:false});await wait(210);assert.equal(results.at(-1),'美國');
 input.value='保險';let prevented=false;form.onsubmit({preventDefault(){prevented=true}});
 assert(prevented);assert.equal(results.at(-1),'保險');
 clear.onclick();assert.equal(results.at(-1),'cleared');dispose();
 console.log('中文組字完成、一般輸入、搜尋提交與清除：全部通過');
})().catch(error=>{console.error(error);process.exit(1)});
