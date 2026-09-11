const {chromium}=require('/Users/kiwi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const rainy=process.argv.includes('--rain');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
 for(const variant of process.argv.includes('--optimized-only')?['optimized']:['before','optimized']){
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  if(variant==='before')for(const file of ['app.js','environment.js'])await page.route('**/'+file,r=>r.fulfill({body:execFileSync('git',['show','HEAD:'+file],{cwd:root}),contentType:'text/javascript'}));
  await page.addInitScript(rainy=>{
   Math.random=()=>rainy?0:.99;
   const native=requestAnimationFrame;window.timeOffset=0;window.requestAnimationFrame=fn=>native(t=>fn(t+window.timeOffset));
   window.weatherPaints=0;const clear=CanvasRenderingContext2D.prototype.clearRect;
   CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.className==='environment-rain')window.weatherPaints++;return clear.apply(this,args);};
  },rainy);
  await page.goto('http://127.0.0.1:4186/');await page.waitForTimeout(200);
  await page.evaluate(()=>window.timeOffset=230000);await page.waitForTimeout(rainy?1500:200);
  assert.equal(await page.locator('.environment-badge').getAttribute('data-rain'),String(rainy));
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  for(const kind of ['plant','harvest','decoration','animal']){
   await page.evaluate(kind=>{
    endGesture();closeSeeds();state=G.initial();state.tutorial='done';state.sound=false;state.xp=170;state.coins=500;
    state.seeds.daisy=50;for(const p of state.plots){p.open=true;if(kind==='harvest')p.plant={id:'daisy',at:Date.now()-99999,duration:3};}
    G.buy(state,'animals','capybara');G.buy(state,'decorations','daisy_flowerpot');
    for(const key of ['capybara',1]){const cell=G.editCells.find(p=>p.y>650&&p.y<1000&&G.validPosition(state,p.x,p.y,key));G.place(state,key,cell.x,cell.y);}
    mode='browse';draft=null;render();resizeCamera(true);
    if(kind==='plant')openSeeds(0);else if(kind==='harvest')openHarvest(0);else startEdit();
   },kind);
   await page.waitForTimeout(150);
   const selector=kind==='plant'?'#seedBubble [data-seed="daisy"]':kind==='harvest'?'#seedBubble [data-harvest-tool]':kind==='animal'?'#animals .animal':'#objects .object';
   const box=await page.locator(selector).boundingBox();assert.ok(box);
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
   const points=await page.evaluate(()=>{const r=$('world').getBoundingClientRect();return G.plotPositions.slice(0,4).map(p=>({x:r.left+p.x*camera.scale,y:r.top+p.y*camera.scale}));});
   const target=kind==='animal'||kind==='decoration'?{x:box.x+box.width/2+20,y:box.y+box.height/2+25}:points[0];
   await page.mouse.move(target.x,target.y,{steps:3});
   assert.equal(await page.evaluate(()=>gesture?.type),kind==='animal'||kind==='decoration'?'edit':kind);
   const snap=await page.evaluate(()=>({image:document.querySelector('.environment-rain').toDataURL(),flies:document.querySelector('.environment-fireflies')?.toDataURL(),rainStyle:document.querySelector('.environment-rain').getContext('2d').strokeStyle,grade:document.querySelector('#spriteColorMatrix').getAttribute('values'),paints:window.weatherPaints}));
   const a=await metrics();const start=Date.now();
   for(let i=0;i<35;i++){const pt=(kind==='plant'||kind==='harvest')?points[Math.floor(i/9)%4]:{x:target.x+Math.sin(i*.2)*20,y:target.y+Math.cos(i*.2)*12};await page.mouse.move(pt.x,pt.y);await page.waitForTimeout(16);}
   const z=await metrics(),duration=Date.now()-start;
   const held=await page.evaluate(()=>({image:document.querySelector('.environment-rain').toDataURL(),flies:document.querySelector('.environment-fireflies')?.toDataURL(),rainStyle:document.querySelector('.environment-rain').getContext('2d').strokeStyle,grade:document.querySelector('#spriteColorMatrix').getAttribute('values'),paints:window.weatherPaints}));
   console.log(JSON.stringify({variant,kind,weatherPaintsDuringDrag:held.paints-snap.paints,mainThreadBusyPct:Math.round((z.TaskDuration-a.TaskDuration)*100000/duration),layouts:z.LayoutCount-a.LayoutCount}));
   if(variant==='optimized'){
    if(rainy){assert.ok(held.paints>snap.paints,'rain keeps rendering');assert.notEqual(held.image,snap.image,'rain keeps moving');assert.equal(held.rainStyle,snap.rainStyle,'rain intensity stays fixed during drag');}
    else{assert.equal(held.paints,snap.paints);assert.equal(held.image,snap.image);}
    assert.equal(held.flies,snap.flies,'fireflies stay still');assert.equal(held.grade,snap.grade,'grading stays fixed');
   }
   let placed=null;
   if(kind==='animal'||kind==='decoration'){
    placed=await page.evaluate(()=>{
     const r=$('world').getBoundingClientRect(),tray=$('tray').getBoundingClientRect();
     for(const cell of G.editCells){
      const x=r.left+(cell.x-(gesture.offsetX||0))*camera.scale,y=r.top+(cell.y-(gesture.offsetY||0))*camera.scale;
      if(x>30&&x<300&&y>130&&y<tray.top-30&&G.validPosition(draft,cell.x,cell.y,selectedObject))return {x,y,cx:cell.x,cy:cell.y,key:selectedObject};
     }
    });assert.ok(placed,'an empty visible placement cell exists');await page.mouse.move(placed.x,placed.y,{steps:3});
   }
   await page.mouse.up();await page.waitForTimeout(250);
   if(placed){
    const actual=await page.evaluate(key=>{const obj=typeof key==='number'?draft.decorations.find(d=>d.uid===key):draft.animals[key];return {x:obj.x,y:obj.y};},placed.key);
    assert.deepEqual(actual,{x:placed.cx,y:placed.cy},'drag releases at the intended cell');
    assert.equal(await page.locator('.animal-wrap.dragging').count(),0);
   }
   assert.ok(await page.evaluate(()=>window.weatherPaints)>held.paints,'weather resumes on release');
   if(kind==='plant')assert.ok(await page.evaluate(()=>state.plots.filter(p=>p.plant).length)>=3);
   if(kind==='harvest')assert.ok(await page.evaluate(()=>state.harvest.daisy)>=3);
  }
  if(variant==='optimized'){
   for(const event of ['pointercancel','blur']){
    await page.evaluate(()=>window.GardenEnvironment.setInteracting(true));
    await page.evaluate(type=>(type==='blur'?window:document).dispatchEvent(new Event(type)),event);
    const count=await page.evaluate(()=>window.weatherPaints);await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>window.weatherPaints)>count);
   }
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
