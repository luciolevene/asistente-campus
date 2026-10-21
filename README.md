# Asistente Campus

Un asistente académico personal para revisar Campus Virtual, recordar pendientes y avisar sobre lo que te importa. Se instala como skill en tu agente y se configura con una entrevista guiada. Se adapta a las materias, horarios y preferencias de cada persona.

## Empezar

Abrí un proyecto personal en Codex o Claude Code y compartile [este repositorio](https://github.com/luciolevene/asistente-campus). Pedile que instale **Asistente Campus** y comience la configuración. No hace falta memorizar un prompt: después podés elegir la skill en tu agente o pedir «Configurar mi Campus» o «Revisar mis materias».

El asistente te acompaña para abrir Campus, iniciar sesión y elegir materias. Usa opciones seleccionables si tu aplicación las admite, acepta una foto, archivo o enlace con tus horarios y termina preguntando por alertas específicas. Cuando elegís revisar, continúa desde la entrevista a la primera revisión. Si necesita una conexión, prepara lo que puede hacer y te guía en el paso que requiere tu intervención.

**Cada usuario guarda sus datos en su propia computadora.** El repositorio solo distribuye instrucciones, programas y plantillas vacías. No hay servidor del proyecto, base de datos de usuarios ni telemetría. Materias, horarios, respuestas y seguimiento van en `local/`, excluido de Git. Las sesiones y credenciales quedan en el navegador o el mecanismo seguro del agente. Los servicios elegidos y el proveedor de tu agente procesan la información necesaria según sus propias condiciones.

## Qué necesitás

- Windows o macOS y un agente con archivos, ejecución local y control de navegador. Codex y Claude Code tienen rutas de instalación incluidas; otros agentes requieren comprobar esas capacidades.
- Node.js 22 o superior. El asistente lo detecta y guía su instalación oficial si falta. No requiere PowerShell, Python ni paquetes npm.
- Tu sesión de Campus. El inicio de sesión y las autorizaciones de cuentas los hacés vos, en el proveedor.

Correo, documentos, calendario y revisiones programadas son opcionales. Se conectan según tus elecciones y herramientas disponibles. La skill no puede instalar capacidades que tu aplicación no ofrece ni ejecutar tareas con la computadora apagada. Si falta algo, explica qué función depende de ello y cómo continuar.

## Instalación manual alternativa

```text
git clone https://github.com/luciolevene/asistente-campus.git
cd asistente-campus
node scripts/install.mjs --project "RUTA_DE_TU_PROYECTO" --host codex
```

Usar la ruta real del proyecto. Para Claude Code, cambiar `--host codex` por `--host claude`. El instalador verifica los archivos y conserva la configuración local existente. Una actualización deja una copia recuperable de la skill anterior en `local/skill-backups/`.

También podés copiar `skills/asistente-campus` a `.agents/skills/` del proyecto en Codex o `.claude/skills/` en Claude Code. No copies archivos personales de otra instalación. Si no aparece de inmediato, reabrí el proyecto o seguí el mecanismo de recarga de tu agente.

## Qué hace

- Revisa materias y componentes en vivo, incluyendo consignas y fechas escritas fuera del calendario.
- Guarda pendientes y finalizaciones; comprueba cambios sin repetir detalles completados que permanecen iguales.
- Distingue entregas, preparación para clase, avisos y fuentes que no pudo consultar.
- Puede leer fuentes complementarias, enviar informes o crear eventos verificados, solo con cuentas y permisos acordados.
- Configura revisiones automáticas si existe un programador compatible y la primera revisión real ya fue comprobada.

No responde ni entrega evaluaciones, publica en Campus o modifica documentos. Instalar archivos no equivale a conectar cuentas: la entrevista comprueba cada capacidad y conserva los pasos pendientes.

## Desarrollo y comprobación

```text
npm test
npm run verify
node skills/asistente-campus/scripts/self-test.mjs
```

Las pruebas usan datos ficticios y carpetas temporales; no abren cuentas reales, envían correos ni crean eventos. GitHub Actions ejecuta Windows/macOS/Linux con Node 22 y 24. Consultá el resultado de los jobs para conocer los entornos verificados. [Diseño y límites](IMPLEMENTATION.md).
