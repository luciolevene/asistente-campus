import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fixture} from './helpers.mjs';
import {install,files,source} from '../scripts/install.mjs';
test('fresh installation is self-contained on Codex and Claude Code',t=>{
  const f=fixture(t);
  for(const host of ['codex','claude']) {const result=install(f.dir,host);assert.deepEqual(files(result.path),files(source));const smoke=spawnSync(process.execPath,[path.join(result.path,'scripts/self-test.mjs')],{encoding:'utf8'});assert.equal(smoke.status,0,smoke.stderr);assert.equal(JSON.parse(smoke.stdout).externalActions,0);}
});
test('upgrade preserves every private answer and state, removes obsolete code with recoverable backup',t=>{
 const f=fixture(t);f.call('prepare');const answer=fs.readFileSync(path.join(f.dir,'local/academic-agent.json')),state=fs.readFileSync(path.join(f.dir,'local/academic-agent-state.json'));
 const first=install(f.dir);fs.writeFileSync(path.join(first.path,'obsolete.ps1'),'old');const second=install(f.dir);assert.ok(second.backup);assert.ok(fs.existsSync(path.join(second.backup,'obsolete.ps1')));assert.equal(fs.existsSync(path.join(second.path,'obsolete.ps1')),false);
 assert.ok(answer.equals(fs.readFileSync(path.join(f.dir,'local/academic-agent.json'))));assert.ok(state.equals(fs.readFileSync(path.join(f.dir,'local/academic-agent-state.json'))));
});
test('installer refuses unrelated destination content',t=>{
 const f=fixture(t),dest=path.join(f.dir,'.agents/skills/asistente-campus');fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'personal.txt'),'preserve');assert.throws(()=>install(f.dir));assert.equal(fs.readFileSync(path.join(dest,'personal.txt'),'utf8'),'preserve');
});
