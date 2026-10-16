package com.isivoltpro.maginaolivo.data.local.dao

import androidx.room.Dao
import androidx.room.Transaction
import androidx.room.Upsert
import androidx.room.Query
import com.isivoltpro.maginaolivo.data.local.entity.CommunityWaterNoticeEntity
import com.isivoltpro.maginaolivo.data.local.entity.IrrigationCommunityEntity
import com.isivoltpro.maginaolivo.data.local.entity.PersonalIrrigationPlanEntity
import com.isivoltpro.maginaolivo.data.local.entity.TerritorialMunicipalityEntity
import kotlinx.coroutines.flow.Flow

@Dao
abstract class TerritorialDao {
    // Municipios
    @Query("SELECT * FROM territorial_municipalities WHERE active = 1 ORDER BY name ASC")
    abstract fun getAllActiveMunicipalities(): Flow<List<TerritorialMunicipalityEntity>>

    @Query("SELECT * FROM territorial_municipalities WHERE slug = :slug AND active = 1 LIMIT 1")
    abstract suspend fun getMunicipalityBySlug(slug: String): TerritorialMunicipalityEntity?

    @Query("SELECT * FROM territorial_municipalities WHERE ine_code = :ineCode AND active = 1 LIMIT 1")
    abstract suspend fun getMunicipalityByIneCode(ineCode: String): TerritorialMunicipalityEntity?

    @Upsert
    abstract suspend fun insertMunicipalities(municipalities: List<TerritorialMunicipalityEntity>)

    // Comunidades de Regantes
    @Query("SELECT * FROM irrigation_communities WHERE primary_municipality_slug = :municipalitySlug AND active = 1 ORDER BY official_name ASC")
    abstract fun getCommunitiesByMunicipality(municipalitySlug: String): Flow<List<IrrigationCommunityEntity>>

    @Query("SELECT * FROM irrigation_communities WHERE id = :id AND active = 1 LIMIT 1")
    abstract suspend fun getCommunityById(id: String): IrrigationCommunityEntity?

    @Upsert
    abstract suspend fun insertCommunities(communities: List<IrrigationCommunityEntity>)

    // Avisos Comunitarios de Riego
    @Query("SELECT * FROM community_water_notices WHERE community_id = :communityId AND status = 'published' ORDER BY starts_at_epoch_ms DESC")
    abstract fun getPublishedNoticesByCommunity(communityId: String): Flow<List<CommunityWaterNoticeEntity>>

    @Query("SELECT * FROM community_water_notices WHERE community_id = :communityId AND status = :status ORDER BY starts_at_epoch_ms DESC")
    abstract fun getNoticesByCommunityAndStatus(communityId: String, status: String): Flow<List<CommunityWaterNoticeEntity>>

    @Upsert
    abstract suspend fun insertNotices(notices: List<CommunityWaterNoticeEntity>)

    // Plan de Riego Personal (Agenda Offline Privada)
    @Query("SELECT * FROM personal_irrigation_plans WHERE workspace_id = :workspaceId ORDER BY scheduled_at_epoch_ms ASC")
    abstract fun getPersonalPlans(workspaceId: String): Flow<List<PersonalIrrigationPlanEntity>>

    @Query("SELECT * FROM personal_irrigation_plans WHERE workspace_id = :workspaceId AND plot_id = :plotId ORDER BY scheduled_at_epoch_ms ASC")
    abstract fun getPersonalPlansForPlot(workspaceId: String, plotId: String): Flow<List<PersonalIrrigationPlanEntity>>

    @Query("SELECT * FROM personal_irrigation_plans WHERE id = :id LIMIT 1")
    protected abstract suspend fun findPersonalPlan(id: String): PersonalIrrigationPlanEntity?

    @Query("SELECT COUNT(*) FROM parcels WHERE id = :plotId AND workspace_id = :workspaceId")
    protected abstract suspend fun countOwnedParcel(plotId: String, workspaceId: String): Int

    @Upsert
    protected abstract suspend fun upsertPersonalPlan(plan: PersonalIrrigationPlanEntity)

    @Transaction
    open suspend fun insertPersonalPlan(plan: PersonalIrrigationPlanEntity) {
        val existing = findPersonalPlan(plan.id)
        require(existing == null || existing.workspaceId == plan.workspaceId) { "Personal plan belongs to another workspace" }
        require(countOwnedParcel(plan.plotId, plan.workspaceId) == 1) { "Personal plan parcel must belong to its workspace" }
        upsertPersonalPlan(plan.copy(createdAtEpochMs = existing?.createdAtEpochMs ?: plan.createdAtEpochMs))
    }

    @Query("DELETE FROM personal_irrigation_plans WHERE id = :id AND workspace_id = :workspaceId")
    abstract suspend fun deletePersonalPlan(id: String, workspaceId: String)
}
