/**
 * What the review spent on models, step by step.
 *
 * A single total says what a review cost. This says what to change: which step
 * is expensive, whether the cache is working, and which calls never fired at
 * all. A deterministic run spends nothing and shows so plainly — that is the
 * design working, not a missing number.
 *
 * Cached input and reasoning tokens are *subsets* of input and output, so only
 * the server's `total_tokens` is summed here. Adding all four would bill the
 * same tokens twice.
 */

import { Badge } from '@/components/ui';
import { formatDuration } from '@/hooks/useElapsed';
import { cn } from '@/utils/cn';

import { AI_CALL_LABELS, type AICallCostView, formatUsd, type ReviewDetail } from '../types';
import { Section } from './Section';
import { TableShell, Td, Th, Tr } from './TableShell';

interface StepCost {
  step: string;
  name: string;
  calls: AICallCostView[];
  tokens: number;
  usd: number;
  latencyMs: number;
}

/** One row per step, in the order the steps ran, each holding its own calls. */
function byStep(calls: AICallCostView[]): StepCost[] {
  const steps = new Map<string, StepCost>();
  for (const call of calls) {
    const existing = steps.get(call.step) ?? {
      step: call.step,
      name: call.name,
      calls: [],
      tokens: 0,
      usd: 0,
      latencyMs: 0,
    };
    existing.calls.push(call);
    existing.tokens += call.total_tokens;
    existing.usd += Number(call.cost_usd);
    existing.latencyMs += call.latency_ms;
    steps.set(call.step, existing);
  }
  return [...steps.values()];
}

export function CostBreakdown({ review, index }: { review: ReviewDetail; index: number }) {
  const { cost } = review;
  const steps = byStep(cost.calls);

  return (
    <Section
      index={index}
      id="cost"
      title="What this review cost"
      aside={
        <span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatUsd(cost.total_usd)}
          </span>
          <span>
            {` · ${String(cost.ai_calls)} model call${cost.ai_calls === 1 ? '' : 's'}` +
              (cost.duration_ms > 0 ? ` · ${formatDuration(cost.duration_ms)}` : '')}
          </span>
        </span>
      }
    >
      {steps.length === 0 ? (
        <p className="rounded-card border border-success/30 bg-success/[0.06] px-4 py-3 text-sm leading-relaxed text-foreground">
          No model was called. Every number on this review came from arithmetic, and it cost nothing
          to produce. That is the point of the design, not a gap in the reporting.
        </p>
      ) : (
        <>
          <TableShell caption="Model cost per numbered step" minWidth="min-w-[40rem]">
            <thead>
              <tr>
                <Th>Step</Th>
                <Th>Calls</Th>
                <Th className="text-right">Tokens</Th>
                <Th className="text-right">Time</Th>
                <Th className="text-right">Cost</Th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <StepRow key={step.step} step={step} total={Number(cost.total_usd)} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-strong bg-surface-muted/40 font-semibold">
                <td className="px-3 py-2.5 text-foreground">Total</td>
                <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{cost.ai_calls}</td>
                <td className="px-3 py-2.5 text-right text-foreground tabular-nums">
                  {cost.total_tokens.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">
                  {cost.duration_ms > 0 ? formatDuration(cost.duration_ms) : '-'}
                </td>
                <td className="px-3 py-2.5 text-right text-foreground tabular-nums">
                  {formatUsd(cost.total_usd)}
                </td>
              </tr>
            </tfoot>
          </TableShell>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Metered from what each provider reported, never estimated. The total time is the whole
            review, including the parsing and arithmetic that no model touched.
          </p>
        </>
      )}
    </Section>
  );
}

function StepRow({ step, total }: { step: StepCost; total: number }) {
  const share = total > 0 ? (step.usd / total) * 100 : 0;
  const cached = step.calls.reduce((sum, call) => sum + call.cached_tokens, 0);

  return (
    <Tr>
      <th scope="row" className="px-3 py-2.5 text-left font-normal">
        <span className="font-mono text-xs text-muted-foreground">{step.step}</span>
        <span className="ml-2 font-medium text-foreground">{step.name}</span>
        {share >= 1 ? (
          <span
            aria-hidden
            className="mt-1.5 block h-1 max-w-40 overflow-hidden rounded-pill bg-primary/15"
            title={`${share.toFixed(0)}% of spend`}
          >
            <span
              className="block h-full rounded-pill bg-primary"
              style={{ width: `${String(Math.min(share, 100))}%` }}
            />
          </span>
        ) : null}
      </th>

      <Td>
        <ul className="space-y-1">
          {step.calls.map((call, position) => (
            <li
              key={`${call.call}-${String(position)}`}
              className="flex flex-wrap items-center gap-1.5"
            >
              <Badge
                tone={call.schema_valid ? 'primary' : 'warning'}
                size="sm"
                className="font-mono"
              >
                {call.call}
              </Badge>
              <span className="text-xs">{AI_CALL_LABELS[call.call] ?? call.name}</span>
              {call.model ? (
                <span className="font-mono text-[10px] text-subtle-foreground">{call.model}</span>
              ) : null}
              {call.schema_valid ? null : (
                <span className="text-xs text-warning">answer stopped early</span>
              )}
            </li>
          ))}
        </ul>
      </Td>

      <Td className="text-right tabular-nums">
        {step.tokens.toLocaleString()}
        {cached > 0 ? (
          <span
            className="block text-[10px] text-success"
            title="Served from the provider's prompt cache, at a fraction of the price"
          >
            {cached.toLocaleString()} cached
          </span>
        ) : null}
      </Td>

      <Td className="text-right tabular-nums">
        {step.latencyMs > 0 ? formatDuration(step.latencyMs) : '-'}
      </Td>

      <Td className={cn('text-right font-medium text-foreground tabular-nums')}>
        {formatUsd(step.usd)}
      </Td>
    </Tr>
  );
}
