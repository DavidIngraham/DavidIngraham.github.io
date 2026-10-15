"use strict";
const $=s=>document.querySelector(s), colors={baseline:'#286b89',direct:'#348256',candidate:'#ad5527'};
const specs=[['height_rms','Height error','m',1,1.05],['pitch_rms','Pitch rate','°/s',2,1.05],['heading_rms','Heading-rate error','°/s',3,1.1]];
const stories={voltage_ramp:'Does the height benefit survive falling voltage and estimated states? Voltage ramps from 22.2 to 20.4 V between 15 and 45 s. Compare height error and pitch motion, then check the heading cost.',gust:'Can less pitch motion coexist with good steering? This fresh gust realization exposes the remaining heading penalty even as height and pitch improve.',maneuver:'Does the controller generalize to a new command? The request changes to 1.5 m and 8°/s. Compare exact and estimated states to see the height-tracking tradeoff.',speed_transition:'Does damping compromise climb/descent tracking? Height requests ramp at ±0.5 m/s over 10–25 and 35–50 s. The remaining height penalty also appears with exact states.',strong_gust:'Do the improvements survive stronger disturbances? Compare all three measures; this case improves all three with the observer.',soft_roll_gust:'Does the observer tolerate unknown roll dynamics? The aircraft has softer roll physics while its predictor retains the nominal model.',low_voltage_gust:'Does compensation work at a constant 20.4 V? Pitch and height improve here, while heading remains a tradeoff.',limits_recovery:'How does it recover after large requests? Shared shaping limits a 10 m height and 25°/s turn request. Gusts stop at 50 s; inspect the calm recovery.'};
let data,svgs=[],syncTime=()=>{};
document.addEventListener('replay-time',e=>syncTime(e.detail));
function render(){
 const active=data.runs.filter(r=>r.case===$('#scenario').value&&r.observer===($('#sensing').value==='true'));
 const b=active.find(r=>r.family==='baseline'),d=active.find(r=>r.family==='direct');
 $('#story').textContent=stories[b.case];$('#metrics').replaceChildren();
 for(const [key,title,unit,,limit] of specs){const ratio=d.metrics[key]/b.metrics[key],el=document.createElement('div');el.className='metric';el.innerHTML=`${title} RMS<strong>${b.metrics[key].toFixed(3)} → ${d.metrics[key].toFixed(3)}</strong><small>${unit} · baseline → refined</small><small class="${ratio<=limit?'pass':'fail'}">${((ratio-1)*100).toFixed(1)}% · ${ratio<=limit?'within':'outside'} limit</small>`;$('#metrics').append(el);}
 const shown=active.filter(r=>r.family!=='candidate'||$('#candidate').checked);$('.legend .candidate').hidden=!$('#candidate').checked;
 const start=$('#window').checked?b.start:0;$('#plots').replaceChildren();svgs=[];
 const x=t=>60+(t-start)/(80-start)*850;
 for(const [,title,unit,col] of specs){
 const values=shown.flatMap(r=>r.trace.filter(t=>t[0]>=start).map(t=>t[col]));let low=Math.min(0,...values),high=Math.max(0,...values),pad=Math.max((high-low)*.08,.001);low-=pad;high+=pad;
 const y=v=>150-(v-low)/(high-low)*110;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 940 190');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${title} versus time in ${unit}, for the selected controllers`);
 let html=`<text x="60" y="20">${title} (${unit})</text>`;
 for(let i=0;i<3;i++){let v=low+(high-low)*i/2;html+=`<path d="M60 ${y(v)}H910" stroke="#e0e6eb"/><text x="52" y="${y(v)+4}" text-anchor="end">${v.toFixed(2)}</text>`;}
 html+=`<path d="M60 ${y(0)}H910" stroke="#929ea8" stroke-dasharray="3 4"/>`;
 for(let t=Math.ceil(start/10)*10;t<=80;t+=10)html+=`<text x="${x(t)}" y="172" text-anchor="middle">${t}</text>`;
 html+='<text x="920" y="185" text-anchor="end">Time (s)</text>';
 for(const r of shown){const points=r.trace.filter(t=>t[0]>=start).map(t=>`${x(t[0]).toFixed(2)},${y(t[col]).toFixed(2)}`).join(' ');html+=`<polyline points="${points}" fill="none" stroke="${colors[r.family]}" stroke-width="1.6" ${r.family==='candidate'?'stroke-dasharray="5 4"':''}/>`;}
 html+='<path class="cursor" stroke="#596774" stroke-dasharray="3 3"/>';svg.innerHTML=html;
 svg.onpointermove=e=>{const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const local=pt.matrixTransform(svg.getScreenCTM().inverse());let t=start+(local.x-60)/850*(80-start);t=Math.max(start,Math.min(79.9,t));document.dispatchEvent(new CustomEvent('comparison-time',{detail:t}));};
 syncTime=t=>{for(const s of svgs)s.querySelector('.cursor').setAttribute('d',`M${x(t)} 30V150`);const i=Math.round(t*10),bt=b.trace[i],dt=d.trace[i];$('#cursor').textContent=`${bt[0].toFixed(1)} s · ${bt[4].toFixed(2)} V · Baseline → refined: `+specs.map(([,n,u,c])=>`${n} ${bt[c].toFixed(2)} → ${dt[c].toFixed(2)} ${u}`).join(' | ');};
 $('#plots').append(svg);svgs.push(svg);
 }
 syncTime(Number($('#replay-time').value));
}
fetch('data.json').then(r=>{if(!r.ok)throw Error('Data unavailable');return r.json()}).then(d=>{data=d;for(const el of document.querySelectorAll('select,input'))el.onchange=render;render();document.body.dataset.ready='true';}).catch(()=>{$('#story').textContent='The comparison data could not load. Please open the methods and full results link below.';});
