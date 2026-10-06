const keywordGroups=[
 {triggers:['稅','tax'],words:['稅收','稅制','財政','tax','taxation']},
 {triggers:['固態','solid-state'],words:['固態電池','半固態','solid-state','電池','battery']},
 {triggers:['電池','battery'],words:['電池','battery','儲能','energy storage']},
 {triggers:['人工智慧','AI','算力'],words:['AI','人工智慧','artificial intelligence','算力']},
 {triggers:['晶片','半導體','chip'],words:['晶片','半導體','chip','semiconductor']},
 {triggers:['能源','電力','耗電'],words:['能源','電力','energy','electricity']},
 {triggers:['通膨','通貨膨脹','inflation'],words:['通膨','通貨膨脹','inflation','物價']},
 {triggers:['利率','降息','升息'],words:['利率','貨幣政策','interest rate','央行']},
 {triggers:['房價','房市','住房'],words:['房價','房市','住房','housing']},
 {triggers:['股市','股票','美股'],words:['股市','股票','美股','stock market']},
 {triggers:['債','bond'],words:['債券','債務','bond','debt']},
 {triggers:['關稅','tariff'],words:['關稅','貿易','tariff','trade']},
 {triggers:['中國','china'],words:['中國','China']},
 {triggers:['美國','美中','中美','川普','特朗普'],words:['美國','United States','川普','Trump']},
 {triggers:['歐洲','歐盟'],words:['歐洲','歐盟','Europe','EU']},
 {triggers:['戰爭','國防','軍事'],words:['戰爭','國防','軍事','defence']},
 {triggers:['氣候','碳排'],words:['氣候','碳排','climate','carbon']},
 {triggers:['就業','失業','工作'],words:['就業','失業','employment']},
 {triggers:['經濟','成長'],words:['經濟','經濟成長','economy','growth']}
];
function suggestKeywords(title){
 const clean=title.trim(),result=[];
 const add=word=>{if(word&&!result.some(x=>x.toLowerCase()===word.toLowerCase()))result.push(word)};
 for(const group of keywordGroups){if(group.triggers.some(t=>/^[a-z -]+$/i.test(t)?new RegExp('\\b'+t+'\\b','i').test(clean):clean.includes(t)))group.words.forEach(add)}
 const stripped=clean.replace(/有什麼|有哪些|什麼|如何|為什麼|是否|能否|對於|對|的|影響|角度|怎麼|可以|應該|會不會|到底|怎樣/g,' ');
 const segments=new Intl.Segmenter('zh-TW',{granularity:'word'}).segment(stripped);
 const stop=new Set(['國家','事情','這個','我們','他們','以及','之間','可能','問題','哪些','需要','造成','帶來','一個']);
 for(const item of segments){if(item.isWordLike&&item.segment.length>1&&!stop.has(item.segment))add(item.segment)}
 return result.slice(0,12);
}
