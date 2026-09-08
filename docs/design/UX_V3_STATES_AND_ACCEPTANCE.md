# Mágina Olivo — Estados, fallos y criterios de aceptación UX V3

Fecha: 2026-09-08
Estado: especificación de calidad post-staging

> Una pantalla no está terminada si solo funciona en el caso feliz.

## 1. Estados obligatorios por pantalla

Toda pantalla V3 debe definir y probar, cuando aplique:

1. `loading`
2. `loaded`
3. `empty`
4. `partial`
5. `error`
6. `offline`
7. `stale/cached`
8. `permission-denied`
9. `sync-pending`
10. `sync-conflict`

No usar un único spinner genérico para todos los estados.

## 2. Inicio

### Sin parcelas
Mostrar:

```text
Empieza creando tu campo
Añade tus parcelas y Mágina podrá mostrarte clima, actividad y avisos contextualizados.
[ Añadir parcelas ]
```

No mostrar tarjetas vacías de campaña/RAIF/costes.

### Sin campaña activa
Mostrar:

```text
Todavía no hay una campaña activa.
[ Preparar campaña 2026/27 ]
```

### Sin avisos
Mostrar estado positivo:

```text
Todo tranquilo por ahora.
No hay avisos importantes en tus parcelas.
```

### Tiempo no disponible
No bloquear Inicio. Sustituir tarjeta por:

```text
No hemos podido actualizar el tiempo.
[Reintentar]
```

El resto de Inicio sigue operativo.

### RAIF no disponible
No convertir ausencia de datos en `riesgo bajo`.
Mostrar `Sin datos RAIF actualizados`.

## 3. Mi Campo

### 0 parcelas
CTA único y claro: `Añadir mis primeras parcelas`.

### Mapa no carga
Mostrar lista completa de parcelas. Nunca dejar Mi Campo inutilizable por fallo de mapa.

### Lista no carga pero mapa sí
Mantener mapa y avisar que el detalle textual no está actualizado.

### Offline
Mostrar parcelas cacheadas si existen, con etiqueta:

```text
Sin conexión · mostrando datos guardados
```

No intentar verificar Catastro/SIGPAC offline.

## 4. Alta Map First

### Catastro caído
- mantener búsqueda manual/local si es posible;
- no crear geometría “oficial” falsa;
- permitir reintento;
- conservar selección temporal local si la sesión no se pierde.

### SIGPAC caído
Catastro puede seguir funcionando; SIGPAC no debe bloquear alta si no es obligatorio para el caso.

### PNOA/ortofoto caída
Usar mapa base; límites oficiales siguen siendo seleccionables.

### Duplicado
Mostrar:

```text
Esta parcela ya está añadida a tu explotación.
[ Abrir parcela ]
```

No crear duplicado silencioso.

### Geometría no verificable
No aceptar geometría enviada por navegador como autoridad.

## 5. Parcela

### Sin actividad

```text
Aún no has registrado trabajos en esta parcela.
[ + Registrar trabajo ]
```

### Sin datos de cosecha
No mostrar `0 kg` como si fuera dato confirmado cuando simplemente no existe asociación.
Usar `Sin datos de cosecha`.

### Sin recomendaciones

```text
No hay nada prioritario ahora mismo.
```

### Datos parciales
Mostrar solo indicadores disponibles; no llenar huecos con valores inventados.

## 6. + Registrar

### Sin parcela en contexto
Pedir destino solo cuando la acción lo requiera.

### Offline
Permitir las acciones contempladas por la política offline existente:
- trabajo;
- observación;
- entrega cuando el contrato actual lo soporte;
- tareas si está soportado.

Mostrar confirmación:

```text
Guardado en este dispositivo.
Se sincronizará cuando vuelva la conexión.
```

### Error al guardar
No vaciar el formulario. Conservar contenido y permitir reintento.

### Doble toque / reintento
Escrituras idempotentes o protegidas para evitar duplicados.

## 7. Campaña

### Sin entregas

```text
Aún no hay entregas en esta campaña.
[ + Registrar primera entrega ]
```

### Rendimiento pendiente
Nunca tratar como `0 %`.
Mostrar `Pendiente`.

