// =============================================================================
// RUANG SOSMED 2.0 — CERTIFICATE STUDIO DESIGN CONFIG & PRESETS
// =============================================================================

export interface CertificateDesignConfig {
  templateId: "default-modern" | "royal-gold" | "tech-gradient" | "classic-diploma" | "custom-upload";
  customBackgroundUrl?: string | null;

  // Organization & Logo
  showLogo: boolean;
  customLogoUrl?: string | null;
  organizationName: string;

  // Header Typography
  headerEyebrow: string; // e.g. "OFFICIAL CERTIFICATE OF MASTERY"
  headerIntro: string; // e.g. "This certifies that the following digital marketing & social media specialist"

  // Recipient Name
  recipientNameColor: string;
  recipientNameFontSize: number; // base scale in px
  recipientNameFontFamily: "sans" | "serif" | "display";
  recipientNameAlign: "center" | "left";
  recipientNameOffsetY: number; // offset in px (-100 to +100)

  // Recipient Role / Subtitle
  showRole: boolean;
  recipientRoleColor: string;

  // Completion Statement & Course
  completionStatement: string;
  courseTitleColor: string;
  courseTitleFontSize: number;
  courseTitleAlign: "center" | "left";
  courseTitleOffsetY: number;

  // Distinction / Mastery Badge
  showBadge: boolean;
  badgeText: string; // e.g. "Mastery Distinction"
  badgeBgColor: string;
  badgeTextColor: string;

  // Metadata Footer
  showDate: boolean;
  dateLabel: string;
  showCredentialId: boolean;
  credentialLabel: string;

  // Signatory & Signature
  signatoryName: string;
  signatoryTitle: string;
  signatureType: "script" | "image";
  signatureColor: string;
  customSignatureUrl?: string | null;

  // Visual Accents & Border
  primaryAccentColor: string;
  borderStyle: "modern-strip" | "double-frame" | "minimal" | "none";
  showWatermarkSeal: boolean;
  sealOpacity: number; // 0 to 1
}

export const DEFAULT_CERTIFICATE_CONFIG: CertificateDesignConfig = {
  templateId: "default-modern",
  customBackgroundUrl: null,

  showLogo: true,
  customLogoUrl: null,
  organizationName: "ruang sosmed 2.0",

  headerEyebrow: "OFFICIAL CERTIFICATE OF MASTERY",
  headerIntro: "This certifies that the following digital marketing & social media specialist",

  recipientNameColor: "#121215",
  recipientNameFontSize: 36,
  recipientNameFontFamily: "sans",
  recipientNameAlign: "left",
  recipientNameOffsetY: 0,

  showRole: true,
  recipientRoleColor: "#5E5E5E",

  completionStatement: "has successfully completed all curriculum modules, practical brand audits, and mastery assessments for:",
  courseTitleColor: "#121215",
  courseTitleFontSize: 20,
  courseTitleAlign: "left",
  courseTitleOffsetY: 0,

  showBadge: true,
  badgeText: "Mastery Score • Top Cohort Distinction",
  badgeBgColor: "#FEF3C7",
  badgeTextColor: "#B45309",

  showDate: true,
  dateLabel: "COMPLETION DATE",
  showCredentialId: true,
  credentialLabel: "UNIQUE CREDENTIAL ID",

  signatoryName: "Dinur M. Pradipta",
  signatoryTitle: "Lead Mentor & Curriculum Director, Ruang Sosmed 2.0",
  signatureType: "script",
  signatureColor: "#4F39F6",
  customSignatureUrl: null,

  primaryAccentColor: "#4F39F6",
  borderStyle: "modern-strip",
  showWatermarkSeal: true,
  sealOpacity: 0.06,
};

export interface CertificateTemplatePreset {
  id: CertificateDesignConfig["templateId"];
  title: string;
  category: string;
  description: string;
  thumbnailBg: string;
  config: Partial<CertificateDesignConfig>;
}

