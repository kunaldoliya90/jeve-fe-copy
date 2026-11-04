/**
 * The facts line under a check, and the discrepancy table it grows when a
 * sample carries more than a cell reference.
 *
 * The property worth pinning: a check whose samples are bare cell references
 * (an account mapping, a posting date) keeps the old inline list, and a check
 * whose samples carry an expected and an actual amount gets a table instead —
 * the two must never render both or neither.
 */

import { describe, expect, it } from 'vitest';

import { renderWithProviders, screen } from '@/testing/test-utils';

import type { CheckView, FigureSampleView } from '../types';
import { CheckFacts } from './CheckFacts';

function sample(overrides: Partial<FigureSampleView> = {}): FigureSampleView {
  return {
    row: null,
    cell: null,
    expected: null,
    actual: null,
    difference: null,
    ...overrides,
  };
}

function check(overrides: Partial<CheckView> = {}): CheckView {
  return {
    check_id: 'accrual_composition_reperforms',
    area: 'accrual_reperformance',
    question: 'Does the stated total equal the CP provision plus a twelfth of the RTT accrual?',
    status: 'fail',
    decided_by: 'figures',
    needs_review: false,
    review_reasons: [],
    conclusion: '2,279 of 2,280 rows agree, 1 differs by 487,590.71 in total',
    exception_count: 1,
    financial_impact: '487590.71',
    cells: [],
    samples: [],
    ...overrides,
  };
}

describe('CheckFacts', () => {
  it('renders the worked rows as a table when a sample carries an expected amount', () => {
    renderWithProviders(
      <CheckFacts
        check={check({
          cells: ['GPAY!AH9'],
          samples: [
            sample({
              row: 9,
              cell: 'GPAY!AH9',
              expected: '500147.21',
              actual: '12556.5',
              difference: '487590.71',
            }),
          ],
        })}
      />,
    );

    const table = screen.getByRole('table', { name: /rows behind this check/i });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Row' })).toBeInTheDocument();
    expect(screen.getByText('GPAY!AH9')).toBeInTheDocument();
    expect(screen.getByText('500,147.21')).toBeInTheDocument();
    expect(screen.getByText('12,556.50')).toBeInTheDocument();
    expect(screen.getByText('487,590.71')).toBeInTheDocument();

    // The table supersedes the bare cell list: the same cell must not also
    // appear a second time in the plain-text facts line.
    expect(screen.getAllByText('GPAY!AH9')).toHaveLength(1);
  });

  it('omits the Row column when nothing in the check carries a row number', () => {
    renderWithProviders(
      <CheckFacts
        check={check({
          samples: [sample({ cell: 'GPAY!B2', expected: '1', actual: '2', difference: '-1' })],
        })}
      />,
    );

    expect(screen.queryByRole('columnheader', { name: 'Row' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Cell' })).toBeInTheDocument();
  });

  it('falls back to the plain cell list when no sample carries an amount', () => {
    renderWithProviders(
      <CheckFacts
        check={check({
          exception_count: 2,
          financial_impact: null,
          cells: ['GPAY!AH9', 'GPAY!AH11'],
          samples: [sample({ cell: 'GPAY!AH9' }), sample({ cell: 'GPAY!AH11' })],
        })}
      />,
    );

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('GPAY!AH9 · GPAY!AH11')).toBeInTheDocument();
  });

  it('renders nothing extra for a check with no samples at all', () => {
    renderWithProviders(<CheckFacts check={check({ exception_count: 0, cells: [] })} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
