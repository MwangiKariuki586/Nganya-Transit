/**
 * Home / Feed Screen — The landing page.
 * Sections: Hero, Live Now (horizontal scroll), Featured build,
 * Routes/Corridors filter, and vertical feed of nganyas.
 */

import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import LiveBadge from '../components/ui/LiveBadge'
import { getCorridors, searchNganyas } from '../lib/queries/discover'
import { getLiveNow } from '../lib/queries/live'
import { getCorridorSightings } from '../lib/queries/sightings'
import { corridors as mockCorridors, recentSightings as mockRecentSightings } from '../lib/mockData'
import { Clock, Eye, TrendingUp, ChevronRight } from 'lucide-react'
import ConfidenceBadge from '../components/ui/ConfidenceBadge'

export const Route = createFileRoute('/')({
  component: HomeScreen,
})

function HomeScreen() {
  const [activeCorridor, setActiveCorridor] = useState<string | null>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())

  // Real data states
  const [corridors, setCorridors] = useState<any[]>([])
  const [nganyas, setNganyas] = useState<any[]>([])
  const [liveNganyas, setLiveNganyas] = useState<any[]>([])
  const [recentSightings, setRecentSightings] = useState<any[]>(mockRecentSightings) // fallback partially for MVP demo

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [fetchedCorridors, fetchedNganyas, fetchedLive] = await Promise.all([
          getCorridors(),
          searchNganyas(''), // load all
          getLiveNow()
        ])
        setCorridors(fetchedCorridors || [])
        setNganyas(fetchedNganyas || [])
        setLiveNganyas(fetchedLive || [])

        // As a quick preview, mapping the first corridor sightings
        if (fetchedCorridors && fetchedCorridors.length > 0) {
          const sightings = await getCorridorSightings(fetchedCorridors[0].id)
          if (sightings && sightings.length > 0) {
            // Map DB shape to UI shape temporarily if needed, or use as is
            setRecentSightings(sightings)
          }
        }

      } catch (err) {
        console.error("Failed to load initial data", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Currently we use a dummy fallback if no nganyas are seeded
  const featuredNganya = nganyas.find((n) => n.tags?.includes("NEW_BUILD")) ?? nganyas[0]

  const filteredNganyas = activeCorridor
    ? nganyas.filter((n) => n.corridor_id === activeCorridor)
    : nganyas

  const toggleFollow = (id: string) => {
    setFollowing((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Map Supabase models to the exact Card component props expectation
  const mapSupabaseToCardProps = (dbNganya: any) => {
    if (!dbNganya) return null;

    // Detect if it is currently live natively from our view
    const isLive = liveNganyas.some(ln => ln.nganya_id === dbNganya.id) || dbNganya.status === 'LIVE';

    return {
      id: dbNganya.nganya_id || dbNganya.id,
      slug: dbNganya.slug || dbNganya.nganya_slug || '',
      name: dbNganya.nganya_name || dbNganya.name,
      corridor: dbNganya.corridor_name || dbNganya.corridors?.name || 'Unknown Route',
      vibeTags: dbNganya.vibeTags || dbNganya.tags || [],
      imageUrl: dbNganya.nganya_media?.[0]?.media_url || dbNganya.image_url || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80',
      isLive: isLive,
      isNewBuild: dbNganya.tags?.includes('NEW_BUILD') || dbNganya.is_new_build,
      isVerified: dbNganya.is_verified,
      followers: dbNganya.follower_count || 0,
      sightingsToday: dbNganya.sighting_count_today || 0,
      lastSeen: dbNganya.last_seen || 'Recently'
    }
  }

  if (isLoading) {
    return <div className="page-container py-12 flex justify-center"><div className="animate-pulse w-8 h-8 rounded-full bg-[var(--color-accent)]"></div></div>
  }

  return (
    <div className="page-container py-8 md:py-12 space-y-12 md:space-y-16">

      {/* ─── Hero Section ─────────────────────────────────── */}
      <section className="space-y-2">
        <p className="text-tag text-[var(--color-accent)]">Nairobi Streets</p>
        <h1 className="text-display">
          What's <span className="text-[var(--color-accent)]">live</span> right now
        </h1>
        <p className="text-body text-[var(--color-text-secondary)] max-w-lg">
          Discover, follow, and spot the dopest nganyas on Nairobi streets.
        </p>
      </section>

      {/* ─── Live Now — Horizontal Scroll ─────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LiveBadge />
            <span className="text-h4 text-[var(--color-text-primary)]">
              {liveNganyas.length} on the road
            </span>
          </div>
          <button className="flex items-center gap-1 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors cursor-pointer">
            See all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto scroll-hidden pb-2 -mx-5 px-5 md:-mx-8 md:px-8">
          {liveNganyas.length > 0 ? liveNganyas.map((n) => {
            const cardData = mapSupabaseToCardProps(n)
            if (!cardData) return null
            return (
              <div key={cardData.id} className="shrink-0 w-[260px] md:w-[300px]">
                <Card
                  nganya={cardData as any}
                  variant="standard"
                  isFollowing={following.has(cardData.id)}
                  onFollow={toggleFollow}
                />
              </div>
            )
          }) : (
            <div className="text-sm text-[var(--color-text-secondary)] italic p-4">No live sessions currently...</div>
          )}
        </div>
      </section>

      {/* ─── Featured Build ───────────────────────────────── */}
      {featuredNganya && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[var(--color-green)]" />
            <span className="text-tag text-[var(--color-green)]">Featured</span>
          </div>
          <Card
            nganya={mapSupabaseToCardProps(featuredNganya) as any}
            variant="feature"
            isFollowing={following.has(featuredNganya.id)}
            onFollow={toggleFollow}
          />
        </section>
      )}

      {/* ─── Recent Sightings ─────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">Recently Spotted</h2>
          <button className="flex items-center gap-1 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors cursor-pointer">
            See all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {recentSightings.slice(0, 4).map((s) => {
            // Map DB structure to mock if from fallback, otherwise render Supabase layout.
            const isSupabase = s.nganya !== undefined;
            const title = isSupabase ? s.nganya.name : s.nganyaName;
            const corridorLabel = isSupabase ? "Current Corridor" : s.corridor;
            const author = isSupabase ? s.user?.handle : s.spottedBy;
            const hasMedia = isSupabase ? (s.media_urls?.length > 0) : s.hasMedia;

            return (
              <div
                key={s.id}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</span>
                    <ConfidenceBadge level={s.confidence?.confidence_level || s.confidence || 'HIGH'} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                    <span>{corridorLabel}</span>
                    <span>·</span>
                    <span>{author || 'Anonymous'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] shrink-0">
                  <Clock className="w-3 h-3" />
                  {s.time || 'agoo'}
                </div>
                {hasMedia && (
                  <Eye className="w-3.5 h-3.5 text-[var(--color-cyan)] shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── Routes / Corridors Filter ────────────────────── */}
      <section>
        <h2 className="text-h3 mb-4">Browse by Route</h2>

        <div className="flex flex-wrap gap-2 mb-6">
          <Chip
            label="All"
            variant="route"
            isActive={!activeCorridor}
            onClick={() => setActiveCorridor(null)}
          />
          {corridors.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              variant="route"
              isActive={activeCorridor === c.id}
              onClick={() => setActiveCorridor(activeCorridor === c.id ? null : c.id)}
            />
          ))}
        </div>

        {/* Card grid */}
        <div className="grid-cards">
          {filteredNganyas.map((n) => {
            const cardData = mapSupabaseToCardProps(n)
            if (!cardData) return null
            return (
              <Card
                key={cardData.id}
                nganya={cardData as any}
                variant="standard"
                isFollowing={following.has(cardData.id)}
                onFollow={toggleFollow}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}
