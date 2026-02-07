/**
 * Error Boundary
 *
 * Catches unhandled React rendering errors and displays a fallback UI
 * instead of white-screening the entire application. One broken component
 * should not take down the whole page.
 *
 * Usage:
 *   import { ErrorBoundary } from '@vibeonrails/web';
 *
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 *   // With custom fallback:
 *   <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 *   // With onError callback:
 *   <ErrorBoundary onError={(error, info) => reportToSentry(error)}>
 *     <MyComponent />
 *   </ErrorBoundary>
 */

import React from "react";
import { ErrorFallback } from "./ErrorFallback.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback UI to render when an error is caught */
  fallback?: React.ReactNode;
  /** Callback when an error is caught (for logging/reporting) */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Custom fallback component that receives error and reset function */
  FallbackComponent?: React.ComponentType<{
    error: Error;
    resetError: () => void;
  }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom FallbackComponent takes priority
      if (this.props.FallbackComponent) {
        const Fallback = this.props.FallbackComponent;
        return (
          <Fallback error={this.state.error} resetError={this.resetError} />
        );
      }

      // Static fallback element
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}
