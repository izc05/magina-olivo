-- Mágina Olivo — G0 Migration 3/3: Contracts, Bilateral Attachments, Harvest Shares & Storage RLS
-- Issues: #737, #735, #726, #727

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

CREATE POLICY "contracts_parties_access"
    ON public.farm_contracts FOR SELECT
    TO authenticated
    USING (
        (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid())
        AND public.has_farm_capability(farm_id, 'view_contracts')
    );

CREATE POLICY "contracts_manage"
    ON public.farm_contracts FOR ALL
    TO authenticated
    USING (
        (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid())
        AND public.has_farm_capability(farm_id, 'manage_contracts')
    )
    WITH CHECK (
        (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid())
        AND public.has_farm_capability(farm_id, 'manage_contracts')
    );

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

-- 3. Campaign Harvest Share Agreements (e.g. 70/30 split on net weight)
CREATE TABLE IF NOT EXISTS public.campaign_harvest_share_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE RESTRICT,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
    contract_id UUID REFERENCES public.farm_contracts(id) ON DELETE SET NULL,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id),
    exploiter_user_id UUID NOT NULL REFERENCES auth.users(id),
    owner_percentage NUMERIC(5,2) NOT NULL, -- e.g. 70.00
    exploiter_percentage NUMERIC(5,2) NOT NULL, -- e.g. 30.00
    status TEXT NOT NULL DEFAULT 'PROPOSED', -- 'PROPOSED', 'ACCEPTED', 'REJECTED'
    accepted_by_owner_at TIMESTAMPTZ,
    accepted_by_exploiter_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_percentage_total CHECK (owner_percentage + exploiter_percentage = 100.00),
    UNIQUE (farm_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_share_agreements_campaign ON public.campaign_harvest_share_agreements(campaign_id);

ALTER TABLE public.campaign_harvest_share_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share_agreements_select"
    ON public.campaign_harvest_share_agreements FOR SELECT
    TO authenticated
    USING (
        (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid())
        AND public.has_farm_capability(farm_id, 'view_deliveries')
    );

CREATE POLICY "share_agreements_manage"
    ON public.campaign_harvest_share_agreements FOR ALL
    TO authenticated
    USING (
        (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid())
        AND public.has_farm_capability(farm_id, 'manage_agreements')
    )
    WITH CHECK (
        (owner_user_id = auth.uid() OR exploiter_user_id = auth.uid())
        AND public.has_farm_capability(farm_id, 'manage_agreements')
    );

-- 4. Private Storage Buckets Provisioning & RLS Policies
-- NOTE: In production, buckets can also be managed via dashboard or CLI.
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('farm-attachments', 'farm-attachments', false),
    ('farm-contracts', 'farm-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: farm-attachments (ticket photos, delivery receipts)
-- Path convention: {farm_id}/{document_id}.{ext}
CREATE POLICY "storage_attachments_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'farm-attachments'
        AND (
            -- Farm is accessible with view_deliveries
            (storage.foldername(name))[1]::uuid IN (SELECT user_accessible_farm_ids())
        )
    );

CREATE POLICY "storage_attachments_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'farm-attachments'
        AND public.has_farm_capability((storage.foldername(name))[1]::uuid, 'add_deliveries')
    );

-- Storage RLS: farm-contracts (private contract PDFs)
-- Path convention: {farm_id}/{contract_id}/{attachment_id}.{ext}
CREATE POLICY "storage_contracts_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'farm-contracts'
        AND public.has_farm_capability((storage.foldername(name))[1]::uuid, 'view_contracts')
    );

CREATE POLICY "storage_contracts_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'farm-contracts'
        AND public.has_farm_capability((storage.foldername(name))[1]::uuid, 'upload_contracts')
    );
