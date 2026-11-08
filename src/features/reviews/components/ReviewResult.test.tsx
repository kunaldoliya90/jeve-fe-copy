import { describe, expect, it } from 'vitest';

import { renderWithProviders, screen, within } from '@/testing/test-utils';

import type { AreaView, CheckView, EntryRecalculation, EvidenceView, ReviewDetail } from '../types';
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
    recalculation: null,
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
    samples: [],
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
function rebuild(overrides: Partial<EntryRecalculation> = {}): EntryRecalculation {
  return {
    walkthrough: null,
    row_diagnosis: null,
    basis: {
      table: 'calculation',
      sheet: 'GPAY',
      header_row: 8,
      first_row: 9,
      last_row: 2467,
      record_key: 'employee_ref',
      stated_column: 'AH',
      stated_header: 'TOTAL ACCRUAL',
      formula: 'fte_amount + non_fte_amount',
      formula_expanded: 'FTE Vacation Accrual + Non-FTE Vacation Accrual',
      formula_in_headers: 'FTE Vacation Accrual + Non-FTE Vacation Accrual',
      sign: '',
      currency: 'EUR',
      rounding: '2 decimal places, half up',
      day_count: '',
      tolerance_pct: '0.1',
      tolerance_amount: '27905.81',
      row_tolerance: '0.01',
      worked_example: '',
      explained: null,
      provisional_basis: false,
    },
    status: 'pass',
    explanation: 'Rebuilt from 2,273 of 2,273 records.',
    recomputed_total: '27905812.64',
    booked: {
      method: 'posting_debits',
      total: '27905812.64',
      description: 'the debit side of the posted entry',
      table: 'je_posting',
      sheet: 'Batch JE',
      lines: 422,
      accounts: ['720008'],
    },
    difference: '0.00',
    difference_pct: 0,
    within_tolerance: true,
    rows_total: 2273,
    rows_recomputed: 2273,
    rows_incomplete: 0,
    rows_agreeing: 2273,
    row_impact: '0',
    inputs: [],
    components: [],
    corroborations: [],
    citations: [],
    citation_count: 0,
    formula_findings: [],
    formula_columns_audited: 5,
    notes: [],
    duration_ms: 24,
    complete: true,
    ties: true,
    related_checks: [],
    ...overrides,
  };
}

