import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import BottomSheet from '../ui/BottomSheet'
import Button from '../ui/Button'
import { Navigation2, Activity, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Props {
    isOpen: boolean
    onClose: () => void
    nganya: any
    stage: { id: string, name: string }
}

export default function TrackModeOverlay({ isOpen, onClose, nganya, stage }: Props) {
    const [isMobile, setIsMobile] = useState(false)
    const [latestEta, setLatestEta] = useState(nganya.eta_minutes)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (!isOpen) return
        // Optional: Sub to specifically this nganya's live session
        const channel = supabase.channel(`track_nganya_${nganya.nganya_id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_sessions', filter: `nganya_id=eq.${nganya.nganya_id}` }, payload => {
                // In a real app, recalculate ETA based on payload.new.last_location
                // Here we just mock an update
                if (latestEta > 1) {
                    setLatestEta(latestEta - 1)
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [isOpen, nganya.nganya_id, latestEta])

    const handleConfirm = (action: 'BOARDED' | 'MISSED') => {
        // TODO: wire analytics event for board/miss confirmation
        onClose()
    }

    const content = (
        <div className="flex flex-col items-center text-center p-4">
            <div className="mb-6 relative">
                <div className="absolute inset-0 bg-[var(--color-accent)] opacity-20 blur-xl rounded-full animate-pulse-slow"></div>
                <div className="w-24 h-24 rounded-full border-4 border-[var(--color-bg-surface)] bg-[var(--color-bg-body)] shadow-lg flex items-center justify-center relative z-10">
                    <Activity className="w-10 h-10 text-[var(--color-accent)]" />
                </div>
            </div>

            <h2 className="text-h2 mb-1">{nganya.nganya_name}</h2>
            <p className="text-[var(--color-text-secondary)] mb-6">Arriving at {stage.name}</p>

            <div className="text-display text-[var(--color-accent)] mb-2">
                {latestEta} <span className="text-h3 font-normal">min</span>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-text-tertiary)] mb-8 bg-[var(--glass-bg)] px-4 py-2 rounded-full border border-[var(--glass-border)]">
                <span className="w-2 h-2 rounded-full bg-[var(--color-green)] animate-pulse"></span>
                Live tracking active • {nganya.confidence_level} Confidence
            </div>

            <div className="w-full flex gap-3">
                <Button variant="secondary" className="flex-1 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]" onClick={() => handleConfirm('MISSED')}>
                    <XCircle className="w-4 h-4 mr-2" /> Missed it
                </Button>
                <Button variant="primary" className="flex-1 bg-[var(--color-green)] text-[var(--color-bg-surface)] hover:bg-[#00cc00]" onClick={() => handleConfirm('BOARDED')}>
                    <CheckCircle className="w-4 h-4 mr-2" /> I Boarded
                </Button>
            </div>
        </div>
    )

    if (isMobile) {
        return (
            <BottomSheet isOpen={isOpen} onClose={onClose} title="Live Tracking">
                {content}
            </BottomSheet>
        )
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Live Tracking" size="sm">
            {content}
        </Modal>
    )
}
