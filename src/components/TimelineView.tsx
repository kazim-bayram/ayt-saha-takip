import React, { useMemo, useRef, useEffect } from 'react';
// lucide-react not currently needed for this component
import { WeeklyTask, TaskStatus } from '../types';

interface TimelineViewProps {
  tasks: WeeklyTask[];
  isDark: boolean;
  onTaskClick: (task: WeeklyTask) => void;
}

const STATUS_COLOR: Record<TaskStatus, { bar: string; barLight: string }> = {
  'Bekliyor': { bar: 'bg-yellow-500', barLight: 'bg-yellow-400' },
  'Devam Ediyor': { bar: 'bg-blue-500', barLight: 'bg-blue-400' },
  'Tamamlandı': { bar: 'bg-green-500', barLight: 'bg-green-400' },
};

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

const TimelineView: React.FC<TimelineViewProps> = ({ tasks, isDark, onTaskClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { days, taskRows, startDate, depLines } = useMemo(() => {
    if (tasks.length === 0) {
      const start = new Date();
      start.setDate(start.getDate() - 3);
      return { days: Array.from({ length: 28 }, (_, i) => addDays(start, i)), taskRows: [], startDate: start, depLines: [] };
    }

    // Determine date range from tasks
    let earliest = new Date();
    let latest = new Date();
    let hasDateRange = false;

    tasks.forEach(t => {
      const created = t.createdAt?.toDate?.() ?? new Date();
      const pStart = t.plannedStart ? new Date(t.plannedStart) : created;
      const pEnd = t.plannedEnd ? new Date(t.plannedEnd) : addDays(pStart, 5);

      if (!hasDateRange) {
        earliest = new Date(pStart);
        latest = new Date(pEnd);
        hasDateRange = true;
      } else {
        if (pStart < earliest) earliest = new Date(pStart);
        if (pEnd > latest) latest = new Date(pEnd);
      }
    });

    // Add buffer
    earliest = addDays(earliest, -3);
    latest = addDays(latest, 7);
    const totalDays = Math.max(daysBetween(earliest, latest), 14);

    const days = Array.from({ length: totalDays }, (_, i) => addDays(earliest, i));

    const taskIdMap = new Map<string, number>();
    const taskRows = tasks.map((t, idx) => {
      taskIdMap.set(t.id, idx);
      const created = t.createdAt?.toDate?.() ?? new Date();
      const pStart = t.plannedStart ? new Date(t.plannedStart) : created;
      const pEnd = t.plannedEnd ? new Date(t.plannedEnd) : addDays(pStart, 5);
      const startOffset = Math.max(0, daysBetween(earliest, pStart));
      const duration = Math.max(1, daysBetween(pStart, pEnd));
      return { task: t, startOffset, duration };
    });

    // Dependency lines
    const depLines: { fromRow: number; toRow: number; fromCol: number; toCol: number }[] = [];
    tasks.forEach((t, idx) => {
      if (t.dependencies) {
        t.dependencies.forEach(depId => {
          const depIdx = taskIdMap.get(depId);
          if (depIdx !== undefined) {
            const depRow = taskRows[depIdx];
            const curRow = taskRows[idx];
            depLines.push({
              fromRow: depIdx,
              toRow: idx,
              fromCol: depRow.startOffset + depRow.duration,
              toCol: curRow.startOffset,
            });
          }
        });
      }
    });

    return { days, taskRows, startDate: earliest, depLines };
  }, [tasks]);

  const COL_W = 40;
  const ROW_H = 44;
  const HEADER_H = 56;
  const LABEL_W = 200;
  const today = new Date();
  const todayIdx = daysBetween(startDate, today);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current && todayIdx > 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * COL_W - 200);
    }
  }, [todayIdx]);

  if (tasks.length === 0) {
    return (
      <div className={`text-center py-20 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
        <p className="text-sm">Zaman çizelgesinde gösterilecek görev bulunamadı.</p>
        <p className="text-xs mt-1">Görevlere planlanan başlangıç/bitiş tarihi ekleyin.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
      <div ref={scrollRef} className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        <div style={{ display: 'flex', minWidth: LABEL_W + days.length * COL_W }}>
          {/* Left label column */}
          <div className="flex-shrink-0" style={{ width: LABEL_W }}>
            <div
              className={`sticky top-0 z-10 px-3 border-b border-r ${isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-gray-50 border-gray-200'}`}
              style={{ height: HEADER_H, display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}
            >
              <span className={`text-xs font-semibold ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>Görev</span>
            </div>
            {taskRows.map(({ task }) => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                className={`flex items-center px-3 border-b border-r cursor-pointer transition-colors ${
                  isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-gray-100 hover:bg-gray-50'
                }`}
                style={{ height: ROW_H }}
              >
                <div className="min-w-0">
                  <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</p>
                  <p className={`text-[10px] truncate ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>{task.assignedTo || '–'}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline grid */}
          <div className="flex-1 relative" style={{ width: days.length * COL_W }}>
            {/* Header: day labels */}
            <div
              className={`sticky top-0 z-10 flex border-b ${isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-gray-50 border-gray-200'}`}
              style={{ height: HEADER_H }}
            >
              {days.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const isSunday = d.getDay() === 0;
                const isMonday = d.getDay() === 1;
                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 flex flex-col items-center justify-end pb-1 border-r ${
                      isToday
                        ? 'bg-safety-orange/10'
                        : isSunday
                          ? isDark ? 'bg-slate-800/40' : 'bg-gray-100/50'
                          : ''
                    } ${isDark ? 'border-slate-800' : 'border-gray-100'}`}
                    style={{ width: COL_W }}
                  >
                    {(isMonday || i === 0) && (
                      <span className={`text-[9px] font-medium ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
                        {d.toLocaleDateString('tr-TR', { month: 'short' })}
                      </span>
                    )}
                    <span className={`text-[11px] font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-safety-orange text-white' : isDark ? 'text-concrete-300' : 'text-gray-600'
                    }`}>
                      {d.getDate()}
                    </span>
                    <span className={`text-[8px] ${isSunday ? 'text-red-400' : isDark ? 'text-concrete-600' : 'text-gray-300'}`}>
                      {d.toLocaleDateString('tr-TR', { weekday: 'short' }).slice(0, 2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Task bars */}
            {taskRows.map(({ task, startOffset, duration }) => {
              const colors = STATUS_COLOR[task.status];
              return (
                <div
                  key={task.id}
                  className={`relative border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}
                  style={{ height: ROW_H }}
                >
                  {/* Grid lines */}
                  {days.map((d, i) => (
                    <div
                      key={i}
                      className={`absolute top-0 bottom-0 border-r ${
                        d.getDay() === 0 ? (isDark ? 'bg-slate-800/20' : 'bg-gray-50') : ''
                      } ${isDark ? 'border-slate-800' : 'border-gray-100'}`}
                      style={{ left: i * COL_W, width: COL_W }}
                    />
                  ))}
                  {/* Bar */}
                  <div
                    onClick={() => onTaskClick(task)}
                    className={`absolute top-2 rounded-md cursor-pointer transition-all hover:brightness-110 ${isDark ? colors.bar : colors.barLight}`}
                    style={{
                      left: startOffset * COL_W + 2,
                      width: Math.max(duration * COL_W - 4, 16),
                      height: ROW_H - 16,
                    }}
                    title={`${task.title} (${task.status})`}
                  >
                    <span className="text-[10px] font-medium text-white px-1.5 truncate block leading-[28px]">
                      {task.title}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Today marker */}
            {todayIdx >= 0 && todayIdx < days.length && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-safety-orange/60 z-20 pointer-events-none"
                style={{ left: todayIdx * COL_W + COL_W / 2 }}
              />
            )}

            {/* Dependency arrows (SVG overlay) */}
            {depLines.length > 0 && (
              <svg
                className="absolute top-0 left-0 pointer-events-none"
                style={{ width: days.length * COL_W, height: (taskRows.length) * ROW_H + HEADER_H }}
              >
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill={isDark ? '#6b7280' : '#9ca3af'} />
                  </marker>
                </defs>
                {depLines.map((line, i) => {
                  const x1 = line.fromCol * COL_W;
                  const y1 = HEADER_H + line.fromRow * ROW_H + ROW_H / 2;
                  const x2 = line.toCol * COL_W;
                  const y2 = HEADER_H + line.toRow * ROW_H + ROW_H / 2;
                  const midX = (x1 + x2) / 2;
                  return (
                    <path
                      key={i}
                      d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                      fill="none"
                      stroke={isDark ? '#4b5563' : '#d1d5db'}
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
