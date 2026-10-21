# Herramientas y asistencia guiada

## Diagnóstico por función

Usá las herramientas que el anfitrión expone en la sesión. Seleccioná por capacidad y cuenta, no por nombres ni identificadores copiados del autor.

| Capacidad | Cuándo hace falta | Prueba suficiente para esa capacidad |
| --- | --- | --- |
| Leer y guardar archivos del proyecto | Siempre para conservar la instalación | Leer el paquete y escribir/releer un archivo de prueba propio en `local/` |
| Controlar un navegador autenticado | Para revisar Campus | Abrir una pestaña propia, leer la URL y distinguir sesión iniciada del formulario de login |
| Ejecutar los scripts incluidos | Antes de operar | Detectar Node.js 22 o superior y ejecutar `prepare` con configuración propia; no hay otro motor que descargar |
| Leer correo | Si se eligió como fuente | Comprobar perfil y acceso de lectura de la cuenta elegida |
| Enviar correo | Si se eligió ese canal | Comprobar identidad, capacidad de envío y autorización concreta; no enviar una prueba sin autorización |
| Buscar y crear eventos | Si se eligió calendario | Comprobar identidad, calendario destino, búsqueda y permiso de creación; crear una prueba solo si fue autorizada |
| Leer documentos | Si se eligieron | Leer los documentos indicados con la cuenta autorizada |
| Programar ejecuciones | Si se pidió modo automático | Primero verificar motor y primera revisión real; después buscar duplicados, crear la programación autorizada y releer ID, alcance, destino, horario y zona; ejecución automática se comprueba por separado |

Una skill enseña el procedimiento; un plugin puede agrupar skills y herramientas; una conexión autentica una cuenta. La presencia de cualquiera de estos elementos no prueba los demás. El control de computadora puede ser nativo o provisto por herramientas compatibles; no exigir MCP cuando el anfitrión ya aporta la capacidad.

## Resolver un requisito faltante

1. Confirmar nombre y variante del anfitrión. Codex, Claude Code y un chat de otro producto no tienen necesariamente las mismas funciones.
2. Preferir herramientas ya disponibles. Si falta una, consultar el catálogo oficial accesible o la documentación vigente del proveedor para identificar el componente exacto y su forma de instalación. No instalar paquetes elegidos solo por semejanza del nombre.
3. Explicar la función en términos cotidianos: «Para incluir los avisos de tu correo, necesito que conectes tu cuenta». Mencionar costos o permisos que cambien la decisión antes de proceder. La elección del componente técnico la resuelve el agente; la persona elige la función y la cuenta.
4. Comprobar si el anfitrión ofrece herramientas para instalar, habilitar o iniciar la conexión del componente identificado. Usarlas dentro del alcance autorizado, reutilizando lo ya conectado. Resolver los pasos de preparación y abrir el flujo oficial de conexión cuando sea posible; no limitarse a dar instrucciones para una acción que el agente puede realizar. No presentar enlaces como botones ya abiertos ni prometer una instalación que las herramientas no permiten.
5. Si hay una intervención humana necesaria, dejarla preparada: pantalla o enlace oficial, acción concreta y resultado esperado. Explicar brevemente por qué esa parte le corresponde al usuario: por ejemplo, elegir su cuenta o aceptar sus permisos. Guardar el paso y aplicar la espera acompañada de abajo, sin exigir una confirmación escrita cuando el cambio se puede observar.
6. Cuando se detecte el cambio, comprobar la capacidad con la prueba de la tabla y la identidad esperada, guardar el resultado y continuar automáticamente con el paso que dependía de esa conexión. «Ya está instalado» también permite reintentar; no reemplaza la prueba. Si falla, explicar qué función sigue faltando y resolver el siguiente paso posible sin repetir toda la instalación.

La misma secuencia se aplica a cada conexión concreta, no solo a la primera. Conectar un servicio no concede autorización para enviar mensajes o modificar su contenido; esos permisos conservan su alcance propio.

## Espera acompañada

