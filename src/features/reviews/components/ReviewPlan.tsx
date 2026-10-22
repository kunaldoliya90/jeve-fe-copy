/**
 * What a journal entry of this type is checked on, before any review runs.
 *
 * Read from the same versioned context files the harness runs from, so this
 * screen and the engine cannot disagree about what will be tested. The split
 * that matters is `decided_by`: a check settled by arithmetic needs no model
 * at all, and most of them are.
 */

import { AlertTriangle } from 'lucide-react';

import { Reveal } from '@/components/common';
import { Badge, Card, Skeleton, SkeletonText } from '@/components/ui';

import { useJeTypes } from '../api/reviews.queries';
import { AREA_LABELS, type CheckSpecView, METHOD_LABELS } from '../types';

export function ReviewPlan() {
  const { data, isPending, isError } = useJeTypes();

  if (isPending) {
    return (
      <div className="space-y-5" aria-busy>
        <span className="sr-only">Loading the review plan</span>
        <Card className="space-y-4 p-5">
          <Skeleton className="h-6 w-56" />
          <SkeletonText lines={2} />
          <div className="flex gap-8">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton shape="text" className="w-24" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </Card>
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} className="space-y-3 p-5">
            <Skeleton shape="text" className="w-40" />
            <SkeletonText lines={2} />
          </Card>
        ))}
      </div>
    );
  }

  // `data` is only guaranteed past `isPending` on the success path; an errored
  // query leaves it undefined, so it is narrowed before being indexed.
  const jeType = isError ? undefined : data[0];

  if (!jeType) {
    return (
      <Card tone="danger" className="flex items-start gap-2.5 p-4 text-sm">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
        <span className="text-foreground">
          The review plan could not be loaded, so what will be tested cannot be shown. It is read
          from versioned files on the server, not from this page.
        </span>
      </Card>
    );
  }

  // Bars are scaled against the heaviest area rather than against 100, so
  // they are comparable with one another instead of all looking light.
  const heaviest = Math.max(...jeType.areas.map((area) => area.weight), 1);

  return (
    <div className="space-y-5">
      <Reveal index={0}>
        <Card elevation="lift" className="hairline-top p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground-strong">{jeType.name}</h3>
            <span className="font-mono text-xs text-muted-foreground">
              {jeType.id} · v{jeType.version}
            </span>
          </div>

          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {jeType.objective}
          </p>

          <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
            <Stat label="Checks" value={jeType.check_count} />
            <Stat
              label="Settled by arithmetic"
              value={`${jeType.figures_decided} of ${jeType.check_count}`}
              hint="No model is involved in these"
            />
            <Stat
              label="Observations"
              value={jeType.observations.length}
              hint="Reported, never scored"
            />
            <Stat
              label="Evidence expected"
              value={jeType.evidence.filter((item) => item.required).length}
              hint="Required items, each scored"
            />
          </dl>
        </Card>
      </Reveal>

      <ol className="space-y-3">
        {jeType.areas.map((area, index) => (
          <Reveal as="li" key={area.area} index={index + 1}>
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-border bg-surface-muted/60 px-4 py-3">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-foreground">
                    {AREA_LABELS[area.area] ?? area.area}
                  </h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {METHOD_LABELS[area.method] ?? area.method}
                  </p>
                </div>
                <WeightBar weight={area.weight} heaviest={heaviest} />
              </div>

              <ul className="divide-y divide-border">
                {area.checks.map((check) => (
                  <CheckRow key={check.check_id} check={check} />
                ))}
              </ul>
            </Card>
          </Reveal>
        ))}
      </ol>

      {jeType.observations.length > 0 ? (
        <Reveal index={jeType.areas.length + 1}>
          <Card as="section" className="overflow-hidden border-dashed">
            <div className="border-b border-border bg-surface-muted/60 px-4 py-3">
              <h4 className="text-sm font-semibold text-foreground">Observations</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Reported to the reviewer and never scored.
              </p>
            </div>
            <ul className="divide-y divide-border">
              {jeType.observations.map((check) => (
                <CheckRow key={check.check_id} check={check} />
              ))}
            </ul>
          </Card>
        </Reveal>
      ) : null}
    </div>
  );
}

function CheckRow({ check }: { check: CheckSpecView }) {
  const deterministic = check.decided_by === 'figures';

  return (
    <li className="px-4 py-3 transition-colors duration-[160ms] ease-glide hover:bg-surface-muted/50">
      <div className="flex items-start justify-between gap-4">
        <p className="flex-1 text-sm leading-relaxed text-foreground">{check.question}</p>
        <Badge
          tone={deterministic ? 'success' : 'primary'}
          size="sm"
          className="shrink-0"
          title={
            deterministic
              ? 'The tool result alone sets this. A model only writes the explanation.'
              : 'A model concludes from the figures, and a second opinion may only make it stricter.'
          }
        >
          {deterministic ? 'Arithmetic' : 'Judgement'}
        </Badge>
      </div>

      {check.risk ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{check.risk}</p>
      ) : null}

      <p className="mt-1 font-mono text-[11px] text-subtle-foreground">
        {check.check_id}
        {check.tool ? ` · ${check.tool}` : ''}
      </p>
    </li>
  );
}

function WeightBar({ weight, heaviest }: { weight: number; heaviest: number }) {
  return (
    <div className="flex flex-none items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-pill bg-border" role="presentation">
        <div
          className="h-full rounded-pill bg-primary transition-[width] duration-700 ease-out-soft"
          style={{ width: `${String(Math.min((weight / heaviest) * 100, 100))}%` }}
        />
      </div>
      <span className="w-9 text-right font-mono text-xs text-muted-foreground tabular-nums">
        {weight}%
      </span>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold text-foreground tabular-nums">{value}</dd>
      {hint ? <p className="mt-0.5 text-[11px] text-subtle-foreground">{hint}</p> : null}
    </div>
  );
}
