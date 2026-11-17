"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type {
  LandingPageData,
  LandingBlock,
  BlockType,
  HeroBlock,
  BenefitsBlock,
  PaymentBlock,
  TextBlock,
  ImageBlock,
  VideoBlock,
  ClassBlock,
  CatalogBlock,
  PricingTierItem,
} from "@/types/landing";
import {
  DEFAULT_EDITOR_LANDING_PAGE,
  INITIAL_LANDING_BLOCKS,
  DEFAULT_HEADER_CONFIG,
  DEFAULT_PAYMENT_CONFIG,
  DEFAULT_FOOTER_CONFIG,
} from "@/types/landing";
import { EditorHeader } from "./EditorHeader";
import { BlockPalette } from "./BlockPalette";
import { EditorCanvas } from "./EditorCanvas";
import { InspectorPanel, type GlobalInspectorTab } from "./InspectorPanel";
import { PaymentCheckoutModal, type CheckoutItem } from "../PaymentCheckoutModal";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface LandingPageEditorProps {
  initialConfig?: Partial<LandingPageData>;
  onSave?: (data: LandingPageData) => void;
  onExit: () => void;
  onPreviewPublic?: () => void;
  onShowToast?: (msg: string) => void;
}

export function LandingPageEditor({
  initialConfig,
  onSave,
  onExit,
  onPreviewPublic,
  onShowToast,
}: LandingPageEditorProps) {
  // Merge initial config with mock default initializer
  const createInitialState = (): LandingPageData => {
    if (!initialConfig) return DEFAULT_EDITOR_LANDING_PAGE;

    return {
      ...DEFAULT_EDITOR_LANDING_PAGE,
      ...initialConfig,
      headerImageUrl: initialConfig.headerImageUrl ?? "",
      headerConfig: {
        ...DEFAULT_HEADER_CONFIG,
        ...(initialConfig.headerConfig || {}),
      },
      paymentConfig: {
        ...DEFAULT_PAYMENT_CONFIG,
        ...(initialConfig.paymentConfig || {}),
      },
      footerConfig: {
        ...DEFAULT_FOOTER_CONFIG,
        ...(initialConfig.footerConfig || {}),
      },
      blocks:
        initialConfig.blocks && initialConfig.blocks.length > 0
          ? initialConfig.blocks
          : DEFAULT_EDITOR_LANDING_PAGE.blocks,
    };
  };

  // State Management with Undo/Redo & Dirty State Tracker
  const [pageData, setPageData] = useState<LandingPageData>(createInitialState);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [globalTab, setGlobalTab] = useState<GlobalInspectorTab>("general");
  const [checkoutItem, setCheckoutItem] = useState<
    CheckoutItem | PricingTierItem | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<LandingPageData[]>([createInitialState()]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Keep a ref to last saved state to track dirtiness
  const lastSavedRef = useRef<string>(JSON.stringify(createInitialState()));

  // Push new state to history
  const pushState = useCallback((nextState: LandingPageData) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, nextState];
    });
    setHistoryIndex((prev) => prev + 1);
    setPageData(nextState);

    // Update dirty tracker
    const currentJson = JSON.stringify(nextState);
    setIsDirty(currentJson !== lastSavedRef.current);
  }, [historyIndex]);

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const targetState = history[prevIndex];
      setHistoryIndex(prevIndex);
      setPageData(targetState);
      const currentJson = JSON.stringify(targetState);
      setIsDirty(currentJson !== lastSavedRef.current);
      onShowToast?.("Undo berhasil.");
    }
  }, [history, historyIndex, onShowToast]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const targetState = history[nextIndex];
      setHistoryIndex(nextIndex);
      setPageData(targetState);
      const currentJson = JSON.stringify(targetState);
      setIsDirty(currentJson !== lastSavedRef.current);
      onShowToast?.("Redo berhasil.");
    }
  }, [history, historyIndex, onShowToast]);

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y / Cmd+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Helper factory to create default block based on BlockType
  const createDefaultBlock = (type: BlockType): LandingBlock => {
    const id = `block-${type}-${Date.now()}`;

    switch (type) {
      case "hero":
        return {
          id,
          type: "hero",
          badge: "PRODUK PILIHAN UNTUK ANDA",
          headline: "Tampilkan produk Anda dengan lebih meyakinkan",
          subheadline: "Jelaskan manfaat utama produk Anda dengan bahasa yang jelas dan persuasif untuk menarik minat pembeli.",
          imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop",
          ctaText: "Beli Sekarang",
          ctaLink: "#payment-section",
          data: {
            badgeText: "PRODUK PILIHAN UNTUK ANDA",
            headline: "Tampilkan produk Anda dengan lebih meyakinkan",
            body: "Jelaskan manfaat utama produk Anda dengan bahasa yang jelas dan persuasif.",
            buttonLabel: "Beli Sekarang",
            imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop",
          },
        } as HeroBlock;

      case "benefits":
        return {
          id,
          type: "benefits",
          sectionTitle: "Kenapa memilih produk ini?",
          items: [
            {
              id: `benefit-${Date.now()}-1`,
              number: 1,
              title: "Kualitas Premium Terjamin",
              description: "Dibuat dengan bahan dan material pilihan berstandar tinggi yang awet digunakan.",
            },
            {
              id: `benefit-${Date.now()}-2`,
              number: 2,
              title: "Pengiriman Super Cepat",
              description: "Pesanan diproses dalam 24 jam dan dikirim langsung ke depan pintu Anda.",
            },
            {
              id: `benefit-${Date.now()}-3`,
              number: 3,
              title: "Garansi 100% Kepuasan",
              description: "Jaminan uang kembali jika barang yang Anda terima tidak sesuai deskripsi.",
            },
          ],
          data: {
            heading: "Kenapa memilih produk ini?",
            items: [
              {
                title: "Kualitas Premium Terjamin",
                description: "Dibuat dengan material pilihan berstandar tinggi.",
              },
              {
                title: "Pengiriman Super Cepat",
                description: "Pesanan diproses dalam 24 jam.",
              },
              {
                title: "Garansi 100% Kepuasan",
                description: "Jaminan uang kembali jika tidak sesuai.",
              },
            ],
          },
        } as BenefitsBlock;

      case "payment":
        return {
          id,
          type: "payment",
          sectionTitle: "Informasi pembayaran",
          price: 0,
          qrCodeUrl: "",
          bankName: "BCA / Mandiri / QRIS",
          accountNumber: "123-456-7890",
          accountHolder: "PT Ruang Sosmed Indonesia",
          paymentInstructions: "Scan kode QRIS di atas melalui m-Banking atau e-wallet pilihan Anda.",
          data: {
            heading: "Informasi pembayaran",
            price: 0,
            bankName: "BCA / Mandiri / QRIS",
            accountNumber: "123-456-7890",
          },
        } as PaymentBlock;

      case "text":
        return {
          id,
          type: "text",
          heading: "Penjelasan Detail Produk",
          content: "Tuliskan deskripsi lengkap, latar belakang pembuatan produk, atau cerita di balik brand Anda di sini. Konten ini dapat membantu meningkatkan kepercayaan calon pembeli.",
          align: "left",
          data: {
            heading: "Penjelasan Detail Produk",
            body: "Tuliskan deskripsi lengkap di sini.",
            align: "left",
          },
        } as TextBlock;

      case "image":
        return {
          id,
          type: "image",
          imageUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1000&auto=format&fit=crop",
          caption: "Suasana workspace dan workshop Ruang Sosmed.",
          alt: "Galeri Dokumentasi",
          aspectRatio: "video",
          data: {
            imageUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1000&auto=format&fit=crop",
            caption: "Dokumentasi visual",
          },
        } as ImageBlock;

      case "video":
        return {
          id,
          type: "video",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          title: "Video Demo & Testimoni Pelanggan",
          description: "Tonton ulasan lengkap dari para pengguna yang telah mencoba produk ini.",
          data: {
            title: "Video Demo & Testimoni Pelanggan",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          },
        } as VideoBlock;

      case "class":
        return {
          id,
          type: "class",
          sectionTitle: "Daftar Kelas & Jadwal Belajar",
          classes: [
            {
              id: `cls-${Date.now()}-1`,
              title: "Fundamental Social Media Specialist",
              instructor: "Dimas Suryo (Lead Mentor)",
              schedule: "Setiap Sabtu, 19:30 WIB",
              badge: "Batch Baru",
              level: "Pemula / Fundamental",
              price: "Rp 149.000",
            },
            {
              id: `cls-${Date.now()}-2`,
              title: "Content System & Creative Workflow",
              instructor: "Sarah Wijaya (Content Lead)",
              schedule: "Setiap Minggu, 14:00 WIB",
              badge: "Best Seller",
              level: "Intermediate",
              price: "Rp 199.000",
            },
          ],
          data: {
            heading: "Daftar Kelas & Jadwal Belajar",
          },
        } as ClassBlock;

      case "catalog":
        return {
          id,
          type: "catalog",
          sectionTitle: "Katalog Produk & Penawaran",
          items: [
            {
              id: `prod-${Date.now()}-1`,
              title: "Template Dokumen Kerja & Rate Card SOP",
              price: "Rp 79.000",
              tag: "Digital Asset",
              description: "Format spreadsheet & SOP handling klien 30 hari pertama siap pakai.",
              imageUrl: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=400&auto=format&fit=crop",
              ctaText: "Beli Template",
            },
            {
              id: `prod-${Date.now()}-2`,
              title: "Audit Akun & Review Portofolio 1-on-1",
              price: "Rp 199.000",
              tag: "Mentoring",
              description: "Sesi private 45 menit bedah portofolio bersama lead mentor.",
              imageUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=400&auto=format&fit=crop",
              ctaText: "Booking Sesi",
            },
          ],
          data: {
            heading: "Katalog Produk & Penawaran",
          },
        } as CatalogBlock;

      case "features":
        return {
          id,
          type: "features",
          data: {
            badge: "Keunggulan Platform",
            heading: "Kenapa Belajar di Ruang Sosmed?",
            body: "Kurikulum disusun praktis agar langsung bisa dipakai membangun akun atau menangani klien.",
            items: [
              {
                icon: "Layers",
                title: "Materi Praktis & Terstruktur",
                description:
                  "Pembelajaran bertahap mulai dari fundamental hingga teknik eksekusi harian.",
              },
              {
                icon: "Award",
                title: "Studi Kasus & Template SOP",
                description:
                  "Dilengkapi template audit, content calendar, dan SOP yang siap dipakai.",
              },
              {
                icon: "Zap",
                title: "Update Materi Berkala",
                description:
                  "Menyesuaikan perkembangan algoritma dan tren industri digital terbaru.",
              },
            ],
          },
        };

      case "topics":
        return {
          id,
          type: "topics",
          data: {
            badge: "Kurikulum Terstruktur",
            heading: "3 Pilar Kurikulum Utama",
            body: "Ikuti alur belajar step-by-step untuk menguasai keahlian secara menyeluruh.",
            topics: [
              {
                id: `topic-${Date.now()}-1`,
                number: "01",
                title: "Fundamental Strategy",
                subtitle: "Pondasi Riset & Positioning",
                category: "Fundamental",
                badge: "WAJIB",
                highlight: false,
                moduleCount: "3 Modul",
                description:
                  "Pelajari pondasi riset audiens, persona, dan strategi pertumbuhan akun.",
                modules: [
                  {
                    id: `mod-${Date.now()}-1`,
                    number: "01",
                    title: "Riset Audiens & Niche Brand",
                    duration: "15m",
                    description: "Menentukan target market dan positioning unik.",
                  },
                  {
                    id: `mod-${Date.now()}-2`,
                    number: "02",
                    title: "Content Pillar & Hook Framework",
                    duration: "20m",
                    description: "Menyusun pilar konten yang konsisten dan menarik.",
                  },
                ],
              },
              {
                id: `topic-${Date.now()}-2`,
                number: "02",
                title: "Creative Execution & Copywriting",
                subtitle: "Produksi Konten Berkonversi",
                category: "Intermediate",
                badge: "POPULER",
                highlight: true,
                moduleCount: "2 Modul",
                description:
                  "Teknik penulisan hook, storytelling, dan produksi konten visual pendek.",
                modules: [
                  {
                    id: `mod-${Date.now()}-3`,
                    number: "03",
                    title: "Viral Hook & Storytelling",
                    duration: "25m",
                    description: "Struktur script video pendek yang meningkatkan retensi.",
                  },
                ],
              },
            ],
          },
        };

      case "pricing":
        return {
          id,
          type: "pricing",
          data: {
            badge: "Paket Akses Belajar",
            heading: "Pilih Paket Sesuai Kebutuhan Anda",
            body: "Klik tombol paket berbayar untuk langsung membuka halaman checkout QRIS & transfer bank.",
            tiers: [
              {
                name: "Free Learner",
                price: "Rp 0",
                period: "Selamanya",
                badge: "Starter",
                description: "Akses materi pengenalan dan komunitas dasar.",
                features: [
                  "Akses modul fundamental pilihan",
                  "Preview template content calendar",
                  "Grup diskusi komunitas",
                ],
                buttonLabel: "Mulai Belajar Gratis",
                buttonAction: "register",
                highlighted: false,
              },
              {
                name: "Learner PRO",
                price: "Rp 149.000",
                period: "Akses 1 Tahun",
                badge: "Paling Diminati",
                description:
                  "Akses penuh seluruh kurikulum, template SOP, dan update materi.",
                features: [
                  "Akses seluruh modul & studi kasus",
                  "Download template SOP & Rate Card",
                  "Sertifikat kelulusan resmi",
                  "Prioritas review portofolio",
                ],
                buttonLabel: "Beli Paket PRO",
                buttonAction: "payment_modal",
                highlighted: true,
              },
            ],
          },
        };

      case "testimonial":
        return {
          id,
          type: "testimonial",
          data: {
            badge: "Cerita Alumni",
            heading: "Dipercaya Ratusan Praktisi & Kreator",
            body: "Bagaimana materi ini membantu mereka meningkatkan performa akun dan karier.",
            items: [
              {
                name: "Rina Kartika",
                role: "Social Media Specialist",
                quote:
                  "Materinya sangat aplikatif. SOP dan template content plan-nya langsung saya pakai untuk menangani klien pertama saya.",
              },
              {
                name: "Bagas Pratama",
                role: "Brand Owner",
                quote:
                  "Sebelumnya bingung bikin konten harian, sekarang tim kami punya sistem riset dan produksi yang jauh lebih rapi.",
              },
              {
                name: "Nadia Putri",
                role: "Freelance Content Creator",
                quote:
                  "Penjelasan funnel organik dan evaluasi metriknya sangat mudah dipahami bahkan untuk pemula.",
              },
            ],
          },
        };

      case "faq":
        return {
          id,
          type: "faq",
          data: {
            badge: "Pertanyaan Umum",
            heading: "Yang Sering Ditanyakan",
            body: "Informasi lengkap seputar sistem belajar, akses materi, dan metode pembayaran.",
            items: [
              {
                question: "Apakah pemula tanpa pengalaman bisa mengikuti kelas ini?",
                answer:
                  "Bisa. Kurikulum disusun berurutan dari level fundamental hingga strategi lanjutan.",
              },
              {
                question: "Bagaimana proses konfirmasi setelah bayar via QRIS?",
                answer:
                  "Setelah klik paket dan scan QRIS di popup pembayaran, Anda dapat langsung mengirim konfirmasi via WhatsApp.",
              },
              {
                question: "Apakah akses materi berlaku selamanya atau berbatas waktu?",
                answer:
                  "Detail durasi akses tertera pada masing-masing kartu paket (Gratis selamanya atau PRO 1 Tahun).",
              },
            ],
          },
        };

      case "cta":
        return {
          id,
          type: "cta",
          data: {
            badge: "Siap Bergabung?",
            heading: "Mulai Bangun Skill Digital Anda Hari Ini",
            body: "Daftar akun sekarang atau pilih paket belajar yang sesuai untuk langsung mengakses ruang belajar.",
            primaryButtonLabel: "Daftar Sekarang",
            secondaryButtonLabel: "Masuk Akun",
            imageUrl: "",
          },
        };

      default:
        return {
          id,
          type,
          data: {},
        };
    }
  };

  // Add block to bottom (from Palette click)
  const handleAddBlock = (type: BlockType) => {
    const newBlock = createDefaultBlock(type);
    const updatedState: LandingPageData = {
      ...pageData,
      blocks: [...pageData.blocks, newBlock],
    };
    pushState(updatedState);
    setSelectedBlockId(newBlock.id);
    onShowToast?.(`Blok ${type} berhasil ditambahkan.`);
  };

  // Drop block at specific index (from Palette drag)
  const handleDropBlockAt = (index: number, type: BlockType) => {
    const newBlock = createDefaultBlock(type);
    const nextBlocks = [...pageData.blocks];
    nextBlocks.splice(index, 0, newBlock);

    const updatedState: LandingPageData = {
      ...pageData,
      blocks: nextBlocks,
    };
    pushState(updatedState);
    setSelectedBlockId(newBlock.id);
    onShowToast?.(`Blok ${type} ditambahkan ke posisi ${index + 1}.`);
  };

  // Move block up/down
  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pageData.blocks.length) return;

    const nextBlocks = [...pageData.blocks];
    const [moved] = nextBlocks.splice(index, 1);
    nextBlocks.splice(targetIndex, 0, moved);

    const updatedState: LandingPageData = {
      ...pageData,
      blocks: nextBlocks,
    };
    pushState(updatedState);
  };

  // Duplicate block
  const handleDuplicateBlock = (index: number) => {
    const target = pageData.blocks[index];
    if (!target) return;

    const duplicated: LandingBlock = {
      ...JSON.parse(JSON.stringify(target)),
      id: `block-${target.type}-${Date.now()}`,
    };

    const nextBlocks = [...pageData.blocks];
    nextBlocks.splice(index + 1, 0, duplicated);

    const updatedState: LandingPageData = {
      ...pageData,
      blocks: nextBlocks,
    };
    pushState(updatedState);
    setSelectedBlockId(duplicated.id);
    onShowToast?.("Blok berhasil diduplikasi.");
  };

  // Delete block
  const handleDeleteBlock = (id: string) => {
    const nextBlocks = pageData.blocks.filter((b) => b.id !== id);
    const updatedState: LandingPageData = {
      ...pageData,
      blocks: nextBlocks,
    };
    pushState(updatedState);
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
    onShowToast?.("Blok berhasil dihapus.");
  };

  // Update specific block
  const handleUpdateBlock = (updatedBlock: LandingBlock) => {
    const nextBlocks = pageData.blocks.map((b) =>
      b.id === updatedBlock.id ? updatedBlock : b
    );
    const updatedState: LandingPageData = {
      ...pageData,
      blocks: nextBlocks,
    };
    pushState(updatedState);
  };

  // Update page global field
  const handleUpdatePageData = (field: keyof LandingPageData, value: any) => {
    const updatedState: LandingPageData = {
      ...pageData,
      [field]: value,
    };
    pushState(updatedState);
  };

  // Toggle Status DRAFT / PUBLISHED
  const handleToggleStatus = () => {
    const nextStatus =
      pageData.status.toUpperCase() === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    handleUpdatePageData("status", nextStatus);
    onShowToast?.(`Status halaman diubah ke ${nextStatus}.`);
  };

  // Load preset template
  const handleLoadPreset = (preset: "default" | "official") => {
    setSelectedBlockId(null);
    if (preset === "default") {
      pushState({
        ...DEFAULT_EDITOR_LANDING_PAGE,
        headerConfig: DEFAULT_HEADER_CONFIG,
        paymentConfig: DEFAULT_PAYMENT_CONFIG,
        footerConfig: DEFAULT_FOOTER_CONFIG,
      });
      onShowToast?.("Template Produk Baru (3-Blok) berhasil dimuat!");
    } else {
      const officialPage: LandingPageData = {
        id: "landing-main",
        slug: "home",
        title: "Ruang Sosmed 2.0 — Official Platform",
        description:
          "Kelas fundamental untuk belajar strategi social media organik, konten, dan roadmap menjadi Social Media Specialist profesional.",
        headerImageUrl: "",
        headerConfig: DEFAULT_HEADER_CONFIG,
        paymentConfig: DEFAULT_PAYMENT_CONFIG,
        footerConfig: DEFAULT_FOOTER_CONFIG,
        theme: "violet",
        status: "PUBLISHED",
        blocks: INITIAL_LANDING_BLOCKS,
      };
      pushState(officialPage);
      onShowToast?.("Template Kursus Ruang Sosmed berhasil dimuat!");
    }
  };

  // Duplicate entire page
  const handleDuplicatePage = () => {
    const newSlug = `landing-${Date.now()}`;
    const duplicated: LandingPageData = {
      ...pageData,
      id: `landing-page-${Date.now()}`,
      title: `${pageData.title} (Copy)`,
      slug: newSlug,
      status: "DRAFT",
    };
    pushState(duplicated);
    onShowToast?.("Halaman berhasil diduplikasi sebagai draf baru.");
  };

  // Preview payment modal from inspector or canvas
  const handleOpenPaymentPreview = (item?: CheckoutItem | PricingTierItem) => {
    if (item) {
      setCheckoutItem(item);
      return;
    }
    const pricingBlock = pageData.blocks.find((b) => b.type === "pricing");
    const tiers: PricingTierItem[] = (pricingBlock as any)?.data?.tiers || [];
    const paidTier =
      tiers.find((t) => t.buttonAction === "payment_modal" || t.highlighted) ||
      tiers.find((t) => t.price && !t.price.includes("0")) ||
      tiers[0];

    setCheckoutItem(
      paidTier || {
        name: "Learner PRO",
        price: "Rp 149.000",
        period: "Akses 1 Tahun",
        badge: "Paling Diminati",
        description:
          "Simulasi popup checkout QRIS & transfer bank berdasarkan konfigurasi pembayaran Anda.",
        features: [
          "Akses penuh seluruh modul & studi kasus",
          "Download template SOP & Rate Card",
          "Sertifikat kelulusan resmi",
        ],
      }
    );
  };

  // Save Page action
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Invoke onSave callback
      onSave?.(pageData);

      // 2. Persist to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            "ruang_sosmed_landing_config_v5",
            JSON.stringify(pageData)
          );
        } catch (e) {
          console.warn("Could not save to localStorage:", e);
        }
      }

      // 3. Persist to Supabase if configured
      let supabaseErrorMessage: string | null = null;
      if (isSupabaseConfigured) {
        const normalizedStatus =
          (pageData.status || "published").toUpperCase() === "DRAFT"
            ? "draft"
            : "published";

        const { error } = await supabase.from("landing_pages").upsert(
          {
            slug: pageData.slug || "home",
            title: pageData.title,
            description: pageData.description,
            header_image_url: pageData.headerImageUrl || "",
            header_config: pageData.headerConfig || DEFAULT_HEADER_CONFIG,
            payment_config: pageData.paymentConfig || DEFAULT_PAYMENT_CONFIG,
            footer_config: pageData.footerConfig || DEFAULT_FOOTER_CONFIG,
            theme: pageData.theme || "violet",
            status: normalizedStatus,
            blocks: pageData.blocks,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "slug" }
        );

        if (error) {
          console.warn("Supabase landing_pages upsert warning:", error);
          supabaseErrorMessage = error.message;
        }
      }

      lastSavedRef.current = JSON.stringify(pageData);
      setIsDirty(false);
      if (supabaseErrorMessage) {
        onShowToast?.(
          `Tersimpan di browser (Supabase perlu update skema SQL: ${supabaseErrorMessage})`
        );
      } else {
        onShowToast?.(
          "Halaman landing page berhasil disimpan dan dipublikasikan!"
        );
      }
    } catch (err: any) {
      console.error("Save landing error:", err);
      onShowToast?.("Tersimpan di penyimpanan lokal.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedBlock =
    pageData.blocks.find((b) => b.id === selectedBlockId) || null;

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col font-sans">
      {/* A. TOP NAVIGATION BAR */}
      <EditorHeader
        title={pageData.title}
        status={pageData.status}
        isDirty={isDirty}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        isSaving={isSaving}
        onExit={onExit}
        onToggleStatus={handleToggleStatus}
        onDuplicatePage={handleDuplicatePage}
        onPreviewPublic={
          onPreviewPublic || (() => window.open(`/c/${pageData.slug}`, "_blank"))
        }
        onSave={handleSave}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* MAIN 3-COLUMN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* B. PANEL KIRI: ELEMEN / BLOCK LIBRARY */}
        <BlockPalette
          onAddBlock={handleAddBlock}
          onOpenGlobalSettings={(tab) => {
            setSelectedBlockId(null);
            if (tab) setGlobalTab(tab);
          }}
        />

        {/* C. PANEL TENGAH: LIVE CANVAS / PREVIEW */}
        <EditorCanvas
          pageData={pageData}
          selectedBlockId={selectedBlockId}
          activeGlobalTab={globalTab}
          onSelectBlock={(id) => setSelectedBlockId(id)}
          onSelectGlobalSection={(tab) => {
            setSelectedBlockId(null);
            setGlobalTab(tab);
          }}
          onMoveBlock={handleMoveBlock}
          onDuplicateBlock={handleDuplicateBlock}
          onDeleteBlock={handleDeleteBlock}
          onDropBlockAt={handleDropBlockAt}
          onTestPackagePayment={(item) => handleOpenPaymentPreview(item)}
        />

        {/* D. PANEL KANAN: INSPECTOR / PENGATURAN */}
        <InspectorPanel
          pageData={pageData}
          selectedBlock={selectedBlock}
          globalTab={globalTab}
          onChangeGlobalTab={setGlobalTab}
          onUpdatePageData={handleUpdatePageData}
          onUpdateBlock={handleUpdateBlock}
          onDeleteBlock={handleDeleteBlock}
          onDeselectBlock={() => setSelectedBlockId(null)}
          onLoadPreset={handleLoadPreset}
          onTestPaymentModal={() => handleOpenPaymentPreview()}
        />
      </div>

      {/* IN-EDITOR TEST PAYMENT MODAL */}
      <PaymentCheckoutModal
        open={Boolean(checkoutItem)}
        item={checkoutItem}
        paymentConfig={pageData.paymentConfig || DEFAULT_PAYMENT_CONFIG}
        isPreviewMode={true}
        onClose={() => setCheckoutItem(null)}
        onProceedAuth={() => {
          setCheckoutItem(null);
          onShowToast?.(
            "Simulasi mode publik: Pengunjung akan diarahkan ke modal Daftar / Masuk akun."
          );
        }}
      />
    </div>
  );
}
