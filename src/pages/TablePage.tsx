import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Pencil,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useNotes } from '../hooks/useNotes';
import { useNoteSchema } from '../hooks/useNoteSchema';
import { useWeeklyPlan } from '../hooks/useWeeklyPlan';
import {
  Note, NoteFormData, WeeklyTask, TaskStatus, NoteStatus,
  normalizeStatus, NOTE_STATUS_CONFIG,
  getWorkDate, formatWorkDate, getNoteFieldValue,
} from '../types';
import AddNoteModal from '../components/AddNoteModal';
import NoteDetailModal from '../components/NoteDetailModal';
import TaskThreadModal from '../components/TaskThreadModal';
import LoadingSpinner from '../components/LoadingSpinner';

const CORE_FIELD_IDS = ['category', 'ada', 'parsel', 'date', 'progressLevel'] as const;

/** Map NoteStatus or TaskStatus to unified display label and color for Master Project Log */
function getUnifiedStatusDisplay(
  type: RowType,
  status: NoteStatus | TaskStatus | string
): { label: string; statusColor: 'green' | 'red' | 'yellow' | 'blue' } {
  if (type === 'note') {
    const s = normalizeStatus(status);
    return {
      label: NOTE_STATUS_CONFIG[s]?.label ?? s,
      statusColor: s === 'Onay' ? 'green' : 'red',
    };
  }
  const s = status as TaskStatus;
  if (s === 'Tamamlandı') return { label: 'Tamamlandı', statusColor: 'green' };
  if (s === 'Devam Ediyor') return { label: 'Devam Ediyor', statusColor: 'blue' };
  if (s === 'Bekliyor') return { label: 'Bekliyor', statusColor: 'yellow' };
  return { label: String(status) || '–', statusColor: 'yellow' };
}

type RowType = 'note' | 'task';

interface UnifiedRow {
  type: RowType;
  id: string;
  projectName: string;
  responsible: string;
  statusLabel: string;
  statusColor: 'green' | 'red' | 'yellow' | 'blue';
  dateStr: string;
  description: string;
  note?: Note;
  task?: WeeklyTask;
}

type SortField = 'projectName' | 'date' | 'type' | 'responsible' | null;
type SortDir = 'asc' | 'desc';

