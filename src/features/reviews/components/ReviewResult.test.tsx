import { describe, expect, it } from 'vitest';

import { renderWithProviders, screen, within } from '@/testing/test-utils';

import type { AreaView, CheckView, EvidenceView, ReviewDetail, SplitSummary } from '../types';
import { ReviewResult } from './ReviewResult';

function review(overrides: Partial<ReviewDetail> = {}): ReviewDetail {
  return {
    review_id: 'rev_20261021T000000_abcdef01',
    status: 'needs_review',
    file_name: '236264.xlsx',
    created_at: '2026-10-21T00:00:00Z',
    reused_from: null,
    document_number: null,
    risk_rating: null,
    je_type: 'vacation-accrual-france',
    je_type_name: 'France vacation accrual',
    je_type_variant: 'cp_rtt_france',
    je_type_confidence: 0.9,
    je_type_corroborated: true,
    process: 'Record to Report',
    sub_process: 'Payroll',
    period: 'FY26P07',
    step: '20',
    progress_pct: 100,
    score: 62.5,
    band: 'Medium risk',
    provisional: true,
    headline: '62.5 out of 100, Medium risk (provisional).',
    summary: '18 checks ran on this entry.',
    workbook: null,
    areas: [],
    observations: [],
    evidence: [],
    split_summary: null,
    needs_person: [],
    next_steps: [],
    untraced_numbers: [],
    cost: { ai_calls: 0, total_tokens: 0, total_usd: '0', duration_ms: 1200, calls: [] },
    not_yet_run: [],
    ...overrides,
  };
}

function area(overrides: Partial<AreaView> = {}): AreaView {
  return {
    area: 'accrual_reperformance',
    weight: 25,
    method: 'weakest_check',
    score: 100,
    status: 'pass',
    reason: '2,280 of 2,280 rows agree',
    checks: [],
    ...overrides,
  };
}

function check(overrides: Partial<CheckView> = {}): CheckView {
  return {
    check_id: 'personal_data_located',
    area: 'observation',
    question: 'Where does personal data sit?',
    status: 'pass',
    decided_by: 'figures',
    needs_review: false,
    review_reasons: [],
    conclusion: 'No unmasked personal data reached the posting tab',
    exception_count: 0,
    financial_impact: null,
    cells: [],
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

/**
 * The smallest work paper that still renders: one class, one column, one total.
 *
 * Spelled the way a French workbook spells it and not the way any module does,
 * so a label leaking into the component would show up here rather than passing.
 */
function workPaper(overrides: Partial<SplitSummary> = {}): SplitSummary {
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
    categories: [{ key: 'fte', label: 'FTE', row_count: 2193 }],
    components: [
      {
        header: 'Total Provision CP',
        column: 'M',
        meaning: 'cp_provision',
        number_format: '#,##0.00',
        amounts: { fte: '27765784.53' },
        total: '27765784.53',
        rows_populated: 2193,
        shares: { fte: 1 },
      },
    ],
    tie_outs: [],
    rules: [],
    walkthroughs: [],
    tests: [],
    notes: [],
    ...overrides,
  };
}

describe('ReviewResult', () => {
  it('shows the score, the band and that it is provisional', () => {
    renderWithProviders(<ReviewResult review={review()} />);

    expect(screen.getByText('62.5')).toBeInTheDocument();
    expect(screen.getAllByText('Medium risk').length).toBeGreaterThan(0);
    expect(screen.getByText(/Provisional/)).toBeInTheDocument();
  });

  it('says plainly when nothing has been scored', () => {
    renderWithProviders(<ReviewResult review={review({ score: null, band: null })} />);

    expect(screen.getByText(/No compliance score/)).toBeInTheDocument();
    expect(screen.getByText(/This is not a zero/)).toBeInTheDocument();
  });

  it('lists what to do next', () => {
    renderWithProviders(
      <ReviewResult
        review={review({ next_steps: ['Obtain an unredacted employee reference.'] })}
      />,
    );

    expect(screen.getByText('Obtain an unredacted employee reference.')).toBeInTheDocument();
  });

  it('names a number in the summary that traces to nothing, and keeps the summary', () => {
    // The guardrail that matters most: the sentence survives, the figure is
    // flagged. Deleting it would leave prose reading as though it were verified.
    renderWithProviders(
      <ReviewResult
        review={review({
          summary: 'The accrual understates the liability by 918273.45.',
          untraced_numbers: ['918273.45'],
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: /trace to nothing/ })).toBeInTheDocument();
    expect(screen.getByText(/Do not quote them/)).toBeInTheDocument();
    expect(
      screen.getByText('The accrual understates the liability by 918273.45.'),
    ).toBeInTheDocument();
  });

  it('renders no caution panel when every number traced', () => {
    renderWithProviders(<ReviewResult review={review()} />);

    expect(screen.queryByRole('heading', { name: /trace to nothing/ })).not.toBeInTheDocument();
  });

  it('names what did not run on this review', () => {
    renderWithProviders(
      <ReviewResult
        review={review({ not_yet_run: ['No model was available, so nothing was judged.'] })}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'What did not run on this review' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/nothing below has passed/i)).toBeInTheDocument();
  });

  it('renders the checks waiting on a person with the reasons they are waiting', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          needs_person: [
            check({
              check_id: 'population_complete',
              area: 'population',
              question: 'Is every in-scope employee present?',
              status: 'unable_to_validate',
              needs_review: true,
              review_reasons: ['incomplete_row_coverage'],
              conclusion: '1 distinct employee reference over 2,273 rows',
            }),
          ],
        })}
      />,
    );

    expect(screen.getByText('Is every in-scope employee present?')).toBeInTheDocument();
    // Respaced for the reader, with the id the logs use kept on hover. A
    // reason code set in monospace is how a reviewer ends up asking an
    // engineer what their own report means.
    const reason = screen.getByText('Incomplete row coverage');
    expect(reason).toHaveAttribute('title', 'Reported by the review as incomplete_row_coverage');
  });
});

