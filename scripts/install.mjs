import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import crypto from 'node:crypto';
import {need} from '../skills/asistente-campus/scripts/runtime.mjs';

export const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../skills/asistente-campus');
export function files(dir, prefix='') {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{need(!e.isSymbolicLink(),'No se copian enlaces simbólicos.');return e.isDirectory()?files(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name];}).sort();
}
export function install(project, host='codex') {
  need(['codex','claude'].includes(host),'Elegí codex o claude.');
  project=path.resolve(project);fs.mkdirSync(project,{recursive:true});
  project=fs.realpathSync(project);
  const relative=host==='codex'?'.agents/skills':'.claude/skills';
  let current=project;
  for(const part of relative.split('/')) {current=path.join(current,part);if(fs.existsSync(current)) need(!fs.lstatSync(current).isSymbolicLink(),'La carpeta de instalación es un enlace; elegí una carpeta local normal.');else fs.mkdirSync(current);}
  const dest=path.join(current,'asistente-campus');
  need(dest!==source&&!dest.startsWith(source+path.sep),'El destino no puede ser el paquete fuente.');
  if(fs.existsSync(dest)) {need(fs.lstatSync(dest).isDirectory()&&!fs.lstatSync(dest).isSymbolicLink(),'El destino no es una carpeta normal.');need(fs.existsSync(path.join(dest,'SKILL.md'))&&/^name:\s*asistente-campus\s*$/m.test(fs.readFileSync(path.join(dest,'SKILL.md'),'utf8')),'La carpeta existente no corresponde a esta skill.');files(dest);}
  const stage=path.join(current,`.asistente-campus-${crypto.randomUUID()}`);fs.mkdirSync(stage);
  let backup=null;
  try {
    for(const file of files(source)) {const target=path.join(stage,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(source,file),target);need(fs.readFileSync(target).equals(fs.readFileSync(path.join(source,file))),`Copia incompleta: ${file}`);}
    // Backups contain only skill instructions/code; personal local/ is never touched.
    if(fs.existsSync(dest)) {const backupRoot=path.join(project,'local','skill-backups');fs.mkdirSync(backupRoot,{recursive:true});backup=path.join(backupRoot,`asistente-campus-${crypto.randomUUID()}`);fs.renameSync(dest,backup);}
    try {fs.renameSync(stage,dest);}catch(e){if(backup&&!fs.existsSync(dest)) fs.renameSync(backup,dest);throw e;}
    const ignore=path.join(project,'.gitignore');if(!fs.existsSync(ignore)||!fs.readFileSync(ignore,'utf8').split(/\r?\n/).includes('local/')) fs.appendFileSync(ignore,'\nlocal/\n');
    return {ok:true,host,path:dest,files:files(dest).length,backup,preserved:'local/academic-agent.json y el estado existente',next:'Abrí este proyecto en tu agente. Elegí Asistente Campus o pedí que lo configure.'};
  } finally {if(fs.existsSync(stage)) fs.rmSync(stage,{recursive:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const {values:v}=parseArgs({options:{project:{type:'string'},host:{type:'string',default:'codex'}}});need(v.project,'Falta --project con la carpeta de destino.');console.log(JSON.stringify(install(v.project,v.host),null,2));}
  catch(e){console.error(JSON.stringify({ok:false,error:e.message}));process.exitCode=1;}
}
