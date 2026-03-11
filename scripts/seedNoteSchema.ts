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
  version: 2,
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
