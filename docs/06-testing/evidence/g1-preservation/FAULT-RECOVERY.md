# Cierre G1a — fallos de escritura y proceso

HEAD anterior `3125b1cc`: comprobado headSha exacto de Actions, no solo el nombre
del check. Android CI PR `38882654273` y Evidence PR `38882654268` SUCCESS.
Evidence push `38882647342` también SUCCESS. Android push `38882647318` falló
antes de tests: `error: device offline`, infraestructura ADB. No es un fallo
agrícola silenciado; el run PR del mismo SHA pasó. Esta ampliación cambia HEAD
y requiere sus propios checks antes de READY.

## Nuevas pruebas reproducibles

- 9/9 `LocalLinkBackupTest`: se amplía con ENOSPC durante binario y manifiesto.
  Se escriben dos bytes en la copia temporal y se inyecta `ErrnoException(ENOSPC)`.
  Se intentó `/dev/full`, pero CI confirmó que SELinux lo deniega con EACCES (13),
  no ENOSPC (28); se registra y corrige esa hipótesis de QA, sin relajar la aserción
  para aceptar otro errno. No se llena el volumen ni se altera la configuración
  del emulador. El error impide publicación y elimina solamente el staging de
  esa llamada; DB, bytes fuente y una copia previa permanecen idénticos. Retry
  sin fallo completa una sola copia. Esto valida ENOSPC de escritura, no todos
  los posibles fallos de SQLite al agotar el volumen físico.
- 1/1 `LocalLinkBackupProcessTest`, dos procesos reales: un adjunto sintético
  queda parcialmente copiado (2 de 6 bytes); el harness ejecuta `am force-stop`
  sin `pm clear`. Una nueva instrumentación reabre Room, comprueba que no se
  publicó el parcial, conserva fuente y checkpoint previo, y repite el mismo
  UUID completándolo exactamente una vez con todos los bytes.
- Harness `.github/scripts/test-g1-backup-process-recovery.ps1`: DEV/emulador
  exclusivamente, UUID sintético y guardas previas. La prueba de proceso se
  omite en descubrimiento normal; requiere argumentos explícitos del harness.

El punto de inyección de salida es un constructor interno; el constructor de
producción siempre usa `FileOutputStream`. No hay flags/runtime hooks para
provocar fallos en la app distribuida.

## Límites restantes

No se acredita supervivencia a corte eléctrico/controlador defectuoso, ni
restauración automática sobre una base operativa. Nunca se sobrescribe una base
para probarla: se reabre la copia y se reconcilian sus valores y binarios.
Los staging abandonados tras matar proceso se ignoran y conservan; una futura
limpieza necesitará identificar operaciones activas y no borrar trabajo ajeno.
Los binarios reales son archivos privados no vacíos, leídos y comparados byte
a byte, no meras URI. No se han usado fotos de usuarios reales.

G1a puede proponerse READY cuando el nuevo HEAD esté verde; G1b/G1c y G2 no se
dan por terminadas por este gate. Fusión requiere autorización del propietario.