describe('what to do next', () => {
  const STEPS = [
    'Obtain an unredacted employee reference and re-run the review.',
    'Record the approver and the approval date against the vacation_provision_file.',
  ];

  function panel() {
    return screen.getByRole('region', { name: 'What to do next' });
  }

  it('numbers the steps and keeps them in the order the review wrote them', () => {
    // Often sequential — obtain the file, then re-run — so sorting them would
    // break an instruction in half.
    renderWithProviders(<ReviewResult review={review({ next_steps: STEPS })} />);

    const items = within(panel()).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('1');
    expect(items[0]).toHaveTextContent('Obtain an unredacted employee reference');
    expect(panel()).toHaveTextContent('2 steps');
  });

  it('qualifies the list ahead of it, not under it', () => {
    renderWithProviders(<ReviewResult review={review({ next_steps: STEPS })} />);

    const framing = within(panel()).getByText(/not a decision/);
    const first = within(panel()).getAllByRole('listitem')[0];
    expect(framing.compareDocumentPosition(first!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('words an identifier in a step the way the rest of the report words it', () => {
    renderWithProviders(<ReviewResult review={review({ next_steps: STEPS })} />);

    expect(within(panel()).getByText('vacation provision file')).toBeInTheDocument();
  });

  it('copies as a numbered list, headed by the workbook it belongs to', async () => {
    // This gets pasted somewhere with no idea which review it came from.
    const { user } = renderWithProviders(<ReviewResult review={review({ next_steps: STEPS })} />);

    await user.click(within(panel()).getByRole('button', { name: /Copy/ }));

    await expect(navigator.clipboard.readText()).resolves.toBe(
      ['What to do next: 236264.xlsx', `1. ${STEPS[0]!}`, `2. ${STEPS[1]!}`].join('\n'),
    );
  });

  it('shows no panel when the review asked for nothing', () => {
    renderWithProviders(<ReviewResult review={review()} />);

    expect(screen.queryByRole('region', { name: 'What to do next' })).toBeNull();
  });
});

describe('the worklist', () => {
  function panel() {
    return screen.getByRole('region', { name: /Needs a person/ });
  }

  const waiting = check({
    check_id: 'population_complete',
    area: 'population',
    question: 'Is every in-scope employee present?',
    status: 'unable_to_validate',
    needs_review: true,
    review_reasons: ['incomplete_row_coverage'],
    conclusion: 'The employee reference column is redacted, so population_complete is unproven.',
  });

  it('counts what is waiting, and says that none of it has passed or failed', () => {
    renderWithProviders(<ReviewResult review={review({ needs_person: [waiting] })} />);

    expect(panel()).toHaveTextContent('1 check waiting');
    expect(within(panel()).getByText(/has passed or failed/)).toBeInTheDocument();
  });

  it('carries what the system did establish, worded as the rest of the report words it', () => {
    renderWithProviders(<ReviewResult review={review({ needs_person: [waiting] })} />);

    // Not left at "unproven" with no sentence: a reviewer starting from that
    // has to redo work the review has already done.
    expect(within(panel()).getByText(/The employee reference column is redacted/)).toBeVisible();
    expect(within(panel()).getByText('population complete')).toBeInTheDocument();
  });

  it('links each item back to the parameter it was scored under', () => {
    renderWithProviders(
      <ReviewResult
        review={review({ needs_person: [waiting], areas: [area({ area: 'population' })] })}
      />,
    );

    expect(
      within(panel()).getByRole('link', { name: /See it under Employee population/ }),
    ).toHaveAttribute('href', '#parameter-population');
  });

  it('offers no link where the check was never scored under a parameter', () => {
    renderWithProviders(<ReviewResult review={review({ needs_person: [waiting] })} />);

    expect(within(panel()).queryByRole('link')).toBeNull();
    expect(within(panel()).getByText('Employee population')).toBeInTheDocument();
  });

  it('numbers the cost breakdown above the worklist', () => {
    // The cost is on every report and the worklist is not, so the cost is
    // numbered first: a number that moves report to report cannot be quoted on.
    renderWithProviders(
      <ReviewResult review={review({ areas: [area()], needs_person: [waiting] })} />,
    );

    expect(screen.getByRole('region', { name: '3 Key tested parameters' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /^4 What this review cost/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '5 Needs a person' })).toBeInTheDocument();
  });

  it('numbers the cost 5 on a report carrying a register and parameters', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          evidence: [evidence()],
          areas: [area()],
          needs_person: [waiting],
          split_summary: workPaper(),
        })}
      />,
    );

    expect(screen.getByRole('region', { name: /^5 What this review cost/ })).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /^6 Independent recalculation/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '7 Needs a person' })).toBeInTheDocument();
  });

  /**
   * The numbers are how one person says "look at four" to another, so a report
   * whose sections run 3, 5, 6 reads as one with a section missing.
   *
   * Asserted as contiguity rather than against a fixed list, because every
   * section below the third is conditional: the combinations are the point, and
   * a test naming specific numbers has to be rewritten every time a section is
   * added — which is exactly when this invariant is most likely to break.
   */
  it.each([
    ['nothing conditional present', review()],
    ['a worklist only', review({ needs_person: [waiting] })],
    ['an evidence register only', review({ evidence: [evidence()] })],
    ['a recalculation only', review({ split_summary: workPaper() })],
    [
      'all of them',
      review({
        needs_person: [waiting],
        evidence: [evidence()],
        split_summary: workPaper(),
      }),
    ],
  ])('numbers the sections 1 upwards with no gaps, given %s', (_case, detail) => {
    renderWithProviders(<ReviewResult review={detail} />);

    const numbered = screen
      .getAllByRole('region')
      // `Section` names itself with `aria-labelledby`, not `aria-label`, so the
      // number has to be read off the heading it points at. Reading the wrong
      // attribute returns null for every section, and the assertion below then
      // compares an empty list to an empty list and passes on any report at all.
      .map((region) =>
        region.ownerDocument.getElementById(region.getAttribute('aria-labelledby') ?? ''),
      )
      .flatMap((heading) => {
        const match = /^(\d+)\s/.exec(heading?.textContent.trim() ?? '');
        return match?.[1] ? [Number(match[1])] : [];
      })
      .sort((left, right) => left - right);

    expect(numbered.length).toBeGreaterThan(0);
    expect(numbered).toEqual(numbered.map((_value, position) => position + 1));
  });
});

