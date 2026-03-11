/**
 * Admin Seed Script (AYT Mühendislik)
 *
 * This script creates the initial admin user for the AYT project.
 *
 * It will:
 * - Create a Firebase Auth user with email "<USERNAME>@ayt.local"
 * - Create a corresponding document in the "users" Firestore collection
 *   with: role: "admin", isActive: true, mustChangePassword: false
 *
 * Usage:
 *   npx ts-node scripts/seedAdmin.ts
 *
 * Requirements:
 * - Place your Firebase Admin service account JSON as "serviceAccountKey.json"
 *   in the "scripts" directory (same folder as this file)
 * - Never commit that key to version control
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Configuration for the initial admin
const INITIAL_USERNAME = 'admin';
const INITIAL_PASSWORD = 'AytAdmin2026!';
const INITIAL_DISPLAY_NAME = 'Sistem Yöneticisi';
const AUTH_DOMAIN = 'ayt.local';

// You'll need to download your service account key from Firebase Console
// Project Settings > Service Accounts > Generate New Private Key
// Save it as serviceAccountKey.json in the scripts folder
// IMPORTANT: Never commit this file to version control!

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf-8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const adminAuth = getAuth();

async function seedInitialAdmin(): Promise<void> {
  try {
    const username = INITIAL_USERNAME.toLowerCase();
    const email = `${username}@${AUTH_DOMAIN}`;

    // STEP 1: Create Auth user (or reuse if already exists)
    let uid: string;
    try {
      const userRecord = await adminAuth.createUser({
        email,
        password: INITIAL_PASSWORD,
        displayName: INITIAL_DISPLAY_NAME
      });
      uid = userRecord.uid;
      console.log(`✅ Created Auth user for email: ${email}`);
    } catch (error: any) {
      if (error?.code === 'auth/email-already-exists') {
        const existingUser = await adminAuth.getUserByEmail(email);
        uid = existingUser.uid;
        console.log(`ℹ️ Auth user already exists for email: ${email} (UID: ${uid})`);
      } else {
        throw error;
      }
    }

    // STEP 2: Create/Update Firestore user document
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    const userData = {
      uid,
      email,
      username,
      displayName: INITIAL_DISPLAY_NAME,
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
      createdAt: FieldValue.serverTimestamp()
    };

    if (userDoc.exists) {
      await userRef.set(userData, { merge: true });
      console.log('ℹ️ Updated existing Firestore user document as admin.');
    } else {
      await userRef.set(userData);
      console.log('✅ Created Firestore user document for admin.');
    }

    console.log('\n🎉 Initial admin user is ready for login.');
    console.log('----------------------------------------');
    console.log(`   Username (for login screen): ${username}`);
    console.log(`   Email (in Firebase Auth):    ${email}`);
    console.log(`   Password:                    ${INITIAL_PASSWORD}`);
    console.log('----------------------------------------');
    console.log('\nUse the username (not the email) on the login screen. The app will automatically append "@ayt.local".');
  } catch (error) {
    console.error('❌ Error seeding initial admin user:', error);
    process.exit(1);
  }
}

seedInitialAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
