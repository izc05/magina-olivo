# #725 — auditoría de Perfil, continuación

Base Android main `26111d6be69b258af21c10c44a6be2462ea1e46b`. Worktree propio `issue725-profile-audit`, rama `codex/issue725-profile-audit`. Auditoría en curso: este inventario de código no declara QA visual/E2E completada ni cuenta/sync implementadas.

Se conserva el trabajo anterior. PR #748 (#512) se valida en CI de forma independiente; #743 y #721 siguen esperando autorización. No APK candidata, producción Supabase, cambios de Room ni vinculación automática de fincas.

## Inventario inicial de controles reales

| Control | Código / ruta | Estado observado en código | QA pendiente |
| --- | --- | --- | --- |
| Tu municipio y provincia | MyProfile.kt, MyProfileViewModel → ProfileRepository | Editor existente, guardado local, errores y cierre tras éxito | Persistencia/reinicio, localidad preferida vs domicilio, fuente grande |
| Tu cooperativa | MyProfile.kt → OrganizationRepository | Selección/alta Organization reutilizada, roles admitidos | No duplicar y conservar contexto al cancelar |
| Mis máquinas | ProfileScreen.kt → onMachinery | Navegación real | Recorrido/vuelta |
| Aplicadores y asesores | ProfileScreen.kt → onAgronomicPeople | Recursos CUE anidados, sin pestaña raíz nueva | Recorrido/vuelta y privacidad |
| Apariencia | AppearanceSettings.kt → AppearanceStore | Sistema/Claro/Oscuro; estado confirmado tras persistir, error de escritura, controles ≥48 dp | Recreación/reinicio, mapa/campañas/pesadas y 360/font1.3 |
| Notificaciones | ProfileRoute, notificationsAllowed, notificationSettingsIntent | Lee permiso efectivo/canal y lo refresca ON_RESUME; abre ajustes Android | Denegado/concedido/canal bloqueado y regreso (#462) |
| Avisos | ReminderSettings en MyProfile.kt | Preferencia propia separada del permiso; hora y reconciliación existentes | Preferencia activa con permiso denegado, alarmas reales |
| Modo sin conexión | ProfileScreen.kt | Fila informativa sin acción; texto «nada depende de internet» demasiado amplio para fuentes externas | Contrastar Ayuda/offline y mapa/clima; no prometer sync |
| Ayuda, privacidad, novedades | HelpTopic y navegación Perfil | Rutas existentes cuando hay callback | Auditar textos completos, fuentes, legal y vuelta |
| Versión/build y Catastro | ProfileScreen.kt | Versión real; advierte que copia INSPIRE no es certificación | Lectura accesible, fuente grande |
| Catálogo de diseño | AppNavigation / ProfileRoute | Solo AppEnvironment.DEV | Confirmar ausente en producción sin generar candidata |
| Cargar/restablecer/retirar DEMO | DemoFarmSection → DemoFarmTools | Solo DEV; confirmaciones; repositorios canónicos | Idempotencia dos cargas, retirar solo DEMO, fotos/documentos reales intactos |
| Cuenta, login/registro, logout/delete/recuperación | Búsqueda en Android actual | No AuthRepository/cliente GoTrue/rutas de sesión encontrado en app/src/main; el uso Supabase visible es clima | Contrato #726, DEV/STAGING, consentimiento + copia Gate21; no botones simulados |
| Copia/restauración/cambio de dispositivo | Perfil actual / #321 | No control operativo encontrado en Perfil; no equiparar Android backup con exportación de datos/fotos | Contrato y restauración íntegra antes de ofrecerla |
| Mis datos / relación con finca / personas y acuerdos | #725 ampliaciones / #735 | Requisitos posteriores, no cubiertos por el editor municipio/cooperativa | Separar identidad, declaración y autorización; depende de RLS #743/#726 |

## Próximo bloque verificable

1. Leer íntegramente dependencias #462/#321/#714/#409/#696 y contratos #725/#726/#735, además de las pantallas de ayuda y repositorios existentes.
2. Capturar Perfil y editores sobre fixture aislado que preserve base original y preferencias; cubrir navegación, apariencia y permisos. El emulador original sigue en onboarding tras las pruebas aisladas: no se salta ni se borra para forzar capturas.
3. Comprobar DEMO en base UUID desechable, con finca/documentos independientes conservados; no retirar DEMO de la base operativa para demostrar el caso.
4. Corregir solo defectos demostrados dentro del alcance aprobado. Separar cambios de preferencias/QA de integración Auth/sync que necesita DEV/STAGING y migración consentida; nunca atribuir fincas legacy silenciosamente.
5. Pruebas, commit/push, PR y actualización #744 por entrega; pedir autorización de fusión solo cuando esté lista.