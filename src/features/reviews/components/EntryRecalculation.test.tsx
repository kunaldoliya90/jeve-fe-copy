import { describe, expect, it } from 'vitest';

import { fireEvent, renderWithProviders, screen, within } from '@/testing/test-utils';

import type {
  EntryRecalculation as EntryRecalculationData,
  RecalcCitation,
  RecalcExplained,
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
    formula: 'cp_provision + rtt_amount / 12',
    formula_expanded:
      'Total Provision CP + ((max(Acquis RTT - Pris RTT, 0)) * Daily Salary (RTT Rate)) / 12',
    formula_in_headers: 'Total Provision CP + Rebuilt RTT accrual / 12',
    sign: 'a positive amount is a debit to the expense accounts',
    currency: 'EUR',
    rounding: '2 decimal places, half up',
    day_count: 'the approved denominator stated in the methodology',
    tolerance_pct: '0.1',
    tolerance_amount: '28672.59',
    row_tolerance: '0.01',
    worked_example: '5.666667 remaining RTT days at 311.728889 gives 1,766.46.',
    explained: null,
    provisional_basis: false,
    ...overrides,
  };
}

function explained(overrides: Partial<RecalcExplained> = {}): RecalcExplained {
  return {
    intro: 'The formula used, explained step by step.',
    context: 'CP is counted in full; RTT is valued only for the days still unused.',
    steps: [
      {
        label: 'RTT days earned so far',
        detail: 'Yearly entitlement over twelve, times months worked.',
        example: '10 / 12 x 8 = 6.67 days',
      },
      {
        label: 'Unused RTT days',
        detail: 'Earned so far, minus days taken, floored at zero.',
        example: '6.67 - 1 = 5.67 days',
      },
    ],
    summary: 'In one sentence: one month of unused RTT, plus the full unused paid holiday.',
    caveats: ['The amount excludes employer social charges.'],
    ...overrides,
  };
}

function paper(overrides: Partial<EntryRecalculationData> = {}): EntryRecalculationData {
  return {
    basis: basis(),
    walkthrough: null,
    row_diagnosis: null,
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
        id: 'unused_rtt_days',
        label: 'Unused RTT days',
        description: 'Days earned so far less days taken, floored at zero.',
        expression: 'max(earned_rtt_days - rtt_days_taken, 0)',
        in_headers: 'max(RTT days earned - Pris RTT, 0)',
        unit: 'days',
        total: '2666.89',
        rows_populated: 2280,
        number_format: null,
      },
      {
        id: 'rtt_amount',
        label: 'Rebuilt RTT accrual',
        description: '',
        expression: 'unused_rtt_days * daily_rate',
        in_headers: 'Unused RTT days * Daily Salary',
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
    formula_findings: [],
    formula_columns_audited: 5,
    notes: [],
    duration_ms: 23,
    complete: true,
    ties: true,
    related_checks: [],
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
    gaps: [],
    needs_person: [],
    next_steps: [],
    untraced_numbers: [],
    cost: { ai_calls: 0, total_tokens: 0, total_usd: '0', duration_ms: 1200, calls: [] },
    not_yet_run: [],
  };
}

/**
 * The section as a reader first meets it: the comparison line, working shut.
 */
function renderClosed(recalculation: EntryRecalculationData | null) {
  renderWithProviders(<EntryRecalculation review={review(recalculation)} index={6} />);
}

/**
 * The section with its working open, which is where nearly everything in it
 * lives. Opened here rather than in each test: the disclosure is one control
 * and asserting on it once (below) says more than twenty clicks would.
 */
function render(recalculation: EntryRecalculationData | null) {
  renderClosed(recalculation);
  const toggle = screen.queryByRole('button', { name: /see details/i });
  if (toggle) fireEvent.click(toggle);
}

/**
 * The panel the working lives in.
 *
 * Scoped queries matter more than they used to: the comparison line above
 * carries the recomputed total, the booked amount and the variance as well, so
 * an unscoped `getByText` on any of the three now finds two of them. That is
 * the design — the line is the finding and the panel is the evidence for it —
 * and a test that cannot say which copy it means is testing neither.
 */
function working(): HTMLElement {
  return screen.getByRole('region', { name: /calculation accuracy/i });
}

