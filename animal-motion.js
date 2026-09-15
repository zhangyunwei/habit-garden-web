/* Animal behaviour and navigation. World coordinates, no save writes. */
(function(root){
'use strict';
const config={capybara:{speed:24,radius:180,weights:[35,25,15,25]},panda:{speed:29,radius:180,weights:[25,25,35,15]}};
const clips={idle:{row:0,fps:2},walk:{row:1,fps:8},walkBack:{row:2,fps:8},eat:{row:3,fps:5},sleep:{row:4,fps:2},stand:{row:5,fps:10,once:true},sit:{row:5,fps:10,once:true,reverse:true},lie:{row:6,fps:8,once:true},wake:{row:6,fps:8,once:true,reverse:true},respond:{row:7,fps:7,once:true}};
function clipFor(id,name){return {...(clips[name]||clips.idle),count:8};}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Footprint is an ellipse; decorative paving is traversable.
function walkable(G,s,x,y){
 if(x<100||x>650||y<610||y>1250||y>1500-.64*x)return false;
 for(const [dx,dy] of [[0,0],[-23,0],[23,0],[0,-13],[0,13],[-17,-9],[17,-9],[-17,9],[17,9]]){
  if(G.plotAt(x+dx,y+dy)>=0)return false;
 }
 return !s.decorations.some(d=>d.placed&&d.id!=='stepping_stones'&&Math.hypot((x-d.x)/65,(y-d.y)/37)<1);
}
function clearSegment(G,s,a,b){const n=Math.max(1,Math.ceil(distance(a,b)/6));for(let i=0;i<=n;i++){const t=i/n;if(!walkable(G,s,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}return true;}
function navigation(G,s){
 const nodes=[];for(let y=610;y<=1250;y+=20)for(let x=100;x<=650;x+=20)if(walkable(G,s,x,y))nodes.push({x,y});
 const map=new Map(nodes.map(n=>[`${n.x},${n.y}`,n]));
 for(const n of nodes)n.neighbors=[[-20,0],[20,0],[0,-20],[0,20],[-20,-20],[-20,20],[20,-20],[20,20]].map(([x,y])=>map.get(`${n.x+x},${n.y+y}`)).filter(b=>b&&clearSegment(G,s,n,b));
 return nodes;
}
function findPath(G,s,nodes,start,goal,home,radius){
 const allowed=n=>distance(n,home)<=radius;
 const nearest=p=>nodes.filter(n=>allowed(n)&&clearSegment(G,s,p,n)).sort((a,b)=>distance(a,p)-distance(b,p))[0];
 const from=nearest(start),to=nearest(goal);if(!from||!to)return [];
 const open=new Set([from]),cost=new Map([[from,0]]),parent=new Map();
 while(open.size){let cur=null,best=Infinity;for(const n of open){const f=cost.get(n)+distance(n,to);if(f<best){cur=n;best=f;}}
  if(cur===to){const path=[];for(let n=to;n;n=parent.get(n))path.unshift({x:n.x,y:n.y});return path;}
  open.delete(cur);for(const n of cur.neighbors){if(!allowed(n))continue;const c=cost.get(cur)+distance(cur,n);if(c<(cost.get(n)??Infinity)){cost.set(n,c);parent.set(n,cur);open.add(n);}}
 }return [];
}
function create(G,random=Math.random){
 const actors=new Map();let nodes=[],layout='',editing=false;
 const duration=(lo,hi)=>lo+random()*(hi-lo);
 function enter(a,name,next=null){a.action=name;a.elapsed=0;a.next=next;a.frame=-1;a.blocked=0;a.duration=name==='idle'?duration(6,15):name==='eat'?duration(8,15):name==='sleep'?duration(20,40):clips[name]?.once?8/clips[name].fps:Infinity;}
 function sync(s,isEditing=false){
  editing=isEditing;
  if(editing)return;
  const signature=JSON.stringify(s.decorations.filter(d=>d.placed).map(d=>[d.uid,d.id,d.x,d.y]));
  const changed=signature!==layout||!nodes.length;if(changed){layout=signature;nodes=navigation(G,s);}
  for(const id of Object.keys(config)){
   const home=s.animals[id];if(!G.active(s,id)){actors.delete(id);continue;}
   let a=actors.get(id);
   if(!a||a.home.x!==home.x||a.home.y!==home.y){a={id,home:{x:home.x,y:home.y},x:home.x,y:home.y,facing:1,path:[],row:0};actors.set(id,a);enter(a,'idle');}
   if(!walkable(G,s,a.x,a.y)){
    const free=nodes.filter(n=>![...actors.values()].some(b=>b!==a&&distance(n,b)<55)).sort((p,q)=>distance(p,a.home)-distance(q,a.home))[0];
    if(free){a.x=free.x;a.y=free.y;}a.path=[];enter(a,'idle');
   }else if(changed){a.path=[];enter(a,'idle');}
  }
 }
 function choose(a,s){
  const w=config[a.id].weights;let n=random()*100,index=0;while(index<3&&n>=w[index])n-=w[index++];
  if(index===1){
   const candidates=nodes.filter(p=>distance(p,a.home)<config[a.id].radius&&distance(p,a)>50&&distance(p,a)<150&&![...actors.values()].some(b=>b!==a&&distance(p,b)<60));
   for(let i=0;i<10&&candidates.length;i++){
    const goal=candidates.splice(Math.floor(random()*candidates.length),1)[0],path=findPath(G,s,nodes,a,goal,a.home,config[a.id].radius);
    if(path.length){a.path=path;enter(a,'stand','walk');return;}
   }
  }
  enter(a,index===2?'eat':index===3?'lie':'idle',index===3?'sleep':null);
 }
 function respond(id){const a=actors.get(id);if(!a)return;a.path=[];if(a.action==='sleep'||a.action==='lie')enter(a,'wake','respond');else if(['walk','stand'].includes(a.action))enter(a,'sit','respond');else enter(a,'respond');}
 function tick(s,dt,{paused=false,held=null,talking=null,reduced=false}={}){
  if(paused||editing)return;
  dt=Math.min(.06,Math.max(0,dt));
  for(const a of actors.values()){
   if(a.id===held||reduced)continue;
   if(a.id===talking&&a.action==='idle')continue;
   a.elapsed+=dt;
   if(a.action==='walk'){
    const target=a.path[0];if(!target){enter(a,'sit','idle');continue;}
    const len=distance(a,target),step=Math.min(len,config[a.id].speed*dt),p={x:a.x+(target.x-a.x)/(len||1)*step,y:a.y+(target.y-a.y)/(len||1)*step};
    const blocked=[...actors.values()].some(b=>b!==a&&distance(p,b)<52&&distance(p,b)<distance(a,b));
    if(blocked||!clearSegment(G,s,a,p)){a.blocked+=dt;a.elapsed-=dt;if(a.blocked>1.2){a.path=[];enter(a,'sit','idle');}continue;}
    a.blocked=0;if(Math.abs(target.x-a.x)>.5)a.facing=target.x>a.x?1:-1;a.back=target.y<a.y-1;a.x=p.x;a.y=p.y;if(len<=step+.01)a.path.shift();
   }else if(a.elapsed>=a.duration){
    if(a.next)enter(a,a.next);
    else if(a.action==='idle'){if(a.id!==talking)choose(a,s);}
    else if(a.action==='sleep')enter(a,'wake','idle');
    else enter(a,'idle');
   }
  }
 }
 return {actors,sync,tick,respond,position:id=>actors.get(id),config,clips};
}
const api={config,clips,clipFor,walkable,clearSegment,navigation,findPath,create};if(typeof module!=='undefined')module.exports=api;else root.GardenAnimalMotion=api;
})(typeof window!=='undefined'?window:globalThis);