describe('the executive summary', () => {
  /** The shape the engine actually writes: five findings in one paragraph. */
  const SUMMARY = [
    'The evidence register shows only 4 of 6 expected evidence layers are present,',
    'with approval and vacation_provision_file missing (F-01).',
    'Negative accruals are not cleared: 3 employee row(s) carry a negative total_accrual,',
    '1638.20 in total (F-01).',
    'Manual update support failed with value_error: 882; typed_over_formula: 5; external_link: 1.',
    'No personal data was flagged outside where it belongs.',
  ].join(' ');

  function panel() {
    return screen.getByRole('region', { name: /Evidence-led compliance/ });
  }

  it('lays the paragraph out as one line per finding', () => {
    renderWithProviders(<ReviewResult review={review({ summary: SUMMARY })} />);

    expect(within(panel()).getAllByRole('listitem')).toHaveLength(4);
  });

  it('reads a schema name as words, and keeps the name it came from', () => {
    renderWithProviders(<ReviewResult review={review({ summary: SUMMARY })} />);

    const term = within(panel()).getByText('vacation provision file');
    expect(term).toHaveAttribute('title', 'Written in the report as vacation_provision_file');
  });

  it('words a defect id the way the rest of the report words it', () => {
    renderWithProviders(<ReviewResult review={review({ summary: SUMMARY })} />);

    expect(within(panel()).getByText('cells holding #VALUE!')).toBeInTheDocument();
    expect(within(panel()).getByText('882')).toBeInTheDocument();
  });

  it('marks a figure that traces to nothing in the sentence that quotes it', () => {
    // The panel below says which figures not to quote. By the time a reader
    // reaches it they have already read the number, so it is marked in place.
    renderWithProviders(
      <ReviewResult
        review={review({
          summary: 'The accrual understates the liability by 918273.45.',
          untraced_numbers: ['918273.45'],
        })}
      />,
    );

    const figure = within(panel()).getByTitle(/Do not quote it/);
    expect(figure).toHaveTextContent('918273.45');
    expect(figure).toHaveTextContent(/traces to nothing/);
  });

  it('keeps the summary exactly as it was written, one disclosure away', () => {
    renderWithProviders(<ReviewResult review={review({ summary: SUMMARY })} />);

    expect(within(panel()).getByText('The summary as it was written')).toBeInTheDocument();
    expect(within(panel()).getByText(SUMMARY)).toBeInTheDocument();
  });

  it('points at the sections each claim can be checked against', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          summary: SUMMARY,
          areas: [area({ status: 'fail' })],
          evidence: [evidence({ status: 'missing' })],
          next_steps: ['Obtain the approval.'],
        })}
      />,
    );

    const trail = within(panel()).getByRole('navigation', { name: /checked/ });
    expect(within(trail).getByRole('link', { name: /1 parameter failed/ })).toHaveAttribute(
      'href',
      '#parameters',
    );
    expect(within(trail).getByRole('link', { name: /1 required layer missing/ })).toHaveAttribute(
      'href',
      '#evidence',
    );
    expect(within(trail).getByRole('link', { name: 'What to do next' })).toHaveAttribute(
      'href',
      '#next-steps',
    );
  });

  it('copies the headline and the summary as written, not as laid out', async () => {
    const { user } = renderWithProviders(<ReviewResult review={review({ summary: SUMMARY })} />);

    await user.click(within(panel()).getByRole('button', { name: /Copy/ }));

    await expect(navigator.clipboard.readText()).resolves.toBe(
      `62.5 out of 100, Medium risk (provisional).\n\n${SUMMARY}`,
    );
    expect(await within(panel()).findByText('Copied')).toBeInTheDocument();
  });

  it('shows a summary it cannot lay out exactly as it arrived', () => {
    renderWithProviders(<ReviewResult review={review({ summary: '' })} />);

    expect(within(panel()).getByText(/No summary was written/)).toBeInTheDocument();
  });
});

