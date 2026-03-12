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
  const { schema, loading: schemaLoading } = useNoteSchema();
  const [content, setContent] = useState('');
  const [projectName, setProjectName] = useState('');
  const [status, setStatus] = useState<NoteStatus>('Beklemede');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fields = [...schema.fields].sort((a, b) => a.order - b.order);

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
      setStatus('Beklemede');
      imagePreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setImagePreviews([]);
      setExistingImages([]);
      setError(null);
    }
  }, [editNote, isOpen, schema.fields]);

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
    setStatus('Beklemede');
    imagePreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setImagePreviews([]);
    setExistingImages([]);
    setError(null);
  };

  const setFieldValue = (fieldId: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [fieldId]: value };
      const parentField = fields.find((f) => f.id === fieldId && f.subOptions);
      if (parentField) {
        const childField = fields.find((f) => f.type === 'select' && f.id === 'alt_kategori');
        if (childField) next[childField.id] = '';
      }
      return next;
    });
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
        className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border animate-slide-up bg-white border-slate-200"
      >
        <div
          className="flex items-center justify-between p-4 border-b border-slate-200"
        >
          <h2 className="text-xl font-semibold text-slate-800">
            {editNote ? 'Kaydı Düzenle' : 'Saha Kaydı Oluştur'}
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-lg transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-4 space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Photos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Fotoğraflar {totalImages > 0 && `(${totalImages}/${MAX_IMAGES})`}
                  </span>
                </label>
                {totalImages > 0 && (
                  <button
                    type="button"
                    onClick={clearAllImages}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Tümünü Temizle
                  </button>
                )}
              </div>
              {uploadProgress && (
                <div className="mb-3 p-3 rounded-xl bg-blue-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">
                      Yükleniyor {uploadProgress.current}/{uploadProgress.total}...
                    </span>
                    <span className="text-sm text-blue-600">
                      %{uploadProgress.percentage}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-blue-200">
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
                      className="relative aspect-square rounded-lg overflow-hidden bg-slate-100"
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
                      className="relative aspect-square rounded-lg overflow-hidden bg-slate-100"
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
                      className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors border-slate-200 hover:border-brand text-slate-400 hover:text-brand"
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
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors group border-slate-200 hover:border-brand"
                  >
                    <Camera className="w-8 h-8 mb-2 text-slate-400 group-hover:text-brand" />
                    <span className="text-sm font-medium text-slate-400 group-hover:text-brand">
                      Fotoğraf Çek
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors group border-slate-200 hover:border-brand"
                  >
                    <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-brand" />
                    <span className="text-sm font-medium text-slate-400 group-hover:text-brand">
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
              <p className="text-xs mt-2 flex items-center gap-1 text-slate-500">
                <ImageIcon className="w-3.5 h-3.5" />
                Birden fazla fotoğraf seçebilirsiniz (max 4, her biri max 10MB)
              </p>
            </div>

            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Proje Adı *</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Örn: A Blok - Temel İmalatı"
                className="w-full rounded-xl px-4 py-4 transition-all focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand"
                required
              />
            </div>

            {/* Dynamic fields from schema */}
            {schemaLoading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Form alanları yükleniyor...
              </div>
            ) : (
              fields.map((field) => {
                let effectiveField = field;
                if (field.id === 'alt_kategori') {
                  const kategoriField = fields.find((f) => f.id === 'kategori');
                  const selectedKategori = formData['kategori'] as string;
                  const subOpts = kategoriField?.subOptions?.[selectedKategori] ?? [];
                  effectiveField = { ...field, options: subOpts };
                }
                return (
                  <DynamicFieldInput
                    key={field.id}
                    field={effectiveField}
                    value={formData[field.id] ?? (field.type === 'checkbox' ? false : field.type === 'date' ? new Date().toISOString().split('T')[0] : field.type === 'multiselect' ? [] : '')}
                    onChange={(v) => setFieldValue(field.id, v)}
                    disabled={field.id === 'alt_kategori' && !formData['kategori']}
                  />
                );
              })
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Durum *</label>
              <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100">
                <button
                  type="button"
                  onClick={() => setStatus('Beklemede')}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-semibold transition-all ${
                    status === 'Beklemede'
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                  }`}
                >
                  <span>🟡</span> Beklemede
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('Onay')}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-semibold transition-all ${
                    status === 'Onay'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                  }`}
                >
                  <span>🟢</span> Onay
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('Olumsuz Sonuç')}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-semibold transition-all ${
                    status === 'Olumsuz Sonuç'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                  }`}
                >
                  <span>🔴</span> Olumsuz
                </button>
              </div>
            </div>

            {/* Content (Açıklama) */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">
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
                className="w-full rounded-xl px-4 py-4 transition-all focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand"
              />
            </div>
          </div>

          <div className="flex gap-3 p-4 border-t border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-6 py-4 border rounded-xl font-medium transition-colors disabled:opacity-50 border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-4 bg-brand hover:bg-brand-light text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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

function DynamicFieldInput({
  field,
  value,
  onChange,
  disabled
}: {
  field: FormField;
  value: any;
  onChange: (v: any) => void;
  disabled?: boolean;
}) {
  const baseInputClass = 'w-full rounded-xl px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand';

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
            className={`${baseInputClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            required={field.required}
            disabled={disabled}
          >
            <option value="">{disabled ? 'Önce üst kategori seçiniz...' : 'Seçiniz...'}</option>
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
          <div className="space-y-2 p-3 rounded-xl border bg-slate-50 border-slate-200">
            {(field.options || []).map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 cursor-pointer py-1.5 text-slate-700 hover:text-slate-800"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="rounded border-slate-300 text-brand focus:ring-brand"
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
              className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            <span className="text-sm text-slate-700">
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
      <label className="block text-sm font-medium mb-2 text-slate-700">
        {field.label} {field.required && '*'}
      </label>
      {renderInput()}
      {field.description && (
        <p className="mt-1 text-xs text-slate-500">{field.description}</p>
      )}
    </div>
  );
}

export default AddNoteModal;
