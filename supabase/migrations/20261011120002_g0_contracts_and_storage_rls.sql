-- Mágina Olivo — G0 Migration 3/3: Contracts, Bilateral Attachments, Harvest Shares & Storage RLS
-- Issues: #737, #735, #726, #727
-- Addressed P0-3 (Strict Storage RLS checking contract parties), P0-4 (Bilateral acceptance RPCs), P0-5 (70% Exploiter / 30% Owner share)

-- 1. Farm Contracts (Lease / Operating agreements)
CREATE TABLE IF NOT EXISTS public.farm_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE RESTRICT,
    contract_type TEXT NOT NULL DEFAULT 'LEASE', -- 'LEASE', 'SHARECROPPING', 'ASSIGNMENT', 'LABOUR_ORDER', 'OTHER'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_years INT,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'PROPOSED', 'ACCEPTED', 'ACTIVE', 'EXPIRED', 'TERMINATED'
    terms_notes TEXT,
    cost_responsibilities JSONB DEFAULT '{}'::jsonb,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id),
    exploiter_user_id UUID NOT NULL REFERENCES auth.users(id),
    accepted_by_owner_at TIMESTAMPTZ,
    accepted_by_exploiter_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_contracts_farm ON public.farm_contracts(farm_id);
CREATE INDEX IF NOT EXISTS idx_contracts_parties ON public.farm_contracts(owner_user_id, exploiter_user_id);

ALTER TABLE public.farm_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contracts_parties_access" ON public.farm_contracts;
CREATE POLICY "contracts_parties_access"
    ON public.farm_contracts FOR SELECT
    TO authenticated
    USING (
        (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid()
         OR farm_id IN (SELECT id FROM public.farms WHERE creator_user_id = auth.uid() OR owner_id = auth.uid()))
        AND public.has_farm_capability(farm_id, 'view_contracts')
    );

DROP POLICY IF EXISTS "contracts_manage" ON public.farm_contracts;
CREATE POLICY "contracts_manage"
    ON public.farm_contracts FOR ALL
    TO authenticated
    USING (
        (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid()
         OR farm_id IN (SELECT id FROM public.farms WHERE creator_user_id = auth.uid() OR owner_id = auth.uid()))
        AND public.has_farm_capability(farm_id, 'manage_contracts')
    )
    WITH CHECK (
        (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid()
         OR farm_id IN (SELECT id FROM public.farms WHERE creator_user_id = auth.uid() OR owner_id = auth.uid()))
        AND public.has_farm_capability(farm_id, 'manage_contracts')
    );

-- P0-4: Transactional RPC for Bilateral Farm Contract Acceptance
CREATE OR REPLACE FUNCTION public.accept_farm_contract(p_contract_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contract RECORD;
    v_current_user UUID;
    v_owner_accepted TIMESTAMPTZ;
    v_exploiter_accepted TIMESTAMPTZ;
    v_new_status TEXT;
BEGIN
    v_current_user := auth.uid();
    IF v_current_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
    END IF;

    SELECT * INTO v_contract
    FROM public.farm_contracts
    WHERE id = p_contract_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'contract_not_found');
    END IF;

    IF v_contract.owner_user_id <> v_current_user AND v_contract.exploiter_user_id <> v_current_user THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized_not_a_contract_party');
    END IF;

    v_owner_accepted := v_contract.accepted_by_owner_at;
    v_exploiter_accepted := v_contract.accepted_by_exploiter_at;

    IF v_contract.owner_user_id = v_current_user THEN
        v_owner_accepted := COALESCE(v_owner_accepted, now());
    END IF;

    IF v_contract.exploiter_user_id = v_current_user THEN
        v_exploiter_accepted := COALESCE(v_exploiter_accepted, now());
    END IF;

    IF v_owner_accepted IS NOT NULL AND v_exploiter_accepted IS NOT NULL THEN
        v_new_status := 'ACCEPTED';
    ELSE
        v_new_status := 'PROPOSED';
    END IF;

    UPDATE public.farm_contracts
    SET accepted_by_owner_at = v_owner_accepted,
        accepted_by_exploiter_at = v_exploiter_accepted,
        status = v_new_status,
        version = version + 1,
        updated_at = now()
    WHERE id = p_contract_id;

    RETURN jsonb_build_object(
        'success', true,
        'contract_id', p_contract_id,
        'status', v_new_status,
        'accepted_by_owner_at', v_owner_accepted,
        'accepted_by_exploiter_at', v_exploiter_accepted
    );
