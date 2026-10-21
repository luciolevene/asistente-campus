# Diseño y verificación

La skill es autónoma como paquete de instrucciones y lógica local. El agente anfitrión realiza la entrevista, observa el navegador y utiliza las conexiones elegidas. Los scripts no simulan esos accesos ni incorporan permisos del autor.

## Componentes

- `skills/asistente-campus/SKILL.md`: instalación, entrevista, reanudación, revisión y personalización.
- `references/`: entrevista, ayuda para conexiones y espera, revisión en vivo, persistencia y programación.
- `assets/`: plantillas vacías, sin materias, destinatarios, conexiones ni autorizaciones predeterminadas.
- `scripts/runtime.mjs`: validación, fecha local IANA, estado, cobertura de componentes, deduplicación e informe. Valida candidatos de correo, calendario y programación antes de usar herramientas externas.
- `scripts/campus.mjs`: interfaz JSON para el agente. Bibliotecas incluidas en Node.js; mismo código en Windows y macOS.
- `scripts/self-test.mjs`: prueba aislada incluida en cada instalación.
- `scripts/install.mjs` del repositorio: copia verificada para Codex y Claude Code, respaldo de versiones anteriores y preservación de `local/`.

## Contrato funcional

Campus es obligatorio y actual. La cobertura incompleta impide finalizar; una falla posterior invalida el resultado. Horarios, materias y permisos son variables. Fechas relativas se anclan una sola vez. Las completadas se conservan como índice mínimo y se vuelven a comprobar si cambian.

Lectura y envío de correo se autorizan por separado. Cuenta, destinatario, calendario, tipos de eventos y horarios se comparan con el permiso actual. Solo se registran acciones externas confirmadas. Un recibo incierto obliga a verificar antes de repetir. La programación se activa después de la primera revisión real y conserva sus IDs para evitar duplicados.

El script recibe evidencia estructurada del agente: no puede demostrar por sí solo que una página fue leída. Las pruebas ficticias verifican lógica, aislamiento e instalación; la aceptación real de cuentas y fuentes ocurre durante la primera revisión de cada persona. No garantizan interfaces idénticas entre agentes ni compatibilidad automática con cualquier campus ajeno a Moodle.

## Privacidad y actualización

El repositorio contiene exclusivamente el paquete genérico y pruebas ficticias. No existe un servicio de recepción de datos del proyecto. `local/`, `state/`, archivos de entorno y credenciales están excluidos de Git. No guardar contraseñas, cookies, códigos ni tokens en las respuestas. Cada persona administra sus archivos locales; el instalador no los lee ni reemplaza al actualizar.

Las instalaciones antiguas conservan respuestas conocidas. Campos nuevos pendientes se preguntan una vez, sin reiniciar la entrevista. Un permiso antiguo expresado como texto se conserva y aclara antes de ejecutar una función que requiera un alcance estructurado; no se transforma automáticamente en permiso general. Conexiones y primera revisión se verifican con evidencia actual.

## Verificación

`npm test` cubre inicio manual/programado, zonas horarias, cambios de configuración, cobertura, finalizaciones y reaperturas, notas vencidas/completadas, avisos, permisos, cuentas erróneas, duplicados y horarios exactos. Las pruebas de instalación ejecutan una copia instalada sin depender del repositorio original y verifican actualización sin pérdida de respuestas.

La matriz de GitHub Actions ejecuta Windows, macOS y Linux con Node 22 y 24. El estado de los jobs es evidencia de ejecución en cada sistema; configurar la matriz no equivale a haberla aprobado. Conexiones, controles de preguntas y programadores se diagnostican por anfitrión al instalar.
