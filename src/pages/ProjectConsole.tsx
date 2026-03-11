import React, { useState, useEffect, useCallback, useMemo, useRef, DragEvent } from 'react';
import {
  Plus,
  Calendar,
  Loader2,
  AlertCircle,
  X,
  User,
  GripVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  GanttChart,
  LayoutGrid,
  CalendarDays,
  ClipboardList,
  FileText,
  TrendingUp,
  Clock,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
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

/** Normalize any status string to TaskStatus for strict column matching */
function normalizeTaskStatus(s: string | undefined): TaskStatus {
  if (!s || typeof s !== 'string') return 'Bekliyor';
  const t = s.trim();
  if (t === 'Bekliyor' || t === 'Devam Ediyor' || t === 'Tamamlandı') return t as TaskStatus;
  // Fuzzy fallbacks for legacy/typos
  if (/bekliyor|waiting/i.test(t)) return 'Bekliyor';
  if (/devam|in_progress|ongoing/i.test(t)) return 'Devam Ediyor';
  if (/tamam|completed|done|onay/i.test(t)) return 'Tamamlandı';
  return 'Bekliyor';
}

/** Map a note's status to a Kanban column */
function mapNoteToKanbanStatus(noteStatus: string): TaskStatus {
  if (noteStatus === 'Onay') return 'Tamamlandı';
  return 'Devam Ediyor'; // 'Eksik' = needs attention → Devam Ediyor
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUSES: TaskStatus[] = ['Bekliyor', 'Devam Ediyor', 'Tamamlandı'];

const STATUS_META: Record<TaskStatus, { label: string; headerBg: string; headerBgLight: string; emptyText: string }> = {
  'Bekliyor': {
    label: 'Bekliyor',
    headerBg: 'bg-yellow-500/20 text-yellow-300',
    headerBgLight: 'bg-yellow-100 text-yellow-800',
    emptyText: 'Bu aşamada iş bulunmuyor.'
  },
  'Devam Ediyor': {
    label: 'Devam Ediyor',
    headerBg: 'bg-blue-500/20 text-blue-300',
    headerBgLight: 'bg-blue-100 text-blue-800',
    emptyText: 'Bu aşamada iş bulunmuyor.'
  },
  'Tamamlandı': {
    label: 'Tamamlandı',
    headerBg: 'bg-green-500/20 text-green-300',
    headerBgLight: 'bg-green-100 text-green-800',
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
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isDark, onStatusChange, onDragStart, onClick, isNote }) => {
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
      draggable={!isNote}
      onDragStart={(e) => !isNote && onDragStart(e, task)}
      onClick={onClick}
      className={`group relative border-l-4 ${colorToBorder(task.color)} rounded-lg p-3 cursor-pointer transition-shadow hover:shadow-md ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-750 shadow-sm shadow-black/20'
          : 'bg-white hover:bg-gray-50 shadow-sm'
      } ${isNote ? 'opacity-90' : 'cursor-grab active:cursor-grabbing'}`}
    >
      {!isNote && (
        <GripVertical
          className={`absolute top-2 right-2 w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity ${
            isDark ? 'text-concrete-500' : 'text-gray-400'
          }`}
        />
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${task.color}`}>
          {task.projectId || 'Proje'}
        </span>
        {/* Type badge */}
        {isNote ? (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
            Kayıt
          </span>
        ) : (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
            Plan
          </span>
        )}
      </div>

      <h4 className={`mt-1.5 text-sm font-semibold leading-snug line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {task.title}
      </h4>

      <div className={`mt-2 flex items-center gap-1.5 text-xs ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>
        <User className="w-3 h-3" />
        <span className="truncate">{task.assignedTo || '–'}</span>
      </div>

      {!isNote && (
        <div ref={menuRef} className="relative mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((p) => !p);
            }}
            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
              isDark ? 'bg-slate-700 text-concrete-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {task.status}
            <ChevronDown className="w-3 h-3" />
          </button>
          {menuOpen && (
            <div
              className={`absolute left-0 bottom-full mb-1 w-40 rounded-lg shadow-lg border z-30 py-1 ${
                isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'
              }`}
            >
              {otherStatuses.map((s) => (
                <button
                  key={s}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(task.id, s);
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left text-xs px-3 py-2 transition-colors ${
                    isDark ? 'text-white hover:bg-slate-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
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
            task.status === 'Tamamlandı'
              ? isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
              : isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
          }`}>
            {task.status === 'Tamamlandı' ? 'Onay' : 'Eksik'}
          </span>
        </div>
      )}
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

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSubmit, weekString, isDark }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [color, setColor] = useState<TaskCategoryColor>('bg-blue-100 text-blue-800');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle(''); setDescription(''); setProjectId(''); setAssignedTo('');
    setColor('bg-blue-100 text-blue-800'); setEstimatedHours(''); setPlannedStart(''); setPlannedEnd('');
    setError(null); setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Başlık gereklidir'); return; }
    setSaving(true); setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        projectId: projectId.trim(),
        assignedTo: assignedTo.trim(),
        color, weekString, status: 'Bekliyor',
        estimatedHours: estimatedHours ? Number(estimatedHours) : 0,
        plannedStart, plannedEnd,
        dependencies: [],
        actualHours: 0, materialCosts: 0,
      });
      resetForm(); onClose();
    } catch (err: any) { setError(err.message || 'Bir hata oluştu'); } finally { setSaving(false); }
  };

  const inputClass = `w-full rounded-xl px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 ${
    isDark
      ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange'
      : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
  }`;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) { resetForm(); onClose(); } }}
    >
      <div className={`rounded-2xl max-w-lg w-full shadow-2xl border animate-slide-up max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-850 border-slate-700/50' : 'bg-white border-gray-200'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Yeni Görev Ekle</h2>
          <button onClick={() => { resetForm(); onClose(); }} disabled={saving}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          ><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl flex items-center gap-3 bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" /><p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>Başlık *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Görev başlığı" className={inputClass} required disabled={saving} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>Açıklama</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Görev açıklaması (opsiyonel)" rows={3} className={inputClass} disabled={saving} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>Proje</label>
              <input type="text" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Proje adı" className={inputClass} disabled={saving} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>Sorumlu</label>
              <input type="text" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Kişi adı" className={inputClass} disabled={saving} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>Tahmini Saat</label>
              <input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder="0" className={inputClass} disabled={saving} min="0" />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>Başlangıç</label>
              <input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} className={inputClass} disabled={saving} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>Bitiş</label>
              <input type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} className={inputClass} disabled={saving} />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>Renk Etiketi</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setColor(opt.value)} disabled={saving} title={opt.label}
                  className={`w-8 h-8 rounded-full ${opt.swatch} transition-all ${color === opt.value ? 'ring-2 ring-offset-2 ring-safety-orange' : 'opacity-60 hover:opacity-100'} ${isDark ? 'ring-offset-slate-850' : 'ring-offset-white'}`}
                />
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-safety-orange hover:bg-safety-orange-dark text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <><Loader2 className="w-5 h-5 animate-spin" />Oluşturuluyor...</> : <><Plus className="w-5 h-5" />Görev Oluştur</>}
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
  cards: { task: WeeklyTask; isNote: boolean; noteRef?: Note }[];
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
  status, cards, isDark, onStatusChange, onDragStart, onDragOver, onDrop, dragOverStatus, onTaskClick, onNoteClick
}) => {
  const meta = STATUS_META[status];
  const isOver = dragOverStatus === status;

  return (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
      className={`flex flex-col rounded-xl border transition-colors min-h-[300px] ${
        isDark
          ? `bg-slate-900/50 border-slate-700/50 ${isOver ? 'ring-2 ring-safety-orange/40' : ''}`
          : `bg-gray-50 border-gray-200 ${isOver ? 'ring-2 ring-safety-orange/40' : ''}`
      }`}
    >
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${isDark ? meta.headerBg : meta.headerBgLight}`}>
        <span className="text-sm font-semibold">{meta.label}</span>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
          {cards.length}
        </span>
      </div>
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)]">
        {cards.length === 0 ? (
          <p className={`text-xs text-center py-8 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>{meta.emptyText}</p>
        ) : (
          cards.map(({ task, isNote, noteRef }) => (
            <TaskCard
              key={task.id}
              task={task}
              isDark={isDark}
              onStatusChange={onStatusChange}
              onDragStart={onDragStart}
              onClick={() => isNote && noteRef ? onNoteClick(noteRef) : onTaskClick(task)}
              isNote={isNote}
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

const AnalyticsMiniDashboard: React.FC<{ tasks: WeeklyTask[]; notes: Note[]; isDark: boolean }> = ({ tasks, notes, isDark }) => {
  const analytics = useProjectAnalytics(tasks, notes);

  const spiColor = analytics.spiValue >= 1 ? 'text-green-400' : analytics.spiValue >= 0.8 ? 'text-yellow-400' : 'text-red-400';
  const spiBg = analytics.spiValue >= 1 ? 'bg-green-500/10 border-green-500/20' : analytics.spiValue >= 0.8 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20';
  const cardClass = `rounded-xl border p-4 ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-gray-200'}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <div className={`rounded-xl border p-4 ${isDark ? spiBg : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className={`w-4 h-4 ${spiColor}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>SPI</span>
        </div>
        <p className={`text-2xl font-bold ${spiColor}`}>{analytics.spiValue.toFixed(2)}</p>
        <p className={`text-xs ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>{analytics.spiLabel}</p>
      </div>
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Görevler</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{analytics.completedTasks}</span>
          <span className={`text-xs ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>/ {tasks.length}</span>
        </div>
        <div className="flex gap-2 mt-1">
          <span className="text-[10px] text-yellow-400">{analytics.waitingTasks} bekliyor</span>
          <span className="text-[10px] text-blue-400">{analytics.inProgressTasks} devam</span>
        </div>
      </div>
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-1">
          <Clock className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Saat</span>
        </div>
        <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{analytics.totalActualHours}h</p>
        <p className={`text-xs ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>/ {analytics.totalPlannedHours}h planlı</p>
      </div>
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Malzeme</span>
        </div>
        <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {analytics.totalMaterialCosts > 0 ? `₺${analytics.totalMaterialCosts.toLocaleString('tr-TR')}` : '₺0'}
        </p>
        <p className={`text-xs ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
          Saha: {analytics.noteStats.total} not ({analytics.noteStats.onay} onaylı)
        </p>
      </div>
      {analytics.bottleneckWorkers.length > 0 && (
        <div className={`col-span-full rounded-xl border p-3 flex items-center gap-3 ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className={`text-xs font-semibold ${isDark ? 'text-red-300' : 'text-red-700'}`}>Darboğaz Personeli</p>
            <p className={`text-xs ${isDark ? 'text-red-400/80' : 'text-red-600'}`}>
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
  const { isDark } = useTheme();
  const { getTasksByWeek, getAllTasks, createTask, updateTaskStatus } = useWeeklyPlan();
  const {
    notes: liveNotes, createNote, updateNote, uploadProgress,
    addComment, deleteComment, canEditNote,
  } = useNotes();

  // Local loading/error state to avoid hook's shared loading race
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [currentWeek, setCurrentWeek] = useState(() => getISOWeekString(new Date()));
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [allTasks, setAllTasks] = useState<WeeklyTask[]>([]);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [threadTask, setThreadTask] = useState<WeeklyTask | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Note detail/edit modals
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Monthly calendar state
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

  // Fetch tasks - managed with local loading state to avoid race
  const fetchTasks = useCallback(async () => {
    setPageLoading(true);
    setFetchError(null);
    try {
      const [weekTasks, all] = await Promise.all([
        getTasksByWeek(currentWeek),
        getAllTasks(),
      ]);
      // Normalize task statuses to ensure column match
      const normalizedWeek = weekTasks.map(t => ({ ...t, status: normalizeTaskStatus(t.status) }));
      const normalizedAll = all.map(t => ({ ...t, status: normalizeTaskStatus(t.status) }));
      setTasks(normalizedWeek);
      setAllTasks(normalizedAll);
      // Debug: verify week/format sync
      console.log('Current Week Filter:', currentWeek);
      console.log('Fetched Tasks:', weekTasks);
    } catch {
      setFetchError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setPageLoading(false);
    }
  }, [currentWeek, getTasksByWeek, getAllTasks]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Use liveNotes from useNotes (respects role-based Firestore rules)
  const allNotes = liveNotes;

  // Build unified Kanban cards: tasks + notes for current week
  const kanbanCards = useMemo(() => {
    type CardEntry = { task: WeeklyTask; isNote: boolean; noteRef?: Note };
    const map: Record<TaskStatus, CardEntry[]> = { 'Bekliyor': [], 'Devam Ediyor': [], 'Tamamlandı': [] };

    // Add real tasks (status already normalized; fallback for safety)
    tasks.forEach((t) => {
      if (!t || t.status == null) return;
      const col = STATUSES.includes(t.status as TaskStatus) ? (t.status as TaskStatus) : normalizeTaskStatus(t.status);
      map[col] = map[col] ?? [];
      map[col].push({ task: t, isNote: false });
    });

    // Add notes mapped into the week range
    const monday = weekStringToMonday(currentWeek);
    const sundayEnd = new Date(monday);
    sundayEnd.setUTCDate(monday.getUTCDate() + 7); // exclusive upper bound
    const mondayMs = monday.getTime();
    const sundayMs = sundayEnd.getTime();

    allNotes.forEach(note => {
      const created = note.createdAt?.toDate?.();
      if (!created) return;
      // Normalize to UTC date for comparison
      const noteUtc = Date.UTC(created.getFullYear(), created.getMonth(), created.getDate());
      if (noteUtc >= mondayMs && noteUtc < sundayMs) {
        const status = mapNoteToKanbanStatus(note.status);
        const fakeTask: WeeklyTask = {
          id: `note-${note.id}`,
          projectId: note.projectName,
          title: note.projectName || note.content?.slice(0, 60) || 'Saha Notu',
          description: note.content || '',
          status,
          weekString: currentWeek,
          color: note.status === 'Onay' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
          assignedTo: note.userName || note.userEmail,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt || note.createdAt,
        };
        map[status].push({ task: fakeTask, isNote: true, noteRef: note });
      }
    });

    return map;
  }, [tasks, allNotes, currentWeek]);

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

  const handleTimelineItemClick = useCallback((item: TimelineItem) => {
    if (item.taskRef) setThreadTask(item.taskRef);
  }, []);

  // Note modal handlers
  const handleNoteClick = useCallback((note: Note) => {
    setSelectedNote(note);
  }, []);

  const handleEditNote = useCallback((note: Note) => {
    setSelectedNote(null);
    setEditingNote(note);
    setShowAddNoteModal(true);
  }, []);

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
    { key: 'kanban', icon: LayoutGrid, label: 'Hafta' },
    { key: 'monthly', icon: CalendarDays, label: 'Ay' },
    { key: 'timeline', icon: GanttChart, label: 'Zaman Çizelgesi' },
  ];

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-slate-950' : 'bg-gray-100'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b transition-colors ${isDark ? 'bg-slate-900/95 backdrop-blur-md border-slate-800' : 'bg-white/95 backdrop-blur-md border-gray-200 shadow-sm'}`}>
        <div className="px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className={`w-5 h-5 ${isDark ? 'text-safety-orange' : 'text-safety-orange-dark'}`} />
              <div>
                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Proje Konsol</h1>
                <p className={`text-xs ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>
                  {allTasks.length} görev · {allNotes.length} saha notu · {formatWeekRange(currentWeek)}
                </p>
              </div>
            </div>

            <div className={`flex items-center rounded-lg p-1 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
              {VIEW_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = viewMode === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setViewMode(opt.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      active
                        ? isDark ? 'bg-safety-orange/20 text-safety-orange' : 'bg-white text-safety-orange-dark shadow-sm'
                        : isDark ? 'text-concrete-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {viewMode === 'kanban' && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentWeek(w => shiftWeek(w, -1))}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-600 hover:bg-gray-100'}`}
                  ><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setCurrentWeek(getISOWeekString(new Date()))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${isDark ? 'bg-slate-700/50 text-white hover:bg-slate-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                  >{currentWeek}</button>
                  <button onClick={() => setCurrentWeek(w => shiftWeek(w, 1))}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-600 hover:bg-gray-100'}`}
                  ><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}

              <div ref={addMenuRef} className="relative">
                <button
                  onClick={() => setShowAddMenu(p => !p)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-safety-orange hover:bg-safety-orange-dark text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Yeni Ekle</span>
                </button>
                {showAddMenu && (
                  <div className={`absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg border z-50 py-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                    <button
                      onClick={() => { setShowAddMenu(false); setShowAddModal(true); }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${isDark ? 'text-white hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <ClipboardList className="w-4 h-4 text-blue-400" />
                      Yeni Görev
                    </button>
                    <button
                      onClick={() => { setShowAddMenu(false); setEditingNote(null); setShowAddNoteModal(true); }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${isDark ? 'text-white hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <FileText className="w-4 h-4 text-green-400" />
                      Saha Notu
                    </button>
                  </div>
                )}
              </div>

              <button onClick={fetchTasks}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Yenile"
              ><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="px-5 py-5">
        {fetchError && (
          <div className="mb-4 p-4 rounded-xl flex items-center justify-between bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{fetchError}</p>
            </div>
            <button
              onClick={fetchTasks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tekrar Dene
            </button>
          </div>
        )}

        <AnalyticsMiniDashboard tasks={allTasks} notes={allNotes} isDark={isDark} />

        {pageLoading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-concrete-400' : 'text-gray-400'}`} />
            <span className={`text-sm ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Görevler yükleniyor…</span>
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
                      isDark={isDark}
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
                tasks={allTasks}
                notes={allNotes}
                year={calYear}
                month={calMonth}
                onPrevMonth={() => { setCalMonth(m => { if (m === 0) { setCalYear(y => y - 1); return 11; } return m - 1; }); }}
                onNextMonth={() => { setCalMonth(m => { if (m === 11) { setCalYear(y => y + 1); return 0; } return m + 1; }); }}
                onToday={() => { setCalMonth(new Date().getMonth()); setCalYear(new Date().getFullYear()); }}
                isDark={isDark}
                onItemClick={handleTimelineItemClick}
              />
            )}

            {viewMode === 'timeline' && (
              <TimelineView
                tasks={allTasks}
                isDark={isDark}
                onTaskClick={(task) => setThreadTask(task)}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <AddTaskModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreateTask} weekString={currentWeek} isDark={isDark} />

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
          canEdit={canEditNote(selectedNote)}
        />
      )}

      <TaskThreadModal
        task={threadTask}
        isOpen={!!threadTask}
        onClose={() => setThreadTask(null)}
        onStatusChanged={fetchTasks}
      />
    </div>
  );
};

export default ProjectConsole;