END;
$$;

-- Trigger to enforce bilateral acceptance integrity on farm contracts
CREATE OR REPLACE FUNCTION public.check_contract_acceptance_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- On INSERT, a contract cannot be created directly as ACCEPTED or with foreign acceptance timestamps
        IF NEW.status = 'ACCEPTED' THEN
            RAISE EXCEPTION 'Contract cannot be directly created with status ACCEPTED; bilateral acceptance flow required';
        END IF;

        IF NEW.accepted_by_owner_at IS NOT NULL AND auth.uid() <> NEW.owner_user_id THEN
            RAISE EXCEPTION 'Cannot forge owner acceptance on insert';
        END IF;
        IF NEW.accepted_by_exploiter_at IS NOT NULL AND auth.uid() <> NEW.exploiter_user_id THEN
            RAISE EXCEPTION 'Cannot forge exploiter acceptance on insert';
        END IF;
        IF NEW.accepted_by_owner_at IS NOT NULL AND NEW.accepted_by_exploiter_at IS NOT NULL THEN
            RAISE EXCEPTION 'Cannot create contract with both acceptance timestamps pre-filled';
        END IF;

        RETURN NEW;
    END IF;

    -- TG_OP = 'UPDATE':
    -- Prevent altering contract parties or farm
    IF NEW.owner_user_id <> OLD.owner_user_id OR NEW.exploiter_user_id <> OLD.exploiter_user_id OR NEW.farm_id <> OLD.farm_id THEN
        RAISE EXCEPTION 'Cannot alter contract parties or farm';
    END IF;

    -- Once a contract is ACCEPTED, core conditions and acceptance timestamps cannot be modified
    IF OLD.status = 'ACCEPTED' THEN
        IF NEW.start_date <> OLD.start_date OR NEW.end_date <> OLD.end_date OR NEW.contract_type <> OLD.contract_type THEN
            RAISE EXCEPTION 'Cannot modify conditions of an already ACCEPTED contract; create a new contract or amendment';
        END IF;
        IF NEW.accepted_by_owner_at IS DISTINCT FROM OLD.accepted_by_owner_at OR NEW.accepted_by_exploiter_at IS DISTINCT FROM OLD.accepted_by_exploiter_at THEN
            RAISE EXCEPTION 'Cannot alter acceptance timestamps of an already ACCEPTED contract';
        END IF;
    END IF;

    -- accepted_by_owner_at cannot be altered directly unless by owner
    IF NEW.accepted_by_owner_at IS DISTINCT FROM OLD.accepted_by_owner_at THEN
        IF auth.uid() <> OLD.owner_user_id THEN
            RAISE EXCEPTION 'Only the contract owner can accept for the owner';
        END IF;
    END IF;

    -- accepted_by_exploiter_at cannot be altered directly unless by exploiter
    IF NEW.accepted_by_exploiter_at IS DISTINCT FROM OLD.accepted_by_exploiter_at THEN
        IF auth.uid() <> OLD.exploiter_user_id THEN
            RAISE EXCEPTION 'Only the exploiter can accept for the exploiter';
        END IF;
    END IF;

    -- Status cannot be set to ACCEPTED unless both parties have accepted
    IF NEW.status = 'ACCEPTED' AND (NEW.accepted_by_owner_at IS NULL OR NEW.accepted_by_exploiter_at IS NULL) THEN
        RAISE EXCEPTION 'Contract cannot be ACCEPTED without bilateral acceptance timestamps';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_acceptance_integrity ON public.farm_contracts;
CREATE TRIGGER trg_contract_acceptance_integrity
    BEFORE INSERT OR UPDATE ON public.farm_contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.check_contract_acceptance_integrity();

