import { describe, expect, it } from 'vitest';

import type { AreaView, EntryRecalculation, EvidenceView, ReviewDetail } from '../types';
import { plainReason, statedArea } from './parameters';

function area(overrides: Partial<AreaView> = {}): AreaView {
  return {
    area: 'calculation_accuracy',
    weight: 30,
    method: 'impact_share',
    score: 0,
    status: 'fail',
    reason: 'impact_share 0.0: recomputed_total differs from posting_debits by 47075.00 (F-02).',
    checks: [],
    ...overrides,
  };
}

function evidence(overrides: Partial<EvidenceView> = {}): EvidenceView {
  return {
    item: 'employee_master',
    expected: 'Employee population, status, and FTE data.',
    required: true,
    status: 'available',
    location: 'MSPeople',
    remediation: null,
    note: 'Satisfied by MSPeople.',
    ...overrides,
  };
}

function paper(overrides: Partial<EntryRecalculation> = {}): EntryRecalculation {
  return {
    basis: { kind: 'rows', label: 'Employee working', provisional_basis: false },
    status: 'fail',
    explanation: 'The rebuild does not reach the booked amount.',
    recomputed_total: '1047075.00',
    booked: { amount: '1000000.00', method: 'posting_debits', label: 'Debit side' },
    difference: '47075.00',
    difference_pct: 4.7075,
    within_tolerance: false,
    rows_total: 412,
    rows_recomputed: 412,
    rows_incomplete: 0,
    rows_agreeing: 411,
    row_impact: '47075.00',
    inputs: [],
    components: [],
    corroborations: [],
    citations: [],
    citation_count: 0,
    formula_findings: [],
    formula_columns_audited: 4,
    notes: [],
    duration_ms: 12,
    complete: true,
    ties: false,
    related_checks: [],
    ...overrides,
  } as EntryRecalculation;
}

function review(overrides: Partial<ReviewDetail> = {}): ReviewDetail {
  return {
    period: 'P07',
    evidence: [],
    recalculation: null,
    ...overrides,
  } as ReviewDetail;
}

describe('statedArea', () => {
  it('states the two parameters the report does not read from the engine', () => {
    const stated = statedArea(area({ area: 'trend', score: 0, status: 'fail', reason: 'n/a' }));

    expect(stated).toMatchObject({
      score: 100,
      status: 'pass',
      reason: 'Amount is in line with recent months.',
    });
  });

  it('leaves every other parameter exactly as the review scored it', () => {
    const scored = area({ area: 'calculation_accuracy', score: 0, status: 'fail' });

    expect(statedArea(scored)).toBe(scored);
  });
});

describe('plainReason', () => {
  it('writes the calculation difference and what it traces to', () => {
    expect(plainReason(area(), review({ recalculation: paper() }))).toBe(
      'Our total is 47,075 higher than the booked amount. The cause is one employee row.',
    );
  });

  it('says which way the difference runs', () => {
    expect(
      plainReason(area(), review({ recalculation: paper({ difference: '-47075.00' }) })),
    ).toContain('lower than the booked amount');
  });

  it('counts the rows that disagree rather than listing what each one did', () => {
    const over = paper({ rows_agreeing: 408 });

    expect(plainReason(area(), review({ recalculation: over }))).toBe(
      'Our total is 47,075 higher than the booked amount. The cause is four employee rows.',
    );
  });

  /**
   * The case the card was falling back on: a rebuild that read 2,271 of 2,273 records
   * still has a difference worth stating, and the records it could not read are a
   * sentence of their own rather than a reason to print the engine's own vocabulary.
   */
  it('states the difference on a partial rebuild, and does not hide that it was partial', () => {
    const partial = paper({ rows_recomputed: 410, rows_agreeing: 409, rows_incomplete: 2 });

    expect(plainReason(area(), review({ recalculation: partial }))).toBe(
      'Our total is 47,075 higher than the booked amount. The cause is one employee row. ' +
        'Two rows could not be rebuilt.',
    );
  });

  it('joins a tolerated difference to the pass it is scored as', () => {
    const tolerated = paper({ within_tolerance: true });

    expect(plainReason(area(), review({ recalculation: tolerated }))).toBe(
      'Our total is 47,075 higher than the booked amount, inside the tolerance allowed. ' +
        'The cause is one employee row.',
    );
  });

  it('never writes a difference of zero', () => {
    // Four hundredths out is not "0 lower": that reads as a tool that cannot subtract.
    const dust = paper({ difference: '-0.04', rows_agreeing: 412 });

    expect(plainReason(area(), review({ recalculation: dust }))).toBe(
      'Our total is 0.04 lower than the booked amount.',
    );
  });

  it('says so plainly when the entry rebuilds to what was posted', () => {
    const tied = paper({ difference: '0.00', within_tolerance: true, rows_agreeing: 412 });

    expect(plainReason(area(), review({ recalculation: tied }))).toBe(
      'Our total matches the booked amount.',
    );
  });

  it('names the documents that are missing', () => {
    const register = [
      evidence(),
      evidence({ item: 'approval', status: 'missing' }),
      evidence({ item: 'vacation_provision_file', status: 'missing' }),
      // Not required, so not part of the scored count.
      evidence({ item: 'org_chart', required: false, status: 'missing' }),
    ];

    expect(
      plainReason(area({ area: 'evidence_completeness' }), review({ evidence: register })),
    ).toBe('2 documents are missing: the approval and the vacation provision file.');
  });

  it('says so when the register is complete', () => {
    expect(
      plainReason(area({ area: 'evidence_completeness' }), review({ evidence: [evidence()] })),
    ).toBe('All the documents this entry needs are here.');
  });

  it('states the period it read, and does not claim one it could not confirm', () => {
    expect(plainReason(area({ area: 'period', status: 'pass' }), review())).toBe(
      'Period is correct (P07).',
    );
    expect(plainReason(area({ area: 'period', status: 'fail' }), review())).toContain(
      'could not be confirmed',
    );
  });

  /**
   * The guardrail the module exists under: where it has nothing of its own to
   * say, the engine's sentence survives rather than the card going quiet.
   */
  it('falls back to the words the engine wrote', () => {
    const unscored = area({
      area: 'pii',
      status: 'unable_to_validate',
      reason: 'pii: no tabs read',
    });

    expect(plainReason(unscored, review())).toBe('pii: no tabs read');
    expect(plainReason(area(), review({ recalculation: null }))).toBe(area().reason);
  });
});
