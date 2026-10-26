/* Small local renderer for basic Mermaid flowchart nodes and directed edges.
   Unsupported syntax stays visible as code; no scripts or remote images execute. */
window.NoteDiagrams=(()=>{
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(source){
 if(source.length>12000)return null;
 const lines=source.trim().split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('%%'));
 if(!/^flowchart\s+(TD|TB|LR)$/.test(lines.shift()||''))return null;
 const nodes=new Map(),edges=[];
 const node=/^([A-Za-z][\w-]*)(?:\["([^"\n]*)"\]|\[([^\]\n]*)\])?/;
 function read(s){const m=node.exec(s);if(!m)return null;const id=m[1],label=m[2]??m[3];if(label!==undefined)nodes.set(id,label);else if(!nodes.has(id))nodes.set(id,id);return {id,rest:s.slice(m[0].length).trim()}}
 for(const line of lines){let a=read(line);if(!a)return null;while(a.rest){if(!a.rest.startsWith('-->'))return null;const b=read(a.rest.slice(3).trim());if(!b)return null;edges.push([a.id,b.id]);a=b}}
 if(!nodes.size||nodes.size>24||edges.length>40)return null;
 const rank=new Map([...nodes.keys()].map(id=>[id,0]));
 for(let i=0;i<nodes.size;i++){let changed=false;for(const[a,b]of edges)if(rank.get(b)<=rank.get(a)){rank.set(b,rank.get(a)+1);changed=true}if(!changed)break;if(i===nodes.size-1)return null}
 const rows=[];for(const[id,label]of nodes){const r=rank.get(id);(rows[r]??=[]).push({id,label})}
 const cols=Math.max(...rows.map(r=>r.length)),w=Math.max(340,cols*280+24),h=rows.length*140+20,positions=new Map();
 rows.forEach((row,r)=>row.forEach((n,c)=>positions.set(n.id,{x:(w-row.length*280)/2+c*280+12,y:r*140+12})));
 const paths=edges.map(([a,b])=>{const p=positions.get(a),q=positions.get(b),x=p.x+128,y=p.y+96,xx=q.x+128,yy=q.y;return `<path d="M${x} ${y}C${x} ${y+24} ${xx} ${yy-24} ${xx} ${yy}M${xx-4} ${yy-7}L${xx} ${yy}L${xx+4} ${yy-7}"/>`}).join('');
 const cards=[...nodes].map(([id,label])=>{const p=positions.get(id),parts=label.split(/<br\s*\/?\s*>|\\n/i).flatMap(s=>{const chars=[...s],result=[];while(chars.length)result.push(chars.splice(0,18).join(''));return result}).slice(0,4);return `<g><rect x="${p.x}" y="${p.y}" width="256" height="96" rx="12"/><text x="${p.x+128}" y="${p.y+34}">${parts.map((s,i)=>`<tspan x="${p.x+128}" dy="${i?22:0}" class="${i?'note-diagram-detail':''}">${esc(s)}</tspan>`).join('')}</text></g>`}).join('');
 return `<div class="entry-diagram-scroll" tabindex="0" role="region" aria-label="記事流程圖，可左右滑動"><svg xmlns="http://www.w3.org/2000/svg" class="entry-diagram" style="min-width:${w}px" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc([...nodes.values()].map(s=>s.replace(/<br\s*\/?\s*>/gi,'，')).join('；'))}"><g class="note-diagram-edges">${paths}</g>${cards}</svg></div>`;
}
return {render};
})();
