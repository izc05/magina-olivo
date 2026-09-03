# Mágina Olivo — Data Foundation V1

## Objetivo

Separar la interfaz V2 de la procedencia concreta de los datos antes de conectar backend, APIs o cartografía real.

La regla principal de esta fase es sencilla: **la UI no debe saber si un dato viene del catálogo demo, de información creada por el usuario o de una fuente externa**. Esa diferencia se conserva en el dominio y en la capa de repositorios.

## Alcance de este primer commit

Este commit introduce únicamente la fundación de datos:

- modelos de dominio TypeScript;
- procedencia explícita de datos;
- contratos asíncronos de repositorio;
- catálogo demo tipado;
- implementación demo de los repositorios;
- punto único de exportación.

No modifica todavía ninguna pantalla V2 ni conecta servicios externos.

## Procedencia obligatoria

Todo dato de dominio debe indicar su origen mediante `DataSource`.

Orígenes definidos:

- `demo`: datos de demostración o referencia visual. Nunca son autoritativos.
- `user`: información creada, registrada o editada por el usuario.
- `external`: información obtenida de una fuente externa identificable.

Además del origen, `DataSource` permite conservar:

- si el dato es autoritativo;
- proveedor;
- URL de procedencia cuando exista;
- momento de recuperación.

Esto evita que un valor conceptual termine presentándose accidentalmente como dato real.

## Modelo de dominio V1

`src/domain/models.ts` define las entidades base necesarias para la arquitectura actual:

- `UserProfile`;
- `Farm`;
- `Parcel`;
- `JournalEntry`;
- `Campaign`;
- `Delivery`;
- `Expense`;
- `Machinery`;
- `AgronomicAlert`;
- `WeatherSnapshot`;
- `MarketQuote`;
- `Cooperative`;
- `NewsArticle`;
- `DiscoverPlace`.

La intención no es reproducir todavía un esquema de base de datos. Son **contratos de negocio** que la interfaz puede consumir independientemente de la persistencia elegida posteriormente.

## Capa de repositorios

`src/data/contracts.ts` define interfaces asíncronas para:

- perfil;
- fincas y parcelas;
- cuaderno;
- campañas, entregas y gastos;
- maquinaria;
- meteorología;
- alertas;
- mercado;
- cooperativas;
- noticias;
- Descubre.

Todos los contratos devuelven `Promise`, incluso cuando la implementación demo trabaja en memoria. De este modo sustituir la fuente por HTTP, PocketBase u otra persistencia no obliga a rediseñar los componentes.

## Catálogo demo

`src/data/demo/catalog.ts` contiene datos de ejemplo tipados y marcados explícitamente con:

```ts
{
  origin: 'demo',
  authoritative: false,
  provider: 'Mágina Olivo demo'
}
```

Los valores incluidos sirven solo para conservar el comportamiento actual de la V2 durante la migración. No deben interpretarse como tiempo, precios, producción, cooperativas o noticias reales.

## Repositorios demo

`src/data/demo/repositories.ts` implementa `AppDataRepositories` sobre el catálogo en memoria.

Objetivo inmediato: poder migrar progresivamente las pantallas que hoy contienen datos hardcodeados sin cambiar su aspecto ni esperar a decidir el backend definitivo.

## Fronteras entre tipos de información

### Datos propios del usuario

Deben terminar persistidos y asociados a identidad/propiedad:

- perfil;
- fincas;
- parcelas;
- cuaderno;
- campañas;
- entregas;
- gastos;
- maquinaria;
- documentos personales.

### Datos externos

Deben conservar proveedor, actualización y atribución cuando corresponda:

- meteorología;
- alertas oficiales/agronómicas externas;
- mercado;
- noticias;
- información pública de cooperativas;
- agenda y contenidos territoriales;
- cartografía.

### Datos derivados

Recomendaciones o indicadores calculados deben identificar claramente de qué datos parten. Una futura IA puede ayudar a interpretar, pero **el núcleo funcional no dependerá de una API de IA** y nunca sustituirá la procedencia del dato original.

## Backend

Esta fase **no elige todavía el backend definitivo**.

La capa de repositorios permite evaluar PocketBase u otra solución sin acoplar las pantallas a un SDK concreto. La decisión de persistencia se hará después de migrar la UI al contrato común y definir autenticación, permisos, sincronización y copias de seguridad.

## Orden de migración de la UI

1. Inicio.
2. Mi Campo / parcelas.
3. Cuaderno.
4. Campaña / entregas / gastos.
5. Meteorología y alertas.
6. Mercado.
7. Cooperativas.
8. Noticias / Mágina.
9. Descubre.
10. Perfil y documentos.

Cada migración debe conservar las capturas y contratos visuales de V2.

## Reglas de implementación

- No introducir datos reales directamente dentro de componentes JSX.
- No mezclar valores demo con resultados externos en una misma entidad sin marcar su procedencia.
- No hacer que un componente dependa de PocketBase, una API meteorológica o un proveedor concreto.
- Mantener IDs estables dentro del dominio.
- Mantener fechas en formato ISO en la capa de datos y formatearlas solo en presentación.
- Mantener unidades explícitas en cantidades y precios.
- Conservar la V2 VISUAL como autoridad de presentación.

## Próximo paso

Migrar **Inicio** para leer del repositorio demo en lugar de valores hardcodeados, manteniendo exactamente la jerarquía visual existente.

Después de demostrar el patrón en Inicio, repetirlo en Mi Campo y Cuaderno antes de conectar persistencia real.
