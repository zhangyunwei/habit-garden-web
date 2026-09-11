const {chromium}=require('/Users/kiwi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(r.url()+':'+r.status());});page.on('request',r=>requests.push(r.url()));
 await page.clock.install();await page.goto('http://127.0.0.1:4319');
 const click=s=>page.locator(s).click();
 const advance=async ms=>{await page.clock.fastForward(ms);await page.waitForTimeout(50);};
 const dismissLevel=async()=>{await advance(1000);if(await page.locator('#confirm').isVisible())await click('[data-action="confirm-yes"]');};
 const harvestPlot=async i=>{await click('#plot'+i);await click('#seedBubble [data-harvest-tool]');};
 const sell=async()=>{await click('#warehouse');await click('[data-action="sell-all"]');await click('[data-action="confirm-yes"]');if(await page.locator('#modal').isVisible())await click('[data-action="close-modal"]');};
 await click('#plot0');await click('#seedBubble [data-seed=daisy]');await advance(3500);await harvestPlot(0);await sell();assert.equal(await page.evaluate(()=>state.tutorial),'done');
 let cycles=0;
 async function growBatch(id){
  const seeds=await page.evaluate(id=>state.seeds[id],id);
  if(seeds<4){await click('#shop');await click(`[data-action="buy:seeds:${id}:5"]`);await click('[data-action="close-modal"]');}
  for(let i=0;i<4;i++){await click('#plot'+i);await click(`#seedBubble [data-seed="${id}"]`);}
  assert.equal(await page.evaluate(()=>state.plots.slice(0,4).filter(p=>p.plant).length),4);
  await advance(31000);for(let i=0;i<4;i++)await harvestPlot(i);
  await dismissLevel();await sell();
 }
 while(await page.evaluate(()=>Garden.level(state))<5){const id=await page.evaluate(()=>Garden.plants[Garden.level(state)-1].id);await growBatch(id);assert.ok(++cycles<12);console.log('CYCLE',cycles,await page.evaluate(()=>({level:Garden.level(state),coins:state.coins,xp:state.xp})));}
 await growBatch('pumpkin');
 for(let i=4;i<8;i++){await click('#plot'+i);await click('[data-action="confirm-yes"]');}
 await click('#shop');await click('[data-tab="animals"]');for(const id of ['capybara','panda'])await click(`[data-action="buy:animals:${id}:1"]`);
 await click('[data-tab="decorations"]');for(const id of ['daisy_flowerpot','stepping_stones','wooden_bench','courtyard_lamp','stone_fountain'])await click(`[data-action="buy:decorations:${id}:1"]`);
 await click('[data-action="close-modal"]');
 assert.equal(await page.evaluate(()=>state.plots.filter(p=>p.open).length),8);assert.equal(await page.evaluate(()=>state.decorations.length),5);assert.ok(await page.evaluate(()=>Garden.active(state,'panda')&&Garden.active(state,'capybara')));
 await click('#warehouse');await click('[data-tab="decorations"]');await click('[data-action="place-deco:daisy_flowerpot"]');
 const pos=await page.evaluate(()=>{const uid=typeof selectedObject==='number'?selectedObject:1;const cell=Garden.editCells.find(c=>!c.plot&&c.x>200&&c.x<520&&c.y>850&&c.y<1100&&Garden.validPosition(draft,c.x,c.y,uid));const r=document.getElementById('viewport').getBoundingClientRect();return{x:r.left+camera.x+cell.x*camera.scale,y:r.top+camera.y+cell.y*camera.scale};});
 await page.mouse.click(pos.x,pos.y);await click('[data-action="edit-confirm"]');assert.equal(await page.evaluate(()=>state.decorations[0].placed),true);
 const before=await page.evaluate(()=>JSON.stringify(state));await page.reload();assert.equal(await page.evaluate(()=>JSON.stringify(state)),before);
 assert.ok(requests.filter(u=>u.includes('/assets/')).every(u=>u.includes('/assets/coral/')));
 assert.equal(await page.evaluate(()=>[...document.images].filter(i=>!i.complete||!i.naturalWidth).length),0);
 await page.screenshot({path:path.join(__dirname,'progression-level5-mobile.png')});assert.deepEqual(errors,[]);
 console.log('BROWSER_LEVEL_1_TO_5_OK: real UI transactions, eight plots, both animals, five decorations, edit placement, reload. Only elapsed growth time accelerated.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
