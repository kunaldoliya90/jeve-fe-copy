import { describe, expect, it } from 'vitest';

import type { ProgressEvent } from '../types';
import { buildNarrative, describeEvent, formatBytes, PHASES, STEP_LABELS } from './narrative';

let clock = 0;

function event(overrides: Partial<ProgressEvent> = {}): ProgressEvent {
  clock += 1000;
  return {
    event: 'step_started',
    review_id: 'rev_1',
    step: '4',
    name: 'Reading the workbook',
    ts: new Date(clock).toISOString(),
    detail: {},
    ...overrides,
  };
}

function text(input: ProgressEvent): string {
  const line = describeEvent(input);
  expect(line).not.toBeNull();
  return line?.text ?? '';
}

function phase(events: ProgressEvent[], id: (typeof PHASES)[number]['id']) {
  const found = buildNarrative(events).phases.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No phase ${id}`);
  return found;
}

describe('describeEvent', () => {
  it('says what is happening in plain words, not the step name the server sent', () => {
    expect(text(event({ step: '13', name: 'Running the checks' }))).toBe(
      'Re-performing the arithmetic, check by check',
    );
  });

  it('turns a cell count into a sentence a reviewer can act on', () => {
    expect(
      text(
        event({
          event: 'step_finished',
          step: '4',
          detail: { sheets: 7, cells: 240311, formulas_available: true },
        }),
      ),
    ).toBe('Read 7 tabs and 240,311 cells, formulas included.');
  });

  it('says what a format with no formulas costs, rather than reporting it as fine', () => {
    // The one failure an audit tool cannot recover from is a reader taking an
    // absent judgement for a passed one, so the consequence is spelled out.
    const line = text(
      event({
        event: 'step_finished',
        step: '4',
        detail: { sheets: 3, cells: 900, formulas_available: false },
      }),
    );

    expect(line).toContain('stores only the values, not the formulas');
    expect(line).toContain('unproven rather than passed');
  });

  it('reports a reuse hit as a saving rather than hiding it', () => {
    const line = text(event({ event: 'cache_hit', step: '3', detail: { kind: 'reuse' } }));

    expect(line).toContain('reviewed before');
    expect(line).toContain('Reusing that result');
  });

  it('names the entry type, its confidence, and anything it could not place', () => {
    const line = text(
      event({
        event: 'step_finished',
        step: '7a',
        detail: {
          je_type: 'vacation-accrual-france',
          variant: 'cp_rtt_france',
          confidence: 0.92,
          tables_bound: 4,
          unbound: 'Sheet3, Notes',
        },
      }),
    );

    expect(line).toContain('Recognised as vacation-accrual-france (cp_rtt_france)');
    expect(line).toContain('92% sure');
    expect(line).toContain('4 tables matched up');
    expect(line).toContain('Could not place: Sheet3, Notes');
  });

  it('says a disputed identification leaves the arithmetic alone', () => {
    const line = text(
      event({ event: 'step_finished', step: '9', detail: { agrees: false, confidence: 0.4 } }),
    );

    expect(line).toContain('a person will look');
    expect(line).toContain('figures stand either way');
  });

  it('says dropped checks are not run rather than passed', () => {
    const line = text(
      event({
        event: 'step_finished',
        step: '12',
        detail: { steps: 14, source: 'recipes', dropped: 'leave_balance_tieout' },
      }),
    );

    expect(line).toContain('14 checks will run');
    expect(line).toContain('reported as not run, not as passed');
  });

  it('says what a model was asked to do, and what that cost', () => {
    expect(
      text(
        event({
          event: 'ai_call',
          step: '14',
          name: 'AI-3',
          detail: { call: 'AI-3', cost_usd: '0.0421', latency_ms: 3200 },
        }),
      ),
    ).toBe('Asked the model to judge what the figures mean ($0.0421, 3.2s).');
  });

  it('says a challenge can only tighten a result', () => {
    expect(
      text(
        event({
          event: 'step_finished',
          step: '15',
          detail: { challenged: 6, made_stricter: 2 },
        }),
      ),
    ).toContain('only ever tighten a result, never loosen one');
  });

  it('names untraced numbers rather than describing them as removed', () => {
    const line = text(
      event({ event: 'step_finished', step: '19', detail: { untraced: '4,200, 18%' } }),
    );

    expect(line).toContain('4,200, 18%');
    expect(line).toContain('named rather than deleted');
  });

  it('carries the provisional caveat onto the completion line', () => {
    expect(
      text(
        event({
          event: 'review_completed',
          step: '20',
          name: 'Report',
          detail: { score: 62.5, band: 'Medium risk', provisional: true },
        }),
      ),
    ).toBe(
      'Done. Scored 62.5 out of 100, Medium risk. Provisional, because at least one check is still waiting on a person.',
    );
  });

  it('says a reused review spent nothing', () => {
    expect(
      text(event({ event: 'review_completed', step: '20', name: 'Reused', detail: {} })),
    ).toContain('nothing was spent');
  });

  it('holds back the per-check events, which are told as a tally instead', () => {
    expect(
      describeEvent(event({ event: 'check_finished', step: '16', detail: { status: 'pass' } })),
    ).toBeNull();
  });

  it('falls back to the server name for a step it has never heard of', () => {
    expect(text(event({ step: '99', name: 'Something new' }))).toBe('Something new');
  });
});

describe('buildNarrative', () => {
  it('rolls the numbered steps up into the phases a reader can describe', () => {
    const narrative = buildNarrative([
      event({ event: 'review_started', step: '2', detail: { file_name: 'je.xlsx' } }),
      event({ step: '4' }),
      event({ event: 'step_finished', step: '4', detail: { sheets: 2, cells: 10 } }),
      event({ step: '13' }),
    ]);

    expect(narrative.phases.map((item) => item.state)).toEqual([
      'done',
      'done',
      'skipped',
      'skipped',
      'active',
      'pending',
      'pending',
    ]);
  });

  it('replaces a running line with its outcome instead of showing both', () => {
    const lines = phase(
      [event({ step: '4' }), event({ event: 'step_finished', step: '4', detail: { sheets: 2 } })],
      'read',
    ).lines;

    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toBe('Read 2 tabs.');
  });

  it('never lets a replayed start overwrite an outcome already shown', () => {
    // A dropped SSE connection reconnects and can replay. The panel must not
    // regress from "read 2 tabs" back to "reading the workbook".
    const lines = phase(
      [
        event({ step: '4' }),
        event({ event: 'step_finished', step: '4', detail: { sheets: 2 } }),
        event({ step: '4' }),
      ],
      'read',
    ).lines;

    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toBe('Read 2 tabs.');
  });

  it('marks a phase the pipeline skipped as skipped, not as done', () => {
    // On a layout cache hit the independent read never happens. A gap the
    // reader fills in with "passed" is the thing being avoided here.
    const narrative = buildNarrative([
      event({ step: '4' }),
      event({ event: 'review_completed', step: '20', detail: { score: 90 } }),
    ]);

    expect(phase([event({ step: '4' })], 'identify').state).toBe('pending');
    expect(phase([event({ step: '4' })], 'intake').state).toBe('unseen');
    expect(narrative.phases.find((item) => item.id === 'identify')?.state).toBe('skipped');
    expect(narrative.finished).toBe(true);
  });

  it('tallies the check outcomes rather than listing every one of them', () => {
    const statuses = ['pass', 'pass', 'pass', 'fail', 'partial', 'missing_evidence'] as const;
    const narrative = buildNarrative(
      statuses.map((status, index) =>
        event({
          event: 'check_finished',
          step: '16',
          detail: {
            check_id: `check_${String(index)}`,
            area: 'salary_validation',
            status,
            needs_review: status === 'missing_evidence',
          },
        }),
      ),
    );

    expect(narrative.tally).toEqual({
      settled: 6,
      pass: 3,
      fail: 1,
      partial: 1,
      unproven: 1,
      needsPerson: 1,
      observations: 0,
    });
    // Only the three a reviewer must act on get a line of their own.
    expect(narrative.notable).toHaveLength(3);
    expect(narrative.notable[0]?.text).toBe('Salary validation: fail.');
  });

  it('counts an observation apart, never as a failure', () => {
    // PII and trend run and are deliberately unscored. Folding a failed
    // observation into the fail count would report an exception the score
    // itself does not recognise.
    const narrative = buildNarrative([
      event({
        event: 'check_finished',
        step: '16',
        detail: { check_id: 'pii', area: 'observation', status: 'fail', needs_review: true },
      }),
    ]);

    expect(narrative.tally.observations).toBe(1);
    expect(narrative.tally.fail).toBe(0);
    expect(narrative.tally.needsPerson).toBe(0);
    expect(narrative.notable).toHaveLength(0);
  });

  it('merges several checks in one area onto a single counted line', () => {
    // The event carries the area, not the question, so three checks in one
    // area landing on one status would otherwise print the same sentence three
    // times — which reads as a rendering fault rather than as three findings.
    const narrative = buildNarrative(
      ['unable_to_validate', 'unable_to_validate', 'unable_to_validate'].map((status, index) =>
        event({
          event: 'check_finished',
          step: '16',
          detail: {
            check_id: `salary_${String(index)}`,
            area: 'salary_validation',
            status,
            needs_review: true,
          },
        }),
      ),
    );

    expect(narrative.notable).toHaveLength(1);
    expect(narrative.notable[0]?.text).toBe(
      'Salary validation: unproven on 3 checks, all going to a person.',
    );
  });

  it('says a phase was done earlier rather than skipped when it joined the stream late', () => {
    // A browser opening a review already in flight never sees the earlier
    // events. Calling those phases "skipped" would state, falsely, that the
    // work was not done.
    const narrative = buildNarrative([event({ step: '13' }), event({ step: '14' })]);

    expect(narrative.phases.find((item) => item.id === 'intake')?.state).toBe('unseen');
    expect(narrative.phases.find((item) => item.id === 'read')?.state).toBe('unseen');
    expect(narrative.phases.find((item) => item.id === 'checks')?.state).toBe('done');
    expect(narrative.phases.find((item) => item.id === 'judge')?.state).toBe('active');
  });

  it('counts an unrecognised status as settled without guessing which column it belongs in', () => {
    const narrative = buildNarrative([
      event({ event: 'check_finished', step: '16', detail: { status: 'something_new' } }),
    ]);

    expect(narrative.tally.settled).toBe(1);
    expect(narrative.tally.pass).toBe(0);
  });

  it('totals what the models were paid, per phase and overall', () => {
    const narrative = buildNarrative([
      event({ step: '14' }),
      event({
        event: 'ai_call',
        step: '14',
        name: 'AI-3',
        detail: { call: 'AI-3', cost_usd: '0.04' },
      }),
      event({
        event: 'ai_call',
        step: '18',
        name: 'AI-5',
        detail: { call: 'AI-5', cost_usd: '0.01' },
      }),
    ]);

    expect(narrative.modelCalls).toBe(2);
    expect(narrative.spentUsd).toBeCloseTo(0.05);
    expect(narrative.phases.find((item) => item.id === 'judge')?.costUsd).toBeCloseTo(0.04);
  });

  it('reports a deterministic run as having spent nothing', () => {
    const narrative = buildNarrative([event({ step: '13' })]);

    expect(narrative.modelCalls).toBe(0);
    expect(narrative.spentUsd).toBe(0);
  });

  it('exposes the newest line as the one to put in the headline', () => {
    const narrative = buildNarrative([event({ step: '4' }), event({ step: '17' })]);

    expect(narrative.current?.text).toBe('Scoring');
  });

  it('prefers the terminal line over whatever step ran last', () => {
    const narrative = buildNarrative([
      event({ step: '17' }),
      event({ event: 'review_failed', step: '17', detail: { message: 'It ran out of time' } }),
    ]);

    expect(narrative.current?.kind).toBe('failed');
    expect(narrative.current?.text).toBe('It ran out of time');
  });

  it('reports the furthest progress any event carried', () => {
    const narrative = buildNarrative([
      event({ step: '4', progress_pct: 40 }),
      event({ event: 'check_finished', step: '16', progress_pct: 94, detail: { status: 'pass' } }),
    ]);

    expect(narrative.progressPct).toBe(94);
  });

  it('never lets progress slide backwards', () => {
    // Events can arrive out of order after a reconnect. A bar that goes
    // backwards reads as a failure rather than as progress.
    const narrative = buildNarrative([
      event({ step: '17', progress_pct: 95 }),
      event({ step: '4', progress_pct: 40 }),
    ]);

    expect(narrative.progressPct).toBe(95);
  });

  it('reports no progress at all when the server does not carry it', () => {
    // An older server sends no `progress_pct`. Reporting zero would make the
    // caller take the bar backwards from whatever the polled detail said.
    expect(buildNarrative([event({ step: '4' })]).progressPct).toBeNull();
  });

  it('treats the polled status as ending the review when the stream never said so', () => {
    // A stream dropped at step 17 never delivers its terminal event. Without
    // the caller's own `finished`, the last phase it saw would go on claiming
    // to be running under a review the server reports as complete.
    const narrative = buildNarrative([event({ step: '17' })], { finished: true });

    expect(narrative.finished).toBe(true);
    expect(narrative.phases.find((item) => item.id === 'judge')?.state).toBe('done');
    expect(narrative.phases.find((item) => item.id === 'report')?.state).toBe('skipped');
  });

  it('survives an empty stream, which is what a just-accepted upload looks like', () => {
    const narrative = buildNarrative([]);

    expect(narrative.current).toBeNull();
    expect(narrative.phases).toHaveLength(PHASES.length);
    expect(
      narrative.phases.every((item) => item.state === 'active' || item.state === 'pending'),
    ).toBe(true);
  });
});

describe('PHASES', () => {
  const ACTORS = new Set(['Harness', 'Agent', 'Skill', 'Skills']);

  it('names who does the work on every phase', () => {
    // No anonymous row. A reader has to be able to tell a stretch an agent
    // reasoned about from one the harness merely sequenced, and every phase
    // carrying an actor is what makes that true by construction rather than
    // by whoever wrote the last title remembering to say so.
    for (const phase of PHASES) {
      expect(ACTORS.has(phase.actor)).toBe(true);
      expect(phase.title).not.toMatch(/\(|\)/);
    }
  });

  it('covers the engine steps once each, in order', () => {
    const steps = PHASES.flatMap((phase) => phase.steps);

    expect(new Set(steps).size).toBe(steps.length);
    // Every step the UI claims a phase for must be one the engine labels, or
    // the technical view shows a number with no name beside it.
    for (const step of steps) {
      expect(STEP_LABELS[step]).toBeDefined();
    }
  });
});

describe('formatBytes', () => {
  it('reads the way a file dialog does', () => {
    expect(formatBytes(25_400_000)).toBe('25.4 MB');
    expect(formatBytes(812_000)).toBe('812 KB');
    expect(formatBytes(0)).toBe('0 KB');
  });
});
