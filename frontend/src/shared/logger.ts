/**
 * Frontend logger module
 * 
 * Logs are sent to the browser console and also to the server via HTTP POST.
 * This allows logs to be aggregated with backend logs in Grafana/Loki.
 */

export const LOG_EVENT = {
  // App lifecycle
  APP_INITIALIZED: 'frontend.app.initialized',
  APP_READY: 'frontend.app.ready',
  APP_ERROR: 'frontend.app.error',

  // Navigation
  ROUTE_CHANGED: 'frontend.route.changed',

  // API calls
  API_REQUEST: 'frontend.api.request',
  API_SUCCESS: 'frontend.api.success',
  API_ERROR: 'frontend.api.error',

  // User interactions
  USER_ACTION: 'frontend.user.action',
  USER_ERROR: 'frontend.user.error',

  // Data operations
  DATA_FETCH: 'frontend.data.fetch',
  DATA_MUTATION: 'frontend.data.mutation',

  // Component lifecycle
  COMPONENT_MOUNTED: 'frontend.component.mounted',
  COMPONENT_ERROR: 'frontend.component.error',
} as const;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  event?: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  service: 'scoopy-frontend';
}

/**
 * Sends logs to the server via HTTP POST.
 * This allows frontend logs to be aggregated with backend logs.
 */
async function sendLogsToServer(entry: LogEntry): Promise<void> {
  try {
    // Only send error and warn logs to avoid overwhelming the server
    if (entry.level !== 'error' && entry.level !== 'warn') {
      return;
    }

    // Get the API URL from environment or use current origin
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const logsEndpoint = `${apiUrl}/api/logs`;

    // Use sendBeacon for reliability (doesn't require response)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(logsEndpoint, JSON.stringify(entry));
      return;
    }

    // Fallback to fetch if sendBeacon is not available
    await fetch(logsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true, // Keep connection alive for more reliable delivery
    });
  } catch (error) {
    // Silently fail - don't let logging errors break the app
    console.error('Failed to send logs to server:', error);
  }
}

/**
 * Normalizes errors for logging
 */
function normalizeError(error: unknown): LogEntry['error'] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    name: 'Unknown',
    message: String(error),
  };
}

/**
 * Main logger class
 */
class Logger {
  private isDevelopment = import.meta.env.DEV;

  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown> & { event?: string; error?: unknown }
  ): LogEntry {
    const { event, error, ...rest } = context || {};

    return {
      level,
      timestamp: new Date().toISOString(),
      event,
      message,
      context: Object.keys(rest).length > 0 ? rest : undefined,
      error: error ? normalizeError(error) : undefined,
      service: 'scoopy-frontend',
    };
  }

  private log(entry: LogEntry): void {
    // Log to console in development
    const consoleMethod = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';
    if (this.isDevelopment) {
      console[consoleMethod](`[${entry.level.toUpperCase()}] ${entry.message}`, entry.context);
    }

    // Send to server
    sendLogsToServer(entry);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(this.createEntry('debug', message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(this.createEntry('info', message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(this.createEntry('warn', message, context));
  }

  error(message: string, context?: Record<string, unknown> & { error?: unknown }): void {
    this.log(this.createEntry('error', message, context));
  }
}

export const logger = new Logger();
