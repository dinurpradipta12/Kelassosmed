-- =============================================================================
-- RUANG SOSMED 2.0 LMS — TOOLS YOU NEED (LEARNER WEB APPS DIRECTORY)
-- Migration: 028_learner_web_apps.sql
-- 1. Tabel `public.learner_web_apps` (hanya Admin/Mentor via RLS langsung)
-- 2. RPC `public.get_learner_web_apps()` mengembalikan daftar app + status akses
--    dan menyembunyikan `url` (`NULL`) jika user belum punya akses
-- 3. RPC `public.unlock_web_app_with_points(uuid)` memotong poin server-side &
--    mencatat entitlement ke `public.learner_unlocked_items`
-- =============================================================================

-- 1. Tabel Direktori Web App (`learner_web_apps`)
CREATE TABLE IF NOT EXISTS public.learner_web_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Tools',
  url text NOT NULL,
  icon_url text,
  icon_preset text NOT NULL DEFAULT 'sparkles',
  accent_color text NOT NULL DEFAULT '#4F39F6',
  access_mode text NOT NULL DEFAULT 'free' CHECK (access_mode IN ('free', 'pro', 'paid')),
  price_idr integer NOT NULL DEFAULT 0 CHECK (price_idr >= 0),
  points_cost integer NOT NULL DEFAULT 0 CHECK (points_cost >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learner_web_apps_active_order
  ON public.learner_web_apps (is_active, sort_order ASC, created_at DESC);

ALTER TABLE public.learner_web_apps ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.learner_web_apps FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.learner_web_apps TO authenticated, service_role;

DROP POLICY IF EXISTS "learner_web_apps_admin_manage" ON public.learner_web_apps;
CREATE POLICY "learner_web_apps_admin_manage"
  ON public.learner_web_apps
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_mentor())
  WITH CHECK (public.is_admin_or_mentor());

-- 2. RPC Publikasi Aman ke Portal Siswa (URL disensor jika belum berhak)
CREATE OR REPLACE FUNCTION public.get_learner_web_apps()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
  v_email text := '';
  v_tier text := 'free';
  v_is_pro boolean := false;
  v_rows jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  v_is_staff := public.is_admin_or_mentor();

  SELECT
    lower(trim(COALESCE(p.email, ''))),
    lower(trim(COALESCE(p.subscription_tier, 'free')))
  INTO v_email, v_tier
  FROM public.profiles p
  WHERE p.id = v_uid;

  v_email := COALESCE(
    NULLIF(v_email, ''),
    lower(trim(COALESCE(auth.jwt()->>'email', '')))
  );

  v_is_pro := v_is_staff OR (v_tier = 'pro');

  IF NOT v_is_pro AND to_regclass('public.user_profiles') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE (up.user_id = v_uid OR (v_email <> '' AND lower(trim(up.email)) = v_email))
        AND (
          COALESCE((up.perks->>'is_pro')::boolean, false) = true
          OR lower(COALESCE(up.perks->>'tier', '')) = 'pro'
        )
        AND (
          NULLIF(up.perks->>'pro_expires_at', '') IS NULL
          OR (up.perks->>'pro_expires_at')::timestamptz > now()
        )
    )
    INTO v_is_pro;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', row_data.id,
        'name', row_data.name,
        'description', row_data.description,
        'category', row_data.category,
        'url', CASE WHEN row_data.has_access THEN row_data.url ELSE NULL END,
        'icon_url', row_data.icon_url,
        'icon_preset', row_data.icon_preset,
        'accent_color', row_data.accent_color,
        'access_mode', row_data.access_mode,
        'price_idr', row_data.price_idr,
        'points_cost', row_data.points_cost,
        'is_active', row_data.is_active,
        'sort_order', row_data.sort_order,
        'is_unlocked', row_data.is_unlocked,
        'has_access', row_data.has_access,
        'has_pending_request', row_data.has_pending_request,
        'created_at', row_data.created_at,
        'updated_at', row_data.updated_at
      )
      ORDER BY row_data.sort_order ASC, row_data.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      w.id,
      w.name,
      w.description,
      w.category,
      w.url,
      w.icon_url,
      w.icon_preset,
      w.accent_color,
      w.access_mode,
      w.price_idr,
      w.points_cost,
      w.is_active,
      w.sort_order,
      w.created_at,
      w.updated_at,
      (
        EXISTS (
          SELECT 1
          FROM public.learner_unlocked_items u
          WHERE u.item_key = ('webapp::' || w.id::text)
            AND (
              u.user_id = v_uid
              OR (v_email <> '' AND lower(trim(u.user_email)) = v_email)
            )
        )
      ) AS is_unlocked,
      (
        v_is_staff
        OR w.access_mode = 'free'
        OR (w.access_mode = 'pro' AND v_is_pro)
        OR (
          w.access_mode = 'paid'
          AND EXISTS (
            SELECT 1
            FROM public.learner_unlocked_items u2
            WHERE u2.item_key = ('webapp::' || w.id::text)
              AND (
                u2.user_id = v_uid
                OR (v_email <> '' AND lower(trim(u2.user_email)) = v_email)
              )
          )
        )
      ) AS has_access,
      (
        EXISTS (
          SELECT 1
          FROM public.pro_upgrade_requests r
          WHERE r.user_id = v_uid
            AND r.request_type = 'item_unlock'
            AND r.target_item_key = ('webapp::' || w.id::text)
            AND r.status = 'pending'
        )
      ) AS has_pending_request
    FROM public.learner_web_apps w
    WHERE v_is_staff OR w.is_active = true
  ) AS row_data;

  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.get_learner_web_apps() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_learner_web_apps() TO authenticated;

