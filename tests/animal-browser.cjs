const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/kiwi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1100,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(process.env.GARDEN_URL||'http://127.0.0.1:8765');
 await page.evaluate(()=>{state.tutorial='done';state.xp=170;for(const id of ['capybara','panda'])Object.assign(state.animals[id],{owned:true,active:true});render();});
 await page.waitForTimeout(1000);
 assert.equal(await page.locator('#animals canvas').count(),2);
 assert.ok(await page.evaluate(()=>[...document.querySelectorAll('#animals canvas')].every(c=>c.getContext('2d').getImageData(0,0,256,256).data.some((v,i)=>i%4===3&&v>0))));
 await page.screenshot({path:path.join(__dirname,'animals-first.png')});
 // A normal render must retain both the node and the behaviour clock.
 assert.ok(await page.evaluate(()=>{const node=document.querySelector('#animals canvas'),a=animalRenderer.motion.position('capybara'),elapsed=a.elapsed;render();return node===document.querySelector('#animals canvas')&&a.elapsed===elapsed;}));
 await page.evaluate(()=>{const a=animalRenderer.motion.position('capybara');a.action='walk';a.path=[{x:180,y:630}];a.elapsed=0;a.duration=Infinity;});
 await page.waitForTimeout(1400);
 assert.ok(await page.evaluate(()=>animalRenderer.position('capybara').x>140));
 assert.equal(await page.evaluate(()=>state.animals.capybara.x),120);
 const cap=page.locator('[data-animal="capybara"] .animal');await cap.click();
 assert.equal(await page.evaluate(()=>talkId),'capybara');
 const pos=await page.evaluate(()=>({x:animalRenderer.position('capybara').x,y:animalRenderer.position('capybara').y}));
 await page.waitForTimeout(1000);
 assert.deepEqual(await page.evaluate(()=>({x:animalRenderer.position('capybara').x,y:animalRenderer.position('capybara').y})),pos);
 await page.evaluate(()=>{hideTalk(false);animalRenderer.motion.position('capybara').action='sleep';});await cap.press('Enter');
 assert.equal(await page.evaluate(()=>animalRenderer.motion.position('capybara').action),'wake');
 await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>animalRenderer.motion.position('capybara').action),'respond');
 await page.evaluate(()=>hideTalk(false));
 // Actual long press freezes the scene and exposes editing without teleporting.
 const box=await cap.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height*.65);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();
 assert.equal(await page.evaluate(()=>mode),'edit');
 const frozen=await page.evaluate(()=>JSON.stringify([...animalRenderer.motion.actors]));await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>JSON.stringify([...animalRenderer.motion.actors])),frozen);
 const target=await page.evaluate(()=>{const c=G.editCells.find(c=>c.x>280&&c.x<450&&c.y>1050&&G.validPosition(draft,c.x,c.y,'capybara'));const r=$('viewport').getBoundingClientRect();return{world:c,x:r.left+camera.x+c.x*camera.scale,y:r.top+camera.y+c.y*camera.scale};});
 const editBox=await cap.boundingBox();await page.mouse.move(editBox.x+editBox.width/2,editBox.y+editBox.height*.7);await page.mouse.down();await page.mouse.move(target.x,target.y-20,{steps:12});await page.mouse.up();
 assert.ok(await page.evaluate(()=>draft.animals.capybara.y>1000));
 await page.locator('[data-action="edit-cancel"]').click();
 assert.equal(await page.evaluate(()=>state.animals.capybara.x),120);
 assert.ok(await page.evaluate(p=>Math.abs(animalRenderer.position('capybara').x-p.x)<2,pos));
 // Store through the real bubble, then cancel restores ownership and active state.
 await page.locator('#edit').click();await cap.click();await page.locator('#storeBubble').click();assert.equal(await page.locator('[data-animal="capybara"]').count(),0);
 await page.locator('[data-action="edit-cancel"]').click();assert.equal(await page.locator('[data-animal="capybara"]').count(),1);
 // Paving and fountain share the same depth context as animal sprites.
 await page.evaluate(()=>{state.decorations=[{uid:1,id:'stone_fountain',placed:true,x:380,y:1000},{uid:2,id:'stepping_stones',placed:true,x:240,y:1000}];state.nextId=3;render();});
 assert.ok(await page.evaluate(()=>getComputedStyle($('objects')).display==='contents'&&getComputedStyle($('animals')).display==='contents'&&getComputedStyle(document.querySelector('[data-object="1"]')).zIndex==='1000'));
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const stopped=await page.evaluate(()=>JSON.stringify([...animalRenderer.motion.actors]));await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>JSON.stringify([...animalRenderer.motion.actors])),stopped);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await page.screenshot({path:path.join(__dirname,'animals-mobile.png')});
 // All clips are rendered using the same frame renderer as the game.
 await page.goto('http://127.0.0.1:8765/animals-preview.html');await page.waitForTimeout(600);
 for(const action of ['idle','walk','walkBack','eat','sleep','stand','sit','lie','wake','respond']){await page.locator('select').first().selectOption(action);await page.locator('select').nth(1).selectOption(action);await page.waitForTimeout(150);}
 await page.locator('select').first().selectOption('walk');await page.locator('select').nth(1).selectOption('eat');await page.setViewportSize({width:1080,height:850});await page.waitForTimeout(400);await page.screenshot({path:path.join(__dirname,'animals-preview.png')});
 assert.deepEqual(errors,[]);console.log('ANIMAL_BROWSER_OK: persistent nodes, movement, click/wake, long press, drag/cancel, store/cancel, depth, reduced motion, mobile viewport, every clip. No console or HTTP errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
