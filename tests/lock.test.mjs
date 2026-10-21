import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fork,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {withProjectLock} from '../skills/asistente-campus/scripts/runtime.mjs';
import {fixture} from './helpers.mjs';
test('live process blocks a second writer; crash leaves a recoverable lock',async t=>{
 const f=fixture(t),childFile=path.join(f.dir,'hold.mjs'),module=fileURLToPath(new URL('../skills/asistente-campus/scripts/runtime.mjs',import.meta.url));
 fs.writeFileSync(childFile,`import {withProjectLock} from ${JSON.stringify(new URL('../skills/asistente-campus/scripts/runtime.mjs',import.meta.url).href)};withProjectLock(process.argv[2],()=>{process.send('locked');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,30000);});`);
 const child=fork(childFile,[f.dir],{stdio:['ignore','ignore','ignore','ipc']});t.after(()=>child.kill());
 await once(child,'message');assert.throws(()=>withProjectLock(f.dir,()=>{}),/Otra revisión/);child.kill();await once(child,'exit');assert.equal(withProjectLock(f.dir,()=>42),42);
});
test('CLI saves parseable state and releases its process lock',t=>{
 const f=fixture(t);const cli=fileURLToPath(new URL('../skills/asistente-campus/scripts/campus.mjs',import.meta.url));
 const result=spawnSync(process.execPath,[cli,'--project',f.dir,'--action','prepare'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.doesNotThrow(()=>JSON.parse(fs.readFileSync(path.join(f.dir,'local/academic-agent-state.json'))));assert.equal(fs.readdirSync(path.join(f.dir,'local')).some(x=>x.startsWith('.runtime-lock-')),false);
});
