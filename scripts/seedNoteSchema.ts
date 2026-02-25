/**
 * Seed the default note schema to Firestore.
 * Uses Firebase Admin SDK - requires serviceAccountKey.json in scripts folder.
 * Run: npx tsx scripts/seedNoteSchema.ts
 *
 * Alternatively, an admin can go to Form Builder in the app and click "Kaydet"
 * to create the schema (or "Varsayılana Dön" to reset to default).
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf-8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const DEFAULT_NOTE_SCHEMA = {
  fields: [
    { id: 'category', label: 'Kategori', type: 'select', required: true, options: ['Kaba İşler', 'İnce İşler', 'Elektrik', 'Mekanik', 'Peyzaj', 'İSG'], order: 0 },
    { id: 'date', label: 'Yapılan Tarih', type: 'date', required: true, order: 1 },
    { id: 'ada', label: 'Ada', type: 'text', required: false, placeholder: 'Örn: 123', order: 2 },
    { id: 'parsel', label: 'Parsel', type: 'text', required: false, placeholder: 'Örn: 5', order: 3 },
    { id: 'progressLevel', label: 'Hakediş / Seviye', type: 'text', required: false, placeholder: 'Örn: %50, Zemin Kat', order: 4 }
  ],
  version: 1,
  updatedAt: new Date()
};

async function seed() {
  const ref = db.collection('system_settings').doc('note_schema');
  await ref.set(DEFAULT_NOTE_SCHEMA);
  console.log('Note schema seeded to system_settings/note_schema');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
