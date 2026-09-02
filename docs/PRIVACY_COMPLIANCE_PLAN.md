# Plan de privacidad y cumplimiento — Mágina Olivo

Fecha de revisión: 2026-09-02
Estado: diseño previo al piloto

> Este documento es una guía de arquitectura/producto y no sustituye asesoramiento jurídico específico antes de producción.

## 1. Por qué importa desde ahora

Mágina Olivo puede tratar:
- identidad y contacto del usuario;
- localización de fincas/parcelas;
- información productiva;
- entregas y rendimientos;
- documentos como tickets, albaranes, facturas o liquidaciones;
- fotografías;
- actividad dentro de la aplicación;
- futuras conexiones con terceros.

Aunque muchos datos sean agrícolas o empresariales, documentos y cuentas pueden contener datos personales. La privacidad debe integrarse antes de construir la base técnica.

## 2. Principios de diseño adoptados

### Minimización

Recoger solo lo necesario para la función concreta.

Ejemplos:
- el onboarding no exige DNI, CIF, REAFA o datos fiscales si no son necesarios;
- número de olivos es opcional;
- la cooperativa habitual puede omitirse;
- no solicitar credenciales de portales privados.

### Privacidad por defecto

Configuración inicial:
- explotación privada;
- documentos privados;
- sin publicación social;
- sin compartir con cooperativas;
- sin entrenar/crear datasets compartidos con documentos del usuario;
- notificaciones configurables.

### Limitación de finalidad

Los datos recogidos para gestionar la campaña no se reutilizan automáticamente para publicidad, scoring o cesión a terceros.

Una nueva finalidad requiere análisis y base adecuada antes de implementarse.

### Exactitud y trazabilidad

El usuario debe poder corregir datos.

Las importaciones conservan origen y estado de verificación para evitar presentar una extracción automática como hecho confirmado.

### Conservación limitada

Definir antes de producción políticas para:
- cuentas inactivas;
- staging de importación;
- logs;
- documentos borrados;
- copias de seguridad;
- datos de telemetría.

No conservar staging, errores o payloads completos indefinidamente “por si acaso”.

## 3. Roles jurídicos a determinar antes del lanzamiento

La asignación exacta de responsable/encargado depende del modelo comercial y de cada integración.

Hipótesis inicial que debe revisar asesoramiento jurídico:

### Servicio directo al agricultor

Mágina Olivo probablemente determinará medios/finalidades esenciales de la cuenta y servicio, por lo que habrá que analizar su posición como responsable de esos tratamientos.

### Infraestructura/hosting/proveedores

Los proveedores que procesen datos por cuenta de Mágina Olivo pueden actuar como encargados/subencargados según el servicio. Deben seleccionarse con garantías suficientes y formalizar lo necesario.

### Integración con una cooperativa

No asumir automáticamente que una parte es responsable y la otra encargada. Dependerá de quién decide finalidad/medios y de qué flujo de datos se acuerde.

Documentar cada integración por separado.

## 4. Base de legitimación

No codificar una única respuesta jurídica dentro de la arquitectura.

Antes de producción hay que documentar por tratamiento:
- finalidad;
- categorías de datos;
- personas afectadas;
- base jurídica aplicable;
- destinatarios;
- conservación;
- medidas de seguridad;
- transferencias internacionales si las hubiera.

El consentimiento no debe utilizarse por comodidad cuando corresponda otra base, ni convertirse en una casilla genérica para todo.

## 5. Documentos de cooperativa

Reglas de producto:
- documento privado por defecto;
- solo visible para miembros autorizados de la explotación;
- conservar original separado de datos extraídos;
- no reutilizar para otros agricultores;
- no publicar;
- no enviar a IA/OCR externo sin que la arquitectura y la información al usuario cubran ese tratamiento;
- permitir eliminación conforme a la política aplicable.

Los nombres de archivo pueden contener datos personales, por lo que no deben usarse como claves públicas.

## 6. Geolocalización y SIGPAC

La ubicación de una finca puede asociarse a una persona y tener sensibilidad económica/privada.

Medidas:
- no hacer públicas las parcelas por defecto;
- no mostrar coordenadas en URLs compartibles sin control;
- limitar precisión en telemetría cuando no sea necesaria;
- evitar almacenar historial de ubicación del móvil si la función solo necesita ubicar una parcela puntual.

Mágina Olivo necesita ubicación de la finca, no vigilancia continua del agricultor.

## 7. IA/OCR futuro

Antes de enviar documentos o texto a cualquier proveedor de IA:
- identificar proveedor y rol;
- revisar condiciones de tratamiento;
- definir qué datos se envían;
- minimizar/redactar cuando sea viable;
- evaluar subencargados y localización del tratamiento;
- revisar transferencias internacionales cuando proceda;
- establecer retención adecuada;
- informar al usuario;
- permitir alternativa manual cuando sea razonable.

La IA devuelve borradores, no hechos confirmados.

No introducir una API de IA en la V1 solo por disponer de ella.

## 8. Telemetría y analítica

La analítica del piloto debe ser útil y mínima.

Sí interesa medir:
- duración del flujo de entrega;
- errores técnicos;
- abandono de onboarding;
- uso agregado de pantallas.

No necesitamos para ello:
- copiar el contenido de tickets;
- registrar notas de campo en analytics;
- registrar kilos/rendimientos completos en herramientas de terceros;
- capturar sesiones con datos privados visibles.

