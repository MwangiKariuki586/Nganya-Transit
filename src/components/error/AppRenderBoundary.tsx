import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ErrorDetailsDevOnly } from './ErrorDetailsDevOnly'
import { getUserMessage, toAppError } from '@/shared/errors/app-error'
import { reportAppError } from '@/shared/errors/reporting'

interface AppRenderBoundaryProps {
  children: ReactNode
}

interface AppRenderBoundaryState {
  error: Error | null
}

export class AppRenderBoundary extends Component<
  AppRenderBoundaryProps,
  AppRenderBoundaryState
> {
  state: AppRenderBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportAppError(error, {
      area: 'render',
      action: errorInfo.componentStack,
    })
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      const normalized = toAppError(this.state.error)

      return (
        <div className="page-container py-10 md:py-14">
          <div className="mx-auto max-w-2xl rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(18,18,26,0.94)] p-6 shadow-[var(--shadow-lg)] md:p-8">
            <p className="text-tag text-[var(--color-accent)]">Render error</p>
            <h1 className="mt-2 text-h2 text-white">This view stopped rendering</h1>
            <p className="mt-3 text-body text-[var(--color-text-secondary)]">
              {getUserMessage(normalized)}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={this.reset}
                className="rounded-[16px] bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)]"
              >
                Try again
              </button>
              <Link
                to="/"
                className="rounded-[16px] border border-[var(--glass-border)] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Go home
              </Link>
            </div>
            <div className="mt-6">
              <ErrorDetailsDevOnly error={this.state.error} />
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
