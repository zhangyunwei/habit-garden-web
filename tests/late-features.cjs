const {chromium}=require('/Users/kiwi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const G=require('../model.js');

function lateSave(){
 const s=G.initial();
 s.tutorial='done';s.xp=170;s.coins=500;
 G.buy(s,'animals','capybara');
 G.buy(s,'animals','panda');
 G.buy(s,'decorations','daisy_flowerpot');
 const grass=G.editCells.filter(c=>!c.plot);
 const cap=grass.find(c=>c.x<280&&c.y>620&&c.y<800&&G.validPosition(s,c.x,c.y,'capybara'));
 G.place(s,'capybara',cap.x,cap.y);
 const panda=grass.find(c=>c.x>450&&c.y>620&&c.y<820&&G.validPosition(s,c.x,c.y,'panda'));
 G.place(s,'panda',panda.x,panda.y);
 const deco=grass.find(c=>c.y>880&&c.x>180&&c.x<420&&G.validPosition(s,c.x,c.y,1));
 G.place(s,1,deco.x,deco.y);
 return s;
}

async function tap(locator){
 await locator.click({force:true,timeout:5000});
}
async function hold(page,locator){
 const box=await locator.boundingBox();
 assert.ok(box,'hold target is visible');
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 await page.waitForTimeout(650);
 await page.mouse.up();
}

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const errors=[];
 try{
  const guide=await browser.newContext({viewport:{width:1280,height:960}});
  const page=await guide.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4319');
  await page.waitForTimeout(400);
  assert.ok(await page.locator('#plot0 .hint-hand').isVisible());
  const landHand=await page.locator('#plot0 .hint-hand').evaluate(el=>{const r=el.getBoundingClientRect();return {css:parseFloat(getComputedStyle(el).width),screen:r.width};});
  assert.equal(landHand.css,76);
  assert.ok(landHand.screen>30);
  await page.screenshot({path:path.join(__dirname,'late-tutorial-land.png')});
  await page.locator('#plot0').click();
  await page.locator('#seedBubble [data-seed=daisy]').click();
  await page.waitForTimeout(3300);
  await page.locator('#plot0').click();
  await page.locator('#seedBubble [data-harvest-tool]').click();
  assert.equal(await page.evaluate(()=>state.tutorial),'warehouse');
  assert.ok(await page.locator('#warehouse > .hint-hand').isVisible());
  assert.match(await page.locator('#warehouse > .hint-hand').getAttribute('src'),/icon_tutorial_hand/);
  await page.screenshot({path:path.join(__dirname,'late-tutorial-warehouse.png')});
  await page.locator('#warehouse').click();
  assert.ok(await page.locator('.sell-cta .hint-hand').isVisible());
  await page.screenshot({path:path.join(__dirname,'late-tutorial-sell.png')});
  await page.locator('[data-action="sell:daisy"]').click();
  assert.equal(await page.evaluate(()=>state.tutorial),'done');
  await guide.close();

  const garden=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await garden.addInitScript(s=>localStorage.setItem('habit-garden-web-v1',JSON.stringify(s)),lateSave());
  const mobile=await garden.newPage();
  mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto('http://127.0.0.1:4319');
  await mobile.waitForTimeout(500);

  const warehouse=await mobile.locator('#warehouse').boundingBox();
  const nav=await mobile.locator('#nav').boundingBox();
  assert.ok(nav.y>warehouse.y+8);
  assert.ok(nav.x>warehouse.x-20);
  assert.equal(await mobile.locator('#nav button').count(),3);

  await tap(mobile.locator('[data-animal=capybara] .animal'));
  assert.ok(await mobile.locator('[data-animal=capybara] .bubble').isVisible());
  assert.match(await mobile.locator('[data-animal=capybara] .bubble').innerText(),/成熟时间/);
  await mobile.screenshot({path:path.join(__dirname,'late-animal-talk.png')});
  await tap(mobile.locator('[data-animal=capybara] .animal'));
  await mobile.waitForTimeout(900);
  assert.equal(await mobile.locator('[data-animal=capybara] .bubble').isVisible(),false);

  await tap(mobile.locator('[data-animal=panda] .animal'));
  assert.ok(await mobile.locator('[data-animal=panda] .bubble').isVisible());
  assert.match(await mobile.locator('[data-animal=panda] .bubble').innerText(),/出售价格/);
  assert.equal(await mobile.locator('[data-animal=capybara] .bubble').isVisible(),false);

  await hold(mobile,mobile.locator('[data-object="1"]'));
  assert.equal(await mobile.evaluate(()=>mode),'edit');
  await tap(mobile.locator('[data-object="1"]'));
  assert.ok(await mobile.locator('#storeBubble').isVisible());
  assert.equal(await mobile.locator('#storeBubble').innerText(),'收回');
  await mobile.screenshot({path:path.join(__dirname,'late-edit-store.png')});
  await mobile.locator('#storeBubble').click();
  assert.equal(await mobile.evaluate(()=>draft.decorations[0].placed),false);
  await mobile.locator('[data-action="edit-cancel"]').click();
  assert.equal(await mobile.evaluate(()=>state.decorations[0].placed),true);
  assert.equal(await mobile.evaluate(()=>mode),'browse');

  await hold(mobile,mobile.locator('[data-animal=capybara] .animal'));
  assert.equal(await mobile.evaluate(()=>mode),'edit');
  assert.equal(await mobile.evaluate(()=>editTab),'animals');
  await mobile.locator('[data-action="edit-cancel"]').click();

  assert.equal(await mobile.evaluate(()=>[...document.images].filter(i=>i.src&&(!i.complete||!i.naturalWidth)).length),0);
  assert.deepEqual(errors,[]);
  console.log('LATE_FEATURES_OK: tutorial hands, animal talk, long-press edit, store, HUD rail');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