La experiencia es un intercambio continuo: preparar una acción, dejar actuar a la persona, comprobar y avanzar. Un formulario de login o una autorización pendiente son pasos de la instalación en curso, no una instalación fallida ni completada.

1. Guardar `status: waiting-user` y el objeto `waiting` descrito en [persistencia](persistencia.md). Identificar de antemano la condición observable que permite continuar: sesión autenticada y cuenta esperada, perfil accesible o herramienta habilitada. Conservar la pestaña propia y la misma sesión de control.
2. Avisar una vez con lenguaje cotidiano: «Te dejé Campus abierto para que inicies sesión. Voy a comprobar cuándo puedas entrar y seguimos desde acá». Usar esta promesa solo si hay capacidad real de observación activa. Mantenerse en el paso; no distraer con nuevas preguntas mientras la persona ingresa.
3. Preferir una señal de finalización o espera nativa documentada del anfitrión. Si no existe y la sesión sigue activa, hacer comprobaciones breves de solo lectura cada 10–20 segundos, en una ventana inicial de hasta tres minutos. Leer solo el indicador de sesión o perfil necesario; evitar capturar formularios o credenciales, recargar el login, cerrar la pestaña o volver a iniciar conexiones mientras la persona actúa. Ninguna espera individual supera 60 segundos ni los límites del entorno. Durante la espera activa, dar un aviso breve de continuidad al menos cada minuto, sin repetir instrucciones ni pedir «avisame».
4. Al observar la condición, ejecutar la prueba real correspondiente. Si pasa, marcar el check verificado, limpiar `waiting`, guardar el avance y retomar la siguiente fase sin una confirmación escrita adicional. Una pestaña abierta, el paso del tiempo o un clic no prueban autenticación ni conceden permisos. Si el usuario cancela o cambia el objetivo, respetarlo y conservar las respuestas.
5. Si la ventana termina sin cambios, conservar el paso y ofrecer opciones nativas como «Seguir esperando», «Necesito ayuda» o «Dejar para después». «Seguir esperando» abre otra ventana de observación; «Necesito ayuda» inspecciona solo el obstáculo concreto; «Dejar para después» guarda y finaliza la espera. No crear un monitor periódico ni una tarea programada como solución a este paso.
6. Si el entorno no puede observar el cambio o no permite mantener el turno activo, explicar esa limitación antes de prometer continuación automática. Guardar el paso y usar un botón nativo «Comprobar conexión» cuando esté disponible; al pulsarlo, verificar y reanudar. Solo si tampoco hay controles nativos, pedir una confirmación breve como alternativa. No afirmar que se sigue comprobando después de cerrar el turno, reiniciar o perder el acceso al navegador.

Los límites de espera organizan la interacción; no diagnostican por sí solos una falla. El usuario no necesita describir qué hizo cuando el agente puede comprobar el resultado. Una respuesta o un botón de continuación tampoco reemplazan la verificación.

## Lenguaje y guía para cualquier usuario

- Preguntar por objetivos: «¿Querés agregar tus fechas al calendario?». Evitar preguntas como «¿Qué servidor MCP tenés configurado?» o «Instalá el conector adecuado».
- Usar los nombres de servicios y botones que la persona verá. Explicar términos técnicos solo si los pide o son necesarios para identificar una opción; no mostrar IDs, nombres internos de herramientas ni errores crudos como instrucciones.
- Preferir opciones nativas seleccionables y respuesta libre. Para un dato que el agente pueda comprobar, hacer esa comprobación antes de pedírselo a la persona.
- Dar una sola acción humana por vez, con instrucciones concretas verificadas. Una URL sola no es una guía: indicar qué abrir, qué elegir allí y qué debería aparecer. Si la interfaz cambia o no puede verificarse, decir qué falta observar y pedir únicamente el dato visible necesario, sin adivinar menús.
- Si el paso necesita un comando, primero intentar ejecutarlo mediante las herramientas autorizadas. Cuando solo pueda hacerlo la persona, entregar el comando exacto verificado, indicar dónde pegarlo y explicar el efecto en una oración; nunca dar variables técnicas para que las complete por su cuenta.
- Para login y consentimiento, abrir o preparar el flujo del proveedor y dejar que la persona ingrese contraseñas, códigos y acepte permisos. No pedirlos por chat ni aceptar permisos en su lugar. Si hay varias cuentas y falta elegir, mostrar opciones reconocibles; no escoger una cuenta por inferencia.
- Ante una función opcional difícil de habilitar, ofrecer «Continuar sin esta función» y guardar esa elección. Para una capacidad obligatoria ausente, explicar el bloqueo con claridad; no declarar éxito para evitar incomodar.
- Conservar los detalles técnicos necesarios en el diagnóstico local mínimo, sin secretos. El mensaje al usuario describe el resultado y el siguiente paso; los detalles quedan disponibles si los solicita.

