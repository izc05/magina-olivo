# Mágina Olivo — Mapa Maestro de Funciones UX V3

Fecha: 2026-09-08
Estado: decisión de arquitectura de información post-staging
Base: `staging/candidate-v11-2026-09-05` @ `063767560fe824c3415f200e0314dc5b2e8f4122`

> Objetivo: asignar **un hogar principal** a cada función actual o prevista para evitar duplicidades, menús crecientes y pantallas aisladas.

## 1. Regla de producto

Ninguna nueva función obtiene automáticamente una nueva pestaña o pantalla principal.

Antes de crear una pantalla nueva, resolver en este orden:

1. ¿Cabe en `Inicio` como información accionable?
2. ¿Pertenece a `Mi Campo` o a una `Parcela` concreta?
3. ¿Es una acción que debe entrar por `+`?
4. ¿Pertenece a `Campaña`?
5. ¿Debe vivir en `Más` como función secundaria?
6. ¿Es contenido público de Mágina?
7. Solo si ninguna respuesta encaja, justificar una pantalla nueva.

## 2. Navegación privada V3

```text
Inicio | Mi Campo | + | Campaña | Más
```

### Inicio
Debe responder: `¿Qué necesito saber o hacer hoy?`

### Mi Campo
Debe responder: `¿Cómo están mis parcelas y dónde tengo que mirar?`

### +
Debe responder: `¿Qué quiero registrar ahora?`

### Campaña
Debe responder: `¿Cómo va la recolección y qué he entregado?`

### Más
Debe contener capacidades secundarias, administrativas o de consulta profunda.

## 3. Mapa maestro

| Función | Hogar principal V3 | Acceso secundario | Regla UX |
|---|---|---|---|
| Explotaciones/holdings | Más > Explotación | selector contextual | no mostrar si solo existe una |
| Fincas | Mi Campo | Datos parcela | no obligar a navegar por finca para llegar a parcela |
| Parcelas | Mi Campo | Inicio recomendado | objeto central privado |
| Mapa de parcelas | Mi Campo | Ficha parcela | primera representación visual |
| Ortofoto PNOA | Parcela / alta Map First | capas | no convertir en módulo propio |
| Catastro | Añadir parcelas / Datos parcela | capas mapa | fuente, no destino de navegación |
| SIGPAC | Añadir parcelas / Datos parcela | capas mapa | fuente/contexto, no módulo propio |
| Referencia catastral | Datos parcela | alta parcela | dato avanzado |
| Polígono/parcela | Datos parcela | búsqueda Map First | no exigir si mapa resuelve alta |
| Recintos SIGPAC | Datos parcela | capas | detalle avanzado |
| Variedad | Datos parcela | edición rápida | opcional en alta |
| Secano/regadío | Datos parcela | edición rápida | opcional en alta |
| Nº olivos | Datos parcela | edición rápida | opcional |
| Labores | Parcela > Actividad | + Trabajo | timeline como lectura, + como escritura |
| Tratamientos | + Trabajo | Parcela > Actividad | campos avanzados solo si tipo=tratamiento |
| Poda | + Trabajo | Actividad | acción rápida |
| Desbroce | + Trabajo | Actividad | acción rápida |
| Abonado | + Trabajo | Actividad | acción rápida |
| Riego | + Trabajo | Actividad | acción rápida |
| Recolección | + Trabajo | Campaña | no duplicar lógica con entrega |
| Observaciones | + Observación | Parcela > Actividad | foto opcional |
| Incidencias | + Observación | Inicio/Avisos | prioridad si requiere atención |
| Tareas | + Tarea | Más > Calendario | Inicio muestra solo pendientes relevantes |
| Calendario | Más > Calendario | Inicio / Parcela | vista completa secundaria |
| Recordatorios | Inicio | Más > Calendario/Avisos | solo mostrar si accionables |
| Entregas | Campaña | + Entrega | formulario rápido reutilizable |
| Rendimientos | Campaña | entrega concreta | permitir añadir después |
| Tickets | + Documento / + Entrega | Campaña > Documentos | vincular sin duplicar archivo |
| Documentos | Más > Documentos | Parcela/Campaña | biblioteca global secundaria |
| PDF campaña | Campaña > Informe | Más > Informes | generado desde datos existentes |
| Informe por parcela | Parcela > Informe | Más > Informes | contextual |
| Costes | Parcela / Campaña | Más > Costes | no ocupar nav principal |
| Beneficio estimado | Campaña | informes | solo cuando haya base de datos suficiente |
| Comparativa campañas | Campaña | informes | secundaria |
| Meteorología | Mágina pública > Tiempo | Inicio / Parcela | privado muestra resumen contextual, no duplica app del tiempo |
| Alerta de lluvia | Inicio/Avisos | Parcela | priorizada por relevancia |
| Viento/helada | Inicio/Avisos | Tiempo | solo si relevante |
| RAIF | Mágina pública > Sanidad/Alertas | Inicio/Parcela | contexto oficial; no diagnóstico |
| Mosca del olivo | Inicio/Parcela | RAIF público | mostrar riesgo/contexto, no prescripción automática |
| Noticias | Mágina pública > Noticias | Inicio opcional | no dominar zona privada |
| Eventos | Mágina pública > Eventos | Inicio si muy relevante | contenido local |
| Ayudas/subvenciones | Mágina pública > Ayudas | Inicio si vence pronto | filtrables por relevancia |
| Precio AOVE/mercado | Mágina pública > Mercado | Inicio resumen | gráfica detallada fuera de zona privada |
| Cooperativas/almazaras | Mágina pública > Directorio | Campaña / Más > Mis cooperativas | separar público de datos privados |
| Mi campaña en cooperativa | ficha cooperativa privada | Campaña | solo datos del usuario |
| Horarios cooperativa | Directorio público | Inicio si relevante | fuente y fecha visibles |
| Importar URL contenido | Admin | no usuario final | Content Center |
| RSS/API noticias | Worker/Admin | no usuario final | automatización editorial |
| Publicidad | Admin/espacios públicos | no mezclar con contenido editorial | etiquetado claro |
| Mágina IA | Más > Mágina IA | contexto en parcela/+ | no necesita tab principal |
| Foto de hoja/olivo | + Observación / Mágina IA | Parcela | guardar incidencia tras confirmación |
| Lectura ticket IA | + Entrega / Importar | Campaña | IA prepara borrador, usuario confirma |
| Preguntas sobre campaña | Mágina IA | Campaña | respuestas con datos privados autorizados |
| Familia/cuadrilla | Más | compartir tareas | posterior; no crear nav principal |
| Roles/permisos | Más > Explotación | invitaciones | admin funcional |
| Mis Aceitunas | Más > Mis Aceitunas | Inicio como progreso discreto | gamificación, nunca obstaculizar trabajo |
| Minijuego olivo | Mis Aceitunas | campañas promocionales | totalmente secundario |
| Recompensas | Mis Aceitunas | promociones | reglas transparentes |
| Negocios cercanos | Mágina pública > Cerca de ti | mapas/directorio | no mezclar con Mi Campo |
| Pueblos/hero local | Mágina pública | selector localidad | identidad visual, no lógica privada |
| Repositorio imágenes pueblos | Admin/content assets | hero público | derechos de uso controlados |
| Imágenes almazaras | Directorio | ficha entidad | verificar derechos/procedencia |
| Contacto | Público > Contacto | Más | visible sin cuenta |
| Legal/privacidad | Público footer / Más | onboarding | siempre accesible |
| Cuenta Google | Acceso | Más > Cuenta | método de autenticación, no módulo |
| Perfil | Más | avatar/cabecera | datos mínimos |
| Preferencias alertas | Más > Ajustes | Avisos | granular |
| Exportar datos | Más > Privacidad/Datos | informes | cumplir trazabilidad y portabilidad |
| Eliminar cuenta | Más > Privacidad | — | flujo seguro y explícito |
| Offline/PWA | transversal | estados UI | capacidad, no pantalla principal |
| Sincronización pendiente | indicador global | Más/estado sync | visible cuando exista cola |
| Backups | Operación/admin | no usuario normal | documentado operativamente |
| Admin | `/admin` separado | — | no mezclar con navegación agricultor |
| Content Center | Admin | — | separado de publicidad |

