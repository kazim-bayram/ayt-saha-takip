/**
 * Admin API Service
 * Handles communication with the backend Vercel Functions
 */

import { auth } from '../firebase/config';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface AdminActionResponse {
  success: boolean;
  message: string;
}

/**
 * Get current user's ID token for authentication
 */
async function getAuthToken(): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  
  return await currentUser.getIdToken();
}

/**
 * Make authenticated request to admin API
 */
async function makeAdminRequest(action: string, params: Record<string, any>): Promise<AdminActionResponse> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/admin-actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      action,
      ...params
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }
  
  return data;
}

/**
 * Reset user password (Admin only)
 */
export async function adminResetPassword(uid: string, newPassword: string): Promise<AdminActionResponse> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Şifre en az 6 karakter olmalıdır');
  }
  
  return await makeAdminRequest('resetPassword', { uid, newPassword });
}

/**
 * Soft delete user (Disable + mark inactive)
 */
export async function adminDeleteUser(uid: string): Promise<AdminActionResponse> {
  return await makeAdminRequest('deleteUser', { uid });
}

/**
 * Restore soft-deleted user
 */
export async function adminRestoreUser(uid: string): Promise<AdminActionResponse> {
  return await makeAdminRequest('restoreUser', { uid });
}
