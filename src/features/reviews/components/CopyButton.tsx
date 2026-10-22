/**
 * Puts a piece of the report on the clipboard.
 *
 * Shared, because the two places that need it are the two places whose whole
 * purpose is to leave this page: the written summary gets quoted in a meeting,
 * and the list of next steps gets pasted into a ticket or a mail. The
 * alternative is a reviewer dragging a selection across a restructured list
 * and pasting something with half a bullet's punctuation missing.
 *
 * Rendered only where there is a clipboard to write to. A button that silently
 * does nothing is worse than no button, and the browsers without one are also
 * the ones where the copy would fail.
 */

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui';

export interface CopyButtonProps {
  /** Exactly what lands on the clipboard. */
  text: string;
  className?: string | undefined;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => {
      setCopied(false);
    }, 2400);
    return () => {
      clearTimeout(timer);
    };
  }, [copied]);

  if (!('clipboard' in navigator)) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true);
          },
          () => {
            // Denied, or no permission in this context. Saying "Copied" when
            // nothing was copied is the only outcome worth preventing.
            setCopied(false);
          },
        );
      }}
    >
      {copied ? <Check aria-hidden="true" className="text-success" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </Button>
  );
}
