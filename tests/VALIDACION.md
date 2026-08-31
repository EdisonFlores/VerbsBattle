# Validación del punto 10

- `npm run verify`: 30 pruebas aprobadas y compilación correcta.
- Inventario: 51 recursos activos, sin dependencias externas ni Shuar.
- Navegador: primera carga en `/verbsbattle/` (subruta equivalente a un repositorio
  de GitHub Pages), esperando el aviso «Listo para jugar sin conexión».
- Se detuvo el servidor y se confirmó que rechazaba conexiones HTTP.
- Con el servidor detenido: registro de dos jugadores, avatares, acceso a
  Normal, Flash, Puzzle y Sorpresa con verbo y ronda inicial; sesión de Estudio
  con consulta de respuesta; Examen completo con nota 10/10 y recarga de resultado
  sin duplicar el historial. No aparecieron errores de consola en esa prueba.
- El service worker tiene pruebas automatizadas para raíz y subcarpeta,
  aislamiento de cachés, descarga fallida y navegación offline.

No se ha publicado el proyecto en un proveedor ni ejecutado una instalación
en el sistema operativo. Esa comprobación final depende del navegador/dispositivo
y del dominio HTTPS elegido. El manifiesto y las dimensiones PNG están verificados.

Para repetir: ejecutar `npm run verify`, servir `dist/` con `npm run preview`,
visitarlo con conexión, esperar el aviso de disponibilidad, detener el servidor
y navegar/recargar. Para probar una subruta en PowerShell, antes de arrancar:
`$env:BASE_PATH = '/verbsbattle/'`.