describe('ReviewResult', () => {
  it('shows the score and the compliance it reached', () => {
    renderWithProviders(<ReviewResult review={review()} />);

    expect(screen.getByText('62.5')).toBeInTheDocument();
    expect(screen.getByText('Medium Compliance')).toBeInTheDocument();
  });

  /**
   * The server bands a review by the risk it carries and the report states the
   * same fact as the compliance it shows. Both readings of a 30 are true and
   * the words are opposites, so the report must never print one of them.
   */
  it('words every band as compliance, never as the risk the server called it', () => {
    renderWithProviders(<ReviewResult review={review({ score: 30, band: 'High risk' })} />);

    expect(screen.queryByText(/risk/i)).toBeNull();
    expect(screen.getByText('Low Compliance')).toBeInTheDocument();
    expect(
      screen.getByText('Compliance score: 30 out of 100. This is Low compliance.'),
    ).toBeInTheDocument();
  });

  it('says plainly when nothing has been scored', () => {
    renderWithProviders(<ReviewResult review={review({ score: null, band: null })} />);

    expect(screen.getByText('No compliance score')).toBeInTheDocument();
    expect(screen.getByText(/This is not a zero/)).toBeInTheDocument();
  });

  it('keeps a summary whose figures traced to nothing, and collects them nowhere', () => {
    // The guardrail that matters most: the sentence survives, and the figure
    // is still marked where it is quoted — see the executive summary below.
    // Deleting it would leave prose reading as though it were verified.
    renderWithProviders(
      <ReviewResult
        review={review({
          summary: 'The accrual understates the liability by 918273.45.',
          untraced_numbers: ['918273.45'],
        })}
      />,
    );

    expect(
      screen.getByText('The accrual understates the liability by 918273.45.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /trace to nothing/ })).toBeNull();
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
});

describe('the numbered spine', () => {
  it('numbers the cost breakdown directly after the parameters', () => {
    renderWithProviders(<ReviewResult review={review({ areas: [area()] })} />);

    expect(screen.getByRole('region', { name: '3 Key tested parameters' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /^4 What this review cost/ })).toBeInTheDocument();
  });

  it('numbers the cost 5 on a report carrying a register and parameters', () => {
    renderWithProviders(
      <ReviewResult review={review({ evidence: [evidence()], areas: [area()] })} />,
    );

    expect(screen.getByRole('region', { name: /^5 What this review cost/ })).toBeInTheDocument();
  });

  /**
   * The entry recalculation reads first and the cost sits directly after it: a
   * reader wants the rebuilt amount in view before being told what establishing
   * it cost.
   */
  it('numbers the entry recalculation ahead of the cost', () => {
    renderWithProviders(
      <ReviewResult review={review({ areas: [area()], recalculation: rebuild() })} />,
    );

    expect(
      screen.getByRole('region', { name: /^4 The posted amount, rebuilt from its inputs/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /^5 What this review cost/ })).toBeInTheDocument();
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
    ['an evidence register only', review({ evidence: [evidence()] })],
    ['a rebuilt entry only', review({ recalculation: rebuild() })],
    ['all of them', review({ evidence: [evidence()], recalculation: rebuild() })],
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

    // Three of the four sentences report a problem and are listed under the
    // heading; the one that does not follows it as prose, where the engine
    // put it.
    expect(within(panel()).getByText('What needs attention:')).toBeInTheDocument();
    expect(within(panel()).getAllByRole('listitem')).toHaveLength(3);
    expect(
      within(panel()).getByText('No personal data was flagged outside where it belongs.'),
    ).toBeInTheDocument();
  });

  it('opens on the score, worded the same way for every review', () => {
    renderWithProviders(<ReviewResult review={review({ summary: SUMMARY })} />);

    expect(
      within(panel()).getByText('Compliance score: 62.5 out of 100. This is Medium compliance.'),
    ).toBeInTheDocument();
  });

  it('says so plainly when there is no score to open on', () => {
    renderWithProviders(
      <ReviewResult review={review({ score: null, band: null, summary: SUMMARY })} />,
    );

    expect(within(panel()).getByText(/No compliance score was produced/)).toBeInTheDocument();
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
  });

  it('carries what the uploader stated without presenting it as a finding', () => {
    renderWithProviders(<ReviewResult review={review({ document_number: '100122-7' })} />);

    expect(screen.getByText('100122-7')).toBeInTheDocument();
  });

  it('claims no entry type when nothing in the catalogue matched', () => {
    renderWithProviders(
      <ReviewResult review={review({ je_type: 'unknown', je_type_name: '', process: '' })} />,
    );

    expect(screen.getByText('Not recognised')).toBeInTheDocument();
  });

  /**
   * The compliance the score reached, read off the same thresholds the dial is
   * read against. It is the one fact in this strip that is a conclusion, so it
   * is also the one set large — and it must agree with the dial below it.
   */
  it('bands the strip on the score, not on the rating the uploader stated', () => {
    renderWithProviders(<ReviewResult review={review({ score: 30, risk_rating: 'low' })} />);

    const strip = screen.getByRole('region', { name: /select journal entry/i });
    expect(within(strip).getByText('Compliance')).toBeInTheDocument();
    expect(within(strip).getByText('Low')).toBeInTheDocument();
  });

  it('says the entry is not scored rather than printing an all-clear', () => {
    renderWithProviders(<ReviewResult review={review({ score: null, band: null })} />);

    const strip = screen.getByRole('region', { name: /select journal entry/i });
    expect(within(strip).getByText('Not scored')).toBeInTheDocument();
  });

  /**
   * The workbook sits among the facts rather than in the heading row: it is the
   * evidence every one of them was read out of, and a reviewer challenging one
   * reaches for it immediately.
   */
  it('puts the workbook beside the facts that were read out of it', () => {
    renderWithProviders(<ReviewResult review={review()} />);

    const strip = screen.getByRole('region', { name: /select journal entry/i });
    const link = within(strip).getByRole('link', { name: /open supporting document/i });
    expect(link).toHaveAttribute('target', '_blank');
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

    const card = screen.getByRole('article', { name: /Employee Population/ });
    expect(within(card).getByText('99.9')).toBeInTheDocument();
    expect(within(card).getByText('15% weight')).toBeInTheDocument();
    expect(within(card).getByText('Fail')).toBeInTheDocument();
  });

  it('keeps the card to this entry, not to how the parameter is scored', () => {
    renderWithProviders(
      <ReviewResult review={review({ areas: [area({ method: 'exception_rate' })] })} />,
    );

    const card = screen.getByRole('article', { name: /Accrual Re-performance/ });
    expect(within(card).queryByText(/Scored by the share of rows/)).toBeNull();
  });

  it('counts the parameters by outcome and shows the compliance score', () => {
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
    expect(within(section).getByText(/Compliance score/)).toBeInTheDocument();

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

  /**
   * The weighted score, written out so a reviewer asked to defend a 55 can add
   * it up. Runs of parameters sharing a score and a weight are grouped: six
   * terms of which four are identical is not a formula a reader can hold.
   */
  it('shows the arithmetic behind the weighted score', () => {
    renderWithProviders(
      <ReviewResult
        review={review({
          score: 55,
          areas: [
            area({ area: 'evidence_completeness', weight: 30, score: 50, status: 'partial' }),
            area({ area: 'calculation_accuracy', weight: 30, score: 0, status: 'fail' }),
            area({ area: 'evidence_appropriateness', weight: 10, score: 100 }),
            area({ area: 'period', weight: 10, score: 100 }),
            area({ area: 'pii', weight: 10, score: 100 }),
            area({ area: 'trend', weight: 10, score: 100 }),
          ],
        })}
      />,
    );

    const section = screen.getByRole('region', { name: /Key tested parameters/ });
    expect(within(section).getByText(/how the score is worked out/i)).toHaveTextContent(
      'How the score is worked out: Evidence Completeness 50 × 30% + ' +
        'Calculation Accuracy 0 × 30% + four other checks 100 × 10% each = 15 + 0 + 40 = 55',
    );
  });

  /**
   * The two cases where the line would argue with the figure above it. A line
   * of arithmetic that does not add up costs this report more than its absence
   * does, and the cards are the full account either way.
   */
  it('prints no working where the weights do not make a whole', () => {
    renderWithProviders(
      <ReviewResult review={review({ score: 100, areas: [area({ weight: 25, score: 100 })] })} />,
    );

    expect(screen.queryByText(/how the score is worked out/i)).not.toBeInTheDocument();
  });

  it('prints no working where the terms do not come to the score that was set', () => {
    renderWithProviders(
      <ReviewResult review={review({ score: 62.5, areas: [area({ weight: 100, score: 100 })] })} />,
    );

    expect(screen.queryByText(/how the score is worked out/i)).not.toBeInTheDocument();
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

  it('is section 4, after the parameters it backs', () => {
    // The score is the number read aloud in a meeting, so it comes first. The
    // parameters a reviewer scores against follow it, and the register that
    // backs those parameters with evidence comes after them in turn.
    renderWithProviders(
      <ReviewResult review={review({ evidence: [evidence()], areas: [area()] })} />,
    );

    const score = screen.getByRole('region', { name: '2 Evidence-led compliance' });
    const parameters = screen.getByRole('region', { name: '3 Key tested parameters' });
    const register = screen.getByRole('region', {
      name: '4 Detailed evidence and validation register',
    });

    expect(score.compareDocumentPosition(parameters)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(parameters.compareDocumentPosition(register)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('leaves the score at 2 on a review that expected no evidence', () => {
    // The score is claimed first regardless, so a review with nothing to
    // register still prints an unbroken spine rather than a hole at 2.
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
