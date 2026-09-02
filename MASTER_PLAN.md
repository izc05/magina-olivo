# Mágina Olivo — Master Plan V1

## 1. Visión

Mágina Olivo será una plataforma web/PWA orientada al olivarero, especialmente pensada para explotaciones de Sierra Mágina y extensible a otras zonas olivareras.

Su objetivo es reunir en una sola herramienta la información diaria de la explotación y reducir la dispersión actual entre libretas, WhatsApp, documentos, webs de cooperativas y aplicaciones especializadas.

## 2. Principios del producto

1. **Útil sin integraciones externas.** La V1 debe funcionar aunque ninguna cooperativa aporte una API.
2. **Móvil primero.** La experiencia principal será desde teléfono, como PWA instalable.
3. **Datos del agricultor como fuente principal.** El usuario mantiene el control de sus fincas, campañas, entregas y documentos.
4. **Automatización antes que IA.** Cálculos, recordatorios y avisos se resuelven con lógica normal siempre que sea posible.
5. **IA opcional.** La IA mejora la entrada y consulta de datos, pero la plataforma no depende de ella.
6. **Simplicidad.** Registrar una labor, una entrega o una nota debe requerir el mínimo número de pasos.
7. **Trazabilidad.** Los datos relevantes deben conservar fecha, origen y usuario que los registró.
8. **Privacidad por diseño.** Los datos de explotación, documentos y campañas son privados por defecto.

## 3. Usuario principal

Agricultor/olivarero que necesita:

- Saber qué tiene y dónde.
- Registrar lo que hace en cada parcela.
- Controlar campañas y entregas.
- Conocer kilos, rendimientos y evolución.
- Consultar información útil de cooperativas.
- Recibir avisos meteorológicos y operativos.
- Guardar documentos, notas y fotografías.

## 4. Navegación objetivo

- Inicio
- Mi campo
- Campañas
- Entregas
- Rendimientos
- Labores
- Cooperativas
- Avisos
- Documentos
- Perfil

## 5. Módulos V1

### 5.1 Inicio

Panel resumido con:

- Campaña activa.
- Kilos entregados.
- Rendimiento medio.
- Próximas tareas.
- Alertas meteorológicas.
- Últimas labores.
- Accesos rápidos.

### 5.2 Mi campo

Jerarquía inicial:

`Explotación → Finca → Parcela`

Cada parcela podrá incluir:

- Nombre.
- Localización.
- Superficie.
- Referencia SIGPAC si se dispone.
- Variedad/es.
- Número aproximado de olivos.
- Régimen de riego/secano.
- Fotografías.
- Notas.
- Estado activo/inactivo.

### 5.3 Campañas

Una campaña agrupa el trabajo y los resultados de una temporada.

Datos principales:

- Año/campaña.
- Fecha de inicio y fin.
- Estado.
- Parcelas participantes.
- Kilos totales.
- Rendimiento medio.
- Gastos.
- Observaciones.

### 5.4 Entregas

Registro de entregas de aceituna:

- Fecha.
- Cooperativa/destino.
- Parcela o finca de origen.
- Kilos.
- Tipo/variedad cuando proceda.
- Número de ticket o albarán.
- Rendimiento si ya está disponible.
- Documento/fotografía adjunta.
- Notas.

### 5.5 Rendimientos

- Rendimiento por entrega.
- Media de campaña.
- Comparación entre parcelas.
- Comparación entre cooperativas si existen datos suficientes.
- Comparación entre campañas.

Los cálculos serán deterministas y no dependerán de IA.

### 5.6 Labores

Tipos iniciales:

- Tratamiento.
- Abonado.
- Poda.
- Desbroce.
- Laboreo.
- Riego.
- Recolección.
- Mantenimiento.
- Otra labor.

Cada labor puede tener fecha, parcela, descripción, producto/material, cantidad, coste, fotografías y notas.

### 5.7 Cooperativas

Directorio informativo con datos públicos y trazables:

- Nombre oficial.
- Municipio.
- Dirección.
- Teléfono.
- Web oficial.
- Horarios cuando estén publicados.
- Servicios.
- Marcas/aceites.
- Certificaciones públicas.
- Noticias/avisos públicos relevantes.
- Fecha y fuente de actualización.

Mágina Olivo no debe aparentar ser la web oficial de una cooperativa ni copiar contenido protegido de forma indiscriminada.

### 5.8 Avisos

Tipos iniciales:

- Meteorología.
- Tareas programadas.
- Recordatorios de labores.
- Documentación pendiente.
- Eventos de campaña.

### 5.9 Documentos

- Albaranes.
- Tickets.
- Informes.
- Facturas.
- Fotografías.
- Otros documentos de explotación.

## 6. IA — fase opcional

Nombre provisional: **Mágina IA**.

Casos de uso prioritarios:

- Convertir una frase en un registro estructurado.
- Extraer datos de un ticket/albarán.
- Resumir la campaña del usuario.
- Responder preguntas usando únicamente datos autorizados del usuario.
- Ayudar a localizar información dentro de la aplicación.

La IA nunca será la fuente de verdad de kilos, rendimientos, tratamientos o cálculos normativos.

## 7. Automatizaciones

Automatizaciones previstas:

- Actualización meteorológica programada.
- Avisos por lluvia, helada, calor o viento según reglas configurables.
- Recalcular campaña al registrar/modificar una entrega.
- Recalcular rendimientos agregados.
- Recordatorios de tareas.
- Resumen diario/semanal opcional.
- Detección de registros incompletos.
- Sincronización futura con fuentes externas autorizadas.

## 8. Fases

### Fase 0 — Investigación y definición

- Mercado.
- Cooperativas.
- Casos de uso.
- Datos necesarios.
- Riesgos legales y de privacidad.

### Fase 1 — Fundación técnica

- PWA.
- Autenticación.
- Modelo de datos.
- Backend.
- Seguridad.
- Entornos.

### Fase 2 — Núcleo funcional

- Fincas y parcelas.
- Campañas.
- Entregas.
- Rendimientos.
- Labores.

### Fase 3 — Información y automatización

- Cooperativas.
- Meteorología.
- Avisos.
- Automatizaciones.

### Fase 4 — Mágina IA

- Entrada por lenguaje natural.
- Lectura asistida de documentos.
- Consultas sobre datos propios.

### Fase 5 — Integraciones

- SIGPAC/mapas.
- Fuentes públicas adicionales.
- Cooperativas que colaboren.
- Exportaciones/importaciones.

## 9. Criterio de éxito de V1

La V1 estará lista para piloto cuando un agricultor pueda usarla durante una campaña para:

1. Crear sus parcelas.
2. Registrar labores.
3. Registrar entregas.
4. Consultar kilos y rendimientos.
5. Recibir avisos útiles.
6. Guardar documentos.
7. Usarla cómodamente desde el móvil.
8. Exportar sus datos básicos.

sin necesitar una integración con una cooperativa ni una API de IA.
