// =============================================================================
// RUANG SOSMED 2.0 — LANDING PAGE BUILDER TYPES & INITIAL PRESET
// File: src/types/landing.ts
// 100% Full Organik • Kelas Fundamental & Roadmap Social Media Specialist
// =============================================================================

// =============================================================================
// RUANG SOSMED 2.0 — LANDING PAGE BUILDER TYPES & INITIAL PRESET
// File: src/types/landing.ts
// 100% Full Organik • Kelas Fundamental & Roadmap Social Media Specialist
// =============================================================================

export type BlockType = 
  | 'hero' 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'class' 
  | 'catalog' 
  | 'benefits' 
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
  title: string;
  description: string;
}

export interface BenefitsBlock extends BaseBlock {
  type: 'benefits';
  sectionTitle: string;
  items: BenefitItem[];
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
  announcementBadge: "Pendaftaran Batch 2026 Dibuka",
  announcementText: "Akses kurikulum organic growth & roadmap Social Media Specialist dari nol (100% Full Organik).",
  announcementBgColor: "#121215",
  announcementBadgeColor: "#10B981",
  showNavbar: true,
  logoUrl: "/logo1.png",
  brandTitle: "Ruang Sosmed 2.0",
  navLinks: [
    { id: "nav-1", label: "Keunggulan", href: "#features-section" },
    { id: "nav-2", label: "Kurikulum", href: "#topics-section" },
    { id: "nav-3", label: "Biaya & Membership", href: "#pricing-section" },
    { id: "nav-4", label: "FAQ", href: "#faq-section" },
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
    "Platform LMS & Social Media Studio terintegrasi untuk akselerasi kemampuan praktis digital marketing.",
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

export const INITIAL_LANDING_BLOCKS: LandingBlock[] = [
  {
    id: "block-hero",
    type: "hero",
    data: {
      eyebrow: "Ruang Sosmed 2.0 • Kelas Fundamental & Roadmap Karir",
      headline: "Belajar Strategi Konten & Roadmap Social Media Specialist dari Nol",
      body: "Kelas fundamental yang dikhususkan untuk kamu yang baru mulai belajar strategi sosial media, ritme konten organik, atau ingin tahu roadmap terstruktur menjadi seorang Social Media Specialist profesional. 100% full organik tanpa paid ads.",
      buttonLabel: "Mulai Belajar Sekarang",
      secondaryButtonLabel: "Lihat 3 Seri Kurikulum",
      badgeText: "🌱 100% Full Organik • Dari Mindset hingga Portofolio Siap Kerja",
      imageUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1200&auto=format&fit=crop",
      imageAlt: "Ruang Sosmed 2.0 Learning Center",
    },
  },
  {
    id: "block-features",
    type: "features",
    data: {
      heading: "Roadmap Terarah Menjadi Social Media Specialist",
      subtitle: "Bukan sekadar teori hafalan, kami membimbing kamu memahami ekosistem konten organik, alur kerja agensi, hingga penentuan rate card.",
      items: [
        {
          title: "Mindset & Strategi Organik",
          description: "Pahami esensi organic growth, cara kerja algoritma platform, serta habit dan pola pikir seorang social media specialist handal.",
          icon: "Sparkles",
        },
        {
          title: "Content System & Workflow",
          description: "Kuasai alur kerja pembuatan konten yang rapi mulai dari riset ide, penyusunan copywriting, aset visual, hingga revisi & approval.",
          icon: "Users",
        },
        {
          title: "Weekly Huddle & Recording",
          description: "Akses arsip rekaman sesi diskusi mingguan, bedah akun riil, evaluasi konten, dan tanya jawab langsung bersama mentor.",
          icon: "Award",
        },
        {
          title: "Dokumen Kerja, Rate & Portofolio",
          description: "Panduan lengkap menyusun dokumen kerja, SOP 30 hari handling akun, penentuan rate card jasa, hingga portofolio yang dilirik klien.",
          icon: "Library",
        },
      ],
    },
  },
  {
    id: "block-topics",
    type: "topics",
    data: {
      heading: "Learning Center",
      subtitle: "Pilih kelas yang ingin kamu pelajari — Kurikulum berjenjang dari Fundamental, Intermediate, hingga Masterclass.",
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
          description: "Pelajari strategi konten, ritme posting, dan cara membaca performa sosial media dari nol.",
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
              title: "Modul 10 - Portofolio Development for Social Media Specialist",
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
          description: "Bangun workflow pembuatan konten yang efisien mulai dari ide, asset, revisi, hingga approval.",
          lessonsCount: 7,
          modules: [
            {
              number: 1,
              title: "Modul 1 - Pemetaan Content Pillars & Editorial Calendar",
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
              title: "Modul 5 - Client Approval Workflow & Feedback Handling",
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
          bannerTitle: "SOCIAL MEDIA OPTIMIZATION & MAINTANANCE",
          bannerSubtitle: "Optimasi lanjutan lintas platform",
          bannerTheme: "purple",
          category: "SERIES MASTERCLASS",
          title: "Social Media Optimization & Maintanance",
          description: "Pelajari kelas lanjutan tentang optimasi social media hingga konten yang bisa di aplikasikan ke berbagai media, platform bahkan kategori akun.",
          lessonsCount: 5,
          modules: [
            {
              number: 1,
              title: "Modul 1 - Multi-Platform Content Adaptation & Distribution",
            },
            {
              number: 2,
              title: "Modul 2 - Advanced Organic Algorithm & Virality Principles",
            },
            {
              number: 3,
              title: "Modul 3 - Crisis Management & Brand Reputation Handling",
            },
            {
              number: 4,
              title: "Modul 4 - Account Maintenance & Evergreen Content Recycling",
            },
            {
              number: 5,
              title: "Modul 5 - Scaling Organic Reach Across Niche Categories",
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
      heading: "Pilihan Akses Belajar",
      subtitle: "Pilih paket yang sesuai untuk memulai perjalanan karirmu sebagai Social Media Specialist.",
      tiers: [
        {
          id: "tier-free",
          name: "Free Learner",
          price: "Rp 0",
          numericPrice: 0,
          period: "Selamanya",
          description: "Cocok untuk pemula yang ingin memahami gambaran dasar strategi sosial media.",
          features: [
            "Akses Modul Pengantar Fundamental",
            "Mengerjakan Kuis Dasar Interaktif",
            "Bergabung ke Komunitas Diskusi Publik",
            "Akses Artikel & Wiki Ruang Sosmed",
          ],
          buttonLabel: "Daftar Gratis",
          highlighted: false,
          buttonAction: "register",
        },
        {
          id: "tier-pro",
          name: "Learner PRO",
          price: "Rp 149.000",
          numericPrice: 149000,
          period: "per bulan",
          badge: "Paling Direkomendasikan",
          description: "Akses penuh ke 3 level kurikulum, template dokumen kerja SOP, dan review portofolio.",
          features: [
            "Semua Akses Free Tier",
            "Akses Penuh 10 Modul Fundamental Series",
            "Akses Intermediate Series Content System & Workflow",
            "Akses Masterclass Optimization & Maintanance",
            "Unduh Template Dokumen Kerja & Rate Card SOP",
            "Audit Portofolio & Feedback Personal dari Mentor",
            "Sertifikat Kelulusan Terverifikasi",
          ],
          buttonLabel: "Beli Paket PRO",
          highlighted: true,
          buttonAction: "payment_modal",
        },
      ],
    },
  },
  {
    id: "block-testimonial",
    type: "testimonial",
    data: {
      heading: "Cerita dari Pembelajar Ruang Sosmed",
      subtitle: "Pengalaman nyata dari mereka yang memulai dari nol hingga berhasil mengelola akun brand.",
      reviews: [
        {
          name: "Sarah Wijaya",
          role: "Junior Social Media Specialist",
          company: "D2C Fashion Brand",
          comment: "Sebelumnya bingung mulai dari mana. Di Ruang Sosmed diajarkan sangat runut mulai dari mindset, riset channel behavioral, sampai cara handling akun di 30 hari pertama. Sekarang sudah pede handle 2 akun brand secara organik.",
          rating: 5,
        },
        {
          name: "Rian Ramadhan",
          role: "Freelance Content Strategist",
          company: "Independent Creator",
          comment: "Materi Content System & Workflow-nya aplikatif sekali! Pembuatan konten jadi rapi, gak gampang burnout, dan yang paling penting saya jadi paham cara menyusun dokumen kerja serta membuat portofolio yang meyakinkan klien.",
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
      subtitle: "Semua hal yang perlu kamu ketahui tentang Ruang Sosmed 2.0.",
      faqs: [
        {
          question: "Apakah materi ini cocok untuk yang benar-benar belum punya pengalaman?",
          answer: "Sangat cocok! Ruang Sosmed diformulasikan khusus sebagai kelas fundamental dari nol. Kamu akan dibimbing mulai dari pola pikir seorang Social Media Specialist, riset audiens, ritme posting, hingga praktik pembuatan portofolio.",
        },
        {
          question: "Apakah ada materi iklan berbayar (Meta Ads)?",
          answer: "Tidak ada. Ruang Sosmed 100% full organik! Kami berfokus mendalam pada strategi konten organik, growth organik, dan workflow nyata seorang specialist sebelum memikirkan paid advertising.",
        },
        {
          question: "Bagaimana struktur kurikulum di Ruang Sosmed?",
          answer: "Terdapat 3 kurikulum berjenjang dari fundamental hingga masterclass: Series Fundamental (10 modul), Series Intermediate Content System & Workflow (7 modul), serta Series Masterclass Optimization & Maintanance (5 modul).",
        },
        {
          question: "Apakah saya bisa mengakses rekaman dan materi kapan saja?",
          answer: "Ya, semua modul video dan arsip Weekly Huddle dapat diakses 24/7 (self-paced) melalui laptop maupun smartphone kamu.",
        },
      ],
    },
  },
  {
    id: "block-cta",
    type: "cta",
    data: {
      heading: "Siap Mulai Roadmap Social Media Specialist Kamu?",
      body: "Bergabunglah sekarang di kelas fundamental Ruang Sosmed 2.0 dan bangun pemahaman konten organik yang kuat dari nol.",
      buttonLabel: "Daftar Akun Sekarang",
    },
  },
];
