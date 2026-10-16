# G0 — cierre de las tres reproducciones de #752

Base Android integrada: `b35f5c22d83e407a93f29b01b5ca2eb8dcce036b` (#753).
Se conserva la historia de #743 y se incorpora main sin conflictos. Este bloque no
despliega migraciones ni activa sincronización Android.

## Evidencia local

Antes de corregir: el reproductor de #752 confirma buckets agrícolas públicos,
lectura de contrato por política Storage heredada `USING(true)` y ausencia de
parcelas para un delegado con `view_farm`. Las cuatro regresiones nuevas fallan
antes de rellenar la migración y pasan después. `npm test --prefix supabase`:
44/44 (39 PostgreSQL/PGlite con Auth/Storage de fixture y 5 simulaciones TypeScript).
No equivalen a pruebas HTTP contra Supabase ni datos reales de agricultores.

La nueva migración forward `20261016041222`:

- Convierte en privados únicamente `farm-attachments` y `farm-contracts`;
  preserva objetos, metadata y buckets ajenos.
- Rechaza políticas desconocidas en Storage y las quince tablas G0. No elimina
  automáticamente políticas de otros servicios. El inventario se compara por
  tabla y nombre; presupone que las políticas G0 conocidas son las creadas por
  estas migraciones, no una certificación de un proyecto arbitrario manipulado.
- Añade SELECT delegado por vínculo vigente y capacidad `view_farm`. No otorga
  escritura de parcelas ni acceso al resto del workspace. Caducidad, vigencia,
  borrado del vínculo y revocación se prueban explícitamente.

Ejecutar siempre el lote en transacción. Si aparece una política desconocida,
detenerse, inventariar su definición y revisar el cambio específico antes de
volver a migrar. No ignorar el error ni borrar todas las políticas. Ninguna
ejecución persistente DEV/STAGING/producción está autorizada por este bloque.

## Pruebas remotas necesarias

El workflow G0 usa Supabase nativo efímero y cuatro identidades Auth JWT, sin
correos, contra HTTP Auth/PostgREST/Storage, tanto limpio como legacy. Añade:
bucket realmente público antes y privado después, archivo conservado, descarga
anónima denegada, rechazo de política heredada y lectura delegada solo de la
parcela autorizada, sin escritura y sin acceso tras revocación. Las claves de
servicio solo pertenecen al fixture backend efímero; nunca a Android/artifacts.

Docker local no está disponible; las nuevas pruebas nativas quedan pendientes
de Actions hasta que el run del SHA publicado termine. Registrar SHA y enlaces
del run en #743/#744; no reutilizar los resultados verdes del HEAD anterior.

## Límites y siguientes gates

Compatibilidad #753: main mantiene su capa Auth; G0 usa `auth.uid()` del JWT
Supabase y prueba identidades nativas. No se vinculan UUID locales ni se envía
ningún agregado agrícola. No se han leído/modificado bases reales del usuario;
la conservación probada aquí utiliza fixtures sintéticos.

Los riesgos estáticos adicionales de #752 (reinvitación con grant vencido,
autor histórico de entregas y referencias polimórficas/de gastos) continúan
requiriendo regresiones y resolución antes de certificar todo G0. Este bloque
cierra solamente los tres defectos reproducidos; no habilita compartir fincas
en Android ni declara paridad de sincronización.

Fuentes: [buckets públicos y privados](https://supabase.com/docs/guides/storage/buckets/fundamentals)
y [políticas Storage](https://supabase.com/docs/guides/storage/security/access-control).
PR sin fusión; sin producción, SMTP, APK ni cambios Web V3.
