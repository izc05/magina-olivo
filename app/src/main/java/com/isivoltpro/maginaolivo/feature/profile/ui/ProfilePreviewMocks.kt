package com.isivoltpro.maginaolivo.feature.profile.ui

import java.util.UUID

/**
 * Roles de colaboración en Mágina Olivo (CR-COLLAB-01 / CR-COLLAB-02).
 * Cada rol define de forma determinista y transparente las capacidades visuales.
 */
enum class CollaboratorRole(
    val title: String,
    val subtitle: String,
    val description: String,
    val allowedActions: List<String>,
    val restrictedActions: List<String>,
) {
    PROPIETARIO(
        title = "Titular / Propietario",
        subtitle = "Control total y legitimación de la explotación",
        description = "Administra parcelas, fincas, contratos de cooperativa, invita colaboradores y visualiza la contabilidad completa.",
        allowedActions = listOf(
            "Administración de parcelas y catastro",
            "Gestión y firma de contratos de campaña",
            "Invitar gestores y empresas recolectoras",
            "Acceso completo a gastos, ingresos y liquidaciones",
            "Registro de labores, riegos y recolección",
        ),
        restrictedActions = emptyList(),
    ),
    GESTOR(
        title = "Gestor / Arrendatario",
        subtitle = "Gestión agronómica y operativa del cuaderno",
        description = "Lleva el día a día de la campaña: planifica labores, tratamientos fitosanitarios, jornales y pesadas en las fincas autorizadas.",
        allowedActions = listOf(
            "Registro de labores agrícolas y tratamientos CUE",
            "Gestión de jornales y partes diarios de trabajo",
            "Anotación de pesadas y albaranes de aceituna",
            "Propuesta y control de gastos de explotación",
        ),
        restrictedActions = listOf(
            "No puede modificar la titularidad ni parcelas catastrales",
            "No accede a contratos ni liquidaciones bancarias del titular",
            "Acceso estrictamente acotado a las fincas asignadas",
        ),
    ),
    RECOLECTOR(
        title = "Empresa Recolectora",
        subtitle = "Encargo acotado de cosecha y entregas",
        description = "Encargada de recolectar parcelas específicas durante la campaña vigente. Sube partes de cuadrilla, tickets y fotos de pesadas.",
        allowedActions = listOf(
            "Registro de días de recolección en parcelas asignadas",
            "Subida de pesadas, albaranes de báscula y fotografías",
            "Propuesta de costes de recolección para aprobación",
        ),
        restrictedActions = listOf(
            "Sin acceso a otras fincas o campañas anteriores",
            "Sin acceso a la contabilidad general ni contratos",
            "Los costes propuestos requieren aprobación del titular",
        ),
    ),
}

/**
 * Estado de una invitación de colaboración.
 */
enum class InvitationStatus(val label: String) {
    PENDIENTE("Pendiente de confirmación"),
    ACEPTADA("Aceptada · Activa"),
    RECHAZADA("Rechazada"),
    REVOCADA("Revocada"),
    CADUCADA("Caducada"),
}

/**
 * Vía de envío de la invitación.
 */
enum class InvitationChannel(val title: String, val iconDescription: String) {
    WHATSAPP("WhatsApp", "Compartir por mensaje de WhatsApp"),
    QR_CODE("Código QR presencial", "Escanear cara a cara en el campo"),
    ACCESS_CODE("Código numérico (6 dígitos)", "Introducir código de un solo uso"),
    LINK("Enlace seguro HTTPS", "Copiar enlace privado al portapapeles"),
}

/**
 * Modelo de datos simulado para una explotación con rol asignado.
 */
data class MockFarmMembership(
    val farmId: UUID = UUID.randomUUID(),
    val farmName: String,
    val municipality: String,
    val parcelCount: Int,
    val areaHectares: Double,
    val role: CollaboratorRole,
    val isPrimary: Boolean = false,
)

/**
 * Modelo de datos simulado para una invitación enviada o recibida.
 */
data class MockInvitation(
    val id: UUID = UUID.randomUUID(),
    val farmName: String,
    val municipality: String,
    val inviterName: String,
    val inviterEmail: String,
    val recipientEmail: String? = null,
    val role: CollaboratorRole,
    val scope: String, // ej: "Toda la finca · Campaña 2026/2027"
    val channel: InvitationChannel,
    val status: InvitationStatus,
    val dateLabel: String,
    val oneTimeCode: String? = null,
)

