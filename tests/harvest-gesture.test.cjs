const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
function setup(){
 const handlers={},harvests=[],els={confirm:{hidden:true},viewport:{getBoundingClientRect:()=>({left:0,right:500,top:0,bottom:500})},dragGhost:{style:{}}};
 const ctx={handlers,harvests,console,Math,Set,Map,setTimeout:()=>{},document:{addEventListener:(name,fn)=>handlers[name]=fn},window:{addEventListener:()=>{}},$:id=>els[id]||{},modalType:null,gesture:null,seedPlot:2,mode:'browse',pointers:new Map(),camera:{},state:{tutorial:'done',plots:[{plant:{remaining:0}},{plant:{remaining:3}},{plant:{remaining:0}},{plant:null}]},G:{plotAt:x=>Math.floor(x/100),stage:p=>p},mapPoint:e=>({x:e.clientX,y:e.clientY}),closeSeeds:()=>{ctx.closed=true;ctx.seedPlot=null;},render:()=>{},doHarvest:i=>{harvests.push(i);ctx.state.plots[i].plant=null;},ghost:()=>{},levelPopup:()=>{},plotClick:()=>{},applyCamera:()=>{}};
 vm.createContext(ctx);
 for(const [start,end] of [['function toolAt(e)','function ghost(e'],['function endGesture()','document.addEventListener(\'pointerdown\''],["document.addEventListener('pointerdown'","document.addEventListener('pointercancel'"]])vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),ctx);
 const event=(x,y,tool=false)=>({clientX:x,clientY:y,pointerId:1,button:0,preventDefault(){},target:{closest:q=>q==='#game'||(tool&&q==='[data-harvest-tool]')?{}:null}});
 return {ctx,handlers,harvests,event};
}
test('tap sickle harvests selected plot only and dismisses bubble',()=>{const {ctx,handlers,harvests,event}=setup();handlers.pointerdown(event(250,40,true));assert.deepEqual(harvests,[]);handlers.pointerup(event(250,40,true));assert.deepEqual(harvests,[2]);assert.equal(ctx.closed,true);assert.equal(ctx.mode,'browse');});
test('drag dismisses bubble, skips immature/empty plots, and never harvests twice',()=>{const {ctx,handlers,harvests,event}=setup();handlers.pointerdown(event(250,40,true));for(const x of [255,150,50,250,50,350])handlers.pointermove(event(x,100));handlers.pointerup(event(350,100));assert.deepEqual(harvests,[2,0]);assert.equal(ctx.closed,true);assert.equal(ctx.state.plots[1].plant.remaining,3);assert.equal(ctx.mode,'browse');});
test('cancel before drag does not harvest; cancel during drag clears tool mode',()=>{const {ctx,handlers,harvests,event}=setup();handlers.pointerdown(event(250,40,true));ctx.endGesture();assert.deepEqual(harvests,[]);ctx.seedPlot=2;handlers.pointerdown(event(250,40,true));handlers.pointermove(event(150,100));ctx.endGesture();assert.equal(ctx.mode,'browse');assert.equal(ctx.gesture,null);assert.deepEqual(harvests,[]);});

test('two fingers zoom around their midpoint and release without clicking land',()=>{
 const {ctx,handlers,event}=setup();
 ctx.camera={x:0,y:0,scale:1,base:1,z:1};
 ctx.$=id=>id==='viewport'?{getBoundingClientRect:()=>({left:0,top:0,width:500,height:500})}:id==='confirm'?{hidden:true}:id==='dragGhost'?{style:{}}:{};
 ctx.G.plotAt=()=>-1;let clicks=0;ctx.plotClick=()=>clicks++;
 function touch(x,y,id){const e=event(x,y);e.pointerId=id;e.target.closest=q=>q==='#game'||q==='#viewport'?{}:null;return e;}
 handlers.pointerdown(touch(100,200,1));handlers.pointerdown(touch(300,200,2));
 assert.equal(ctx.gesture.type,'pinch');
 handlers.pointermove(touch(400,200,2));
 assert.equal(ctx.camera.z,1.5);assert.equal(ctx.camera.x,-50);assert.equal(ctx.camera.y,-100);
 handlers.pointermove(touch(900,200,2));assert.equal(ctx.camera.z,1.8);
 handlers.pointerup(touch(100,200,1));handlers.pointerup(touch(900,200,2));assert.equal(clicks,0);assert.equal(ctx.gesture,null);
});
