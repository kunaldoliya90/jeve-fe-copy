import { Monitor, Moon, Sun } from 'lucide-react';

import { type Theme, useUiStore } from '@/stores/ui.store';
import { cn } from '@/utils/cn';

const OPTIONS: readonly { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'Match system', Icon: Monitor },
];

/**
 * Three-state theme control.
 *
 * Three states rather than a two-state switch because "match the system" is a
 * real preference and not the same as whichever of light or dark the OS
 * happens to be on right now — a switch collapses them and then silently
 * stops following the OS the first time it is touched.
 *
 * A radio group, so arrow keys move between the options the way a keyboard
 * user expects, with the selected pill sliding on `transform` only.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);

  const activeIndex = OPTIONS.findIndex((option) => option.value === theme);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        'relative inline-flex items-center gap-0.5 rounded-pill border border-border bg-surface-muted p-0.5',
        className,
      )}
    >
      {/* One sliding pill behind the icons, rather than a background on each
          button: the movement is what makes the control feel physical. */}
      <span
        aria-hidden
        className="absolute top-0.5 bottom-0.5 left-0.5 w-8 rounded-pill bg-surface shadow-rest transition-transform duration-[280ms] ease-spring"
        style={{ transform: `translateX(${String(Math.max(activeIndex, 0) * 34)}px)` }}
      />

      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => {
            setTheme(value);
          }}
          className={cn(
            'relative flex size-8 press items-center justify-center rounded-pill',
            theme === value
              ? 'text-foreground'
              : 'text-subtle-foreground hover:text-muted-foreground',
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </button>
      ))}
    </div>
  );
}
