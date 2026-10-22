import { describe, expect, it } from 'vitest';

import type { AreaView, CheckView, ReviewDetail } from '../types';
import { checksById, parseGaps } from './gaps';

function check(overrides: Partial<CheckView> = {}): CheckView {
  return {
    check_id: 'population_complete',
    area: 'population',
    question: 'Is every in-scope employee present?',
    status: 'unable_to_validate',
    decided_by: 'judgement',
    needs_review: true,
    review_reasons: [],
    conclusion: '',
    exception_count: 0,
    financial_impact: null,
    cells: [],
    ...overrides,
  };
}

function review(overrides: Partial<ReviewDetail> = {}): ReviewDetail {
  return {
    areas: [] as AreaView[],
    observations: [],
    needs_person: [],
    ...overrides,
  } as ReviewDetail;
}

const INDEX = checksById(
  review({
    areas: [
      {
        area: 'population',
        weight: 15,
        method: 'exception_rate',
        score: 99.9,
        status: 'unable_to_validate',
        reason: '',
        checks: [check()],
      },
    ],
  }),
);

describe('checksById', () => {
  it('finds a check wherever the review reported it', () => {
    const index = checksById(
      review({
        observations: [check({ check_id: 'trend' })],
        needs_person: [check({ check_id: 'approval_present' })],
      }),
    );

    expect([...index.keys()].sort()).toEqual(['approval_present', 'trend']);
  });

  it('keeps the first sighting when a check is reported twice', () => {
    // One waiting on a person is in `needs_person` *and* under its area. The
    // area copy is read first, where the check carries its full context.
    const underArea = check({ conclusion: 'Read from the area' });
    const index = checksById(
      review({
        areas: [
          {
            area: 'population',
            weight: 15,
            method: 'exception_rate',
            score: 0,
            status: 'unable_to_validate',
            reason: '',
            checks: [underArea],
          },
        ],
        needs_person: [check({ conclusion: 'Read from the worklist' })],
      }),
    );

    expect(index.get('population_complete')?.conclusion).toBe('Read from the area');
  });
});

describe('parseGaps', () => {
  it('joins a line to the check it names', () => {
    const [gap] = parseGaps(['population_complete is unable to validate: missing verdict.'], INDEX);

    expect(gap?.check?.question).toBe('Is every in-scope employee present?');
    expect(gap?.detail).toBe('Missing verdict.');
  });

  it('keeps only what the line adds, not what the status badge already says', () => {
    const [gap] = parseGaps(['population_complete is unable to validate.'], INDEX);

    // "is unable to validate" is the badge spelled out as a fragment.
    expect(gap?.check).not.toBeNull();
    expect(gap?.detail).toBe('');
  });

  it('passes a line naming nothing recognisable straight through', () => {
    // Guessing which check a line probably means would attach a reason to the
    // wrong finding, which is the worst outcome available here.
    const [gap] = parseGaps(['The leave window could not be read from the workbook.'], INDEX);

    expect(gap?.check).toBeNull();
    expect(gap?.line).toBe('The leave window could not be read from the workbook.');
    expect(gap?.detail).toBe('');
  });

  it('passes through an identifier this review never reported', () => {
    const [gap] = parseGaps(['salary_tieout is unable to validate: no source.'], INDEX);

    expect(gap?.check).toBeNull();
    expect(gap?.line).toBe('salary_tieout is unable to validate: no source.');
  });

  it('keeps the lines in the order the review wrote them', () => {
    const gaps = parseGaps(
      ['population_complete is unproven: one.', 'Something else: two.'],
      INDEX,
    );

    expect(gaps.map((gap) => gap.key)).toEqual(['0', '1']);
  });

  it('has nothing to show when the review listed no gaps', () => {
    expect(parseGaps([], INDEX)).toEqual([]);
  });
});
