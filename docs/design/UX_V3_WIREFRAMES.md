# Mágina Olivo — Wireframes funcionales UX V3

Fecha: 2026-09-08
Estado: especificación funcional post-staging

> Estos wireframes fijan jerarquía, orden y acciones. No fijan todavía la estética final ni sustituyen el design system.

## 1. Navegación privada móvil

```text
┌────────────────────────────┐
│ Mágina Olivo          [👤] │
├────────────────────────────┤
│                            │
│      CONTENIDO ACTUAL      │
│                            │
├────────────────────────────┤
│ 🏠     🌳      ＋    🫒  ••• │
│ Inicio Campo       Camp. Más│
└────────────────────────────┘
```

Reglas:
- `+` siempre visible en zona privada;
- no usar más de 5 destinos principales;
- navegación inferior fija en móvil;
- en escritorio puede transformarse en rail/sidebar conservando exactamente los mismos destinos.

## 2. Inicio privado

Objetivo: responder `¿Qué tengo que hacer hoy?`

```text
Buenos días, Isi
Martes, 8 de septiembre

[ Tiempo parcela principal ]
27 °C · lluvia mañana 12 mm

MÁGINA RECOMIENDA
┌──────────────────────────┐
│ 🟡 Revisar Parcela Norte │
│ Riesgo medio de mosca    │
│ [Ver por qué]            │
└──────────────────────────┘

HOY EN TU OLIVAR
• 2 tareas pendientes
• lluvia prevista mañana
• 1 entrega sin rendimiento

CAMPAÑA 2026/27
18.420 kg · 4 entregas · 19,4 %
[Ver campaña]

ACTIVIDAD RECIENTE
🌿 Desbroce · Norte · ayer
🫒 Entrega · 1.840 kg · hace 3 días

[Ver todo]
```

Orden obligatorio:
1. contexto del día;
2. recomendación/alerta prioritaria;
3. pendientes relevantes;
4. campaña resumida;
5. actividad reciente.

No mostrar más de 3 avisos prioritarios en primer viewport largo.

## 3. Mi Campo

Objetivo: responder `¿Cómo están mis parcelas?`

```text
MI CAMPO                     [+ Añadir]

┌────────────────────────────┐
│        MAPA GENERAL        │
│  🟢 Norte                  │
│       🟡 Erillas           │
│              🟢 El Cerro   │
└────────────────────────────┘

3 parcelas · 8,72 ha

[Buscar parcela] [Lista/Mapa]

🌳 Parcela Norte
3,42 ha · 🟢 Sin incidencias
Última labor: Desbroce · 2 sep

🌳 Las Erillas
2,16 ha · 🟡 Revisar
Lluvia mañana · riesgo medio mosca

🌳 El Cerro
3,14 ha · 🟢 Sin avisos
```

Reglas:
- mapa y lista representan el mismo conjunto;
- tocar polígono abre la misma ficha que tocar tarjeta;
- siempre existe alternativa lista al mapa;
- estado usa texto + icono, nunca solo color;
- tarjeta evita datos técnicos innecesarios.

## 4. Ficha de parcela

```text
← Mi Campo

PARCELA NORTE
3,42 ha · Cambil

┌────────────────────────────┐
│      ORTOFOTO / MAPA       │
│    perímetro resaltado     │
└────────────────────────────┘

🌦 27°        🪰 Medio       🫒 4.280 kg
Tiempo        RAIF           Campaña

MÁGINA RECOMIENDA
Revisar mosca antes del viernes
[Ver contexto]

[      + REGISTRAR      ]

Actividad | Cosecha | Datos | Documentos

ACTIVIDAD RECIENTE
🌿 Desbroce · 2 sep
🧪 Tratamiento · 14 ago
📷 Observación · 8 ago

[Ver histórico completo]
```

### Actividad
Timeline de labores, observaciones, incidencias y tareas relacionadas.

### Cosecha
Kilos asociados, entregas, rendimiento y comparación básica.

### Datos
Superficie, finca, Catastro, SIGPAC, variedad, riego, nº olivos, notas, procedencia de geometría y verificaciones.

### Documentos
Fotos, tickets, análisis y documentos vinculados.

Regla: `Datos` es donde vive la complejidad técnica. No subirla al resumen.

## 5. + Registrar

Al pulsar el botón central:

```text
¿Qué quieres registrar?

🌿 Trabajo
🫒 Entrega
📷 Observación / problema
✅ Tarea
📄 Documento / foto
```

Si existe contexto de parcela:

```text
Parcela Norte ✓
```

No volver a pedir parcela salvo que el usuario quiera cambiarla.

## 6. + Trabajo

