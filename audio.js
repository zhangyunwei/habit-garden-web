/* Original 64 BPM garden waltz and soft interaction cues. No external audio assets. */
(function(root){
 'use strict';
 const KEY='habit-garden-audio-v1';
 let prefs={music:true,volume:.65};
 try{const p=JSON.parse(localStorage.getItem(KEY));if(p){prefs.music=p.music!==false;if(Number.isFinite(p.volume))prefs.volume=Math.max(0,Math.min(1,p.volume));}}catch{}
 let context,master,musicGain,effectsGain,source,buffer,rendering,enabled=true,unlocked=false,voices=0;
 const lastEffect=new Map();
 const hz=midi=>440*Math.pow(2,(midi-69)/12);
 function tone(ctx,out,freq,start,duration,level,type='sine',endFreq){
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;
  osc.frequency.setValueAtTime(freq,start);if(endFreq)osc.frequency.exponentialRampToValueAtTime(endFreq,start+duration*.8);
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);gain.gain.setValueAtTime(0,start+duration+.015);
  osc.connect(gain);gain.connect(out);osc.start(start);osc.stop(start+duration+.02);
  osc.onended=()=>{osc.disconnect();gain.disconnect();};return osc;
 }
 async function compose(ctx){
  const Offline=root.OfflineAudioContext||root.webkitOfflineAudioContext;if(!Offline)return null;
  const beat=60/64,length=16*3*beat,rate=22050,off=new Offline(1,Math.ceil((length+3)*rate),rate);
  const soft=off.createBiquadFilter();soft.type='lowpass';soft.frequency.value=2700;soft.Q.value=.3;soft.connect(off.destination);
  const chords=[[48,60,64,67],[53,60,65,69],[45,60,64,69],[55,59,62,67]];
  const melody=[[76,79,81],[79,null,76],[77,76,72],[74,null,76],[76,72,69],[72,null,76],[74,71,67],[71,null,74],
   [79,81,84],[81,null,79],[77,79,76],[74,null,72],[76,79,76],[72,null,69],[71,74,72],[71,null,null]];
  for(let bar=0;bar<16;bar++){
   const t=bar*3*beat,c=chords[Math.floor(bar/2)%4];
   tone(off,soft,hz(c[0]),t,2.4,.075,'sine');
   for(let j=1;j<4;j++)tone(off,soft,hz(c[j]),t+(j-1)*beat,1.7,.026,'sine');
   for(let j=0;j<3;j++)if(melody[bar][j]){
    const n=hz(melody[bar][j]),at=t+j*beat;
    tone(off,soft,n,at,1.9,.068);tone(off,soft,n*2,at,.7,.010);tone(off,soft,n*3,at,.35,.003);
   }
  }
  const rendered=await off.startRendering(),loop=ctx.createBuffer(1,Math.round(length*rate),rate),data=loop.getChannelData(0),raw=rendered.getChannelData(0);
  // Fold the final note tails into the opening, giving an uninterrupted loop boundary.
  for(let i=0;i<raw.length;i++)data[i%data.length]+=raw[i];
  return loop;
 }
 function volume(){if(!context)return;const t=context.currentTime;master.gain.setTargetAtTime(prefs.volume,t,.04);musicGain.gain.setTargetAtTime(prefs.music?.72:0,t,.12);effectsGain.gain.setTargetAtTime(enabled?.75:0,t,.02);}
 function remember(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{}}
 function startMusic(){
  if(!context||!unlocked||!prefs.music||source)return;
  if(buffer){source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(musicGain);source.start();return;}
  if(!rendering)rendering=compose(context).then(result=>{buffer=result;if(buffer)startMusic();}).catch(()=>{});
 }
 function unlock(){
  try{
   if(!context){const C=root.AudioContext||root.webkitAudioContext;if(!C)return;
    context=new C();master=context.createGain();musicGain=context.createGain();effectsGain=context.createGain();
    master.gain.value=prefs.volume;musicGain.gain.value=0;effectsGain.gain.value=enabled?.75:0;
    musicGain.connect(master);effectsGain.connect(master);master.connect(context.destination);
   }
   unlocked=true;if(!document.hidden)context.resume().catch(()=>{});volume();startMusic();
  }catch{/* Audio is optional; browser restrictions must not interrupt gameplay. */}
 }
 function effect(kind='tap'){
  if(!enabled||document.hidden||prefs.volume===0)return;
  unlock();if(!context||context.state!=='running')return;
  const t=context.currentTime,previous=lastEffect.get(kind)??-Infinity;
  if(t-previous<(kind==='capybara'||kind==='panda'?.35:.065)||voices>=12)return;
  lastEffect.set(kind,t);
  const patterns={tap:[[600,0,.07,.08]],land:[[245,0,.13,.13,'triangle',170]],
   plant:[[392,0,.15,.10],[523,.075,.22,.075]],harvest:[[659,0,.22,.10],[880,.08,.3,.075],[1047,.15,.28,.035]],
   buy:[[523,0,.16,.08],[659,.09,.23,.07]],capybara:[[260,0,.20,.12,'sine',340],[310,.16,.23,.085,'sine',255]],
   panda:[[330,0,.20,.09,'sine',270],[392,.15,.25,.075,'sine',330]]};
  const pattern=patterns[kind]||patterns.tap;
  for(const [f,delay,duration,level,type,end] of pattern){
   voices++;const osc=tone(context,effectsGain,f,t+delay,duration,level,type,end),cleanup=osc.onended;
   osc.onended=()=>{voices--;cleanup();};
  }
 }
 function setMusic(value){prefs.music=Boolean(value);remember();volume();if(prefs.music){unlock();startMusic();}}
 function setVolume(value){if(!Number.isFinite(value))return;prefs.volume=Math.max(0,Math.min(1,value));remember();volume();}
 function setEffects(value){enabled=Boolean(value);volume();}
 root.GardenAudio={unlock,effect,setMusic,setVolume,setEffects,getSettings:()=>({...prefs})};
 document.addEventListener('pointerdown',e=>{if(e.target.closest?.('#game'))unlock();},{capture:true,passive:true});
 document.addEventListener('keydown',e=>{if(!e.repeat&&(e.key==='Enter'||e.key===' '))unlock();},{capture:true});
 document.addEventListener('visibilitychange',()=>{if(!context)return;if(document.hidden)context.suspend().catch(()=>{});else if(unlocked)context.resume().catch(()=>{});});
 window.addEventListener('pagehide',()=>context?.suspend().catch(()=>{}));
 window.addEventListener('pageshow',()=>{if(unlocked&&!document.hidden)context?.resume().catch(()=>{});});
})(window);
