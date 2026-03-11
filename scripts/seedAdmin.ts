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
 */

import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';

// Configuration for the initial admin
const INITIAL_USERNAME = 'admin';
const INITIAL_PASSWORD = 'AytAdmin2026!';
const INITIAL_DISPLAY_NAME = 'Sistem Yöneticisi';
const AUTH_DOMAIN = 'ayt.local';

// Read env-based service account configuration
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!projectId) {
  throw new Error(
    'Missing VITE_FIREBASE_PROJECT_ID in .env. Please set VITE_FIREBASE_PROJECT_ID to your Firebase project ID.'
  );
}

if (!serviceAccountJson) {
  throw new Error(
    'Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env. Please set FIREBASE_SERVICE_ACCOUNT_KEY to your service account JSON string.'
  );
}

let clientEmail: string | undefined;
let privateKey: string | undefined;

try {
  const parsed = JSON.parse(serviceAccountJson);
  clientEmail = parsed.client_email;
  privateKey = parsed.private_key?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is missing required fields "client_email" or "private_key".'
    );
  }
} catch (err) {
  throw new Error(
    'FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. Ensure it is a single-line JSON string in .env.'
  );
}

// Initialize Firebase Admin using environment variables
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

console.log(`Connected to Firebase project: ${projectId}`);

const db = admin.firestore();
const adminAuth = admin.auth();

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
      createdAt: admin.firestore.FieldValue.serverTimestamp()
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