## 4. Regla de contexto de parcela

Al abrir una parcela, mantener `plotId` como contexto mientras el usuario navega por:

```text
Resumen -> Actividad -> Cosecha -> Datos -> Documentos -> +
```

El botón `+` hereda ese contexto.

Ejemplo:

```text
Parcela Norte -> + -> Trabajo
Parcela Norte ya aparece seleccionada
Fecha/hora = ahora
```

No volver a pedir información ya conocida.

## 5. Regla de duplicidad

Una función puede aparecer en varios lugares solo si tiene **una función diferente** en cada uno:

- `Tiempo público`: consulta detallada.
- `Tiempo en Inicio`: resumen accionable.
- `Tiempo en Parcela`: contexto hiperlocal.

Nunca mantener tres implementaciones independientes del mismo dato. Usar una fuente/servicio y distintas vistas.

## 6. Público vs privado

### Público sin registro

```text
Mágina
├─ Inicio
├─ Tiempo
├─ Mercado
├─ Noticias
├─ Eventos/Ayudas
├─ RAIF/Sanidad vegetal
├─ Cooperativas/Almazaras
├─ Cerca de ti
└─ Contacto/Legal
```

### Privado con cuenta

```text
Mi Mágina
├─ Inicio
├─ Mi Campo
├─ +
├─ Campaña
└─ Más
```

Nunca hacer que una consulta pública exija cuenta salvo causa jurídica/técnica real.

## 7. Admin separado

```text
Admin
├─ Contenido
├─ Directorio
├─ Imágenes/activos
├─ Publicidad
├─ Usuarios/soporte permitido
├─ Configuración de fuentes
└─ Estado operativo
```

La automatización editorial nunca debe poder aprobar publicidad ni escribir datos privados de agricultores.

## 8. Criterio para nuevas ideas

Cada nueva idea debe incorporarse a esta tabla antes de tocar código.

Plantilla:

```text
Función:
Usuario objetivo:
Hogar principal:
Acceso secundario:
¿Requiere nueva pantalla?: sí/no + justificación
Datos que reutiliza:
Datos nuevos:
Offline:
Privacidad:
Estado vacío/error:
Tests:
```

## 9. Objetivo final

Aunque Mágina Olivo tenga decenas de capacidades, el usuario debe percibir solo este patrón:

```text
Miro mi campo
-> entiendo qué pasa
-> hago algo
-> lo registro
-> Mágina guarda y ordena todo
```
