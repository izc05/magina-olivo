# Matriz de auditoría digital — entidades DOP Sierra Mágina

Fecha: 2026-09-02

## Cómo leer esta matriz

La clasificación solo refleja evidencia pública encontrada en la auditoría. `P0` no demuestra que una entidad no tenga software interno o app privada; significa que no se ha localizado públicamente un portal individual de agricultor verificable.

- **P0**: presencia corporativa/tienda; sin portal agrícola individual verificado.
- **P1**: zona privada simple o acceso de socios sin funciones estructuradas verificadas.
- **P2**: portal individual de socio/cosechero estructurado.
- **P3**: portal conectado a un ecosistema/proveedor de software de almazara identificado.
- **N/A**: entidad mercantil/envasadora donde el concepto de socio cooperativista no encaja de la misma forma.

## 23/23 — primera clasificación

| # | Entidad | Municipio | Estado público | Evidencia / nota | Prioridad para piloto |
|---:|---|---|---|---|---|
| 1 | Aceites Campoliva, S.L. / Melgarejo | Pegalajar | P0 / N/A socio | Web corporativa y tienda con cuenta comercial; no se ha verificado portal de cosechero | Media |
| 2 | Avirol, S.L. | Cambil | P0 / N/A socio | Envasadora/comercializadora; web corporativa | Baja para portal, útil directorio |
| 3 | Monva, S.L. | Mancha Real | P0 / N/A socio | Empresa/propiedad olivarera con web de producto y fincas; no portal cooperativista | Baja para portal |
| 4 | Oleozumo, S.L. | Mancha Real | **P2/P3 confirmado** | Web oficial muestra `Acceso Cosecheros` hacia `oleozumo.almazaras.com` | **Alta** |
| 5 | S.A.T. Ntra. Sra. del Camino | Garcíez | P0 | Presencia pública básica; sin portal verificado | Media-baja |
| 6 | S.C.A. Bedmarense | Bedmar | P0 actual | Web/contactos y Magnasur; sin acceso estructurado localizado públicamente | **Alta por tamaño/servicios** |
| 7 | S.C.A. La Unión del Santo Cristo | Cabra del Santo Cristo | P0 actual | Web corporativa Salud Sierra; sin portal individual localizado | Media |
| 8 | S.C.A. Ntra. Sra. de la Asunción | Albanchez de Mágina | P0 actual | Web/tienda/noticias; sin portal estructurado localizado | Media |
| 9 | S.C.A. Ntra. Sra. de la Cabeza | Campillo de Arenas | P0/P1 pendiente | Web oficial localizada; no se ha confirmado zona individual | Media |
| 10 | S.C.A. Ntra. Sra. de la Paz | Bélmez de la Moraleda | **P1/P2 probable** | Web La Perla de Mágina muestra `Acceso socios`; proveedor/funciones no verificados | **Alta** |
| 11 | S.C.A. Ntra. Sra. de los Remedios | Jimena | P0 actual | Web Oro de Cánava; sin portal individual localizado | Alta para piloto local |
| 12 | S.C.A. Ntra. Sra. del Rosario | Arbuniel | **P1/P2 probable** | Albilia muestra `Acceso Socios`; proveedor/funciones no confirmados | **Alta** |
| 13 | S.C.A. Ntra. Sra. Pilar del Andaraje | Jódar | P0 actual | Web oficial corporativa/boletín; sin acceso de socio localizado | **Alta por volumen potencial** |
| 14 | S.C.A. San Francisco | Albanchez de Mágina | P0 actual | Web corporativa/tienda; sin portal estructurado localizado | Media |
| 15 | S.C.A. San Isidro Labrador | Huelma | P0 agrícola | Cuenta de e-commerce, no confundir con cuenta de socio agrícola; gran base de socios/servicios | **Muy alta** |
| 16 | S.C.A. San Juan Bautista | Solera | P0 actual | Web Castillo de Solera; sin portal individual localizado | Media-baja |
| 17 | S.C.A. San Roque | Cárcheles | **P1 confirmado** | Sección `Socios` protegida por contraseña WordPress; no se ha verificado portal transaccional individual | Alta |
| 18 | S.C.A. San Sebastián | La Guardia de Jaén | **P2/P3 confirmado** | `ACCESO SOCIOS` enlaza `sansebastian.almazaras.com` | **Muy alta** |
| 19 | S.C.A. Santa Isabel | Torres | P0 actual | Web corporativa/tienda; sin portal individual localizado | Media |
| 20 | S.C.A. Santísimo Cristo de la Misericordia | Jódar | P0 actual | Cooperativa de gran actividad; no se ha localizado portal individual público en esta pasada | **Muy alta** |
| 21 | S.C.A. Trujal de Mágina | Cambil | P0 actual | Web corporativa; sin portal individual confirmado | Media |
| 22 | S.C.A. Unión Oleícola de Cambil | Cambil | **P1/P2 probable** | Esmeralda de Mágina muestra `ZONA DE SOCIOS` y noticias internas | **Alta** |
| 23 | Thuelma, S.L. | Huelma | P0 / N/A socio | Sociedad mercantil; web corporativa/producto | Baja para portal, útil directorio |

