'use strict';
const asset=path=>window.GARDEN_ASSETS?.[path]||path;
const G=Garden,$=id=>document.getElementById(id),KEY='habit-garden-web-v1';
let state=G.initial(),storageOK=true,storageError=null;
try{const raw=localStorage.getItem(KEY);if(raw){const loaded=G.load(raw);state=loaded.state;storageError=loaded.error;if(loaded.error)console.warn('Garden save reset:',loaded.error);}}catch(e){storageOK=false;}
let mode='browse',selectedSeed='daisy',draft=null,selectedObject=null,modalType=null,modalTab='seeds',gesture=null,queuedLevels=[],toastTimer,audioCtx,confirmAction=null,previousFocus=null;
let seedPlot=null;
const seedBubble=document.createElement('section');seedBubble.id='seedBubble';seedBubble.hidden=true;seedBubble.setAttribute('aria-label','选择植物播种');$('game').append(seedBubble);
let camera={x:0,y:0,z:1,base:1,initialized:false},lastAnimalHello=0,talkId=null,talkTimer=null,talkFading=false;
const talkLines={capybara:'我可以让植物成熟时间减少哦～',panda:'我可以让植物出售价格更高哦～'};
function hideTalk(fade=true){
 clearTimeout(talkTimer);talkTimer=null;
 const bubble=talkId&&$('animals').querySelector(`[data-animal="${talkId}"] .bubble`);
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!fade||reduce||!bubble||bubble.hidden){if(bubble){bubble.hidden=true;bubble.classList.remove('fade');bubble.style.transform='';}talkId=null;talkFading=false;return;}
 talkFading=true;bubble.classList.add('fade');
 const id=talkId,done=()=>{if(talkId!==id)return;bubble.hidden=true;bubble.classList.remove('fade');bubble.style.transform='';talkId=null;talkFading=false;bubble.removeEventListener('transitionend',done);};
 bubble.addEventListener('transitionend',done);setTimeout(done,800);
}
function showTalk(id){
 if(!talkLines[id]||mode==='edit')return;
 if(talkId===id){hideTalk(true);return;}
 hideTalk(false);talkId=id;talkFading=false;
 document.querySelectorAll('.animal-wrap .bubble').forEach(el=>{if(el.closest('[data-animal]')?.dataset.animal!==id){el.hidden=true;el.textContent='';el.classList.remove('fade');el.style.transform='';}});
 const bubble=$('animals').querySelector(`[data-animal="${id}"] .bubble`);
 if(!bubble){talkId=null;return;}
 bubble.textContent=talkLines[id];bubble.hidden=false;bubble.classList.remove('fade');
 positionTalk();
 talkTimer=setTimeout(()=>hideTalk(true),5000);
}
function positionTalk(){
 const wrap=talkId&&$('animals').querySelector(`[data-animal="${talkId}"]`);
 const img=wrap?.querySelector('.animal'),bubble=wrap?.querySelector('.bubble');
 if(!img||!bubble||bubble.hidden)return;
 const scale=camera.scale,world=$('world').getBoundingClientRect(),ir=img.getBoundingClientRect();
 bubble.style.left=((ir.left+ir.width/2-world.left)/scale-parseFloat(wrap.style.left))+'px';
 bubble.style.top=((ir.top-world.top)/scale-parseFloat(wrap.style.top))+'px';
 bubble.style.right='auto';bubble.style.bottom='auto';
 bubble.style.transform='translate(-50%,calc(-100% - 8px))';
 const br=bubble.getBoundingClientRect(),g=$('game').getBoundingClientRect();
 let dx=0;
 if(br.left<g.left+8)dx=g.left+8-br.left;
 else if(br.right>g.right-8)dx=g.right-8-br.right;
 if(dx)bubble.style.transform=`translate(calc(-50% + ${dx/scale}px),calc(-100% - 8px))`;
}
const pointers=new Map(),plantImg=(id,stage='mature')=>`assets/coral/sprites/plants/${id}/plant_${id}_${stage}.png`,seedImg=id=>`assets/coral/icons/seeds/icon_seed_${id}.png`,decoImg=id=>`assets/coral/sprites/decorations/decoration_${id}.png`,animalImg=id=>`assets/coral/sprites/animals/animal_${id}_idle.png`;
const current=()=>draft||state,button=(text,action,cls='primary',disabled=false)=>`<button class="${cls}" data-action="${action}" ${disabled?'disabled':''}>${text}</button>`;
const hintHand=(flip=false)=>`<img class="hint-hand${flip?' hint-hand-flip':''}" src="assets/coral/icons/core/icon_tutorial_hand.png" alt="" draggable="false">`;
function syncWarehouseHand(){
 const el=$('warehouse'),show=(state.tutorial==='warehouse'||state.tutorial==='sell')&&!modalType;
 let hand=el.querySelector(':scope > .hint-hand');
 if(show){
  if(!hand){hand=document.createElement('img');hand.className='hint-hand hint-hand-flip';hand.alt='';hand.draggable=false;el.append(hand);}
  const src=asset('assets/coral/icons/core/icon_tutorial_hand.png');if(hand.getAttribute('src')!==src)hand.src=src;
 }else if(hand)hand.remove();
}
function html(el,value){value=value.replace(/src="(assets\/[^"]+)"/g,(_,path)=>`src="${asset(path)}"`);if(el.innerHTML!==value)el.innerHTML=value;}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800);}
function sound(kind='tap'){if(!state.sound)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const t=audioCtx.currentTime,o=audioCtx.createOscillator(),gain=audioCtx.createGain();o.connect(gain);gain.connect(audioCtx.destination);o.type='sine';o.frequency.setValueAtTime(kind==='harvest'?720:kind==='buy'?540:380,t);o.frequency.exponentialRampToValueAtTime(kind==='harvest'?1100:260,t+.13);gain.gain.setValueAtTime(.055,t);gain.gain.exponentialRampToValueAtTime(.001,t+.17);o.start(t);o.stop(t+.18);}catch(e){/* Audio is optional. */}}
function save(){if(G.rescue(state))toast('获得 2 颗应急雏菊种子，继续经营花园吧');try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch(e){storageOK=false;toast('当前浏览器无法保存，请在设置中导出存档');}}
function run(fn){try{const result=fn();save();render();return result;}catch(e){toast(e.message);return null;}}
function tutorialAllowed(action){if(state.tutorial==='done')return true;if(['warehouse','sell'].includes(state.tutorial)&&action==='warehouse')return true;toast('先跟着下方提示，完成第一次种植、收获和出售吧');return false;}
function setMode(next){storeBubble.hidden=true;hideTalk(false);closeSeeds();if(gesture)endGesture();mode=next;selectedObject=null;render();requestAnimationFrame(()=>resizeCamera(false));}
function header(){const s=current(),l=G.level(s),start=G.thresholds[l-1],end=G.thresholds[l];$('level').textContent=l;$('coins').textContent=s.coins;$('xpText').textContent=l===5?'已达最高等级':`${s.xp-start}/${end-start}`;$('xpBar').style.width=(l===5?100:(s.xp-start)/(end-start)*100)+'%';const stock=Object.values(s.harvest).reduce((a,b)=>a+b,0);$('warehouseBadge').textContent=stock||'';$('shopDot').style.display=s.newUnlock?'block':'none';html($('buffs'),'');
 const guided=state.tutorial!=='done';$('edit').disabled=guided;for(const id of ['shop','settings','levelButton'])$(id).disabled=guided||mode==='edit';$('warehouse').disabled=(guided&&!['warehouse','sell'].includes(state.tutorial))||mode==='edit';$('warehouse').classList.toggle('guide-glow',['warehouse','sell'].includes(state.tutorial));
 syncWarehouseHand();
 for(const [id,m] of [['edit','edit']])$(id).classList.toggle('active',mode===m);
 $('modeLabel').textContent={browse:'自由浏览 · 拖动探索花园',plant:'播种中 · 拖过空土地连续播种',harvest:'收获中 · 拖过成熟植物连续收获',edit:'编辑中 · 仅亮起的草地区域可摆放'}[mode];
}
function renderPlots(){const s=current();s.plots.forEach((plot,i)=>{let el=$('plot'+i);if(!el){el=document.createElement('button');el.id='plot'+i;el.className='plot';el.dataset.plot=i;const p=G.plotPositions[i];el.style.left=p.x+'px';el.style.top=p.y+'px';$('plots').append(el);}const st=G.stage(plot.plant),locked=!plot.open&&G.level(s)<i-2,ready=st?.remaining===0;const guided=(state.tutorial==='land'||state.tutorial==='seed'||state.tutorial==='harvest')&&i===0;
 el.className=`plot ${locked?'locked':!plot.open?'unlockable':''} ${ready?'ready':''} ${guided?'guide-target':''} ${(mode==='plant'&&plot.open&&!plot.plant)||(mode==='harvest'&&ready)?'valid':''}`;
 const label=!plot.open?(locked?`🔒 ${i-2} 级解锁`:`开垦 ${[15,20,30,40][i-4]}`):!plot.plant?(mode==='plant'?'点此播种':'＋ 播种'):ready?'收获':`${st.remaining} 秒`;
 el.setAttribute('aria-label',`第 ${i+1} 块土地，${plot.plant?G.plants.find(p=>p.id===plot.plant.id).name+'，':''}${label}`);
 html(el,`<img class="soil" src="assets/coral/sprites/plots/plot_${plot.open?'empty':locked?'locked':'unlockable'}.png" alt="">${plot.plant?`<img class="plant" src="${plantImg(plot.plant.id,st.stage)}" alt="">`:''}${!plot.open?`<span class="plot-lock-group"><img class="plot-lock" src="assets/coral/icons/core/icon_lock.png" alt="">${!locked?'<span class="plot-unlock-label">可解锁</span>':''}</span>`:''}${guided?'<img class="hint-hand" src="assets/coral/icons/core/icon_tutorial_hand.png" alt="">':''}`);
 });}
