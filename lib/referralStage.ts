export type StageTool = { href: string; label: string };

/**
 * Maps a client's current referral state to the next screening tool.
 * No referral, or an awareness_to_screening referral, means the client's
 * next step is Stage 2 (the general screening wizard) — that's also the
 * correct default for walk-in clients who were never referred at all.
 */
export function nextToolFor(referralType?: string | null): StageTool | null {
  if (referralType === "screening_to_confirmation") {
    return { href: "/ncsr/diagnostic-evaluation", label: "Continue to Confirmation" };
  }
  if (referralType === "confirmation_to_treatment") {
    return null; // Stage 4 (treatment) tooling doesn't exist yet
  }
  return { href: "/ncsr/clinical-screening", label: "Screen" };
}