const DIAGNOSIS = {
  row: 9,
  sheet: 'GPAY',
  fault: {
    input_id: 'daily_rate',
    label: 'Daily Salary (RTT Rate)',
    cell: 'W9',
    column: 'W',
    value: '100000',
    expected: '311.74',
    unit: 'currency_per_day',
  },
  where: 'GPAY sheet, row 9, column W (daily salary).',
  problem: 'The daily salary is 100,000. It should be about 311.74.',
  impact:
    "This employee's amount becomes 59,631.51 instead of 12,556.50. " +
    'That is 47,075.01 extra - the full difference in the total.',
  next_step: 'Ask the preparer for the right daily salary and fix cell W9.',
  steps: [
    { label: 'Days earned', correct: '10 ÷ 12 × 8 = 6.67', actual: '6.67', differs: false },
    {
      label: 'Value',
      correct: '5.67 × 311.74 = 1,766.53',
      actual: '5.67 × 100,000 = 566,666.67',
      differs: true,
    },
  ],
  stated: '12556.50',
  recomputed: '59631.51',
  difference: '47075.01',
};

const WALKTHROUGH = {
  total: 'Total = Holiday amount (CP) + 1/12 of the value of unused RTT days',
  stated_label: 'Employee total',
  footnote: 'Only for FTE and Non-FTE employees. Does not include employer charges.',
  steps: [
    {
      id: 'days_earned',
      line: 'Days earned = yearly RTT days ÷ 12 × months worked.',
      label: 'Days earned',
    },
    { id: 'value', line: 'Value = days left × daily salary.', label: 'Value' },
  ],
};

function blank(row: number): RecalcCitation {
  return {
    row,
    sheet: 'GPAY',
    kind: 'input_missing',
    recomputed: null,
    stated: null,
    stated_cell: '',
    difference: null,
    difference_pct: null,
    why: 'No CP provision on this row, so the record could not be rebuilt.',
    inputs: [],
    missing: [],
  };
}

/**
 * The four sections the panel leads with. They answer four questions in order: how big the
 * difference is, where it is, how the amount is meant to be worked out, and what that
 * looks like on the record that broke.
 */
