import { describe, expect, it } from 'vitest';

import { parseSummary, splitSentences, type SummaryPoint } from './summary';

/**
 * A summary of the shape the engine actually produces: five findings in one
 * paragraph, schema names mid-sentence, a defect run written as counts, and
 * the same citation marker on three of the lines.
 */
const SUMMARY = [
  'This France vacation accrual review is high risk with a provisional total score of 37.5',
  'because required evidence is incomplete and multiple checks could not be validated.',
  'The evidence register shows only 4 of 6 expected evidence layers are present, with approval',
  'and vacation_provision_file missing (F-01).',
  'Negative accruals are not cleared: 3 employee row(s) carry a negative total_accrual,',
  '1638.20 in total (F-01).',
  'Manual update support failed with value_error: 882; typed_over_formula: 5; external_link: 1,',
  'and methodology support could not be matched because the methodology tab has no period stamp',
  'for period 08 and the stated basis differs from the approved basis (F-01).',
  'No personal data was flagged outside where it belongs.',
].join(' ');

/** The point's body as one string, so a test can assert on the whole line. */
function flatten(point: SummaryPoint): string {
  return point.body
    .map((segment) =>
      segment.kind === 'term' && segment.count !== null
        ? `${segment.text}: ${segment.count}`
        : segment.text,
    )
    .join('');
}

describe('splitSentences', () => {
  it('breaks a paragraph into one line per finding', () => {
    expect(splitSentences(SUMMARY)).toHaveLength(5);
  });

  it('never breaks a decimal in two', () => {
    // The failure this guard exists for: a score of 37.5 arriving as "37." and
    // "5", which is a different number and a nonsense sentence.
    const lines = splitSentences('The accrual is short by 1638.20 in total. Nothing else moved.');

    expect(lines).toEqual(['The accrual is short by 1638.20 in total.', 'Nothing else moved.']);
  });

  it('takes a line break as a break, and strips a bullet from the front of one', () => {
    expect(splitSentences('- Evidence is missing\n- Accruals are negative')).toEqual([
      'Evidence is missing',
      'Accruals are negative',
    ]);
  });

  it('has nothing to say about an empty summary', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('   \n  ')).toEqual([]);
  });
});

describe('parseSummary', () => {
  it('returns one point per finding, in the order they were written', () => {
    const points = parseSummary(SUMMARY);

    expect(points).toHaveLength(5);
    expect(flatten(points[0]!)).toMatch(/^This France vacation accrual review is high risk/);
    expect(flatten(points[4]!)).toBe('No personal data was flagged outside where it belongs.');
  });

  it('lifts a citation out of the prose and keeps it against its own line', () => {
    const points = parseSummary(SUMMARY);

    expect(points[1]?.cites).toEqual(['F-01']);
    expect(flatten(points[1]!)).not.toContain('F-01');
    // The marker took its leading space with it rather than leaving a gap
    // before the full stop.
    expect(flatten(points[1]!)).toMatch(/missing\.$/);
  });

  it('does not cite the same reference twice on one line', () => {
    const points = parseSummary('Approval is missing (F-01) and unapproved (F-01).');

    expect(points[0]?.cites).toEqual(['F-01']);
  });

  it('reads a schema name as words and keeps the name it came from', () => {
    const points = parseSummary(SUMMARY);
    const term = points[1]?.body.find((segment) => segment.kind === 'term');

    expect(term).toEqual({
      kind: 'term',
      text: 'vacation provision file',
      raw: 'vacation_provision_file',
      count: null,
      countUntraced: false,
    });
  });

  it('words a defect id the way the defect table words it, and keeps its count', () => {
    const points = parseSummary(SUMMARY);
    const terms = points[3]?.body.filter((segment) => segment.kind === 'term');

    expect(terms?.map((term) => `${term.text}: ${term.count ?? ''}`)).toEqual([
      'cells holding #VALUE!: 882',
      'numbers typed over a formula: 5',
      'links to another workbook: 1',
    ]);
  });

  it('leaves an ordinary word alone, however technical the sentence', () => {
    const points = parseSummary('The methodology tab has no period stamp for period 08.');

    expect(points[0]?.body.every((segment) => segment.kind === 'text')).toBe(true);
  });

  it('leads with the opening clause where the sentence has a short plain one', () => {
    const points = parseSummary(SUMMARY);

    expect(points[2]?.lead).toBe('Negative accruals are not cleared');
    expect(flatten(points[2]!)).toMatch(/^3 employee row\(s\)/);
  });

  it('never mistakes a defect count for an opening clause', () => {
    // "Manual update support failed with value_error: 882" has a colon in it,
    // and emphasising the half before it would be nonsense.
    const points = parseSummary(SUMMARY);

    expect(points[3]?.lead).toBeNull();
    expect(flatten(points[3]!)).toMatch(/^Manual update support failed with/);
  });

  it('marks the lines that report something going wrong', () => {
    const points = parseSummary(SUMMARY);

    expect(points.map((point) => point.tone)).toEqual([
      'attention', // "incomplete", "could not be validated"
      'attention', // "missing"
      'attention', // "not cleared"
      'attention', // "failed"
      'plain',
    ]);
  });

  it('never calls a line good — the quiet ones are only unmarked', () => {
    const points = parseSummary('Every row reconciles to the posting tab.');

    expect(points[0]?.tone).toBe('plain');
  });

  it('marks a figure that traces to nothing, in the sentence that quotes it', () => {
    const points = parseSummary('The accrual understates the liability by 918273.45.', [
      '918273.45',
    ]);

    expect(points[0]?.body).toEqual([
      { kind: 'text', text: 'The accrual understates the liability by ' },
      { kind: 'figure', text: '918273.45' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('marks an untraced figure written as a defect count', () => {
    const points = parseSummary('Manual update support failed with value_error: 882.', ['882']);
    const term = points[0]?.body.find((segment) => segment.kind === 'term');

    expect(term?.countUntraced).toBe(true);
  });

  it('does not mark a figure that is only part of a longer one', () => {
    // "20" traces to nothing; "1638.20" traces to the posting tab. Marking the
    // tail of the second would tell a reader to distrust a figure that stands.
    const points = parseSummary('3 rows carry a negative accrual, 1638.20 in total.', ['20']);

    expect(points[0]?.body.some((segment) => segment.kind === 'figure')).toBe(false);
  });

  it('marks a figure that ends a sentence, where the full stop follows it', () => {
    const points = parseSummary('The gap is 1638.20.', ['1638.20']);

    expect(points[0]?.body).toContainEqual({ kind: 'figure', text: '1638.20' });
  });

  it('capitalises an identifier that opens a sentence', () => {
    const points = parseSummary('total_accrual is negative on 3 rows.');

    expect(points[0]?.body[0]).toMatchObject({ kind: 'term', text: 'Total accrual' });
  });

  it('has nothing to show for a summary nobody wrote', () => {
    expect(parseSummary('')).toEqual([]);
  });
});
