/* Pure game rules, shared by the browser and Node verification. */
(function(root){
'use strict';
const plants=[
 {id:'daisy',name:'雏菊',level:1,time:8,cost:5,price:10,xp:5},
 {id:'carrot',name:'胡萝卜',level:2,time:12,cost:8,price:16,xp:8},
 {id:'strawberry',name:'草莓',level:3,time:18,cost:12,price:24,xp:12},
 {id:'sunflower',name:'向日葵',level:4,time:24,cost:18,price:36,xp:16},
 {id:'pumpkin',name:'南瓜',level:5,time:30,cost:25,price:50,xp:20}
];
const decorations=[
 {id:'daisy_flowerpot',name:'小花盆',level:1,cost:5},
 {id:'stepping_stones',name:'石板小路',level:2,cost:8},
 {id:'wooden_bench',name:'花园长椅',level:3,cost:15},
 {id:'courtyard_lamp',name:'庭院路灯',level:4,cost:20},
 {id:'stone_fountain',name:'小型喷泉',level:5,cost:30}
];
const animals=[{id:'capybara',name:'卡皮巴拉',level:2,cost:30,skill:'成长时间 −20%'},{id:'panda',name:'熊猫',level:4,cost:60,skill:'出售价格 +10%'}];
const thresholds=[0,20,50,100,170];
const gridPoint=(col,row)=>({x:230+col*93-row*78,y:740+col*35+row*61});
const plotPositions=Array.from({length:8},(_,i)=>gridPoint(i%4,Math.floor(i/4)));
// Visible soil corners, relative to its 166 × 104 sprite canvas.
const plotHull=[[-7,-43],[80,-10],[7,47],[-80,14]];
function plotAt(x,y){return plotPositions.findIndex(p=>plotHull.every((a,i)=>{const b=plotHull[(i+1)%4];return (b[0]-a[0])*(y-p.y-a[1])-(b[1]-a[1])*(x-p.x-a[0])>=0;}));}

const clone=x=>JSON.parse(JSON.stringify(x));
const level=s=>thresholds.filter(x=>s.xp>=x).length;
const zero=()=>Object.fromEntries(plants.map(p=>[p.id,0]));
function initial(){return {version:1,layoutVersion:4,coins:50,xp:0,seeds:{...zero(),daisy:4},harvest:zero(),plots:Array.from({length:8},(_,i)=>({open:i<4,plant:null})),decorations:[],animals:{capybara:{owned:false,active:false,x:120,y:620},panda:{owned:false,active:false,x:630,y:700}},tutorial:'land',sound:true,newUnlock:false,nextId:1};}
function check(ok,msg){if(!ok)throw Error(msg);}
function active(s,id){return s.animals[id].owned&&s.animals[id].active;}
function growth(s,id){return Math.ceil(plants.find(p=>p.id===id).time*(active(s,'capybara')?.8:1));}
function price(s,id){return Math.round(plants.find(p=>p.id===id).price*(active(s,'panda')?1.1:1));}
function stage(plant,now=Date.now()){if(!plant)return null;const r=Math.max(0,(now-plant.at)/(plant.duration*1000));return {ratio:Math.min(1,r),stage:r>=1?'mature':r>=.7?'growing':r>=.3?'sprout':'seed',remaining:Math.max(0,Math.ceil(plant.duration-(now-plant.at)/1000))};}
function plant(s,i,id,now=Date.now()){
 const p=plants.find(p=>p.id===id),plot=s.plots[i];check(p&&p.level<=level(s),'植物尚未解锁');check(plot&&plot.open,'请先开垦土地');check(!plot.plant,'这块土地已经种好了');
 const free=s.tutorial==='seed'&&i===0;
 check(free||s.seeds[id]>0,'种子不足，前往商店购买');
 if(!free)s.seeds[id]--;plot.plant={id,at:now,duration:free?3:growth(s,id)};
 if(free)s.tutorial='grow';return {free};
}
function harvest(s,i,now=Date.now()){
 const plot=s.plots[i];check(plot&&plot.plant,'这里还没有植物');const st=stage(plot.plant,now);check(st.remaining===0,`还需要 ${st.remaining} 秒`);
 const p=plants.find(p=>p.id===plot.plant.id),before=level(s);s.harvest[p.id]++;s.xp+=p.xp;plot.plant=null;
 const after=level(s),unlocks=[];for(let l=before+1;l<=after;l++){s.seeds[plants[l-1].id]++;unlocks.push(l);s.newUnlock=true;}
 if(s.tutorial==='grow'||s.tutorial==='harvest')s.tutorial='warehouse';return {id:p.id,xp:p.xp,unlocks};
}
function buy(s,type,id,count=1){
 check(Number.isInteger(count)&&count>0,'购买数量无效');const list=type==='seeds'?plants:type==='decorations'?decorations:animals,p=list.find(p=>p.id===id);check(p,'商品不存在');check(level(s)>=p.level,`家园 ${p.level} 级解锁`);
 if(type==='animals'){check(!s.animals[id].owned,'已经拥有这只动物');check(count===1,'每只动物限购一次');}
 if(type==='decorations')check(s.decorations.filter(x=>x.id===id).length+count<=5,'已达持有上限');
 check(s.coins>=p.cost*count,`金币不足，还差 ${p.cost*count-s.coins} 金币`);s.coins-=p.cost*count;
 if(type==='seeds')s.seeds[id]+=count;
 else if(type==='animals')Object.assign(s.animals[id],{owned:true,active:true});
 else for(let n=0;n<count;n++)s.decorations.push({id,uid:s.nextId++,placed:false,x:0,y:0});
}
function sell(s,id,count){const n=Math.min(s.harvest[id]||0,Math.max(0,Math.floor(Number(count)||0)));check(n>0,'请选择出售数量');const gain=price(s,id)*n;s.harvest[id]-=n;s.coins+=gain;if(s.tutorial==='warehouse'||s.tutorial==='sell')s.tutorial='done';return gain;}
const total=s=>plants.reduce((sum,p)=>sum+s.harvest[p.id]*price(s,p.id),0);
function sellAll(s){check(total(s)>0,'仓库还没有收获物');let gain=0;for(const p of plants)if(s.harvest[p.id])gain+=sell(s,p.id,s.harvest[p.id]);return gain;}
function unlock(s,i){check(i>=4&&i<8,'土地编号无效');check(!s.plots[i].open,'土地已经开垦');check(level(s)>=i-2,`家园 ${i-2} 级解锁`);check(s.plots[i-1].open,'请先开垦前一块土地');const cost=[15,20,30,40][i-4];check(s.coins>=cost,`金币不足，还差 ${cost-s.coins} 金币`);s.coins-=cost;s.plots[i].open=true;}
function toggleAnimal(s,id){check(s.animals[id]?.owned,'请先购买动物');s.animals[id].active=!s.animals[id].active;return s.animals[id].active;}
function rescue(s){if(s.coins===0&&Object.values(s.seeds).every(n=>n===0)&&s.plots.every(p=>!p.plant)){s.seeds.daisy=2;return true;}return false;}
// Shared isometric lattice: soil-shaped cells with a narrow grass seam.
const editCells=[];
for(let row=-8;row<=12;row++)for(let col=-8;col<=12;col++){
 const {x,y}=gridPoint(col,row);
 if(x<85||x>665||y<595||y>1280||y>1530-.64*x)continue;
 editCells.push({x,y,plot:row>=0&&row<2&&col>=0&&col<4});
}
function cellAt(x,y){return editCells.find(p=>plotHull.every((a,i)=>{const b=plotHull[(i+1)%4];return (b[0]-a[0])*(y-p.y-a[1])-(b[1]-a[1])*(x-p.x-a[0])>=0;}));}
function validPosition(s,x,y,uid){const cell=cellAt(x,y);if(!cell||cell.plot)return false;
 return !s.decorations.some(d=>d.placed&&d.uid!==uid&&cellAt(d.x,d.y)===cell)&&!animals.some(a=>a.id!==uid&&active(s,a.id)&&cellAt(s.animals[a.id].x,s.animals[a.id].y)===cell);
}
function place(s,uid,x,y){check(validPosition(s,x,y,uid),'这里不能摆放，请选择空闲草地格子');const cell=cellAt(x,y),d=typeof uid==='number'?s.decorations.find(d=>d.uid===uid):s.animals[uid];check(d,'物品不存在');Object.assign(d,{x:cell.x,y:cell.y});if(typeof uid==='number')d.placed=true;else d.active=true;}
function store(s,uid){if(typeof uid==='number'){const d=s.decorations.find(d=>d.uid===uid);check(d,'装饰不存在');d.placed=false;}else{check(s.animals[uid]?.owned,'动物不存在');s.animals[uid].active=false;}}
function load(raw){try{const s=JSON.parse(raw);check(s?.version===1,'存档版本不支持');const int=n=>Number.isSafeInteger(n)&&n>=0;check(int(s.coins)&&int(s.xp)&&int(s.nextId)&&s.nextId>0,'数值损坏');
 for(const key of ['seeds','harvest'])for(const p of plants)check(int(s[key]?.[p.id]),'库存损坏');
 check(Array.isArray(s.plots)&&s.plots.length===8,'土地损坏');s.plots.forEach((p,i)=>{check(typeof p.open==='boolean'&&(i>=4||p.open),'土地损坏');if(p.plant)check(p.open&&plants.some(x=>x.id===p.plant.id)&&Number.isFinite(p.plant.at)&&p.plant.at>=0&&Number.isFinite(p.plant.duration)&&p.plant.duration>0,'植物损坏');});
 check(Array.isArray(s.decorations),'装饰损坏');const ids=new Set();s.decorations.forEach(d=>{check(decorations.some(x=>x.id===d.id)&&int(d.uid)&&!ids.has(d.uid)&&d.uid<s.nextId&&typeof d.placed==='boolean'&&Number.isFinite(d.x)&&Number.isFinite(d.y),'装饰损坏');ids.add(d.uid);});for(const d of decorations)check(s.decorations.filter(x=>x.id===d.id).length<=5,'装饰超限');
 for(const a of animals){const v=s.animals?.[a.id];check(v&&typeof v.owned==='boolean'&&typeof v.active==='boolean'&&(!v.active||v.owned)&&Number.isFinite(v.x)&&Number.isFinite(v.y),'动物损坏');}
 check(['land','seed','grow','harvest','warehouse','sell','done'].includes(s.tutorial)&&typeof s.sound==='boolean','引导损坏');
 // Preserve economy and growing plants when upgrading the old two-column garden.
 if(s.layoutVersion!==4){
  const placed=s.decorations.filter(d=>d.placed).map(d=>({item:d,key:d.uid,animal:false})).concat(animals.filter(a=>active(s,a.id)).map(a=>({item:s.animals[a.id],key:a.id,animal:true})));
  for(const entry of placed)entry.item[entry.animal?'active':'placed']=false;
  for(const {item,key,animal} of placed){const cell=editCells.filter(c=>validPosition(s,c.x,c.y,key)).sort((a,b)=>Math.hypot(a.x-item.x,a.y-item.y)-Math.hypot(b.x-item.x,b.y-item.y))[0];if(cell)Object.assign(item,{x:cell.x,y:cell.y,[animal?'active':'placed']:true});}
  s.layoutVersion=4;
 }
 return {state:s,error:null};
 }catch(e){return {state:initial(),error:e.message};}}
const api={plants,decorations,animals,thresholds,plotPositions,plotHull,plotAt,editCells,cellAt,initial,clone,level,active,growth,price,stage,plant,harvest,buy,sell,total,sellAll,unlock,toggleAnimal,rescue,validPosition,place,store,load};
if(typeof module!=='undefined')module.exports=api;root.Garden=api;
})(typeof globalThis!=='undefined'?globalThis:this);
