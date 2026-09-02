# Wireframes móviles V1 — Mágina Olivo

Fecha: 2026-09-02
Estado: wireframe funcional, sin identidad visual final

## Convenciones

- `[ ]` campo/control
- `(+)` acción flotante
- `●` navegación activa
- las tarjetas se apilan verticalmente en móvil
- datos mostrados son ficticios

---

## 1. INICIO

```text
┌─────────────────────────────────┐
│ Mágina Olivo             🔔  2 │
│ Buenos días, Isi                │
│ Campaña 2026/27          ▾      │
├─────────────────────────────────┤
│ MI CAMPAÑA                      │
│                                 │
│  18.420 kg        21,4 %        │
│  entregados       rendimiento   │
│                                 │
│  12 entregas · 2 cooperativas   │
│  ↑ 8 % vs. campaña anterior     │
│                         Ver →   │
├─────────────────────────────────┤
│ HOY EN TU CAMPO                 │
│ 🌦 18° / 27°                    │
│ Lluvia mañana: 65 %             │
│                                 │
│ ⚠ Viento fuerte desde 16:00    │
│                         Ver →   │
├─────────────────────────────────┤
│ PENDIENTE                       │
│ 🫒 2 entregas sin rendimiento   │
│ 📋 Revisar parcela Las Viñas    │
├─────────────────────────────────┤
│ ÚLTIMA ACTIVIDAD                │
│ Ayer · Abonado · Las Viñas      │
│ 18 nov · Entrega · 1.842 kg     │
│ 17 nov · Foto · Parcela Norte   │
├─────────────────────────────────┤
│ + Entrega    + Labor            │
│ + Documento  + Tarea            │
└─────────────────────────────────┘
  ● Inicio  Campo  Campaña  Coop.  Más
```

### Intención

La primera pantalla no intenta enseñar todo el sistema. Prioriza:
1. campaña;
2. riesgo/aviso;
3. pendiente;
4. siguiente acción.

---

## 2. NUEVA ENTREGA

```text
┌─────────────────────────────────┐
│ ← Nueva entrega                 │
├─────────────────────────────────┤
│ KILOS                           │
│ ┌─────────────────────────────┐ │
│ │           1842              │ │
│ └─────────────────────────────┘ │
│                                 │
│ Cooperativa / almazara          │
│ [ San Sebastián             ▾ ] │
│                                 │
│ Fecha y hora                    │
│ [ Hoy · 18:42               ▾ ] │
│                                 │
│ Origen                          │
│ [ Las Viñas                 ▾ ] │
│ opcional                        │
│                                 │
│ Ticket                          │
│ [ Nº 004281                  ]  │
│                                 │
│ 📷 Añadir foto del ticket       │
│                                 │
│ + Añadir rendimiento ahora      │
│ + Más detalles                  │
│                                 │
│ ┌─────────────────────────────┐ │
│ │      GUARDAR ENTREGA        │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Reglas

- cursor inicial en kilos;
- última cooperativa preseleccionada;
- fecha actual por defecto;
- origen opcional;
- rendimiento opcional;
- un solo CTA primario.

---

## 3. CONFIRMACIÓN DE ENTREGA

```text
┌─────────────────────────────────┐
│               ✓                 │
│        Entrega guardada         │
│                                 │
│           1.842 kg              │
│ San Sebastián · 18 nov · 18:42 │
│ Las Viñas                       │
│                                 │
│ Total campaña: 18.420 kg        │
│                                 │
│ [ Añadir otra entrega ]         │
│ [ Añadir rendimiento ]          │
│                                 │
│            Hecho                │
└─────────────────────────────────┘
```

Debe cerrar rápido; no convertir la confirmación en una pantalla obligatoria larga.

---

## 4. CAMPAÑA

```text
┌─────────────────────────────────┐
│ Campaña 2026/27            ⋮    │
│ ACTIVA                          │
├─────────────────────────────────┤
│ 18.420 kg        21,4 %         │
│ 12 entregas      media pond.    │
├─────────────────────────────────┤
│ EVOLUCIÓN                       │
│        ╭──────╮                 │
│    ╭───╯      ╰──               │
│ ───╯                            │
│         kilos acumulados        │
├─────────────────────────────────┤
│ RENDIMIENTOS                    │
│ 21,4 % media                    │
│ Mejor: 23,1 %                   │
│ 2 pendientes              →     │
├─────────────────────────────────┤
│ DESTINOS                        │
│ San Sebastián     12.810 kg     │
│ Oleozumo            5.610 kg    │
├─────────────────────────────────┤
│ ORIGEN                          │
│ Las Viñas          8.420 kg     │
│ El Cerrillo        6.780 kg     │
│ Sin asignar        3.220 kg     │
├─────────────────────────────────┤
│ ENTREGAS RECIENTES              │
│ 18 nov · 1.842 kg · pendiente % │
│ 17 nov · 1.630 kg · 22,0 %      │
│ 15 nov · 2.015 kg · 21,3 %      │
│                         Ver todas│
└─────────────────────────────────┘
  Inicio  Campo  ● Campaña Coop. Más
