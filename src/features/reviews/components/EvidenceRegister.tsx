/**
 * Every evidence layer the entry type expects, and what the workbook offered.
 *
 * All of them, not only the gaps. A register listing only what is missing
 * hides what the conclusion actually rests on, and the satisfied rows are what
 * a reviewer points at when asked why the number is believed.
 *
 * The comment column matters as much as the status. "Missing" on its own sends
 * someone hunting for a file that may already be pasted into the workbook, so
 * the four cases a layer can be in — satisfied, satisfied but flawed, looked
 * for and not found, never looked for — are each worded differently.
 */

import { Badge } from '@/components/ui';

import type { EvidenceView, ReviewDetail } from '../types';
import { Section } from './Section';
import { TableShell, Td, Th, Tr } from './TableShell';

export function EvidenceRegister({ review, index }: { review: ReviewDetail; index: number }) {
  const register = review.evidence;
  if (register.length === 0) return null;

  const available = register.filter((item) => item.status === 'available').length;
  const requiredMissing = register.filter(
    (item) => item.required && item.status !== 'available',
  ).length;

  return (
    <Section
      index={index}
      id="evidence"
      title="Detailed evidence and validation register"
      aside={
        <span>
          <span className="font-semibold text-foreground tabular-nums">
            {available}/{register.length}
          </span>{' '}
          available
          {requiredMissing > 0 ? (
            <span className="text-danger"> · {requiredMissing} required layer(s) missing</span>
          ) : null}
        </span>
      }
    >
      <TableShell
        caption="Expected evidence layers and whether the workbook satisfies each one"
        minWidth="min-w-[46rem]"
      >
        <thead>
          <tr>
            <Th>Evidence layer</Th>
            <Th>Expected evidence</Th>
            <Th>Status</Th>
            <Th>Category</Th>
            <Th>Comment</Th>
          </tr>
        </thead>
        <tbody>
          {register.map((item) => (
            <Row key={item.item} item={item} />
          ))}
        </tbody>
      </TableShell>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Baseline layers are scored. Recommended layers are reported and never counted, so a missing
        one lowers nothing. It is there for the reviewer to judge.
      </p>
    </Section>
  );
}

/** Spaced and capitalised for a reader; the id stays available as the title. */
function label(itemId: string): string {
  const spaced = itemId.replaceAll('_', ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function Row({ item }: { item: EvidenceView }) {
  const available = item.status === 'available';

  return (
    <Tr>
      <th
        scope="row"
        className="px-3 py-2.5 text-left font-medium text-foreground"
        title={item.item}
      >
        {label(item.item)}
      </th>
      <Td>{item.expected || '-'}</Td>
      <Td>
        <Badge tone={available ? 'success' : 'danger'} size="sm">
          {available ? 'Available' : 'Missing'}
        </Badge>
      </Td>
      <Td>
        <Badge
          tone="neutral"
          variant={item.required ? 'solid' : 'soft'}
          size="sm"
          title={
            item.required
              ? 'Scored: a missing baseline layer lowers the result'
              : 'Reported only: never counted towards the score'
          }
        >
          {item.required ? 'Baseline' : 'Recommended'}
        </Badge>
      </Td>
      <Td>
        {item.note || '-'}
        {!available && item.remediation ? (
          <span className="mt-1 block text-foreground">{item.remediation}</span>
        ) : null}
      </Td>
    </Tr>
  );
}