function renderObjects(){const s=current();$('world').classList.toggle('editing',mode==='edit');html($('objects'),s.decorations.filter(d=>d.placed).map(d=>`<img class="object ${selectedObject===d.uid?'selected':''}" data-object="${d.uid}" style="left:${d.x}px;top:${d.y}px" src="${decoImg(d.id)}" alt="${G.decorations.find(x=>x.id===d.id).name}">`).join(''));
 html($('animals'),G.animals.filter(a=>G.active(s,a.id)).map(a=>{const d=s.animals[a.id],open=talkId===a.id;return `<div class="animal-wrap ${selectedObject===a.id?'selected':''}" data-animal="${a.id}" style="left:${d.x}px;top:${d.y}px"><img class="animal" draggable="false" src="${animalImg(a.id)}" alt="${a.name}"><span class="bubble${open&&talkFading?' fade':''}" ${open?'':'hidden'}>${open?talkLines[a.id]:''}</span></div>`;}).join(''));
 if(talkId&&!G.active(s,talkId))hideTalk(false);else if(talkId)positionTalk();
 if(mode==='edit'){let cells='';for(const {x,y,plot} of G.editCells)if(!plot)cells+=`<i class="grid-cell ${G.validPosition(s,x,y,selectedObject)?'':'occupied'}" style="left:${x}px;top:${y}px"></i>`;html($('editGrid'),cells);}
}
function guide(){const t=state.tutorial;let text='';if(t==='land')text='<span class="step">第一次种植 · 1/3</span><b>点击发光的第一块土地</b>，种下一颗小雏菊。';if(t==='seed')text='<span class="step">第一次种植 · 1/3</span><b>点击气泡里的雏菊，或拖到发光的土地</b>。横滑查看植物，拖出气泡可连续播种。';if(t==='grow')text='<span class="step">等待花开</span>第一株只需 <b>3 秒</b>！还可以继续拖过空土地播种。';if(t==='harvest')text='<span class="step">第一次收获 · 2/3</span><b>点击成熟的雏菊</b>，点击气泡里的镰刀收获，或拖过成熟植物连续收获。';if(t==='warehouse')text='<span class="step">第一次出售 · 3/3</span><b>点击右上角仓库</b>，把手里的收获换成金币。';if(t==='sell')text='<span class="step">第一次出售 · 3/3</span><b>点击「确认出售」</b>，把雏菊换成金币，第一次经营就完成啦。';if(t==='done'){const l=G.level(state);text=mode==='edit'?'选择装饰或动物后拖到草地，也可点击空闲网格放置。':l<5?`<b>慢慢来，花会开的。</b> 再收获 ${Math.max(0,G.thresholds[l]-state.xp)} 经验，解锁 ${G.plants[l].name}。`:'<b>你的花园已经 5 级啦！</b> 继续种植，和伙伴一起装扮这片小天地。';}html($('guide'),text);}
let editTab="decorations";
function renderTray(){
 const scrolls=[...$('tray').querySelectorAll('.edit-list')].map(el=>el.scrollLeft);
 const card=(key,name,src,placed)=>`<button class="edit-card ${selectedObject===key?'selected':''}" data-edit-item="${key}" ${placed?'disabled':''} aria-label="${name}，${placed?'已摆放':'拖到草地摆放'}"><img src="${src}" alt="" draggable="false"><b>${name}</b><small>${placed?'已摆放':'可摆放'}</small></button>`;
 const decorations=mode==='edit'?draft.decorations.map(d=>card(d.uid,G.decorations.find(x=>x.id===d.id).name,decoImg(d.id),d.placed)).join(''):'';
 const animals=mode==='edit'?G.animals.filter(a=>draft.animals[a.id]?.owned).map(a=>card(a.id,a.name,animalImg(a.id),draft.animals[a.id].active)).join(''):'';
 html($('tray'),mode==='edit'?`<div class="tray-head">${button('取消','edit-cancel','secondary')}<div class="edit-tabs" role="tablist" aria-label="物品分类"><button role="tab" data-edit-tab="decorations" aria-selected="${editTab==='decorations'}">装饰</button><button role="tab" data-edit-tab="animals" aria-selected="${editTab==='animals'}">动物</button></div>${button('保存','edit-confirm')}</div><div class="edit-list" role="tabpanel">${(editTab==='decorations'?decorations:animals)||'<p>暂无物品，可前往商店购买</p>'}</div>`:'');
 [...$('tray').querySelectorAll('.edit-list')].forEach((el,i)=>el.scrollLeft=scrolls[i]||0);
}
function render(){$('game').dataset.mode=mode;header();renderPlots();renderObjects();renderTray();guide();}
function resizeCamera(center=false){const r=$('viewport').getBoundingClientRect(),old=camera.base;camera.base=Math.max(r.width/750,r.height/1500);if(!camera.initialized||center){camera.z=1;camera.x=(r.width-750*camera.base)/2;camera.y=r.height*.48-740*camera.base;camera.initialized=true;}else{const cx=(r.width/2-camera.x)/(old*camera.z),cy=(r.height/2-camera.y)/(old*camera.z);camera.x=r.width/2-cx*camera.base*camera.z;camera.y=r.height/2-cy*camera.base*camera.z;}applyCamera();}
function applyCamera(){const r=$('viewport').getBoundingClientRect();camera.z=Math.max(.8,Math.min(1.8,camera.z));const minScale=Math.max(r.width/750,r.height/1500),scale=Math.max(camera.base*camera.z,minScale);camera.x=Math.min(0,Math.max(r.width-750*scale,camera.x));camera.y=Math.min(0,Math.max(r.height-1500*scale,camera.y));camera.scale=scale;$('game').style.setProperty('--world-scale',scale);$('world').style.transform=`translate(${camera.x}px,${camera.y}px) scale(${scale})`;positionSeeds();positionTalk();}
function zoom(d){if(mode!=='browse'||modalType)return;const r=$('viewport').getBoundingClientRect(),x=(r.width/2-camera.x)/camera.scale,y=(r.height/2-camera.y)/camera.scale;camera.z=Math.min(1.3,Math.max(.8,camera.z+d));const scale=Math.max(camera.base*camera.z,r.width/750,r.height/1500);camera.x=r.width/2-x*scale;camera.y=r.height/2-y*scale;applyCamera();}
function mapPoint(e){const r=$('viewport').getBoundingClientRect();return{x:(e.clientX-r.left-camera.x)/camera.scale,y:(e.clientY-r.top-camera.y)/camera.scale};}
function fly(i,id,xp){const a=$('plot'+i).getBoundingClientRect(),b=$('warehouse').getBoundingClientRect(),g=$('game').getBoundingClientRect();const img=document.createElement('img');img.src=asset(plantImg(id));img.className='fly';img.style.left=a.left+a.width/2-g.left+'px';img.style.top=a.top-g.top+'px';img.style.setProperty('--dx',b.left-a.left-a.width/2+'px');img.style.setProperty('--dy',b.top-a.top+'px');$('fx').append(img);setTimeout(()=>img.remove(),700);const star=document.createElement('img');star.src=asset('assets/coral/icons/core/icon_exp.png');star.className='fly';const l=$('level').getBoundingClientRect();star.style.left=img.style.left;star.style.top=img.style.top;star.style.setProperty('--dx',l.left-a.left-a.width/2+'px');star.style.setProperty('--dy',l.top-a.top+'px');$('fx').append(star);setTimeout(()=>star.remove(),700);const txt=document.createElement('span');txt.className='float-text';txt.textContent='+'+xp+' 经验';txt.style.left=img.style.left;txt.style.top=img.style.top;$('fx').append(txt);setTimeout(()=>txt.remove(),1000);$('warehouse').querySelector('img:not(.hint-hand)')?.animate([{transform:'scale(1)'},{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:400});}
function doPlant(i){if(['land','warehouse','sell'].includes(state.tutorial))return;if(state.tutorial==='seed'&&i!==0){toast('先种下发光的第一格吧');return;}const result=run(()=>G.plant(state,i,selectedSeed));if(result){sound();if(result.free)toast('第一株免费！3 秒后就能收获');}else{$('plot'+i).classList.add('invalid');}}
function doHarvest(i){const result=run(()=>G.harvest(state,i));if(result){sound('harvest');fly(i,result.id,result.xp);queuedLevels.push(...result.unlocks);if(state.tutorial==='warehouse')setMode('browse');}else $('plot'+i).classList.add('invalid');}
function levelPopup(){if(!queuedLevels.length||gesture||!$('confirm').hidden)return;const levels=[...queuedLevels];queuedLevels=[];const l=Math.max(...levels);ask(`家园升到 ${l} 级啦！`,`<div class="level-hero">✦ ${l} ✦</div>解锁 <b>${G.plants[l-1].name}</b>，赠送 1 颗种子。<br>还有${G.decorations[l-1].name}和第 ${l+3} 块土地${l===2?'，以及卡皮巴拉':l===4?'，以及熊猫':''}等你发现。`,()=>{},'知道了',false);}
function plotClick(i){if(modalType||mode==='edit')return;const plot=state.plots[i];if(!plot.open&&G.level(state)<i-2){toast(`家园 ${i-2} 级解锁`);return;}if(['warehouse','sell'].includes(state.tutorial)){toast('先打开仓库出售收获物吧');return;}if(!plot.open){if(!tutorialAllowed('unlock'))return;const cost=[15,20,30,40][i-4];ask('开垦一块新土地',`家园 ${i-2} 级可解锁，当前已达到。<br>第 ${i+1} 块土地需要 <b>${cost} 金币</b>。<br>你现在有 ${state.coins} 金币。`,()=>{if(run(()=>G.unlock(state,i))!==null){sound('buy');toast('土地开垦成功，种点新东西吧');}},'确认开垦');return;}
 if(state.tutorial==='land'){if(i!==0){toast('先点击发光的第一块土地');return;}state.tutorial='seed';save();openSeeds(i);return;}
 if(plot.plant){if(G.stage(plot.plant).remaining===0){openHarvest(i);}else toast(`还需要 ${G.stage(plot.plant).remaining} 秒，植物不会枯萎哦`);}else openSeeds(i);}
function ask(title,message,fn,label='确认',cancel=true){previousFocus=document.activeElement;confirmAction=fn;const el=$('confirm');html(el,`<section class="sheet" role="alertdialog" aria-modal="true" aria-label="${title}"><div class="sheet-head"><h2>${title}</h2></div><div class="confirm-body">${message}</div><div class="confirm-actions">${cancel?button('取消','confirm-no','secondary'):''}${button(label,'confirm-yes')}</div></section>`);el.hidden=false;el.querySelector('button')?.focus();}
function closeConfirm(){ $('confirm').hidden=true;confirmAction=null;previousFocus?.focus?.();setTimeout(levelPopup,100);}
function openModal(type,tab){closeSeeds();if(gesture)endGesture();modalType=type;modalTab=tab||(type==='warehouse'?'harvest':'seeds');if(type==='shop'){state.newUnlock=false;save();}if(type==='warehouse'&&['warehouse','sell'].includes(state.tutorial)){state.tutorial='sell';modalTab='harvest';save();}renderModal();header();guide();$('modal').hidden=false;$('modal').querySelector('button')?.focus();}
function closeModal(){modalType=null;$('modal').hidden=true;render();}
function itemImage(type,id){return type==='seeds'?seedImg(id):type==='harvest'?plantImg(id):type==='decorations'?decoImg(id):animalImg(id);}
function renderModal(){const type=modalType,tab=modalTab,s=current();let title='',sub='',tabs='',content='',footer='';
 if(type==='shop'||type==='warehouse'){title=type==='shop'?'花园商店':'我的仓库';sub=type==='shop'?`用收获换来的金币，添一点新美好。余额 ${s.coins} 金币`:'每一份收获，都是花园送给你的礼物。';const categories=mode==='edit'?['decorations','animals']:type==='shop'?['seeds','decorations','animals']:['seeds','harvest','decorations','animals'];const names={seeds:'种子',harvest:'收获物',decorations:'装饰',animals:'动物'};tabs=`<div class="tabs">${categories.map(t=>`<button data-tab="${t}" class="${tab===t?'active':''}" ${s.tutorial!=='done'&&t!=='harvest'?'disabled':''}>${names[t]}</button>`).join('')}</div>`;
 const list=tab==='seeds'||tab==='harvest'?G.plants:tab==='decorations'?G.decorations:G.animals;
 content=list.map(p=>{const locked=G.level(s)<p.level;let desc='',actions='';
 if(type==='shop'){const owned=tab==='animals'&&s.animals[p.id].owned,full=tab==='decorations'&&s.decorations.filter(d=>d.id===p.id).length>=5,poor=s.coins<p.cost;desc=tab==='seeds'?`${G.growth(s,p.id)} 秒成熟 · 售价 ${G.price(s,p.id)} · +${p.xp} 经验<br>种子库存 ${s.seeds[p.id]}`:tab==='animals'?p.skill+(owned?`<br>${s.animals[p.id].active?'已出场 · 技能生效':'在仓库 · 技能未生效'}`:'<br>购买后自动来到花园'): `纯装饰 · 持有 ${s.decorations.filter(d=>d.id===p.id).length}/5`;
 actions=button(locked?`🔒 ${p.level} 级解锁`:owned?'已拥有':full?'已达持有上限':poor?'金币不足':`${p.cost} 金币 · 购买`,`buy:${tab}:${p.id}:1`,'primary',locked||owned||full||poor)+(tab==='seeds'&&!locked?button(`买 5 颗 · ${p.cost*5}`,`buy:${tab}:${p.id}:5`,'secondary',s.coins<p.cost*5):'');
 }else if(tab==='seeds'){desc=`库存 ${s.seeds[p.id]} 颗 · ${G.growth(s,p.id)} 秒成熟${locked?'<br>'+p.level+' 级解锁':''}`;actions=button('去播种',`use-seed:${p.id}`,'primary',locked||!s.seeds[p.id]);}
 else if(tab==='harvest'){const count=s.harvest[p.id],pr=G.price(s,p.id),bonus=G.active(s,'panda'),first=G.plants.find(x=>s.harvest[x.id]),sellGuide=s.tutorial==='sell'&&count&&p.id===first?.id;desc=`库存 ${count} 份 · 基础单价 ${p.price} 金币${bonus?`<br><span class="bonus">熊猫 +10% · 最终单价 ${pr} 金币</span>`:''}`;actions=`<span data-total="${p.id}">${count?pr:0} 金币</span><span class="sell-cta">${button('确认出售',`sell:${p.id}`,'primary',!count)}${sellGuide?hintHand():''}</span>`;desc+=`<div class="sell-control"><button data-action="qty:${p.id}:-1" aria-label="减少${p.name}出售数量" ${!count?'disabled':''}>−</button><input data-qty="${p.id}" aria-label="${p.name}出售数量" type="number" min="${count?1:0}" max="${count}" value="${count?1:0}" ${!count?'disabled':''}><button data-action="qty:${p.id}:1" aria-label="增加${p.name}出售数量" ${!count?'disabled':''}>＋</button></div>`;}
 else if(tab==='animals'){const a=s.animals[p.id];desc=`${p.skill}<br>${!a.owned?'尚未购买 · '+p.level+' 级解锁':a.active?'已出场 · 技能生效':'在仓库 · 技能未生效'}`;actions=button(a.active?'收回仓库':'放入花园',`animal:${p.id}`,'primary',!a.owned);}
 else{const own=s.decorations.filter(d=>d.id===p.id),available=own.filter(d=>!d.placed).length;desc=`持有 ${own.length}/5 · 已摆放 ${own.length-available}<br>仓库可用 ${available}`;actions=button('放入花园',`place-deco:${p.id}`,'primary',!available);}
 return `<article class="item-card"><img src="${itemImage(tab,p.id)}" alt=""><div class="item-info"><b>${p.name}</b><div><p>${desc}</p></div></div><div class="buy-actions">${actions}</div></article>`;}).join('');
 if(type==='warehouse'&&tab==='harvest')footer=`<span>全部收获物价值 <b>${G.total(s)}</b> 金币</span>${button('全部出售','sell-all','primary',!G.total(s))}`;
 if(type==='warehouse'&&tab==='decorations')footer='<span>放入花园后可拖动摆放；确定才会保存。</span>';
 }
 if(type==='levels'){title='花园成长手册';sub='收获获得经验；购买、出售与装扮不消耗经验。';content=G.plants.map((p,i)=>`<div class="level-row"><span>Lv.${i+1}</span><div><b>${G.level(state)>=i+1?'✓ ':''}${p.name} · ${G.thresholds[i]} 累计经验</b><p>${G.decorations[i].name}${i?' · 第 '+(i+4)+' 块土地':''}${i===1?' · 卡皮巴拉':i===3?' · 熊猫':''}</p></div></div>`).join('');}
 if(type==='settings'){title='花园设置';sub='你的花园会记住每一次播种与花开。';content=`<div class="setting-row"><span>轻柔的操作音效</span>${button(state.sound?'已开启':'已关闭','sound','secondary')}</div><div class="setting-row"><span>本地存档</span><b>${storageOK?'自动保存已开启':'当前无法写入'}</b></div><p class="sheet-sub" style="margin:12px 0">进度保存在当前浏览器。离开后植物继续生长，不会枯萎。更换浏览器前，可以导出存档再导入。</p><div class="setting-row">${button('导出存档','export','secondary')}${button('导入存档','import','secondary')}<input id="importFile" type="file" accept=".json" hidden></div><div class="setting-row"><span>重新体验第一天</span>${button('重置游戏进度','reset','danger')}</div><p class="sheet-sub" style="margin:14px 0">玩法：点击土地选择种子，按住拖过多块土地连续播种。成熟后用同样方式收获，到仓库出售。鼠标滚轮或双指缩放地图。编辑时点击物品，再拖动或点击草地放置。</p>`;}
 html($('modal'),`<section class="sheet" role="dialog" aria-modal="true" aria-label="${title}"><div class="sheet-head"><h2>${title}</h2>${s.tutorial==='sell'?'':`<button data-action="close-modal" aria-label="关闭">×</button>`}</div><p class="sheet-sub">${sub}</p>${tabs}<div class="sheet-content">${content}</div>${footer?`<div class="sheet-footer">${footer}</div>`:''}</section>`);
}
function startEdit(){hideTalk(false);closeSeeds();draft=G.clone(state);mode='edit';selectedObject=null;render();requestAnimationFrame(()=>resizeCamera(false));}
function placeSelected(x,y){if(selectedObject===null)return;try{G.place(draft,selectedObject,x,y);selectedObject=null;sound();renderObjects();renderTray();header();}catch(e){renderObjects();toast(e.message);}}
function updateQty(id,value){const input=$('modal').querySelector(`[data-qty="${id}"]`),max=state.harvest[id];if(!input)return;const n=Math.max(max?1:0,Math.min(max,Math.floor(Number(value)||0)));input.value=n;$('modal').querySelector(`[data-total="${id}"]`).textContent=(n*G.price(state,id))+' 金币';}
function action(value){const [a,id,key,count]=value.split(':');
 if(a==='confirm-no'){closeConfirm();return;}if(a==='confirm-yes'){const fn=confirmAction;closeConfirm();fn?.();return;}
 if(a==='close-modal'){if(state.tutorial==='sell'){toast('先点击确认出售，把收获换成金币吧');return;}closeModal();return;}if(a==='exit-mode'){if(state.tutorial==='seed'){toast('先在第一块土地种下雏菊吧');return;}setMode('browse');return;}
 if(a==='buy'){const ok=run(()=>{G.buy(state,id,key,Number(count));return true;});if(ok){sound('buy');toast(id==='animals'?'新伙伴来到花园，技能已生效':'购买成功，已放入仓库');renderModal();}return;}
 if(a==='use-seed'){selectedSeed=id;closeModal();const i=state.plots.findIndex(p=>p.open&&!p.plant);if(i>=0)openSeeds(i);else toast('暂时没有空土地');return;}
 if(a==='qty'){const input=$('modal').querySelector(`[data-qty="${id}"]`);updateQty(id,Number(input.value)+Number(key));return;}
 if(a==='sell'){const input=$('modal').querySelector(`[data-qty="${id}"]`),was=state.tutorial;const gain=run(()=>G.sell(state,id,input.value));if(gain){sound('buy');toast(`出售成功，获得 ${gain} 金币`);if(was!=='done'){closeModal();ask('第一次经营，完成！','种植、收获、出售，你已经学会啦！<br>接下来继续收获，升到 2 级，就能迎接卡皮巴拉并开垦新土地。',()=>{},'继续我的花园',false);}else renderModal();}return;}
 if(a==='sell-all'){const gain=G.total(state);ask('出售全部收获物',`将获得 <b>${gain} 金币</b>。<br>种子、装饰和动物都会保留。`,()=>{const was=state.tutorial,v=run(()=>G.sellAll(state));if(v){sound('buy');toast(`获得 ${v} 金币${was!=='done'?'，第一次经营完成！':''}`);renderModal();}},'确认全部出售');return;}
 if(a==='animal'){if(mode==='edit'){const now=G.toggleAnimal(draft,id);toast(now?'动物已放入花园':'动物已收回，保存后技能失效');renderObjects();header();}else{const now=run(()=>G.toggleAnimal(state,id));if(now!==null)toast(now?'动物已出场，对应技能生效':'动物已收回仓库，对应技能暂时失效');}renderModal();return;}
 if(a==='place-deco'){const item=current().decorations.find(d=>d.id===id&&!d.placed);if(!item)return;const uid=item.uid;closeModal();if(mode!=='edit')startEdit();selectedObject=uid;renderObjects();renderTray();toast('已选中装饰，点击亮起的草地放置');return;}
 if(a==='edit-add'){openModal('warehouse','decorations');return;}
 if(a==='edit-store'){if(selectedObject!==null){G.store(draft,selectedObject);selectedObject=null;render();toast('已暂存仓库，点击保存');}return;}
 if(a==='edit-cancel'){endGesture();draft=null;setMode('browse');toast('已取消，本次调整已恢复');return;}
 if(a==='edit-confirm'){if(!draft)return;endGesture();state=draft;draft=null;save();setMode('browse');toast('花园布置已保存');return;}
 if(a==='sound'){state.sound=!state.sound;save();sound();renderModal();return;}
 if(a==='reset'){ask('重新开始这座花园？','这会清除当前等级、金币、种植、库存、动物、装饰、土地及引导进度。恢复为 1 级、50 金币、4 颗雏菊种子和 4 块土地。',()=>{state=G.initial();draft=null;queuedLevels=[];mode='browse';save();closeModal();resizeCamera(true);toast('新的花园，新的开始');},'确认重置');return;}
 if(a==='export'){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='习惯花园存档.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
 if(a==='import'){$('importFile').click();return;}
}
$('game').addEventListener('click',e=>{const editTabButton=e.target.closest('[data-edit-tab]');if(editTabButton){editTab=editTabButton.dataset.editTab;selectedObject=null;renderTray();renderObjects();return;}const b=e.target.closest('[data-action]');if(b&&!b.disabled){action(b.dataset.action);return;}const tab=e.target.closest('[data-tab]');if(tab&&!tab.disabled){modalTab=tab.dataset.tab;renderModal();}});
$('modal').addEventListener('input',e=>{if(e.target.matches('[data-qty]'))updateQty(e.target.dataset.qty,e.target.value);});
$('modal').addEventListener('change',async e=>{if(e.target.id!=='importFile')return;const file=e.target.files[0];if(!file)return;if(file.size>1024*1024){toast('存档文件过大，请选择游戏导出的 JSON 文件');return;}const loaded=G.load(await file.text());if(loaded.error){toast('无法导入：存档内容损坏');return;}ask('导入这份花园存档？',`存档为 ${G.level(loaded.state)} 级、${loaded.state.coins} 金币。<br>确认后替换当前花园进度。`,()=>{state=loaded.state;draft=null;mode='browse';save();closeModal();resizeCamera(true);toast('存档导入成功');},'确认导入');});
$('shop').onclick=()=>{if(tutorialAllowed('shop')){setMode('browse');openModal('shop');}};$('warehouse').onclick=()=>{if(tutorialAllowed('warehouse')){setMode('browse');openModal('warehouse');}};$('edit').onclick=()=>{if(tutorialAllowed('edit')){if(mode==='edit')action('edit-confirm');else startEdit();}};$('settings').onclick=()=>{if(tutorialAllowed('settings')){setMode('browse');openModal('settings');}};$('levelButton').onclick=()=>{if(tutorialAllowed('levels'))openModal('levels');};
const storeBubble=document.createElement('button');storeBubble.id='storeBubble';storeBubble.textContent='收回';storeBubble.hidden=true;$('game').append(storeBubble);
function objectElement(key){return typeof key==='number'?$('objects').querySelector(`[data-object="${key}"]`):$('animals').querySelector(`[data-animal="${key}"] img`);}
function showStore(){const el=objectElement(selectedObject);if(!el||mode!=='edit')return;const r=el.getBoundingClientRect(),g=$('game').getBoundingClientRect();storeBubble.style.left=Math.max(32,Math.min(g.width-32,r.left+r.width/2-g.left))+'px';storeBubble.style.top=Math.max(75,r.top-g.top-40)+'px';storeBubble.hidden=false;}
storeBubble.onclick=()=>{if(mode!=='edit'||selectedObject===null)return;const key=selectedObject,el=objectElement(key);if(!el)return;const r=el.getBoundingClientRect(),tray=$('tray').getBoundingClientRect(),fly=document.createElement('img');fly.src=el.src;fly.className='store-flight';Object.assign(fly.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});document.body.append(fly);storeBubble.hidden=true;G.store(draft,key);selectedObject=null;render();const animation=fly.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${tray.left+tray.width/2-r.left-r.width/2}px,${tray.top+tray.height/2-r.top-r.height/2}px) scale(.3)`,opacity:0}],{duration:550,easing:'ease-in',fill:'forwards'});animation.finished.then(()=>fly.remove(),()=>fly.remove());};
function toolAt(e){const bounds=$('viewport').getBoundingClientRect();if(e.clientX<bounds.left||e.clientX>bounds.right||e.clientY<bounds.top||e.clientY>bounds.bottom)return;const p=mapPoint(e),i=G.plotAt(p.x,p.y);if(i<0||!gesture||!['plant','harvest'].includes(gesture.type))return;if(gesture.type==='plant'&&state.tutorial==='seed'&&i!==0)return;if(gesture.visited.has(i))return;if(gesture.type==='harvest'&&(!state.plots[i].plant||G.stage(state.plots[i].plant).remaining!==0))return;if(gesture.type==='plant'&&(!state.plots[i].open||state.plots[i].plant))return;gesture.visited.add(i);if(gesture.type==='plant')doPlant(i);else doHarvest(i);}
function ghost(e,src){$('dragGhost').classList.remove('animal-drag-ghost');for(const key of ['width','height','transform'])$('dragGhost').style[key]='';$('dragGhost').style.display='block';$('dragGhost').style.left=e.clientX+'px';$('dragGhost').style.top=e.clientY+'px';html($('dragGhost'),`<img src="${src}" alt="">`);}
function endGesture(){clearTimeout(gesture?.holdTimer);storeBubble.hidden=true;if(['plant','harvest'].includes(gesture?.type)){mode='browse';render();}gesture=null;pointers.clear();if(mode==='edit')renderObjects();$('dragGhost').style.display='none';setTimeout(levelPopup,750);}
document.addEventListener('pointerdown',e=>{
 if(!e.target.closest('#game')||!$('confirm').hidden||modalType||e.button>0)return;
 if(e.target===storeBubble)return;storeBubble.hidden=true;
 const item=e.target.closest('[data-edit-item]');if(mode==='edit'&&item){e.preventDefault();if(item.disabled)return;const key=item.dataset.editItem;gesture={type:'edit-pending',key:/^\d+$/.test(key)?Number(key):key,id:e.pointerId,startX:e.clientX,startY:e.clientY,list:item.closest('.edit-list'),scroll:item.closest('.edit-list').scrollLeft};return;}
 const seed=e.target.closest('[data-seed]'),tool=e.target.closest('[data-harvest-tool]');if(seed&&seed.closest('#seedBubble')){e.preventDefault();gesture={type:'seed-pending',seed:seed.dataset.seed,disabled:seed.getAttribute('aria-disabled')==='true',target:seedPlot,id:e.pointerId,startX:e.clientX,startY:e.clientY,scroll:seedBubble.querySelector('.bubble-list').scrollLeft};return;}if(tool){e.preventDefault();gesture={type:'harvest-pending',target:seedPlot,id:e.pointerId,startX:e.clientX,startY:e.clientY};return;}
 if(!e.target.closest('#viewport')||e.target.closest('.map-tools'))return;closeSeeds();e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(mode==='browse'&&pointers.size===2){const ps=[...pointers.values()];const r=$('viewport').getBoundingClientRect(),cx=(ps[0].x+ps[1].x)/2-r.left,cy=(ps[0].y+ps[1].y)/2-r.top;gesture={type:'pinch',distance:Math.max(1,Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)),scale:camera.scale,anchorX:(cx-camera.x)/camera.scale,anchorY:(cy-camera.y)/camera.scale};return;}
 if(mode==='browse'){const bubble=e.target.closest('.animal-wrap .bubble');if(bubble){e.preventDefault();gesture={type:'talk-hide',id:e.pointerId};return;}const animal=e.target.closest('[data-animal]');if(animal){e.preventDefault();const pending={type:'talk',key:animal.dataset.animal,id:e.pointerId,startX:e.clientX,startY:e.clientY,x:camera.x,y:camera.y,moved:false};gesture=pending;if(state.tutorial==='done')pending.holdTimer=setTimeout(()=>{if(gesture!==pending)return;startEdit();selectedObject=pending.key;editTab='animals';render();gesture={type:'hold-open',id:e.pointerId};},500);return;}}
 if(mode==='edit'){const d=e.target.closest('[data-object]'),a=e.target.closest('[data-animal]');if(d||a){selectedObject=d?Number(d.dataset.object):a.dataset.animal;const origin=a?draft.animals[selectedObject]:draft.decorations.find(o=>o.uid===selectedObject),point=mapPoint(e);gesture={type:'edit',id:e.pointerId,startX:e.clientX,startY:e.clientY,offsetX:origin.x-point.x,offsetY:origin.y-point.y,moved:false};renderObjects();renderTray();}else gesture={type:'edit-place',id:e.pointerId};return;}
 const held=e.target.closest('[data-object]');if(mode==='browse'&&held&&state.tutorial==='done'){const key=Number(held.dataset.object);const pending={type:'hold',id:e.pointerId,startX:e.clientX,startY:e.clientY,x:camera.x,y:camera.y,plot:null,moved:false};gesture=pending;pending.holdTimer=setTimeout(()=>{if(gesture!==pending)return;startEdit();selectedObject=key;editTab='decorations';render();gesture={type:'hold-open',id:e.pointerId};},500);return;}
 const point=mapPoint(e),index=G.plotAt(point.x,point.y),plot=index<0?null:$('plot'+index);
 if(mode==='harvest'&&plot&&G.stage(state.plots[Number(plot.dataset.plot)].plant)?.remaining===0){gesture={type:'harvest',visited:new Set(),id:e.pointerId};toolAt(e);return;}
 gesture={type:mode==='browse'?'pan':'tap',id:e.pointerId,startX:e.clientX,startY:e.clientY,x:camera.x,y:camera.y,plot:plot?Number(plot.dataset.plot):null,moved:false};
});
document.addEventListener('pointermove',e=>{if(!gesture)return;if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(gesture.type==='pinch'){if(pointers.size<2)return;const ps=[...pointers.values()],r=$('viewport').getBoundingClientRect(),scale=Math.max(r.width/750,r.height/1500,Math.min(camera.base*1.8,gesture.scale*Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)/gesture.distance));camera.z=scale/camera.base;camera.x=(ps[0].x+ps[1].x)/2-r.left-gesture.anchorX*scale;camera.y=(ps[0].y+ps[1].y)/2-r.top-gesture.anchorY*scale;applyCamera();return;}if(e.pointerId!==gesture.id)return;
 if(gesture.type==='hold'){if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)<8)return;clearTimeout(gesture.holdTimer);gesture.type='pan';gesture.moved=true;}
 if(gesture.type==='edit-pending'||gesture.type==='edit-scroll'){
  const dx=e.clientX-gesture.startX,dy=e.clientY-gesture.startY;
  if(gesture.type==='edit-scroll'||(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.3)){gesture.type='edit-scroll';gesture.list.scrollLeft=gesture.scroll-dx;return;}
  if(Math.hypot(dx,dy)<9)return;
  selectedObject=gesture.key;gesture.type='edit';gesture.moved=true;renderObjects();
 }
 if(gesture.type==='harvest-pending'){
  if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)<9)return;
  gesture={type:'harvest',visited:new Set(),id:e.pointerId};mode='harvest';closeSeeds();render();
 }
 if(gesture.type==='seed-pending'||gesture.type==='seed-scroll'){
  const dx=e.clientX-gesture.startX,dy=e.clientY-gesture.startY;
  if(gesture.type==='seed-scroll'||(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.3)){gesture.type='seed-scroll';seedBubble.querySelector('.bubble-list').scrollLeft=gesture.scroll-dx;return;}
  if(Math.hypot(dx,dy)<9||gesture.disabled)return;
  selectedSeed=gesture.seed;gesture={type:'plant',visited:new Set(),id:e.pointerId};mode='plant';closeSeeds();render();
 }
 if(['plant','harvest'].includes(gesture.type)){ghost(e,gesture.type==='plant'?seedImg(selectedSeed):'assets/coral/icons/core/icon_sickle.png');toolAt(e);return;}
 if(gesture.type==='talk'){const dx=e.clientX-gesture.startX,dy=e.clientY-gesture.startY;if(Math.hypot(dx,dy)>6){clearTimeout(gesture.holdTimer);gesture.type='pan';gesture.moved=true;camera.x=gesture.x+dx;camera.y=gesture.y+dy;applyCamera();}return;}
 if(gesture.type==='pan'){const dx=e.clientX-gesture.startX,dy=e.clientY-gesture.startY;if(Math.hypot(dx,dy)>6)gesture.moved=true;camera.x=gesture.x+dx;camera.y=gesture.y+dy;applyCamera();}
 if(gesture.type==='edit'){gesture.moved=gesture.moved||Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>8;if(!gesture.moved)return;storeBubble.hidden=true;const p=mapPoint(e);p.x+=gesture.offsetX||0;p.y+=gesture.offsetY||0;const x=p.x,y=p.y;const src=typeof selectedObject==='number'?decoImg(draft.decorations.find(d=>d.uid===selectedObject).id):animalImg(selectedObject);const animal=typeof selectedObject==='string'&&$('animals').querySelector(`[data-animal="${selectedObject}"]`);if(animal){animal.style.left=p.x+'px';animal.style.top=p.y+'px';animal.classList.add('dragging');const r=animal.querySelector('img').getBoundingClientRect();ghost(e,src);Object.assign($('dragGhost').style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',transform:'none'});$('dragGhost').classList.add('animal-drag-ghost');}else ghost(e,src);$('dragGhost').style.filter=G.validPosition(draft,x,y,selectedObject)?'drop-shadow(0 0 6px #a2ef54)':'drop-shadow(0 0 6px #ee5d4a)';}
});
document.addEventListener('pointerup',e=>{if(!gesture)return;if(gesture.type==='pinch'){endGesture();return;}if(e.pointerId!==gesture.id)return;const g=gesture;clearTimeout(g.holdTimer);gesture=null;pointers.clear();if(g.type==='edit-pending'){selectedObject=g.key;renderObjects();renderTray();}if(g.type==='seed-pending'&&!g.disabled){selectedSeed=g.seed;closeSeeds();doPlant(g.target);mode='browse';render();}if(g.type==='harvest-pending'){closeSeeds();doHarvest(g.target);}if(['plant','harvest','harvest-pending'].includes(g.type)){mode='browse';render();}$('dragGhost').style.display='none';$('dragGhost').style.filter='';if(g.type==='talk-hide')hideTalk(true);if(g.type==='talk'&&!g.moved)showTalk(g.key);if((g.type==='pan'||g.type==='tap')&&!g.moved&&g.plot!==null)plotClick(g.plot);if((g.type==='edit'&&g.moved)||g.type==='edit-place'){const trayRect=$('tray').getBoundingClientRect(),overTray=e.clientX>=trayRect.left&&e.clientX<=trayRect.right&&e.clientY>=trayRect.top&&e.clientY<=trayRect.bottom;if(g.type==='edit'&&g.moved&&overTray){const placed=typeof selectedObject==='number'?draft.decorations.find(d=>d.uid===selectedObject)?.placed:draft.animals[selectedObject]?.active;if(placed)storeBubble.onclick();}else if(!e.target.closest('#tray,#nav,header')){const p=mapPoint(e);placeSelected(p.x+(g.offsetX||0),p.y+(g.offsetY||0));}}if(mode==='edit'){renderObjects();if(g.type==='edit'&&!g.moved)showStore();}if(state.tutorial==='harvest'&&mode==='plant')setMode('browse');setTimeout(levelPopup,750);});
document.addEventListener('pointercancel',endGesture);window.addEventListener('blur',endGesture);$('viewport').addEventListener('wheel',e=>{if(mode==='browse'&&!modalType){e.preventDefault();zoom(e.deltaY>0?-.06:.06);}},{passive:false});
$('plots').addEventListener('click',e=>{if(e.detail===0){const p=e.target.closest('[data-plot]');if(p)plotClick(Number(p.dataset.plot));}});
$('tray').addEventListener('click',e=>{if(e.detail===0&&e.target.closest('[data-seed]')){selectedSeed=e.target.closest('[data-seed]').dataset.seed;renderTray();}});
document.addEventListener('keydown',e=>{const dialog=!$('confirm').hidden?$('confirm'):!$('modal').hidden?$('modal'):null;if(e.key==='Tab'&&dialog){const list=[...dialog.querySelectorAll('button:not(:disabled),input:not([hidden]):not(:disabled)')];if(!list.length)return;const first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}if(e.key==='Escape'){closeSeeds();if(!$('confirm').hidden){if($('confirm').querySelector('[data-action="confirm-no"]'))closeConfirm();}else if(modalType)closeModal();else if(mode==='edit')action('edit-cancel');else if(state.tutorial!=='seed')setMode('browse');}});
new ResizeObserver(()=>resizeCamera()).observe($('viewport'));
new ResizeObserver(()=>{
 const tray=$('tray');$('game').style.setProperty('--tray-height',(tray.offsetHeight?tray.offsetHeight+8:0)+'px');
 if(tray.offsetHeight&&camera.initialized){const r=$('viewport').getBoundingClientRect();camera.y=Math.min(camera.y,tray.getBoundingClientRect().top-r.top-40-1040*camera.scale);applyCamera();}
}).observe($('tray'));
setInterval(()=>{if(state.tutorial==='grow'&&state.plots[0].plant&&G.stage(state.plots[0].plant).remaining===0){state.tutorial='harvest';save();if(mode==='plant'&&!gesture)setMode('browse');guide();}renderPlots();
 if(mode!=='edit'&&!talkId&&G.animals.every(a=>G.active(state,a.id))){const a=state.animals.capybara,b=state.animals.panda,near=Math.hypot(a.x-b.x,a.y-b.y)<200;if(near&&Date.now()-lastAnimalHello>18000){lastAnimalHello=Date.now();document.querySelectorAll('.animal-wrap .bubble').forEach(el=>{el.textContent='你好呀 ♡';el.hidden=false;el.classList.remove('fade');});setTimeout(()=>document.querySelectorAll('.animal-wrap .bubble').forEach(el=>{if(!talkId){el.hidden=true;el.textContent='';}}),3500);}}
},250);
window.addEventListener('pagehide',()=>save());document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
render();resizeCamera(true);if(state.tutorial==='seed')openSeeds(0);if(storageError)setTimeout(()=>toast('原存档损坏，已恢复初始花园'),300);else if(!storageOK)setTimeout(()=>toast('浏览器存储不可用，可在设置中导出存档'),300);else if(state.tutorial==='done'&&state.plots.some(p=>p.plant&&G.stage(p.plant).remaining===0))setTimeout(()=>toast('欢迎回来，你的植物已经成熟啦！'),400);

setInterval(()=>{if(mode==='edit'||document.hidden)return;for(const a of G.animals){if(!G.active(state,a.id))continue;const el=document.querySelector(`[data-animal="${a.id}"]`),center=state.animals[a.id],dx=(Math.random()-.5)*32,dy=(Math.random()-.5)*22;if(el&&G.validPosition(state,center.x+dx,center.y+dy,a.id)){el.style.transition='transform 3.5s ease-in-out';el.style.transform=`translate(${dx}px,${dy}px)`;}}},4500);

function closeSeeds(){seedPlot=null;seedBubble.hidden=true;}
function openSeeds(i){
 setMode('browse');seedPlot=i;seedBubble.classList.remove('harvest-bubble');seedBubble.setAttribute('aria-label','选择植物播种');
 html(seedBubble,`<div class="bubble-caption">点击种此地 · 拖出连续种植</div><div class="bubble-list">${G.plants.map(p=>{const locked=p.level>G.level(state),free=state.tutorial==='seed'&&i===0&&p.id==='daisy';return `<button class="bubble-plant" data-seed="${p.id}" aria-disabled="${locked||(!free&&!state.seeds[p.id])}" aria-label="${p.name}，库存 ${state.seeds[p.id]}${locked?'，未解锁':''}"><img src="${plantImg(p.id)}" alt=""><b>${p.name}</b><span>${locked?p.level+'级解锁':free?'首次免费':'× '+state.seeds[p.id]}</span></button>`}).join('')}</div>`);
 seedBubble.hidden=false;positionSeeds();
}
function positionSeeds(){if(seedPlot===null||seedBubble.hidden)return;const el=$('plot'+seedPlot),plot=el.getBoundingClientRect(),game=$('game').getBoundingClientRect();const w=seedBubble.offsetWidth,h=seedBubble.offsetHeight,cx=plot.left+plot.width/2-game.left;const left=Math.max(8,Math.min(game.width-w-8,cx-w/2));const isHarvest=seedBubble.classList.contains('harvest-bubble');const plantTop=isHarvest?plot.top+(el.offsetHeight-27-128)*camera.scale:plot.top;seedBubble.style.left=left+'px';seedBubble.style.top=(isHarvest?plantTop-game.top-h-18:Math.max(78,plot.top-game.top-h-8))+'px';seedBubble.style.setProperty('--arrow',Math.max(16,Math.min(w-16,cx-left))+'px');}
seedBubble.addEventListener('click',e=>{const b=e.target.closest('[data-seed]');if(e.detail===0&&b&&b.getAttribute('aria-disabled')!=='true'){selectedSeed=b.dataset.seed;const i=seedPlot;closeSeeds();doPlant(i);}});
new ResizeObserver(positionSeeds).observe($('game'));

function openHarvest(i){
 setMode('browse');seedPlot=i;seedBubble.classList.add('harvest-bubble');seedBubble.setAttribute('aria-label','收获成熟植物');
 html(seedBubble,'<button class="bubble-sickle" data-harvest-tool aria-label="收获此土地，拖动可连续收获"><img src="assets/coral/icons/core/icon_sickle.png" alt="镰刀"></button>');
 seedBubble.hidden=false;positionSeeds();
}
seedBubble.addEventListener('click',e=>{if(e.detail===0&&e.target.closest('[data-harvest-tool]')&&seedPlot!==null){const i=seedPlot;closeSeeds();doHarvest(i);setTimeout(levelPopup,750);}});
