# Codex Review Gate — Mágina Olivo · Mi Campo V4/V4.1

Fecha: 2026-09-08
Estado: revisión obligatoria de PRs implementadas por otro agente

## 1. Rol de Codex

Codex actúa como **revisor independiente**. No debe asumir que una implementación es correcta por estar completa o visualmente atractiva.

Objetivo:

> Verificar que el código implementado respeta arquitectura, UX, seguridad, accesibilidad, GIS/Catastro, offline, datos y mantenibilidad antes de integrar.

## 2. Documentación obligatoria

Antes de revisar un PR, leer:

1. `docs/design/MI_CAMPO_UX_V4.md`
2. `docs/design/MI_CAMPO_UI_V4_1_CAMPO_CLARO.md`
3. `docs/design/MI_CAMPO_SCREEN_CONTRACTS_V4_1.md`
4. `docs/design/ACTION_CENTER_V1.md`
5. `docs/design/CATASTRO_LINK_EXISTING_PLOT_V1.md`
6. `docs/ANTIGRAVITY_MI_CAMPO_IMPLEMENTATION_BRIEF.md`
7. `docs/CODEX_MI_CAMPO_UX_V4_BRIEF.md`
8. `docs/CODEX_MI_CAMPO_UI_V4_1_BRIEF.md`
9. `docs/OFFLINE_SYNC_SPEC.md`
10. `docs/DESIGN_SYSTEM_V1.md`

## 3. Principio de revisión

No revisar solo si “funciona”. Revisar si funciona **como Mágina**.

Pregunta de control:

```text
¿Una persona que no conoce la arquitectura técnica puede usar esta pantalla sin aprender un ERP?
```

## 4. Checklist de arquitectura

- [ ] Barra privada = Inicio / Mi Campo / + / Campaña / Más.
- [ ] `+` abre Centro de acciones.
- [ ] Una acción usa un único formulario independientemente del punto de entrada.
- [ ] Se conserva `Holding -> Finca -> Parcela` como datos, no como navegación obligatoria.
- [ ] No se duplica timeline/cuaderno.
- [ ] No se crean providers/endpoints duplicados sin justificación.
- [ ] Componentes nuevos tienen responsabilidad acotada.
- [ ] No hay mega-componentes equivalentes al antiguo FieldNotebook.

## 5. Checklist visual V4.1 Campo Claro

- [ ] Finca/Parcela pueden usar fotografía protagonista.
- [ ] Tareas/Riegos/Tratamientos/Jornales no repiten hero fotográfico grande.
- [ ] Hay menos cajas anidadas y menos decoración.
- [ ] Solo una CTA principal por pantalla.
- [ ] Tipografía de UI legible y consistente.
- [ ] Iconos de una misma familia/estilo.
- [ ] Colores son semánticos, no ornamentales.
- [ ] Estados no dependen únicamente de color.
- [ ] Targets táctiles adecuados para exterior.
- [ ] La pantalla funciona a 320 px y zoom/reflow razonable.

## 6. Checklist de Mi Campo

- [ ] Fincas y parcelas es acceso principal de organización.
- [ ] Mapa y lindes es acceso territorial.
- [ ] Módulos de gestión muestran resumen + CTA + recientes + histórico.
- [ ] La portada no es un dashboard saturado.
- [ ] Abrir finca/parcela requiere pocos pasos.

## 7. Checklist Centro de acciones

- [ ] Máximo 10 acciones principales V1.
- [ ] Contexto actual visible.
- [ ] Si viene de parcela, finca/parcela preseleccionadas.
- [ ] Si viene de finca, admite finca completa/multiparcela cuando aplique.
- [ ] Si viene sin contexto, pregunta lo imprescindible.
- [ ] Cerrar/cancelar no deja estado fantasma.
- [ ] Cambiar contexto no contamina futuros registros.

## 8. Checklist Catastro / GIS

- [ ] GPS solo se solicita tras acción explícita.
- [ ] GPS no se usa como prueba de propiedad.
- [ ] El lenguaje no afirma titularidad.
- [ ] Catastro y SIGPAC se presentan como fuentes.
- [ ] Validación oficial se repite server-side antes de persistir.
- [ ] El navegador no se convierte en autoridad geométrica.
- [ ] Existe fallback si Catastro/SIGPAC/ortofoto fallan.
- [ ] Existe alternativa accesible/lista al mapa.
- [ ] Duplicados de parcela están contemplados.
- [ ] Diferencia entre superficie declarada y oficial no se sobrescribe silenciosamente.

## 9. Checklist Map First

