import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {need,read} from '../skills/asistente-campus/scripts/runtime.mjs';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const releaseFiles=[
 '.gitattributes','.gitignore','.github/workflows/test.yml','README.md','IMPLEMENTATION.md','LICENSE','package.json',
 'scripts/install.mjs','scripts/verify-release.mjs',
 'tests/helpers.mjs','tests/runtime.test.mjs','tests/install.test.mjs','tests/lock.test.mjs',
 'skills/asistente-campus/SKILL.md','skills/asistente-campus/agents/openai.yaml',
 'skills/asistente-campus/assets/academic-agent.example.json','skills/asistente-campus/assets/setup-state.example.json',
 ...['comandos','entrevista','herramientas','operacion','persistencia','programacion'].map(x=>`skills/asistente-campus/references/${x}.md`),
 ...['campus','runtime','self-test'].map(x=>`skills/asistente-campus/scripts/${x}.mjs`)
].sort();
function walk(dir,prefix='') {return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.name!=='.git').flatMap(e=>{need(!e.isSymbolicLink(),'Un release no contiene enlaces simbólicos.');return e.isDirectory()?walk(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name];}).sort();}
export function verifyRelease() {
 const actual=walk(root);need(JSON.stringify(actual)===JSON.stringify(releaseFiles),'La distribución contiene archivos imprevistos o faltantes. Revisar la lista de publicación.');
 for(const file of releaseFiles) {
  const text=fs.readFileSync(path.join(root,file),'utf8');
  need(!/(?:[A-Z]:[\\/]Users[\\/]|\/Users\/[^/]+\/|link_[a-f0-9]{20,}|(?:ghp_|github_pat_|sk-proj-)[A-Za-z0-9_]{15,})/i.test(text),`Posible dato privado en ${file}.`);
  for(const email of text.matchAll(/\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi)) need(email[1].endsWith('.invalid'),`Correo no ficticio en ${file}.`);
  if(file.endsWith('.json')) read(path.join(root,file));
  if(file.endsWith('.md')) for(const m of text.matchAll(/\]\(([^)]+)\)/g)) {const target=m[1];if(!/^(https?:|#)/.test(target)) need(fs.existsSync(path.resolve(path.dirname(path.join(root,file)),target.split('#')[0])),`Referencia rota en ${file}: ${target}`);}
 }
 const c=read(path.join(root,'skills/asistente-campus/assets/academic-agent.example.json'));
 need(c.courses.length===0&&c.classSchedule.length===0&&c.monitoring.customAlerts.length===0&&!c.institution.campusUrl,'La plantilla contiene datos de una persona.');
 need(Object.values(c.permissions).every(p=>p.allowed===false&&p.scope===null),'La plantilla contiene permisos habilitados.');
 need(!c.sources.email.enabled&&!c.outputs.email.enabled&&!c.outputs.calendar.enabled&&!c.quickPass.enabled,'La plantilla habilita acciones externas por defecto.');
 return {ok:true,files:releaseFiles.length,userDataIncluded:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {try{console.log(JSON.stringify(verifyRelease()));}catch(e){console.error(e.message);process.exitCode=1;}}
