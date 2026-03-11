import { useCallback, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { WeeklyTask, TaskStatus, TaskThreadMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';

export type CreateTaskInput = Omit<WeeklyTask, 'id' | 'createdAt' | 'updatedAt'>;

export interface AddMessageInput {
  content: string;
  images?: File[];
  replyToId?: string;
  replyToSnippet?: string;
}

export const useWeeklyPlan = () => {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Image upload (mirrors useNotes pattern, scoped to task_attachments/)
  // ---------------------------------------------------------------------------

  const uploadTaskImages = useCallback(
    async (files: File[]): Promise<string[]> => {
      if (!currentUser || files.length === 0) return [];
      const urls: string[] = [];
      for (const file of files) {
        const ts = Date.now();
        const storageRef = ref(storage, `task_attachments/${currentUser.uid}/${ts}_${file.name}`);
        await uploadBytes(storageRef, file);
        urls.push(await getDownloadURL(storageRef));
      }
      return urls;
    },
    [currentUser]
  );

  // ---------------------------------------------------------------------------
  // Tasks CRUD
  // ---------------------------------------------------------------------------

  const getTasksByWeek = useCallback(
    async (weekString: string): Promise<WeeklyTask[]> => {
      setLoading(true);
      setError(null);

      try {
        const tasksRef = collection(db, 'weekly_tasks');
        const q = query(
          tasksRef,
          where('weekString', '==', weekString),
          orderBy('createdAt', 'asc')
        );
        const snapshot = await getDocs(q);
        const tasks: WeeklyTask[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WeeklyTask, 'id'>)
        }));
        setLoading(false);
        return tasks;
      } catch (err) {
        console.error('Error fetching weekly tasks:', err);
        setError('Haftalık görevler yüklenirken bir hata oluştu.');
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const createTask = useCallback(
    async (data: CreateTaskInput): Promise<string> => {
      if (!currentUser || !userProfile) {
        throw new Error('User not authenticated');
      }

      setError(null);

      const now = Timestamp.now();

      const payload: Omit<WeeklyTask, 'id'> = {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        status: data.status,
        weekString: data.weekString,
        color: data.color,
        assignedTo: data.assignedTo,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(collection(db, 'weekly_tasks'), payload);
      return docRef.id;
    },
    [currentUser, userProfile]
  );

  // ---------------------------------------------------------------------------
  // Status change + automatic system_log
  // ---------------------------------------------------------------------------

  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: TaskStatus, previousStatus?: TaskStatus): Promise<void> => {
      if (!currentUser || !userProfile) {
        throw new Error('User not authenticated');
      }

      setError(null);

      try {
        const taskRef = doc(db, 'weekly_tasks', taskId);
        await updateDoc(taskRef, {
          status: newStatus,
          updatedAt: Timestamp.now()
        });

        const fromLabel = previousStatus ?? '?';
        const logContent = `Durum '${fromLabel}' aşamasından '${newStatus}' aşamasına alındı.`;

        await addDoc(collection(db, 'task_messages'), {
          taskId,
          authorId: currentUser.uid,
          authorName: userProfile.displayName || userProfile.username,
          content: logContent,
          messageType: 'system_log',
          imageUrls: [],
          replyToId: null,
          replyToSnippet: null,
          createdAt: Timestamp.now()
        });
      } catch (err) {
        console.error('Error updating task status:', err);
        setError('Görev durumu güncellenemedi.');
        throw err;
      }
    },
    [currentUser, userProfile]
  );

  // ---------------------------------------------------------------------------
  // Task messages
  // ---------------------------------------------------------------------------

  const getTaskMessages = useCallback(
    async (taskId: string): Promise<TaskThreadMessage[]> => {
      const messagesRef = collection(db, 'task_messages');
      const q = query(
        messagesRef,
        where('taskId', '==', taskId),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TaskThreadMessage, 'id'>)
      }));
    },
    []
  );

  const addTaskMessage = useCallback(
    async (taskId: string, input: AddMessageInput): Promise<TaskThreadMessage> => {
      if (!currentUser || !userProfile) {
        throw new Error('User not authenticated');
      }

      const trimmed = input.content.trim();
      if (!trimmed && (!input.images || input.images.length === 0)) {
        throw new Error('Mesaj içeriği veya dosya eklenmeli');
      }

      let imageUrls: string[] = [];
      if (input.images && input.images.length > 0) {
        imageUrls = await uploadTaskImages(input.images);
      }

      const now = Timestamp.now();
      const payload: Omit<TaskThreadMessage, 'id'> = {
        taskId,
        authorId: currentUser.uid,
        authorName: userProfile.displayName || userProfile.username,
        content: trimmed,
        messageType: 'comment',
        imageUrls,
        replyToId: input.replyToId ?? null,
        replyToSnippet: input.replyToSnippet ?? null,
        createdAt: now
      };

      const docRef = await addDoc(collection(db, 'task_messages'), payload);

      return { id: docRef.id, ...payload };
    },
    [currentUser, userProfile, uploadTaskImages]
  );

  return {
    loading,
    error,
    getTasksByWeek,
    createTask,
    updateTaskStatus,
    getTaskMessages,
    addTaskMessage
  };
};
