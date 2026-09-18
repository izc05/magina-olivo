package com.isivolt.maginaolivo.domain.catastro

interface CatastroParcelGateway {
    suspend fun findByReference(reference: NormalizedCadastralReference): Result<CatastroParcel>

    suspend fun findInViewport(bbox: CatastroBbox): Result<List<CatastroParcel>>
}
