import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Type,
  Hash,
  Calendar,
  List,
  ListChecks,
  AlignLeft,
  CheckSquare,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FormField, NoteSchema, FormFieldType } from '../../types';
import { getNoteSchema, saveNoteSchema, labelToKey, DEFAULT_NOTE_SCHEMA } from '../../services/noteSchemaService';

const FORM_FIELD_TYPES: { value: FormFieldType; label: string; icon: React.ReactNode }[] = [
  { value: 'text', label: 'Metin', icon: <Type className="w-4 h-4" /> },
  { value: 'number', label: 'Sayı', icon: <Hash className="w-4 h-4" /> },
  { value: 'date', label: 'Tarih', icon: <Calendar className="w-4 h-4" /> },
  { value: 'select', label: 'Seçim Listesi', icon: <List className="w-4 h-4" /> },
  { value: 'multiselect', label: 'Çoklu Seçim', icon: <ListChecks className="w-4 h-4" /> },
  { value: 'textarea', label: 'Uzun Metin', icon: <AlignLeft className="w-4 h-4" /> },
  { value: 'checkbox', label: 'Onay Kutusu', icon: <CheckSquare className="w-4 h-4" /> }
];

function getTypeIcon(type: FormFieldType) {
  return FORM_FIELD_TYPES.find((t) => t.value === type)?.icon ?? <Type className="w-4 h-4" />;
}

function getTypeLabel(type: FormFieldType) {
  return FORM_FIELD_TYPES.find((t) => t.value === type)?.label ?? type;
}

const TYPE_HINTS: Record<FormFieldType, string> = {
  text: 'Kısa metin girişleri için.',
  number: 'Sadece rakam girişi (Metre, Adet, Derece vb.) için.',
  date: 'Takvimden tarih seçtirmek için.',
  select: 'Açılır menüden tek bir seçenek seçtirmek için.',
  multiselect: 'Birden fazla seçenek işaretletmek için.',
  textarea: 'Uzun metin girişleri için.',
  checkbox: 'Evet/Hayır onay kutusu için.'
};

