import { describe, expect, it } from 'vitest';

import { renderWithProviders, screen, within } from '@/testing/test-utils';

import type {
  EntryRecalculation as EntryRecalculationData,
  RecalcCitation,
  ReviewDetail,
} from '../types';
import { EntryRecalculation } from './EntryRecalculation';

function basis(overrides: Partial<EntryRecalculationData['basis']> = {}) {
  return {
    table: 'calculation',
    sheet: 'GPAY',
    header_row: 7,
    first_row: 8,
    last_row: 2466,
    record_key: 'employee_ref',
    stated_column: 'AH',
    stated_header: 'TOTAL ACCRUAL',
    formula: 'fte_amount + non_fte_amount',
    formula_in_headers: 'FTE Vacation Accrual + Non-FTE Vacation Accrual',
    sign: 'a positive amount is a debit to the expense accounts',
    currency: 'EUR',
    rounding: '2 decimal places, half up',
    day_count: 'the approved denominator stated in the methodology',
    tolerance_pct: '0.1',
    tolerance_amount: '28672.59',
    row_tolerance: '0.01',
    worked_example: '5.666667 remaining RTT days at 311.728889 gives 1,766.46.',
    provisional_basis: false,
    ...overrides,
  };
}

function paper(overrides: Partial<EntryRecalculationData> = {}): EntryRecalculationData {
  return {
    basis: basis(),
    status: 'pass',
    explanation:
      'Rebuilt from 2,280 of 2,280 records, the entry comes to 28,672,591.24, which is the booked amount to the cent.',
    recomputed_total: '28672591.24',
    booked: {
      method: 'posting_debits',
      total: '28672591.24',
      description: 'the debit side of the posted entry, summed from 426 of its own lines',
      table: 'je_posting',
      sheet: 'Batch JE',
      lines: 426,
      accounts: ['720008', '720023'],
    },
    difference: '0.00',
    difference_pct: 0,
    within_tolerance: true,
    rows_total: 2280,
    rows_recomputed: 2280,
    rows_incomplete: 0,
    rows_agreeing: 2280,
    row_impact: '0',
    inputs: [
      {
        id: 'fte_amount',
        meaning: 'fte_accrual',
        unit: 'currency',
        source: 'calculation',
        description: 'The employee FTE share of the accrual.',
        required: true,
        bound: true,
        column: 'AF',
        header: 'FTE Vacation Accrual',
        rows_present: 2280,
        rows_missing: 0,
      },
      {
        id: 'rtt_days',
        meaning: 'rtt_balance_days',
        unit: 'days',
        source: 'calculation',
        description: 'Remaining RTT days at the reporting date.',
        required: false,
        bound: false,
        column: '',
        header: '',
        rows_present: 0,
        rows_missing: 0,
      },
    ],
    components: [
      {
        id: 'rtt_amount',
        label: 'RTT accrual, re-performed',
        expression: 'max(rtt_days, 0) * daily_rate',
        in_headers: 'max(Balance RTT Days, 0) * Daily Salary',
        unit: 'currency',
        total: '1051306.59',
        rows_populated: 2280,
        number_format: null,
      },
    ],
    corroborations: [
      {
        term: 'rtt_amount',
        against: 'rtt_accrual',
        label: 'RTT Accrual Amount',
        rows_compared: 2280,
        rows_agreeing: 2280,
        impact: '0',
        first_example: '',
        agrees: true,
      },
    ],
    citations: [],
    citation_count: 0,
    notes: [],
    duration_ms: 23,
    complete: true,
    ties: true,
    ...overrides,
  };
}

function citation(overrides: Partial<RecalcCitation> = {}): RecalcCitation {
  return {
    row: 42,
    sheet: 'GPAY',
    kind: 'stated_differs',
    recomputed: '200.00',
    stated: '175.00',
    stated_cell: 'AH42',
    difference: '25.00',
    difference_pct: 14.2857,
    why: 'The approved formula gives 25.00 more than the 175.00 this row states.',
    inputs: [
      {
        id: 'fte_amount',
        label: 'FTE Vacation Accrual',
        cell: 'AF42',
        value: '150.00',
        unit: 'currency',
      },
      {
        id: 'non_fte_amount',
        label: 'Non-FTE Vacation Accrual',
        cell: 'AG42',
        value: '50.00',
        unit: 'currency',
      },
    ],
    missing: [],
    ...overrides,
  };
}

