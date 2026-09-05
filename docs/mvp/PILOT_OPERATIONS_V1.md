# Mágina Olivo — Pilot Operations V1

Estado: **preparado; no ejecutar antes de completar Staging Acceptance V1**.

Este runbook operacionaliza `docs/mvp/PILOT_PROTOCOL_V1.md` sin introducir nombres, correos reales ni datos agrícolas reales en la primera ronda.

## Regla de privacidad

La primera ronda usa participantes reales con **identidades de cuenta sintéticas**.

- identificar participantes solo como `p01` … `p05`;
- `PILOT_PARTICIPANT_NAME` debe ser un alias, no el nombre real;
- el email de cuenta debe usar por defecto `example.com`, `example.org` o `example.net`;
- no copiar credenciales a GitHub, chat, tickets, documentos compartidos ni hojas de resultados;
- no registrar DNI, teléfono, dirección, cooperativa personal, SIGPAC real, nombres de finca reales ni documentos reales;
- `.deploy/` está excluido de Git y contiene credenciales/evidencia local no publicable.

`PILOT_ALLOW_NON_SYNTHETIC_EMAIL=1` existe únicamente como escape explícito para una fase futura aprobada. No usarlo en la primera ronda.

## 1. Congelar la revisión

Antes de preparar participantes:

```bash
git status --short
git rev-parse HEAD
bash scripts/staging-acceptance.sh status
```

El `current_source_sha` desplegado debe ser exactamente la revisión que se va a observar durante toda la ronda.

No mezclar participantes de una misma ronda entre dos commits distintos.

## 2. Inicializar evidencia no sensible

Ejemplo para tres participantes:

```bash
export PILOT_RUN_ID=round-01
export PILOT_PARTICIPANT_IDS=p01,p02,p03
export STAGING_BASE_URL=https://<staging-hostname>
bash scripts/pilot-evidence-init.sh
```

Se crea:

```text
.deploy/pilot-evidence/round-01/
├── manifest.txt
├── results.csv
├── findings.csv
├── round-checks.csv
└── README.txt
```

El manifiesto conserva:

- ID de ronda;
- fecha UTC;
- SHA de código;
- hostname de staging;
- alias de participantes.

`round-checks.csv` obliga a cerrar explícitamente los criterios que no pueden deducirse solo de tiempos de tarea:

- pérdidas de datos;
- duplicados;
- accesos cruzados;
- comprensión Mercado ≠ liquidación;
- comprensión de fuente/fecha pública;
- bloqueos críticos de accesibilidad móvil.

No conserva identidad personal ni credenciales.

## 3. Crear una cuenta sintética limpia por participante

Ejemplo:

```bash
export STAGING_BASE_URL=https://<staging-hostname>
export PILOT_PARTICIPANT_ID=p01
export PILOT_PARTICIPANT_NAME='Piloto p01'
bash scripts/pilot-participant-setup.sh
```

El script:

1. exige HTTPS;
2. bloquea por defecto emails que no sean sintéticos;
3. comprueba `/health/ready`;
4. crea credenciales aleatorias;
5. verifica la identidad autenticada;
6. comprueba que la cuenta comienza con cero explotaciones privadas;
7. cierra la sesión del facilitador;
8. guarda las credenciales localmente con modo `0600` bajo `.deploy/pilot/`.

Si Cloudflare Access protege staging, usar también el service token de gate mediante `CF_ACCESS_CLIENT_ID` y `CF_ACCESS_CLIENT_SECRET`. Nunca guardar estos valores en Git.

## 4. Entrega de credenciales al participante

Mostrar o entregar las credenciales de su cuenta solo durante la sesión de prueba.

No incluir la contraseña en:

- `results.csv`;
- `findings.csv`;
- `round-checks.csv`;
- capturas destinadas a documentación;
- issue #7;
- PR #6;
- chat.

Tras la sesión, tratar esas credenciales como material temporal de staging.

## 5. Ejecución de tareas

