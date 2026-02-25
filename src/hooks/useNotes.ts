import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { Note, NoteFormData, FilterOptions, NoteStatus, UploadProgress, Comment, normalizeStatus, getWorkDate } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Generate unique ID for comments
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const { currentUser, userProfile, isAdmin } = useAuth();

  // Fetch notes based on user role
  useEffect(() => {
    if (!currentUser || !userProfile) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Build query based on role
    const notesRef = collection(db, 'notes');
    let q;

    if (isAdmin) {
      // Admin can see all notes
      q = query(notesRef, orderBy('createdAt', 'asc'));
    } else {
      // Workers can only see their own notes
      q = query(
        notesRef,
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'asc')
      );
    }

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notesData: Note[] = [];
        snapshot.forEach((doc) => {
          notesData.push({
            id: doc.id,
            ...doc.data()
          } as Note);
        });
        setNotes(notesData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching notes:', err);
        setError('Failed to load notes. Please try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, userProfile, isAdmin]);

  // Upload single image to Firebase Storage
  const uploadImage = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const fileName = `${currentUser?.uid}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, `notes/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    
    return downloadUrl;
  };

  // Upload multiple images with progress tracking
  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    const urls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      setUploadProgress({
        current: i + 1,
        total: files.length,
        percentage: Math.round(((i + 1) / files.length) * 100)
      });
      
      const url = await uploadImage(files[i]);
      urls.push(url);
    }
    
    setUploadProgress(null);
    return urls;
  };

  // Delete image from Firebase Storage
  const deleteImage = async (imageUrl: string): Promise<void> => {
    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  // Delete multiple images
  const deleteImages = async (imageUrls: string[]): Promise<void> => {
    await Promise.all(imageUrls.map(url => deleteImage(url)));
  };

  // Create a new note
  const createNote = async (formData: NoteFormData): Promise<void> => {
    if (!currentUser || !userProfile) {
      throw new Error('User not authenticated');
    }

    setUploading(true);
    setError(null);

    try {
      // Upload all images
      const imageUrls = await uploadImages(formData.images || []);

      const noteData: Record<string, unknown> = {
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userName: userProfile.displayName || '',
        userRole: userProfile.role || 'worker',
        imageUrls,
        content: formData.content || '',
        projectName: formData.projectName || '',
        status: formData.status || ('Eksik' as NoteStatus),
        createdAt: Timestamp.now()
      };

      // Schema-driven: save dynamic data to data field
      if (formData.data && typeof formData.data === 'object' && Object.keys(formData.data).length > 0) {
        noteData.data = formData.data;
      } else {
        // Legacy flat fields (backward compatibility)
        noteData.category = formData.category || '';
        noteData.date = formData.date || new Date().toISOString().split('T')[0];
        noteData.ada = formData.ada || '';
        noteData.parsel = formData.parsel || '';
        noteData.progressLevel = formData.progressLevel || '';
        noteData.customFields = formData.customFields || [];
      }

      await addDoc(collection(db, 'notes'), noteData);
    } catch (err) {
      console.error('Error creating note:', err);
      setError('Failed to create note. Please try again.');
      throw err;
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Update an existing note
  const updateNote = async (
    noteId: string, 
    formData: Partial<NoteFormData>, 
    newImages?: File[],
    existingImageUrls?: string[]
  ): Promise<void> => {
    if (!currentUser || !userProfile) {
      throw new Error('User not authenticated');
    }

    setUploading(true);
    setError(null);

    try {
      const noteRef = doc(db, 'notes', noteId);
      
      const sanitizedData: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
        lastEditedBy: currentUser.uid,
        lastEditedByName: userProfile.displayName || ''
      };

      if (formData.content !== undefined) sanitizedData.content = formData.content || '';
      if (formData.projectName !== undefined) sanitizedData.projectName = formData.projectName || '';
      if (formData.status !== undefined) sanitizedData.status = formData.status;

      // Schema-driven: save dynamic data to data field
      if (formData.data && typeof formData.data === 'object') {
        sanitizedData.data = formData.data;
      } else {
        if (formData.category !== undefined) sanitizedData.category = formData.category || '';
        if (formData.date !== undefined) sanitizedData.date = formData.date || '';
        if (formData.ada !== undefined) sanitizedData.ada = formData.ada || '';
        if (formData.parsel !== undefined) sanitizedData.parsel = formData.parsel || '';
        if (formData.progressLevel !== undefined) sanitizedData.progressLevel = formData.progressLevel || '';
        if (formData.customFields !== undefined) sanitizedData.customFields = formData.customFields || [];
      }

      // Handle images
      if (newImages && newImages.length > 0) {
        // Upload new images
        const newImageUrls = await uploadImages(newImages);
        // Combine with existing images if any
        sanitizedData.imageUrls = [...(existingImageUrls || []), ...newImageUrls];
      } else if (existingImageUrls !== undefined) {
        // Only existing images (some may have been removed)
        sanitizedData.imageUrls = existingImageUrls;
      }

      await updateDoc(noteRef, sanitizedData);
    } catch (err) {
      console.error('Error updating note:', err);
      setError('Failed to update note. Please try again.');
      throw err;
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Delete a note
  const deleteNote = async (note: Note): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    setError(null);

    try {
      // Delete all associated images (both new and legacy)
      const imagesToDelete: string[] = [];
      
      if (note.imageUrls && note.imageUrls.length > 0) {
        imagesToDelete.push(...note.imageUrls);
      }
      if (note.imageUrl) {
        imagesToDelete.push(note.imageUrl);
      }
      
      if (imagesToDelete.length > 0) {
        await deleteImages(imagesToDelete);
      }

      // Delete the note document
      await deleteDoc(doc(db, 'notes', note.id));
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note. Please try again.');
      throw err;
    }
  };

  // Filter notes (client-side for admin dashboard)
  const filterNotes = useCallback((filters: FilterOptions): Note[] => {
    return notes.filter((note) => {
      // Search filter - check project name and content (case-insensitive)
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        const projectMatch = (note.projectName || '').toLowerCase().includes(searchLower);
        const contentMatch = (note.content || '').toLowerCase().includes(searchLower);
        if (!projectMatch && !contentMatch) {
          return false;
        }
      }

      // Filter by worker email
      if (filters.workerEmail && !note.userEmail.toLowerCase().includes(filters.workerEmail.toLowerCase())) {
        return false;
      }

      // Filter by project name
      if (filters.projectName && note.projectName !== filters.projectName) {
        return false;
      }

      // Filter by Ada (partial match)
      if (filters.ada) {
        const noteAda = (note.ada || '').toLowerCase();
        if (!noteAda.includes(filters.ada.toLowerCase())) {
          return false;
        }
      }

      // Filter by Parsel (partial match)
      if (filters.parsel) {
        const noteParsel = (note.parsel || '').toLowerCase();
        if (!noteParsel.includes(filters.parsel.toLowerCase())) {
          return false;
        }
      }

      // Filter by progress level (Hakediş / Seviye) - partial match, case-insensitive
      if (filters.progressLevel) {
        const noteProgress = (note.progressLevel || '').toLowerCase();
        if (!noteProgress.includes(filters.progressLevel.toLowerCase())) {
          return false;
        }
      }

      // Filter by status (Eksik / Onay)
      if (filters.status) {
        const noteStatus = normalizeStatus(note.status);
        if (noteStatus !== filters.status) {
          return false;
        }
      }

      // Filter by date range (use work date, fallback to createdAt for legacy)
      const workDateStr = getWorkDate(note);
      if (filters.dateFrom && workDateStr) {
        if (workDateStr < filters.dateFrom) return false;
      }
      if (filters.dateTo && workDateStr) {
        if (workDateStr > filters.dateTo) return false;
      }

      return true;
    });
  }, [notes]);

  // Get unique project names for filter dropdown
  const getProjectNames = useCallback((): string[] => {
    const projects = new Set(notes.map(note => note.projectName));
    return Array.from(projects).sort();
  }, [notes]);

  // Get unique worker emails for filter dropdown
  const getWorkerEmails = useCallback((): string[] => {
    const emails = new Set(notes.map(note => note.userEmail));
    return Array.from(emails).sort();
  }, [notes]);

  // Get unique worker names with their emails for filter dropdown
  const getWorkerNames = useCallback((): { name: string; email: string }[] => {
    const workersMap = new Map<string, string>();
    notes.forEach(note => {
      if (!workersMap.has(note.userEmail)) {
        workersMap.set(note.userEmail, note.userName || note.userEmail);
      }
    });
    return Array.from(workersMap.entries())
      .map(([email, name]) => ({ email, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [notes]);

  // Get unique Ada values for filter dropdown
  const getAdaValues = useCallback((): string[] => {
    const adas = notes.map(note => note.ada).filter((v): v is string => typeof v === 'string' && v.length > 0);
    return Array.from(new Set(adas)).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  }, [notes]);

  // Get unique Parsel values for filter dropdown
  const getParselValues = useCallback((): string[] => {
    const parsels = notes.map(note => note.parsel).filter((v): v is string => typeof v === 'string' && v.length > 0);
    return Array.from(new Set(parsels)).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  }, [notes]);

  // Update note status (Admin only)
  const updateNoteStatus = async (noteId: string, newStatus: NoteStatus): Promise<void> => {
    if (!currentUser || !isAdmin) {
      throw new Error('Unauthorized: Only admins can change status');
    }

    try {
      const noteRef = doc(db, 'notes', noteId);
      await updateDoc(noteRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error updating note status:', err);
      setError('Failed to update status. Please try again.');
      throw err;
    }
  };

  // Get KPI statistics
  const getKPIStats = useCallback(() => {
    const totalNotes = notes.length;
    const eksikCount = notes.filter(note => normalizeStatus(note.status) === 'Eksik').length;
    const onayCount = notes.filter(note => normalizeStatus(note.status) === 'Onay').length;
    const activeWorkers = new Set(notes.map(note => note.userId)).size;

    return {
      totalNotes,
      eksikCount,
      onayCount,
      activeWorkers
    };
  }, [notes]);

  // Add comment to a note
  const addComment = async (noteId: string, text: string): Promise<Comment | null> => {
    if (!currentUser || !userProfile) {
      throw new Error('User not authenticated');
    }

    try {
      const noteRef = doc(db, 'notes', noteId);

      const newComment: Comment = {
        id: generateId(),
        authorId: currentUser.uid,
        authorName: userProfile.displayName,
        authorEmail: currentUser.email || '',
        text: text.trim(),
        role: userProfile.role,
        createdAt: Date.now()
      };

      await updateDoc(noteRef, {
        comments: arrayUnion(newComment),
        updatedAt: Timestamp.now()
      });

      return newComment;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again.');
      throw err;
    }
  };

  // Delete comment from a note
  const deleteComment = async (noteId: string, commentId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const noteRef = doc(db, 'notes', noteId);
      const note = notes.find(n => n.id === noteId);
      
      if (!note) {
        throw new Error('Note not found');
      }

      const existingComments = note.comments || [];
      const updatedComments = existingComments.filter(c => c.id !== commentId);
      
      await updateDoc(noteRef, {
        comments: updatedComments,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment. Please try again.');
      throw err;
    }
  };

  // Check if user can edit a note
  const canEditNote = useCallback((note: Note): boolean => {
    if (!currentUser) return false;
    // Admin can edit any note, workers can only edit their own
    return isAdmin || note.userId === currentUser.uid;
  }, [currentUser, isAdmin]);

  // Check if user can delete a note
  const canDeleteNote = useCallback((note: Note): boolean => {
    if (!currentUser) return false;
    // Admin can delete any note, workers can only delete their own
    return isAdmin || note.userId === currentUser.uid;
  }, [currentUser, isAdmin]);

  return {
    notes,
    loading,
    error,
    uploading,
    uploadProgress,
    createNote,
    updateNote,
    deleteNote,
    updateNoteStatus,
    addComment,
    deleteComment,
    canEditNote,
    canDeleteNote,
    filterNotes,
    getProjectNames,
    getWorkerEmails,
    getWorkerNames,
    getAdaValues,
    getParselValues,
    getKPIStats
  };
};
