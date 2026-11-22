// =============================================================================
// RUANG SOSMED 2.0 — LANDING PAGE BUILDER TYPES & INITIAL PRESET
// File: src/types/landing.ts
// 100% Full Organik • Portal LMS + Rumi XP + Rewards + Mentor Studio
// =============================================================================

export type BlockType = 
  | 'hero' 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'class' 
  | 'catalog' 
  | 'benefits' 
  | 'system_showcase'
  | 'payment'
  | 'features'
  | 'topics'
  | 'pricing'
  | 'testimonial'
  | 'faq'
  | 'cta';

export type LandingBlockType = BlockType;

export interface BlockStyleConfig {
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  paddingY?: 'sm' | 'md' | 'lg';
  layoutVariant?: 'centered' | 'split';
}

export interface LandingHeaderNavLink {
  id: string;
  label: string;
  href: string;
}

export interface LandingHeaderConfig {
  showAnnouncement?: boolean;
  announcementBadge?: string;
  announcementText?: string;
  announcementBgColor?: string;
  announcementBadgeColor?: string;
  showNavbar?: boolean;
  logoUrl?: string;
  brandTitle?: string;
  navLinks?: LandingHeaderNavLink[];
  loginLabel?: string;
  registerLabel?: string;
  navbarBgColor?: string;
  primaryButtonColor?: string;
}

export interface LandingPaymentConfig {
  qrCodeUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  whatsappNumber?: string;
  paymentInstructions?: string;
  merchantName?: string;
}

export interface LandingFooterConfig {
  showFooter?: boolean;
  brandTitle?: string;
  logoUrl?: string;
  description?: string;
  copyrightText?: string;
  bgColor?: string;
  textColor?: string;
}

export interface PricingTierItem {
  id?: string;
  name: string;
  price: string;
  numericPrice?: number;
  period: string;
  badge?: string;
  description: string;
  features: string[];
  buttonLabel: string;
  highlighted?: boolean;
  buttonAction?: 'payment_modal' | 'register' | 'scroll_payment' | 'custom_link';
  customLink?: string;
  qrCodeUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  title?: string;
  style?: BlockStyleConfig;
  data: Record<string, any>;
  [key: string]: any;
}

export interface HeroBlock extends BaseBlock {
  type: 'hero';
  badge?: string;
  headline: string;
  subheadline: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  eyebrow?: string;
  body?: string;
  buttonLabel?: string;
  secondaryButtonLabel?: string;
  badgeText?: string;
}

export interface BenefitItem {
  id: string;
  number: number;
  tag?: string;
  title: string;
  description: string;
}

export interface BenefitsBlock extends BaseBlock {
  type: 'benefits';
  eyebrow?: string;
  sectionTitle: string;
  subtitle?: string;
  items: BenefitItem[];
}

export type SystemShowcaseVisualType =
  | 'learner_portal'
  | 'rumi_evolution'
  | 'access_rewards'
  | 'admin_studio';

export interface SystemShowcaseHighlightItem {
  title: string;
  description: string;
}

export interface SystemShowcaseTabItem {
  id: string;
  tabLabel: string;
  badge: string;
  title: string;
  subtitle: string;
  visualType: SystemShowcaseVisualType;
  highlights: SystemShowcaseHighlightItem[];
  ctaLabel?: string;
  ctaAction?: 'register' | 'login' | 'scroll_pricing';
}

export interface SystemShowcaseBlock extends BaseBlock {
  type: 'system_showcase';
  eyebrow?: string;
  heading?: string;
  subtitle?: string;
  tabs?: SystemShowcaseTabItem[];
}

export interface PaymentBlock extends BaseBlock {
  type: 'payment';
  price: number;
  qrCodeUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  sectionTitle?: string;
  paymentInstructions?: string;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  heading?: string;
  content: string;
  align?: 'left' | 'center' | 'right';
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  imageUrl: string;
  caption?: string;
  alt?: string;
  aspectRatio?: 'video' | 'square' | 'wide' | 'auto';
}

export interface VideoBlock extends BaseBlock {
  type: 'video';
  videoUrl: string;
  title?: string;
  description?: string;
}

export interface ClassItem {
  id: string;
  title: string;
  instructor: string;
  schedule: string;
  badge?: string;
  level?: string;
  price?: string;
}

export interface ClassBlock extends BaseBlock {
  type: 'class';
  sectionTitle: string;
  classes: ClassItem[];
}

export interface CatalogItem {
  id: string;
  title: string;
  price: string;
  tag?: string;
  description?: string;
  imageUrl?: string;
  ctaText?: string;
}

export interface CatalogBlock extends BaseBlock {
  type: 'catalog';
  sectionTitle: string;
  items: CatalogItem[];
}

export type LandingBlock =
  | HeroBlock
  | BenefitsBlock
  | SystemShowcaseBlock
  | PaymentBlock
  | TextBlock
  | ImageBlock
  | VideoBlock
  | ClassBlock
  | CatalogBlock
  | BaseBlock;

