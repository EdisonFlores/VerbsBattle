# Irregular Verb Battle

Proyecto educativo creado por **Juan Carlos Pashma Segovia**, estudiante de
Tecnologías de la Información (TI) en la **ESPOCH, sede Morona Santiago**.
Practica verbos en inglés con 1–4 jugadores, seis modos, avatares, XP, logros
y perfiles locales. Flash requiere al menos dos jugadores.

## Ejecución rápida

Necesitas Node.js 22 o posterior y npm. No hay dependencias de ejecución ni
paquetes que instalar: Bootstrap y Tailwind ya están incluidos localmente.
Abre una terminal dentro de esta carpeta:

```sh
npm run verify
npm run preview
```

Abre **http://127.0.0.1:8000/**. `verify` ejecuta las pruebas y genera `dist/`.
`preview` sirve esa versión con PWA. No abras los HTML con doble clic (`file://`).
Para editar sin caché de la PWA usa `npm start` y un puerto/origen distinto
al de producción. En PowerShell puedes usar `$env:PORT = '8001'`.

## Calidad (punto 10)

```sh
npm test          # puntuación real, almacenamiento, perfiles, UI y service worker
npm run check    # referencias, mayúsculas, anclas, JSON e imágenes dinámicas
npm run build    # comprobar recursos y generar dist/ con versión de caché
```

- Las pruebas cubren +10/−5, variantes, doble envío, turnos, nota del examen,
  persistencia/reapertura, JSON corrupto, separación de jugadores, XP y repaso.
- El verificador recorre las 12 páginas y sus dependencias activas, incluidos
  CSS, rutas JS, datos, avatares e iconos. Falla si falta un recurso, una ancla,
  hay diferencias de mayúsculas o una dependencia externa incompatible con offline.
- GitHub Actions ejecuta la calidad en pushes y pull requests. No publica automáticamente.
- `dist/` es generado y se reemplaza al compilar. No guardes archivos propios ahí.
  El compilador rechaza una carpeta `dist` preexistente sin su marca de propiedad.
- Solo se empaquetan recursos activos. Shuar, `legacy/`, `.idea`, pruebas,
  scripts de desarrollo y datos experimentales quedan fuera de `dist/`.

## Instalar y jugar sin conexión