function SubOptionsManager({
  parentOptions,
  subOptions,
  onChange,
  isDark: _isDark
}: {
  parentOptions: string[];
  subOptions: Record<string, string[]>;
  onChange: (so: Record<string, string[]>) => void;
  isDark: boolean;
}) {
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const addSubOption = (parent: string) => {
    const v = (inputValues[parent] || '').trim();
    if (!v) return;
    const current = subOptions[parent] || [];
    if (current.includes(v)) return;
    onChange({ ...subOptions, [parent]: [...current, v] });
    setInputValues((prev) => ({ ...prev, [parent]: '' }));
  };

  const removeSubOption = (parent: string, idx: number) => {
    const current = subOptions[parent] || [];
    onChange({ ...subOptions, [parent]: current.filter((_, i) => i !== idx) });
  };

  const inputClass = 'flex-1 rounded-lg px-3 py-2 text-sm border bg-white border-slate-200 text-slate-800 placeholder-slate-400';

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Her ana seçenek için alt kategorileri tanımlayın.
      </p>
      {parentOptions.map((parent) => {
        const isExpanded = expandedParent === parent;
        const subs = subOptions[parent] || [];
        return (
          <div key={parent} className="rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setExpandedParent(isExpanded ? null : parent)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <span>{parent} {subs.length > 0 && <span className="text-xs text-slate-400">({subs.length} alt kategori)</span>}</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-slate-200">
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={inputValues[parent] || ''}
                    onChange={(e) => setInputValues((prev) => ({ ...prev, [parent]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubOption(parent))}
                    placeholder="Alt kategori yazın..."
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => addSubOption(parent)}
                    disabled={!(inputValues[parent] || '').trim()}
                    className="flex items-center justify-center w-10 h-9 rounded-lg bg-brand hover:bg-brand-light text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {subs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {subs.map((sub, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm bg-slate-100 text-slate-800"
                      >
                        {sub}
                        <button
                          type="button"
                          onClick={() => removeSubOption(parent, idx)}
                          className="p-0.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OptionsManager({
  options,
  onChange,
  isDark: _isDark,
  disabled
}: {
  options: string[];
  onChange: (opts: string[]) => void;
  isDark: boolean;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState('');

  const addOption = () => {
    const v = inputValue.trim();
    if (!v || options.includes(v)) return;
    onChange([...options, v]);
    setInputValue('');
  };

  const removeOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  const inputClass = 'flex-1 rounded-lg px-3 py-2 text-sm border bg-white border-slate-200 text-slate-800 placeholder-slate-400';

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Aşağıdaki kutuya seçenek yazıp + butonuna basınız.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
          placeholder="Seçenek yazın..."
          className={inputClass}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={addOption}
          disabled={!inputValue.trim() || options.includes(inputValue.trim()) || disabled}
          className="flex items-center justify-center w-10 h-9 rounded-lg bg-brand hover:bg-brand-light text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Ekle"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {options.map((opt, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm bg-slate-100 text-slate-800"
            >
              {opt}
              <button
                type="button"
                onClick={() => removeOption(idx)}
                disabled={disabled}
                className="p-0.5 rounded hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                title="Kaldır"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldPreview({ field, isDark: _isDark }: { field: FormField; isDark: boolean }) {
  const baseClass = 'w-full rounded-lg px-3 py-2 text-sm border bg-slate-50 border-slate-200 text-slate-500';

  if (field.type === 'text') return <input type="text" placeholder={field.placeholder || field.label} className={baseClass} readOnly disabled />;
  if (field.type === 'number') return <input type="number" placeholder={field.placeholder} className={baseClass} readOnly disabled />;
  if (field.type === 'date') return <input type="date" className={baseClass} readOnly disabled />;
  if (field.type === 'select') {
    return (
      <select className={baseClass} disabled>
        <option value="">Seçiniz...</option>
        {(field.options || []).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (field.type === 'multiselect') {
    return (
      <div className="space-y-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
        {(field.options || []).slice(0, 3).map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm cursor-default">
            <input type="checkbox" className="rounded" readOnly disabled />
            <span className="text-slate-500">{o}</span>
          </label>
        ))}
        {(field.options?.length ?? 0) > 3 && (
          <span className="text-xs text-slate-400">+{(field.options?.length ?? 0) - 3} daha</span>
        )}
      </div>
    );
  }
  if (field.type === 'textarea') return <textarea rows={2} placeholder={field.placeholder} className={`${baseClass} resize-none`} readOnly disabled />;
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm cursor-default">
        <input type="checkbox" className="rounded" readOnly disabled />
        <span className="text-slate-500">{field.placeholder || field.label}</span>
      </label>
    );
  }
  return <input type="text" className={baseClass} readOnly disabled />;
}

const FormBuilder: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [schema, setSchema] = useState<NoteSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newField, setNewField] = useState<Partial<FormField>>({
    id: '',
    label: '',
    type: 'text',
    required: false,
    options: [],
    subOptions: {},
    order: 0,
    placeholder: '',
    description: '',
    showInTable: false,
    showInFilter: false
  });
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const s = await getNoteSchema();
        if (!cancelled) setSchema(s);
      } catch (e) {
        if (!cancelled) setError('Şema yüklenemedi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleLabelChange = useCallback(
    (label: string, _currentId?: string) => {
      setNewField((prev) => ({
        ...prev,
        label,
        id: idManuallyEdited ? (prev?.id ?? '') : labelToKey(label)
      }));
    },
    [idManuallyEdited]
  );

  const handleAddField = () => {
    if (!schema) return;
    setError(null);
    if (!newField.label?.trim()) {
      setError('Soru / Başlık İsmi gerekli');
      return;
    }
    const id = (newField.id || labelToKey(newField.label)).trim() || labelToKey(newField.label);
    if (!id) {
      setError('Geçerli bir anahtar oluşturulamadı');
      return;
    }
    if (schema.fields.some((f) => f.id === id)) {
      setError('Bu anahtar zaten kullanılıyor. Benzersiz bir anahtar girin.');
      return;
    }
    const type = (newField.type || 'text') as FormFieldType;
    if ((type === 'select' || type === 'multiselect') && (!newField.options || newField.options.length === 0)) {
      setError('Seçenekler Listesi için en az bir seçenek ekleyin.');
      return;
    }
    const maxOrder = schema.fields.length > 0 ? Math.max(...schema.fields.map((f) => f.order)) : -1;
    const field: FormField = {
      id,
      label: newField.label.trim(),
      type,
      required: Boolean(newField.required),
      options: type === 'select' || type === 'multiselect' ? (newField.options || []) : undefined,
      subOptions: type === 'select' && newField.subOptions && Object.keys(newField.subOptions).length > 0 ? newField.subOptions : undefined,
      order: maxOrder + 1,
      placeholder: newField.placeholder || undefined,
      description: newField.description || undefined,
      showInTable: Boolean(newField.showInTable),
      showInFilter: Boolean(newField.showInFilter)
    };
    setSchema({ ...schema, fields: [...schema.fields, field].sort((a, b) => a.order - b.order) });
    setNewField({ id: '', label: '', type: 'text', required: false, options: [], subOptions: {}, order: 0, placeholder: '', description: '', showInTable: false, showInFilter: false });
    setIdManuallyEdited(false);
    setShowAddForm(false);
  };

  const handleUpdateField = (index: number, updates: Partial<FormField>) => {
    if (!schema) return;
    setError(null);
    const fields = [...schema.fields];
    const existing = fields[index];
    const next = { ...existing, ...updates } as FormField;

    if (updates.label !== undefined && !updates.id) {
      next.label = updates.label.trim();
    }
    if (updates.id !== undefined) {
      const dup = schema.fields.some((f, i) => i !== index && f.id === updates.id);
      if (dup) {
        setError('Bu anahtar zaten kullanılıyor.');
        return;
      }
      next.id = updates.id;
    }
    if ((next.type === 'select' || next.type === 'multiselect') && (!next.options || next.options.length === 0)) {
      setError('Seçenekler Listesi için en az bir seçenek ekleyin.');
      return;
    }

    fields[index] = next;
    setSchema({ ...schema, fields });
  };

  const handleLabelChangeEdit = (index: number, label: string) => {
    handleUpdateField(index, { label: label.trim() });
  };

  const handleDeleteField = (index: number) => {
    if (!schema || !window.confirm('Bu soruyu silmek istediğinizden emin misiniz?')) return;
    const fields = schema.fields.filter((_, i) => i !== index);
    setSchema({ ...schema, fields });
    setExpandedIndex(null);
  };

  const handleMove = (index: number, dir: 'up' | 'down') => {
    if (!schema) return;
    const fields = [...schema.fields];
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    const reordered = fields.map((f, i) => ({ ...f, order: i }));
    setSchema({ ...schema, fields: reordered });
    setExpandedIndex(target);
  };

  const handleSave = async () => {
    if (!schema) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await saveNoteSchema(schema);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      console.error('Schema save error:', e);
      const err = e as { code?: string; message?: string };
      const code = err?.code ?? '';
      const detail = err?.message ?? (e instanceof Error ? e.message : String(e));
      const isPermissionDenied = code === 'permission-denied' || String(detail).toLowerCase().includes('permission');
      const uidHint = currentUser?.uid ? ` (Firestore'da users koleksiyonunda belge ID: ${currentUser.uid})` : '';
      const adminHint = isAdmin
        ? ' Uygulama sizi yönetici sayıyor; Firestore kuralları yazmaya izin vermiyor.'
        : ' Uygulama sizi yönetici olarak görmüyor; users belgenizde role: "admin" olmalı.';
      const msg = isPermissionDenied
        ? `Yetki reddedildi.${adminHint}${uidHint} Belgede "role" alanı "admin" (küçük harf) olmalı. Kuralları deploy ettiniz mi?${detail ? ` Sunucu: ${detail}` : ''}`
        : `Şema kaydedilemedi. ${detail ? detail : 'Yönetici yetkinizi kontrol edin.'}`;
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    if (!window.confirm('Varsayılan şemaya dönmek istediğinizden emin misiniz? Mevcut özel alanlar silinecek.')) return;
    setSchema(DEFAULT_NOTE_SCHEMA);
    setShowAddForm(false);
    setExpandedIndex(null);
  };

  if (loading || !schema) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  const sortedFields = [...schema.fields].sort((a, b) => a.order - b.order);

  const inputClassBase = 'w-full rounded-lg px-4 py-2 border bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand';
  const inputClassSm = 'w-full rounded-lg px-3 py-2 text-sm border bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand';

  return (
    <div className="min-h-screen bg-slate-50 transition-colors">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="p-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-100"
                title="Ana Sayfa"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Saha Formu Yapılandırma</h1>
                <p className="text-xs text-slate-500">Saha ekiplerinin dolduracağı proje form alanlarını oluşturun</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetToDefault}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-slate-500 hover:bg-slate-100"
              >
                Varsayılana Dön
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-light text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Formu Kaydet ve Yayınla
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm break-words whitespace-pre-wrap flex-1">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700 text-sm">Form kaydedildi ve yayınlandı. Saha ekipleri yeni formu kullanarak kayıt oluşturabilir.</p>
          </div>
        )}

        <div className="rounded-xl border overflow-hidden border-slate-200 bg-white">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Sorular</h2>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setError(null);
                setNewField({ id: '', label: '', type: 'text', required: false, options: [], subOptions: {}, order: 0, placeholder: '', description: '', showInTable: false, showInFilter: false });
                setIdManuallyEdited(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-light text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Yeni Soru Ekle
            </button>
          </div>

          {showAddForm && (
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">Soru / Başlık İsmi *</label>
                    <input
                      type="text"
                      value={newField.label}
                      onChange={(e) => handleLabelChange(e.target.value)}
                      placeholder="Örn: Beton Sıcaklığı"
                      className={inputClassBase}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">Cevap Türü</label>
                    <select
                      value={newField.type}
                      onChange={(e) => setNewField((p) => ({ ...p, type: e.target.value as FormFieldType }))}
                      className={inputClassBase}
                    >
                      {FORM_FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <p className="text-xs mt-1 text-slate-500">
                      {TYPE_HINTS[(newField.type || 'text') as FormFieldType]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="add-required"
                      checked={Boolean(newField.required)}
                      onChange={(e) => setNewField((p) => ({ ...p, required: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="add-required" className="text-sm text-slate-700">
                      Bu alanın doldurulması zorunlu olsun mu?
                    </label>
                  </div>
                  <div className="rounded-lg border p-3 space-y-3 border-slate-200 bg-slate-100/50">
                    <p className="text-xs font-medium text-slate-500">Görünürlük Ayarları</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="add-showInTable"
                        checked={Boolean(newField.showInTable)}
                        onChange={(e) => setNewField((p) => ({ ...p, showInTable: e.target.checked }))}
                        className="rounded"
                      />
                      <label htmlFor="add-showInTable" className="text-sm text-slate-700">
                        Tablo Sütunlarında Göster
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="add-showInFilter"
                        checked={Boolean(newField.showInFilter)}
                        onChange={(e) => setNewField((p) => ({ ...p, showInFilter: e.target.checked }))}
                        className="rounded"
                      />
                      <label htmlFor="add-showInFilter" className="text-sm text-slate-700">
                        Filtre Alanlarında Göster
                      </label>
                    </div>
                  </div>
                  {(newField.type === 'select' || newField.type === 'multiselect') && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">
                          Seçenekler Listesi *
                        </label>
                        <p className="text-xs mb-2 text-slate-500">
                          Saha personelinin seçebileceği maddeleri ekleyin.
                        </p>
                        <OptionsManager
                          options={newField.options || []}
                          onChange={(opts) => setNewField((p) => ({ ...p, options: opts }))}
                          isDark={false}
                        />
                      </div>
                      {newField.type === 'select' && (newField.options || []).length > 0 && (
                        <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700">
                            Alt Kategoriler (Opsiyonel)
                          </label>
                          <SubOptionsManager
                            parentOptions={newField.options || []}
                            subOptions={newField.subOptions || {}}
                            onChange={(so) => setNewField((p) => ({ ...p, subOptions: so }))}
                            isDark={false}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">İpucu Yazısı</label>
                    <input
                      type="text"
                      value={newField.placeholder || ''}
                      onChange={(e) => setNewField((p) => ({ ...p, placeholder: e.target.value || undefined }))}
                      placeholder="Örn: Derece giriniz..."
                      className={`${inputClassBase} text-sm`}
                    />
                    <p className="text-xs mt-1 text-slate-500">
                      Kullanıcı kutunun içinde silik şekilde ne görecek?
                    </p>
                  </div>
                  <details className="rounded-lg border border-slate-200 bg-slate-100/50">
                    <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-slate-500">
                      Gelişmiş Ayarlar
                    </summary>
                    <div className="p-4 pt-0 space-y-3">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-500">
                          Sistem Kimliği (Otomatik)
                        </label>
                        <input
                          type="text"
                          value={newField.id}
                          onChange={(e) => {
                            setIdManuallyEdited(true);
                            setNewField((p) => ({ ...p, id: e.target.value }));
                          }}
                          placeholder="Otomatik oluşturulur"
                          readOnly={!idManuallyEdited}
                          className={`${inputClassSm} font-mono ${!idManuallyEdited ? 'opacity-70 cursor-default' : ''}`}
                        />
                        <p className="text-xs mt-1 text-slate-500">
                          Sistem tarafından otomatik oluşturulur, dokunmanıza gerek yoktur.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-500">Açıklama</label>
                        <input
                          type="text"
                          value={newField.description || ''}
                          onChange={(e) => setNewField((p) => ({ ...p, description: e.target.value || undefined }))}
                          placeholder="Alan altında bilgilendirme metni"
                          className={inputClassSm}
                        />
                      </div>
                    </div>
                  </details>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setError(null);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100"
                    >
                      İptal
                    </button>
                    <button onClick={handleAddField} className="px-4 py-2 bg-brand hover:bg-brand-light text-white rounded-lg text-sm font-medium">
                      Soruyu Ekle
                    </button>
                  </div>
                </div>
                <div className="rounded-lg p-4 bg-slate-100">
                  <p className="text-xs font-medium mb-3 text-slate-500">Önizleme</p>
                  <FieldPreview field={newField as FormField} isDark={false} />
                </div>
              </div>
            </div>
          )}

          <ul className="divide-y divide-slate-200">
            {sortedFields.length === 0 ? (
              <li className="p-8 text-center text-slate-500">Henüz soru yok. Yeni soru ekleyin.</li>
            ) : (
              sortedFields.map((field, index) => {
                const isExpanded = expandedIndex === index;
                return (
                  <li
                    key={field.id}
                    className="border-b border-slate-200 last:border-b-0"
                  >
                    <div
                      onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      className={`flex items-center justify-between gap-4 p-4 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
                          {getTypeIcon(field.type)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate text-slate-800">{field.label}</p>
                          <p className="text-xs font-mono truncate text-slate-400">{field.id}</p>
                        </div>
                        <span className="text-xs shrink-0 text-slate-400">
                          {getTypeLabel(field.type)} • {field.required ? 'Zorunlu' : 'İsteğe bağlı'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 rounded transition-colors disabled:opacity-30 hover:bg-slate-100 text-slate-500"
                          title="Yukarı taşı"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === sortedFields.length - 1}
                          className="p-1.5 rounded transition-colors disabled:opacity-30 hover:bg-slate-100 text-slate-500"
                          title="Aşağı taşı"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpandedIndex(isExpanded ? null : index)}
                          className="p-1.5 rounded transition-colors hover:bg-slate-100 text-slate-500"
                          title={isExpanded ? 'Daralt' : 'Düzenle'}
                        >
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteField(index)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Bu soruyu siler"
                        >
                          <Trash2 className="w-4 h-4" />
                          Soruyu Sil
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-slate-200 bg-slate-50">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-1 text-slate-700">Soru / Başlık İsmi *</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => handleLabelChangeEdit(index, e.target.value)}
                                placeholder="Örn: Beton Sıcaklığı"
                                className={inputClassSm}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1 text-slate-700">Cevap Türü</label>
                              <select
                                value={field.type}
                                onChange={(e) => handleUpdateField(index, { type: e.target.value as FormFieldType })}
                                className={inputClassSm}
                              >
                                {FORM_FIELD_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                              <p className="text-xs mt-1 text-slate-500">
                                {TYPE_HINTS[field.type]}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id={`req-${field.id}`}
                                checked={field.required}
                                onChange={(e) => handleUpdateField(index, { required: e.target.checked })}
                                className="rounded"
                              />
                              <label htmlFor={`req-${field.id}`} className="text-sm text-slate-700">
                                Bu alanın doldurulması zorunlu olsun mu?
                              </label>
                            </div>
                            <div className="rounded-lg border p-3 space-y-3 border-slate-200 bg-slate-100/50">
                              <p className="text-xs font-medium text-slate-500">Görünürlük Ayarları</p>
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id={`showInTable-${field.id}`}
                                  checked={Boolean(field.showInTable)}
                                  onChange={(e) => handleUpdateField(index, { showInTable: e.target.checked })}
                                  className="rounded"
                                />
                                <label htmlFor={`showInTable-${field.id}`} className="text-sm text-slate-700">
                                  Tablo Sütunlarında Göster
                                </label>
                              </div>
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id={`showInFilter-${field.id}`}
                                  checked={Boolean(field.showInFilter)}
                                  onChange={(e) => handleUpdateField(index, { showInFilter: e.target.checked })}
                                  className="rounded"
                                />
                                <label htmlFor={`showInFilter-${field.id}`} className="text-sm text-slate-700">
                                  Filtre Alanlarında Göster
                                </label>
                              </div>
                            </div>
                            {(field.type === 'select' || field.type === 'multiselect') && (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1 text-slate-700">
                                    Seçenekler Listesi *
                                  </label>
                                  <p className="text-xs mb-2 text-slate-500">
                                    Saha personelinin seçebileceği maddeleri ekleyin.
                                  </p>
                                  <OptionsManager
                                    options={field.options || []}
                                    onChange={(opts) => handleUpdateField(index, { options: opts })}
                                    isDark={false}
                                  />
                                </div>
                                {field.type === 'select' && (field.options || []).length > 0 && (
                                  <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-700">
                                      Alt Kategoriler (Opsiyonel)
                                    </label>
                                    <SubOptionsManager
                                      parentOptions={field.options || []}
                                      subOptions={field.subOptions || {}}
                                      onChange={(so) => handleUpdateField(index, { subOptions: so })}
                                      isDark={false}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              <label className="block text-sm font-medium mb-1 text-slate-700">İpucu Yazısı</label>
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) => handleUpdateField(index, { placeholder: e.target.value || undefined })}
                                placeholder="Örn: Derece giriniz..."
                                className={inputClassSm}
                              />
                            </div>
                            <details className="rounded-lg border border-slate-200 bg-slate-100/50">
                              <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-slate-500">
                                Gelişmiş Ayarlar
                              </summary>
                              <div className="p-4 pt-0 space-y-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-slate-500">
                                    Sistem Kimliği (Otomatik)
                                  </label>
                                  <input
                                    type="text"
                                    value={field.id}
                                    onChange={(e) => handleUpdateField(index, { id: e.target.value })}
                                    placeholder="Otomatik oluşturulur"
                                    className={`${inputClassSm} font-mono`}
                                  />
                                  <p className="text-xs mt-1 text-slate-500">
                                    Sistem tarafından otomatik oluşturulur, dokunmanıza gerek yoktur.
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-slate-500">Açıklama</label>
                                  <input
                                    type="text"
                                    value={field.description || ''}
                                    onChange={(e) => handleUpdateField(index, { description: e.target.value || undefined })}
                                    placeholder="Alan altında bilgilendirme metni"
                                    className={inputClassSm}
                                  />
                                </div>
                              </div>
                            </details>
                          </div>
                          <div className="rounded-lg p-4 bg-slate-100">
                            <p className="text-xs font-medium mb-3 text-slate-500">Önizleme</p>
                            <FieldPreview field={field} isDark={false} />
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </main>
    </div>
  );
};

export default FormBuilder;
