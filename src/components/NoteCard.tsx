import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  Trash2, 
  Edit3,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Layers,
  MessageSquare,
  Clock
} from 'lucide-react';
import { Note, NoteStatus, NOTE_STATUS_CONFIG, getNoteImages, normalizeStatus, getWorkDate, formatWorkDate, getNoteFieldValue } from '../types';
import { useNoteSchema } from '../hooks/useNoteSchema';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (noteId: string, newStatus: NoteStatus) => Promise<void>;
  showWorkerInfo?: boolean;
  isAdmin?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  commentCount?: number;
}

const NoteCard: React.FC<NoteCardProps> = ({ 
  note, 
  onClick, 
  onEdit, 
  onDelete,
  onStatusChange,
  showWorkerInfo = false,
  isAdmin = false,
  canEdit = false,
  canDelete = false,
  commentCount
}) => {
  const { schema } = useNoteSchema();
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const schemaFields = [...schema.fields].sort((a, b) => a.order - b.order);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const workDate = getWorkDate(note);
  const formattedDate = formatWorkDate(workDate);

  const currentStatus = normalizeStatus(note.status);
  const statusConfig = NOTE_STATUS_CONFIG[currentStatus];

  const images = getNoteImages(note);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
      onDelete?.();
    }
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin && onStatusChange) {
      setShowStatusDropdown(!showStatusDropdown);
    }
  };

  const handleStatusChange = async (e: React.MouseEvent, newStatus: NoteStatus) => {
    e.stopPropagation();
    if (!onStatusChange || newStatus === currentStatus) {
      setShowStatusDropdown(false);
      return;
    }

    setUpdatingStatus(true);
    try {
      await onStatusChange(note.id, newStatus);
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setUpdatingStatus(false);
      setShowStatusDropdown(false);
    }
  };

  const getStatusIcon = (status: NoteStatus) => {
    switch (status) {
      case 'Onay':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'Olumsuz Sonuç':
        return <XCircle className="w-3.5 h-3.5" />;
      case 'Beklemede':
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getBorderClass = () => {
    return currentStatus === 'Onay' ? 'border-green-200' : 'border-red-200';
  };

  const renderStatusBadge = () => (
    <div 
      ref={dropdownRef}
      className="relative"
      onClick={handleStatusClick}
    >
      <button
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${statusConfig.bgLight} ${statusConfig.textLight} ${isAdmin && onStatusChange ? 'cursor-pointer hover:opacity-80' : ''}`}
      >
        {updatingStatus ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          getStatusIcon(currentStatus)
        )}
        {statusConfig.label}
        {isAdmin && onStatusChange && <ChevronDown className="w-3 h-3 ml-0.5" />}
      </button>
      
      {showStatusDropdown && isAdmin && (
        <div className="absolute top-full right-0 mt-1 py-1 rounded-lg shadow-lg border z-50 min-w-[140px] bg-white border-slate-200">
          {Object.values(NOTE_STATUS_CONFIG).map((config) => (
            <button
              key={config.key}
              onClick={(e) => handleStatusChange(e, config.key)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                currentStatus === config.key ? 'bg-slate-100' : 'hover:bg-slate-50'
              } ${config.textLight}`}
            >
              {getStatusIcon(config.key)}
              {config.label}
              {currentStatus === config.key && (
                <CheckCircle2 className="w-3 h-3 ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      onClick={onClick}
      className={`group rounded-xl border-2 overflow-hidden cursor-pointer card-hover bg-white ${getBorderClass()} shadow-sm`}
    >
      {images.length > 0 ? (
        <div className="relative overflow-hidden bg-slate-100">
          {images.length === 1 && (
            <div className="aspect-video">
              <img
                src={images[0]}
                alt={note.projectName || note.title || 'Not'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          )}
          
          {images.length === 2 && (
            <div className="aspect-video grid grid-cols-2 gap-0.5">
              {images.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                    alt={`${note.projectName || note.title || 'Not'} ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ))}
            </div>
          )}
          
          {images.length >= 3 && (
            <div className="aspect-video grid grid-cols-2 grid-rows-2 gap-0.5">
              <img
                src={images[0]}
                alt={`${note.projectName || note.title || 'Not'} 1`}
                className="w-full h-full object-cover row-span-2 transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <img
                src={images[1]}
                    alt={`${note.projectName || note.title || 'Not'} 2`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="relative">
                <img
                  src={images[2]}
                    alt={`${note.projectName || note.title || 'Not'} 3`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {images.length > 3 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">+{images.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          {images.length > 1 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/60 rounded-full text-white text-xs">
              <Layers className="w-3 h-3" />
              {images.length}
            </div>
          )}
          
          <div className="absolute top-2 right-2">
            {renderStatusBadge()}
          </div>
        </div>
      ) : (
        <div className="aspect-video flex items-center justify-center relative bg-slate-100">
          <ImageIcon className="w-12 h-12 text-slate-300" />
          
          <div className="absolute top-2 right-2">
            {renderStatusBadge()}
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3 className="font-bold text-lg line-clamp-1 group-hover:text-brand transition-colors text-slate-800">
            {note.projectName || note.title || 'Proje Belirtilmemiş'}
          </h3>
        </div>

        {schemaFields.length > 0 && (() => {
          const hasValue = (v: any) =>
            v !== undefined && v !== null &&
            (typeof v === 'boolean' ? v : typeof v === 'string' ? v.trim() !== '' : Array.isArray(v) ? v.length > 0 : true);
          const displayed = schemaFields.slice(0, 4).filter((f) => hasValue(getNoteFieldValue(note, f.id)));
          const extraCount = schemaFields.slice(4).filter((f) => hasValue(getNoteFieldValue(note, f.id))).length;
          if (displayed.length === 0 && extraCount === 0) return null;
          const formatVal = (val: any, type: string) => {
            if (val === undefined || val === null) return '';
            if (type === 'date' && val) return formatWorkDate(String(val));
            if (typeof val === 'boolean') return val ? 'Evet' : '';
            if (Array.isArray(val)) return val.join(', ');
            return String(val);
          };
          return (
            <div className="mb-3 p-2 rounded-lg bg-slate-50">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {displayed.map((field) => {
                  const val = getNoteFieldValue(note, field.id);
                  const displayVal = formatVal(val, field.type);
                  if (!displayVal) return null;
                  return (
                    <div key={field.id} className="text-xs text-slate-500">
                      <span className="font-medium text-slate-600">{field.label}:</span> {displayVal}
                    </div>
                  );
                })}
                {extraCount > 0 && (
                  <span className="text-xs text-slate-400">+{extraCount} daha</span>
                )}
              </div>
            </div>
          );
        })()}

        {schemaFields.length === 0 && note.customFields && note.customFields.length > 0 && (
          <div className="mb-3 p-2 rounded-lg bg-slate-50">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {note.customFields.slice(0, 3).map((field, index) => (
                <div key={index} className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">{field.label}:</span> {field.value}
                </div>
              ))}
              {note.customFields.length > 3 && (
                <span className="text-xs text-slate-400">+{note.customFields.length - 3} daha</span>
              )}
            </div>
          </div>
        )}

        <p className="text-sm line-clamp-2 mb-3 text-slate-500">
          {note.content || 'Açıklama girilmemiş'}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>

          {showWorkerInfo && (
            <div className="flex items-center gap-1.5 w-full mt-1">
              <User className="w-3.5 h-3.5" />
              <span className="truncate">{note.userName || note.userEmail}</span>
            </div>
          )}
        </div>

        {commentCount !== undefined && commentCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(!showComments);
            }}
            className="w-full flex items-center justify-between mt-4 pt-3 px-2 py-2 rounded-lg border-t transition-colors border-slate-200 hover:bg-slate-50"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                Tartışma / Yorumlar ({commentCount})
              </span>
            </div>
            {showComments ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
        )}

        {showComments && commentCount && commentCount > 0 && (
          <div className="mt-2 p-3 rounded-lg border bg-slate-50 border-slate-200">
            <p className="text-xs text-slate-500">
              {commentCount} yorum var. Tüm yorumları görmek ve yanıtlamak için karta tıklayın.
            </p>
          </div>
        )}

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity border-slate-200">
            {canEdit && onEdit && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Düzenle
              </button>
            )}
            {canDelete && onDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sil
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteCard;
