/**
 * Every record of a recalculation, browsed rather than printed.
 *
 * The work paper beside this (`EntryRecalculation`) prints a worst-first sample capped at a
 * dozen rows, because a report has to fit a page. This is the different tool a reviewer reaches
 * for next: page through everything, filter to what changed, group by cost centre, and open
 * one row's own working without leaving the page. It is explicitly a screen tool rather than
 * part of the printed report — a server-paginated grid cannot print in full by its nature, and
 * the printed work paper already carries the capped sample that can.
 *
 * Grouped and flat are two different questions, not two views of the same table: grouped asks
 * "where is the money", flat asks "show me the records" — so switching between them resets
 * paging rather than trying to reconcile a cursor with a roll-up.
 */

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { Badge, Button, Select, Spinner } from '@/components/ui';
import { cn } from '@/utils/cn';

import { useRecalculationGroups, useRecalculationRows } from '../api/reviews.queries';
import { formatAmount, formatVariance } from '../lib/excelFormat';
import { DISCREPANCY_LABELS, type RecalcRow } from '../types';
import { TableShell, Td, Th, Tr } from './TableShell';

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All records' },
  { value: 'changed', label: 'Changed or flagged' },
  { value: 'agrees', label: 'Agrees' },
] as const;

/** A short, conventional list — the same one the server groups on. Not every workbook binds
 * every one of these; a dimension nothing was bound to simply groups as one empty bucket. */
const GROUP_OPTIONS = [
  { value: '', label: "Don't group" },
  { value: 'cost_center', label: 'Cost centre' },
  { value: 'fte_classification', label: 'Classification' },
  { value: 'company_code', label: 'Company code' },
  { value: 'staffing_type', label: 'Staffing type' },
] as const;

