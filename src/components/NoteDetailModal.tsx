import React, { useState } from 'react';
import {
  X,
  Calendar,
  FolderOpen,
  User,
  Mail,
  Download,
  ExternalLink,
  ImageIcon,
  MapPin,
  Tag,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Shield,
  Trash2,
  Edit3
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Note, NoteStatus, NOTE_STATUS_CONFIG, getNoteImages, Comment, normalizeStatus, getWorkDate, formatWorkDate, getNoteFieldValue } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNoteSchema } from '../hooks/useNoteSchema';

interface NoteDetailModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onAddComment?: (noteId: string, text: string) => Promise<Comment | null>;
  onDeleteComment?: (noteId: string, commentId: string) => Promise<void>;
  onEdit?: (note: Note) => void;
  canEdit?: boolean;
}

const NoteDetailModal: React.FC<NoteDetailModalProps> = ({ 
  note, 
  isOpen, 
  onClose,
  onAddComment,
  onDeleteComment,
  onEdit,
  canEdit = false
}) => {
  const { isDark } = useTheme();
  const { currentUser, isAdmin } = useAuth();
  const { schema } = useNoteSchema();
  const schemaFields = [...schema.fields].sort((a, b) => a.order - b.order);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  if (!isOpen || !note) return null;

  const comments = note.comments || [];

  // Get images array with backward compatibility
  const images = getNoteImages(note);

  // Status config (normalize legacy statuses)
  const currentStatus = normalizeStatus(note.status);
  const statusConfig = NOTE_STATUS_CONFIG[currentStatus];

  // Get status icon
  const getStatusIcon = (status: NoteStatus) => {
    switch (status) {
      case 'Onay':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'Eksik':
      default:
        return <XCircle className="w-4 h-4" />;
    }
  };

  const workDate = getWorkDate(note);
  const formattedDate = formatWorkDate(workDate);

  const handleDownloadImage = (url: string) => {
    window.open(url, '_blank');
  };

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
  };

  const goToPrevImage = () => {
    setSelectedImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNextImage = () => {
    setSelectedImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !onAddComment) return;

    setSubmittingComment(true);
    try {
      await onAddComment(note.id, newComment.trim());
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!onDeleteComment) return;
    if (!window.confirm('Bu yorumu silmek istediğinizden emin misiniz?')) return;
    
    try {
      await onDeleteComment(note.id, commentId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const formatCommentTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate
      ? timestamp.toDate()
      : timestamp instanceof Date
        ? timestamp
        : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canDeleteComment = (comment: Comment) => {
    if (!currentUser) return false;
    return isAdmin || comment.authorId === currentUser.uid;
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className={`rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border animate-slide-up ${
        isDark 
          ? 'bg-slate-850 border-slate-700/50' 
          : 'bg-white border-gray-200'
      }`}>
        {/* Başlık */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-slate-700/50' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {note.projectName || note.title || 'Proje Belirtilmemiş'}
              </h2>
              {note.category && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${isDark ? 'bg-slate-700 text-concrete-300' : 'bg-gray-200 text-gray-700'}`}>
                  {note.category}
                </span>
              )}
            </div>
            {/* Status Badge */}
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
              isDark 
                ? `${statusConfig.bgDark} ${statusConfig.textDark}` 
                : `${statusConfig.bgLight} ${statusConfig.textLight}`
            }`}>
              {getStatusIcon(currentStatus)}
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Edit Button */}
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(note)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isDark 
                    ? 'text-steel-300 hover:text-white hover:bg-steel-700/50' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                Düzenle
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* İçerik */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Resim Bölümü */}
            <div className="space-y-4">
              {images.length > 0 ? (
                <>
                  {/* Main Image Display */}
                  <div 
                    className={`relative rounded-xl overflow-hidden group cursor-pointer ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}
                    onClick={() => openLightbox(selectedImageIndex)}
                  >
                    <img
                      src={images[selectedImageIndex]}
                      alt={`${note.projectName || note.title || 'Not'} ${selectedImageIndex + 1}`}
                      className="w-full h-auto max-h-[400px] object-contain"
                    />
                    
                    {/* Image counter badge */}
                    {images.length > 1 && (
                      <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 rounded-full text-white text-sm">
                        <Layers className="w-4 h-4" />
                        {selectedImageIndex + 1} / {images.length}
                      </div>
                    )}

                    {/* Resim Aksiyonları */}
                    <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(images[selectedImageIndex]);
                        }}
                        className="p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg transition-colors"
                        title="Yeni sekmede aç"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <a
                        href={images[selectedImageIndex]}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg transition-colors"
                        title="Resmi indir"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Click hint */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="px-4 py-2 bg-black/60 rounded-lg text-white text-sm">
                        Büyütmek için tıklayın
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Strip (if multiple images) */}
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {images.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            idx === selectedImageIndex
                              ? 'border-safety-orange ring-2 ring-safety-orange/30'
                              : isDark 
                                ? 'border-slate-600 hover:border-slate-500' 
                                : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={`aspect-video rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <div className={`text-center ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
                    <ImageIcon className="w-16 h-16 mx-auto mb-2" />
                    <p>Resim eklenmemiş</p>
                  </div>
                </div>
              )}
            </div>

            {/* Detay Bölümü */}
            <div className="space-y-6">
              {/* Proje */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-safety-orange/10 rounded-lg">
                  <FolderOpen className="w-5 h-5 text-safety-orange" />
                </div>
                <div>
                  <p className={`text-sm ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Proje</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {note.projectName || 'Belirtilmemiş'}
                  </p>
                </div>
              </div>

              {/* Schema-driven dynamic fields */}
              {schemaFields.length > 0 && (() => {
                const hasValue = (v: any) =>
                  v !== undefined && v !== null &&
                  (typeof v === 'boolean' ? v : typeof v === 'string' ? v.trim() !== '' : Array.isArray(v) ? v.length > 0 : true);
                const withValues = schemaFields.filter((f) => hasValue(getNoteFieldValue(note, f.id)));
                if (withValues.length === 0) return null;
                const formatVal = (val: any, type: string) => {
                  if (val === undefined || val === null) return '';
                  if (type === 'date' && val) return formatWorkDate(String(val));
                  if (typeof val === 'boolean') return val ? 'Evet' : 'Hayır';
                  if (Array.isArray(val)) return val.join(', ');
                  return String(val);
                };
                return (
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-600/10' : 'bg-purple-50'}`}>
                      <Tag className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Form Alanları</p>
                      <div className={`mt-2 rounded-lg p-3 ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                        <div className="space-y-2">
                          {withValues.map((field) => {
                            const val = getNoteFieldValue(note, field.id);
                            const displayVal = formatVal(val, field.type);
                            if (!displayVal) return null;
                            return (
                              <div key={field.id} className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${isDark ? 'text-concrete-300' : 'text-gray-600'}`}>{field.label}</span>
                                <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{displayVal}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Legacy custom fields (fallback) */}
              {schemaFields.length === 0 && note.customFields && note.customFields.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-600/10' : 'bg-purple-50'}`}>
                    <Tag className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Özel Alanlar</p>
                    <div className={`mt-2 rounded-lg p-3 ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                      <div className="space-y-2">
                        {note.customFields.map((field, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isDark ? 'text-concrete-300' : 'text-gray-600'}`}>{field.label}</span>
                            <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{field.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gönderen */}
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-steel-600/10' : 'bg-blue-50'}`}>
                  <User className={`w-5 h-5 ${isDark ? 'text-steel-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Gönderen</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{note.userName}</p>
                  <p className={`text-sm flex items-center gap-1 mt-0.5 ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>
                    <Mail className="w-3.5 h-3.5" />
                    {note.userEmail}
                  </p>
                </div>
              </div>

              {/* Yapılan Tarih */}
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-steel-600/10' : 'bg-blue-50'}`}>
                  <Calendar className={`w-5 h-5 ${isDark ? 'text-steel-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Yapılan Tarih</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formattedDate}</p>
                </div>
              </div>

              {/* Açıklama/İçerik */}
              <div className={`pt-4 border-t ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
                  Açıklama
                </h3>
                <div className={`rounded-xl p-4 max-h-[200px] overflow-y-auto ${
                  isDark ? 'bg-slate-900/50' : 'bg-gray-50'
                }`}>
                  <p className={`whitespace-pre-wrap text-sm leading-relaxed ${
                    isDark ? 'text-concrete-200' : 'text-gray-700'
                  }`}>
                    {note.content || 'Açıklama girilmemiş'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Yorumlar/Geri Bildirim Bölümü */}
          <div className={`border-t ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
            {/* Header */}
            <button
              onClick={() => setShowComments(!showComments)}
              className={`w-full flex items-center justify-between p-4 transition-colors ${
                isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className={`w-5 h-5 ${isDark ? 'text-concrete-400' : 'text-gray-500'}`} />
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Tartışma / Geri Bildirim
                </span>
                {comments.length > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {comments.length}
                  </span>
                )}
              </div>
              {showComments ? (
                <ChevronUp className={`w-5 h-5 ${isDark ? 'text-concrete-400' : 'text-gray-500'}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${isDark ? 'text-concrete-400' : 'text-gray-500'}`} />
              )}
            </button>

            {/* Comments Content */}
            {showComments && (
              <div className={`px-4 pb-4 space-y-4`}>
                {/* Comments List */}
                {comments.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`rounded-xl p-3 ${
                          comment.role === 'admin'
                            ? isDark 
                              ? 'bg-safety-orange/10 border border-safety-orange/30' 
                              : 'bg-orange-50 border border-orange-200'
                            : isDark 
                              ? 'bg-slate-800/50 border border-slate-700/50' 
                              : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {comment.authorName}
                            </span>
                            {comment.role === 'admin' && (
                              <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                                isDark 
                                  ? 'bg-safety-orange/20 text-safety-orange' 
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                <Shield className="w-3 h-3" />
                                Yönetici
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
                              {formatCommentTime(comment.createdAt)}
                            </span>
                            {canDeleteComment(comment) && onDeleteComment && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                title="Yorumu sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className={`text-sm mt-2 whitespace-pre-wrap ${
                          isDark ? 'text-concrete-300' : 'text-gray-700'
                        }`}>
                          {comment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-6 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Henüz yorum yok</p>
                    <p className="text-xs mt-1">İlk yorumu siz ekleyin</p>
                  </div>
                )}

                {/* New Comment Form */}
                {onAddComment && (
                  <form onSubmit={handleSubmitComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={isAdmin ? "Talimat veya geri bildirim yazın..." : "Yanıt yazın..."}
                      className={`flex-1 rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 ${
                        isDark 
                          ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange' 
                          : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
                      }`}
                      disabled={submittingComment}
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || submittingComment}
                      className="px-4 py-3 bg-safety-orange hover:bg-safety-orange-dark text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submittingComment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && images.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-black/60 rounded-full text-white">
              <Layers className="w-5 h-5" />
              {selectedImageIndex + 1} / {images.length}
            </div>
          )}

          {/* Navigation - Previous */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevImage();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Main Image */}
          <img
            src={images[selectedImageIndex]}
            alt={`${note.projectName || note.title || 'Not'} ${selectedImageIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Navigation - Next */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNextImage();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Thumbnail Navigation */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/60 rounded-xl">
              {images.map((url, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(idx);
                  }}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === selectedImageIndex
                      ? 'border-white ring-2 ring-white/30'
                      : 'border-white/30 hover:border-white/60'
                  }`}
                >
                  <img
                    src={url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadImage(images[selectedImageIndex]);
              }}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              title="Yeni sekmede aç"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
            <a
              href={images[selectedImageIndex]}
              download
              onClick={(e) => e.stopPropagation()}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              title="Resmi indir"
            >
              <Download className="w-5 h-5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteDetailModal;
