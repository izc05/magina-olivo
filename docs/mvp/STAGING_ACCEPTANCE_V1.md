# Mágina Olivo — Staging Acceptance V1

Estado: **preparado para ejecución; requiere entorno externo real**.

Rama de ejecución: `feat/integration-v2-mvp-v1`
Base funcional: `feat/mvp-core-v1`
PR de integración: #6
Gate operativo: issue #7

## Objetivo

Convertir los P0 externos restantes en una secuencia reproducible sobre la **aplicación integrada Visual V2 + MVP Core**. Ningún dato real de agricultor debe entrar en staging hasta completar esta aceptación con datos sintéticos.

La integración P0 de interfaz ya cubre:

```text
Login
  -> Inicio
  -> Mi Campo
     -> Explotación
     -> Finca
     -> Parcela
     -> Cuaderno/Labor
  -> Campaña
     -> Entrega
     -> Rendimiento
     -> Ticket privado
  -> Offline
     -> outbox
     -> sync
     -> modo protegido
```

Staging debe validar este recorrido integrado, no una imagen anterior del MVP sin la capa Visual V2.

## Autoridad y trazabilidad del despliegue

Antes de cualquier deploy real:

- el checkout debe estar exactamente en la revisión que se desea probar;
- el working tree debe estar limpio;
- `scripts/staging-release.sh` rechaza automáticamente un checkout con cambios sin commit;
- las imágenes runtime/web registran el SHA real mediante `org.opencontainers.image.revision`;
- el estado de release conserva `current_source_sha` y `previous_source_sha` además de las etiquetas de release;
- una etiqueta humana de release no sustituye al SHA real como evidencia.

Comprobar siempre:

```bash
git status --short
git rev-parse HEAD
bash scripts/staging-release.sh status
```

El `current_source_sha` debe coincidir con el commit que se pretende validar.

## Prerrequisitos

El entorno debe disponer de:

- HTTPS válido;
- API y PWA same-origin según la arquitectura definida;
- PostgreSQL de staging;
- migraciones aplicadas, incluida `0004_activities.sql`;
- Better Auth configurado con secreto exclusivo de staging;
- correo de recuperación de staging o buzón de pruebas controlado;
- almacenamiento privado configurado;
- backup/restore disponible;
- variables de entorno fuera del repositorio;
- ningún dato real de agricultores.

## Orden del gate

### 1. Preflight del host

