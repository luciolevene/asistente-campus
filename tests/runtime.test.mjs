import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntime, hash, localClock} from '../skills/asistente-campus/scripts/runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixture} from './helpers.mjs';
test('IANA timezone determines date independently of host OS', () => {
  assert.equal(localClock('America/Argentina/Buenos_Aires', new Date('2026-10-21T01:00:00Z')).date, '2026-10-20');
  assert.equal(localClock('Asia/Tokyo', new Date('2026-10-21T01:00:00Z')).date, '2026-10-21');
});
test('canonical hashes ignore object property order', () => assert.equal(hash({a:1,b:2}),hash({b:2,a:1})));
test('manual operation starts only with an explicit request; off-days stay closed',t=>{
 const f=fixture(t);assert.equal(f.call('needs-run').needsRun,false);assert.throws(()=>f.call('begin-run'));
 f.opts.manualReview=true;assert.throws(()=>f.call('needs-run'));f.opts.message='Revisá ahora';
 assert.equal(f.call('needs-run').needsRun,true);assert.equal(f.call('begin-run').attempts,1);f.complete();assert.equal(f.call('needs-run').needsRun,false);
});
test('a complete review requires live Campus and every component; later failure revokes it',t=>{
 const f=fixture(t);assert.throws(()=>f.call('complete-run'));
 f.call('mark-checks-batch',{sources:[{source:'Campus',status:'success'}],courses:[{course:'MAT101',status:'success',components:['Tutorial']}]});assert.throws(()=>f.call('complete-run'));
 f.complete();assert.equal(f.call('report').courseResults[0].status,'success');
 f.call('mark-source',{source:'Campus',status:'failed',message:'Sesión vencida'});assert.throws(()=>f.call('report'));
});
test('changed configuration invalidates evidence; verification timestamps do not',t=>{
 const f=fixture(t);f.complete();f.cfg.sources.campusVerifiedAt='later';f.save();assert.doesNotThrow(()=>f.call('report'));
 f.cfg.courses[0].components.push('Problemas');f.save();assert.throws(()=>f.call('report'));assert.throws(()=>f.call('complete-run'));
});
test('completed activities keep only minimal data, skip unchanged details and reopen on change',t=>{
 const f=fixture(t),raw={id:'MAT101-123',course:'MAT101',title:'Trabajo secreto ficticio',completionIndicator:'Done',observedStatus:'completed',explicitStatusEvidence:true};
 const a=f.call('prepare-listing',{activities:[raw]}).activities[0];assert.match(a.fingerprint,/^[a-f0-9]{64}$/);
 assert.equal(f.call('plan-activities',{activities:[a]}).activities[0].decision,'record-from-listing');
 f.call('record-activities-batch',{activities:[{...a,status:'completed'}]});assert.equal(f.call('plan-activities',{activities:[a]}).activities[0].decision,'skip-detail');
 const s=JSON.parse(fs.readFileSync(path.join(f.dir,'local/academic-agent-state.json')));assert.deepEqual(Object.keys(s.completedActivities[a.id]).sort(),['completedAt','course','fingerprint']);assert.equal(s.activities[a.id],undefined);
 const b={...a,fingerprint:'changed',status:'pending',observedStatus:'pending',explicitStatusEvidence:false};assert.equal(f.call('plan-activities',{activities:[b]}).activities[0].decision,'check-detail');
 f.call('record-activities-batch',{activities:[b]});f.complete();assert.equal(f.call('report').tasks.length,1);
 assert.throws(()=>f.call('record-activities-batch',{activities:[{...b,status:'completed'}]}));
});
test('manual notes anchor relative dates once, expire, link completions and persist completion',t=>{
 const f=fixture(t);const n={id:'note1',course:'MAT101',fingerprint:'one',text:'Preparar próxima clase',targetDate:'2026-10-20'};
 assert.equal(f.call('track-manual-note',n).status,'expired');assert.equal(f.call('track-manual-note',{...n,targetDate:'2026-10-28'}).targetDate,'2026-10-20');
 const active={...n,id:'note2',targetDate:'2026-10-22',relatedActivityIds:['MAT101-1']};f.call('track-manual-note',active);
 f.call('record-activities-batch',{activities:[{id:'MAT101-1',course:'MAT101',fingerprint:'done',status:'completed',explicitStatusEvidence:true}]});assert.equal(f.call('track-manual-note',active).status,'completed');
 f.opts.runDate='2027-05-01';f.call('init');assert.equal(f.call('track-manual-note',active).status,'completed');
});
test('findings and notifications deduplicate by stable fingerprint',t=>{
 const f=fixture(t),a={id:'ann1',course:'MAT101',fingerprint:'v1',message:'Nuevo aviso',url:'https://campus.example.invalid/notice/1'};
 f.cfg.monitoring.customAlerts=[{request:'Cambios de aula',courseCodes:['MAT101']}];f.save();f.complete();f.call('record-findings',{announcements:[a],customMatches:[]});assert.equal(f.call('report').announcements.length,1);
 assert.equal(f.call('should-notify',a).shouldNotify,true);f.call('record-notification',a);assert.equal(f.call('should-notify',a).shouldNotify,false);assert.equal(f.call('report').announcements.length,0);
 assert.equal(f.call('should-notify',{...a,fingerprint:'v2'}).shouldNotify,true);
});
test('email reading checks identity and legacy unstructured consent cannot expand access',t=>{
 const f=fixture(t);f.cfg.sources.email={enabled:true,expectedAccount:'student@example.invalid',connectionRef:'test-only'};f.save();
 assert.throws(()=>f.call('authorize-source',{account:'student@example.invalid'}));f.permit('emailRead','Solo la materia elegida');assert.throws(()=>f.call('authorize-source',{account:'student@example.invalid'}));
 f.permit('emailRead',{expectedAccount:'student@example.invalid'});assert.throws(()=>f.call('authorize-source',{account:'other@example.invalid'}));assert.equal(f.call('authorize-source',{account:'student@example.invalid'}).allowed,true);
 assert.throws(()=>f.call('prepare-email',{account:'student@example.invalid'}));
});
test('email requires scope, current coverage, correct identity and receipt; dedup survives config changes',t=>{
 const f=fixture(t);const scope={expectedAccount:'student@example.invalid',recipient:'student@example.invalid',weekdays:['Wednesday']};f.cfg.outputs.email={enabled:true,...scope};f.save();
 f.permit('email',scope);assert.throws(()=>f.call('prepare-email',{account:scope.expectedAccount}));f.complete();assert.throws(()=>f.call('prepare-email',{account:'other@example.invalid'}));
 assert.equal(f.call('prepare-email',{account:scope.expectedAccount}).recipient,scope.recipient);
 assert.throws(()=>f.call('record-email',{account:scope.expectedAccount,recipient:scope.recipient,cc:[],bcc:[]}));
 f.call('record-email',{account:scope.expectedAccount,recipient:scope.recipient,messageId:'fake-only',cc:[],bcc:[]});assert.throws(()=>f.call('prepare-email',{account:scope.expectedAccount}));
 f.cfg.monitoring.notes='changed';f.save();f.complete();assert.throws(()=>f.call('prepare-email',{account:scope.expectedAccount}));
 f.opts.runDate='2026-10-22';f.complete();assert.throws(()=>f.call('prepare-email',{account:scope.expectedAccount}));
});
test('calendar validates dates, scope, duplicate check and receipts; changed events are not recreated',t=>{
 const f=fixture(t),scope={expectedAccount:'student@example.invalid',calendarId:'primary',eventTypes:['assignment']};f.cfg.outputs.calendar={enabled:true,...scope};f.save();f.permit('calendar',scope);
 const a={id:'MAT101-1',fingerprint:'v1',account:scope.expectedAccount,calendarId:'primary',course:'MAT101',title:'Entrega',eventType:'assignment',evidenceDate:'2026-10-21',sourceUrl:'https://campus.example.invalid/mod/assign/1',start:{date:'2026-10-22'},end:{date:'2026-10-23'},duplicateSearchCompleted:true};
 assert.throws(()=>f.call('prepare-calendar',a));f.check();assert.throws(()=>f.call('prepare-calendar',{...a,end:{date:'2026-10-20'}}));assert.throws(()=>f.call('prepare-calendar',{...a,start:{date:'2026-02-30'}}));
 assert.equal(f.call('prepare-calendar',a).create,true);assert.throws(()=>f.call('record-calendar',{...a,id:'different',eventId:'fake'}));f.call('record-calendar',{...a,eventId:'fake'});
 assert.equal(f.call('prepare-calendar',a).create,false);assert.equal(f.call('prepare-calendar',{...a,fingerprint:'changed'}).reason,'existing-event-changed');
});
test('personal note events require an active note of the same course and date',t=>{
 const f=fixture(t),scope={expectedAccount:'student@example.invalid',calendarId:'primary',eventTypes:['personal-note']};f.cfg.outputs.calendar={enabled:true,...scope};f.cfg.quickPass={enabled:true,documentNames:['Notas'],weekdays:['Wednesday'],times:['12:15']};f.save();f.permit('calendar',scope);
 f.call('track-manual-note',{id:'n',course:'MAT101',fingerprint:'v1',text:'Preparación',targetDate:'2026-10-20'});
 const a={id:'n',noteId:'n',fingerprint:'v1',account:scope.expectedAccount,calendarId:'primary',course:'MAT101',title:'Preparación',eventType:'personal-note',context:'quick-notes',evidenceDate:'2026-10-21',sourceUrl:'https://docs.example.invalid/n',start:{date:'2026-10-22'},end:{date:'2026-10-23'},duplicateSearchCompleted:true};assert.throws(()=>f.call('prepare-calendar',a));
});
test('automation groups exact times and cannot be registered before first real review',t=>{
 const f=fixture(t,'scheduled-requested');f.cfg.quickPass={enabled:true,documentNames:['Notas'],weekdays:['Monday','Wednesday','Friday'],times:['12:15','18:15']};f.cfg.sources.documents=[{name:'Notas',enabled:true,url:'https://docs.example.invalid/notes'}];f.save();
 f.permit('scheduling',{host:'codex',targetRef:'test-only-thread',timezone:f.cfg.profile.timezone,weekdays:f.cfg.reviewSchedule.weekdays,times:f.cfg.reviewSchedule.times,functions:['review','quick-notes'],quickPass:f.cfg.quickPass});
 const plan=f.call('automation-plan');assert.equal(plan.requests.length,3);assert.equal(plan.readyToActivate,false);assert.match(plan.requests[0].rrule,/BYHOUR=9;BYMINUTE=0;/);assert.match(plan.requests[1].rrule,/BYHOUR=18;BYMINUTE=15;/);assert.match(plan.requests[2].rrule,/BYHOUR=12,18;BYMINUTE=15;/);
 assert.throws(()=>f.call('record-automation',{...plan.requests[0],id:'fake',status:'ACTIVE'}));f.complete();for(const request of plan.requests)f.call('record-automation',{...request,id:'fake-'+request.key,status:'ACTIVE'});
 const setup=JSON.parse(fs.readFileSync(path.join(f.dir,'local/setup-state.json')));assert.equal(setup.status,'ready-scheduled');f.call('complete-run');assert.equal(JSON.parse(fs.readFileSync(path.join(f.dir,'local/setup-state.json'))).status,'ready-scheduled');
 f.opts.runDate='2026-10-22';assert.equal(f.call('needs-run').needsRun,false);assert.equal(f.call('needs-quick-pass').needsRun,false);
});
test('CLI works with Unicode/spaces, relative input and structured errors',t=>{
 const f=fixture(t),cli=new URL('../skills/asistente-campus/scripts/campus.mjs',import.meta.url);const p=path.join(f.dir,'local','datos con ñ.json');fs.writeFileSync(p,JSON.stringify({activities:[]}));
 const result=spawnSync(process.execPath,[fileURLToPath(cli), '--project', f.dir, '--action','prepare-listing','--input','local/datos con ñ.json'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout).activities,[]);
 const bad=spawnSync(process.execPath,[fileURLToPath(cli),'--project',f.dir,'--action','prepare','--run-date','2026-10-21'],{encoding:'utf8'});assert.equal(bad.status,1);assert.match(JSON.parse(bad.stderr).error,/prueba/);
});
