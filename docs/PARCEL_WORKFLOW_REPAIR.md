# Alta y revisión de parcelas

## Recorrido implementado

En Mi Campo → Mapa existe un único selector de parcela para GPS, Catastro,
SIGPAC y comparación. Cada consulta utiliza la parcela seleccionada. Guardar
ubicación/perímetro o importar cartografía actualiza las consultas siguientes.
Los pasos se muestran por separado para reducir el desplazamiento vertical.

«Añadir parcela por GPS o Catastro» prepara el nombre y ubicación GPS o una
referencia cartográfica de 14 caracteres, sin crear una parcela vacía. Requiere
confirmar que se gestiona la parcela antes de enviar el alta.
La consulta por referencia muestra la geometría y superficie oficial antes de
confirmar. La vista previa no acredita propiedad y se verifica de nuevo al guardar.

El alta GPS guarda un punto, no los límites. El alta con `verifyCatastro: true`
consulta de nuevo el servicio oficial, valida la geometría y crea la parcela y
su perímetro en una sola sentencia SQL, después de comprobar permisos de finca.
Si el servicio falla o la geometría no es compatible, no crea ningún registro.
Una referencia declarada sin esa bandera no recibe procedencia oficial.

## Límites pendientes

La selección de varias parcelas sobre ortofoto, búsqueda por municipio/polígono,
normalización guiada de referencias de inmueble siguen pendientes del diseño
PARCEL_MAP_FIRST_V1. No se anuncia
GPS offline ni verificación de propiedad. La prueba del GPS requiere un
dispositivo físico con HTTPS y permiso de ubicación.
