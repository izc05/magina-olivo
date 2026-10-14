# #462 — solicitud al guardar el primer recordatorio

Base: `main` b5e3357da46147cd38ba008461c6713a76a05199, integración autorizada de #750.

La creación entrega el UUID tras confirmar el guardado y terminar su estado de
guardado. El Host consulta el agregado persistido: trabajo PLANNED activo,
preferencia habilitada y recordatorio futuro, activo, no disparado ni borrado.
Entonces explica el permiso y utiliza el diálogo nativo Android 13+. No modifica
el trabajo, recordatorio, preferencias, calendario, cálculos ni notificador.
La política ya integrada evita repetir la solicitud al guardar otro aviso elegible.
El detalle también conecta sus guardados/planificación mediante OnEachSave.

## Evidencia local

- 641 JVM, cero fallos/errores (`jvm-summary.json`). Cuatro pruebas nuevas cubren
  UUID confirmado, estado de guardado terminado, fallo de persistencia, validación
  y compatibilidad de los llamadores que no proporcionan callback.
- `issue462-first-save-red.log`: 4 pruebas, 1 fallo real antes de implementar la
  entrega del UUID; `issue462-first-save-build.log`: compilación y JVM correctas.
- Dos pruebas instrumentadas de base: creación real y filtros de elegibilidad.
- Ocho ejecuciones del primer aviso: baseline/aceptar/rechazar/Ahora no, en
  360 dp oscuro y 390 dp claro, fuente 1,3. Cada ejecución guarda dos trabajos con
  recordatorios futuros, verifica su persistencia y evita repetir el diálogo.
- Cuatro regresiones MainActivity/Perfil de #750 y dos de legibilidad de #749.
  Total: 16 ejecuciones instrumentadas finales, sin contar iteraciones diagnósticas.
- El nuevo flujo usa FarmActivitiesRoute, ViewModel y repositorios Room reales
  en ComponentActivity con el contenedor de prueba equivalente al formulario.
  No acredita por sí solo la navegación completa de MainActivity hacia ese formulario.
- Capturas en `captures`; lectura visual de explicación/guardado con fuente grande.
- Se corrigió el montaje de prueba: sus componentes hermanos necesitaban el
  contenedor vertical, fondo e insets que tiene la pantalla real. No fue un cambio
  de diseño productivo. Las matrices finales utilizan el contenedor corregido.
- Fixture UUID conserva/restaura base y preferencias originales. Los scripts
  exigen QEMU y paquete DEV, preservan POST_NOTIFICATIONS y verifican igualdad
  exacta de permiso/flags antes/después. No se opera un teléfono físico.
- `apk-sha256.txt` identifica binarios DEV/test utilizados; no hay APK candidata.

## GitHub y límites

Gate 3 ejecuta la nueva prueba y los cuatro modos Android con el script existente
parametrizado por clase; conserva la matriz anterior de Perfil y mapa. Resultados
remotos deben verificarse en el SHA publicado, separadamente de estas pruebas locales.

Revisión estática sin defectos importantes. Pendientes explícitos: prueba nativa
de editar/planificar en detalle y salir/recrear durante el guardado, fallo nativo de
persistencia, bloqueo permanente/canal→Ajustes y entrega/sonido/vibración física.
No se cierran #462 ni #725 ni se declara completada esa validación pendiente.
