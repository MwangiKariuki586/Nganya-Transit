/**
 * Following Screen — Your followed nganyas + recommendations.
 * Shows followed picks and a recommended section.
 * Empty state when no nganyas are followed.
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { nganyas } from '../lib/mockData'
import { Sparkles } from 'lucide-react'

export const Route = createFileRoute('/following')({
    component: FollowingScreen,
})

function FollowingScreen() {
    const navigate = useNavigate()

    // Simulate some followed nganyas (first 3) for prototype
    const [following, setFollowing] = useState<Set<string>>(
        new Set(['1', '2', '6'])
    )

    const followedNganyas = nganyas.filter((n) => following.has(n.id))
    const recommended = nganyas.filter((n) => !following.has(n.id)).slice(0, 4)

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

            {/* Header */}
            <div>
                <h1 className="text-h1 mb-2">Following</h1>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                    Your picks · {followedNganyas.length} nganya{followedNganyas.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* ─── Followed Nganyas ─────────────────────────────── */}
            {followedNganyas.length > 0 ? (
                <section>
                    <div className="grid-cards">
                        {followedNganyas.map((n) => (
                            <Card
                                key={n.id}
                                nganya={n}
                                variant="standard"
                                isFollowing={true}
                                onFollow={toggleFollow}
                            />
                        ))}
                    </div>
                </section>
            ) : (
                <EmptyState
                    variant="no-following"
                    onAction={() => navigate({ to: '/' })}
                />
            )}

            {/* ─── Recommended ──────────────────────────────────── */}
            {recommended.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-[var(--color-cyan)]" />
                        <h2 className="text-h3">Recommended for you</h2>
                    </div>
                    <div className="grid-cards">
                        {recommended.map((n) => (
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
            )}
        </div>
    )
}
