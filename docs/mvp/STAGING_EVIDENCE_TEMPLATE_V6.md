# Mágina Olivo — Plantilla de evidencia Staging V6

Plantilla auxiliar para issue #7. **No forma parte del candidato desplegable.**

Candidato obligatorio:

```text
staging/candidate-v6-2026-09-04
33dda6be7f74d9ffc33761177ed5ca3105bd492d
```

No incluir nunca passwords, cookies, API keys, tokens de Tunnel/Access, tokens de reset, URLs sensibles ni documentos reales.

---

## Cabecera de ejecución

```text
Fecha/hora inicio:
Fecha/hora fin:
Operador:
Host/SO:
Arquitectura:
Docker Engine:
Docker Compose:
Hostname staging:
Release label:
expected_source_sha:
checkout_source_sha:
source_sha desplegado:
Municipio AEMET del gate:
Resultado global: INCOMPLETE | PASS | FAIL
```

Regla: los tres SHA deben ser exactamente:

```text
33dda6be7f74d9ffc33761177ed5ca3105bd492d
```

---

## 1. Host y contenedores

```text
Estado: PENDING | PASS | FAIL
mini-pc-readiness: PASS/FAIL
preflight: PASS/FAIL
deploy-local: PASS/FAIL
PostgreSQL healthy: sí/no
API healthy: sí/no
Worker running: sí/no
Web running: sí/no
Web bind: 127.0.0.1:8088 / otro
PostgreSQL host port: ninguno / incidencia
API host port: ninguno / incidencia
Worker host port: ninguno / incidencia
R2 roundtrip incluido en deploy-local: PASS/FAIL
Incidencia:
Commit correctivo, si existe:
```

Evidencia admisible: salida PASS resumida, versiones, SHA y estado de contenedores sin secretos.

---

## 2. HTTPS y seguridad

```text
Estado: PENDING | PASS | FAIL
Hostname HTTPS:
TLS válido: sí/no
HSTS: sí/no
Cookie HttpOnly: sí/no
Cookie Secure: sí/no
SameSite=Lax: sí/no
API privada no-store: sí/no
Origen hostil rechazado: sí/no
Logout revoca sesión: sí/no
Bundle sin secretos: sí/no
staging-https-gate: PASS/FAIL
Incidencia:
Commit correctivo, si existe:
```

No pegar cookies ni cabeceras que contengan valores de sesión.

---

## 3. Recorrido privado sintético

```text
Estado: PENDING | PASS | FAIL
mvp-core-flow-gate: PASS/FAIL
Usuario sintético A ID, si hace falta:
Usuario sintético B ID, si hace falta:
Aislamiento entre usuarios: PASS/FAIL
Explotación -> finca -> parcela -> campaña: PASS/FAIL
Entrega 1.842 kg: PASS/FAIL
Idempotencia entrega: PASS/FAIL
Rendimiento 21,9 %: PASS/FAIL
Labor poda retry-safe: PASS/FAIL
Timeline: PASS/FAIL
Resumen 1.842 kg / 100 % / 21,9 %: PASS/FAIL
Ticket PDF roundtrip: PASS/FAIL
Acceso cruzado bloqueado: PASS/FAIL
Incidencia:
Commit correctivo, si existe:
```

Usar únicamente IDs y datos sintéticos creados por el gate.

---

## 4. Mágina pública y fuentes

```text
Estado: PENDING | PASS | FAIL
staging-public-magina-gate: PASS/FAIL
/magina: PASS/FAIL
/magina/tiempo: PASS/FAIL
/magina/campo: PASS/FAIL
/magina/noticias: PASS/FAIL
/magina/mercado: PASS/FAIL
/magina/directorio: PASS/FAIL
AEMET municipio:
AEMET modo live/cache/degraded-cache:
AEMET frescura: PASS/FAIL
RAIF procedencia/frescura: PASS/FAIL
Noticias metadatos + fuente original: PASS/FAIL
Mercado metadatos/verificación: PASS/FAIL
Directorio procedencia/revisión: PASS/FAIL
Separación público/privado: PASS/FAIL
Incidencia:
Commit correctivo, si existe:
```

---

## 5. Almacenamiento privado

```text
Estado: PENDING | PASS | FAIL
Bucket activo (nombre, no credenciales):
staging-r2-gate: PASS/FAIL
PUT: PASS/FAIL
GET: PASS/FAIL
SHA-256: PASS/FAIL
DELETE: PASS/FAIL
GET posterior rechazado: PASS/FAIL
Bucket confirmado privado: sí/no
Incidencia:
Commit correctivo, si existe:
```

