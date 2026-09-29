const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../model.js');

test('ranch v2 save becomes farm v1 without losing farm progress',()=>{
 const s=G.initial();s.version=2;s.coins=137;s.xp=58;s.tutorial='done';s.seeds.carrot=4;s.harvest.daisy=3;
 s.seeds.grass=9;s.harvest.grass=0;s.ranchGiftGranted=true;s.ranch={sheep:[{name:'棉花',affinity:28}],grass:9,wool:2};
 s.plots[0].plant={id:'grass',at:1234,duration:12};s.plots[1].plant={id:'carrot',at:5678,duration:12};
 const result=G.load(JSON.stringify(s));assert.equal(result.error,null);assert.equal(result.migratedRanch,true);
 const farm=result.state;assert.equal(farm.version,1);assert.equal(farm.coins,137);assert.equal(farm.xp,58);
 assert.equal(farm.seeds.carrot,4);assert.equal(farm.harvest.daisy,3);assert.equal(farm.plots[0].plant,null);
 assert.deepEqual(farm.plots[1].plant,s.plots[1].plant);assert.ok(!('grass' in farm.seeds));assert.ok(!('ranch' in farm));
 assert.equal(G.load(JSON.stringify(farm)).error,null);
});
