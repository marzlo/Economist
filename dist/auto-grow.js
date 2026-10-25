(()=>{
const selector='#entry-text,#civic-progress-note';
const widths=new WeakMap();
let frame=0;
function fit(area){
 if(!area.getClientRects().length||!area.clientWidth)return;
 const style=getComputedStyle(area),mirror=document.createElement('textarea');
 mirror.tabIndex=-1;mirror.setAttribute('aria-hidden','true');
 Object.assign(mirror.style,{position:'fixed',left:'-10000px',top:'0',visibility:'hidden',height:'0',minHeight:'0',maxHeight:'none',width:area.clientWidth+'px',boxSizing:'border-box',border:'0',overflow:'hidden',resize:'none',whiteSpace:'pre-wrap',overflowWrap:'break-word'});
 for(const key of ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','wordSpacing','textIndent','textTransform','tabSize','paddingTop','paddingBottom','paddingLeft','paddingRight'])mirror.style[key]=style[key];
 mirror.value=area.value;document.body.append(mirror);
 const number=value=>parseFloat(value)||0,border=number(style.borderTopWidth)+number(style.borderBottomWidth),padding=number(style.paddingTop)+number(style.paddingBottom),line=number(style.lineHeight)||number(style.fontSize)*1.5;
 const height=Math.ceil(Math.max(mirror.scrollHeight+border,line*(area.rows||4)+padding+border,number(style.minHeight)));
 mirror.remove();
 if(area.style.height!==height+'px')area.style.height=height+'px';
 area.scrollTop=0;
}
function refresh(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>document.querySelectorAll(selector).forEach(fit))}
document.querySelectorAll(selector).forEach(area=>{
 area.style.overflowY='hidden';area.style.resize='none';area.style.maxHeight='none';
 const observer=new ResizeObserver(()=>{const width=area.clientWidth;if(width!==widths.get(area)){widths.set(area,width);fit(area)}});observer.observe(area);
 const dialog=area.closest('dialog');if(dialog)new MutationObserver(refresh).observe(dialog,{attributes:true,attributeFilter:['open']});
});
document.addEventListener('input',e=>{if(e.target.matches?.(selector))fit(e.target)});
document.addEventListener('focusin',e=>{if(e.target.matches?.(selector))fit(e.target)});
window.addEventListener('resize',refresh);document.fonts?.ready.then(refresh);refresh();
})();
