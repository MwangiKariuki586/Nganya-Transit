/**
 * MATWANA Mock Data — Static data for prototype realism.
 * Provides sample nganyas, corridors, vibe tags, and user data
 * for rendering realistic UI in the Phase 1 prototype.
 */

// ─── Types ───────────────────────────────────────────────────
export interface Nganya {
    id: string
    slug: string
    name: string
    corridor: string
    vibeTags: string[]
    followers: number
    sightingsToday: number
    lastSeen: string // relative time string
    lastSeenMinutes: number
    confidence: 'low' | 'med' | 'high'
    isLive: boolean
    isNewBuild: boolean
    imageUrl: string
    description: string
}

export interface Corridor {
    id: string
    name: string
    shortName: string
    nganyaCount: number
}

export interface UserProfile {
    id: string
    username: string
    displayName: string
    avatarUrl: string
    sightingsCount: number
    followingCount: number
    joinedDate: string
    bio: string
}

export interface Sighting {
    id: string
    nganyaId: string
    nganyaName: string
    corridor: string
    spottedBy: string
    time: string
    confidence: 'low' | 'med' | 'high'
    hasMedia: boolean
}

// ─── Corridors ───────────────────────────────────────────────
export const corridors: Corridor[] = [
    { id: 'thika', name: 'Kasarani / Thika Road', shortName: 'Thika Rd', nganyaCount: 42 },
    { id: 'rongai', name: 'Rongai', shortName: 'Rongai', nganyaCount: 28 },
    { id: 'ngong', name: 'Ngong', shortName: 'Ngong', nganyaCount: 35 },
    { id: 'umoja', name: 'Umoja', shortName: 'Umoja', nganyaCount: 22 },
    { id: 'embakasi', name: 'Embakasi', shortName: 'Embakasi', nganyaCount: 31 },
    { id: 'kiambu', name: 'Kiambu', shortName: 'Kiambu', nganyaCount: 19 },
]