No guardar Access Key ID ni Secret Access Key en la evidencia.

---

## 6. Correo y recuperación

```text
Estado: PENDING | PASS | FAIL
Proveedor: Resend / otro permitido
Dominio/subdominio verificado: sí/no
Buzón sintético usado: [descripción no sensible]
Respuesta anti-enumeración: PASS/FAIL
Recepción real: PASS/FAIL
Token un solo uso: PASS/FAIL
Nueva contraseña válida: PASS/FAIL
Sesiones antiguas revocadas: PASS/FAIL
Logs sin URL/token sensible: PASS/FAIL
Incidencia:
Commit correctivo, si existe:
```

No escribir email/password/token reales en esta plantilla compartida.

---

## 7. Backup y restore

```text
Estado: PENDING | PASS | FAIL
Destino realmente off-host: sí/no
Backup: PASS/FAIL
Bundle ID/nombre:
application_source_sha:
Checksums backup: PASS/FAIL
Restore DB aislada: magina_restore_validation / otra
Restore bucket aislado (nombre):
Restore PostgreSQL: PASS/FAIL
Restore metadatos: PASS/FAIL
Restore objetos privados: PASS/FAIL
Manifiesto relacional: PASS/FAIL
Checksums restore: PASS/FAIL
Copia restaurada utilizable: PASS/FAIL
Incidencia:
Commit correctivo, si existe:
```

Backup sin restore exitoso = bloque FAIL/INCOMPLETE, nunca PASS.

---

## 8. Accesibilidad manual

```text
Estado: PENDING | PASS | FAIL
Desktop navegador/SO:
Móvil navegador/SO:
Teclado completo: PASS/FAIL
TalkBack + Chrome Android: PASS/FAIL/NA
NVDA + navegador desktop: PASS/FAIL/NA
Zoom 200 % / reflow: PASS/FAIL
prefers-reduced-motion: PASS/FAIL
Foco visible: PASS/FAIL
Navegación activa anunciada: PASS/FAIL
Adjuntar ticket sin ratón: PASS/FAIL
Incidencia:
Commit correctivo, si existe:
```

Seguir `docs/mvp/ACCESSIBILITY_GATE_V1.md` del candidato V6.

---

## 9. PWA / offline manual

```text
Estado: PENDING | PASS | FAIL
Dispositivo/SO:
Navegador/PWA:
Instalación PWA: PASS/FAIL
Login online: PASS/FAIL
Corte de red: realizado
Entrega offline: PASS/FAIL
Labor offline: PASS/FAIL
Pendientes visibles por tipo: PASS/FAIL
Cierre/reapertura offline: PASS/FAIL
Modo protegido: PASS/FAIL
Outbox conservada: PASS/FAIL
Recuperación de red: PASS/FAIL
Revalidación de sesión: PASS/FAIL
Sync/reintento: PASS/FAIL
Una sola entrega servidor: PASS/FAIL
Una sola labor servidor: PASS/FAIL
Timeline actualizado: PASS/FAIL
Logout bloqueado con pendientes: PASS/FAIL
Logout permitido tras sync: PASS/FAIL
Fallo de sync no borra outbox: PASS/FAIL
Ticket no prometido offline antes de upload: PASS/FAIL
Incidencia:
Commit correctivo, si existe:
```

---

## Resumen para issue #7

```text
Staging V6 — resultado
SHA: 33dda6be7f74d9ffc33761177ed5ca3105bd492d

1. Host/contenedores: PASS | FAIL | PENDING
2. HTTPS/seguridad: PASS | FAIL | PENDING
3. Recorrido privado sintético: PASS | FAIL | PENDING
4. Mágina pública/fuentes: PASS | FAIL | PENDING
5. Almacenamiento privado: PASS | FAIL | PENDING
6. Correo/reset: PASS | FAIL | PENDING
7. Backup/restore: PASS | FAIL | PENDING
8. Accesibilidad: PASS | FAIL | PENDING
9. PWA/offline: PASS | FAIL | PENDING

Resultado global: PASS | FAIL | INCOMPLETE
Incidencias abiertas:
Commits correctivos:
```

Solo cerrar issue #7 cuando los nueve bloques estén en PASS sobre el mismo SHA trazable.