## Hallazgo nuevo — Oleozumo

La portada oficial de Oleozumo muestra un enlace explícito:

`Acceso Cosecheros -> oleozumo.almazaras.com`

Esto eleva la entidad a P2/P3 y confirma un segundo uso público del ecosistema Almazaras.com dentro del universo auditado, junto a S.C.A. San Sebastián.

Fuente:
- https://www.oleozumo.com/

## Casos `cuenta de tienda` que NO cuentan como portal agrícola

Una cuenta WooCommerce/PrestaShop u otro login comercial no se debe etiquetar como `Acceso Socio` si solo gestiona compras.

Ejemplos detectados:
- Aceites Melgarejo / Campoliva: `Iniciar sesión` vinculado al comercio electrónico.
- San Isidro Huelma: creación de cuenta de cliente en la tienda.

La base de datos debe diferenciar:
- `customer_shop_account`
- `member_portal`
- `grower_portal`

solo cuando sea necesario describir públicamente el acceso.

## Casos empresariales no cooperativistas

Avirol, Monva, Aceites Campoliva, Oleozumo y Thuelma son sociedades/empresas dentro del directorio DOP, no necesariamente cooperativas con una masa de `socios` equivalente.

Eso implica que el producto no debe llamar siempre `cooperativa` al destino real de una entrega.

Decisión de modelo recomendada:

- UI puede usar `Cooperativa / Almazara`;
- internamente conviene evolucionar `cooperatives` hacia una entidad más general `olive_mills`/`destinations` o añadir `entity_type` suficiente para no falsear la naturaleza jurídica.

## Prioridad de entrevistas

### Grupo A — contraste de integración digital

1. S.C.A. San Sebastián
2. Oleozumo
3. S.C.A. Ntra. Sra. del Rosario
4. S.C.A. Ntra. Sra. de la Paz
5. S.C.A. Unión Oleícola de Cambil

Preguntas:
- ¿qué proveedor usa el acceso?
- ¿qué ve exactamente el agricultor?
- ¿puede descargar CSV/XLSX/PDF?
- ¿existen IDs de ticket/entrega estables?
- ¿aparece SIGPAC/origen?
- ¿estarían abiertos a una exportación o API autorizada?

### Grupo B — contraste de valor cuando no hay portal público claro

1. S.C.A. San Isidro Labrador
2. S.C.A. Santísimo Cristo de la Misericordia
3. S.C.A. Bedmarense
4. S.C.A. Ntra. Sra. Pilar del Andaraje
5. S.C.A. Ntra. Sra. de los Remedios

Preguntas:
- ¿cómo consulta hoy el socio kilos/rendimientos?
- ¿qué documentos recibe en papel/email/WhatsApp?
- ¿qué consultas repetitivas llegan a oficina durante campaña?
- ¿qué datos estaría dispuesto a registrar el agricultor por sí mismo?

## Oportunidad de producto validada por heterogeneidad

La comarca ya muestra tres realidades simultáneas:

1. almazaras con portal conectado a software especializado;
2. cooperativas con zonas privadas parciales;
3. entidades donde la presencia pública no expone un portal agrícola.

Por eso el producto debe funcionar así:

```text
Mágina Olivo
├── manual siempre
├── documentos siempre
├── CSV/XLSX cuando exista
└── integración oficial cuando sea posible
```

Nunca al revés.

## Fuentes principales de esta pasada

- Directorio DOP Sierra Mágina: https://sierramagina.org/almazaras-envasadoras/
- Oleozumo: https://www.oleozumo.com/
- Aceites Melgarejo / Campoliva: https://www.aceites-melgarejo.com/
- Avirol: https://avirol.es/
- Monva: https://www.monva.es/
- Pilar de Andaraje: https://pilardeandaraje.es/
- Bedmarense: https://www.agroalimentarias-andalucia.coop/cooperativas/sca-bedmarense

Para el resto, ver `COOPERATIVE_PORTAL_AUDIT.md`.

## Siguiente nivel de certeza

Esta matriz completa el **23/23 a nivel de búsqueda pública**, pero no completa el conocimiento interno de cada entidad.

La siguiente fase ya no debe ser solo Google/web: para subir de confianza necesitamos:
- agricultores socios reales;
- ejemplos anonimizados;
- llamadas/contactos a cooperativas;
- acceso piloto autorizado cuando proceda.
