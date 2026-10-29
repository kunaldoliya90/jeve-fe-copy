/**
 * The recalculation section, tested on the property that makes it worth having.
 *
 * Every fixture here spells its classes, its headers and its tab the way a
 * French payroll workbook does, and none of those words appears anywhere in the
 * component. So an assertion that `Non-FTE` is a column heading, or that
 * `Provision Totale` is a row title, is an assertion that the section read them
 * off the file — a test written against labels this codebase owns would pass
 * just as happily against a component with the vocabulary hardcoded in it.
 *
 * The rest is about the three places where a confident wrong answer would be
 * worse than no answer: a typed control total reported as calculated, a
 * negative written without its brackets, and a status this section re-derived
 * instead of carrying.
 */

import { describe, expect, it } from 'vitest';

import { renderWithProviders, screen, within } from '@/testing/test-utils';

import type {
  ComponentSplit,
  ExceptionTest,
  ReviewDetail,
  RowWalkthrough,
  SplitSummary,
  SplitTieOut,
} from '../types';
import { Recalculation } from './Recalculation';

const ACCOUNTING = String.raw`_(* #,##0.00_);_(* \(#,##0.00\);_(* "-"??_);_(@_)`;

function component(overrides: Partial<ComponentSplit> = {}): ComponentSplit {
  return {
    header: 'Provision Totale',
    column: 'P',
    meaning: null,
    number_format: ACCOUNTING,
    amounts: { fte: '42903762.85', 'non-fte': '78205.94' },
    total: '42981968.79',
    rows_populated: 2271,
    shares: { fte: 0.9981, 'non-fte': 0.0019 },
    ...overrides,
  };
}

function paper(overrides: Partial<SplitSummary> = {}): SplitSummary {
  return {
    basis: {
      table: 'calculation',
      sheet: 'GPAY',
      header_row: 8,
      first_row: 9,
      last_row: 2467,
      rows_read: 2273,
      rows_total: 2459,
      classification_header: 'FTE/Non-FTE',
      classification_column: 'AE',
      classification_meaning: 'fte_classification',
      tolerance: '0.005',
      formulas_available: true,
    },
    categories: [
      { key: 'fte', label: 'FTE', row_count: 2193 },
      { key: 'non-fte', label: 'Non-FTE', row_count: 78 },
    ],
    components: [component()],
    tie_outs: [],
    rules: [],
    walkthroughs: [],
    tests: [],
    notes: [],
    ...overrides,
  };
}

function review(summary: SplitSummary | null): ReviewDetail {
  return {
    review_id: 'rev_20261023T000000_abcdef01',
    status: 'completed',
    file_name: '305800.xlsx',
    created_at: '2026-10-23T00:00:00Z',
    reused_from: null,
    document_number: '305800',
    risk_rating: 'low',
    je_type: 'vacation-accrual-france',
    je_type_name: 'France vacation accrual',
    je_type_variant: 'cp_rtt_france',
    je_type_confidence: 0.92,
    je_type_corroborated: true,
    je_type_source: 'shape',
    process: 'Record to Report',
    sub_process: 'Payroll',
    period: '2026 P07',
    step: '20',
    progress_pct: 100,
    score: 88,
    band: 'High compliance',
    provisional: false,
    headline: '88 out of 100, Low risk',
    summary: '',
    workbook: null,
    areas: [],
    observations: [],
    evidence: [],
    split_summary: summary,
    gaps: [],
    needs_person: [],
    next_steps: [],
    untraced_numbers: [],
    cost: { ai_calls: 0, total_tokens: 0, total_usd: '0', duration_ms: 0, calls: [] },
    not_yet_run: [],
  } as ReviewDetail;
}

function render(overrides: Partial<SplitSummary> = {}) {
  return renderWithProviders(<Recalculation review={review(paper(overrides))} index={4} />);
}

/* -------------------------------------------------------------------------- */
/*  Nothing is labelled by this codebase                                       */
/* -------------------------------------------------------------------------- */

