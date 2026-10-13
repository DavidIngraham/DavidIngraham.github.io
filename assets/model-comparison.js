// Trusted blog component; repository Markdown supplies only an asset manifest URL.
export async function renderComparison(root, manifestUrl) {
 await import('https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js');
 const asset = name => {
   if (!/^[a-zA-Z0-9_-]+\.(glb|json)$/.test(name)) throw Error('Invalid model asset name');
   return new URL(name, manifestUrl).href;
 };
 if (!document.querySelector('link[data-concept-style]')) {
   const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/model-comparison.css';css.dataset.conceptStyle='';document.head.append(css);
 }
 root.className='concept-comparison';
 root.innerHTML=`<p>Compare the candidates at the same scale. Drag to orbit; scroll or pinch to zoom.</p>
 <div class="controls" aria-label="Common camera controls"><button data-orbit="45deg 72deg 4.8m">Isometric</button><button data-orbit="0deg 90deg 4.8m">Side</button><button data-orbit="90deg 90deg 4.8m">Front</button><button data-orbit="0deg 0deg 4.8m">Top</button><button class="concept-overlays" aria-pressed="true">Waterline & rotation rings</button></div>
 <div class="concept-models"></div><p role="status">Loading candidate geometry…</p>
 <p class="note">Blue: hull · Sand: wing · Teal: keel · Orange: rudder · Slate: ballast · Pink: center of gravity. The waterline uses zero heel and fixed zero pitch. Purple rings show full rotation clearance; the wing is in its neutral reference pose.</p>`;

const status=root.querySelector('[role=status]');
try {
 const response=await fetch(manifestUrl);if(!response.ok)throw Error('Candidate metadata unavailable');
 const candidates=await response.json();let loaded=0;
 for(const c of candidates){
  const card=document.createElement('section');card.className='concept-card';
  const title=document.createElement('h3');title.textContent=`${c.design.length_m.toFixed(1)} m hull`;card.append(title);
  const p=document.createElement('p');p.textContent=c.design.length_m<1.5?'Current nominal sizing baseline':'Restored starting concept';card.append(p);
  const mv=document.createElement('model-viewer');mv.setAttribute('src',asset(c.file));mv.setAttribute('alt',`${title.textContent} Blue Dog concept: wing over hull, keel and ballast below, rudder aft.`);
  for(const [key,value] of Object.entries({'loading':'eager','camera-controls':'','touch-action':'pan-y','camera-orbit':'45deg 72deg 4.8m','camera-target':'0m 0.6m 0m','field-of-view':'35deg','min-camera-orbit':'auto auto 1m','max-camera-orbit':'auto auto 10m','interaction-prompt':'none','exposure':'1'}))mv.setAttribute(key,value);
  mv.addEventListener('load',()=>{loaded++;status.textContent=`${loaded} of ${candidates.length} models loaded · dimensions in metres`;root.dataset.models=loaded===candidates.length?'ready':'loading';});
  mv.addEventListener('error',()=>{status.textContent='Unable to load a 3D model. Use the fixed views or download the GLB.';status.className='error';root.dataset.models='error';});
  card.append(mv);const details=document.createElement('div');details.className='details';
  const stats=document.createElement('div');stats.className='stats';
  for(const [label,value] of [['Mass',`${c.massKg.toFixed(1)} kg`],['Swept length',`${c.envelope.sweptLengthM.toFixed(2)} m`],['Keel to wing top',`${c.envelope.keelToWingHeightM.toFixed(2)} m`]]){const item=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('span');strong.textContent=value;small.textContent=label;item.append(strong,small);stats.append(item);}
  details.append(stats);const links=document.createElement('p');for(const [label,file] of [['Download GLB',c.file],['Parameters & provenance',c.metadata]]){const a=document.createElement('a');a.href=asset(file);a.textContent=label;links.append(a,document.createTextNode('  '));}details.append(links);card.append(details);root.querySelector('.concept-models').append(card);
 }
 for(const button of root.querySelectorAll('[data-orbit]'))button.onclick=()=>{for(const mv of root.querySelectorAll('model-viewer')){mv.setAttribute('camera-orbit',button.dataset.orbit);mv.setAttribute('camera-target','0m 0.6m 0m');mv.setAttribute('field-of-view','35deg');mv.jumpCameraToGoal();}};
 root.querySelector('.concept-overlays').onclick=function(){const show=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(show));for(const mv of root.querySelectorAll('model-viewer'))for(const m of mv.model?.materials||[]){if(m.name==='waterline'||m.name.endsWith('-sweep')){const color=[...m.pbrMetallicRoughness.baseColorFactor];color[3]=show?(m.name==='waterline'?.22:.7):0;m.pbrMetallicRoughness.setBaseColorFactor(color);}}};
 setTimeout(()=>{if(loaded<candidates.length)status.textContent='3D loading is taking longer than expected. Fixed views and GLB downloads are available below.';},20000);
}catch(error){status.textContent=error.message;status.className='error';root.dataset.models='error';}

}
