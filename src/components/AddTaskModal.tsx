import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, X, Loader2, AlertCircle, Check,
  Flag, User, CalendarDays, Briefcase,
  FileText, Palette, MapPin, Tag, Edit3,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  TaskCategoryColor, TaskPriority, TaskStatus, UserProfile, WeeklyTask,
  CATEGORY_OPTIONS,
} from '../types';
import { CreateTaskInput } from '../hooks/useWeeklyPlan';

const COLOR_OPTIONS: { value: TaskCategoryColor; label: string; swatch: string }[] = [
  { value: 'bg-blue-100 text-blue-800', label: 'Mavi', swatch: 'bg-blue-500' },
  { value: 'bg-green-100 text-green-800', label: 'Yeşil', swatch: 'bg-green-500' },
  { value: 'bg-yellow-100 text-yellow-800', label: 'Sarı', swatch: 'bg-yellow-500' },
  { value: 'bg-red-100 text-red-800', label: 'Kırmızı', swatch: 'bg-red-500' },
  { value: 'bg-purple-100 text-purple-800', label: 'Mor', swatch: 'bg-purple-500' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; dot: string; ring: string }[] = [
  { value: 'Düşük',  label: 'Düşük',  dot: 'bg-gray-400',   ring: 'ring-gray-300' },
  { value: 'Normal', label: 'Normal', dot: 'bg-blue-500',   ring: 'ring-blue-300' },
  { value: 'Yüksek', label: 'Yüksek', dot: 'bg-amber-500',  ring: 'ring-amber-300' },
  { value: 'Kritik', label: 'Kritik', dot: 'bg-red-600',    ring: 'ring-red-400' },
];

const STATUS_OPTIONS: TaskStatus[] = ['Bekliyor', 'Devam Ediyor', 'Tamamlandı'];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  /** When provided, the modal opens in edit mode and pre-fills all fields */
  taskToEdit?: WeeklyTask | null;
  /** Called when in edit mode */
  onUpdate?: (taskId: string, data: Partial<Omit<WeeklyTask, 'id' | 'createdAt'>>) => Promise<void>;
  isDark: boolean;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  taskToEdit,
  onUpdate,
  isDark,
}) => {
  const { getAllUsers } = useAuth();

  const isEditMode = !!taskToEdit;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [color, setColor] = useState<TaskCategoryColor>('bg-blue-100 text-blue-800');
  const [priority, setPriority] = useState<TaskPriority>('Normal');
  const [status, setStatus] = useState<TaskStatus>('Bekliyor');
  const [targetDate, setTargetDate] = useState(todayISO());
  const [adaParsel, setAdaParsel] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    getAllUsers()
      .then((u) => setUsers(u.filter((p) => p.isActive !== false)))
      .catch(() => {});

    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setProjectId(taskToEdit.projectId || '');
      setAssignedTo(taskToEdit.assignedTo || '');
      setColor(taskToEdit.color || 'bg-blue-100 text-blue-800');
      setPriority(taskToEdit.priority || 'Normal');
      setStatus(taskToEdit.status || 'Bekliyor');
      setTargetDate(taskToEdit.targetDate || todayISO());
      setAdaParsel(taskToEdit.adaParsel || '');
      setCategory(taskToEdit.category || '');
      setSubCategory(taskToEdit.subCategory || '');
    } else {
      resetForm();
    }
    setError(null);
    setSuccessMsg(null);
  }, [isOpen, taskToEdit, getAllUsers]);

  const isValid = useMemo(
    () => title.trim().length > 0 && targetDate.length > 0,
    [title, targetDate],
  );

  if (!isOpen) return null;

  function resetForm() {
    setTitle('');
    setDescription('');
    setProjectId('');
    setAssignedTo('');
    setColor('bg-blue-100 text-blue-800');
    setPriority('Normal');
    setStatus('Bekliyor');
    setTargetDate(todayISO());
    setAdaParsel('');
    setCategory('');
    setSubCategory('');
    setError(null);
    setSaving(false);
    setSuccessMsg(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError('Görev Adı ve Hedef Bitiş Tarihi zorunludur.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (isEditMode && onUpdate && taskToEdit) {
        await onUpdate(taskToEdit.id, {
          title: title.trim(),
          description: description.trim(),
          projectId: projectId.trim(),
          assignedTo: assignedTo.trim(),
          color,
          targetDate,
          status,
          priority,
          adaParsel: adaParsel.trim(),
          category,
          subCategory: subCategory.trim(),
        });
        setSuccessMsg('Görev başarıyla güncellendi');
        setTimeout(() => { resetForm(); onClose(); }, 800);
      } else {
        await onSubmit({
          title: title.trim(),
          description: description.trim(),
          projectId: projectId.trim(),
          assignedTo: assignedTo.trim(),
          color,
          targetDate,
          status: 'Bekliyor',
          priority,
          adaParsel: adaParsel.trim(),
          category,
          subCategory: subCategory.trim(),
          plannedStart: '',
          plannedEnd: '',
          dependencies: [],
          actualHours: 0,
          materialCosts: 0,
        });
        resetForm();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const inputBase =
    'w-full rounded-lg px-3.5 py-2.5 text-sm transition-all border focus:outline-none focus:ring-2';
  const inputTheme = isDark
    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:ring-blue-500/40 focus:border-blue-500'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-500/30 focus:border-blue-500';
  const inputClass = `${inputBase} ${inputTheme}`;
  const labelClass = `flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          resetForm();
          onClose();
        }
      }}
    >
      <div
        className={`rounded-2xl w-full max-w-2xl shadow-2xl border max-h-[92vh] overflow-y-auto ${
          isDark ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-gray-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-slate-700/60' : 'border-gray-100'
          }`}
        >
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isEditMode ? <><Edit3 className="w-5 h-5" /> Görevi Düzenle</> : 'Yeni Görev Oluştur'}
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {isEditMode ? 'Tüm alanları güncelleyebilirsiniz' : 'İş planına yeni bir görev ekleyin'}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            disabled={saving}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 rounded-lg flex items-center gap-3 bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-lg flex items-center gap-3 bg-green-500/10 border border-green-500/30">
              <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-green-400 text-sm">{successMsg}</p>
            </div>
          )}

          {/* Row 1 — Task Title (full width) */}
          <div>
            <label className={labelClass}>
              <Briefcase className="w-3.5 h-3.5" />
              İş Kalemi / Görev Adı *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Zemin etüdü rapor revizyonu"
              className={inputClass}
              required
              disabled={saving}
              autoFocus={!isEditMode}
            />
          </div>

          {/* Row 2 — Target Date + Assigned To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <CalendarDays className="w-3.5 h-3.5" />
                Hedef Bitiş Tarihi *
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className={inputClass}
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className={labelClass}>
                <User className="w-3.5 h-3.5" />
                Sorumlu
              </label>
              {users.length > 0 ? (
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className={inputClass}
                  disabled={saving}
                >
                  <option value="">Seçiniz</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.displayName || u.username}>
                      {u.displayName || u.username}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Kişi adı"
                  className={inputClass}
                  disabled={saving}
                />
              )}
            </div>
          </div>

          {/* Row 3 — Ada/Parsel + Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <MapPin className="w-3.5 h-3.5" />
                Ada / Parsel
              </label>
              <input
                type="text"
                value={adaParsel}
                onChange={(e) => setAdaParsel(e.target.value)}
                placeholder="Örn: 1234 / 5"
                className={inputClass}
                disabled={saving}
              />
            </div>
            <div>
              <label className={labelClass}>
                <Tag className="w-3.5 h-3.5" />
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setSubCategory(''); }}
                className={inputClass}
                disabled={saving}
              >
                <option value="">Seçiniz</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4 — Alt Kategori + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <Tag className="w-3.5 h-3.5" />
                Alt Kategori
              </label>
              <input
                type="text"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="Alt kategori (opsiyonel)"
                className={inputClass}
                disabled={saving}
              />
            </div>
            <div>
              <label className={labelClass}>
                <Flag className="w-3.5 h-3.5" />
                Öncelik
              </label>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    disabled={saving}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all border ${
                      priority === opt.value
                        ? `ring-2 ${opt.ring} ${
                            isDark
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-gray-50 border-gray-300 text-gray-900'
                          }`
                        : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 5 — Status (only in edit mode) + Project + Color */}
          <div className={`grid grid-cols-1 ${isEditMode ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
            {isEditMode && (
              <div>
                <label className={labelClass}>
                  Durum
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className={inputClass}
                  disabled={saving}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelClass}>
                <FileText className="w-3.5 h-3.5" />
                Proje
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Proje adı"
                className={inputClass}
                disabled={saving}
              />
            </div>
            <div>
              <label className={labelClass}>
                <Palette className="w-3.5 h-3.5" />
                Renk Etiketi
              </label>
              <div className="flex items-center gap-2 pt-1">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setColor(opt.value)}
                    disabled={saving}
                    title={opt.label}
                    className={`w-8 h-8 rounded-full ${opt.swatch} transition-all ${
                      color === opt.value
                        ? 'ring-2 ring-offset-2 ring-blue-500'
                        : 'opacity-50 hover:opacity-100'
                    } ${isDark ? 'ring-offset-slate-900' : 'ring-offset-white'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Row 6 — Description (full width) */}
          <div>
            <label className={labelClass}>
              <FileText className="w-3.5 h-3.5" />
              Detaylı Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Görev detaylarını, kabul kriterlerini veya notları yazın..."
              rows={4}
              className={inputClass}
              disabled={saving}
            />
          </div>

          {/* Footer */}
          <div
            className={`flex items-center justify-between pt-3 border-t ${
              isDark ? 'border-slate-700/60' : 'border-gray-100'
            }`}
          >
            <button
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              disabled={saving}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving || !isValid}
              className={`flex items-center gap-2 text-white font-semibold text-sm py-2.5 px-5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isEditMode
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditMode ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
                </>
              ) : (
                <>
                  {isEditMode ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isEditMode ? 'Görevi Güncelle' : 'Görev Oluştur'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
