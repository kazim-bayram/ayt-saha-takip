import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Plus,
  Layers
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { NoteFormData, Note, NoteStatus, UploadProgress, getNoteImages, normalizeStatus, FormField, FormFieldType, getNoteFieldValue } from '../types';
import { useNoteSchema } from '../hooks/useNoteSchema';

interface ImagePreview {
  file: File;
  previewUrl: string;
}

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NoteFormData, existingImageUrls?: string[]) => Promise<void>;
  editNote?: Note | null;
  uploadProgress?: UploadProgress | null;
}

const MAX_IMAGES = 4;

const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editNote,
  uploadProgress
}) => {
  const { isDark } = useTheme();
  const { schema, loading: schemaLoading } = useNoteSchema();
  const [content, setContent] = useState('');
  const [projectName, setProjectName] = useState('');
  const [status, setStatus] = useState<NoteStatus>('Eksik');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fields = [...schema.fields].sort((a, b) => a.order - b.order);

  // Populate form when editing or reset when adding
  useEffect(() => {
    if (!isOpen) return;
    if (editNote) {
      setContent(editNote.content || '');
      setProjectName(editNote.projectName || '');
      setStatus(normalizeStatus(editNote.status));
      const images = getNoteImages(editNote);
      setExistingImages(images);
      const data: Record<string, any> = {};
      fields.forEach((f) => {
        const val = getNoteFieldValue(editNote, f.id);
        if (val !== undefined && val !== null && val !== '') {
          data[f.id] = f.type === 'checkbox' ? Boolean(val) : f.type === 'multiselect' ? (Array.isArray(val) ? val : [val]) : val;
        } else if (f.type === 'checkbox') {
          data[f.id] = false;
        } else if (f.type === 'date') {
          data[f.id] = editNote.date || (editNote.createdAt?.toDate ? new Date(editNote.createdAt.toDate()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        } else if (f.type === 'multiselect') {
          data[f.id] = [];
        } else {
          data[f.id] = '';
        }
      });
      setFormData(data);
    } else {
      const initial: Record<string, any> = {};
      fields.forEach((f) => {
        if (f.type === 'checkbox') initial[f.id] = false;
        else if (f.type === 'date') initial[f.id] = new Date().toISOString().split('T')[0];
        else if (f.type === 'multiselect') initial[f.id] = [];
        else initial[f.id] = '';
      });
      setFormData(initial);
      setContent('');
      setProjectName('');
      setStatus('Eksik');
      imagePreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setImagePreviews([]);
      setExistingImages([]);
      setError(null);
    }
  }, [editNote, isOpen, schema.fields]); // schema.fields for re-populate when schema loads

  const resetForm = () => {
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
        if (f.type === 'checkbox') initial[f.id] = false;
        else if (f.type === 'date') initial[f.id] = new Date().toISOString().split('T')[0];
        else if (f.type === 'multiselect') initial[f.id] = [];
        else initial[f.id] = '';
      });
    setFormData(initial);
    setContent('');
    setProjectName('');
    setStatus('Eksik');
    imagePreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setImagePreviews([]);
    setExistingImages([]);
    setError(null);
  };

  const setFieldValue = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const currentCount = imagePreviews.length + existingImages.length;
    if (currentCount + files.length > MAX_IMAGES) {
      setError('En fazla 4 fotoğraf yükleyebilirsiniz.');
      e.target.value = '';
      return;
    }
    const newPreviews: ImagePreview[] = [];
    const errors: string[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: Geçersiz dosya türü`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: 10MB'dan büyük`);
        return;
      }
      newPreviews.push({ file, previewUrl: URL.createObjectURL(file) });
    });
    if (errors.length > 0) setError(errors.join(', '));
    else setError(null);
    if (newPreviews.length > 0) setImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removeImagePreview = (index: number) => {
    setImagePreviews((prev) => {
      const toRemove = prev[index];
      URL.revokeObjectURL(toRemove.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    imagePreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setImagePreviews([]);
    setExistingImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const validateForm = (): boolean => {
    if (!projectName.trim()) {
      setError('Lütfen bir proje adı girin');
      return false;
    }
    for (const field of fields) {
      if (field.required) {
        const val = formData[field.id];
        const empty = val === undefined || val === null || (typeof val === 'string' && !val.trim());
        if (field.type === 'checkbox') {
          if (val !== true) {
            setError(`${field.label} işaretlenmeli`);
            return false;
          }
        } else if (field.type === 'multiselect') {
          if (!Array.isArray(val) || val.length === 0) {
            setError(`${field.label} için en az bir seçenek seçin`);
            return false;
          }
        } else if (empty) {
          setError(`${field.label} gerekli`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const imageFiles = imagePreviews.map((p) => p.file);
      const payload: NoteFormData = {
        content: content.trim(),
        projectName: projectName.trim(),
        status,
        images: imageFiles,
        data: { ...formData }
      };
      await onSubmit(payload, existingImages.length > 0 ? existingImages : undefined);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !submitting) onClose();
  };

  const totalImages = imagePreviews.length + existingImages.length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        className={`rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border animate-slide-up ${
          isDark ? 'bg-slate-850 border-slate-700/50' : 'bg-white border-gray-200'
        }`}
      >
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDark ? 'border-slate-700/50' : 'border-gray-200'
          }`}
        >
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {editNote ? 'Kaydı Düzenle' : 'Saha Kaydı Oluştur'}
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
              isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-4 space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Photos - Core */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`block text-sm font-medium ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Fotoğraflar {totalImages > 0 && `(${totalImages}/${MAX_IMAGES})`}
                  </span>
                </label>
                {totalImages > 0 && (
                  <button
                    type="button"
                    onClick={clearAllImages}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Tümünü Temizle
                  </button>
                )}
              </div>
              {uploadProgress && (
                <div className={`mb-3 p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-blue-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      Yükleniyor {uploadProgress.current}/{uploadProgress.total}...
                    </span>
                    <span className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      %{uploadProgress.percentage}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-blue-200'}`}>
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>
                </div>
              )}
              {totalImages > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {existingImages.map((url, i) => (
                    <div
                      key={`existing-${i}`}
                      className={`relative aspect-square rounded-lg overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}
                    >
                      <img src={url} alt={`Mevcut ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(i)}
                        className="absolute top-1 right-1 p-1 bg-red-500/90 hover:bg-red-500 rounded-md transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.map((preview, i) => (
                    <div
                      key={`new-${i}`}
                      className={`relative aspect-square rounded-lg overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}
                    >
                      <img src={preview.previewUrl} alt={`Yeni ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImagePreview(i)}
                        className="absolute top-1 right-1 p-1 bg-red-500/90 hover:bg-red-500 rounded-md transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {totalImages < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors ${
                        isDark
                          ? 'border-slate-600 hover:border-safety-orange text-concrete-400 hover:text-safety-orange'
                          : 'border-gray-300 hover:border-safety-orange text-gray-400 hover:text-safety-orange'
                      }`}
                    >
                      <Plus className="w-6 h-6" />
                      <span className="text-[10px] mt-1">Ekle</span>
                    </button>
                  )}
                </div>
              )}
              {totalImages === 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors group ${
                      isDark ? 'border-slate-600 hover:border-safety-orange' : 'border-gray-300 hover:border-safety-orange'
                    }`}
                  >
                    <Camera className={`w-8 h-8 mb-2 ${isDark ? 'text-concrete-400' : 'text-gray-400'} group-hover:text-safety-orange`} />
                    <span className={`text-sm font-medium ${isDark ? 'text-concrete-400' : 'text-gray-500'} group-hover:text-safety-orange`}>
                      Fotoğraf Çek
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors group ${
                      isDark ? 'border-slate-600 hover:border-safety-orange' : 'border-gray-300 hover:border-safety-orange'
                    }`}
                  >
                    <Upload className={`w-8 h-8 mb-2 ${isDark ? 'text-concrete-400' : 'text-gray-400'} group-hover:text-safety-orange`} />
                    <span className={`text-sm font-medium ${isDark ? 'text-concrete-400' : 'text-gray-500'} group-hover:text-safety-orange`}>
                      Resim Yükle
                    </span>
                  </button>
                </div>
              )}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                className="hidden"
              />
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
              <p className={`text-xs mt-2 flex items-center gap-1 ${isDark ? 'text-concrete-500' : 'text-gray-500'}`}>
                <ImageIcon className="w-3.5 h-3.5" />
                Birden fazla fotoğraf seçebilirsiniz (max 4, her biri max 10MB)
              </p>
            </div>

            {/* Project Name - Core */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>Proje Adı *</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Örn: A Blok - Temel İmalatı"
                className={`w-full rounded-xl px-4 py-4 transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 ${
                  isDark
                    ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange'
                    : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
                }`}
                required
              />
            </div>

            {/* Dynamic fields from schema */}
            {schemaLoading ? (
              <div className="flex items-center gap-2 text-concrete-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Form alanları yükleniyor...
              </div>
            ) : (
              fields.map((field) => (
                <DynamicFieldInput
                  key={field.id}
                  field={field}
                  value={formData[field.id] ?? (field.type === 'checkbox' ? false : field.type === 'date' ? new Date().toISOString().split('T')[0] : field.type === 'multiselect' ? [] : '')}
                  onChange={(v) => setFieldValue(field.id, v)}
                  isDark={isDark}
                />
              ))
            )}

            {/* Status - Core */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>Durum *</label>
              <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-gray-100'}`}>
                <button
                  type="button"
                  onClick={() => setStatus('Eksik')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                    status === 'Eksik'
                      ? 'bg-red-500 text-white shadow-md'
                      : isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                  }`}
                >
                  <span>🔴</span> Eksik
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('Onay')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                    status === 'Onay'
                      ? 'bg-green-500 text-white shadow-md'
                      : isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                  }`}
                >
                  <span>🟢</span> Onay
                </button>
              </div>
            </div>

            {/* Content (Açıklama) - Core */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Açıklama
                </span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="İmalatı, konumu ve ilgili teknik detayları yazın..."
                rows={5}
                className={`w-full rounded-xl px-4 py-4 transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 resize-none ${
                  isDark
                    ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange'
                    : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
                }`}
              />
            </div>
          </div>

          <div className={`flex gap-3 p-4 border-t ${isDark ? 'border-slate-700/50 bg-slate-900/30' : 'border-gray-200 bg-gray-50'}`}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={`flex-1 px-6 py-4 border rounded-xl font-medium transition-colors disabled:opacity-50 ${
                isDark ? 'border-slate-600 text-concrete-300 hover:text-white hover:bg-slate-700/50' : 'border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-safety-orange to-safety-orange-dark hover:from-safety-orange-dark hover:to-safety-orange text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                editNote ? 'Kaydı Güncelle' : 'Kaydı Kaydet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/** Renders a single dynamic form field based on FormField config */
function DynamicFieldInput({
  field,
  value,
  onChange,
  isDark
}: {
  field: FormField;
  value: any;
  onChange: (v: any) => void;
  isDark: boolean;
}) {
  const baseInputClass = `w-full rounded-xl px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 ${
    isDark
      ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange'
      : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
  }`;

  const renderInput = () => {
    switch (field.type as FormFieldType) {
      case 'text':
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
            required={field.required}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={field.placeholder}
            className={baseInputClass}
            required={field.required}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
            required={field.required}
          />
        );
      case 'select':
        return (
          <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
            required={field.required}
          >
            <option value="">Seçiniz...</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case 'multiselect': {
        const selected = Array.isArray(value) ? value : [];
        const toggle = (opt: string) => {
          const next = selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt];
          onChange(next);
        };
        return (
          <div className={`space-y-2 p-3 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-600' : 'bg-gray-50 border-gray-300'}`}>
            {(field.options || []).map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-2 cursor-pointer py-1.5 ${isDark ? 'text-concrete-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="rounded border-slate-600 text-safety-orange focus:ring-safety-orange"
                />
                {opt}
              </label>
            ))}
          </div>
        );
      }
      case 'textarea':
        return (
          <textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`${baseInputClass} resize-none`}
            required={field.required}
          />
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 text-safety-orange focus:ring-safety-orange"
            />
            <span className={`text-sm ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
              {field.placeholder || field.label}
            </span>
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
            required={field.required}
          />
        );
    }
  };

  return (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
        {field.label} {field.required && '*'}
      </label>
      {renderInput()}
      {field.description && (
        <p className={`mt-1 text-xs ${isDark ? 'text-concrete-500' : 'text-gray-500'}`}>{field.description}</p>
      )}
    </div>
  );
}

export default AddNoteModal;
