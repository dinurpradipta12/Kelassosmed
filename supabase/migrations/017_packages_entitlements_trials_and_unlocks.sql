-- =============================================================================
-- RUANG SOSMED 2.0 LMS — MIGRATION 017:
--   1. Paket Berlangganan 3-Tier (FREE / Basic / Pro) dengan Benefit ON/OFF Nyata
--   2. Sistem Trial 7 Hari (1x per akun untuk member baru) & Bulanan 30 Hari
--   3. Pelacakan Paket Aktif, Billing Cycle & Riwayat Trial di `public.profiles`
--      + Proteksi trigger `protect_profiles_sensitive_fields()`
--   4. Dukungan Pembukaan Materi Satuan via Poin / Pembayaran (`public.learner_unlocked_items`)
--      + RLS ketat & Realtime Publication
--   5. Pembaruan RPC:
--      - `submit_pro_upgrade_request` (validasi 1x Trial 7 hari di sisi server + support item unlock)
--      - `admin_set_learner_pro` (support package_id, billing_cycle 7d_trial/30d, & item_unlock approval)
--      - `admin_extend_learner_pro` (support package_id & billing_cycle 7d_trial/30d)
--      - `unlock_module_with_points` (atomik: validasi saldo, potong poin, buka bab/kursus)
--      - `admin_grant_unlocked_item` (admin membuka akses materi satuan dari permintaan bayar / manual)
--      - `get_workspace_sync_watermark` (mempertahankan seluruh field 016 + status tier/trial/unlocks)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PERLUAS KOLOM `public.contents`, `public.profiles`, & `public.pro_upgrade_requests`
-- -----------------------------------------------------------------------------
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS is_pro_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_used_trial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS pro_package_id text,
  ADD COLUMN IF NOT EXISTS pro_billing_cycle text;

ALTER TABLE public.pro_upgrade_requests
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT '30d',
  ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS target_item_key text,
  ADD COLUMN IF NOT EXISTS target_item_title text;

CREATE INDEX IF NOT EXISTS idx_profiles_pro_package_id
  ON public.profiles (pro_package_id);

CREATE INDEX IF NOT EXISTS idx_pro_requests_user_trial
  ON public.pro_upgrade_requests (user_id, billing_cycle, status);

-- -----------------------------------------------------------------------------
-- 2. PERBARUI TRIGGER PROTEKSI KOLOM SENSITIF PADA `public.profiles`
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profiles_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass boolean := (
    current_setting('app.bypass_profile_protection', true) = 'on'
    OR current_user IN ('postgres', 'supabase_admin')
    OR auth.role() = 'service_role'
    OR public.is_admin()
  );
BEGIN
  IF v_bypass THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'learner'::public.user_role;
    NEW.subscription_tier := 'free';
    NEW.total_points := 0;
    NEW.pro_started_at := NULL;
    NEW.pro_expires_at := NULL;
    NEW.pro_package_name := NULL;
    NEW.pro_package_id := NULL;
    NEW.pro_billing_cycle := NULL;
    NEW.has_used_trial := false;
    NEW.trial_used_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
       OR NEW.total_points IS DISTINCT FROM OLD.total_points
       OR NEW.pro_started_at IS DISTINCT FROM OLD.pro_started_at
       OR NEW.pro_expires_at IS DISTINCT FROM OLD.pro_expires_at
       OR NEW.pro_package_name IS DISTINCT FROM OLD.pro_package_name
       OR NEW.pro_package_id IS DISTINCT FROM OLD.pro_package_id
       OR NEW.pro_billing_cycle IS DISTINCT FROM OLD.pro_billing_cycle
       OR NEW.has_used_trial IS DISTINCT FROM OLD.has_used_trial
       OR NEW.trial_used_at IS DISTINCT FROM OLD.trial_used_at THEN
      RAISE EXCEPTION 'Forbidden: only verified admin can modify role, subscription, points, or trial flags';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profiles_sensitive_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profiles_sensitive_fields();

-- -----------------------------------------------------------------------------
-- 3. TABEL `public.learner_unlocked_items` (BUKA MATERI SATUAN VIA POIN / BAYAR)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learner_unlocked_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  item_key text NOT NULL,
  course_title text NOT NULL,
  chapter_id text,
  unlock_method text NOT NULL DEFAULT 'points' CHECK (unlock_method IN ('points', 'purchase', 'admin_grant')),
  points_spent integer NOT NULL DEFAULT 0,
  price_paid_idr integer NOT NULL DEFAULT 0,
  request_id uuid REFERENCES public.pro_upgrade_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_learner_unlocked_items_email_key
  ON public.learner_unlocked_items (lower(user_email), item_key);

