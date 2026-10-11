-- Mágina Olivo — G0 Migration 1/3: Identity, Workspaces, Shared Farms, Grants & Secure Invitations
-- Issues: #726, #735, #739, #727
-- Reconciles existing Supabase schema (farms with legacy owner_id) and enforces strict RLS.

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$$;

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$$;

-- 1. User Profiles (1:1 with auth.users natively provided by Supabase)
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

DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
CREATE POLICY "user_profiles_update_own"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
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

DROP POLICY IF EXISTS "workspaces_owner_access" ON public.workspaces;
CREATE POLICY "workspaces_owner_access"
    ON public.workspaces FOR ALL
    TO authenticated
    USING (owner_user_id = auth.uid())
    WITH CHECK (owner_user_id = auth.uid());

-- 3. Reconcile Farms (Supports legacy schema: id, owner_id, name, cover_image_uri)
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id), -- legacy column
    name TEXT NOT NULL,
    cover_image_uri TEXT,                   -- legacy column
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safely add canonical multi-tenant columns to public.farms
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE RESTRICT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS creator_user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS municipality TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- Backfill creator_user_id from legacy owner_id when present
UPDATE public.farms SET creator_user_id = owner_id WHERE creator_user_id IS NULL AND owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_farms_workspace ON public.farms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_farms_creator ON public.farms(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_farms_status ON public.farms(status);

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
        WHERE id = f_id AND (
            creator_user_id = auth.uid()
            OR owner_id = auth.uid()
            OR (workspace_id IS NOT NULL AND workspace_id IN (
                SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()
            ))
        )
        UNION
        -- Active grant with requested capability
        SELECT 1 FROM public.farm_access_grants
        WHERE farm_id = f_id
          AND user_id = auth.uid()
          AND status = 'ACTIVE'
          AND (valid_until IS NULL OR valid_until > now())
          AND (req_cap = ANY(capabilities) OR 'manage_all' = ANY(capabilities))
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
       OR owner_id = auth.uid()
       OR (workspace_id IS NOT NULL AND workspace_id IN (
           SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()
       ))
    UNION
    SELECT farm_id FROM public.farm_access_grants
    WHERE user_id = auth.uid()
      AND status = 'ACTIVE'
      AND (valid_until IS NULL OR valid_until > now());
$$;

-- Drop legacy farm policies to reconcile safely
DROP POLICY IF EXISTS "farms_select_own" ON public.farms;
DROP POLICY IF EXISTS "farms_insert_own" ON public.farms;
DROP POLICY IF EXISTS "farms_update_own" ON public.farms;
DROP POLICY IF EXISTS "farms_delete_own" ON public.farms;
DROP POLICY IF EXISTS "farms_select_accessible" ON public.farms;
DROP POLICY IF EXISTS "farms_insert_creator" ON public.farms;
DROP POLICY IF EXISTS "farms_update_authorized" ON public.farms;

-- RLS Policies on Farms
CREATE POLICY "farms_select_accessible"
    ON public.farms FOR SELECT
    TO authenticated
    USING (id IN (SELECT user_accessible_farm_ids()));

CREATE POLICY "farms_insert_creator"
    ON public.farms FOR INSERT
    TO authenticated
    WITH CHECK (
        (creator_user_id = auth.uid() OR owner_id = auth.uid())
        AND (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()))
    );

CREATE POLICY "farms_update_authorized"
    ON public.farms FOR UPDATE
    TO authenticated
    USING (public.has_farm_capability(id, 'manage_farm'))
    WITH CHECK (public.has_farm_capability(id, 'manage_farm'));

-- RLS Policies on Grants
DROP POLICY IF EXISTS "grants_select_authorized" ON public.farm_access_grants;
CREATE POLICY "grants_select_authorized"
    ON public.farm_access_grants FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.has_farm_capability(farm_id, 'manage_grants'));

DROP POLICY IF EXISTS "grants_insert_authorized" ON public.farm_access_grants;
CREATE POLICY "grants_insert_authorized"
    ON public.farm_access_grants FOR INSERT
    TO authenticated
    WITH CHECK (public.has_farm_capability(farm_id, 'manage_grants'));

DROP POLICY IF EXISTS "grants_update_authorized" ON public.farm_access_grants;
CREATE POLICY "grants_update_authorized"
    ON public.farm_access_grants FOR UPDATE
    TO authenticated
    USING (public.has_farm_capability(farm_id, 'manage_grants'))
    WITH CHECK (public.has_farm_capability(farm_id, 'manage_grants'));

-- 5. Farm Invitations (Strictly protected by RLS; claimable via secure RPC)
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
    requires_issuer_confirmation BOOLEAN NOT NULL DEFAULT false,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON public.farm_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_farm ON public.farm_invitations(farm_id);