```

### Intención

No esconder `Sin asignar`: si el usuario no indicó parcela, el dato sigue siendo válido y visible.

---

## 5. PENDIENTES DE RENDIMIENTO

```text
┌─────────────────────────────────┐
│ ← Rendimientos pendientes       │
├─────────────────────────────────┤
│ 18 nov · San Sebastián          │
│ 1.842 kg                        │
│ Rendimiento [       ] %         │
│                                 │
│ 16 nov · San Sebastián          │
│ 1.415 kg                        │
│ Rendimiento [       ] %         │
│                                 │
│ ─────────────────────────────── │
│ [ Guardar 2 rendimientos ]      │
└─────────────────────────────────┘
```

Entrada masiva rápida; teclado numérico.

---

## 6. CAMPO

```text
┌─────────────────────────────────┐
│ Mi campo                  +      │
│ 3 fincas · 8,6 ha                │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Las Viñas                   │ │
│ │ 3,2 ha · 3 parcelas         │ │
│ │ 8.420 kg esta campaña       │ │
│ │ Último: Abonado · ayer      │ │
│ │                        →    │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ El Cerrillo                 │ │
│ │ 2,8 ha · 2 parcelas         │ │
│ │ 6.780 kg esta campaña       │ │
│ │ Último: Observación · 3 d   │ │
│ │                        →    │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Los Llanos                  │ │
│ │ 2,6 ha · 3 parcelas         │ │
│ │ 0 kg esta campaña           │ │
│ │                        →    │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
  Inicio  ● Campo Campaña Coop. Más
```

---

## 7. PARCELA

```text
┌─────────────────────────────────┐
│ ← Parcela Norte            ⋮    │
│ Las Viñas                       │
├─────────────────────────────────┤
│ [          MAPA              ]  │
│                                │
│ 1,4 ha · Secano · Picual        │
│ SIGPAC: 23 / ...                │
├─────────────────────────────────┤
│ CAMPAÑA 2026/27                 │
│ 3.810 kg · 21,8 %               │
├─────────────────────────────────┤
│ CRONOLOGÍA                      │
│ ● Ayer                          │
│   Abonado · 250 kg              │
│ │                               │
│ ● 02 jun                        │
│   Observación · 3 fotos         │
│ │                               │
│ ● 18 may                        │
│   Tratamiento                   │
│ │                               │
│ ● 04 abr                        │
│   Poda                          │
├─────────────────────────────────┤
│ (+) Añadir                      │
└─────────────────────────────────┘
```

El botón `Añadir` abre un sheet:
- Labor
- Observación
- Documento/foto
- Tarea
- Entrega

---

## 8. NUEVA LABOR

```text
┌─────────────────────────────────┐
│ ← Nueva labor                   │
├─────────────────────────────────┤
│ ¿Qué has hecho?                 │
│                                 │
│ [ Tratamiento ] [ Abonado ]     │
│ [ Poda        ] [ Desbroce ]    │
│ [ Riego       ] [ Recolección ] │
│ [ Observación ] [ Ver más... ]  │
└─────────────────────────────────┘
```

Después de elegir `Abonado`:

```text
┌─────────────────────────────────┐
│ ← Abonado                       │
├─────────────────────────────────┤
│ Dónde                           │
│ [ Parcela Norte             ▾ ] │
│                                 │
│ Fecha                           │
│ [ Hoy                       ▾ ] │
│                                 │
│ Producto / material             │
│ [ 15-15-15                  ]   │
│                                 │
│ Cantidad                        │
│ [ 250 ] [ kg ▾ ]                │
│                                 │
│ + Coste                         │
│ + Foto / documento              │
│ + Notas                         │
│                                 │
│ [      GUARDAR LABOR       ]    │
└─────────────────────────────────┘
```

---

## 9. COOPERATIVAS / ALMAZARAS

```text
┌─────────────────────────────────┐
│ Cooperativas y almazaras        │
│ [ 🔎 Buscar...                ] │
│ [ Mis destinos ] [ Sierra Mágina]
├─────────────────────────────────┤
│ ★ San Sebastián                 │
│ La Guardia de Jaén              │
│ 12.810 kg en 2026/27            │
│ Portal oficial disponible       │
│                            →    │
├─────────────────────────────────┤
│ ★ Oleozumo                      │
│ Mancha Real                     │
│ 5.610 kg en 2026/27             │
│ Acceso cosecheros disponible    │
│                            →    │
├─────────────────────────────────┤
│ San Isidro Labrador             │
│ Huelma                          │
│                            →    │
└─────────────────────────────────┘
  Inicio Campo Campaña ● Coop. Más
