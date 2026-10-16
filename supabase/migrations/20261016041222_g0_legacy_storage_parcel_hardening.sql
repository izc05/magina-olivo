-- G0 forward hardening, #743 / #752. Run transactionally after the three G0 migrations.
-- Unknown policies require an explicit inventory/review; never drop policies belonging
-- to another application. Permissive policies combine with OR and can bypass G0 RLS.
DO $$
DECLARE unexpected text;
BEGIN
  WITH allowed(tablename, policyname) AS (VALUES
    ('user_profiles','user_profiles_select_own'),
    ('user_profiles','user_profiles_update_own'),
    ('user_profiles','user_profiles_insert_own'),
    ('workspaces','workspaces_owner_access'),
    ('farms','farms_select_accessible'),
    ('farms','farms_insert_creator'),
    ('farms','farms_update_authorized'),
    ('farm_access_grants','grants_select_authorized'),
    ('farm_access_grants','grants_insert_authorized'),
    ('farm_access_grants','grants_update_authorized'),
    ('farm_invitations','invitations_manage_authorized'),
    ('parcels','parcels_workspace_owner'),
    ('parcels','parcels_delegated_select'),
    ('farm_parcel_memberships','fpm_access'),
    ('farm_parcel_memberships','fpm_manage'),
    ('campaigns','campaigns_access'),
    ('campaigns','campaigns_manage'),
    ('deliveries','deliveries_select_authorized'),
    ('deliveries','deliveries_insert_authorized'),
    ('deliveries','deliveries_update_authorized'),
    ('deliveries','deliveries_delete_deny_hard'),
    ('harvests','harvests_select_authorized'),
    ('harvests','harvests_insert_authorized'),
    ('expenses','expenses_workspace_owner'),
    ('expenses','expenses_propose_grant'),
    ('documents','documents_workspace_access'),
    ('documents','documents_delivery_shared'),
    ('farm_contracts','contracts_parties_access'),
    ('farm_contracts','contracts_manage'),
    ('farm_contract_attachments','contract_attachments_select'),
    ('farm_contract_attachments','contract_attachments_insert'),
    ('campaign_harvest_share_agreements','share_agreements_select'),
    ('campaign_harvest_share_agreements','share_agreements_manage')
  )
  SELECT string_agg(p.tablename || '.' || p.policyname, ', ' ORDER BY p.tablename,p.policyname)
    INTO unexpected
  FROM pg_catalog.pg_policies p
  WHERE p.schemaname='public'
    AND p.tablename IN (SELECT tablename FROM allowed)
    AND NOT EXISTS (SELECT 1 FROM allowed a WHERE a.tablename=p.tablename AND a.policyname=p.policyname);
  IF unexpected IS NOT NULL THEN
    RAISE EXCEPTION 'Unknown public policies require explicit review before G0 hardening: %', unexpected;
  END IF;

  SELECT string_agg(policyname, ', ' ORDER BY policyname) INTO unexpected
  FROM pg_catalog.pg_policies
  WHERE schemaname='storage' AND tablename='objects'
    AND policyname NOT IN ('storage_attachments_select','storage_attachments_insert',
                          'storage_contracts_select','storage_contracts_insert');
  IF unexpected IS NOT NULL THEN
    RAISE EXCEPTION 'Unknown Storage policies require explicit review before G0 hardening: %', unexpected;
  END IF;
END $$;

-- Preserve objects and all unrelated buckets. Native Storage owns its tables/RLS.
UPDATE storage.buckets SET public=false
WHERE id IN ('farm-attachments','farm-contracts') AND public IS DISTINCT FROM false;

-- Delegate visibility follows an active link to an explicitly authorized farm.
-- This adds SELECT only; the workspace-owner write policy remains unchanged.
DROP POLICY IF EXISTS parcels_delegated_select ON public.parcels;
CREATE POLICY parcels_delegated_select ON public.parcels
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM public.farm_parcel_memberships m
    WHERE m.parcel_id=parcels.id AND m.workspace_id=parcels.workspace_id
      AND m.deleted_at IS NULL AND m.valid_from <= now()
      AND (m.valid_until IS NULL OR m.valid_until > now())
      AND public.has_farm_capability(m.farm_id, 'view_farm')
  )
);
