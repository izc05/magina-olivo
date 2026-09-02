# Estrategia de IA — Mágina Olivo

## Objetivo

La IA será una capa opcional para reducir fricción, nunca el núcleo operativo del producto.

## Casos de uso prioritarios

### Entrada por lenguaje natural

Ejemplo:

> Hoy he tratado Las Viñas con cobre, 300 litros.

Salida estructurada propuesta:

- tipo: tratamiento
- parcela: Las Viñas
- producto: cobre
- cantidad_caldo: 300 L
- fecha: hoy

El usuario revisa y confirma antes de guardar.

### Lectura de albaranes/tickets

La IA podrá proponer:

- cooperativa
- fecha
- kilos
- rendimiento
- número de documento
- variedad u otros campos si aparecen claramente

El documento original debe conservarse como evidencia y la extracción debe marcarse como propuesta hasta confirmación.

### Preguntas sobre datos propios

Ejemplos:

- ¿Cuántos kilos llevo esta campaña?
- ¿Qué parcela está dando mejor rendimiento?
- ¿Cuánto gasté en tratamientos el año pasado?
- ¿Qué labores tengo pendientes?

Los cálculos deben ejecutarse mediante funciones/consultas deterministas y la IA limitarse a interpretar la intención y explicar el resultado.

## Arquitectura

```text
Usuario
  ↓
Backend Mágina Olivo
  ├── autorización
  ├── selección mínima de contexto
  ├── herramientas deterministas
  └── llamada opcional a proveedor IA
          ↓
     respuesta estructurada
          ↓
     validación de esquema
          ↓
     usuario confirma
```

## Reglas

1. Ninguna API key de IA llega al navegador.
2. No enviar más datos de los necesarios.
3. No enviar documentos privados a un proveedor sin informar y tener base legal/configuración adecuada.
4. Toda respuesta estructurada se valida con esquema.
5. La IA no decide por sí sola datos críticos.
6. Los cálculos numéricos importantes se realizan en código.
7. Las escrituras críticas requieren confirmación o una regla determinista explícita.
8. Debe existir la posibilidad de desactivar IA completamente.

## Proveedores

La aplicación no debe acoplarse a un proveedor concreto.

Crear una interfaz interna similar a:

```text
AIProvider
  ├── parseNaturalLanguage()
  ├── extractDocument()
  └── answerWithTools()
```

Esto permitirá evaluar proveedores según coste, calidad, privacidad y disponibilidad.

## Control de costes

Registrar por operación:

- tipo de función
- proveedor/modelo
- tokens o unidad de consumo si aplica
- coste estimado
- usuario/organización
- fecha
- éxito/error

Incluir límites por usuario/plan antes de abrir funciones de IA a escala.

## IA y seguridad agrícola

Mágina IA no debe presentarse como sustituto de un técnico competente ni emitir como hecho recomendaciones agronómicas de alto impacto sin fuentes, contexto y salvaguardas apropiadas.

Priorizar funciones de organización, consulta y extracción de información frente a asesoramiento agronómico autónomo.
