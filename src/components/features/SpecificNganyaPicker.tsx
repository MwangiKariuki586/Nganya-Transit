import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import BottomSheet from '../ui/BottomSheet'
import SearchInput from '../ui/SearchInput'
import { searchNganyas } from '../../lib/queries/discover'
import { BusFront } from 'lucide-react'
import { useIsMobile } from '../../hooks/useIsMobile'

interface SpecificNganyaPickerProps {
    isOpen: boolean
    onClose: () => void
    corridorId?: string
    onSelect: (nganyaId: string, nganyaName: string) => void
}

export default function SpecificNganyaPicker({ isOpen, onClose, corridorId, onSelect }: SpecificNganyaPickerProps) {
    const isMobile = useIsMobile()
    const [nganyas, setNganyas] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [recentNganyas, setRecentNganyas] = useState<Array<{ id: string, name: string }>>([])


    useEffect(() => {
        if (isOpen) {
            setIsLoading(true)
            searchNganyas(search, corridorId).then(data => {
                setNganyas(data || [])
            }).finally(() => setIsLoading(false))
        }
    }, [isOpen, search, corridorId])

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined') return
        const key = `recent_nganyas_${corridorId || 'all'}`
        try {
            const raw = window.localStorage.getItem(key)
            const parsed = raw ? JSON.parse(raw) : []
            if (Array.isArray(parsed)) {
                setRecentNganyas(parsed.slice(0, 4))
            } else {
                setRecentNganyas([])
            }
        } catch {
            setRecentNganyas([])
        }
    }, [isOpen, corridorId])

    const newestOnCorridor = [...nganyas]
        .filter((n) => !!n?.created_at)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null

    const handleSelect = (nganyaId: string, nganyaName: string) => {
        onSelect(nganyaId, nganyaName)

        if (typeof window !== 'undefined') {
            const key = `recent_nganyas_${corridorId || 'all'}`
            const next = [{ id: nganyaId, name: nganyaName }, ...recentNganyas.filter((n) => n.id !== nganyaId)].slice(0, 4)
            setRecentNganyas(next)
            try {
                window.localStorage.setItem(key, JSON.stringify(next))
            } catch {
                // Ignore storage failures quietly.
            }
        }
    }

    const content = (
        <div className="flex flex-col h-full max-h-[60vh]">
            <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search nganya on this route..."
                className="mb-4 shrink-0"
            />

            {!search && (
                <div className="space-y-2 mb-3 shrink-0">
                    {newestOnCorridor && (
                        <button
                            type="button"
                            onClick={() => handleSelect(newestOnCorridor.id, newestOnCorridor.name)}
                            className="w-full text-left px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--glass-bg)] hover:border-[var(--color-accent-soft)] transition-colors text-sm text-[var(--color-text-primary)]"
                        >
                            Newest on corridor: <span className="font-semibold">{newestOnCorridor.name}</span>
                        </button>
                    )}

                    {recentNganyas.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {recentNganyas.map((recent) => (
                                <button
                                    key={recent.id}
                                    type="button"
                                    onClick={() => handleSelect(recent.id, recent.name)}
                                    className="px-2.5 py-1 rounded-full text-xs border border-[var(--color-line)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent-soft)] transition-colors"
                                >
                                    Recent: {recent.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-1">
                {isLoading ? (
                    <p className="text-sm text-[var(--color-text-tertiary)] p-4 text-center">Searching nganyas...</p>
                ) : nganyas.length > 0 ? (
                    nganyas.map(n => (
                        <button
                            key={n.id}
                            type="button"
                            onClick={() => handleSelect(n.id, n.name)}
                            className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--glass-bg)] transition-colors text-left"
                        >
                            <div className="p-2 rounded-full bg-[var(--color-green-soft)] text-[var(--color-green)] shrink-0">
                                <BusFront className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[var(--color-text-primary)] font-medium truncate">{n.name}</div>
                                <div className="text-xs text-[var(--color-text-tertiary)] truncate">
                                    {n.corridors?.name || 'Unknown Route'} {n.tags && n.tags.length > 0 ? `• ${n.tags.join(', ')}` : ''}
                                </div>
                            </div>
                        </button>
                    ))
                ) : (
                    <p className="text-sm text-[var(--color-text-tertiary)] p-4 text-center">No matches found.</p>
                )}
            </div>
        </div>
    )

    if (isMobile) {
        return (
            <BottomSheet isOpen={isOpen} onClose={onClose} title="Select Specific Nganya">
                {content}
            </BottomSheet>
        )
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Select Specific Nganya" size="sm">
            {content}
        </Modal>
    )
}
