"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ox-glass-16 ox-glass-edge rounded-2xl p-8 text-center mt-12">
          <h2 className="font-display text-xl font-bold text-ox-text-primary mb-2">Something went wrong</h2>
          <p className="text-sm text-ox-text-muted mb-4">An unexpected error occurred. Try refreshing the page.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="ox-btn-primary px-6 py-2 text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