1. Sirve **dist/** mediante HTTPS, o usa localhost para probar.
2. Visita la página con conexión y espera el aviso **Listo para jugar sin conexión**.
   La primera descarga incluye las páginas, verbos, estilos, scripts e imágenes.
3. Si el navegador lo ofrece, pulsa **Instalar Verb Battle** o su opción de
   instalación. En iPhone/iPad usa Safari → Compartir → Añadir a pantalla de inicio.
4. Después puedes abrir los seis modos sin conexión. Instalar no es obligatorio
   para aprovechar la caché; la interfaz del instalador depende del navegador.

Al publicar una actualización, el aviso pide terminar y cerrar todas las
pestañas/ventanas de Verb Battle antes de volver a abrirla. No se recarga una
partida en curso. La caché se versiona según el contenido y solo elimina versiones
anteriores de esta misma instalación, sin borrar perfiles ni cachés de otros sitios.

**Límites:** una primera visita sin conexión no funciona. El navegador puede
eliminar caché o almacenamiento por falta de espacio, modo privado o limpieza
manual. Los perfiles se guardan por navegador y origen, no se sincronizan ni
se transfieren automáticamente desde localhost al dominio publicado.
La PWA no guarda una partida a mitad de ronda: conserva las respuestas ya registradas.

## Publicación

El resultado es una web estática multipágina: no necesita servidor de aplicaciones,
variables secretas ni redirecciones SPA. Las rutas relativas funcionan también
bajo `https://usuario.github.io/repositorio/`. Publica **el contenido de dist/**,
no la carpeta completa del proyecto. No se ha publicado ni creado ninguna cuenta.

### GitHub Pages

1. Sube el código a un repositorio de tu elección.
2. En Settings → Pages, selecciona **GitHub Actions** como fuente.
3. En Actions ejecuta manualmente **Publicar GitHub Pages** sobre la rama deseada.
   El flujo verifica, compila y publica únicamente `dist/`.
4. Si tu rama no es la predeterminada, configura la protección del entorno
   `github-pages` para permitirla. No cambies las rutas a rutas absolutas.

### Netlify

Importa tu repositorio o arrastra `dist/` tras ejecutar `npm run verify`.
La configuración `netlify.toml` define `npm run verify`, Node 22 y directorio `dist`.
Si el proyecto está dentro de otro repositorio, elige esta carpeta como directorio base.

### Vercel

Importa el repositorio con esta carpeta como Root Directory. El archivo
`vercel.json` selecciona proyecto estático, comando `npm run verify` y salida `dist`.
Se conservan las extensiones `.html`; no actives una redirección general a index.

Antes de publicar, revisa los derechos de uso de las imágenes y avatares existentes.
No se ha atribuido una licencia nueva al proyecto ni comprobado la titularidad
de esos recursos. Las licencias de Bootstrap y Tailwind acompañan la distribución.

Referencias: [PWA instalable (MDN)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable),
[Service workers (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers),
[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[Netlify](https://docs.netlify.com/build/configure-builds/file-based-configuration/),
[Vercel](https://vercel.com/docs/project-configuration/vercel-json).

## Arquitectura y reglas de juego

La aplicación activa utiliza HTML/CSS/JavaScript. Los modos
disponibles son Clásico, Flash, Puzzle, Sorpresa, Examen personalizado y Estudio/repaso. Shuar queda fuera del
alcance; su carpeta antigua no está enlazada desde la aplicación.
Los modos experimentales y Shuar no forman parte de la versión publicada.

### Estructura activa

- `js/game-utils.js`: lectura de JSON, almacenamiento JSON, normalización,
  formas verbales, avatares y formato de duración.
- `js/profile-store.js`: perfiles persistentes y acumulación de estadísticas.
- `js/index.js`, `js/mode.js`: registro de jugadores y elección del modo.
- `js/game-classic.js`, `js/game-flash.js`: una implementación por modo.
- `js/game-exam.js`, `js/exam-play.js`, `js/exam-result.js`: selección,
  ejecución y resultados del examen.
- `js/profile.js`, `js/podium.js`: vistas de estadísticas y clasificación.
- `legacy/js/`: cinco prototipos no utilizados, conservados como referencia.
- `tests/profiles.test.cjs`: pruebas del registro, persistencia, cálculos,
  aislamiento, reinicio e integridad de las referencias HTML.

### Reglas de estadísticas

- Un nombre identifica un perfil dentro del mismo navegador y origen HTTP.
  No se distingue entre mayúsculas/minúsculas ni espacios repetidos, pero se
  conservan las diferencias entre nombres como José y Jose.
- Dos jugadores de una misma partida deben utilizar nombres distintos.
- Las respuestas se contabilizan inmediatamente; las partidas y los récords
  solo al terminar todas las rondas. Una recarga del juego inicia otro intento
  desde cero, sin eliminar las estadísticas de respuestas anteriores.
- Cada evento lleva un ID para impedir una contabilización repetida.
- Clásico y Flash comparten el récord de puntos totales. El récord del examen
  se almacena por separado en una escala sobre 10.
- El promedio se calcula en segundos por verbo enviado, incluyendo errores
  y omisiones. La precisión usa formas correctas / formas evaluadas.
- Los errores históricos se conservan. La lista de pendientes de repaso es
  independiente y se actualiza con las respuestas nuevas.
- Reiniciar estadísticas afecta solo al perfil seleccionado, conservando
  identidad, otros jugadores y el historial de exámenes. No se usa
  `localStorage.clear()`.
- Datos: `verbBattleProfiles.v1`, `activeProfileId` y
  `selectedExamProfileId`. Se mantienen las claves del flujo anterior.
- Los resultados antiguos sin propietario no se asignan automáticamente.
  No hay cuentas, sincronización en nube ni coordinación de partidas
  simultáneas entre pestañas.

### Ejecutar y verificar

Servir la carpeta por HTTP (abrir HTML como `file://` no garantiza que funcione
la carga de JSON). Con Python instalado:

```shell
python -m http.server 8000 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8000/index.html`. Mantener el mismo host y puerto para
recuperar los datos locales. Cambiar de puerto o borrar los datos del navegador
no transfiere los perfiles.

Con Node.js instalado, ejecutar las pruebas sin instalar dependencias:

```shell
node --test tests/profiles.test.cjs
```

### Experiencia, niveles y logros (punto 4)

- Configuración de niveles y logros en `data/achievements.json`; motor en
  `js/progression.js`, integrado con el registro persistente de cada perfil.
- Cada forma correcta otorga 5 XP (15 por verbo completo); completar todas
  las rondas otorga 20 XP adicionales. Errores y omisiones no restan XP.
  Los puntos competitivos y la nota del examen no cambian.
- Los niveles requieren 0, 100, 250, 500 y 1000 XP. Al alcanzar el último,
  la experiencia sigue creciendo y el indicador permanece en 100%.
- Logros activos: primer verbo completo correcto, cinco verbos seguidos
  correctos en el mismo intento, verbo completo en menos de 3 segundos y
  partida terminada sin errores. Funcionan en Clásico, Flash y Examen.
- Las rachas son individuales; fallar, omitir o iniciar otro intento las
  reinicia. El logro Perfecto exige todas las respuestas del jugador, no
  simplemente una puntuación alta. Un examen de un verbo también cuenta.
- Estudioso se activa con el punto 5 al registrar diez rondas de práctica.
- Los avisos muestran el nombre del jugador y persisten al navegar o recargar
  hasta pulsar Entendido. Cada logro solo se concede una vez por perfil.
- Los perfiles anteriores conservan sus estadísticas; empiezan en 0 XP.
  No se inventan logros históricos a partir de datos incompletos.
- Reiniciar un perfil también borra sus XP, nivel, logros y avisos pendientes,
  manteniendo los identificadores de eventos para evitar resultados repetidos.

### Estudio y repaso (punto 5)

- Acceso desde selección de modo y desde el perfil. Cada sesión pertenece a
  un solo jugador, seleccionado antes de empezar; no modifica los asientos
  ni las puntuaciones de una partida competitiva.
- Tarjetas aleatorias sin repetición dentro de la sesión, con filtros por
  dificultad, búsqueda español/inglés y máximo de 5, 10 o 20 tarjetas.
- Todos los verbos combina `all_verbs.json` y `verbs.json`, sin duplicados
  por infinitivo. Mis errores pendientes usa exclusivamente el perfil elegido.
- Ver respuesta solo consulta la tarjeta: no suma rondas, XP ni aciertos.
  Comprobar evalúa las tres formas y acepta variantes separadas por `/`.
  Omitir registra una ronda fallida y mantiene el verbo pendiente.
- Una respuesta sin ayuda gana 5 XP por forma correcta. Diez rondas enviadas
  (incluidas incorrectas u omitidas) desbloquean Estudioso una sola vez.
  No se conceden bonos de finalización ni logros competitivos en estudio.
- Las estadísticas de práctica son independientes de precisión, tiempo,
  partidas y récords competitivos; aparecen en el perfil.
- Fallar en Clásico, Flash, Examen o práctica añade el verbo a pendientes.
  Acertar sus tres formas sin ayuda en cualquiera de ellos lo retira.
  Un error posterior lo añade de nuevo; el historial no se borra.
- Al migrar se incorporan los errores históricos con propietario. No se
  importan los antiguos `failedVerbs` globales, que no identifican jugador.
  Pendientes sin formas disponibles en el catálogo se conservan y se avisa.
- Cada respuesta se guarda inmediatamente y se deduplica por ID. Terminar
  antes o recargar no elimina lo respondido; la recarga prepara otra sesión.
  El resumen muestra solo la sesión actual. Reiniciar el perfil también
  reinicia práctica y pendientes sin tocar otros jugadores.
- Shuar y los prototipos de `legacy/` no se modifican.

### Poderes de Flash (punto 6)

- El modo Flash concede un poder aleatorio al encadenar tres respuestas con
  las tres formas correctas. Solo puede mantenerse un poder sin usar por
  jugador; una racha posterior no reemplaza el pendiente.
- Doble puntuación duplica la puntuación de la próxima respuesta, incluida
  una penalización si se falla. Pista de iniciales muestra las iniciales de
  las tres formas del verbo actual. Invertir turnos cambia el sentido de los
  siguientes turnos, respetando las rondas restantes de cada jugador.
- El jugador decide cuándo usarlo, antes de enviar su respuesta. Los poderes
  existen solamente durante la partida Flash: no se guardan en perfiles, no
  modifican XP, logros, historial ni el modo Estudio. Recargar inicia otro
  intento sin poderes activos.

### Puzzle de conjugación (punto 7)

- Nuevo modo competitivo para uno a cuatro jugadores: se ordenan las tres
  formas del verbo mediante arrastrar y soltar o con clic, con alternativa
  utilizable por teclado.
- Usa dificultad y número de rondas como Clásico. Cada posición correcta vale
  +10 puntos y cada posición incorrecta −5; los resultados, récords, XP,
  logros, perfil y podio se integran como una partida competitiva más.

### Ronda Sorpresa (punto 8)

- Nuevo modo competitivo: en cada reto cambia aleatoriamente el orden en que
  se solicitan infinitivo, pasado y participio. La indicación visible evita
  ambigüedad y se evalúa cada forma en su posición solicitada.
- Comparte dificultades, rondas, puntuación (+10/−5 por forma), perfiles,
  XP, logros, repaso y podio con los demás modos competitivos.

### Diseño responsive (punto 9)

- Las 12 páginas activas comparten `css/theme.css`: identidad oscura/naranja,
  navegación, campos, botones, paneles, feedback y estados de foco legibles.
- Bootstrap 5.3.3 aporta únicamente la cuadrícula local (`css/vendor/`). No
  carga resets ni componentes `.modal` que ocultaban el selector de rondas.
- Tailwind 3.4.17 se compila localmente con prefijo `tw-` y sin preflight.
  No hay scripts ni hojas de estilo externos en las páginas activas; una
  CDN lenta o bloqueada ya no retrasa la inicialización de los juegos.
- Las tablas tienen su propio desplazamiento horizontal, sin convertir toda
  la pantalla en una tabla desplazable. Puzzle se apila en teléfonos estrechos.
- Normal, Flash, Puzzle y Sorpresa usan un selector de rondas con cierre por
  Escape, botón Volver y navegación por teclado. Estudio y Examen configuran
  su sesión en sus propias pantallas; Flash sigue requiriendo dos jugadores.
- Puzzle bloquea las tarjetas tras corregir, registra el tiempo real y acepta
  tarjetas con variantes (`was/were`). Puzzle y Sorpresa muestran la solución.
- Perfiles, datos y `legacy/` no se reemplazan; Shuar no se implementa.

#### Mantener los estilos

Los CSS generados están incluidos, por lo que ejecutar la aplicación no
requiere npm ni conexión externa. Para modificar utilidades Tailwind:

```powershell
npm install --no-save tailwindcss@3.4.17
npx tailwindcss -c tailwind.config.cjs -i css/tailwind-input.css -o css/tailwind-built.css --minify
node scripts/stamp-assets.cjs
npm test
```

Las hojas antiguas se conservan como referencia, pero ya no se cargan.
Licencias de Bootstrap y Tailwind incluidas en `css/vendor/`.

