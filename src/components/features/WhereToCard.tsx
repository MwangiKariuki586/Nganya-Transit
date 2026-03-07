import { useEffect, useState } from 'react'
import StagePicker from './StagePicker'
import DestinationPicker from './DestinationPicker'
import SpecificNganyaPicker from './SpecificNganyaPicker'
import SearchResultsOverlay from './SearchResultsOverlay'
import Chip from '../ui/Chip'
import Button from '../ui/Button'
import { MapPin, Navigation, BusFront, ChevronDown } from 'lucide-react'

export interface RideSearchPayload {
    fromStage: { id: string, name: string }
    toPlace: { id: string, name: string, corridor_id?: string }
    preference: 'ANY' | 'NEWEST' | 'SPECIFIC'
    preferredNganya: { id: string, name: string } | null
}

interface WhereToCardProps {
    onCorridorChange?: (corridorId: string | null, corridorName?: string | null) => void
    onSearch?: (payload: RideSearchPayload) => void
    onClear?: () => void
}

export default function WhereToCard({ onCorridorChange, onSearch, onClear }: WhereToCardProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [isCompact, setIsCompact] = useState(false)

    // Pickers state
    const [isStagePickerOpen, setStagePickerOpen] = useState(false)
    const [isDestPickerOpen, setDestPickerOpen] = useState(false)
    const [isSpecificPickerOpen, setSpecificPickerOpen] = useState(false)
    const [isResultsOpen, setResultsOpen] = useState(false)

    // Form state
    const [toPlace, setToPlace] = useState<{ id: string, name: string, corridor_id?: string } | null>(null)
    const [fromStage, setFromStage] = useState<{ id: string, name: string } | null>(null)
    const [preference, setPreference] = useState<'ANY' | 'NEWEST' | 'SPECIFIC'>('ANY')
    const [preferredNganya, setPreferredNganya] = useState<{ id: string, name: string } | null>(null)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (isMobile && toPlace && fromStage) {
            setIsCompact(true)
        }
    }, [isMobile, toPlace?.id, fromStage?.id])

    const handlePreferenceSelect = (val: 'ANY' | 'NEWEST' | 'SPECIFIC') => {
        setPreference(val)
        if (val !== 'SPECIFIC') {
            setPreferredNganya(null)
        }
        if (val === 'SPECIFIC' && toPlace && fromStage) {
            setSpecificPickerOpen(true)
        }
    }

    const handleClear = () => {
        setToPlace(null)
        setFromStage(null)
        setPreferredNganya(null)
        setPreference('ANY')
        setIsCompact(false)
        setResultsOpen(false)
        onCorridorChange?.(null, null)
        onClear?.()
    }

    const handleSearch = () => {
        if (!fromStage || !toPlace) return

        const payload: RideSearchPayload = {
            fromStage,
            toPlace,
            preference,
            preferredNganya
        }
        console.log('Analytics: ride_search_started', { from: fromStage.id, to: toPlace.id, preference })

        if (onSearch) {
            onSearch(payload)
            if (isMobile) {
                setIsCompact(true)
            }
            return
        }

        setResultsOpen(true)
    }

    const canSearch = fromStage !== null && toPlace !== null
    const summaryText = `${toPlace?.name || 'Route'} • ${fromStage?.name || 'Stage'} • ${preference === 'SPECIFIC'
        ? `Specific: ${preferredNganya?.name || 'Pick'}`
        : preference === 'NEWEST' ? 'Newest' : 'Any'
        }`

    if (isMobile && isCompact && toPlace && fromStage) {
        return (
            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4 md:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm text-[var(--color-text-primary)] font-medium truncate">{summaryText}</p>
                    <button
                        type="button"
                        onClick={() => setIsCompact(false)}
                        className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors shrink-0"
                    >
                        Edit
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="primary" className="flex-1" disabled={!canSearch} onClick={handleSearch}>
                        Find my ride
                    </Button>
                    <Button variant="ghost" className="shrink-0" onClick={handleClear}>
                        Clear
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4 md:p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-h3 flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-[var(--color-accent)]" />
                        Plan your ride
                    </h2>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        Pick terminal route first, then pickup stage.
                    </p>
                </div>
                {(toPlace || fromStage || preferredNganya || preference !== 'ANY') && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex flex-col gap-3">
                    <button
                        type="button"
                        onClick={() => setDestPickerOpen(true)}
                        className="w-full flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-body)] border border-[var(--color-line)] hover:border-[var(--color-accent-soft)] transition-colors text-left"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-2 h-2 rounded-full shrink-0 bg-[var(--color-accent)] ml-1 mr-1" />
                            <span className={`truncate ${toPlace ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-tertiary)]'}`}>
                                {toPlace ? toPlace.name : '1. Route / headed to'}
                            </span>
                        </div>
                        <ChevronDown className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)]" />
                    </button>

                    <button
                        type="button"
                        onClick={() => setStagePickerOpen(true)}
                        disabled={!toPlace}
                        className={`w-full flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-colors text-left ${!toPlace ? 'bg-[var(--glass-bg)] border-[var(--color-line)] opacity-50 cursor-not-allowed' : 'bg-[var(--color-bg-body)] border-[var(--color-line)] hover:border-[var(--color-accent-soft)]'}`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <MapPin className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)]" />
                            <span className={`truncate ${fromStage ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-tertiary)]'}`}>
                                {fromStage ? fromStage.name : '2. Pickup stage on this route'}
                            </span>
                        </div>
                        <ChevronDown className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)]" />
                    </button>

                    {preference === 'SPECIFIC' && (
                        <button
                            type="button"
                            onClick={() => setSpecificPickerOpen(true)}
                            disabled={!fromStage || !toPlace}
                            className={`w-full flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-colors text-left ${(!fromStage || !toPlace)
                                ? 'bg-[var(--glass-bg)] border-[var(--color-line)] opacity-50 cursor-not-allowed'
                                : 'bg-[var(--color-bg-body)] border-[var(--color-line)] hover:border-[var(--color-accent-soft)]'
                                }`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <BusFront className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)]" />
                                <span className={`truncate ${preferredNganya ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-tertiary)]'}`}>
                                    {preferredNganya ? preferredNganya.name : '3. Specific nganya (optional)'}
                                </span>
                            </div>
                            <ChevronDown className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)]" />
                        </button>
                    )}
                </div>

                <div>
                    <p className="text-xs text-[var(--color-text-tertiary)] mb-2 uppercase tracking-wider font-semibold">Preference</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Chip label="Any" variant="route" isActive={preference === 'ANY'} onClick={() => handlePreferenceSelect('ANY')} />
                        <Chip
                            label="Newest"
                            variant="vibe"
                            isActive={preference === 'NEWEST'}
                            color={preference === 'NEWEST' ? 'var(--color-accent)' : undefined}
                            onClick={() => handlePreferenceSelect('NEWEST')}
                        />
                        <button
                            type="button"
                            onClick={() => handlePreferenceSelect('SPECIFIC')}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 border ${preference === 'SPECIFIC'
                                ? 'bg-[var(--glass-bg)] border-[var(--color-green)] text-[var(--color-green)]'
                                : 'bg-transparent border-[var(--color-line)] text-[var(--color-text-secondary)] hover:border-[var(--color-line-strong)]'
                                }`}
                        >
                            <BusFront className="w-3.5 h-3.5" />
                            Specific
                        </button>
                    </div>
                </div>

                <div className="sticky bottom-3 z-10 md:static">
                    <Button variant="primary" className="w-full mt-2" disabled={!canSearch} onClick={handleSearch}>
                        Find my ride
                    </Button>
                </div>
            </div>

            <DestinationPicker
                isOpen={isDestPickerOpen}
                onClose={() => setDestPickerOpen(false)}
                onSelect={(id, name, corridor_id) => {
                    if (toPlace?.id !== id) {
                        setFromStage(null)
                        setPreferredNganya(null)
                        setPreference('ANY')
                    }
                    setToPlace({ id, name, corridor_id })
                    onCorridorChange?.(corridor_id || id, name)
                    setDestPickerOpen(false)
                }}
            />

            <StagePicker
                isOpen={isStagePickerOpen}
                onClose={() => setStagePickerOpen(false)}
                corridorId={toPlace?.corridor_id}
                onSelect={(id, name) => {
                    setFromStage({ id, name })
                    setStagePickerOpen(false)
                    if (preference === 'SPECIFIC') {
                        setSpecificPickerOpen(true)
                    }
                }}
            />

            <SpecificNganyaPicker
                isOpen={isSpecificPickerOpen}
                onClose={() => setSpecificPickerOpen(false)}
                corridorId={toPlace?.corridor_id}
                onSelect={(id, name) => {
                    setPreferredNganya({ id, name })
                    setPreference('SPECIFIC')
                    setSpecificPickerOpen(false)
                }}
            />

            {!onSearch && isResultsOpen && fromStage && toPlace && (
                <SearchResultsOverlay
                    isOpen={isResultsOpen}
                    onClose={() => setResultsOpen(false)}
                    fromStage={fromStage}
                    toPlace={toPlace}
                    preference={preference}
                    preferredNganya={preferredNganya}
                />
            )}
        </div>
    )
}
