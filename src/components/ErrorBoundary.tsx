'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React error boundary that catches rendering errors in the chat UI
 * and displays a recovery screen instead of a white-screen crash.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='flex h-dvh items-center justify-center bg-background text-foreground'>
          <div className='max-w-md text-center space-y-4 px-6'>
            <h2 className='text-lg font-semibold text-red-400'>
              Something went wrong
            </h2>
            <p className='text-sm text-zinc-400'>
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className='px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors'
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
