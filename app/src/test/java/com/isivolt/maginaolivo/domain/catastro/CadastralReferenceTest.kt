package com.isivolt.maginaolivo.domain.catastro

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CadastralReferenceTest {
    @Test
    fun keepsParcelReferenceOf14Characters() {
        val result = normalizeCadastralReference("23044A01200034")
        assertEquals("23044A01200034", result?.parcelReference)
        assertEquals("23044A01200034", result?.originalNormalized)
    }

    @Test
    fun derivesParcelReferenceFrom18Characters() {
        val result = normalizeCadastralReference("23044A01200034ABCD")
        assertEquals("23044A01200034", result?.parcelReference)
        assertEquals("23044A01200034ABCD", result?.originalNormalized)
    }

    @Test
    fun derivesParcelReferenceFrom20CharactersAndNormalizesFormatting() {
        val result = normalizeCadastralReference("23044a01200034 ab cd12")
        assertEquals("23044A01200034", result?.parcelReference)
        assertEquals("23044A01200034ABCD12", result?.originalNormalized)
    }

    @Test
    fun rejectsUnsupportedLength() {
        assertNull(normalizeCadastralReference("23044A0120003"))
        assertNull(normalizeCadastralReference("23044A012000341"))
    }
}
