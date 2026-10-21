# Archivos locales y criterios de avance

## Ubicación

Los archivos generados pertenecen a `local/` del proyecto de destino, no a la carpeta global de la skill. Verificar que esa ruta está excluida de Git antes de escribir datos personales; agregar `local/` al `.gitignore` del destino si hace falta. Si ya existen datos, leerlos y actualizar únicamente la parte de la configuración autorizada. Un cambio de materias no borra automáticamente el historial ni las marcas de completadas.

- `local/academic-agent.json`: respuestas y configuración, usando `assets/academic-agent.example.json` como forma inicial.
- `local/setup-state.json`: avance de instalación, usando `assets/setup-state.example.json`.

En un proyecto vacío se crean estos archivos de configuración y avance. `prepare`, del script incluido en la skill, valida las respuestas y crea `local/academic-agent-state.json` vacío. No copiar estado de otra persona ni usar los scripts de su instalación personal.

Guardar después de cada bloque resuelto y antes de esperar una intervención humana. Conservar únicamente la información necesaria para reanudar: próxima pregunta, capacidad faltante, instrucción pendiente y prueba realizada. No guardar transcripciones de páginas, correos, capturas, cookies ni credenciales en estos archivos. Las preferencias de cuenta, enlaces y referencias de conexión también son privadas aunque no sean secretos de autenticación.

## Estructura del avance

- `status`: uno de los estados definidos abajo.
- `nextStep`: `phase`, `instruction`, `officialUrl`; solo la acción próxima, con `null` cuando no exista.
- `waiting`: `null` sin intervención en curso; durante la espera, objeto con `capability`, `resourceRef`, `successCondition`, `mode`, `startedAt`, `lastCheckedAt` y `windowEndsAt`. `mode` distingue `native-signal`, `active-checks` y `manual-check`. `resourceRef` identifica la pestaña propia o la conexión, nunca una URL de autenticación con tokens. Este campo es opcional en avances anteriores: su ausencia equivale a `null`.
- `checks`: objetos `capability`, `required`, `status`, `checkedAt`, `evidence`. Estados: `pending`, `verified`, `blocked`, `not-requested`. La evidencia es una frase mínima sobre la prueba, sin contenido académico.
- `pendingQuestions`: decisiones pendientes, sin volver a incluir las contestadas.
- `configReady`: verdadero solo después de validar la configuración y resolver sus decisiones pendientes.
- `automation`: referencia del proveedor y del destino, horario observado y fecha de primera ejecución comprobada. Guardar la referencia inmediatamente después de una creación confirmada; ante una respuesta incierta, buscar por destino y horario antes de reintentar. El ID queda local y nunca se copia del autor.

Usar fechas reales ISO 8601 con zona, sin simular una revisión. El resumen verbal «conectado» sin prueba no produce un check `verified`.

## Estados

| Estado | Evidencia necesaria |
| --- | --- |
| `interview` | Faltan preferencias; entrevista en curso |
| `waiting-user` | Hay una acción humana o respuesta necesaria; se guardó el siguiente paso y, si corresponde, la condición observable para continuar. No implica cerrar el turno ni abandonar el proceso |
| `blocked` | Falta una capacidad obligatoria o el soporte operativo; se explica cuál |
| `configured` | Respuestas validadas, scripts ejecutables y estado propio preparado; falta la primera revisión real |
| `ready-manual` | Motor compatible, requisitos del modo manual verificados y primera revisión real completada correctamente |
| `ready-scheduled` | Lo anterior más autorización, programación guardada y releída correctamente; informar aparte si aún no ocurrió su primera ejecución automática |

El paquete incluye la operación completa. `prepare` registra `runtime-check: verified` tras ejecutarse; `complete-run` habilita `ready-manual` solo con revisión de hoy y todos los componentes. `record-automation` habilita `ready-scheduled` cuando están verificadas todas las tareas del plan. Si falta runtime o conexión, registrar la dependencia real y acompañar su resolución; no presentarla como desarrollo pendiente.

