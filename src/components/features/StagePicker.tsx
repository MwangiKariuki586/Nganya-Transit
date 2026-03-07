import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import BottomSheet from '../ui/BottomSheet'
import SearchInput from '../ui/SearchInput'
import { getStages } from '../../lib/queries/discover'
import { MapPin } from 'lucide-react'

interface StagePickerProps {
    isOpen: boolean
    onClose: () => void
    corridorId?: string
    onSelect: (stageId: string, stageName: string) => void
}

export default function StagePicker({ isOpen, onClose, corridorId, onSelect }: StagePickerProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [stages, setStages] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true)
            getStages(corridorId).then(data => {
                setStages(data || [])
            }).finally(() => setIsLoading(false))
        }
    }, [isOpen, corridorId])

    useEffect(() => {
        if (!isOpen || typeof navigator === 'undefined' || !navigator.geolocation) return

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                })
            },
            () => {
                setUserLocation(null)
            },
            {
                enableHighAccuracy: false,
                timeout: 6000,
                maximumAge: 120000
            }
        )
    }, [isOpen])

    const filtered = stages.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
    )

    const parseStageCoords = (location: unknown): { lat: number, lng: number } | null => {
        if (!location) return null

        if (typeof location === 'string') {
            const pointMatch = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i)
            if (pointMatch) {
                return { lng: Number(pointMatch[1]), lat: Number(pointMatch[2]) }
            }

            try {
                const parsed = JSON.parse(location)
                if (parsed?.type === 'Point' && Array.isArray(parsed.coordinates) && parsed.coordinates.length >= 2) {
                    return { lng: Number(parsed.coordinates[0]), lat: Number(parsed.coordinates[1]) }
                }
            } catch {
                return null
            }
        }

        if (typeof location === 'object' && location !== null) {
            const geo = location as any
            if (geo?.type === 'Point' && Array.isArray(geo.coordinates) && geo.coordinates.length >= 2) {
                return { lng: Number(geo.coordinates[0]), lat: Number(geo.coordinates[1]) }
            }
            if (typeof geo.lat === 'number' && typeof geo.lng === 'number') {
                return { lat: geo.lat, lng: geo.lng }
            }
            if (typeof geo.latitude === 'number' && typeof geo.longitude === 'number') {
                return { lat: geo.latitude, lng: geo.longitude }
            }
        }

        return null
    }

    const getDistanceLabel = (stage: any) => {
        if (!userLocation) return null
        const coords = parseStageCoords(stage.location)
        if (!coords) return null

        const toRad = (d: number) => d * (Math.PI / 180)
        const earthKm = 6371
        const dLat = toRad(coords.lat - userLocation.lat)
        const dLng = toRad(coords.lng - userLocation.lng)
        const a = Math.sin(dLat / 2) ** 2
            + Math.cos(toRad(userLocation.lat)) * Math.cos(toRad(coords.lat)) * Math.sin(dLng / 2) ** 2
        const distanceKm = 2 * earthKm * Math.asin(Math.sqrt(a))

        if (!Number.isFinite(distanceKm)) return null
        return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`
    }

    const content = (
        <div className="flex flex-col h-full max-h-[60vh]">
            <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search pickup stage..."
                className="mb-4 shrink-0"
            />

            <div className="flex-1 overflow-y-auto space-y-1">
                {isLoading ? (
                    <p className="text-sm text-[var(--color-text-tertiary)] p-4 text-center">Loading stages...</p>
                ) : filtered.length > 0 ? (
                    filtered.map(stage => {
                        const distance = getDistanceLabel(stage)
                        return (
                            <button
                                key={stage.id}
                                type="button"
                                onClick={() => onSelect(stage.id, stage.name)}
                                className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--glass-bg)] transition-colors text-left"
                            >
                                <div className="p-2 rounded-full bg-[var(--glass-bg)] text-[var(--color-text-tertiary)]">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[var(--color-text-primary)] font-medium">{stage.name}</div>
                                    {distance && (
                                        <div className="text-xs text-[var(--color-text-tertiary)]">{distance}</div>
                                    )}
                                </div>
                            </button>
                        )
                    })
                ) : (
                    <p className="text-sm text-[var(--color-text-tertiary)] p-4 text-center">No stages found.</p>
                )}
            </div>
        </div>
    )

    if (isMobile) {
        return (
            <BottomSheet isOpen={isOpen} onClose={onClose} title="Select Pickup Stage">
                {content}
            </BottomSheet>
        )
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Select Pickup Stage" size="sm">
            {content}
        </Modal>
    )
}