CREATE INDEX IF NOT EXISTS idx_learner_unlocked_items_user
  ON public.learner_unlocked_items (user_id, created_at DESC);

ALTER TABLE public.learner_unlocked_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unlocked_items_select_own_or_staff" ON public.learner_unlocked_items;
CREATE POLICY "unlocked_items_select_own_or_staff"
  ON public.learner_unlocked_items FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(user_email) = lower(COALESCE(auth.jwt()->>'email', ''))
    OR public.is_admin_or_mentor()
  );

DROP POLICY IF EXISTS "unlocked_items_write_admin_only" ON public.learner_unlocked_items;
CREATE POLICY "unlocked_items_write_admin_only"
  ON public.learner_unlocked_items FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tambahkan ke supabase_realtime secara idempoten agar unlock sinkron instan
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'learner_unlocked_items'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.learner_unlocked_items;
    END IF;
  END IF;
END;
$$;

-- Backfill `has_used_trial` secara aman untuk akun yang sebelumnya pernah memakai trial 7 hari
DO $$
BEGIN
  PERFORM set_config('app.bypass_profile_protection', 'on', true);
  UPDATE public.profiles p
  SET
    has_used_trial = true,
    trial_used_at = COALESCE(p.trial_used_at, now())
  WHERE p.has_used_trial = false
    AND EXISTS (
      SELECT 1
      FROM public.pro_upgrade_requests r
      WHERE (r.user_id = p.id OR lower(r.user_email) = lower(p.email))
        AND (
          r.billing_cycle = '7d_trial'
          OR lower(COALESCE(r.package_name, '')) LIKE '%trial 7%'
        )
        AND COALESCE(r.status, 'pending') <> 'rejected'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. PERBARUI RPC `submit_pro_upgrade_request` (VALIDASI TRIAL 1x + ITEM UNLOCK)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_pro_upgrade_request(text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.submit_pro_upgrade_request(text, text, text, text, text, text, text, text, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_pro_upgrade_request(
  p_user_name text,
  p_package_id text,
  p_package_name text,
  p_price_label text,
  p_payment_method text DEFAULT 'QRIS / Transfer Manual',
  p_buyer_contact text DEFAULT '',
  p_proof_url text DEFAULT NULL,
  p_billing_cycle text DEFAULT '30d',
  p_duration_days integer DEFAULT 30,
  p_request_type text DEFAULT 'subscription',
  p_target_item_key text DEFAULT NULL,
  p_target_item_title text DEFAULT NULL
)
RETURNS public.pro_upgrade_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_has_used_trial boolean := false;
  v_cycle text := COALESCE(NULLIF(lower(trim(p_billing_cycle)), ''), '30d');
  v_req_type text := COALESCE(NULLIF(lower(trim(p_request_type)), ''), 'subscription');
  v_duration integer;
  v_req public.pro_upgrade_requests;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: login required';
  END IF;

  IF v_cycle NOT IN ('7d_trial', '30d', 'single_item') THEN
    v_cycle := '30d';
  END IF;

  IF v_req_type NOT IN ('subscription', 'item_unlock') THEN
    v_req_type := CASE WHEN v_cycle = 'single_item' THEN 'item_unlock' ELSE 'subscription' END;
  END IF;

  v_duration := COALESCE(
    p_duration_days,
    CASE
      WHEN v_cycle = '7d_trial' THEN 7
      WHEN v_cycle = 'single_item' THEN 0
      ELSE 30
    END
  );

  SELECT
    email,
    COALESCE(NULLIF(trim(p_user_name), ''), full_name, split_part(email, '@', 1)),
    COALESCE(has_used_trial, false)
  INTO v_email, v_name, v_has_used_trial
  FROM public.profiles
  WHERE id = v_uid;

  v_email := lower(trim(COALESCE(v_email, auth.jwt()->>'email', '')));
  v_name := COALESCE(NULLIF(trim(v_name), ''), NULLIF(trim(p_user_name), ''), split_part(v_email, '@', 1), 'Learner');

  IF v_email = '' THEN
    RAISE EXCEPTION 'Profile email not found';
  END IF;

  -- Tolak mutlak jika user mencoba mengambil Trial 7 hari lebih dari 1x
  IF v_req_type = 'subscription' AND v_cycle = '7d_trial' THEN
    IF v_has_used_trial OR EXISTS (
      SELECT 1
      FROM public.pro_upgrade_requests r
      WHERE (r.user_id = v_uid OR lower(r.user_email) = v_email)
        AND r.billing_cycle = '7d_trial'
        AND COALESCE(r.status, 'pending') <> 'rejected'
    ) THEN
      RAISE EXCEPTION 'Paket percobaan 7 hari hanya berlaku 1x untuk member baru dan sudah pernah digunakan pada akun ini.';
    END IF;
  END IF;

  INSERT INTO public.pro_upgrade_requests (
    user_id, user_email, user_name, package_id, package_name, price_label,
    payment_method, buyer_contact, proof_url, status,
    billing_cycle, duration_days, request_type, target_item_key, target_item_title
  ) VALUES (
    v_uid,
    v_email,
    v_name,
    COALESCE(NULLIF(trim(p_package_id), ''), 'pkg-pro'),
    COALESCE(NULLIF(trim(p_package_name), ''), 'Pro'),
    COALESCE(NULLIF(trim(p_price_label), ''), 'Rp 150.000'),
    COALESCE(NULLIF(trim(p_payment_method), ''), 'QRIS / Transfer Manual'),
    COALESCE(trim(p_buyer_contact), ''),
    NULLIF(trim(COALESCE(p_proof_url, '')), ''),
    'pending',
    v_cycle,
    GREATEST(0, v_duration),
    v_req_type,
    NULLIF(trim(COALESCE(p_target_item_key, '')), ''),
    NULLIF(trim(COALESCE(p_target_item_title, '')), '')
  )
  RETURNING * INTO v_req;

  PERFORM public._append_admin_notification(
    jsonb_build_object(
      'id', 'notif-pro-req-' || v_req.id::text,
      'eventType', 'pro_subscribed',
      'title', CASE
        WHEN v_req_type = 'item_unlock' THEN 'Konfirmasi Buka Materi Satuan'
        WHEN v_cycle = '7d_trial' THEN 'Konfirmasi Trial 7 Hari Baru'
        ELSE 'Konfirmasi Pembayaran Paket Baru'
      END,
      'message', CASE
        WHEN v_req_type = 'item_unlock' THEN format(
          '%s mengajukan pembayaran buka materi "%s" (%s). Verifikasi di Daftar Akun.',
          v_name,
          COALESCE(v_req.target_item_title, v_req.package_name),
          v_req.price_label
        )
        ELSE format(
          'Yuhuu ... %s mengajukan pembayaran paket %s (%s • %s). Verifikasi pembayaran di Daftar Akun sebelum mengaktifkan akses.',
          v_name,
          v_req.package_name,
          CASE WHEN v_cycle = '7d_trial' THEN 'Trial 7 Hari' ELSE 'Bulanan 30 Hari' END,
          v_req.price_label
        )
      END,
      'userName', v_name,
      'userEmail', v_email,
      'packageName', v_req.package_name,
      'priceLabel', v_req.price_label,
      'requestId', v_req.id,
      'read', false,
      'createdAt', now()
    )
  );

  RETURN v_req;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_pro_upgrade_request(text, text, text, text, text, text, text, text, integer, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_pro_upgrade_request(text, text, text, text, text, text, text, text, integer, text, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. PERBARUI RPC `admin_set_learner_pro` (MENDUKUNG PACKAGE_ID, TRIAL 1x & ITEM UNLOCK)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_set_learner_pro(text, text, boolean, text, uuid);
DROP FUNCTION IF EXISTS public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer);
DROP FUNCTION IF EXISTS public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer, text, text);

CREATE OR REPLACE FUNCTION public.admin_set_learner_pro(
  p_target_email text,
  p_target_name text,
  p_is_pro boolean,
  p_package_name text DEFAULT 'Pro',
  p_request_id uuid DEFAULT NULL,
  p_started_at date DEFAULT NULL,
  p_due_at date DEFAULT NULL,
  p_duration_days integer DEFAULT NULL,
  p_package_id text DEFAULT NULL,
  p_billing_cycle text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_clean_name text := COALESCE(NULLIF(trim(p_target_name), ''), split_part(v_clean_email, '@', 1), 'Learner');
  v_pkg text := COALESCE(NULLIF(trim(p_package_name), ''), 'Pro');
  v_pkg_id text := NULLIF(trim(COALESCE(p_package_id, '')), '');
  v_cycle text := NULLIF(lower(trim(COALESCE(p_billing_cycle, ''))), '');
  v_duration integer := COALESCE(p_duration_days, 30);
  v_req_type text := 'subscription';
  v_req_item_key text;
  v_req_item_title text;
  v_req_user_id uuid;
  v_username text;
  v_start_date date := COALESCE(p_started_at, (now() AT TIME ZONE 'Asia/Jakarta')::date);
  v_due_date date;
  v_start_ts timestamptz;
  v_expires_ts timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF p_request_id IS NOT NULL THEN
    SELECT
      COALESCE(request_type, 'subscription'),
      target_item_key,
      target_item_title,
      COALESCE(v_pkg_id, NULLIF(trim(package_id), '')),
      COALESCE(v_cycle, NULLIF(lower(trim(billing_cycle)), '')),
      COALESCE(p_duration_days, NULLIF(duration_days, 0), CASE WHEN billing_cycle = '7d_trial' THEN 7 ELSE 30 END),
      user_id
    INTO
      v_req_type,
      v_req_item_key,
      v_req_item_title,
      v_pkg_id,
      v_cycle,
      v_duration,
      v_req_user_id
    FROM public.pro_upgrade_requests
    WHERE id = p_request_id;
  END IF;

  IF v_clean_email = '' THEN
    RETURN false;
  END IF;

  -- Jika request adalah buka materi satuan, jangan ubah paket/tanggal langganan utama user
  IF v_req_type = 'item_unlock' THEN
    IF p_is_pro AND v_req_item_key IS NOT NULL THEN
      INSERT INTO public.learner_unlocked_items (
        user_id, user_email, item_key, course_title, chapter_id,
        unlock_method, points_spent, price_paid_idr, request_id
      ) VALUES (
        COALESCE(
          v_req_user_id,
          (SELECT id FROM public.profiles WHERE lower(email) = v_clean_email LIMIT 1)
        ),
        v_clean_email,
        v_req_item_key,
        COALESCE(v_req_item_title, v_pkg),
        NULL,
        'purchase',
        0,
        0,
        p_request_id
      )
      ON CONFLICT (lower(user_email), item_key) DO UPDATE SET
        user_id = COALESCE(EXCLUDED.user_id, public.learner_unlocked_items.user_id),
        unlock_method = 'purchase',
        request_id = COALESCE(EXCLUDED.request_id, public.learner_unlocked_items.request_id);
    END IF;

    IF p_request_id IS NOT NULL THEN
      UPDATE public.pro_upgrade_requests
      SET
        status = CASE WHEN p_is_pro THEN 'approved' ELSE 'rejected' END,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_at = now()
      WHERE id = p_request_id;
    END IF;

    RETURN true;
  END IF;

  v_cycle := COALESCE(v_cycle, CASE WHEN COALESCE(v_duration, 30) <= 8 THEN '7d_trial' ELSE '30d' END);
  IF v_pkg_id IS NULL THEN
    v_pkg_id := CASE
      WHEN lower(v_pkg) LIKE '%basic%' THEN 'pkg-basic'
      WHEN lower(v_pkg) LIKE '%free%' THEN 'pkg-free'
      ELSE 'pkg-pro'
    END;
  END IF;

  v_due_date := COALESCE(p_due_at, v_start_date + GREATEST(1, COALESCE(v_duration, 30)));
  IF v_due_date < v_start_date THEN
    v_due_date := v_start_date + GREATEST(1, COALESCE(v_duration, 30));
  END IF;

  v_start_ts := (v_start_date::timestamp AT TIME ZONE 'Asia/Jakarta');
  v_expires_ts := ((v_due_date::timestamp + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'Asia/Jakarta');

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  IF p_is_pro THEN
    UPDATE public.profiles
    SET
      subscription_tier = 'pro',
      pro_started_at = v_start_ts,
      pro_expires_at = v_expires_ts,
      pro_package_name = v_pkg,
      pro_package_id = v_pkg_id,
      pro_billing_cycle = v_cycle,
      has_used_trial = CASE WHEN v_cycle = '7d_trial' THEN true ELSE has_used_trial END,
      trial_used_at = CASE WHEN v_cycle = '7d_trial' THEN COALESCE(trial_used_at, now()) ELSE trial_used_at END
    WHERE lower(email) = v_clean_email;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      UPDATE public.user_profiles
      SET
        perks = COALESCE(perks, '{}'::jsonb) || jsonb_build_object(
          'is_pro', true,
          'pro_started_at', v_start_ts,
          'pro_expires_at', v_expires_ts,
          'pro_package_name', v_pkg,
          'pro_package_id', v_pkg_id,
          'pro_billing_cycle', v_cycle
        ),
        updated_at = timezone('utc', now())
      WHERE lower(email) = v_clean_email;

      SELECT username
      INTO v_username
      FROM public.user_profiles
      WHERE lower(email) = v_clean_email
      ORDER BY updated_at DESC
      LIMIT 1;
    END IF;

    IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
      INSERT INTO public.user_subscriptions (
        username, plan_tier, status, started_at, due_at, payment_method, renewal_status, updated_at
      ) VALUES (
        v_username,
        'PRO',
        'aktif',
        v_start_date,
        v_due_date,
        'admin verified',
        'siap diperpanjang',
        timezone('utc', now())
      )
      ON CONFLICT (username) DO UPDATE SET
        plan_tier = 'PRO',
        status = 'aktif',
        started_at = EXCLUDED.started_at,
        due_at = EXCLUDED.due_at,
        payment_method = EXCLUDED.payment_method,
        renewal_status = EXCLUDED.renewal_status,
        updated_at = timezone('utc', now());
    END IF;
  ELSIF p_request_id IS NULL THEN
    -- Cabut akses hanya saat explicit revoke (p_request_id IS NULL), bukan saat Admin menolak request upgrade baru dari member yang masih aktif paket lain.
    -- JANGAN mereset `has_used_trial` agar trial tetap 1x.
    UPDATE public.profiles
    SET
      subscription_tier = 'free',
      pro_expires_at = NULL,
      pro_package_id = NULL,
      pro_package_name = NULL,
      pro_billing_cycle = NULL
    WHERE lower(email) = v_clean_email;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      UPDATE public.user_profiles
      SET
        perks = (COALESCE(perks, '{}'::jsonb) - 'pro_expires_at' - 'pro_package_id' - 'pro_billing_cycle')
          || jsonb_build_object('is_pro', false),
        updated_at = timezone('utc', now())
      WHERE lower(email) = v_clean_email;

      SELECT username
      INTO v_username
      FROM public.user_profiles
      WHERE lower(email) = v_clean_email
      ORDER BY updated_at DESC
      LIMIT 1;
    END IF;

    IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
      UPDATE public.user_subscriptions
      SET
        plan_tier = 'Free',
        status = 'nonaktif',
        renewal_status = 'nonaktif',
        updated_at = timezone('utc', now())
      WHERE lower(username) = lower(v_username);
    END IF;
  END IF;

  IF p_request_id IS NOT NULL THEN
    UPDATE public.pro_upgrade_requests
    SET
      status = CASE WHEN p_is_pro THEN 'approved' ELSE 'rejected' END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    WHERE id = p_request_id;
  END IF;

  IF p_is_pro THEN
    PERFORM public._append_admin_notification(
      jsonb_build_object(
        'id', 'notif-pro-active-' || encode(convert_to(v_clean_email || '-' || extract(epoch from now())::text, 'UTF8'), 'hex'),
        'eventType', 'pro_subscribed',
        'title', 'Yuhuu! ⚡ Paket Berbayar Aktif',
        'message', format(
          'Yuhuu! %s telah aktif pada paket %s (%s • berlaku s/d %s).',
          v_clean_name,
          v_pkg,
          CASE WHEN v_cycle = '7d_trial' THEN 'Trial 7 Hari' ELSE 'Bulanan' END,
          to_char(v_due_date, 'DD Mon YYYY')
        ),
        'userName', v_clean_name,
        'userEmail', v_clean_email,
        'packageName', v_pkg,
        'read', false,
        'createdAt', now()
      )
    );
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. PERBARUI RPC `admin_extend_learner_pro`
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_extend_learner_pro(text, text, date, date, text);
DROP FUNCTION IF EXISTS public.admin_extend_learner_pro(text, text, date, date, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_extend_learner_pro(
  p_target_email text,
  p_target_name text,
  p_started_at date,
  p_due_at date,
  p_package_name text DEFAULT 'Pro',
  p_package_id text DEFAULT NULL,
  p_billing_cycle text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_clean_name text := COALESCE(NULLIF(trim(p_target_name), ''), split_part(v_clean_email, '@', 1), 'Learner');
  v_pkg text := COALESCE(NULLIF(trim(p_package_name), ''), 'Pro');
  v_pkg_id text := NULLIF(trim(COALESCE(p_package_id, '')), '');
  v_start_date date := COALESCE(p_started_at, (now() AT TIME ZONE 'Asia/Jakarta')::date);
  v_due_date date;
  v_cycle text;
  v_start_ts timestamptz;
  v_expires_ts timestamptz;
  v_username text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email target wajib diisi.');
  END IF;

  IF p_due_at IS NOT NULL AND p_due_at >= v_start_date THEN
    v_due_date := p_due_at;
  ELSE
    v_due_date := v_start_date + 30;
  END IF;

  v_cycle := COALESCE(
    NULLIF(lower(trim(COALESCE(p_billing_cycle, ''))), ''),
    CASE WHEN (v_due_date - v_start_date) <= 8 THEN '7d_trial' ELSE '30d' END
  );

  IF v_pkg_id IS NULL THEN
    v_pkg_id := CASE
      WHEN lower(v_pkg) LIKE '%basic%' THEN 'pkg-basic'
      WHEN lower(v_pkg) LIKE '%free%' THEN 'pkg-free'
      ELSE 'pkg-pro'
    END;
  END IF;

  v_start_ts := (v_start_date::timestamp AT TIME ZONE 'Asia/Jakarta');
  v_expires_ts := ((v_due_date::timestamp + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'Asia/Jakarta');

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET
    subscription_tier = 'pro',
    pro_started_at = v_start_ts,
    pro_expires_at = v_expires_ts,
    pro_package_name = v_pkg,
    pro_package_id = v_pkg_id,
    pro_billing_cycle = v_cycle,
    has_used_trial = CASE WHEN v_cycle = '7d_trial' THEN true ELSE has_used_trial END,
    trial_used_at = CASE WHEN v_cycle = '7d_trial' THEN COALESCE(trial_used_at, now()) ELSE trial_used_at END
  WHERE lower(email) = v_clean_email;

  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    UPDATE public.user_profiles
    SET
      perks = COALESCE(perks, '{}'::jsonb) || jsonb_build_object(
        'is_pro', true,
        'pro_started_at', v_start_ts,
        'pro_expires_at', v_expires_ts,
        'pro_package_name', v_pkg,
        'pro_package_id', v_pkg_id,
        'pro_billing_cycle', v_cycle
      ),
      updated_at = timezone('utc', now())
    WHERE lower(email) = v_clean_email;

    SELECT username
    INTO v_username
    FROM public.user_profiles
    WHERE lower(email) = v_clean_email
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (
      username, plan_tier, status, started_at, due_at, payment_method, renewal_status, updated_at
    ) VALUES (
      v_username,
      'PRO',
      'aktif',
      v_start_date,
      v_due_date,
      'manual renewal by admin',
      'diperpanjang manual',
      timezone('utc', now())
    )
    ON CONFLICT (username) DO UPDATE SET
      plan_tier = 'PRO',
      status = 'aktif',
      started_at = EXCLUDED.started_at,
      due_at = EXCLUDED.due_at,
      payment_method = EXCLUDED.payment_method,
      renewal_status = EXCLUDED.renewal_status,
      updated_at = timezone('utc', now());
  END IF;

  PERFORM public._append_admin_notification(
    jsonb_build_object(
      'id', 'notif-pro-renew-' || encode(convert_to(v_clean_email || '-' || extract(epoch from now())::text, 'UTF8'), 'hex'),
      'eventType', 'pro_subscribed',
      'title', '🔄 Aktivasi / Perpanjangan Paket Berhasil',
      'message', format(
        'Admin mengaktifkan / memperpanjang paket %s untuk %s hingga jatuh tempo %s.',
        v_pkg,
        v_clean_name,
        to_char(v_due_date, 'DD Mon YYYY')
      ),
      'userName', v_clean_name,
      'userEmail', v_clean_email,
      'packageName', v_pkg,
      'read', false,
      'createdAt', now()
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'pro_started_at', v_start_ts,
    'pro_expires_at', v_expires_ts,
    'pro_package_name', v_pkg,
    'pro_package_id', v_pkg_id,
    'pro_billing_cycle', v_cycle,
    'started_date', v_start_date,
    'due_date', v_due_date
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_extend_learner_pro(text, text, date, date, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_extend_learner_pro(text, text, date, date, text, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 7. RPC `unlock_module_with_points` (BUKA MATERI LANJUTAN DENGAN POIN SISWA)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_module_with_points(
  p_course_title text,
  p_chapter_id text DEFAULT NULL,
  p_points_cost integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_clean_course text := lower(trim(COALESCE(p_course_title, '')));
  v_clean_chapter text := NULLIF(trim(COALESCE(p_chapter_id, '')), '');
  v_item_key text;
  v_cost integer := GREATEST(1, COALESCE(p_points_cost, 50));
  v_current_points integer := 0;
  v_new_points integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Silakan login terlebih dahulu.');
  END IF;

  IF v_clean_course = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Judul materi tidak valid.');
  END IF;

  v_item_key := CASE
    WHEN v_clean_chapter IS NOT NULL THEN 'chapter::' || v_clean_course || '::' || v_clean_chapter
    ELSE 'course::' || v_clean_course
  END;

  SELECT lower(trim(email)), COALESCE(total_points, 0)
  INTO v_email, v_current_points
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  v_email := COALESCE(NULLIF(v_email, ''), lower(trim(COALESCE(auth.jwt()->>'email', ''))));
  IF v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email profil tidak ditemukan.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.learner_unlocked_items
    WHERE (user_id = v_uid OR lower(user_email) = v_email)
      AND item_key = v_item_key
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_unlocked', true,
      'new_points', v_current_points,
      'item_key', v_item_key
    );
  END IF;

  IF v_current_points < v_cost THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('Saldo poin tidak cukup. Butuh %s pts (saldo: %s pts).', v_cost, v_current_points)
    );
  END IF;

  v_new_points := GREATEST(0, v_current_points - v_cost);

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET total_points = v_new_points
  WHERE id = v_uid;

  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    UPDATE public.user_profiles
    SET
      perks = COALESCE(perks, '{}'::jsonb) || jsonb_build_object('total_points', v_new_points),
      updated_at = timezone('utc', now())
    WHERE user_id = v_uid OR lower(email) = v_email;
  END IF;

  INSERT INTO public.learner_unlocked_items (
    user_id, user_email, item_key, course_title, chapter_id,
    unlock_method, points_spent, price_paid_idr
  ) VALUES (
    v_uid,
    v_email,
    v_item_key,
    trim(p_course_title),
    v_clean_chapter,
    'points',
    v_cost,
    0
  )
  ON CONFLICT (lower(user_email), item_key) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'new_points', v_new_points,
    'item_key', v_item_key
  );
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_module_with_points(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_module_with_points(text, text, integer) TO authenticated;

-- -----------------------------------------------------------------------------
-- 8. RPC `admin_grant_unlocked_item` (ADMIN MEMBUKA MATERI SATUAN UNTUK SISWA)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_grant_unlocked_item(
  p_target_email text,
  p_item_key text,
  p_course_title text,
  p_chapter_id text DEFAULT NULL,
  p_request_id uuid DEFAULT NULL,
  p_price_paid_idr integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_item_key text := trim(COALESCE(p_item_key, ''));
  v_target_uid uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_email = '' OR v_item_key = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email dan item_key wajib diisi.');
  END IF;

  SELECT id INTO v_target_uid
  FROM public.profiles
  WHERE lower(email) = v_clean_email
  LIMIT 1;

  INSERT INTO public.learner_unlocked_items (
    user_id, user_email, item_key, course_title, chapter_id,
    unlock_method, points_spent, price_paid_idr, request_id
  ) VALUES (
    v_target_uid,
    v_clean_email,
    v_item_key,
    COALESCE(NULLIF(trim(p_course_title), ''), 'Materi Satuan'),
    NULLIF(trim(COALESCE(p_chapter_id, '')), ''),
    CASE WHEN p_request_id IS NOT NULL THEN 'purchase' ELSE 'admin_grant' END,
    0,
    GREATEST(0, COALESCE(p_price_paid_idr, 0)),
    p_request_id
  )
  ON CONFLICT (lower(user_email), item_key) DO UPDATE SET
    user_id = COALESCE(EXCLUDED.user_id, public.learner_unlocked_items.user_id),
    unlock_method = EXCLUDED.unlock_method,
    price_paid_idr = GREATEST(public.learner_unlocked_items.price_paid_idr, EXCLUDED.price_paid_idr),
    request_id = COALESCE(EXCLUDED.request_id, public.learner_unlocked_items.request_id);

  IF p_request_id IS NOT NULL THEN
    UPDATE public.pro_upgrade_requests
    SET
      status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'item_key', v_item_key
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_unlocked_item(text, text, text, text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_unlocked_item(text, text, text, text, uuid, integer) TO authenticated;

-- -----------------------------------------------------------------------------
-- 9. PERBARUI `get_workspace_sync_watermark()` (PERTAHANKAN SEMUA FIELD 016 + TIER V2)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_workspace_sync_watermark()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
  v_contents_ts timestamptz;
  v_contents_count bigint := 0;
  v_own_profile_role text;
  v_own_profile_tier text;
  v_own_pro_expires_at timestamptz;
  v_own_profile_points integer := 0;
  v_own_avatar text;
  v_own_pkg_id text;
  v_own_billing_cycle text;
  v_own_used_trial boolean := false;
  v_own_unlocked_count bigint := 0;
  v_own_unlocked_ts timestamptz;
  v_user_profile_ts timestamptz;
  v_inbox_ts timestamptz;
  v_inbox_count bigint := 0;
  v_issues_ts timestamptz;
  v_pro_settings_ts timestamptz;
  v_all_profiles_count bigint := 0;
  v_pro_requests_pending bigint := 0;
  v_admin_notifs_ts timestamptz;
  v_learner_notifs_ts timestamptz;
  v_learner_pages_ts timestamptz;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT
      role::text,
      subscription_tier,
      pro_expires_at,
      total_points,
      avatar_url,
      pro_package_id,
      pro_billing_cycle,
      COALESCE(has_used_trial, false)
    INTO
      v_own_profile_role,
      v_own_profile_tier,
      v_own_pro_expires_at,
      v_own_profile_points,
      v_own_avatar,
      v_own_pkg_id,
      v_own_billing_cycle,
      v_own_used_trial
    FROM public.profiles
    WHERE id = v_uid;

    v_is_staff := COALESCE(v_own_profile_role, '') IN ('admin', 'mentor');

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      SELECT MAX(updated_at)
      INTO v_user_profile_ts
      FROM public.user_profiles
      WHERE user_id = v_uid
         OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''));
    END IF;

    IF to_regclass('public.learner_unlocked_items') IS NOT NULL THEN
      SELECT COUNT(*), MAX(created_at)
      INTO v_own_unlocked_count, v_own_unlocked_ts
      FROM public.learner_unlocked_items
      WHERE user_id = v_uid
         OR lower(user_email) = lower(COALESCE(auth.jwt()->>'email', ''));
    END IF;
  END IF;

  IF v_is_staff THEN
    SELECT MAX(updated_at), COUNT(*)
    INTO v_contents_ts, v_contents_count
    FROM public.contents;
  ELSE
    SELECT MAX(updated_at), COUNT(*)
    INTO v_contents_ts, v_contents_count
    FROM public.contents
    WHERE (
      status = 'published'::public.content_status
      AND title NOT LIKE '__SYSTEM_%'
    )
    OR title IN (
      '__SYSTEM_MAINTENANCE_CONFIG__',
      '__SYSTEM_COHORT_PROJECTS__',
      '__SYSTEM_EXPLORER_FOLDERS__',
      '__SYSTEM_REWARDS_CATALOG__',
      '__SYSTEM_CERTIFICATE_CONFIG__',
      '__SYSTEM_LEARNER_PRO_CONFIG__',
      '__SYSTEM_LEARNER_NOTIFICATIONS__',
      '__SYSTEM_USER_AVATARS__',
      '__SYSTEM_LEARNER_PAGES_CONFIG__'
    );
  END IF;

  IF v_uid IS NOT NULL THEN
    IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
      SELECT MAX(updated_at), COUNT(*)
      INTO v_inbox_ts, v_inbox_count
      FROM public.mentor_inbox_threads;
    END IF;
    IF to_regclass('public.mentor_reported_issues') IS NOT NULL THEN
      SELECT MAX(created_at) INTO v_issues_ts FROM public.mentor_reported_issues;
    END IF;
    IF to_regclass('public.learner_pro_settings') IS NOT NULL THEN
      SELECT updated_at INTO v_pro_settings_ts FROM public.learner_pro_settings WHERE id = 'default' LIMIT 1;
    END IF;
    SELECT MAX(updated_at)
    INTO v_learner_notifs_ts
    FROM public.contents
    WHERE title = '__SYSTEM_LEARNER_NOTIFICATIONS__';
    SELECT MAX(updated_at)
    INTO v_learner_pages_ts
    FROM public.contents
    WHERE title = '__SYSTEM_LEARNER_PAGES_CONFIG__';
  END IF;

  IF v_is_staff THEN
    SELECT COUNT(*) INTO v_all_profiles_count FROM public.profiles;
    IF to_regclass('public.pro_upgrade_requests') IS NOT NULL THEN
      SELECT COUNT(*) INTO v_pro_requests_pending
      FROM public.pro_upgrade_requests
      WHERE status = 'pending';
    END IF;
    SELECT MAX(updated_at)
    INTO v_admin_notifs_ts
    FROM public.contents
    WHERE title = '__SYSTEM_ADMIN_NOTIFICATIONS__';
  END IF;

  RETURN jsonb_build_object(
    'uid', v_uid,
    'staff', v_is_staff,
    'contents_ts', v_contents_ts,
    'contents_count', v_contents_count,
    'own_role', v_own_profile_role,
    'own_tier', v_own_profile_tier,
    'own_pro_expires_at', v_own_pro_expires_at,
    'own_points', v_own_profile_points,
    'own_avatar', v_own_avatar,
    'own_pkg_id', v_own_pkg_id,
    'own_billing_cycle', v_own_billing_cycle,
    'own_used_trial', v_own_used_trial,
    'own_unlocked_count', v_own_unlocked_count,
    'own_unlocked_ts', v_own_unlocked_ts,
    'up_ts', v_user_profile_ts,
    'inbox_ts', v_inbox_ts,
    'inbox_count', v_inbox_count,
    'issues_ts', v_issues_ts,
    'pro_cfg_ts', v_pro_settings_ts,
    'staff_profiles_count', v_all_profiles_count,
    'pro_req_pending', v_pro_requests_pending,
    'admin_notifs_ts', v_admin_notifs_ts,
    'learner_notifs_ts', v_learner_notifs_ts,
    'learner_pages_ts', v_learner_pages_ts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_sync_watermark() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_sync_watermark() TO anon, authenticated;
