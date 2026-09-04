# Mágina Olivo — Rotación AEMET OpenData / Staging

Documento auxiliar operativo. No contiene ni debe contener API Keys reales.

## Política vigente comprobada (septiembre de 2026)

AEMET OpenData indica que:

- las API Keys antiguas emitidas sin fecha de expiración dejarán de ser válidas el **15 de octubre de 2026**;
- las API Keys nuevas tienen una validez de **3 meses** desde su generación;
- puede generarse una nueva clave antes de que expire la anterior;
- existe un límite general de **40 consultas por minuto** para toda la API, sin perjuicio de límites adicionales de recursos concretos.

Referencia oficial:

- https://opendata.aemet.es/centrodedescargas/faqs
- https://opendata.aemet.es/centrodedescargas/novedades

## Regla para Mágina Olivo

Usar una clave dedicada al entorno de staging y no reutilizar una clave antigua indefinida.

La clave vive únicamente en:

```text
/etc/magina-olivo/staging.env
```

como:

```dotenv
AEMET_API_KEY=<secreto>
```

Nunca incluirla en:

- Git;
- GitHub Actions públicas;
- variables `VITE_*`;
- issues;
- capturas;
- documentos de evidencia;
- logs públicos.

## Evidencia permitida

Podemos registrar sin secreto:

```text
AEMET key created_at=<fecha>
AEMET key expires_at=<fecha estimada/indicada>
AEMET key environment=staging
AEMET key status=active|rotation_due|rotated
```

## Rotación

Antes de la fecha de caducidad:

1. generar una nueva API Key desde AEMET OpenData;
2. sustituir únicamente `AEMET_API_KEY` en el fichero externo de staging;
3. no ejecutar `source` sobre el fichero;
4. redeploy/restart controlado de la configuración;
5. ejecutar al menos el gate público meteorológico;
6. confirmar que no aparece `401 Unauthorized`;
7. actualizar únicamente la fecha de rotación en la evidencia.

## Gate mínimo tras rotación

Con staging operativo:

```bash
export STAGING_BASE_URL=https://<staging-host>
export STAGING_PUBLIC_WEATHER_MUNICIPALITY=bedmar-y-garciez
bash scripts/staging-public-magina-gate.sh
```

Si el gate completo externo se encuentra disponible, es preferible volver a ejecutar:

```bash
bash scripts/staging-acceptance.sh external
```

## Renovación preventiva

No esperar al último día. Programar la rotación con margen suficiente antes de los 3 meses de vigencia.

La fecha exacta debe calcularse a partir del día real de generación de la clave, que no se registra aquí hasta disponer del recurso externo.
