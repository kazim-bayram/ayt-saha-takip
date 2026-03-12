import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WeeklyTask, Note, TaskStatus, noteToTimelineItem, taskToTimelineItem, TimelineItem } from '../types';

interface MonthlyViewProps {
  tasks: WeeklyTask[];
  notes: Note[];
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  isDark: boolean;
  onItemClick: (item: TimelineItem) => void;
}

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const STATUS_DOT: Record<TaskStatus, string> = {
  'Bekliyor': 'bg-yellow-400',
  'Devam Ediyor': 'bg-blue-400',
  'Tamamlandı': 'bg-green-400',
};

const MonthlyView: React.FC<MonthlyViewProps> = ({
  tasks, notes, year, month, onPrevMonth, onNextMonth, onToday, onItemClick
}) => {
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;

    const items: TimelineItem[] = [
      ...tasks.map(taskToTimelineItem),
      ...notes.map(noteToTimelineItem),
    ];

    const dayMap = new Map<number, TimelineItem[]>();
    items.forEach(item => {
      const d = item.date;
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!dayMap.has(day)) dayMap.set(day, []);
        dayMap.get(day)!.push(item);
      }
    });

    const cells: { day: number | null; items: TimelineItem[] }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ day: null, items: [] });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, items: dayMap.get(d) || [] });
    const remainder = cells.length % 7;
    if (remainder) for (let i = 0; i < 7 - remainder; i++) cells.push({ day: null, items: [] });

    return cells;
  }, [tasks, notes, year, month]);

  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevMonth}
            className="p-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-800">
            {MONTHS_TR[month]} {year}
          </h2>
          <button
            onClick={onNextMonth}
            className="p-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={onToday}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-slate-100 text-slate-800 hover:bg-slate-200"
        >
          Bugün
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_TR.map(d => (
          <div key={d} className="text-center text-xs font-semibold py-2 text-slate-500">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-slate-200 bg-slate-200">
        {calendarData.map((cell, i) => {
          const isToday = isThisMonth && cell.day === today.getDate();
          return (
            <div
              key={i}
              className={`min-h-[100px] p-1.5 transition-colors ${
                cell.day
                  ? 'bg-white hover:bg-slate-50'
                  : 'bg-slate-50'
              }`}
            >
              {cell.day && (
                <>
                  <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full ${
                    isToday
                      ? 'bg-brand text-white'
                      : 'text-slate-700'
                  }`}>
                    {cell.day}
                  </span>
                  <div className="mt-1 space-y-0.5 max-h-[60px] overflow-hidden">
                    {cell.items.slice(0, 3).map(item => (
                      <button
                        key={item.id}
                        onClick={() => onItemClick(item)}
                        className="w-full flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate transition-colors hover:bg-slate-100"
                        title={item.title}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[item.status]}`} />
                        <span className="truncate text-slate-700">
                          {item.source === 'note' ? '📋' : ''} {item.title}
                        </span>
                      </button>
                    ))}
                    {cell.items.length > 3 && (
                      <span className="text-[9px] px-1 text-slate-400">
                        +{cell.items.length - 3} daha
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyView;
