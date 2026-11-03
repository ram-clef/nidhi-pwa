const launch=document.querySelector('#launch-screen');
function ready(){launch?.classList.add('finished');setTimeout(()=>launch?.remove(),220)}
window.addEventListener('nidhi-ready',ready,{once:true});
window.addEventListener('load',()=>setTimeout(ready,700),{once:true});
setTimeout(ready,4000);
function systemChrome(){const dark=document.body.classList.contains('dark');document.querySelector('meta[name="theme-color"]').content=dark?'#111b18':'#f5f6f3'}
new MutationObserver(systemChrome).observe(document.body,{attributes:true,attributeFilter:['class']});systemChrome();
function viewport(){const h=window.visualViewport?.height||innerHeight;document.documentElement.style.setProperty('--visible-height',h+'px');const input=document.activeElement?.matches('input:not([type=checkbox]):not([type=color]),select,textarea');document.body.classList.toggle('keyboard-open',!!input&&h<innerHeight*.8)}
window.visualViewport?.addEventListener('resize',viewport);window.addEventListener('resize',viewport);document.addEventListener('focusin',e=>{viewport();if(e.target.matches('input,select,textarea')&&e.target.closest('dialog,#auth-gate'))setTimeout(()=>e.target.scrollIntoView({block:'nearest',behavior:'smooth'}),220)});document.addEventListener('focusout',()=>setTimeout(viewport,150));viewport();

window.visualViewport?.addEventListener('resize',()=>{if(document.activeElement?.closest('#auth-gate'))setTimeout(()=>document.activeElement?.scrollIntoView({block:'center',behavior:'smooth'}),100)});

let pullStart=0;
document.addEventListener('touchstart',e=>{if(e.touches.length===1)pullStart=e.touches[0].clientY},{passive:true});
document.addEventListener('touchmove',e=>{if(e.touches.length!==1||e.touches[0].clientY<=pullStart||scrollY>0||e.target.closest('input,select,textarea'))return;let el=e.target;while(el&&el!==document.body){if(el.scrollTop>0)return;el=el.parentElement}if(e.cancelable)e.preventDefault()},{passive:false});