function review(recalculation: EntryRecalculationData | null): ReviewDetail {
  return {
    review_id: 'rev_20261027T000000_abcdef01',
    status: 'completed',
    file_name: '236264.xlsx',
    created_at: '2026-10-27T00:00:00Z',
    reused_from: null,
    document_number: '236264',
    risk_rating: 'low',
    je_type: 'vacation-accrual-france',
    je_type_name: 'France vacation accrual',
    je_type_variant: 'cp_rtt_france',
    je_type_confidence: 0.9,
    je_type_corroborated: true,
    process: 'Record to Report',
    sub_process: 'Payroll',
    period: '2026 P09',
    step: '20',
    progress_pct: 100,
    score: 88,
    band: 'High compliance',
    provisional: false,
    headline: '88 out of 100, High compliance',
    summary: 'The entry rebuilds to the amount that was posted.',
    workbook: null,
    areas: [],
    observations: [],
    evidence: [],
    recalculation,
    split_summary: null,
    needs_person: [],
    next_steps: [],
    untraced_numbers: [],
    cost: { ai_calls: 0, total_tokens: 0, total_usd: '0', duration_ms: 1200, calls: [] },
    not_yet_run: [],
  };
}

function render(recalculation: EntryRecalculationData | null) {
  renderWithProviders(<EntryRecalculation review={review(recalculation)} index={6} />);
}

