/**
 * Lightweight event tracking helper.
 * - In development: logs to the console so events are easy to verify.
 * - In production: fires a best-effort Supabase RPC call.
 *   The `track_event` RPC is optional — failures are silently swallowed
 *   so tracking never disrupts the user experience.
 */
import { supabase } from './supabase';

export interface TrackEventParams {
  event: string;
  properties?: Record<string, unknown>;
}

export function trackEvent({ event, properties }: TrackEventParams): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, properties ?? {});
    return;
  }

  // Fire-and-forget — do not surface errors to the caller.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  void Promise.resolve((supabase as any).rpc('track_event', {
    p_event: event,
    p_properties: properties ?? {},
  })).catch(() => undefined);
}