- [ ] No se obliga a crear parcela vacía antes de localizar.
- [ ] Entradas: mapa / GPS / referencia / polígono-parcela.
- [ ] Selección oficial antes de datos agrícolas.
- [ ] Asignar/crear finca después de localizar.
- [ ] Foto recomendada pero no bloqueante.
- [ ] Guardado produce parcela visible inmediatamente en Mi Campo.

## 10. Checklist Riegos

- [ ] Tipo de riego.
- [ ] Red/comunidad.
- [ ] Sector.
- [ ] Días habituales.
- [ ] Avisos configurables.
- [ ] Registrar riego desde módulo y desde `+` usa el mismo formulario.
- [ ] Próximo riego y últimos riegos se distinguen claramente.
- [ ] No se emparejan usuarios de alertas por texto libre si el modelo ya permite IDs estables.

## 11. Checklist Tareas

- [ ] Nueva tarea puede dirigirse a cualquier finca/parcela válida.
- [ ] Hoy / Próximas / Completadas se entienden sin explicación.
- [ ] Prioridad no depende solo de color.
- [ ] Completar tarea actualiza histórico/resumen.

## 12. Checklist Jornales y maquinaria

- [ ] Jornal puede asociarse a finca/parcela.
- [ ] Persona/cuadrilla y horas/jornales son claros.
- [ ] Maquinaria puede registrarse sin duplicar una labor.
- [ ] Resumen mensual no sustituye el histórico.
- [ ] QR solo se muestra si existe soporte real.

## 13. Checklist Cuaderno

- [ ] Es timeline unificado.
- [ ] No tiene formularios duplicados.
- [ ] Registros creados desde módulos aparecen aquí.
- [ ] Filtros no rompen trazabilidad.

## 14. Offline / sincronización

- [ ] No se afirma guardado si sigue pendiente.
- [ ] Estados offline/pending son visibles.
- [ ] Se mantiene outbox donde ya existe.
- [ ] Map First exige red solo donde realmente la fuente oficial lo requiere.
- [ ] Datos ya guardados siguen consultables según política vigente.
- [ ] Cerrar sesión con pendientes sigue protegido.

## 15. Documentos / fotos

- [ ] Reutiliza almacenamiento privado existente.
- [ ] No crea storage paralelo.
- [ ] Permisos entre holdings siguen aislados.
- [ ] Fallo de subida no se muestra como éxito.
- [ ] Foto cover y adjuntos tienen semántica clara.

## 16. Seguridad y permisos

- [ ] Viewer no puede escribir.
- [ ] IDs de finca/parcela se validan contra el holding del usuario.
- [ ] No hay IDOR entre explotaciones.
- [ ] Admin de alertas requiere rol adecuado.
- [ ] Envíos masivos requieren confirmación y auditoría.

## 17. Accesibilidad

- [ ] WCAG 2.2 AA objetivo.
- [ ] Foco visible.
- [ ] Labels reales.
- [ ] Botones/links distinguibles.
- [ ] Navegación por teclado razonable.
- [ ] Mensajes de error comprensibles.
- [ ] Mapas no son el único modo de completar tareas.

## 18. Tests requeridos

Revisar evidencia de:

- lint
- typecheck
- unit tests
- integration tests
- smoke responsive
- Catastro/SIGPAC
- offline
- documents
- campaigns/deliveries
- permissions

Si faltan tests para lógica nueva significativa, pedirlos antes de aprobar.

## 19. Revisión visual

Comparar screenshots con los contratos V4.1.

No exigir pixel-perfect respecto a imágenes generadas.
Sí exigir:

- jerarquía
- densidad
- consistencia
- contraste
- navegación
- contexto
- patrón resumen -> CTA -> recientes -> histórico

## 20. Clasificación de hallazgos

Codex debe clasificar cada hallazgo:

- **BLOCKER**: seguridad, pérdida de datos, flujo principal roto, aislamiento, corrupción de geometría.
- **HIGH**: contradicción fuerte con V4/V4.1, accesibilidad grave, duplicación arquitectónica importante.
- **MEDIUM**: UX confusa, inconsistencia, test ausente, deuda técnica relevante.
- **LOW**: polish visual, nombres, microinteracciones no críticas.

## 21. Resultado de revisión

El informe debe terminar con uno de:

```text
APPROVE
APPROVE WITH FOLLOW-UPS
REQUEST CHANGES
BLOCK
```

Y debe incluir:

1. resumen
2. archivos revisados
3. hallazgos por severidad
4. tests/evidencias comprobadas
5. discrepancias con documentación
6. recomendación final

## 22. Gate final

No aprobar mientras exista un BLOCKER o HIGH sin resolver/aceptar explícitamente.

La pregunta final es:

> ¿Podemos integrar esto sin perder simplicidad, trazabilidad, seguridad ni capacidad futura de Mágina Olivo?
