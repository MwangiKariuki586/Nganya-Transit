/**
 * Nganya Detail Page — Profile for a single nganya.
 * Hero image, tags, follow/notify, media gallery, sightings, related.
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import Button from '../components/ui/Button'
import Chip from '../components/ui/Chip'
import Card from '../components/ui/Card'
import LiveBadge from '../components/ui/LiveBadge'
import ConfidenceBadge from '../components/ui/ConfidenceBadge'
import { vibeTagColors } from '../lib/mockData'
import { getNganya } from '../lib/queries/discover'
import { getLiveNow } from '../lib/queries/live'
import { getCorridorSightings } from '../lib/queries/sightings'
import { Heart, Bell, Share2, Eye, Clock, MapPin, Camera, ChevronLeft, Users } from 'lucide-react'

export const Route = createFileRoute('/nganya/$slug')({
    component: NganyaDetailScreen,
})

function NganyaDetailScreen() {
    const { slug } = Route.useParams()
    const [nganya, setNganya] = useState<any>(null)
    const [isFollowing, setIsFollowing] = useState(false)
    const [isNotifying, setIsNotifying] = useState(false)

    // related data
    const [nganyaSightings, setNganyaSightings] = useState<any[]>([])
    const [relatedNganyas, setRelatedNganyas] = useState<any[]>([])
    const [isLive, setIsLive] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function loadNganya() {
            setIsLoading(true)
            try {
                const data = await getNganya(slug)
                if (data) {
                    setNganya(data)
                    // Check live status
                    const liveRes = await getLiveNow()
                    setIsLive(liveRes.some(ln => ln.nganya_id === data.id) || data.status === 'LIVE')

                    // fetch recent sightings in corridor for now to simulate. 
                    if (data.corridor_id) {
                        const recents = await getCorridorSightings(data.corridor_id)
                        setNganyaSightings(recents.filter(s => s.nganya_id === data.id))
                    }
                }
            } catch (err) {
                console.error("Failed to load nganya data", err)
            } finally {
                setIsLoading(false)
            }
        }

        loadNganya()
    }, [slug])

    if (isLoading) {
        return <div className="page-container py-16 flex justify-center"><div className="animate-pulse w-8 h-8 rounded-full bg-[var(--color-accent)]"></div></div>
    }

    if (!nganya) {
        return (
            <div className="page-container py-16 text-center">
                <h2 className="text-h2 text-[var(--color-text-primary)] mb-2">Nganya not found</h2>
                <p className="text-body text-[var(--color-text-secondary)] mb-6">
                    This nganya might have ghosted. 👻 Or we're fetching by ID and need to decode slug correctly...
                </p>
                <Link to="/">
                    <Button variant="secondary">Back to Discover</Button>
                </Link>
            </div>
        )
    }

    const corridorName = nganya.corridors?.name || 'Unknown Route'
    const imageUrl = nganya.nganya_media?.[0]?.media_url || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80'
    const tags = nganya.tags || []
    const isNewBuild = tags.includes('NEW_BUILD')

    return (
        <div className="animate-slide-up">

            {/* ─── Hero Image ───────────────────────────────────── */}
            <div className="relative h-[280px] md:h-[400px] overflow-hidden">
                <img
                    src={imageUrl}
                    alt={nganya.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)] via-[var(--color-bg-base)]/40 to-transparent" />

                {/* Back button (mobile) */}
                <Link
                    to="/"
                    className="absolute top-4 left-4 md:top-6 md:left-6 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors no-underline"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>

                {/* Share button */}
                <button
                    className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors cursor-pointer"
                    aria-label="Share"
                >
                    <Share2 className="w-5 h-5" />
                </button>

                {/* Name + badges on hero */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-8 md:px-8 md:pb-8 md:pt-12 lg:px-12">
                    <div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {isLive && <LiveBadge />}
                            {isNewBuild && (
                                <span className="animate-shimmer px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--color-green-soft)] text-[var(--color-green)] text-[10px] font-bold tracking-wider uppercase border border-[rgba(57,255,20,0.2)]">
                                    New Build
                                </span>
                            )}
                            {nganya.is_verified && <ConfidenceBadge level="HIGH" />}
                        </div>
                        <h1 className="text-display text-white">{nganya.name}</h1>
                    </div>
                </div>
            </div>

            {/* ─── Content ──────────────────────────────────────── */}
            <div className="page-container pt-8 pb-10 md:pt-10 md:pb-16 space-y-8 md:space-y-10">

                {/* Action bar */}
                <div className="flex flex-wrap gap-3">
                    <Button
                        variant={isFollowing ? 'secondary' : 'primary'}
                        onClick={() => setIsFollowing(!isFollowing)}
                    >
                        <Heart className="w-4 h-4" fill={isFollowing ? 'currentColor' : 'none'} />
                        {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setIsNotifying(!isNotifying)}
                    >
                        <Bell className="w-4 h-4" fill={isNotifying ? 'currentColor' : 'none'} />
                        {isNotifying ? 'Notifying' : 'Notify'}
                    </Button>
                    <Link to="/spot" className="no-underline">
                        <Button variant="secondary">
                            <Camera className="w-4 h-4" />
                            Spot
                        </Button>
                    </Link>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-4 md:gap-8 p-4 rounded-[var(--radius-lg)] bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[var(--color-accent)]" />
                        <div>
                            <span className="text-sm font-semibold text-[var(--color-text-primary)]">--</span>
                            <span className="text-xs text-[var(--color-text-tertiary)] ml-1">followers</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-[var(--color-cyan)]" />
                        <div>
                            <span className="text-sm font-semibold text-[var(--color-text-primary)]">--</span>
                            <span className="text-xs text-[var(--color-text-tertiary)] ml-1">spotted today</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                        <div>
                            <span className="text-sm font-semibold text-[var(--color-text-primary)]">recently</span>
                            <span className="text-xs text-[var(--color-text-tertiary)] ml-1">last seen</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[var(--color-warning)]" />
                        <div>
                            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{corridorName}</span>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <h2 className="text-h3 mb-3">About</h2>
                    <p className="text-body text-[var(--color-text-secondary)] leading-relaxed">
                        Plate: {nganya.registration_number || 'Unknown'} - Operated as {nganya.status}. Active on the {corridorName} transit corridor.
                    </p>
                </div>

                {/* Vibe tags */}
                {tags.length > 0 && (
                    <div>
                        <h2 className="text-h3 mb-3">Vibes</h2>
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag: string) => (
                                <Chip key={tag} label={tag} variant="vibe" color={vibeTagColors[tag] || undefined} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Media Gallery (placeholder grid) */}
                <div>
                    <h2 className="text-h3 mb-3">Gallery</h2>
                    <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="aspect-square rounded-[var(--radius-md)] overflow-hidden bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                            >
                                <img
                                    src={imageUrl}
                                    alt={`${nganya.name} gallery ${i + 1}`}
                                    className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Sightings */}
                <div>
                    <h2 className="text-h3 mb-3">Recent Sightings</h2>
                    {nganyaSightings.length > 0 ? (
                        <div className="space-y-2">
                            {nganyaSightings.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                                >
                                    <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-[var(--color-text-primary)]">{s.user?.handle || 'Anonymous'}</span>
                                            <ConfidenceBadge level={s.confidence?.confidence_level || 'HIGH'} />
                                        </div>
                                        <span className="text-xs text-[var(--color-text-tertiary)]">{corridorName} · {s.time || 'agoo'}</span>
                                    </div>
                                    {s.media_urls?.length > 0 && <Eye className="w-3.5 h-3.5 text-[var(--color-cyan)]" />}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-body-sm text-[var(--color-text-tertiary)] py-4">
                            No recent sightings. Be the first to spot! 👀
                        </p>
                    )}
                </div>

                {/* Related Nganyas */}
                {relatedNganyas.length > 0 && (
                    <div>
                        <h2 className="text-h3 mb-3">More from {corridorName}</h2>
                        <div className="grid-cards">
                            {relatedNganyas.map((n) => (
                                <Card key={n.id} nganya={n} variant="standard" />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
