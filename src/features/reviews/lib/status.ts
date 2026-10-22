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

/** Which way a compliance band reads. The score says where; this says how bad. */
export const BAND_TONE: Record<string, BadgeTone> = {
  'High compliance': 'success',
  'Medium risk': 'warning',
  'High risk': 'danger',
};

export const BAND_TEXT: Record<string, string> = {
  'High compliance': 'text-success',
  'Medium risk': 'text-warning',
  'High risk': 'text-danger',
};
