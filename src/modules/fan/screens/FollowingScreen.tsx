import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { getMyFollows, followNganya, unfollowNganya } from '@/lib/queries/follows'
import { searchNganyas } from '@/lib/queries/discover'
import { Sparkles } from 'lucide-react'
import { getLiveNow } from '@/lib/queries/live'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { toNganyaSlug } from '@/lib/formatters'

export default function FollowingScreen() {
    const navigate = useNavigate()
    const [followedNganyas, setFollowedNganyas] = useState<any[]>([])
    const [recommended, setRecommended] = useState<any[]>([])
    const [liveNganyas, setLiveNganyas] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const fetchFollowingData = async () => {
        setIsLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const hasSession = Boolean(session?.user?.id)
            setIsAuthenticated(hasSession)

            if (!hasSession) {
                setFollowedNganyas([])
                setRecommended([])
                setLiveNganyas([])
                return
            }

            const [myFollowsRes, allNganyas, activeLives] = await Promise.all([
                getMyFollows(),
                searchNganyas(''),
                getLiveNow(),
            ])

            setLiveNganyas(activeLives || [])

            const followedIds = new Set((myFollowsRes || []).map((follow: any) => follow.nganya_id))
            const mappedFollows = (myFollowsRes || []).map((follow: any) => ({
                ...follow.nganyas,
                is_following: true,
            }))

            setFollowedNganyas(mappedFollows)
            setRecommended((allNganyas || []).filter((nganya) => !followedIds.has(nganya.id)).slice(0, 4))
        } catch (error) {
            console.error('Failed to load following data', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchFollowingData()
    }, [])

    const mapSupabaseToCardProps = (dbNganya: any) => {
        if (!dbNganya) return null

        const isLive = liveNganyas.some((liveNganya) => liveNganya.nganya_id === dbNganya.id)

        return {
            id: dbNganya.nganya_id || dbNganya.id,
            slug: dbNganya.slug || dbNganya.nganya_slug || toNganyaSlug(dbNganya.nganya_name || dbNganya.name),
            name: dbNganya.nganya_name || dbNganya.name,
            corridor: dbNganya.corridor_name || dbNganya.corridors?.name || 'Unknown Route',
            vibeTags: dbNganya.vibeTags || dbNganya.tags || [],
            imageUrl:
                dbNganya.nganya_media?.[0]?.media_url ||
                dbNganya.image_url ||
                'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80',
            isLive,
            isNewBuild: dbNganya.tags?.includes('NEW_BUILD') || dbNganya.is_new_build,
            isVerified: dbNganya.is_verified,
            followers: dbNganya.follower_count || 0,
            sightingsToday: dbNganya.sighting_count_today || 0,
            lastSeen: isLive ? 'Live now' : 'Recently',
        }
    }

    const toggleFollow = async (id: string, currentlyFollowing: boolean) => {
        try {
            if (currentlyFollowing) {
                await unfollowNganya(id)
            } else {
                await followNganya(id)
            }
            await fetchFollowingData()
        } catch (error) {
            console.error('Follow update failed', error)
            navigate({ to: '/signin' })
        }
    }

    if (isLoading) {
        return (
            <div className="page-container py-12 flex justify-center">
                <div className="animate-pulse w-8 h-8 rounded-full bg-[var(--color-accent)]" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className="page-container pt-8 pb-12 md:pt-12 md:pb-16">
                <EmptyState
                    variant="no-following"
                    title="Sign in to follow nganyas"
                    message="Your real follow list is tied to your account. Sign in to save builds and get back to them fast."
                    actionLabel="Sign In"
                    onAction={() => navigate({ to: '/signin' })}
                />
            </div>
        )
    }

    return (
        <div className="page-container pt-8 pb-10 md:pt-12 md:pb-16 space-y-10 md:space-y-14">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-h1 mb-2">Following</h1>
                    <p className="text-body-sm text-[var(--color-text-secondary)]">
                        Your picks - {followedNganyas.length} nganya{followedNganyas.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <Button variant="primary" onClick={() => navigate({ to: '/' })}>
                    Plan a ride
                </Button>
            </div>

            {followedNganyas.length > 0 ? (
                <section>
                    <div className="grid-cards">
                        {followedNganyas.map((nganya) => {
                            const cardProps = mapSupabaseToCardProps(nganya)
                            if (!cardProps) return null

                            return (
                                <Card
                                    key={cardProps.id}
                                    nganya={cardProps as any}
                                    variant="standard"
                                    isFollowing
                                    onFollow={() => toggleFollow(cardProps.id, true)}
                                />
                            )
                        })}
                    </div>
                </section>
            ) : (
                <EmptyState
                    variant="no-following"
                    onAction={() => navigate({ to: '/discover' })}
                />
            )}

            {recommended.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-[var(--color-cyan)]" />
                        <h2 className="text-h3">Recommended for you</h2>
                    </div>
                    <div className="grid-cards">
                        {recommended.map((nganya) => {
                            const cardProps = mapSupabaseToCardProps(nganya)
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
