/**
 * Signal Intelligence — Utilities for assessing sighting freshness, user credibility, and signal quality.
 */

export type SignalStrength = 'fresh' | 'aging' | 'expired';
export type CredibilityLevel = 'active-spotter' | 'reliable-contributor' | 'occasional-contributor' | 'new-spotter';

/**
 * Calculate signal strength based on sighting age
 */
export function getSignalStrength(createdAt: string | Date): SignalStrength {
  const timestamp = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  const ageMinutes = (Date.now() - timestamp) / 60000;

  if (ageMinutes <= 10) return 'fresh';
  if (ageMinutes <= 30) return 'aging';
  return 'expired';
}

/**
 * Get human-readable signal label
 */
export function getSignalLabel(strength: SignalStrength): string {
  const labels = {
    fresh: 'Fresh',
    aging: 'Aging',
    expired: 'Expired',
  };
  return labels[strength];
}

/**
 * Get signal strength styling
 */
export function getSignalStyle(strength: SignalStrength) {
  const styles = {
    fresh: {
      color: 'var(--color-green)',
      bg: 'var(--color-green-soft)',
      border: 'rgba(57,255,20,0.2)',
      glow: 'var(--glow-accent-sm)',
    },
    aging: {
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-soft)',
      border: 'rgba(255,193,7,0.2)',
      glow: 'none',
    },
    expired: {
      color: 'var(--color-text-tertiary)',
      bg: 'var(--glass-bg)',
      border: 'var(--glass-border)',
      glow: 'none',
    },
  };
  return styles[strength];
}

/**
 * Format recency label for display
 */
export function formatRecencyLabel(createdAt: string | Date): string {
  const timestamp = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  const ageMinutes = Math.floor((Date.now() - timestamp) / 60000);

  if (ageMinutes < 1) return 'Just now';
  if (ageMinutes < 60) return `${ageMinutes} min ago`;
  
  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return `${ageHours}h ago`;
  
  const ageDays = Math.floor(ageHours / 24);
  return `${ageDays}d ago`;
}

/**
 * Calculate user credibility based on activity
 */
export function getUserCredibility(sightings: any[]): {
  level: CredibilityLevel;
  label: string;
  lastActivity: string | null;
  sightingsLast7d: number;
  sightingsLast24h: number;
} {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const sightingsLast24h = sightings.filter(s => {
    const timestamp = new Date(s.created_at).getTime();
    return timestamp >= oneDayAgo;
  }).length;

  const sightingsLast7d = sightings.filter(s => {
    const timestamp = new Date(s.created_at).getTime();
    return timestamp >= sevenDaysAgo;
  }).length;

  const lastSighting = sightings[0];
  const lastActivity = lastSighting ? formatRecencyLabel(lastSighting.created_at) : null;

  let level: CredibilityLevel;
  let label: string;

  if (sightingsLast7d >= 5) {
    level = 'active-spotter';
    label = 'Active Spotter';
  } else if (sightingsLast7d >= 3) {
    level = 'reliable-contributor';
    label = 'Reliable Contributor';
  } else if (sightings.length >= 3) {
    level = 'occasional-contributor';
    label = 'Occasional Contributor';
  } else {
    level = 'new-spotter';
    label = 'New Spotter';
  }

  return {
    level,
    label,
    lastActivity,
    sightingsLast7d,
    sightingsLast24h,
  };
}

/**
 * Get credibility badge styling
 */
export function getCredibilityStyle(level: CredibilityLevel) {
  const styles = {
    'active-spotter': {
      color: 'var(--color-green)',
      bg: 'var(--color-green-soft)',
      border: 'rgba(57,255,20,0.2)',
    },
    'reliable-contributor': {
      color: 'var(--color-cyan)',
      bg: 'var(--color-cyan-soft)',
      border: 'rgba(0,229,255,0.2)',
    },
    'occasional-contributor': {
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-soft)',
      border: 'rgba(255,193,7,0.2)',
    },
    'new-spotter': {
      color: 'var(--color-text-secondary)',
      bg: 'var(--glass-bg)',
      border: 'var(--glass-border)',
    },
  };
  return styles[level];
}

/**
 * Get nganya activity signal for following list
 */
export function getNganyaActivitySignal(sightings: any[]): {
  label: string;
  isFresh: boolean;
  count: number;
} {
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;

  const recentSightings = sightings.filter(s => {
    const timestamp = new Date(s.created_at).getTime();
    return timestamp >= tenMinutesAgo;
  });

  if (recentSightings.length > 0) {
    return {
      label: `${recentSightings.length} sighting${recentSightings.length > 1 ? 's' : ''} in last 10 min`,
      isFresh: true,
      count: recentSightings.length,
    };
  }

  const lastSighting = sightings[0];
  if (lastSighting) {
    return {
      label: `Seen ${formatRecencyLabel(lastSighting.created_at)}`,
      isFresh: false,
      count: 0,
    };
  }

  return {
    label: 'No fresh sightings',
    isFresh: false,
    count: 0,
  };
}