Formato del mensaje al usuario:

> Para revisar Campus necesito poder abrir y leer una pestaña de tu navegador. Falta habilitar esa conexión. El siguiente paso es [acción observada en la interfaz o respaldada por documentación oficial]. Cuando la completes, voy a comprobar que puedo leer una pestaña propia.

Reemplazar la acción con una instrucción real antes de mostrar el mensaje. Ofrecer un paso por vez; si cambió la interfaz, pedir el nombre de la opción visible o inspeccionarla con herramientas autorizadas. No inventar menús, enlaces de descarga ni comandos. Las contraseñas y códigos se ingresan únicamente en la interfaz del proveedor.

Si una conexión requiere reiniciar el anfitrión, guardar el avance antes e indicar qué proyecto reabrir y cómo pedir «continuar configuración». No reiniciar una sesión de trabajo del usuario sin necesidad ni permiso para ese efecto.

## Rutas por entorno y fuentes oficiales

Consultar únicamente la ruta del entorno elegido; comprobar la documentación actual antes de dar pasos exactos.

- **Codex:** una carpeta de skill contiene `SKILL.md` y recursos. Si hay instalador disponible, usarlo para el alcance de proyecto elegido; comprobar descubrimiento y carga. Para herramientas faltantes, usar el catálogo disponible y autorizar cada cuenta desde el proveedor. Fuentes: [crear skills](https://developers.openai.com/plugins/build/skills), [plugins](https://learn.chatgpt.com/docs/plugins), [automatizaciones](https://learn.chatgpt.com/docs/automations?surface=app).
- **Claude Code:** confirmar que se trata de Claude Code y consultar las instrucciones de instalación de skills y conexión MCP de esa versión. No extrapolar estos pasos a todas las aplicaciones de Claude. Fuentes: [skills](https://code.claude.com/docs/en/skills), [MCP](https://code.claude.com/docs/en/mcp).
- **Otro anfitrión:** verificar si admite skills o lectura de instrucciones, archivos persistentes, navegador y ejecución. Si solo puede leer texto, ofrecer un diagnóstico y la entrevista en el chat, con `blocked` y sin afirmar persistencia ni instalación. La compatibilidad operativa se prueba; no se deduce de que use un LLM o MCP.

`runtime-check` verifica que Node.js 22 o superior ejecuta los scripts incluidos y prepara el estado propio. Si falta el runtime, guiar su instalación oficial y reintentar; la implementación operativa ya está incluida. Las conexiones y una primera revisión real se verifican por separado antes de declarar listo el modo manual.

## Reanudación y errores

Reutilizar la sesión de control existente mientras funcione. Ante login vencido, preparar la pestaña propia y acompañar la espera hasta poder verificar la sesión; no reiniciar la entrevista. Ante una función opcional ausente, ofrecer dejarla desactivada y continuar las demás. Ante falta de acceso a archivos o al motor, conservar lo posible y dar el bloqueo exacto.

La capacidad de envío no implica que se haya enviado un correo. La capacidad de crear eventos no implica que exista uno. Registrar acciones como completadas solo tras recibir confirmación del servicio; ante un resultado incierto, buscar evidencia antes de reintentar.