export interface LandingPageData {
  id: string;
  title: string;
  slug: string;
  description: string;
  headerImageUrl?: string;
  theme?: "violet" | "navy" | "emerald" | "coral";
  status: 'DRAFT' | 'PUBLISHED' | 'draft' | 'published';
  headerConfig?: LandingHeaderConfig;
  paymentConfig?: LandingPaymentConfig;
  footerConfig?: LandingFooterConfig;
  blocks: LandingBlock[];
}

export type LandingPageConfig = LandingPageData;

export const DEFAULT_HEADER_CONFIG: LandingHeaderConfig = {
  showAnnouncement: true,
  announcementBadge: "Ruang Sosmed 2.0 Live",
  announcementText: "Platform LMS Social Media Organik • Evolusi Rumi XP • Trial 3 & 7 Hari • Redeem Kode Folder & Voucher PRO",
  announcementBgColor: "#121215",
  announcementBadgeColor: "#10B981",
  showNavbar: true,
  logoUrl: "/logo1.png",
  brandTitle: "Ruang Sosmed 2.0",
  navLinks: [
    { id: "nav-1", label: "Alur Belajar", href: "#flow-section" },
    { id: "nav-2", label: "Ekosistem", href: "#ecosystem-section" },
    { id: "nav-3", label: "Fitur", href: "#features-section" },
    { id: "nav-4", label: "Kurikulum", href: "#topics-section" },
    { id: "nav-5", label: "Paket Akses", href: "#pricing-section" },
    { id: "nav-6", label: "FAQ", href: "#faq-section" },
  ],
  loginLabel: "Masuk",
  registerLabel: "Daftar Akun",
  navbarBgColor: "#FFFFFF",
  primaryButtonColor: "#4F39F6",
};

export const DEFAULT_PAYMENT_CONFIG: LandingPaymentConfig = {
  qrCodeUrl: "",
  bankName: "BCA / Mandiri / QRIS",
  accountNumber: "123-456-7890",
  accountHolder: "PT Ruang Sosmed Indonesia",
  whatsappNumber: "6281234567890",
  merchantName: "Ruang Sosmed 2.0",
  paymentInstructions:
    "Scan kode QRIS di atas melalui m-Banking atau e-wallet (GoPay, OVO, Dana, ShopeePay) Anda. Setelah pembayaran berhasil, kirim konfirmasi untuk aktivasi akses.",
};

export const DEFAULT_FOOTER_CONFIG: LandingFooterConfig = {
  showFooter: true,
  brandTitle: "Ruang Sosmed 2.0",
  logoUrl: "/favicon.png",
  description:
    "Platform LMS & Social Media Studio 100% Full Organik — lengkap dengan Ruang Kelas Interaktif, Wiki SOP, Gamifikasi Rumi XP, Rewards Shop, Sertifikat HD, dan Mentor Studio.",
  copyrightText: `© ${new Date().getFullYear()} Ruang Sosmed 2.0. All rights reserved.`,
  bgColor: "#121215",
  textColor: "#FFFFFF",
};

export const DEFAULT_EDITOR_LANDING_PAGE: LandingPageData = {
  id: "landing-1794768889706",
  title: "Produk Baru",
  slug: "landing-1794768889706",
  description: "Tampilkan produk unggulan Anda secara profesional dan terima konfirmasi pembayaran instan.",
  headerImageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
  status: "DRAFT",
  theme: "violet",
  headerConfig: DEFAULT_HEADER_CONFIG,
  paymentConfig: DEFAULT_PAYMENT_CONFIG,
  footerConfig: DEFAULT_FOOTER_CONFIG,
  blocks: [
    {
      id: "block-hero-1",
      type: "hero",
      badge: "PRODUK PILIHAN UNTUK ANDA",
      headline: "Tampilkan produk Anda dengan lebih meyakinkan",
      subheadline: "Jelaskan manfaat utama produk Anda dengan bahasa yang jelas dan persuasif untuk menarik minat calon pembeli secara langsung.",
      imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop",
      ctaText: "Beli Sekarang",
      ctaLink: "#payment-section",
      data: {
        badgeText: "PRODUK PILIHAN UNTUK ANDA",
        headline: "Tampilkan produk Anda dengan lebih meyakinkan",
        body: "Jelaskan manfaat utama produk Anda dengan bahasa yang jelas dan persuasif untuk menarik minat calon pembeli secara langsung.",
        buttonLabel: "Beli Sekarang",
        imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop",
      },
    },
    {
      id: "block-benefits-1",
      type: "benefits",
      sectionTitle: "Kenapa memilih produk ini?",
      items: [
        {
          id: "benefit-1",
          number: 1,
          title: "Kualitas Premium Terjamin",
          description: "Dibuat dengan bahan dan material pilihan berstandar tinggi yang awet digunakan dalam jangka panjang.",
        },
        {
          id: "benefit-2",
          number: 2,
          title: "Pengiriman Super Cepat",
          description: "Pesanan diproses dalam 24 jam dan dikirim menggunakan kurir terpercaya langsung ke depan pintu Anda.",
        },
        {
          id: "benefit-3",
          number: 3,
          title: "Garansi 100% Kepuasan",
          description: "Jaminan uang kembali atau penggantian produk baru jika barang yang Anda terima tidak sesuai deskripsi.",
        },
      ],
      data: {
        heading: "Kenapa memilih produk ini?",
        items: [
          {
            title: "Kualitas Premium Terjamin",
            description: "Dibuat dengan bahan dan material pilihan berstandar tinggi yang awet digunakan dalam jangka panjang.",
            icon: "Sparkles",
          },
          {
            title: "Pengiriman Super Cepat",
            description: "Pesanan diproses dalam 24 jam dan dikirim menggunakan kurir terpercaya langsung ke depan pintu Anda.",
            icon: "Users",
          },
          {
            title: "Garansi 100% Kepuasan",
            description: "Jaminan uang kembali atau penggantian produk baru jika barang yang Anda terima tidak sesuai deskripsi.",
            icon: "Award",
          },
        ],
      },
    },
    {
      id: "block-payment-1",
      type: "payment",
      sectionTitle: "Informasi pembayaran",
      price: 0,
      qrCodeUrl: "",
      bankName: "BCA / Mandiri / QRIS",
      accountNumber: "123-456-7890",
      accountHolder: "PT Ruang Sosmed Indonesia",
      paymentInstructions: "Scan kode QRIS di atas melalui m-Banking atau e-wallet (GoPay, OVO, Dana) Anda. Setelah pembayaran berhasil, simpan bukti transfer untuk konfirmasi otomatis.",
      data: {
        heading: "Informasi pembayaran",
        price: 0,
        bankName: "BCA / Mandiri / QRIS",
        accountNumber: "123-456-7890",
      },
    },
  ],
};

