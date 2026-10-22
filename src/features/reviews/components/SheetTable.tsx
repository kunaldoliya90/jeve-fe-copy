/**
 * Every tab the profiler measured.
 *
 * Shape only — row and column counts, how many tables were found, and the
 * labels the preparer wrote. No cell value appears here, and none crosses the
 * network to put it here.
 *
 * Hidden sheets are shown and marked rather than omitted: preparers hide
 * working data, and a tab nobody can see is exactly the one worth seeing.
 */

import { ArrowRight } from 'lucide-react';

import { Badge, Card } from '@/components/ui';

import type { SheetView } from '../types';
import { TableShell, Td, Th, Tr } from './TableShell';

export function SheetTable({ sheets }: { sheets: SheetView[] }) {
  if (sheets.length === 0) return null;

  return (
    <section aria-labelledby="sheets-heading" className="space-y-3 defer-paint">
      <h2 id="sheets-heading" className="text-sm font-semibold text-foreground">
        What is in the workbook
      </h2>

      <TableShell
        caption="Each sheet in the uploaded workbook, with its size and the columns found on it"
        minWidth="min-w-[40rem]"
      >
        <thead>
          <tr>
            <Th>Sheet</Th>
            <Th className="text-right">Rows</Th>
            <Th className="text-right">Columns</Th>
            <Th className="text-right">Tables</Th>
            <Th className="text-right">Formulas</Th>
            <Th>Columns found</Th>
          </tr>
        </thead>
        <tbody>
          {sheets.map((sheet) => (
            <Tr key={sheet.name}>
              <th scope="row" className="px-3 py-2.5 text-left font-medium text-foreground">
                {sheet.name}
                {sheet.hidden ? (
                  <Badge
                    tone="warning"
                    size="sm"
                    className="ml-2"
                    title="Preparers hide working data, so a hidden tab is worth a look"
                  >
                    hidden
                  </Badge>
                ) : null}
              </th>
              <Td className="text-right tabular-nums">{sheet.row_count.toLocaleString()}</Td>
              <Td className="text-right tabular-nums">{sheet.column_count}</Td>
              <Td className="text-right tabular-nums">{sheet.tables || '-'}</Td>
              <Td
                className="text-right tabular-nums"
                {...(sheet.formula_count === null
                  ? {
                      title:
                        'This format carries no formulas, which is not the same as having none',
                    }
                  : {})}
              >
                {sheet.formula_count === null ? 'n/a' : sheet.formula_count.toLocaleString()}
              </Td>
              <Td className="max-w-md">
                <span className="line-clamp-1 font-mono text-xs">
                  {sheet.headers.length > 0 ? sheet.headers.join(' · ') : '-'}
                </span>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>
    </section>
  );
}

export function LineagePanel({ lineage }: { lineage: string[] }) {
  if (lineage.length === 0) return null;

  return (
    <section aria-labelledby="lineage-heading" className="space-y-3 defer-paint">
      <h2 id="lineage-heading" className="text-sm font-semibold text-foreground">
        Which sheet feeds which
      </h2>

      <Card className="p-4">
        <ul className="space-y-1.5">
          {lineage.map((edge, index) => (
            <li
              key={edge}
              className="flex stagger items-center gap-2 font-mono text-xs text-muted-foreground"
              style={{ '--i': index } as React.CSSProperties}
            >
              <ArrowRight aria-hidden="true" className="size-3 shrink-0 text-subtle-foreground" />
              {edge}
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Read from the formulas themselves. A line that links back to its source is evidence; one
        typed in by hand is not.
      </p>
    </section>
  );
}
