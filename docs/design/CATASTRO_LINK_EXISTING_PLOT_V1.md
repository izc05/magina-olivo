# Mágina Olivo — Vincular parcela existente con Catastro V1

Fecha: 2026-09-08  
Estado: diseño UX/funcional post-staging  
Documento padre: `docs/design/MI_CAMPO_UX_V4.md`

## 1. Objetivo

Permitir que un agricultor que **ya tiene creada una finca y una parcela en Mágina Olivo** pueda asociar esa parcela de trabajo con su parcela catastral oficial para:

- verla en el mapa;
- conocer visualmente su perímetro;
- identificar sus lindes cartográficas;
- guardar la referencia catastral;
- usar el perímetro oficial como geometría de trabajo privada, después de verificación server-side;
- comparar posteriormente con SIGPAC cuando sea útil.

No exigir borrar ni volver a crear la parcela existente.

Ejemplo conceptual:

```text
Usuario de Bedmar
  -> Finca: Cortijo del Río
      -> Parcela Norte
          -> todavía sin perímetro oficial
```

Desde esa parcela:

```text
Parcela Norte
3,42 ha declaradas

Ubicación y lindes
Aún no está vinculada con Catastro

[Vincular con Catastro]
```

---

## 2. Las dos opciones principales

La interfaz debe presentar **dos caminos muy claros**.

```text
¿Cómo quieres encontrar tu parcela?

┌────────────────────────────┐
│ 📍 Estoy en la finca       │
│ Localizar con GPS          │
└────────────────────────────┘

┌────────────────────────────┐
│ 🔎 Buscar manualmente      │
│ Referencia o polígono      │
└────────────────────────────┘
```

No mostrar al agricultor nombres técnicos como WFS, BBOX, GeoJSON o INSPIRE.

---

## 3. Opción A — Estoy en la finca / GPS

### Caso de uso

El agricultor está físicamente en la parcela o cerca de ella.

Flujo:

```text
Parcela Norte
   ↓
Vincular con Catastro
   ↓
Estoy en la finca
   ↓
Solicitar ubicación del móvil
   ↓
Centrar mapa en la posición actual
   ↓
Cargar cartografía catastral de esa zona
   ↓
Usuario reconoce su parcela
   ↓
Toca el polígono
   ↓
Revisar referencia + superficie + perímetro
   ↓
Confirmar
   ↓
Servidor vuelve a consultar Catastro
   ↓
Guardar vínculo/perímetro
```

### Pantalla

```text
< Volver          Encontrar mi parcela

Estás cerca de tu finca

[ mapa / ortofoto ]
      ● Tú estás aquí
      límites catastrales

[ Centrar en mi ubicación ]
[ Capas ]
```

Cuando el GPS centra la zona, Mágina consulta únicamente un entorno razonable alrededor del viewport. No ejecutar consultas catastrales masivas.

### Selección

Al tocar una parcela:

```text
Parcela catastral seleccionada

RC 23015A01200034
Superficie Catastro: 3,38 ha

[Ver perímetro]
[Esta es mi parcela]
```

La frase correcta es `Esta es la parcela que gestiono` o similar. No afirmar titularidad ni propiedad.

### GPS

- pedir permiso solo cuando el usuario pulsa esta opción;
- explicar para qué se usa;
- no guardar un historial de posición personal por defecto;
- no usar GPS como prueba de propiedad;
- si la precisión es pobre, mostrar el círculo de precisión y permitir mover el mapa manualmente.

### GPS denegado o sin señal

```text
No podemos usar tu ubicación.
Puedes mover el mapa manualmente o buscar por referencia catastral.

[Mover mapa]
[Buscar manualmente]
```

Nunca bloquear el flujo.

---

## 4. Opción B — Buscar manualmente

Esta opción sirve cuando:

