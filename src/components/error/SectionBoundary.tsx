import { Component, type ErrorInfo, type ReactNode } from 'react'
import { InlineErrorState } from './InlineErrorState'
import { reportAppError } from '@/shared/errors/reporting'
import { getUserMessage, toAppError } from '@/shared/errors/app-error'

interface SectionBoundaryProps {
  children: ReactNode
  title?: string
  retryLabel?: string
  onRetry?: () => void
  areaLabel?: string
}

interface SectionBoundaryState {
  error: Error | null
}

export class SectionBoundary extends Component<SectionBoundaryProps, SectionBoundaryState> {
  state: SectionBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error) {
    return {
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportAppError(error, {
      area: 'render',
      action: this.props.areaLabel || errorInfo.componentStack,
    })
  }

  reset = () => {
    this.setState({ error: null })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.error) {
      const normalized = toAppError(this.state.error)
      return (
        <InlineErrorState
          title={this.props.title}
          message={getUserMessage(normalized)}
          onRetry={this.reset}
          retryLabel={this.props.retryLabel}
        />
      )
    }

    return this.props.children
  }
}
