/* Five-minute, foreground-only garden atmosphere. Independent of crop economics. */
(function(root){
 'use strict';
 const CYCLE=300, smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 function phase(seconds){
  const t=((seconds%CYCLE)+CYCLE)%CYCLE;
  if(t<150)return {name:'白天',night:0,warm:0};
  if(t<195)return {name:'黄昏',night:0,warm:smooth((t-150)/15)+.25*smooth((t-172.5)/22.5)};
  if(t<270){const n=smooth((t-195)/15);return {name:'夜晚',night:n,warm:1.25*(1-n)};}
  const dawn=smooth((t-270)/30);
  return {name:'天亮',night:1-dawn,warm:Math.sin(Math.PI*dawn)*.45};
 }
 function createWeather(random=Math.random){
  let next=60+random()*30,start=-Infinity,end=-Infinity;
  return {sample(t){
   if(t>=next){
    if(random()<.45){start=t;end=t+40+random()*30;next=end+75+random()*30;}
    else next=t+30;
   }
   return Math.min(smooth((t-start)/6),smooth((end-t)/8));
  }};
 }
 const api={CYCLE,phase,createWeather};
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(!root.document)return;
 const world=document.getElementById('world'),viewport=document.getElementById('viewport');
 // Isolate background grading so interactive sprites keep readable local colors.
 const scenery=document.createElement('div');scenery.className='environment-scenery';world.prepend(scenery);scenery.append(world.querySelector('.background'));
 const tint=document.createElement('div');tint.className='environment-tint';tint.setAttribute('aria-hidden','true');scenery.append(tint);
 const color=document.createElement('div');color.className='environment-color';color.setAttribute('aria-hidden','true');scenery.append(color);
 const lights=document.createElement('div');lights.className='environment-lights';
 // Coordinates use the original background's 941 x 1672 canvas, stretched with it.
 lights.innerHTML=`<svg viewBox="0 0 941 1672" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="spriteAtmosphere" color-interpolation-filters="sRGB"><feColorMatrix id="spriteColorMatrix" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter><radialGradient id="gardenGlow"><stop stop-color="#ffcc73" stop-opacity=".85"/><stop offset="1" stop-color="#ffbf58" stop-opacity="0"/></radialGradient></defs><g fill="url(#gardenGlow)"><ellipse cx="319" cy="255" rx="65" ry="64"/><ellipse cx="233" cy="380" rx="46" ry="45"/><ellipse cx="390" cy="324" rx="100" ry="110"/><ellipse cx="318" cy="372" rx="48" ry="53"/><ellipse cx="345" cy="483" rx="100" ry="35"/><ellipse cx="264" cy="466" rx="60" ry="27"/><ellipse cx="753" cy="455" rx="91" ry="94"/><ellipse cx="855" cy="484" rx="76" ry="91"/><ellipse cx="808" cy="567" rx="122" ry="34"/></g><g fill="#ffe6a1" opacity=".88"><path d="M306 246 Q310 237 316 236 L316 248 Z M324 235 Q331 239 332 246 L324 249 Z M305 256 L316 253 L316 267 L305 270 Z M324 253 L334 251 L334 265 L324 267 Z"/><path d="M224 377 Q226 369 230 368 L230 377 Z M236 367 Q241 370 242 375 L236 377 Z M223 383 L230 381 L230 394 L223 396 Z M236 381 L243 379 L243 391 L236 393 Z"/><path d="M307 365 Q310 358 315 357 L315 371 L306 374 Z M321 355 Q328 356 330 365 L330 368 L321 371 Z M306 379 L315 376 L315 383 L306 386 Z M321 376 L330 373 L330 380 L321 383 Z"/><path d="M379 313 L386 316 L386 330 L379 327 Z M391 316 L400 312 L399 327 L391 331 Z"/></g><g data-shop-light fill="#ffe1a0"><ellipse cx="731" cy="419" rx="7" ry="3" opacity=".85"/><ellipse cx="852" cy="447" rx="7" ry="3" opacity=".85"/><path d="M715 440 L724 443 L724 481 L715 478 Z" opacity=".25"/><path d="M839 467 L847 470 L847 507 L839 504 Z" opacity=".25"/></g></svg>`;
 world.append(lights);
 const spriteMatrix=lights.querySelector('#spriteColorMatrix');
 const moonlight=document.createElement('div');moonlight.className='environment-moonlight';moonlight.setAttribute('aria-hidden','true');world.append(moonlight);
 const rain=document.createElement('canvas');rain.className='environment-rain';rain.setAttribute('aria-hidden','true');viewport.append(rain);
 const badge=document.createElement('span');badge.className='environment-badge';const hud=document.querySelector('.hud');hud.append(badge);
 function positionBadge(){const level=document.getElementById('levelButton').getBoundingClientRect(),hr=hud.getBoundingClientRect();badge.style.left=(level.left-hr.left)+'px';badge.style.top=(level.bottom-hr.top+8)+'px';}
 new ResizeObserver(positionBadge).observe(hud);positionBadge();
 const ctx=rain.getContext('2d'),weather=createWeather();let elapsed=0,last=null,raf=0,w=0,h=0,lastPaint=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const fireflies=Array.from({length:15},(_,i)=>({x:.12+Math.random()*.76,y:i<5?.13+Math.random()*.14:.79+Math.random()*.13,seed:Math.random()*Math.PI*2,speed:.18+Math.random()*.22,radius:1.2+Math.random()*.8}));
 const drops=Array.from({length:115},()=>({x:Math.random(),y:Math.random(),speed:240+Math.random()*240,length:15+Math.random()*22,near:Math.random()>.65}));
 function resize(){w=viewport.clientWidth;h=viewport.clientHeight;const dpr=Math.min(devicePixelRatio||1,2);rain.width=w*dpr;rain.height=h*dpr;ctx?.setTransform(dpr,0,0,dpr,0,0);}
 new ResizeObserver(resize).observe(viewport);resize();
 function frame(now){
  const dt=last===null?0:Math.max(0,(now-last)/1000);last=now;elapsed+=dt;
  if(now-lastPaint>=33){
   lastPaint=now;const p=phase(elapsed),wet=weather.sample(elapsed);
   // Multiply preserves the paper texture; soft light adds chroma instead of a gray veil.
   const r=Math.round(255-126*p.night-18*wet),g=Math.round(255-36*p.warm-103*p.night-12*wet),b=Math.round(255-78*p.warm-18*p.night-5*wet);
   tint.style.background=`rgb(${r},${g},${b})`;
   color.style.background=`linear-gradient(155deg,rgba(255,145,25,${p.warm*.30}),rgba(255,190,48,${p.warm*.14})),linear-gradient(rgba(68,85,255,${p.night*.32}),rgba(83,104,238,${p.night*.22}))`;
   badge.dataset.phase=p.name;badge.dataset.rain=wet>.05?'true':'false';
   // Share the background's warm/cool direction, with milder channel attenuation.
   const sr=1-p.night*.32-p.warm*.02-wet*.035,sg=1-p.night*.27-p.warm*.09-wet*.025,sb=1-p.night*.08-p.warm*.20;
   spriteMatrix.setAttribute('values',`${sr} 0 0 0 0 0 ${sg} 0 0 0 0 0 ${sb} 0 0 0 0 0 1 0`);
   lights.style.opacity=p.night*.88+p.warm*.12;
   world.style.setProperty('--night-light',p.night);
   world.style.setProperty('--soil-saturation',1-p.night*.35);
   world.style.setProperty('--soil-brightness',1-p.night*.08);
   moonlight.style.opacity=p.night*(1-wet*.8);
   const text=`${p.night>.7?'☾':p.name==='白天'?'☀':'◒'} ${p.name} · ${wet>.05?'小雨':'晴'} `;
   if(badge.textContent!==text)badge.textContent=text;
   if(ctx){ctx.clearRect(0,0,w,h);if(wet>.001){
    for(const near of [false,true]){ctx.strokeStyle=`rgba(225,242,255,${wet*(near?.7:.32)})`;ctx.lineWidth=near?1.5:.8;ctx.beginPath();
     for(const d of drops){if(d.near!==near)continue;const y=reduced.matches?d.y*h:(d.y*h+elapsed*d.speed)%(h+60)-30;const x=(d.x*w-y*.23+w)%w;ctx.moveTo(x,y);ctx.lineTo(x-d.length*.23,y+d.length);}
     ctx.stroke();
    }
   }
    // Five upper and ten lower drifting lights; the center remains clear.
    if(p.night>.001){for(const f of fireflies){
     const t=reduced.matches?0:elapsed*f.speed,x=f.x*w+Math.sin(t+f.seed)*w*.035+Math.sin(t*.43+f.seed)*w*.015,y=f.y*h+Math.cos(t*.73+f.seed)*h*.018;
     const alpha=p.night*(1-wet*.7)*(reduced.matches?.65:.4+.6*(.5+.5*Math.sin(t*1.6+f.seed)));
     const glow=ctx.createRadialGradient(x,y,0,x,y,10);glow.addColorStop(0,`rgba(247,255,168,${alpha*.8})`);glow.addColorStop(.25,`rgba(221,249,121,${alpha*.3})`);glow.addColorStop(1,'rgba(221,249,121,0)');
     ctx.fillStyle=glow;ctx.fillRect(x-10,y-10,20,20);ctx.fillStyle=`rgba(255,255,202,${alpha})`;ctx.beginPath();ctx.arc(x,y,f.radius,0,Math.PI*2);ctx.fill();
    }}
   }
  }
  raf=requestAnimationFrame(frame);
 }
 document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);last=null;if(!document.hidden)raf=requestAnimationFrame(frame);});
 raf=requestAnimationFrame(frame);
})(typeof window==='undefined'?globalThis:window);
