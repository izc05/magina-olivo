# #462 — permiso contextual desde Perfil (bloque 1)

Al activar avisos en Perfil, la preferencia se guarda primero. Si falta el permiso
Android 13+, se explica para qué sirve antes de abrir la solicitud nativa. Aceptar,
rechazar o elegir «Ahora no» conserva el trabajo PLANNED y su recordatorio.
Abrir Perfil o recrear MainActivity no solicita permisos automáticamente.
La acción explícita de revisar notificaciones conserva acceso a Ajustes cuando
Android ya no permite solicitar el permiso. Android anterior a 13 no recibe una
solicitud inexistente. El estado efectivo sigue incluyendo aplicación y canal.

No se modifican cálculos, canales, sonido/vibración, AlarmManager, Room ni Web V3.
La solicitud tras guardar el primer trabajo con recordatorio sigue pendiente;
este bloque no cierra #462 ni #725.

## Evidencia local

- `policy-red.log`: pruebas de política fallidas antes de implementarla.
- `context-red.log`: MainActivity real guardaba la activación sin explicación.
- `final-build.log`, `jvm-summary.json`: compilación DEV y 637 JVM, cero fallos/errores.
- `apk-sha256.txt`: huellas de los binarios DEV y test utilizados; ninguna APK candidata.
- La primera ejecución nativa pasó baseline, grant, deny y later; sus logs están
  en esta carpeta. Las ejecuciones finales y capturas se conservan por tamaño/tema.
- Cada modo usa MainActivity/Perfil/Room reales con una base UUID sintética.
  IsolatedAppStateRule restaura base y preferencias originales; los scripts
  preservan permiso POST_NOTIFICATIONS y flags, comprobando igualdad exacta.
  El guard exige paquete DEV y emulador QEMU; no opera teléfonos físicos.

## Reproducción

Tras compilar e instalar DEV y androidTest en un emulador API 33+:

```powershell
./.github/scripts/verify-context-notifications.ps1 -Serial emulator-5614
```

GitHub ejecuta los mismos cuatro modos mediante
`.github/scripts/verify-context-notifications.sh` desde Gate 3.
Las pruebas locales no sustituyen los resultados remotos del SHA publicado.

## Pendientes explícitos

Primera creación de recordatorio; integración bloqueo permanente→Ajustes y canal
desactivado; fallo de persistencia; recreación durante el diálogo; entrega real
del aviso y sonido/vibración en teléfono físico. La revisión estática no encontró
defectos críticos/importantes en este bloque, pero no acredita esos pendientes.