describe('EntryRecalculation', () => {
  it('renders nothing at all when the entry was not recalculated', () => {
    render(null);

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  /**
   * The case that matters most and is easiest to get wrong: a reviewer must be
   * able to see that the entry reproduces without reading a table of zeroes.
   */
  it('states the figure once when the entry rebuilds to the cent', () => {
    render(paper());

    const section = screen.getByRole('region', { name: /rebuilt from its inputs/i });
    expect(within(section).getByText(/rebuilt to the cent/i)).toBeInTheDocument();
    // Twice: the figure the records rebuild to, and the booked amount it equals.
    // Both are wanted - the second is what makes the first a comparison - but the
    // booked one is in the ordinary weight beside it rather than repeated large.
    expect(within(section).getAllByText('28,672,591.24')).toHaveLength(2);
    expect(within(section).getByText(/rebuilt from all 2,280 records/i)).toBeInTheDocument();
    // No difference row shouting about nothing.
    expect(within(section).queryByText(/does not rebuild/i)).not.toBeInTheDocument();
  });

  it('says every record agreed rather than showing an empty citation table', () => {
    render(paper());

    expect(
      screen.getByText(/every one of 2,280 records rebuilt to the amount the workbook states/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /do not agree/i })).not.toBeInTheDocument();
  });

  it('leads with the difference when the entry does not rebuild', () => {
    render(
      paper({
        status: 'fail',
        ties: false,
        within_tolerance: false,
        recomputed_total: '28672591.24',
        booked: { ...paper().booked, total: '28500000.00' },
        difference: '172591.24',
        difference_pct: 0.6055,
        explanation: 'Rebuilt from 2,280 of 2,280 records: 172,591.24 more than was posted.',
      }),
    );

    expect(screen.getByText(/does not rebuild to the amount that was posted/i)).toBeInTheDocument();
    expect(screen.getByText('172,591.24')).toBeInTheDocument();
    expect(screen.getByText(/0\.6055% of the booked amount/)).toBeInTheDocument();
    expect(screen.getByText('Fail')).toBeInTheDocument();
  });

  it('distinguishes a difference inside the agreed tolerance from one beyond it', () => {
    render(
      paper({
        status: 'partial',
        ties: false,
        within_tolerance: true,
        difference: '12.00',
        difference_pct: 0.00004,
      }),
    );

    expect(screen.getByText(/inside tolerance/i)).toBeInTheDocument();
    expect(screen.queryByText(/does not rebuild/i)).not.toBeInTheDocument();
  });

  /**
   * Nothing established is not a failure. Colouring it like one would turn
   * every unusual workbook into an exception somebody has to clear.
   */
  it('reports an entry it could not compare as neutral, not as a failure', () => {
    render(
      paper({
        status: 'unable_to_validate',
        ties: false,
        within_tolerance: null,
        difference: null,
        difference_pct: null,
        booked: {
          ...paper().booked,
          total: null,
          description: 'the je_posting table is not bound',
        },
        explanation:
          'Rebuilt 28,672,591.24 from 2,280 records, with nothing to compare it against.',
      }),
    );

    expect(screen.getByText(/nothing to compare against/i)).toBeInTheDocument();
    expect(screen.getByText(/the recomputation itself stands/i)).toBeInTheDocument();
    expect(screen.getByText('Unproven')).toBeInTheDocument();
  });

  it('shows the formula in the headers the preparer wrote', () => {
    render(paper());

    expect(screen.getByText('FTE Vacation Accrual + Non-FTE Vacation Accrual')).toBeInTheDocument();
    expect(screen.getByText(/as declared: fte_amount \+ non_fte_amount/i)).toBeInTheDocument();
    expect(screen.getByText(/TOTAL ACCRUAL/)).toBeInTheDocument();
  });

  it('says which inputs this workbook does not carry, and that they were optional', () => {
    render(paper());

    const inputs = screen.getByRole('table', {
      name: /every input the approved formula reads/i,
    });
    expect(within(inputs).getByText('FTE Vacation Accrual')).toBeInTheDocument();
    expect(within(inputs).getByText('optional')).toBeInTheDocument();
    expect(within(inputs).getByText(/not in this workbook \(not needed\)/i)).toBeInTheDocument();
  });

  it('cites each record that did not reconcile, with the cells behind it', () => {
    render(
      paper({
        status: 'partial',
        ties: false,
        citations: [citation()],
        citation_count: 1,
        rows_agreeing: 2279,
        row_impact: '25.00',
      }),
    );

    const table = screen.getByRole('table', { name: /do not agree/i });
    expect(within(table).getByText('AH42')).toBeInTheDocument();
    expect(within(table).getByText('Amount differs')).toBeInTheDocument();
    expect(within(table).getByText('200.00')).toBeInTheDocument();
    expect(within(table).getByText('175.00')).toBeInTheDocument();
    expect(within(table).getByText(/25.00 more than the 175.00/)).toBeInTheDocument();
    // The cells a reviewer opens the file at, and no identifier of any kind.
    expect(within(table).getByText(/AF42 150.00/)).toBeInTheDocument();
  });

  it('says how many citations are not shown when the list is capped', () => {
    render(
      paper({
        status: 'fail',
        ties: false,
        citations: [citation(), citation({ row: 43, stated_cell: 'AH43' })],
        citation_count: 1096,
        row_impact: '41234.00',
      }),
    );

    expect(screen.getByText(/showing the 2 largest of/i)).toBeInTheDocument();
    expect(screen.getByText('1,096')).toBeInTheDocument();
  });

  it('distinguishes a missing input from an amount that differs', () => {
    render(
      paper({
        status: 'partial',
        ties: false,
        complete: false,
        rows_recomputed: 2279,
        rows_incomplete: 1,
        citations: [
          citation({
            kind: 'input_missing',
            recomputed: null,
            stated: null,
            difference: null,
            difference_pct: null,
            missing: ['fte_amount'],
            why: 'FTE Vacation Accrual holds no number on this row, so the record could not be rebuilt.',
          }),
        ],
        citation_count: 1,
      }),
    );

    expect(screen.getByText('Input missing')).toBeInTheDocument();
    expect(screen.getByText(/could not be rebuilt/i)).toBeInTheDocument();
  });

  it('reports a re-performed leg that agrees on every row', () => {
    render(paper());

    const table = screen.getByRole('table', { name: /re-performed against the workbook/i });
    expect(within(table).getByText('rtt_amount')).toBeInTheDocument();
    expect(within(table).getByText('RTT Accrual Amount')).toBeInTheDocument();
    expect(within(table).getByText('2,280')).toBeInTheDocument();
    expect(within(table).getByText('None')).toBeInTheDocument();
  });

  it('carries the basis a reviewer needs before any figure means anything', () => {
    render(paper());

    expect(screen.getByText(/GPAY rows 8-2,466/)).toBeInTheDocument();
    expect(screen.getByText('2 decimal places, half up')).toBeInTheDocument();
    expect(screen.getByText('0.1% (28,672.59)')).toBeInTheDocument();
    expect(screen.getByText('Debit side of the posted entry')).toBeInTheDocument();
    expect(screen.getByText('720008, 720023')).toBeInTheDocument();
  });

  /**
   * A pass under a basis nobody has approved is not a pass, and the page has to
   * say so where the figure is read rather than in a footnote.
   */
  it('badges the basis as not signed off, beside the figures', () => {
    render(paper({ basis: basis({ provisional_basis: true }) }));

    expect(screen.getByText(/basis not signed off/i)).toBeInTheDocument();
  });

  it('says nothing about sign-off once the basis is approved', () => {
    render(paper());

    expect(screen.queryByText(/signed off/i)).not.toBeInTheDocument();
  });

  it('renders the notes rather than leaving a blank section', () => {
    render(
      paper({
        notes: ['cp_provision is not present in this workbook, so that part contributed nothing.'],
      }),
    );

    expect(screen.getByText(/what this rebuild could not do/i)).toBeInTheDocument();
    expect(screen.getByText(/cp_provision is not present/)).toBeInTheDocument();
  });
});