-- 3. RPC Tukar Poin Bintang untuk Buka Web App Berbayar
CREATE OR REPLACE FUNCTION public.unlock_web_app_with_points(p_app_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := '';
  v_current_points integer := 0;
  v_new_points integer := 0;
  v_app record;
  v_item_key text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Silakan login terlebih dahulu.');
  END IF;

  SELECT *
  INTO v_app
  FROM public.learner_web_apps
  WHERE id = p_app_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Web App tidak ditemukan atau sudah dinonaktifkan.');
  END IF;

  IF v_app.access_mode <> 'paid' OR COALESCE(v_app.points_cost, 0) <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Web App ini tidak mendukung penukaran Poin Bintang.');
  END IF;

  SELECT lower(trim(COALESCE(email, ''))), COALESCE(total_points, 0)
  INTO v_email, v_current_points
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  v_email := COALESCE(
    NULLIF(v_email, ''),
    lower(trim(COALESCE(auth.jwt()->>'email', '')))
  );
  IF v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email profil tidak ditemukan.');
  END IF;

  v_item_key := 'webapp::' || v_app.id::text;

  IF EXISTS (
    SELECT 1
    FROM public.learner_unlocked_items u
    WHERE u.item_key = v_item_key
      AND (u.user_id = v_uid OR lower(trim(u.user_email)) = v_email)
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_unlocked', true,
      'new_points', v_current_points,
      'item_key', v_item_key,
      'url', v_app.url
    );
  END IF;

  IF v_current_points < v_app.points_cost THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('Poin Anda belum mencukupi. Butuh %s ★ pts (saldo saat ini: %s pts).', v_app.points_cost, v_current_points)
    );
  END IF;

  v_new_points := GREATEST(0, v_current_points - v_app.points_cost);

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET total_points = v_new_points
  WHERE id = v_uid;

  INSERT INTO public.learner_unlocked_items (
    user_id,
    user_email,
    item_key,
    course_title,
    chapter_id,
    unlock_method,
    points_spent,
    price_paid_idr
  )
  VALUES (
    v_uid,
    v_email,
    v_item_key,
    'Tools You Need: ' || v_app.name,
    NULL,
    'points',
    v_app.points_cost,
    0
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'already_unlocked', false,
    'new_points', v_new_points,
    'item_key', v_item_key,
    'url', v_app.url
  );
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_web_app_with_points(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_web_app_with_points(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
