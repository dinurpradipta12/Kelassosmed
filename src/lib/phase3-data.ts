import { type ContentType } from "@/lib/design-tokens";

export interface EditorEmbeddedBlock {
  id: string;
  provider: string;
  title: string;
  url: string;
  displayMode: "Thumbnail" | "Mention" | "Link";
}

export interface EditorDatabaseRow {
  id: string;
  name: string;
  category: string;
  status: string;
  owner: string;
}

export interface EditorChapter {
  id: string;
  title: string;
  readingTime: string;
  points: string;
  bodyText: string;
  calloutText: string;
  videoMode: "upload" | "embed";
  videoUrl: string;
  videoFileName: string;
  imageCaption: string;
  imageZoomEnabled: boolean;
  attachments: {
    id: string;
    name: string;
    size: string;
    format: "PDF" | "NOTION" | "ZIP";
  }[];
  embeddedBlocks?: EditorEmbeddedBlock[];
  databaseRows?: EditorDatabaseRow[];
  hidden?: boolean;
  hideTextBlock?: boolean;
  hideCallout?: boolean;
  hideVideoBlock?: boolean;
  hideImageBlock?: boolean;
  hideAttachmentBlock?: boolean;
  hideEmbeddedBlock?: boolean;
  hideDatabaseBlock?: boolean;
  isPro?: boolean;
}

export interface EditorSection {
  id: string;
  title: string;
  hidden?: boolean;
  chapters: EditorChapter[];
}

export const INITIAL_EDITOR_SECTIONS: EditorSection[] = [
  {
    id: "sec-1",
    title: "Section 1: Pendahuluan",
    chapters: [
      {
        id: "ch-101",
        title: "Pengenalan Materi",
        readingTime: "10 mins",
        points: "10 pts",
        bodyText: "",
        calloutText: "",
        videoMode: "embed",
        videoUrl: "",
        videoFileName: "",
        imageCaption: "",
        imageZoomEnabled: false,
        attachments: [],
      },
    ],
  },
];

export interface LearningPathStageItem {
  id: string;
  title: string;
  type: ContentType;
  duration: string;
}

export interface LearningPathStage {
  id: string;
  title: string;
  subtitle: string;
  items: LearningPathStageItem[];
}

export const INITIAL_PATH_STAGES: LearningPathStage[] = [];

export const LIBRARY_CATALOG_ITEMS: LearningPathStageItem[] = [];

export type WikiCategory =
  | "Content Calendar Templates"
  | "Hook Library"
  | "Meta Ads SOPs"
  | "Social Media Research Reports";

export interface WikiResourceCard {
  id: string;
  title: string;
  category: WikiCategory;
  description: string;
  actionType: "download" | "external";
  actionLabel: string;
  actionUrl: string;
  lastUpdated: string;
  iconAccent: string;
}

export const WIKI_CATEGORIES: WikiCategory[] = [
  "Content Calendar Templates",
  "Hook Library",
  "Meta Ads SOPs",
  "Social Media Research Reports",
];

export const INITIAL_WIKI_RESOURCES: WikiResourceCard[] = [];
