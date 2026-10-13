# Continuación #723 — ficha de pesada

Base: main `7c49dcd47c630a07263b16fc2d16213841a1a9f2`, incluida la PR #745 ya autorizada y fusionada. Rama independiente `codex/issue723-delivery-detail-continuation`. Requisitos aprobados: issue #723 y continuación del propietario; se conservan los trabajos de #696/#721 y la línea del mapa #746.

## Alcance

Solo presentación Android de DeliveryDetailScreen. La pesada conserva identidad, fecha, origen y valores propios; dos vales del mismo día siguen separados. No se cambian DeliveryRules, repositorios, ViewModels, Room, sumatorios, costes/kg, PDFs, navegación, OCR ni sincronización.

1. Añadir pruebas nativas de datos/campos y evidencia del estado anterior: DEMO-003, otro vale de la misma fecha, reparto exacto/desconocido y campos no registrados. Usar datos sintéticos o demo en un contenedor de pruebas, sin borrar ni reescribir datos reales.
2. Mostrar peso neto, vale, fecha, cooperativa y origen con los componentes y tema existentes. Agrupar Resumen, Vale y pesaje, Parcelas de origen y Notas y foto. Usar No registrado para campos ausentes y Pendiente de distribuir cuando el reparto sea desconocido; no calcular un reparto nuevo ni completar datos inexistentes.
3. Acortar la explicación de jornada conservando la aclaración accesible de suma por día. Mantener edición, rendimiento, eliminación y documentos con sus callbacks y restricciones actuales. La foto continúa siendo opcional y no activa OCR.
4. Verificar claro/oscuro, 360/390 dp y fuente 1.0/1.3, accesibilidad y acceso a acciones. Conservar capturas antes/después y registros auténticos. Ejecutar JVM y regresiones de campaña/demo/PDF pertinentes: 6.680 kg, cuatro pesadas y tres días.
5. Revisión, commit, push y PR independiente. Actualizar #744 con SHA y resultados locales/CI separados. Solicitar autorización de fusión solo cuando los controles del SHA final estén verdes.

## Límites de entrega

No APK candidata, despliegue Supabase de producción ni cambios en ramas/archivos de otros agentes. Web V3 sigue pausada. La prueba física permanece independiente de la evidencia del emulador.
