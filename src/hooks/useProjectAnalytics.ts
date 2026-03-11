import { useMemo } from 'react';
import { WeeklyTask, Note } from '../types';

export interface ProjectAnalytics {
  spiValue: number;
  spiLabel: string;
  totalPlannedHours: number;
  totalActualHours: number;
  totalMaterialCosts: number;
  completedTasks: number;
  inProgressTasks: number;
  waitingTasks: number;
  bottleneckWorkers: { name: string; count: number; staleDays: number }[];
  noteStats: { total: number; eksik: number; onay: number };
}

export const useProjectAnalytics = (
  tasks: WeeklyTask[],
  notes: Note[]
): ProjectAnalytics => {
  return useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === 'Tamamlandı').length;
    const inProgressTasks = tasks.filter(t => t.status === 'Devam Ediyor').length;
    const waitingTasks = tasks.filter(t => t.status === 'Bekliyor').length;

    const totalPlannedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
    const totalMaterialCosts = tasks.reduce((sum, t) => sum + (t.materialCosts || 0), 0);

    // SPI = EV / PV
    // EV = planned hours of completed tasks
    const earnedValue = tasks
      .filter(t => t.status === 'Tamamlandı')
      .reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const plannedValue = totalPlannedHours || 1;
    const spiValue = plannedValue > 0 ? earnedValue / plannedValue : 0;

    let spiLabel: string;
    if (spiValue >= 1) spiLabel = 'Planın Önünde';
    else if (spiValue >= 0.8) spiLabel = 'Plana Yakın';
    else spiLabel = 'Geride';

    // Bottleneck: workers with the most 'Devam Ediyor' tasks stale for >5 days
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
      eksik: notes.filter(n => n.status === 'Eksik').length,
      onay: notes.filter(n => n.status === 'Onay').length,
    };

    return {
      spiValue,
      spiLabel,
      totalPlannedHours,
      totalActualHours,
      totalMaterialCosts,
      completedTasks,
      inProgressTasks,
      waitingTasks,
      bottleneckWorkers,
      noteStats,
    };
  }, [tasks, notes]);
};
