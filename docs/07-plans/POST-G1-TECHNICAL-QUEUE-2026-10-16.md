# Cola técnica tras integración 9575a1e5

El encargo del propietario 16/10 autoriza G1/G2 en ramas y pruebas aisladas.
No autoriza fusión, migración persistente, sincronización productiva ni APK candidata.

| Orden / issue existente | Implementación realmente pendiente | Pruebas / salida | Dependencias |
| --- | --- | --- | --- |
| 1 · #726 G1a | Copia privada verificable Room + binarios (esta PR). Sin botón de vincular ni atribución. | Roundtrip SQLite, hashes, archivo ausente, corrupción y retry inmutable. | main integrado validado. |
| 2 · #726 G1b | Inventario actual por finca y recursos compartidos del workspace, selección/consentimiento, checkpoint durable Room posterior a v26; mapa local/Auth/remoto separado. | Cancelar sin cambios, muerte de proceso, fotos no vacías, dos cuentas, logout/reinicio; todas las lecturas y escrituras deben respetar cuenta activa. | G1a; no interpretar copia antigua como inventario actual. |
| 3 · #726 G1c | Reserva RPC de UUID y recibo idempotente por actor; conflicto sin revelar finca ajena, sin adoptar legacy por nombre/email/Catastro. | Carreras, timeout después de commit, JWT caducado y replay en Supabase efímero limpio/legacy. | G1b y contrato payload completo; no despliegue persistente. |
| 4 · #726 G2a–d | DTO completos, outbox inmutable con actor/binding/base revision, lease, CAS, pull con cursor/tombstones, adjuntos privados con hash y acuse. | Reintentos, edición posterior al envío, conflicto conservando ambas versiones, revocación, aislamiento A/B. | G1 validada; infraestructura outbox existente se reutiliza. |
| 5 · #726 web privada | Recuperar selectivamente shell histórico y conectar lectura privada al mismo protocolo. En main no hay `web/` ni `apps/`. | Android→nube→web→Android con dos cuentas y adjuntos; sin datos mock ni acceso editorial. | G2, auditoría de identidad/cookies histórica; no merge global V20. |
| 6 · #735/#739 | Completar cliente de invitaciones y permisos por finca sobre tablas/RPC G0 ya existentes, no crear segundo sistema de grants. | A invita B, C denegado, caducidad/replay/revocación, una pesada exactamente una vez. | G2 y catálogo explícito de capacidades; escanear QR no concede acceso. |
| 7 · #737 | Dominio/Room/UI y sync de acuerdos versionados, archivos de ambas partes y consentimiento separado. Reutilizar backend G0 integrado. | A/B aportan sin sobrescribir, tercero denegado; historial y cuotas sin duplicar pesadas ni repartir dinero. | G3; revisión jurídica antes de prometer validez/firma. |
| Línea pública · #731 | Terminar KEEP/ADAPT/DROP por archivo de #16/#66/#117 y shells web históricos. Después auth shell con roles de plataforma y salud técnica, CMS pueblos/cooperativas/noticias; publicidad rotulada después. | 401/403, editor sin acceso agrícola, publicación→API→tarjeta; fuente/licencia/caducidad. | Auditoría #731 existente y frontera plataforma/finca; no segundo registro/sesiones ni Admin nuevo desde cero. |
| Línea territorial · #724/#699 | #721 ya aporta Room v26 y repositorio territorial. Completar ficha de localidad y tarjetas públicas sobre ese catálogo, sin duplicar tablas/selector municipal. | Offline, fuente/campos ausentes, localidad ≠ municipio; retorno al mapa conservando contexto. | API editorial validada para noticias; catálogo offline para ficha básica. |
| Línea clima · #345 | Reutilizar `EdgeWeatherSource`, `CachedWeatherFeed`, `HomeWeatherHero` y semana. Revisar defectos/proveedor pendientes antes de añadir otro cliente AEMET. | Caché/caducidad, errores proveedor, municipio/finca, modo avión y cuotas. | Contrato/fuente y configuración de pruebas aislada; servicios públicos no bloquean el campo. |
| Línea CUE · #534 | Continuar matriz `CUE-ANDALUCIA-IMPLEMENTATION-MATRIX.md` y recursos fitosanitarios existentes; comprobar brechas de datos/exportación antes de nuevo modelo. | Actualizar fuentes oficiales, matriz campo→origen→exportación y pruebas con históricos. | Habilitación externa IUWS para envío; esta cola no certifica normativa ni conexión oficial. |

Los textos históricos de #744/#727 se conservan como historial. Un gate solo se
marca integrado cuando la PR esté fusionada con autorización y main validado.