CREATE INDEX IF NOT EXISTS idx_invitations_state ON public.farm_invitations(state, expires_at);

ALTER TABLE public.farm_invitations ENABLE ROW LEVEL SECURITY;

-- P0-2 Fix: ONLY users with manage_grants capability on the farm can view or create invitations.
-- NO public or general authenticated SELECT on table!
DROP POLICY IF EXISTS "invitations_issuer_manage" ON public.farm_invitations;
DROP POLICY IF EXISTS "invitations_claim_select" ON public.farm_invitations;

CREATE POLICY "invitations_manage_authorized"
    ON public.farm_invitations FOR ALL
    TO authenticated
    USING (public.has_farm_capability(farm_id, 'manage_grants'))
    WITH CHECK (
        public.has_farm_capability(farm_id, 'manage_grants')
        AND issued_by_user_id = auth.uid()
    );

-- 6. Secure RPCs for Invitation Claim and Confirmation (P0-2)
CREATE OR REPLACE FUNCTION public.claim_farm_invitation(token_plaintext TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token_hash TEXT;
    v_inv RECORD;
    v_farm RECORD;
    v_current_user UUID;
BEGIN
    v_current_user := auth.uid();
    IF v_current_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
    END IF;

    -- Calculate SHA-256 hash using built-in PostgreSQL sha256 function
    v_token_hash := encode(sha256(token_plaintext::bytea), 'hex');

    -- Atomically lock the invitation row
    SELECT * INTO v_inv
    FROM public.farm_invitations
    WHERE token_hash = v_token_hash
      AND state = 'PENDING'
      AND expires_at > now()
      AND use_count < max_uses
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'invitation_invalid_or_expired');
    END IF;

    SELECT id, name, municipality INTO v_farm
    FROM public.farms WHERE id = v_inv.farm_id;

    -- Update invitation usage
    UPDATE public.farm_invitations
    SET state = CASE WHEN v_inv.requires_issuer_confirmation THEN 'CLAIMED' ELSE 'ACCEPTED' END,
        claimed_by_user_id = v_current_user,
        use_count = use_count + 1,
        confirmed_at = CASE WHEN NOT v_inv.requires_issuer_confirmation THEN now() ELSE NULL END,
        updated_at = now()
    WHERE id = v_inv.id;

    -- If immediate acceptance (no manual issuer confirmation required), create grant atomically
    IF NOT v_inv.requires_issuer_confirmation THEN
        INSERT INTO public.farm_access_grants (
            farm_id,
            user_id,
            granted_by_user_id,
            role,
            capabilities,
            status,
            created_at,
            updated_at
        )
        VALUES (
            v_inv.farm_id,
            v_current_user,
            v_inv.issued_by_user_id,
            v_inv.role,
            v_inv.capabilities,
            'ACTIVE',
            now(),
            now()
        )
        ON CONFLICT (farm_id, user_id)
        DO UPDATE SET
            role = EXCLUDED.role,
            capabilities = EXCLUDED.capabilities,
            status = 'ACTIVE',
            updated_at = now();
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'farm_id', v_inv.farm_id,
        'farm_name', v_farm.name,
        'role', v_inv.role,
        'capabilities', v_inv.capabilities,
        'requires_confirmation', v_inv.requires_issuer_confirmation,
        'status', CASE WHEN v_inv.requires_issuer_confirmation THEN 'CLAIMED' ELSE 'ACCEPTED' END
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_farm_invitation(p_invitation_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv RECORD;
    v_current_user UUID;
BEGIN
    v_current_user := auth.uid();
    SELECT * INTO v_inv FROM public.farm_invitations WHERE id = p_invitation_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'invitation_not_found');
    END IF;

    IF NOT public.has_farm_capability(v_inv.farm_id, 'manage_grants') THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    IF v_inv.state <> 'CLAIMED' OR v_inv.claimed_by_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_state_for_confirmation');
    END IF;

    -- Activate grant
    INSERT INTO public.farm_access_grants (
        farm_id, user_id, granted_by_user_id, role, capabilities, status
    ) VALUES (
        v_inv.farm_id, v_inv.claimed_by_user_id, v_current_user, v_inv.role, v_inv.capabilities, 'ACTIVE'
    )
    ON CONFLICT (farm_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, capabilities = EXCLUDED.capabilities, status = 'ACTIVE', updated_at = now();

    UPDATE public.farm_invitations
    SET state = 'ACCEPTED', confirmed_at = now(), updated_at = now()
    WHERE id = p_invitation_id;

    RETURN jsonb_build_object('success', true, 'status', 'ACCEPTED');
END;
$$;