```

---

## 10. FICHA DE ALMAZARA/COOPERATIVA

```text
┌─────────────────────────────────┐
│ ← San Sebastián                 │
│ La Guardia de Jaén              │
├─────────────────────────────────┤
│ MI CAMPAÑA AQUÍ                 │
│ 12.810 kg · 8 entregas          │
│ 21,6 % media                    │
│ [ Ver mis entregas ]            │
├─────────────────────────────────┤
│ ACCESO OFICIAL                  │
│ Portal de socios verificado     │
│ [ Abrir portal oficial ↗ ]      │
│                                 │
│ Mágina Olivo no almacena tu     │
│ contraseña de este portal.      │
├─────────────────────────────────┤
│ IMPORTAR                        │
│ [ Foto / PDF ] [ CSV / Excel ]  │
├─────────────────────────────────┤
│ INFORMACIÓN                     │
│ Dirección                       │
│ Teléfono                        │
│ Web oficial                     │
│ Servicios                       │
│                                 │
│ Fuente verificada · 02/09/2026  │
└─────────────────────────────────┘
```

---

## 11. IMPORTAR

```text
┌─────────────────────────────────┐
│ ← Importar datos                │
├─────────────────────────────────┤
│ ¿Qué tienes?                    │
│                                 │
│ ┌──────────────┐ ┌────────────┐ │
│ │ 📷 Ticket    │ │ 📄 PDF     │ │
│ └──────────────┘ └────────────┘ │
│ ┌──────────────┐ ┌────────────┐ │
│ │ 📊 CSV       │ │ 📗 Excel   │ │
│ └──────────────┘ └────────────┘ │
│                                 │
│ Tus datos no se añaden hasta    │
│ que revises la vista previa.    │
└─────────────────────────────────┘
```

Preview:

```text
┌─────────────────────────────────┐
│ Vista previa · 28 filas         │
├─────────────────────────────────┤
│ ✓ 24 listas                     │
│ ⚠ 2 revisar                     │
│ ≈ 2 posibles duplicados         │
├─────────────────────────────────┤
│ 18 nov · 1.842 kg     ✓         │
│ 17 nov · 1.630 kg     ✓         │
│ 16 nov · 1.415 kg     ≈ revisar │
│ ...                             │
├─────────────────────────────────┤
│ [ Revisar problemas ]           │
│ [ Importar 24 registros ]       │
└─────────────────────────────────┘
```

---

## 12. AVISOS

```text
┌─────────────────────────────────┐
│ Avisos                          │
│ Todo  Tiempo  Campo  Campaña    │
├─────────────────────────────────┤
│ IMPORTANTE · Tiempo             │
│ Viento fuerte desde las 16:00   │
│ Hoy · Las Viñas                 │
├─────────────────────────────────┤
│ PENDIENTE · Campaña             │
│ 2 entregas esperan rendimiento  │
│                         Resolver│
├─────────────────────────────────┤
│ INFO · RAIF                     │
│ Nuevo estado fitosanitario      │
│ publicado para olivar           │
│                         Fuente ↗│
└─────────────────────────────────┘
```

---

## 13. Estados vacíos

No mostrar dashboards llenos de ceros sin contexto.

### Sin entregas

```text
Aún no hay entregas en esta campaña.

Cuando lleves aceituna a la almazara,
regístrala aquí y verás la evolución.

[ + Registrar primera entrega ]
```

### Sin parcelas

```text
Empieza añadiendo tu primera finca.
Puedes hacerlo manualmente y completar
SIGPAC más adelante.

[ + Añadir finca ]
```

---

## 14. Offline / mala cobertura

En zona sin red:

```text
┌─────────────────────────────────┐
│ ☁ Sin conexión                  │
│ Puedes seguir registrando.      │
│ Se sincronizará cuando vuelva   │
│ Internet.                       │
└─────────────────────────────────┘
```

Priorizar offline para:
- crear labor;
- observación/foto pendiente de subida;
- nueva entrega;
- consultar últimas fincas/campaña cacheadas.

No prometer offline para:
- AEMET actualizada;
- RAIF nueva;
- portales externos;
- sincronización de proveedores.

---

## 15. Accesibilidad de interacción

Objetivo: WCAG 2.2 AA para la PWA.

Decisiones de diseño:
- botones táctiles principales de al menos ~44 px de altura aunque AA permita mínimos menores en determinados casos;
- no depender solo del color para estados;
- contraste AA;
- etiquetas visibles en formularios;
- errores junto al campo y resumen comprensible;
- teclado numérico para kilos/porcentajes;
- foco visible;
- navegación posible sin gestos complejos;
- acciones de swipe siempre con alternativa visible;
- texto ampliable sin romper la pantalla;
- evitar tablas densas en móvil: usar tarjetas/listas o vistas adaptadas.

Referencia:
- https://www.w3.org/TR/WCAG22/

---

## 16. Prioridad de prototipado visual

Orden recomendado:

1. Inicio
2. Nueva entrega
3. Campaña
4. Parcela/timeline
5. Nueva labor
6. Cooperativa/almazara
7. Importación
8. Onboarding
9. Avisos
10. Documentos

Con esas 10 vistas se puede probar prácticamente todo el flujo de oro antes de implementar el backend completo.
