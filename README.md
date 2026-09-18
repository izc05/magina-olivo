# Mágina Olivo

Aplicación Android nativa para la gestión diaria del olivar, diseñada con enfoque **offline-first** y preparada para trabajar con una o varias fincas y sus parcelas.

## Objetivo

Mágina Olivo centraliza la información que un agricultor necesita para gestionar su propio olivar sin depender de una cooperativa concreta ni de una conexión permanente a Internet.

La primera etapa prioriza:

- Fincas y parcelas.
- Incorporación de parcelas mediante mapa/Catastro y alta manual.
- Campañas agrícolas.
- Actuaciones, labores, tratamientos, riegos, notas y fotografías.
- Cosecha, entregas, kilos y rendimientos.
- Gastos y documentos.
- Histórico y comparativas entre campañas.
- Tiempo, radar y alertas útiles para el campo.
- Mercado del aceite y avisos relevantes.
- Sincronización remota mediante Supabase sin perder el funcionamiento offline.

## Arquitectura canónica

- Producto principal: **Android nativo**.
- Arquitectura: **offline-first**.
- Backend remoto desacoplado: **Supabase**.
- Núcleo de dominio: **finca → parcela → campaña → actuación → cosecha / gastos / documentos**.
- Catastro y otras fuentes cartográficas sirven para incorporar y consultar parcelas; la app conserva su propia geometría y sus identificadores internos.
- El enfoque inicial es el agricultor gestionando sus propias fincas. El modo profesional para gestionar fincas de terceros queda para una fase posterior.
- El desarrollo se realiza por fases y gates, en ramas aisladas.

## Diseño

La línea visual canónica utiliza crema y verde olivo, fotografía del olivar y Sierra Mágina, tipografía editorial combinada con una sans operativa, tarjetas suaves y una experiencia móvil limpia.

El onboarding tendrá entre 4 y 6 pantallas y explicará las funciones principales antes de entrar a la aplicación.

## Desarrollo con agentes

Las instrucciones canónicas del repositorio están en:

- `.github/copilot-instructions.md`
- `AGENTS.md`
- `.github/skills/`

Las Agent Skills cubren arquitectura Android, dominio agrícola, Catastro/mapas, meteorología, Supabase/sincronización, UI, testing/gates y flujo Git seguro.

Antes de modificar arquitectura, modelos compartidos o integración entre ramas, los agentes deben leer primero las instrucciones y la skill específica correspondiente.

## Protección de main

Los pull requests a `main` deben superar:

- **MVP Core Gate**
- **Technical Spike Gate**

Los gates validan la integridad del repositorio y, cuando existe proyecto Android, ejecutan pruebas unitarias y compilación de depuración.

## Estado

Proyecto en desarrollo activo. La documentación histórica de etapas web/PWA puede seguir existiendo en ramas antiguas, pero no representa la baseline actual salvo que se indique expresamente.