/**
 * Datos simulados listos para Compose Previews y pruebas visuales.
 */
object ProfilePreviewMocks {
    val signedInUser = MockUserProfile(
        userId = UUID.fromString("00000000-0000-0000-0000-000000000001"),
        displayName = "Isicio Zafra Cantos",
        email = "isicio.zafra@olivar.es",
        initials = "IZ",
        isConnected = true,
        accountStatusLabel = "Sesión iniciada · Sincronizado",
        preferredMunicipality = "Bedmar y Garcíez",
        preferredProvince = "Jaén",
        preferredCooperative = "S.C.A. San Isidro Labrador",
        activeWorkspace = "Explotación Principal Mágina",
    )

    val localGuestUser = MockUserProfile(
        userId = null,
        displayName = "Perfil Local",
        email = "Sin cuenta vinculada",
        initials = "MO",
        isConnected = false,
        accountStatusLabel = "Modo local · Guardado en este teléfono",
        preferredMunicipality = "Jódar",
        preferredProvince = "Jaén",
        preferredCooperative = "S.C.A. Santísimo Cristo de la Misericordia",
        activeWorkspace = "Mi Olivar Local",
    )

    val farmMemberships = listOf(
        MockFarmMembership(
            farmName = "El Encinar y Majuelos",
            municipality = "Bedmar y Garcíez",
            parcelCount = 4,
            areaHectares = 14.8,
            role = CollaboratorRole.PROPIETARIO,
            isPrimary = true,
        ),
        MockFarmMembership(
            farmName = "Los Olivos Altos",
            municipality = "Jódar",
            parcelCount = 2,
            areaHectares = 6.4,
            role = CollaboratorRole.GESTOR,
            isPrimary = false,
        ),
        MockFarmMembership(
            farmName = "Pago de la Cañada",
            municipality = "Jimena",
            parcelCount = 1,
            areaHectares = 3.2,
            role = CollaboratorRole.RECOLECTOR,
            isPrimary = false,
        ),
    )

    val receivedInvitations = listOf(
        MockInvitation(
            farmName = "Haza del Moro",
            municipality = "Bélmez de la Moraleda",
            inviterName = "Antonio Morales López",
            inviterEmail = "antonio.morales@campojaen.es",
            role = CollaboratorRole.GESTOR,
            scope = "Toda la finca · Campaña 2026/2027",
            channel = InvitationChannel.WHATSAPP,
            status = InvitationStatus.PENDIENTE,
            dateLabel = "Recibida hoy, 10:30",
        ),
    )

    val sentInvitations = listOf(
        MockInvitation(
            farmName = "El Encinar y Majuelos",
            municipality = "Bedmar y Garcíez",
            inviterName = "Isicio Zafra Cantos",
            inviterEmail = "isicio.zafra@olivar.es",
            recipientEmail = "cuadrilla.recoleccion.sur@gmail.com",
            role = CollaboratorRole.RECOLECTOR,
            scope = "Parcelas 1, 2 y 4 · Campaña 2026/2027",
            channel = InvitationChannel.QR_CODE,
            status = InvitationStatus.ACEPTADA,
            dateLabel = "Aceptada el 28 oct 2026",
            oneTimeCode = "648-921",
        ),
        MockInvitation(
            farmName = "El Encinar y Majuelos",
            municipality = "Bedmar y Garcíez",
            inviterName = "Isicio Zafra Cantos",
            inviterEmail = "isicio.zafra@olivar.es",
            recipientEmail = "manuel.gestor@agricola.es",
            role = CollaboratorRole.GESTOR,
            scope = "Toda la finca · Sin caducidad",
            channel = InvitationChannel.WHATSAPP,
            status = InvitationStatus.PENDIENTE,
            dateLabel = "Enviada ayer, 18:40",
            oneTimeCode = "312-704",
        ),
    )
}

data class MockUserProfile(
    val userId: UUID?,
    val displayName: String,
    val email: String,
    val initials: String,
    val isConnected: Boolean,
    val accountStatusLabel: String,
    val preferredMunicipality: String,
    val preferredProvince: String,
    val preferredCooperative: String?,
    val activeWorkspace: String,
)