Si se utiliza replay de sesión en el futuro, debe configurarse con enmascarado fuerte y pasar revisión específica.

## 9. Desarrollo y pruebas

Regla:

> desarrollo y CI usan datos sintéticos por defecto.

No copiar la base de producción a un portátil o staging para probar una pantalla.

Si se necesita reproducir un fallo real:
- extraer el mínimo;
- anonimizar/pseudonimizar cuando sea posible;
- restringir acceso;
- eliminar al terminar.

## 10. Seguridad mínima antes del piloto

- HTTPS en todo acceso remoto;
- contraseñas gestionadas mediante sistema de autenticación robusto;
- protección frente a enumeración/IDOR;
- autorización backend por `holding_id`;
- almacenamiento de documentos privado;
- URLs temporales para descargas cuando proceda;
- cifrado de secretos/tokens;
- backups cifrados o adecuadamente protegidos;
- logs sin secretos;
- rate limiting en autenticación/endpoints sensibles;
- dependencias actualizadas;
- recuperación de cuenta segura;
- proceso de revocación de sesiones;
- auditoría de acciones críticas.

2FA puede incorporarse según riesgo/modelo, especialmente para administración de plataforma.

## 11. Brechas e incidentes

Antes del piloto debe existir un procedimiento, aunque sea sencillo, para:
- detectar;
- contener;
- registrar;
- evaluar alcance;
- recuperar;
- determinar obligaciones de notificación/comunicación;
- documentar decisiones.

No improvisar el proceso después de una filtración.

## 12. Derechos del usuario

La arquitectura debe permitir localizar los datos asociados a una cuenta/explotación para poder atender los derechos aplicables.

Funciones de producto deseables:
- consultar datos;
- corregir;
- exportar;
- solicitar baja/eliminación;
- revocar conexiones externas.

No prometer eliminación instantánea de todas las copias si los backups tienen un ciclo técnico documentado; la política deberá explicar su tratamiento.

## 13. Información y transparencia

Antes de beta real:
- política de privacidad clara;
- términos del servicio;
- información de cookies/almacenamiento si aplica;
- contacto de privacidad;
- listado/categorías de proveedores relevantes;
- explicación de importaciones e IA si se activan;
- distinción clara entre Mágina Olivo y las cooperativas.

La ficha de cooperativa debe indicar que los datos informativos provienen de fuentes públicas y que los trámites oficiales se realizan por sus canales.

## 14. Riesgos concretos del producto

### R1 — IDOR/multi-tenant
Un agricultor accede a la entrega/documento de otro cambiando un ID.

Mitigación: autorización backend obligatoria y tests negativos.

### R2 — Bucket/documentos públicos
Un ticket puede encontrarse mediante URL.

Mitigación: almacenamiento privado, objetos no adivinables, acceso temporal autorizado.

### R3 — Logs con datos productivos/documentales
Un error vuelca payloads enteros.

Mitigación: logging estructurado, redacción y límites.

### R4 — Importación mal interpretada
Se atribuyen kilos/rendimientos erróneos.

Mitigación: staging, warnings, procedencia y confirmación.

### R5 — IA externa
Documento completo se envía sin control contractual/técnico.

Mitigación: IA fuera del núcleo V1 y revisión previa específica.

### R6 — Scraping de portal privado
Se almacenan contraseñas y se simula login.

Mitigación: prohibido como estrategia base; solo integraciones autorizadas.

### R7 — Datos reales en staging/dev
Copias de producción terminan expuestas.

Mitigación: datos sintéticos por defecto.

## 15. Checklist antes de piloto real

- [ ] inventario de tratamientos;
- [ ] responsables/encargados definidos;
- [ ] base jurídica revisada;
- [ ] política de privacidad;
- [ ] contratos con proveedores necesarios;
- [ ] política de conservación;
- [ ] proceso de derechos;
- [ ] proceso de incidentes/brechas;
- [ ] backups y restauración probados;
- [ ] tests de aislamiento multiusuario;
- [ ] documentos realmente privados;
- [ ] telemetría minimizada;
- [ ] datos sintéticos en desarrollo;
- [ ] análisis de riesgos documentado;
- [ ] evaluación sobre EIPD cuando el diseño final permita determinar si resulta necesaria;
- [ ] revisión jurídica previa a apertura pública.

## 16. Fuentes regulatorias de referencia

- AEPD — Protección de datos por defecto, actualización 05/01/2026:
  https://www.aepd.es/derechos-y-deberes/cumple-tus-deberes/medidas-de-cumplimiento/proteccion-de-datos-por-defecto
- AEPD — Protección de datos desde el diseño:
  https://www.aepd.es/derechos-y-deberes/cumple-tus-deberes/medidas-de-cumplimiento/proteccion-de-datos-desde-el-diseno
- AEPD — Seguridad de los tratamientos:
  https://www.aepd.es/derechos-y-deberes/cumple-tus-deberes/medidas-de-cumplimiento/seguridad-de-los-tratamientos
- Reglamento (UE) 2016/679 (RGPD), especialmente principios, protección desde el diseño y seguridad.

## Decisión de proyecto

La privacidad no se dejará para “cuando haya usuarios”. El modelo de permisos, almacenamiento y procedencia de datos se está cerrando antes de implementar el MVP precisamente para no tener que reconstruirlo después.
