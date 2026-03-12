import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { NoteSchema, TaskSchema, FormField } from '../types';

const SYSTEM_SETTINGS_COLLECTION = 'system_settings';
const NOTE_SCHEMA_DOC_ID = 'note_schema';
const TASK_SCHEMA_DOC_ID = 'task_schema';

/** Default schema for the note form */
export const DEFAULT_NOTE_SCHEMA: NoteSchema = {
  fields: [
    { id: 'ada_parsel', label: 'Ada/Parsel', type: 'text', required: false, placeholder: 'Örn: 123/5', order: 0 },
    {
      id: 'kategori',
      label: 'Kategori',
      type: 'select',
      required: true,
      options: [
        'OSB Genel', 'Veri Raporu', 'Geoteknik Raporu', 'Zemin İyileştirme',
        'İksa Projesi', 'Saha Testleri', 'Saha Uygulaması', 'OSB Toplantısı', 'Arazi Kontrolü'
      ],
      subOptions: {
        'OSB Genel': [],
        'Veri Raporu': [],
        'Geoteknik Raporu': [],
        'Zemin İyileştirme': [],
        'İksa Projesi': [],
        'Saha Testleri': [],
        'Saha Uygulaması': [],
        'OSB Toplantısı': [],
        'Arazi Kontrolü': []
      },
      order: 1,
      showInTable: true,
      showInFilter: true
    },
    { id: 'alt_kategori', label: 'Alt Kategori', type: 'select', required: false, options: [], order: 2, showInTable: true },
    { id: 'tarih', label: 'Tarih', type: 'date', required: true, order: 3 },
    { id: 'konu', label: 'Konu', type: 'text', required: false, placeholder: 'Konu başlığı', order: 4 },
    { id: 'not_mail_kopyasi', label: 'Not/Mail Kopyası', type: 'textarea', required: false, placeholder: 'Not veya mail içeriği...', order: 5 },
    { id: 'cevap', label: 'Cevap', type: 'textarea', required: false, placeholder: 'Cevap yazınız...', order: 6 }
  ],
  version: 2
};

/** Turkish char to ASCII mapping for slug generation */
const TR_CHARS: Record<string, string> = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', I: 'i', ö: 'o', Ö: 'o',
  ş: 's', Ş: 's', ü: 'u', Ü: 'u'
};

/** Generate slug/key from label with Turkish support (e.g., "Beton Sıcaklığı" -> "beton_sicakligi") */
export function labelToKey(label: string): string {
  let s = label.trim().toLowerCase();
  Object.entries(TR_CHARS).forEach(([tr, ascii]) => {
    s = s.replace(new RegExp(tr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ascii);
  });
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Fetch the current note schema from Firestore */
export async function getNoteSchema(): Promise<NoteSchema> {
  const ref = doc(db, SYSTEM_SETTINGS_COLLECTION, NOTE_SCHEMA_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return DEFAULT_NOTE_SCHEMA;
  }
  const data = snap.data();
  if (!data?.fields || !Array.isArray(data.fields)) {
    return DEFAULT_NOTE_SCHEMA;
  }
  return {
    fields: data.fields as FormField[],
    version: typeof data.version === 'number' ? data.version : 1
  };
}

/** Remove undefined values so Firestore accepts the document */
function stripUndefined<T>(value: T): T {
  if (value === undefined) return value;
  if (Array.isArray(value)) return value.map(stripUndefined) as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

/** Save the note schema to Firestore (Admin only - enforce in rules) */
export async function saveNoteSchema(schema: NoteSchema): Promise<void> {
  const ref = doc(db, SYSTEM_SETTINGS_COLLECTION, NOTE_SCHEMA_DOC_ID);
  const payload = stripUndefined({
    ...schema,
    updatedAt: new Date()
  });
  await setDoc(ref, payload as Record<string, unknown>);
}

/** Subscribe to schema changes (real-time) */
export function subscribeNoteSchema(callback: (schema: NoteSchema) => void): Unsubscribe {
  const ref = doc(db, SYSTEM_SETTINGS_COLLECTION, NOTE_SCHEMA_DOC_ID);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        callback(DEFAULT_NOTE_SCHEMA);
        return;
      }
      const data = snap.data();
      if (!data?.fields || !Array.isArray(data.fields)) {
        callback(DEFAULT_NOTE_SCHEMA);
        return;
      }
      callback({
        fields: data.fields as FormField[],
        version: typeof data.version === 'number' ? data.version : 1
      });
    },
    () => callback(DEFAULT_NOTE_SCHEMA)
  );
}

// ---------------------------------------------------------------------------
// Task Schema (dynamic fields for the task creation form)
// ---------------------------------------------------------------------------

export const DEFAULT_TASK_SCHEMA: TaskSchema = {
  fields: [],
  version: 1
};

/** Fetch the current task schema from Firestore */
export async function getTaskSchema(): Promise<TaskSchema> {
  const ref = doc(db, SYSTEM_SETTINGS_COLLECTION, TASK_SCHEMA_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return DEFAULT_TASK_SCHEMA;
  }
  const data = snap.data();
  if (!data?.fields || !Array.isArray(data.fields)) {
    return DEFAULT_TASK_SCHEMA;
  }
  return {
    fields: data.fields as FormField[],
    version: typeof data.version === 'number' ? data.version : 1
  };
}

/** Save the task schema to Firestore (Admin only) */
export async function saveTaskSchema(schema: TaskSchema): Promise<void> {
  const ref = doc(db, SYSTEM_SETTINGS_COLLECTION, TASK_SCHEMA_DOC_ID);
  const payload = stripUndefined({
    ...schema,
    updatedAt: new Date()
  });
  await setDoc(ref, payload as Record<string, unknown>);
}

/** Subscribe to task schema changes (real-time) */
export function subscribeTaskSchema(callback: (schema: TaskSchema) => void): Unsubscribe {
  const ref = doc(db, SYSTEM_SETTINGS_COLLECTION, TASK_SCHEMA_DOC_ID);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        callback(DEFAULT_TASK_SCHEMA);
        return;
      }
      const data = snap.data();
      if (!data?.fields || !Array.isArray(data.fields)) {
        callback(DEFAULT_TASK_SCHEMA);
        return;
      }
      callback({
        fields: data.fields as FormField[],
        version: typeof data.version === 'number' ? data.version : 1
      });
    },
    () => callback(DEFAULT_TASK_SCHEMA)
  );
}
