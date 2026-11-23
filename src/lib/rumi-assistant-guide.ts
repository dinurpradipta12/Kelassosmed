// =============================================================================
// RUANG SOSMED 2.0 LMS — RUMI CONTEXTUAL GUIDE & LIVE MOOD ENGINE
// File: src/lib/rumi-assistant-guide.ts
// Zero-cost instant Indonesian page guides, FAQs, and real-data mood engine.
// =============================================================================

import { getTodayIsoDate, toIsoDateString } from "@/lib/subscription-utils";
import type { RumiXpProfileState } from "@/lib/rumi-xp";

export type RumiMood =
  | "happy"
  | "sleepy"
  | "excited"
  | "focused"
  | "reminder"
  | "peeking";

export type RumiPageContextId =
  | "learner:home"
  | "learner:my-learning"
  | "learner:catalog"
  | "learner:course-overview"
  | "learner:classroom"
  | "learner:quiz-runner"
  | "learner:wiki"
  | "learner:wiki-reader"
  | "learner:favorites"
  | "learner:tools"
  | "learner:profile"
  | "admin:home"
  | "admin:analytics"
  | "admin:content"
  | "admin:learners"
  | "admin:inbox"
  | "admin:certificates"
  | "admin:rewards"
  | "admin:history"
  | "admin:archive"
  | "admin:landing-builder"
  | "admin:settings"
  | "admin:profile";

export interface RumiGuideFeature {
  title: string;
  description: string;
}

export interface RumiGuideFaq {
  question: string;
  answer: string;
  reactionMood?: RumiMood;
}

export interface RumiPageGuide {
  contextId: RumiPageContextId;
  pageTitle: string;
  badge: string;
  summary: string;
  features: RumiGuideFeature[];
  defaultBubble: string;
  faqs: RumiGuideFaq[];
}

export interface RumiLiveMoodResult {
  mood: RumiMood;
  statusLabel: string;
  bubbleMessage: string;
  daysSinceLastStudy: number | null;
}

export interface RumiAdminAlerts {
  pendingPayments?: number;
  pendingGrading?: number;
  unreadDiscussions?: number;
  openIssues?: number;
}

