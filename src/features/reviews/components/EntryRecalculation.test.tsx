import { describe, expect, it } from 'vitest';

import { renderWithProviders, screen, within } from '@/testing/test-utils';

import type {
  EntryRecalculation as EntryRecalculationData,
  FormulaFinding,
  RecalcCitation,
  RecalcExplained,
  RelatedRecalcCheck,
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
    explained: null,
    provisional_basis: false,
    ...overrides,
  };
}

function explained(overrides: Partial<RecalcExplained> = {}): RecalcExplained {
  return {
    intro: 'Here is the calculation in plain language, using employee 1073 as the example.',
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

function relatedCheck(overrides: Partial<RelatedRecalcCheck> = {}): RelatedRecalcCheck {
  return {
    check_id: 'cp_provision_rebuilds',
    label: "Does the stated CP provision equal the prior plus the current period's provision?",
    summary:
      'Prior plus current period CP provision against the stated total: 2,269 of 2,273 rows agree',
    citations: [
      {
        row: 9,
        sheet: '',
        kind: 'stated_differs',
        recomputed: '12409.29',
        stated: '112409.29',
        stated_cell: 'M9',
        difference: '-100000.00',
        difference_pct: null,
        why: 'Expected 12409.29, the workbook states 112409.29.',
        inputs: [],
        missing: [],
      },
    ],
    citation_count: 2,
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

  /**
   * `ties` means within tolerance, not exactly zero - an entry can reconcile
   * within the business's tolerance band while still carrying a real, nonzero
   * difference. The headline figure must show that difference rather than a
   * hardcoded zero, or a reviewer reading "to the cent" would be misled about
   * how close the rebuild actually came.
   */
  it('shows the real difference when the entry ties within tolerance rather than exactly', () => {
    render(paper({ difference: '150.00', difference_pct: 0.0005 }));

    const section = screen.getByRole('region', { name: /rebuilt from its inputs/i });
    expect(within(section).getByText(/rebuilt to the cent/i)).toBeInTheDocument();
    expect(within(section).getByText('150.00')).toBeInTheDocument();
  });

  /**
   * A check on the same table a reviewer would otherwise only find under Calculation
   * Accuracy, surfaced here too - but never folded into the entry-level figures above.
   */
  it('shows another check on the same records without touching the entry-level comparison', () => {
    render(paper({ related_checks: [relatedCheck()] }));

    const section = screen.getByRole('region', { name: /rebuilt from its inputs/i });
    // The entry still rebuilt to the cent - a different check's finding does not change it.
    expect(within(section).getByText(/rebuilt to the cent/i)).toBeInTheDocument();
    expect(within(section).getAllByText('28,672,591.24')).toHaveLength(2);

    expect(
      within(section).getAllByText(/does the stated cp provision equal the prior/i).length,
    ).toBeGreaterThan(0);
    const table = within(section).getByRole('table', { name: /cp provision/i });
    expect(within(table).getByText('M9')).toBeInTheDocument();
    expect(within(table).getByText('112,409.29')).toBeInTheDocument();
    expect(within(table).getByText('12,409.29')).toBeInTheDocument();
  });

  it('renders nothing extra when no other check on this table found anything', () => {
    render(paper());

    expect(screen.queryByText(/other calculation-accuracy findings/i)).not.toBeInTheDocument();
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

  it('renders nothing extra for the plain-language walkthrough when none is declared', () => {
    render(paper());

    expect(
      screen.queryByText(/here is the calculation in plain language/i),
    ).not.toBeInTheDocument();
  });

  it('walks through the formula in plain language, with the fixed example and its caveats', () => {
    render(paper({ basis: basis({ explained: explained() }) }));

    expect(screen.getByText(/here is the calculation in plain language/i)).toBeInTheDocument();
    expect(screen.getByText('RTT days earned so far')).toBeInTheDocument();
    expect(screen.getByText('10 / 12 x 8 = 6.67 days')).toBeInTheDocument();
    expect(screen.getByText(/one month of unused rtt/i)).toBeInTheDocument();
    expect(screen.getByText(/excludes employer social charges/i)).toBeInTheDocument();
  });

  it('shows where the records did not reconcile before what the rebuild came from', () => {
    render(paper({ citations: [citation()], citation_count: 1 }));

    const section = screen.getByRole('region', { name: /rebuilt from its inputs/i });
    const headings = within(section)
      .getAllByRole('heading')
      .map((heading) => heading.textContent || '');
    const citationsIndex = headings.findIndex((text) => /did not reconcile/i.test(text));
    const inputsIndex = headings.findIndex((text) => /what it was rebuilt from/i.test(text));
    expect(citationsIndex).toBeGreaterThanOrEqual(0);
    expect(inputsIndex).toBeGreaterThan(citationsIndex);
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

/**
 * The faults in the workbook's own arithmetic.
 *
 * The case that matters most is the first one: the figures agree, so every other section of
 * the report is green, and the column is still not the approved arithmetic. If this block
 * does not make that visible the finding might as well not exist.
 */
describe('the formulas the workbook applies', () => {
  function finding(overrides: Partial<FormulaFinding> = {}): FormulaFinding {
    return {
      fault: 'different_inputs',
      sheet: 'GPAY',
      column: 'AH',
      header: 'TOTAL ACCRUAL',
      cell: 'AH9',
      formula: '=AF9',
      in_headers: '=[FTE Vacation Accrual]',
      expected: 'FTE Vacation Accrual + Non-FTE Vacation Accrual',
      rows_affected: 2273,
      rows_checked: 2273,
      why: 'This column is not computed from the columns the business says it should be: it does not read Non-FTE Vacation Accrual, which the approved arithmetic does. A tie here is not evidence that the arithmetic is right.',
      ...overrides,
    };
  }

  it('shows a column built from the wrong inputs even though the entry ties', () => {
    render(paper({ formula_findings: [finding()] }));

    const table = screen.getByRole('table', { name: /faults in the arithmetic/i });
    expect(within(table).getByText('Wrong inputs')).toBeInTheDocument();
    expect(within(table).getByText('TOTAL ACCRUAL')).toBeInTheDocument();
    expect(within(table).getByText('GPAY!AH9')).toBeInTheDocument();
    expect(within(table).getByText('=AF9')).toBeInTheDocument();
    expect(within(table).getByText('=[FTE Vacation Accrual]')).toBeInTheDocument();
    expect(
      within(table).getByText('FTE Vacation Accrual + Non-FTE Vacation Accrual'),
    ).toBeInTheDocument();
    expect(within(table).getByText(/a tie here is not evidence/i)).toBeInTheDocument();
    // The entry itself still reconciles, and both statements stand together.
    expect(screen.getByText(/rebuilt to the cent/i)).toBeInTheDocument();
  });

  it('says a column is stated rather than calculated, without calling it an error', () => {
    render(
      paper({
        formula_findings: [
          finding({
            fault: 'not_calculated',
            formula: '',
            in_headers: '',
            expected: '',
            why: 'Every value in this column is typed or pasted: 2,273 of them.',
          }),
        ],
      }),
    );

    const table = screen.getByRole('table', { name: /faults in the arithmetic/i });
    expect(within(table).getByText('Not calculated in this file')).toBeInTheDocument();
    expect(within(table).getByText('No formula at all')).toBeInTheDocument();
    expect(within(table).getByText('Nothing declared')).toBeInTheDocument();
  });

  it('names the odd cell when one row of a column disagrees with the rest', () => {
    render(
      paper({
        formula_findings: [
          finding({
            fault: 'inconsistent',
            cell: 'AH1740',
            formula: '=AF1740+AG1740+1',
            expected: '=AF1739+AG1739',
            rows_affected: 1,
            why: 'This cell does not carry the same formula as the rest of its column.',
          }),
        ],
      }),
    );

    const table = screen.getByRole('table', { name: /faults in the arithmetic/i });
    expect(within(table).getByText('Inconsistent down the column')).toBeInTheDocument();
    expect(within(table).getByText('GPAY!AH1740')).toBeInTheDocument();
    expect(within(table).getByText('=AF1740+AG1740+1')).toBeInTheDocument();
  });

  it('says so in one line when the formulas are all as they should be', () => {
    render(paper({ formula_findings: [] }));

    expect(screen.getByText(/each calculated, consistent down the column/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('table', { name: /faults in the arithmetic/i }),
    ).not.toBeInTheDocument();
  });

  /**
   * "Nobody could look" and "nothing is wrong" must never render alike. A binary workbook
   * carries values without the formulas behind them.
   */
  it('renders an unreadable format as neutral, not as a clean bill of health', () => {
    render(
      paper({
        formula_findings: [
          finding({
            fault: 'unreadable',
            column: '',
            cell: '',
            formula: '',
            in_headers: '',
            expected: '',
            rows_affected: 0,
            why: 'This workbook format stores values without the formulas behind them.',
          }),
        ],
        formula_columns_audited: 2,
      }),
    );

    expect(screen.getByText(/stores values without the formulas behind them/i)).toBeInTheDocument();
    expect(screen.queryByText(/each calculated, consistent/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('table', { name: /faults in the arithmetic/i }),
    ).not.toBeInTheDocument();
  });

  it('shows nothing at all when no column could be audited', () => {
    render(paper({ formula_columns_audited: 0, formula_findings: [] }));

    expect(screen.queryByText(/the formulas the workbook itself applies/i)).not.toBeInTheDocument();
  });

  it('says how many columns were examined, so a reader knows the check ran', () => {
    render(paper({ formula_findings: [finding()] }));

    expect(screen.getByText(/5 columns examined/i)).toBeInTheDocument();
  });
});
