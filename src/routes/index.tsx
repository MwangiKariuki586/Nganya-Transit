/**
 * Home / Feed Screen — The landing page.
 * Sections: Hero, Live Now (horizontal scroll), Featured build,
 * Routes/Corridors filter, and vertical feed of nganyas.
 */

import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import LiveBadge from '../components/ui/LiveBadge'
import { nganyas, corridors, recentSightings, vibeTagColors } from '../lib/mockData'
import { Clock, Eye, TrendingUp, ChevronRight } from 'lucide-react'
import ConfidenceBadge from '../components/ui/ConfidenceBadge'

export const Route = createFileRoute('/')({
  component: HomeScreen,
})

function HomeScreen() {
  const [activeCorridor, setActiveCorridor] = useState<string | null>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())

  const liveNganyas = nganyas.filter((n) => n.isLive)
  const featuredNganya = nganyas.find((n) => n.isNewBuild) ?? nganyas[0]

  const filteredNganyas = activeCorridor
    ? nganyas.filter((n) => corridors.find((c) => c.id === activeCorridor)?.name === n.corridor)
    : nganyas

  const toggleFollow = (id: string) => {
    setFollowing((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="page-container pt-8 pb-10 md:pt-12 md:pb-16 space-y-10 md:space-y-14">

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
          {liveNganyas.map((n) => (
            <div key={n.id} className="shrink-0 w-[260px] md:w-[300px]">
              <Card
                nganya={n}
                variant="standard"
                isFollowing={following.has(n.id)}
                onFollow={toggleFollow}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ─── Featured Build ───────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[var(--color-green)]" />
          <span className="text-tag text-[var(--color-green)]">Featured</span>
        </div>
        <Card
          nganya={featuredNganya}
          variant="feature"
          isFollowing={following.has(featuredNganya.id)}
          onFollow={toggleFollow}
        />
      </section>

      {/* ─── Recent Sightings ─────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">Recently Spotted</h2>
          <button className="flex items-center gap-1 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors cursor-pointer">
            See all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {recentSightings.slice(0, 4).map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{s.nganyaName}</span>
                  <ConfidenceBadge level={s.confidence} />
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                  <span>{s.corridor}</span>
                  <span>·</span>
                  <span>{s.spottedBy}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] shrink-0">
                <Clock className="w-3 h-3" />
                {s.time}
              </div>
              {s.hasMedia && (
                <Eye className="w-3.5 h-3.5 text-[var(--color-cyan)] shrink-0" />
              )}
            </div>
          ))}
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
              label={c.shortName}
              variant="route"
              isActive={activeCorridor === c.id}
              onClick={() => setActiveCorridor(activeCorridor === c.id ? null : c.id)}
            />
          ))}
        </div>

        {/* Card grid */}
        <div className="grid-cards">
          {filteredNganyas.map((n) => (
            <Card
              key={n.id}
              nganya={n}
              variant="standard"
              isFollowing={following.has(n.id)}
              onFollow={toggleFollow}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
