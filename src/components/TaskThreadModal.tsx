import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWeeklyPlan, AddMessageInput } from '../hooks/useWeeklyPlan';
import { WeeklyTask, TaskThreadMessage, TaskStatus } from '../types';

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
  'Bekliyor': { bg: 'bg-yellow-500/20 text-yellow-300', bgLight: 'bg-yellow-100 text-yellow-800' },
  'Devam Ediyor': { bg: 'bg-blue-500/20 text-blue-300', bgLight: 'bg-blue-100 text-blue-800' },
  'Tamamlandı': { bg: 'bg-green-500/20 text-green-300', bgLight: 'bg-green-100 text-green-800' }
};

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

interface BubbleProps {
  msg: TaskThreadMessage;
  isDark: boolean;
  isOwn: boolean;
  onReply: (msg: TaskThreadMessage) => void;
  onMarkRFIResponded?: (msgId: string) => void;
}

const MessageBubble: React.FC<BubbleProps> = ({ msg, isDark, isOwn, onReply, onMarkRFIResponded }) => {
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
              ? isDark ? 'bg-safety-orange/20 rounded-br-sm' : 'bg-safety-orange/10 rounded-br-sm'
              : isDark ? 'bg-slate-700 rounded-bl-sm' : 'bg-gray-100 rounded-bl-sm'
        }`}
      >
        {/* RFI Badge */}
        {isRFI && (
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-3.5 h-3.5 text-rfi-text" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-rfi-text">Resmi RFI</span>
            {rfiDeadline && (
              <span className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>
                <Clock className="w-3 h-3" />
                Son: {formatDate(rfiDeadline)}
              </span>
            )}
            {rfiResponded && (
              <span className="text-[10px] text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Yanıtlandı ({rfiResponseTime})
              </span>
            )}
          </div>
        )}

        {/* Author + time */}
        <div className="flex items-center gap-2">
          <User className={`w-3 h-3 ${isDark ? 'text-concrete-400' : 'text-gray-400'}`} />
          <span className={`text-xs font-semibold ${isDark ? 'text-concrete-200' : 'text-gray-700'}`}>
            {msg.authorName}
          </span>
          <span className={`text-[10px] ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
            {formatTimestamp(msg.createdAt)}
          </span>
        </div>

        {msg.replyToSnippet && (
          <div className={`text-xs pl-3 border-l-2 italic line-clamp-2 ${isDark ? 'border-concrete-500 text-concrete-400' : 'border-gray-300 text-gray-500'}`}>
            {msg.replyToSnippet}
          </div>
        )}

        {msg.content && (
          <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-white' : 'text-gray-900'}`}>{msg.content}</p>
        )}

        {msg.imageUrls && msg.imageUrls.length > 0 && (
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
            className={`flex items-center gap-1 text-[10px] mt-1 transition-colors ${isDark ? 'text-concrete-500 hover:text-concrete-300' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <CornerDownRight className="w-3 h-3" /> Yanıtla
          </button>
          {isRFI && !rfiResponded && onMarkRFIResponded && (
            <button onClick={() => onMarkRFIResponded(msg.id)}
              className="flex items-center gap-1 text-[10px] mt-1 text-green-400 hover:text-green-300 transition-colors"
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

const SystemLogEntry: React.FC<{ msg: TaskThreadMessage; isDark: boolean }> = ({ msg, isDark }) => (
  <div className="flex items-center gap-2 justify-center py-2">
    <ArrowRight className={`w-3 h-3 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
    <span className={`text-xs ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>{msg.content}</span>
    <span className={`text-[10px] ${isDark ? 'text-concrete-600' : 'text-gray-300'}`}>— {msg.authorName}, {formatTimestamp(msg.createdAt)}</span>
  </div>
);

// ---------------------------------------------------------------------------
// PDF Generation
// ---------------------------------------------------------------------------

function generateThreadPDF(task: WeeklyTask, messages: TaskThreadMessage[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Letterhead
  doc.setFontSize(18);
  doc.setTextColor(255, 107, 0);
  doc.text('AYT Muhendislik', 14, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Proje Yonetim OS - Resmi Dokuman', 14, y);
  y += 2;
  doc.setDrawColor(255, 107, 0);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 10;

  // Task info
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(task.title, 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Proje: ${task.projectId || '-'}`, 14, y);
  y += 5;
  doc.text(`Sorumlu: ${task.assignedTo || '-'}`, 14, y);
  y += 5;
  doc.text(`Durum: ${task.status}`, 14, y);
  y += 5;
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, y);
  y += 10;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Messages
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('Mesaj Gecmisi', 14, y);
  y += 8;

  messages.forEach(msg => {
    if (y > 270) { doc.addPage(); y = 20; }

    const isRFI = msg.isRFI === true;
    if (isRFI) {
      doc.setFillColor(255, 247, 237);
      doc.rect(14, y - 3, pageWidth - 28, 20, 'F');
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.3);
      doc.rect(14, y - 3, pageWidth - 28, 20, 'S');
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const prefix = isRFI ? '[RFI] ' : msg.messageType === 'system_log' ? '[SYS] ' : '';
    doc.text(`${prefix}${msg.authorName} - ${formatTimestamp(msg.createdAt)}`, 16, y);
    y += 4;

    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(msg.content, pageWidth - 32);
    doc.text(lines, 16, y);
    y += lines.length * 4 + 6;
  });

  doc.save(`AYT_Thread_${task.title.replace(/\s+/g, '_').slice(0, 30)}.pdf`);
}

// ---------------------------------------------------------------------------
// TaskThreadModal
// ---------------------------------------------------------------------------

interface TaskThreadModalProps {
  task: WeeklyTask | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
}

const TaskThreadModal: React.FC<TaskThreadModalProps> = ({ task, isOpen, onClose, onStatusChanged }) => {
  const { isDark } = useTheme();
  const { currentUser } = useAuth();
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

  const loadMessages = useCallback(async () => {
    if (!task) return;
    setLoadingMsgs(true);
    try {
      const data = await getTaskMessages(task.id);
      setMessages(data);
    } catch { /* silently handled */ } finally { setLoadingMsgs(false); }
  }, [task, getTaskMessages]);

  useEffect(() => {
    if (isOpen && task) {
      loadMessages();
      setMsgText(''); setPendingFiles([]); setReplyTo(null); setSendError(null);
      setIsRFIMode(false); setRfiDeadline('');
    }
  }, [isOpen, task, loadMessages]);

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
        replyToSnippet: replyTo ? replyTo.content.slice(0, 120) : undefined,
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
  const statusBadge = STATUS_BADGE[task.status];
  const rfiCount = messages.filter(m => m.isRFI).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-xl h-full flex flex-col shadow-2xl border-l animate-slide-left ${isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-gray-200'}`}>
        {/* Header */}
        <div className={`flex-shrink-0 px-5 py-4 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? statusBadge.bg : statusBadge.bgLight}`}>{task.status}</span>
                {task.assignedTo && (
                  <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}><User className="w-3 h-3" />{task.assignedTo}</span>
                )}
                {task.projectId && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${task.color}`}>{task.projectId}</span>
                )}
                {rfiCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-rfi-text bg-rfi-bg/30 px-1.5 py-0.5 rounded">
                    <Shield className="w-3 h-3" />{rfiCount} RFI
                  </span>
                )}
              </div>
              {task.description && (
                <p className={`text-xs mt-2 line-clamp-2 ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>{task.description}</p>
              )}
              <div className="flex gap-1.5 mt-3 flex-wrap items-center">
                <label className={`text-xs font-medium ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Durum:</label>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  disabled={statusUpdating}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors focus:outline-none focus:ring-1 focus:ring-safety-orange/50 ${
                    statusUpdating ? 'opacity-60 cursor-not-allowed' : ''
                  } ${isDark ? 'bg-slate-800 border-slate-600 text-concrete-300' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
                >
                  <option value="Bekliyor">Bekliyor</option>
                  <option value="Devam Ediyor">Devam Ediyor</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                </select>
                {statusUpdating && (
                  <Loader2 className={`w-3.5 h-3.5 animate-spin ${isDark ? 'text-concrete-400' : 'text-gray-500'}`} />
                )}
                <span className="flex-1" />
                <button
                  onClick={() => generateThreadPDF(task, messages)}
                  className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${isDark ? 'bg-slate-800 text-concrete-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <FileDown className="w-3 h-3" /> PDF Rapor
                </button>
              </div>
            </div>
            <button onClick={onClose}
              className={`p-2 rounded-lg flex-shrink-0 transition-colors ${isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            ><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loadingMsgs ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-concrete-400' : 'text-gray-400'}`} />
              <span className={`text-sm ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Mesajlar yükleniyor…</span>
            </div>
          ) : messages.length === 0 ? (
            <p className={`text-center text-sm py-16 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
              Henüz mesaj veya aktivite yok. İlk mesajı siz gönderin.
            </p>
          ) : (
            messages.map(msg =>
              msg.messageType === 'system_log' ? (
                <SystemLogEntry key={msg.id} msg={msg} isDark={isDark} />
              ) : (
                <MessageBubble
                  key={msg.id} msg={msg} isDark={isDark}
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
        <div className={`flex-shrink-0 border-t px-5 py-3 space-y-2 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
          {sendError && (
            <div className="flex items-center gap-2 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5" />{sendError}</div>
          )}

          {replyTo && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800 text-concrete-300' : 'bg-gray-100 text-gray-600'}`}>
              <CornerDownRight className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate flex-1"><strong>{replyTo.authorName}:</strong> {replyTo.content.slice(0, 80)}{replyTo.content.length > 80 ? '…' : ''}</span>
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
                  : isDark ? 'text-concrete-400 hover:text-concrete-200 hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
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
                className={`text-xs px-2 py-1.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
            )}
          </div>

          {pendingFiles.length > 0 && (
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
              className={`p-2.5 rounded-lg transition-colors flex-shrink-0 ${isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              title="Dosya Ekle"
            ><Paperclip className="w-5 h-5" /></button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ''; }}
            />
            <textarea value={msgText} onChange={(e) => setMsgText(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Mesajınızı yazın… (Shift+Enter yeni satır)" disabled={sending} rows={1}
              className={`flex-1 resize-none rounded-xl px-4 py-2.5 text-sm leading-relaxed transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 ${
                isDark ? 'bg-slate-800 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange'
                  : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
              }`}
              style={{ maxHeight: 120 }}
              onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }}
            />
            <button onClick={handleSend}
              disabled={sending || (!msgText.trim() && pendingFiles.length === 0)}
              className="p-2.5 rounded-lg bg-safety-orange hover:bg-safety-orange-dark text-white transition-colors disabled:opacity-40 flex-shrink-0"
              title="Gönder"
            >{sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskThreadModal;
