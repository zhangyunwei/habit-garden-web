const {chromium}=require('/Users/kiwi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
 const page=await b.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 // Drive only RAF timestamps; no real save is read or changed in this isolated browser.
 await page.addInitScript(()=>{const native=requestAnimationFrame;window.testOffset=0;window.requestAnimationFrame=fn=>native(t=>fn(t+window.testOffset));});
 await page.goto('http://127.0.0.1:4186/');await page.waitForTimeout(400);
 await page.evaluate(()=>{state.tutorial='done';state.xp=999;for(let i=0;i<6;i++){state.plots[i].open=true;state.plots[i].plant={id:'strawberry',at:Date.now()-1000000,duration:30};}state.animals.capybara.owned=true;state.animals.capybara.active=true;render();});
 for(const [name,seconds] of [['day',0],['dusk',175],['night',230]]){
  await page.evaluate(t=>window.testOffset=t*1000,seconds);await page.waitForTimeout(180);
  await page.screenshot({path:path.join(__dirname,`environment-${name}.png`)});
  console.log(name,await page.locator('#plots').evaluate(el=>getComputedStyle(el).filter));
 }
 const badge=await page.locator('.environment-badge').boundingBox(),level=await page.locator('#levelButton').boundingBox();assert.ok(Math.abs(badge.x-level.x)<2);
 await page.locator('#shop').click();assert.equal(await page.locator('#modal').isVisible(),true);
 await page.evaluate(()=>closeModal());await page.locator('#plot0').click();assert.equal(await page.locator('#seedBubble').isVisible(),true);
 assert.deepEqual(errors,[]);console.log('Mobile day/dusk/night render, HUD alignment, shop and plot interaction: OK; console clean');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
