import { useMemo } from 'react';
import { WeeklyTask, Note, normalizeStatus } from '../types';

export interface ProjectAnalytics {
  completionPace: number;
  completedTasks: number;
  totalTasks: number;
  inProgressTasks: number;
  waitingTasks: number;

  activeThreadCount: number;

  delayedTasks: number;
  delayedTaskList: WeeklyTask[];

  bottleneckWorkers: { name: string; count: number; staleDays: number }[];
  noteStats: { total: number; beklemede: number; onay: number; olumsuz: number };
}

export const useProjectAnalytics = (
  tasks: WeeklyTask[],
  notes: Note[]
): ProjectAnalytics => {
  return useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === 'Tamamlandı').length;
    const inProgressTasks = tasks.filter(t => t.status === 'Devam Ediyor').length;
    const waitingTasks = tasks.filter(t => t.status === 'Bekliyor').length;

    const completionPace = tasks.length > 0
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0;

    const todayISO = new Date().toISOString().slice(0, 10);
    const delayedTaskList = tasks.filter(
      t => t.targetDate && t.targetDate < todayISO && t.status !== 'Tamamlandı'
    );

    const activeThreadCount = tasks.filter(t => {
      const updated = t.updatedAt?.toDate?.();
      if (!updated) return false;
      const daysSinceUpdate = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate <= 7 && t.status !== 'Tamamlandı';
    }).length;

    const now = Date.now();
    const workerMap = new Map<string, { count: number; maxStale: number }>();

    tasks.forEach(t => {
      if (t.status === 'Devam Ediyor' && t.assignedTo) {
        const updatedMs = t.updatedAt?.toDate?.()?.getTime() ?? now;
        const staleDays = Math.floor((now - updatedMs) / (24 * 60 * 60 * 1000));
        const prev = workerMap.get(t.assignedTo) || { count: 0, maxStale: 0 };
        workerMap.set(t.assignedTo, {
          count: prev.count + 1,
          maxStale: Math.max(prev.maxStale, staleDays),
        });
      }
    });

    const bottleneckWorkers = Array.from(workerMap.entries())
      .filter(([, v]) => v.maxStale >= 5)
      .map(([name, v]) => ({ name, count: v.count, staleDays: v.maxStale }))
      .sort((a, b) => b.count - a.count);

    const noteStats = {
      total: notes.length,
      beklemede: notes.filter(n => normalizeStatus(n.status) === 'Beklemede').length,
      onay: notes.filter(n => normalizeStatus(n.status) === 'Onay').length,
      olumsuz: notes.filter(n => normalizeStatus(n.status) === 'Olumsuz Sonuç').length,
    };

    return {
      completionPace,
      completedTasks,
      totalTasks: tasks.length,
      inProgressTasks,
      waitingTasks,
      activeThreadCount,
      delayedTasks: delayedTaskList.length,
      delayedTaskList,
      bottleneckWorkers,
      noteStats,
    };
  }, [tasks, notes]);
};
