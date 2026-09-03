# Mágina Olivo — Staging Acceptance V1

Estado: **preparado para ejecución; requiere entorno externo real**.

Rama: `feat/mvp-core-v1`

## Objetivo

Convertir los P0 externos restantes en una secuencia reproducible. Ningún dato real de agricultor debe entrar en staging hasta completar esta aceptación con datos sintéticos.

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

Ejecutar los scripts ya preparados del spike técnico:

```bash
scripts/staging-host-preflight.sh
scripts/staging-container-gate.sh
```

No continuar si el host, red o contenedores no pasan.

### 2. HTTPS / seguridad pública

```bash
scripts/staging-https-gate.sh
```

Validar como mínimo:

- certificado válido;
- redirección HTTP -> HTTPS;
- cookies seguras;
- cabeceras de seguridad;
- API privada no cacheable;
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

Cuando staging utilice el proveedor externo definido:

```bash
scripts/staging-r2-gate.sh
```

Debe probar subida, descarga y borrado controlados sin exponer credenciales ni objetos públicamente.

### 5. Recuperación de contraseña / correo

Ejecutar el gate definido por el spike para recuperación y comprobar en el entorno real:

- petición genérica anti-enumeración;
- recepción de correo en buzón de pruebas;
- token válido una sola vez;
- contraseña nueva funcional;
- sesiones anteriores revocadas cuando corresponda;
- ninguna URL/token sensible en logs públicos.

### 6. Backup y restore

```bash
scripts/staging-backup.sh
scripts/staging-restore-gate.sh
```

Debe demostrarse que se recuperan conjuntamente:

- PostgreSQL;
- metadatos de documentos;
- objetos privados necesarios;
- relaciones entrega/rendimiento/labor/timeline.

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
14. comprobar que logout queda bloqueado mientras hay operaciones pendientes y vuelve a estar permitido tras sync.

## Evidencia que conservar

Para cada ejecución guardar únicamente evidencia no sensible:

- fecha/hora;
- commit SHA;
- versión desplegada;
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

Después de ese PASS se puede iniciar la validación con 2–5 olivareros usando todavía datos sintéticos o documentos anonimizados. Los datos reales siguen siendo un paso posterior y controlado.
