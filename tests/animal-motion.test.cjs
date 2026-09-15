const {test}=require('node:test');const assert=require('node:assert/strict');
const G=require('../model.js'),M=require('../animal-motion.js');
function scene(){const s=G.initial();for(const a of Object.values(s.animals)){a.owned=a.active=true;}return s;}
test('navigation avoids all soil including locked plots, solid decor and borders; paving stays open',()=>{
 const s=scene();for(const p of G.plotPositions)assert.equal(M.walkable(G,s,p.x,p.y),false);
 assert.equal(M.walkable(G,s,60,900),false);assert.equal(M.walkable(G,s,630,1220),false);
 s.decorations=[{id:'stone_fountain',placed:true,x:400,y:1000}];assert.equal(M.walkable(G,s,400,1000),false);
 s.decorations[0].id='stepping_stones';assert.equal(M.walkable(G,s,400,1000),true);
});
test('A* routes around a fountain and validates every intermediate segment',()=>{
 const s=scene();s.decorations=[{id:'stone_fountain',placed:true,x:400,y:1000}];
 const nodes=M.navigation(G,s),start={x:300,y:1000},goal={x:500,y:1000},home={x:400,y:1000};
 assert.equal(M.clearSegment(G,s,start,goal),false);
 const route=M.findPath(G,s,nodes,start,goal,home,180);assert.ok(route.length>4);
 let prev=start;for(const p of route){assert.ok(M.clearSegment(G,s,prev,p));assert.ok(Math.hypot(p.x-home.x,p.y-home.y)<=180);prev=p;}
 assert.ok(Math.hypot(prev.x-goal.x,prev.y-goal.y)<=20);
});
test('behaviour stays in reachable grass, uses all four activities, and never mutates saves',()=>{
 const s=scene(),original=JSON.stringify(s);let seed=321;
 const m=M.create(G,()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;});m.sync(s);
 const seen=new Set();let walked=0;
 for(let i=0;i<18000;i++){m.tick(s,.06);for(const a of m.actors.values()){seen.add(a.action);assert.ok(M.walkable(G,s,a.x,a.y));assert.ok(Math.hypot(a.x-a.home.x,a.y-a.home.y)<=180.1);if(a.action==='walk')walked++;}}
 for(const name of ['idle','walk','sleep','eat','stand','sit','lie','wake'])assert.ok(seen.has(name),name);assert.ok(walked>100);assert.equal(JSON.stringify(s),original);
});
test('held, reduced motion, background pause and edit freeze both position and clocks',()=>{
 const s=scene(),m=M.create(G);m.sync(s);const a=m.position('capybara');
 for(const opts of [{paused:true},{held:'capybara'},{reduced:true}]){const before=JSON.stringify(a);m.tick(s,100,opts);assert.equal(JSON.stringify(a),before);}
 m.sync(s,true);const before=JSON.stringify([...m.actors]);m.tick(s,.05);assert.equal(JSON.stringify([...m.actors]),before);
});
test('sleep click wakes before response; animals in warehouse have no runtime actor',()=>{
 const s=scene(),m=M.create(G);m.sync(s);const a=m.position('panda');a.action='sleep';m.respond('panda');assert.equal(a.action,'wake');
 for(let i=0;i<25;i++)m.tick(s,.06,{talking:'panda'});assert.equal(a.action,'respond');
 for(let i=0;i<30;i++)m.tick(s,.06,{talking:'panda'});assert.equal(a.action,'idle');
 s.animals.panda.active=false;m.sync(s);assert.equal(m.position('panda'),undefined);
});
test('an occupied route waits then gives up, without walking through the other animal',()=>{
 const s=scene(),m=M.create(G);s.animals.capybara={owned:true,active:true,x:300,y:1000};s.animals.panda={owned:true,active:true,x:370,y:1000};m.sync(s);
 const a=m.position('capybara');a.action='walk';a.path=[{x:430,y:1000}];a.elapsed=0;a.duration=Infinity;
 for(let i=0;i<100;i++){m.tick(s,.05,{held:'panda'});assert.ok(Math.hypot(a.x-370,a.y-1000)>=52);}
 assert.notEqual(a.action,'walk');
});
