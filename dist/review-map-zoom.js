(()=>{
const W=900,H=330;
function constrain(s){s.scale=Math.max(1,Math.min(8,s.scale));s.x=Math.max(W*(1-s.scale),Math.min(0,s.x));s.y=Math.max(H*(1-s.scale),Math.min(0,s.y));return s}
function zoom(s,scale,from,to=from){const ratio=scale/s.scale;return constrain({scale,x:to.x-(from.x-s.x)*ratio,y:to.y-(from.y-s.y)*ratio})}
function bind(svg,controls,state){
 const layer=svg.querySelector('.rv-map-content'),pointers=new Map();let base=null,moved=false,suppressUntil=0;
 const point=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())};
 const gesture=()=>{const a=[...pointers.values()];return {center:a.length>1?{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2}:a[0],distance:a.length>1?Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y):0}};
 function draw(next){Object.assign(state,constrain(next));layer.setAttribute('transform',`translate(${state.x} ${state.y}) scale(${state.scale})`);controls.querySelector('output').textContent=Math.round(state.scale*100)+'%';controls.querySelector('[data-zoom="out"]').disabled=state.scale<=1;controls.querySelector('[data-zoom="in"]').disabled=state.scale>=8}
 function baseline(){base=pointers.size?{...gesture(),state:{...state}}:null}
 svg.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(!pointers.size)moved=false;pointers.set(e.pointerId,point(e));baseline()});
 svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,point(e));const g=gesture();if(Math.hypot(g.center.x-base.center.x,g.center.y-base.center.y)>3||Math.abs(g.distance-base.distance)>3)moved=true;
 if(moved){if(!svg.hasPointerCapture(e.pointerId))svg.setPointerCapture(e.pointerId);const scale=base.distance>0?Math.max(1,Math.min(8,base.state.scale*g.distance/base.distance)):base.state.scale;draw(zoom(base.state,scale,base.center,g.center));e.preventDefault()}});
 const finish=e=>{if(!pointers.has(e.pointerId))return;if(moved||pointers.size>1)suppressUntil=Date.now()+500;pointers.delete(e.pointerId);baseline()};
 ['pointerup','pointercancel','lostpointercapture'].forEach(name=>svg.addEventListener(name,finish));
 svg.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
 controls.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{const action=b.dataset.zoom;draw(action==='reset'?{scale:1,x:0,y:0}:zoom(state,Math.max(1,Math.min(8,state.scale*(action==='in'?1.5:1/1.5))),{x:W/2,y:H/2}))});
 draw(state);
}
const api={constrain,zoom,bind};if(typeof module!=='undefined')module.exports=api;else globalThis.ReviewMapZoom=api;
})();