export function RecalcRowsExplorer({ reviewId }: { reviewId: string }) {
  const [status, setStatus] = useState<string>('changed');
  const [sort, setSort] = useState<string>('-difference');
  const [groupBy, setGroupBy] = useState<string>('');
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const page = cursors.length - 1;
  const cursor = cursors[page] ?? null;
  const filterStatus = status === 'all' ? undefined : status;

  /** A fresh filter or sort is a different question, with its own first page — reset paging
   * and any open trace right where the choice is made, rather than watching for it after. */
  function resetPaging(): void {
    setCursors([null]);
    setExpanded(null);
  }

  const rows = useRecalculationRows(groupBy ? undefined : reviewId, {
    status: filterStatus,
    sort,
    limit: PAGE_SIZE,
    cursor,
  });
  const groups = useRecalculationGroups(groupBy ? reviewId : undefined, groupBy, filterStatus);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Show">
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              resetPaging();
            }}
            className="w-44"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Group by">
          <Select
            value={groupBy}
            onChange={(event) => {
              setGroupBy(event.target.value);
              resetPaging();
            }}
            className="w-44"
          >
            {GROUP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        {!groupBy ? (
          <Field label="Order">
            <Select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                resetPaging();
              }}
              className="w-44"
            >
              <option value="-difference">Largest difference first</option>
              <option value="difference">Smallest difference first</option>
              <option value="row">Row order</option>
            </Select>
          </Field>
        ) : null}
      </div>

      {groupBy ? (
        <GroupedTable
          rows={groups.data}
          isPending={groups.isPending}
          isError={groups.isError}
          dimension={groupBy}
        />
      ) : (
        <FlatTable
          page={rows.data}
          isPending={rows.isPending}
          isError={rows.isError}
          expanded={expanded}
          onToggle={(index) => {
            setExpanded((current) => (current === index ? null : index));
          }}
        />
      )}

      {!groupBy ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {rows.data ? (
              <>
                <span className="font-semibold text-foreground tabular-nums">
                  {rows.data.total.toLocaleString()}
                </span>{' '}
                record{rows.data.total === 1 ? '' : 's'} match
              </>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 0}
              onClick={() => {
                setCursors((stack) => stack.slice(0, -1));
              }}
            >
              <ChevronLeft aria-hidden="true" className="size-3.5" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!rows.data?.next_cursor}
              onClick={() => {
                setCursors((stack) =>
                  rows.data?.next_cursor ? [...stack, rows.data.next_cursor] : stack,
                );
              }}
            >
              Next
              <ChevronRight aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span className="font-medium tracking-[0.02em] uppercase">{label}</span>
      {children}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*  Flat: one row per record                                                   */
/* -------------------------------------------------------------------------- */

function FlatTable({
  page,
  isPending,
  isError,
  expanded,
  onToggle,
}: {
  page: { rows: RecalcRow[]; total: number } | undefined;
  isPending: boolean;
  isError: boolean;
  expanded: number | null;
  onToggle: (index: number) => void;
}) {
  if (isPending) return <LoadingRows />;
  if (isError) return <ErrorRow />;
  if (!page || page.rows.length === 0) return <EmptyRow />;

  const groupKeys = [...new Set(page.rows.flatMap((row) => Object.keys(row.group)))];

  return (
    <TableShell
      caption="Every record of the recalculation, filtered and sorted"
      minWidth="min-w-[48rem]"
    >
      <thead>
        <tr>
          <Th>Row</Th>
          {groupKeys.map((key) => (
            <Th key={key}>{key.replace(/_/g, ' ')}</Th>
          ))}
          <Th className="text-right">Recomputed</Th>
          <Th className="text-right">Stated</Th>
          <Th className="text-right">Difference</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {page.rows.map((row, index) => (
          <RowLine
            key={row.row}
            row={row}
            groupKeys={groupKeys}
            expanded={expanded === index}
            onToggle={() => {
              onToggle(index);
            }}
          />
        ))}
      </tbody>
    </TableShell>
  );
}

function RowLine({
  row,
  groupKeys,
  expanded,
  onToggle,
}: {
  row: RecalcRow;
  groupKeys: string[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasTrace = row.inputs.length > 0 || row.terms.length > 0 || row.flags.length > 0;

  return (
    <>
      <Tr
        className={cn(hasTrace && 'cursor-pointer')}
        onClick={hasTrace ? onToggle : undefined}
        aria-expanded={hasTrace ? expanded : undefined}
      >
        <Td className="font-mono text-xs whitespace-nowrap text-foreground">
          {hasTrace ? (
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'duration-quick mr-1 inline size-3 transition-transform',
                expanded && 'rotate-180',
              )}
            />
          ) : null}
          {row.row}
        </Td>
        {groupKeys.map((key) => (
          <Td key={key}>{row.group[key] ?? <span className="text-subtle-foreground">-</span>}</Td>
        ))}
        <Td className="text-right tabular-nums">{formatAmount(row.recomputed)}</Td>
        <Td className="text-right tabular-nums">{formatAmount(row.stated)}</Td>
        <Td className="text-right font-medium tabular-nums">
          <span className={row.kind ? 'text-danger' : 'text-success'}>
            {formatVariance(row.difference)}
          </span>
        </Td>
        <Td>
          <div className="flex flex-wrap items-center gap-1">
            {row.kind ? (
              <Badge tone="danger" size="sm">
                {DISCREPANCY_LABELS[row.kind]}
              </Badge>
            ) : row.flags.length === 0 ? (
              <Badge tone="success" size="sm">
                Agrees
              </Badge>
            ) : null}
            {row.flags.length > 0 ? (
              <Badge tone="warning" size="sm" title={row.flags.map((flag) => flag.why).join(' ')}>
                Flagged elsewhere{row.flags.length > 1 ? ` (${row.flags.length})` : ''}
              </Badge>
            ) : null}
          </div>
        </Td>
      </Tr>
      {expanded && hasTrace ? (
        <tr className="border-t border-border-hairline bg-surface-muted/40">
          <td colSpan={groupKeys.length + 5} className="px-4 py-3">
            <RowTrace row={row} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

/** One record's own working: every input and derived term it was recomputed from, plus
 * anything other checks on this same table found wrong with it. */
function RowTrace({ row }: { row: RecalcRow }) {
  const values = [...row.inputs, ...row.terms];
  if (values.length === 0 && row.flags.length === 0) return null;

  return (
    <div className="space-y-3">
      {values.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
          {values.map((value) => (
            <div key={value.id}>
              <dt className="text-[10px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
                {value.label || value.id}
                {value.cell ? <span className="font-mono normal-case"> · {value.cell}</span> : null}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground tabular-nums">
                {formatAmount(value.value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {row.flags.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
            Also flagged by other checks on this record
          </p>
          <ul className="space-y-1">
            {row.flags.map((flag) => (
              <li
                key={flag.check_id}
                className="rounded border border-border-hairline bg-surface px-2.5 py-1.5 text-xs"
              >
                <p className="font-medium text-foreground">{flag.label}</p>
                <p className="mt-0.5 text-muted-foreground">{flag.why}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Grouped: one row per distinct value of a dimension                        */
/* -------------------------------------------------------------------------- */

function GroupedTable({
  rows,
  isPending,
  isError,
  dimension,
}: {
  rows:
    | {
        value: string;
        rows: number;
        flagged: number;
        recomputed_total: string;
        stated_total: string;
        difference: string;
      }[]
    | undefined;
  isPending: boolean;
  isError: boolean;
  dimension: string;
}) {
  if (isPending) return <LoadingRows />;
  if (isError) return <ErrorRow />;
  if (!rows || rows.length === 0) return <EmptyRow />;

  return (
    <TableShell caption={`Rows rolled up by ${dimension.replace(/_/g, ' ')}`}>
      <thead>
        <tr>
          <Th>{dimension.replace(/_/g, ' ')}</Th>
          <Th className="text-right">Records</Th>
          <Th className="text-right">Flagged</Th>
          <Th className="text-right">Recomputed</Th>
          <Th className="text-right">Stated</Th>
          <Th className="text-right">Difference</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((group) => (
          <Tr key={group.value}>
            <Td className="font-medium text-foreground">
              {group.value || <span className="text-subtle-foreground">Not stated</span>}
            </Td>
            <Td className="text-right tabular-nums">{group.rows.toLocaleString()}</Td>
            <Td className="text-right tabular-nums">
              {group.flagged > 0 ? (
                <span className="font-medium text-danger">{group.flagged.toLocaleString()}</span>
              ) : (
                <span className="text-subtle-foreground">0</span>
              )}
            </Td>
            <Td className="text-right tabular-nums">{formatAmount(group.recomputed_total)}</Td>
            <Td className="text-right tabular-nums">{formatAmount(group.stated_total)}</Td>
            <Td className="text-right font-medium tabular-nums">
              {formatVariance(group.difference)}
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  States                                                                     */
/* -------------------------------------------------------------------------- */

function LoadingRows() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-card border border-border bg-surface p-8 text-sm text-muted-foreground">
      <Spinner size="sm" />
      Loading records
    </div>
  );
}

function ErrorRow() {
  return (
    <p className="rounded-card border border-danger/30 bg-danger/[0.07] p-4 text-sm text-danger">
      These records could not be loaded.
    </p>
  );
}

function EmptyRow() {
  return (
    <p className="rounded-card border border-border bg-surface-muted/40 p-4 text-sm text-muted-foreground">
      No records match this filter.
    </p>
  );
}
