/**
 * Admin Seed Script
 * 
 * This script sets a user as admin in Firestore.
 * 
 * Usage:
 * 1. First, register the user through the app normally
 * 2. Copy their UID from Firebase Console > Authentication > Users
 * 3. Run this script with the UID as an argument:
 *    
 *    npx ts-node scripts/seedAdmin.ts <USER_UID>
 * 
 * Alternative: Manually set in Firebase Console
 * 1. Go to Firebase Console > Firestore Database
 * 2. Navigate to users collection
 * 3. Find the user document (by UID)
 * 4. Change the 'role' field from 'worker' to 'admin'
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

async function setUserAsAdmin(userId: string): Promise<void> {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error(`❌ User with ID "${userId}" not found in Firestore.`);
      console.log('\nMake sure the user has registered and signed in at least once.');
      process.exit(1);
    }

    await userRef.update({
      role: 'admin'
    });

    const userData = userDoc.data();
    console.log(`✅ Successfully set user as admin!`);
    console.log(`   Email: ${userData?.email}`);
    console.log(`   Name: ${userData?.displayName}`);
    console.log(`   UID: ${userId}`);
  } catch (error) {
    console.error('❌ Error setting user as admin:', error);
    process.exit(1);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Please provide a user ID as an argument.');
  console.log('\nUsage: npx ts-node scripts/seedAdmin.ts <USER_UID>');
  console.log('\nTo find a user\'s UID:');
  console.log('1. Go to Firebase Console');
  console.log('2. Navigate to Authentication > Users');
  console.log('3. Copy the User UID column value');
  process.exit(1);
}

setUserAsAdmin(userId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
