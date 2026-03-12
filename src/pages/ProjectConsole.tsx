import React, { useState, useEffect, useCallback, useMemo, useRef, DragEvent } from 'react';
import {
  Plus,
  Calendar,
  Loader2,
  AlertCircle,
  User,
  GripVertical,
  ChevronDown,
  CheckCircle2,
  RefreshCw,
  GanttChart,
  LayoutGrid,
  CalendarDays,
  ClipboardList,
  FileText,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { useWeeklyPlan, CreateTaskInput } from '../hooks/useWeeklyPlan';
import { useProjectAnalytics } from '../hooks/useProjectAnalytics';
import {
  WeeklyTask, TaskStatus, TaskCategoryColor, Note, NoteFormData,
  TimelineItem,
} from '../types';
import TaskThreadModal from '../components/TaskThreadModal';
import AddNoteModal from '../components/AddNoteModal';
import NoteDetailModal from '../components/NoteDetailModal';
import { useNotes } from '../hooks/useNotes';
import MonthlyView from '../components/MonthlyView';
import TimelineView from '../components/TimelineView';

/** Normalize any status string to TaskStatus for strict column matching */
function normalizeTaskStatus(s: string | undefined): TaskStatus {
  if (!s || typeof s !== 'string') return 'Bekliyor';
  const t = s.trim();
  if (t === 'Bekliyor' || t === 'Devam Ediyor' || t === 'Tamamlandı') return t as TaskStatus;
  if (/bekliyor|waiting/i.test(t)) return 'Bekliyor';
  if (/devam|in_progress|ongoing/i.test(t)) return 'Devam Ediyor';
  if (/tamam|completed|done|onay/i.test(t)) return 'Tamamlandı';
  return 'Bekliyor';
}

/** Map a note's status to a Kanban column */
function mapNoteToKanbanStatus(noteStatus: string): TaskStatus {
  if (noteStatus === 'Onay' || noteStatus === 'Olumsuz Sonuç') return 'Tamamlandı';
  return 'Bekliyor';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUSES: TaskStatus[] = ['Bekliyor', 'Devam Ediyor', 'Tamamlandı'];

const STATUS_META: Record<TaskStatus, { label: string; headerBg: string; emptyText: string }> = {
  'Bekliyor': {
    label: 'Bekliyor',
    headerBg: 'bg-yellow-100 text-yellow-800',
    emptyText: 'Bu aşamada iş bulunmuyor.'
  },
  'Devam Ediyor': {
    label: 'Devam Ediyor',
    headerBg: 'bg-blue-100 text-blue-800',
    emptyText: 'Bu aşamada iş bulunmuyor.'
  },
  'Tamamlandı': {
    label: 'Tamamlandı',
    headerBg: 'bg-green-100 text-green-800',
    emptyText: 'Bu aşamada iş bulunmuyor.'
  }
};

function colorToBorder(c: TaskCategoryColor | undefined | null): string {
  if (!c) return 'border-l-gray-400';
  if (c.includes('blue')) return 'border-l-blue-500';
  if (c.includes('green')) return 'border-l-green-500';
  if (c.includes('yellow')) return 'border-l-yellow-500';
  if (c.includes('red')) return 'border-l-red-500';
  if (c.includes('purple')) return 'border-l-purple-500';
  return 'border-l-gray-400';
}

type ViewMode = 'kanban' | 'monthly' | 'timeline';

// ---------------------------------------------------------------------------
// TaskCard
// ---------------------------------------------------------------------------

interface TaskCardProps {
  task: WeeklyTask;
  isDark: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, task: WeeklyTask) => void;
  onClick: () => void;
  isNote?: boolean;
  noteStatus?: string;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, onDragStart, onClick, isNote, noteStatus }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const otherStatuses = STATUSES.filter((s) => s !== task?.status);

  return (
    <div
      draggable={!isNote}
      onDragStart={(e) => !isNote && onDragStart(e, task)}
      onClick={onClick}
      className={`group relative border-l-4 ${colorToBorder(task.color)} rounded-lg p-3 cursor-pointer transition-shadow hover:shadow-md bg-white hover:bg-slate-50 shadow-sm ${
        isNote ? 'opacity-90' : 'cursor-grab active:cursor-grabbing'
      } ${isNote && noteStatus === 'Olumsuz Sonuç' ? 'ring-2 ring-red-500/60' : ''}`}
    >
      {!isNote && (
        <GripVertical
          className="absolute top-2 right-2 w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity text-slate-400"
        />
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${task?.color ?? 'bg-gray-100 text-gray-800'}`}>
          {task?.projectId || 'Proje'}
        </span>
        {isNote ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-purple-100 text-purple-700">
            Kayıt
          </span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-cyan-100 text-cyan-700">
            Plan
          </span>
        )}
      </div>

      <h4 className="mt-1.5 text-sm font-semibold leading-snug line-clamp-2 text-slate-800">
        {task?.title ?? 'İsimsiz Görev'}
      </h4>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <User className="w-3 h-3" />
        <span className="truncate">{task?.assignedTo || '–'}</span>
      </div>

      {!isNote && (
        <div ref={menuRef} className="relative mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((p) => !p);
            }}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            {task?.status ?? 'Bekliyor'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {menuOpen && (
            <div
              className="absolute left-0 bottom-full mb-1 w-40 rounded-lg shadow-lg border z-30 py-1 bg-white border-slate-200"
            >
              {otherStatuses.map((s) => (
                <button
                  key={s}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(task.id, s);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left text-xs px-3 py-2 transition-colors text-slate-700 hover:bg-slate-50"
                >
                  {s === 'Tamamlandı' && <CheckCircle2 className="w-3 h-3 inline mr-1 text-green-400" />}
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isNote && (
        <div className="mt-2">
          <span className={`text-[11px] font-medium px-2 py-1 rounded-md ${
            noteStatus === 'Onay'
              ? 'bg-green-50 text-green-700'
              : noteStatus === 'Olumsuz Sonuç'
                ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-700'
          }`}>
            {noteStatus === 'Onay' ? 'Onay' : noteStatus === 'Olumsuz Sonuç' ? 'Olumsuz Sonuç' : 'Beklemede'}
          </span>
        </div>
      )}
    </div>
  );
};

// AddTaskModal is now a standalone component
import AddTaskModal from '../components/AddTaskModal';

// ---------------------------------------------------------------------------
// KanbanColumn
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  status: TaskStatus;
  cards: { task: WeeklyTask; isNote: boolean; noteRef?: Note; noteStatus?: string }[];
  isDark: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, task: WeeklyTask) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => void;
  dragOverStatus: TaskStatus | null;
  onTaskClick: (task: WeeklyTask) => void;
  onNoteClick: (note: Note) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status, cards, onStatusChange, onDragStart, onDragOver, onDrop, dragOverStatus, onTaskClick, onNoteClick
}) => {
  const meta = STATUS_META[status];
  const isOver = dragOverStatus === status;

  return (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
      className={`flex flex-col rounded-xl border transition-colors min-h-[300px] bg-slate-50 border-slate-200 ${
        isOver ? 'ring-2 ring-brand/40' : ''
      }`}
    >
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${meta.headerBg}`}>
        <span className="text-sm font-semibold">{meta.label}</span>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-black/10">
          {cards.length}
        </span>
      </div>
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)]">
        {cards.length === 0 ? (
          <p className="text-xs text-center py-8 text-slate-400">{meta.emptyText}</p>
        ) : (
          cards.map(({ task, isNote, noteRef, noteStatus }) => (
            <TaskCard
              key={task.id}
              task={task}
              isDark={false}
              onStatusChange={onStatusChange}
              onDragStart={onDragStart}
              onClick={() => isNote && noteRef ? onNoteClick(noteRef) : onTaskClick(task)}
              isNote={isNote}
              noteStatus={noteStatus}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// AnalyticsMiniDashboard
// ---------------------------------------------------------------------------

const AnalyticsMiniDashboard: React.FC<{ tasks: WeeklyTask[]; notes: Note[]; isDark: boolean }> = ({ tasks, notes }) => {
  const analytics = useProjectAnalytics(tasks, notes);

  const pace = analytics.completionPace;
  const paceColor = pace >= 80 ? 'text-green-500' : pace >= 50 ? 'text-yellow-500' : 'text-red-500';
  const paceBg = pace >= 80
    ? 'bg-green-50 border-green-200'
    : pace >= 50
      ? 'bg-yellow-50 border-yellow-200'
      : 'bg-red-50 border-red-200';

  const delayBg = analytics.delayedTasks > 0
    ? 'bg-red-50 border-red-200'
    : 'bg-white border-slate-200';

  const cardBase = 'rounded-xl border p-4 transition-all';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
      {/* İş Bitirme Hızı */}
      <div className={`${cardBase} ${paceBg}`}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className={`w-4 h-4 ${paceColor}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            İş Bitirme Hızı
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-3xl font-bold tabular-nums ${paceColor}`}>%{pace}</span>
          <span className="text-xs text-slate-400">
            ({analytics.completedTasks}/{analytics.totalTasks})
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full mt-2.5 bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pace >= 80 ? 'bg-green-500' : pace >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(pace, 100)}%` }}
          />
        </div>
        <p className="text-[10px] mt-2 text-slate-400">
          Planladığımız işlerin zamanında bitme oranı. %100 hedeftir.
        </p>
      </div>

      {/* Bekleyen Mesajlar / Aktif Sohbetler */}
      <div className={`${cardBase} bg-white border-slate-200`}>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Aktif Görevler
          </span>
        </div>
        <span className="text-3xl font-bold tabular-nums text-slate-800">{analytics.activeThreadCount}</span>
        <div className="flex gap-3 mt-2">
          <span className="text-[10px] text-yellow-600">{analytics.waitingTasks} bekliyor</span>
          <span className="text-[10px] text-blue-600">{analytics.inProgressTasks} devam</span>
        </div>
        <p className="text-[10px] mt-2 text-slate-400">
          Görevlerin içinde yanıt bekleyen veya güncel saha yazışmaları.
        </p>
      </div>

      {/* Geciken İşler */}
      <div className={`${cardBase} ${delayBg}`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className={`w-4 h-4 ${analytics.delayedTasks > 0 ? 'text-red-500' : 'text-slate-400'}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Geciken İşler
          </span>
        </div>
        <span className={`text-3xl font-bold tabular-nums ${analytics.delayedTasks > 0 ? 'text-red-500' : 'text-green-600'}`}>
          {analytics.delayedTasks}
        </span>
        {analytics.delayedTasks === 0 && (
          <p className="text-[10px] mt-2 text-green-600">Tüm görevler zamanında!</p>
        )}
        {analytics.delayedTasks > 0 && (
          <p className="text-[10px] mt-2 text-red-600">
            Hedef tarihi geçtiği halde henüz tamamlanmamış görevler.
          </p>
        )}
      </div>

      {/* Bottleneck workers banner */}
      {analytics.bottleneckWorkers.length > 0 && (
        <div className="col-span-full rounded-xl border p-3 flex items-center gap-3 bg-red-50 border-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-red-700">Darboğaz Personeli</p>
            <p className="text-xs text-red-600">
              {analytics.bottleneckWorkers.map(w => `${w.name} (${w.count} görev, ${w.staleDays}+ gün)`).join(' · ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ProjectConsole (Main Page)
// ---------------------------------------------------------------------------

const ProjectConsole: React.FC = () => {
  const { getAllTasks, createTask, updateTask, deleteTask, updateTaskStatus } = useWeeklyPlan();
  const {
    notes: liveNotes, createNote, updateNote, deleteNote, uploadProgress,
    addComment, deleteComment, canEditNote, canDeleteNote,
  } = useNotes();

  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [threadTask, setThreadTask] = useState<WeeklyTask | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingTask, setEditingTask] = useState<WeeklyTask | null>(null);

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const draggedTaskRef = useRef<WeeklyTask | null>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchTasks = useCallback(async () => {
    setPageLoading(true);
    setFetchError(null);
    try {
      const all = await getAllTasks();
      console.log('RAW TASKS FROM DB:', all);
      const normalized = all.map(t => ({ ...t, status: normalizeTaskStatus(t.status) }));
      setTasks(normalized);
    } catch {
      setFetchError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setPageLoading(false);
    }
  }, [getAllTasks]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const allNotes = liveNotes;

  const kanbanCards = useMemo(() => {
    type CardEntry = { task: WeeklyTask; isNote: boolean; noteRef?: Note; noteStatus?: string };
    const map: Record<TaskStatus, CardEntry[]> = { 'Bekliyor': [], 'Devam Ediyor': [], 'Tamamlandı': [] };

    tasks.forEach((t) => {
      if (!t || t.status == null) return;
      const col = STATUSES.includes(t.status as TaskStatus) ? (t.status as TaskStatus) : normalizeTaskStatus(t.status);
      map[col] = map[col] ?? [];
      map[col].push({ task: t, isNote: false });
    });

    allNotes.forEach(note => {
      const status = mapNoteToKanbanStatus(note.status);
      const fakeTask: WeeklyTask = {
        id: `note-${note.id}`,
        projectId: note.projectName,
        title: note.projectName || note.content?.slice(0, 60) || 'Saha Notu',
        description: note.content || '',
        status,
        targetDate: '',
        color: note.status === 'Onay' ? 'bg-green-100 text-green-800'
          : note.status === 'Olumsuz Sonuç' ? 'bg-red-100 text-red-800'
          : 'bg-yellow-100 text-yellow-800',
        assignedTo: note.userName || note.userEmail,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt || note.createdAt,
      };
      map[status].push({ task: fakeTask, isNote: true, noteRef: note, noteStatus: note.status });
    });

    return map;
  }, [tasks, allNotes]);

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      if (taskId.startsWith('note-')) return;
      const previousStatus = tasks.find((t) => t.id === taskId)?.status;
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      try { await updateTaskStatus(taskId, newStatus, previousStatus); } catch { fetchTasks(); }
    },
    [updateTaskStatus, fetchTasks, tasks]
  );

  const handleDragStart = useCallback((_e: DragEvent<HTMLDivElement>, task: WeeklyTask) => {
    draggedTaskRef.current = task;
  }, []);
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
    e.preventDefault(); setDragOverStatus(null);
    const task = draggedTaskRef.current;
    if (!task || task.status === targetStatus) return;
    handleStatusChange(task.id, targetStatus);
    draggedTaskRef.current = null;
  }, [handleStatusChange]);

  const handleCreateTask = useCallback(async (data: CreateTaskInput) => {
    await createTask(data);
    await fetchTasks();
  }, [createTask, fetchTasks]);

  const handleUpdateTask = useCallback(async (taskId: string, data: Partial<Omit<WeeklyTask, 'id' | 'createdAt'>>) => {
    await updateTask(taskId, data);
    await fetchTasks();
  }, [updateTask, fetchTasks]);

  const handleEditTask = useCallback((task: WeeklyTask) => {
    setThreadTask(null);
    setEditingTask(task);
    setShowAddModal(true);
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setThreadTask(null);
      await fetchTasks();
    } catch (err) {
      console.error('Görev silinirken hata:', err);
    }
  }, [deleteTask, fetchTasks]);

  const handleTimelineItemClick = useCallback((item: TimelineItem) => {
    if (item.taskRef) setThreadTask(item.taskRef);
  }, []);

  const handleNoteClick = useCallback((note: Note) => {
    setSelectedNote(note);
  }, []);

  const handleEditNote = useCallback((note: Note) => {
    setSelectedNote(null);
    setEditingNote(note);
    setShowAddNoteModal(true);
  }, []);

  const handleDeleteNote = useCallback(async (note: Note) => {
    try {
      await deleteNote(note);
      setSelectedNote(null);
    } catch (err) {
      console.error('Not silinirken hata:', err);
    }
  }, [deleteNote]);

  const handleSubmitNote = useCallback(async (formData: NoteFormData, existingImageUrls?: string[]) => {
    if (editingNote) {
      await updateNote(
        editingNote.id,
        formData,
        formData.images.length > 0 ? formData.images : undefined,
        existingImageUrls,
      );
      setEditingNote(null);
    } else {
      await createNote(formData);
    }
  }, [editingNote, updateNote, createNote]);

  const handleAddNoteModalClose = useCallback(() => {
    setShowAddNoteModal(false);
    setEditingNote(null);
  }, []);

  const VIEW_OPTIONS: { key: ViewMode; icon: React.ElementType; label: string }[] = [
    { key: 'kanban', icon: LayoutGrid, label: 'Kanban' },
    { key: 'monthly', icon: CalendarDays, label: 'Ay' },
    { key: 'timeline', icon: GanttChart, label: 'Zaman Çizelgesi' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md border-slate-200 shadow-sm">
        <div className="px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-brand" />
              <div>
                <h1 className="text-lg font-bold text-slate-800">Proje Konsol</h1>
                <p className="text-xs text-slate-500">
                  {tasks.length} görev · {allNotes.length} saha notu
                </p>
              </div>
            </div>

            <div className="flex items-center rounded-lg p-1 bg-slate-100">
              {VIEW_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = viewMode === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setViewMode(opt.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      active
                        ? 'bg-white text-brand shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div ref={addMenuRef} className="relative">
                <button
                  onClick={() => setShowAddMenu(p => !p)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand hover:bg-brand-light text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Yeni Ekle</span>
                </button>
                {showAddMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg border z-50 py-1 bg-white border-slate-200">
                    <button
                      onClick={() => { setShowAddMenu(false); setShowAddModal(true); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-slate-700 hover:bg-slate-50"
                    >
                      <ClipboardList className="w-4 h-4 text-blue-400" />
                      Yeni Görev
                    </button>
                    <button
                      onClick={() => { setShowAddMenu(false); setEditingNote(null); setShowAddNoteModal(true); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="w-4 h-4 text-green-400" />
                      Saha Notu
                    </button>
                  </div>
                )}
              </div>

              <button onClick={fetchTasks}
                className="p-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-100"
                title="Yenile"
              ><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="px-5 py-5">
        {fetchError && (
          <div className="mb-4 p-4 rounded-xl flex items-center justify-between bg-red-50 border border-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-700 text-sm">{fetchError}</p>
            </div>
            <button
              onClick={fetchTasks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tekrar Dene
            </button>
          </div>
        )}

        <AnalyticsMiniDashboard tasks={tasks} notes={allNotes} isDark={false} />

        {pageLoading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <span className="text-sm text-slate-500">Görevler yükleniyor…</span>
          </div>
        ) : (
          <>
            {viewMode === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {STATUSES.map((status) => (
                  <div
                    key={status}
                    onDragEnter={() => setDragOverStatus(status)}
                    onDragLeave={() => setDragOverStatus(null)}
                  >
                    <KanbanColumn
                      status={status}
                      cards={kanbanCards[status]}
                      isDark={false}
                      onStatusChange={handleStatusChange}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      dragOverStatus={dragOverStatus}
                      onTaskClick={setThreadTask}
                      onNoteClick={handleNoteClick}
                    />
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'monthly' && (
              <MonthlyView
                tasks={tasks}
                notes={allNotes}
                year={calYear}
                month={calMonth}
                onPrevMonth={() => { setCalMonth(m => { if (m === 0) { setCalYear(y => y - 1); return 11; } return m - 1; }); }}
                onNextMonth={() => { setCalMonth(m => { if (m === 11) { setCalYear(y => y + 1); return 0; } return m + 1; }); }}
                onToday={() => { setCalMonth(new Date().getMonth()); setCalYear(new Date().getFullYear()); }}
                isDark={false}
                onItemClick={handleTimelineItemClick}
              />
            )}

            {viewMode === 'timeline' && (
              <TimelineView
                tasks={tasks}
                isDark={false}
                onTaskClick={(task) => setThreadTask(task)}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingTask(null); }}
        onSubmit={handleCreateTask}
        taskToEdit={editingTask}
        onUpdate={handleUpdateTask}
        isDark={false}
      />

      <AddNoteModal
        isOpen={showAddNoteModal}
        onClose={handleAddNoteModalClose}
        onSubmit={handleSubmitNote}
        editNote={editingNote}
        uploadProgress={uploadProgress}
      />

      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          isOpen={!!selectedNote}
          onClose={() => setSelectedNote(null)}
          onAddComment={addComment}
          onDeleteComment={deleteComment}
          onEdit={handleEditNote}
          onDelete={handleDeleteNote}
          canEdit={canEditNote(selectedNote)}
          canDelete={canDeleteNote(selectedNote)}
        />
      )}

      <TaskThreadModal
        task={threadTask}
        isOpen={!!threadTask}
        onClose={() => setThreadTask(null)}
        onStatusChanged={fetchTasks}
        onEditTask={handleEditTask}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  );
};

export default ProjectConsole;
