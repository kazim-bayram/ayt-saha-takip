import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocs,
  updateDoc,
  collection, 
  query, 
  where
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  // Profile management functions
  checkUsernameAvailable: (username: string, excludeUid?: string) => Promise<boolean>;
  updateUserProfile: (data: { displayName?: string; username?: string }) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updatePasswordForced: (newPassword: string) => Promise<void>;
  // Admin functions
  getAllUsers: () => Promise<UserProfile[]>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or create user profile from Firestore
  const fetchUserProfile = async (user: User): Promise<UserProfile | null> => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Check if username is available
  const checkUsernameAvailable = async (username: string, excludeUid?: string): Promise<boolean> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return true;
    
    // If excludeUid is provided, check if the found user is the same user
    if (excludeUid) {
      return snapshot.docs.every(doc => doc.id === excludeUid);
    }
    
    return false;
  };

  // Username-only login - automatically appends @insaat.local
  const login = async (username: string, password: string): Promise<void> => {
    // Append @insaat.local domain to username
    const email = `${username.toLowerCase()}@insaat.local`;
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await fetchUserProfile(userCredential.user);
    
    // Check if user account is active
    if (profile && profile.isActive === false) {
      // User is disabled - sign out immediately
      await signOut(auth);
      throw new Error('Hesap erişime kapatılmıştır. Lütfen yönetici ile iletişime geçin.');
    }
    
    setUserProfile(profile);
  };

  // Logout function
  const logout = async (): Promise<void> => {
    await signOut(auth);
    setUserProfile(null);
  };

  // Update user profile (displayName and/or username)
  const updateUserProfile = async (data: { displayName?: string; username?: string }): Promise<void> => {
    if (!currentUser || !userProfile) {
      throw new Error('User not authenticated');
    }

    // Check username availability if changing
    if (data.username && data.username.toLowerCase() !== userProfile.username) {
      const isAvailable = await checkUsernameAvailable(data.username, currentUser.uid);
      if (!isAvailable) {
        throw new Error('Bu kullanıcı adı zaten kullanılıyor');
      }
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    const updateData: Record<string, string> = {};
    
    if (data.displayName) {
      updateData.displayName = data.displayName;
      // Also update Firebase Auth profile
      await updateProfile(currentUser, { displayName: data.displayName });
    }
    
    if (data.username) {
      updateData.username = data.username.toLowerCase();
    }

    if (Object.keys(updateData).length > 0) {
      await updateDoc(userDocRef, updateData);
      // Refresh profile
      const updatedProfile = await fetchUserProfile(currentUser);
      setUserProfile(updatedProfile);
    }
  };

  // Email update removed - username-only system

  // Update password when mustChangePassword is true (no re-auth needed, user just logged in)
  const updatePasswordForced = async (newPassword: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    await firebaseUpdatePassword(currentUser, newPassword);
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, { mustChangePassword: false });
    const profile = await fetchUserProfile(currentUser);
    setUserProfile(profile);
  };

  // Update user password (requires re-authentication)
  const updateUserPassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!currentUser || !currentUser.email) {
      throw new Error('User not authenticated');
    }

    // Re-authenticate user first
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);

    // Update password
    await firebaseUpdatePassword(currentUser, newPassword);
  };

  // Get all users (Admin only)
  const getAllUsers = async (): Promise<UserProfile[]> => {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      uid: doc.id
    } as UserProfile));
  };

  // Update user role (Admin only)
  const updateUserRole = async (userId: string, newRole: UserRole): Promise<void> => {
    if (!userProfile || userProfile.role !== 'admin') {
      throw new Error('Only admins can change user roles');
    }

    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { role: newRole });
  };

  // Password reset removed - handled by backend admin API

  // Refresh user profile
  const refreshUserProfile = async (): Promise<void> => {
    if (currentUser) {
      const profile = await fetchUserProfile(currentUser);
      setUserProfile(profile);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const profile = await fetchUserProfile(user);
        
        // Additional security check: if user is marked inactive, sign them out
        if (profile && profile.isActive === false) {
          await signOut(auth);
          setUserProfile(null);
          setCurrentUser(null);
        } else {
          setUserProfile(profile);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    login,
    logout,
    isAdmin: userProfile?.role === 'admin',
    // Profile management functions
    checkUsernameAvailable,
    updateUserProfile,
    updateUserPassword,
    updatePasswordForced,
    // Admin functions
    getAllUsers,
    updateUserRole,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
