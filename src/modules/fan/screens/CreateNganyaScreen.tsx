import { Link } from '@tanstack/react-router'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function CreateNganyaScreen() {
  return (
    <div className="page-container max-w-2xl py-8 md:py-12">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-text-primary)] no-underline transition-all hover:border-[var(--glass-border-hover)]">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="text-tag text-[var(--color-accent)]">Submission flow moved</div>
          <h1 className="text-h2 mt-1 text-white">Nganya registration is now review-based</h1>
        </div>
      </div>

      <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-6 shadow-[var(--shadow-md)]">
        <p className="text-body text-[var(--color-text-secondary)]">
          Direct public nganya creation is closed. Crew builds now go through the crew registration flow and admin approval before they appear in discovery.
        </p>
        <div className="mt-4 grid gap-3 rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4 text-sm text-[var(--color-text-secondary)]">
          <div>1. Crew submits a registration request from Crew Live.</div>
          <div>2. Admin reviews photos and duplicate warnings.</div>
          <div>3. Approval creates the official nganya and maps it to the crew account.</div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button variant="primary" className="min-h-[48px] rounded-[18px] px-4 text-sm font-semibold" onClick={() => { window.location.href = '/signin' }}>
            <ArrowRight className="h-4 w-4" />
            Sign in with a crew account
          </Button>
          <Link to="/" className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] border border-[var(--glass-border)] px-4 text-sm font-semibold text-[var(--color-text-primary)] no-underline transition-all hover:border-[var(--glass-border-hover)]">
            Back to discovery
          </Link>
        </div>
      </section>
    </div>
  )
}