- el agricultor está en casa;
- sabe dónde está visualmente la finca;
- conoce la referencia catastral;
- conoce municipio, polígono y parcela;
- quiere buscar sin dar permiso de ubicación.

Pantalla:

```text
< Volver          Buscar en Catastro

¿Cómo quieres buscar?

[ Referencia catastral ]
[ Polígono y parcela ]
[ Buscar en el mapa ]
```

### B1. Referencia catastral

Campo:

```text
Referencia catastral
[_____________________]

[Buscar]
```

Aceptar y normalizar los formatos definidos en `PARCEL_MAP_FIRST_V1.md`.

Si la referencia recibida corresponde a una referencia completa y para cartografía se utiliza la referencia de parcela normalizada, mostrar explícitamente cuál se usará antes de confirmar.

Resultado:

```text
Encontrada

RC 23015A01200034
3,38 ha

[mapa con perímetro]

[Esta es mi parcela]
```

### B2. Municipio + polígono + parcela

Especialmente útil en rústica:

```text
Municipio   [Bedmar y Garcíez]
Polígono    [12]
Parcela     [34]

[Buscar]
```

Resultado:

- centrar el mapa en la parcela candidata;
- mostrar la parcela y colindantes cuando el servicio lo permita;
- usuario confirma visualmente.

### B3. Buscar moviendo el mapa

Para quien sabe localizar visualmente la finca pero no conoce la referencia:

```text
[mapa / ortofoto]

Busca tu zona y acércate.
Cuando estés suficientemente cerca,
mostraremos las parcelas catastrales.
```

Al alcanzar el zoom necesario:

- consultar Catastro por viewport/BBOX;
- dibujar polígonos;
- permitir tocar uno;
- mostrar referencia y superficie.

---

## 5. Confirmación obligatoria

En cualquiera de los dos caminos, antes de persistir:

```text
¿Es esta la parcela que gestionas?

Parcela Norte · Mágina Olivo

Catastro
RC 23015A01200034
Superficie: 3,38 ha

[mapa / ortofoto con perímetro]

[Confirmar vínculo]
[Cambiar selección]
```

Texto informativo:

> La cartografía de Catastro identifica parcelas y límites cartográficos. Vincularla en Mágina Olivo no acredita la propiedad. Antes de guardar, Mágina volverá a verificar la parcela directamente en la fuente oficial.

---

## 6. Verificación server-side

El navegador envía la referencia seleccionada, no una geometría considerada autoritativa.

Flujo servidor:

1. autenticar usuario;
2. comprobar acceso de escritura a la explotación;
3. comprobar que la parcela privada pertenece a la finca/explotación correctas;
4. normalizar referencia;
5. detectar si ya existe un vínculo incompatible;
6. consultar de nuevo Catastro;
7. validar geometría;
8. calcular/normalizar superficie internamente;
9. guardar referencia, geometría y procedencia;
10. registrar fecha de comprobación;
11. responder con la parcela actualizada.

La UX actual de `CatastroParcelPanel` ya contiene parte de esta filosofía de doble confirmación/verificación y debe reutilizarse/refactorizarse, no duplicarse.

---

## 7. Después de vincular

La ficha cambia de:

```text
Ubicación y lindes
Sin Catastro
[Vincular con Catastro]
```

A:

```text
Ubicación y lindes

[mini mapa con perímetro]

Catastro ✓
RC 23015A01200034
3,38 ha oficiales mostradas
Verificado: 8 sep 2026

[Ver mapa completo]
[Ver datos]
```

Desde el mapa completo:

```text
Capas
☑ Ortofoto
☑ Mi parcela
☑ Catastro
☐ SIGPAC
```

Así el agricultor puede ver claramente dónde están las lindes cartográficas sobre ortofoto.

---

## 8. Diferencia entre superficie declarada y Catastro

Si la parcela privada ya tenía una superficie manual diferente:

```text
Mágina Olivo: 3,42 ha
Catastro:      3,38 ha
```

