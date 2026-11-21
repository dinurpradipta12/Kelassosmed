-- =============================================================================
-- RUANG SOSMED 2.0 LMS — MIGRATION 018:
--   1. Tambah dukungan Trial 3 Hari (`3d_trial`) di samping Trial 7 Hari (`7d_trial`)
--      dengan aturan 1x pakai untuk member baru (jika salah satu trial dipakai,
--      akun ditandai `has_used_trial = true` dan pilihan aktif selanjutnya 30 hari)
--   2. Perbarui RPC `submit_pro_upgrade_request`, `admin_set_learner_pro`, &
--      `admin_extend_learner_pro` (tanpa mengubah signature parameter agar aman dari overload)
-- =============================================================================

-- 1) Backfill `has_used_trial` bila ada request/histori Trial 3 hari maupun 7 hari
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
          r.billing_cycle IN ('3d_trial', '7d_trial')
          OR lower(COALESCE(r.package_name, '')) LIKE '%trial 3%'
          OR lower(COALESCE(r.package_name, '')) LIKE '%trial 7%'
        )
        AND COALESCE(r.status, 'pending') <> 'rejected'
    );
END;
$$;

-- 2) Perbarui `submit_pro_upgrade_request` untuk menerima '3d_trial' & validasi 1x pakai
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

  IF v_cycle NOT IN ('3d_trial', '7d_trial', '30d', 'single_item') THEN
    v_cycle := '30d';
  END IF;

  IF v_req_type NOT IN ('subscription', 'item_unlock') THEN
    v_req_type := CASE WHEN v_cycle = 'single_item' THEN 'item_unlock' ELSE 'subscription' END;
  END IF;

  v_duration := COALESCE(
    p_duration_days,
    CASE
      WHEN v_cycle = '3d_trial' THEN 3
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

  -- Tolak mutlak jika user mencoba mengambil Trial (3 hari / 7 hari) lebih dari 1x
  IF v_req_type = 'subscription' AND v_cycle IN ('3d_trial', '7d_trial') THEN
    IF v_has_used_trial OR EXISTS (
      SELECT 1
      FROM public.pro_upgrade_requests r
      WHERE (r.user_id = v_uid OR lower(r.user_email) = v_email)
        AND r.billing_cycle IN ('3d_trial', '7d_trial')
        AND COALESCE(r.status, 'pending') <> 'rejected'
    ) THEN
      RAISE EXCEPTION 'Paket percobaan (3 hari / 7 hari) hanya berlaku 1x untuk member baru dan sudah pernah digunakan pada akun ini.';
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
        WHEN v_cycle = '3d_trial' THEN 'Konfirmasi Trial 3 Hari Baru'
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
          CASE
            WHEN v_cycle = '3d_trial' THEN 'Trial 3 Hari'
            WHEN v_cycle = '7d_trial' THEN 'Trial 7 Hari'
            ELSE 'Bulanan 30 Hari'
          END,
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

-- 3) Perbarui `admin_set_learner_pro` untuk mendukung '3d_trial' & '7d_trial'
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
      COALESCE(
        p_duration_days,
        NULLIF(duration_days, 0),
        CASE
          WHEN billing_cycle = '3d_trial' THEN 3
          WHEN billing_cycle = '7d_trial' THEN 7
          ELSE 30
        END
      ),
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

  v_cycle := COALESCE(
    v_cycle,
    CASE
      WHEN COALESCE(v_duration, 30) <= 4 THEN '3d_trial'
      WHEN COALESCE(v_duration, 30) <= 8 THEN '7d_trial'
      ELSE '30d'
    END
  );

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
      has_used_trial = CASE WHEN v_cycle IN ('3d_trial', '7d_trial') THEN true ELSE has_used_trial END,
      trial_used_at = CASE WHEN v_cycle IN ('3d_trial', '7d_trial') THEN COALESCE(trial_used_at, now()) ELSE trial_used_at END
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
    -- Cabut akses hanya saat explicit revoke (p_request_id IS NULL); JANGAN mereset `has_used_trial`
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
          CASE
            WHEN v_cycle = '3d_trial' THEN 'Trial 3 Hari'
            WHEN v_cycle = '7d_trial' THEN 'Trial 7 Hari'
            ELSE 'Bulanan'
          END,
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

-- 4) Perbarui `admin_extend_learner_pro` untuk mendukung '3d_trial' & '7d_trial'
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
    CASE
      WHEN (v_due_date - v_start_date) <= 4 THEN '3d_trial'
      WHEN (v_due_date - v_start_date) <= 8 THEN '7d_trial'
      ELSE '30d'
    END
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
    has_used_trial = CASE WHEN v_cycle IN ('3d_trial', '7d_trial') THEN true ELSE has_used_trial END,
    trial_used_at = CASE WHEN v_cycle IN ('3d_trial', '7d_trial') THEN COALESCE(trial_used_at, now()) ELSE trial_used_at END
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
