import { toAppError } from './app-error'

export interface ErrorReportContext {
  area: 'route' | 'render' | 'mutation' | 'server'
  routeId?: string
  action?: string
}

export function reportAppError(error: unknown, context: ErrorReportContext) {
  const normalized = toAppError(error)

  console.error('[app-error]', {
    ...context,
    error: normalized,
    cause: normalized.cause,
  })
}
