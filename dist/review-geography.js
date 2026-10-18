(()=>{
const coastalNeighbors={tw:['cn','jp','ph','kr'],jp:['kr','kp','cn','tw','ru'],gb:['ie','fr','be','nl'],au:['nz','id','pg','tl'],nz:['au','fj','nc']};
const distance=(a,b)=>Math.hypot(a.xy[0]-b.xy[0],a.xy[1]-b.xy[1]);
function nearby(data,id){const c=data.find(c=>c.id===id);if(!c)return [];const neighbors=[...c.borders,...(coastalNeighbors[id]||[])];return [c,...data.filter(n=>n.id!==id).sort((a,b)=>(neighbors.includes(b.id)?1:0)-(neighbors.includes(a.id)?1:0)||distance(c,a)-distance(c,b)).slice(0,6)]}
function focus(data,id){const list=nearby(data,id);if(!list.length)return null;const c=list[0],xs=list.map(n=>n.xy[0]),ys=list.map(n=>n.xy[1]);
 // Retain the selected country's outline when it fits the regional view; ignore faraway overseas territories.
 if(c.bounds){const [a,b]=c.bounds;if(b[0]-a[0]<250&&b[1]-a[1]<170&&Math.hypot((a[0]+b[0])/2-c.xy[0],(a[1]+b[1])/2-c.xy[1])<55){xs.push(a[0],b[0]);ys.push(a[1],b[1])}}
 const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),scale=Math.max(1.4,Math.min(5,900/(right-left+90),330/(bottom-top+75)));
 return {scale,x:450-(left+right)/2*scale,y:165-(top+bottom)/2*scale};
}
function bind(svg,data,id){const ns='http://www.w3.org/2000/svg',layer=document.createElementNS(ns,'g');layer.setAttribute('class','rv-geo-labels');layer.setAttribute('aria-hidden','true');svg.append(layer);
 return state=>{layer.replaceChildren();if(state.scale<1.35)return;const ratio=900/(svg.getBoundingClientRect().width||900),occupied=[],priority=nearby(data,id).map(c=>c.id),items=[...data].sort((a,b)=>{const ai=priority.indexOf(a.id),bi=priority.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi)});
 for(const c of items){const x=c.xy[0]*state.scale+state.x,y=c.xy[1]*state.scale+state.y;if(x<10||x>890||y<10||y>320)continue;const width=Math.max(c.name.length*12+22,c.capital.length*7,70)*ratio+12*ratio,height=34*ratio;
 const candidates=[[x+16*ratio,y-height/2],[x-width-16*ratio,y-height/2],[x-width/2,y+20*ratio],[x-width/2,y-height-20*ratio]];
 const pos=candidates.find(([a,b])=>a>=2&&a+width<=898&&b>=2&&b+height<=328&&!occupied.some(r=>a<r.x+r.w+4&&a+width+4>r.x&&b<r.y+r.h+4&&b+height+4>r.y));if(!pos)continue;
 const [a,b]=pos;occupied.push({x:a,y:b,w:width,h:height});const group=document.createElementNS(ns,'g');
 const line=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:x,y1:y,x2:a+width/2,y2:b+height/2}))line.setAttribute(k,v);group.append(line);
 const rect=document.createElementNS(ns,'rect');for(const [k,v] of Object.entries({x:a,y:b,width,height,rx:3*ratio}))rect.setAttribute(k,v);group.append(rect);
 const image=document.createElementNS(ns,'image');for(const [k,v] of Object.entries({href:'flags/'+c.id+'.svg',x:a+6*ratio,y:b+4*ratio,width:18*ratio,height:12*ratio}))image.setAttribute(k,v);group.append(image);
 const text=document.createElementNS(ns,'text');text.setAttribute('x',a+28*ratio);text.setAttribute('y',b+14*ratio);text.setAttribute('font-size',12*ratio);text.textContent=c.name;group.append(text);
 const capital=document.createElementNS(ns,'text');capital.setAttribute('class','rv-geo-capital');capital.setAttribute('x',a+6*ratio);capital.setAttribute('y',b+28*ratio);capital.setAttribute('font-size',11*ratio);capital.textContent=c.capital;group.append(capital);layer.append(group);
 }
 };
}
const api={nearby,focus,bind};if(typeof module!=='undefined')module.exports=api;else globalThis.ReviewMapGeography=api;
})();
