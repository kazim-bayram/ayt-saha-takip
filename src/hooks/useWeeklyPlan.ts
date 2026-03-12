import { useCallback, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
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
import { WeeklyTask, TaskStatus, TaskThreadMessage, Note } from '../types';
import { useAuth } from '../contexts/AuthContext';

export type CreateTaskInput = Omit<
  WeeklyTask,
  'id' | 'createdAt' | 'updatedAt' | 'authorId' | 'involvedUsers' | 'lastEditedBy'
>;

export interface AddMessageInput {
  content: string;
  images?: File[];
  replyToId?: string;
  replyToSnippet?: string;
  isRFI?: boolean;
  rfiResponseDeadline?: Date;
}

export const useWeeklyPlan = () => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Image upload
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
  // Tasks CRUD — role-based
  // ---------------------------------------------------------------------------

  const getAllTasks = useCallback(async (): Promise<WeeklyTask[]> => {
    if (!currentUser || !userProfile) return [];
    setLoading(true);
    setError(null);
    try {
      const tasksRef = collection(db, 'weekly_tasks');
      let q;
      if (isAdmin) {
        q = query(tasksRef, orderBy('createdAt', 'asc'));
      } else {
        q = query(
          tasksRef,
          where('involvedUsers', 'array-contains', currentUser.uid),
          orderBy('createdAt', 'asc')
        );
      }
      const snapshot = await getDocs(q);
      const allTasks: WeeklyTask[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WeeklyTask, 'id'>)
      }));

      // Strict client-side RBAC filter
      let filteredTasks = allTasks;
      if (userProfile.role === 'worker') {
        const uid = currentUser.uid;
        filteredTasks = allTasks.filter(
          (task) => task.assignedToId === uid || task.authorId === uid
        );
      }

      // Temporary debug log for RBAC verification
      console.log('Worker UID:', currentUser.uid, 'Filtered Tasks:', filteredTasks, 'Raw Tasks:', allTasks);

      setLoading(false);
      return filteredTasks;
    } catch (err) {
      console.error('Error fetching all tasks:', err);
      setError('Görevler yüklenirken bir hata oluştu.');
      setLoading(false);
      return [];
    }
  }, [currentUser, userProfile, isAdmin]);

  /** Fetch notes for cross-data integration (RBAC-filtered) */
  const getNotes = useCallback(async (): Promise<Note[]> => {
    if (!currentUser || !userProfile) return [];
    try {
      const notesRef = collection(db, 'notes');
      const q = query(notesRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      const allNotes: Note[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Note, 'id'>)
      }));

      if (userProfile.role === 'admin') {
        return allNotes;
      }

      const uid = currentUser.uid;
      return allNotes.filter(
        (note) =>
          note.userId === uid ||
          (note as any).assignedToId === uid
      );
    } catch (err) {
      console.error('Error fetching notes for timeline:', err);
      return [];
    }
  }, [currentUser, userProfile]);

  /** Get tasks for a month range (for monthly calendar) */
  const getTasksByMonth = useCallback(
    async (year: number, month: number): Promise<WeeklyTask[]> => {
      const all = await getAllTasks();
      return all.filter(t => {
        const d = t.createdAt?.toDate?.();
        if (!d) return false;
        return d.getFullYear() === year && d.getMonth() === month;
      });
    },
    [getAllTasks]
  );

  /** Get tasks whose targetDate falls within the given ISO week (e.g. "2026-W11") */
  const getTasksByWeek = useCallback(
    async (weekString: string): Promise<WeeklyTask[]> => {
      const [yearStr, weekStr] = weekString.split('-W');
      const year = Number(yearStr);
      const week = Number(weekStr);
      const jan4 = new Date(Date.UTC(year, 0, 4));
      const dayOfWeek = jan4.getUTCDay() || 7;
      const monday = new Date(jan4);
      monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);

      const monStr = monday.toISOString().slice(0, 10);
      const sunStr = sunday.toISOString().slice(0, 10);

      const all = await getAllTasks();
      return all.filter(t => t.targetDate >= monStr && t.targetDate <= sunStr);
    },
    [getAllTasks]
  );

  // ---------------------------------------------------------------------------
  // Build involvedUsers from author + assignee UID
  // ---------------------------------------------------------------------------

  function buildInvolvedUsers(authorUid: string, assignedToId?: string | null): string[] {
    const set = new Set<string>();
    set.add(authorUid);
    if (assignedToId) {
      set.add(assignedToId);
    }
    return Array.from(set);
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  const createTask = useCallback(
    async (
      data: CreateTaskInput,
      _allUsers?: { uid: string; displayName: string; username: string }[]
    ): Promise<string> => {
      if (!currentUser || !userProfile) {
        throw new Error('User not authenticated');
      }
      setError(null);
      const now = Timestamp.now();
      const involved = buildInvolvedUsers(currentUser.uid, data.assignedToId);

      const payload: Omit<WeeklyTask, 'id'> = {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        status: data.status,
        targetDate: data.targetDate,
        color: data.color,
        assignedTo: data.assignedTo,
        ...(data.assignedToId ? { assignedToId: data.assignedToId } : {}),
        authorId: currentUser.uid,
        involvedUsers: involved,
        createdAt: now,
        updatedAt: now,
        priority: data.priority || 'Normal',
        adaParsel: data.adaParsel || '',
        category: data.category || '',
        subCategory: data.subCategory || '',
        dependencies: data.dependencies || [],
        actualHours: data.actualHours || 0,
        materialCosts: data.materialCosts || 0,
        plannedStart: data.plannedStart || '',
        plannedEnd: data.plannedEnd || '',
        ...(data.data ? { data: data.data } : {}),
      };
      const docRef = await addDoc(collection(db, 'weekly_tasks'), payload);
      return docRef.id;
    },
    [currentUser, userProfile]
  );

  // ---------------------------------------------------------------------------
  // Update (generic partial)
  // ---------------------------------------------------------------------------

  const updateTask = useCallback(
    async (
      taskId: string,
      updateData: Partial<Omit<WeeklyTask, 'id' | 'createdAt'>>,
      _allUsers?: { uid: string; displayName: string; username: string }[]
    ): Promise<void> => {
      if (!currentUser || !userProfile) {
        throw new Error('User not authenticated');
      }
      setError(null);
      try {
        const taskRef = doc(db, 'weekly_tasks', taskId);
        const filtered = Object.fromEntries(
          Object.entries(updateData).filter(([, v]) => v !== undefined)
        ) as Record<string, unknown>;

        filtered.updatedAt = Timestamp.now();
        filtered.lastEditedBy = currentUser.uid;

        if (updateData.assignedTo !== undefined || updateData.assignedToId !== undefined) {
          const authorId = (updateData as any).authorId || currentUser.uid;
          const assigneeUid = (updateData as any).assignedToId;
          filtered.involvedUsers = buildInvolvedUsers(authorId, assigneeUid);
        }

        await updateDoc(taskRef, filtered as { [key: string]: any });
      } catch (err) {
        console.error('Error updating task:', err);
        setError('Görev güncellenemedi.');
        throw err;
      }
    },
    [currentUser, userProfile]
  );

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      if (!currentUser || !userProfile) {
        throw new Error('User not authenticated');
      }
      setError(null);
      try {
        await deleteDoc(doc(db, 'weekly_tasks', taskId));
      } catch (err) {
        console.error('Error deleting task:', err);
        setError('Görev silinemedi.');
        throw err;
      }
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
          updatedAt: Timestamp.now(),
          lastEditedBy: currentUser.uid,
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
          isRFI: false,
          rfiResponseDeadline: null,
          rfiRespondedAt: null,
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
        isRFI: input.isRFI ?? false,
        rfiResponseDeadline: input.rfiResponseDeadline
          ? Timestamp.fromDate(input.rfiResponseDeadline)
          : null,
        rfiRespondedAt: null,
        createdAt: now
      };

      const docRef = await addDoc(collection(db, 'task_messages'), payload);
      return { id: docRef.id, ...payload };
    },
    [currentUser, userProfile, uploadTaskImages]
  );

  const markRFIResponded = useCallback(
    async (messageId: string): Promise<void> => {
      const msgRef = doc(db, 'task_messages', messageId);
      await updateDoc(msgRef, { rfiRespondedAt: Timestamp.now() });
    },
    []
  );

  return {
    loading,
    error,
    getTasksByMonth,
    getTasksByWeek,
    getAllTasks,
    getNotes,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    getTaskMessages,
    addTaskMessage,
    markRFIResponded,
  };
};
