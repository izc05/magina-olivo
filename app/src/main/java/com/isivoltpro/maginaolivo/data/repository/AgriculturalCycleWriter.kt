package com.isivoltpro.maginaolivo.data.repository

import com.isivoltpro.maginaolivo.core.common.AppError
import com.isivoltpro.maginaolivo.core.time.AppClock
import com.isivoltpro.maginaolivo.data.local.MaginaOlivoDatabase
import com.isivoltpro.maginaolivo.data.local.entity.*
import com.isivoltpro.maginaolivo.domain.cycle.CycleInterval
import com.isivoltpro.maginaolivo.domain.cycle.CycleRecordKind
import com.isivoltpro.maginaolivo.domain.workspace.WorkspaceRepository
import java.time.LocalDate
import java.util.UUID

internal class InvalidAgriculturalCycle(val error: AppError): RuntimeException()

/** Called INSIDE the canonical transaction: fact + association commit together or neither. */
internal class AgriculturalCycleWriter(
    private val db: MaginaOlivoDatabase,
    private val workspaces: WorkspaceRepository?,
    private val clock: AppClock,
) {
    private val dao get() = db.agriculturalCycleDao()

    suspend fun validateNew(workspaceId: UUID, farmId: UUID?, selected: UUID?, date: LocalDate,
                            lastDate: LocalDate=date, campaignId: UUID?=null, activityId: UUID?=null): UUID? {
        if(farmId==null) {
            requireCycle(selected==null,"farm_required")
            return null
        }
        val cycles=dao.list(farmId)
        if(cycles.isEmpty() && selected==null) return null
        val parent=when {
            activityId!=null -> dao.records(farmId,workspaceId).firstOrNull { it.id==activityId && it.kind=="ACTIVITY" }?.cycleId
            campaignId!=null -> dao.records(farmId,workspaceId).firstOrNull { it.id==campaignId && it.kind=="RECOLLECTION" }?.cycleId
            else -> null
        }
        if(campaignId!=null || activityId!=null) requireCycle(parent!=null,"assign_parent_first")
        if(parent!=null && selected!=null) requireCycle(parent==selected,"parent_cycle_mismatch")
        val id=selected ?: parent
        requireCycle(id!=null,"cycle_selection_required")
        val cycle=dao.find(id!!) ?: invalid("cycle_not_found")
        requireCycle(cycle.workspaceId==workspaceId && cycle.farmId==farmId,"context_mismatch")
        val owner=workspaces?.currentOwnerId()
        val workspace=db.workspaceDao().findById(workspaceId) ?: invalid("workspace_not_found")
        if(owner!=null && owner!=workspace.ownerUserId || owner==null && workspace.metadata.remoteVersion!=null)
            throw InvalidAgriculturalCycle(AppError.Permission("cycle_owner_required"))
        requireCycle(cycle.effectiveEndDate==null,"cycle_closed")
        requireCycle(CycleInterval(cycle.startDate,cycle.effectiveEndDate).contains(date,lastDate),"outside_cycle")
        return id
    }

    suspend fun bindNew(workspaceId: UUID, farmId: UUID, cycleId: UUID?, kind: CycleRecordKind, id: UUID,
                        inherited: Boolean=false) {
        if(cycleId==null || inherited) return
        when(kind) {
            CycleRecordKind.ACTIVITY -> dao.link(AgriculturalCycleActivityEntity(id,cycleId))
            CycleRecordKind.EXPENSE -> dao.link(AgriculturalCycleExpenseEntity(id,cycleId))
            CycleRecordKind.RECOLLECTION -> dao.link(AgriculturalCycleRecollectionEntity(id,cycleId))
        }
        val cycle=dao.find(cycleId) ?: invalid("cycle_not_found")
        requireCycle(cycle.farmId==farmId && cycle.workspaceId==workspaceId,"context_mismatch")
        dao.insert(AgriculturalCycleOperationEntity(UUID.randomUUID(),cycleId,workspaces?.currentOwnerId(),
            "NEW:$kind:$id",clock.nowInstant(),"Registro nuevo confirmado: $kind $id"))
        dao.setRevision(AgriculturalCycleFarmStateEntity(farmId,Math.addExact(dao.revision(farmId) ?: 0,1)))
    }

    private fun requireCycle(ok: Boolean,code: String) { if(!ok) invalid(code) }
    private fun invalid(code: String): Nothing = throw InvalidAgriculturalCycle(AppError.Validation("agriculturalCycleId",code))
}
