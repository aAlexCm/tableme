// Shared error reporting, installed once per page. Captures the codebase's
// existing console.error(...) call sites for free (no need to touch every
// catch block) plus anything that slips past them uncaught.
import { Storage } from './storage.js';

let installed = false;
const originalConsoleError = console.error.bind(console);

export function initErrorLogging({ page, weddingId }) {
  function report(message, extra) {
    Storage.logAppError({ page, weddingId: weddingId || null, message, extra: extra || null });
  }

  if (!installed) {
    installed = true;
    console.error = (...args) => {
      originalConsoleError(...args);
      report(args.map((a) => (a instanceof Error ? a.stack || a.message : String(a))).join(' '));
    };

    window.addEventListener('error', (e) => {
      report(e.message, e.error && e.error.stack ? e.error.stack : `${e.filename}:${e.lineno}:${e.colno}`);
    });

    window.addEventListener('unhandledrejection', (e) => {
      const reason = e.reason;
      report(
        'Unhandled rejection: ' + (reason instanceof Error ? reason.message : String(reason)),
        reason instanceof Error ? reason.stack : null,
      );
    });
  }
}
