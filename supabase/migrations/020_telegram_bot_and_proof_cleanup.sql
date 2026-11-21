-- =============================================================================
-- RUANG SOSMED 2.0 LMS — MIGRATION 020:
--   1. Tabel `public.telegram_bot_settings` (ketat Admin-only RLS) untuk menyimpan
--      Bot Token, Admin Chat ID, Webhook Secret, & preferensi notifikasi Telegram
--   2. Kolom tracking pesan Telegram (`telegram_chat_id`, `telegram_message_id`,
--      `proof_deleted_at`) pada `public.pro_upgrade_requests`
--   3. Trigger otomatis mengosongkan `proof_url` saat status request berubah
--      menjadi 'approved' atau 'rejected' (penghapusan file Storage ditangani server/app)
-- =============================================================================

-- 1) Tabel Pengaturan Bot Telegram (Admin-only, tersembunyi dari public/anon/learner)
CREATE TABLE IF NOT EXISTS public.telegram_bot_settings (
  id text PRIMARY KEY DEFAULT 'default',
  enabled boolean NOT NULL DEFAULT false,
  bot_token text,
  admin_chat_id text,
  webhook_secret text,
  notify_payments boolean NOT NULL DEFAULT true,
  notify_new_users boolean NOT NULL DEFAULT true,
  notify_quiz_submissions boolean NOT NULL DEFAULT false,
  notify_content_issues boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_bot_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.telegram_bot_settings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.telegram_bot_settings TO authenticated, service_role;

DROP POLICY IF EXISTS "telegram_bot_settings_admin_only" ON public.telegram_bot_settings;
CREATE POLICY "telegram_bot_settings_admin_only"
  ON public.telegram_bot_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.telegram_bot_settings (id, enabled)
VALUES ('default', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Kolom tracking Telegram & penghapusan bukti bayar pada `pro_upgrade_requests`
ALTER TABLE IF EXISTS public.pro_upgrade_requests
  ADD COLUMN IF NOT EXISTS telegram_chat_id text,
  ADD COLUMN IF NOT EXISTS telegram_message_id bigint,
  ADD COLUMN IF NOT EXISTS proof_deleted_at timestamptz;

-- 3) Trigger otomatis hapus referensi `proof_url` saat request selesai diverifikasi/ditolak
CREATE OR REPLACE FUNCTION public.clear_proof_on_request_resolution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') THEN
    IF OLD.proof_url IS NOT NULL OR NEW.proof_url IS NOT NULL THEN
      NEW.proof_deleted_at := COALESCE(NEW.proof_deleted_at, now());
    END IF;
    NEW.proof_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_proof_on_request_resolution ON public.pro_upgrade_requests;
CREATE TRIGGER trg_clear_proof_on_request_resolution
  BEFORE UPDATE ON public.pro_upgrade_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_proof_on_request_resolution();

-- 4) Bersihkan `proof_url` lama pada request yang sudah approved/rejected sebelumnya
UPDATE public.pro_upgrade_requests
SET
  proof_url = NULL,
  proof_deleted_at = COALESCE(proof_deleted_at, now())
WHERE status IN ('approved', 'rejected')
  AND proof_url IS NOT NULL;
