import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  X,
  Calendar,
  FolderOpen,
  User,
  FileText,
  ChevronDown,
  Search,
  MapPin,
  SlidersHorizontal,
  Tag,
  Trash2,
  FileSpreadsheet,
  Settings2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotes } from '../hooks/useNotes';
import { useNoteSchema } from '../hooks/useNoteSchema';
import { Note, FilterOptions, NoteFormData, normalizeStatus, getNoteFieldValue } from '../types';
import NoteCard from './NoteCard';
import NoteDetailModal from './NoteDetailModal';
import AddNoteModal from './AddNoteModal';
import ProfileSettings from './ProfileSettings';
import UserManagement from './UserManagement';
import UserProfileMenu from './UserProfileMenu';
import LoadingSpinner, { NotesGridSkeleton } from './LoadingSpinner';

const Dashboard: React.FC = () => {
  const { logout, isAdmin, currentUser } = useAuth();
  const { isDark } = useTheme();
  const { schema } = useNoteSchema();
  const {
    notes,
    loading,
    error,
    uploading,
    uploadProgress,
    createNote,
    updateNote,
    deleteNote,
    updateNoteStatus,
    addComment,
    deleteComment,
    canEditNote,
    canDeleteNote,
    filterNotes,
    getProjectNames,
    getWorkerNames
  } = useNotes();

  // Modal durumları
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  // Görünüm durumu
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Filtre durumu
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    workerEmail: '',
    projectName: '',
    ada: '',
    parsel: '',
    progressLevel: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});

  // Filtreleri uygula - static (filterNotes) + dynamic (schema fields with showInFilter)
  const filteredNotes = useMemo(() => {
    const base = filterNotes(filters);
    if (!schema) return base;
    return base.filter((note) =>
      schema.fields.every((field) => {
        if (!field.showInFilter) return true;
        const filterValue = (dynamicFilters[field.id] || '').trim();
        if (!filterValue) return true;
        const noteValue = getNoteFieldValue(note, field.id);
        const str =
          noteValue !== undefined && noteValue !== null
            ? Array.isArray(noteValue)
              ? noteValue.join(' ')
              : String(noteValue)
            : '';
        return str.toLowerCase().includes(filterValue.toLowerCase());
      })
    );
  }, [notes, filters, filterNotes, schema, dynamicFilters]);

  // Role-based visibility: Workers see ONLY their own notes; Admins see ALL
  const visibleNotes = useMemo(() => {
    if (isAdmin) return filteredNotes;
    return filteredNotes.filter(note => note.userId === currentUser?.uid);
  }, [filteredNotes, isAdmin, currentUser?.uid]);

  // Filtre dropdown'ları için benzersiz değerler
  const projectNames = useMemo(() => getProjectNames(), [getProjectNames]);
  const workerNames = useMemo(() => getWorkerNames(), [getWorkerNames]);

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setShowDetailModal(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setShowAddModal(true);
  };

  const handleDeleteNote = async (note: Note) => {
    try {
      await deleteNote(note);
    } catch (err) {
      console.error('Not silinirken hata:', err);
    }
  };

  const handleSubmitNote = async (formData: NoteFormData, existingImageUrls?: string[]) => {
    if (editingNote) {
      await updateNote(
        editingNote.id, 
        formData, 
        formData.images.length > 0 ? formData.images : undefined,
        existingImageUrls
      );
    } else {
      await createNote(formData);
    }
    setEditingNote(null);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setEditingNote(null);
  };

  // Handle adding comment
  const handleAddComment = async (noteId: string, text: string) => {
    const comment = await addComment(noteId, text);
    return comment;
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      workerEmail: '',
      projectName: '',
      ada: '',
      parsel: '',
      progressLevel: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    });
    setDynamicFilters({});
  };

  const hasActiveFilters =
    filters.workerEmail ||
    filters.projectName ||
    filters.ada ||
    filters.parsel ||
    filters.progressLevel ||
    filters.status ||
    filters.dateFrom ||
    filters.dateTo ||
    Object.values(dynamicFilters).some((v) => (v || '').trim() !== '');
  const hasActiveSearch = !!filters.searchQuery;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Çıkış yapılamadı:', err);
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      {/* Üst Menü */}
      <header className={`sticky top-0 z-40 border-b transition-colors ${
        isDark 
          ? 'bg-slate-850 border-slate-700/50' 
          : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Başlık */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-safety-orange to-safety-orange-dark rounded-xl flex items-center justify-center">
                {/* Construction Plan / Map / Parcel Icon */}
                <svg 
                  className="w-5 h-5 text-white" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <line x1="15" y1="9" x2="15" y2="21" />
                  <circle cx="6" cy="6" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Saha Takip</h1>
                <p className={`text-xs ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>
                  {isAdmin ? 'Yönetici Paneli' : 'Saha Notları'}
                </p>
              </div>
            </div>

            {/* Kullanıcı Bilgisi & Aksiyonlar */}
            <div className="flex items-center gap-2">
              {/* Tablo Görünümü Link - Admin only */}
              {isAdmin && (
                <>
                  <Link
                    to="/table-view"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDark
                        ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title="Tablo Görünümü"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    <span className="hidden sm:inline">Tablo Görünümü</span>
                  </Link>
                  <Link
                    to="/form-builder"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDark
                        ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title="Form Şeması"
                  >
                    <Settings2 className="w-5 h-5" />
                    <span className="hidden sm:inline">Form Şeması</span>
                  </Link>
                </>
              )}

              {/* User Profile Menu */}
              <UserProfileMenu
                onOpenProfileSettings={() => setShowProfileSettings(true)}
                onOpenUserManagement={() => setShowUserManagement(true)}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>

        {/* Collapsible Search Panel */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isSearchOpen ? 'max-h-[100px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className={`border-t ${isDark ? 'border-slate-700/50 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto px-4 py-4">
              {/* Search Bar - Full Width */}
              <div className="relative">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  placeholder="Proje adı veya içerikte ara..."
                  className={`w-full rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-safety-orange/20 focus:border-safety-orange transition-all ${
                    isDark 
                      ? 'bg-slate-800 border border-slate-600 text-white placeholder-concrete-500' 
                      : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isFiltersOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className={`border-t ${isDark ? 'border-slate-700/50 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto px-4 py-4">
              {/* Filter Grid - Responsive */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {/* Ada (Island) */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-concrete-400' : 'text-gray-600'}`}>
                    Ada
                  </label>
                  <div className="relative">
                    <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      value={filters.ada}
                      onChange={(e) => setFilters({ ...filters, ada: e.target.value })}
                      placeholder="Ada No"
                      className={`w-full rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-safety-orange transition-colors ${
                        isDark 
                          ? 'bg-slate-800 border border-slate-600 text-white placeholder-concrete-500' 
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm'
                      }`}
                    />
                  </div>
                </div>

                {/* Parsel (Parcel) */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-concrete-400' : 'text-gray-600'}`}>
                    Parsel
                  </label>
                  <div className="relative">
                    <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      value={filters.parsel}
                      onChange={(e) => setFilters({ ...filters, parsel: e.target.value })}
                      placeholder="Parsel No"
                      className={`w-full rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-safety-orange transition-colors ${
                        isDark 
                          ? 'bg-slate-800 border border-slate-600 text-white placeholder-concrete-500' 
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm'
                      }`}
                    />
                  </div>
                </div>

                {/* Hakediş / Seviye */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-concrete-400' : 'text-gray-600'}`}>
                    Hakediş / Seviye
                  </label>
                  <div className="relative">
                    <Tag className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      value={filters.progressLevel}
                      onChange={(e) => setFilters({ ...filters, progressLevel: e.target.value })}
                      placeholder="Örn: %50, Zemin Kat"
                      className={`w-full rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-safety-orange transition-colors ${
                        isDark 
                          ? 'bg-slate-800 border border-slate-600 text-white placeholder-concrete-500' 
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm'
                      }`}
                    />
                  </div>
                </div>

                {/* Project Dropdown */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-concrete-400' : 'text-gray-600'}`}>
                    Proje
                  </label>
                  <div className="relative">
                    <FolderOpen className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
                    <select
                      value={filters.projectName}
                      onChange={(e) => setFilters({ ...filters, projectName: e.target.value })}
                      className={`w-full rounded-lg pl-9 pr-8 py-2.5 text-sm appearance-none focus:outline-none focus:border-safety-orange transition-colors ${
                        isDark 
                          ? 'bg-slate-800 border border-slate-600 text-white' 
                          : 'bg-white border border-gray-300 text-gray-900 shadow-sm'
                      }`}
                    >
                      <option value="">Tümü</option>
                      {projectNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
                  </div>
                </div>

                {/* Status Dropdown (Eksik / Onay) */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-concrete-400' : 'text-gray-600'}`}>
                    Durum
                  </label>
                  <div className="relative">
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className={`w-full rounded-lg pl-3 pr-8 py-2.5 text-sm appearance-none focus:outline-none focus:border-safety-orange transition-colors ${
                        isDark 
                          ? 'bg-slate-800 border border-slate-600 text-white' 
                          : 'bg-white border border-gray-300 text-gray-900 shadow-sm'
                      }`}
                    >
                      <option value="">Tümü</option>
                      <option value="Eksik">🔴 Eksik</option>
                      <option value="Onay">🟢 Onay</option>
                    </select>
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
                  </div>
                </div>

                {/* Worker Dropdown (Admin only) */}
                {isAdmin && (
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-concrete-400' : 'text-gray-600'}`}>
                      Çalışan
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
                      <select
                        value={filters.workerEmail}
                        onChange={(e) => setFilters({ ...filters, workerEmail: e.target.value })}
                        className={`w-full rounded-lg pl-9 pr-8 py-2.5 text-sm appearance-none focus:outline-none focus:border-safety-orange transition-colors ${
                          isDark 
                            ? 'bg-slate-800 border border-slate-600 text-white' 
                            : 'bg-white border border-gray-300 text-gray-900 shadow-sm'
                        }`}
                      >
                        <option value="">Tümü</option>
                        {workerNames.map(worker => (
                          <option key={worker.email} value={worker.email}>{worker.name}</option>
                        ))}
                      </select>
                      <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
                    </div>
                  </div>
                )}

                {/* Date Picker */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-concrete-400' : 'text-gray-600'}`}>
                    Tarih
                  </label>
                  <div className="relative">
                    <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, dateTo: e.target.value })}
                      className={`w-full rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-safety-orange transition-colors ${
                        isDark 
                          ? 'bg-slate-800 border border-slate-600 text-white' 
                          : 'bg-white border border-gray-300 text-gray-900 shadow-sm'
                      }`}
                    />
                  </div>
                </div>

                {/* Dynamic filters (schema fields with showInFilter) */}
                {schema?.fields
                  ?.filter((field) => field.showInFilter)
                  .map((field) => (
                    <div key={field.id}>
                      <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-concrete-400' : 'text-gray-600'}`}>
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={dynamicFilters[field.id] ?? ''}
                        onChange={(e) => setDynamicFilters((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder="Ara..."
                        className={`w-full rounded-lg pl-3 pr-3 py-2.5 text-sm focus:outline-none focus:border-safety-orange transition-colors ${
                          isDark
                            ? 'bg-slate-800 border border-slate-600 text-white placeholder-concrete-500'
                            : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm'
                        }`}
                      />
                    </div>
                  ))}
              </div>

              {/* Filtreleri Temizle - Text button aligned right */}
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    hasActiveFilters
                      ? isDark
                        ? 'text-concrete-500 hover:text-red-400'
                        : 'text-gray-500 hover:text-red-600'
                      : isDark
                        ? 'text-concrete-600'
                        : 'text-gray-400'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Filtreleri Temizle
                </button>
              </div>

              {/* Active Filters Summary */}
              {hasActiveFilters && (
                <div className={`mt-3 pt-3 border-t flex items-center gap-2 flex-wrap ${isDark ? 'border-slate-700' : 'border-gray-300'}`}>
                  <span className={`text-xs font-medium ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Aktif:</span>
                  {filters.searchQuery && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 shadow-sm'}`}>
                      "{filters.searchQuery}"
                      <button onClick={() => setFilters({ ...filters, searchQuery: '' })} className="hover:text-red-400 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.ada && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 shadow-sm'}`}>
                      Ada: {filters.ada}
                      <button onClick={() => setFilters({ ...filters, ada: '' })} className="hover:text-red-400 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.parsel && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 shadow-sm'}`}>
                      Parsel: {filters.parsel}
                      <button onClick={() => setFilters({ ...filters, parsel: '' })} className="hover:text-red-400 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.progressLevel && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 shadow-sm'}`}>
                      Hakediş: {filters.progressLevel}
                      <button onClick={() => setFilters({ ...filters, progressLevel: '' })} className="hover:text-red-400 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.projectName && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 shadow-sm'}`}>
                      {filters.projectName}
                      <button onClick={() => setFilters({ ...filters, projectName: '' })} className="hover:text-red-400 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.status && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 shadow-sm'}`}>
                      {filters.status === 'Eksik' ? '🔴' : '🟢'} {filters.status}
                      <button onClick={() => setFilters({ ...filters, status: '' })} className="hover:text-red-400 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.workerEmail && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 shadow-sm'}`}>
                      {workerNames.find(w => w.email === filters.workerEmail)?.name || filters.workerEmail}
                      <button onClick={() => setFilters({ ...filters, workerEmail: '' })} className="hover:text-red-400 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.dateFrom && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 shadow-sm'}`}>
                      {new Date(filters.dateFrom).toLocaleDateString('tr-TR')}
                      <button onClick={() => setFilters({ ...filters, dateFrom: '', dateTo: '' })} className="hover:text-red-400 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {schema?.fields
                    ?.filter((f) => f.showInFilter && (dynamicFilters[f.id] || '').trim())
                    .map((f) => (
                      <span
                        key={f.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 shadow-sm'}`}
                      >
                        {f.label}: {dynamicFilters[f.id]}
                        <button
                          onClick={() => setDynamicFilters((prev) => ({ ...prev, [f.id]: '' }))}
                          className="hover:text-red-400 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </header>

      {/* Ana İçerik */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Araç Çubuğu */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* İstatistikler */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
              <FileText className="w-5 h-5" />
              <span className="text-lg font-semibold">{visibleNotes.length}</span>
              <span className={isDark ? 'text-concrete-500' : 'text-gray-500'}>
                {visibleNotes.length === 1 ? 'Not' : 'Not'}
              </span>
              {(hasActiveFilters || hasActiveSearch) && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-safety-orange/20 text-safety-orange' : 'bg-orange-100 text-orange-700'}`}>
                  Filtrelenmiş
                </span>
              )}
            </div>
          </div>

          {/* Search & Filter Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                isSearchOpen || hasActiveSearch
                  ? 'bg-safety-orange/20 text-safety-orange border border-safety-orange/30'
                  : isDark
                    ? 'bg-white/5 border border-slate-700 text-concrete-400 hover:text-white hover:bg-slate-800'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="Ara"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm font-medium">Ara</span>
            </button>

            {/* Filter Button */}
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                isFiltersOpen || hasActiveFilters
                  ? 'bg-safety-orange/20 text-safety-orange border border-safety-orange/30'
                  : isDark
                    ? 'bg-white/5 border border-slate-700 text-concrete-400 hover:text-white hover:bg-slate-800'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="Filtrele"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">Filtrele</span>
            </button>
          </div>
        </div>

        {/* Notlar Gösterimi */}
        {loading ? (
          <NotesGridSkeleton count={6} />
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-400" />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Notlar Yüklenirken Hata
            </h3>
            <p className={isDark ? 'text-concrete-400' : 'text-gray-500'}>{error}</p>
          </div>
        ) : visibleNotes.length === 0 ? (
          <div className="text-center py-12">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isDark ? 'bg-slate-800' : 'bg-gray-200'
            }`}>
              <FileText className={`w-10 h-10 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {(hasActiveFilters || hasActiveSearch) ? 'Eşleşen not bulunamadı' : 'Henüz not yok'}
            </h3>
            <p className={`mb-6 ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>
              {(hasActiveFilters || hasActiveSearch)
                ? 'Aradığınızı bulmak için filtreleri değiştirmeyi deneyin.'
                : 'İlk notunuzu ekleyerek saha sorunlarını belgelemeye başlayın.'}
            </p>
            {!(hasActiveFilters || hasActiveSearch) && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-safety-orange hover:bg-safety-orange-dark text-white font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5" />
                {isAdmin ? 'Yeni Not Ekle' : 'İlk Notunuzu Ekleyin'}
              </button>
            )}
          </div>
        ) : (
          <div className="masonry-grid">
            {visibleNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => handleNoteClick(note)}
                onEdit={() => handleEditNote(note)}
                onDelete={() => handleDeleteNote(note)}
                onStatusChange={isAdmin ? updateNoteStatus : undefined}
                showWorkerInfo={isAdmin}
                isAdmin={isAdmin}
                canEdit={canEditNote(note)}
                canDelete={canDeleteNote(note)}
                commentCount={note.comments?.length || 0}
              />
            ))}
          </div>
        )}
      </main>

      {/* FAB - Not Ekle (Çalışanlar ve Yöneticiler) */}
      <button
        onClick={() => setShowAddModal(true)}
        disabled={uploading}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-safety-orange to-safety-orange-dark hover:from-safety-orange-dark hover:to-safety-orange text-white rounded-full shadow-industrial-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 z-30"
        title="Yeni Not Ekle"
      >
        {uploading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <Plus className="w-7 h-7" />
        )}
      </button>

      {/* Modallar */}
      <AddNoteModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        onSubmit={handleSubmitNote}
        editNote={editingNote}
        uploadProgress={uploadProgress}
      />

      <NoteDetailModal
        note={selectedNote}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedNote(null);
        }}
        onAddComment={handleAddComment}
        onDeleteComment={deleteComment}
        onEdit={(note) => {
          setShowDetailModal(false);
          handleEditNote(note);
        }}
        canEdit={selectedNote ? canEditNote(selectedNote) : false}
      />

      {/* Profil Ayarları Modal */}
      <ProfileSettings
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
      />

      {/* Kullanıcı Yönetimi Modal (Sadece Admin) */}
      {isAdmin && (
        <UserManagement
          isOpen={showUserManagement}
          onClose={() => setShowUserManagement(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
