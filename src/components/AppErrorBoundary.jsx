import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  state = { error: null, recovering: false };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('STEP dashboard render failed', error, info);
  }

  recover = async () => {
    this.setState({ recovering: true });
    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch (error) {
      console.warn('STEP cache recovery could not fully complete', error);
    }
    const url = new URL(window.location.origin);
    url.searchParams.set('recover', Date.now().toString());
    window.location.replace(url.toString());
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="fatal-error-screen">
        <section className="fatal-error-card">
          <img src="/logo.svg" alt="STEP Network" />
          <h1>The dashboard could not finish refreshing</h1>
          <p>Your account and attendance data have not been deleted. Reload the dashboard to reconnect.</p>
          <details className="fatal-error-details">
            <summary>Technical details</summary>
            <code>{this.state.error?.name || 'RenderError'}: {this.state.error?.message || 'Unknown dashboard rendering failure'}</code>
          </details>
          <button type="button" disabled={this.state.recovering} onClick={this.recover}>{this.state.recovering ? 'Clearing cached files…' : 'Reload dashboard'}</button>
        </section>
      </main>
    );
  }
}
