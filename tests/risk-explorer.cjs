const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const source=fs.readFileSync('assets/risk-explorer.js','utf8');
 const {filterRisks,groupRisks,statusName,validateData}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const data=validateData(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
 assert.equal(data.risks.length,6);
 assert.ok(data.risks.every(r=>r.kind==='technical' && statusName(r)==='open'));
 assert.equal(filterRisks(data.risks,{query:'R-005'})[0].area,'energy');
 assert.equal(filterRisks(data.risks,{status:'closed'}).length,0);
 const future={...data.risks[0],identifier:'S-001',kind:'schedule',status:'closed'};
 const rows=[...data.risks,future];
 assert.equal(groupRisks(rows).length,2);
 assert.equal(filterRisks(rows,{kind:'schedule',status:'closed'}).length,1);
 assert.equal(filterRisks(rows,{kind:'technical',status:'closed'}).length,0);
 assert.throws(()=>validateData({...data,risks:[data.risks[0],data.risks[0]]}));
 console.log('Risk model contract, search, status/type filtering and separate groups passed');
})().catch(e=>{console.error(e);process.exit(1)});
