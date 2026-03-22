import { Link } from '@tanstack/react-router'

export default function AdminHomeScreen() {
  return (
    <div className="page-container py-10">
      <h1 className="text-h2">Admin Console</h1>
      <p className="text-body-sm text-[var(--color-text-secondary)] mt-2">
        Admin-only tools will live in `src/modules/admin`.
      </p>
      <div className="mt-6">
        <Link
          to="/admin/registrations"
          className="inline-flex min-h-[48px] items-center rounded-[18px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-white no-underline"
        >
          Open registrations queue
        </Link>
      </div>
    </div>
  )
}
