/**
 * Following Screen â€” Your followed nganyas + recommendations.
 * Shows followed picks and a recommended section.
 * Empty state when no nganyas are followed.
 */

import { useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { getMyFollows, followNganya, unfollowNganya } from '@/lib/queries/follows'
import { searchNganyas } from '@/lib/queries/discover'
import { Sparkles } from 'lucide-react'
import { getLiveNow } from '@/lib/queries/live'
import Button from '@/components/ui/Button'

export default function FollowingScreen() {
    const navigate = useNavigate()

    const [followedNganyas, setFollowedNganyas] = useState<any[]>([])
    const [recommended, setRecommended] = useState<any[]>([])
    const [liveNganyas, setLiveNganyas] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchFollowingData = async () => {
        setIsLoading(true)
        try {
            // Because no auth is actively implemented out-of-the-box (RLS fails on myFollows if logged out), 
            // we will gracefully degrade to simulated local view for this MVP preview if auth fails.
            const [myFollowsRes, allNganyas, activeLives] = await Promise.all([
                getMyFollows().catch(() => []),
                searchNganyas(''),
                getLiveNow()
            ])

            setLiveNganyas(activeLives || [])

            const followedIds = new Set(myFollowsRes.map((f: any) => f.nganya_id))

            // Map the resolved follows
            const mappedFollows = myFollowsRes.map((f: any) => ({
                ...f.nganyas,
                is_following: true
            }))

            setFollowedNganyas(mappedFollows)

            // Recommend anything not followed
            const recs = (allNganyas || []).filter(n => !followedIds.has(n.id)).slice(0, 4)
            setRecommended(recs)

        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchFollowingData()
    }, [])

    // Map Supabase models to the exact Card component props expectation
    const mapSupabaseToCardProps = (dbNganya: any) => {
        if (!dbNganya) return null;

        const isLive = liveNganyas.some(ln => ln.nganya_id === dbNganya.id) || dbNganya.status === 'LIVE';

        return {
            id: dbNganya.nganya_id || dbNganya.id,
            name: dbNganya.nganya_name || dbNganya.name,
            corridor: dbNganya.corridor_name || dbNganya.corridors?.name || 'Unknown Route',
            tags: dbNganya.tags || [],
            image: dbNganya.nganya_media?.[0]?.media_url || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80',
            isLive: isLive,
            isNewBuild: dbNganya.tags?.includes('NEW_BUILD'),
            isVerified: dbNganya.is_verified,
            stats: {
                rating: "4.8",
                reviews: 120,
                followers: "2.5k"
            }
        }
    }

    const toggleFollow = async (id: string, currentlyFollowing: boolean) => {
        try {
            if (currentlyFollowing) {
                await unfollowNganya(id)
            } else {
                await followNganya(id)
            }
            fetchFollowingData() // refresh lists
        } catch (e) {
            console.error("Auth required to edit real follows.", e)
            alert("Sign in required to follow real instances.")
        }
    }

    if (isLoading) {
        return <div className="page-container py-12 flex justify-center"><div className="animate-pulse w-8 h-8 rounded-full bg-[var(--color-accent)]"></div></div>
    }

    return (
        <div className="page-container pt-8 pb-10 md:pt-12 md:pb-16 space-y-10 md:space-y-14">

            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-h1 mb-2">Following</h1>
                    <p className="text-body-sm text-[var(--color-text-secondary)]">
                        Your picks Â· {followedNganyas.length} nganya{followedNganyas.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <Button variant="primary" onClick={() => navigate({ to: '/' })}>
                    Plan a ride
                </Button>
            </div>

            {/* â”€â”€â”€ Followed Nganyas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {followedNganyas.length > 0 ? (
                <section>
                    <div className="grid-cards">
                        {followedNganyas.map((n) => {
                            const cardProps = mapSupabaseToCardProps(n)
                            if (!cardProps) return null
                            return (
                                <Card
                                    key={cardProps.id}
                                    nganya={cardProps as any}
                                    variant="standard"
                                    isFollowing={true}
                                    onFollow={() => toggleFollow(cardProps.id, true)}
                                />
                            )
                        })}
                    </div>
                </section>
            ) : (
                <EmptyState
                    variant="no-following"
                    onAction={() => navigate({ to: '/' })}
                />
            )}

            {/* â”€â”€â”€ Recommended â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {recommended.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-[var(--color-cyan)]" />
                        <h2 className="text-h3">Recommended for you</h2>
                    </div>
                    <div className="grid-cards">
                        {recommended.map((n) => {
                            const cardProps = mapSupabaseToCardProps(n)
                            if (!cardProps) return null
                            return (
                                <Card
                                    key={cardProps.id}
                                    nganya={cardProps as any}
                                    variant="standard"
                                    isFollowing={false}
                                    onFollow={() => toggleFollow(cardProps.id, false)}
                                />
                            )
                        })}
                    </div>
                </section>
            )}
        </div>
    )
}


