import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('STEP dashboard render failed', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="fatal-error-screen">
        <section className="fatal-error-card">
          <img src="/logo.svg" alt="STEP Network" />
          <h1>The dashboard could not finish refreshing</h1>
          <p>Your account and attendance data have not been deleted. Reload the dashboard to reconnect.</p>
          <button type="button" onClick={() => window.location.reload()}>Reload dashboard</button>
        </section>
      </main>
    );
  }
}