Usar exactamente T1–T10 de `PILOT_PROTOCOL_V1.md`.

Para cada tarea añadir una fila a `results.csv` con:

```text
participant_id,task,completed,help,time_seconds,ui_error,technical_error,retry,confidence_1_5,severity,notes
```

Valores recomendados:

- `completed`: `yes` / `no`;
- `help`: `none` / `hint` / `guided`;
- `ui_error`: `yes` / `no`;
- `technical_error`: `yes` / `no`;
- `retry`: `yes` / `no`;
- `confidence_1_5`: `1`–`5`;
- `severity`: `none` / `P0` / `P1` / `P2`.

Las notas deben describir comportamiento observable, por ejemplo:

```text
Buscó Campaña dentro de Mi Campo durante 18 s antes de encontrar la pestaña.
```

No escribir:

```text
Juan Pérez, de la cooperativa X, no encontró...
```

## 6. Registro de hallazgos

Cada problema reproducible se añade a `findings.csv`:

```text
finding_id,participant_id,task,severity,area,summary,reproducible,blocking,fix_commit,status
```

Regla de decisión:

- `P0`: detiene la ronda para esa ruta y bloquea ampliación;
- `P1`: terminar la sesión si es seguro, pero corregir antes de ampliar piloto;
- `P2`: registrar y priorizar después de preservar los flujos centrales.

No convertir observaciones aisladas en cambios de producto sin comprobar si se repiten o si existe evidencia clara de fallo.

## 7. Offline

T10 debe ejecutarse después de las tareas online y con una cuenta que ya haya iniciado sesión correctamente.

Debe comprobarse:

```text
crear operación -> queda pendiente -> cerrar/reabrir -> recuperar red -> sincronizar -> aparece una sola vez
```

Un ticket/archivo privado no se considera guardado offline en V1 hasta que su subida online termine correctamente.

## 8. Cierre de una sesión

Antes de pasar al siguiente participante:

- comprobar que no queda una operación offline desconocida;
- registrar cualquier P0/P1;
- cerrar sesión;
- no reutilizar la cuenta para otro participante;
- no borrar evidencia técnica necesaria para reproducir un fallo;
- no conservar capturas con credenciales visibles.

## 9. Cierre de ronda y decisión automática

Antes de calcular el resultado, completar todos los valores de `round-checks.csv`.

Después ejecutar:

```bash
export PILOT_RUN_ID=round-01
node scripts/pilot-evidence-summary.mjs
```

El script genera localmente:

```text
summary.txt
summary.json
```

Y devuelve una de tres decisiones:

- `GO`: la evidencia completa alcanza los umbrales definidos;
- `NO-GO`: la ronda está completa pero falla al menos un criterio o existe P0;
- `INCOMPLETE`: faltan tareas, participantes o comprobaciones de ronda.

El cálculo aplica:

- ≥80 % de tareas centrales completadas sin ayuda;
- mediana entrega <30 s;
- mediana labor <45 s;
- mediana rendimiento <15 s;
- 0 pérdidas de datos;
- 0 duplicados;
- 0 accesos cruzados;
- 100 % entiende Mercado ≠ liquidación;
- 100 % identifica fuente/estado público;
- 0 bloqueos críticos de accesibilidad móvil;
- 0 hallazgos P0.

No alterar manualmente el resultado para convertir un `NO-GO` en `GO`. Si una regla necesita cambiarse, debe modificarse primero en el protocolo y en el script, con commit trazable.

## 10. Qué sí puede salir del directorio local de evidencia

Solo un resumen agregado y anonimizado, por ejemplo:

```text
Ronda 01 · SHA abc123
3 participantes
Tareas centrales sin ayuda: 87 %
Entrega mediana: 26 s
Labor mediana: 39 s
P0: 0
P1: 2
P2: 4
Decisión: corregir P1 antes de ampliar a ronda 02
```

Nunca publicar los archivos de credenciales de `.deploy/pilot/`.
