export interface NotificationPrefs {
  email_summary_weekly: boolean;
  email_budget_alert: boolean;
  push_budget_alert: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email_summary_weekly: true,
  email_budget_alert: true,
  push_budget_alert: false,
};
