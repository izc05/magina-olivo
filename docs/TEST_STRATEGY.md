# Estrategia de pruebas V1 — Mágina Olivo

Fecha: 2026-09-02

## Objetivo

Proteger lo que realmente importa: que el agricultor no pierda datos, no vea datos de otra explotación y no reciba cálculos incorrectos o duplicados después de una sincronización/importación.

## Pirámide

### 1. Unit tests — dominio puro

Sin HTTP ni BD cuando no sean necesarios.

Prioridad máxima:
- suma de kilos válidos;
- rendimiento ponderado por kilos;
- entregas sin resultado;
- comparativas de campaña;
- reglas de fechas;
- dedup keys;
- normalización de importaciones;
- cambios de estado permitidos;
- reglas de permisos puras.

Ejemplo rendimiento ponderado:

`(kg1*r1 + kg2*r2) / (kg1 + kg2)`

Solo incluir entregas/resultados comparables según reglas documentadas.

### 2. Integration tests — PostgreSQL/API

Ejecutar contra una BD de pruebas real/migrada.

Casos:
- migraciones desde cero;
- constraints;
- transacciones;
- autorización por holding;
- idempotencia;
- upload metadata;
- import staging;
- jobs/outbox;
- optimistic concurrency.

### 3. Contract tests — adapters

Para AEMET, RAIF, SIGPAC y proveedores futuros.

Usar fixtures versionados y públicos/anonimizados.

No hacer depender toda CI de disponibilidad en vivo de terceros.

Tests en vivo separados y con frecuencia prudente para detectar cambio de contrato.

### 4. E2E — flujos de oro

Automatizar navegadores principales cuando el frontend exista.

Flujos mínimos:

#### E1 — primera campaña
- registro/login;
- crear explotación;
- crear finca/parcela;
- crear campaña;
- registrar entrega;
- ver kilos.

#### E2 — resultado posterior
- abrir entrega pendiente;
- añadir rendimiento;
- comprobar media ponderada.

#### E3 — labor
- crear poda/observación;
- verla en timeline de parcela.

#### E4 — documento
- subir ticket;
- asociarlo;
- usuario autorizado lo abre;
- otro usuario recibe 403/404 seguro.

#### E5 — offline
- cortar red;
- crear entrega;
- cerrar/abrir;
- recuperar red;
- sincronizar;
- existe exactamente una entrega.

#### E6 — importación
- subir CSV fixture;
- preview;
- detectar duplicado;
- confirmar;
- procedencia conservada.

## Tests de autorización obligatorios

Crear dos explotaciones A y B y al menos dos usuarios.

Probar para cada endpoint privado:
- miembro autorizado A -> permitido según rol;
- usuario B -> rechazado;
- ID aleatorio/existente de B -> no filtrar datos sensibles en error;
- viewer -> no puede escribir;
- collaborator -> solo permisos documentados;
- owner -> operaciones de administración permitidas.

No considerar suficiente ocultar botones en frontend.

## Idempotencia

Tests explícitos:

1. misma key + mismo payload -> mismo resultado lógico;
2. misma key + payload distinto -> conflicto/error seguro;
3. petición procesada pero respuesta perdida -> retry no duplica;
4. dos requests concurrentes misma key -> una escritura;
5. expiración/retención de keys documentada.

Especialmente para:
- entrega offline;
- labor offline;
- import confirm;
- upload confirm.

## Cálculos agrícolas

### Kilos de campaña

Testear:
- entrega válida;
- anulada/archivada;
- edición de kilos;
- varias almazaras;
- entrega sin parcela;
- pendiente offline no incluida en agregado servidor.

### Rendimiento

Testear:
- ponderado por kilos;
- resultado ausente;
- resultado cero válido si negocio lo admite;
- edición posterior;
- varias muestras/resultados si se extiende modelo;
- redondeo solo en presentación, no antes del cálculo.

## Archivos

- MIME permitido/no permitido;
- tamaño máximo;
- extensión engañosa;
- hash esperado;
- upload interrumpido;
- objeto huérfano;
- autorización de descarga;
- nombre original con caracteres especiales;
- no ejecutar contenido activo servido como documento confiable.

## Offline / IndexedDB

- migraciones de esquema local;
- outbox sobrevive reload;
- logout limpia caché privada;
- actualización de app no pierde pendientes;
- orden de reintentos;
- conflicto de edición;
- falta de Background Sync;
- cuota/errores de almacenamiento local tratados.

## Importadores

Todo parser debe probar:
- fichero válido;
- columnas reordenadas;
- encoding inesperado razonable;
- decimal `21,7` y `21.7` cuando formato lo permita;
- miles/decimales ambiguos -> staging, nunca suposición destructiva;
- fecha inválida;
- kilos negativos/cero según regla;
- duplicado exacto;
- posible duplicado;
- fila parcial;
- fichero grande dentro de límite;
- schema desconocido -> rechazo explicable.

## Seguridad

Antes de piloto:
- rate limit básico auth;
- sesiones revocadas;
- CSRF según auth final;
- CORS/origins;
- headers de seguridad;
- validación server-side;
- SQL injection cubierta por parametrización;
- path traversal imposible en storage keys;
- secrets ausentes de bundle frontend/logs.

## Accesibilidad funcional

Además del trabajo visual:
- navegación por teclado en web;
- labels de formularios;
- errores asociados a campos;
- foco tras errores/modales;
- estado offline no comunicado solo por color;
- tamaño de target razonable;
- texto escalable.

## Performance piloto

Medir, no optimizar a ciegas.

Objetivos iniciales orientativos:
- API de escritura normal p95 < 500 ms en infraestructura piloto sin contar upload pesado/terceros;
- abrir dashboard con datos cacheables sin bloquear por AEMET/RAIF;
- ninguna llamada a fuente externa en el camino crítico de guardar una entrega.

## CI

En cada PR técnico:
- lint/format check;
- typecheck;
- unit tests;
- integration tests con PostgreSQL efímero;
- migración desde cero;
- build web/API;
- escaneo básico de secretos/dependencias según tooling elegido.

E2E puede crecer progresivamente, pero el flujo de entrega debe entrar pronto.

## Datos de test

Solo sintéticos o anonimizados.

Seed mínimo reutilizable:
- usuario owner A;
- usuario viewer A;
- usuario owner B;
- explotación A/B;
- fincas/parcelas;
- campaña activa;
- entregas con/sin resultado;
- documentos dummy.

## Gates antes de piloto

- [ ] 100 % endpoints privados con tests cross-holding relevantes;
- [ ] cálculos de campaña cubiertos;
- [ ] idempotencia de entrega cubierta;
- [ ] flujo offline E2E pasa;
- [ ] upload privado pasa;
- [ ] restore test pasa;
- [ ] no hay secretos en frontend/repositorio;
- [ ] migraciones desde cero pasan;
- [ ] import fixture genérico pasa;
- [ ] pruebas manuales en al menos Android + iOS/Safari o dispositivo equivalente disponibles.

## Filosofía

No perseguir cobertura porcentual como único objetivo.

Una rama con 95 % coverage puede seguir siendo insegura si no prueba aislamiento entre explotaciones, reintentos y restauración. Priorizar riesgos del producto.