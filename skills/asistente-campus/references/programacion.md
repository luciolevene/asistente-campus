# Activar las revisiones automáticas

Después de la primera revisión real aceptada, y solo para funciones/horarios elegidos y autorizados. Explicar, según el anfitrión, cuándo deben estar disponibles la computadora, aplicación y proyecto. No prometer ejecución con la app cerrada si no está soportada.

1. Identificar el programador nativo y su documentación vigente. En Codex usar las herramientas de automatizaciones disponibles (por ejemplo `automation_update`). No sustituirlas por cron del sistema ni editar archivos internos o el inicio de Windows.
2. Completar `permissions.scheduling.scope` con autorización real: `host`, `targetRef`, `timezone`, `weekdays`, `times`, `functions` (`review` y/o `quick-notes`). Para pasada rápida, agregar `quickPass` con la misma selección que la configuración. Identificar el destino con herramientas del anfitrión, sin pedir IDs al usuario ni copiar el chat del autor.
3. Ejecutar `automation-plan`. Conserva horas exactas, con grupos separados si tienen minutos diferentes. Crear tareas solo si `readyToActivate` es verdadero; de lo contrario completar primero la revisión indicada. No mostrar reglas RRULE al usuario.
4. Leer `local/automations.json` y consultar sus tareas. Buscar también equivalentes por proyecto, destino, clase y horario antes de crear. Ante resultado incierto, buscar antes de reintentar. No duplicar ni tocar tareas ajenas.
5. Crear cada solicitud mediante el programador con destino y zona confirmados, usando el prompt del plan. En Codex preferir heartbeat del chat local cuando esté disponible y sea compatible. Usar el esquema expuesto, sin inventar campos. Una sugerencia pendiente no equivale a tarea activa.
6. Releer y comprobar estado activo, horario, zona, destino y prompt. Guardar `{key, id, targetRef, rrule, timezone, status: "ACTIVE"}` y llamar `record-automation` por tarea. El sistema pasa a `ready-scheduled` cuando todas están registradas. Si una falta, explicar cuál y continuar solo esa.

Una tarea activa todavía no prueba su primera ejecución automática. Informar esa distinción y comprobar luego el resultado real. Si cambian horarios o destino, obtener permiso que cubra el alcance nuevo y actualizar/pausar solo tareas propias mediante sus IDs; no dejar activos horarios ya no autorizados.

Si falta programador, mantener modo manual listo, conservar la preferencia y guiar la habilitación concreta. No declarar desarrollo pendiente ni crear una tarea falsa. Un fallo de programación no invalida la revisión manual ya comprobada.

Fuentes Codex: [tareas programadas](https://learn.chatgpt.com/docs/automations?surface=app), [skills](https://learn.chatgpt.com/docs/build-skills). Otros agentes requieren verificar su propio mecanismo antes de activarlo.
