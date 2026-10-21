import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {createRuntime, read, withProjectLock} from './runtime.mjs';

try {
  const {values:v}=parseArgs({options:{project:{type:'string',default:process.cwd()},action:{type:'string'},input:{type:'string'},source:{type:'string'},status:{type:'string'},message:{type:'string'},'manual-review':{type:'boolean',default:false},'test-mode':{type:'boolean',default:false},'run-date':{type:'string'}}});
  if(!v.action) throw new Error('Falta --action. Consultá references/comandos.md.');
  const project=path.resolve(v.project),payload=v.input?read(path.resolve(project,v.input)):{source:v.source,status:v.status,message:v.message};
  const result=withProjectLock(project,()=>{
    const r=createRuntime(project,{manualReview:v['manual-review'],message:v.message,testMode:v['test-mode'],runDate:v['run-date']});
    if(!['needs-run','status','needs-quick-pass'].includes(v.action)) {const ignore=path.join(project,'.gitignore');if(!fs.existsSync(ignore)||!fs.readFileSync(ignore,'utf8').split(/\r?\n/).includes('local/')) fs.appendFileSync(ignore,'\nlocal/\n');}
    return r.run(v.action,payload);
  });
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
} catch(error) {process.stderr.write(JSON.stringify({ok:false,error:error.message})+'\n');process.exitCode=1;}
