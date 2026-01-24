
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnalyticsEvent =
  | 'auth_sign_up_success'
  | 'auth_login_success'
  | 'auth_logout'
  | 'wishlist_created'
  | 'wishlist_shared'
  | 'wishlist_opened'
  | 'item_added_link'
  | 'item_added_manual'
  | 'item_added_image'
  | 'item_added_camera'
  | 'import_started'
  | 'import_preview_loaded'
  | 'import_completed'
  | 'ai_extract_success'
  | 'ai_extract_partial'
  | 'ai_extract_failed'
  | 'ai_identify_success'
  | 'ai_identify_partial'
  | 'ai_identify_failed'
  | 'ai_import_success'
  | 'ai_import_partial'
  | 'ai_import_failed'
  | 'ai_alternatives_success'
  | 'ai_alternatives_partial'
  | 'ai_alternatives_failed'
  | 'ai_duplicates_success'
  | 'ai_duplicates_partial'
  | 'ai_duplicates_failed'
  | 'ai_grouping_success'
  | 'ai_grouping_partial'
  | 'ai_grouping_failed'
  | 'duplicates_found'
  | 'grouping_applied'
  | 'price_refresh_manual'
  | 'price_refresh_completed'
  | 'price_drop_detected'
  | 'report_submitted'
  | 'premium_modal_shown'
  | 'premium_upgrade_clicked'
  | 'premium_dismissed'
  | 'premium_restore_clicked'
  | 'premium_learn_more_clicked'
  | 'url_normalized'
  | 'price_refresh_job_created'
  | 'price_refresh_job_completed'
  | 'price_refresh_job_failed'
  | 'store_link_opened'
  | 'store_link_copied';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  type: 'event' | 'error';
  message: string;
  data?: any;
}

const MAX_LOGS = 200;
const LOGS_STORAGE_KEY = 'app_diagnostics_logs';

let logsCache: LogEntry[] = [];
let isInitialized = false;

async function initializeLogs() {
  if (isInitialized) return;
  
  try {
    const stored = await AsyncStorage.getItem(LOGS_STORAGE_KEY);
    if (stored) {
      logsCache = JSON.parse(stored);
    }
    isInitialized = true;
  } catch (error) {
    console.error('[Observability] Failed to load logs:', error);
    logsCache = [];
    isInitialized = true;
  }
}

async function persistLogs() {
  try {
    await AsyncStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logsCache));
  } catch (error) {
    console.error('[Observability] Failed to persist logs:', error);
  }
}

function addLog(entry: LogEntry) {
  logsCache.unshift(entry);
  
  if (logsCache.length > MAX_LOGS) {
    logsCache = logsCache.slice(0, MAX_LOGS);
  }
  
  persistLogs();
}

export function logEvent(event: AnalyticsEvent, data?: any) {
  console.log(`[Analytics] ${event}`, data || '');
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    type: 'event',
    message: event,
    data,
  };
  
  addLog(entry);
}

export function logError(error: Error, context?: any) {
  console.error('[Error]', error.message, context || '');
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    type: 'error',
    message: error.message,
    data: {
      stack: error.stack,
      ...context,
    },
  };
  
  addLog(entry);
}

export function logWarning(message: string, data?: any) {
  console.warn('[Warning]', message, data || '');
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    type: 'event',
    message,
    data,
  };
  
  addLog(entry);
}

export async function getDiagnosticLogs(): Promise<LogEntry[]> {
  await initializeLogs();
  return logsCache.slice(0, 50);
}

export async function clearDiagnosticLogs() {
  logsCache = [];
  await AsyncStorage.removeItem(LOGS_STORAGE_KEY);
}

export function formatDiagnostics(logs: LogEntry[]): string {
  const header = `My Wishlist Diagnostics
Generated: ${new Date().toISOString()}
Total Logs: ${logs.length}
${'='.repeat(50)}

`;

  const logLines = logs.map(log => {
    const time = new Date(log.timestamp).toLocaleString();
    const level = log.level.toUpperCase().padEnd(5);
    const type = log.type.padEnd(6);
    let line = `[${time}] ${level} ${type} ${log.message}`;
    
    if (log.data) {
      line += `\n  Data: ${JSON.stringify(log.data, null, 2)}`;
    }
    
    return line;
  }).join('\n\n');

  return header + logLines;
}

initializeLogs();