Ejecutar los scripts ya preparados:

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-host-preflight.sh
```

Después del primer deploy:

```bash
bash scripts/staging-host-postdeploy-gate.sh
```

No continuar si el host, red o contenedores no pasan.

Debe quedar demostrado que:

- PostgreSQL no publica puerto al host;
- API no publica puerto al host;
- worker no publica endpoint público;
- Nginx/web enlaza solo loopback;
- PWA y `/health/ready` responden por la misma entrada local.

### 2. HTTPS / seguridad pública

Con Tunnel/hostname ya configurados:

```bash
export STAGING_BASE_URL=https://<staging-host>
bash scripts/staging-https-gate.sh
```

Validar como mínimo:

- certificado válido;
- redirección HTTP -> HTTPS cuando aplique;
- cookie `HttpOnly`, `Secure`, `SameSite=Lax`;
- HSTS/cabeceras de seguridad;
- API privada no cacheable;
- origen hostil rechazado para mutaciones autenticadas;
- logout invalida la sesión;
- frontend sin secretos de servidor.

### 3. Recorrido funcional MVP sintético

Ejecutar:

```bash
API_BASE=https://<staging-host> scripts/mvp-core-flow-gate.sh
```

El script crea usuarios y datos **sintéticos y únicos por ejecución**.

Debe comprobar:

- sesión autenticada;
- aislamiento entre dos usuarios;
- explotación;
- finca;
- parcela;
- campaña;
- entrega de 1.842 kg;
- idempotencia de entrega;
- rendimiento posterior 21,9 %;
- labor de poda;
- replay retry-safe de labor;
- listado filtrado de labores;
- timeline con labor + entrega + rendimiento;
- resumen determinista: 1 entrega, 1.842 kg, 100 % cobertura, 21,9 % ponderado;
- ticket PDF privado;
- roundtrip de bytes del ticket;
- imposibilidad de acceso al timeline/documento desde el segundo usuario.

Salida esperada:

```text
[mvp-core-gate] PASS: MVP synthetic journey, idempotency, timeline, summary and private ticket isolation
```

### 4. Almacenamiento privado externo

Con el bucket privado de staging y un bucket separado de restore-validation:

```bash
bash scripts/staging-r2-gate.sh
```

Debe probar:

```text
PUT -> GET -> SHA-256 -> DELETE -> GET must fail
```

sin exponer credenciales ni objetos públicamente.

### 5. Recuperación de contraseña / correo

Comprobar en el entorno real:

- petición genérica anti-enumeración;
- recepción de correo en buzón sintético/controlado;
- token válido una sola vez;
- contraseña nueva funcional;
- sesiones anteriores revocadas cuando corresponda;
- ninguna URL/token sensible en logs públicos.

`AUTH_MAIL_TRANSPORT=capture` no es válido en staging externo.

### 6. Backup y restore

```bash
export BACKUP_DESTINATION_DIR=/mnt/off-host/magina-staging-backups
export BACKUP_DESTINATION_CONFIRMED_OFF_HOST=1
bash scripts/staging-backup.sh
```

Después ejecutar restore en targets aislados:

```bash
export RESTORE_BUNDLE_DIR=/mnt/off-host/magina-staging-backups/<bundle>
export RESTORE_DATABASE=magina_restore_validation
export RESTORE_OBJECT_STORAGE_BUCKET=<restore-validation-bucket>
export RESTORE_TARGETS_CONFIRMED_ISOLATED=1
bash scripts/staging-restore-gate.sh
```

Debe demostrarse que se recuperan conjuntamente:

- PostgreSQL;
- metadatos de documentos;
- objetos privados necesarios;
- relaciones entrega/rendimiento/labor/timeline;
- manifiestos/checksums exactos.

Una copia que no se haya restaurado con éxito no cuenta como backup validado.

### 7. Accesibilidad manual

Ejecutar `docs/mvp/ACCESSIBILITY_GATE_V1.md` sobre este mismo staging.

Mínimo:

- teclado completo;
- TalkBack + Chrome Android o NVDA + navegador desktop;
- 200 % zoom/reflow;
- reduced motion;
- foco visible;
- navegación activa anunciada;
- adjunto de ticket operable sin ratón.

### 8. PWA / offline manual

Con un usuario sintético:

1. instalar/abrir PWA;
2. iniciar sesión online;
3. cortar red;
4. crear entrega;
5. crear labor;
6. comprobar banner `entrega/labor` pendiente;
7. cerrar y reabrir la PWA sin red;
8. comprobar `Modo protegido` y conservación de outbox;
9. recuperar red;
10. revalidar sesión;
11. sincronizar;
12. comprobar una sola entrega y una sola labor en servidor;
13. confirmar que el timeline se actualiza;
14. comprobar que logout queda bloqueado mientras hay operaciones pendientes y vuelve a estar permitido tras sync;
15. confirmar que un ticket no se promete como guardado offline si su archivo todavía no se ha subido.

## Evidencia que conservar

Para cada ejecución guardar únicamente evidencia no sensible:

- fecha/hora;
- **SHA completo real desplegado (`current_source_sha`)**;
- etiqueta de release, si se usa;
- resultados PASS/FAIL de cada gate;
- IDs sintéticos cuando sean necesarios para diagnóstico;
- navegador/SO usados en accesibilidad;
- incidencias encontradas y commit de corrección.

No guardar:

- cookies;
- passwords;
- tokens de reset;
- secretos;
- contenido real de documentos privados.

## Criterio de salida de staging

Staging V1 queda en **PASS** solo cuando todos estos bloques estén verdes:

1. host/contenedores;
2. HTTPS/seguridad;
3. recorrido funcional MVP sintético;
4. almacenamiento privado;
5. correo/reset;
6. backup/restore;
7. accesibilidad manual;
8. PWA/offline manual.

El issue #7 solo debe cerrarse cuando exista evidencia PASS de los ocho bloques.

Después de ese PASS se puede iniciar la validación con 2–5 olivareros usando todavía datos sintéticos o documentos anonimizados. Los datos reales siguen siendo un paso posterior y controlado.

## Referencias

- PR #6 — integración Visual V2 + MVP Core.
- issue #7 — checklist operativo P0 de staging.
- `docs/spike/EXTERNAL_STAGING_RUNBOOK.md` — procedimiento de ejecución externo.
- `docs/INTEGRATION_V2_MVP_V1.md` — contrato de autoridad visual/funcional.
