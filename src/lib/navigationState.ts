const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const DASHBOARD_PERIOD_STORAGE_KEY = 'moneda:dashboard-period';
export const DASHBOARD_PERIOD_CHANGED_EVENT = 'moneda:dashboard-period-changed';

export function isStoredPeriod(value: unknown): value is string {
  return typeof value === 'string' && PERIOD_PATTERN.test(value);
}

export function getStoredDashboardPeriod(): string | null {
  if (typeof window === 'undefined') return null;
  const period = window.sessionStorage.getItem(DASHBOARD_PERIOD_STORAGE_KEY);
  return isStoredPeriod(period) ? period : null;
}

export function setStoredDashboardPeriod(period: string) {
  if (typeof window === 'undefined' || !isStoredPeriod(period)) return;
  window.sessionStorage.setItem(DASHBOARD_PERIOD_STORAGE_KEY, period);
  window.dispatchEvent(new CustomEvent(DASHBOARD_PERIOD_CHANGED_EVENT, { detail: { period } }));
}

export function dashboardHrefWithStoredPeriod(): string {
  const period = getStoredDashboardPeriod();
  return period ? `/app?period=${encodeURIComponent(period)}` : '/app';
}
