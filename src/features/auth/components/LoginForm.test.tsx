import { describe, expect, it, vi } from 'vitest';

import { mockUser } from '@/testing/mocks/handlers';
import { renderWithProviders, screen, waitFor } from '@/testing/test-utils';

import { useAuthStore } from '../stores/auth.store';
import { LoginForm } from './LoginForm';

/**
 * Exercises the feature end to end against MSW: form validation, the real
 * mutation, and the store write. No mocking of our own modules, so the test
 * would catch a break in any layer between the input and the session.
 */
describe('LoginForm', () => {
  it('shows validation errors before calling the API', async () => {
    const { user } = renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('stores the session and calls onSuccess with valid credentials', async () => {
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/email/i), mockUser.email);
    await user.type(screen.getByLabelText(/password/i), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
    expect(useAuthStore.getState().user?.email).toBe(mockUser.email);
  });

  it('surfaces a server rejection to the user', async () => {
    const { user } = renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });
});