// ─── Placeholder image generator (gradient-based, no external deps) ──
const placeholderImage = (hue: number) =>
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='hsl(${hue},80%25,15%25)'/%3E%3Cstop offset='100%25' stop-color='hsl(${hue + 40},70%25,8%25)'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='600' height='400' fill='url(%23g)'/%3E%3Ctext x='300' y='200' font-family='sans-serif' font-size='48' fill='rgba(255,255,255,0.15)' text-anchor='middle' dominant-baseline='middle'%3ENGANYA%3C/text%3E%3C/svg%3E`

// ─── Nganyas ─────────────────────────────────────────────────
export const nganyas: Nganya[] = [
    {
        id: '1',
        slug: 'money-fest',
        name: 'Money Fest',
        corridor: 'Kasarani / Thika Road',
        vibeTags: ['BASS MONSTER', 'LED KING', 'TRENDING'],
        followers: 2847,
        sightingsToday: 12,
        lastSeen: '3 min ago',
        lastSeenMinutes: 3,
        confidence: 'high',
        isLive: true,
        isNewBuild: false,
        imageUrl: placeholderImage(330),
        description: 'The undisputed king of Thika Road. Full LED interior, custom sound system, and a vibe that never sleeps.',
    },
    {
        id: '2',
        slug: 'street-saint',
        name: 'Street Saint',
        corridor: 'Rongai',
        vibeTags: ['NIGHT RIDER', 'CHROME BEAST'],
        followers: 1923,
        sightingsToday: 8,
        lastSeen: '15 min ago',
        lastSeenMinutes: 15,
        confidence: 'high',
        isLive: true,
        isNewBuild: false,
        imageUrl: placeholderImage(260),
        description: 'Rongai legend. Chrome finish with graffiti-art panels. The saint of the streets runs late into the night.',
    },
    {
        id: '3',
        slug: 'vanta-7',
        name: 'Vanta 7',
        corridor: 'Ngong',
        vibeTags: ['STEALTH MODE', 'NEW BUILD'],
        followers: 956,
        sightingsToday: 3,
        lastSeen: '1 hr ago',
        lastSeenMinutes: 60,
        confidence: 'med',
        isLive: false,
        isNewBuild: true,
        imageUrl: placeholderImage(200),
        description: 'Fresh out the workshop. Matte black everything with hidden LED strips. The most anticipated build of the season.',
    },
    {
        id: '4',
        slug: 'rogue-uno',
        name: 'Rogue Uno',
        corridor: 'Umoja',
        vibeTags: ['ROUTE OG', 'BASS MONSTER'],
        followers: 3102,
        sightingsToday: 15,
        lastSeen: '5 min ago',
        lastSeenMinutes: 5,
        confidence: 'high',
        isLive: true,
        isNewBuild: false,
        imageUrl: placeholderImage(350),
        description: 'The OG of Umoja corridor. First nganya to go fully custom. Over 3k followers and still growing.',
    },
    {
        id: '5',
        slug: 'phantom-x',
        name: 'Phantom X',
        corridor: 'Embakasi',
        vibeTags: ['NIGHT RIDER', 'LED KING'],
        followers: 1456,
        sightingsToday: 6,
        lastSeen: '30 min ago',
        lastSeenMinutes: 30,
        confidence: 'med',
        isLive: false,
        isNewBuild: false,
        imageUrl: placeholderImage(280),
        description: 'Phantom presence on Embakasi roads. UV interior lighting, custom wrap, and a sound system you hear a block away.',
    },
    {
        id: '6',
        slug: 'chrome-pulse',
        name: 'Chrome Pulse',
        corridor: 'Kiambu',
        vibeTags: ['CHROME BEAST', 'TRENDING'],
        followers: 2234,
        sightingsToday: 9,
        lastSeen: '8 min ago',
        lastSeenMinutes: 8,
        confidence: 'high',
        isLive: true,
        isNewBuild: false,
        imageUrl: placeholderImage(310),
        description: 'Full chrome exterior that reflects the city lights. The pulse of Kiambu corridor. Always on time, always spotted.',
    },
    {
        id: '7',
        slug: 'neon-drift',
        name: 'Neon Drift',
        corridor: 'Kasarani / Thika Road',
        vibeTags: ['LED KING', 'NEW BUILD'],
        followers: 678,
        sightingsToday: 2,
        lastSeen: '2 hr ago',
        lastSeenMinutes: 120,
        confidence: 'low',
        isLive: false,
        isNewBuild: true,
        imageUrl: placeholderImage(170),
        description: 'New to the scene but making waves. Neon underglow visible from across the highway. Watch this one rise.',
    },
    {
        id: '8',
        slug: 'black-mamba',
        name: 'Black Mamba',
        corridor: 'Rongai',
        vibeTags: ['STEALTH MODE', 'ROUTE OG'],
        followers: 1876,
        sightingsToday: 7,
        lastSeen: '12 min ago',
        lastSeenMinutes: 12,
        confidence: 'high',
        isLive: true,
        isNewBuild: false,
        imageUrl: placeholderImage(240),
        description: 'Silent and deadly. All-black with tinted everything. When you see the Mamba, you know the route is alive.',
    },
]

// ─── Recent Sightings ────────────────────────────────────────
export const recentSightings: Sighting[] = [
    { id: 's1', nganyaId: '1', nganyaName: 'Money Fest', corridor: 'Thika Rd', spottedBy: '@mwas_ke', time: '3 min ago', confidence: 'high', hasMedia: true },
    { id: 's2', nganyaId: '4', nganyaName: 'Rogue Uno', corridor: 'Umoja', spottedBy: '@spot_queen', time: '5 min ago', confidence: 'high', hasMedia: false },
    { id: 's3', nganyaId: '6', nganyaName: 'Chrome Pulse', corridor: 'Kiambu', spottedBy: '@nightowl254', time: '8 min ago', confidence: 'high', hasMedia: true },
    { id: 's4', nganyaId: '2', nganyaName: 'Street Saint', corridor: 'Rongai', spottedBy: '@rongai_stan', time: '15 min ago', confidence: 'high', hasMedia: true },
    { id: 's5', nganyaId: '8', nganyaName: 'Black Mamba', corridor: 'Rongai', spottedBy: '@mamba_hunter', time: '12 min ago', confidence: 'high', hasMedia: false },
    { id: 's6', nganyaId: '5', nganyaName: 'Phantom X', corridor: 'Embakasi', spottedBy: '@phantom_fan', time: '30 min ago', confidence: 'med', hasMedia: true },
]

// ─── User Profile ────────────────────────────────────────────
export const currentUser: UserProfile = {
    id: 'u1',
    username: '@mwas_ke',
    displayName: 'Mwas',
    avatarUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23FF2D78' rx='50'/%3E%3Ctext x='50' y='55' font-family='sans-serif' font-size='36' fill='white' text-anchor='middle' dominant-baseline='middle'%3EM%3C/text%3E%3C/svg%3E`,
    sightingsCount: 47,
    followingCount: 12,
    joinedDate: 'Jan 2026',
    bio: 'Thika Road regular. Nganya culture is life. 🔥',
}

// ─── Vibe Tag Colors ─────────────────────────────────────────
export const vibeTagColors: Record<string, string> = {
    'BASS MONSTER': '#FF2D78',
    'LED KING': '#00F0FF',
    'NIGHT RIDER': '#8B5CF6',
    'CHROME BEAST': '#A0A0B0',
    'STEALTH MODE': '#4A4A5A',
    'ROUTE OG': '#FFB800',
    'NEW BUILD': '#39FF14',
    'TRENDING': '#FF6B35',
}