describe('the vocabulary', () => {
  it('names the section after the column the split was taken on', () => {
    render();

    expect(
      screen.getByRole('region', { name: /^4 Independent recalculation by FTE\/Non-FTE/ }),
    ).toBeInTheDocument();
  });

  it('takes its column headings from the classes the file holds', () => {
    render();

    // `Non-FTE` contains `FTE`, so the two have to be matched on the whole
    // heading. The same trap the classification check has to work around.
    const headings = screen
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent.replace(/\s+/g, ' ').trim());

    expect(headings).toEqual(['Column', 'FTE 2,193 rows', 'Non-FTE 78 rows', 'Total']);
  });

  it('takes its row titles from the headers the preparer wrote', () => {
    render();

    expect(screen.getByRole('rowheader', { name: /Provision Totale/ })).toBeInTheDocument();
  });

  it('renders nothing at all when the workbook bound no table to re-add', () => {
    renderWithProviders(<Recalculation review={review(null)} index={4} />);

    expect(screen.queryByRole('region')).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/*  The figures, formatted the way the file formats them                       */
/* -------------------------------------------------------------------------- */

describe('the figures', () => {
  it('writes an amount to the decimal places its own column asks for', () => {
    render();

    expect(screen.getByText('42,903,762.85')).toBeInTheDocument();
  });

  it('writes a negative in brackets where the column is an accounting column', () => {
    // Dropping the brackets turns a credit into a debit, on a report somebody
    // signs. The format string is the only thing that says which it is.
    render({ components: [component({ amounts: { fte: '-1250.50' }, total: '-1250.50' })] });

    // Twice over: once in the class that holds it and once in the row's total.
    expect(screen.getAllByText('(1,250.50)')).toHaveLength(2);
  });

  it('shows each class as a share of the component beside its amount', () => {
    render();

    expect(screen.getByText('99.8%')).toBeInTheDocument();
    expect(screen.getByText('0.2%')).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/*  The control totals                                                         */
/* -------------------------------------------------------------------------- */

function tieOut(overrides: Partial<SplitTieOut> = {}): SplitTieOut {
  return {
    label: 'TOTAL ACCRUAL',
    cell: 'AH6',
    stated: '27905812.639999952',
    recomputed: '27905812.64',
    variance: '-4.8E-8',
    within_tolerance: true,
    stated_is_formula: false,
    ...overrides,
  };
}

describe('the control totals', () => {
  it('shows a variance below tolerance rather than rounding it away to zero', () => {
    // `0.00` beside a badge saying the total agrees reads as a variance of
    // nothing. It is not nothing; it is below the figure the business agreed on.
    render({ tie_outs: [tieOut()] });

    expect(screen.getByText('-4.80e-8')).toBeInTheDocument();
    expect(screen.getByText('Agrees')).toBeInTheDocument();
  });

  it('says a control total was typed by hand when it carries no formula', () => {
    render({ tie_outs: [tieOut()] });

    expect(screen.getByText('typed by hand')).toBeInTheDocument();
  });

  it('never reports an unreadable total as a typed one', () => {
    // Different findings. "Nobody can tell" is what a binary workbook gives you;
    // "somebody typed this" is a finding about the preparer's control.
    render({ tie_outs: [tieOut({ stated_is_formula: null })] });

    expect(screen.getByText('not readable')).toBeInTheDocument();
    expect(screen.queryByText('typed by hand')).toBeNull();
  });

  it('marks a total that does not agree', () => {
    render({ tie_outs: [tieOut({ within_tolerance: false, variance: '-612.40' })] });

    expect(screen.getByText('Differs')).toBeInTheDocument();
    expect(screen.getByText('-612.40')).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/*  The rules                                                                  */
/* -------------------------------------------------------------------------- */

describe('how each column is calculated', () => {
  const rule = {
    column: 'AO',
    row: 9,
    header: 'FTE Vacation Accrual',
    formula: '=((AN9/12)+M9)',
    in_headers: '=(([RTT Accrual Amount]/12)+[Total Provision CP])',
    reads: ['RTT Accrual Amount', 'Total Provision CP'],
  };

  it('shows the formula in the preparer’s own column names, and as written', () => {
    render({ rules: [rule] });

    expect(screen.getByText(rule.in_headers)).toBeInTheDocument();
    expect(screen.getByText(rule.formula)).toBeInTheDocument();
  });

  it('says which row the formula was read off', () => {
    // A working whose first row was typed over has its rule further down, and a
    // reviewer opening the file needs the row that actually holds it.
    render({ rules: [{ ...rule, row: 61 }] });

    expect(screen.getByText('read from AO61')).toBeInTheDocument();
  });

  it('reports a working of typed values as a finding rather than an empty block', () => {
    render({ rules: [] });

    expect(screen.getByText(/No column of this working calculates itself/)).toBeVisible();
  });
});

/* -------------------------------------------------------------------------- */
/*  The traced row                                                             */
/* -------------------------------------------------------------------------- */

function walkthrough(overrides: Partial<RowWalkthrough> = {}): RowWalkthrough {
  return {
    row: 9,
    why: 'The first row of the working, where the rules above were read from',
    category: 'FTE',
    context: [['Salary Currency', 'EUR']],
    steps: [
      {
        header: 'Total Provision CP',
        column: 'M',
        cell: 'M9',
        value: '7014.92',
        number_format: '#,##0.00',
        formula: null,
        in_headers: null,
      },
    ],
    ...overrides,
  };
}

describe('the traced row', () => {
  it('traces a row by number, with the columns that describe it', () => {
    render({ walkthroughs: [walkthrough()] });

    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Total Provision CP' })).toBeInTheDocument();
    expect(screen.getByText('7,014.92')).toBeInTheDocument();
  });

  it('says a cell holds a typed value rather than leaving the reason blank', () => {
    // A blank there is indistinguishable from a formula the report failed to
    // read, and the two mean opposite things about the evidence.
    render({ walkthroughs: [walkthrough()] });

    expect(screen.getByText('A typed value, not a calculation')).toBeInTheDocument();
  });

  /** A clean exemplar and an exception, which is the pairing the builder picks. */
  const TWO_ROWS = [
    walkthrough(),
    walkthrough({
      row: 1842,
      why: 'An exception found by accrual_reperforms',
      steps: [
        {
          header: 'Total Provision CP',
          column: 'M',
          cell: 'M1842',
          value: '-918.33',
          number_format: ACCOUNTING,
          formula: null,
          in_headers: null,
        },
      ],
    }),
  ];

  it('lets a reviewer switch to another traced row', async () => {
    const { user } = render({ walkthroughs: TWO_ROWS });
    const exception = screen.getByRole('button', { name: 'Row 1842' });

    expect(exception).toHaveAttribute('aria-pressed', 'false');
    await user.click(exception);

    expect(exception).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Row 9' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps every traced row in the document, so all of them print', () => {
    // The picker hides the unselected rows for screen only. Printing the one
    // that happened to be selected would drop the exception rows, which are the
    // half of the evidence somebody actually has to look at.
    render({ walkthroughs: TWO_ROWS });

    expect(screen.getByText('7,014.92')).toBeInTheDocument();
    expect(screen.getByText('(918.33)')).toBeInTheDocument();
    expect(screen.getByText(/An exception found by accrual_reperforms/)).toBeInTheDocument();
  });

  it('offers no row picker when there is only one row traced', () => {
    render({ walkthroughs: [walkthrough()] });

    expect(screen.queryByRole('group', { name: 'Which row to trace' })).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/*  The tests                                                                  */
/* -------------------------------------------------------------------------- */

function test_(overrides: Partial<ExceptionTest> = {}): ExceptionTest {
  return {
    check_id: 'accrual_reperforms',
    question: 'Does an independent recalculation agree with the working, row by row?',
    area: 'accrual_reperformance',
    tool: 'recalc_accrual',
    rows_total: 2273,
    rows_checked: 2273,
    flagged: 0,
    severity: 'high',
    status: 'pass',
    financial_impact: null,
    first_example: null,
    conclusion: '2,273 of 2,273 rows agree',
    ...overrides,
  };
}

describe('what each test found', () => {
  it('shows the status the engine reached, not one derived from the flagged count', () => {
    // Three bad rows in two thousand is a partial, not a fail. Re-deriving the
    // status here is how this table comes to contradict the parameters above it.
    render({ tests: [test_({ flagged: 3, status: 'partial' })] });

    const row = screen.getByRole('row', { name: /Does an independent recalculation/ });
    expect(within(row).getByText('Partial')).toBeInTheDocument();
    expect(within(row).getByText('3')).toBeInTheDocument();
  });

  it('grades severity in words', () => {
    render({ tests: [test_({ severity: 'info' })] });

    expect(screen.getByText('Information')).toBeInTheDocument();
  });

  it('says when a test could not reach every row of the block', () => {
    render({ tests: [test_({ rows_checked: 1842 })] });

    expect(screen.getByText('of 2,273')).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/*  The basis                                                                  */
/* -------------------------------------------------------------------------- */

describe('what it was read from', () => {
  it('names the tab, the block and the column the split was taken on', () => {
    render();

    expect(screen.getByText('GPAY')).toBeInTheDocument();
    expect(screen.getByText('9-2467')).toBeInTheDocument();
    expect(screen.getByText('AE · FTE/Non-FTE')).toBeInTheDocument();
  });

  it('accounts for the rows of the block it did not sum', () => {
    render();

    expect(screen.getByText(/186 further rows in the block carry no class/)).toBeVisible();
  });

  it('says when the split column was chosen by shape rather than by the map', () => {
    render({
      basis: { ...paper().basis, classification_meaning: null },
    });

    expect(screen.getByText(/no column here carried a meaning the map recognises/)).toBeVisible();
  });

  it('renders what the recalculation could not do', () => {
    render({ notes: ['This workbook format carries no formulas.'] });

    expect(screen.getByText('This workbook format carries no formulas.')).toBeVisible();
  });
});
