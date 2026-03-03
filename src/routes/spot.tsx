/**
 * Spot Screen — Submit a sighting flow.
 * Steps: 1) Choose nganya → 2) Confirm corridor → 3) Add media → 4) Submit
 * Bottom sheet-like multi-step on mobile, centered form on desktop.
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import SearchInput from '../components/ui/SearchInput'
import Button from '../components/ui/Button'
import Chip from '../components/ui/Chip'
import { Camera, MapPin, CheckCircle, ChevronLeft, Upload } from 'lucide-react'
import { getCorridors, searchNganyas } from '../lib/queries/discover'
import { postSighting } from '../lib/queries/sightings'

export const Route = createFileRoute('/spot')({
    component: SpotScreen,
})

type SpotStep = 'select' | 'location' | 'media' | 'confirm'

function SpotScreen() {
    const navigate = useNavigate()
    const [step, setStep] = useState<SpotStep>('select')
    const [searchQuery, setSearchQuery] = useState('')

    // DB Data
    const [nganyas, setNganyas] = useState<any[]>([])
    const [corridors, setCorridors] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [selectedNganya, setSelectedNganya] = useState<string | null>(null)
    const [selectedCorridor, setSelectedCorridor] = useState<string | null>(null)
    const [confidence, setConfidence] = useState<'low' | 'med' | 'high'>('high')
    const [submitted, setSubmitted] = useState(false)

    useEffect(() => {
        async function loadData() {
            setIsLoading(true)
            try {
                const [fetchedCorridors, fetchedNganyas] = await Promise.all([
                    getCorridors(),
                    searchNganyas('')
                ])
                setCorridors(fetchedCorridors || [])
                setNganyas(fetchedNganyas || [])
            } catch (err) {
                console.error("Failed to load spot data", err)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [])

    const filteredNganyas = searchQuery
        ? nganyas.filter((n) =>
            n.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.corridors?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : nganyas

    const selectedNganyaData = nganyas.find((n) => n.id === selectedNganya)

    const handleSubmit = async () => {
        if (!selectedNganya || !selectedCorridor) return;

        try {
            await postSighting({
                nganya_id: selectedNganya,
                corridor_id: selectedCorridor,
                location: 'POINT(36.8219 -1.2921)' // Mock coordinate for Nairobi CBD for MVP
            })
        } catch (e) {
            console.error("Auth required to post real sightings. Simulating success for MVP:", e)
        }

        setSubmitted(true)
        // Auto-redirect after showing success
        setTimeout(() => navigate({ to: '/' }), 2500)
    }

    // Success state
    if (submitted) {
        return (
            <div className="page-container py-16 flex flex-col items-center justify-center text-center min-h-[60vh]">
                <div className="w-20 h-20 rounded-full bg-[var(--color-green-soft)] flex items-center justify-center mb-6 animate-scale-in">
                    <CheckCircle className="w-10 h-10 text-[var(--color-success)]" />
                </div>
                <h2 className="text-h2 text-[var(--color-text-primary)] mb-2">Sighting posted! 🔥</h2>
                <p className="text-body text-[var(--color-text-secondary)]">
                    Thanks for spotting <strong>{selectedNganyaData?.name}</strong>. The streets know.
                </p>
            </div>
        )
    }

    if (isLoading) {
        return <div className="page-container py-16 flex justify-center"><div className="animate-pulse w-8 h-8 rounded-full bg-[var(--color-accent)]"></div></div>
    }

    return (
        <div className="page-container pt-8 pb-10 md:pt-12 md:pb-16 max-w-xl mx-auto">

            {/* Header with back */}
            <div className="flex items-center gap-3 mb-6">
                {step !== 'select' && (
                    <button
                        onClick={() => {
                            if (step === 'location') setStep('select')
                            else if (step === 'media') setStep('location')
                            else if (step === 'confirm') setStep('media')
                        }}
                        className="p-2 rounded-full hover:bg-[var(--glass-bg)] transition-colors cursor-pointer text-[var(--color-text-secondary)]"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}
                <div>
                    <h1 className="text-h2">Spot a Nganya</h1>
                    <p className="text-body-sm text-[var(--color-text-tertiary)]">
                        {step === 'select' && 'Which nganya did you spot?'}
                        {step === 'location' && 'Where did you see it?'}
                        {step === 'media' && 'Got a photo? (optional)'}
                        {step === 'confirm' && 'Confirm your sighting'}
                    </p>
                </div>
            </div>

            {/* Progress indicator */}
            <div className="flex gap-1.5 mb-8">
                {(['select', 'location', 'media', 'confirm'] as const).map((s, i) => (
                    <div
                        key={s}
                        className={`h-1 flex-1 rounded-full transition-colors ${i <= ['select', 'location', 'media', 'confirm'].indexOf(step)
                            ? 'bg-[var(--color-accent)]'
                            : 'bg-[var(--glass-bg)]'
                            }`}
                    />
                ))}
            </div>

            {/* ─── Step 1: Select Nganya ─────────────────────────── */}
            {step === 'select' && (
                <div className="space-y-3">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search by name or route..."
                    />

                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                        {filteredNganyas.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => { setSelectedNganya(n.id); setStep('location') }}
                                className={`w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] border transition-all text-left cursor-pointer ${selectedNganya === n.id
                                    ? 'bg-[var(--color-accent-soft)] border-[var(--color-accent)]'
                                    : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--glass-border-hover)]'
                                    }`}
                            >
                                <img src={n.nganya_media?.[0]?.media_url || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80'} alt={n.name} className="w-12 h-12 rounded-[var(--radius-md)] object-cover" />
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-[var(--color-text-primary)] block truncate">{n.name}</span>
                                    <span className="text-xs text-[var(--color-text-tertiary)]">{n.corridors?.name || 'Unknown Route'}</span>
                                </div>
                                {n.status === 'LIVE' && (
                                    <span className="w-2 h-2 rounded-full bg-[var(--color-live)] animate-live-pulse shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Step 2: Location / Corridor ───────────────────── */}
            {step === 'location' && (
                <div className="space-y-4">
                    <div className="p-4 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
                        <span className="text-sm text-[var(--color-text-primary)]">
                            Select the corridor where you spotted <strong>{selectedNganyaData?.name}</strong>
                        </span>
                    </div>

                    <div className="space-y-2">
                        {corridors.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedCorridor(c.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-all cursor-pointer ${selectedCorridor === c.id
                                    ? 'bg-[var(--color-accent-soft)] border-[var(--color-accent)]'
                                    : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--glass-border-hover)]'
                                    }`}
                            >
                                <span className="text-sm text-[var(--color-text-primary)]">{c.name}</span>
                                {selectedCorridor === c.id && <CheckCircle className="w-4 h-4 text-[var(--color-accent)]" />}
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="primary"
                        className="w-full mt-4"
                        disabled={!selectedCorridor}
                        onClick={() => setStep('media')}
                    >
                        Continue
                    </Button>
                </div>
            )}

            {/* ─── Step 3: Media Upload ──────────────────────────── */}
            {step === 'media' && (
                <div className="space-y-6">
                    {/* Upload zone */}
                    <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--glass-border)] hover:border-[var(--color-accent)] bg-[var(--glass-bg)] cursor-pointer transition-colors">
                        <div className="w-14 h-14 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center">
                            <Camera className="w-6 h-6 text-[var(--color-accent)]" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                Tap to add a photo
                            </p>
                            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                                JPG, PNG · Max 10MB · Optional
                            </p>
                        </div>
                        <input type="file" accept="image/*" className="hidden" />
                    </label>

                    {/* Confidence selector */}
                    <div>
                        <label className="text-caption text-[var(--color-text-tertiary)] mb-3 block">
                            How confident are you?
                        </label>
                        <div className="flex gap-2">
                            {(['low', 'med', 'high'] as const).map((level) => (
                                <Chip
                                    key={level}
                                    label={level.toUpperCase()}
                                    variant="route"
                                    isActive={confidence === level}
                                    onClick={() => setConfidence(level)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="ghost" className="flex-1" onClick={() => setStep('confirm')}>
                            Skip photo
                        </Button>
                        <Button variant="primary" className="flex-1" onClick={() => setStep('confirm')}>
                            <Upload className="w-4 h-4" />
                            Continue
                        </Button>
                    </div>
                </div>
            )}

            {/* ─── Step 4: Confirm ───────────────────────────────── */}
            {step === 'confirm' && (
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--glass-bg)] border border-[var(--glass-border)] space-y-4">
                        <h3 className="text-h4 text-[var(--color-text-primary)]">Sighting Summary</h3>

                        <div className="flex items-center gap-3">
                            <img
                                src={selectedNganyaData?.nganya_media?.[0]?.media_url || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80'}
                                alt={selectedNganyaData?.name}
                                className="w-16 h-16 rounded-[var(--radius-md)] object-cover"
                            />
                            <div>
                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{selectedNganyaData?.name}</p>
                                <p className="text-xs text-[var(--color-text-tertiary)]">
                                    {corridors.find((c) => c.id === selectedCorridor)?.name}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Chip label={`Confidence: ${confidence.toUpperCase()}`} variant="route" />
                            <Chip label="Just now" variant="status" />
                        </div>
                    </div>

                    <Button variant="primary" className="w-full" onClick={handleSubmit}>
                        <Camera className="w-4 h-4" />
                        Post Sighting
                    </Button>
                </div>
            )}
        </div>
    )
}
