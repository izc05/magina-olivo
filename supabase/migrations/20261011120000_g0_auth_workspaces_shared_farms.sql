-- Mágina Olivo — G0 Migration 1/3: Identity, Workspaces, Shared Farms & RLS
-- Issues: #726, #735, #739, #727

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. User Profiles (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    locale TEXT NOT NULL DEFAULT 'es-ES',
    timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_own"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "user_profiles_update_own"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_insert_own"
    ON public.user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- 2. Workspaces (Private multi-tenant operational boundary)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'ES',
    timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
    locale TEXT NOT NULL DEFAULT 'es-ES',
    currency TEXT NOT NULL DEFAULT 'EUR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_user_id);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspaces_owner_access"
    ON public.workspaces FOR ALL
    TO authenticated
    USING (owner_user_id = auth.uid())
    WITH CHECK (owner_user_id = auth.uid());

-- 3. Farms (Canonical farm entity, can be shared across accounts)
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    creator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    municipality TEXT,
    province TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'ARCHIVED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_farms_workspace ON public.farms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_farms_creator ON public.farms(creator_user_id);

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- 4. Farm Access Grants (Canonical multi-user role & capability grants)
CREATE TABLE IF NOT EXISTS public.farm_access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    role TEXT NOT NULL, -- 'OWNER', 'EXPLOITER', 'WORKER', 'VIEWER'
    capabilities TEXT[] NOT NULL DEFAULT ARRAY['view_farm'],
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED', 'REVOKED'
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (farm_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_grants_farm ON public.farm_access_grants(farm_id);
CREATE INDEX IF NOT EXISTS idx_grants_user ON public.farm_access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_grants_status ON public.farm_access_grants(status);

ALTER TABLE public.farm_access_grants ENABLE ROW LEVEL SECURITY;

-- Security Definer helper function: Check if current user has capability on farm
CREATE OR REPLACE FUNCTION public.has_farm_capability(f_id UUID, req_cap TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        -- Farm owner/creator always has full capability
        SELECT 1 FROM public.farms
        WHERE id = f_id AND (creator_user_id = auth.uid() OR workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()
        ))
        UNION
        -- Active grant with capability
        SELECT 1 FROM public.farm_access_grants
        WHERE farm_id = f_id
          AND user_id = auth.uid()
          AND status = 'ACTIVE'
          AND (valid_until IS NULL OR valid_until > now())
          AND (req_cap = ANY(capabilities) OR 'all' = ANY(capabilities))
    );
$$;

-- Security Definer helper function: List of accessible farms for current user
CREATE OR REPLACE FUNCTION public.user_accessible_farm_ids()
RETURNS TABLE (farm_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT id FROM public.farms
    WHERE creator_user_id = auth.uid()
       OR workspace_id IN (SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid())
    UNION
    SELECT farm_id FROM public.farm_access_grants
    WHERE user_id = auth.uid()
      AND status = 'ACTIVE'
      AND (valid_until IS NULL OR valid_until > now());
$$;

-- RLS Policies on Farms
CREATE POLICY "farms_select_accessible"
    ON public.farms FOR SELECT
    TO authenticated
    USING (id IN (SELECT user_accessible_farm_ids()));

CREATE POLICY "farms_insert_creator"
    ON public.farms FOR INSERT
    TO authenticated
    WITH CHECK (
        creator_user_id = auth.uid()
        AND workspace_id IN (SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid())
    );

CREATE POLICY "farms_update_authorized"
    ON public.farms FOR UPDATE
    TO authenticated
    USING (public.has_farm_capability(id, 'manage_farm'))
    WITH CHECK (public.has_farm_capability(id, 'manage_farm'));

-- RLS Policies on Grants
CREATE POLICY "grants_select_authorized"
    ON public.farm_access_grants FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.has_farm_capability(farm_id, 'manage_grants'));

CREATE POLICY "grants_insert_authorized"
    ON public.farm_access_grants FOR INSERT
    TO authenticated
    WITH CHECK (public.has_farm_capability(farm_id, 'manage_grants'));

CREATE POLICY "grants_update_authorized"
    ON public.farm_access_grants FOR UPDATE
    TO authenticated
    USING (public.has_farm_capability(farm_id, 'manage_grants'))
    WITH CHECK (public.has_farm_capability(farm_id, 'manage_grants'));

-- 5. Farm Invitations (QR, WhatsApp, and link temporary invitations)
CREATE TABLE IF NOT EXISTS public.farm_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    issued_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    token_hash TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'WORKER',
    capabilities TEXT[] NOT NULL DEFAULT ARRAY['view_farm'],
    invitee_email_hash TEXT,
    state TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'CLAIMED', 'ACCEPTED', 'REVOKED', 'EXPIRED'
    claimed_by_user_id UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INT NOT NULL DEFAULT 1,
    use_count INT NOT NULL DEFAULT 0,
    requires_issuer_confirmation BOOLEAN NOT NULL DEFAULT true,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON public.farm_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_farm ON public.farm_invitations(farm_id);
CREATE INDEX IF NOT EXISTS idx_invitations_state ON public.farm_invitations(state, expires_at);

ALTER TABLE public.farm_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_issuer_manage"
    ON public.farm_invitations FOR ALL
    TO authenticated
    USING (issued_by_user_id = auth.uid() OR public.has_farm_capability(farm_id, 'manage_grants'))
    WITH CHECK (issued_by_user_id = auth.uid() OR public.has_farm_capability(farm_id, 'manage_grants'));

CREATE POLICY "invitations_claim_select"
    ON public.farm_invitations FOR SELECT
    TO authenticated
    USING (state = 'PENDING' AND expires_at > now());
