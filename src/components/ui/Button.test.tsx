import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/Button';
import { renderWithProviders, screen } from '@/testing/test-utils';

describe('Button', () => {
  it('renders its label and fires onClick', async () => {
    const onClick = vi.fn();
    const { user } = renderWithProviders(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders as its child element when asChild is set', () => {
    // Regression guard: Slot accepts exactly one element child, so the
    // spinner slot has to be marked with `Slottable` or this throws.
    renderWithProviders(
      <Button asChild>
        <a href="/somewhere">Go</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Go' });

    expect(link).toHaveAttribute('href', '/somewhere');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('still renders as a link while loading', () => {
    renderWithProviders(
      <Button asChild isLoading>
        <a href="/somewhere">Go</a>
      </Button>,
    );

    expect(screen.getByRole('link', { name: 'Go' })).toBeInTheDocument();
  });

  it('is disabled and marked busy while loading', async () => {
    const onClick = vi.fn();
    const { user } = renderWithProviders(
      <Button isLoading onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
