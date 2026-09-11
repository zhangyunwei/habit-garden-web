const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const G=require('../model.js');

test('compressed coral assets stay under the online-load budget',()=>{
 const root=path.join(__dirname,'..');
 for(const [file,max] of [
  ['assets/coral/garden.png',700000],
  ['assets/coral/icons/core/icon_sickle.png',20000],
  ['assets/coral/icons/core/icon_tutorial_hand.png',20000],
  ['assets/coral/icons/core/icon_level_sprout.png',90000]
 ]){
  const size=fs.statSync(path.join(root,file)).size;
  assert.ok(size>800&&size<max,`${file} is ${size} bytes`);
 }
});

test('placed decorations and animals can be stored without losing ownership',()=>{
 const s=G.initial();
 s.tutorial='done';s.xp=170;s.coins=500;
 G.buy(s,'animals','capybara');
 G.buy(s,'decorations','daisy_flowerpot');
 const grass=G.editCells.filter(c=>!c.plot);
 G.place(s,1,grass[0].x,grass[0].y);
 G.place(s,'capybara',grass[1].x,grass[1].y);
 G.store(s,1);
 G.store(s,'capybara');
 assert.equal(s.decorations[0].placed,false);
 assert.equal(s.animals.capybara.owned,true);
 assert.equal(s.animals.capybara.active,false);
});