describe('the entry header', () => {
  it('names the entry type, process, sub-process and period the system established', () => {
    renderWithProviders(<ReviewResult review={review()} />);

    expect(screen.getByText('France vacation accrual')).toBeInTheDocument();
    expect(screen.getByText('Record to Report')).toBeInTheDocument();
    expect(screen.getByText('Payroll')).toBeInTheDocument();
    expect(screen.getByText('FY26P07')).toBeInTheDocument();
    expect(screen.getByText(/at 90% confidence/)).toBeInTheDocument();
  });

  it('carries what the uploader stated without presenting it as a finding', () => {
    renderWithProviders(
      <ReviewResult review={review({ document_number: '100122-7', risk_rating: 'high' })} />,
    );

    expect(screen.getByText('100122-7')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('says when the two readings of the type disagreed, and that the arithmetic stands', () => {
    renderWithProviders(<ReviewResult review={review({ je_type_corroborated: false })} />);

    expect(screen.getByText(/The two readings differed/)).toBeInTheDocument();
    expect(screen.getByText(/arithmetic is unaffected/)).toBeInTheDocument();
  });

  it('claims no entry type when nothing in the catalogue matched', () => {
    renderWithProviders(
      <ReviewResult review={review({ je_type: 'unknown', je_type_name: '', process: '' })} />,
    );

    expect(screen.getByText('Not recognised')).toBeInTheDocument();
    expect(screen.getByText(/no entry type.s checks were applied/)).toBeInTheDocument();
  });
});

describe('the tested parameters', () => {
  it('badges a parameter by its worst check, not by its score', () => {
    // The distinction the section exists for: an exception-rate area with a few
    // bad rows in tens of thousands scores high and still contains a failure.
    renderWithProviders(
      <ReviewResult
        review={review({
          areas: [area({ area: 'population', weight: 15, score: 99.9, status: 'fail' })],
        })}
      />,
    );

    const card = screen.getByRole('article', { name: /Employee population/ });
    expect(within(card).getByText('99.9')).toBeInTheDocument();
    expect(within(card).getByText('15% of the score')).toBeInTheDocument();
    expect(within(card).getByText('Fail')).toBeInTheDocument();
  });

  it('says how a parameter is scored, rather than naming the rule', () => {
    renderWithProviders(
      <ReviewResult review={review({ areas: [area({ method: 'exception_rate' })] })} />,
    );

    const card = screen.getByRole('article', { name: /Accrual re-performance/ });
    expect(
      within(card).getByText(/Scored by the share of rows that came out as exceptions/),
    ).toBeInTheDocument();
  });

  it('lists the checks that decided a parameter, with what each one found', () => {
    // The score is an aggregate, and an aggregate explains nothing. These rows
    // are what a reviewer re-performs from.
    renderWithProviders(
      <ReviewResult
        review={review({
          areas: [
            area({
              checks: [
                check({
                  check_id: 'negative_accrual_cleared',
                  question: 'Are negative accruals cleared?',
                  status: 'fail',
                  conclusion: '3 employee rows carry a negative total_accrual.',
                  exception_count: 3,
                  financial_impact: '1,638.20',
                  cells: ['Calc!H12', 'Calc!H88'],
                }),
              ],
            }),
          ],
        })}
      />,
    );

    const card = screen.getByRole('article', { name: /Accrual re-performance/ });
    expect(within(card).getByText('Are negative accruals cleared?')).toBeInTheDocument();
    expect(within(card).getByText('3 exceptions')).toBeInTheDocument();
    expect(within(card).getByText('Value affected 1,638.20')).toBeInTheDocument();
    expect(within(card).getByText('Calc!H12 · Calc!H88')).toBeInTheDocument();
    // The conclusion goes through the same respacing as the written summary,
    // so no reader meets `total_accrual` worded two ways on one page.
    expect(within(card).getByText('total accrual')).toBeInTheDocument();
  });

  it('says on the check itself that it is waiting on a person', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          areas: [
            area({
              checks: [check({ needs_review: true, review_reasons: ['incomplete_row_coverage'] })],
            }),
          ],
        })}
      />,
    );

    const card = screen.getByRole('article', { name: /Accrual re-performance/ });
    expect(within(card).getByText('Waiting on a person')).toBeInTheDocument();
  });

  it('names how each check was settled, so a judgement is never read as arithmetic', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          areas: [area({ checks: [check({ decided_by: 'judgement' })] })],
        })}
      />,
    );

    const card = screen.getByRole('article', { name: /Accrual re-performance/ });
    expect(within(card).getByText('Judged by a model')).toBeInTheDocument();
  });

  it('counts the parameters by outcome and shows the weighted score', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          areas: [
            area({ area: 'accrual_reperformance', status: 'pass' }),
            area({ area: 'je_reconciliation', status: 'pass' }),
            area({ area: 'period', status: 'fail' }),
          ],
        })}
      />,
    );

    const section = screen.getByRole('region', { name: /Key tested parameters/ });
    expect(within(section).getByText(/Weighted score/)).toBeInTheDocument();

    const tally = within(section).getByRole('group', { name: 'Parameter outcomes' });
    expect(within(tally).getByText('Pass').closest('div')).toHaveTextContent('2');
    expect(within(tally).getByText('Fail').closest('div')).toHaveTextContent('1');
  });

  it('keeps the unscored observations apart from the parameters that carry weight', () => {
    renderWithProviders(<ReviewResult review={review({ observations: [check()] })} />);

    const observations = screen.getByRole('region', { name: 'Also checked, never scored' });
    expect(within(observations).getByText(/carrying no weight/)).toBeInTheDocument();
    expect(within(observations).getByText('Where does personal data sit?')).toBeInTheDocument();
    expect(within(observations).getByText('Pass')).toBeInTheDocument();
  });

  it('withholds the checks the business has asked not to report, and only those', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          observations: [
            check({
              check_id: 'pii',
              question: 'Where does personal data appear, and is it expected on that tab?',
            }),
            check({
              check_id: 'formula_defects',
              question: 'Are numbers typed over formulas explained?',
            }),
            check({
              check_id: 'methodology_period',
              question: 'Does the methodology tab state the same period the entry posts in?',
            }),
            check({ check_id: 'trend', question: 'Is the movement in line with recent periods?' }),
          ],
        })}
      />,
    );

    expect(screen.queryByText(/Where does personal data appear/)).not.toBeInTheDocument();
    expect(screen.queryByText(/numbers typed over formulas/)).not.toBeInTheDocument();
    expect(screen.queryByText(/the same period the entry posts in/)).not.toBeInTheDocument();
    expect(screen.getByText('Is the movement in line with recent periods?')).toBeInTheDocument();
  });

  it('shows no observations panel when every observation is withheld', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          observations: [check({ question: 'Are numbers typed over formulas explained?' })],
        })}
      />,
    );

    expect(screen.queryByRole('region', { name: 'Also checked, never scored' })).toBeNull();
  });

  it('keeps unproven apart from fail', () => {
    renderWithProviders(
      <ReviewResult review={review({ areas: [area({ status: 'unable_to_validate' })] })} />,
    );

    const tally = screen.getByRole('group', { name: 'Parameter outcomes' });
    // Counted on its own line, never folded into the failures.
    expect(within(tally).getByText('Unproven').closest('div')).toHaveTextContent('1');
    expect(within(tally).getByText('Fail').closest('div')).toHaveTextContent('0');
  });
});

