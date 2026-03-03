/**
 * Create Nganya Page — Submission form for new builds.
 * Allows users (crew/admins) to add a new nganya to the directory.
 */

import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import Button from '../components/ui/Button'
import { getCorridors, createNganya } from '../lib/queries/discover'
import { ChevronLeft, Camera, Plus, X } from 'lucide-react'
import { vibeTagColors } from '../lib/mockData'

export const Route = createFileRoute('/create-nganya')({
    component: CreateNganyaScreen,
})

function CreateNganyaScreen() {
    const navigate = useNavigate()
    const [corridors, setCorridors] = useState<any[]>([])
    const [isLoadingCorridors, setIsLoadingCorridors] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [name, setName] = useState('')
    const [corridorId, setCorridorId] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [tagInput, setTagInput] = useState('')
    const [selectedTags, setSelectedTags] = useState<string[]>([])

    useEffect(() => {
        async function loadCorridors() {
            try {
                const data = await getCorridors()
                setCorridors(data || [])
                if (data && data.length > 0) {
                    setCorridorId(data[0].id)
                }
            } catch (err) {
                console.error("Failed to load corridors", err)
            } finally {
                setIsLoadingCorridors(false)
            }
        }
        loadCorridors()
    }, [])

    const handleAddTag = () => {
        const tag = tagInput.trim().toUpperCase()
        if (tag && !selectedTags.includes(tag)) {
            setSelectedTags([...selectedTags, tag])
            setTagInput('')
        }
    }

    const handleRemoveTag = (tagToRemove: string) => {
        setSelectedTags(selectedTags.filter(t => t !== tagToRemove))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !corridorId) {
            setError("Please fill in the name and select a corridor.")
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            await createNganya({
                name,
                corridor_id: corridorId,
                tags: selectedTags,
                imageUrl: imageUrl || undefined
            })
            // Redirect to discover or home
            navigate({ to: '/' })
        } catch (err: any) {
            console.error("Failed to create nganya", err)
            setError(err.message || "An unexpected error occurred.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const availableTags = Object.keys(vibeTagColors)

    return (
        <div className="page-container py-8 md:py-12 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link to="/" className="p-2 rounded-full hover:bg-[var(--glass-bg)] transition-colors">
                    <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
                </Link>
                <h1 className="text-h2">Create New Nganya</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
                {/* Form Body */}
                <div className="space-y-6 p-6 rounded-[var(--radius-lg)] bg-[var(--glass-bg)] border border-[var(--glass-border)]">

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                            Nganya Name <span className="text-[var(--color-accent)]">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Money Fest"
                            className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--glass-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] transition-all"
                            required
                        />
                    </div>

                    {/* Corridor */}
                    <div>
                        <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                            Route / Corridor <span className="text-[var(--color-accent)]">*</span>
                        </label>
                        <select
                            value={corridorId}
                            onChange={(e) => setCorridorId(e.target.value)}
                            className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--glass-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-all"
                            disabled={isLoadingCorridors}
                            required
                        >
                            {corridors.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Image URL */}
                    <div>
                        <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                            Image URL
                        </label>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                                    <Camera className="w-4 h-4" />
                                </span>
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full pl-11 pr-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--glass-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-all"
                                />
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
                            Provide a direct link to an image (Unsplash, Imgur, etc.)
                        </p>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                            Vibe Tags
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                placeholder="Add custom tag..."
                                className="flex-1 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--glass-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-all text-sm"
                            />
                            <Button type="button" variant="secondary" size="sm" onClick={handleAddTag}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Selected Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {selectedTags.map((tag) => (
                                <span
                                    key={tag}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] text-xs font-bold uppercase tracking-wider"
                                >
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTag(tag)}
                                        className="hover:text-white transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>

                        {/* Quick Suggestions */}
                        <div className="space-y-2">
                            <p className="text-[10px] uppercase font-bold text-[var(--color-text-tertiary)] tracking-widest">Suggestions</p>
                            <div className="flex flex-wrap gap-1.5">
                                {availableTags.filter(t => !selectedTags.includes(t)).map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => setSelectedTags([...selectedTags, tag])}
                                        className="px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--glass-border)] text-[var(--color-text-tertiary)] text-[10px] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
                                    >
                                        + {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-4">
                    <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => navigate({ to: '/' })}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        className="flex-1"
                        isLoading={isSubmitting}
                    >
                        Create Nganya
                    </Button>
                </div>
            </form>
        </div>
    )
}