-- 2. Farm Contract Attachments (Bilateral PDFs, scans, photos)
CREATE TABLE IF NOT EXISTS public.farm_contract_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.farm_contracts(id) ON DELETE CASCADE,
    uploader_user_id UUID NOT NULL REFERENCES auth.users(id),
    uploader_role TEXT NOT NULL, -- 'OWNER', 'EXPLOITER'
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL, -- 'application/pdf', 'image/jpeg', 'image/png'
    sha256 TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- 'PENDING_REVIEW', 'ACCEPTED', 'SUPERSEDED'
    reviewed_by_other_party_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_attachments_contract ON public.farm_contract_attachments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_attachments_sha256 ON public.farm_contract_attachments(sha256);

ALTER TABLE public.farm_contract_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_attachments_select" ON public.farm_contract_attachments;
CREATE POLICY "contract_attachments_select"
    ON public.farm_contract_attachments FOR SELECT
    TO authenticated
    USING (
        contract_id IN (
            SELECT id FROM public.farm_contracts
            WHERE (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid())
              AND public.has_farm_capability(farm_id, 'view_contracts')
        )
    );

DROP POLICY IF EXISTS "contract_attachments_insert" ON public.farm_contract_attachments;
CREATE POLICY "contract_attachments_insert"
    ON public.farm_contract_attachments FOR INSERT
    TO authenticated
    WITH CHECK (
        uploader_user_id = auth.uid()
        AND contract_id IN (
            SELECT id FROM public.farm_contracts
            WHERE (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid())
              AND public.has_farm_capability(farm_id, 'upload_contracts')
        )
    );

-- 3. Campaign Harvest Share Agreements (P0-5: e.g. 70% Exploiter / 30% Owner split on net weight)
CREATE TABLE IF NOT EXISTS public.campaign_harvest_share_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE RESTRICT,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
    contract_id UUID REFERENCES public.farm_contracts(id) ON DELETE SET NULL,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id),
    exploiter_user_id UUID NOT NULL REFERENCES auth.users(id),
    owner_percentage NUMERIC(5,2) NOT NULL DEFAULT 30.00, -- Default: 30% Owner
    exploiter_percentage NUMERIC(5,2) NOT NULL DEFAULT 70.00, -- Default: 70% Exploiter
    version INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'PROPOSED', -- 'PROPOSED', 'ACCEPTED', 'REJECTED'
    accepted_by_owner_at TIMESTAMPTZ,
    accepted_by_exploiter_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_percentage_total CHECK (owner_percentage + exploiter_percentage = 100.00),
    UNIQUE (farm_id, campaign_id, version)
);

CREATE INDEX IF NOT EXISTS idx_share_agreements_campaign ON public.campaign_harvest_share_agreements(campaign_id);

ALTER TABLE public.campaign_harvest_share_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_agreements_select" ON public.campaign_harvest_share_agreements;
CREATE POLICY "share_agreements_select"
    ON public.campaign_harvest_share_agreements FOR SELECT
    TO authenticated
    USING (
        (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid()
         OR farm_id IN (SELECT id FROM public.farms WHERE creator_user_id = auth.uid() OR owner_id = auth.uid()))
        AND public.has_farm_capability(farm_id, 'view_deliveries')
    );

DROP POLICY IF EXISTS "share_agreements_manage" ON public.campaign_harvest_share_agreements;
CREATE POLICY "share_agreements_manage"
    ON public.campaign_harvest_share_agreements FOR ALL
    TO authenticated
    USING (
        (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid()
         OR farm_id IN (SELECT id FROM public.farms WHERE creator_user_id = auth.uid() OR owner_id = auth.uid()))
        AND public.has_farm_capability(farm_id, 'manage_agreements')
    )
    WITH CHECK (
        (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid()
         OR farm_id IN (SELECT id FROM public.farms WHERE creator_user_id = auth.uid() OR owner_id = auth.uid()))
        AND public.has_farm_capability(farm_id, 'manage_agreements')
    );

