/**
 * Profile Screen — User profile view + edit.
 * Shows avatar, stats, activity. Edit via bottom sheet (mobile) or modal (desktop).
 */

import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '../components/ui/Button'
import BottomSheet from '../components/ui/BottomSheet'
import Modal from '../components/ui/Modal'
import Card from '../components/ui/Card'
import { currentUser, nganyas, recentSightings } from '../lib/mockData'
import { Settings, Camera, Eye, Heart, Calendar, MapPin, Clock } from 'lucide-react'
import ConfidenceBadge from '../components/ui/ConfidenceBadge'

export const Route = createFileRoute('/profile')({
    component: ProfileScreen,
})

function ProfileScreen() {
    const [editOpen, setEditOpen] = useState(false)
    const [following] = useState<Set<string>>(new Set(['1', '2', '6']))

    // Determine if mobile for sheet vs modal
    const useSheet = typeof window !== 'undefined' && window.innerWidth < 768

    const userSightings = recentSightings.filter((s) => s.spottedBy === currentUser.username)
    const followedNganyas = nganyas.filter((n) => following.has(n.id))

    return (
        <div className="page-container pt-8 pb-10 md:pt-12 md:pb-16 space-y-10">

            {/* ─── Profile Header ───────────────────────────────── */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
                {/* Avatar */}
                <div className="relative">
                    <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.displayName}
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-[var(--glass-border)]"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center border-2 border-[var(--color-bg-base)]">
                        <Camera className="w-3 h-3 text-white" />
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-h2 text-[var(--color-text-primary)]">{currentUser.displayName}</h1>
                    <p className="text-body-sm text-[var(--color-text-secondary)] mb-1">{currentUser.username}</p>
                    <p className="text-body-sm text-[var(--color-text-tertiary)] mb-4">{currentUser.bio}</p>

                    {/* Stats */}
                    <div className="flex items-center justify-center md:justify-start gap-6">
                        <div className="text-center">
                            <span className="text-h4 text-[var(--color-text-primary)] block">{currentUser.sightingsCount}</span>
                            <span className="text-caption text-[var(--color-text-tertiary)]">Sightings</span>
                        </div>
                        <div className="w-px h-8 bg-[var(--color-line)]" />
                        <div className="text-center">
                            <span className="text-h4 text-[var(--color-text-primary)] block">{currentUser.followingCount}</span>
                            <span className="text-caption text-[var(--color-text-tertiary)]">Following</span>
                        </div>
                        <div className="w-px h-8 bg-[var(--color-line)]" />
                        <div className="text-center">
                            <span className="text-h4 text-[var(--color-text-primary)] block flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {currentUser.joinedDate}
                            </span>
                            <span className="text-caption text-[var(--color-text-tertiary)]">Joined</span>
                        </div>
                    </div>
                </div>

                {/* Edit button */}
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                    <Settings className="w-4 h-4" />
                    Edit Profile
                </Button>
            </div>

            {/* ─── Recent Activity ──────────────────────────────── */}
            <section>
                <h2 className="text-h3 mb-4">Your Sightings</h2>
                {userSightings.length > 0 ? (
                    <div className="space-y-2">
                        {userSightings.map((s) => (
                            <div
                                key={s.id}
                                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                            >
                                <Camera className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">{s.nganyaName}</span>
                                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                                        <MapPin className="w-3 h-3" />
                                        <span>{s.corridor}</span>
                                        <span>·</span>
                                        <Clock className="w-3 h-3" />
                                        <span>{s.time}</span>
                                    </div>
                                </div>
                                <ConfidenceBadge level={s.confidence} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-[var(--color-text-tertiary)] text-body-sm">
                        No sightings yet. Go spot some nganyas! 🔥
                    </div>
                )}
            </section>

            {/* ─── Following ────────────────────────────────────── */}
            <section>
                <h2 className="text-h3 mb-4">Following</h2>
                <div className="space-y-2">
                    {followedNganyas.map((n) => (
                        <Card key={n.id} nganya={n} variant="compact" isFollowing={true} />
                    ))}
                </div>
            </section>

            {/* ─── Edit Profile Sheet/Modal ─────────────────────── */}
            {useSheet ? (
                <BottomSheet isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
                    <EditProfileForm onClose={() => setEditOpen(false)} />
                </BottomSheet>
            ) : (
                <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
                    <EditProfileForm onClose={() => setEditOpen(false)} />
                </Modal>
            )}
        </div>
    )
}

/* ─── Edit Profile Form ─────────────────────────────────── */
function EditProfileForm({ onClose }: { onClose: () => void }) {
    return (
        <div className="space-y-5">
            {/* Avatar change */}
            <div className="flex items-center gap-4">
                <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    className="w-16 h-16 rounded-full"
                />
                <Button variant="secondary" size="sm">
                    <Camera className="w-3.5 h-3.5" />
                    Change photo
                </Button>
            </div>

            {/* Form fields */}
            <div className="space-y-4">
                <div>
                    <label className="text-caption text-[var(--color-text-tertiary)] mb-1.5 block">Display Name</label>
                    <input
                        type="text"
                        defaultValue={currentUser.displayName}
                        className="w-full px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] transition-all"
                    />
                </div>
                <div>
                    <label className="text-caption text-[var(--color-text-tertiary)] mb-1.5 block">Username</label>
                    <input
                        type="text"
                        defaultValue={currentUser.username}
                        className="w-full px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] transition-all"
                    />
                </div>
                <div>
                    <label className="text-caption text-[var(--color-text-tertiary)] mb-1.5 block">Bio</label>
                    <textarea
                        defaultValue={currentUser.bio}
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--color-text-primary)] resize-none focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] transition-all"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="primary" className="flex-1" onClick={onClose}>
                    Save Changes
                </Button>
            </div>
        </div>
    )
}
