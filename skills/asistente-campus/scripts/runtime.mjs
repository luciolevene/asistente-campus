import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export const need = (ok, message) => { if (!ok) throw new Error(message); };
export const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
export function write(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(tmp, JSON.stringify(value,null,2)+'\n', {mode:0o600}); fs.renameSync(tmp,file); }
  finally { if(fs.existsSync(tmp)) fs.unlinkSync(tmp); }
}
const canonical = (x, config=false) => Array.isArray(x) ? x.map(v=>canonical(v,config)) : x && typeof x==='object'
  ? Object.fromEntries(Object.keys(x).sort().filter(k=>!config || !['verifiedAt','campusVerifiedAt','importedAt','grantedAt','consentText','scheduling'].includes(k)).map(k=>[k,canonical(x[k],config)])) : x;
export const hash = (x, config=false) => crypto.createHash('sha256').update(JSON.stringify(canonical(x,config))).digest('hex');
export const same = (a,b) => hash(a??null)===hash(b??null);
export const https = value => {try {const u=new URL(value);return u.protocol==='https:' && !u.username && !u.password;}catch{return false;}};
export const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const dateValid = x => /^\d{4}-\d{2}-\d{2}$/.test(x??'') && !Number.isNaN(Date.parse(x)) && new Date(x).toISOString().slice(0,10)===x;
const timeValid = x => /^([01]\d|2[0-3]):[0-5]\d$/.test(x??'');
const dayDiff = (a,b) => Math.round((Date.parse(a)-Date.parse(b))/86400000);
export function localClock(zone, instant=new Date()) {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZoneName:'longOffset'}).formatToParts(instant).map(x=>[x.type,x.value]));
  const date=`${p.year}-${p.month}-${p.day}`;
  return {date,weekday:days[new Date(date+'T12:00:00Z').getUTCDay()],stamp:`${date}T${p.hour}:${p.minute}:${p.second}${p.timeZoneName==='GMT'?'+00:00':p.timeZoneName.replace('GMT','')}`};
}
const dict = () => Object.create(null);
// Reject special object keys before using external identifiers as dictionary keys.
const safeId = x => typeof x==='string' && x.trim() && !['__proto__','constructor','prototype'].includes(x);
export function validate(cfg) {
  need(cfg.schemaVersion===1,'La versión de configuración no es compatible.');
  need(https(cfg.institution?.campusUrl),'Falta una dirección HTTPS válida de Campus.');
  need(cfg.profile?.timezone,'Falta confirmar la zona horaria.'); localClock(cfg.profile.timezone);
  need(Array.isArray(cfg.courses)&&cfg.courses.length,'Falta elegir al menos una materia.');
  const codes=cfg.courses.map(c=>c.code);
  need(new Set(codes).size===codes.length,'Hay códigos de materia duplicados.');
  for(const c of cfg.courses) need(safeId(c.code)&&/^[A-Za-z0-9_-]+$/.test(c.code)&&Array.isArray(c.components)&&c.components.length&&c.components.every(x=>typeof x==='string'&&x.trim())&&new Set(c.components).size===c.components.length,'Cada materia necesita código y componentes únicos.');
  need(['manual','scheduled-requested'].includes(cfg.runtime?.mode),'Elegí revisión manual o automática.');
  cfg.monitoring??={}; cfg.monitoring.customAlerts??=[]; cfg.monitoring.lookaheadDays??=14; cfg.monitoring.urgentDays??=3;
  need(Array.isArray(cfg.monitoring.lookFor)&&cfg.monitoring.lookFor.length&&cfg.monitoring.lookFor.every(x=>['assignments','quizzes','evaluations','announcements','class-preparation'].includes(x)),'Falta elegir qué novedades buscar.');
  need(Number.isInteger(cfg.monitoring.lookaheadDays)&&cfg.monitoring.lookaheadDays>=1&&Number.isInteger(cfg.monitoring.urgentDays)&&cfg.monitoring.urgentDays>=0&&cfg.monitoring.urgentDays<=cfg.monitoring.lookaheadDays,'La anticipación de avisos no es válida.');
  for(const a of cfg.monitoring.customAlerts) need(a.request?.trim()&&Array.isArray(a.courseCodes)&&a.courseCodes.every(c=>codes.includes(c)),'Una alerta específica necesita texto y materias configuradas.');
  cfg.classSchedule??=[]; cfg.classScheduleSources??=[];
  for(const row of cfg.classSchedule) need(codes.includes(row.course)&&days.includes(row.weekday)&&timeValid(row.start)&&timeValid(row.end)&&row.start<row.end,'Hay un horario de cursada incompleto o ambiguo.');
  cfg.quickPass??={enabled:false,documentNames:[],weekdays:[],times:[]};
  cfg.reviewSchedule??={weekdays:[],times:[]};
  const schedule=s=>Array.isArray(s.weekdays)&&Array.isArray(s.times)&&s.weekdays.every(x=>days.includes(x))&&s.times.every(timeValid);
  need(schedule(cfg.reviewSchedule),'Día u hora de revisión inválidos.');
  if(cfg.runtime.mode==='scheduled-requested') need(cfg.reviewSchedule.weekdays.length&&cfg.reviewSchedule.times.length,'Faltan días u horas de revisión.');
  if(cfg.quickPass.enabled) need(schedule(cfg.quickPass)&&cfg.quickPass.weekdays.length&&cfg.quickPass.times.length,'Falta el horario de la pasada de documentos.');
  need(cfg.sources&&cfg.outputs&&cfg.permissions,'Faltan fuentes, salidas o permisos de la entrevista.');
  cfg.sources.documents??=[];
  for(const d of cfg.sources.documents) if(d.enabled) need(https(d.url),'Un documento habilitado necesita un enlace HTTPS válido.');
  if(cfg.sources.email?.enabled) need(cfg.sources.email.expectedAccount,'Falta la cuenta del correo fuente.');
  return cfg;
}