Una dependencia opcional no elegida queda `not-requested`. Una cuenta desconectada vuelve su check a `blocked` sin borrar respuestas previas. Al cambiar de anfitrión, revalidar capacidades y programación; no heredar checks de otro equipo.

Durante un login recuperable, mantener el avance general en `waiting-user`; el check puede seguir pendiente de verificación. Cuando la prueba pase, actualizar el check, limpiar `waiting` y elegir el estado que corresponda a los pasos restantes. Al retomar después de una interrupción, comprobar que la referencia de pestaña o conexión sigue vigente y verificar la condición antes de volver a solicitar una acción humana. Conservar preferencias y permisos ya válidos.

## Configuración

Mantener los campos de la plantilla. Antes de `configReady: true`, validar JSON, tipos, URL HTTPS de Campus, zona IANA reconocida, al menos una materia con código y componentes, `monitoring.lookFor` no vacío y modo conocido. Para funciones desactivadas conservar `enabled: false` y permisos `allowed: false`.

Conservar `monitoring.customAlerts` como lista de objetos `request` y `courseCodes`; verificar que los códigos pertenezcan a las materias configuradas y que cada pedido tenga texto. `monitoring.personalizationReviewed` se vuelve verdadero tras la elección explícita de finalizar o continuar solo con las alertas básicas. En configuraciones anteriores, la ausencia de estos campos equivale a una lista vacía y falso: ofrecer el paso una vez al continuar la configuración, sin borrar preferencias. Si hay un pedido que todavía no puede cumplirse, dejar su dependencia en `checks` y el paso concreto en el avance, y mencionarlo como pendiente en el resumen.

Los horarios extraídos de imágenes, archivos o enlaces quedan en `classSchedule`, con procedencia mínima en `classScheduleSources`, según la entrevista. Validar días y horas legibles, inicio anterior al fin para una clase dentro del mismo día, componentes y materias; aclarar clases que crucen medianoche en lugar de corregirlas por inferencia. La ausencia de `classScheduleSources` en una configuración anterior equivale a una lista vacía: conservar sus horarios y no inventar una fuente. Importar un archivo actualiza solo los datos inequívocos del alcance solicitado; un conflicto queda pendiente sin sobrescribir silenciosamente la fila previa.

Las preferencias de horario no son autorizaciones. En `permissions`, registrar texto, instante y `scope` solo cuando la persona lo haya indicado explícitamente. `emailRead.scope` identifica la cuenta fuente; `email.scope` incluye cuenta emisora, destinatario y días; `calendar.scope`, cuenta, calendario y tipos de eventos; `scheduling.scope`, anfitrión, destino, zona, días, horas y funciones. Estos objetos representan el alcance autorizado, no una copia que deba actualizarse silenciosamente al cambiar preferencias. Antes de actuar, exigir que la configuración esté cubierta por ese alcance; ante cambios fuera de él, dejar el permiso inactivo hasta contar con autorización suficiente.

Aun con permiso, la cuenta debe comprobarse antes de actuar. No crear tareas ni realizar envíos como efecto de guardar la plantilla. Después de `prepare`, la primera revisión se realiza según la elección explícita del usuario en la entrevista y las políticas del destino. Programaciones esperan a esa revisión verificada.

El estado operativo conserva pendientes, índice mínimo de completadas (150 días), notas con fechas ancladas, avisos, IDs de eventos y deduplicación diaria de correo. Actualizar preferencias en `academic-agent.json`; el código deriva la configuración operativa en memoria. Un cambio material invalida la finalización diaria hasta revisarla de nuevo, conservando completadas y correos enviados. Lotes, borradores, confirmaciones y automatizaciones también permanecen en `local/`. No publicar, sincronizar con el repositorio ni enviar estos archivos a un servicio del proyecto.

Si no hay acceso a archivos, conservar el borrador únicamente en la conversación, explicar que no fue guardado y mantener el diagnóstico bloqueado. Nunca afirmar que hay persistencia entre sesiones sin una escritura comprobada.
