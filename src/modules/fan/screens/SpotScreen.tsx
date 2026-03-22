import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import SearchInput from '@/components/ui/SearchInput'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import EmptyState from '@/components/ui/EmptyState'
import { Camera, MapPin, CheckCircle, ChevronLeft, Upload, Navigation } from 'lucide-react'
import { getCorridors, searchNganyas } from '@/lib/queries/discover'
import { postSighting } from '@/lib/queries/sightings'
import { supabase } from '@/lib/supabase'

type SpotStep = 'select' | 'location' | 'media' | 'confirm'

function getCurrentCoordinates(): Promise<{ latitude: number, longitude: number }> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not available in this browser.'))
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) =>
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                }),
            () => reject(new Error('Allow location access to post a real sighting.')),
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            },
        )
    })
}

export default function SpotScreen() {
    const navigate = useNavigate()
    const [step, setStep] = useState<SpotStep>('select')
    const [searchQuery, setSearchQuery] = useState('')
    const [nganyas, setNganyas] = useState<any[]>([])
    const [corridors, setCorridors] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [selectedNganya, setSelectedNganya] = useState<string | null>(null)
    const [selectedCorridor, setSelectedCorridor] = useState<string | null>(null)
    const [confidence, setConfidence] = useState<'low' | 'med' | 'high'>('high')
    const [direction, setDirection] = useState('')
    const [note, setNote] = useState('')
    const [selectedPhotoName, setSelectedPhotoName] = useState<string | null>(null)
    const [submitted, setSubmitted] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        async function loadData() {
            setIsLoading(true)
            try {
                const [{ data: { session } }, fetchedCorridors, fetchedNganyas] = await Promise.all([
                    supabase.auth.getSession(),
                    getCorridors(),
                    searchNganyas(''),
                ])

                setIsAuthenticated(Boolean(session?.user?.id))
                setCorridors(fetchedCorridors || [])
                setNganyas(fetchedNganyas || [])
            } catch (error) {
                console.error('Failed to load spot data', error)
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [])

    const filteredNganyas = searchQuery
        ? nganyas.filter((nganya) =>
            nganya.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            nganya.corridors?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        : nganyas

    const selectedNganyaData = nganyas.find((nganya) => nganya.id === selectedNganya)

    const handleSubmit = async () => {
        if (!selectedNganya || !selectedCorridor) return

        setIsSubmitting(true)
        setSubmitError(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user?.id) {
                navigate({ to: '/signin' })
                return
            }

            const coordinates = await getCurrentCoordinates()

            await postSighting({
                nganya_id: selectedNganya,
                corridor_id: selectedCorridor,
                location: `POINT(${coordinates.longitude} ${coordinates.latitude})`,
                direction: direction.trim() || undefined,
                note: note.trim() || undefined,
            })

            setSubmitted(true)
            setTimeout(() => navigate({ to: '/' }), 2500)
        } catch (error: any) {
            console.error('Failed to submit sighting', error)
            setSubmitError(error?.message || 'Failed to post sighting.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <div className="page-container py-16 flex flex-col items-center justify-center text-center min-h-[60vh]">
                <div className="w-20 h-20 rounded-full bg-[var(--color-green-soft)] flex items-center justify-center mb-6 animate-scale-in">
                    <CheckCircle className="w-10 h-10 text-[var(--color-success)]" />
                </div>
                <h2 className="text-h2 text-[var(--color-text-primary)] mb-2">Sighting posted</h2>
                <p className="text-body text-[var(--color-text-secondary)]">
                    Thanks for spotting <strong>{selectedNganyaData?.name}</strong>. The feed is live.
                </p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="page-container py-16 flex justify-center">
                <div className="animate-pulse w-8 h-8 rounded-full bg-[var(--color-accent)]" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className="page-container pt-8 pb-12 md:pt-12 md:pb-16">
                <EmptyState
                    variant="no-following"
                    title="Sign in to post sightings"
                    message="Community sightings are tied to your account and real location permission. Sign in first, then post."
                    actionLabel="Sign In"
                    onAction={() => navigate({ to: '/signin' })}
                />
            </div>
        )
    }

    return (
        <div className="page-container pt-8 pb-10 md:pt-12 md:pb-16 max-w-xl mx-auto">
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
                        {step === 'location' && 'Which corridor and direction?'}
                        {step === 'media' && 'Add context before you post'}
                        {step === 'confirm' && 'Confirm and send it live'}
                    </p>
                </div>
            </div>

            <div className="flex gap-1.5 mb-8">
                {(['select', 'location', 'media', 'confirm'] as const).map((currentStep, index) => (
                    <div
                        key={currentStep}
                        className={`h-1 flex-1 rounded-full transition-colors ${index <= ['select', 'location', 'media', 'confirm'].indexOf(step)
                            ? 'bg-[var(--color-accent)]'
                            : 'bg-[var(--glass-bg)]'
                            }`}
                    />
                ))}
            </div>

            {step === 'select' && (
                <div className="space-y-3">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search by name or route..."
                    />

                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                        {filteredNganyas.map((nganya) => (
                            <button
                                key={nganya.id}
                                onClick={() => {
                                    setSelectedNganya(nganya.id)
                                    setStep('location')
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] border transition-all text-left cursor-pointer ${selectedNganya === nganya.id
                                    ? 'bg-[var(--color-accent-soft)] border-[var(--color-accent)]'
                                    : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--glass-border-hover)]'
                                    }`}
                            >
                                <img
                                    src={nganya.nganya_media?.[0]?.media_url || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80'}
                                    alt={nganya.name}
                                    className="w-12 h-12 rounded-[var(--radius-md)] object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-[var(--color-text-primary)] block truncate">{nganya.name}</span>
                                    <span className="text-xs text-[var(--color-text-tertiary)]">{nganya.corridors?.name || 'Unknown Route'}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 'location' && (
                <div className="space-y-4">
                    <div className="p-4 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-start gap-3">
                        <Navigation className="w-5 h-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
                        <div className="text-sm text-[var(--color-text-primary)]">
                            <div className="font-medium mb-1">We will use your current device location when you post.</div>
                            <div className="text-[var(--color-text-tertiary)]">
                                Choose the corridor now. On submit, MATWANA asks for live location permission instead of faking coordinates.
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {corridors.map((corridor) => (
                            <button
                                key={corridor.id}
                                onClick={() => setSelectedCorridor(corridor.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-all cursor-pointer ${selectedCorridor === corridor.id
                                    ? 'bg-[var(--color-accent-soft)] border-[var(--color-accent)]'
                                    : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--glass-border-hover)]'
                                    }`}
                            >
                                <span className="text-sm text-[var(--color-text-primary)]">{corridor.name}</span>
                                {selectedCorridor === corridor.id && <CheckCircle className="w-4 h-4 text-[var(--color-accent)]" />}
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="text-caption text-[var(--color-text-tertiary)] mb-1.5 block">Direction (optional)</label>
                        <input
                            type="text"
                            value={direction}
                            onChange={(event) => setDirection(event.target.value)}
                            placeholder="CBD bound, Rongai side, outbound..."
                            className="w-full px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] transition-all"
                        />
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

            {step === 'media' && (
                <div className="space-y-6">
                    <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--glass-border)] hover:border-[var(--color-accent)] bg-[var(--glass-bg)] cursor-pointer transition-colors">
                        <div className="w-14 h-14 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center">
                            <Camera className="w-6 h-6 text-[var(--color-accent)]" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">Tap to attach a photo</p>
                            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                                Storage upload is still pending. File stays local for now.
                            </p>
                            {selectedPhotoName && (
                                <p className="text-xs text-[var(--color-accent)] mt-2">{selectedPhotoName}</p>
                            )}
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => setSelectedPhotoName(event.target.files?.[0]?.name || null)}
                        />
                    </label>

                    <div>
                        <label className="text-caption text-[var(--color-text-tertiary)] mb-1.5 block">Quick note (optional)</label>
                        <textarea
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            rows={4}
                            placeholder="What stood out? Sound system, stage, colorway, crowd?"
                            className="w-full px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--color-text-primary)] resize-none focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-caption text-[var(--color-text-tertiary)] mb-3 block">
                            Confidence
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

            {step === 'confirm' && (
                <div className="space-y-6">
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
                                    {corridors.find((corridor) => corridor.id === selectedCorridor)?.name}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            <Chip label={`Confidence: ${confidence.toUpperCase()}`} variant="route" />
                            {direction && <Chip label={direction} variant="route" />}
                            <Chip label="Live location on submit" variant="status" />
                        </div>

                        {note && (
                            <p className="text-sm text-[var(--color-text-secondary)] border-t border-[var(--glass-border)] pt-4">
                                {note}
                            </p>
                        )}
                    </div>

                    {submitError && (
                        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-md)] px-3 py-2">
                            {submitError}
                        </div>
                    )}

                    <Button variant="primary" className="w-full" onClick={handleSubmit} isLoading={isSubmitting}>
                        <MapPin className="w-4 h-4" />
                        Post Sighting
                    </Button>
                </div>
            )}
        </div>
    )
}
