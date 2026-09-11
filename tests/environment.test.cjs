const {test}=require('node:test');
const assert=require('node:assert/strict');
const {phase,createWeather,CYCLE}=require('../environment.js');
test('five minute cycle has continuous dusk and dawn boundaries',()=>{
 assert.equal(CYCLE,300);
 assert.deepEqual([0,150,195,270,300].map(t=>phase(t).name),['白天','黄昏','夜晚','天亮','白天']);
 for(const t of [150,165,172.5,195,210,270,300])assert.ok(Math.abs(phase(t-.001).night-phase(t+.001).night)<.001);
 for(const t of [150,165,172.5,195,210,270,300])assert.ok(Math.abs(phase(t-.001).warm-phase(t+.001).warm)<.001);
 assert.equal(phase(170).warm,1);assert.equal(phase(172.5).warm,1);assert.ok(phase(190).warm>phase(180).warm);assert.equal(phase(195).warm,1.25);
 assert.equal(phase(225).night,1);assert.equal(phase(300).night,0);
});
test('rain fades in, stops and observes cooldown independently of day boundary',()=>{
 const weather=createWeather(()=>0);
 assert.equal(weather.sample(59),0);assert.equal(weather.sample(60),0);
 assert.equal(weather.sample(66),1);assert.equal(weather.sample(100),0);
 assert.equal(weather.sample(174),0);assert.equal(weather.sample(175),0);assert.equal(weather.sample(181),1);
});
test('failed random checks remain clear',()=>{
 const weather=createWeather(()=>.99);for(let t=0;t<900;t++)assert.equal(weather.sample(t),0);
});
