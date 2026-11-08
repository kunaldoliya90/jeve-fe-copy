/**
 * How a review state and a check status are worded and coloured.
 *
 * In one module because they were previously written out wherever they were
 * needed, and three screens had drifted into three different words for the
 * same thing. In an audit tool that is not a cosmetic problem: "Needs a
 * person" and "Failed" are different findings, and a reader who sees them
 * styled alike will treat them alike.
 */

import type { BadgeVariantProps } from '@/components/ui/badgeVariants';

import type { CheckStatus, ReviewState } from '../types';

export type BadgeTone = NonNullable<BadgeVariantProps['tone']>;

export const STATE_LABEL: Record<ReviewState, string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Complete',
  needs_review: 'Needs a person',
  failed: 'Failed',
  rejected: 'Not accepted',
};

export const STATE_TONE: Record<ReviewState, BadgeTone> = {
  queued: 'neutral',
  running: 'primary',
  completed: 'success',
  needs_review: 'warning',
  failed: 'danger',
  rejected: 'danger',
};

/**
 * `unable_to_validate` and `missing_evidence` are deliberately *not* danger.
 *
 * Nothing was established, versus nothing was supplied — neither is a
 * failure, and colouring them red would turn every unproven line into an
 * exception somebody has to clear.
 */
export const STATUS_TONE: Record<CheckStatus, BadgeTone> = {
  pass: 'success',
  partial: 'warning',
  unable_to_validate: 'neutral',
  missing_evidence: 'warning',
  fail: 'danger',
};

/** Text colour for a status used as a label rather than as a pill. */
export const STATUS_TEXT: Record<CheckStatus, string> = {
  pass: 'text-success',
  partial: 'text-warning',
  unable_to_validate: 'text-muted-foreground',
  missing_evidence: 'text-warning',
  fail: 'text-danger',
};

/* -------------------------------------------------------------------------- */
/*  Compliance                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The compliance scale, in one place because three parts of the report say it.
 *
 * The server bands a review by the risk it carries — "High risk" — and the
 * report states the same fact as the compliance it shows. Both readings of a
 * 30 are true and the two words are opposites, so a page that took one from
 * the server and computed the other would eventually print "High" beside a
 * dial reading Low. Everything that words a band therefore computes it here,
 * from the one score, against the thresholds printed under the dial.
 */
export interface ComplianceLevel {
  name: 'Low' | 'Medium' | 'High';
  /** Text colour for the band, as a utility class. */
  color: string;
  /** How a card carrying the band is toned. */
  tone: 'danger' | 'warning' | 'success';
}

const COMPLIANCE_LEVELS = [
  { name: 'Low', color: 'text-band-low', tone: 'danger' },
  { name: 'Medium', color: 'text-band-medium', tone: 'warning' },
  { name: 'High', color: 'text-band-high', tone: 'success' },
] as const satisfies readonly ComplianceLevel[];

/** The thresholds, in the words printed under the dial. */
export const COMPLIANCE_LEGEND = 'Below 50 Low · 50–80 Medium · Above 80 High';

/** `null` for a review nothing has scored: an unscored entry is not a Low one. */
export function complianceLevel(score: number): ComplianceLevel;
export function complianceLevel(score: number | null): ComplianceLevel | null;
export function complianceLevel(score: number | null): ComplianceLevel | null {
  if (score === null) return null;
  if (score < 50) return COMPLIANCE_LEVELS[0];
  if (score <= 80) return COMPLIANCE_LEVELS[1];
  return COMPLIANCE_LEVELS[2];
}

/** As the report writes a score: a whole number stays whole, 62.5 keeps its half. */
export function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
