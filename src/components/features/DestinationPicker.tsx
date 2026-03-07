import { useEffect, useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import BottomSheet from '../ui/BottomSheet'
import SearchInput from '../ui/SearchInput'
import { getCorridors } from '../../lib/queries/discover'
import { MapPin, Route } from 'lucide-react'

interface DestinationPickerProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (placeId: string, placeName: string, corridorId?: string) => void
}

export default function DestinationPicker({ isOpen, onClose, onSelect }: DestinationPickerProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [corridors, setCorridors] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (isOpen && corridors.length === 0) {
            setIsLoading(true)
            getCorridors().then(data => {
                setCorridors(data || [])
            }).finally(() => setIsLoading(false))
        }
    }, [isOpen, corridors.length])

    const query = search.trim().toLowerCase()
    const filtered = useMemo(() => {
        if (!query) return corridors
        return corridors.filter((corridor) => corridor.name?.toLowerCase().includes(query))
    }, [corridors, query])

    const content = (
        <div className="flex flex-col h-full max-h-[60vh]">
            <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search route (Ngong, Rongai, Kasarani...)"
                className="mb-4 shrink-0"
            />

            {!isLoading && corridors.length > 0 && (
                <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
                    {corridors.length} corridor{corridors.length === 1 ? '' : 's'} available
                </p>
            )}

            <div className="flex-1 overflow-y-auto space-y-1">
                {isLoading ? (
                    <p className="text-sm text-[var(--color-text-tertiary)] p-4 text-center">Loading corridors...</p>
                ) : filtered.length > 0 ? (
                    filtered.map((corridor) => (
                        <button
                            key={corridor.id}
                            type="button"
                            onClick={() => onSelect(corridor.id, corridor.name, corridor.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--glass-bg)] transition-colors text-left"
                        >
                            <div className="p-2 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] shrink-0">
                                <Route className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[var(--color-text-primary)] font-medium truncate">{corridor.name}</div>
                                <div className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    Terminal Route
                                </div>
                            </div>
                        </button>
                    ))
                ) : (
                    <p className="text-sm text-[var(--color-text-tertiary)] p-4 text-center">No corridors found.</p>
                )}
            </div>
        </div>
    )

    if (isMobile) {
        return (
            <BottomSheet isOpen={isOpen} onClose={onClose} title="Select Route">
                {content}
            </BottomSheet>
        )
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Select Route" size="sm">
            {content}
        </Modal>
    )
}
