# Ejecución y formatos de intercambio

Requiere Node.js 22 o superior en Windows o macOS. Detectar primero el runtime incluido por el anfitrión. Si falta, guiar la [instalación oficial](https://nodejs.org/en/download), un paso humano por vez. El agente ejecuta los comandos. No requiere PowerShell, Python, dependencias npm, claves API propias ni un servidor.

Resolver las rutas reales antes de ejecutar:

```text
node "<skill>/scripts/self-test.mjs"
node "<skill>/scripts/campus.mjs" --project "<proyecto>" --action prepare
```

Todas las acciones reciben `--project`. `--input` acepta archivos absolutos o relativos al proyecto. Guardar textos externos con herramientas de archivos como JSON, sin interpolarlos en órdenes. Escrituras secuenciales; solo las lecturas del navegador pueden paralelizarse. La salida es JSON; errores terminan con código 1 y mensaje JSON.

La configuración vive en `local/academic-agent.json`; el seguimiento, en `local/academic-agent-state.json`. Todo `local/` es privado, excluido de Git, sin credenciales. Los scripts no envían datos a un servidor ni incorporan telemetría. El agente usa las herramientas de los proveedores elegidos para las acciones autorizadas.

| Acción | Entrada adicional | Resultado |
| --- | --- | --- |
| `prepare` | Configuración guardada | Validar y preparar estado propio |
| `needs-run`, `begin-run` | Para pedido manual: `--manual-review --message "pedido real"` | Decidir si corresponde y comenzar/reanudar |
| `init`, `status` | — | Mantenimiento o consulta |
| `prepare-listing` | `--input local/listing-input.json` | Calcular huellas; guardar `local/listing.json` |
| `plan-activities` | `--input local/listing.json` | Decidir detalles a omitir/comprobar |
| `record-activities-batch` | `--input local/results.json` | Registrar actividades verificadas |
| `mark-checks-batch` | `--input local/checks.json` | Registrar fuentes, materias y componentes |
| `mark-source` | `--source Campus --status failed --message "causa"` o `--input` | Conservar fallo e invalidar finalización |
| `track-manual-note`, `complete-manual-note` | `--input` con nota/evidencia | Anclar fecha y recordar finalización |
| `record-findings` | `--input` con anuncios/coincidencias | Guardar evidencia actual |
| `complete-run`, `report` | — | Exigir cobertura actual y generar informe |
| `should-notify`, `record-notification` | `--input` con `{id,fingerprint}` | Deduplicar; registrar después de mostrar |
| `authorize-source` | `--input` con perfil real `{account}` | Validar cuenta y permiso de lectura |
| `prepare-email`, `record-email` | `--input` con perfil/recibo | Preparar informe y registrar envío confirmado |
| `prepare-calendar`, `record-calendar` | `--input` con candidato/recibo | Validar y registrar evento confirmado |
| `automation-plan`, `record-automation` | La segunda usa `--input` con recibo | Planificar y registrar tareas activas |
| `needs-quick-pass` | — | Decidir pasada de documentos |
| `fail-run` | `--input` con `{message}` | Conservar bloqueo y reintento |

`--run-date` solo se admite con `--test-mode` en un proyecto temporal aislado `campus-portable-test-*`. Nunca usarlo en revisiones reales.

## Datos compactos

Ejemplos ficticios: no registrar como evidencia real.

```json
{"activities":[{"id":"MAT101-123","course":"MAT101","title":"Ejercicio","dueDate":"2026-11-03","completionIndicator":"Pendiente","observedStatus":"pending","explicitStatusEvidence":true,"url":"https://campus.example.invalid/mod/assign/view.php?id=123"}]}
```

Pasar el listado a `prepare-listing`. Conservar las huellas calculadas para planificación y resultados. `results.json` usa `activities` con `id`, `course`, `fingerprint`, `title`, `status` (`pending`, `unknown`, `completed`, `expired`, `cancelled`), `url`, `dueDate` y `kind` si se conocen. `completed` exige `explicitStatusEvidence: true`. Un vencimiento no equivale a finalización.

```json
{"sources":[{"source":"Campus","status":"success","message":"Sesión y fuentes comprobadas"}],"courses":[{"course":"MAT101","status":"success","components":["Teórica","Tutorial"],"fingerprint":"huella-del-listado","message":"Portadas, actividades y avisos leídos"}]}
```

Fuentes: `Campus`, `Gmail` si se eligió lectura, `GmailOutput` si se eligió envío y `Document:N` para índice N del documento (base cero, contando desactivados). Estados `success`, `failed`, `partial`. Incluir solo componentes realmente leídos hoy. Fallos complementarios se informan sin sustituir Campus.

- Nota: `{id,course,fingerprint,text,targetDate,relatedActivityIds}`. Fecha opcional `YYYY-MM-DD`, calculada una sola vez. Para completar: `{id,fingerprint,message}` con evidencia inequívoca.
- Hallazgos: `{announcements:[],customMatches:[]}`; cada elemento contiene `{id,fingerprint,course,message,url}` y evidencia actual.
- Perfil: `{account}` desde la herramienta real, sin secretos ni inferencias.
- Envío confirmado: `{account,recipient,messageId,cc:[],bcc:[]}`. Ante incertidumbre buscar el envío antes de repetir.
- Evento candidato: `{id,fingerprint,account,calendarId,course,title,eventType,evidenceDate,sourceUrl,start,end,duplicateSearchCompleted:true}`. Fechas `{date:"YYYY-MM-DD"}` (fin exclusivo), o `{dateTime:"ISO con zona"}`. Sin invitados ni reuniones. Para consignas: `eventType: "personal-note"`, `context: "quick-notes"` y `noteId` de la nota activa de esa fecha.
- Evento confirmado: `{id,fingerprint,account,calendarId,eventId}` del proveedor. No modificar ni borrar otros eventos.
- Programación confirmada: `{key,id,targetRef,rrule,timezone,status:"ACTIVE"}` de la tarea guardada y releída. Pasar reglas al programador sin mostrarlas como instrucciones técnicas al usuario.

Los scripts validan evidencia suministrada por el agente; no sustituyen la observación real en Campus. Las pruebas ficticias validan instalación, no accesos ni una revisión académica.
