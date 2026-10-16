-- #752 additional reproduced integrity defects. No data rewriting or sync activation.
-- Ordinary creation cannot attribute a farm to another account without consent.
-- A missing owner stays unassigned; migration/verified transfer is a separate gate.
DROP POLICY farms_insert_creator ON public.farms;
CREATE POLICY farms_insert_creator ON public.farms FOR INSERT TO authenticated
WITH CHECK (
  creator_user_id=auth.uid() AND (owner_id IS NULL OR owner_id=auth.uid())
  AND (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE owner_user_id=auth.uid()))
);

CREATE OR REPLACE FUNCTION public.check_delivery_immutability()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.farm_id IS DISTINCT FROM NEW.farm_id OR OLD.campaign_id IS DISTINCT FROM NEW.campaign_id THEN
    RAISE EXCEPTION 'Cannot alter farm_id or campaign_id of an existing delivery';
  END IF;
  IF OLD.recorded_by_user_id IS DISTINCT FROM NEW.recorded_by_user_id THEN
    RAISE EXCEPTION 'Cannot alter recorded_by_user_id (historical delivery author)';
  END IF;
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- The existing workspace FK alone permits linking a different farm's delivery.
-- Existing invalid rows stop this migration; never silently reassign historical data.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.expenses e JOIN public.deliveries d ON d.id=e.delivery_id
             WHERE e.farm_id IS DISTINCT FROM d.farm_id
                OR (e.campaign_id IS NOT NULL AND e.campaign_id IS DISTINCT FROM d.campaign_id)) THEN
    RAISE EXCEPTION 'Existing expense delivery farm/campaign mismatch requires explicit review';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION magina_private.check_expense_delivery()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.delivery_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.deliveries d WHERE d.id=NEW.delivery_id
      AND d.workspace_id=NEW.workspace_id AND d.farm_id=NEW.farm_id
      AND (NEW.campaign_id IS NULL OR NEW.campaign_id=d.campaign_id)
  ) THEN
    RAISE EXCEPTION 'Expense delivery must belong to the same farm, workspace and campaign' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION magina_private.check_expense_delivery() FROM PUBLIC;
CREATE TRIGGER trg_expenses_delivery_scope BEFORE INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION magina_private.check_expense_delivery();

CREATE OR REPLACE FUNCTION magina_private.document_owner_matches(kind text, aggregate_id uuid, ws uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT CASE kind
    WHEN 'DELIVERY' THEN EXISTS (SELECT 1 FROM public.deliveries WHERE id=aggregate_id AND workspace_id=ws)
    WHEN 'FARM' THEN EXISTS (SELECT 1 FROM public.farms WHERE id=aggregate_id AND workspace_id=ws)
    WHEN 'PARCEL' THEN EXISTS (SELECT 1 FROM public.parcels WHERE id=aggregate_id AND workspace_id=ws)
    WHEN 'CONTRACT' THEN EXISTS (SELECT 1 FROM public.farm_contracts c JOIN public.farms f ON f.id=c.farm_id WHERE c.id=aggregate_id AND f.workspace_id=ws)
    ELSE false -- ACTIVITY is not implemented in G0; do not accept unverifiable owners.
  END;
$$;
REVOKE ALL ON FUNCTION magina_private.document_owner_matches(text,uuid,uuid) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.documents d WHERE NOT magina_private.document_owner_matches(d.owner_type,d.owner_id,d.workspace_id)) THEN
    RAISE EXCEPTION 'Existing document owner aggregate mismatch or unsupported type requires explicit review';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION magina_private.check_document_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT magina_private.document_owner_matches(NEW.owner_type,NEW.owner_id,NEW.workspace_id) THEN
    RAISE EXCEPTION 'Document owner aggregate must exist in the same workspace and have a supported type' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION magina_private.check_document_owner() FROM PUBLIC;
CREATE TRIGGER trg_documents_owner_scope BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION magina_private.check_document_owner();

ALTER TABLE public.harvests ADD CONSTRAINT uq_harvests_id_farm_workspace UNIQUE(id,farm_id,workspace_id);
ALTER TABLE public.deliveries ADD CONSTRAINT fk_deliveries_harvest_scope
FOREIGN KEY(harvest_id,farm_id,workspace_id) REFERENCES public.harvests(id,farm_id,workspace_id);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.deliveries d JOIN public.harvests h ON h.id=d.harvest_id
             WHERE h.campaign_id IS NOT NULL AND h.campaign_id IS DISTINCT FROM d.campaign_id) THEN
    RAISE EXCEPTION 'Existing harvest campaign mismatch requires explicit review';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION magina_private.check_delivery_harvest_campaign()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.harvest_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.harvests h WHERE h.id=NEW.harvest_id
      AND h.campaign_id IS NOT NULL AND h.campaign_id IS DISTINCT FROM NEW.campaign_id
  ) THEN
    RAISE EXCEPTION 'Delivery harvest must belong to the same campaign when assigned' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION magina_private.check_delivery_harvest_campaign() FROM PUBLIC;
CREATE TRIGGER trg_deliveries_harvest_campaign BEFORE INSERT OR UPDATE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION magina_private.check_delivery_harvest_campaign();

-- Reinvitation must not silently renew/extend an expired or future grant.
-- Defer until commit because claim creates/updates the grant after the invitation.
-- Failure rolls back both writes and leaves issuer review explicit.
CREATE OR REPLACE FUNCTION magina_private.check_invitation_active_grant()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.state='ACCEPTED' AND NOT EXISTS (
    SELECT 1 FROM public.farm_access_grants g
    WHERE g.farm_id=NEW.farm_id AND g.user_id=NEW.claimed_by_user_id
      AND g.status='ACTIVE' AND g.valid_from<=now()
      AND (g.valid_until IS NULL OR g.valid_until>now())
  ) THEN
    RAISE EXCEPTION 'Invitation has inactive grant; issuer must review grant validity before acceptance' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION magina_private.check_invitation_active_grant() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER trg_invitations_active_grant AFTER UPDATE ON public.farm_invitations
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION magina_private.check_invitation_active_grant();
