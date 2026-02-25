/**
 * Vercel Serverless Function: Admin Actions
 * Handles privileged operations using firebase-admin SDK
 * 
 * Actions:
 * - resetPassword: Force update a user's password
 * - deleteUser: Soft delete (disable Firebase Auth + mark isActive: false)
 * - restoreUser: Restore a soft-deleted user
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const auth = admin.auth();
const db = admin.firestore();

/**
 * CORS headers for frontend requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Verify that the request comes from an authenticated admin
 */
async function verifyAdmin(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // Check if user is admin in Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      throw new Error('User profile not found');
    }
    
    const userData = userDoc.data();
    
    if (userData.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }
    
    return { uid, userData };
  } catch (error) {
    console.error('Admin verification failed:', error);
    throw new Error('Authentication failed: ' + error.message);
  }
}

/**
 * Reset user password (Admin only)
 */
async function resetPassword(uid, newPassword) {
  if (!uid || !newPassword) {
    throw new Error('Missing required parameters: uid and newPassword');
  }
  
  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  
  try {
    await auth.updateUser(uid, {
      password: newPassword
    });
    
    return { success: true, message: 'Password updated successfully' };
  } catch (error) {
    console.error('Password reset failed:', error);
    throw new Error('Failed to reset password: ' + error.message);
  }
}

/**
 * Soft delete user (Disable in Auth + mark isActive: false in Firestore)
 */
async function deleteUser(uid) {
  if (!uid) {
    throw new Error('Missing required parameter: uid');
  }
  
  try {
    // Disable user in Firebase Auth
    await auth.updateUser(uid, {
      disabled: true
    });
    
    // Mark as inactive in Firestore
    await db.collection('users').doc(uid).update({
      isActive: false,
      disabledAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, message: 'User disabled successfully' };
  } catch (error) {
    console.error('User deletion failed:', error);
    throw new Error('Failed to disable user: ' + error.message);
  }
}

/**
 * Restore a soft-deleted user
 */
async function restoreUser(uid) {
  if (!uid) {
    throw new Error('Missing required parameter: uid');
  }
  
  try {
    // Enable user in Firebase Auth
    await auth.updateUser(uid, {
      disabled: false
    });
    
    // Mark as active in Firestore
    await db.collection('users').doc(uid).update({
      isActive: true,
      restoredAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, message: 'User restored successfully' };
  } catch (error) {
    console.error('User restoration failed:', error);
    throw new Error('Failed to restore user: ' + error.message);
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
      .setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods'])
      .setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers'])
      .end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Verify admin authentication
    const authHeader = req.headers.authorization;
    await verifyAdmin(authHeader);
    
    // Get action and parameters from request body
    const { action, uid, newPassword } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Missing action parameter' });
    }
    
    let result;
    
    switch (action) {
      case 'resetPassword':
        result = await resetPassword(uid, newPassword);
        break;
        
      case 'deleteUser':
        result = await deleteUser(uid);
        break;
        
      case 'restoreUser':
        result = await restoreUser(uid);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid action: ' + action });
    }
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      error: error.message || 'Internal server error'
    });
  }
}
