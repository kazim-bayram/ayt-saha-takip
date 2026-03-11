import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'worker';

// Note status workflow (QA/QC approval)
export type NoteStatus = 'Eksik' | 'Onay';

// Legacy status types for backward compatibility
export type LegacyNoteStatus = 'open' | 'in_progress' | 'resolved' | 'rejected';

// Normalize legacy statuses to new Eksik/Onay system
export const normalizeStatus = (status: string | undefined): NoteStatus => {
  if (status === 'Onay' || status === 'resolved') return 'Onay';
  return 'Eksik'; // Default: open, in_progress, rejected, undefined → Eksik
};

export interface StatusConfig {
  key: NoteStatus;
  label: string;
  emoji: string;
  color: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  borderLight: string;
  borderDark: string;
}

export const NOTE_STATUS_CONFIG: Record<NoteStatus, StatusConfig> = {
  Eksik: {
    key: 'Eksik',
    label: 'Eksik',
    emoji: '🔴',
    color: 'red',
    bgLight: 'bg-red-100',
    bgDark: 'bg-red-600/20',
    textLight: 'text-red-700',
    textDark: 'text-red-300',
    borderLight: 'border-red-300',
    borderDark: 'border-red-600'
  },
  Onay: {
    key: 'Onay',
    label: 'Onay',
    emoji: '🟢',
    color: 'green',
    bgLight: 'bg-green-100',
    bgDark: 'bg-green-600/20',
    textLight: 'text-green-700',
    textDark: 'text-green-300',
    borderLight: 'border-green-300',
    borderDark: 'border-green-600'
  }
};

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt: Timestamp;
  isActive?: boolean; // For soft delete - false means disabled
  mustChangePassword?: boolean; // Force password change on first login
}

// Custom field for dynamic key-value pairs (legacy)
export interface CustomField {
  label: string;
  value: string;
}

// --- Dynamic Schema System (Admin-configurable form builder) ---

export type FormFieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'textarea' | 'checkbox';

export interface FormField {
  id: string;             // Unique key (e.g., "concrete_temp")
  label: string;          // Display label (e.g., "Beton Sıcaklığı")
  type: FormFieldType;
  required: boolean;
  options?: string[];     // For 'select' and 'multiselect' types
  order: number;
  placeholder?: string;   // Helper text inside inputs
  description?: string;   // Small info text below the input
  showInTable?: boolean;  // Show in table columns (default: false)
  showInFilter?: boolean; // Show in filter panels (default: false)
}

export interface NoteSchema {
  fields: FormField[];
  version: number;
}

export interface Note {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole?: UserRole;  // Track if admin or worker created the note
  // Multi-image support (new)
  imageUrls: string[];
  // Legacy single image field (for backward compatibility)
  imageUrl?: string;
  title?: string;  // Deprecated: kept for backward compatibility with legacy notes
  content: string;
  projectName: string;
  // --- Legacy flat fields (backward compatibility; prefer data for new notes) ---
  category?: string;
  date?: string;
  ada?: string;
  parsel?: string;
  customFields?: CustomField[];
  progressLevel?: string;
  // --- New schema-driven dynamic data bag ---
  /** Stores values keyed by FormField.id (schema-driven notes) */
  data?: Record<string, any>;
  // Status workflow (QA/QC: Eksik | Onay)
  status: NoteStatus;
  // Comments/Feedback system
  comments?: Comment[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lastEditedBy?: string;
  lastEditedByName?: string;
}

// Helper function to get images array with backward compatibility
export const getNoteImages = (note: Note): string[] => {
  if (note.imageUrls && note.imageUrls.length > 0) {
    return note.imageUrls;
  }
  if (note.imageUrl) {
    return [note.imageUrl];
  }
  return [];
};

export interface NoteFormData {
  content: string;
  projectName: string;
  category?: string;       // Legacy
  date?: string;           // Legacy
  ada?: string;
  parsel?: string;
  progressLevel?: string;
  status: NoteStatus;     // Eksik | Onay
  customFields?: CustomField[];
  images: File[];
  /** Schema-driven dynamic field values (keyed by FormField.id) */
  data?: Record<string, any>;
}

/** Schema-driven form data: core + dynamic data bag */
export interface NoteFormDataDynamic {
  content: string;
  projectName: string;
  status: NoteStatus;
  images: File[];
  /** Values keyed by FormField.id (schema fields) */
  data: Record<string, any>;
}

// Suggested category options for AddNoteModal
export const CATEGORY_OPTIONS = [
  'Kaba İşler',
  'İnce İşler',
  'Elektrik',
  'Mekanik',
  'Peyzaj',
  'İSG'
];

// Helper: get work date for display (date or createdAt fallback for legacy notes)
export const getWorkDate = (note: Note): string => {
  if (note.date) return note.date;
  const ts = note.createdAt?.toDate?.();
  if (ts) {
    const d = new Date(ts);
    return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return '';
};

// Format work date for display (DD.MM.YYYY)
export const formatWorkDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
};

/** Get value for a schema field from a note (supports legacy flat fields) */
export const getNoteFieldValue = (note: Note, fieldId: string): any => {
  if (note.data && fieldId in note.data) {
    return note.data[fieldId];
  }
  // Legacy mapping: schema field ids -> legacy flat fields
  const legacyMap: Record<string, keyof Note> = {
    category: 'category',
    date: 'date',
    ada: 'ada',
    parsel: 'parsel',
    progressLevel: 'progressLevel'
  };
  const key = legacyMap[fieldId] ?? fieldId;
  return (note as any)[key];
};

// Upload progress tracking
export interface UploadProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface FilterOptions {
  searchQuery: string;
  workerEmail: string;
  projectName: string;
  ada: string;
  parsel: string;
  progressLevel: string;  // Hakediş / Seviye filter
  status: string;  // '' | 'Eksik' | 'Onay'
  dateFrom: string;
  dateTo: string;
}

// Comment/Feedback system
export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  text: string;
  role: UserRole;
  createdAt: Timestamp | Date | string | number | null;
}

