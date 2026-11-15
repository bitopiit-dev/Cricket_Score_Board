import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../../i18n';

interface Props {
  children: ReactNode;
  /** Changing this (e.g. the route) clears the error, so moving to another page recovers. */
  resetKey?: string;
}
interface State {
  error: Error | null;
  key?: string;
}

/**
 * Catches a crash in one page so the rest of the app (header, tabs, other
 * pages) keeps working, instead of the whole screen going blank.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const t = i18n.t.bind(i18n);
    return (
      <main
        role="alert"
        className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 p-8 text-center"
      >
        <p className="font-display text-2xl font-bold">{t('crash.title')}</p>
        <p className="text-[13px] text-slate-600 dark:text-slate-400">{t('crash.body')}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-bpl-red px-4 py-2 text-sm font-semibold text-white"
          >
            {t('crash.reload')}
          </button>
          <a
            href="#/home"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm dark:bg-slate-900"
          >
            {t('crash.home')}
          </a>
        </div>
      </main>
    );
  }
}
