package com.isivolt.maginaolivo.domain.catastro

data class NormalizedCadastralReference(
    val parcelReference: String,
    val originalNormalized: String,
)

fun normalizeCadastralReference(input: String): NormalizedCadastralReference? {
    val compact = input
        .trim()
        .uppercase()
        .filter { it.isLetterOrDigit() }

    if (compact.length !in setOf(14, 18, 20)) return null
    if (!compact.all { it in 'A'..'Z' || it in '0'..'9' }) return null

    return NormalizedCadastralReference(
        parcelReference = compact.take(14),
        originalNormalized = compact,
    )
}