describe('the evidence register', () => {
  it('reports satisfied layers as well as missing ones', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          evidence: [
            evidence(),
            evidence({
              item: 'approval',
              expected: 'Approval for the leave accrual.',
              status: 'missing',
              location: null,
              remediation: 'Record the approver and the approval date.',
              note: 'No approval was found in the workbook.',
            }),
          ],
        })}
      />,
    );

    expect(screen.getByText('Employee master')).toBeInTheDocument();
    expect(screen.getByText('Satisfied by MSPeople.')).toBeInTheDocument();
    expect(screen.getByText('Record the approver and the approval date.')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('keeps baseline and recommended layers apart', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          evidence: [evidence(), evidence({ item: 'vacation_provision_file', required: false })],
        })}
      />,
    );

    expect(screen.getByText('Baseline')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('renders no register at all when nothing was expected', () => {
    renderWithProviders(<ReviewResult review={review()} />);

    expect(screen.queryByRole('region', { name: /evidence and validation register/ })).toBeNull();
  });

  it('is section 2, above the score it qualifies', () => {
    // Which layers arrived at all is the question asked first. A score read
    // before that is settled is a score read without knowing how much of the
    // file it was computed from.
    renderWithProviders(
      <ReviewResult review={review({ evidence: [evidence()], areas: [area()] })} />,
    );

    const register = screen.getByRole('region', {
      name: '2 Detailed evidence and validation register',
    });
    const score = screen.getByRole('region', { name: '3 Evidence-led compliance' });

    expect(register.compareDocumentPosition(score)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('hands 2 back to the score on a review that expected no evidence', () => {
    // The register is conditional, so the number it would have taken cannot be
    // left as a hole in the spine.
    renderWithProviders(<ReviewResult review={review({ areas: [area()] })} />);

    expect(screen.getByRole('region', { name: '2 Evidence-led compliance' })).toBeInTheDocument();
  });
});

describe('the cost breakdown', () => {
  it('charges each model call to the step that made it', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          cost: {
            ai_calls: 3,
            total_tokens: 3600,
            total_usd: '0.232',
            duration_ms: 76000,
            calls: [
              {
                call: 'AI-M',
                step: '13a',
                name: 'Reading the methodology',
                model: 'gpt-4o',
                input_tokens: 1000,
                cached_tokens: 256,
                output_tokens: 200,
                reasoning_tokens: 0,
                total_tokens: 1200,
                cost_usd: '0.012',
                latency_ms: 1850,
                schema_valid: true,
              },
              {
                call: 'AI-R',
                step: '13a',
                name: 'Reading the screenshots',
                model: 'gpt-4o',
                input_tokens: 1000,
                cached_tokens: 0,
                output_tokens: 200,
                reasoning_tokens: 0,
                total_tokens: 1200,
                cost_usd: '0.020',
                latency_ms: 2100,
                schema_valid: true,
              },
              {
                call: 'AI-3',
                step: '14',
                name: 'Judging the results',
                model: 'gpt-5.5',
                input_tokens: 1000,
                cached_tokens: 0,
                output_tokens: 200,
                reasoning_tokens: 120,
                total_tokens: 1200,
                cost_usd: '0.200',
                latency_ms: 9000,
                schema_valid: true,
              },
            ],
          },
        })}
      />,
    );

    const section = screen.getByRole('region', { name: /What this review cost/ });
    // Two calls on one step stay two rows: a reader has to see that 13a read
    // the methodology and the screenshots separately.
    const methodology = within(section).getByRole('row', { name: /Reading the methodology/ });
    expect(within(methodology).getByText('AI-M')).toBeInTheDocument();
    expect(within(methodology).getByText('AI-R')).toBeInTheDocument();
    expect(within(methodology).getByText('$0.0320')).toBeInTheDocument();

    expect(within(section).getByRole('row', { name: /Judging the results/ })).toHaveTextContent(
      '$0.20',
    );
    expect(within(section).getByText(/3 model calls/)).toBeInTheDocument();
  });

  it('says a deterministic run cost nothing, and why that is the design', () => {
    renderWithProviders(<ReviewResult review={review()} />);

    expect(screen.getByText(/No model was called/)).toBeInTheDocument();
    expect(screen.getByText(/point of the design, not a gap/)).toBeInTheDocument();
  });

  it('flags a call whose answer stopped early', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          cost: {
            ai_calls: 1,
            total_tokens: 1200,
            total_usd: '0.012',
            duration_ms: 1000,
            calls: [
              {
                call: 'AI-5',
                step: '18',
                name: 'Writing the report',
                model: 'gpt-5.5',
                input_tokens: 1000,
                cached_tokens: 0,
                output_tokens: 200,
                reasoning_tokens: 0,
                total_tokens: 1200,
                cost_usd: '0.012',
                latency_ms: 1000,
                schema_valid: false,
              },
            ],
          },
        })}
      />,
    );

    expect(screen.getByText('answer stopped early')).toBeInTheDocument();
  });
});
