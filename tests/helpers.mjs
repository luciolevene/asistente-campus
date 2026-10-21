import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {read,write,createRuntime} from '../skills/asistente-campus/scripts/runtime.mjs';
export function fixture(t, mode='manual') {
  const dir=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'campus-portable-test-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const cfg=read(new URL('../skills/asistente-campus/assets/academic-agent.example.json',import.meta.url));
  Object.assign(cfg,{institution:{name:'Universidad ficticia',campusUrl:'https://campus.example.invalid/my/'},profile:{timezone:'America/Argentina/Buenos_Aires'},runtime:{host:'codex',operatingSystem:process.platform,mode},courses:[{code:'MAT101',name:'Materia ficticia',components:['Teórica','Tutorial']}],reviewSchedule:{weekdays:['Monday','Wednesday','Friday'],times:['09:00','18:15']}});
  cfg.monitoring.lookFor=['assignments','announcements'];cfg.monitoring.personalizationReviewed=true;
  const configFile=path.join(dir,'local','academic-agent.json');
  const save=()=>write(configFile,cfg);save();
  const opts={testMode:true,runDate:'2026-10-21'};
  const call=(action,payload)=>createRuntime(dir,opts).run(action,payload);
  const check=()=>call('mark-checks-batch',{sources:[{source:'Campus',status:'success'}],courses:[{course:'MAT101',status:'success',components:['Teórica','Tutorial']}]});
  const complete=()=>{check();return call('complete-run');};
  const permit=(kind,scope)=>{cfg.permissions[kind]={allowed:true,grantedAt:'2026-10-21T12:00:00Z',consentText:'Acepto este alcance concreto.',scope};save();};
  return {dir,cfg,save,call,check,complete,permit,opts};
}