export function createRuntime(project, options={}) {
  project=path.resolve(project); const local=path.join(project,'local');
  if(options.runDate) need(options.testMode,'La fecha real no puede reemplazarse fuera de una prueba.');
  if(options.testMode) need(path.dirname(project)===fs.realpathSync(os.tmpdir())&&path.basename(project).startsWith('campus-portable-test-'),'Las pruebas requieren un proyecto temporal aislado.');
  const cfg=validate(read(path.join(local,'academic-agent.json')));
  const clock=localClock(cfg.profile.timezone,options.now??new Date());
  if(options.runDate) {need(dateValid(options.runDate),'Fecha de prueba inválida.');clock.date=options.runDate;clock.weekday=days[new Date(options.runDate+'T12:00:00Z').getUTCDay()];clock.stamp=options.runDate+'T12:00:00+00:00';}
  const {date,weekday,stamp}=clock, configHash=hash(cfg,true), codes=cfg.courses.map(c=>c.code);
  const sources=['Campus',...(cfg.sources.email?.enabled?['Gmail']:[]),...(cfg.outputs.email?.enabled?['GmailOutput']:[]),...cfg.sources.documents.flatMap((d,i)=>d.enabled?[`Document:${i}`]:[])];
  const statePath=path.join(local,'academic-agent-state.json');
  const state=fs.existsSync(statePath)?read(statePath):{schemaVersion:4};
  for(const k of ['daily','sources','courses','activities','completedActivities','manualNotes','notifications','calendarEvents','email']) state[k]??=dict();
  if(state.daily[date]?.configurationFingerprint!==configHash) {delete state.daily[date];state.sources=dict();state.courses=dict();}
  const daily=state.daily[date]??={date,startedAt:stamp,attempts:0,campusAccessOk:false,campusComplete:false,reviewComplete:false,emailSent:false,nextRetryAt:null,incompleteReasons:[],configurationFingerprint:configHash};
  const onDay=x=>String(x??'').slice(0,10)===date;
  const save=()=>{daily.updatedAt=stamp;state.updatedAt=stamp;write(statePath,state);};
  const invalidate=reason=>{daily.reviewComplete=false;daily.campusComplete=false;daily.incompleteReasons=[...new Set([...daily.incompleteReasons,reason])];daily.nextRetryAt=new Date(Date.parse(stamp)+3600000).toISOString();};
  const reviewDue=()=>cfg.runtime.mode==='scheduled-requested'&&cfg.reviewSchedule.weekdays.includes(weekday);
  const manual=()=>{if(options.manualReview) need(options.message?.trim(),'La revisión manual requiere el pedido del usuario.');return options.manualReview===true;};
  const allowedDay=()=>reviewDue()||manual();
  const emailDue=()=>cfg.outputs.email?.enabled===true&&cfg.outputs.email.weekdays?.includes(weekday);
  const gate=()=>({date,needsRun:allowedDay()&&(!daily.reviewComplete||(emailDue()&&!daily.emailSent&&state.email.lastSentDate!==date)),reviewDue:allowedDay(),manualReviewRequested:!!options.manualReview,reviewComplete:daily.reviewComplete,campusComplete:daily.campusComplete,emailDue:!!emailDue(),emailSent:daily.emailSent||state.email.lastSentDate===date,nextRetryAt:daily.nextRetryAt,incompleteReasons:daily.incompleteReasons});
  function coverage() {
    const failures=[];
    if(!daily.campusAccessOk||state.sources.Campus?.status!=='success'||!onDay(state.sources.Campus?.lastSuccessAt)) failures.push('Campus no fue comprobado hoy.');
    for(const c of cfg.courses) {const s=state.courses[c.code];if(s?.status!=='success'||!onDay(s.lastCheckedAt)) failures.push(`${c.code} no fue revisada correctamente hoy.`);for(const part of c.components) if(!s?.components?.includes(part)) failures.push(`${c.code}: falta ${part}.`);}
    return failures;
  }
  const completeToday=()=>{need(daily.reviewComplete&&daily.configurationFingerprint===configHash&&!coverage().length,'Primero debe completarse la revisión de hoy con todos los componentes de esta configuración.');return state;};
  const scope=kind=>{const p=cfg.permissions[kind];need(p?.allowed===true&&p.grantedAt&&p.consentText&&p.scope&&typeof p.scope==='object'&&!Array.isArray(p.scope),`Falta autorización concreta para ${kind}; conservar el permiso anterior y aclarar su alcance.`);return p.scope;};
  const input=(v)=>{need(v&&typeof v==='object','Falta la evidencia compacta de entrada.');return v;};
  function markSource(v) {
    need(sources.includes(v.source)&&['success','failed','partial'].includes(v.status),'Fuente o estado desconocidos.');
    const old=state.sources[v.source]??{};
    state.sources[v.source]={...old,lastAttemptAt:stamp,status:v.status,message:v.message??null,...(v.status==='success'?{lastSuccessAt:stamp}:{})};
    if(v.source==='Campus') {daily.campusAccessOk=v.status==='success';if(!daily.campusAccessOk) invalidate(v.message??'Campus no disponible.');}
  }
  function syncNotes(changed) {
    for(const n of Object.values(state.manualNotes)) if(n.relatedActivityIds?.includes(changed)) {
      if(n.relatedActivityIds.every(id=>state.completedActivities[id])) {n.status='completed';n.completedAt=stamp;}
      else if(n.status==='completed'&&state.activities[changed]) {n.status='ambiguous';n.completedAt=null;}
    }
  }
  function activity(v) {
    need(safeId(v.id)&&codes.includes(v.course)&&v.fingerprint&&['pending','unknown','completed','expired','cancelled'].includes(v.status),'Actividad incompleta o materia desconocida.');
    if(v.status==='completed') need(v.explicitStatusEvidence===true,'Una actividad completada requiere evidencia explícita de Campus.');
    const old=state.activities[v.id],done=state.completedActivities[v.id],previousStatus=done?'completed':old?.status??null;
    if(v.status==='completed') {state.completedActivities[v.id]={course:v.course,fingerprint:v.fingerprint,completedAt:done?.completedAt??stamp};delete state.activities[v.id];}
    else if(['pending','unknown'].includes(v.status)) {state.activities[v.id]={...old,id:v.id,course:v.course,title:v.title??v.id,activityUrl:v.url??old?.activityUrl??null,status:v.status,fingerprint:v.fingerprint,firstSeenAt:old?.firstSeenAt??stamp,lastObservedAt:stamp,lastDetailCheckedAt:stamp,dueDate:v.dueDate??null,kind:v.kind??null,message:v.message??null,...(done?{reopenedAt:stamp}:{})};delete state.completedActivities[v.id];}
    else {delete state.activities[v.id];delete state.completedActivities[v.id];}
    syncNotes(v.id);return {id:v.id,course:v.course,previousStatus,status:v.status,storedIn:v.status==='completed'?'completedActivities':['pending','unknown'].includes(v.status)?'activities':'none'};
  }
  function report() {
    completeToday();const tasks=[],unconfirmed=[];
    for(const a of Object.values(state.activities)) if(codes.includes(a.course)) {
      if(!onDay(a.lastObservedAt)||a.status==='unknown') {unconfirmed.push(a);continue;}
      const due=a.dueDate?.slice(0,10),remain=due&&dateValid(due)?dayDiff(due,date):null;
      if(remain!==null&&remain>cfg.monitoring.lookaheadDays) continue;
      tasks.push({...a,urgency:remain===null?'date-unknown':remain<0?'overdue':remain<=cfg.monitoring.urgentDays?'urgent':'upcoming'});
    }
    const findingsPath=path.join(local,'findings.json');const f=fs.existsSync(findingsPath)?read(findingsPath):{};
    const current=f.date===date&&f.configurationFingerprint===configHash;
    const fresh=list=>(current?list??[]:[]).filter(x=>state.notifications[x.id]?.fingerprint!==x.fingerprint);
    return {date,tasks,unconfirmed,classPreparation:Object.values(state.manualNotes).filter(n=>codes.includes(n.course)&&n.status==='active'&&n.targetDate>=date),announcements:fresh(f.announcements),customMatches:fresh(f.customMatches),customAlerts:cfg.monitoring.customAlerts,courseResults:cfg.courses.map(c=>({course:c.code,...state.courses[c.code]})),sourceResults:sources.map(source=>({source,...state.sources[source]}))};
  }
  function emailGuard(v) {
    const o=cfg.outputs.email,p=scope('email');need(o?.enabled===true&&same(p,{expectedAccount:o.expectedAccount,recipient:o.recipient,weekdays:o.weekdays}),'El envío no coincide con el permiso de correo.');
    need(emailDue()&&v.account===o.expectedAccount&&/^[^\s@,;]+@[^\s@,;]+$/.test(o.recipient),'Hoy, la cuenta o el destinatario no están autorizados.');
    completeToday();need(!daily.emailSent&&state.email.lastSentDate!==date,'El correo de hoy ya fue enviado.');
  }
  function automationPlan() {
    const p=scope('scheduling');need(p.host===cfg.runtime.host&&p.targetRef&&p.timezone===cfg.profile.timezone,'El destino o zona de la programación no coincide.');
    const plans=[];
    if(cfg.runtime.mode==='scheduled-requested') {need(same(p.weekdays,cfg.reviewSchedule.weekdays)&&same(p.times,cfg.reviewSchedule.times)&&p.functions?.includes('review'),'El horario de revisión no está autorizado.');plans.push({kind:'review',...cfg.reviewSchedule,prompt:'Usá Asistente Campus en este proyecto y references/operacion.md. Primero needs-run. Si corresponde, revisar Campus en vivo y todas las materias y componentes configurados. Completar y generar informe, enviar solo según permisos locales. Reanudar el login con espera guiada. No duplicar completadas, avisos, eventos ni correo. No avisar si no hay cambios accionables ni bloqueo.'});}
    if(cfg.quickPass.enabled) {need(same(p.quickPass,cfg.quickPass)&&p.functions?.includes('quick-notes'),'La pasada de documentos no está autorizada.');for(const name of cfg.quickPass.documentNames) need(cfg.sources.documents.filter(d=>d.enabled&&d.name===name).length===1,'Documento de consignas ambiguo o desactivado.');need(cfg.quickPass.documentNames.length,'Falta elegir el documento de consignas.');plans.push({kind:'quick-notes',...cfg.quickPass,prompt:'Usá Asistente Campus y la pasada rápida en references/operacion.md. Primero needs-quick-pass. Revisá únicamente documentos elegidos en quickPass. Procesá notas nuevas o modificadas con track-manual-note. Campus solo para resolver la duda específica; no revisión completa ni correo. Crear eventos solo autorizados con fecha inequívoca y sin duplicar. No avisar si no hay cambios ni bloqueo.'});}
    const map={Monday:'MO',Tuesday:'TU',Wednesday:'WE',Thursday:'TH',Friday:'FR',Saturday:'SA',Sunday:'SU'},requests=[];
    for(const plan of plans) {const minutes=[...new Set(plan.times.map(t=>t.slice(3)))];for(const minute of minutes) {const hours=[...new Set(plan.times.filter(t=>t.slice(3)===minute).map(t=>Number(t.slice(0,2))))].sort((a,b)=>a-b);const rrule=`FREQ=WEEKLY;BYDAY=${plan.weekdays.map(d=>map[d]).join(',')};BYHOUR=${hours.join(',')};BYMINUTE=${Number(minute)};BYSECOND=0`;requests.push({key:`${plan.kind}-${minute}`,name:plan.kind==='review'?'Revisión Asistente Campus':'Consignas Asistente Campus',kind:plan.kind,targetRef:p.targetRef,rrule,timezone:cfg.profile.timezone,prompt:plan.prompt});}}
    return {configurationFingerprint:configHash,readyToActivate:daily.reviewComplete&&!coverage().length,requests};
  }
  function updateSetup(status) {
    const file=path.join(local,'setup-state.json');const setup=fs.existsSync(file)?read(file):{schemaVersion:1,checks:[]};
    Object.assign(setup,{status,configReady:true,updatedAt:stamp});
    if(status!=='configured') setup.waiting=null;
    setup.nextStep={phase:status==='configured'?'first-review':'scheduling',instruction:status==='configured'?'Continuar con la primera revisión autorizada.':'Comprobar la programación elegida, si corresponde.',officialUrl:null};
    setup.checks=[...(setup.checks??[]).filter(c=>c.capability!=='runtime-check'),{capability:'runtime-check',required:true,status:'verified',checkedAt:stamp,evidence:'Configuración validada y estado propio preparado.'}];
    write(file,setup);
  }
  function run(action, payload) {
    switch(action) {
      case 'needs-run': return gate();
      case 'status': return {date,daily,sources:state.sources,courses:state.courses};
      case 'prepare': case 'init': {
        for(const [id,a] of Object.entries(state.activities)) if(a.status==='completed') {state.completedActivities[id]={course:a.course,fingerprint:a.fingerprint,completedAt:a.completedAt};delete state.activities[id];}
        for(const [id,a] of Object.entries(state.completedActivities)) if(Date.parse(stamp)-Date.parse(a.completedAt)>150*86400000) delete state.completedActivities[id];
        for(const source of sources) state.sources[source]??={status:'never',lastAttemptAt:null,lastSuccessAt:null};
        for(const code of codes) state.courses[code]??={status:'never',lastCheckedAt:null,components:[]};
        state.schemaVersion=4;save();if(action==='prepare') updateSetup('configured');
        return {ok:true,date,nextAction:'first-review',needsRun:gate().needsRun,sources,courses:cfg.courses};
      }
      case 'begin-run': need(allowedDay(),'Hoy no corresponde revisar; hace falta un pedido manual explícito.');need(gate().needsRun,'La revisión y el correo de hoy ya están completos.');daily.attempts++;daily.startedAt??=stamp;save();return {ok:true,date,attempts:daily.attempts};
      case 'mark-source': markSource(input(payload));save();return {ok:true};
      case 'mark-checks-batch': {
        input(payload);for(const s of payload.sources??[]) markSource(s);
        for(const c of payload.courses??[]) {need(codes.includes(c.course)&&['success','failed','partial'].includes(c.status),'Materia o estado desconocidos.');need(Array.isArray(c.components),'Falta la lista de componentes revisados.');state.courses[c.course]={lastCheckedAt:stamp,status:c.status,components:c.components,fingerprint:c.fingerprint??null,message:c.message??null};if(c.status!=='success'||cfg.courses.find(x=>x.code===c.course).components.some(x=>!c.components.includes(x))) invalidate(`Falta completar ${c.course}.`);}
        save();return {ok:true};
      }
      case 'prepare-listing': {const p=input(payload);need(Array.isArray(p.activities),'Falta el listado de actividades.');for(const a of p.activities) {need(safeId(a.id)&&codes.includes(a.course)&&a.title,'Listado sin ID, materia o título.');a.fingerprint=hash({id:a.id,title:a.title,dueDate:a.dueDate??null,completionIndicator:a.completionIndicator??null,observedStatus:a.observedStatus??null});}write(path.join(local,'listing.json'),p);return p;}
      case 'plan-activities': {const p=input(payload);return {activities:(p.activities??[]).map(a=>{need(safeId(a.id)&&codes.includes(a.course)&&a.fingerprint,'Observación incompleta.');const done=state.completedActivities[a.id];return {...a,decision:done?.fingerprint===a.fingerprint?'skip-detail':a.explicitStatusEvidence===true&&['completed','expired','cancelled'].includes(a.observedStatus)?'record-from-listing':'check-detail'};})};}
      case 'record-activities-batch': {const p=input(payload);need(Array.isArray(p.activities),'Falta el lote de actividades.');const result=p.activities.map(activity);save();return {activities:result};}
      case 'track-manual-note': {
        const v=input(payload);need(safeId(v.id)&&codes.includes(v.course)&&v.fingerprint&&v.text,'La nota necesita ID, materia, huella y texto.');if(v.targetDate) need(dateValid(v.targetDate),'Fecha de nota inválida.');
        const old=state.manualNotes[v.id],unchanged=old?.fingerprint===v.fingerprint;
        const n=unchanged?old:{id:v.id,course:v.course,text:v.text,fingerprint:v.fingerprint,firstSeenAt:stamp,firstSeenDate:date,targetDate:v.targetDate??null,status:'ambiguous'};
        if(!n.targetDate&&v.targetDate) n.targetDate=v.targetDate;
        if(v.relatedActivityIds) {need(Array.isArray(v.relatedActivityIds)&&v.relatedActivityIds.every(safeId),'Relaciones inválidas.');n.relatedActivityIds=v.relatedActivityIds;}
        n.lastSeenAt=stamp;
        if(n.status!=='completed') {if(n.relatedActivityIds?.length&&n.relatedActivityIds.every(id=>state.completedActivities[id])) {n.status='completed';n.completedAt=stamp;}else n.status=n.targetDate?(n.targetDate<date?'expired':'active'):dayDiff(date,n.firstSeenDate)>7?'expired':'ambiguous';}
        state.manualNotes[v.id]=n;save();return {...n,skipDetail:unchanged||['completed','expired'].includes(n.status)};
      }
      case 'complete-manual-note': {const v=input(payload),n=state.manualNotes[v.id];need(n&&n.fingerprint===v.fingerprint&&v.message,'La finalización necesita la versión exacta y evidencia.');n.status='completed';n.completedAt=stamp;save();return {ok:true};}
      case 'should-notify': {const v=input(payload);need(safeId(v.id)&&v.fingerprint,'Falta ID y huella del aviso.');return {shouldNotify:state.notifications[v.id]?.fingerprint!==v.fingerprint};}
      case 'record-notification': {const v=input(payload);need(safeId(v.id)&&v.fingerprint,'Falta ID y huella del aviso.');state.notifications[v.id]={fingerprint:v.fingerprint,notifiedAt:stamp};save();return {ok:true};}
      case 'fail-run': need(payload?.message,'Falta explicar el problema.');invalidate(payload.message);save();return {ok:true};
      case 'complete-run': {const failures=coverage();if(failures.length) {invalidate(failures.join(' '));save();throw new Error(failures.join(' '));}daily.reviewComplete=true;daily.campusComplete=true;daily.completedAt=stamp;daily.nextRetryAt=null;daily.incompleteReasons=[];save();let status='ready-manual';try {const plan=automationPlan(),tasks=read(path.join(local,'automations.json'));if(plan.requests.length&&plan.requests.every(p=>tasks[p.key]?.configurationFingerprint===configHash&&tasks[p.key]?.targetRef===p.targetRef)) status='ready-scheduled';}catch{}updateSetup(status);return {ok:true,date};}
      case 'report': return report();
      case 'record-findings': {const p=input(payload);for(const a of [...(p.announcements??[]),...(p.customMatches??[])]) need(safeId(a.id)&&a.fingerprint&&codes.includes(a.course)&&a.message&&https(a.url),'Hallazgo sin evidencia, ID, materia o enlace.');write(path.join(local,'findings.json'),{...p,date,configurationFingerprint:configHash});return {ok:true};}
      case 'authorize-source': {const p=scope('emailRead');need(cfg.sources.email?.enabled===true&&p.expectedAccount===cfg.sources.email.expectedAccount&&payload?.account===p.expectedAccount,'La cuenta verificada no coincide con el permiso de lectura.');return {allowed:true,account:p.expectedAccount,connectionRef:cfg.sources.email.connectionRef};}
      case 'prepare-email': {
        emailGuard(input(payload));markSource({source:'GmailOutput',status:'success',message:'Identidad de envío verificada con el proveedor.'});save();const r=report();
        const body=[`Alertas académicas - ${date}`,'Tareas para entregar:',...r.tasks.map(a=>`[${a.course}] ${a.title} | ${a.dueDate??'Fecha sin confirmar'} | ${a.activityUrl??''}`),...(r.tasks.length?[]:['No se observaron tareas pendientes en la revisión de hoy.']),'Consignas para clase:',...r.classPreparation.map(n=>`[${n.course}] ${n.text} | ${n.targetDate}`),'Avisos y alertas específicas:',...[...r.announcements,...r.customMatches].map(f=>`[${f.course}] ${f.message} | ${f.url}`),'Resultado por materia:',...r.courseResults.map(c=>`[${c.course}] ${c.status} | ${c.components.join(', ')}`),'Fuentes y problemas:',...r.sourceResults.map(s=>`${s.source}: ${s.status??'sin comprobar'} ${s.message??''}`),'Antecedentes sin confirmar:',...r.unconfirmed.map(a=>`[${a.course}] ${a.title}`)].join('\n');
        const draft={account:cfg.outputs.email.expectedAccount,recipient:cfg.outputs.email.recipient,cc:[],bcc:[],subject:`Alertas académicas - ${date}`,body,date};write(path.join(local,'email-draft.json'),draft);return draft;
      }
      case 'record-email': {const p=input(payload);emailGuard(p);need(p.messageId&&p.recipient===cfg.outputs.email.recipient&&Array.isArray(p.cc)&&!p.cc.length&&Array.isArray(p.bcc)&&!p.bcc.length,'Falta confirmación del envío sin copias al destinatario autorizado.');daily.emailSent=true;state.email={lastSentDate:date,lastSentAt:stamp};save();write(path.join(local,'email-receipt.json'),{date,messageId:p.messageId,recipient:p.recipient});return {ok:true};}
      case 'prepare-calendar': {
        const v=input(payload),p=scope('calendar'),o=cfg.outputs.calendar;need(o?.enabled===true&&same(p,{expectedAccount:o.expectedAccount,calendarId:o.calendarId,eventTypes:o.eventTypes}),'El calendario no está habilitado con ese alcance.');
        need(v.account===o.expectedAccount&&v.calendarId===o.calendarId&&o.eventTypes.includes(v.eventType)&&codes.includes(v.course)&&v.evidenceDate===date&&safeId(v.id)&&v.fingerprint&&v.title&&https(v.sourceUrl),'Falta evidencia actual o identidad válida para el evento.');
        const start=v.start?.date??v.start?.dateTime,end=v.end?.date??v.end?.dateTime;
        const validTime=x=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(Z|[+-]\d{2}:\d{2})$/.test(x??'')&&!Number.isNaN(Date.parse(x))&&dateValid(x.slice(0,10));
        need(v.start?.date&&v.end?.date?dateValid(start)&&dateValid(end):validTime(start)&&validTime(end),'El evento necesita fechas completas con zona horaria, o días completos.');
        const eventDay=v.start?.date??localClock(cfg.profile.timezone,new Date(start)).date;
        need(Date.parse(end)>Date.parse(start)&&eventDay>=date&&v.duplicateSearchCompleted===true,'Falta fecha vigente, fin posterior o búsqueda de duplicados.');
        need(!v.attendees?.length&&!v.conferenceData,'No se crean invitados ni reuniones.');
        if(v.eventType==='personal-note') {const n=state.manualNotes[v.noteId];need(cfg.quickPass.enabled&&v.context==='quick-notes'&&n?.status==='active'&&n.targetDate===eventDay&&n.course===v.course,'La consigna necesita registro activo y esa fecha en la pasada configurada.');}
        else need(daily.configurationFingerprint===configHash&&daily.campusAccessOk&&state.sources.Campus?.status==='success'&&onDay(state.sources.Campus.lastSuccessAt),'Campus debe estar verificado hoy antes del evento.');
        if(state.completedActivities[v.id]) return {create:false,reason:'completed-activity'};
        const key='calendar-'+hash({account:o.expectedAccount,calendarId:o.calendarId,activityId:v.id}),old=state.calendarEvents[key];
        if(old) return {create:false,eventId:old.eventId,reason:old.fingerprint===v.fingerprint?'already-recorded':'existing-event-changed'};
        write(path.join(local,'calendar-draft.json'),{...v,configurationFingerprint:configHash});return {create:true,calendarId:o.calendarId,event:v};
      }
      case 'record-calendar': {const v=input(payload),draft=read(path.join(local,'calendar-draft.json')),p=scope('calendar'),o=cfg.outputs.calendar;need(o.enabled===true&&same(p,{expectedAccount:o.expectedAccount,calendarId:o.calendarId,eventTypes:o.eventTypes})&&draft.configurationFingerprint===configHash&&draft.evidenceDate===date&&v.eventId&&v.account===p.expectedAccount&&v.calendarId===p.calendarId&&v.id===draft.id&&v.fingerprint===draft.fingerprint,'La confirmación del calendario no coincide con el evento autorizado.');const key='calendar-'+hash({account:v.account,calendarId:v.calendarId,activityId:v.id});need(!state.calendarEvents[key],'El evento ya fue registrado.');state.calendarEvents[key]={eventId:v.eventId,recordedAt:stamp,date,fingerprint:v.fingerprint};save();return {ok:true};}
      case 'needs-quick-pass': return {date,needsRun:cfg.quickPass.enabled===true&&cfg.quickPass.weekdays.includes(weekday),documents:cfg.quickPass.documentNames};
      case 'automation-plan': return automationPlan();
      case 'record-automation': {completeToday();const v=input(payload),plan=automationPlan(),matches=plan.requests.filter(p=>p.key===v.key&&p.targetRef===v.targetRef&&p.rrule===v.rrule&&p.timezone===v.timezone);need(v.id&&v.status==='ACTIVE'&&matches.length===1,'Falta una tarea activa confirmada que coincida con el plan.');const file=path.join(local,'automations.json'),tasks=fs.existsSync(file)?read(file):{};tasks[v.key]={...v,configurationFingerprint:configHash,recordedAt:stamp};write(file,tasks);if(plan.requests.length&&plan.requests.every(p=>tasks[p.key]?.configurationFingerprint===configHash)) updateSetup('ready-scheduled');return {ok:true,key:v.key};}
      default: throw new Error('Acción desconocida. Consultá references/comandos.md.');
    }
  }
  return {run,cfg,state,clock,configHash,local};
}

// Each process announces itself before scanning: concurrent contenders either
// observe a live owner and stop, or both stop. A crash cannot leave a live owner.
export function withProjectLock(project, fn) {
  const local=path.join(path.resolve(project),'local');fs.mkdirSync(local,{recursive:true});
  const name=`.runtime-lock-${process.pid}`,own=path.join(local,name);
  need(!fs.existsSync(own),'Ya hay una operación en este proceso.');
  const fd=fs.openSync(own,'wx',0o600);fs.closeSync(fd);
  try {for(const entry of fs.readdirSync(local)) if(entry.startsWith('.runtime-lock-')&&entry!==name) {
    const pid=Number(entry.slice('.runtime-lock-'.length));need(Number.isInteger(pid)&&pid>0,'Hay un archivo de bloqueo desconocido.');
    let live=true;try{process.kill(pid,0);}catch(e){if(e.code==='ESRCH') live=false;}
    need(!live,'Otra revisión está utilizando este proyecto. Esperá a que termine.');
    try{fs.unlinkSync(path.join(local,entry));}catch(e){if(e.code!=='ENOENT') throw e;}
  }return fn();}finally{fs.unlinkSync(own);}
}
