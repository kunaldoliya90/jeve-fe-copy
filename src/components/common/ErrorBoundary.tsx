import { Component, type ErrorInfo, type ReactNode } from 'react';

import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered instead of `children` once an error is caught. */
  fallback: (props: { error: Error; reset: () => void }) => ReactNode;
  /** Changing any value here resets the boundary — e.g. the current route. */
  resetKeys?: readonly unknown[];
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-phase errors so one broken subtree does not blank the app.
 *
 * This has to be a class: React exposes no hook equivalent of
 * `componentDidCatch`. `resetKeys` is what stops a caught error from being
 * sticky — without it, navigating away from a broken route keeps showing the
 * error, because the boundary never re-renders its children.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('Render error caught by boundary.', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(prev: ErrorBoundaryProps) {
    const { resetKeys } = this.props;

    if (this.state.error === null || resetKeys === undefined) return;

    const changed =
      prev.resetKeys?.length !== resetKeys.length ||
      resetKeys.some((key, index) => !Object.is(key, prev.resetKeys?.[index]));

    if (changed) this.reset();
  }

  reset = () => {
    this.setState({ error: null });
  };

  override render() {
    const { error } = this.state;

    if (error !== null) {
      return this.props.fallback({ error, reset: this.reset });
    }

    return this.props.children;
  }
}