describe('the calculation details', () => {
  function diagnosed() {
    render(
      paper({
        status: 'partial',
        ties: false,
        within_tolerance: true,
        difference: '47075.00',
        difference_pct: 0.1687,
        rows_recomputed: 2271,
        rows_total: 2273,
        rows_incomplete: 2,
        walkthrough: WALKTHROUGH,
        row_diagnosis: DIAGNOSIS,
        citations: [
          blank(232),
          blank(1650),
          {
            row: 9,
            sheet: 'GPAY',
            kind: 'stated_differs',
            recomputed: '59631.51',
            stated: '12556.50',
            stated_cell: 'AH9',
            difference: '47075.01',
            difference_pct: 374.9,
            why: 'The approved formula gives 47,075.01 more than this row states.',
            inputs: [],
            missing: [],
          },
        ],
        related_checks: [
          {
            check_id: 'rtt_provision_values_the_balance',
            label: 'Does the RTT provision the workbook states equal the balance at the rate?',
            short: 'RTT provision',
            summary: '2,272 of 2,273 rows agree',
            citation_count: 1,
            citations: [
              {
                row: 9,
                sheet: '',
                kind: 'stated_differs',
                recomputed: '900000',
                stated: '2805.56',
                stated_cell: 'T9',
                difference: '897194.44',
                difference_pct: null,
                why: 'The RTT provision does not equal the balance at the daily rate.',
                inputs: [],
                missing: [],
              },
            ],
          },
        ],
      }),
    );
  }

  it('names the blank records rather than only counting them', () => {
    diagnosed();

    const section = working();
    expect(within(section).getByText('2,271 / 2,273')).toBeInTheDocument();
    expect(within(section).getByText(/2 rows are blank \(rows 232 and 1650\)/)).toBeInTheDocument();
  });

  /**
   * The tolerance is the business's number, not this component's: it arrives on the work
   * paper's own basis and is printed as it arrived. Narrowing it in the entry type's YAML
   * has to reach the screen without a line changing here.
   */
  it('prints the tolerance the review was actually run under', () => {
    render(
      paper({
        within_tolerance: true,
        difference: '12.00',
        difference_pct: 0.00004,
        basis: basis({ tolerance_pct: '0.01', tolerance_amount: '2790.58' }),
      }),
    );

    expect(screen.getByText(/\(0\.01%\)/)).toBeInTheDocument();
    expect(within(working()).getByText(/within the 0\.01% limit/)).toBeInTheDocument();
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

    const section = working();
    expect(within(section).getByText('12.00')).toBeInTheDocument();
    expect(within(section).getByText(/within the 0\.1% limit/)).toBeInTheDocument();
    expect(within(section).queryByText(/beyond the/i)).not.toBeInTheDocument();
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

    const section = working();
    // Neutral: a gap in the evidence, never rendered as a difference of nothing.
    expect(within(section).getAllByText(/nothing to compare/i).length).toBeGreaterThan(0);
    expect(within(section).queryByText(/limit/)).not.toBeInTheDocument();
    expect(screen.getByText('Unproven')).toBeInTheDocument();
  });

  it('renders nothing extra for the plain-language walkthrough when none is declared', () => {
    render(paper());

    expect(screen.queryByText(/the formula used, explained step by step/i)).not.toBeInTheDocument();
  });

  it('says nothing about sign-off once the basis is approved', () => {
    render(paper());

    expect(screen.queryByText(/signed off/i)).not.toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/*  The comparison line                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The line a reader meets before opening anything. It has to carry the whole
 * finding on its own: the two figures, the variance between them, whether that
 * variance is inside the tolerance the business agreed, and how the amount was
 * arrived at. A reader who stops here has still read the section.
 */
describe('the comparison line', () => {
  it('states both figures, the variance and the tolerance it was judged against', () => {
    renderClosed(
      paper({
        status: 'partial',
        ties: false,
        within_tolerance: true,
        booked: { ...paper().booked, total: '28672441.24' },
        difference: '150.00',
        difference_pct: 0.0005,
      }),
    );

    const line = screen.getByRole('table', {
      name: /the recomputed total against the booked amount/i,
    });
    expect(within(line).getByText('28,672,591.24')).toBeInTheDocument();
    expect(within(line).getByText('28,672,441.24')).toBeInTheDocument();
    expect(within(line).getByText('150.00')).toBeInTheDocument();
    expect(within(line).getByText('Yes')).toBeInTheDocument();
    // Never the bare answer: "Yes" means nothing without what it was measured
    // against, and that figure is the first thing a reviewer challenges.
    expect(within(line).getByText('(0.1%)')).toBeInTheDocument();
  });

  it('says there was nothing to compare rather than printing a variance of nothing', () => {
    renderClosed(
      paper({
        status: 'unable_to_validate',
        ties: false,
        within_tolerance: null,
        difference: null,
        difference_pct: null,
        booked: { ...paper().booked, total: null },
      }),
    );

    const line = screen.getByRole('table', {
      name: /the recomputed total against the booked amount/i,
    });
    expect(within(line).getAllByText(/nothing to compare/i)).toHaveLength(2);
    expect(within(line).queryByText('0.00')).not.toBeInTheDocument();
  });

  it('states the method as the business words it, where the business has worded it', () => {
    renderClosed(paper({ basis: basis({ explained: explained() }) }));

    const line = screen.getByRole('table', {
      name: /the recomputed total against the booked amount/i,
    });
    expect(within(line).getByText(/one month of unused rtt/i)).toBeInTheDocument();
  });

  it('falls back to the formula for an entry type nobody has worded yet', () => {
    renderClosed(paper());

    const line = screen.getByRole('table', {
      name: /the recomputed total against the booked amount/i,
    });
    expect(
      within(line).getByText('Total Provision CP + Rebuilt RTT accrual / 12'),
    ).toBeInTheDocument();
  });

  /**
   * The working ran to several screens of tables between the parameters above
   * and the cost below. Shut, it is one line; open, it is everything it ever
   * was — so the one thing worth asserting is that nothing in it is mounted
   * until a reader asks for it.
   */
  it('holds the working back until a reader asks for it', () => {
    renderClosed(paper());

    expect(screen.queryByRole('region', { name: /calculation accuracy/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/rebuilt to the cent/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/what was rebuilt, and under which rules/i)).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /see details/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the working, and shuts it again from either control', () => {
    renderClosed(paper());

    fireEvent.click(screen.getByRole('button', { name: /see details/i }));
    expect(working()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide details/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: /calculation accuracy/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /see details/i }));
    fireEvent.click(screen.getByRole('button', { name: /hide details/i }));
    expect(screen.queryByRole('region', { name: /calculation accuracy/i })).not.toBeInTheDocument();
  });

  it('names the panel it opens, so the control and the panel are tied together', () => {
    renderClosed(paper());

    const toggle = screen.getByRole('button', { name: /see details/i });
    const controls = toggle.getAttribute('aria-controls');
    expect(controls).toBeTruthy();

    fireEvent.click(toggle);
    expect(working()).toHaveAttribute('id', controls);
  });
});