const GUIDE_MAP: Record<RumiPageContextId, RumiPageGuide> = {
  "learner:home": {
    contextId: "learner:home",
    pageTitle: "Beranda Belajar (Home)",
    badge: "Dashboard Siswa",
    summary:
      "Pusat ringkasan belajar kamu! Di sini ada level evolusi Rumi, progres kelas, leaderboard poin, kode akses folder, dan tombol cepat lanjut belajar.",
    features: [
      {
        title: "Evolusi & XP Rumi",
        description:
          "Login harian dan selesaikan bab agar XP bertambah dan Rumi tumbuh hingga Lv.5 Superior!",
      },
      {
        title: "Kartu Lanjut Belajar",
        description:
          "Langsung sambung ke bab terakhir yang kamu buka tanpa perlu mencari manual.",
      },
      {
        title: "Tukar Kode Folder / Kelas",
        description:
          "Masukkan kode kelas dari mentor untuk membuka folder materi yang ditugaskan.",
      },
    ],
    defaultBubble:
      "Halo! Ini Beranda belajar kamu. Klik aku kalau butuh info atau bantuan di halaman ini ya!",
    faqs: [
      {
        question: "Gimana cara Rumi cepat naik level?",
        answer:
          "Rumi dapat XP otomatis tiap kali kamu login harian, menuntaskan bab (+2 XP), submit kuis (+4 XP), menulis catatan/ulasan, dan bonus ekstra jika paket Basic/PRO aktif (hingga 2× XP)!",
        reactionMood: "excited",
      },
      {
        question: "Cara pakai kode akses kelas atau kode PRO?",
        answer:
          "Untuk kode folder kelas, ketik di kolom 'Redeem Kode' pada Beranda. Kalau punya Kode Voucher Premium (durasi hari/bulan), klik Upgrade / Paket PRO lalu masukkan kodenya!",
        reactionMood: "happy",
      },
      {
        question: "Apa bedanya XP Rumi dan Poin Bintang?",
        answer:
          "XP Rumi menaikkan tahap evolusi Rumi (Lv.1–Lv.5), sedangkan Poin Bintang bisa kamu tukar di Rewards Shop atau untuk membuka bab satuan yang terkunci.",
        reactionMood: "focused",
      },
    ],
  },

  "learner:my-learning": {
    contextId: "learner:my-learning",
    pageTitle: "My Learning (Kelas Saya)",
    badge: "Progres Aktif",
    summary:
      "Daftar semua kelas, panduan, dan tugas yang sudah ditugaskan ke akunmu lengkap dengan bar persentase penyelesaian dan status sertifikat.",
    features: [
      {
        title: "Lacak Persentase Kelas",
        description:
          "Lihat berapa bab yang sudah selesai di setiap course dan mana yang hampir 100%.",
      },
      {
        title: "Sertifikat & Unduhan",
        description:
          "Setelah seluruh bab kelas selesai dan syarat lulus terpenuhi, sertifikat bisa dibuka dari sini.",
      },
      {
        title: "Filter Cepat Materi",
        description:
          "Urutkan kelas yang masih In Progress agar fokus menyelesaikannya lebih dulu.",
      },
    ],
    defaultBubble:
      "Di My Learning kamu bisa pantau progres semua kelasmu. Yuk selesaikan satu per satu!",
    faqs: [
      {
        question: "Kenapa kelasku belum muncul di sini?",
        answer:
          "Pastikan kamu sudah me-redeem Kode Folder dari mentor di Beranda atau men-enroll kelas dari halaman Katalog.",
        reactionMood: "focused",
      },
      {
        question: "Kapan sertifikat kelas bisa diklaim?",
        answer:
          "Sertifikat terbuka setelah seluruh bab wajib diselesaikan (100%) pada paket yang mendukung fitur Sertifikat HD.",
        reactionMood: "excited",
      },
      {
        question: "Progresku nggak nambah, kenapa ya?",
        answer:
          "Pastikan kamu menekan tombol 'Tandai Bab Selesai' di dalam Classroom agar sistem menyimpan progres ke akunmu.",
        reactionMood: "happy",
      },
    ],
  },

  "learner:catalog": {
    contextId: "learner:catalog",
    pageTitle: "Katalog Materi & Folder",
    badge: "Eksplorasi Kelas",
    summary:
      "Galeri seluruh folder kelas, modul video, template, dan panduan strategi sosial media yang tersedia di Ruang Sosmed 2.0.",
    features: [
      {
        title: "Folder Terstruktur per Cohort",
        description:
          "Klik ikon folder untuk melihat isi modul, jumlah bab gratis vs PRO, dan jalur belajar.",
      },
      {
        title: "Pencarian & Filter Topik",
        description:
          "Cari materi spesifik lewat bilah pencarian di navbar atas kapan saja.",
      },
      {
        title: "Simpan ke Favorites",
        description:
          "Tandai materi favorit dengan ikon hati agar gampang ditemukan lagi nanti.",
      },
    ],
    defaultBubble:
      "Selamat datang di Katalog! Pilih folder kelas untuk melihat silabus & materi gratisnya.",
    faqs: [
      {
        question: "Mana materi yang bisa dibuka gratis?",
        answer:
          "Materi atau bab dengan badge 'Gratis' dapat langsung kamu pelajari meskipun akun masih di Free Tier.",
        reactionMood: "happy",
      },
      {
        question: "Cara membuka materi yang bertanda gembok PRO?",
        answer:
          "Kamu bisa upgrade paket PRO, pakai kode voucher berjangka waktu, atau gunakan Poin Bintang pada materi yang mendukung buka satuan.",
        reactionMood: "excited",
      },
      {
        question: "Folder ini isinya apa saja?",
        answer:
          "Setiap folder mengelompokkan Course, Page, Tugas, dan Wiki sesuai batch atau jalur spesialisasi.",
        reactionMood: "focused",
      },
    ],
  },

  "learner:course-overview": {
    contextId: "learner:course-overview",
    pageTitle: "Detail Silabus Kelas",
    badge: "Course Overview",
    summary:
      "Halaman pengantar sebelum masuk ke ruang belajar: tampilkan daftar seksi & bab, estimasi durasi, status kunci, dan tombol Mulai Belajar.",
    features: [
      {
        title: "Peta Seksi & Bab",
        description:
          "Klik setiap seksi untuk melihat urutan materi video, bacaan, dan kuis di dalamnya.",
      },
      {
        title: "Tombol Mulai / Lanjut",
        description:
          "Langsung masuk ke bab pertama yang belum selesai di Classroom.",
      },
      {
        title: "Status Akses Bab",
        description:
          "Menampilkan mana bab yang sudah terbuka, selesai, atau memerlukan PRO / Poin.",
      },
    ],
    defaultBubble:
      "Lagi intip silabus kelas ya? Klik Mulai Belajar kapan aja, Rumi temani di dalam kelas!",
    faqs: [
      {
        question: "Harus urutkah belajar per bab?",
        answer:
          "Disarankan urut dari bab 1 agar konsep nyambung, tapi semua bab yang tidak terkunci bisa langsung kamu klik.",
        reactionMood: "focused",
      },
      {
        question: "Apa yang terjadi kalau bab masih terkunci?",
        answer:
          "Klik bab terkunci untuk melihat opsi membukanya — bisa lewat paket berbayar, kode premium, atau tukar Poin Bintang jika diaktifkan.",
        reactionMood: "happy",
      },
      {
        question: "Dimana kuis atau evaluasi kelas ini?",
        answer:
          "Kamu bisa memulai kuis dari tombol Evaluasi di halaman ini atau dari panel dalam Classroom.",
        reactionMood: "excited",
      },
    ],
  },

  "learner:classroom": {
    contextId: "learner:classroom",
    pageTitle: "Ruang Belajar (Classroom)",
    badge: "Mode Fokus",
    summary:
      "Tempat utama kamu menyimak video/artikel materi, mencatat poin penting, berdiskusi tanya-jawab dengan mentor, dan melaporkan kendala.",
    features: [
      {
        title: "Pemutar Video & Materi Bab",
        description:
          "Baca modul dan tonton video pembelajaran secara penuh di panel utama.",
      },
      {
        title: "Catatan Pribadi & Diskusi",
        description:
          "Tulis catatan (+2 XP) atau ajukan pertanyaan langsung di tab Diskusi tiap bab.",
      },
      {
        title: "Tombol Selesaikan Bab",
        description:
          "Klik selesai setelah belajar agar mendapat +2 XP (× booster tier) dan Poin Bintang!",
      },
    ],
    defaultBubble:
      "Mode fokus aktif! Jangan lupa tulis catatan & tandai bab selesai biar XP Rumi naik.",
    faqs: [
      {
        question: "Gimana cara dapat XP dan Poin di kelas ini?",
        answer:
          "Tandai bab selesai (+2 XP dasar), tulis catatan pribadi (+2 XP), dan beri ulasan kelas (+2 XP). Member PRO otomatis dapat pengali 2× XP!",
        reactionMood: "excited",
      },
      {
        question: "Kenapa bab berikutnya masih terkunci?",
        answer:
          "Beberapa bab khusus member Basic/PRO. Klik kartu babnya untuk meng-upgrade, menukar Kode Akses Premium, atau membuka dengan Poin jika tersedia.",
        reactionMood: "focused",
      },
      {
        question: "Kalau video error atau link materi rusak gimana?",
        answer:
          "Gunakan tombol 'Laporkan Kendala' di dalam Classroom — laporanmu langsung masuk ke dashboard mentor secara real-time.",
        reactionMood: "reminder",
      },
    ],
  },

  "learner:quiz-runner": {
    contextId: "learner:quiz-runner",
    pageTitle: "Evaluasi & Kuis Kelas",
    badge: "Assessment",
    summary:
      "Uji pemahamanmu dengan soal pilihan ganda & esai singkat. Jawaban esai akan dinilai mentor, dan tiap pengumpulan memberimu XP!",
    features: [
      {
        title: "Progres Soal Real-Time",
        description:
          "Pantau soal yang sudah dijawab sebelum mengirim seluruh jawaban kuis.",
      },
      {
        title: "Penilaian Otomatis + Mentor",
        description:
          "Pilihan ganda langsung keluar skornya, sementara esai direview mentor secara personal.",
      },
      {
        title: "Bonus +4 XP Submit Kuis",
        description:
          "Setiap kali mengumpulkan kuis, Rumi langsung mendapat dorongan XP besar!",
      },
    ],
    defaultBubble:
      "Semangat ngerjain kuisnya! Baca soal pelan-pelan ya, Rumi doain nilainya tinggi!",
    faqs: [
      {
        question: "Apakah hasil esai langsung keluar?",
        answer:
          "Skor pilihan ganda langsung terhitung, sedangkan jawaban uraian akan diperiksa mentor di Grading Center.",
        reactionMood: "focused",
      },
      {
        question: "Berapa XP kalau kuis selesai dikumpulkan?",
        answer:
          "Submit kuis memberi +4 XP dasar (+6 XP untuk Basic, +8 XP untuk PRO) setelah dikirim.",
        reactionMood: "excited",
      },
      {
        question: "Boleh keluar dulu sebelum kirim?",
        answer:
          "Sebaiknya selesaikan dan klik kirim sebelum keluar agar jawaban tidak hilang.",
        reactionMood: "happy",
      },
    ],
  },

  "learner:wiki": {
    contextId: "learner:wiki",
    pageTitle: "Direktori Wiki & SOP",
    badge: "Knowledge Base",
    summary:
      "Kumpulan SOP kerja agency, template brief konten, checklist campaign, dan panduan praktis siap pakai untuk pekerjaan social media sehari-hari.",
    features: [
      {
        title: "Panduan Terstruktur",
        description:
          "Artikel disusun ringkas per bagian lengkap dengan estimasi waktu baca.",
      },
      {
        title: "Lampiran File & Template",
        description:
          "Beberapa dokumen Wiki menyertakan file referensi atau checklist yang siap disalin.",
      },
      {
        title: "Cari Berdasarkan Kategori",
        description:
          "Gunakan kolom pencarian di atas untuk menemukan SOP tertentu dalam hitungan detik.",
      },
    ],
    defaultBubble:
      "Lagi cari SOP atau playbook konten? Semua panduan praktisnya tersimpan rapi di Wiki ini!",
    faqs: [
      {
        question: "Kenapa halaman Wiki terkunci di Free Plan?",
        answer:
          "Wiki & SOP termasuk materi praktis paket berbayar. Kamu bisa mengaktifkannya dengan Upgrade Paket atau Kode Voucher Premium.",
        reactionMood: "focused",
      },
      {
        question: "Apakah isi Wiki bisa diupdate mentor sewaktu-waktu?",
        answer:
          "Ya! Mentor memperbarui artikel Wiki secara live sehingga kamu selalu memakai standar terbaru.",
        reactionMood: "happy",
      },
      {
        question: "Cara cepat simpan artikel penting?",
        answer:
          "Tandai artikel ke Favorites supaya muncul di tab khusus milikmu.",
        reactionMood: "happy",
      },
    ],
  },

  "learner:wiki-reader": {
    contextId: "learner:wiki-reader",
    pageTitle: "Pembaca Artikel Wiki & SOP",
    badge: "Dokumen SOP",
    summary:
      "Tampilan baca fokus untuk dokumen SOP, playbook, dan lampiran file pendukung dari Ruang Sosmed.",
    features: [
      {
        title: "Daftar Bagian Artikel",
        description:
          "Ikuti langkah demi langkah panduan atau lompat ke bagian yang kamu perlukan.",
      },
      {
        title: "Lampiran Pendukung",
        description:
          "Unduh atau buka template yang ditautkan langsung di bagian bawah artikel.",
      },
      {
        title: "Kembali ke Direktori",
        description:
          "Klik tombol Kembali untuk berpindah ke artikel SOP lainnya.",
      },
    ],
    defaultBubble:
      "Lagi baca SOP ya? Rumi tunggu di pojok sini kalau butuh cek lampiran atau cari panduan lain!",
    faqs: [
      {
        question: "Di mana letak file lampiran SOP ini?",
        answer:
          "Gulir ke bagian bawah dokumen untuk melihat kartu lampiran yang siap diunduh.",
        reactionMood: "focused",
      },
      {
        question: "Cara balik ke daftar semua SOP?",
        answer:
          "Tekan tombol 'Kembali' di kiri atas artikel untuk pulang ke Direktori Wiki.",
        reactionMood: "happy",
      },
    ],
  },

  "learner:favorites": {
    contextId: "learner:favorites",
    pageTitle: "Materi Favorit (Favorites)",
    badge: "Koleksi Pilihan",
    summary:
      "Kumpulan kursus, halaman, dan SOP yang kamu tandai hati agar bisa diakses ulang dengan cepat tanpa mencarinya lagi.",
    features: [
      {
        title: "Akses 1-Klik",
        description:
          "Semua materi favorit terkumpul rapi di satu tempat khusus.",
      },
      {
        title: "Kelola Koleksi Kapan Saja",
        description:
          "Klik ikon hati di kartu materi untuk menambah atau melepas dari Favorites.",
      },
    ],
    defaultBubble:
      "Ini rak materi favorit kamu! Simpan kelas penting di sini biar gampang dibuka lagi.",
    faqs: [
      {
        question: "Kenapa daftar Favorites masih kosong?",
        answer:
          "Buka tab Katalog lalu klik ikon hati pada kelas atau materi yang ingin kamu simpan di sini.",
        reactionMood: "happy",
      },
      {
        question: "Apakah akses Favorites butuh paket khusus?",
        answer:
          "Ketersediaan tab Favorites & Catatan mengikuti pengaturan paket aktif dan Admin Studio.",
        reactionMood: "focused",
      },
    ],
  },

  "learner:tools": {
    contextId: "learner:tools",
    pageTitle: "Tools You Need (Web Apps)",
    badge: "Ekosistem Tool",
    summary:
      "Kumpulan web app pendukung belajar & kerja pilihan dari Ruang Sosmed. Ada yang gratis langsung pakai, khusus member PRO, maupun berbayar satuan via Poin Bintang atau QRIS.",
    features: [
      {
        title: "Langsung Buka di Tab Baru",
        description:
          "Tool yang sudah terbuka bisa langsung kamu jalankan di tab browser baru tanpa membebani portal belajar.",
      },
      {
        title: "Buka Pakai Poin ★ atau QRIS",
        description:
          "Tool berbayar terpisah bisa ditebus langsung pakai Poin Bintang hasil belajar atau melalui QRIS / Transfer.",
      },
    ],
    defaultBubble:
      "Butuh alat bantu kerja biar makin sat-set? Cek koleksi Tools You Need di sini!",
    faqs: [
      {
        question: "Bagaimana cara membuka tool yang masih terkunci?",
        answer:
          "Untuk tool berlabel PRO, aktifkan paket PRO terlebih dahulu. Untuk tool berbayar satuan, klik Buka Akses lalu pilih tukar Poin Bintang atau bayar QRIS/Transfer.",
        reactionMood: "happy",
      },
      {
        question: "Apakah tool berbayar satuan otomatis gratis di PRO?",
        answer:
          "Tidak selalu — tool berbayar satuan dibuka terpisah per item menggunakan Poin Bintang atau pembayaran QRIS/Transfer.",
        reactionMood: "focused",
      },
    ],
  },

  "learner:profile": {
    contextId: "learner:profile",
    pageTitle: "Profil & Pengaturan Akun",
    badge: "Personal & Rumi",
    summary:
      "Kelola data diri, foto profil, keahlian, sekaligus atur sendiri perilaku Rumi Assistant (waktu idle ngintip, ukuran, dan balon sapaan)!",
    features: [
      {
        title: "Detail Profil & Avatar",
        description:
          "Perbarui nama, foto profil, dan informasi latar belakang belajar kamu.",
      },
      {
        title: "Pengaturan Rumi Assistant",
        description:
          "Buka tab Profile Settings untuk atur berapa detik Rumi idle sebelum ngintip di pojok layar.",
      },
      {
        title: "Sinkronisasi Otomatis",
        description:
          "Perubahan profil dan preferensi Rumi langsung berlaku di seluruh halaman.",
      },
    ],
    defaultBubble:
      "Kamu lagi di halaman Profil! Di tab Profile Settings kamu bisa atur ukuran & waktu ngintip aku lho~",
    faqs: [
      {
        question: "Di mana atur waktu idle Rumi ngintip?",
        answer:
          "Buka menu Settings / Profile Settings di halaman ini, lalu gulir ke bagian 'Pengaturan Rumi Assistant' — kamu bisa isi detik sesuka hati dan tes langsung!",
        reactionMood: "excited",
      },
      {
        question: "Cara ganti foto profil akun?",
        answer:
          "Masuk ke Profile Settings, pilih avatar bawaan atau unggah fotomu sendiri, lalu klik Save.",
        reactionMood: "happy",
      },
      {
        question: "Apakah pengaturan Rumi berlaku untuk akun lain?",
        answer:
          "Tidak, preferensi Rumi tersimpan khusus per akun di browser ini sehingga setiap user bisa mengatur kenyamanannya sendiri.",
        reactionMood: "focused",
      },
    ],
  },

  "admin:home": {
    contextId: "admin:home",
    pageTitle: "Admin Studio Home",
    badge: "Superior Sovereign",
    summary:
      "Pusat komando mentor & admin: pantau materi aktif, member, antrean review, konfirmasi pembayaran PRO, dan tombol buat konten cepat.",
    features: [
      {
        title: "Pusat Aksi Mentor",
        description:
          "Lihat antrean kuis perlu dinilai, diskusi terbaru, kendala materi, dan pembayaran pending.",
      },
      {
        title: "Kontrol PRO & Pembayaran",
        description:
          "Cek bukti transfer siswa dan aktifkan keanggotaan PRO secara instan.",
      },
      {
        title: "Pembuat Konten Cepat",
        description:
          "Klik Course, Page, Assignment, Quiz, Learning Path, atau Wiki di strip atas.",
      },
    ],
    defaultBubble:
      "Selamat bekerja, Admin! Superior Rumi siap bantu pantau antrean & kesehatan studio hari ini.",
    faqs: [
      {
        question: "Bagaimana cek member yang baru upload bukti bayar?",
        answer:
          "Lihat kartu 'Langganan PRO & Pembayaran' di Beranda atau buka direktori Learners untuk meninjau & approve bukti transfer.",
        reactionMood: "focused",
      },
      {
        question: "Cara buat kode akses PRO berdurasi bebas?",
        answer:
          "Buka Settings → Kode Akses Premium! Anda bisa atur sendiri durasi per Hari atau Bulan lengkap dengan kuota.",
        reactionMood: "excited",
      },
      {
        question: "Apa arti badge kendala di Pusat Aksi Mentor?",
        answer:
          "Itu laporan kendala langsung dari Classroom siswa sehingga bisa segera diperbaiki dari editor konten.",
        reactionMood: "reminder",
      },
    ],
  },

  "admin:analytics": {
    contextId: "admin:analytics",
    pageTitle: "Analitik Studio & Progres",
    badge: "Live Supabase Data",
    summary:
      "Pantau metrik riil pembelajaran siswa: progres course per member, nilai rata-rata kuis, poin mastery, matriks jawaban kuis, dan kelayakan sertifikat.",
    features: [
      {
        title: "Most Active Learners & Progres",
        description:
          "Data disinkronkan langsung dari enrollments, submissions, dan poin akun Supabase.",
      },
      {
        title: "Quiz Report Matrix",
        description:
          "Inspeksi akurasi tiap nomor soal per siswa dan ekspor tabel ke CSV kapan saja.",
      },
    ],
    defaultBubble:
      "Halaman Analitik memuat data live dari Supabase! Kamu bisa cek matriks kuis & progres member di sini.",
    faqs: [
      {
        question: "Dari mana angka di halaman ini berasal?",
        answer:
          "Seluruh data dihitung real-time dari tabel profiles, enrollments, submissions, dan konten studio — bukan data dummy.",
        reactionMood: "focused",
      },
      {
        question: "Cara unduh laporan progres ke Excel/CSV?",
        answer:
          "Klik tombol 'Download Table CSV' di kanan atas tabel peserta.",
        reactionMood: "happy",
      },
    ],
  },

  "admin:content": {
    contextId: "admin:content",
    pageTitle: "Explorer Konten & Folder",
    badge: "Kurikulum Studio",
    summary:
      "Kelola seluruh folder cohort, Course, Wiki SOP, Quiz, kode akses folder, penugasan learner, hingga editor bab interaktif.",
    features: [
      {
        title: "Project Hub & Folder Warna",
        description:
          "Atur kode akses tiap folder, warna, dan urutan agar rapi saat dibuka siswa.",
      },
      {
        title: "Editor Bab & Diskusi",
        description:
          "Masuk ke detail konten untuk edit video/teks, kelola diskusi, atau tugaskan ke learner.",
      },
    ],
    defaultBubble:
      "Ini Explorer Konten! Semua folder kelas, materi video, kuis, dan Wiki dikelola dari sini.",
    faqs: [
      {
        question: "Cara set kode akses untuk satu folder kelas?",
        answer:
          "Klik Edit / pengaturan folder lalu isi Access Code (misal MBI-2026); siswa yang memasukkan kode otomatis mendapat seluruh isi folder.",
        reactionMood: "happy",
      },
      {
        question: "Kenapa beberapa konten punya label PRO vs Free?",
        answer:
          "Anda dapat mengatur bab atau konten mana yang terbuka gratis untuk preview dan mana yang khusus member berbayar.",
        reactionMood: "focused",
      },
    ],
  },

  "admin:learners": {
    contextId: "admin:learners",
    pageTitle: "Direktori Member & Akses PRO",
    badge: "User Management",
    summary:
      "Kelola seluruh akun learner: verifikasi pembayaran PRO, perpanjang atau cabut paket manual, atur poin, kirim email reset password, dan undang kolaborator.",
    features: [
      {
        title: "Kontrol Langganan & Tanggal Jatuh Tempo",
        description:
          "Grant PRO instan, lihat tanggal mulai/habis, atau tinjau bukti bayar pending.",
      },
      {
        title: "Atur Poin & Password",
        description:
          "Sesuaikan poin learner (sinkron real-time ke Portal Siswa) atau bantu reset kata sandi.",
      },
    ],
    defaultBubble:
      "Di Direktori Member Anda bisa cek member PRO, set poin, dan setujui bukti bayar.",
    faqs: [
      {
        question: "Apakah ubah poin di sini langsung berubah di akun siswa?",
        answer:
          "Ya! Perubahan poin di Direktori Member tersinkron ke profil Supabase & langsung tampil di portal belajar siswa.",
        reactionMood: "excited",
      },
      {
        question: "Bagaimana kalau ada permintaan reset password member?",
        answer:
          "Klik anggota tersebut untuk membuka laci detail, lalu gunakan Reset Password Supabase (mengarah ke ruangsosmedid.com) atau atur langsung.",
        reactionMood: "focused",
      },
    ],
  },

  "admin:inbox": {
    contextId: "admin:inbox",
    pageTitle: "Mentor Inbox & Diskusi",
    badge: "Komunikasi Siswa",
    summary:
      "Tanggapi pertanyaan diskusi siswa per bab, review kiriman tugas/esai kuis, dan tindak lanjuti laporan kendala konten di satu inbox terpadu.",
    features: [
      {
        title: "Balas Pertanyaan Siswa",
        description:
          "Balasan mentor langsung muncul di dalam tab Diskusi Classroom milik siswa.",
      },
      {
        title: "Tindak Lanjut Kendala Materi",
        description:
          "Tandai laporan kendala sebagai selesai setelah konten diperbaiki.",
      },
    ],
    defaultBubble:
      "Cek Mentor Inbox agar pertanyaan diskusi siswa dan kendala materi cepat terbalas!",
    faqs: [
      {
        question: "Apakah balasan di sini mengirim notifikasi ke siswa?",
        answer:
          "Ya, saat Anda membalas atau menilai, sistem mencatat pembaruan di thread diskusi serta notifikasi akun siswa.",
        reactionMood: "happy",
      },
      {
        question: "Mana yang lebih baik untuk nilai kuis esai?",
        answer:
          "Anda bisa langsung masuk ke Grading Center dari Inbox atau Admin Home.",
        reactionMood: "focused",
      },
    ],
  },

  "admin:certificates": {
    contextId: "admin:certificates",
    pageTitle: "Certificate Studio",
    badge: "Desain Sertifikat",
    summary:
      "Kustomisasi tampilan sertifikat resmi kelulusan Ruang Sosmed: logo, tanda tangan mentor, prefix nomor kredensial, dan gaya per kelas.",
    features: [
      {
        title: "Live Preview Sertifikat",
        description:
          "Lihat pratinjau ukuran penuh sertifikat sebelum disimpan untuk semua lulusan.",
      },
      {
        title: "Pengaturan Global atau Per-Course",
        description:
          "Bedakan desain sertifikat tiap program kelas jika dibutuhkan.",
      },
    ],
    defaultBubble:
      "Atur desain sertifikat resmi lulusan Anda di Certificate Studio!",
    faqs: [
      {
        question: "Bagaimana format nomor sertifikat bekerja?",
        answer:
          "Sistem otomatis menggabungkan prefix resmi (misal RS2-2026) dengan kode unik tiap learner untuk verifikasi.",
        reactionMood: "focused",
      },
      {
        question: "Bisakah tanda tangan dan judul mentor diganti?",
        answer:
          "Bisa langsung disesuaikan di panel studio ini lalu simpan perubahan.",
        reactionMood: "happy",
      },
    ],
  },

  "admin:rewards": {
    contextId: "admin:rewards",
    pageTitle: "Rewards Manager",
    badge: "Katalog Hadiah Poin",
    summary:
      "Buat dan kelola hadiah yang dapat ditukarkan oleh siswa menggunakan Poin Bintang hasil belajar dan penyelesaian kelas.",
    features: [
      {
        title: "Katalog Hadiah Fleksibel",
        description:
          "Tentukan nama hadiah, jumlah poin yang dibutuhkan, deskripsi, dan kuota klaim.",
      },
      {
        title: "Pantau Riwayat Klaim",
        description:
          "Lihat siswa mana saja yang telah menukarkan poin mereka.",
      },
    ],
    defaultBubble:
      "Rewards Manager siap! Tambahkan hadiah menarik agar siswa makin semangat kumpulkan poin.",
    faqs: [
      {
        question: "Dari mana siswa mendapat poin untuk klaim reward?",
        answer:
          "Dari menyelesaikan bab di Classroom, aktivitas belajar, atau pemberian poin langsung oleh Admin.",
        reactionMood: "excited",
      },
      {
        question: "Bisakah hadiah dinonaktifkan sementara?",
        answer:
          "Ya, Anda dapat mengedit, menonaktifkan, atau menghapus item hadiah kapan saja.",
        reactionMood: "happy",
      },
    ],
  },

  "admin:history": {
    contextId: "admin:history",
    pageTitle: "Riwayat & Log Aktivitas Studio",
    badge: "Audit Trail",
    summary:
      "Pantau log aktivitas dan riwayat perubahan versi konten di workspace Studio untuk pelacakan dan pemulihan.",
    features: [
      {
        title: "Log Perubahan Konten",
        description:
          "Lihat siapa dan kapan pembaruan penting terjadi di studio.",
      },
      {
        title: "Restore Versi Sebelumnya",
        description:
          "Kembalikan versi catatan/konten bila diperlukan dari daftar riwayat.",
      },
    ],
    defaultBubble:
      "Di halaman Riwayat Anda bisa melihat catatan versi dan aktivitas perubahan di studio.",
    faqs: [
      {
        question: "Apakah konten terhapus bisa dipulihkan?",
        answer:
          "Konten yang diarsipkan tersimpan di tab Archive, sedangkan versi terdahulu dapat dicek di sini.",
        reactionMood: "focused",
      },
    ],
  },

  "admin:archive": {
    contextId: "admin:archive",
    pageTitle: "Arsip Konten (Archive)",
    badge: "Disembunyikan",
    summary:
      "Berisi materi, kelas, atau Wiki yang sedang diarsipkan sehingga tidak tampil di Katalog siswa namun tetap aman tersimpan.",
    features: [
      {
        title: "Pulihkan ke Katalog",
        description:
          "Aktifkan kembali konten arsip kapan saja saat ingin ditayangkan lagi ke siswa.",
      },
      {
        title: "Hapus Permanen",
        description:
          "Bersihkan item lama yang benar-benar tidak dipakai lagi.",
      },
    ],
    defaultBubble:
      "Konten di Archive tidak muncul di sisi siswa, tapi bisa dipulihkan kapan saja!",
    faqs: [
      {
        question: "Apakah siswa bisa melihat konten di Archive?",
        answer:
          "Tidak, semua item berstatus archived otomatis disaring keluar dari Portal Learner.",
        reactionMood: "happy",
      },
    ],
  },

  "admin:landing-builder": {
    contextId: "admin:landing-builder",
    pageTitle: "Landing Page Builder",
    badge: "Publik & Konversi",
    summary:
      "Desain dan atur konten halaman depan publik ruangsosmedid.com: headline, blok fitur, harga paket, testimoni, dan footer.",
    features: [
      {
        title: "Editor Blok Visual",
        description:
          "Ubah teks, urutan seksi, dan CTA halaman depan langsung tanpa coding.",
      },
      {
        title: "Pratinjau & Publikasikan",
        description:
          "Simpan konfigurasi landing page agar langsung tampil bagi pengunjung baru.",
      },
    ],
    defaultBubble:
      "Di Landing Builder Anda bisa perbarui tampilan halaman utama website untuk calon member!",
    faqs: [
      {
        question: "Apakah perubahan langsung tampil ke pengunjung?",
        answer:
          "Ya, setelah menekan simpan, pengunjung yang membuka halaman utama langsung melihat pembaruan terbaru.",
        reactionMood: "excited",
      },
    ],
  },

  "admin:settings": {
    contextId: "admin:settings",
    pageTitle: "Pengaturan Studio & PRO",
    badge: "Konfigurasi Sistem",
    summary:
      "Atur paket & benefit PRO, buat Kode Akses Premium (Hari/Bulan), unggah QRIS & rekening bayar, hubungkan Bot Telegram, hingga mode Under Construction.",
    features: [
      {
        title: "Kelola Paket & Kode Akses Premium",
        description:
          "Buka menu Kode Akses Premium untuk bikin kode berdurasi hari atau bulan sesuka hati.",
      },
      {
        title: "QRIS, Pembayaran & Halaman Siswa",
        description:
          "Atur rekening bank, tampilan tab Wiki/Favorites siswa, serta pesan modal upgrade.",
      },
      {
        title: "Bot Telegram & Maintenance",
        description:
          "Hubungkan notifikasi real-time Telegram atau aktifkan halaman 404 sementara.",
      },
    ],
    defaultBubble:
      "Semua pengaturan inti — dari Kode Akses Premium sampai Bot Telegram — ada di halaman ini!",
    faqs: [
      {
        question: "Cara bikin kode akses premium berdurasi hari atau bulan?",
        answer:
          "Klik menu 'Kode Akses Premium' di sidebar kiri Pengaturan, isi nama kode, angka durasi + pilih Hari atau Bulan, lalu klik Buat Kode Premium!",
        reactionMood: "excited",
      },
      {
        question: "Apakah perubahan paket otomatis mempengaruhi Portal Siswa?",
        answer:
          "Ya, seluruh harga, benefit, dan QRIS langsung tersinkron ke modal Upgrade di Portal Siswa setelah disimpan.",
        reactionMood: "happy",
      },
    ],
  },

  "admin:profile": {
    contextId: "admin:profile",
    pageTitle: "Profil Admin & Pengaturan Rumi",
    badge: "Akun & Preferensi",
    summary:
      "Perbarui identitas profil Admin Anda sekaligus atur perilaku Rumi Assistant (waktu idle ngintip ke sisi layar, ukuran, dan balon sapaan).",
    features: [
      {
        title: "Identitas & Avatar Admin",
        description:
          "Foto dan nama tampil di header studio serta tanda tangan komunikasi.",
      },
      {
        title: "Pengaturan Rumi Assistant",
        description:
          "Klik Settings / Profile Settings untuk atur detik idle sebelum Rumi bersembunyi di sisi kanan layar.",
      },
    ],
    defaultBubble:
      "Di Profil Admin kamu juga bisa atur sendiri waktu idle & ukuran Superior Rumi Assistant!",
    faqs: [
      {
        question: "Di mana atur waktu idle & mode ngintip Rumi?",
        answer:
          "Buka tampilan Profile Settings / tombol Settings di profil ini, lalu atur 'Pengaturan Rumi Assistant' sesuai seleramu.",
        reactionMood: "excited",
      },
      {
        question: "Apakah perubahan ukuran Rumi berlaku di Admin & Learner?",
        answer:
          "Ya! Preferensi Rumi disimpan per akun dan otomatis mengikuti akunmu di mode apa pun.",
        reactionMood: "happy",
      },
    ],
  },
};

