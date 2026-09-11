const {chromium}=require('/Users/kiwi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const Native=window.AudioContext;window.sources=[];window.oscillators=0;
  window.AudioContext=class extends Native{constructor(...args){super(...args);window.audioContext=this;}
   createBufferSource(){const node=super.createBufferSource();window.sources.push(node);return node;}
   createOscillator(){window.oscillators++;return super.createOscillator();}
  };
 });
 await page.goto('http://127.0.0.1:4186/');
 assert.equal(await page.evaluate(()=>Boolean(window.audioContext)),false,'no autoplay/context before gesture');
 await page.evaluate(()=>{window.cues=[];const fn=GardenAudio.effect;GardenAudio.effect=kind=>{cues.push(kind);fn(kind);};});
 await page.locator('#plot0').click();
 await page.waitForFunction(()=>window.sources.some(s=>s.loop&&s.buffer),{timeout:15000});
 await page.locator('#seedBubble [data-seed="daisy"]').click();
 await page.evaluate(()=>{state.plots[0].plant.at-=5000;renderPlots();});
 await page.locator('#plot0').click();await page.locator('[data-harvest-tool]').click();
 assert.ok(await page.evaluate(()=>cues.includes('land')&&cues.includes('plant')&&cues.includes('harvest')));
 await page.evaluate(()=>{state.tutorial='done';state.xp=170;state.coins=500;G.buy(state,'animals','capybara');G.buy(state,'animals','panda');render();showTalk('capybara');showTalk('panda');});
 assert.ok(await page.evaluate(()=>cues.includes('capybara')&&cues.includes('panda')));
 const stats=await page.evaluate(()=>{const s=sources.find(s=>s.loop&&s.buffer),a=s.buffer.getChannelData(0);let peak=0,sum=0;for(const x of a){peak=Math.max(peak,Math.abs(x));sum+=x*x;}return {seconds:s.buffer.duration,peak,rms:Math.sqrt(sum/a.length),seam:Math.abs(a[0]-a[a.length-1]),sources:sources.length};});
 assert.ok(stats.seconds>=40&&stats.peak<.8&&stats.rms>.005);assert.ok(stats.seam<.02,'loop seam is quiet');assert.equal(stats.sources,1);
 await page.waitForTimeout(800);const before=await page.evaluate(()=>oscillators);
 await page.evaluate(()=>{for(let i=0;i<100;i++)GardenAudio.effect('harvest');});
 assert.ok(await page.evaluate(()=>oscillators)-before<=3,'rapid repeats do not stack 100 cues');
 await page.locator('#settings').click();await page.locator('[data-action="music"]').click();await page.locator('[data-action="sound"]').click();
 const muted=await page.evaluate(()=>oscillators);await page.evaluate(()=>sound('plant'));assert.equal(await page.evaluate(()=>oscillators),muted);
 await page.locator('#gardenVolume').fill('35');assert.equal(await page.locator('#gardenVolumeValue').textContent(),'35%');
 await page.reload();assert.deepEqual(await page.evaluate(()=>GardenAudio.getSettings()),{music:false,volume:.35});assert.equal(await page.evaluate(()=>state.sound),false);
 await page.locator('#settings').click();assert.equal(await page.evaluate(()=>sources.length),0,'disabled music does not start after reload');
 await page.locator('[data-action="music"]').click();await page.waitForFunction(()=>sources.length===1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>audioContext.state==='suspended');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>audioContext.state==='running');
 assert.equal(await page.evaluate(()=>sources.length),1,'resume reuses one music loop');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({audio:stats,checks:'gesture unlock, five cues, repeat limit, music/effects mute, saved volume, suspend/resume: PASS'}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
