import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRuntime,read,write} from './runtime.mjs';
const project=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'campus-portable-test-'));
try {
  const cfg=read(new URL('../assets/academic-agent.example.json',import.meta.url));
  Object.assign(cfg,{institution:{name:'Prueba ficticia',campusUrl:'https://campus.example.invalid'},profile:{timezone:'America/Argentina/Buenos_Aires'},courses:[{code:'MAT101',components:['Teórica','Tutorial']} ]});
  cfg.monitoring.lookFor=['assignments'];write(path.join(project,'local/academic-agent.json'),cfg);
  const run=(a,p)=>createRuntime(project,{testMode:true,runDate:'2026-10-21',manualReview:true,message:'Prueba ficticia aislada'}).run(a,p);
  run('prepare');assert.equal(run('needs-run').needsRun,true);run('begin-run');assert.throws(()=>run('complete-run'));
  run('mark-checks-batch',{sources:[{source:'Campus',status:'success'}],courses:[{course:'MAT101',status:'success',components:['Teórica','Tutorial']}]});run('complete-run');assert.equal(run('report').tasks.length,0);
  run('mark-source',{source:'Campus',status:'failed'});assert.throws(()=>run('report'));
  console.log(JSON.stringify({ok:true,platform:process.platform,node:process.versions.node,checks:['configuration','manual-gate','coverage','report','failure-invalidates'],externalActions:0}));
} finally {fs.rmSync(project,{recursive:true,force:true});}