export const DEFAULT_SYSTEM_SHOWCASE_TABS: SystemShowcaseTabItem[] = [
  {
    id: "tab-learner-portal",
    tabLabel: "Portal Belajar Siswa",
    badge: "Active Classroom",
    title: "Beranda Personal, Ruang Kelas Multi-Format & Diskusi Mentor",
    subtitle:
      "Siswa belajar dalam ruang kelas terfokus yang langsung mencatat progres tiap bab, menyimpan catatan pribadi, serta terhubung dengan mentor dan rekan se-batch.",
    visualType: "learner_portal",
    highlights: [
      {
        title: "Header Jam & Cuaca Realtime",
        description:
          "Menyapa otomatis sesuai jam lokal pengguna (WIB/WITA/WIT) lengkap dengan jam 12/24 jam, kondisi suhu, dan lokasi realtime.",
      },
      {
        title: "5+ Format Materi & Wiki SOP",
        description:
          "Course Video, Page artikel, Interactive Quiz (5 tipe soal), Assignment praktik, Learning Path, dan Wiki SOP standar agency.",
      },
      {
        title: "Catatan Pribadi, Favorit & Q&A Bab",
        description:
          "Catat insight di tiap bab, tandai materi favorit, unduh file template, kirim ulasan kelas, dan berdiskusi langsung dengan Mentor.",
      },
    ],
    ctaLabel: "Coba Masuk Portal Gratis",
    ctaAction: "register",
  },
  {
    id: "tab-rumi-xp",
    tabLabel: "Evolusi Rumi & Stream Deck",
    badge: "Gamifikasi 5 Tahap",
    title: "Maskot Rumi Tumbuh Seiring Konsistensi Belajarmu",
    subtitle:
      "Setiap aktivitas belajar memberi Rumi XP nyata untuk berevolusi dari Lv.1 Baby Rumi hingga Lv.5 Superior Rumi, ditemani Asisten Stream Deck.",
    visualType: "rumi_evolution",
    highlights: [
      {
        title: "5 Tahap Evolusi Rumi (Lv.1–Lv.5)",
        description:
          "Baby Rumi 🌱 (0 XP) → Junior Rumi ✨ (50 XP) → Teen Rumi 🚀 (250 XP) → Pro Rumi 👑 (600 XP) → Superior Rumi 🏆 (1000 XP).",
      },
      {
        title: "XP dari Aktivitas Nyata + Multiplier",
        description:
          "Login harian (+1 XP), streak 7 hari (+5 XP), selesai bab (+2 XP), submit kuis (+4 XP), catat & ulasan (+2 XP), hingga 2× XP di paket PRO.",
      },
      {
        title: "Rumi Floating Stream Deck",
        description:
          "Tekan tombol cepat atau shortcut keyboard 1–6 untuk lompat menu, lihat ringkasan halaman, serta tanya jawab FAQ kontekstual instan.",
      },
    ],
    ctaLabel: "Lihat Paket dengan Bonus XP",
    ctaAction: "scroll_pricing",
  },
  {
    id: "tab-access-rewards",
    tabLabel: "Akses, Poin & Hadiah",
    badge: "Ekonomi & Sertifikat",
    title: "3 Tier Fleksibel, Trial 3/7 Hari, Redeem Kode, Poin & Sertifikat HD",
    subtitle:
      "Siswa tidak dipaksa bayar penuh di awal. Pilih FREE, Basic, PRO Unlimited, uji coba Trial, tukar Kode Folder/Voucher, atau buka bab lanjutan via Poin Bintang.",
    visualType: "access_rewards",
    highlights: [
      {
        title: "Auto-Assign & Redeem Kode Folder",
        description:
          "Project dengan Bagikan ke Semua Siswa otomatis masuk saat mendaftar. Kelas batch tertutup bisa dibuka lewat Redeem Kode Folder (contoh SICS-2026).",
      },
      {
        title: "Unlock Satuan, Trial & Voucher PRO",
        description:
          "Buka bab lanjutan pakai Poin Bintang (★), bayar per materi, klaim Kode Voucher PRO berjangka, atau coba paket Basic/PRO dengan Trial 3 & 7 Hari.",
      },
      {
        title: "Rewards Shop & Sertifikat HD",
        description:
          "Poin Bintang masuk Leaderboard dan bisa ditukar Template, E-Book, Voucher Diskon, 1-on-1 Mentoring, atau Merch—plus Sertifikat Kelulusan HD otomatis.",
      },
    ],
    ctaLabel: "Bandingkan Paket Belajar",
    ctaAction: "scroll_pricing",
  },
  {
    id: "tab-admin-studio",
    tabLabel: "Admin & Mentor Studio",
    badge: "Ekosistem Mentor",
    title: "Kelola Project, Folder, Kuis 5 Tipe, Grading & Visual Builder",
    subtitle:
      "Dibalik pengalaman siswa yang rapi, Mentor dan Admin Studio memiliki kendali penuh untuk membangun kurikulum, memeriksa tugas, hingga mengatur landing page.",
    visualType: "admin_studio",
    highlights: [
      {
        title: "Project, Folder & Auto-Assign ON",
        description:
          "Kelompokkan kelas dalam Project/Cohort berlabel warna dan Folder berkode akses. Mode Bagikan ke Semua Siswa otomatis mendaftarkan akun baru.",
      },
      {
        title: "Inbox Grading & Notifikasi Telegram",
        description:
          "Nilai kuis/tugas (Essay, Multiple Choice, Hotspot, Categorization, Fill Blank) dan verifikasi pembayaran QRIS/Transfer dengan notifikasi Telegram Bot.",
      },
      {
        title: "Visual Landing Builder & Direktori Siswa",
        description:
          "Edit seluruh blok landing page secara visual, kelola katalog hadiah & sertifikat, pantau analitik progres, serta kontrol akses siswa secara realtime.",
      },
    ],
    ctaLabel: "Daftar & Rasakan Ekosistemnya",
    ctaAction: "register",
  },
];