No sobrescribir silenciosamente.

Mostrar:

```text
La superficie que tenías registrada es distinta de la mostrada por Catastro.

○ Mantener mi superficie de trabajo
○ Usar superficie verificada de Catastro
```

La procedencia del dato debe quedar registrada.

---

## 9. Si la parcela privada ya tiene un perímetro manual

Mostrar comparación antes de sustituirlo:

```text
Perímetro actual: dibujado manualmente
Perímetro Catastro: disponible

[Comparar]
```

Después:

```text
¿Qué quieres usar como perímetro principal de trabajo?

○ Mantener el actual
● Catastro
```

No destruir silenciosamente el perímetro anterior si forma parte del histórico/procedencia. Aplicar la política de provenance existente.

---

## 10. Si selecciona la parcela equivocada

Debe poder corregirlo:

```text
Parcela > Datos > Catastro

RC 23015A01200034

[Cambiar vínculo catastral]
```

El cambio debe exigir nueva selección y nueva verificación.

No ofrecer un botón destructivo accidental junto a acciones frecuentes.

---

## 11. Si Catastro no responde

```text
Catastro no responde ahora.

Tu parcela de Mágina Olivo no se ha modificado.
Puedes seguir registrando trabajos normalmente.

[Reintentar]
[Volver a Parcela]
```

Una caída de Catastro nunca debe impedir usar la parcela privada ya creada.

---

## 12. Relación con SIGPAC

Después de vincular Catastro se puede ofrecer, de forma secundaria:

```text
¿Quieres ver también los recintos SIGPAC de esta zona?
[Ver SIGPAC]
```

No obligar a hacerlo.

Catastro y SIGPAC siguen siendo fuentes independientes.

Una parcela privada puede relacionarse con 0..N recintos SIGPAC.

---

## 13. Resumen visual del flujo

```text
PARCELA YA CREADA
      │
      v
[Vincular con Catastro]
      │
      ├─────────────────────────────┐
      │                             │
      v                             v
📍 ESTOY EN LA FINCA           🔎 BUSCAR MANUALMENTE
      │                             │
      v                     ┌───────┼─────────┐
     GPS                    v       v         v
      │                   Ref.   Polígono/   Mapa
      v                   RC     parcela     manual
Centrar mapa                 └───────┼─────────┘
      │                             │
      └──────────────┬──────────────┘
                     v
              MAPA / ORTOFOTO
                     │
                     v
            SELECCIONAR PARCELA
                     │
                     v
            REVISAR PERÍMETRO
                     │
                     v
           CONFIRMAR QUE ES ESA
                     │
                     v
          VERIFICACIÓN SERVIDOR
                     │
                     v
              VÍNCULO GUARDADO
                     │
                     v
        PARCELA CON LINDES EN MAPA
```

---

## 14. Criterios de aceptación

Un usuario con una parcela ya creada debe poder completar ambos caminos:

### Camino GPS

```text
Parcela
-> Vincular con Catastro
-> Estoy en la finca
-> permitir GPS
-> ver Catastro centrado
-> tocar su parcela
-> confirmar
-> volver a parcela con perímetro visible
```

### Camino manual

```text
Parcela
-> Vincular con Catastro
-> Buscar manualmente
-> referencia catastral / polígono-parcela / mapa
-> ver resultado
-> confirmar
-> volver a parcela con perímetro visible
```

Pruebas obligatorias:

- GPS permitido;
- GPS denegado;
- GPS de baja precisión;
- sin geolocalización disponible;
- referencia válida/incorrecta;
- municipio + polígono + parcela;
- búsqueda visual en mapa;
- parcela no encontrada;
- Catastro caído;
- geometría compleja;
- parcela ya vinculada;
- cambio de vínculo;
- superficie manual distinta;
- perímetro manual previo;
- aislamiento entre usuarios/explotaciones;
- móvil táctil y teclado.
