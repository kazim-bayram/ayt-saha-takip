import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Layers,
  X,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useNotes } from '../hooks/useNotes';
import { useWeeklyPlan } from '../hooks/useWeeklyPlan';
import {
  Note, NoteFormData, WeeklyTask,
  normalizeStatus, NOTE_STATUS_CONFIG,
  getWorkDate, formatWorkDate, getNoteFieldValue,
} from '../types';
import AddNoteModal from '../components/AddNoteModal';
import NoteDetailModal from '../components/NoteDetailModal';
import TaskThreadModal from '../components/TaskThreadModal';
import LoadingSpinner from '../components/LoadingSpinner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RowType = 'note' | 'task';
type SortField = 'type' | 'projectName' | 'adaParsel' | 'kategori' | 'konu' | 'status' | 'tarih' | null;
type SortDir = 'asc' | 'desc';

interface UnifiedRow {
  type: RowType;
  id: string;
  projectName: string;
  responsible: string;
  adaParsel: string;
  kategori: string;
  konu: string;
  statusLabel: string;
  tarih: string;
  tarihDisplay: string;
  description: string;
  note?: Note;
  task?: WeeklyTask;
}

// ---------------------------------------------------------------------------
// Status pill styling (always light/corporate, regardless of dark mode)
// ---------------------------------------------------------------------------

