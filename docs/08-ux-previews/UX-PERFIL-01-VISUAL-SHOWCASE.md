# Showcase Visual de Prototipos: Perfil, Cuenta, Roles y Mágina IA 1.0

**Documento:** `docs/08-ux-previews/UX-PERFIL-01-VISUAL-SHOWCASE.md`  
**Referencia técnica:** `CR-UX-PERFIL-01` (PR #811) y `CR-COLLAB-02`  
**Pull Request:** [Draft PR #830](https://github.com/izc05/magina-olivo-v20/pull/830)  
**Estado:** Prototipos visuales independientes en Jetpack Compose Preview.  

> **AVISO DE ALCANCE:** Todos los datos mostrados en este documento y en los prototipos son 100% ficticios. Los roles, flujos de invitación y pantallas son prototipos de experiencia de usuario (UX) y **no constituyen lógica de negocio activa, persistencia real en Room ni autorizaciones activadas en Supabase backend**. La navegación principal en `AppNavigation.kt` permanece inalterada hasta la integración autorizada.

---

## 1. Muestra Visual Interactiva (HTML en repositorio)

Para revisar interactivamente los prototipos simulando un dispositivo móvil real con conmutador de **Modo Claro** y **Modo Oscuro**, consulte el archivo:
- [docs/08-ux-previews/profile_redesign_visual_preview.html](profile_redesign_visual_preview.html)

---

## 2. Los 5 Diseños de Pantalla y Componentes

### 2.1. Barra Superior con Avatar (`MoTopBarProfileAvatar.kt`)
El avatar de acceso a Perfil/Cuenta se traslada al extremo superior derecho, inmediatamente junto a la campana de Avisos:

```
┌──────────────────────────────────────────────────────────────┐
│  Mi Campo                                        [ 🔔 ] [AD] │
│  4 parcelas · 14,8 ha (Muestra)                              │
├──────────────────────────────────────────────────────────────┤
│  ... (Contenido de pantalla de finca / labores) ...          │
```

- **Sesión Iniciada:** Círculo de 42dp en color verde olivo (`MoOlivePrimary` `#3E5A32`), borde refinado e iniciales «AD» en blanco.
- **Modo Local:** Marca de olivo con indicador discreto en tono ámbar de almacenamiento local.
- **Campana de Avisos:** Conserva su acceso completo con indicador de punto de notificaciones pendientes (*unread dot*).

---

### 2.2. Panel Organizado de Perfil y Cuenta (`ProfileAccountPanel.kt`)
Panel modular que reúne todo el inventario existente sin duplicar ni perder accesos:

```
┌──────────────────────────────────────────────────────────────┐
│  Mi Perfil y Cuenta                                     [ ✕ ]│
├──────────────────────────────────────────────────────────────┤
│  [ AD ]  Agricultor Demo                                     │
│          usuario.demo@example.test                           │
│          [ Sesión iniciada · Sincronizado (Demo) ]           │
├──────────────────────────────────────────────────────────────┤
│  MIS EXPLOTACIONES Y ROLES (PROTOTIPO)                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Finca La Esperanza (Demo)                [Propietario] │  │
│  │ Valle Ficticio · 4 parcelas · 14,8 ha                  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Olivar Los Cerros (Muestra)                   [Gestor] │  │
│  │ Sierra Demo · 2 parcelas · 6,4 ha                      │  │
│  └────────────────────────────────────────────────────────┘  │
│  [ ✉️ ] Mis invitaciones y accesos          [ 1 pendiente ]  │
├──────────────────────────────────────────────────────────────┤
│  DATOS DEL AGRICULTOR Y CAMPO                                │
│  [ 🗺️ ] Municipio preferido (Valle Ficticio)            [ > ] │
│  [ 🚜 ] Cooperativa vinculada (S.C.A. Olivarera Demo)   [ > ] │
├──────────────────────────────────────────────────────────────┤
│  HERRAMIENTAS DEL OLIVAR                                     │
│  [ 🚜 ] Mis máquinas y aperos (PR #211)                 [ > ] │
│  [ 👨‍🌾 ] Aplicadores y asesores CUE (#671)               [ > ] │
├──────────────────────────────────────────────────────────────┤
│  CUENTA Y SINCRONIZACIÓN                                     │
│  [ 🛡️ ] Gestión de cuenta (usuario.demo@example.test)   [ > ] │
├──────────────────────────────────────────────────────────────┤
│  AJUSTES Y SOPORTE                                           │
│  [ 🔔 ] Notificaciones de labores                 [ Activas ]│
│  [ 🌓 ] Apariencia (Claro / Oscuro)                     [ > ] │
│  [ ✈️ ] Modo sin conexión                         [ Siempre ]│
│  [ ℹ️ ] Ayuda y privacidad                              [ > ] │
│  Mágina Olivo · Versión 1.0.0 (Prototipo)                    │
├──────────────────────────────────────────────────────────────┤
│  [             CERRAR SESIÓN (Destructive)                ]  │
└──────────────────────────────────────────────────────────────┘
```

---

### 2.3. Diseño de los 3 Roles de Colaboración (`CollaborationRolesUi.kt`)

| Rol | Distintivo Visual | Responsabilidad Principal | Alcance Permitido | Límites de Seguridad |
| :--- | :--- | :--- | :--- | :--- |
| **Titular / Propietario** | Verde Olivo (`#3E5A32`) | Control total de la finca | Catastro, parcelas, contratos de entrega, finanzas completas. | Ninguno en sus explotaciones. |
| **Gestor / Arrendatario** | Ámbar / Ocre (`#805B18`) | Gestión agronómica y cuaderno | Labores del olivar, tratamientos CUE, jornales, pesadas de báscula. | Sin acceso a datos bancarios ni contratos del titular. |
| **Empresa Recolectora** | Azul Pizarra (`#4C6876`) | Cosecha y entregas | Partes de cuadrilla, fotos de báscula y propuesta de costes. | Acotado a parcelas y campaña vigentes. Sin finanzas globales. |

---

### 2.4. Flujo Visual de Invitaciones (`InvitationFlowUi.kt`)
- **Emisión en 3 pasos:** Rol (Propietario / Gestor / Recolector) → Alcance (Toda la finca / Parcelas; Campaña vigente) → Vía (WhatsApp, QR presencial, código de 6 dígitos, enlace HTTPS).
- **Aceptación transparente:** Tarjeta en el panel de Perfil con el nombre del emisor, finca, rol propuesto y resumen de permisos antes de pulsar `Aceptar invitación` o `Rechazar`.

---

### 2.5. Reserva de la 4ª Pestaña Inferior: Mágina IA (`AiAssistantPlaceholderScreen.kt`)
Pantalla de reserva elegante, serena y sin promesas ficticias:

```
┌──────────────────────────────────────────────────────────────┐
│                            [ ✨ ]                            │
│                          Mágina IA                           │
│               Asistente inteligente del olivar               │
│             [ En preparación para la versión 1.1 ]           │
├──────────────────────────────────────────────────────────────┤
│  ¿QUÉ PODRÁS HACER CON MÁGINA IA?                            │
│  💬 Consultas en lenguaje natural sobre labores y fitosanitarios│
│  📷 Lectura asistida de albaranes de báscula y facturas      │
│  📊 Resumen comparativo de rendimientos grasos y costes      │
│  🌦️ Alertas agroclimáticas preventivas de Sierra Mágina      │
├──────────────────────────────────────────────────────────────┤
│  COMPROMISO DE RIGOR AGRONÓMICO                              │
│  Mágina IA se basará exclusivamente en los datos de tus      │
│  cuadernos y fuentes oficiales. Nunca inventará datos ni     │
│  sustituirá al técnico asesor ni a la cooperativa.           │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Matriz de Compatibilidad con el Código Base

| Componente Preexistente | Estado en esta PR | Justificación |
| :--- | :--- | :--- |
| `ProfileScreen.kt` | Intacto | Sigue siendo la pantalla funcional activa de la app hasta la integración. |
| `PersonalProfile.kt` | **Retirado de PR #830** | Evita duplicar lógica con PR #781/#794/#796; los prototipos usan mocks aislados. |
| `ProfileAvatarStore.kt` | **Retirado de PR #830** | Evita conflictos de persistencia de avatar con ramas activas. |
| `AppNavigation.kt` | Intacto | Cero alteraciones en las rutas reales o el enrutamiento de producción. |
| `Theme.kt` / `AppearanceMode` | Respetado | Previews adaptados a `MaginaOlivoTheme(mode = AppearanceMode.LIGHT/DARK)`. |
| `MoStatusChip` | Respetado | Llamadas adaptadas a la firma `text = ...`. |