```text
← Registrar

¿Qué has hecho?

✂️ Poda        🌿 Desbroce
🧪 Tratamiento 🌱 Abonado
💧 Riego       🚜 Laboreo
🫒 Recolección 🔧 Mantenimiento
••• Otro

Parcela: Norte ✓
Fecha: Hoy · 10:42 ✓

[Detalles opcionales ▾]

[ GUARDAR TRABAJO ]
```

Detalles avanzados solo aparecen por tipo:
- tratamiento: producto, dosis, superficie, aplicador, observaciones;
- abonado: producto/cantidad;
- riego: duración/volumen si aplica;
- resto: coste, foto, notas y recordatorio opcionales.

## 7. + Entrega

```text
NUEVA ENTREGA

Cooperativa    [última usada]
Kilos          [       ]
Fecha/hora     Ahora ✓
Origen         Parcela Norte / cambiar

Ticket         [Añadir foto]
Rendimiento    Opcional
Notas          Opcional

[ GUARDAR ENTREGA ]
```

Después:

```text
✓ Entrega guardada · 1.842 kg

[Añadir otra]
[Añadir rendimiento]
[Ver campaña]
```

## 8. + Observación / problema

```text
OBSERVACIÓN

Parcela Norte ✓

[📷 Hacer foto]

¿Qué ves?
[texto o voz]

Tipo opcional:
• plaga/enfermedad
• daño
• riego
• maquinaria
• árbol
• otro

[ GUARDAR ]
```

Si Mágina IA analiza imagen, su resultado es una ayuda y nunca sustituye confirmación humana ni diagnóstico técnico.

## 9. Campaña

```text
CAMPAÑA 2026/27       [Cambiar]

18.420 kg
4 entregas
19,4 % rendimiento ponderado

[ + ENTREGA ]

EVOLUCIÓN
[ gráfica simple ]

RESUMEN
🌳 Origen por parcelas
🏭 Cooperativas
💶 Costes
📈 Rendimientos
📄 Documentos / Informe

ENTREGAS RECIENTES
4 sep · 1.842 kg · 20,1 %
2 sep · 2.147 kg · 19,7 %

[Ver todas]
```

Durante recolección, `+ Entrega` puede ser visualmente dominante dentro de Campaña aunque el botón global `+` siga existiendo.

## 10. Más

```text
MÁS

TRABAJO
📅 Calendario y tareas
📄 Documentos
🔔 Centro de avisos
📊 Informes
💶 Costes
📥 Importar datos

MI EXPLOTACIÓN
🏭 Mis cooperativas
👨‍👩‍👧 Familia / cuadrilla
🤖 Mágina IA
🫒 Mis Aceitunas

CUENTA
👤 Perfil
⚙️ Preferencias
🔐 Privacidad y datos
↗ Exportar datos
🚪 Cerrar sesión
```

Agrupar, no mostrar una lista plana de 15 enlaces.

## 11. Alta Map First

```text
Mi Campo
 -> + Añadir parcelas
 -> Buscar parcelas

[Mapa] [Ref. catastral] [Polígono/parcela]

[📍 Mi ubicación] [🗺 Capas]

┌────────────────────────────┐
│ mapa + límites oficiales   │
└────────────────────────────┘

3 parcelas seleccionadas
4,32 ha mostradas
[Continuar con 3 parcelas]
```

Después:

```text
Completar datos agrícolas

Parcela 1
Nombre: [Norte]
Variedad: [Picual]
Riego: [Secano]
Olivos: [opcional]

[Aplicar variedad a todas]
[Asignar a finca]

[GUARDAR 3 PARCELAS]
```

## 12. Público

La navegación pública debe mantenerse independiente de la privada:

```text
Inicio Mágina
Tiempo
Mercado
Noticias
Eventos/Ayudas
RAIF
Cooperativas
Cerca de ti
```

Al iniciar sesión, no duplicar estos destinos en la barra privada. Mostrar enlaces contextuales o acceso desde logo/menú público cuando proceda.

## 13. Escritorio

En escritorio:
- mismo modelo de información;
- más anchura, no más complejidad;
- mapa y lista pueden verse simultáneamente;
- panel lateral para detalle de parcela;
- formularios rápidos pueden abrirse como modal/drawer;
- no introducir menús exclusivos de escritorio que rompan paridad funcional.

## 14. Criterios de wireframe

Codex no debe:
- convertir cada tarjeta en un enlace a una pantalla nueva;
- mostrar Catastro/SIGPAC/RAIF como pestañas principales;
- crear formularios largos por defecto;
- repetir selección de parcela si ya existe contexto;
- ocultar el botón principal bajo menús;
- inventar una sexta pestaña principal.