export const CERTIFICATE_PRESET_TEMPLATES: CertificateTemplatePreset[] = [
  {
    id: "default-modern",
    title: "Ruang Sosmed Modern",
    category: "Official Default",
    description: "Desain resmi Ruang Sosmed dengan aksen strip ungu-amber, tipografi sans-serif tegas, dan verifikasi seal.",
    thumbnailBg: "linear-gradient(135deg, #4F39F6 0%, #6366F1 50%, #F59E0B 100%)",
    config: {
      templateId: "default-modern",
      customBackgroundUrl: null,
      primaryAccentColor: "#4F39F6",
      borderStyle: "modern-strip",
      recipientNameFontFamily: "sans",
      recipientNameAlign: "left",
      courseTitleAlign: "left",
      signatureColor: "#4F39F6",
      showWatermarkSeal: true,
    },
  },
  {
    id: "royal-gold",
    title: "Royal Gold Diploma",
    category: "Classic Luxury",
    description: "Nuansa emas prestisius dengan ornamen border ganda, font serif elegan, dan cap medali emas.",
    thumbnailBg: "linear-gradient(135deg, #D97706 0%, #F59E0B 60%, #FEF3C7 100%)",
    config: {
      templateId: "royal-gold",
      customBackgroundUrl: null,
      primaryAccentColor: "#D97706",
      borderStyle: "double-frame",
      recipientNameFontFamily: "serif",
      recipientNameAlign: "center",
      courseTitleAlign: "center",
      headerEyebrow: "HONORARY DIPLOMA OF EXCELLENCE",
      signatureColor: "#92400E",
      badgeBgColor: "#FEF3C7",
      badgeTextColor: "#92400E",
      showWatermarkSeal: true,
      sealOpacity: 0.12,
    },
  },
  {
    id: "tech-gradient",
    title: "Cyber Indigo & Emerald",
    category: "Tech & Agency",
    description: "Tema futuristik untuk praktisi digital media, kombinasi gradasi neon dan badge verified minimalis.",
    thumbnailBg: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #10B981 100%)",
    config: {
      templateId: "tech-gradient",
      customBackgroundUrl: null,
      primaryAccentColor: "#10B981",
      borderStyle: "modern-strip",
      recipientNameFontFamily: "sans",
      recipientNameAlign: "left",
      courseTitleAlign: "left",
      headerEyebrow: "CERTIFIED DIGITAL MEDIA SPECIALIST",
      signatureColor: "#10B981",
      badgeBgColor: "#D1FAE5",
      badgeTextColor: "#065F46",
      showWatermarkSeal: false,
    },
  },
  {
    id: "classic-diploma",
    title: "Classic Academic Academy",
    category: "Formal Academy",
    description: "Tata letak simetris tengah dengan bingkai akademik formal, cocok untuk kelas intensif & sertifikasi profesi.",
    thumbnailBg: "linear-gradient(135deg, #1E293B 0%, #334155 100%)",
    config: {
      templateId: "classic-diploma",
      customBackgroundUrl: null,
      primaryAccentColor: "#1E293B",
      borderStyle: "double-frame",
      recipientNameFontFamily: "serif",
      recipientNameAlign: "center",
      courseTitleAlign: "center",
      headerEyebrow: "CERTIFICATE OF PROFESSIONAL ACHIEVEMENT",
      signatureColor: "#1E293B",
      showWatermarkSeal: true,
      sealOpacity: 0.08,
    },
  },
  {
    id: "custom-upload",
    title: "Custom Canvas Upload",
    category: "Your Custom Design",
    description: "Gunakan desain sertifikat kustom Anda sendiri (dari Canva / Figma). Teks nama, materi, dan tanggal otomatis menimpa di atasnya.",
    thumbnailBg: "repeating-linear-gradient(45deg, #F3F4F6, #F3F4F6 10px, #E5E7EB 10px, #E5E7EB 20px)",
    config: {
      templateId: "custom-upload",
      borderStyle: "none",
      recipientNameAlign: "center",
      courseTitleAlign: "center",
      showWatermarkSeal: false,
    },
  },
];
