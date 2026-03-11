import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, X, Loader2, AlertCircle,
  Flag, Clock, User, CalendarDays, Briefcase,
  FileText, Palette,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TaskCategoryColor, TaskPriority, UserProfile } from '../types';
import { CreateTaskInput } from '../hooks/useWeeklyPlan';
import { getCurrentWeekString } from '../utils/dateUtils';

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

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  weekString: string;
  isDark: boolean;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  weekString: parentWeekString,
  isDark,
}) => {
  const { getAllUsers } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [color, setColor] = useState<TaskCategoryColor>('bg-blue-100 text-blue-800');
  const [priority, setPriority] = useState<TaskPriority>('Normal');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [weekString, setWeekString] = useState(parentWeekString || getCurrentWeekString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (isOpen) {
      setWeekString(parentWeekString || getCurrentWeekString());
      getAllUsers()
        .then((u) => setUsers(u.filter((p) => p.isActive !== false)))
        .catch(() => {});
    }
  }, [isOpen, parentWeekString, getAllUsers]);

  const isValid = useMemo(() => title.trim().length > 0 && weekString.length > 0, [title, weekString]);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId('');
    setAssignedTo('');
    setColor('bg-blue-100 text-blue-800');
    setPriority('Normal');
    setEstimatedHours('');
    setWeekString(parentWeekString || getCurrentWeekString());
    setError(null);
    setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError('Görev Adı ve Hedef Hafta zorunludur.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        projectId: projectId.trim(),
        assignedTo: assignedTo.trim(),
        color,
        weekString,
        status: 'Bekliyor',
        priority,
        estimatedHours: estimatedHours ? Number(estimatedHours) : 0,
        plannedStart: '',
        plannedEnd: '',
        dependencies: [],
        actualHours: 0,
        materialCosts: 0,
      });
      resetForm();
      onClose();
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
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Yeni Görev Oluştur
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Haftalık iş planına yeni bir görev ekleyin
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
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
              autoFocus
            />
          </div>

          {/* Row 2 — Week + Assigned To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <CalendarDays className="w-3.5 h-3.5" />
                Hedef Hafta *
              </label>
              <input
                type="week"
                value={weekString}
                onChange={(e) => setWeekString(e.target.value)}
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

          {/* Row 3 — Priority + Estimated Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className={labelClass}>
                <Clock className="w-3.5 h-3.5" />
                Tahmini Efor (saat)
              </label>
              <input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="0"
                className={inputClass}
                disabled={saving}
                min="0"
                step="0.5"
              />
            </div>
          </div>

          {/* Row 4 — Project + Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Row 5 — Description (full width) */}
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
              onClick={() => {
                resetForm();
                onClose();
              }}
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
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 px-5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Görev Oluştur
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
