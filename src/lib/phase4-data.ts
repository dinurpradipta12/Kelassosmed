export type QuestionType =
  | "Multiple choice"
  | "Fill in the blank"
  | "Hotspot / Image-based"
  | "Categorization"
  | "Open-ended essay";

export interface MultipleChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
  imageLabel?: string;
}

export interface HotspotZone {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  label: string;
}

export interface CategorizationGroup {
  id: string;
  categoryName: string;
  items: string[];
}

export interface QuizQuestionItem {
  id: string;
  type: QuestionType;
  prompt: string;
  required: boolean;
  choiceOrder: "Keep choices in current order" | "Randomize choices";
  timerMins: number;
  weightPoints: number;
  stemMediaType: "none" | "image" | "video" | "audio";
  stemMediaLabel?: string;
  // Multiple Choice specific
  multipleCorrect: boolean;
  answerWithImage: boolean;
  options: MultipleChoiceOption[];
  // Fill in the blank specific
  fillBlankSentence: string;
  // Hotspot specific
  hotspotZone: HotspotZone;
  // Categorization specific
  categories: CategorizationGroup[];
  // Open-ended specific
  rubricGuidelines: string;
}

export const INITIAL_QUIZ_QUESTIONS: QuizQuestionItem[] = [];

export interface GradingSubmissionItem {
  id: string;
  submissionType: "Quiz" | "Assignment";
  title: string;
  submittedAt: string;
  status: "Pending Evaluation" | "Passed" | "Revision Requested";
  learner: {
    name: string;
    role: string;
    cohort: string;
    initials: string;
    avatarBg: string;
    avatarText: string;
  };
  questionsAndAnswers: {
    id: string;
    questionTitle: string;
    maxPoints: number;
    awardedPoints: number;
    learnerResponse: string;
    attachmentFile?: {
      name: string;
      size: string;
      url: string;
    };
    mentorRubric: string;
  }[];
  overallFeedback: string;
}

export const INITIAL_GRADING_SUBMISSIONS: GradingSubmissionItem[] = [
  {
    id: "sub-1",
    submissionType: "Quiz",
    title: "Meta Ads Campaign Audit",
    submittedAt: "Submitted 18 mins ago",
    status: "Pending Evaluation",
    learner: {
      name: "Raka Pratama",
      role: "Social Media Specialist",
      cohort: "Batch Oktober 2026",
      initials: "RP",
      avatarBg: "#EEF2FF",
      avatarText: "#4F39F6",
    },
    questionsAndAnswers: [
      {
        id: "qa-1",
        questionTitle:
          "Q1 (Open-Ended): Diagnose why CPA rose 42% while Thumbstop Ratio stayed at 41%.",
        maxPoints: 25,
        awardedPoints: 23,
        learnerResponse:
          "Because the 3-second Thumbstop Ratio is healthy at 41%, the hook is working well. The bottleneck is happening post-hook (between seconds 4–15) or on the Shopee/TikTok Shop landing page. I would inspect Outbound CTR vs Landing Page View rate first: if Outbound CTR is >1.5%, the landing page offer or load speed is causing the 42% CPA spike.",
        mentorRubric:
          "Must distinguish between top-of-video hook metrics (Thumbstop) and post-click conversion rate.",
      },
      {
        id: "qa-2",
        questionTitle:
          "Q2 (Open-Ended): Propose a 3:2:2 Creative Testing structure for a Rp 15,000,000 weekly budget.",
        maxPoints: 25,
        awardedPoints: 22,
        learnerResponse:
          "Allocate 70% (Rp 10.5M) to the scaling CBO campaign with proven winners, and 30% (Rp 4.5M) to an ABO testing campaign running 3 visual angles, 2 hook variations, and 2 primary text copies with a 2x target CPA stop-loss rule after 4,000 impressions.",
        mentorRubric:
          "Check for 70/30 budget split and clear impression/CPA stop-loss rule.",
      },
    ],
    overallFeedback:
      "Excellent diagnostic breakdown, Raka! Your distinction between 3s Thumbstop and Outbound CTR vs Landing Page View rate is spot-on.",
  },
  {
    id: "sub-2",
    submissionType: "Quiz",
    title: "TikTok Shop Hook & Retention Strategy",
    submittedAt: "Submitted 1 hour ago",
    status: "Pending Evaluation",
    learner: {
      name: "Nadia Putri",
      role: "Content Creator",
      cohort: "Batch Oktober 2026",
      initials: "NP",
      avatarBg: "#FDF2F8",
      avatarText: "#DB2777",
    },
    questionsAndAnswers: [
      {
        id: "qa-201",
        questionTitle:
          "Q1 (Open-Ended): Write 3 high-retention Bahasa Indonesia verbal hooks for a Vitamin C Serum launch.",
        maxPoints: 30,
        awardedPoints: 28,
        learnerResponse:
          "1. 'Stop beli serum Vitamin C kalau kulit kamu masih kusam jam 2 siang—ini alasan ilmiahnya.'\n2. 'Eksperimen 14 hari pakai 2 tetes serum lokal vs brand Rp 800 ribu di bawah kamera UV.'\n3. 'Kesalahan nomor 1 waktu layer Vitamin C sama sunscreen yang bikin makeup pilling.'",
        mentorRubric:
          "Hooks must include a clear pattern interrupt, specific timeframe/number, and relatable pain point.",
      },
    ],
    overallFeedback:
      "Hook #2 with the UV camera comparison is highly visual and ready for production.",
  },
  {
    id: "sub-3",
    submissionType: "Assignment",
    title: "Audit Akun Instagram & Bio Optimization",
    submittedAt: "Submitted 3 hours ago",
    status: "Pending Evaluation",
    learner: {
      name: "Bima Sakti",
      role: "Performance Marketer",
      cohort: "Meta Ads Bootcamp",
      initials: "BS",
      avatarBg: "#ECFDF5",
      avatarText: "#059669",
    },
    questionsAndAnswers: [
      {
        id: "qa-301",
        questionTitle:
          "Capstone File & Link Submission: Full Instagram Profile Audit & 150-Character Bio Rewrite",
        maxPoints: 50,
        awardedPoints: 45,
        learnerResponse:
          "Submitted complete teardown of @kopisenja.id Instagram account. Rewrote line 1 for searchable niche keywords ('Specialty Roastery & Cold Brew Lab'), line 2 for social proof ('120,000+ Cans Sold across Jakarta'), and line 3 for single UTM WhatsApp/Shopee catalog CTA.",
        attachmentFile: {
          name: "Bima_Sakti_IG_Audit_KopiSenja_2026.pdf",
          size: "4.6 MB",
          url: "https://figma.com/file/ruang-sosmed-ig-audit-bima",
        },
        mentorRubric:
          "Verify keyword optimization in Name field, 3-line value proposition, and Highlight cover hierarchy.",
      },
    ],
    overallFeedback:
      "Strong SEO keyword placement in the Name field and clean Highlight restructure.",
  },
];
