import React, { useState, useEffect, useRef, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import {
  X,
  Send,
  Paperclip,
  Loader2,
  User,
  CornerDownRight,
  AlertCircle,
  ArrowRight,
  Shield,
  Clock,
  FileDown,
  Check,
  Edit3,
  Trash2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { useWeeklyPlan, AddMessageInput } from '../hooks/useWeeklyPlan';
import { WeeklyTask, TaskThreadMessage, TaskStatus } from '../types';

// ---------------------------------------------------------------------------
// Error Boundary — catches any unhandled render crash inside the modal
// ---------------------------------------------------------------------------

interface EBProps { children: ReactNode; onReset?: () => void }
interface EBState { hasError: boolean; error: Error | null }

class TaskModalErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[TaskThreadModal] Render crash caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-8 max-w-md mx-4 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">Bir hata oluştu</h3>
            <p className="text-sm text-slate-500">
              Görev detayları yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); this.props.onReset?.(); }}
              className="px-4 py-2 text-sm font-medium bg-brand hover:bg-brand-light text-white rounded-lg transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts: { toDate?: () => Date } | Date | number | null | undefined): string {
  if (!ts) return '';
  let d: Date;
  if (typeof ts === 'number') d = new Date(ts);
  else if (ts instanceof Date) d = ts;
  else if (typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') d = ts.toDate();
  else return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hour}:${min}`;
}

function formatDate(ts: { toDate?: () => Date } | Date | number | null | undefined): string {
  if (!ts) return '';
  let d: Date;
  if (typeof ts === 'number') d = new Date(ts);
  else if (ts instanceof Date) d = ts;
  else if (typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') d = ts.toDate();
  else return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

const STATUS_BADGE: Record<TaskStatus, { bg: string; bgLight: string }> = {
  'Bekliyor': { bg: 'bg-yellow-100 text-yellow-800', bgLight: 'bg-yellow-100 text-yellow-800' },
  'Devam Ediyor': { bg: 'bg-blue-100 text-blue-800', bgLight: 'bg-blue-100 text-blue-800' },
  'Tamamlandı': { bg: 'bg-green-100 text-green-800', bgLight: 'bg-green-100 text-green-800' },
};

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

interface BubbleProps {
  msg: TaskThreadMessage;
  isOwn: boolean;
  onReply: (msg: TaskThreadMessage) => void;
  onMarkRFIResponded?: (msgId: string) => void;
}

const MessageBubble: React.FC<BubbleProps> = ({ msg, isOwn, onReply, onMarkRFIResponded }) => {
  if (!msg) return null;
  const safeContent = typeof msg.content === 'string' ? msg.content : '';
  const safeName = typeof msg.authorName === 'string' ? msg.authorName : 'Bilinmeyen';
  const isRFI = msg.isRFI === true;
  const rfiDeadline = msg.rfiResponseDeadline;
  const rfiResponded = msg.rfiRespondedAt;

  let rfiResponseTime: string | null = null;
  if (isRFI && rfiResponded && msg.createdAt) {
    const created = typeof msg.createdAt === 'object' && 'toDate' in msg.createdAt ? msg.createdAt.toDate() : new Date();
    const responded = typeof rfiResponded === 'object' && 'toDate' in rfiResponded ? rfiResponded.toDate() : new Date();
    const diffMs = responded.getTime() - created.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    rfiResponseTime = diffHours < 24 ? `${diffHours} saat` : `${Math.round(diffHours / 24)} gün`;
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 space-y-1.5 ${
          isRFI
            ? 'border-2 border-rfi-border bg-rfi-bg/30'
            : isOwn
              ? 'bg-brand/10 rounded-br-sm'
              : 'bg-slate-100 rounded-bl-sm'
        }`}
      >
        {isRFI && (
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-3.5 h-3.5 text-rfi-text" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-rfi-text">Resmi RFI</span>
            {rfiDeadline && (
              <span className="text-[10px] flex items-center gap-1 text-slate-500">
                <Clock className="w-3 h-3" />
                Son: {formatDate(rfiDeadline)}
              </span>
            )}
            {rfiResponded && (
              <span className="text-[10px] text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Yanıtlandı ({rfiResponseTime})
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <User className="w-3 h-3 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">{safeName}</span>
          <span className="text-[10px] text-slate-400">{formatTimestamp(msg.createdAt)}</span>
        </div>

        {typeof msg.replyToSnippet === 'string' && msg.replyToSnippet && (
          <div className="text-xs pl-3 border-l-2 italic line-clamp-2 border-slate-300 text-slate-500">
            {msg.replyToSnippet}
          </div>
        )}

        {safeContent && (
          <p className="text-sm whitespace-pre-wrap text-slate-800">{safeContent}</p>
        )}

        {Array.isArray(msg.imageUrls) && msg.imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {msg.imageUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={url} alt={`ek-${i + 1}`} className="h-20 w-20 object-cover rounded-lg border border-black/10 hover:opacity-80 transition-opacity" />
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={() => onReply(msg)}
            className="flex items-center gap-1 text-[10px] mt-1 transition-colors text-slate-400 hover:text-slate-600"
          >
            <CornerDownRight className="w-3 h-3" /> Yanıtla
          </button>
          {isRFI && !rfiResponded && onMarkRFIResponded && (
            <button onClick={() => onMarkRFIResponded(msg.id)}
              className="flex items-center gap-1 text-[10px] mt-1 text-green-600 hover:text-green-700 transition-colors"
            >
              <Check className="w-3 h-3" /> Yanıtlandı Olarak İşaretle
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SystemLogEntry
// ---------------------------------------------------------------------------

const SystemLogEntry: React.FC<{ msg: TaskThreadMessage }> = ({ msg }) => {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 justify-center py-2">
      <ArrowRight className="w-3 h-3 text-slate-400" />
      <span className="text-xs text-slate-400">{typeof msg.content === 'string' ? msg.content : ''}</span>
      <span className="text-[10px] text-slate-300">— {typeof msg.authorName === 'string' ? msg.authorName : ''}, {formatTimestamp(msg.createdAt)}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PDF Generation
// ---------------------------------------------------------------------------

function generateThreadPDF(task: WeeklyTask | null, messages: TaskThreadMessage[]) {
  if (!task) return;
  const title = task.title || 'Gorev';
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(18);
  doc.setTextColor(44, 62, 80);
  doc.text('AYT Muhendislik', 14, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Proje Yonetim OS - Resmi Dokuman', 14, y);
  y += 2;
  doc.setDrawColor(44, 62, 80);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 10;

  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Proje: ${task.projectId || '-'}`, 14, y);
  y += 5;
  doc.text(`Sorumlu: ${task.assignedTo || '-'}`, 14, y);
  y += 5;
  doc.text(`Durum: ${task.status || '-'}`, 14, y);
  y += 5;
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, y);
  y += 10;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('Mesaj Gecmisi', 14, y);
  y += 8;

  (messages || []).forEach(msg => {
    if (!msg) return;
    if (y > 270) { doc.addPage(); y = 20; }

    const isRFI = msg.isRFI === true;
    if (isRFI) {
      doc.setFillColor(255, 247, 237);
      doc.rect(14, y - 3, pageWidth - 28, 20, 'F');
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.3);
      doc.rect(14, y - 3, pageWidth - 28, 20, 'S');
    }

    const authorName = typeof msg.authorName === 'string' ? msg.authorName : '';
    const content = typeof msg.content === 'string' ? msg.content : '';

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const prefix = isRFI ? '[RFI] ' : msg.messageType === 'system_log' ? '[SYS] ' : '';
    doc.text(`${prefix}${authorName} - ${formatTimestamp(msg.createdAt)}`, 16, y);
    y += 4;

    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(content || ' ', pageWidth - 32);
    doc.text(lines, 16, y);
    y += lines.length * 4 + 6;
  });

  doc.save(`AYT_Thread_${title.replace(/\s+/g, '_').slice(0, 30)}.pdf`);
}

// ---------------------------------------------------------------------------
// TaskThreadModal
// ---------------------------------------------------------------------------

interface TaskThreadModalProps {
  task: WeeklyTask | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
  onEditTask?: (task: WeeklyTask) => void;
  onDeleteTask?: (taskId: string) => void;
}

const TaskThreadModal: React.FC<TaskThreadModalProps> = ({ task, isOpen, onClose, onStatusChanged, onEditTask, onDeleteTask }) => {
  const { currentUser, isAdmin } = useAuth();
  const { getTaskMessages, addTaskMessage, updateTaskStatus, markRFIResponded } = useWeeklyPlan();

  const [messages, setMessages] = useState<TaskThreadMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<TaskThreadMessage | null>(null);
  const [isRFIMode, setIsRFIMode] = useState(false);
  const [rfiDeadline, setRfiDeadline] = useState('');

  const feedEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const taskId = task?.id ?? null;

  const loadMessages = useCallback(async () => {
    if (!taskId) return;
    setLoadingMsgs(true);
    try {
      const data = await getTaskMessages(taskId);
      setMessages(data);
    } catch { /* silently handled */ } finally { setLoadingMsgs(false); }
  }, [taskId, getTaskMessages]);

  useEffect(() => {
    if (isOpen && taskId) {
      loadMessages();
      setMsgText(''); setPendingFiles([]); setReplyTo(null); setSendError(null);
      setIsRFIMode(false); setRfiDeadline('');
    }
  }, [isOpen, taskId, loadMessages]);

  useEffect(() => { feedEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!task) return;
    if (!msgText.trim() && pendingFiles.length === 0) return;
    setSending(true); setSendError(null);
    try {
      const input: AddMessageInput = {
        content: msgText,
        images: pendingFiles.length > 0 ? pendingFiles : undefined,
        replyToId: replyTo?.id ?? undefined,
        replyToSnippet: replyTo ? (replyTo.content ?? '').slice(0, 120) : undefined,
        isRFI: isRFIMode,
        rfiResponseDeadline: rfiDeadline ? new Date(rfiDeadline) : undefined,
      };
      const newMsg = await addTaskMessage(task.id, input);
      setMessages((prev) => [...prev, newMsg]);
      setMsgText(''); setPendingFiles([]); setReplyTo(null);
      setIsRFIMode(false); setRfiDeadline('');
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Mesaj gönderilemedi');
    } finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    setStatusUpdating(true);
    try {
      await updateTaskStatus(task.id, newStatus, task.status);
      onStatusChanged?.();
      await loadMessages();
    } catch { /* error surfaced via hook */ }
    finally { setStatusUpdating(false); }
  };

  const handleMarkRFIResponded = async (msgId: string) => {
    try {
      await markRFIResponded(msgId);
      await loadMessages();
    } catch { /* handled */ }
  };

  if (!isOpen || !task) return null;
  const statusBadge = STATUS_BADGE[task.status] ?? STATUS_BADGE['Bekliyor'];
  const safeMessages = Array.isArray(messages) ? messages : [];
  const rfiCount = safeMessages.filter(m => m?.isRFI).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose?.()} />
      <div className="relative w-full max-w-xl h-full flex flex-col shadow-2xl border-l animate-slide-left bg-white border-slate-200">
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate text-slate-800">{task?.title ?? 'Görev'}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge.bgLight}`}>{task?.status ?? 'Bekliyor'}</span>
                {task?.assignedTo && (
                  <span className="flex items-center gap-1 text-xs text-slate-500"><User className="w-3 h-3" />{task.assignedTo}</span>
                )}
                {task?.projectId && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${task?.color ?? ''}`}>{task.projectId}</span>
                )}
                {rfiCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-rfi-text bg-rfi-bg/30 px-1.5 py-0.5 rounded">
                    <Shield className="w-3 h-3" />{rfiCount} RFI
                  </span>
                )}
              </div>
              {task?.description && (
                <p className="text-xs mt-2 line-clamp-2 text-slate-500">{task.description}</p>
              )}
              <div className="flex gap-1.5 mt-3 flex-wrap items-center">
                <label className="text-xs font-medium text-slate-700">Durum:</label>
                <select
                  value={task?.status ?? 'Bekliyor'}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  disabled={statusUpdating}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors focus:outline-none focus:ring-1 focus:ring-brand/20 bg-slate-100 border-slate-200 text-slate-700 ${
                    statusUpdating ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="Bekliyor">Bekliyor</option>
                  <option value="Devam Ediyor">Devam Ediyor</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                </select>
                {statusUpdating && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                )}
                <span className="flex-1" />
                {typeof onEditTask === 'function' && (
                  <button
                    onClick={() => onEditTask(task)}
                    className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    <Edit3 className="w-3 h-3" /> Düzenle
                  </button>
                )}
                {typeof onDeleteTask === 'function' && isAdmin && (
                  <button
                    onClick={() => {
                      if (window.confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
                        onDeleteTask(task.id);
                      }
                    }}
                    className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    <Trash2 className="w-3 h-3" /> Sil
                  </button>
                )}
                <button
                  onClick={() => { try { generateThreadPDF(task, messages || []); } catch { /* safe */ } }}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <FileDown className="w-3 h-3" /> PDF Rapor
                </button>
              </div>
            </div>
            <button onClick={() => onClose?.()}
              className="p-2 rounded-lg flex-shrink-0 transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            ><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loadingMsgs ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              <span className="text-sm text-slate-400">Mesajlar yükleniyor…</span>
            </div>
          ) : safeMessages.length === 0 ? (
            <p className="text-center text-sm py-16 text-slate-400">
              Henüz mesaj veya aktivite yok. İlk mesajı siz gönderin.
            </p>
          ) : (
            safeMessages.map(msg =>
              msg?.messageType === 'system_log' ? (
                <SystemLogEntry key={msg.id} msg={msg} />
              ) : (
                <MessageBubble
                  key={msg.id} msg={msg}
                  isOwn={msg.authorId === currentUser?.uid}
                  onReply={setReplyTo}
                  onMarkRFIResponded={handleMarkRFIResponded}
                />
              )
            )
          )}
          <div ref={feedEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t px-5 py-3 space-y-2 border-slate-200">
          {sendError && (
            <div className="flex items-center gap-2 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5" />{sendError}</div>
          )}

          {replyTo && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-slate-100 text-slate-600">
              <CornerDownRight className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate flex-1"><strong>{replyTo?.authorName ?? ''}:</strong> {(replyTo?.content ?? '').slice(0, 80)}{(replyTo?.content?.length ?? 0) > 80 ? '…' : ''}</span>
              <button onClick={() => setReplyTo(null)} className="flex-shrink-0 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* RFI toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRFIMode(p => !p)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                isRFIMode
                  ? 'bg-rfi-border/20 text-rfi-text border border-rfi-border'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              {isRFIMode ? 'Resmi RFI' : 'RFI Olarak İşaretle'}
            </button>
            {isRFIMode && (
              <input
                type="date"
                value={rfiDeadline}
                onChange={(e) => setRfiDeadline(e.target.value)}
                placeholder="Son tarih"
                className="text-xs px-2 py-1.5 rounded-lg border bg-white border-slate-200 text-slate-800 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
              />
            )}
          </div>

          {Array.isArray(pendingFiles) && pendingFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {pendingFiles.map((f, i) => (
                <div key={i} className="relative group">
                  <img src={URL.createObjectURL(f)} alt={f.name} className="h-14 w-14 object-cover rounded-lg border border-black/10" />
                  <button onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  ><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <button onClick={() => fileInputRef.current?.click()} disabled={sending}
              className="p-2.5 rounded-lg transition-colors flex-shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Dosya Ekle"
            ><Paperclip className="w-5 h-5" /></button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ''; }}
            />
            <textarea value={msgText} onChange={(e) => setMsgText(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Mesajınızı yazın… (Shift+Enter yeni satır)" disabled={sending} rows={1}
              className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm leading-relaxed transition-all focus:outline-none bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
              style={{ maxHeight: 120 }}
              onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }}
            />
            <button onClick={handleSend}
              disabled={sending || (!msgText.trim() && pendingFiles.length === 0)}
              className="p-2.5 rounded-lg bg-brand hover:bg-brand-light text-white transition-colors disabled:opacity-40 flex-shrink-0"
              title="Gönder"
            >{sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskThreadModalSafe: React.FC<TaskThreadModalProps> = (props) => (
  <TaskModalErrorBoundary onReset={props.onClose}>
    <TaskThreadModal {...props} />
  </TaskModalErrorBoundary>
);

export default TaskThreadModalSafe;
