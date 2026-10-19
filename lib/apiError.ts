// Turns an API/axios error into a message that is safe and useful to show a clinician.
// Raw server output (SQL, stack traces, file paths) is never shown — it is logged to the
// console for developers and replaced with the fallback.

const TECHNICAL = /SQLSTATE|SQL:|Integrity constraint|Exception|Stack trace|vendor\/|\.php|Connection:|Undefined (index|array key|variable)|Call to |Illuminate\\|Trying to /i;

function isSafe(msg: unknown): msg is string {
  return typeof msg === "string" && msg.trim().length > 0 && msg.length <= 200 && !TECHNICAL.test(msg);
}

export function friendlyError(err: any, fallback: string): string {
  const res = err?.response;

  // No response at all: network down, timeout, CORS, server unreachable.
  if (!res) return "Couldn't reach the server. Check your internet connection and try again.";

  const status: number = res.status;
  const data = res.data;

  if (status >= 500 || !isSafe(data?.message)) {
    // Keep the details for developers, hide them from the user.
    console.error("API error:", status, data);
  }

  // Validation errors (422): show the first field message if it is plain text.
  if (status === 422 && data?.errors && typeof data.errors === "object") {
    const first: any = Object.values(data.errors)[0];
    const msg = Array.isArray(first) ? first[0] : first;
    if (isSafe(msg)) return msg;
  }

  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find that record. It may have been removed.";
  if (status === 419) return "Your session timed out. Refresh the page and try again.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return fallback;

  return isSafe(data?.message) ? data.message : fallback;
}