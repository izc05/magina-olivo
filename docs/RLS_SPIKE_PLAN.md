# PostgreSQL RLS — plan de spike para Mágina Olivo

Estado: defensa adicional a evaluar; no reemplaza autorización API.

## Por qué evaluarlo

Mágina Olivo es multi-tenant por `holding`.

El fallo de mayor impacto sería que una consulta mal filtrada devolviese datos de otra explotación.

PostgreSQL Row-Level Security permite restringir qué filas puede seleccionar/modificar un rol. Cuando RLS está habilitado y no existe una policy aplicable, PostgreSQL usa default-deny para el acceso normal a la tabla.

## Regla principal

Aunque RLS quede adoptado:

**API authorization + RLS defense-in-depth**

Nunca:

**RLS como única autorización de negocio**

La API sigue validando membership y rol para producir errores coherentes, controlar acciones y mantener independencia del mecanismo DB.

## Riesgos que hay que entender

PostgreSQL documenta que:
- superusers y roles con `BYPASSRLS` saltan RLS;
- el owner de tabla normalmente también puede saltarlo;
- `FORCE ROW LEVEL SECURITY` puede obligar al owner en ciertos contextos;
- PK/UNIQUE/FK pueden revelar indirectamente existencia mediante errores porque integridad referencial no se filtra igual que SELECT;
- backups deben evitar quedar silenciosamente filtrados por RLS.

Por ello no basta con `ENABLE ROW LEVEL SECURITY` y darlo por seguro.

## Roles DB candidatos

### migration_owner

- dueño de schemas/tablas;
- solo migraciones/administración;
- no usado por API normal.

### app_runtime

- conexión de API/worker;
- sin `BYPASSRLS`;
- no owner de tablas;
- permisos mínimos SELECT/INSERT/UPDATE/DELETE necesarios.

### backup_role

- específico para backup;
- procedimiento probado para no omitir filas por RLS.

No usar superuser para runtime.

## Contexto de petición

Problema: todos los usuarios web pueden compartir un único rol DB de pool.

Solución candidata: establecer contexto transaccional de aplicación de forma segura para cada request, por ejemplo variables de configuración locales a la transacción que representen:
- `app.user_id`;
- `app.holding_id`;
- rol efectivo.

La policy consulta ese contexto mediante función controlada.

### Requisito crítico

El contexto debe ser **transaction-local** y resetearse automáticamente.

Nunca dejar un `SET` de sesión persistente en un pool, porque el siguiente request podría heredar el holding anterior.

El spike debe probar explícitamente pooling/reutilización de conexiones.

## Función de contexto

Si se crea una helper SQL para leer contexto:
- schema no escribible por usuarios no confiables;
- owner controlado;
- `search_path` seguro;
- sin SQL dinámico;
- evitar `SECURITY DEFINER` salvo necesidad y revisión.

PostgreSQL advierte que funciones/policies pueden introducir riesgos si objetos no confiables entran en `search_path`.

## Policy base candidata

Para tablas con `holding_id` directo:

```sql
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY deliveries_holding_policy
ON deliveries
USING (holding_id = app_current_holding_id())
WITH CHECK (holding_id = app_current_holding_id());
```

Es pseudodiseño: el spike debe implementar la función/contexto de forma segura.

## Tablas con holding derivado

Ejemplo:
- `plot_varieties` deriva holding por `plot -> farm -> holding`.

Opciones:
1. policy con EXISTS/join;
2. duplicar `holding_id` como denormalización controlada;
3. no RLS en tablas satélite y acceso solo vía relaciones protegidas.

Criterio: integridad + rendimiento + sencillez.

No duplicar `holding_id` sin constraints/triggers/proceso que impida divergencia.

## Directorio público

`cooperatives` no necesita la misma RLS por holding porque es directorio público/administrado.

Pero escrituras administrativas deben estar separadas del rol normal.

## Auth tables

No aplicar automáticamente las mismas policies del dominio a tablas internas de Better Auth.

El proveedor de auth tiene su propio modelo de acceso; mantener separación.

## Jobs/worker

Un worker puede operar sobre múltiples holdings.

No resolverlo otorgando `BYPASSRLS` por comodidad sin análisis.

Alternativas:
- worker procesa cada job dentro de contexto holding específico;
- rol privilegiado separado solo para jobs globales controlados;
- stored procedures/servicio administrativo muy limitado.

Toda excepción debe quedar explícita y testeada.

## Importaciones

`import_batches` y staging llevan `holding_id`.

RLS debe impedir:
- preview batch de otro holding;
- commit cruzado;
- asociación de documento de otro holding.

## Documentos

Metadata en PostgreSQL puede usar RLS.

Object storage sigue necesitando autorización separada antes de emitir URL firmada.

RLS en metadata no convierte automáticamente el bucket en privado.

## Constraints y covert channels

Ejemplo potencial:
- un `ticket_number` global UNIQUE podría revelar que ya existe un valor de otro holding mediante error.

Regla:
- constraints únicas privadas deben incluir scope tenant cuando semánticamente corresponda.

Ejemplo:
`UNIQUE(holding_id, client_generated_id)`

No diseñar identificadores privados como globalmente únicos si no lo exige el dominio.

## Backups

PostgreSQL advierte que RLS puede provocar backups incompletos si se ejecutan bajo un contexto filtrado.

Spike obligatorio:
- backup total con rol/procedimiento previsto;
- verificar recuentos de ambos holdings;
- restore;
- confirmar que A+B existen tras restaurar;
- runtime normal sigue viendo solo su holding.

## Tests P0

Crear A y B con datos equivalentes.

### SELECT
- [ ] app A solo recibe A.
- [ ] consulta sin filtro explícito en código sigue protegida por RLS.
- [ ] app B solo recibe B.

### INSERT
- [ ] A no puede insertar fila con holding B.

### UPDATE
- [ ] A no puede cambiar una fila A para convertirla en holding B.

### DELETE
- [ ] A no puede borrar B.

### Pool leakage
- [ ] request A usa conexión;
- [ ] request B reutiliza pool;
- [ ] B jamás hereda contexto A.

### Missing context
- [ ] request runtime sin holding context falla/default-deny.

### Owner/bypass
- [ ] runtime role no es owner/BYPASSRLS.

### Backup
- [ ] backup no queda filtrado.

## Performance

Medir EXPLAIN en:
- deliveries por campaña;
- timeline parcela;
- dashboard campaña;
- documentos;
- tasks.

Policies no deben provocar joins costosos evitables en todas las consultas.

Si RLS añade complejidad o rendimiento inaceptable, documentar decisión de no adoptarlo y reforzar tests/arquitectura API.

## Criterios para ADOPTAR

Adoptar RLS V1 si:
- pool/contexto es seguro;
- policies son comprensibles;
- migraciones/test son mantenibles;
- backup queda resuelto;
- rendimiento aceptable;
- worker/jobs no requieren bypass general peligroso.

## Criterios para RECHAZAR/APLAZAR

Aplazar si:
- el mecanismo de contexto es propenso a fugas;
- obliga a runtime privilegiado;
- hace demasiado complejo worker/import;
- genera una falsa sensación de seguridad sin tests robustos.

Si se aplaza, siguen siendo obligatorios:
- queries scoped por holding;
- service authorization;
- tests cross-holding;
- IDs/documentos privados.

## Referencia

PostgreSQL 18 — Row Security Policies:
https://www.postgresql.org/docs/18/ddl-rowsecurity.html
