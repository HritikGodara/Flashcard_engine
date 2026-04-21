import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Basic observability mock
    // In production, this would send to Sentry, Datadog or Vercel Analytics
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      timestamp: new Date().toISOString()
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h2 className="heading-3">Something went wrong</h2>
            <p className="empty-state-desc" style={{ marginTop: 'var(--space-4)' }}>
              An unexpected error occurred. The technical details have been logged.
            </p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: 'var(--space-6)' }}
              onClick={() => window.location.assign('/')}
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
