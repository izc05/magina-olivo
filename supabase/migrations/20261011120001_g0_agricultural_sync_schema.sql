-- Mágina Olivo — G0 Migration 2/3: Core Agricultural Sync Schema & Multi-Tenant RLS
-- Issues: #726, #735, #727
-- Full parity with Android Room v25 CoreEntities, DeliveryEntities and LocalMetadata

-- 1. Parcels (Plots)
CREATE TABLE IF NOT EXISTS public.parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    display_name TEXT NOT NULL,
    cadastral_reference TEXT,
    cadastral_polygon TEXT,
    cadastral_parcel TEXT,
    municipality TEXT,
    province TEXT,
    source TEXT NOT NULL DEFAULT 'MANUAL', -- 'MANUAL', 'CATASTRO', 'SIGPAC'
    geometry_geo_json TEXT,
    source_provider TEXT,
    source_imported_at TIMESTAMPTZ,
    cadastral_area_m2 DOUBLE PRECISION,
    managed_area_m2 DOUBLE PRECISION,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    olive_tree_count INT,
    variety TEXT,
    irrigation_system TEXT,
    irrigation_network TEXT,
    irrigation_sector TEXT,
    irrigation_days TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_parcels_workspace ON public.parcels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_parcels_cadastre ON public.parcels(cadastral_reference);

ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parcels_workspace_owner"
    ON public.parcels FOR ALL
    TO authenticated
    USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()));

-- 2. Farm Parcel Memberships (Link between Farm and Parcels)
CREATE TABLE IF NOT EXISTS public.farm_parcel_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_fpm_farm ON public.farm_parcel_memberships(farm_id);
CREATE INDEX IF NOT EXISTS idx_fpm_parcel ON public.farm_parcel_memberships(parcel_id);

ALTER TABLE public.farm_parcel_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fpm_access"
    ON public.farm_parcel_memberships FOR SELECT
    TO authenticated
    USING (farm_id IN (SELECT user_accessible_farm_ids()));

CREATE POLICY "fpm_manage"
    ON public.farm_parcel_memberships FOR ALL
    TO authenticated
    USING (public.has_farm_capability(farm_id, 'manage_farm'))
    WITH CHECK (public.has_farm_capability(farm_id, 'manage_farm'));

-- 3. Campaigns (Agricultural Seasons)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'ARCHIVED'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_campaigns_farm ON public.campaigns(farm_id);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_access"
    ON public.campaigns FOR SELECT
    TO authenticated
    USING (farm_id IN (SELECT user_accessible_farm_ids()));

CREATE POLICY "campaigns_manage"
    ON public.campaigns FOR ALL
    TO authenticated
    USING (public.has_farm_capability(farm_id, 'manage_farm'))
    WITH CHECK (public.has_farm_capability(farm_id, 'manage_farm'));