export function getRumiPageGuide(
  contextId: RumiPageContextId,
  subtitle?: string | null
): RumiPageGuide {
  const base = GUIDE_MAP[contextId] || GUIDE_MAP["learner:home"];
  if (!subtitle) return base;
  return {
    ...base,
    badge: subtitle,
  };
}

function diffDaysBetweenIso(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

const STUDY_ACTIVITY_TYPES = new Set([
  "chapter_complete",
  "course_complete",
  "quiz_submit",
  "lesson_note",
]);

export function computeDaysSinceLastStudy(
  xpState?: RumiXpProfileState | null
): number | null {
  if (!xpState) return null;
  const todayIso = getTodayIsoDate();

  let latestStudyIso: string | null = null;
  for (const ev of xpState.events || []) {
    if (!STUDY_ACTIVITY_TYPES.has(ev.type)) continue;
    const evIso = toIsoDateString(ev.createdAt);
    if (evIso && (!latestStudyIso || evIso > latestStudyIso)) {
      latestStudyIso = evIso;
    }
  }

  if (latestStudyIso) {
    return Math.max(0, diffDaysBetweenIso(latestStudyIso, todayIso));
  }

  const lastLoginIso = toIsoDateString(xpState.lastLoginDate);
  if (lastLoginIso) {
    return Math.max(0, diffDaysBetweenIso(lastLoginIso, todayIso));
  }

  return null;
}

export function computeRumiLiveMood(params: {
  roleMode: "learner" | "admin";
  contextId: RumiPageContextId;
  xpState?: RumiXpProfileState | null;
  proDaysRemaining?: number | null;
  adminAlerts?: RumiAdminAlerts;
}): RumiLiveMoodResult {
  const guide = getRumiPageGuide(params.contextId);

  if (params.roleMode === "admin") {
    const a = params.adminAlerts || {};
    const pendingPayments = a.pendingPayments || 0;
    const pendingGrading = a.pendingGrading || 0;
    const unreadDiscussions = a.unreadDiscussions || 0;
    const openIssues = a.openIssues || 0;
    const totalAlerts =
      pendingPayments + pendingGrading + unreadDiscussions + openIssues;

    if (totalAlerts > 0) {
      const parts: string[] = [];
      if (pendingPayments > 0) parts.push(`${pendingPayments} pembayaran pending`);
      if (pendingGrading > 0) parts.push(`${pendingGrading} kuis perlu nilai`);
      if (unreadDiscussions > 0) parts.push(`${unreadDiscussions} diskusi baru`);
      if (openIssues > 0) parts.push(`${openIssues} kendala terbuka`);
      return {
        mood: "reminder",
        statusLabel: `${totalAlerts} Perlu Cek`,
        bubbleMessage: `Ada ${parts.slice(0, 2).join(" & ")} yang menunggu ditinjau mentor hari ini!`,
        daysSinceLastStudy: null,
      };
    }

    if (
      params.contextId === "admin:analytics" ||
      params.contextId === "admin:settings" ||
      params.contextId === "admin:landing-builder" ||
      params.contextId === "admin:content"
    ) {
      return {
        mood: "focused",
        statusLabel: "Studio Fokus",
        bubbleMessage: guide.defaultBubble,
        daysSinceLastStudy: null,
      };
    }

    return {
      mood: "excited",
      statusLabel: "Studio Lancar",
      bubbleMessage: guide.defaultBubble,
      daysSinceLastStudy: null,
    };
  }

  // Learner Mode Live Mood Engine
  const daysSinceLastStudy = computeDaysSinceLastStudy(params.xpState);

  if (daysSinceLastStudy !== null && daysSinceLastStudy >= 3) {
    return {
      mood: "sleepy",
      statusLabel: "Kangen Belajar",
      bubbleMessage: `Udah ${daysSinceLastStudy} hari nggak belajar bareng nih, Rumi kangen! Yuk lanjut 1 bab sebentar~`,
      daysSinceLastStudy,
    };
  }

  if (
    params.proDaysRemaining !== null &&
    params.proDaysRemaining !== undefined &&
    params.proDaysRemaining >= 0 &&
    params.proDaysRemaining <= 3
  ) {
    return {
      mood: "reminder",
      statusLabel: "Pengingat PRO",
      bubbleMessage:
        params.proDaysRemaining === 0
          ? "Paket PRO kamu habis hari ini! Yuk perpanjang atau tukar kode akses biar belajar nggak kepotong."
          : `Paket PRO tinggal ${params.proDaysRemaining} hari lagi! Siapkan perpanjangan atau kode aksesmu ya.`,
      daysSinceLastStudy,
    };
  }

  if ((params.xpState?.loginStreak ?? 0) >= 3) {
    return {
      mood: "excited",
      statusLabel: `Streak ${params.xpState?.loginStreak} Hari`,
      bubbleMessage:
        params.contextId === "learner:home"
          ? `Keren! Streak login kamu ${params.xpState?.loginStreak} hari berturut-turut, Rumi semangat banget!`
          : guide.defaultBubble,
      daysSinceLastStudy,
    };
  }

  if (
    params.contextId === "learner:classroom" ||
    params.contextId === "learner:quiz-runner" ||
    params.contextId === "learner:course-overview"
  ) {
    return {
      mood: "focused",
      statusLabel: "Mode Belajar",
      bubbleMessage: guide.defaultBubble,
      daysSinceLastStudy,
    };
  }

  return {
    mood: "happy",
    statusLabel: "Siap Membantu",
    bubbleMessage: guide.defaultBubble,
    daysSinceLastStudy,
  };
}
