import type { ActivityEntry } from './types';

const LOG_KEY_PREFIX = 'activityLog:';
const OPERATOR_KEY = 'operatorName';
const MAX_ENTRIES = 200;

function logKey(planId: string): string {
  return `${LOG_KEY_PREFIX}${planId}`;
}

export function getActivityLog(planId: string): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(logKey(planId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendActivity(planId: string, entry: ActivityEntry): ActivityEntry[] {
  const list = [...getActivityLog(planId), entry].slice(-MAX_ENTRIES);
  try {
    localStorage.setItem(logKey(planId), JSON.stringify(list));
  } catch {}
  return list;
}

export function getOperatorName(): string {
  try {
    return localStorage.getItem(OPERATOR_KEY) || '我';
  } catch {
    return '我';
  }
}

export function setOperatorName(name: string): void {
  try {
    localStorage.setItem(OPERATOR_KEY, name.trim() || '我');
  } catch {}
}
