-- =============================================================================
-- RUANG SOSMED 2.0 LMS — LANDING PAGE V7 (FOKUS BELAJAR & TUJUAN SISWA)
-- File: supabase/migrations/024_landing_page_v6_full_system.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor.
-- Memperbarui baris slug = 'home' di public.landing_pages dengan preset lengkap
-- Ruang Sosmed 2.0 sambil mempertahankan payment_config & header_image_url
-- yang sudah dikonfigurasi oleh Admin.
-- =============================================================================

INSERT INTO public.landing_pages (
  slug,
  title,
  description,
  header_image_url,
  header_config,
  payment_config,
  footer_config,
  theme,
  status,
  blocks
)
VALUES (
  'home',
  'Ruang Sosmed 2.0 — Official Platform',
  'Platform belajar Social Media Specialist 100% Full Organik dengan Kurikulum Berjenjang, Wiki SOP, Catatan & Diskusi Mentor, Rumi XP, Rewards Shop & Sertifikat HD.',
  '',
  $header_cfg${
    "showAnnouncement": true,
    "announcementBadge": "Ruang Sosmed 2.0 Live",
    "announcementText": "Belajar Strategi Social Media 100% Full Organik • Roadmap Siap Kerja • Gamifikasi Rumi XP • Trial 3 & 7 Hari",
    "announcementBgColor": "#121215",
    "announcementBadgeColor": "#10B981",
    "showNavbar": true,
    "logoUrl": "/logo1.png",
    "brandTitle": "Ruang Sosmed 2.0",
    "navLinks": [
      { "id": "nav-1", "label": "Alur Belajar", "href": "#flow-section" },
      { "id": "nav-2", "label": "Ekosistem", "href": "#ecosystem-section" },
      { "id": "nav-3", "label": "Fitur", "href": "#features-section" },
      { "id": "nav-4", "label": "Kurikulum", "href": "#topics-section" },
      { "id": "nav-5", "label": "Paket Akses", "href": "#pricing-section" },
      { "id": "nav-6", "label": "FAQ", "href": "#faq-section" }
    ],
    "loginLabel": "Masuk",
    "registerLabel": "Daftar Akun",
    "navbarBgColor": "#FFFFFF",
    "primaryButtonColor": "#4F39F6"
  }$header_cfg$::jsonb,
  $payment_cfg${
    "qrCodeUrl": "",
    "bankName": "BCA / Mandiri / QRIS",
    "accountNumber": "123-456-7890",
    "accountHolder": "PT Ruang Sosmed Indonesia",
    "whatsappNumber": "6281234567890",
    "merchantName": "Ruang Sosmed 2.0",
    "paymentInstructions": "Scan kode QRIS di atas melalui m-Banking atau e-wallet (GoPay, OVO, Dana, ShopeePay) Anda. Setelah pembayaran berhasil, kirim konfirmasi untuk aktivasi akses."
  }$payment_cfg$::jsonb,
  $footer_cfg${
    "showFooter": true,
    "brandTitle": "Ruang Sosmed 2.0",
    "logoUrl": "/favicon.png",
    "description": "Platform belajar Social Media Specialist 100% Full Organik — lengkap dengan Kurikulum Berjenjang, Wiki SOP, Catatan & Diskusi Mentor, Gamifikasi Rumi XP, Rewards Shop, dan Sertifikat HD.",
    "copyrightText": "© 2026 Ruang Sosmed 2.0. All rights reserved.",
    "bgColor": "#121215",
    "textColor": "#FFFFFF"
  }$footer_cfg$::jsonb,
  'violet',
  'published',
  $blocks$[
    {
      "id": "block-hero",
      "type": "hero",
      "data": {
        "badgeText": "🌱 100% Full Organik • Kurikulum, Praktik, SOP & Sertifikat Siap Kerja",
        "eyebrow": "Ruang Sosmed 2.0 • Platform Belajar Social Media Specialist",
        "headline": "Belajar Strategi Social Media Organik dari Nol hingga Siap Handle Brand",
        "body": "Platform belajar terstruktur untuk kamu yang ingin menguasai strategi konten organik, workflow kerja agensi, dan portofolio Social Media Specialist—lengkap dengan Ruang Kelas interaktif, Wiki SOP, Diskusi Mentor, Gamifikasi Rumi XP, Rewards Shop, hingga Sertifikat HD.",
        "buttonLabel": "Daftar Gratis Sekarang",
        "secondaryButtonLabel": "Pelajari Alur Sistem",
        "secondaryTargetId": "flow-section",
        "showSystemPreview": true,
        "imageUrl": "",
        "imageAlt": "Pratinjau Portal Ruang Sosmed 2.0",
        "stats": [
          { "label": "Kurikulum Organik", "value": "3 Seri • 22 Modul" },
          { "label": "Belajar Praktis", "value": "Video, Wiki SOP & Kuis" },
          { "label": "Akses Fleksibel", "value": "FREE • Basic • PRO + Trial" },
          { "label": "Output Karir", "value": "Rewards & Sertifikat HD" }
        ]
      }
    },
    {
      "id": "block-flow",
      "type": "benefits",
      "eyebrow": "ALUR & FLOW BELAJAR",
      "sectionTitle": "Alur Belajar End-to-End di Ruang Sosmed 2.0",
      "subtitle": "Dari pertama kali mendaftar sampai meraih sertifikat kelulusan HD—semua dirancang untuk membawamu siap terjun sebagai Social Media Specialist.",
      "items": [
        {
          "id": "flow-1",
          "number": 1,
          "tag": "Mulai Cepat",
          "title": "Daftar Akun & Buka Akses Kelas",
          "description": "Buat akun gratis via Email atau Google. Materi utama langsung siap diakses di berandamu, atau masukkan Kode Akses jika kamu mengikuti kelas batch khusus."
        },
        {
          "id": "flow-2",
          "number": 2,
          "tag": "Kurikulum Terstruktur",
          "title": "Ikuti Roadmap Organik dari Nol",
          "description": "Pelajari materi secara berjenjang mulai dari Fundamental & Mindset, Content System & Workflow, hingga Optimization & Maintenance—100% strategi organik tanpa iklan berbayar."
        },
        {
          "id": "flow-3",
          "number": 3,
          "tag": "Belajar Aktif",
          "title": "Praktik Kuis, Wiki SOP & Diskusi Mentor",
          "description": "Pelajari video & panduan Wiki SOP siap pakai, simpan catatan pribadi per bab, kerjakan kuis & tugas praktik, serta tanya jawab langsung bersama Mentor."
        },
        {
          "id": "flow-4",
          "number": 4,
          "tag": "Jaga Konsistensi",
          "title": "Tumbuhkan Maskot Rumi & Kumpulkan XP",
          "description": "Setiap bab selesai, kuis, catatan, hingga streak harian menaikkan tahap evolusi Rumi (Lv.1 Baby → Lv.5 Superior) agar ritme belajarmu selalu terjaga."
        },
        {
          "id": "flow-5",
          "number": 5,
          "tag": "Benefit Nyata",
          "title": "Raih Poin Bintang & Tukar di Rewards Shop",
          "description": "Kumpulkan Poin Bintang (★) dari progres belajarmu untuk naik Leaderboard, tukar Template/E-Book/Voucher/1-on-1 Mentoring, atau buka modul lanjutan satuan."
        },
        {
          "id": "flow-6",
          "number": 6,
          "tag": "Siap Kerja & Klien",
          "title": "Audit Portofolio & Sertifikat Kelulusan HD",
          "description": "Tuntaskan kelas dan tugas praktik untuk mendapatkan feedback personal dari Mentor serta Sertifikat Kelulusan HD siap lampir di CV & LinkedIn."
        }
      ],
      "data": {}
    },
    {
      "id": "block-system-showcase",
      "type": "system_showcase",
      "data": {
        "eyebrow": "EKSPLORASI EKOSISTEM 2.0",
        "heading": "Lihat Cara Kerja Setiap Fitur di Dalam Ruang Sosmed 2.0",
        "subtitle": "Klik tiap tab untuk melihat bagaimana Ruang Kelas, Evolusi Rumi, hingga sistem Paket, Poin & Sertifikat membantu proses belajarmu.",
        "tabs": [
          {
            "id": "tab-learner-portal",
            "tabLabel": "Ruang Kelas & Wiki SOP",
            "badge": "Active Classroom",
            "title": "Ruang Kelas Interaktif, Wiki SOP & Diskusi Langsung Mentor",
            "subtitle": "Belajar tidak cuma menonton video pasif. Setiap bab dilengkapi catatan pribadi, panduan SOP siap pakai, latihan praktik, dan ruang tanya jawab langsung bersama Mentor.",
            "visualType": "learner_portal",
            "highlights": [
              {
                "title": "Kurikulum Organik & Wiki SOP Siap Pakai",
                "description": "Materi video terstruktur ditambah dokumen Wiki SOP (content calendar, brief kreatif, 30 days handling, rate card) yang bisa langsung dipakai kerja."
              },
              {
                "title": "Kuis Interaktif & Tugas Praktik Nyata",
                "description": "Uji pemahaman melalui beragam format kuis dan kerjakan studi kasus nyata dengan feedback langsung dari Mentor."
              },
              {
                "title": "Catatan Pribadi, Favorit & Q&A per Bab",
                "description": "Simpan catatan penting di tiap bab, tandai materi favorit, unduh lampiran template, dan ajukan pertanyaan langsung tanpa keluar dari kelas."
              }
            ],
            "ctaLabel": "Coba Masuk Portal Gratis",
            "ctaAction": "register"
          },
          {
            "id": "tab-rumi-xp",
            "tabLabel": "Evolusi Rumi & Konsistensi",
            "badge": "Gamifikasi 5 Tahap",
            "title": "Maskot Rumi Tumbuh Seiring Konsistensi Belajarmu",
            "subtitle": "Setiap aktivitas belajar memberi Rumi XP nyata untuk berevolusi dari Lv.1 Baby Rumi hingga Lv.5 Superior Rumi, ditemani Rumi Assistant cepat di setiap halaman.",
            "visualType": "rumi_evolution",
            "highlights": [
              {
                "title": "5 Tahap Evolusi Rumi (Lv.1–Lv.5)",
                "description": "Baby Rumi 🌱 (0 XP) → Junior Rumi ✨ (50 XP) → Teen Rumi 🚀 (250 XP) → Pro Rumi 👑 (600 XP) → Superior Rumi 🏆 (1000 XP)."
              },
              {
                "title": "XP dari Aktivitas Nyata + Multiplier",
                "description": "Login harian (+1 XP), streak 7 hari (+5 XP), selesai bab (+2 XP), submit kuis (+4 XP), catat & ulasan (+2 XP), hingga 2× XP di paket PRO."
              },
              {
                "title": "Rumi Floating Stream Deck",
                "description": "Tekan tombol cepat atau shortcut keyboard 1–6 untuk lompat menu, lihat ringkasan halaman, serta tanya jawab FAQ kontekstual instan."
              }
            ],
            "ctaLabel": "Lihat Paket dengan Bonus XP",
            "ctaAction": "scroll_pricing"
          },
          {
            "id": "tab-access-rewards",
            "tabLabel": "Akses Fleksibel, Poin & Hadiah",
            "badge": "Ekonomi & Sertifikat",
            "title": "3 Tier Fleksibel, Trial 3/7 Hari, Redeem Kode, Poin & Sertifikat HD",
            "subtitle": "Belajar sesuai ritmemu tanpa terpaksa bayar penuh di awal. Pilih FREE, Basic, PRO Unlimited, uji coba Trial, tukar Kode Kelas/Voucher, atau buka bab lanjutan via Poin Bintang.",
            "visualType": "access_rewards",
            "highlights": [
              {
                "title": "Akses Langsung & Redeem Kode Kelas",
                "description": "Materi utama langsung terbuka setelah mendaftar. Untuk kelas batch khusus, cukup masukkan Kode Akses Folder di Beranda untuk membuka seluruh bab."
              },
              {
                "title": "Unlock Satuan, Trial 3/7 Hari & Voucher PRO",
                "description": "Buka bab lanjutan pakai Poin Bintang (★), bayar per materi, klaim Kode Voucher PRO berjangka, atau coba paket Basic/PRO dengan Trial 3 & 7 Hari."
              },
              {
                "title": "Rewards Shop & Sertifikat HD",
                "description": "Poin Bintang masuk Leaderboard dan bisa ditukar Template, E-Book, Voucher Diskon, 1-on-1 Mentoring, atau Merch—plus Sertifikat Kelulusan HD otomatis."
              }
            ],
            "ctaLabel": "Bandingkan Paket Belajar",
            "ctaAction": "scroll_pricing"
          }
        ]
      }
    },
    {
      "id": "block-features",
      "type": "features",
      "data": {
        "heading": "Semua Fitur yang Bikin Belajar Konsisten & Terukur",
        "subtitle": "Bukan sekadar kumpulan video pasif—Ruang Sosmed 2.0 menyatukan kurikulum organik terarah, praktik nyata, gamifikasi XP, dan mentoring aktif.",
        "items": [
          {
            "title": "Akses Instan & Redeem Kode Kelas",
            "description": "Materi utama langsung terbuka saat akun aktif, sedangkan kelas batch khusus cukup dibuka lewat Kode Akses dari mentor di Beranda.",
            "icon": "KeyRound"
          },
          {
            "title": "Ruang Kelas Multi-Format & Wiki SOP",
            "description": "Kombinasi video pembelajaran, halaman artikel, Wiki SOP kerja agensi, kuis interaktif 5 tipe soal, dan tugas praktik nyata.",
            "icon": "BookOpen"
          },
          {
            "title": "Catatan Bab, Favorit & Diskusi Mentor",
            "description": "Setiap siswa bisa menyimpan catatan pribadi per bab, menandai materi favorit, mengunduh template, dan tanya jawab langsung dengan Mentor.",
            "icon": "MessageSquare"
          },
          {
            "title": "Evolusi Maskot Rumi (Lv.1–5) & Stream Deck",
            "description": "Kumpulkan Rumi XP dari login & belajar untuk menumbuhkan Baby Rumi hingga Superior Rumi, lengkap dengan asisten pintasan Stream Deck 1–6.",
            "icon": "Bot"
          },
          {
            "title": "Poin Bintang, Leaderboard & Rewards Shop",
            "description": "Raih Poin Bintang (★) tiap selesai bab dan tukar di Rewards Shop atau gunakan untuk membuka bab lanjutan tanpa harus langsung upgrade.",
            "icon": "Gift"
          },
          {
            "title": "Sertifikat Kelulusan HD Terverifikasi",
            "description": "Setelah menuntaskan seluruh bab wajib dan evaluasi kelas, klaim Sertifikat Kelulusan HD (PNG/PDF) resmi sebagai bukti kompetensi portofolio.",
            "icon": "Award"
          },
          {
            "title": "3 Tier + Trial 3/7 Hari + Voucher PRO",
            "description": "Mulai gratis di FREE, coba Basic atau PRO lewat Trial 3 & 7 Hari, aktivasi Kode Voucher PRO berjangka, atau checkout cepat via QRIS & Transfer.",
            "icon": "Zap"
          },
          {
            "title": "Dokumen Kerja, Rate Card & Portofolio",
            "description": "Panduan lengkap 30 hari handling akun, penyusunan SOP kerja, penentuan rate card jasa, hingga portofolio siap pitching klien maupun melamar kerja.",
            "icon": "FolderOpen"
          }
        ]
      }
    },
    {
      "id": "block-topics",
      "type": "topics",
      "data": {
        "heading": "Learning Center",
        "subtitle": "Pilih kelas yang ingin kamu pelajari — Kurikulum berjenjang dari Fundamental, Intermediate, hingga Masterclass (100% Full Organik).",
        "topics": [
          {
            "id": "fundamental-series",
            "tag": "FUNDAMENTAL",
            "tagColor": "#2563EB",
            "eyebrow": "FUNDAMENTAL SERIES",
            "bannerTitle": "INTRODUCE TO SOCIAL MEDIA SPECIALIST",
            "bannerSubtitle": "Kelas untuk kamu yang ingin memulai",
            "bannerTheme": "blue",
            "category": "SERIES FUNDAMENTAL",
            "title": "Fundamental Social Media Specialist",
            "description": "Pelajari strategi konten, ritme posting, dan cara membaca performa sosial media dari nol.",
            "lessonsCount": 10,
            "modules": [
              { "number": 1, "title": "Modul 1 - Social Media Specialist Fundamental & Mindset" },
              { "number": 2, "title": "Modul 2 - Social Media Channel Behavioral Part 1" },
              { "number": 3, "title": "Modul 3 - Social Media Channel Behavioral Part 2" },
              { "number": 4, "title": "Modul 4 - Audience Insight Development" },
              { "number": 5, "title": "Modul 5 - Social Media Analytics" },
              { "number": 6, "title": "Modul 6 - Social Media Hacks for Social Media Specialist" },
              { "number": 7, "title": "Modul 7 - 30 Days Social Media Specialist in Handling" },
              { "number": 8, "title": "Modul 8 - Persiapan Dokumen Social Media Specialist" },
              { "number": 9, "title": "Modul 9 - Social Media Specialist Rate Development" },
              { "number": 10, "title": "Modul 10 - Portofolio Development for Social Media Specialist" }
            ]
          },
          {
            "id": "intermediate-series",
            "tag": "INTERMEDIATE",
            "tagColor": "#EA580C",
            "eyebrow": "INTERMEDIATE SERIES",
            "bannerTitle": "CONTENT SYSTEM & WORKFLOW SOCIAL MEDIA SPECIALIST",
            "bannerSubtitle": "Bangun workflow dari ide hingga approval",
            "bannerTheme": "coral",
            "category": "SERIES INTERMEDIATE",
            "title": "Content System & Workflow",
            "description": "Bangun workflow pembuatan konten yang efisien mulai dari ide, asset, revisi, hingga approval.",
            "lessonsCount": 7,
            "modules": [
              { "number": 1, "title": "Modul 1 - Pemetaan Content Pillars & Editorial Calendar" },
              { "number": 2, "title": "Modul 2 - Ideation Framework & Hook Formula Organik" },
              { "number": 3, "title": "Modul 3 - Asset Sourcing & Brief Desain/Video Kreatif" },
              { "number": 4, "title": "Modul 4 - SOP Revisi & Internal Quality Control" },
              { "number": 5, "title": "Modul 5 - Client Approval Workflow & Feedback Handling" },
              { "number": 6, "title": "Modul 6 - Automation & Scheduling Tools Setup" },
              { "number": 7, "title": "Modul 7 - Weekly Content Reporting System" }
            ]
          },
          {
            "id": "advance-series",
            "tag": "MASTERCLASS",
            "tagColor": "#7C3AED",
            "eyebrow": "ADVANCE SERIES",
            "bannerTitle": "SOCIAL MEDIA OPTIMIZATION & MAINTENANCE",
            "bannerSubtitle": "Optimasi lanjutan lintas platform",
            "bannerTheme": "purple",
            "category": "SERIES MASTERCLASS",
            "title": "Social Media Optimization & Maintenance",
            "description": "Pelajari kelas lanjutan tentang optimasi social media hingga konten yang bisa diaplikasikan ke berbagai media, platform, bahkan kategori akun.",
            "lessonsCount": 5,
            "modules": [
              { "number": 1, "title": "Modul 1 - Multi-Platform Content Adaptation & Distribution" },
              { "number": 2, "title": "Modul 2 - Advanced Organic Algorithm & Virality Principles" },
              { "number": 3, "title": "Modul 3 - Crisis Management & Brand Reputation Handling" },
              { "number": 4, "title": "Modul 4 - Account Maintenance & Evergreen Content Recycling" },
              { "number": 5, "title": "Modul 5 - Scaling Organic Reach Across Niche Categories" }
            ]
          }
        ]
      }
    },
    {
      "id": "block-pricing",
      "type": "pricing",
      "data": {
        "heading": "Pilihan Paket & Akses Fleksibel",
        "subtitle": "Sesuaikan dengan tahap belajarmu: mulai gratis di paket FREE, buka akses inti dengan Basic, atau maksimalkan seluruh fitur tanpa batas lewat PRO Unlimited (tersedia Trial 3 & 7 Hari).",
        "tiers": [
          {
            "id": "tier-free",
            "name": "FREE",
            "price": "Rp 0",
            "numericPrice": 0,
            "period": "Selamanya",
            "badge": "Mulai Tanpa Risiko",
            "description": "Akses seluruh materi gratis & project publik, kumpulkan Rumi XP + Poin Bintang, dan coba sistem kelas interaktif.",
            "features": [
              "Akses langsung materi utama & kelas publik gratis",
              "Redeem Kode Akses Folder / Kelas Batch dari Mentor",
              "Akses materi berstatus Gratis + Kuis Interaktif dasar",
              "Maskot Baby Rumi XP + Poin Bintang (★) & Leaderboard",
              "Beli & buka materi/modul PRO secara satuan kapan saja"
            ],
            "buttonLabel": "Mulai Gratis",
            "highlighted": false,
            "buttonAction": "register"
          },
          {
            "id": "tier-basic",
            "name": "Basic",
            "price": "Rp 75.000",
            "numericPrice": 75000,
            "period": "bulan",
            "badge": "Tersedia Trial 3 & 7 Hari",
            "description": "Buka fitur penting plus hingga 6 modul awal di tiap materi premium. Modul lanjutan bisa dibuka pakai Poin atau beli satuan.",
            "features": [
              "Semua fitur FREE + Bonus Aktivasi & Multiplier XP Rumi",
              "Akses hingga 6 modul awal pada setiap kelas premium",
              "Buka modul lanjutan fleksibel via Poin Bintang atau satuan",
              "Akses Unduh File Lampiran, Template & Dokumen Wiki SOP",
              "Catatan Pribadi per Bab, Simpan Favorit & Diskusi Mentor",
              "Mendukung aktivasi Trial 3 Hari & Trial 7 Hari di dalam portal"
            ],
            "buttonLabel": "Pilih Paket Basic",
            "highlighted": false,
            "buttonAction": "payment_modal"
          },
          {
            "id": "tier-pro",
            "name": "PRO Unlimited",
            "price": "Rp 150.000",
            "numericPrice": 150000,
            "period": "bulan",
            "badge": "Paling Lengkap • 100% Tanpa Batas",
            "description": "Semua fitur FREE dan Basic ditambah akses penuh 100% ke seluruh modul, Sertifikat Kelulusan HD, dan Review Tugas 1-on-1.",
            "features": [
              "Semua 7 Fitur Premium Tanpa Batas + 2× Multiplier XP Rumi",
              "Seluruh modul & video lanjutan terbuka 100% tanpa potong poin",
              "Akses penuh Fundamental, Intermediate & Masterclass Series",
              "Review Tugas Praktik & Audit Portofolio 1-on-1 bersama Mentor",
              "Penerbitan Sertifikat Kelulusan HD resmi saat kelas tuntas",
              "Dukung Trial 3/7 Hari, Kode Voucher PRO & checkout QRIS/Transfer"
            ],
            "buttonLabel": "Aktifkan Paket PRO",
            "highlighted": true,
            "buttonAction": "payment_modal"
          }
        ],
        "footnote": "Punya Kode Akses Folder kelas atau Kode Voucher PRO? Daftar akun gratis terlebih dahulu, lalu tukarkan langsung di Beranda atau menu Paket Akses. Pembayaran QRIS & Transfer Bank diproses cepat dengan konfirmasi praktis."
      }
    },
    {
      "id": "block-testimonial",
      "type": "testimonial",
      "data": {
        "heading": "Cerita dari Pembelajar Ruang Sosmed 2.0",
        "subtitle": "Pengalaman nyata mereka menggunakan Ruang Kelas, Wiki SOP, Catatan Bab, dan Gamifikasi Rumi hingga siap mengelola akun brand.",
        "reviews": [
          {
            "name": "Sarah Wijaya",
            "role": "Junior Social Media Specialist",
            "company": "D2C Fashion Brand",
            "comment": "Begitu daftar dan masukkan kode folder dari mentor, semua materi langsung rapi di Beranda. Fitur catatan per bab dan SOP 30 days in handling-nya bikin saya pede handle 2 akun brand secara full organik.",
            "rating": 5
          },
          {
            "name": "Rian Ramadhan",
            "role": "Freelance Content Strategist",
            "company": "Independent Creator",
            "comment": "Sistem Content Workflow plus Wiki SOP & template rate card di Ruang Sosmed 2.0 benar-benar terpakai saat pitching klien. Tanya jawab di diskusi bab juga cepat dibalas mentor!",
            "rating": 5
          },
          {
            "name": "Nadia Kusuma",
            "role": "Social Media Intern",
            "company": "Creative Digital Agency",
            "comment": "Belajar jadi nggak gampang bolong karena ngejar evolusi Rumi XP tiap hari sama ngumpulin Poin Bintang buat tukar template di Rewards Shop. Sertifikat HD-nya juga langsung kepakai buat CV.",
            "rating": 5
          }
        ]
      }
    },
    {
      "id": "block-faq",
      "type": "faq",
      "data": {
        "heading": "Pertanyaan yang Sering Diajukan",
        "subtitle": "Semua hal yang perlu kamu ketahui tentang alur belajar, sistem akses, gamifikasi Rumi, dan kurikulum Ruang Sosmed 2.0.",
        "faqs": [
          {
            "question": "Bagaimana alur mulai belajar setelah mendaftar akun gratis?",
            "answer": "Setelah daftar via Email atau Google, materi utama & publik langsung siap diakses di portal kamu. Jika kamu ikut kelas batch tertentu, cukup masukkan Kode Akses pada kolom Redeem Kode di Beranda."
          },
          {
            "question": "Apa perbedaan paket FREE, Basic, dan PRO Unlimited (serta Trial 3/7 Hari)?",
            "answer": "FREE memberi akses ke materi gratis, kuis dasar, leaderboard, dan fitur beli satuan. Paket Basic (Rp 75.000/bulan) membuka lampiran unduhan, Wiki SOP, Diskusi Mentor, Catatan/Favorit, dan hingga 6 modul awal per materi (lanjutan via Poin atau satuan). Paket PRO Unlimited (Rp 150.000/bulan) membuka 100% seluruh modul tanpa batas, Review Tugas 1-on-1, Sertifikat HD, dan 2× XP Rumi. Baik Basic maupun PRO tersedia opsi Trial 3 & 7 Hari di dalam portal."
          },
          {
            "question": "Apa bedanya XP Rumi dengan Poin Bintang (★) di dalam sistem?",
            "answer": "XP Rumi menumbuhkan maskot belajar Rumi melalui 5 tahap evolusi (Lv.1 Baby Rumi hingga Lv.5 Superior Rumi) dari login harian, streak 7 hari, selesai bab, kuis, catatan, dan ulasan. Sedangkan Poin Bintang (★) adalah poin reward dari penyelesaian materi yang masuk Leaderboard dan bisa ditukar hadiah di Rewards Shop atau digunakan untuk membuka bab lanjutan satuan."
          },
          {
            "question": "Bagaimana cara kerja Kode Akses Folder vs Kode Voucher PRO?",
            "answer": "Kode Akses Folder digunakan di Beranda (Redeem Kode) untuk membuka folder kelas atau batch tertentu ke daftar belajar kamu. Sedangkan Kode Voucher PRO ditukarkan pada halaman Paket/Upgrade untuk mengaktifkan akses Basic atau PRO berjangka waktu sesuai durasi voucher."
          },
          {
            "question": "Apakah materi ini cocok untuk pemula dan apakah ada materi Paid Ads?",
            "answer": "Sangat cocok untuk pemula dari nol dan 100% full organik tanpa paid ads! Kurikulum dirancang berjenjang dari Fundamental (10 modul), Intermediate Content System & Workflow (7 modul), hingga Masterclass Optimization & Maintenance (5 modul)."
          },
          {
            "question": "Bagaimana cara mendapatkan Sertifikat Kelulusan HD & menukar Rewards?",
            "answer": "Sertifikat Kelulusan HD (PNG/PDF) otomatis tersedia ketika kamu menyelesaikan 100% bab wajib pada kelas yang kamu ikuti di akun dengan entitlement Sertifikat (PRO). Sementara Poin Bintang dapat langsung ditukar kapan saja di menu Rewards Shop menjadi Template, E-Book, Voucher Diskon, 1-on-1 Mentoring, maupun Merchandise."
          },
          {
            "question": "Apakah saya bisa mencatat materi dan bertanya langsung ke Mentor di setiap bab?",
            "answer": "Bisa! Di dalam Ruang Kelas Interaktif tersedia panel Catatan Pribadi per bab, tombol Favorit, tab Lampiran/Wiki SOP, serta tab Diskusi & Q&A untuk berkonsultasi langsung dengan Mentor."
          },
          {
            "question": "Bagaimana metode pembayaran dan konfirmasi aktivasi paket?",
            "answer": "Kamu bisa membayar lewat QRIS instan maupun transfer bank (BCA/Mandiri). Bukti pembayaran dapat langsung diunggah di modal checkout atau dikonfirmasi lewat WhatsApp untuk aktivasi cepat akunmu."
          }
        ]
      }
    },
    {
      "id": "block-cta",
      "type": "cta",
      "data": {
        "heading": "Siap Mulai Belajar Social Media Organik?",
        "body": "Buat akun gratis dalam 30 detik, pelajari materi utama secara langsung, kumpulkan Rumi XP & Poin Bintang, dan bangun portofolio Social Media Specialist kamu hari ini.",
        "buttonLabel": "Daftar Akun Gratis",
        "secondaryButtonLabel": "Masuk & Redeem Kode"
      }
    }
  ]$blocks$::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  header_image_url = COALESCE(NULLIF(public.landing_pages.header_image_url, ''), EXCLUDED.header_image_url),
  header_config = EXCLUDED.header_config,
  payment_config = CASE
    WHEN public.landing_pages.payment_config IS NOT NULL
      AND public.landing_pages.payment_config <> '{}'::jsonb
    THEN public.landing_pages.payment_config
    ELSE EXCLUDED.payment_config
  END,
  footer_config = EXCLUDED.footer_config,
  theme = EXCLUDED.theme,
  status = 'published',
  blocks = EXCLUDED.blocks,
  updated_at = now();
