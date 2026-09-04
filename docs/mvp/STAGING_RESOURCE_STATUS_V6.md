# Mágina Olivo — Estado de recursos externos / Staging V6

Documento auxiliar de estado. No incluir secretos.

Candidato:

```text
33dda6be7f74d9ffc33761177ed5ca3105bd492d
```

## Estado inicial

| Recurso | Estado | Bloque que afecta | Nota |
| --- | --- | --- | --- |
| MiniPC Linux | PENDING | 1 | Requiere equipo real |
| Docker Engine + Compose v2 | PENDING | 1 | Se valida en `mini-pc-readiness.sh` |
| Hostname staging decidido | PENDING | 1/2 | Necesario antes de `preflight` |
| AEMET API Key nueva | PENDING | 4 | Necesaria antes de `preflight` |
| R2 habilitado | PENDING | 5 | Necesario antes de `preflight` |
| Bucket R2 activo | PENDING | 5 | Necesario para `deploy-local` |
| Credenciales S3 R2 | PENDING | 5 | Necesarias para `deploy-local` |
| Cloudflare Tunnel | PENDING | 2/3/4 | Puede crearse después de `deploy-local PASS` |
| Cuenta sintética | PENDING | 2/3 | Necesaria para gate externo |
| Resend dominio verificado | PENDING | 6 | Puede prepararse después del gate externo inicial |
| Resend Sending API key | PENDING | 6 | Solo para correo/reset |
| Destino backup off-host | PENDING | 7 | Solo antes del gate backup |
| Bucket restore-validation | PENDING | 7 | Solo antes del restore |
| Dispositivo accesibilidad | AVAILABLE/PENDING | 8 | Android TalkBack o NVDA desktop |
| Dispositivo PWA/offline | AVAILABLE/PENDING | 9 | Android/navegador PWA |

## Regla de actualización

Cambiar únicamente `PENDING` a `READY`, `PASS` o `FAIL` cuando exista evidencia real.

No guardar aquí:

- API keys;
- passwords;
- Access Key Secret;
- Tunnel tokens;
- Cloudflare Access service tokens;
- credenciales sintéticas;
- tokens de reset.

## Próximo estado objetivo antes del primer `preflight`

```text
MiniPC Linux = READY
Docker Engine + Compose v2 = READY
Hostname staging decidido = READY
AEMET API Key nueva = READY
R2 habilitado = READY
Bucket R2 activo = READY
Credenciales S3 R2 = READY
```

El resto puede permanecer PENDING en esa fase.
