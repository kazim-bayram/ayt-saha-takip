import React, { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Pencil,
  Trash2,
  ArrowLeft,
  FileSpreadsheet,
  Settings2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotes } from '../hooks/useNotes';
import { useNoteSchema } from '../hooks/useNoteSchema';
import { Note, NoteFormData, normalizeStatus, NOTE_STATUS_CONFIG, getWorkDate, formatWorkDate, getNoteFieldValue } from '../types';
import AddNoteModal from '../components/AddNoteModal';
import NoteDetailModal from '../components/NoteDetailModal';
import UserProfileMenu from '../components/UserProfileMenu';
import ProfileSettings from '../components/ProfileSettings';
import UserManagement from '../components/UserManagement';
import LoadingSpinner from '../components/LoadingSpinner';

const CORE_FIELD_IDS = ['category', 'ada', 'parsel', 'date', 'progressLevel'] as const;

type SortField = 'projectName' | 'date' | 'category' | null;
type SortDir = 'asc' | 'desc';

const TablePage: React.FC = () => {
  const { isDark } = useTheme();
  const { logout, isAdmin } = useAuth();
  const { schema } = useNoteSchema();
  const schemaFields = [...schema.fields].sort((a, b) => a.order - b.order);
  // Columns: core (category, ada, parsel, date, progressLevel) + any field with showInTable
  const tableDisplayFields = useMemo(
    () =>
      schemaFields.filter(
        (f) => CORE_FIELD_IDS.includes(f.id as (typeof CORE_FIELD_IDS)[number]) || f.showInTable
      ),
    [schemaFields]
  );
  const {
    notes,
    loading,
    error,
    updateNote,
    deleteNote,
    addComment,
    deleteComment,
    canEditNote,
    canDeleteNote
  } = useNotes();

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filters, setFilters] = useState({
    project: '',
    adaParsel: '',
    category: '',
    progress: '',
    status: ''
  });
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  // Apply column filters (core + dynamic, AND logic, case-insensitive)
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const projectMatch = !filters.project || (note.projectName || '').toLowerCase().includes(filters.project.toLowerCase());
      const adaParselStr = `${getNoteFieldValue(note, 'ada') || ''}/${getNoteFieldValue(note, 'parsel') || ''}`.toLowerCase();
      const adaParselMatch = !filters.adaParsel || adaParselStr.includes(filters.adaParsel.toLowerCase());
      const categoryVal = String(getNoteFieldValue(note, 'category') || '');
      const categoryMatch = !filters.category || categoryVal.toLowerCase().includes(filters.category.toLowerCase());
      const progressVal = String(getNoteFieldValue(note, 'progressLevel') || '');
      const progressMatch = !filters.progress || progressVal.toLowerCase().includes(filters.progress.toLowerCase());
      const noteStatus = normalizeStatus(note.status);
      const statusMatch = !filters.status || noteStatus === filters.status;
      const dateMatch = !filterDate || getWorkDate(note) === filterDate;
      let dynamicMatch = true;
      tableDisplayFields.forEach((f) => {
        if (!f.showInTable || !f.showInFilter) return;
        const filterVal = dynamicFilters[f.id]?.trim();
        if (!filterVal) return;
        const cellVal = getNoteFieldValue(note, f.id);
        const str = cellVal !== undefined && cellVal !== null
          ? (Array.isArray(cellVal) ? cellVal.join(' ') : String(cellVal))
          : '';
        if (!str.toLowerCase().includes(filterVal.toLowerCase())) dynamicMatch = false;
      });
      return projectMatch && adaParselMatch && categoryMatch && progressMatch && statusMatch && dateMatch && dynamicMatch;
    });
  }, [notes, filters, filterDate, tableDisplayFields, dynamicFilters]);

  // Sort filtered notes
  const displayNotes = useMemo(() => {
    let list = [...filteredNotes];
    if (sortField) {
      list.sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        if (sortField === 'projectName') {
          aVal = (a.projectName || '').toLowerCase();
          bVal = (b.projectName || '').toLowerCase();
        } else if (sortField === 'date') {
          aVal = getWorkDate(a) || '';
          bVal = getWorkDate(b) || '';
        } else if (sortField === 'category') {
          aVal = (a.category || '').toLowerCase();
          bVal = (b.category || '').toLowerCase();
        }
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [filteredNotes, sortField, sortDir]);


  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleExport = useCallback(() => {
    const getStatusLabel = (s: string) => NOTE_STATUS_CONFIG[normalizeStatus(s)]?.label || 'Eksik';
    const exportCols = tableDisplayFields.map((f) => f.label);
    const allCols = ['Proje', ...exportCols, 'Durum', 'Tarih', 'İçerik', 'Yazan'];
    const data = displayNotes.map((note) => {
      const row: Record<string, string> = {
        'Proje': note.projectName || '',
        'Durum': getStatusLabel(note.status),
        'Tarih': formatWorkDate(getWorkDate(note)),
        'İçerik': (note.content || '').length > 500 ? (note.content || '').slice(0, 500) + '...' : (note.content || ''),
        'Yazan': note.userName || note.userEmail || ''
      };
      tableDisplayFields.forEach((f) => {
        const v = getNoteFieldValue(note, f.id);
        let display = '';
        if (v !== undefined && v !== null) {
          if (f.type === 'date' && v) display = formatWorkDate(String(v));
          else if (Array.isArray(v)) display = v.length > 0 ? v.join(', ') : '';
          else if (typeof v === 'boolean') display = v ? 'Evet' : '';
          else if (v !== '') display = String(v);
        }
        row[f.label] = display;
      });
      return allCols.reduce<Record<string, string>>((acc, col) => {
        acc[col] = row[col] ?? '';
        return acc;
      }, {});
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Saha Raporu');
    XLSX.writeFile(wb, 'Saha_Takip_Raporu.xlsx');
  }, [displayNotes, tableDisplayFields]);

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setShowAddModal(true);
  };

  const handleDeleteNote = async (note: Note) => {
    if (!canDeleteNote(note)) return;
    if (!confirm(`${note.projectName || 'Bu not'} silinsin mi?`)) return;
    try {
      await deleteNote(note);
    } catch (err) {
      console.error('Not silinirken hata:', err);
    }
  };

  const handleSubmitNote = async (formData: NoteFormData, existingImageUrls?: string[]) => {
    if (!editingNote) return;
    await updateNote(
      editingNote.id,
      formData,
      formData.images.length > 0 ? formData.images : undefined,
      existingImageUrls
    );
    setEditingNote(null);
    setShowAddModal(false);
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Tablo yükleniyor..." />;
  }

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b transition-colors ${
        isDark ? 'bg-slate-850 border-slate-700/50' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Ana Sayfa"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className={`w-5 h-5 ${isDark ? 'text-safety-orange' : 'text-safety-orange-dark'}`} />
                <div>
                  <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Tablo Görünümü
                  </h1>
                  <p className={`text-xs ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>
                    {displayNotes.length} not
                    {filters.project || filters.adaParsel || filters.category || filters.progress || filters.status || filterDate ? ` (filtrelenmiş)` : ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  to="/form-builder"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDark
                      ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Form Şeması"
                >
                  <Settings2 className="w-4 h-4" />
                  Form Şeması
                </Link>
              )}
              <button
                onClick={handleExport}
                disabled={displayNotes.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <Download className="w-4 h-4" />
                Excel'e Aktar
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

      {/* Table */}
      <main className="max-w-full mx-auto px-4 py-4">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className={`rounded-lg border overflow-hidden ${
          isDark ? 'border-slate-700/50' : 'border-gray-200'
        }`}>
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-800 text-white">
                  <th className="py-2 px-3 text-left font-semibold border-r border-gray-700/50 w-12 whitespace-nowrap">#</th>
                  <th
                    className="sticky left-0 z-20 py-2 px-3 text-left font-semibold border-r border-gray-700/50 bg-gray-800 cursor-pointer hover:bg-gray-700/50 select-none whitespace-nowrap shadow-[4px_0_6px_-2px_rgba(0,0,0,0.3)]"
                    onClick={() => handleSort('projectName')}
                  >
                    <span className="flex items-center gap-1">
                      Proje İsmi
                      {sortField === 'projectName' && (sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </span>
                  </th>
                  {tableDisplayFields.map((f) => (
                    <th
                      key={f.id}
                      className={`py-2 px-3 text-left font-semibold border-r border-gray-700/50 whitespace-nowrap ${
                        ['ada', 'parsel'].includes(f.id) ? 'font-mono' : ''
                      }`}
                    >
                      {f.label}
                    </th>
                  ))}
                  {!tableDisplayFields.some((f) => f.id === 'date') && (
                    <th
                      className="py-2 px-3 text-left font-semibold border-r border-gray-700/50 cursor-pointer hover:bg-gray-700/50 select-none font-mono whitespace-nowrap"
                      onClick={() => handleSort('date')}
                    >
                      <span className="flex items-center gap-1">
                        Tarih
                        {sortField === 'date' && (sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                  )}
                  <th className="py-2 px-3 text-left font-semibold border-r border-gray-700/50 whitespace-nowrap">Durum</th>
                  <th className="py-2 px-3 text-left font-semibold w-24 whitespace-nowrap">İşlemler</th>
                </tr>
                <tr className="bg-gray-700/80 text-white">
                  <th className="py-1 px-2 border-r border-gray-600/50" />
                  <th className="sticky left-0 z-20 py-1 px-2 border-r border-gray-600/50 bg-gray-700/80 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.3)]">
                    <input
                      type="text"
                      value={filters.project}
                      onChange={(e) => setFilters((f) => ({ ...f, project: e.target.value }))}
                      placeholder="Ara..."
                      className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                    />
                  </th>
                  {tableDisplayFields.map((f) => (
                    <th key={f.id} className="py-1 px-2 border-r border-gray-600/50">
                      {f.id === 'ada' && (
                        <input
                          type="text"
                          value={filters.adaParsel.split('/')[0]}
                          onChange={(e) => {
                            const p = filters.adaParsel.split('/');
                            setFilters((prev) => ({ ...prev, adaParsel: `${e.target.value}/${p[1] || ''}`.replace(/\/$/, '') }));
                          }}
                          placeholder="Ada..."
                          className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 font-mono focus:outline-none focus:ring-1 focus:ring-safety-orange"
                        />
                      )}
                      {f.id === 'parsel' && (
                        <input
                          type="text"
                          value={filters.adaParsel.split('/')[1] || ''}
                          onChange={(e) => {
                            const p = filters.adaParsel.split('/');
                            setFilters((prev) => ({ ...prev, adaParsel: `${p[0] || ''}/${e.target.value}`.replace(/^\//, '') }));
                          }}
                          placeholder="Parsel..."
                          className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 font-mono focus:outline-none focus:ring-1 focus:ring-safety-orange"
                        />
                      )}
                      {f.id === 'category' && (
                        <input
                          type="text"
                          value={filters.category}
                          onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                          placeholder="Ara..."
                          className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                        />
                      )}
                      {f.id === 'progressLevel' && (
                        <input
                          type="text"
                          value={filters.progress}
                          onChange={(e) => setFilters((prev) => ({ ...prev, progress: e.target.value }))}
                          placeholder="Ara..."
                          className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                        />
                      )}
                      {f.id === 'date' && (
                        <input
                          type="date"
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                        />
                      )}
                      {/* Filter input: non-core columns with showInTable AND showInFilter */}
                      {!CORE_FIELD_IDS.includes(f.id as (typeof CORE_FIELD_IDS)[number]) && f.showInTable && f.showInFilter && (
                        <input
                          type="text"
                          value={dynamicFilters[f.id] ?? ''}
                          onChange={(e) => setDynamicFilters((prev) => ({ ...prev, [f.id]: e.target.value }))}
                          placeholder="Ara..."
                          className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                        />
                      )}
                      {!CORE_FIELD_IDS.includes(f.id as (typeof CORE_FIELD_IDS)[number]) && (!f.showInTable || !f.showInFilter) && <span className="block py-1" />}
                    </th>
                  ))}
                  {!tableDisplayFields.some((f) => f.id === 'date') && (
                    <th className="py-1 px-2 border-r border-gray-600/50">
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                      />
                    </th>
                  )}
                  <th className="py-1 px-2 border-r border-gray-600/50">
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                      className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                    >
                      <option value="">Tümü</option>
                      <option value="Eksik">Eksik</option>
                      <option value="Onay">Onay</option>
                    </select>
                  </th>
                  <th className="py-1 px-2" />
                </tr>
              </thead>
              <tbody>
              {displayNotes.length === 0 ? (
                <tr>
                  <td colSpan={5 + tableDisplayFields.length + (tableDisplayFields.some((f) => f.id === 'date') ? 0 : 1)} className={`py-8 text-center whitespace-normal ${isDark ? 'text-concrete-500' : 'text-gray-500'}`}>
                    Henüz not bulunmuyor
                  </td>
                </tr>
              ) : (
                displayNotes.map((note, idx) => {
                  const status = normalizeStatus(note.status);
                  const isOddRow = idx % 2 === 1;
                  const rowBg = isOddRow ? (isDark ? 'bg-slate-900/30' : 'bg-gray-50') : (isDark ? 'bg-slate-850' : 'bg-white');
                  const stickyBg = isOddRow ? (isDark ? 'bg-slate-900/30' : 'bg-gray-50') : (isDark ? 'bg-slate-850' : 'bg-white');
                  return (
                    <tr
                      key={note.id}
                      className={`border-t transition-colors ${rowBg} ${
                        isDark ? 'border-slate-700/50 hover:bg-slate-800/50' : 'border-gray-200 hover:bg-blue-50'
                      }`}
                    >
                      <td className={`py-2 px-3 font-mono whitespace-nowrap ${isDark ? 'text-concrete-300' : 'text-gray-600'}`}>
                        {idx + 1}
                      </td>
                      <td className={`sticky left-0 z-[5] py-2 px-3 border-r whitespace-nowrap ${stickyBg} ${isDark ? 'border-slate-700/50 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.2)]' : 'border-gray-200 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.08)]'}`}>
                        <button
                          type="button"
                          onClick={() => { setSelectedNote(note); setIsDetailModalOpen(true); }}
                          className={`text-left w-full text-blue-500 hover:text-blue-400 hover:underline cursor-pointer focus:outline-none focus:ring-0 ${isDark ? 'text-blue-400 hover:text-blue-300' : ''}`}
                        >
                          {note.projectName || '-'}
                        </button>
                      </td>
                      {tableDisplayFields.map((f) => {
                        const val = getNoteFieldValue(note, f.id);
                        let display = '-';
                        if (val !== undefined && val !== null) {
                          if (f.type === 'date' && val) display = formatWorkDate(String(val));
                          else if (Array.isArray(val)) display = val.length > 0 ? val.join(', ') : '-';
                          else if (typeof val === 'boolean') display = val ? 'Evet' : '-';
                          else if (val !== '') display = String(val);
                        }
                        return (
                          <td
                            key={f.id}
                            className={`py-2 px-3 border-r whitespace-nowrap ${['ada', 'parsel'].includes(f.id) ? 'font-mono ' : ''}${isDark ? 'border-slate-700/50 text-concrete-300' : 'border-gray-200 text-gray-700'}`}
                          >
                            {display}
                          </td>
                        );
                      })}
                      {!tableDisplayFields.some((f) => f.id === 'date') && (
                        <td className={`py-2 px-3 border-r font-mono whitespace-nowrap ${isDark ? 'border-slate-700/50 text-concrete-300' : 'border-gray-200 text-gray-700'}`}>
                          {formatWorkDate(getWorkDate(note))}
                        </td>
                      )}
                      <td className={`py-2 px-3 border-r whitespace-nowrap ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            status === 'Onay'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {NOTE_STATUS_CONFIG[status]?.label || 'Eksik'}
                        </span>
                      </td>
                      <td className={`py-2 px-3 whitespace-nowrap ${isDark ? 'text-concrete-400' : 'text-gray-600'}`}>
                        <div className="flex items-center gap-1">
                          {canEditNote(note) && (
                            <button
                              onClick={() => handleEditNote(note)}
                              className={`p-1.5 rounded transition-colors ${
                                isDark ? 'hover:bg-slate-700 text-concrete-300' : 'hover:bg-gray-200 text-gray-600'
                              }`}
                              title="Düzenle"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDeleteNote(note) && (
                            <button
                              onClick={() => handleDeleteNote(note)}
                              className="p-1.5 rounded transition-colors hover:bg-red-500/20 text-red-400"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </main>

      {/* Modals */}
      <NoteDetailModal
        note={selectedNote}
        isOpen={isDetailModalOpen}
        onClose={() => { setSelectedNote(null); setIsDetailModalOpen(false); }}
        onAddComment={addComment}
        onDeleteComment={deleteComment}
        onEdit={handleEditNote}
        canEdit={selectedNote ? canEditNote(selectedNote) : false}
      />
      <AddNoteModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingNote(null); }}
        onSubmit={handleSubmitNote}
        editNote={editingNote}
      />
      <ProfileSettings
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
      />
      {isAdmin && (
        <UserManagement
          isOpen={showUserManagement}
          onClose={() => setShowUserManagement(false)}
        />
      )}
    </div>
  );
};

export default TablePage;
