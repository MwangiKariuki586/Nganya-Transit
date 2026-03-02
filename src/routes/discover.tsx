/**
 * Discover Screen — Search, filters, and card grid.
 * Desktop: persistent sidebar filters. Mobile: horizontal chip scroll.
 */

import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import SearchInput from '../components/ui/SearchInput'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import EmptyState from '../components/ui/EmptyState'
import { nganyas, corridors, vibeTagColors } from '../lib/mockData'
import { SlidersHorizontal } from 'lucide-react'

export const Route = createFileRoute('/discover')({
    component: DiscoverScreen,
})

const allVibeTags = Object.keys(vibeTagColors)

function DiscoverScreen() {
    const [search, setSearch] = useState('')
    const [activeCorridor, setActiveCorridor] = useState<string | null>(null)
    const [activeVibe, setActiveVibe] = useState<string | null>(null)
    const [following, setFollowing] = useState<Set<string>>(new Set())

    const filtered = useMemo(() => {
        return nganyas.filter((n) => {
            const matchesSearch = !search ||
                n.name.toLowerCase().includes(search.toLowerCase()) ||
                n.corridor.toLowerCase().includes(search.toLowerCase()) ||
                n.vibeTags.some((t) => t.toLowerCase().includes(search.toLowerCase()))

            const matchesCorridor = !activeCorridor ||
                corridors.find((c) => c.id === activeCorridor)?.name === n.corridor

            const matchesVibe = !activeVibe ||
                n.vibeTags.includes(activeVibe)

            return matchesSearch && matchesCorridor && matchesVibe
        })
    }, [search, activeCorridor, activeVibe])

    const toggleFollow = (id: string) => {
        setFollowing((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const clearFilters = () => {
        setSearch('')
        setActiveCorridor(null)
        setActiveVibe(null)
    }

    return (
        <div className="page-container pt-8 pb-10 md:pt-12 md:pb-16">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-h1 mb-2">Discover</h1>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                    Find nganyas by name, route, or vibe
                </p>
            </div>

            {/* Layout: sidebar on desktop, stacked on mobile */}
            <div className="flex gap-8">

                {/* ─── Desktop Sidebar Filters ────────────────────── */}
                <aside className="hidden lg:block w-60 shrink-0 space-y-6">
                    <div>
                        <h3 className="text-caption text-[var(--color-text-tertiary)] mb-3">
                            <SlidersHorizontal className="w-3 h-3 inline mr-1" />
                            Corridors
                        </h3>
                        <div className="space-y-1.5">
                            {corridors.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setActiveCorridor(activeCorridor === c.id ? null : c.id)}
                                    className={`w-full text-left px-3 py-2 rounded-[var(--radius-md)] text-sm transition-all cursor-pointer ${activeCorridor === c.id
                                        ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)]'
                                        }`}
                                >
                                    <span>{c.name}</span>
                                    <span className="float-right text-xs opacity-60">{c.nganyaCount}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-[var(--color-line)] pt-6">
                        <h3 className="text-caption text-[var(--color-text-tertiary)] mb-3">Vibe Tags</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {allVibeTags.map((tag) => (
                                <Chip
                                    key={tag}
                                    label={tag}
                                    variant="vibe"
                                    color={activeVibe === tag ? vibeTagColors[tag] : undefined}
                                    onClick={() => setActiveVibe(activeVibe === tag ? null : tag)}
                                />
                            ))}
                        </div>
                    </div>
                </aside>

                {/* ─── Main Content ───────────────────────────────── */}
                <div className="flex-1 min-w-0">
                    {/* Search */}
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        className="mb-4"
                    />

                    {/* Mobile filters — horizontal scroll */}
                    <div className="lg:hidden flex gap-2 overflow-x-auto scroll-hidden pb-3 mb-4 -mx-5 px-5">
                        <Chip
                            label="All Routes"
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

                    {/* Mobile vibe filter */}
                    <div className="lg:hidden flex gap-2 overflow-x-auto scroll-hidden pb-3 mb-4 -mx-5 px-5">
                        {allVibeTags.map((tag) => (
                            <Chip
                                key={tag}
                                label={tag}
                                variant="vibe"
                                color={activeVibe === tag ? vibeTagColors[tag] : undefined}
                                onClick={() => setActiveVibe(activeVibe === tag ? null : tag)}
                            />
                        ))}
                    </div>

                    {/* Results count */}
                    <p className="text-body-sm text-[var(--color-text-tertiary)] mb-4">
                        {filtered.length} nganya{filtered.length !== 1 ? 's' : ''} found
                    </p>

                    {/* Grid of cards */}
                    {filtered.length > 0 ? (
                        <div className="grid-cards">
                            {filtered.map((n) => (
                                <Card
                                    key={n.id}
                                    nganya={n}
                                    variant="standard"
                                    isFollowing={following.has(n.id)}
                                    onFollow={toggleFollow}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            variant="no-results"
                            onAction={clearFilters}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
