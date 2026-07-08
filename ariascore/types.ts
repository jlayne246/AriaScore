export type RootStackParamList = {
  Library: {
    pendingImport?: {
      uri: string;
      originalFilename: string;
    };
  };
  Reader: {
    uri: string;
    musicId: number;
    context?: {
      setlistId: number;
      setlistName: string;
      currentIndex: number;
      totalItems: number;
      musicIds: number[];
    };
    startPage?: number;
  };
  Dashboard: undefined;
  Setlists: undefined;
  SetlistDetail: {
    setlistId: number;
  };
  Settings: undefined;
  SetlistSettings: {
    setlistId: number;
  }
  MusicSettings: {
    musicId: number;
    setlistId?: number;
  };
  About: undefined;
  Backups: undefined;
  OpenSourceLicenses: undefined;
};

// Define types for music items
export interface MusicItem {
  id?: number;
  title: string;
  uri: string;
  original_filename: string;
  created_at: string;
  last_opened_at?: string;
}

// Define types for music item metadata
export interface MusicMetadata {
  id?: number;
  title: string;
  document_type: string;
  composer: string;
  arranger: string;
  editor: string;
  publisher: string;
  genre: string;
  key_signature: string;
  time_signature: string;
  page_count: number;
  created_at: string;
  updated_at: string;
}

// Define types for labels
export interface Label {
  id: number;
  name: string;
  colour?: string;
}

export interface MusicMetadataWithLabels extends MusicMetadata {
  labels: string[];
  // setlists: string[];
}

export type MusicItemWithAllData = MusicItem & {
  setlists: string[];
  metadata?: MusicMetadataWithLabels | null;
};

// Define types for the setlists
export interface Setlist {
    id: number;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

// Updated interface to include all metadata
export interface MetadataFormData {
  title: string;
  setlists: string[];
  // Add all the metadata fields
  composer?: string;
  arranger?: string;
  editor?: string;
  publisher?: string;
  document_type: string;
  genre?: string;
  key_signature?: string;
  time_signature?: string;
  page_count?: number;
  labels?: string[];
}

export type Bookmark = {
  id: number;
  page_number: number;
  label?: string;
};

export type ScoreInfo = {
  id?: number;
  title?: string;
  composer?: string;
  arranger?: string;
  publisher?: string;
  category?: string;
  notes?: string;
  labels?: string[];
  setlists?: string[];
};

export const DOCUMENT_TYPES = [
  "Single Work",
  "Collection",
  "Service Book",
  "Hymnal",
  "Method Book",
];

export type ScoreMetadata = {
  title: string;
  document_type: string;
  composer?: string;
  editor?: string;
  arranger?: string;
  publisher?: string;
  notes?: string;
  labels?: string[];
};

export type ReaderContext = {
  setlistId: number;
  setlistName: string;
  setlistDescription?: string;
  currentIndex: number;
  totalItems: number;
  musicIds: number[];
};

export const ACCENT_COLOR = '#2563EB';

export const COLORS = {
  accent: ACCENT_COLOR,
  accentLight: "#93C5FD",
  accentVeryLight: "#DBEAFE",

  text: "#111827",
  secondaryText: "#6B7280",

  border: "#E5E7EB",
  background: "#FFFFFF",
  pageBackground: "#F9FAFB",
};

export const GENRE_OPTIONS = [
  "Organ",
  "Hymn",
  "Psalm",
  "Choral Anthem",
  "Carol",
  "Canticle",
  "Service Music",
  "Mass Setting",
  "Motet",
  "Oratorio",
  "Sacred Solo",
  "Instrumental",
  "Contemporary Worship",
  "General Sacred",
  "Psalm Chant",
  "Hymn Reharmonisation"
];

export type SetlistSummary = {
  id: number;
  name: string;
  description?: string | null;
  item_count: number;
  total_pages: number;
  created_at?: string | null;
  updated_at?: string | null;
  last_opened_at?: string | null;
};

export const qualityScaleMap = {
    standard: 2.0,
    high: 2.5,
    ultra: 3.0,
};

export const maxRenderSizeCap = {
    standard: {
      width: 1800,
      height: 2500
    },
    high: {
      width: 2400,
      height: 3300
    },
    ultra: {
      width: 2800,
      height: 3900
    },
};

// export const qualityConfig = {
//   standard: { scale: 1.6, maxWidth: 1800 },
//   high: { scale: 2.1, maxWidth: 2400 },
//   ultra: { scale: 2.5, maxWidth: 3000 },
// } as const;