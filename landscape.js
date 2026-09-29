/* Scenery only: the right screen adds no resources, controls or game state. */
(()=>{
'use strict';
const scenery=document.querySelector('#world .environment-scenery')||document.getElementById('world');
const right=document.createElement('img');right.className='landscape-right';right.alt='';right.draggable=false;right.src=asset('assets/coral/landscape/quiet-meadow-preview.png');scenery.prepend(right);
let requested=false;
function onCamera(){if(requested||!camera.scale)return;const viewport=document.getElementById('viewport');if((-camera.x+viewport.clientWidth)/camera.scale<=752)return;requested=true;const full=new Image();full.decoding='async';full.onload=()=>{right.src=full.src;};full.onerror=()=>{requested=false;};full.src=asset('assets/coral/landscape/quiet-meadow.png');}
window.Landscape={onCamera};onCamera();
})();
