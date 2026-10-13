const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const source=fs.readFileSync('assets/design-explorer.js','utf8');
 const {geometry,dimensions}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const data=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const d=Object.fromEntries(data.fields.filter(f=>f.kind==='design').map(f=>[f.name,f.value]));
 const p=Object.fromEntries(data.fields.filter(f=>f.kind==='parameters').map(f=>[f.name,f.value]));
 assert.equal(data.fields.length,80);assert.equal(Object.keys(d).length,29);
 for(const factor of [.85,1,1.15]){
  const design={...d,length_m:d.length_m*factor,sail_m2:d.sail_m2*factor};
  const q=dimensions(design,p),faces=geometry(design,p,data.wingSection);
  assert.ok(faces.every(f=>f.points.every(v=>v.length===3&&v.every(Number.isFinite))));
  assert.ok(Math.abs(q.wingSpan*q.wingChord-design.sail_m2)<1e-12);
  assert.ok(Math.abs(q.wingSpan/q.wingChord-design.sail_AR)<1e-12);
  assert.ok(Math.abs(q.batteryMass*p.batteryWhKg-design.battery_Wh)<1e-12);
  for(const [part,axis,expected] of [['hull',0,design.length_m],['hull',1,design.beam_m],['wing',2,q.wingSpan],['keel',2,design.keel_span_m],['rudder',2,design.rudder_span_m]]){
   const values=faces.filter(f=>f.part===part).flatMap(f=>f.points.map(p=>p[axis]));
   assert.ok(Math.abs(Math.max(...values)-Math.min(...values)-expected)<1e-10,part+' dimensions');
  }
 }
 console.log('80-field contract; geometry finite; hull, wing and appendage dimensions; battery allocation: passed');
})().catch(e=>{console.error(e);process.exit(1)});
