(()=>{
 const normalized=value=>String(value).trim().replace(/\s+/g,' ').replace(/台/g,'臺').toLowerCase();
 function mergeKeywords(current,added){const result=[],seen=new Set();for(const word of [...current.split(/[,，\n]/),...added]){const term=String(word).trim(),key=normalized(term);if(term&&!seen.has(key)){result.push(term);seen.add(key)}}return result.join(', ')}
 const groups=[
  {triggers:['松山機場','松機'],base:'松山機場',aliases:['松機']},
  {triggers:['光電','太陽能'],base:'光電',aliases:['太陽光電','太陽能發電']},
  {triggers:['風電','風力發電'],base:'風電',aliases:['風力發電']},
  {triggers:['社會住宅','社宅'],base:'社會住宅',aliases:['社宅']},
  {triggers:['捷運'],base:'捷運',aliases:['捷運建設']},
  {triggers:['行人安全','行人路權','人行道'],base:'行人安全',aliases:['人行道改善','行人路權']},
  {triggers:['垃圾焚化','焚化爐'],base:'焚化爐',aliases:['垃圾焚化']},
  {triggers:['長照','長期照顧'],base:'長照',aliases:['長期照顧']}
 ];
 const directions=[[/環評|環境影響評估/,'環評'],[/土地|用地|農地/,'土地使用'],[/成本|預算|經費/,'成本'],[/時程|階段|進度/,'進度'],[/專案小組|跨部會/,'跨部會'],[/替代方案/,'替代方案'],[/醫療/,'醫療'],[/國防/,'國防']];
 function suggest({name,scope='',note='',criteria=''}){
  const title=name.trim();if(!title)throw Error('請先填寫議題名稱。');
  const group=groups.find(g=>g.triggers.some(term=>title.includes(term))),base=group?.base||title.split(/[：:｜|？?]/)[0].trim();
  const city=['中央','國際','全部'].includes(scope)?'':scope.replace(/[縣市]$/,''),context=note+' '+criteria,result=[],seen=new Set();
  const add=(term,reason)=>{const key=normalized(term);if(term.length<2||term.length>40||/[,，\n]/.test(term)||seen.has(key))return;seen.add(key);result.push({term,reason})};
  add(city&&!normalized(base).includes(normalized(city))?city+base:base,'議題名稱與追蹤地區');
  add(base,'議題核心詞');
  for(const [pattern,suffix] of directions)if(pattern.test(context))add(base+suffix,'依你填寫的觀察方向延伸');
  for(const alias of group?.aliases||[])add(city?city+alias:alias,'常見稱呼與地區組合');
  for(const alias of group?.aliases||[])add(alias,'常見別稱');
  return result.slice(0,8);
 }
 const api={mergeKeywords,suggest};if(typeof module!=='undefined')module.exports=api;else globalThis.CivicKeywords=api;
})();