const STATUS_PILL: Record<string, string> = {
  Beklemede:        'bg-amber-50 text-amber-700 border border-amber-200',
  Onay:             'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Olumsuz Sonuç':  'bg-red-50 text-red-700 border border-red-200',
  Bekliyor:         'bg-amber-50 text-amber-700 border border-amber-200',
  'Devam Ediyor':   'bg-blue-50 text-blue-700 border border-blue-200',
  'Tamamlandı':     'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

// ---------------------------------------------------------------------------
// FilterChip
// ---------------------------------------------------------------------------

const FilterChip: React.FC<{ label: string; onClear: () => void }> = ({ label, onClear }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
    {label}
    <button onClick={onClear} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
  </span>
);

// ---------------------------------------------------------------------------
// TablePage
// ---------------------------------------------------------------------------

const TablePage: React.FC = () => {
  const { isDark } = useTheme();
  const {
    notes, loading: notesLoading, error: notesError,
    updateNote, deleteNote, addComment, deleteComment, canEditNote, canDeleteNote,
  } = useNotes();

  const { getAllTasks, deleteTask } = useWeeklyPlan();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const refreshTasks = useCallback(async () => {
    try { setTasks(await getAllTasks()); } catch { /* swallowed */ }
  }, [getAllTasks]);

  useEffect(() => {
    (async () => {
      setTasksLoading(true);
      try { setTasks(await getAllTasks()); } catch { /* swallowed */ }
      finally { setTasksLoading(false); }
    })();
  }, [getAllTasks]);

  // ---- Sort, filter, group state ----
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [groupByKategori, setGroupByKategori] = useState(false);
  const [filters, setFilters] = useState({
    type: '' as '' | 'note' | 'task',
    project: '',
    adaParsel: '',
    kategori: '',
    konu: '',
    status: '',
    tarih: '',
  });

  // ---- Modal state ----
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [threadTask, setThreadTask] = useState<WeeklyTask | null>(null);

  // ---------------------------------------------------------------------------
  // Build unified rows
  // ---------------------------------------------------------------------------

  const allRows: UnifiedRow[] = useMemo(() => {
    const noteRows: UnifiedRow[] = notes.map(note => {
      const s = normalizeStatus(note.status);

      const adaParselVal = getNoteFieldValue(note, 'ada_parsel');
      const adaParsel = adaParselVal
        ? String(adaParselVal)
        : [getNoteFieldValue(note, 'ada'), getNoteFieldValue(note, 'parsel')].filter(Boolean).join('/');

      const kategoriVal = getNoteFieldValue(note, 'kategori') || getNoteFieldValue(note, 'category');
      const tarihVal = getNoteFieldValue(note, 'tarih');
      const tarihStr = tarihVal ? String(tarihVal) : getWorkDate(note);

      return {
        type: 'note' as RowType,
        id: note.id,
        projectName: note.projectName || '',
        responsible: note.userName || note.userEmail || '',
        adaParsel: adaParsel || '',
        kategori: kategoriVal ? String(kategoriVal) : '',
        konu: String(getNoteFieldValue(note, 'konu') || ''),
        statusLabel: NOTE_STATUS_CONFIG[s]?.label ?? s,
        tarih: tarihStr,
        tarihDisplay: formatWorkDate(tarihStr),
        description: note.content || '',
        note,
      };
    });

    const taskRows: UnifiedRow[] = tasks.map(task => {
      const created = task.createdAt?.toDate?.();
      const dateStr = created
        ? `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`
        : '';
      return {
        type: 'task' as RowType,
        id: task.id,
        projectName: task.projectId || '',
        responsible: task.assignedTo || '',
        adaParsel: '',
        kategori: '',
        konu: task.title || '',
        statusLabel: task.status || '',
        tarih: dateStr,
        tarihDisplay: formatWorkDate(dateStr),
        description: task.description || '',
        task,
      };
    });

    return [...noteRows, ...taskRows];
  }, [notes, tasks]);

  // ---------------------------------------------------------------------------
  // Filter
  // ---------------------------------------------------------------------------

  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      if (filters.type && row.type !== filters.type) return false;
      if (filters.project && !row.projectName.toLowerCase().includes(filters.project.toLowerCase())) return false;
      if (filters.adaParsel && !row.adaParsel.toLowerCase().includes(filters.adaParsel.toLowerCase())) return false;
      if (filters.kategori && row.kategori !== filters.kategori) return false;
      if (filters.konu && !row.konu.toLowerCase().includes(filters.konu.toLowerCase())) return false;
      if (filters.status && row.statusLabel !== filters.status) return false;
      if (filters.tarih && row.tarih !== filters.tarih) return false;
      return true;
    });
  }, [allRows, filters]);

  // ---------------------------------------------------------------------------
  // Sort
  // ---------------------------------------------------------------------------

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    if (!sortField) return list;
    list.sort((a, b) => {
      let aVal = '', bVal = '';
      switch (sortField) {
        case 'type':        aVal = a.type; bVal = b.type; break;
        case 'projectName': aVal = a.projectName.toLowerCase(); bVal = b.projectName.toLowerCase(); break;
        case 'adaParsel':   aVal = a.adaParsel.toLowerCase(); bVal = b.adaParsel.toLowerCase(); break;
        case 'kategori':    aVal = a.kategori.toLowerCase(); bVal = b.kategori.toLowerCase(); break;
        case 'konu':        aVal = a.konu.toLowerCase(); bVal = b.konu.toLowerCase(); break;
        case 'status':      aVal = a.statusLabel.toLowerCase(); bVal = b.statusLabel.toLowerCase(); break;
        case 'tarih':       aVal = a.tarih; bVal = b.tarih; break;
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredRows, sortField, sortDir]);

  // ---------------------------------------------------------------------------
  // Grouping (pre-compute indices for React-safe rendering)
  // ---------------------------------------------------------------------------

  const groupedWithIndices = useMemo(() => {
    if (!groupByKategori) return null;
    const groups: Record<string, UnifiedRow[]> = {};
    sortedRows.forEach(row => {
      const key = row.kategori || (row.type === 'task' ? 'Haftalık Plan Görevleri' : 'Kategorisiz');
      (groups[key] ??= []).push(row);
    });
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      const special = ['Kategorisiz', 'Haftalık Plan Görevleri'];
      if (special.includes(a) && !special.includes(b)) return 1;
      if (!special.includes(a) && special.includes(b)) return -1;
      return a.localeCompare(b, 'tr');
    });
    let counter = 0;
    return sorted.map(([kategori, rows]) => ({
      kategori,
      indexedRows: rows.map(row => ({ row, globalIdx: counter++ })),
    }));
  }, [sortedRows, groupByKategori]);

  // Distinct categories for the filter dropdown
  const distinctKategoriler = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach(r => { if (r.kategori) set.add(r.kategori); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [allRows]);

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const hasActiveFilter = Object.values(filters).some(v => v !== '');
  const clearFilters = () => setFilters({ type: '', project: '', adaParsel: '', kategori: '', konu: '', status: '', tarih: '' });

  const handleExport = useCallback(() => {
    const data = sortedRows.map(row => ({
      'Tür': row.type === 'note' ? 'Saha Notu' : 'Haftalık Plan',
      'Proje Adı': row.projectName,
      'Ada/Parsel': row.adaParsel || '-',
      'Kategori': row.kategori || '-',
      'Konu': row.konu || '-',
      'Durum': row.statusLabel,
      'Tarih': row.tarihDisplay,
      'Sorumlu': row.responsible,
      'Açıklama': row.description.length > 500 ? row.description.slice(0, 500) + '...' : row.description,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Genel Rapor');
    XLSX.writeFile(wb, 'AYT_Muhendislik_Genel_Proje_Raporu.xlsx');
  }, [sortedRows]);

  const handleEditNote = (note: Note) => { setEditingNote(note); setShowAddModal(true); };
  const handleDeleteNote = async (note: Note) => {
    if (!canDeleteNote(note)) return;
    if (!confirm(`${note.projectName || 'Bu not'} silinsin mi?`)) return;
    try { await deleteNote(note); } catch { /* handled */ }
  };
  const handleSubmitNote = async (formData: NoteFormData, existingImageUrls?: string[]) => {
    if (!editingNote) return;
    await updateNote(editingNote.id, formData, formData.images.length > 0 ? formData.images : undefined, existingImageUrls);
    setEditingNote(null);
    setShowAddModal(false);
  };
  const handleRowClick = (row: UnifiedRow) => {
    if (row.note) { setSelectedNote(row.note); setIsDetailModalOpen(true); }
    else if (row.task) { setThreadTask(row.task); }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const loading = notesLoading || tasksLoading;
  if (loading) return <LoadingSpinner fullScreen message="Kayıt tablosu yükleniyor..." />;

  const COL_SPAN = 9;

  const thBase = 'group py-3 px-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200 cursor-pointer select-none hover:bg-gray-100/80 transition-colors whitespace-nowrap';
  const filterInputClass = 'w-full py-1.5 px-2 text-xs rounded border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300';

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 opacity-0 group-hover:opacity-40 text-[9px]">↕</span>;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 ml-0.5 inline text-gray-700" />
      : <ChevronDown className="w-3 h-3 ml-0.5 inline text-gray-700" />;
  };

  const renderDataRow = (row: UnifiedRow, globalIdx: number) => {
    const stripe = globalIdx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white';
    const pillClass = STATUS_PILL[row.statusLabel] || 'bg-gray-50 text-gray-600 border border-gray-200';

    return (
      <tr
        key={`${row.type}-${row.id}`}
        onClick={() => handleRowClick(row)}
        className={`border-b border-gray-100 cursor-pointer transition-colors hover:bg-blue-50/50 ${stripe}`}
      >
        <td className="py-2.5 px-3 text-gray-400 text-xs font-mono border-r border-gray-100 text-center">{globalIdx + 1}</td>
        <td className="py-2.5 px-3 border-r border-gray-100">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            row.type === 'note' ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
          }`}>
            {row.type === 'note' ? 'Kayıt' : 'Plan'}
          </span>
        </td>
        <td className="py-2.5 px-3 border-r border-gray-100 font-medium text-gray-900 max-w-[220px] truncate">{row.projectName || '–'}</td>
        <td className="py-2.5 px-3 border-r border-gray-100 text-gray-600 font-mono text-xs">{row.adaParsel || '–'}</td>
        <td className="py-2.5 px-3 border-r border-gray-100 text-gray-700 text-xs">{row.kategori || '–'}</td>
        <td className="py-2.5 px-3 border-r border-gray-100 text-gray-700 max-w-[280px] truncate">{row.konu || '–'}</td>
        <td className="py-2.5 px-3 border-r border-gray-100">
          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${pillClass}`}>
            {row.statusLabel}
          </span>
        </td>
        <td className="py-2.5 px-3 border-r border-gray-100 text-gray-600 font-mono text-xs whitespace-nowrap">{row.tarihDisplay}</td>
        <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-0.5">
            {row.note && canEditNote(row.note) && (
              <button onClick={() => handleEditNote(row.note!)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                title="Düzenle"
              ><Pencil className="w-3.5 h-3.5" /></button>
            )}
            {row.note && canDeleteNote(row.note) && (
              <button onClick={() => handleDeleteNote(row.note!)}
                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Sil"
              ><Trash2 className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-slate-950' : 'bg-gray-100'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b transition-colors ${isDark ? 'bg-slate-900/95 backdrop-blur-md border-slate-800' : 'bg-white/95 backdrop-blur-md border-gray-200 shadow-sm'}`}>
        <div className="px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className={`w-5 h-5 ${isDark ? 'text-safety-orange' : 'text-safety-orange-dark'}`} />
              <div>
                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Master Proje Günlüğü</h1>
                <p className={`text-xs ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>
                  {sortedRows.length} kayıt ({notes.length} not + {tasks.length} görev)
                  {hasActiveFilter ? ' · filtrelenmiş' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGroupByKategori(g => !g)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  groupByKategori
                    ? 'bg-safety-orange/10 border-safety-orange/30 text-safety-orange'
                    : isDark ? 'border-slate-600 text-concrete-400 hover:text-white hover:border-slate-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Layers className="w-4 h-4" />
                Grupla: Kategori
              </button>
              <button
                onClick={handleExport}
                disabled={sortedRows.length === 0}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  isDark ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/30' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                }`}
              >
                <Download className="w-4 h-4" />
                Excel'e Aktar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-5 py-4">
        {notesError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{notesError}</div>
        )}

        {/* Active filter chips */}
        {hasActiveFilter && (
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Filtreler:</span>
            {filters.type && <FilterChip label={`Tür: ${filters.type === 'note' ? 'Kayıt' : 'Plan'}`} onClear={() => setFilters(f => ({ ...f, type: '' }))} />}
            {filters.project && <FilterChip label={`Proje: ${filters.project}`} onClear={() => setFilters(f => ({ ...f, project: '' }))} />}
            {filters.adaParsel && <FilterChip label={`Ada/Parsel: ${filters.adaParsel}`} onClear={() => setFilters(f => ({ ...f, adaParsel: '' }))} />}
            {filters.kategori && <FilterChip label={`Kategori: ${filters.kategori}`} onClear={() => setFilters(f => ({ ...f, kategori: '' }))} />}
            {filters.konu && <FilterChip label={`Konu: ${filters.konu}`} onClear={() => setFilters(f => ({ ...f, konu: '' }))} />}
            {filters.status && <FilterChip label={`Durum: ${filters.status}`} onClear={() => setFilters(f => ({ ...f, status: '' }))} />}
            {filters.tarih && <FilterChip label={`Tarih: ${formatWorkDate(filters.tarih)}`} onClear={() => setFilters(f => ({ ...f, tarih: '' }))} />}
            <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium ml-1 transition-colors">Tümünü Temizle</button>
          </div>
        )}

        {/* ---- Excel-style Table ---- */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                {/* Column headers */}
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="py-3 px-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-r border-gray-200 w-12">#</th>
                  <th className={thBase} onClick={() => handleSort('type')} style={{ width: 80 }}>Tür<SortArrow field="type" /></th>
                  <th className={thBase} onClick={() => handleSort('projectName')}>Proje Adı<SortArrow field="projectName" /></th>
                  <th className={thBase} onClick={() => handleSort('adaParsel')} style={{ width: 110 }}>Ada/Parsel<SortArrow field="adaParsel" /></th>
                  <th className={thBase} onClick={() => handleSort('kategori')} style={{ width: 150 }}>Kategori<SortArrow field="kategori" /></th>
                  <th className={thBase} onClick={() => handleSort('konu')}>Konu<SortArrow field="konu" /></th>
                  <th className={thBase} onClick={() => handleSort('status')} style={{ width: 130 }}>Durum<SortArrow field="status" /></th>
                  <th className={thBase} onClick={() => handleSort('tarih')} style={{ width: 110 }}>Tarih<SortArrow field="tarih" /></th>
                  <th className="py-3 px-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-20">İşlem</th>
                </tr>

                {/* Inline filter row */}
                <tr className="bg-gray-50/70 border-b border-gray-200">
                  <td className="py-1.5 px-2 border-r border-gray-200" />
                  <td className="py-1.5 px-2 border-r border-gray-200">
                    <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value as '' | 'note' | 'task' }))} className={filterInputClass}>
                      <option value="">Tümü</option>
                      <option value="note">Kayıt</option>
                      <option value="task">Plan</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-2 border-r border-gray-200">
                    <input type="text" value={filters.project} onChange={e => setFilters(f => ({ ...f, project: e.target.value }))} placeholder="Ara..." className={filterInputClass} />
                  </td>
                  <td className="py-1.5 px-2 border-r border-gray-200">
                    <input type="text" value={filters.adaParsel} onChange={e => setFilters(f => ({ ...f, adaParsel: e.target.value }))} placeholder="Ara..." className={filterInputClass} />
                  </td>
                  <td className="py-1.5 px-2 border-r border-gray-200">
                    <select value={filters.kategori} onChange={e => setFilters(f => ({ ...f, kategori: e.target.value }))} className={filterInputClass}>
                      <option value="">Tümü</option>
                      {distinctKategoriler.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 px-2 border-r border-gray-200">
                    <input type="text" value={filters.konu} onChange={e => setFilters(f => ({ ...f, konu: e.target.value }))} placeholder="Ara..." className={filterInputClass} />
                  </td>
                  <td className="py-1.5 px-2 border-r border-gray-200">
                    <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className={filterInputClass}>
                      <option value="">Tümü</option>
                      <option value="Beklemede">Beklemede</option>
                      <option value="Onay">Onay</option>
                      <option value="Olumsuz Sonuç">Olumsuz Sonuç</option>
                      <option value="Bekliyor">Bekliyor</option>
                      <option value="Devam Ediyor">Devam Ediyor</option>
                      <option value="Tamamlandı">Tamamlandı</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-2 border-r border-gray-200">
                    <input type="date" value={filters.tarih} onChange={e => setFilters(f => ({ ...f, tarih: e.target.value }))} className={filterInputClass} />
                  </td>
                  <td className="py-1.5 px-2" />
                </tr>
              </thead>

              <tbody>
                {groupByKategori && groupedWithIndices ? (
                  groupedWithIndices.map(({ kategori, indexedRows }) => (
                    <React.Fragment key={kategori}>
                      <tr className="bg-gray-100/80 border-b border-gray-200">
                        <td colSpan={COL_SPAN} className="py-2.5 px-4">
                          <span className="flex items-center gap-2 text-sm font-bold text-gray-700">
                            <Layers className="w-3.5 h-3.5 text-gray-400" />
                            {kategori}
                            <span className="text-xs font-normal text-gray-400 ml-1">({indexedRows.length} kayıt)</span>
                          </span>
                        </td>
                      </tr>
                      {indexedRows.map(({ row, globalIdx }) => renderDataRow(row, globalIdx))}
                    </React.Fragment>
                  ))
                ) : sortedRows.length === 0 ? (
                  <tr><td colSpan={COL_SPAN} className="py-16 text-center text-gray-400">Henüz kayıt bulunmuyor</td></tr>
                ) : (
                  sortedRows.map((row, idx) => renderDataRow(row, idx))
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
        onDelete={async (note) => {
          try {
            await deleteNote(note);
            setSelectedNote(null);
            setIsDetailModalOpen(false);
          } catch { /* handled */ }
        }}
        canEdit={selectedNote ? canEditNote(selectedNote) : false}
        canDelete={selectedNote ? canDeleteNote(selectedNote) : false}
      />
      <AddNoteModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingNote(null); }}
        onSubmit={handleSubmitNote}
        editNote={editingNote}
      />
      <TaskThreadModal
        task={threadTask}
        isOpen={!!threadTask}
        onClose={() => setThreadTask(null)}
        onStatusChanged={refreshTasks}
        onDeleteTask={async (taskId) => {
          try {
            await deleteTask(taskId);
            setThreadTask(null);
            await refreshTasks();
          } catch { /* handled */ }
        }}
      />
    </div>
  );
};

export default TablePage;
