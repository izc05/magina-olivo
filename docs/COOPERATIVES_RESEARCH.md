# Investigación de cooperativas — Mágina Olivo

## Objetivo

Crear un inventario verificable de cooperativas objetivo y de la información pública que puede incorporarse legal y técnicamente a Mágina Olivo.

## Campos de investigación por cooperativa

- Nombre oficial.
- Municipio.
- Dirección.
- Teléfono.
- Correo público.
- Web oficial.
- Redes oficiales si aportan información útil.
- Horarios publicados.
- Servicios al socio.
- Marcas/aceites comercializados.
- Certificaciones públicas.
- Noticias/avisos de campaña.
- Información sobre recepción de aceituna.
- Área privada existente para socios.
- Aplicación móvil existente.
- Posibilidad visible de exportar datos.
- API oficial conocida.
- Contacto técnico/comercial para futuras integraciones.
- Restricciones/condiciones de uso relevantes.
- Fecha de última revisión.

## Clasificación de datos

### A — Datos básicos reutilizables como referencia

Ejemplos: nombre, dirección, teléfono, enlace oficial, municipio.

### B — Datos públicos que requieren atribución y revisión de condiciones

Ejemplos: horarios, servicios, avisos, certificaciones, noticias.

### C — Contenido que no debe copiarse sin permiso

Ejemplos: textos editoriales completos, fotografías, diseños, artículos íntegros o bases de datos protegidas.

### D — Datos privados de socio

Nunca obtener ni tratar sin autorización explícita e integración segura.

Ejemplos: entregas, liquidaciones, rendimientos individuales, datos fiscales, documentos personales.

## Estrategia recomendada

1. Construir primero el directorio con datos A y enlaces oficiales.
2. Añadir datos B solo con fuente y fecha de revisión.
3. Evitar replicar C; enlazar a la fuente cuando sea suficiente.
4. Tratar D únicamente mediante consentimiento e integración autorizada.

## Integración futura

Una cooperativa colaboradora podría ofrecer:

- OAuth/SSO o mecanismo equivalente;
- consulta de entregas;
- consulta de rendimientos;
- descarga de documentos;
- avisos al socio;
- datos de campaña.

Mágina Olivo debe normalizar cualquier integración en su propio modelo interno para no depender de un único proveedor/cooperativa.
