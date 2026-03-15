import React, { useState, useEffect, useCallback, useMemo, useRef, DragEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Loader2,
  AlertCircle,
  X,
  User,
  GripVertical,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWeeklyPlan, CreateTaskInput } from '../hooks/useWeeklyPlan';
import { WeeklyTask, TaskStatus, TaskCategoryColor } from '../types';
import UserProfileMenu from '../components/UserProfileMenu';
import ProfileSettings from '../components/ProfileSettings';
import UserManagement from '../components/UserManagement';
import TaskThreadModal from '../components/TaskThreadModal';

// ---------------------------------------------------------------------------
// Week utilities
// ---------------------------------------------------------------------------

function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function weekStringToMonday(ws: string): Date {
  const [yearStr, weekStr] = ws.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

function shiftWeek(ws: string, offset: number): string {
  const monday = weekStringToMonday(ws);
  monday.setUTCDate(monday.getUTCDate() + offset * 7);
  return getISOWeekString(monday);
}

function formatWeekRange(ws: string): string {
  const monday = weekStringToMonday(ws);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) =>
    `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
  return `${fmt(monday)} – ${fmt(sunday)}`;
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

const COLOR_OPTIONS: { value: TaskCategoryColor; label: string; swatch: string }[] = [
  { value: 'bg-blue-100 text-blue-800', label: 'Mavi', swatch: 'bg-blue-500' },
  { value: 'bg-green-100 text-green-800', label: 'Yeşil', swatch: 'bg-green-500' },
  { value: 'bg-yellow-100 text-yellow-800', label: 'Sarı', swatch: 'bg-yellow-500' },
  { value: 'bg-red-100 text-red-800', label: 'Kırmızı', swatch: 'bg-red-500' },
  { value: 'bg-purple-100 text-purple-800', label: 'Mor', swatch: 'bg-purple-500' }
];

function colorToBorder(c: TaskCategoryColor): string {
  if (c.includes('blue')) return 'border-l-blue-500';
  if (c.includes('green')) return 'border-l-green-500';
  if (c.includes('yellow')) return 'border-l-yellow-500';
  if (c.includes('red')) return 'border-l-red-500';
  if (c.includes('purple')) return 'border-l-purple-500';
  return 'border-l-slate-400';
}

// ---------------------------------------------------------------------------
// TaskCard
// ---------------------------------------------------------------------------

interface TaskCardProps {
  task: WeeklyTask;
  isDark: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, task: WeeklyTask) => void;
  onOpenThread: (task: WeeklyTask) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, onDragStart, onOpenThread }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const otherStatuses = STATUSES.filter((s) => s !== task.status);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onOpenThread(task)}
      className={`group relative border-l-4 ${colorToBorder(task.color)} rounded-lg p-4 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md bg-white hover:bg-slate-50 shadow-sm`}
    >
      <GripVertical className="absolute top-2 right-2 w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity text-slate-400" />

      <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${task.color}`}>
        {task.projectId || 'Proje'}
      </span>

      <h4 className="mt-1.5 text-sm font-semibold leading-snug line-clamp-2 text-slate-800">
        {task.title}
      </h4>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <User className="w-3 h-3" />
        <span className="truncate">{task.assignedTo || '–'}</span>
      </div>

      <div ref={menuRef} className="relative mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((p) => !p);
          }}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          {task.status}
          <ChevronDown className="w-3 h-3" />
        </button>

        {menuOpen && (
          <div className="absolute left-0 bottom-full mb-1 w-40 rounded-lg shadow-lg border z-30 py-1 bg-white border-slate-200">
            {otherStatuses.map((s) => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, s);
                  setMenuOpen(false);
                }}
                className="w-full text-left text-xs px-3 py-2 transition-colors text-slate-700 hover:bg-slate-100"
              >
                {s === 'Tamamlandı' && <CheckCircle2 className="w-3 h-3 inline mr-1 text-green-400" />}
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// AddTaskModal
// ---------------------------------------------------------------------------

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  weekString: string;
  isDark: boolean;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSubmit, weekString }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [color, setColor] = useState<TaskCategoryColor>('bg-blue-100 text-blue-800');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId('');
    setAssignedTo('');
    setColor('bg-blue-100 text-blue-800');
    setError(null);
    setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Başlık gereklidir');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const monday = weekStringToMonday(weekString);
      const targetDate = monday.toISOString().slice(0, 10);
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        projectId: projectId.trim(),
        assignedTo: assignedTo.trim(),
        color,
        targetDate,
        status: 'Bekliyor'
      });
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-xl px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand';

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) { resetForm(); onClose(); } }}
    >
      <div className="rounded-2xl max-w-lg w-full shadow-2xl border animate-slide-up bg-white border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            Yeni İş Planı Ekle
          </h2>
          <button
            onClick={() => { resetForm(); onClose(); }}
            disabled={saving}
            className="p-2 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl flex items-center gap-3 bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-700">Başlık *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Görev başlığı" className={inputClass} required disabled={saving} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-700">Açıklama</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Görev açıklaması (opsiyonel)" rows={3} className={inputClass} disabled={saving} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700">Proje</label>
              <input type="text" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Proje adı" className={inputClass} disabled={saving} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700">Sorumlu</label>
              <input type="text" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Kişi adı" className={inputClass} disabled={saving} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-700">Renk Etiketi</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  disabled={saving}
                  title={opt.label}
                  className={`w-8 h-8 rounded-full ${opt.swatch} transition-all ${
                    color === opt.value ? 'ring-2 ring-offset-2 ring-brand' : 'opacity-60 hover:opacity-100'
                  } ring-offset-white`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-light text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <><Loader2 className="w-5 h-5 animate-spin" />Oluşturuluyor...</> : <><Plus className="w-5 h-5" />İş Planı Oluştur</>}
          </button>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// KanbanColumn
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: WeeklyTask[];
  isDark: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, task: WeeklyTask) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => void;
  dragOverStatus: TaskStatus | null;
  onOpenThread: (task: WeeklyTask) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  isDark,
  onStatusChange,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverStatus,
  onOpenThread
}) => {
  const meta = STATUS_META[status];
  const isOver = dragOverStatus === status;

  return (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
      className={`flex flex-col rounded-xl border transition-colors min-h-[300px] bg-slate-50 border-slate-200 ${isOver ? 'ring-2 ring-brand/40' : ''}`}
    >
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${meta.headerBg}`}>
        <span className="text-sm font-semibold">{meta.label}</span>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-black/10">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-xs text-center py-8 text-slate-400">
            {meta.emptyText}
          </p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDark={isDark}
              onStatusChange={onStatusChange}
              onDragStart={onDragStart}
              onOpenThread={onOpenThread}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// WeeklyPlan (main page)
// ---------------------------------------------------------------------------

const WeeklyPlan: React.FC = () => {
  const { logout, isAdmin } = useAuth();
  const { loading, error, getTasksByWeek, createTask, updateTaskStatus } = useWeeklyPlan();

  const [currentWeek, setCurrentWeek] = useState(() => getISOWeekString(new Date()));
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [threadTask, setThreadTask] = useState<WeeklyTask | null>(null);

  const draggedTaskRef = useRef<WeeklyTask | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await getTasksByWeek(currentWeek);
      setTasks(data);
    } catch {
      // error is surfaced via hook state
    }
  }, [currentWeek, getTasksByWeek]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const columns = useMemo(() => {
    const map: Record<TaskStatus, WeeklyTask[]> = {
      'Bekliyor': [],
      'Devam Ediyor': [],
      'Tamamlandı': []
    };
    tasks.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
      else map['Bekliyor'].push(t);
    });
    return map;
  }, [tasks]);

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const previousStatus = tasks.find((t) => t.id === taskId)?.status;
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      try {
        await updateTaskStatus(taskId, newStatus, previousStatus);
      } catch {
        fetchTasks();
      }
    },
    [updateTaskStatus, fetchTasks, tasks]
  );

  const handleDragStart = useCallback((_e: DragEvent<HTMLDivElement>, task: WeeklyTask) => {
    draggedTaskRef.current = task;
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
      e.preventDefault();
      setDragOverStatus(null);
      const task = draggedTaskRef.current;
      if (!task || task.status === targetStatus) return;
      handleStatusChange(task.id, targetStatus);
      draggedTaskRef.current = null;
    },
    [handleStatusChange]
  );

  const handleColumnDragEnter = useCallback((status: TaskStatus) => {
    setDragOverStatus(status);
  }, []);

  const handleColumnDragLeave = useCallback(() => {
    setDragOverStatus(null);
  }, []);

  const handleCreateTask = useCallback(
    async (data: CreateTaskInput) => {
      await createTask(data);
      await fetchTasks();
    },
    [createTask, fetchTasks]
  );

  return (
    <div className="min-h-screen bg-slate-50 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md border-slate-200 shadow-sm transition-colors">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="p-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-100"
                title="Ana Sayfa"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand" />
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Haftalık İş Planı</h1>
                  <p className="text-xs text-slate-500">
                    {tasks.length} görev &middot; {formatWeekRange(currentWeek)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentWeek((w) => shiftWeek(w, -1))}
                className="p-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-100"
                title="Önceki Hafta"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentWeek(getISOWeekString(new Date()))}
                className="px-3 py-1.5 rounded-lg text-sm font-mono font-semibold transition-colors bg-slate-100 text-slate-800 hover:bg-slate-200"
              >
                {currentWeek}
              </button>
              <button
                onClick={() => setCurrentWeek((w) => shiftWeek(w, 1))}
                className="p-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-100"
                title="Sonraki Hafta"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand hover:bg-brand-light text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Yeni İş Planı Ekle</span>
              </button>
              <UserProfileMenu
                onOpenProfileSettings={() => setShowProfileSettings(true)}
                onOpenUserManagement={() => setShowUserManagement(true)}
                onLogout={logout}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-full mx-auto px-4 py-5">
        {error && (
          <div className="mb-4 p-4 rounded-xl flex items-center gap-3 bg-red-50 border border-red-200">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <span className="text-sm text-slate-500">Görevler yükleniyor…</span>
          </div>
        ) : (
          <div className="flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-6">
            {STATUSES.map((status) => (
              <div
                key={status}
                onDragEnter={() => handleColumnDragEnter(status)}
                onDragLeave={handleColumnDragLeave}
              >
                <KanbanColumn
                  status={status}
                  tasks={columns[status]}
                  isDark={false}
                  onStatusChange={handleStatusChange}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  dragOverStatus={dragOverStatus}
                  onOpenThread={setThreadTask}
                />
              </div>
            ))}
          </div>
        )}

        <section className="mt-10 p-5 rounded-xl border bg-white border-slate-200">
          <h3 className="text-sm font-semibold mb-3 text-slate-700">
            Olası İyileştirmeler (Gelecek Adımlar)
          </h3>
          <ul className="text-xs space-y-1.5 list-disc pl-5 text-slate-500">
            <li><strong>Görev Detay &amp; Mesajlaşma Modali:</strong> Karta tıklandığında e-posta tarzı thread açılır, ekip üyeleri mesaj/yorum bırakabilir.</li>
            <li><strong>Alt-görev (Subtask) Desteği:</strong> Her iş planına bağlı kontrol listesi; ilerleme yüzdesini otomatik hesaplar.</li>
            <li><strong>Fotoğraf &amp; Dosya Eki:</strong> Görevlere Firebase Storage üzerinden resim veya PDF eklenebilir.</li>
            <li><strong>Sorumlu Dropdown'u (UserProfile):</strong> Firestore users koleksiyonundan çekilmiş kullanıcı listesiyle otomatik tamamlama.</li>
            <li><strong>Haftalık Özet Raporu (Excel):</strong> Seçilen haftanın görevlerini durum bazlı XLSX olarak dışa aktarma.</li>
            <li><strong>Bildirim Sistemi:</strong> Görev atandığında veya durumu değiştiğinde ilgili kişiye push/in-app bildirim gönderme.</li>
            <li><strong>Görev Geçmişi (Audit Log):</strong> Kim, ne zaman, hangi durumu değiştirdi bilgisini timeline olarak gösterme.</li>
            <li><strong>Takvim Görünümü:</strong> Haftalık/aylık takvim üzerinde görevleri blok olarak görme ve sürükleyerek tarih atama.</li>
            <li><strong>Tekrarlayan Görevler:</strong> Her hafta otomatik kopyalanan şablon görevler tanımlama.</li>
            <li><strong>Mobil Optimizasyon:</strong> Tek sütun kaydırmalı board ve swipe-to-change-status ile saha personeli deneyimi.</li>
          </ul>
        </section>
      </main>

      {/* Modals */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateTask}
        weekString={currentWeek}
        isDark={false}
      />
      <TaskThreadModal
        task={threadTask}
        isOpen={!!threadTask}
        onClose={() => setThreadTask(null)}
        onStatusChanged={fetchTasks}
      />
      <ProfileSettings isOpen={showProfileSettings} onClose={() => setShowProfileSettings(false)} />
      {isAdmin && <UserManagement isOpen={showUserManagement} onClose={() => setShowUserManagement(false)} />}
    </div>
  );
};

export default WeeklyPlan;