-- P0-4: Transactional RPC for Bilateral Harvest Share Agreement Acceptance
CREATE OR REPLACE FUNCTION public.accept_harvest_share_agreement(p_agreement_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_agr RECORD;
    v_current_user UUID;
    v_owner_accepted TIMESTAMPTZ;
    v_exploiter_accepted TIMESTAMPTZ;
    v_new_status TEXT;
BEGIN
    v_current_user := auth.uid();
    IF v_current_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
    END IF;

    SELECT * INTO v_agr
    FROM public.campaign_harvest_share_agreements
    WHERE id = p_agreement_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'agreement_not_found');
    END IF;

    IF v_agr.owner_user_id <> v_current_user AND v_agr.exploiter_user_id <> v_current_user THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized_not_an_agreement_party');
    END IF;

    v_owner_accepted := v_agr.accepted_by_owner_at;
    v_exploiter_accepted := v_agr.accepted_by_exploiter_at;

    IF v_agr.owner_user_id = v_current_user THEN
        v_owner_accepted := COALESCE(v_owner_accepted, now());
    END IF;

    IF v_agr.exploiter_user_id = v_current_user THEN
        v_exploiter_accepted := COALESCE(v_exploiter_accepted, now());
    END IF;

    IF v_owner_accepted IS NOT NULL AND v_exploiter_accepted IS NOT NULL THEN
        v_new_status := 'ACCEPTED';
    ELSE
        v_new_status := 'PROPOSED';
    END IF;

    UPDATE public.campaign_harvest_share_agreements
    SET accepted_by_owner_at = v_owner_accepted,
        accepted_by_exploiter_at = v_exploiter_accepted,
        status = v_new_status,
        updated_at = now()
    WHERE id = p_agreement_id;

    RETURN jsonb_build_object(
        'success', true,
        'agreement_id', p_agreement_id,
        'status', v_new_status,
        'owner_percentage', v_agr.owner_percentage,
        'exploiter_percentage', v_agr.exploiter_percentage,
        'accepted_by_owner_at', v_owner_accepted,
        'accepted_by_exploiter_at', v_exploiter_accepted
    );
END;
$$;

-- Trigger to enforce bilateral acceptance integrity on harvest share agreements
CREATE OR REPLACE FUNCTION public.check_share_agreement_acceptance_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- On INSERT, agreement cannot be created directly as ACCEPTED
        IF NEW.status = 'ACCEPTED' THEN
            RAISE EXCEPTION 'Harvest share agreement cannot be directly created with status ACCEPTED; bilateral acceptance required';
        END IF;

        IF NEW.accepted_by_owner_at IS NOT NULL AND auth.uid() <> NEW.owner_user_id THEN
            RAISE EXCEPTION 'Cannot forge owner acceptance on insert';
        END IF;
        IF NEW.accepted_by_exploiter_at IS NOT NULL AND auth.uid() <> NEW.exploiter_user_id THEN
            RAISE EXCEPTION 'Cannot forge exploiter acceptance on insert';
        END IF;
        IF NEW.accepted_by_owner_at IS NOT NULL AND NEW.accepted_by_exploiter_at IS NOT NULL THEN
            RAISE EXCEPTION 'Cannot create agreement with both acceptance timestamps pre-filled';
        END IF;

        RETURN NEW;
    END IF;

    -- TG_OP = 'UPDATE':
    -- Prevent altering core parties or linkage
    IF NEW.owner_user_id <> OLD.owner_user_id OR NEW.exploiter_user_id <> OLD.exploiter_user_id
       OR NEW.farm_id <> OLD.farm_id OR NEW.campaign_id <> OLD.campaign_id THEN
        RAISE EXCEPTION 'Cannot alter agreement parties, farm, or campaign';
    END IF;

    -- Once a share agreement is ACCEPTED, agreed percentages and acceptance timestamps cannot be modified
    IF OLD.status = 'ACCEPTED' THEN
        IF NEW.owner_percentage <> OLD.owner_percentage OR NEW.exploiter_percentage <> OLD.exploiter_percentage THEN
            RAISE EXCEPTION 'Cannot modify percentages of an already ACCEPTED agreement; renegotiations require a new agreement version';
        END IF;
        IF NEW.accepted_by_owner_at IS DISTINCT FROM OLD.accepted_by_owner_at OR NEW.accepted_by_exploiter_at IS DISTINCT FROM OLD.accepted_by_exploiter_at THEN
            RAISE EXCEPTION 'Cannot alter acceptance timestamps of an already ACCEPTED agreement';
        END IF;
    END IF;

    -- accepted_by_owner_at cannot be altered directly unless by owner
    IF NEW.accepted_by_owner_at IS DISTINCT FROM OLD.accepted_by_owner_at THEN
        IF auth.uid() <> OLD.owner_user_id THEN
            RAISE EXCEPTION 'Only the agreement owner can accept for the owner';
        END IF;
    END IF;

    -- accepted_by_exploiter_at cannot be altered directly unless by exploiter
    IF NEW.accepted_by_exploiter_at IS DISTINCT FROM OLD.accepted_by_exploiter_at THEN
        IF auth.uid() <> OLD.exploiter_user_id THEN
            RAISE EXCEPTION 'Only the exploiter can accept for the exploiter';
        END IF;
    END IF;

    -- Status cannot be forged to ACCEPTED without both acceptance timestamps
    IF NEW.status = 'ACCEPTED' AND (NEW.accepted_by_owner_at IS NULL OR NEW.accepted_by_exploiter_at IS NULL) THEN
        RAISE EXCEPTION 'Share agreement cannot be ACCEPTED without bilateral acceptance timestamps';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_share_agreement_acceptance_integrity ON public.campaign_harvest_share_agreements;