const TablePage: React.FC = () => {
  const { isDark } = useTheme();
  const { schema } = useNoteSchema();
  const schemaFields = [...schema.fields].sort((a, b) => a.order - b.order);
  const tableDisplayFields = useMemo(
    () => schemaFields.filter(
      (f) => CORE_FIELD_IDS.includes(f.id as (typeof CORE_FIELD_IDS)[number]) || f.showInTable
    ),
    [schemaFields]
  );

  const {
    notes, loading: notesLoading, error: notesError,
    updateNote, deleteNote, addComment, deleteComment, canEditNote, canDeleteNote,
  } = useNotes();

  const { getAllTasks } = useWeeklyPlan();

  const refreshTasks = useCallback(async () => {
    try { setTasks(await getAllTasks()); } catch { /* handled */ }
  }, [getAllTasks]);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setTasksLoading(true);
      try { setTasks(await getAllTasks()); } catch { /* handled */ }
      finally { setTasksLoading(false); }
    })();
  }, [getAllTasks]);

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filters, setFilters] = useState({
    project: '',
    responsible: '',
    status: '',
    type: '' as '' | 'note' | 'task',
  });
  const [filterDate, setFilterDate] = useState('');
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [threadTask, setThreadTask] = useState<WeeklyTask | null>(null);

  // Build unified rows (Master Project Log: notes + tasks merged)
  const allRows: UnifiedRow[] = useMemo(() => {
    const noteRows: UnifiedRow[] = notes.map(note => {
      const { label, statusColor } = getUnifiedStatusDisplay('note', note.status);
      return {
        type: 'note' as RowType,
        id: note.id,
        projectName: note.projectName || '',
        responsible: note.userName || note.userEmail || '',
        statusLabel: label,
        statusColor,
        dateStr: getWorkDate(note),
        description: note.content || '',
        note,
      };
    });

    const taskRows: UnifiedRow[] = tasks.map(task => {
      const created = task.createdAt?.toDate?.();
      const dateStr = created
        ? `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`
        : '';
      const { label, statusColor } = getUnifiedStatusDisplay('task', task.status);
      return {
        type: 'task' as RowType,
        id: task.id,
        projectName: task.projectId || '',
        responsible: task.assignedTo || '',
        statusLabel: label,
        statusColor,
        dateStr,
        description: task.title + (task.description ? ` – ${task.description}` : ''),
        task,
      };
    });

    return [...noteRows, ...taskRows];
  }, [notes, tasks]);

  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      if (filters.type && row.type !== filters.type) return false;
      if (filters.project && !row.projectName.toLowerCase().includes(filters.project.toLowerCase())) return false;
      if (filters.responsible && !row.responsible.toLowerCase().includes(filters.responsible.toLowerCase())) return false;
      if (filters.status) {
        if (row.type === 'note') {
          const noteStatus = normalizeStatus(row.note?.status);
          if (noteStatus !== filters.status && row.statusLabel !== filters.status) return false;
        } else {
          if (row.statusLabel !== filters.status) return false;
        }
      }
      if (filterDate && row.dateStr !== filterDate) return false;

      // Dynamic schema-field filters (only for notes)
      if (row.note) {
        for (const f of tableDisplayFields) {
          if (!f.showInTable || !f.showInFilter) continue;
          const fv = dynamicFilters[f.id]?.trim();
          if (!fv) continue;
          const val = getNoteFieldValue(row.note, f.id);
          const str = val != null ? (Array.isArray(val) ? val.join(' ') : String(val)) : '';
          if (!str.toLowerCase().includes(fv.toLowerCase())) return false;
        }
      }
      return true;
    });
  }, [allRows, filters, filterDate, tableDisplayFields, dynamicFilters]);

  const displayRows = useMemo(() => {
    let list = [...filteredRows];
    if (sortField) {
      list.sort((a, b) => {
        let aVal = '', bVal = '';
        if (sortField === 'projectName') { aVal = a.projectName.toLowerCase(); bVal = b.projectName.toLowerCase(); }
        else if (sortField === 'date') { aVal = a.dateStr; bVal = b.dateStr; }
        else if (sortField === 'type') { aVal = a.type; bVal = b.type; }
        else if (sortField === 'responsible') { aVal = a.responsible.toLowerCase(); bVal = b.responsible.toLowerCase(); }
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [filteredRows, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />;
  };

  const handleExport = useCallback(() => {
    const data = displayRows.map(row => {
      const base: Record<string, string> = {
        'Tür': row.type === 'note' ? 'Saha Notu' : 'Haftalık Plan',
        'Proje': row.projectName,
        'Sorumlu / Ekleyen': row.responsible,
        'Durum': row.statusLabel,
        'Tarih': formatWorkDate(row.dateStr),
        'Açıklama': row.description.length > 500 ? row.description.slice(0, 500) + '...' : row.description,
      };
      if (row.note) {
        tableDisplayFields.forEach(f => {
          const v = getNoteFieldValue(row.note!, f.id);
          let display = '';
          if (v != null) {
            if (f.type === 'date' && v) display = formatWorkDate(String(v));
            else if (Array.isArray(v)) display = v.join(', ');
            else if (typeof v === 'boolean') display = v ? 'Evet' : '';
            else if (v !== '') display = String(v);
          }
          base[f.label] = display;
        });
      }
      return base;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Genel Rapor');
    XLSX.writeFile(wb, 'AYT_Muhendislik_Genel_Proje_Raporu.xlsx');
  }, [displayRows, tableDisplayFields]);

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
    if (row.note) {
      setSelectedNote(row.note);
      setIsDetailModalOpen(true);
    } else if (row.task) {
      setThreadTask(row.task);
    }
  };

  const loading = notesLoading || tasksLoading;
  if (loading) return <LoadingSpinner fullScreen message="Kayıt tablosu yükleniyor..." />;

  const STATUS_COLOR_MAP: Record<string, string> = {
    green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400',
    blue: 'bg-blue-500/20 text-blue-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
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
                  {displayRows.length} kayıt ({notes.length} not + {tasks.length} görev)
                  {(filters.project || filters.responsible || filters.status || filters.type || filterDate) ? ' (filtrelenmiş)' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={displayRows.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                isDark ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              <Download className="w-4 h-4" />
              Excel'e Aktar
            </button>
          </div>
        </div>
      </header>

      <main className="px-5 py-4">
        {notesError && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{notesError}</div>
        )}

        <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 z-10">
                <tr className={isDark ? 'bg-gray-800 text-white' : 'bg-gray-800 text-white'}>
                  <th className="py-2 px-3 text-left font-semibold border-r border-gray-700/50 w-10">#</th>
                  <th className="py-2 px-3 text-left font-semibold border-r border-gray-700/50 w-20 cursor-pointer hover:bg-gray-700/50 select-none" onClick={() => handleSort('type')}>
                    Tür<SortIcon field="type" />
                  </th>
                  <th className="sticky left-0 z-20 py-2 px-3 text-left font-semibold border-r border-gray-700/50 bg-gray-800 cursor-pointer hover:bg-gray-700/50 select-none shadow-[4px_0_6px_-2px_rgba(0,0,0,0.3)]" onClick={() => handleSort('projectName')}>
                    Proje<SortIcon field="projectName" />
                  </th>
                  <th className="py-2 px-3 text-left font-semibold border-r border-gray-700/50 cursor-pointer hover:bg-gray-700/50 select-none" onClick={() => handleSort('responsible')}>
                    Sorumlu / Ekleyen<SortIcon field="responsible" />
                  </th>
                  {tableDisplayFields.map(f => (
                    <th key={f.id} className="py-2 px-3 text-left font-semibold border-r border-gray-700/50 whitespace-nowrap">{f.label}</th>
                  ))}
                  <th className="py-2 px-3 text-left font-semibold border-r border-gray-700/50 cursor-pointer hover:bg-gray-700/50 select-none whitespace-nowrap" onClick={() => handleSort('date')}>
                    Tarih<SortIcon field="date" />
                  </th>
                  <th className="py-2 px-3 text-left font-semibold border-r border-gray-700/50 whitespace-nowrap">Durum</th>
                  <th className="py-2 px-3 text-left font-semibold w-24 whitespace-nowrap">İşlemler</th>
                </tr>
                {/* Filter row */}
                <tr className="bg-gray-700/80 text-white">
                  <th className="py-1 px-2 border-r border-gray-600/50" />
                  <th className="py-1 px-2 border-r border-gray-600/50">
                    <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value as '' | 'note' | 'task' }))}
                      className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                    >
                      <option value="">Tümü</option>
                      <option value="note">Saha Notu</option>
                      <option value="task">Haftalık Plan</option>
                    </select>
                  </th>
                  <th className="sticky left-0 z-20 py-1 px-2 border-r border-gray-600/50 bg-gray-700/80 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.3)]">
                    <input type="text" value={filters.project} onChange={e => setFilters(f => ({ ...f, project: e.target.value }))} placeholder="Ara..."
                      className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                    />
                  </th>
                  <th className="py-1 px-2 border-r border-gray-600/50">
                    <input type="text" value={filters.responsible} onChange={e => setFilters(f => ({ ...f, responsible: e.target.value }))} placeholder="Ara..."
                      className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                    />
                  </th>
                  {tableDisplayFields.map(f => (
                    <th key={f.id} className="py-1 px-2 border-r border-gray-600/50">
                      {f.showInFilter ? (
                        <input type={f.id === 'date' ? 'date' : 'text'}
                          value={dynamicFilters[f.id] ?? ''} onChange={e => setDynamicFilters(prev => ({ ...prev, [f.id]: e.target.value }))}
                          placeholder="Ara..."
                          className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                        />
                      ) : <span className="block py-1" />}
                    </th>
                  ))}
                  <th className="py-1 px-2 border-r border-gray-600/50">
                    <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                      className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                    />
                  </th>
                  <th className="py-1 px-2 border-r border-gray-600/50">
                    <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                      className="w-full py-1 px-2 text-sm rounded border border-gray-500 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-safety-orange"
                    >
                      <option value="">Tümü</option>
                      <option value="Eksik">Eksik</option>
                      <option value="Onay">Onay</option>
                      <option value="Bekliyor">Bekliyor</option>
                      <option value="Devam Ediyor">Devam Ediyor</option>
                      <option value="Tamamlandı">Tamamlandı</option>
                    </select>
                  </th>
                  <th className="py-1 px-2" />
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={7 + tableDisplayFields.length} className={`py-8 text-center ${isDark ? 'text-concrete-500' : 'text-gray-500'}`}>
                      Henüz kayıt bulunmuyor
                    </td>
                  </tr>
                ) : (
                  displayRows.map((row, idx) => {
                    const isOdd = idx % 2 === 1;
                    const rowBg = isOdd ? (isDark ? 'bg-slate-900/30' : 'bg-gray-50') : (isDark ? 'bg-slate-850' : 'bg-white');
                    const stickyBg = isOdd ? (isDark ? 'bg-slate-900/30' : 'bg-gray-50') : (isDark ? 'bg-slate-850' : 'bg-white');
                    return (
                      <tr
                        key={`${row.type}-${row.id}`}
                        onClick={() => handleRowClick(row)}
                        className={`border-t transition-colors cursor-pointer ${rowBg} ${isDark ? 'border-slate-700/50 hover:bg-slate-800/50' : 'border-gray-200 hover:bg-blue-50'}`}
                      >
                        <td className={`py-2 px-3 font-mono whitespace-nowrap ${isDark ? 'text-concrete-300' : 'text-gray-600'}`}>{idx + 1}</td>
                        <td className={`py-2 px-3 border-r whitespace-nowrap ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            row.type === 'note'
                              ? isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
                              : isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
                          }`}>
                            {row.type === 'note' ? 'Saha Notu' : 'Haftalık Plan'}
                          </span>
                        </td>
                        <td className={`sticky left-0 z-[5] py-2 px-3 border-r whitespace-nowrap ${stickyBg} ${isDark ? 'border-slate-700/50 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.2)]' : 'border-gray-200 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.08)]'}`}>
                          <span className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{row.projectName || '-'}</span>
                        </td>
                        <td className={`py-2 px-3 border-r whitespace-nowrap ${isDark ? 'border-slate-700/50 text-concrete-300' : 'border-gray-200 text-gray-700'}`}>
                          {row.responsible || '-'}
                        </td>
                        {tableDisplayFields.map(f => {
                          if (!row.note) return <td key={f.id} className={`py-2 px-3 border-r whitespace-nowrap ${isDark ? 'border-slate-700/50 text-concrete-500' : 'border-gray-200 text-gray-400'}`}>–</td>;
                          const val = getNoteFieldValue(row.note, f.id);
                          let display = '-';
                          if (val != null) {
                            if (f.type === 'date' && val) display = formatWorkDate(String(val));
                            else if (Array.isArray(val)) display = val.length > 0 ? val.join(', ') : '-';
                            else if (typeof val === 'boolean') display = val ? 'Evet' : '-';
                            else if (val !== '') display = String(val);
                          }
                          return (
                            <td key={f.id} className={`py-2 px-3 border-r whitespace-nowrap ${['ada', 'parsel'].includes(f.id) ? 'font-mono ' : ''}${isDark ? 'border-slate-700/50 text-concrete-300' : 'border-gray-200 text-gray-700'}`}>
                              {display}
                            </td>
                          );
                        })}
                        <td className={`py-2 px-3 border-r font-mono whitespace-nowrap ${isDark ? 'border-slate-700/50 text-concrete-300' : 'border-gray-200 text-gray-700'}`}>
                          {formatWorkDate(row.dateStr)}
                        </td>
                        <td className={`py-2 px-3 border-r whitespace-nowrap ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR_MAP[row.statusColor]}`}>
                            {row.statusLabel}
                          </span>
                        </td>
                        <td className={`py-2 px-3 whitespace-nowrap ${isDark ? 'text-concrete-400' : 'text-gray-600'}`} onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {row.note && canEditNote(row.note) && (
                              <button onClick={() => handleEditNote(row.note!)}
                                className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-slate-700 text-concrete-300' : 'hover:bg-gray-200 text-gray-600'}`}
                                title="Düzenle"
                              ><Pencil className="w-3.5 h-3.5" /></button>
                            )}
                            {row.note && canDeleteNote(row.note) && (
                              <button onClick={() => handleDeleteNote(row.note!)}
                                className="p-1.5 rounded transition-colors hover:bg-red-500/20 text-red-400"
                                title="Sil"
                              ><Trash2 className="w-3.5 h-3.5" /></button>
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
      <TaskThreadModal
        task={threadTask}
        isOpen={!!threadTask}
        onClose={() => setThreadTask(null)}
        onStatusChanged={refreshTasks}
      />
    </div>
  );
};

export default TablePage;