### Entrega sin parcela
Válida. Mostrar `Origen sin asignar`.

### Documento fallido
Entrega se mantiene guardada si contrato lo permite; adjunto puede reintentarse por separado.

### Comparativa sin histórico
Ocultar comparación y explicar que aparecerá cuando exista otra campaña comparable.

## 8. Documentos

### Archivo demasiado grande/no soportado
Mensaje específico antes de subir cuando sea detectable.

### Importación dudosa
Siempre preview + campos reconocidos/no reconocidos + confirmación.

### Duplicado probable
Avisar, no bloquear automáticamente salvo regla determinista segura.

## 9. Alertas

Niveles semánticos:

- `info`: contexto;
- `attention`: conviene revisar;
- `important`: acción recomendada;
- `urgent`: riesgo/fecha inmediata con base verificable.

No usar rojo para cualquier novedad.

Toda alerta debe tener:
- motivo;
- fecha/hora o vigencia;
- parcela/zona si aplica;
- fuente cuando es externa;
- acción clara;
- posibilidad de ver detalle.

## 10. Datos públicos externos

Para tiempo, RAIF, mercado, noticias y directorio registrar en UI cuando sea relevante:
- fuente;
- última actualización;
- estado de frescura.

No presentar datos caducados como actuales.

## 11. Accesibilidad

Criterios mínimos por PR UI:
- navegación completa por teclado;
- foco visible;
- foco enviado al encabezado correcto al navegar;
- `aria-current` en navegación;
- labels reales en formularios;
- errores asociados al campo;
- target táctil amplio;
- contraste suficiente;
- no depender exclusivamente de color;
- mapa con alternativa lista;
- zoom de texto sin pérdida funcional;
- `prefers-reduced-motion` respetado para animaciones no esenciales.

## 12. Móvil de campo

Probar al menos:
- ancho estrecho equivalente a móvil pequeño;
- Android táctil;
- sol/alto contraste visual razonable;
- uso con una mano para acciones frecuentes;
- teclado numérico para kilos/rendimiento;
- botón guardar accesible sin desplazamiento absurdo.

## 13. Rendimiento percibido

No bloquear página completa esperando módulos secundarios.

Prioridad de carga:
1. estructura/navegación;
2. datos privados core;
3. acción prioritaria;
4. mapa/resumen;
5. fuentes públicas secundarias;
6. imágenes/ortofoto.

Usar skeletons solo cuando ayuden a entender estructura.

## 14. Criterios UX medibles

Objetivos iniciales:

| Flujo | Objetivo |
|---|---:|
| Abrir una parcela desde Mi Campo | <= 2 interacciones desde entrada |
| Registrar entrega manual normal | < 30 s |
| Registrar labor simple | < 45 s |
| Añadir rendimiento a entrega existente | < 15 s |
| Añadir primera parcela una vez localizada | flujo comprensible sin manual |
| Encontrar documentos de una parcela | <= 3 niveles |
| Volver a Inicio desde cualquier sección principal | 1 toque |
| Acceder a + Registrar | 1 toque en zona privada |

Los tiempos son objetivos de piloto, no assertions automáticos rígidos.

## 15. Criterio de aceptación por pantalla

Una pantalla V3 solo puede considerarse terminada cuando:

- respeta el wireframe funcional;
- funciona con datos reales del contrato actual;
- contempla empty/loading/error/offline aplicables;
- no rompe autorización;
- no rompe outbox/sync;
- tiene pruebas de interacción relevantes;
- se ha comprobado móvil estrecho;
- se ha comprobado teclado/foco;
- no duplica una fuente de verdad ya existente;
- no elimina una función V11 por simplificar UI.

## 16. Definition of Done global UX V3

La convergencia V3 estará completa cuando un usuario pueda:

```text
entrar
-> ver qué necesita atención
-> abrir su campo
-> elegir una parcela
-> comprender su estado
-> registrar una acción rápidamente
-> consultar campaña
-> encontrar funciones secundarias
```

sin necesitar conocer términos internos como adapters, holdings, WFS, outbox o estructura de tablas.