CREATE TRIGGER trg_share_agreement_acceptance_integrity
    BEFORE INSERT OR UPDATE ON public.campaign_harvest_share_agreements
    FOR EACH ROW
    EXECUTE FUNCTION public.check_share_agreement_acceptance_integrity();

-- 4. Private Storage Buckets Provisioning & RLS Policies (P0-3)
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('farm-attachments', 'farm-attachments', false),
    ('farm-contracts', 'farm-contracts', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage RLS: farm-attachments (delivery ticket photos, weight notes)
-- Path convention: {farm_id}/{document_id}.{ext}
DROP POLICY IF EXISTS "storage_attachments_select" ON storage.objects;
CREATE POLICY "storage_attachments_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'farm-attachments'
        AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.has_farm_capability(split_part(name, '/', 1)::uuid, 'view_deliveries')
    );

DROP POLICY IF EXISTS "storage_attachments_insert" ON storage.objects;
CREATE POLICY "storage_attachments_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'farm-attachments'
        AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.has_farm_capability(split_part(name, '/', 1)::uuid, 'add_deliveries')
    );

-- Storage RLS: farm-contracts (private contract PDFs)
-- Path convention: {farm_id}/{contract_id}/{attachment_id}.{ext}
-- P0-3 Fix: Enforces that contract_id exists on farm_id AND user is party (owner/exploiter) to that contract
DROP POLICY IF EXISTS "storage_contracts_select" ON storage.objects;
CREATE POLICY "storage_contracts_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'farm-contracts'
        AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.has_farm_capability(split_part(name, '/', 1)::uuid, 'view_contracts')
        AND EXISTS (
            SELECT 1 FROM public.farm_contracts c
            WHERE c.id = split_part(name, '/', 2)::uuid
              AND c.farm_id = split_part(name, '/', 1)::uuid
              AND (
                  c.owner_user_id = auth.uid()
                  OR c.exploiter_user_id = auth.uid()
                  OR c.farm_id IN (SELECT id FROM public.farms WHERE creator_user_id = auth.uid() OR owner_id = auth.uid())
              )
        )
    );

DROP POLICY IF EXISTS "storage_contracts_insert" ON storage.objects;
CREATE POLICY "storage_contracts_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'farm-contracts'
        AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.has_farm_capability(split_part(name, '/', 1)::uuid, 'upload_contracts')
        AND EXISTS (
            SELECT 1 FROM public.farm_contracts c
            WHERE c.id = split_part(name, '/', 2)::uuid
              AND c.farm_id = split_part(name, '/', 1)::uuid
              AND (
                  c.owner_user_id = auth.uid()
                  OR c.exploiter_user_id = auth.uid()
                  OR c.farm_id IN (SELECT id FROM public.farms WHERE creator_user_id = auth.uid() OR owner_id = auth.uid())
              )
        )
    );
