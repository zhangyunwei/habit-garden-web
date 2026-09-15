/* Persistent Canvas sprite nodes: one RAF for both animals, DOM gestures stay intact. */
(function(root){
'use strict';
function drawFrame(ctx,id,row,frame,facing,image){
 const atlas=GARDEN_ANIMAL_ATLAS.atlases[id],f=atlas.rows[row][frame],scale=atlas.scale;
 ctx.clearRect(0,0,256,256);ctx.save();ctx.translate(128,230);ctx.scale(facing,1);
 ctx.drawImage(image,f.x,f.y,f.w,f.h,-f.anchorX*scale,-f.anchorY*scale,f.w*scale,f.h*scale);ctx.restore();
}
function create({G,container,getState,getMode,getHeld,getTalking,isPaused,asset}){
 const motion=GardenAnimalMotion.create(G),images=new Map(),views=new Map();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let last=0,editSnapshot=null;
 function load(id){if(images.has(id))return images.get(id);const entry={image:new Image(),ready:false,error:false};images.set(id,entry);
  entry.image.onload=()=>{entry.ready=true;const v=views.get(id);if(v){v.key='';paint(id,v,true);}};
  entry.image.onerror=()=>{entry.error=true;console.warn('Animal atlas unavailable:',id);const v=views.get(id);if(v)paint(id,v,true);};
  entry.image.src=asset(GARDEN_ANIMAL_ATLAS.atlases[id].src);return entry;
 }
 function position(id){const d=getState().animals[id],a=motion.position(id);if(getMode()==='edit'&&a&&(d.x!==a.home.x||d.y!==a.home.y))return d;return a||d;}
 function paint(id,v,force=false){
  const a=motion.position(id),entry=load(id);if(!a)return;
  const editing=getMode()==='edit';let name=a.action==='walk'&&a.back?'walkBack':a.action;
  if(reduced.matches)name='idle';
  const clip=GardenAnimalMotion.clipFor(id,name);
  let frame=clip.once?Math.min(clip.count-1,Math.floor(a.elapsed*clip.fps)):Math.floor(a.elapsed*clip.fps)%clip.count;if(clip.reverse)frame=clip.count-1-frame;
  if(reduced.matches)frame=0;
  const facing=a.facing,key=`${clip.row}:${frame}:${facing}:${entry.ready}`;
  if(!force&&(editing||key===v.key))return;
  const ctx=v.canvas.getContext('2d');ctx.clearRect(0,0,256,256);
  if(entry.ready)drawFrame(ctx,id,clip.row,frame,facing,entry.image);
  else if(v.fallback.complete&&v.fallback.naturalWidth){ctx.drawImage(v.fallback,32,18,192,212);}
  v.key=key;v.canvas.dataset.action=name;v.canvas.dataset.frame=frame;
 }
 function sync(){
  const s=getState(),editing=getMode()==='edit';motion.sync(s,editing);
  for(const [id,v] of views)if(!G.active(s,id)){v.wrap.remove();views.delete(id);}
  for(const info of G.animals){const id=info.id;if(!G.active(s,id))continue;
   let v=views.get(id);if(!v){
    const wrap=document.createElement('div');wrap.className='animal-wrap';wrap.dataset.animal=id;
    const shadow=document.createElement('i');shadow.className='animal-shadow';shadow.setAttribute('aria-hidden','true');
    const canvas=document.createElement('canvas');canvas.className='animal';canvas.width=canvas.height=256;canvas.setAttribute('role','button');canvas.setAttribute('aria-label',info.name+'，点击互动，长按编辑');canvas.tabIndex=0;
    const bubble=document.createElement('span');bubble.className='bubble';bubble.hidden=true;
    wrap.append(shadow,canvas,bubble);container.append(wrap);
    const fallback=new Image();fallback.onload=()=>{if(views.has(id))paint(id,views.get(id),true);};fallback.src=asset(`assets/coral/sprites/animals/animal_${id}_idle.webp`);
    v={wrap,canvas,bubble,fallback,key:''};views.set(id,v);load(id);
    // An animal first activated in an edit draft still needs a preview.
    if(!motion.position(id)){const isolated=G.clone(s);motion.sync(isolated,false);motion.sync(s,editing);}
    paint(id,v,true);
   }
   v.wrap.classList.remove('dragging');
   const p=position(id);v.wrap.style.left=p.x+'px';v.wrap.style.top=p.y+'px';v.wrap.style.zIndex=Math.round(p.y);v.wrap.style.transform='';v.wrap.style.transition='none';
  }
 }
 function frame(now){const dt=last?(now-last)/1000:0;last=now;
  const paused=document.hidden||isPaused();
  motion.tick(getState(),dt,{paused,held:getHeld(),talking:getTalking(),reduced:reduced.matches});
  if(!paused&&getMode()!=='edit')for(const [id,v] of views){const p=motion.position(id);if(!p)continue;v.wrap.style.left=p.x+'px';v.wrap.style.top=p.y+'px';v.wrap.style.zIndex=Math.round(p.y);paint(id,v);}
  requestAnimationFrame(frame);
 }
 document.addEventListener('visibilitychange',()=>{last=0;});
 reduced.addEventListener('change',()=>{for(const [id,v]of views)paint(id,v,true);});
 requestAnimationFrame(frame);
 function beginEdit(){editSnapshot=JSON.stringify([...motion.actors]);}
 function endEdit(){if(editSnapshot){motion.actors.clear();for(const [id,a]of JSON.parse(editSnapshot))motion.actors.set(id,a);editSnapshot=null;}for(const v of views.values())v.key='';}
 return {sync,position,beginEdit,endEdit,respond:id=>motion.respond(id),motion,snapshot:id=>views.get(id)?.canvas.toDataURL('image/png')};
}
root.GardenAnimalRenderer={create,drawFrame};
})(window);