export const INITIAL_LANDING_BLOCKS: LandingBlock[] = [
  {
    id: "block-hero",
    type: "hero",
    data: {
      badgeText: "🌱 100% Full Organik • Portal LMS + Gamifikasi Rumi + Mentor Studio",
      eyebrow: "Ruang Sosmed 2.0 • Ekosistem Belajar Social Media Specialist Terpadu",
      headline:
        "Satu Platform Lengkap untuk Belajar, Praktik & Berkembang Jadi Social Media Specialist",
      body: "Mulai dari nol hingga siap handle brand secara organik. Daftar sekali, materi publik langsung masuk otomatis atau buka kelas batch pakai Kode Akses—lengkap dengan Ruang Kelas interaktif, Wiki SOP, Catatan & Diskusi Mentor, Evolusi Maskot Rumi XP, Rewards Shop, hingga Sertifikat HD.",
      buttonLabel: "Daftar Gratis Sekarang",
      secondaryButtonLabel: "Pelajari Alur Sistem",
      secondaryTargetId: "flow-section",
      showSystemPreview: true,
      imageUrl: "",
      imageAlt: "Pratinjau Portal Ruang Sosmed 2.0",
      stats: [
        { label: "Kurikulum Organik", value: "3 Seri • 22 Modul" },
        { label: "Gamifikasi Aktif", value: "5 Tahap Evolusi Rumi" },
        { label: "Akses Fleksibel", value: "FREE • Basic • PRO + Trial" },
        { label: "Output Nyata", value: "Rewards & Sertifikat HD" },
      ],
    },
  },
  {
    id: "block-flow",
    type: "benefits",
    sectionTitle: "Alur Belajar End-to-End di Ruang Sosmed 2.0",
    eyebrow: "ALUR & FLOW SISTEM",
    subtitle:
      "Dari pertama kali mendaftar sampai meraih sertifikat kelulusan HD—semua terhubung otomatis dalam satu portal.",
    items: [
      {
        id: "flow-1",
        number: 1,
        tag: "Onboarding Instan",
        title: "Daftar Akun & Akses Otomatis",
        description:
          "Daftar gratis via Email atau Google. Materi dari project yang dibagikan ke semua siswa langsung otomatis muncul di akunmu, atau masukkan Kode Akses Folder/Materi untuk membuka kelas batch seketika.",
      },
      {
        id: "flow-2",
        number: 2,
        tag: "Beranda Personal",
        title: "Pantau Progres, Jam & Cuaca Realtime",
        description:
          "Disambut header personal sesuai zona waktu lokal lengkap dengan widget jam (12/24 jam), cuaca & lokasi realtime, tombol Lanjut Belajar ke bab terakhir, serta Leaderboard Poin Bintang.",
      },
      {
        id: "flow-3",
        number: 3,
        tag: "Active Classroom",
        title: "Belajar Multi-Format & Diskusi Mentor",
        description:
          "Pelajari Course Video, Page, Wiki SOP, Interactive Quiz (5 tipe soal), dan Tugas Praktik. Simpan Catatan pribadi per bab, Favorit materi penting, unduh lampiran template, dan tanya jawab langsung dengan Mentor.",
      },
      {
        id: "flow-4",
        number: 4,
        tag: "Gamifikasi Rumi",
        title: "Naikkan Evolusi Rumi & Pakai Stream Deck",
        description:
          "Setiap login harian, streak 7 hari, selesai bab, kuis, catatan, hingga ulasan menambah XP Rumi (Lv.1 Baby → Lv.5 Superior) ditemani Rumi Floating Assistant Stream Deck (pintasan 1–6 & FAQ kontekstual).",
      },
      {
        id: "flow-5",
        number: 5,
        tag: "Poin & Rewards",
        title: "Kumpulkan Poin Bintang & Tukar Hadiah",
        description:
          "Selesaikan bab & evaluasi untuk meraih Poin Bintang (★). Tukarkan di Rewards Shop (Template, E-Book, Voucher Diskon, 1-on-1 Mentoring, Merch) atau gunakan untuk membuka modul lanjutan satuan.",
      },
      {
        id: "flow-6",
        number: 6,
        tag: "Karir & Portofolio",
        title: "Review Tugas Mentor & Sertifikat HD",
        description:
          "Tuntaskan 100% bab wajib & tugas praktik untuk mendapatkan feedback 1-on-1 dari Mentor dan menerbitkan Sertifikat Kelulusan HD siap lampir di CV maupun LinkedIn.",
      },
    ],
    data: {},
  },
  {
    id: "block-system-showcase",
    type: "system_showcase",
    data: {
      eyebrow: "EKSPLORASI EKOSISTEM 2.0",
      heading: "Lihat Cara Kerja Setiap Sistem di Dalam Ruang Sosmed 2.0",
      subtitle:
        "Klik tiap tab untuk mengeksplorasi alur Portal Siswa, Evolusi Maskot Rumi 5 Tahap, Sistem Paket/Kode/Rewards, hingga Admin & Mentor Studio.",
      tabs: DEFAULT_SYSTEM_SHOWCASE_TABS,
    },
  },
  {
    id: "block-features",
    type: "features",
    data: {
      heading: "Semua Fitur yang Bikin Belajar Konsisten & Terukur",
      subtitle:
        "Bukan sekadar kumpulan video pasif—Ruang Sosmed 2.0 menyatukan kurikulum organik, manajemen folder, gamifikasi XP, dan mentoring aktif.",
      items: [
        {
          title: "Auto-Assign & Redeem Kode Folder",
          description:
            "Materi dari project publik otomatis ter-assign ke akun baru, sedangkan kelas batch khusus cukup dibuka dengan Kode Akses Folder dari mentor.",
          icon: "KeyRound",
        },
        {
          title: "Ruang Kelas Multi-Format & Wiki SOP",
          description:
            "Kombinasi video pembelajaran, halaman artikel, Wiki SOP kerja agensi, kuis interaktif 5 tipe soal, dan tugas praktik nyata.",
          icon: "BookOpen",
        },
        {
          title: "Catatan Bab, Favorit & Diskusi Mentor",
          description:
            "Setiap siswa bisa menyimpan catatan pribadi per bab, menandai materi favorit, mengunduh template, dan tanya jawab langsung dengan Mentor.",
          icon: "MessageSquare",
        },
        {
          title: "Evolusi Maskot Rumi (Lv.1–5) & Stream Deck",
          description:
            "Kumpulkan Rumi XP dari login & belajar untuk menumbuhkan Baby Rumi hingga Superior Rumi, lengkap dengan asisten pintasan Stream Deck 1–6.",
          icon: "Bot",
        },
        {
          title: "Poin Bintang, Leaderboard & Rewards Shop",
          description:
            "Raih Poin Bintang (★) tiap selesai bab dan tukar di Rewards Shop atau gunakan untuk membuka bab lanjutan tanpa harus langsung upgrade.",
          icon: "Gift",
        },
        {
          title: "Sertifikat Kelulusan HD Terverifikasi",
          description:
            "Setelah menuntaskan seluruh bab wajib dan evaluasi kelas, klaim Sertifikat Kelulusan HD (PNG/PDF) resmi sebagai bukti kompetensi portofolio.",
          icon: "Award",
        },
        {
          title: "3 Tier + Trial 3/7 Hari + Voucher PRO",
          description:
            "Mulai gratis di FREE, coba Basic atau PRO lewat Trial 3 & 7 Hari, aktivasi Kode Voucher PRO berjangka, atau checkout cepat via QRIS & Transfer.",
          icon: "Zap",
        },
        {
          title: "Beranda Realtime & Kontrol Akses Aman",
          description:
            "Header menyapa sesuai zona waktu lokal dengan jam & cuaca realtime, sinkronisasi cloud Supabase, dan pembaruan status keanggotaan otomatis.",
          icon: "Clock",
        },
      ],
    },
  },
  {
    id: "block-topics",
    type: "topics",
    data: {
      heading: "Learning Center",
      subtitle:
        "Pilih kelas yang ingin kamu pelajari — Kurikulum berjenjang dari Fundamental, Intermediate, hingga Masterclass (100% Full Organik).",
      topics: [
        {
          id: "fundamental-series",
          tag: "FUNDAMENTAL",
          tagColor: "#2563EB",
          eyebrow: "FUNDAMENTAL SERIES",
          bannerTitle: "INTRODUCE TO SOCIAL MEDIA SPECIALIST",
          bannerSubtitle: "Kelas untuk kamu yang ingin memulai",
          bannerTheme: "blue",
          category: "SERIES FUNDAMENTAL",
          title: "Fundamental Social Media Specialist",
          description:
            "Pelajari strategi konten, ritme posting, dan cara membaca performa sosial media dari nol.",
          lessonsCount: 10,
          modules: [
            {
              number: 1,
              title: "Modul 1 - Social Media Specialist Fundamental & Mindset",
            },
            {
              number: 2,
              title: "Modul 2 - Social Media Channel Behavioral Part 1",
            },
            {
              number: 3,
              title: "Modul 3 - Social Media Channel Behavioral Part 2",
            },
            {
              number: 4,
              title: "Modul 4 - Audience Insight Development",
            },
            {
              number: 5,
              title: "Modul 5 - Social Media Analytics",
            },
            {
              number: 6,
              title: "Modul 6 - Social Media Hacks for Social Media Specialist",
            },
            {
              number: 7,
              title: "Modul 7 - 30 Days Social Media Specialist in Handling",
            },
            {
              number: 8,
              title: "Modul 8 - Persiapan Dokumen Social Media Specialist",
            },
            {
              number: 9,
              title: "Modul 9 - Social Media Specialist Rate Development",
            },
            {
              number: 10,
              title:
                "Modul 10 - Portofolio Development for Social Media Specialist",
            },
          ],
        },
        {
          id: "intermediate-series",
          tag: "INTERMEDIATE",
          tagColor: "#EA580C",
          eyebrow: "INTERMEDIATE SERIES",
          bannerTitle: "CONTENT SYSTEM & WORKFLOW SOCIAL MEDIA SPECIALIST",
          bannerSubtitle: "Bangun workflow dari ide hingga approval",
          bannerTheme: "coral",
          category: "SERIES INTERMEDIATE",
          title: "Content System & Workflow",
          description:
            "Bangun workflow pembuatan konten yang efisien mulai dari ide, asset, revisi, hingga approval.",
          lessonsCount: 7,
          modules: [
            {
              number: 1,
              title:
                "Modul 1 - Pemetaan Content Pillars & Editorial Calendar",
            },
            {
              number: 2,
              title: "Modul 2 - Ideation Framework & Hook Formula Organik",
            },
            {
              number: 3,
              title: "Modul 3 - Asset Sourcing & Brief Desain/Video Kreatif",
            },
            {
              number: 4,
              title: "Modul 4 - SOP Revisi & Internal Quality Control",
            },
            {
              number: 5,
              title:
                "Modul 5 - Client Approval Workflow & Feedback Handling",
            },
            {
              number: 6,
              title: "Modul 6 - Automation & Scheduling Tools Setup",
            },
            {
              number: 7,
              title: "Modul 7 - Weekly Content Reporting System",
            },
          ],
        },
        {
          id: "advance-series",
          tag: "MASTERCLASS",
          tagColor: "#7C3AED",
          eyebrow: "ADVANCE SERIES",
          bannerTitle: "SOCIAL MEDIA OPTIMIZATION & MAINTENANCE",
          bannerSubtitle: "Optimasi lanjutan lintas platform",
          bannerTheme: "purple",
          category: "SERIES MASTERCLASS",
          title: "Social Media Optimization & Maintenance",
          description:
            "Pelajari kelas lanjutan tentang optimasi social media hingga konten yang bisa diaplikasikan ke berbagai media, platform, bahkan kategori akun.",
          lessonsCount: 5,
          modules: [
            {
              number: 1,
              title:
                "Modul 1 - Multi-Platform Content Adaptation & Distribution",
            },
            {
              number: 2,
              title:
                "Modul 2 - Advanced Organic Algorithm & Virality Principles",
            },
            {
              number: 3,
              title:
                "Modul 3 - Crisis Management & Brand Reputation Handling",
            },
            {
              number: 4,
              title:
                "Modul 4 - Account Maintenance & Evergreen Content Recycling",
            },
            {
              number: 5,
              title:
                "Modul 5 - Scaling Organic Reach Across Niche Categories",
            },
          ],
        },
      ],
    },
  },
  {
    id: "block-pricing",
    type: "pricing",
    data: {
      heading: "Pilihan Paket & Akses Fleksibel",
      subtitle:
        "Sesuaikan dengan tahap belajarmu: mulai gratis di paket FREE, buka akses inti dengan Basic, atau maksimalkan seluruh fitur tanpa batas lewat PRO Unlimited (tersedia Trial 3 & 7 Hari).",
      tiers: [
        {
          id: "tier-free",
          name: "FREE",
          price: "Rp 0",
          numericPrice: 0,
          period: "Selamanya",
          badge: "Mulai Tanpa Risiko",
          description:
            "Akses seluruh materi gratis & project publik, kumpulkan Rumi XP + Poin Bintang, dan coba sistem kelas interaktif.",
          features: [
            "Auto-assign materi dari Project publik yang dibagikan",
            "Redeem Kode Akses Folder / Kelas Batch dari Mentor",
            "Akses materi berstatus Gratis + Kuis Interaktif dasar",
            "Maskot Baby Rumi XP + Poin Bintang (★) & Leaderboard",
            "Beli & buka materi/modul PRO secara satuan kapan saja",
          ],
          buttonLabel: "Mulai Gratis",
          highlighted: false,
          buttonAction: "register",
        },
        {
          id: "tier-basic",
          name: "Basic",
          price: "Rp 75.000",
          numericPrice: 75000,
          period: "bulan",
          badge: "Tersedia Trial 3 & 7 Hari",
          description:
            "Buka fitur penting plus hingga 6 modul awal di tiap materi premium. Modul lanjutan bisa dibuka pakai Poin atau beli satuan.",
          features: [
            "Semua fitur FREE + Bonus Aktivasi & Multiplier XP Rumi",
            "Akses hingga 6 modul awal pada setiap kelas premium",
            "Buka modul lanjutan fleksibel via Poin Bintang atau satuan",
            "Akses Unduh File Lampiran, Template & Dokumen Wiki SOP",
            "Catatan Pribadi per Bab, Simpan Favorit & Diskusi Mentor",
            "Mendukung aktivasi Trial 3 Hari & Trial 7 Hari di dalam portal",
          ],
          buttonLabel: "Pilih Paket Basic",
          highlighted: false,
          buttonAction: "payment_modal",
        },
        {
          id: "tier-pro",
          name: "PRO Unlimited",
          price: "Rp 150.000",
          numericPrice: 150000,
          period: "bulan",
          badge: "Paling Lengkap • 100% Tanpa Batas",
          description:
            "Semua fitur FREE dan Basic ditambah akses penuh 100% ke seluruh modul, Sertifikat Kelulusan HD, dan Review Tugas 1-on-1.",
          features: [
            "Semua 7 Fitur Premium Tanpa Batas + 2× Multiplier XP Rumi",
            "Seluruh modul & video lanjutan terbuka 100% tanpa potong poin",
            "Akses penuh Fundamental, Intermediate & Masterclass Series",
            "Review Tugas Praktik & Audit Portofolio 1-on-1 bersama Mentor",
            "Penerbitan Sertifikat Kelulusan HD resmi saat kelas tuntas",
            "Dukung Trial 3/7 Hari, Kode Voucher PRO & checkout QRIS/Transfer",
          ],
          buttonLabel: "Aktifkan Paket PRO",
          highlighted: true,
          buttonAction: "payment_modal",
        },
      ],
      footnote:
        "Punya Kode Akses Folder kelas atau Kode Voucher PRO? Daftar akun gratis terlebih dahulu, lalu tukarkan langsung di Beranda atau menu Paket Akses. Pembayaran QRIS & Transfer Bank diproses cepat dengan notifikasi otomatis Telegram Bot.",
    },
  },
  {
    id: "block-testimonial",
    type: "testimonial",
    data: {
      heading: "Cerita dari Pembelajar Ruang Sosmed 2.0",
      subtitle:
        "Pengalaman nyata mereka menggunakan Ruang Kelas, Wiki SOP, Catatan Bab, dan Gamifikasi Rumi hingga siap mengelola akun brand.",
      reviews: [
        {
          name: "Sarah Wijaya",
          role: "Junior Social Media Specialist",
          company: "D2C Fashion Brand",
          comment:
            "Begitu daftar dan masukkan kode folder dari mentor, semua materi langsung rapi di Beranda. Fitur catatan per bab dan SOP 30 days in handling-nya bikin saya pede handle 2 akun brand secara full organik.",
          rating: 5,
        },
        {
          name: "Rian Ramadhan",
          role: "Freelance Content Strategist",
          company: "Independent Creator",
          comment:
            "Sistem Content Workflow plus Wiki SOP & template rate card di Ruang Sosmed 2.0 benar-benar terpakai saat pitching klien. Tanya jawab di diskusi bab juga cepat dibalas mentor!",
          rating: 5,
        },
        {
          name: "Nadia Kusuma",
          role: "Social Media Intern",
          company: "Creative Digital Agency",
          comment:
            "Belajar jadi nggak gampang bolong karena ngejar evolusi Rumi XP tiap hari sama ngumpulin Poin Bintang buat tukar template di Rewards Shop. Sertifikat HD-nya juga langsung kepakai buat CV.",
          rating: 5,
        },
      ],
    },
  },
  {
    id: "block-faq",
    type: "faq",
    data: {
      heading: "Pertanyaan yang Sering Diajukan",
      subtitle:
        "Semua hal yang perlu kamu ketahui tentang alur belajar, sistem akses, gamifikasi Rumi, dan kurikulum Ruang Sosmed 2.0.",
      faqs: [
        {
          question:
            "Bagaimana alur mulai belajar setelah mendaftar akun gratis?",
          answer:
            "Setelah daftar via Email atau Google, materi dari project yang dibagikan ke semua siswa akan langsung muncul otomatis di portal kamu. Jika kamu ikut kelas batch tertentu, cukup masukkan Kode Akses Folder/Materi pada kolom Redeem Kode di Beranda.",
        },
        {
          question:
            "Apa perbedaan paket FREE, Basic, dan PRO Unlimited (serta Trial 3/7 Hari)?",
          answer:
            "FREE memberi akses ke materi gratis, kuis dasar, leaderboard, dan fitur beli satuan. Paket Basic (Rp 75.000/bulan) membuka lampiran unduhan, Wiki SOP, Diskusi Mentor, Catatan/Favorit, dan hingga 6 modul awal per materi (lanjutan via Poin atau satuan). Paket PRO Unlimited (Rp 150.000/bulan) membuka 100% seluruh modul tanpa batas, Review Tugas 1-on-1, Sertifikat HD, dan 2× XP Rumi. Baik Basic maupun PRO tersedia opsi Trial 3 & 7 Hari di dalam portal.",
        },
        {
          question:
            "Apa bedanya XP Rumi dengan Poin Bintang (★) di dalam sistem?",
          answer:
            "XP Rumi menumbuhkan maskot belajar Rumi melalui 5 tahap evolusi (Lv.1 Baby Rumi hingga Lv.5 Superior Rumi) dari login harian, streak 7 hari, selesai bab, kuis, catatan, dan ulasan. Sedangkan Poin Bintang (★) adalah poin reward dari penyelesaian materi yang masuk Leaderboard dan bisa ditukar hadiah di Rewards Shop atau digunakan untuk membuka bab lanjutan satuan.",
        },
        {
          question:
            "Bagaimana cara kerja Kode Akses Folder vs Kode Voucher PRO?",
          answer:
            "Kode Akses Folder digunakan di Beranda (Redeem Kode) untuk membuka folder kelas atau batch tertentu ke daftar belajar kamu. Sedangkan Kode Voucher PRO ditukarkan pada halaman Paket/Upgrade untuk mengaktifkan akses Basic atau PRO berjangka waktu sesuai durasi voucher.",
        },
        {
          question:
            "Apakah materi ini cocok untuk pemula dan apakah ada materi Paid Ads?",
          answer:
            "Sangat cocok untuk pemula dari nol dan 100% full organik tanpa paid ads! Kurikulum dirancang berjenjang dari Fundamental (10 modul), Intermediate Content System & Workflow (7 modul), hingga Masterclass Optimization & Maintenance (5 modul).",
        },
        {
          question:
            "Bagaimana cara mendapatkan Sertifikat Kelulusan HD & menukar Rewards?",
          answer:
            "Sertifikat Kelulusan HD (PNG/PDF) otomatis tersedia ketika kamu menyelesaikan 100% bab wajib pada kelas yang kamu ikuti di akun dengan entitlement Sertifikat (PRO). Sementara Poin Bintang dapat langsung ditukar kapan saja di menu Rewards Shop menjadi Template, E-Book, Voucher Diskon, 1-on-1 Mentoring, maupun Merchandise.",
        },
        {
          question:
            "Apakah saya bisa mencatat materi dan bertanya langsung ke Mentor di setiap bab?",
          answer:
            "Bisa! Di dalam Ruang Kelas Interaktif tersedia panel Catatan Pribadi per bab, tombol Favorit, tab Lampiran/Wiki SOP, serta tab Diskusi & Q&A yang langsung masuk ke Inbox Mentor.",
        },
        {
          question:
            "Bagaimana metode pembayaran dan konfirmasi aktivasi paket?",
          answer:
            "Kamu bisa membayar lewat QRIS instan maupun transfer bank (BCA/Mandiri). Bukti pembayaran dapat langsung diunggah di modal checkout atau dikonfirmasi lewat WhatsApp, dan tim Admin mendapat notifikasi instan melalui Telegram Bot untuk mengaktifkan paketmu.",
        },
      ],
    },
  },
  {
    id: "block-cta",
    type: "cta",
    data: {
      heading: "Siap Masuk ke Ekosistem Ruang Sosmed 2.0?",
      body: "Buat akun gratis dalam 30 detik, nikmati materi publik yang langsung ter-assign otomatis, kumpulkan Rumi XP & Poin Bintang, dan bangun karir Social Media Specialist organik kamu hari ini.",
      buttonLabel: "Daftar Akun Gratis",
      secondaryButtonLabel: "Masuk & Redeem Kode",
    },
  },
];