-- 4. Deliveries (Pesadas de aceituna en cooperativa / almazara)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE RESTRICT,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
    delivery_date DATE NOT NULL,
    destination_organization_id UUID,
    destination_name TEXT NOT NULL,
    net_grams BIGINT NOT NULL, -- Stored in grams (e.g. 1.200 kg = 1_200_000)
    gross_grams BIGINT,
    tare_grams BIGINT,
    delivery_number TEXT,
    ticket_number TEXT,
    source TEXT NOT NULL DEFAULT 'MANUAL', -- 'MANUAL', 'OCR'
    notes TEXT,
    harvest_id UUID,
    delivery_time TEXT, -- 'HH:mm'
    harvest_origin TEXT, -- 'TREE', 'GROUND'
    recorded_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_deliveries_farm_date ON public.deliveries(farm_id, delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_campaign ON public.deliveries(campaign_id);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliveries_select_authorized"
    ON public.deliveries FOR SELECT
    TO authenticated
    USING (public.has_farm_capability(farm_id, 'view_deliveries'));

CREATE POLICY "deliveries_insert_authorized"
    ON public.deliveries FOR INSERT
    TO authenticated
    WITH CHECK (
        recorded_by_user_id = auth.uid()
        AND public.has_farm_capability(farm_id, 'add_deliveries')
    );

CREATE POLICY "deliveries_update_authorized"
    ON public.deliveries FOR UPDATE
    TO authenticated
    USING (
        (recorded_by_user_id = auth.uid() AND public.has_farm_capability(farm_id, 'add_deliveries'))
        OR public.has_farm_capability(farm_id, 'manage_farm')
    )
    WITH CHECK (
        (recorded_by_user_id = auth.uid() AND public.has_farm_capability(farm_id, 'add_deliveries'))
        OR public.has_farm_capability(farm_id, 'manage_farm')
    );

-- 5. Harvests (Jornadas de recolección)
CREATE TABLE IF NOT EXISTS public.harvests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE RESTRICT,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE RESTRICT,
    harvest_date DATE NOT NULL,
    weight_grams BIGINT NOT NULL,
    destination TEXT,
    notes TEXT,
    collection_method TEXT,
    worker_count INT,
    machinery_text TEXT,
    day_origin TEXT, -- 'AUTO_DAY', 'MANUAL'
    recorded_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_harvests_farm_date ON public.harvests(farm_id, harvest_date);

ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "harvests_select_authorized"
    ON public.harvests FOR SELECT
    TO authenticated
    USING (public.has_farm_capability(farm_id, 'manage_activities'));

CREATE POLICY "harvests_insert_authorized"
    ON public.harvests FOR INSERT
    TO authenticated
    WITH CHECK (
        recorded_by_user_id = auth.uid()
        AND public.has_farm_capability(farm_id, 'manage_activities')
    );

-- 6. Expenses (Gastos contables)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    farm_id UUID REFERENCES public.farms(id) ON DELETE RESTRICT,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE RESTRICT,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE RESTRICT,
    activity_id UUID,
    delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
    supplier_organization_id UUID,
    expense_date DATE NOT NULL,
    concept TEXT NOT NULL,
    category TEXT NOT NULL,
    amount_minor BIGINT NOT NULL, -- Stored in cents (e.g. 150.50 € = 15050)
    currency TEXT NOT NULL DEFAULT 'EUR',
    provider TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'POSTED', -- 'DRAFT', 'POSTED', 'PROPOSED'
    origin TEXT NOT NULL DEFAULT 'MANUAL',
    proposed_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_expenses_farm ON public.expenses(farm_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_workspace ON public.expenses(workspace_id);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_workspace_owner"
    ON public.expenses FOR ALL
    TO authenticated
    USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()));

CREATE POLICY "expenses_propose_grant"
    ON public.expenses FOR INSERT
    TO authenticated
    WITH CHECK (
        proposed_by_user_id = auth.uid()
        AND farm_id IS NOT NULL
        AND public.has_farm_capability(farm_id, 'propose_expenses')
        AND status = 'PROPOSED'
    );

-- 7. Documents (Metadatos de ficheros, fotos de pesada y albaranes)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    owner_type TEXT NOT NULL, -- 'DELIVERY', 'FARM', 'PARCEL', 'ACTIVITY', 'CONTRACT'
    owner_id UUID NOT NULL,
    type TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    display_name TEXT NOT NULL,
    file_size_bytes BIGINT,
    sha256 TEXT,
    local_uri TEXT,
    remote_path TEXT,
    upload_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY', -- 'LOCAL_ONLY', 'UPLOADING', 'UPLOADED', 'FAILED'
    uploaded_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_sha256 ON public.documents(sha256);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_workspace_access"
    ON public.documents FOR ALL
    TO authenticated
    USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()));

CREATE POLICY "documents_delivery_shared"
    ON public.documents FOR SELECT
    TO authenticated
    USING (
        owner_type = 'DELIVERY'
        AND owner_id IN (
            SELECT id FROM public.deliveries WHERE public.has_farm_capability(farm_id, 'view_deliveries')
        )
    );