// --- Weekly Work Plan & Tracking ---

export type TaskStatus = 'Bekliyor' | 'Devam Ediyor' | 'Tamamlandı';

export type TaskCategoryColor =
  | 'bg-blue-100 text-blue-800'
  | 'bg-green-100 text-green-800'
  | 'bg-yellow-100 text-yellow-800'
  | 'bg-red-100 text-red-800'
  | 'bg-purple-100 text-purple-800';

export interface WeeklyTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  /** ISO week string, e.g. "2026-W08" */
  weekString: string;
  color: TaskCategoryColor;
  assignedTo: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  /** Finish-to-Start dependency: IDs of tasks that must complete before this one starts */
  dependencies?: string[];
  /** Planned effort in hours */
  estimatedHours?: number;
  /** Actual effort logged */
  actualHours?: number;
  /** Material cost in TRY */
  materialCosts?: number;
  /** Planned start date (ISO string) for Gantt/timeline */
  plannedStart?: string;
  /** Planned end date (ISO string) for Gantt/timeline */
  plannedEnd?: string;
}

export type TaskMessageType = 'comment' | 'system_log';

export interface TaskThreadMessage {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Timestamp;
  messageType: TaskMessageType;
  imageUrls?: string[];
  replyToId?: string | null;
  replyToSnippet?: string | null;
  /** When true the message is treated as an official RFI */
  isRFI?: boolean;
  /** Deadline by which the RFI must be answered */
  rfiResponseDeadline?: Timestamp | null;
  /** Timestamp when the RFI was answered */
  rfiRespondedAt?: Timestamp | null;
}

// ---------------------------------------------------------------------------
// Unified timeline item – merges tasks and legacy notes into one view
// ---------------------------------------------------------------------------

export type TimelineItemSource = 'task' | 'note';

export interface TimelineItem {
  id: string;
  source: TimelineItemSource;
  title: string;
  description: string;
  status: TaskStatus;
  date: Date;
  color: TaskCategoryColor;
  assignedTo: string;
  projectName: string;
  /** Original note reference (if source==='note') */
  noteRef?: Note;
  /** Original task reference (if source==='task') */
  taskRef?: WeeklyTask;
}

/** Map a legacy note to a TimelineItem so it can appear on the Kanban/calendar */
export const noteToTimelineItem = (note: Note): TimelineItem => {
  const date = note.createdAt?.toDate?.() ?? new Date();
  return {
    id: `note-${note.id}`,
    source: 'note',
    title: note.projectName || 'Saha Notu',
    description: note.content,
    status: note.status === 'Onay' ? 'Tamamlandı' : 'Bekliyor',
    date,
    color: note.status === 'Onay' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
    assignedTo: note.userName || note.userEmail,
    projectName: note.projectName,
    noteRef: note,
  };
};

export const taskToTimelineItem = (task: WeeklyTask): TimelineItem => {
  const date = task.createdAt?.toDate?.() ?? new Date();
  return {
    id: `task-${task.id}`,
    source: 'task',
    title: task.title,
    description: task.description,
    status: task.status,
    date,
    color: task.color,
    assignedTo: task.assignedTo,
    projectName: task.projectId,
    taskRef: task,
  };
};

