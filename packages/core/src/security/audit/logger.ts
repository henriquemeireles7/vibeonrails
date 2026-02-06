/**
 * Audit Logger — Structured logging for security-sensitive events.
 */

export type AuditEventType =
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.password_change"
  | "auth.password_reset"
  | "auth.email_verify"
  | "auth.role_change"
  | "auth.session_revoke"
  | "data.create"
  | "data.update"
  | "data.delete";

export interface AuditEvent {
  type: AuditEventType;
  userId?: string;
  targetId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export type AuditSink = (event: AuditEvent) => void | Promise<void>;

/** Default sink: structured JSON to stdout */
const consoleSink: AuditSink = (event) => {
  console.log(JSON.stringify({ audit: true, ...event }));
};

let sinks: AuditSink[] = [consoleSink];

/**
 * Register an audit sink (log destination).
 * Call with no arguments to reset to default console sink.
 */
export function registerAuditSink(sink?: AuditSink): void {
  if (sink) {
    sinks.push(sink);
  } else {
    sinks = [consoleSink];
  }
}

/**
 * Emit an audit event to all registered sinks.
 */
export async function audit(
  type: AuditEventType,
  options: {
    userId?: string;
    targetId?: string;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  const event: AuditEvent = {
    type,
    ...options,
    timestamp: new Date().toISOString(),
  };

  await Promise.all(sinks.map((sink) => sink(event)));
}

/**
 * Get the count of registered sinks (for testing).
 */
export function getAuditSinkCount(): number {
  return sinks.length;
}
